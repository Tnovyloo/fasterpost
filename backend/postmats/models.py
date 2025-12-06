from django.db import models
import uuid
import time
import requests
from logistics.models import Warehouse

class Postmat(models.Model):
    class PostmatStatus(models.TextChoices):
        ACTIVE = 'active', 'Active'
        INACTIVE = 'inactive', 'Inactive'
        MAINTENANCE = 'maintenance', 'Maintenance'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='postmats')
    name = models.CharField(max_length=50) # Zwiększyłem limit, bo nazwy mogą być dłuższe
    status = models.CharField(max_length=20, choices=PostmatStatus.choices, default='active')
    latitude = models.FloatField()
    longitude = models.FloatField()
    postal_code = models.CharField(max_length=10, null=True, blank=True)
    
    address = models.CharField(max_length=255, blank=True, null=True, help_text="Cached address from geocoding or seeder")

    def save(self, *args, **kwargs):
        should_fetch = False

        if self._state.adding:
            if not self.address:
                should_fetch = True
        else:
            try:
                old = Postmat.objects.get(pk=self.pk)
                if (old.latitude != self.latitude or old.longitude != self.longitude) and not self.address:
                    should_fetch = True
            except Postmat.DoesNotExist:
                pass

        if should_fetch:
            try:
                fetched_address = self._fetch_osm_address()
                if fetched_address:
                    self.address = fetched_address
                    time.sleep(1.1) 
            except Exception as e:
                print(f"Warning: Geocoding failed for {self.name}: {e}")

        super().save(*args, **kwargs)

    def _fetch_osm_address(self) -> str:
        """Pobiera adres z Nominatim API (OpenStreetMap)"""
        if not self.latitude or not self.longitude:
            return ""
            
        url = "https://nominatim.openstreetmap.org/reverse"
        params = {
            "format": "json",
            "lat": self.latitude,
            "lon": self.longitude,
            "zoom": 18,
            "addressdetails": 1
        }
        headers = {
            # WAŻNE: Nominatim wymaga unikalnego User-Agent
            "User-Agent": "LogisticAppDemo/1.0 (contact@example.com)", 
            "Accept-Language": "pl"
        }
        
        try:
            resp = requests.get(url, params=params, headers=headers, timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                addr = data.get('address', {})
                
                # Budowanie czytelnego adresu
                street = addr.get('road', '') or addr.get('pedestrian', '')
                number = addr.get('house_number', '')
                city = addr.get('city', '') or addr.get('town', '') or addr.get('village', '')
                
                parts = []
                if street: 
                    parts.append(f"{street} {number}".strip())
                if city: 
                    parts.append(city)
                
                return ", ".join(parts) if parts else data.get('display_name', '')[:255]
        except Exception:
            return ""
        return ""

class Stash(models.Model):
    class StashSize(models.TextChoices):
        SMALL = 'small', 'Small'
        MEDIUM = 'medium', 'Medium'
        LARGE = 'large', 'Large'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    postmat = models.ForeignKey(Postmat, on_delete=models.CASCADE, related_name='stashes')
    size = models.CharField(max_length=10, choices=StashSize.choices)
    is_empty = models.BooleanField(default=True)
    reserved_until = models.DateTimeField(null=True, blank=True)

    package = models.ForeignKey(
        "packages.Package",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="stash_assignment",
    )