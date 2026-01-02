from django.db import models, transaction
from django.conf import settings
from django.utils import timezone
from proj import utils
import uuid
import requests
import time

class Warehouse(models.Model):
    class WarehouseStatus(models.TextChoices):
        ACTIVE = 'active', 'Active'
        INACTIVE = 'inactive', 'Inactive'
        UNDER_MAINTENANCE = 'under_maintenance', 'Under Maintenance'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    city = models.CharField(max_length=60)
    latitude = models.FloatField()
    longitude = models.FloatField()
    status = models.CharField(max_length=20, choices=WarehouseStatus.choices, default='active')
    connections = models.JSONField(default=list)
    address = models.CharField(max_length=255, blank=True, null=True, help_text="Cached address from geocoding")

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
        if not self.connections:
            return []
        if isinstance(self.connections[0], dict):
            return [str(c["id"]) for c in self.connections]
        return [str(conn_id) for conn_id in self.connections]

    @transaction.atomic
    def save(self, *args, **kwargs):
        should_fetch = False
        if self._state.adding and not self.address:
            should_fetch = True
        else:
            try:
                old = Warehouse.objects.get(pk=self.pk)
                if (old.latitude != self.latitude or old.longitude != self.longitude) and not self.address:
                    should_fetch = True
            except Warehouse.DoesNotExist:
                pass

        if should_fetch:
            try:
                fetched = self._fetch_osm_address()
                if fetched:
                    self.address = fetched
                    time.sleep(1.1) 
            except Exception as e:
                print(f"Warning: Geocoding failed for {self.city}: {e}")

        super().save(*args, **kwargs)

        intended_ids = self._extract_ids()
        new_conns = []
        for wid in intended_ids:
            try:
                wh = Warehouse.objects.get(id=wid)
            except Warehouse.DoesNotExist:
                continue
            new_conns.append(self._make_entry(wh))

        if self.connections != new_conns:
            self.connections = new_conns
            super().save(update_fields=["connections"])

        all_related_warehouses = Warehouse.objects.exclude(id=self.id)
        for other in all_related_warehouses:
            other_ids = other._extract_ids()
            my_id = str(self.id)
            should_be_connected = str(other.id) in intended_ids
            is_connected = my_id in other_ids
            
            if should_be_connected and not is_connected:
                other_ids.append(my_id)
            elif not should_be_connected and is_connected:
                other_ids = [oid for oid in other_ids if oid != my_id]
            else:
                continue
            
            updated_other_conns = []
            for oid in other_ids:
                try:
                    w = Warehouse.objects.get(id=oid)
                except Warehouse.DoesNotExist:
                    continue
                updated_other_conns.append(other._make_entry(w))
            
            other.connections = updated_other_conns
            super(Warehouse, other).save(update_fields=["connections"])

    def _fetch_osm_address(self) -> str:
        if not self.latitude or not self.longitude:
            return ""
        url = "https://nominatim.openstreetmap.org/reverse"
        params = {"format": "json", "lat": self.latitude, "lon": self.longitude, "zoom": 14, "addressdetails": 1}
        headers = {"User-Agent": "LogisticApp/1.0", "Accept-Language": "pl"}
        try:
            resp = requests.get(url, params=params, headers=headers, timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                addr = data.get('address', {})
                city = addr.get('city', '') or addr.get('town', '') or addr.get('village', '')
                state = addr.get('state', '')
                road = addr.get('road', '')
                parts = []
                if road: parts.append(road)
                if city: parts.append(city)
                if state: parts.append(state)
                return ", ".join(parts) if parts else data.get('display_name', '')[:255]
        except Exception:
            return ""
        return ""

class Route(models.Model):
    STATUS_CHOICES = [
        ('planned', 'Planned'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    # NEW: Differentiate between big trucks and local vans
    TYPE_CHOICES = [
        ('line_haul', 'Line Haul (Warehouse-to-Warehouse)'),
        ('last_mile', 'Last Mile (Local Delivery)'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    courier = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='routes', # Changed related_name to be generic
        limit_choices_to={'role': 'warehouse'} # Ideally split roles later
    )
    route_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='line_haul')
    created_at = models.DateTimeField(auto_now_add=True)
    scheduled_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planned')
    total_distance = models.FloatField(help_text="Total route distance in km")
    estimated_duration = models.IntegerField(null=True, blank=True, help_text="Minutes")
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.route_type.title()} Route {self.id} - {self.courier.email}"
    
    # ... (start_route / complete_route methods can stay same)

class RouteStop(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    route = models.ForeignKey(Route, on_delete=models.CASCADE, related_name='stops')
    
    # UPDATED: Can stop at Warehouse OR Postmat
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, null=True, blank=True)
    postmat = models.ForeignKey('postmats.Postmat', on_delete=models.CASCADE, null=True, blank=True)
    
    order = models.IntegerField(help_text="Stop sequence (0 = first)")
    distance_from_previous = models.FloatField(default=0, help_text="km from previous stop")
    estimated_arrival = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['route', 'order']
        unique_together = ['route', 'order']
    
    def __str__(self):
        loc = self.warehouse.city if self.warehouse else (self.postmat.name if self.postmat else "Unknown")
        return f"Stop {self.order}: {loc}"

class RoutePackage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    route = models.ForeignKey(Route, on_delete=models.CASCADE, related_name='route_packages')
    package = models.ForeignKey('packages.Package', on_delete=models.CASCADE, related_name='route_assignments')
    pickup_stop = models.ForeignKey(RouteStop, on_delete=models.CASCADE, related_name='pickups')
    dropoff_stop = models.ForeignKey(RouteStop, on_delete=models.CASCADE, related_name='dropoffs')
    
    class Meta:
        unique_together = ['route', 'package']