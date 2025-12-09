import uuid
from django.core.management.base import BaseCommand
from django.utils import timezone
from accounts.models import User
from logistics.models import Warehouse, Route
from packages.models import Package, Actualization
from postmats.models import Postmat
from logistics.services.routing_service import RoutingService

class Command(BaseCommand):
    help = 'Tests routing logic with a specific long-distance scenario (Szczecin -> Rzeszów)'

    def handle(self, *args, **options):
        self.stdout.write("--- Setting up Test Scenario ---")
        
        # 1. Get Warehouses (Extreme points of Poland)
        try:
            origin_wh = Warehouse.objects.get(city="Szczecin")
            dest_wh = Warehouse.objects.get(city="Rzeszów")
        except Warehouse.DoesNotExist:
            self.stdout.write(self.style.ERROR("Error: Cities 'Szczecin' or 'Rzeszów' not found. Did you seed the 16 capitals?"))
            return

        # 2. Ensure Postmats exist
        # FIX: Use filter().first() instead of get_or_create to handle warehouses with existing postmats
        origin_pm = Postmat.objects.filter(warehouse=origin_wh).first()
        if not origin_pm:
            origin_pm = Postmat.objects.create(
                warehouse=origin_wh,
                name='SZC-1',
                latitude=origin_wh.latitude,
                longitude=origin_wh.longitude
            )
            
        dest_pm = Postmat.objects.filter(warehouse=dest_wh).first()
        if not dest_pm:
            dest_pm = Postmat.objects.create(
                warehouse=dest_wh,
                name='RZE-1',
                latitude=dest_wh.latitude,
                longitude=dest_wh.longitude
            )

        # 3. Ensure a Sender
        sender, _ = User.objects.get_or_create(
            email='sender@example.com',
            defaults={
                'first_name': 'Jan',
                'last_name': 'Kowalski',
                'role': 'client',
                'is_active': True
            }
        )

        # 4. Create the Challenge Package
        pkg = Package.objects.create(
            origin_postmat=origin_pm,
            destination_postmat=dest_pm,
            sender=sender,
            receiver_name="Test Receiver",
            receiver_phone="123456789",
            size="medium",
            weight=5,
            route_path={}
        )
        
        # 5. Create Actualization (Put it in the warehouse)
        Actualization.objects.create(
            package_id=pkg,
            status='in_warehouse',
            warehouse_id=origin_wh
        )
        self.stdout.write(f"Created package {pkg.id} from {origin_wh.city} to {dest_wh.city}")

        # 6. Run Routing
        self.stdout.write("\n--- Running Routing Service ---")
        service = RoutingService()
        
        # Force a date
        target_date = timezone.now().date()
        
        # Clear previous routes for clarity
        Route.objects.filter(scheduled_date=target_date).delete()

        try:
            routes = service.generate_routes_for_date(target_date)
        except ValueError as e:
            self.stdout.write(self.style.ERROR(f"Routing Failed: {e}"))
            return

        if not routes:
            self.stdout.write(self.style.WARNING("No routes generated! Check graph connectivity or max_work_day constraints."))
            return

        # 7. Print Results
        self.stdout.write(self.style.SUCCESS(f"\nGenerated {len(routes)} Routes:"))
        
        for route in routes:
            self.stdout.write(f"\nRoute ID: {route.id}")
            self.stdout.write(f"Courier: {route.courier.email}")
            self.stdout.write(f"Total Dist: {route.total_distance} km")
            self.stdout.write(f"Est Time: {route.estimated_duration} min")
            self.stdout.write("Stops Sequence:")
            
            for stop in route.stops.all().order_by('order'):
                # Check for package operations
                pickups = stop.pickups.count()
                dropoffs = stop.dropoffs.count()
                action = ""
                if pickups: action += f" [PICKUP pkg]"
                if dropoffs: action += f" [DROPOFF pkg]"
                
                self.stdout.write(f"  {stop.order}. {stop.warehouse.city} ({stop.distance_from_previous} km from prev){action}")