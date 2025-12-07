import math
from django.core.management.base import BaseCommand
from django.db import transaction
from logistics.models import Warehouse

class Command(BaseCommand):
    help = 'Seeds one warehouse for each of the 16 Polish Voivodeships with addresses.'

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

        # Added hardcoded addresses to skip API calls
        capitals = [
            {"city": "Warszawa", "lat": 52.2297, "lon": 21.0122, "addr": "Centrum Logistyczne Warszawa, ul. Marszałkowska 1"},
            {"city": "Kraków", "lat": 50.0647, "lon": 19.9450, "addr": "Magazyn Główny Kraków, Rynek Główny 1"},
            {"city": "Łódź", "lat": 51.7592, "lon": 19.4560, "addr": "Hub Łódź, ul. Piotrkowska 100"},
            {"city": "Wrocław", "lat": 51.1079, "lon": 17.0385, "addr": "Wrocław Logistics, Rynek 1"},
            {"city": "Poznań", "lat": 52.4064, "lon": 16.9252, "addr": "Poznań Distribution, Stary Rynek 1"},
            {"city": "Gdańsk", "lat": 54.3520, "lon": 18.6466, "addr": "Port Gdańsk, ul. Długa 1"},
            {"city": "Szczecin", "lat": 53.4285, "lon": 14.5528, "addr": "Szczecin Port, Wały Chrobrego 1"},
            {"city": "Bydgoszcz", "lat": 53.1235, "lon": 18.0084, "addr": "Bydgoszcz Centrum, Stary Rynek 1"},
            {"city": "Lublin", "lat": 51.2465, "lon": 22.5684, "addr": "Lublin Wschód, Krakowskie Przedmieście 1"},
            {"city": "Białystok", "lat": 53.1325, "lon": 23.1688, "addr": "Białystok Hub, Rynek Kościuszki 1"},
            {"city": "Katowice", "lat": 50.2649, "lon": 19.0238, "addr": "Silesia Logistics, Rynek 1"},
            {"city": "Rzeszów", "lat": 50.0412, "lon": 21.9991, "addr": "Rzeszów Airport Hub, Jasionka 1"},
            {"city": "Kielce", "lat": 50.8661, "lon": 20.6286, "addr": "Kielce Targi, ul. Zakładowa 1"},
            {"city": "Olsztyn", "lat": 53.7784, "lon": 20.4801, "addr": "Olsztyn Warmia, ul. Staromiejska 1"},
            {"city": "Opole", "lat": 50.6751, "lon": 17.9213, "addr": "Opole Odra, Rynek 1"},
            {"city": "Gorzów Wielkopolski", "lat": 52.7368, "lon": 15.2288, "addr": "Gorzów Zachód, ul. Sikorskiego 1"},
        ]

        created_warehouses = []

        self.stdout.write('Creating warehouses...')
        try:
            with transaction.atomic():
                for data in capitals:
                    wh, created = Warehouse.objects.get_or_create(
                        city=data['city'],
                        defaults={
                            'latitude': data['lat'],
                            'longitude': data['lon'],
                            'address': data['addr'], # <-- Address provided here
                            'status': 'active',
                            'connections': []
                        }
                    )
                    created_warehouses.append(wh)
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error creating warehouses: {e}"))
            return

        self.stdout.write('Calculating connections...')
        updates = {}
        for wh in created_warehouses:
            distances = []
            for other in created_warehouses:
                if wh.id == other.id: continue
                dist = self._haversine(wh.latitude, wh.longitude, other.latitude, other.longitude)
                distances.append((other, dist))
            
            distances.sort(key=lambda x: x[1])
            nearest = distances[:3]
            
            updates[wh.id] = [{"id": str(n.id), "distance": round(d, 2)} for n, d in nearest]

        self.stdout.write("Saving network topology...")
        for wh in created_warehouses:
            wh.connections = updates[wh.id]
            wh.save() # This might call geocoding if address was empty, but it's full now!

        self.stdout.write(self.style.SUCCESS(f'Successfully seeded {len(created_warehouses)} warehouses.'))

    def _haversine(self, lat1, lon1, lat2, lon2):
        R = 6371.0
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (math.sin(dlat / 2) ** 2 +
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
             math.sin(dlon / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c