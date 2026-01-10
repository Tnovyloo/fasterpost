from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.shortcuts import get_object_or_404
from datetime import date
from django.db.models import Count, Q
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

# Importy z Twojego projektu (upewnij się, że ścieżki są poprawne)
from logistics.serializers.warehouse_courier_serializers import CourierRouteDetailSerializer
from logistics.models import Route, RouteStop
from logistics.serializers.admin_serializers import RouteListSerializer, RouteDetailSerializer
from logistics.services.routing_service import RoutingService
from accounts.permissions import IsAdmin
from packages.models import Package, Actualization

# --- 1. Admin ViewSet ---
@extend_schema(tags=["Admin - Routing"])
class RouteAdminViewSet(viewsets.ModelViewSet):
    """Admin management of warehouse routes"""
    
    serializer_class = CourierRouteDetailSerializer 
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_queryset(self):
        qs = Route.objects.select_related('courier').prefetch_related(
            'stops',
            'stops__warehouse',
            'stops__postmat',
            'stops__postmat__zone',
        )
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        date_filter = self.request.query_params.get('date')
        if date_filter:
            qs = qs.filter(scheduled_date=date_filter)
        
        return qs.order_by('-scheduled_date', '-created_at')

    @extend_schema(
        summary="Generate routes for date",
        request=None,
        parameters=[
            OpenApiParameter('date', OpenApiTypes.DATE, description="Date (YYYY-MM-DD)"),
            OpenApiParameter('max_stops', OpenApiTypes.INT, description="Max stops per route"),
            OpenApiParameter('vehicle_capacity', OpenApiTypes.INT, description="Vehicle capacity"),
        ],
        responses={201: CourierRouteDetailSerializer(many=True)}
    )
    @action(detail=False, methods=['post'])
    def generate(self, request):
        """Generate routes for a specific date"""
        target_date_str = request.data.get('date') or request.query_params.get('date')
        max_stops = int(request.data.get('max_stops', 15))
        vehicle_capacity = int(request.data.get('vehicle_capacity', 50))
        
        if target_date_str:
            try:
                target_date = date.fromisoformat(target_date_str)
            except ValueError:
                return Response({'error': 'Invalid date format'}, status=400)
        else:
            target_date = date.today()
        
        try:
            service = RoutingService()
            routes = service.generate_routes_for_date(target_date, max_stops, vehicle_capacity)
            
            serializer = self.get_serializer(routes, many=True)
            return Response({
                'success': True,
                'date': target_date,
                'routes_created': len(routes),
                'routes': serializer.data
            }, status=status.HTTP_201_CREATED)
        
        except ValueError as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(summary="Clear only PLANNED routes")
    @action(detail=False, methods=['delete'])
    def clear(self, request):
        deleted, _ = Route.objects.filter(status='planned').delete()
        return Response(
            {'message': f'Successfully cleared {deleted} planned items.'}, 
            status=status.HTTP_200_OK
        )

    @extend_schema(summary="Get routing statistics")
    @action(detail=False, methods=['get'])
    def stats(self, request):
        stats = Route.objects.aggregate(
            total=Count('id'),
            planned=Count('id', filter=Q(status='planned')),
            in_progress=Count('id', filter=Q(status='in_progress')),
            completed=Count('id', filter=Q(status='completed'))
        )
        return Response(stats)


# --- 2. Local Route ViewSet ---
class LocalRouteViewSet(viewsets.ViewSet):
    # Jeśli używasz tej klasy w urls.py, zostaw ją tutaj (nawet pustą lub z pass)
    pass 


