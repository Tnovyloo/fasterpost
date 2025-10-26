from rest_framework import serializers
from .models import Postmat, Stash

class PostmatInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Postmat
        fields = [
            "name",
            "status",
            "latitude",
            "longitude",
        ]