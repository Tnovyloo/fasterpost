from rest_framework import serializers
from .models import *


class UserLoginSerializer(serializers.Serializer):
    """Serializer for user login purpose"""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    class Meta:
        fields = [
            "email",
            "password",
        ]


class UserRegisterSerializer(serializers.ModelSerializer):
    """Serializer for registering purpose"""

    password_1 = serializers.CharField(write_only=True)
    password_2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            # 'username',
            "email",
            "password_1",
            "password_2",
        ]


class ResendTokenSerializer(serializers.Serializer):
    """Serializer for validating data of resending verication token to user e-mail"""

    email = serializers.EmailField(write_only=True)

    class Meta:
        fields = ["email"]


class UserVerifyToken(serializers.Serializer):
    """Serializer for validating data of user that verifies own E-mail"""

    verify_token = serializers.CharField(write_only=True)
    uid = serializers.CharField(write_only=True)

    class Meta:
        fields = ["verify_token", "uid"]


class PasswordResetSerializer(serializers.Serializer):
    """Serializer for sending password reset e-mail"""

    email = serializers.EmailField(write_only=True)

    class Meta:
        fields = ["email"]


class PasswordResetVerifySerializer(serializers.Serializer):
    """Serializer for verifing user new password and token for resetting"""

    password_1 = serializers.CharField(write_only=True)
    password_2 = serializers.CharField(write_only=True)
    verify_token = serializers.CharField(write_only=True)
    uid = serializers.CharField(write_only=True)

    class Meta:
        fields = [
            "password_1",
            "password_2",
            "verify_token",
            "uid",
        ]


class UserUnSafeSerializerForTests(serializers.ModelSerializer):
    """WARNING THIS IS JUST FOR DEV PURPOSES"""

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "phone_number",
            "date_joined",
            "is_active",
        ]
