import random
import uuid
from django.core.management.base import BaseCommand
from django.db import transaction
from faker import Faker

# Models
from logistics.models import Warehouse
from postmats.models import Postmat, Stash
from packages.models import Package, Actualization
from accounts.models import User

# Ustawiamy polskie locale dla realistycznych ulic i miast
fake = Faker(['pl_PL'])

class Command(BaseCommand):
    help = 'Seeds Postmats, Stashes, and Packages for existing Warehouses with Fake Addresses'

    def add_arguments(self, parser):
        parser.add_argument('--postmats', type=int, default=5, help='Postmats per warehouse')
        parser.add_argument('--packages', type=int, default=20, help='Total packages to generate')

    @transaction.atomic
    def handle(self, *args, **options):
        warehouses = list(Warehouse.objects.all())
        
        if not warehouses:
            self.stdout.write(self.style.ERROR('No warehouses found. Please run "seed_warehouses" first.'))
            return

        # Ensure we have a sender user
        sender_user, created = User.objects.get_or_create(
            email='sender@example.com',
            defaults={
                'first_name': 'Jan',
                'last_name': 'Kowalski',
                'username': 'sender_user',
                'role': 'client',
                'is_active': True
            }
        )
        if created:
            sender_user.set_password('password123')
            sender_user.save()

        self.stdout.write(self.style.SUCCESS(f'Using Sender: {sender_user.email}'))

        # ---------------------------------------------------------
        # 1. Create Postmats & Stashes
        # ---------------------------------------------------------
        created_postmats_count = 0
        
        for warehouse in warehouses:
            self.stdout.write(f'Generating Postmats for {warehouse.city}...')
            
            for i in range(options['postmats']):
                # Generate random coord slightly offset from warehouse (approx 2-5km radius)
                # 1 degree lat is ~111km, so 0.03 is roughly 3km
                lat_offset = random.uniform(-0.04, 0.04)
                lon_offset = random.uniform(-0.04, 0.04)
                
                # Generujemy fejkowy, ale realistycznie wyglądający adres
                # Dzięki temu nie musimy pytać API OSM przy seedowaniu
                fake_address = f"ul. {fake.street_name()} {fake.building_number()}, {warehouse.city}"
                
                # Generujemy nazwę w stylu InPost: WAW-123
                city_prefix = warehouse.city[:3].upper()
                pm_name = f"{city_prefix}-{random.randint(100, 999)}"

                postmat = Postmat.objects.create(
                    warehouse=warehouse,
                    name=pm_name,
                    status=Postmat.PostmatStatus.ACTIVE,
                    latitude=warehouse.latitude + lat_offset,
                    longitude=warehouse.longitude + lon_offset,
                    postal_code=fake.postcode(),
                    address=fake_address 
                )
                created_postmats_count += 1

                # Create Stashes for this Postmat
                self._create_stashes(postmat)

        self.stdout.write(self.style.SUCCESS(f'Created {created_postmats_count} Postmats instantly (API calls skipped via fake addresses).'))

        # ---------------------------------------------------------
        # 2. Create Packages (Ready for Transport)
        # ---------------------------------------------------------
        if len(warehouses) < 2:
            self.stdout.write(self.style.WARNING('Need at least 2 warehouses to create inter-warehouse packages.'))
            return

        self.stdout.write('Generating Packages...')
        
        for _ in range(options['packages']):
            # Pick random Origin and Destination (Must be different warehouses)
            origin_wh = random.choice(warehouses)
            possible_dests = [w for w in warehouses if w.id != origin_wh.id]
            
            if not possible_dests:
                continue
                
            dest_wh = random.choice(possible_dests)

            # Pick random postmats belonging to these warehouses
            origin_postmats = list(origin_wh.postmats.all())
            dest_postmats = list(dest_wh.postmats.all())

            if not origin_postmats or not dest_postmats:
                continue

            origin_pm = random.choice(origin_postmats)
            dest_pm = random.choice(dest_postmats)

            # Create Package
            pkg = Package.objects.create(
                origin_postmat=origin_pm,
                destination_postmat=dest_pm,
                sender=sender_user,
                receiver_name=fake.name(),
                receiver_phone=fake.phone_number(),
                size=random.choice(Package.PackageSize.values),
                weight=random.randint(1, 20),
                route_path={} 
            )

            # Create Actualization to simulate "Ready in Warehouse" state
            Actualization.objects.create(
                package_id=pkg,
                status=Actualization.PackageStatus.IN_WAREHOUSE,
                warehouse_id=origin_wh, # It is currently here
                courier_id=None,
                route_remaining={}
            )

        self.stdout.write(self.style.SUCCESS(f"Successfully seeded {options['packages']} packages ready for routing."))

    def _create_stashes(self, postmat):
        """Creates a default set of stashes for a postmat"""
        sizes = [
            (Stash.StashSize.SMALL, 10),
            (Stash.StashSize.MEDIUM, 10),
            (Stash.StashSize.LARGE, 5),
        ]
        
        stashes = []
        for size, count in sizes:
            for _ in range(count):
                stashes.append(Stash(
                    postmat=postmat,
                    size=size,
                    is_empty=True
                ))
        
        Stash.objects.bulk_create(stashes)