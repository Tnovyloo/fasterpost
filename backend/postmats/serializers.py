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

class StashSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stash
        fields = [
            "postmat",
            "size",
            "is_empty",
            "reserved_until",
        ]