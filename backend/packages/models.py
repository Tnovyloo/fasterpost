from django.db import models
import uuid
import random
import string
from accounts.models import User


# --- Helper to generate short unique codes ---
def generate_tracking_code():
    """Generates a random string like 'TRK-9X2A1'"""
    chars = string.ascii_uppercase + string.digits
    code = "".join(random.choices(chars, k=8))
    return f"TRK-{code}"


class Package(models.Model):
    class PackageSize(models.TextChoices):
        SMALL = "small", "Small"
        MEDIUM = "medium", "Medium"
        LARGE = "large", "Large"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # This will now be your friendly Tracking Number
    pickup_code = models.CharField(max_length=15, blank=True, null=True, unique=True)

    origin_postmat = models.ForeignKey(
        "postmats.Postmat",
        on_delete=models.CASCADE,
        related_name="origin_packages",
        null=True,
        blank=True,
    )
    destination_postmat = models.ForeignKey(
        "postmats.Postmat",
        on_delete=models.CASCADE,
        related_name="destination_packages",
        null=True,
        blank=True,
    )
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    receiver_name = models.CharField(max_length=255)
    receiver_phone = models.CharField(max_length=20)
    receiver_user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="receiver_user",
    )
    receiver_email = models.CharField(max_length=100, null=True, blank=True)
    size = models.CharField(max_length=10, choices=PackageSize.choices)
    weight = models.PositiveIntegerField()

    source_magazine = models.ForeignKey(
        "business.Magazine",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="packages",
    )
    receiver_address = models.CharField(max_length=255, null=True, blank=True)

    # This is the secret PIN to open the locker
    unlock_code = models.CharField(max_length=10, blank=True, null=True)

    route_path = models.JSONField()

    def save(self, *args, **kwargs):
        # Auto-generate tracking code if missing
        if not self.pickup_code:
            unique = False
            while not unique:
                new_code = generate_tracking_code()
                if not Package.objects.filter(pickup_code=new_code).exists():
                    self.pickup_code = new_code
                    unique = True

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.pickup_code} ({self.size})"


class Actualization(models.Model):
    class PackageStatus(models.TextChoices):
        CREATED = "created", "Created"
        PLACED_IN_STASH = "placed_in_stash", "Placed in Stash"
        IN_TRANSIT = "in_transit", "In Transit"
        IN_WAREHOUSE = "in_warehouse", "In Warehouse"
        DELIVERED = "delivered", "Delivered"
        PICKED_UP = "picked_up", "Picked Up"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    package_id = models.ForeignKey(
        Package, on_delete=models.CASCADE, related_name="actualizations"
    )
    status = models.CharField(
        max_length=20, choices=PackageStatus.choices, default="created"
    )
    courier_id = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="actualizations",
        null=True,
        blank=True,
    )
    warehouse_id = models.ForeignKey(
        "logistics.Warehouse",
        on_delete=models.CASCADE,
        related_name="actualizations",
        null=True,
        blank=True,
    )
    route_remaining = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    routes = models.ManyToManyField(
        "logistics.Route", related_name="actualizations", blank=True
    )

    class Meta:
        ordering = ["-created_at"]
