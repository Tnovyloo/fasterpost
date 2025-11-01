from .models import Package
from rest_framework import serializers

class PackageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.firstname', read_only=True)
    receiver_name = serializers.CharField(source='receiver.firstname', read_only=True)
    origin_postmat_name = serializers.CharField(source='origin_postmat.name', read_only=True)
    destination_postmat_name = serializers.CharField(source='destination_postmat.name', read_only=True)

    class Meta:
        model = Package
        fields = '__all__'

