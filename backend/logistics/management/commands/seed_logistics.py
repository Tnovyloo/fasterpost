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

fake = Faker(['pl_PL'])  # Polish locale for realistic data

class Command(BaseCommand):
    help = 'Seeds Postmats, Stashes, and Packages for existing Warehouses'

    def add_arguments(self, parser):
        parser.add_argument('--postmats', type=int, default=5, help='Postmats per warehouse')
        parser.add_argument('--packages', type=int, default=20, help='Total packages to generate')

    @transaction.atomic
    def handle(self, *args, **options):
        warehouses = list(Warehouse.objects.all())
        
        if not warehouses:
            self.stdout.write(self.style.ERROR('No warehouses found. Please create warehouses first.'))
            return

        # Ensure we have a sender user
        sender_user, created = User.objects.get_or_create(
            email='sender@example.com',
            defaults={
                'first_name': 'Jan',
                'last_name': 'Kowalski',
                'username': 'sender@example.com',
                'role': 'client', # Assuming you have a client role
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
        created_postmats = []
        
        for warehouse in warehouses:
            self.stdout.write(f'Generating Postmats for {warehouse.city}...')
            
            for i in range(options['postmats']):
                # Generate random coord slightly offset from warehouse (approx 2-5km radius)
                lat_offset = random.uniform(-0.03, 0.03)
                lon_offset = random.uniform(-0.03, 0.03)
                
                postmat = Postmat.objects.create(
                    warehouse=warehouse,
                    name=f"{warehouse.city[:3].upper()}{random.randint(100, 999)}",
                    status=Postmat.PostmatStatus.ACTIVE,
                    latitude=warehouse.latitude + lat_offset,
                    longitude=warehouse.longitude + lon_offset,
                    postal_code=fake.postcode()
                )
                created_postmats.append(postmat)

                # Create Stashes for this Postmat
                self._create_stashes(postmat)

        self.stdout.write(self.style.SUCCESS(f'Created {len(created_postmats)} Postmats.'))

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
            dest_wh = random.choice([w for w in warehouses if w != origin_wh])

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
                route_path={} # Placeholder, routing service calculates this later
            )

            # NOTE: Your signals likely create the initial 'created' Actualization.
            # We need to simulate that the package was picked up from the sender 
            # and is now SITTING IN THE WAREHOUSE, ready for the courier.
            
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