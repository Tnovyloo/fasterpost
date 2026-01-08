from rest_framework import serializers
from .models import BusinessUserRequest


class BusinessUserRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessUserRequest
        fields = ["id", "company_name", "tax_id", "status", "created_at"]
        read_only_fields = ["status", "created_at"]
