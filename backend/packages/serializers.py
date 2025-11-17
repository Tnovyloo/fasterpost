from .models import Package, Actualization
from rest_framework import serializers

class PackageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.firstname', read_only=True)
    receiver_name = serializers.CharField(source='receiver.firstname', read_only=True)

    origin_postmat_name = serializers.CharField(source='origin_postmat.name', read_only=True)
    destination_postmat_name = serializers.CharField(source='destination_postmat.name', read_only=True)
    
    destination_postmat_lat = serializers.CharField(source='destination_postmat.latitude', read_only=True)
    destination_postmat_long = serializers.CharField(source='destination_postmat.longitude', read_only=True)

    class Meta:
        model = Package
        fields = '__all__'

class PackageListSerializer(serializers.ModelSerializer):
    latest_status = serializers.CharField(read_only=True)
    origin_postmat_name = serializers.CharField(source='origin_postmat.name', read_only=True)
    destination_postmat_name = serializers.CharField(source='destination_postmat.name', read_only=True)
    latest_status_display = serializers.SerializerMethodField()
    
    def get_latest_status_display(self, obj):
        value = obj.latest_status
        if not value:
            return None
        return Actualization.PackageStatus(value).label
    class Meta:
        model = Package
        fields = ['id', 'latest_status', 'latest_status_display', 'origin_postmat_name', 'destination_postmat_name', 'size', 'weight']

class ActualizationSerializer(serializers.ModelSerializer):
    warehouse_city = serializers.CharField(source='warehouse_id.city', read_only=True, allow_null=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Actualization
        fields = ['id', 'status', 'warehouse_city', 'status_display', 'created_at']

class PackageDetailSerializer(serializers.ModelSerializer):
    actualizations = ActualizationSerializer(many=True, read_only=True)
    size_display = serializers.CharField(source="get_size_display", read_only=True)

    destination_postmat_lat = serializers.CharField(source='destination_postmat.latitude', read_only=True)
    destination_postmat_long = serializers.CharField(source='destination_postmat.longitude', read_only=True)

    class Meta:
        model = Package
        fields = '__all__'

