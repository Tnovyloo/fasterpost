from rest_framework import serializers
from .models import Postmat, Stash

class PostmatSerializer(serializers.ModelSerializer):
    class Meta:
        model = Postmat
        fields = [
            "name",
            "warehouse_id",
            "status",
            "latitude",
            "longitude",
        ]