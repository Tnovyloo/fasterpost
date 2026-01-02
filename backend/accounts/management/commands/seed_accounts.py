import random
from django.core.management.base import BaseCommand
from django.db import transaction
from accounts.models import User
from logistics.models import Warehouse
from faker import Faker

fake = Faker(['pl_PL'])

class Command(BaseCommand):
    help = 'Seeds Normal and Business users for testing purposes.'

    def add_arguments(self, parser):
        parser.add_argument('--count', type=int, default=10, help='Number of users to create per role')
        parser.add_argument('--clear', action='store_true', help='Remove existing normal/business users before seeding')

    @transaction.atomic
    def handle(self, *args, **options):
        count = options['count']
        
        if options['clear']:
            self.stdout.write("Removing existing normal and business users...")
            # We filter carefully to not delete your admins or couriers
            deleted, _ = User.objects.filter(role__in=['normal', 'business'], is_admin=False).delete()
            self.stdout.write(f"Deleted {deleted} old accounts.")

        created_count = 0
        
        # 1. Seed Normal Users (Individual Clients)
        self.stdout.write(f"Generating {count} Normal users...")
        for _ in range(count):
            first_name = fake.first_name()
            last_name = fake.last_name()
            # Ensure simple, readable emails for testing
            email = f"{first_name.lower()}.{last_name.lower()}{random.randint(1, 99)}@example.com"
            username = f"{first_name.lower()}_{last_name.lower()}_{random.randint(100, 999)}"
            
            if not User.objects.filter(email=email).exists():
                user = User.objects.create_user(
                    email=email,
                    username=username,
                    password='redneck123!',
                    first_name=first_name,
                    last_name=last_name,
                    phone_number=fake.phone_number(),
                    role='normal',
                    is_active=True
                )

                user.emailverification.verified = True
                user.emailverification.save()

                created_count += 1

        # 2. Seed Business Users (Corporate Clients)
        self.stdout.write(f"Generating {count} Business users...")
        for _ in range(count):
            company = fake.company()
            # Clean company name for email generation
            clean_name = company.replace(' ', '').replace(',', '').replace('.', '').lower()
            email = f"contact@{clean_name}.pl"
            username = f"{clean_name}_{random.randint(100, 999)}"
            
            if not User.objects.filter(email=email).exists():
                user = User.objects.create_user(
                    email=email,
                    username=username,
                    password='redneck123!',
                    first_name=company, # For businesses, we put Company Name in first_name
                    last_name="(Business)",
                    phone_number=fake.phone_number(),
                    role='business',
                    is_active=True
                )

                user.emailverification.verified = True
                user.emailverification.save()

                created_count += 1

        warehouses = list(Warehouse.objects.all())
        
        if not warehouses:
            self.stdout.write(self.style.ERROR("No warehouses found. Run seed_warehouses first."))
            return

        if options['clear']:
            self.stdout.write("Removing existing couriers...")
            User.objects.filter(role__in=['warehouse', 'courier']).delete()
        
        self.stdout.write(f"Found {len(warehouses)} warehouses. Starting seeding...")

        for wh in warehouses:
            # Normalize city name for email (e.g., "Łódź" -> "lodz")
            # If unidecode isn't available, simple lower() might leave utf-8 chars which is valid in emails but tricky
            city_clean = wh.city.lower().replace('ł', 'l').replace('ó', 'o').replace('ź', 'z').replace('ż', 'z').replace('ń', 'n').replace('ś', 's').replace('ą', 'a').replace('ę', 'e').replace('ć', 'c')
            city_slug = city_clean[:3]

            # 1. Seed Line Haul Drivers (Warehouse-to-Warehouse)
            for i in range(1, 4): # 3 drivers
                email = f"wh_{city_clean}_{i}@logistics.com"
                
                if not User.objects.filter(email=email).exists():
                    try:
                        user = User.objects.create_user(
                            email=email,
                            username=email.split('@')[0],
                            password='redneck123!',
                            first_name=fake.first_name(),
                            last_name=f"Trucker {wh.city}",
                            role='warehouse',
                            warehouse=wh,
                            is_active=True
                        )

                        user.emailverification.verified = True
                        user.emailverification.save()

                        created_count += 1
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f"Failed to create {email}: {e}"))

            # 2. Seed Local Couriers (Last Mile)
            for i in range(1, 6): # 5 drivers
                email = f"lc_{city_clean}_{i}@logistics.com"
                
                if not User.objects.filter(email=email).exists():
                    try:
                        user = User.objects.create_user(
                            email=email,
                            username=email.split('@')[0],
                            password='redneck123!',
                            first_name=fake.first_name(),
                            last_name=f"Local {wh.city}",
                            role='courier',
                            warehouse=wh,
                            is_active=True
                        )

                        user.emailverification.verified = True
                        user.emailverification.save()

                        created_count += 1
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f"Failed to create {email}: {e}"))

        self.stdout.write(self.style.SUCCESS(f"Successfully created {created_count} new accounts."))
        self.stdout.write("All passwords set to: 'redneck123!'")