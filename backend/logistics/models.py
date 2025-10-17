from django.db import models
import uuid

class Warehouse(models.Model):
    # Enum for warehouse status
    class WarehouseStatus(models.TextChoices):
        ACTIVE = 'active', 'Active'
        INACTIVE = 'inactive', 'Inactive'
        UNDER_MAINTENANCE = 'under_maintenance', 'Under Maintenance'

    # Model fields
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    city = models.CharField(max_length=60)
    latitude = models.FloatField()
    longitude = models.FloatField()
    status = models.CharField(max_length=20, choices=WarehouseStatus.choices, default='active')
    connections = models.JSONField(default=list)

    # Dev string representation
    def __str__(self):
        return f"Warehouse {self.id} in {self.city} ({self.status})"
    

class Route(models.Model):
    # Enum for route status
    class RouteStatus(models.TextChoices):
        OPERATIONAL = 'operational', 'Operational'
        DELAYED = 'delayed', 'Delayed'
        CLOSED = 'closed', 'Closed'

    # Model fields
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    origin = models.ForeignKey(Warehouse, related_name='route_origins', on_delete=models.CASCADE)
    destination = models.ForeignKey(Warehouse, related_name='route_destinations', on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=RouteStatus.choices, default='operational')

    # Dev string representation
    def __str__(self):
        return f"Route {self.id} from {self.origin.city} to {self.destination.city} ({self.status})"

    def save(self, *args, **kwargs):
        # Ensure origin and destination are not the same
        if self.origin == self.destination:
            raise ValueError("Origin and destination warehouses must be different.")

        super().save(*args, **kwargs)

