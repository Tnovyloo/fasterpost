import math
from django.core.management.base import BaseCommand
from django.db import transaction
from logistics.models import Warehouse
from proj.utils import haversine

class Command(BaseCommand):
    help = 'Seeds one warehouse for each of the 16 Polish Voivodeships and connects them.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Delete existing warehouses before seeding',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write('Deleting existing warehouses...')
            Warehouse.objects.all().delete()

        # The 16 Voivodeship capitals of Poland
        capitals = [
            {"city": "Warszawa", "lat": 52.2297, "lon": 21.0122},            # Mazowieckie
            {"city": "Kraków", "lat": 50.0647, "lon": 19.9450},              # Małopolskie
            {"city": "Łódź", "lat": 51.7592, "lon": 19.4560},                # Łódzkie
            {"city": "Wrocław", "lat": 51.1079, "lon": 17.0385},             # Dolnośląskie
            {"city": "Poznań", "lat": 52.4064, "lon": 16.9252},              # Wielkopolskie
            {"city": "Gdańsk", "lat": 54.3520, "lon": 18.6466},              # Pomorskie
            {"city": "Szczecin", "lat": 53.4285, "lon": 14.5528},            # Zachodniopomorskie
            {"city": "Bydgoszcz", "lat": 53.1235, "lon": 18.0084},           # Kujawsko-Pomorskie
            {"city": "Lublin", "lat": 51.2465, "lon": 22.5684},              # Lubelskie
            {"city": "Białystok", "lat": 53.1325, "lon": 23.1688},           # Podlaskie
            {"city": "Katowice", "lat": 50.2649, "lon": 19.0238},            # Śląskie
            {"city": "Rzeszów", "lat": 50.0412, "lon": 21.9991},             # Podkarpackie
            {"city": "Kielce", "lat": 50.8661, "lon": 20.6286},              # Świętokrzyskie
            {"city": "Olsztyn", "lat": 53.7784, "lon": 20.4801},             # Warmińsko-Mazurskie
            {"city": "Opole", "lat": 50.6751, "lon": 17.9213},               # Opolskie
            {"city": "Gorzów Wielkopolski", "lat": 52.7368, "lon": 15.2288}, # Lubuskie
        ]

        created_warehouses = []

        # 1. Create Warehouses
        self.stdout.write('Creating warehouses...')
        with transaction.atomic():
            for data in capitals:
                wh, created = Warehouse.objects.get_or_create(
                    city=data['city'],
                    defaults={
                        'latitude': data['lat'],
                        'longitude': data['lon'],
                        'status': 'active',
                        'connections': []
                    }
                )
                if created:
                    self.stdout.write(f" - Created {wh.city}")
                else:
                    self.stdout.write(f" - Found {wh.city}")
                created_warehouses.append(wh)

        # 2. Calculate Connections (Connect to 3 nearest neighbors)
        self.stdout.write('Generating network connections...')
        
        # We process outside transaction to allow individual saves to trigger model signals/logic
        # calculating distances for everyone
        
        for wh in created_warehouses:
            distances = []
            for other in created_warehouses:
                if wh.id == other.id:
                    continue
                
                dist = haversine(wh.latitude, wh.longitude, other.latitude, other.longitude)
                distances.append((other, dist))
            
            # Sort by distance and pick top 3
            distances.sort(key=lambda x: x[1])
            nearest_neighbors = distances[:3]
            
            # Construct connection payload
            # Note: We rely on the Warehouse model's save() method to sync the other side
            new_connections = []
            for neighbor, dist in nearest_neighbors:
                new_connections.append({
                    "id": str(neighbor.id),
                    "distance": round(dist, 2)
                })
            
            # Update only if changed
            wh.connections = new_connections
            wh.save() # This triggers the logic to update the neighbors' connections list too
            
            self.stdout.write(f"Connected {wh.city} to: {', '.join([n[0].city for n in nearest_neighbors])}")

        self.stdout.write(self.style.SUCCESS(f'Successfully seeded {len(created_warehouses)} warehouses and established logistics network.'))
