from django.db import models
import uuid
from logistics.models import Warehouse
from packages.models import Package


class Postmat(models.Model):
    class PostmatStatus(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"
        MAINTENANCE = "maintenance", "Maintenance"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    warehouse = models.ForeignKey(
        Warehouse, on_delete=models.CASCADE, related_name="postmats"
    )
    name = models.CharField(max_length=6)
    status = models.CharField(
        max_length=20, choices=PostmatStatus.choices, default="active"
    )
    latitude = models.FloatField()
    longitude = models.FloatField()
    postal_code = models.CharField(max_length=10, null=True, blank=True)


class Stash(models.Model):
    class StashSize(models.TextChoices):
        SMALL = "small", "Small"
        MEDIUM = "medium", "Medium"
        LARGE = "large", "Large"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    postmat = models.ForeignKey(
        Postmat, on_delete=models.CASCADE, related_name="stashes"
    )
    size = models.CharField(max_length=10, choices=StashSize.choices)
    is_empty = models.BooleanField(default=True)
    reserved_until = models.DateTimeField(null=True, blank=True)
    package = models.ForeignKey(
        "packages.Package",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="stash",
    )
