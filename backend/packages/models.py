from django.db import models
import uuid

from postmats.models import Postmat
from logistics.models import Warehouse, Route
from accounts.models import User

class Package(models.Model):
    class PackageSize(models.TextChoices):
        SMALL = 'small', 'Small'
        MEDIUM = 'medium', 'Medium'
        LARGE = 'large', 'Large'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pickup_code = models.CharField(max_length=10, blank=True, null=True)
    origin_postmat = models.ForeignKey(Postmat, on_delete=models.CASCADE, related_name='origin_packages')
    destination_postmat = models.ForeignKey(Postmat, on_delete=models.CASCADE, related_name='destination_packages')
    receiver_name = models.CharField(max_length=255)
    receiver_phone = models.CharField(max_length=20)
    size = models.CharField(max_length=10, choices=PackageSize.choices)
    weight = models.PositiveIntegerField()
    unlock_code = models.CharField(max_length=10, blank=True, null=True)
    route_path = models.JSONField()


class Actualization(models.Model):
    class PackageStatus(models.TextChoices):
        CREATED = 'created', 'Created'
        PLACED_IN_STASH = 'placed_in_stash', 'Placed in Stash'
        IN_TRANSIT = 'in_transit', 'In Transit'
        IN_WAREHOUSE = 'in_warehouse', 'In Warehouse'
        DELIVERED = 'delivered', 'Delivered'
        PICKED_UP = 'picked_up', 'Picked Up'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    package_id = models.ForeignKey(Package, on_delete=models.CASCADE, related_name='actualizations')
    status = models.CharField(max_length=20, choices=PackageStatus.choices, default='created')
    courier_id = models.ForeignKey(User, on_delete=models.CASCADE, related_name='actualizations', null=True, blank=True)
    warehouse_id = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='actualizations', null=True, blank=True)
    route_remaining = models.JSONField(null=True, blank=True)
    routes = models.ManyToManyField(Route, related_name='actualizations', blank=True)