# --- 3. Courier ViewSet (Główna logika kuriera) ---
@extend_schema(tags=["Courier - Routes"])
class CourierRouteViewSet(viewsets.ReadOnlyModelViewSet):
    """Courier's own routes"""
    serializer_class = RouteDetailSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        Standardowy queryset dla list/retrieve. 
        Filtruje trasy przypisane do kuriera i aktywne (planned/in_progress).
        """
        return Route.objects.filter(
            courier=self.request.user,
            status__in=['planned', 'in_progress']
        ).prefetch_related('stops', 'route_packages')
    
    # --- SCAN PACKAGE (NAPRAWIONY) ---
    @extend_schema(summary="Scan package at stop")
    @action(detail=True, methods=['post'], url_path='scan-package')
    def scan_package(self, request, pk=None):
        """
        Handles scanning a package at a specific stop.
        Fix: Używa get_object_or_404 bezpośrednio na modelu Route, aby ominąć filtry get_queryset.
        """
        # 1. Pobieramy trasę bezpośrednio z bazy (omijamy filtry statusu)
        route = get_object_or_404(Route, pk=pk)

        # 2. Ręczne sprawdzenie uprawnień (czy to trasa tego kuriera)
        if route.courier != request.user:
             return Response({'error': 'To nie jest Twoja trasa.'}, status=403)

        package_id = request.data.get('package_id')
        stop_id = request.data.get('stop_id')
        action_type = request.data.get('action') # 'drop' or 'pick'

        if not all([package_id, stop_id, action_type]):
            return Response({'error': 'Missing data (package_id, stop_id, action)'}, status=400)

        try:
            stop = route.stops.get(id=stop_id)
            package = Package.objects.get(id=package_id)
        except RouteStop.DoesNotExist:
            return Response({'error': 'Stop not found in this route'}, status=404)
        except Package.DoesNotExist:
            return Response({'error': 'Package not found'}, status=404)

        # Logic for DROP OFF (Courier puts package INTO locker)
        if action_type == 'drop':
            if package.destination_postmat == stop.postmat:
                new_status = 'delivered'
            elif stop.warehouse:
                new_status = 'in_warehouse'
            else:
                new_status = 'delivered' # Fallback

            Actualization.objects.create(
                package_id=package.id,
                status=new_status,
                courier_id=request.user.id,
                warehouse_id=stop.warehouse.id if stop.warehouse else None,
            )
            return Response({'status': 'success', 'new_state': new_status})

        # Logic for PICK UP (Courier takes package OUT of locker)
        elif action_type == 'pick':
            new_status = 'in_transit'
            
            Actualization.objects.create(
                package_id=package.id,
                status=new_status,
                courier_id=request.user.id,
                warehouse_id=stop.warehouse.id if stop.warehouse else None
            )
            return Response({'status': 'success', 'new_state': new_status})

        return Response({'error': 'Unknown action'}, status=400)

    # --- POZOSTAŁE AKCJE KURIERA ---
    
    @extend_schema(summary="Get current active route")
    @action(detail=False, methods=['get'])
    def current(self, request):
        today = date.today()
        # Prioritize in_progress
        route = Route.objects.filter(
            courier=request.user, 
            status='in_progress'
        ).first()
        
        # Fallback to planned for today or earlier
        if not route:
            route = Route.objects.filter(
                courier=request.user,
                status='planned',
                scheduled_date__lte=today
            ).order_by('scheduled_date').first()
            
        if route:
            serializer = self.get_serializer(route)
            return Response(serializer.data)
        return Response({'detail': 'No active route found.'}, status=status.HTTP_404_NOT_FOUND)

    @extend_schema(summary="Start route")
    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        route = self.get_object()
        if route.status != 'planned':
            return Response({'error': 'Route already started or completed'}, status=400)
        route.start_route()
        return Response({'success': True, 'message': 'Route started'})
    
    @extend_schema(summary="Complete route")
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        route = self.get_object()
        if route.status != 'in_progress':
            return Response({'error': 'Route not in progress'}, status=400)
        route.complete_route()
        return Response({'success': True, 'message': 'Route completed'})

    @action(detail=True, methods=['post'])
    def finish(self, request, pk=None):
        """Alias for complete to match frontend call"""
        return self.complete(request, pk)
    
    @extend_schema(summary="Complete stop")
    @action(detail=True, methods=['post'], url_path='stops/(?P<stop_id>[^/.]+)/complete')
    def complete_stop(self, request, pk=None, stop_id=None):
        route = self.get_object()
        try:
            stop = route.stops.get(id=stop_id)
        except RouteStop.DoesNotExist:
            return Response({'error': 'Stop not found'}, status=404)
        
        if stop.completed_at:
            return Response({'error': 'Stop already completed'}, 400)
        
        stop.complete_stop()
        return Response({'success': True, 'message': f'Stop {stop.order} completed'})