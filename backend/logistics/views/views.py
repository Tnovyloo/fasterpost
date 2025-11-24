from django.shortcuts import render
from rest_framework.response import Response

from logistics.models import Warehouse
from logistics.serializers import WarehouseSimpleSerializer
from rest_framework.views import APIView

class WarehouseSimpleView(APIView):
    def get(self, request):
        warehouses = Warehouse.objects.all()
        serializer = WarehouseSimpleSerializer(warehouses, many=True)

        return Response(serializer.data)