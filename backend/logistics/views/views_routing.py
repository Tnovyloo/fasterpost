from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from datetime import date, timedelta
from django.db.models import Count, Q
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from logistics.serializers.warehouse_courier_serializers import CourierRouteDetailSerializer
from logistics.models import Route, RouteStop
from logistics.serializers.admin_serializers import RouteListSerializer, RouteDetailSerializer
from logistics.services.routing_service import RoutingService
from accounts.permissions import IsAdmin

@extend_schema(tags=["Admin - Routing"])
class RouteAdminViewSet(viewsets.ModelViewSet):
    """Admin management of warehouse routes"""
    
    # We use the detailed serializer to ensure the frontend map works
    serializer_class = CourierRouteDetailSerializer 
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_queryset(self):
        # We keep the robust prefetching for the map visualization
        # FIX: Use select_related for courier (ForeignKey) so names are joined in the main query
        qs = Route.objects.select_related('courier').prefetch_related(
            'stops',
            'stops__warehouse',
            'stops__postmat',
            'stops__postmat__zone',
        )
        
        # Add filtering from the snippet
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
        """
        Safe Delete: Only deletes routes that haven't started yet (status='planned').
        Preserves history (completed/cancelled/in_progress).
        """
        deleted, _ = Route.objects.filter(status='planned').delete()
        return Response(
            {'message': f'Successfully cleared {deleted} planned items (routes & dependencies).'}, 
            status=status.HTTP_200_OK
        )

    @extend_schema(
        summary="Get routing statistics",
        responses={200: {
            'type': 'object',
            'properties': {
                'total': {'type': 'integer'},
                'planned': {'type': 'integer'},
                'in_progress': {'type': 'integer'},
                'completed': {'type': 'integer'},
            }
        }}
    )
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get routing statistics"""
        stats = Route.objects.aggregate(
            total=Count('id'),
            planned=Count('id', filter=Q(status='planned')),
            in_progress=Count('id', filter=Q(status='in_progress')),
            completed=Count('id', filter=Q(status='completed'))
        )
        
        return Response(stats)


@extend_schema(tags=["Courier - Routes"])
class CourierRouteViewSet(viewsets.ReadOnlyModelViewSet):
    """Courier's own routes"""
    serializer_class = RouteDetailSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Route.objects.filter(
            courier=self.request.user,
            status__in=['planned', 'in_progress']
        ).prefetch_related('stops', 'route_packages')
    
    @extend_schema(summary="Start route")
    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """Start a route"""
        route = self.get_object()
        
        if route.status != 'planned':
            return Response({
                'error': 'Route already started or completed'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        route.start_route()
        
        return Response({
            'success': True,
            'message': 'Route started',
            'route': RouteDetailSerializer(route).data
        })
    
    @extend_schema(summary="Complete route")
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Complete entire route"""
        route = self.get_object()
        
        if route.status != 'in_progress':
            return Response({
                'error': 'Route not in progress'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        route.complete_route()
        
        return Response({
            'success': True,
            'message': 'Route completed'
        })
    
    @extend_schema(
        summary="Complete stop",
        request=None
    )
    @action(detail=True, methods=['post'], url_path='stops/(?P<stop_id>[^/.]+)/complete')
    def complete_stop(self, request, pk=None, stop_id=None):
        """Complete a specific stop"""
        route = self.get_object()
        
        try:
            stop = route.stops.get(id=stop_id)
        except RouteStop.DoesNotExist:
            return Response({
                'error': 'Stop not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        if stop.completed_at:
            return Response({
                'error': 'Stop already completed'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        stop.complete_stop()
        
        return Response({
            'success': True,
            'message': f'Stop {stop.order} completed'
        })
