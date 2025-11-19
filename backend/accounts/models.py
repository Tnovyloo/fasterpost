from datetime import timedelta
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.conf import settings
from django.core.exceptions import ValidationError
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from rest_framework.authtoken.models import Token
from django.utils.timezone import now
from django.conf import settings

import pyotp


class ExpiringToken(Token):
    """Override for ExpiringToken"""

    expires_at = models.DateTimeField(null=True, blank=True)

    def has_expired(self):
        return self.expires_at and now() > self.expires_at

    def save(self, *args, **kwargs):
        if not self.expires_at:
            expiry_days = getattr(
                settings, "TOKEN_EXPIRY_DAYS", 7
            )  # Default is 7 days.
            self.expires_at = now() + timedelta(days=expiry_days)
        super().save(*args, **kwargs)


class MyAccountManager(BaseUserManager):
    def create_user(self, email, username, password=None, o_auth=False):
        if not email and email is None:
            raise ValueError("User must provide an e-mail address.")

        user = self.model(
            email=self.normalize_email(email),
            username=self.normalize_email(username),
        )

        if o_auth:
            user.set_unusable_password()  # No password for OAuth users
        else:
            # Validate and set password for non-OAuth users
            errors = dict()
            try:
                validate_password(password=password, user=user)
            except ValidationError as e:
                errors["password"] = list(e.messages)
                raise ValidationError(errors)
            user.set_password(password)

        user.save(using=self._db)

        if not o_auth:
            verification, created = EmailVerification.objects.get_or_create(user=user)
            verification.save()

        return user

    def create_superuser(self, email, password):
        """This method extends a create_superuser() method"""
        user = self.create_user(
            # first_name=first_name,
            # last_name=last_name,
            username=email,
            email=email,
            password=password,
        )
        user.is_admin = True
        user.is_active = True
        user.is_staff = True
        user.is_superadmin = True
        # user.email_verified = True

        verification, created = EmailVerification.objects.get_or_create(user=user)
        verification.verified = True
        verification.save()

        user.save(using=self._db)

        return user


class User(AbstractBaseUser):
    class Roles(models.TextChoices):
        NORMAL = "normal", "Normal User"
        COURIER = "courier", "Courier"
        WAREHOUSE_COURIER = "warehouse", "Warehouse Courier"
        BUSINESS = "business", "Business User"

    role = models.CharField(max_length=20, choices=Roles.choices, default=Roles.NORMAL)

    first_name = models.CharField(max_length=50, default=None, blank=True, null=True)
    last_name = models.CharField(max_length=50, default=None, blank=True, null=True)
    email = models.EmailField(max_length=100, unique=True)
    username = models.CharField(max_length=100, unique=True, default=None)
    phone_number = models.CharField(max_length=50, default=None, blank=True, null=True)

    date_joined = models.DateTimeField(auto_now_add=True)

    is_admin = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = MyAccountManager()

    def __str__(self):
        return self.email

    def has_perm(self, perm, obj=None):
        return self.is_admin

    def has_module_perms(self, add_label):
        return True

    def full_name(self):
        return f"{str(self.first_name).capitalize()} {str(self.last_name).capitalize()}"

    class Meta:
        db_table = "auth_user"


class EmailVerification(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_query_name="verification",
    )
    verified = models.BooleanField(default=False)
    email_verification_sended = models.BooleanField(default=False)
    token = models.CharField(max_length=1000, default=None, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)


class ResetPasswordToken(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_query_name="password_reset_token",
    )
    token = models.CharField(max_length=1000, default=None, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)


class UserTOTP(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="totp")
    secret = models.CharField(max_length=32)
    confirmed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def provisioning_uri(self):
        return pyotp.totp.TOTP(self.secret).provisioning_uri(
            name=self.user.email, issuer_name="YourAppName"
        )
