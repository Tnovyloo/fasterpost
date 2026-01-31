import uuid
from django.db import models
from accounts.models import User
from decimal import Decimal

from packages.models import Package


class Payment(models.Model):
    class PaymentStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        SUCCEEDED = "succeeded", "Succeeded"
        FAILED = "failed", "Failed"
        REFUNDED = "refunded", "Refunded"
        CANCELLED = "cancelled", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    package = models.OneToOneField(
        Package, on_delete=models.CASCADE, related_name="payment"
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE)

    # Stripe fields
    stripe_payment_intent_id = models.CharField(max_length=255, null=True, blank=True)
    stripe_client_secret = models.CharField(max_length=255, null=True, blank=True)

    # Payment details
    amount = models.DecimalField(max_digits=10, decimal_places=2)  # Total amount in USD
    currency = models.CharField(max_length=3, default="USD")
    status = models.CharField(
        max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.PENDING
    )

    # Pricing breakdown
    base_price = models.DecimalField(max_digits=10, decimal_places=2)
    size_surcharge = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    weight_surcharge = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    # Metadata
    payment_method = models.CharField(max_length=50, null=True, blank=True)
    failure_reason = models.TextField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Payment {self.id} - {self.status} - ${self.amount}"


class PricingRule(models.Model):
    """Dynamic pricing configuration"""

    # Base price
    base_price = models.DecimalField(max_digits=10, decimal_places=2, default=5.00)

    # Size-based pricing
    small_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    medium_price = models.DecimalField(max_digits=10, decimal_places=2, default=3.00)
    large_price = models.DecimalField(max_digits=10, decimal_places=2, default=7.00)

    # Weight-based pricing (per kg over threshold)
    weight_threshold_kg = models.IntegerField(default=5)  # Free up to 5kg
    price_per_kg = models.DecimalField(max_digits=10, decimal_places=2, default=1.50)

    # Active flag
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    @classmethod
    def get_active_pricing(cls):
        """Get the most recent active pricing rule"""
        return cls.objects.filter(is_active=True).first()

    @classmethod
    def calculate_price(cls, size, weight):
        """Calculate total price based on size and weight"""
        pricing = cls.get_active_pricing()
        if not pricing:
            # Fallback pricing if no rules exist
            pricing = cls.objects.create()

        # Base price
        base = pricing.base_price

        # Size surcharge
        size_map = {
            "small": pricing.small_price,
            "medium": pricing.medium_price,
            "large": pricing.large_price,
        }
        size_surcharge = size_map.get(size, Decimal("0.00"))

        # Weight surcharge
        weight_surcharge = Decimal("0.00")
        if weight > pricing.weight_threshold_kg:
            extra_kg = weight - pricing.weight_threshold_kg
            weight_surcharge = Decimal(extra_kg) * pricing.price_per_kg

        total = base + size_surcharge + weight_surcharge

        return {
            "base_price": base,
            "size_surcharge": size_surcharge,
            "weight_surcharge": weight_surcharge,
            "total": total,
        }

    def __str__(self):
        return f"Pricing Rule - Base: ${self.base_price} (Active: {self.is_active})"


class WebhookEvent(models.Model):
    """Log Stripe webhook events for debugging"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    stripe_event_id = models.CharField(max_length=255, unique=True)
    event_type = models.CharField(max_length=100)
    payload = models.JSONField()
    processed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.event_type} - {self.created_at}"
