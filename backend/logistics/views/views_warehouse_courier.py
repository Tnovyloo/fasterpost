from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db import transaction
from django.shortcuts import get_object_or_404

from logistics.models import Route, RouteStop, RoutePackage
from logistics.serializers.warehouse_courier_serializers import CourierRouteDetailSerializer
from packages.models import Actualization

class IsWarehouseCourier(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.role == 'warehouse' or request.user.role == 'admin')

class CourierRouteViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Endpoints for couriers to manage their daily work.
    """
    serializer_class = CourierRouteDetailSerializer
    permission_classes = [IsWarehouseCourier]

    def get_queryset(self):
        # Only show routes assigned to the logged-in user
        return Route.objects.filter(courier=self.request.user).order_by('-scheduled_date')

    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get today's active or planned route"""
        today = timezone.now().date()
        
        # Priority: In Progress -> Planned (Today)
        route = Route.objects.filter(
            courier=request.user,
            status='in_progress'
        ).first()
        
        if not route:
            route = Route.objects.filter(
                courier=request.user,
                scheduled_date=today,
                status='planned'
            ).first()
            
        if not route:
            return Response({'detail': 'No active route found for today.'}, status=404)
            
        serializer = self.get_serializer(route)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """Mark the route as started"""
        route = self.get_object()
        
        if route.status != 'planned':
            return Response({'error': 'Route is not in planned state'}, status=400)
            
        route.status = 'in_progress'
        route.started_at = timezone.now()
        route.save()
        
        return Response({'status': 'started', 'timestamp': route.started_at})

    @action(detail=True, methods=['post'], url_path='complete-stop/(?P<stop_id>[^/.]+)')
    @transaction.atomic
    def complete_stop(self, request, pk=None, stop_id=None):
        """
        Mark a specific stop as done.
        This updates package statuses automatically.
        """
        route = self.get_object()
        
        # Validate stop belongs to route
        stop = get_object_or_404(RouteStop, id=stop_id, route=route)
        
        if stop.completed_at:
            return Response({'error': 'Stop already completed'}, status=400)
            
        # 1. Mark stop as complete
        stop.completed_at = timezone.now()
        stop.save()
        
        # 2. Handle DROPOFFS (Package is now in this warehouse)
        dropoff_links = RoutePackage.objects.filter(dropoff_stop=stop).select_related('package')
        for link in dropoff_links:
            Actualization.objects.create(
                package_id=link.package,
                status='in_warehouse',
                courier_id=request.user,
                warehouse_id=stop.warehouse,
                route_remaining={} # Cleared
            )
            
        # 3. Handle PICKUPS (Package is now in courier's truck)
        pickup_links = RoutePackage.objects.filter(pickup_stop=stop).select_related('package')
        for link in pickup_links:
            # Calculate remaining route for this package
            remaining_stops = self._calculate_remaining(route, stop.order)
            
            Actualization.objects.create(
                package_id=link.package,
                status='in_transit',
                courier_id=request.user,
                warehouse_id=None, # It's in the truck
                route_remaining=remaining_stops
            )
            
        return Response({'status': 'stop_completed'})

    @action(detail=True, methods=['post'])
    def finish(self, request, pk=None):
        """Finish the entire route"""
        route = self.get_object()
        
        # Validation: Are all stops done?
        if route.stops.filter(completed_at__isnull=True).exists():
            return Response({'error': 'Cannot finish route. Complete all stops first.'}, status=400)
            
        route.status = 'completed'
        route.completed_at = timezone.now()
        route.save()
        
        return Response({'status': 'route_completed'})

    def _calculate_remaining(self, route, current_order):
        """Helper for JSON field"""
        # Return simple list of remaining warehouse cities
        stops = route.stops.filter(order__gt=current_order).order_by('order')
        return [
            {'city': s.warehouse.city, 'order': s.order} 
            for s in stops
        ]