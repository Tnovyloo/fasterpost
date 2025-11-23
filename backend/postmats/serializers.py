from rest_framework import serializers
from .models import Postmat, Stash
from logistics.models import Warehouse
from logistics.serializers import WarehouseSimpleSerializer


class PostmatSerializer(serializers.ModelSerializer):
    class Meta:
        model = Postmat
        fields = [
            "id",
            "name",
            "warehouse_id",
            "status",
            "latitude",
            "longitude",
        ]

class StashSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stash
        fields = [
            "postmat",
            "size",
            "is_empty",
            "reserved_until",
        ]

class PostmatAdminSerializer(serializers.ModelSerializer):
    warehouse = WarehouseSimpleSerializer(read_only=True)
    warehouse_id = serializers.PrimaryKeyRelatedField(
        queryset=Warehouse.objects.all(), source="warehouse", write_only=True
    )

    class Meta:
        model = Postmat
        fields = [
            "id", "warehouse", "warehouse_id", "name", "status",
            "latitude", "longitude", "postal_code"
        ]
        read_only_fields = ["id"]

class StashAdminSerializer(serializers.ModelSerializer):
    postmat = serializers.PrimaryKeyRelatedField(
        queryset=Postmat.objects.all(), write_only=True
    )
    postmat_detail = PostmatAdminSerializer(source="postmat", read_only=True)

    class Meta:
        model = Stash
        fields = [
            "id", "postmat", "postmat_detail",
            "size", "is_empty", "reserved_until"
        ]
        read_only_fields = ["id"]
