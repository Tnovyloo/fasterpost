from collections import defaultdict
from datetime import date
from django.db import transaction
from django.conf import settings
from django.utils import timezone
import math

class LocalRoutingService:
    """
    Handles Last Mile Delivery (Warehouse -> Postmats).
    Logic:
    1. Group packages by Zone (Static Territories).
    2. Check Stash Availability (Allocation Phase).
    3. Generate TSP Route for Zone Courier.
    """
    
    AVG_SPEED_KM_MIN = 0.5  # Slower in city (30km/h)
    STOP_DURATION_MINUTES = 5 # Quick stop (swap packages)

    @transaction.atomic
    def generate_local_routes(self, target_date: date, warehouse_id: str):
        from accounts.models import User
        from logistics.models import Route, Warehouse, RouteStop, RoutePackage
        from postmats.models import Zone
        from packages.models import Actualization
        
        try:
            warehouse = Warehouse.objects.get(id=warehouse_id)
        except Warehouse.DoesNotExist:
            print(f"Error: Warehouse {warehouse_id} not found.")
            return []

        zones = Zone.objects.filter(warehouse=warehouse)
        if not zones.exists():
            print(f"No zones defined for {warehouse.city}. Run seed_zones.")
            return []

        # 1. Get packages waiting at this warehouse for local delivery
        local_packages = self._get_local_packages(warehouse)
        
        if not local_packages:
            print(f"No local packages pending at {warehouse.city}.")
            return []
        
        # Group by Zone
        packages_by_zone = defaultdict(list)
        for pkg in local_packages:
            zone = pkg.destination_postmat.zone
            if zone:
                packages_by_zone[zone.id].append(pkg)
            else:
                print(f"Skipping package {pkg.id}: Postmat {pkg.destination_postmat.name} has no zone.")

        created_routes = []
        
        # 2. Get available drivers STRICTLY for this warehouse
        # Fix: Ensure we only fetch couriers assigned to this specific warehouse
        couriers = list(User.objects.filter(
            role='courier', 
            is_active=True,
            warehouse=warehouse  # <--- Strict Filter
        ).order_by('id'))
        
        if not couriers:
            print(f"No local couriers available assigned to {warehouse.city}!")
            # In debug mode, we might want to fallback, but for correctness we should probably stop or warn
            if settings.DEBUG:
                 print("DEBUG: Falling back to ANY local courier because of debug mode.")
                 couriers = list(User.objects.filter(role='courier', is_active=True).order_by('id'))
            
            if not couriers:
                return []

        courier_idx = 0

        for zone in zones:
            zone_pkgs = packages_by_zone.get(zone.id, [])
            if not zone_pkgs:
                continue
            
            # Allocation Phase: Reserve stashes
            # Returns tuple: (approved_packages, failed_packages)
            allocated_pkgs, failed_pkgs = self._allocate_stashes(zone_pkgs)
            
            # --- Handle Lack of Free Stashes ---
            if failed_pkgs:
                print(f"Zone {zone.name}: {len(failed_pkgs)} packages could not be allocated due to full lockers.")
                for pkg in failed_pkgs:
                    # Create a history entry so the user sees "Delayed" instead of just "In Warehouse".
                    # Using route_remaining field to store the reason message.
                    Actualization.objects.create(
                        package_id=pkg,
                        status='in_warehouse', # Keep status, but update timestamp/history
                        warehouse_id=warehouse,
                        route_remaining={'info': "Delivery delayed: Destination locker full. Retrying next cycle."}
                    )
            # -----------------------------------
            
            if not allocated_pkgs:
                print(f"Zone {zone.name}: No stashes available for {len(zone_pkgs)} packages.")
                continue

            # Assign Driver
            driver = couriers[courier_idx % len(couriers)]
            courier_idx += 1

            # Build Route (TSP)
            route = self._create_zone_route(driver, warehouse, allocated_pkgs, target_date)
            created_routes.append(route)
            print(f"Created local route {route.id} for Zone {zone.name} ({len(allocated_pkgs)} pkgs) - Driver: {driver.email}")

        return created_routes

    def _get_local_packages(self, warehouse):
        from packages.models import Actualization
        
        # Added .order_by('created_at') to ensure FIFO priority (older packages first)
        latest_acts = Actualization.objects.filter(
            status='in_warehouse', 
            warehouse_id=warehouse.id
        ).select_related('package_id__destination_postmat__zone').order_by('created_at')
        
        candidates = []
        for act in latest_acts:
            pkg = act.package_id
            if pkg.destination_postmat.warehouse_id == warehouse.id:
                candidates.append(pkg)
        
        return candidates

    def _allocate_stashes(self, packages):
        """
        Check if destination postmat has empty stash of right size.
        Returns tuple: (approved_packages, failed_packages)
        """
        approved = []
        failed = []
        
        by_postmat = defaultdict(list)
        for p in packages: by_postmat[p.destination_postmat].append(p)
        
        for pm, pkgs in by_postmat.items():
            empty_stashes = list(pm.stashes.filter(is_empty=True, reserved_until__isnull=True))
            
            small_stashes = [s for s in empty_stashes if s.size == 'small']
            medium_stashes = [s for s in empty_stashes if s.size == 'medium']
            large_stashes = [s for s in empty_stashes if s.size == 'large']
            
            for p in pkgs:
                selected_stash = None
                
                if p.size == 'small':
                    if small_stashes: selected_stash = small_stashes.pop()
                    elif medium_stashes: selected_stash = medium_stashes.pop()
                    elif large_stashes: selected_stash = large_stashes.pop()
                elif p.size == 'medium':
                    if medium_stashes: selected_stash = medium_stashes.pop()
                    elif large_stashes: selected_stash = large_stashes.pop()
                elif p.size == 'large':
                    if large_stashes: selected_stash = large_stashes.pop()
                
                if selected_stash:
                    p._reserved_stash = selected_stash
                    approved.append(p)
                else:
                    failed.append(p)
                    
        return approved, failed

    def _create_zone_route(self, driver, warehouse, packages, date):
        from logistics.models import Route, RouteStop, RoutePackage
        
        active_postmats = list({p.destination_postmat for p in packages})
        
        # Simple TSP (Nearest Neighbor)
        ordered_stops = []
        current_loc = {'lat': warehouse.latitude, 'lon': warehouse.longitude}
        remaining = list(active_postmats)
        
        total_dist = 0.0
        
        while remaining:
            nearest = min(remaining, key=lambda pm: math.sqrt((pm.latitude-current_loc['lat'])**2 + (pm.longitude-current_loc['lon'])**2))
            
            dist = self._haversine(current_loc['lat'], current_loc['lon'], nearest.latitude, nearest.longitude)
            total_dist += dist
            
            ordered_stops.append((nearest, dist))
            current_loc = {'lat': nearest.latitude, 'lon': nearest.longitude}
            remaining.remove(nearest)
            
        dist_home = self._haversine(current_loc['lat'], current_loc['lon'], warehouse.latitude, warehouse.longitude)
        total_dist += dist_home
        
        # Create Route
        route = Route.objects.create(
            courier=driver,
            scheduled_date=date,
            status='planned',
            route_type='last_mile',
            total_distance=round(total_dist, 2),
            estimated_duration=int((total_dist / self.AVG_SPEED_KM_MIN) + (len(ordered_stops) * self.STOP_DURATION_MINUTES))
        )
        
        # Create Stops
        start_stop = RouteStop.objects.create(route=route, warehouse=warehouse, order=0, distance_from_previous=0)
        
        current_order = 1
        pm_stop_map = {} 
        
        for pm, dist in ordered_stops:
            stop = RouteStop.objects.create(route=route, postmat=pm, order=current_order, distance_from_previous=round(dist, 2))
            pm_stop_map[pm.id] = stop
            current_order += 1
            
        # Stop N: Warehouse (Return)
        RouteStop.objects.create(route=route, warehouse=warehouse, order=current_order, distance_from_previous=round(dist_home, 2))
        
        # Link Packages & Apply Reservations
        for pkg in packages:
            dest_pm_id = pkg.destination_postmat.id
            dropoff_stop = pm_stop_map.get(dest_pm_id)
            
            if dropoff_stop:
                RoutePackage.objects.create(
                    route=route,
                    package=pkg,
                    pickup_stop=start_stop,
                    dropoff_stop=dropoff_stop
                )
                
                # Persist Stash Reservation
                if hasattr(pkg, '_reserved_stash'):
                    stash = pkg._reserved_stash
                    stash.reserved_until = timezone.now() + timezone.timedelta(hours=24)
                    stash.package = pkg 
                    stash.save()

        return route

    def _haversine(self, lat1, lon1, lat2, lon2):
        R = 6371.0
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (math.sin(dlat / 2) ** 2 +
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
             math.sin(dlon / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c