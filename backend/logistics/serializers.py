from rest_framework import serializers
from .models import Warehouse
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
