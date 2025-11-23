from rest_framework import serializers
from .models import Warehouse

class WarehouseSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Warehouse
        fields = ["id", "city"]