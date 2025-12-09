from rest_framework import serializers
from logistics.models import Warehouse

class WarehouseSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Warehouse
        fields = ['id', 'city', 'latitude', 'longitude', 'address']