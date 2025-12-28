from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from datetime import date
from drf_spectacular.utils import extend_schema

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
        summary="Generate local routes for a warehouse",
        description="Generates last-mile routes based on zones and package volume for a specific warehouse. Uses fixed territories."
    )
    @action(detail=False, methods=['post'])
    def generate(self, request):
        # 1. Validate Input
        serializer = LocalRouteGenerationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        warehouse_id = str(serializer.validated_data['warehouse_id'])
        target_date = serializer.validated_data.get('date', date.today())
        
        # 2. Call Service
        service = LocalRoutingService()
        
        try:
            routes = service.generate_local_routes(target_date, warehouse_id)
            
            # 3. Serialize Response
            response_serializer = CourierRouteDetailSerializer(routes, many=True)
            
            return Response({
                'success': True,
                'date': target_date,
                'warehouse_id': warehouse_id,
                'routes_created': len(routes),
                'routes': response_serializer.data
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            # Catch service errors (e.g. Warehouse not found)
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)