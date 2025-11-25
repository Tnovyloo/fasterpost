from django.db import models, transaction
from proj import utils
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
    
    def _calculate_distance_to(self, other):
        return round(
            utils.haversine(
                float(self.latitude), float(self.longitude),
                float(other.latitude), float(other.longitude)
            ),
            3
        )

    def _make_entry(self, other):
        return {
            "id": str(other.id),
            "distance": self._calculate_distance_to(other)
        }

    def _extract_ids(self):
        """Extract IDs from connections, whether user provided IDs or full dicts."""
        if not self.connections:
            return []
        # if dicts: [{"id": "...", ...}]
        if isinstance(self.connections[0], dict):
            return [c["id"] for c in self.connections]
        # if raw: ["id1", "id2"]
        return list(self.connections)
    
    @transaction.atomic
    def save(self, *args, **kwargs):
        # FIRST SAVE (so object has ID)
        super().save(*args, **kwargs)

        # Extract IDs user intended
        intended_ids = self._extract_ids()

        # Prepare new connections for self
        new_conns = []
        for wid in intended_ids:
            try:
                wh = Warehouse.objects.get(id=wid)
            except Warehouse.DoesNotExist:
                continue
            new_conns.append(self._make_entry(wh))

        # Persist updated format
        if self.connections != new_conns:
            self.connections = new_conns
            super().save(update_fields=["connections"])

        for wid in intended_ids:
            try:
                other = Warehouse.objects.get(id=wid)
            except Warehouse.DoesNotExist:
                continue

            other_ids = other._extract_ids()

            # If A → B exists but B → A doesn't → add it
            if str(self.id) not in other_ids:
                other_ids.append(str(self.id))

            # Recompute their formatted connections list
            updated_other_conns = []
            for oid in other_ids:
                try:
                    w = Warehouse.objects.get(id=oid)
                except Warehouse.DoesNotExist:
                    continue
                updated_other_conns.append(other._make_entry(w))

            # Save updated B
            other.connections = updated_other_conns
            super(Warehouse, other).save(update_fields=["connections"])

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

