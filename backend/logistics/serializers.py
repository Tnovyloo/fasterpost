from rest_framework import serializers
from .models import Warehouse, Route, RoutePackage, RouteStop
from django.db import transaction

class WarehouseSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Warehouse
        fields = ["id", "city"]

class WarehouseListSerializer(serializers.ModelSerializer):
    connections = serializers.SerializerMethodField()
    
    class Meta:
        model = Warehouse
        fields = ['id', 'city', 'latitude', 'longitude', 'status', 'connections']
        read_only_fields = ['id']
    
    def get_connections(self, obj):
        if not obj.connections:
            return []
        if isinstance(obj.connections, list) and len(obj.connections) > 0:
            if isinstance(obj.connections[0], dict) and 'id' in obj.connections[0]:
                return obj.connections
        return []


class WarehouseDetailSerializer(serializers.ModelSerializer):
    connections = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False
    )
    connections_detail = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = Warehouse
        fields = ['id', 'city', 'latitude', 'longitude', 'status', 'connections', 'connections_detail']
        read_only_fields = ['id', 'connections_detail']
    
    def get_connections_detail(self, obj):
        if not obj.connections:
            return []
        if isinstance(obj.connections, list) and len(obj.connections) > 0:
            if isinstance(obj.connections[0], dict) and 'id' in obj.connections[0]:
                return obj.connections
        return []
    
    def validate_connections(self, value):
        if not value:
            return []
        
        existing_ids = set(Warehouse.objects.filter(id__in=value).values_list('id', flat=True))
        invalid_ids = set(value) - existing_ids
        
        if invalid_ids:
            raise serializers.ValidationError(
                f"The following warehouse IDs do not exist: {', '.join(str(id) for id in invalid_ids)}"
            )
        
        if len(value) != len(set(value)):
            raise serializers.ValidationError("Duplicate warehouse IDs in connections")
        
        return value
    
    def validate(self, data):
        connections = data.get('connections', [])
        instance_id = self.instance.id if self.instance else None
        
        if instance_id and str(instance_id) in [str(conn_id) for conn_id in connections]:
            raise serializers.ValidationError({
                'connections': 'A warehouse cannot connect to itself'
            })
        
        return data
    
    @transaction.atomic
    def create(self, validated_data):
        connections = validated_data.pop('connections', [])
        warehouse = Warehouse.objects.create(**validated_data)
        warehouse.connections = [str(conn_id) for conn_id in connections]
        warehouse.save()
        return warehouse
    
    @transaction.atomic
    def update(self, instance, validated_data):
        connections = validated_data.pop('connections', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        if connections is not None:
            instance.connections = [str(conn_id) for conn_id in connections]
        
        instance.save()
        return instance


class RouteStopSerializer(serializers.ModelSerializer):
    warehouse = WarehouseSimpleSerializer(read_only=True)
    
    class Meta:
        model = RouteStop
        fields = [
            'id', 'warehouse', 'order', 'distance_from_previous',
            'estimated_arrival', 'completed_at'
        ]


class RoutePackageSerializer(serializers.ModelSerializer):
    package_id = serializers.UUIDField(source='package.id', read_only=True)
    origin_warehouse = serializers.CharField(
        source='package.origin_postmat.warehouse.city',
        read_only=True
    )
    destination_warehouse = serializers.CharField(
        source='package.destination_postmat.warehouse.city',
        read_only=True
    )
    pickup_stop_order = serializers.IntegerField(source='pickup_stop.order', read_only=True)
    dropoff_stop_order = serializers.IntegerField(source='dropoff_stop.order', read_only=True)
    
    class Meta:
        model = RoutePackage
        fields = [
            'id', 'package_id', 'origin_warehouse', 'destination_warehouse',
            'pickup_stop_order', 'dropoff_stop_order'
        ]


class RouteListSerializer(serializers.ModelSerializer):
    courier_name = serializers.CharField(source='courier.full_name', read_only=True)
    stop_count = serializers.SerializerMethodField()
    package_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Route
        fields = [
            'id', 'courier_name', 'scheduled_date', 'status',
            'total_distance', 'estimated_duration', 'stop_count',
            'package_count', 'created_at'
        ]
    
    def get_stop_count(self, obj):
        return obj.stops.count()
    
    def get_package_count(self, obj):
        return obj.route_packages.count()


class RouteDetailSerializer(serializers.ModelSerializer):
    courier_name = serializers.CharField(source='courier.full_name', read_only=True)
    courier_email = serializers.CharField(source='courier.email', read_only=True)
    stops = RouteStopSerializer(many=True, read_only=True)
    packages = RoutePackageSerializer(source='route_packages', many=True, read_only=True)
    
    class Meta:
        model = Route
        fields = [
            'id', 'courier_name', 'courier_email', 'scheduled_date',
            'status', 'total_distance', 'estimated_duration',
            'started_at', 'completed_at', 'created_at',
            'stops', 'packages'
        ]
