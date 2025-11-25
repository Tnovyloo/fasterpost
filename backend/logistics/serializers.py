from rest_framework import serializers
from .models import Warehouse
from django.db import transaction

class WarehouseSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Warehouse
        fields = ["id", "city"]

class WarehouseAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Warehouse
        fields = [
            "id", "city", "status", "connections"
        ]
        read_only_fields = ["id"]

class WarehouseConnectionSerializer(serializers.Serializer):
    """Serializer for warehouse connection details"""
    id = serializers.UUIDField()
    distance = serializers.FloatField()


class WarehouseListSerializer(serializers.ModelSerializer):
    """Serializer for listing warehouses with basic connection info"""
    connections = serializers.SerializerMethodField()
    
    class Meta:
        model = Warehouse
        fields = ['id', 'city', 'latitude', 'longitude', 'status', 'connections']
        read_only_fields = ['id']
    
    def get_connections(self, obj):
        """Convert connections JSONField to proper format"""
        if not obj.connections:
            return []
        
        # If connections is already a list of dicts with id and distance, return as is
        if isinstance(obj.connections, list) and len(obj.connections) > 0:
            if isinstance(obj.connections[0], dict) and 'id' in obj.connections[0]:
                return obj.connections
        
        # If connections is a list of IDs, we need to fetch the warehouses
        # This shouldn't happen after your model's save() method runs, but just in case
        return []


class WarehouseDetailSerializer(serializers.ModelSerializer):
    """Serializer for warehouse detail/create/update with connection management"""
    connections = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False,
        help_text="List of warehouse UUIDs to connect with"
    )
    connections_detail = serializers.SerializerMethodField(
        read_only=True,
        help_text="Detailed connection information with distances"
    )
    
    class Meta:
        model = Warehouse
        fields = ['id', 'city', 'latitude', 'longitude', 'status', 'connections', 'connections_detail']
        read_only_fields = ['id', 'connections_detail']
    
    def get_connections_detail(self, obj):
        """Get formatted connections with id and distance"""
        if not obj.connections:
            return []
        
        # If connections is already properly formatted, return it
        if isinstance(obj.connections, list) and len(obj.connections) > 0:
            if isinstance(obj.connections[0], dict) and 'id' in obj.connections[0]:
                return obj.connections
        
        return []
    
    def validate_connections(self, value):
        """Ensure all connection IDs exist and don't include self"""
        if not value:
            return []
        
        # Check if warehouses exist
        existing_ids = set(Warehouse.objects.filter(id__in=value).values_list('id', flat=True))
        invalid_ids = set(value) - existing_ids
        
        if invalid_ids:
            raise serializers.ValidationError(
                f"The following warehouse IDs do not exist: {', '.join(str(id) for id in invalid_ids)}"
            )
        
        # Check for duplicates
        if len(value) != len(set(value)):
            raise serializers.ValidationError("Duplicate warehouse IDs in connections")
        
        return value
    
    def validate(self, data):
        """Validate that warehouse doesn't connect to itself"""
        connections = data.get('connections', [])
        instance_id = self.instance.id if self.instance else None
        
        if instance_id and str(instance_id) in [str(conn_id) for conn_id in connections]:
            raise serializers.ValidationError({
                'connections': 'A warehouse cannot connect to itself'
            })
        
        return data
    
    @transaction.atomic
    def create(self, validated_data):
        """Create warehouse and set up connections"""
        connections = validated_data.pop('connections', [])
        warehouse = Warehouse.objects.create(**validated_data)
        
        # Set connections (the model's save method handles bidirectional setup)
        warehouse.connections = connections
        warehouse.save()
        
        return warehouse
    
    @transaction.atomic
    def update(self, instance, validated_data):
        """Update warehouse and manage connections"""
        connections = validated_data.pop('connections', None)
        
        # Update basic fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Update connections if provided
        if connections is not None:
            instance.connections = connections
        
        instance.save()
        return instance
