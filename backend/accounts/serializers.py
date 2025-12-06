from rest_framework import serializers
from .models import *

import pyotp


class UserLoginSerializer(serializers.Serializer):
    """Serializer for user login purpose"""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    code = serializers.CharField(required=False)

    class Meta:
        fields = [
            "email",
            "password",
            "code",
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


class SafeUserSerializer(serializers.ModelSerializer):
    role = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "username",
            "first_name",
            "last_name",
            "phone_number",
            "role",
            "date_joined",
        )
        read_only_fields = ("id", "role", "date_joined")

    def validate_username(self, value):
        user = self.context["request"].user
        qs = User.objects.filter(username__iexact=value).exclude(pk=user.pk)
        if qs.exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def validate_email(self, value):
        user = self.context["request"].user
        qs = User.objects.filter(email__iexact=value).exclude(pk=user.pk)
        if qs.exists():
            raise serializers.ValidationError("This email is already taken.")
        return value

    def update(self, instance, validated_data):
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        return instance


class EnableTOTPSerializer(serializers.Serializer):
    pass  # no input


class VerifyTOTPSerializer(serializers.Serializer):
    code = serializers.CharField()


class DisableTOTPSerializer(serializers.Serializer):
    pass


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for displaying user profile information"""

    role_display = serializers.CharField(source="get_role_display", read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "first_name",
            "last_name",
            "username",
            "email",
            "phone_number",
            "role",
            "role_display",
            "date_joined",
        ]
        read_only_fields = ["id", "email", "role", "role_display", "date_joined"]


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile information"""

    class Meta:
        model = User
        fields = ["first_name", "last_name", "username", "phone_number"]

    def validate_username(self, value):
        """Ensure username is unique, excluding current user"""
        user = self.context["request"].user
        if User.objects.exclude(pk=user.pk).filter(username=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def validate_first_name(self, value):
        """Optional: Add first name validation"""
        if value and len(value) < 2:
            raise serializers.ValidationError(
                "First name must be at least 2 characters long."
            )
        return value

    def validate_last_name(self, value):
        """Optional: Add last name validation"""
        if value and len(value) < 2:
            raise serializers.ValidationError(
                "Last name must be at least 2 characters long."
            )
        return value


# Admin panel serializers
# users/serializers.py

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError


class AdminUserSerializer(serializers.ModelSerializer):
    """Admin panel serializer with secure password handling."""

    password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
        style={"input_type": "password"},
    )

    confirm_password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
        style={"input_type": "password"},
    )

    class Meta:
        model = User
        fields = [
            "id",
            "role",
            "first_name",
            "last_name",
            "email",
            "username",
            "phone_number",
            "date_joined",
            "is_admin",
            "is_staff",
            "is_active",
            "is_superuser",
            "password",
            "confirm_password",
        ]
        read_only_fields = ["date_joined", "id"]
        extra_kwargs = {
            "password": {"write_only": True},
            "confirm_password": {"write_only": True},
        }

    def validate(self, attrs):
        """Validate password fields."""
        password = attrs.get("password", "").strip()  # Strip whitespace
        confirm_password = attrs.pop("confirm_password", "").strip()  # Strip whitespace

        print("heh", password, " xd ", confirm_password)

        # If password is provided and not empty, validate it
        if password:
            # Check if passwords match
            if password != confirm_password:
                raise serializers.ValidationError(
                    {"password": "Passwords do not match."}
                )

            # Validate password strength
            try:
                user = self.instance if self.instance else User(**attrs)
                validate_password(password, user)
            except DjangoValidationError as e:
                raise serializers.ValidationError({"password": list(e.messages)})

            # Keep the password in attrs for create/update
            attrs["password"] = password
        else:
            # Remove empty password from attrs
            attrs.pop("password", None)

            # Password is required when creating a new user
            if not self.instance:
                raise serializers.ValidationError(
                    {"password": "Password is required when creating a new user."}
                )

        return attrs

    def create(self, validated_data):
        """Create user with hashed password."""
        password = validated_data.pop("password")
        user = User.objects.create_user(
            email=validated_data["email"],
            username=validated_data["username"],
            password=password,
        )

        # Set other fields
        for attr, value in validated_data.items():
            setattr(user, attr, value)

        user.save()
        return user

    def update(self, instance, validated_data):
        """Update user, only hash password if provided."""
        password = validated_data.pop("password", None)

        # Update all other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Only update password if provided and not empty
        if password:
            instance.set_password(password)

        instance.save()
        return instance
