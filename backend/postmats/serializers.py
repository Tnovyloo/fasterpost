from rest_framework import serializers
from .models import Postmat, Stash, Zone
from logistics.models import Warehouse
from logistics.serializers.serializers import WarehouseSimpleSerializer


class PostmatSerializer(serializers.ModelSerializer):
    class Meta:
        model = Postmat
        fields = [
            "id",
            "name",
            "warehouse_id",
            "status",
            "address",
            "latitude",
            "longitude",
            "image",
            "postal_code",
        ]

class StashSerializer(serializers.ModelSerializer):
    display_size = serializers.CharField(source="get_size_display", read_only=True)

    class Meta:
        model = Stash
        fields = [
            "id",
            "postmat",
            "size",
            "display_size",
            "is_empty",
            "reserved_until",
        ]

class PostmatAdminSerializer(serializers.ModelSerializer):
    warehouse = WarehouseSimpleSerializer(read_only=True)
    warehouse_id = serializers.PrimaryKeyRelatedField(
        queryset=Warehouse.objects.all(), source="warehouse", write_only=True
    )
    stashes = StashSerializer(many=True, read_only=True)
    display_status = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Postmat
        fields = [
            "id", "warehouse", "warehouse_id", "name", "status", "display_status", "address",
            "latitude", "longitude", "postal_code", "stashes", "image"
        ]
        read_only_fields = ["id"]

class StashAdminSerializer(serializers.ModelSerializer):
    postmat = serializers.PrimaryKeyRelatedField(
        queryset=Postmat.objects.all(), write_only=True
    )
    postmat_detail = PostmatAdminSerializer(source="postmat", read_only=True)
    reserved_until = serializers.DateTimeField(allow_null=True, required=False)

    class Meta:
        model = Stash
        fields = [
            "id", "postmat", "postmat_detail", 
            "size", "is_empty", "reserved_until"
        ]
        extra_kwargs = {
            "reserved_until": {"allow_null": True, "required": False},
        }
        read_only_fields = ["id"]

class ZoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Zone
        fields = ['id', 'name', 'color']

class PostmatSimpleSerializer(serializers.ModelSerializer):
    """Minimal info for routing displays"""
    zone = ZoneSerializer(read_only=True)
    
    class Meta:
        model = Postmat
        fields = ['id', 'name', 'address', 'latitude', 'longitude', 'postal_code', 'zone']

class LocalRouteGenerationSerializer(serializers.Serializer):
    """Input validation for generating local routes"""
    warehouse_id = serializers.UUIDField(required=True, help_text="UUID of the Warehouse to generate local routes for")
    date = serializers.DateField(required=False, help_text="Date for route generation (YYYY-MM-DD). Defaults to today.")