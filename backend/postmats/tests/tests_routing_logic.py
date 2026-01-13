from django.test import TestCase
from django.utils import timezone
from datetime import date
from django.contrib.auth import get_user_model
from logistics.models import Warehouse, Route, RouteStop, RoutePackage
from postmats.models import Postmat, Zone, Stash
from packages.models import Package, Actualization
from postmats.services.routing_service import LocalRoutingService

User = get_user_model()

class LocalRoutingServiceTests(TestCase):

    def setUp(self):
        # 1. Setup Warehouse
        self.warehouse = Warehouse.objects.create(
            city="Test City", 
            latitude=50.0, 
            longitude=20.0,
            address="Hub Address 1"
        )
        
        # 2. Setup Zone
        self.zone = Zone.objects.create(name="Zone A", warehouse=self.warehouse)

        # 3. Setup Courier
        self.courier = User.objects.create(
            email="driver@test.com", 
            role='courier', 
            username="driver1",
            warehouse=self.warehouse, 
            is_active=True
        )

        # 4. Setup "Locker" (Standard Postmat with limited capacity)
        self.locker = Postmat.objects.create(
            name="Locker 1", 
            warehouse=self.warehouse, 
            zone=self.zone,
            latitude=50.01, longitude=20.01, 
            status='active',
            type='locker', # Explicitly set type
            address="Locker St"
        )
        # Add exactly 1 small stash
        self.stash = Stash.objects.create(
            postmat=self.locker, size='small', is_empty=True
        )

        # 5. Setup "Pickup Point" (Business User - No stashes)
        self.pickup_point = Postmat.objects.create(
            name="Business Point 1", 
            warehouse=self.warehouse, 
            zone=self.zone,
            latitude=50.02, longitude=20.02, 
            status='active',
            type='pickup_point', # Critical for second test
            address="Business St"
        )

    def test_stash_overflow_fifo_priority(self):
        """
        Test that when locker is full:
        1. Older package gets the spot (FIFO).
        2. Newer package is rejected and logged as delayed.
        """
        # Create Older Package (Arrived 1 hour ago)
        pkg_old = Package.objects.create(
            origin_postmat=self.locker, destination_postmat=self.locker,
            sender=self.courier, receiver_name="Old Guy", receiver_phone="1",
            size='small', weight=1, route_path={}
        )
        Actualization.objects.create(
            package_id=pkg_old, status='in_warehouse', warehouse_id=self.warehouse,
            created_at=timezone.now() - timezone.timedelta(hours=1)
        )

        # Create Newer Package (Arrived now)
        pkg_new = Package.objects.create(
            origin_postmat=self.locker, destination_postmat=self.locker,
            sender=self.courier, receiver_name="New Guy", receiver_phone="2",
            size='small', weight=1, route_path={}
        )
        Actualization.objects.create(
            package_id=pkg_new, status='in_warehouse', warehouse_id=self.warehouse,
            created_at=timezone.now()
        )

        # Run Service
        service = LocalRoutingService()
        routes = service.generate_local_routes(date.today(), str(self.warehouse.id))

        # Assertions
        self.assertEqual(len(routes), 1)
        route = routes[0]
        
        # Only 1 package should be on the route
        self.assertEqual(route.route_packages.count(), 1)
        
        # It must be the OLD package
        allocated_pkg = route.route_packages.first().package
        self.assertEqual(allocated_pkg.id, pkg_old.id)

        # The NEW package should be delayed
        latest_log = Actualization.objects.filter(package_id=pkg_new).order_by('-created_at').first()
        
        # Fix: Check for exact text found in routing_service.py ("Destination locker full")
        # Converting dictionary to string for robust checking
        self.assertIn("Destination locker full", str(latest_log.route_remaining))

    def test_pickup_point_no_stash_needed(self):
        """
        Test that packages destined for a PICKUP_POINT are allocated 
        even if the Postmat has 0 stashes.
        """
        # Create Package for Pickup Point
        pkg_business = Package.objects.create(
            origin_postmat=self.locker, 
            destination_postmat=self.pickup_point, # Destination is Pickup Point
            sender=self.courier, receiver_name="Biz Guy", receiver_phone="3",
            size='large', # Size shouldn't matter for pickup points
            weight=10, route_path={}
        )
        Actualization.objects.create(
            package_id=pkg_business, status='in_warehouse', warehouse_id=self.warehouse,
            created_at=timezone.now()
        )

        # Ensure Pickup Point has NO stashes
        self.assertEqual(self.pickup_point.stashes.count(), 0)

        # Run Service
        service = LocalRoutingService()
        routes = service.generate_local_routes(date.today(), str(self.warehouse.id))

        # Assertions
        self.assertEqual(len(routes), 1)
        route = routes[0]
        
        # Package should be on route despite no stashes
        self.assertEqual(route.route_packages.count(), 1)
        self.assertEqual(route.route_packages.first().package.id, pkg_business.id)

    def test_route_structure_and_stops(self):
        """
        Verify that RouteStops are created correctly:
        Warehouse (Start) -> Stop 1 -> Stop 2 -> Warehouse (End)
        """
        # 1 pkg for Locker, 1 pkg for Pickup Point
        # (Resetting stashes for locker so it's empty)
        self.stash.reserved_until = None
        self.stash.is_empty = True
        self.stash.save()

        pkg1 = Package.objects.create(
            origin_postmat=self.locker, destination_postmat=self.locker,
            sender=self.courier, receiver_name="R1", receiver_phone="1",
            size='small', weight=1, route_path={}
        )
        Actualization.objects.create(package_id=pkg1, status='in_warehouse', warehouse_id=self.warehouse)

        pkg2 = Package.objects.create(
            origin_postmat=self.locker, destination_postmat=self.pickup_point,
            sender=self.courier, receiver_name="R2", receiver_phone="2",
            size='small', weight=1, route_path={}
        )
        Actualization.objects.create(package_id=pkg2, status='in_warehouse', warehouse_id=self.warehouse)

        # Run Service
        service = LocalRoutingService()
        routes = service.generate_local_routes(date.today(), str(self.warehouse.id))
        
        route = routes[0]
        
        # We expect 4 stops: 
        # 0: Warehouse
        # 1: Stop A (Locker or PP)
        # 2: Stop B (Locker or PP)
        # 3: Warehouse
        self.assertEqual(route.stops.count(), 4)
        
        # Verify Start
        start_stop = route.stops.get(order=0)
        self.assertEqual(start_stop.warehouse, self.warehouse)
        
        # Verify End
        end_stop = route.stops.order_by('-order').first()
        self.assertEqual(end_stop.warehouse, self.warehouse)
        self.assertNotEqual(end_stop.id, start_stop.id) # Should be distinct DB records