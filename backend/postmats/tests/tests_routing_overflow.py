from django.test import TestCase
from django.utils import timezone
from datetime import date
from django.contrib.auth import get_user_model
from logistics.models import Warehouse, Route
from postmats.models import Postmat, Zone, Stash
from packages.models import Package, Actualization
from postmats.services.routing_service import LocalRoutingService

User = get_user_model()

class LocalRoutingOverflowTest(TestCase):

    def setUp(self):
        # 1. Setup Warehouse & Zone
        # Note: We provide lat/lon to avoid the model trying to geocode via OSM API during tests
        self.warehouse = Warehouse.objects.create(
            city="Test City", 
            latitude=50.0, 
            longitude=20.0,
            address="Test Address 1"
        )
        self.zone = Zone.objects.create(name="Zone A", warehouse=self.warehouse)

        # 2. Setup Courier
        # Using get_user_model() ensures we use the correct custom user model
        self.courier = User.objects.create(
            email="driver@test.com", 
            role='courier', 
            username="driver1",
            warehouse=self.warehouse, 
            is_active=True
        )

        # 3. Setup Postmat with LIMITED Capacity (Only 1 Small Stash)
        self.postmat = Postmat.objects.create(
            name="Locker 1", 
            warehouse=self.warehouse, 
            zone=self.zone,
            latitude=50.01, 
            longitude=20.01, 
            status='active',
            address="Locker Address 1"
        )
        
        # Create 1 Small Stash
        self.stash = Stash.objects.create(
            postmat=self.postmat, size='small', is_empty=True
        )

        # 4. Create 2 Packages (Both Small, destined for same locker)
        # This forces a conflict.
        self.pkg1 = Package.objects.create(
            origin_postmat=self.postmat, # dummy origin
            destination_postmat=self.postmat,
            sender=self.courier, # dummy sender
            receiver_name="Receiver 1", receiver_phone="123",
            size='small', weight=1, route_path={}
        )
        
        self.pkg2 = Package.objects.create(
            origin_postmat=self.postmat,
            destination_postmat=self.postmat,
            sender=self.courier,
            receiver_name="Receiver 2", receiver_phone="123",
            size='small', weight=1, route_path={}
        )

        # 5. Place them in Warehouse (Actualization)
        # Pkg1 arrived 1 hour ago (Should get priority due to FIFO logic)
        Actualization.objects.create(
            package_id=self.pkg1, 
            status='in_warehouse', 
            warehouse_id=self.warehouse,
            created_at=timezone.now() - timezone.timedelta(hours=1)
        )
        
        # Pkg2 arrived just now
        Actualization.objects.create(
            package_id=self.pkg2, 
            status='in_warehouse', 
            warehouse_id=self.warehouse,
            created_at=timezone.now()
        )

    def test_routing_handles_stash_overflow(self):
        service = LocalRoutingService()
        
        # Run Route Generation
        routes = service.generate_local_routes(date.today(), str(self.warehouse.id))

        # Assertions
        
        # 1. Check Route Creation
        self.assertEqual(len(routes), 1, "Should create 1 route")
        route = routes[0]
        
        # 2. Check Package Allocation
        # Use the related manager from Route model ('route_packages') to count packages
        self.assertEqual(route.route_packages.count(), 1, "Only 1 package should fit")
        
        # 3. Check Priority (FIFO)
        # Pkg1 was older, so it should be the one on the route
        # Access the package via the RoutePackage intermediate model
        on_route_pkg = route.route_packages.first().package
        self.assertEqual(on_route_pkg.id, self.pkg1.id, "Older package (Pkg1) should have priority")
        
        # 4. Check Stash Reservation
        self.stash.refresh_from_db()
        self.assertEqual(self.stash.package, self.pkg1, "Stash should be reserved for Pkg1")
        self.assertIsNotNone(self.stash.reserved_until, "Stash should have reservation time")

        # 5. Check Failed Package (Pkg2)
        # It should have a new actualization log saying it was delayed
        latest_log = Actualization.objects.filter(package_id=self.pkg2).order_by('-created_at').first()
        
        self.assertEqual(latest_log.status, 'in_warehouse', "Status should remain 'in_warehouse'")
        
        # Check if route_remaining contains the delay info
        # Note: Depending on your specific DB (SQLite vs Postgres), JSONField behavior might vary slightly, 
        # but typically it returns a dict.
        log_info = str(latest_log.route_remaining)
        self.assertIn("Delivery delayed", log_info, "Should log delay reason in route_remaining")
        self.assertIn("locker full", log_info)

        print("\nTest Success: Overflow logic correctly prioritized older package and logged delay for newer one.")