from rest_framework import serializers
from .models import Warehouse

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
