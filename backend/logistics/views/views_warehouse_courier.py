from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.db.models import Q 

from logistics.models import Route, RouteStop, RoutePackage
from logistics.serializers.warehouse_courier_serializers import CourierRouteDetailSerializer
from packages.models import Actualization, Package

class IsLogisticsCourier(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['warehouse', 'courier']

class CourierRouteViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CourierRouteDetailSerializer
    permission_classes = [IsLogisticsCourier]

    def get_queryset(self):
        return Route.objects.filter(courier=self.request.user).order_by('-created_at')
    
    @action(detail=True, methods=['post'], url_path='scan-package')
    def scan_package(self, request, pk=None):
        """
        Obsługa skanowania z obsługą błędów 500.
        """
        # 1. Pobieranie trasy
        route = get_object_or_404(Route, pk=pk)

        # 2. Security check
        if route.courier != request.user:
             return Response({'error': 'To nie jest Twoja trasa.'}, status=403)

        package_id = request.data.get('package_id')
        stop_id = request.data.get('stop_id')
        action_type = request.data.get('action')

        if not all([package_id, stop_id, action_type]):
            return Response({'error': 'Brakuje danych (package_id, stop_id, action)'}, status=400)

        try:
            stop = route.stops.get(id=stop_id)
            package = Package.objects.get(id=package_id)
        except RouteStop.DoesNotExist:
            return Response({'error': 'Przystanek nie należy do tej trasy'}, status=404)
        except Package.DoesNotExist:
            return Response({'error': 'Paczka nie znaleziona'}, status=404)

        # --- BLOK ZABEZPIECZONY TRY/EXCEPT DLA TWORZENIA ACTUALIZATION ---
        try:
            # Ustalanie statusu
            if action_type == 'drop':
                if stop.postmat:
                    new_status = 'placed_in_stash'
                elif stop.warehouse:
                    new_status = 'in_warehouse'
                else:
                    new_status = 'delivered'
            elif action_type == 'pick':
                new_status = 'in_transit'
            else:
                return Response({'error': 'Nieznana akcja'}, status=400)

            # POPRAWKA: Używamy nazw pól zdefiniowanych w Twoim models.py (z końcówką _id)
            Actualization.objects.create(
                package_id=package,              # ZMIANA: package -> package_id
                status=new_status,
                courier_id=request.user,         # ZMIANA: courier -> courier_id
                warehouse_id=stop.warehouse if stop.warehouse else None, # ZMIANA: warehouse -> warehouse_id
            )
            
            return Response({'status': 'success', 'new_state': new_status})

        except Exception as e:
            # Ten blok wyłapie błąd 500 i pokaże go w konsoli
            import traceback
            print("!!! BŁĄD WEWNĘTRZNY SCAN_PACKAGE !!!")
            print(f"Błąd: {str(e)}")
            traceback.print_exc() # Drukuje pełny stack trace do konsoli
            return Response({'error': f'Błąd serwera: {str(e)}'}, status=500)

    @action(detail=False, methods=['get'])
    def current(self, request):
        user = request.user
        print(f"DEBUG: Courier View. Requesting User: {user.email} (ID: {user.id})")
        
        # 1. Try generic fetch (latest non-cancelled)
        route = Route.objects.filter(courier=user).exclude(status='cancelled').order_by('-created_at').first()
        
        if route:
            print(f"DEBUG: Found route {route.id} assigned to {user.email}")
            serializer = self.get_serializer(route)
            return Response(serializer.data)
        
        # 2. If no route found, dump debug info about DB state
        total_routes = Route.objects.count()
        print(f"DEBUG: No route returned for {user.email}. Total routes in DB: {total_routes}")
        
        if total_routes > 0:
            last_route = Route.objects.last()
            print(f"DEBUG: The latest route in DB belongs to: {last_route.courier.email} (ID: {last_route.courier.id})")
            if last_route.courier.email == user.email and last_route.courier.id != user.id:
                print("CRITICAL: Email matches but ID differs! You have a zombie token.")

        return Response({'detail': 'No active or planned routes found.'}, status=404)

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        route = self.get_object()
        if route.status != 'planned':
            return Response({'error': 'Route already started or completed'}, status=400)
        route.status = 'in_progress'
        route.started_at = timezone.now()
        route.save()
        return Response({'status': 'started'})

    @action(detail=True, methods=['post'], url_path='complete-stop/(?P<stop_id>[^/.]+)')
    @transaction.atomic
    def complete_stop(self, request, pk=None, stop_id=None):
        route = self.get_object()
        stop = get_object_or_404(RouteStop, id=stop_id, route=route)
        if stop.completed_at:
            return Response({'error': 'Stop already completed'}, status=400)
        stop.completed_at = timezone.now()
        stop.save()
        
        # Dropoffs
        dropoff_links = RoutePackage.objects.filter(dropoff_stop=stop).select_related('package')
        for link in dropoff_links:
            new_status = 'in_warehouse'
            if stop.postmat:
                new_status = 'placed_in_stash'
                if hasattr(link.package, 'stash_assignment'):
                     stash = link.package.stash_assignment.first()
                     if stash:
                         stash.is_empty = False
                         stash.save()
            Actualization.objects.create(
                package_id=link.package,
                status=new_status,
                courier_id=request.user,
                warehouse_id=stop.warehouse,
                route_remaining={} 
            )
            
        # Pickups
        pickup_links = RoutePackage.objects.filter(pickup_stop=stop).select_related('package')
        for link in pickup_links:
            Actualization.objects.create(
                package_id=link.package,
                status='in_transit',
                courier_id=request.user,
                warehouse_id=None,
                route_remaining={}
            )
        return Response({'status': 'stop_completed'})

    @action(detail=True, methods=['post'])
    def finish(self, request, pk=None):
        route = self.get_object()
        route.status = 'completed'
        route.completed_at = timezone.now()
        route.save()
        return Response({'status': 'route_completed'})