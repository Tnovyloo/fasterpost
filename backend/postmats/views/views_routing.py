from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from datetime import date
from drf_spectacular.utils import extend_schema

from logistics.models import Warehouse, Route
from postmats.services.routing_service import LocalRoutingService
from postmats.serializers import LocalRouteGenerationSerializer
# We reuse the detailed route serializer to keep frontend logic consistent
from logistics.serializers.warehouse_courier_serializers import CourierRouteDetailSerializer

class LocalRouteViewSet(viewsets.ViewSet):
    """
    ViewSet for managing Local (Last Mile) Routes.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    @extend_schema(
        request=LocalRouteGenerationSerializer,
        responses={201: CourierRouteDetailSerializer(many=True)},
        summary="Generate local routes for a warehouse"
    )
    @action(detail=False, methods=['post'])
    def generate(self, request):
        serializer = LocalRouteGenerationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        warehouse_id = str(serializer.validated_data['warehouse_id'])
        target_date = serializer.validated_data.get('date', date.today())
        service = LocalRoutingService()
        try:
            routes = service.generate_local_routes(target_date, warehouse_id)
            response_serializer = CourierRouteDetailSerializer(routes, many=True)
            return Response({
                'success': True,
                'date': target_date,
                'warehouse_id': warehouse_id,
                'routes_created': len(routes),
                'routes': response_serializer.data
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'success': False, 'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='generate-all')
    def generate_all(self, request):
        service = LocalRoutingService()
        target_date = date.today()
        warehouses = Warehouse.objects.all()
        total_created = 0
        report = {}
        for wh in warehouses:
            try:
                routes = service.generate_local_routes(target_date, str(wh.id))
                count = len(routes)
                total_created += count
                if count > 0: report[wh.city] = count
            except Exception as e:
                report[wh.city] = f"Error: {str(e)}"
        return Response({'success': True, 'total_routes_created': total_created, 'breakdown': report}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='clear-hub')
    def clear_hub(self, request):
        """
        Clears only PLANNED local routes starting at a specific warehouse.
        FIX: Uses route stops to determine origin instead of courier profile.
        Body: { "warehouse_id": "UUID" }
        """
        wh_id = request.data.get('warehouse_id')
        if not wh_id:
             return Response({'error': 'warehouse_id required'}, status=400)
             
        # CORRECT LOGIC: Delete routes where the first stop (order=0) is the specified warehouse
        deleted, _ = Route.objects.filter(
            route_type='last_mile',
            status='planned',
            stops__order=0,
            stops__warehouse_id=wh_id
        ).delete()
        
        return Response({'message': f'Cleared {deleted} planned local routes for hub {wh_id}'}, status=200)