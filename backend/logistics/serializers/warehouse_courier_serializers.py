from rest_framework import serializers
from logistics.models import Route, RouteStop, RoutePackage, Warehouse
from .serializers import WarehouseSimpleSerializer
from packages.models import Package

class PackageSimpleSerializer(serializers.ModelSerializer):
    """Minimal info for the courier to identify a box"""
    class Meta:
        model = Package
        fields = ['id', 'size', 'weight', 'pickup_code']

class CourierStopSerializer(serializers.ModelSerializer):
    warehouse = WarehouseSimpleSerializer(read_only=True)
    pickups = serializers.SerializerMethodField()
    dropoffs = serializers.SerializerMethodField()
    
    class Meta:
        model = RouteStop
        fields = [
            'id', 'order', 'warehouse', 'distance_from_previous', 
            'estimated_arrival', 'completed_at', 'pickups', 'dropoffs'
        ]
        
    def get_pickups(self, obj):
        # Find packages linked to this route that start at this stop
        route_packages = RoutePackage.objects.filter(pickup_stop=obj).select_related('package')
        packages = [rp.package for rp in route_packages]
        return PackageSimpleSerializer(packages, many=True).data

    def get_dropoffs(self, obj):
        # Find packages linked to this route that end at this stop
        route_packages = RoutePackage.objects.filter(dropoff_stop=obj).select_related('package')
        packages = [rp.package for rp in route_packages]
        return PackageSimpleSerializer(packages, many=True).data

class CourierRouteDetailSerializer(serializers.ModelSerializer):
    stops = CourierStopSerializer(many=True, read_only=True)
    
    class Meta:
        model = Route
        fields = [
            'id', 'status', 'scheduled_date', 
            'total_distance', 'estimated_duration', 
            'started_at', 'completed_at', 'stops'
        ]