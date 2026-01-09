from rest_framework import serializers
from .models import BusinessUserRequest


class BusinessUserRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessUserRequest
        fields = ["id", "company_name", "tax_id", "status", "created_at"]
        read_only_fields = ["status", "created_at"]


class BusinessPackageCreateSerializer(serializers.Serializer):
    magazine_id = serializers.IntegerField()
    destination_postmat_id = serializers.UUIDField()
    receiver_name = serializers.CharField(max_length=255)
    receiver_phone = serializers.CharField(max_length=20)
    receiver_email = serializers.EmailField()
    size = serializers.ChoiceField(choices=["S", "M", "L", "small", "medium", "large"])
    weight = serializers.IntegerField(min_value=1)
