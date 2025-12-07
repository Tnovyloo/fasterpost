import random
from django.core.management.base import BaseCommand
from django.db import transaction
from logistics.models import Warehouse
from postmats.models import Postmat
from packages.models import Package, Actualization
from accounts.models import User
from faker import Faker

fake = Faker(['pl_PL'])

class Command(BaseCommand):
    help = 'Seeds a dense specific scenario (Warsaw Hub) to test optimizing.'

    def handle(self, *args, **options):
        # 1. Identify Key Cities
        try:
            hub = Warehouse.objects.get(city="Warszawa")
            dest1 = Warehouse.objects.get(city="Łódź")
            dest2 = Warehouse.objects.get(city="Radom") if Warehouse.objects.filter(city="Radom").exists() else Warehouse.objects.get(city="Białystok")
            dest3 = Warehouse.objects.get(city="Lublin")
        except Warehouse.DoesNotExist:
            self.stdout.write(self.style.ERROR("Key cities not found. Run seed_warehouses first."))
            return

        sender, _ = User.objects.get_or_create(email='test@scenariusz.pl', defaults={'role': 'client', 'is_active':True})

        self.stdout.write(f"Generating scenario around HUB: {hub.city}")

        # 2. Helpers
        def get_pm(wh):
            pm = wh.postmats.first()
            if not pm:
                pm = Postmat.objects.create(
                    warehouse=wh, name=f"{wh.city[:3].upper()}-999", 
                    latitude=wh.latitude, longitude=wh.longitude, status='active', address=f"Test Addr {wh.city}"
                )
            return pm

        def create_pkg(origin_wh, dest_wh, count):
            opm = get_pm(origin_wh)
            dpm = get_pm(dest_wh)
            for _ in range(count):
                p = Package.objects.create(
                    origin_postmat=opm, destination_postmat=dpm, sender=sender,
                    receiver_name=fake.name(), receiver_phone="123",
                    size="medium", weight=5, route_path={}
                )
                Actualization.objects.create(
                    package_id=p, status='in_warehouse', warehouse_id=origin_wh
                )
            self.stdout.write(f" - Created {count} pkgs: {origin_wh.city} -> {dest_wh.city}")

        # 3. Create Traffic
        # Outbound (Hub -> Spokes)
        create_pkg(hub, dest1, 8) 
        create_pkg(hub, dest2, 8)
        create_pkg(hub, dest3, 8)

        # Backhauls (Spokes -> Hub)
        # Logic: Driver goes Hub -> Dest1. Drops off. Picks up these packages to bring back to Hub.
        create_pkg(dest1, hub, 5) 
        create_pkg(dest3, hub, 5)

        self.stdout.write(self.style.SUCCESS("Scenario created. Run 'generate' route now."))