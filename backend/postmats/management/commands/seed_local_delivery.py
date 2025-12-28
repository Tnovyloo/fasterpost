import random
from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.db import transaction
from logistics.models import Warehouse
from postmats.models import Postmat, Stash, Zone
from packages.models import Package, Actualization
from accounts.models import User
from faker import Faker

fake = Faker(['pl_PL'])

class Command(BaseCommand):
    help = 'Seeds local packages and FORCE FIXES environment (Zones, Stashes) for Last Mile routing.'

    def add_arguments(self, parser):
        parser.add_argument('--city', type=str, default='Warszawa', help='City name of the Warehouse')
        parser.add_argument('--count', type=int, default=50, help='Number of packages to generate')

    @transaction.atomic
    def handle(self, *args, **options):
        city = options['city']
        count = options['count']
        
        try:
            warehouse = Warehouse.objects.get(city=city)
        except Warehouse.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"Warehouse in {city} not found. Run seed_warehouses first."))
            return

        postmats = list(warehouse.postmats.all())
        if not postmats:
            self.stdout.write(self.style.WARNING(f"No postmats found in {city}. Running seed_logistics..."))
            call_command('seed_logistics', postmats=10, packages=0)
            postmats = list(warehouse.postmats.all())
            if not postmats:
                self.stdout.write(self.style.ERROR("Failed to create postmats."))
                return

        # 1. FORCE FIX ZONES (Crucial: Routing skips postmats without zones)
        self.stdout.write("Verifying Zones...")
        unzoned_count = warehouse.postmats.filter(zone__isnull=True).count()
        if unzoned_count > 0:
            self.stdout.write(f"Found {unzoned_count} postmats without zones. Re-running zoning...")
            # We call seed_zones to mathematically distribute them
            call_command('seed_zones') 
            # Refresh list
            postmats = list(warehouse.postmats.all())
        
        # Verify again
        if not postmats[0].zone:
             # Fallback if seed_zones failed or didn't run for this city
             default_zone, _ = Zone.objects.get_or_create(name=f"{city} Default", warehouse=warehouse)
             for pm in postmats:
                 pm.zone = default_zone
                 pm.save()
             self.stdout.write("Assigned fallback default zone.")

        # 2. FORCE EMPTY STASHES (Crucial: Routing skips if stashes full)
        self.stdout.write("Cleaning Stashes...")
        total_stashes = Stash.objects.filter(postmat__in=postmats).count()
        if total_stashes == 0:
             self.stdout.write("Creating new stashes...")
             for pm in postmats:
                 self._create_stashes(pm)
        else:
             # Force empty them so our new packages fit
             Stash.objects.filter(postmat__in=postmats).update(is_empty=True, reserved_until=None)
             self.stdout.write("All local stashes emptied and ready.")

        # 3. Ensure Courier
        # UPDATED: Check for 'courier' role instead of 'warehouse'
        courier_exists = User.objects.filter(role='courier', is_active=True).exists()
        if not courier_exists:
            self.stdout.write("Creating local courier...")
            User.objects.create_user(
                email='local_driver@example.com',
                password='password123',
                first_name='Local',
                last_name='Driver',
                role='courier',
                is_active=True
            )

        # 4. Generate Packages
        sender, _ = User.objects.get_or_create(
            email='sender@example.com',
            defaults={
                'first_name': 'Jan',
                'last_name': 'Kowalski',
                'role': 'client',
                'is_active': True
            }
        )

        self.stdout.write(f"Generating {count} local packages for {city}...")

        created_count = 0
        for _ in range(count):
            dest_pm = random.choice(postmats)
            origin_pm = random.choice(postmats)

            pkg = Package.objects.create(
                origin_postmat=origin_pm,
                destination_postmat=dest_pm,
                sender=sender,
                receiver_name=fake.name(),
                receiver_phone="555123456",
                size=random.choice(Package.PackageSize.values),
                weight=random.randint(1, 5),
                route_path={}
            )

            Actualization.objects.create(
                package_id=pkg,
                status=Actualization.PackageStatus.IN_WAREHOUSE,
                warehouse_id=warehouse,
                courier_id=None,
                route_remaining={}
            )
            created_count += 1

        self.stdout.write(self.style.SUCCESS(f"Done! {created_count} packages ready in {city} warehouse."))
        self.stdout.write(f"Targeting {len(postmats)} postmats.")

    def _create_stashes(self, postmat):
        sizes = [
            (Stash.StashSize.SMALL, 5),
            (Stash.StashSize.MEDIUM, 5),
            (Stash.StashSize.LARGE, 2),
        ]
        stashes = []
        for size, count in sizes:
            for _ in range(count):
                stashes.append(Stash(postmat=postmat, size=size, is_empty=True))
        Stash.objects.bulk_create(stashes)