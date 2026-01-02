from rest_framework import serializers
from logistics.models import Route, RouteStop, RoutePackage, Warehouse
from .serializers import WarehouseSimpleSerializer
from postmats.serializers import PostmatSimpleSerializer
from packages.models import Package

class PackageSimpleSerializer(serializers.ModelSerializer):
    """Minimal info for the courier to identify a box"""
    class Meta:
        model = Package
        fields = ['id', 'size', 'weight', 'pickup_code']

class CourierStopSerializer(serializers.ModelSerializer):
    warehouse = WarehouseSimpleSerializer(read_only=True)
    postmat = PostmatSimpleSerializer(read_only=True)
    pickups = serializers.SerializerMethodField()
    dropoffs = serializers.SerializerMethodField()
    
    class Meta:
        model = RouteStop
        fields = [
            'id', 'order', 'warehouse', 'distance_from_previous', 
            'estimated_arrival', 'completed_at', 'pickups', 'dropoffs', 'postmat'
        ]
        
    def get_pickups(self, obj):
        route_packages = RoutePackage.objects.filter(pickup_stop=obj).select_related('package')
        packages = [rp.package for rp in route_packages]
        return PackageSimpleSerializer(packages, many=True).data

    def get_dropoffs(self, obj):
        route_packages = RoutePackage.objects.filter(dropoff_stop=obj).select_related('package')
        packages = [rp.package for rp in route_packages]
        return PackageSimpleSerializer(packages, many=True).data

class CourierRouteDetailSerializer(serializers.ModelSerializer):
    stops = CourierStopSerializer(many=True, read_only=True)
    courier_name = serializers.CharField(source='courier.full_name', read_only=True)
    courier_email = serializers.EmailField(source='courier.email', read_only=True)
    
    class Meta:
        model = Route
        fields = [
            'id', 'status', 'scheduled_date', 
            'total_distance', 'estimated_duration', 'route_type',
            'started_at', 'completed_at', 'stops',
            'courier_name', 'courier_email'
        ]