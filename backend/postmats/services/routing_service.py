from collections import defaultdict
from datetime import date
from django.db import transaction
from django.conf import settings
from django.utils import timezone
import math

class LocalRoutingService:
    """
    Handles Last Mile Delivery (Warehouse -> Postmats).
    """
    
    AVG_SPEED_KM_MIN = 0.5  # Slower in city (30km/h)
    STOP_DURATION_MINUTES = 5 # Quick stop (swap packages)

    @transaction.atomic
    def generate_local_routes(self, target_date: date, warehouse_id: str):
        from accounts.models import User
        from logistics.models import Route, Warehouse
        from postmats.models import Zone
        
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
                # Fallback: if postmat has no zone, maybe auto-assign or skip
                print(f"Skipping package {pkg.id}: Postmat {pkg.destination_postmat.name} has no zone.")

        created_routes = []
        
        # 2. Get available drivers (filtered by warehouse ideally)
        couriers = list(User.objects.filter(role='courier', is_active=True)) 
        # In a real app, verify courier.warehouse_id == warehouse.id
        
        courier_idx = 0

        for zone in zones:
            zone_pkgs = packages_by_zone.get(zone.id, [])
            if not zone_pkgs:
                continue
            
            # Allocation Phase: Reserve stashes
            allocated_pkgs = self._allocate_stashes(zone_pkgs)
            
            if not allocated_pkgs:
                print(f"Zone {zone.name}: No stashes available for {len(zone_pkgs)} packages. Holding in warehouse.")
                continue

            # Assign Driver (Round-robin for simulation)
            if not couriers:
                print("No couriers available!")
                break

            driver = couriers[courier_idx % len(couriers)]
            courier_idx += 1

            # Build Route (TSP)
            route = self._create_zone_route(driver, warehouse, allocated_pkgs, target_date)
            created_routes.append(route)
            print(f"Created local route {route.id} for Zone {zone.name} ({len(allocated_pkgs)} pkgs)")

        return created_routes

    def _get_local_packages(self, warehouse):
        from packages.models import Actualization
        
        # Packages physically AT this warehouse
        # AND destined for a postmat linked to this warehouse
        latest_acts = Actualization.objects.filter(
            status='in_warehouse', 
            warehouse_id=warehouse.id
        ).select_related('package_id__destination_postmat__zone')
        
        candidates = []
        for act in latest_acts:
            pkg = act.package_id
            # Check if destination postmat belongs to this warehouse
            if pkg.destination_postmat.warehouse_id == warehouse.id:
                candidates.append(pkg)
        
        return candidates

    def _allocate_stashes(self, packages):
        """
        Check if destination postmat has empty stash of right size.
        Returns list of packages that CAN be delivered.
        """
        approved = []
        
        # Group packages by destination postmat to check capacity efficiently
        by_postmat = defaultdict(list)
        for p in packages: by_postmat[p.destination_postmat].append(p)
        
        for pm, pkgs in by_postmat.items():
            # Get available stashes (Not occupied AND not reserved)
            # We treat 'reserved_until' as a block
            now = timezone.now()
            
            # Fetch all empty stashes for this postmat
            empty_stashes = list(pm.stashes.filter(is_empty=True, reserved_until__isnull=True))
            
            # Separate by size
            small_stashes = [s for s in empty_stashes if s.size == 'small']
            medium_stashes = [s for s in empty_stashes if s.size == 'medium']
            large_stashes = [s for s in empty_stashes if s.size == 'large']
            
            for p in pkgs:
                selected_stash = None
                
                # Logic: Exact fit -> Upgrade fit
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
                    # Reserve it immediately in memory (and DB ideally) to prevent double allocation
                    # We will persist this reservation when creating the route, 
                    # but for this calculation loop, popping from the list is enough safety.
                    
                    # Store the stash selection on the package object temporarily for the route creator
                    p._reserved_stash = selected_stash
                    approved.append(p)
                else:
                    # No stash found - package stays in warehouse
                    pass
                    
        return approved

    def _create_zone_route(self, driver, warehouse, packages, date):
        from logistics.models import Route, RouteStop, RoutePackage
        
        # 1. Identify active postmats
        active_postmats = list({p.destination_postmat for p in packages})
        
        # 2. Simple TSP (Nearest Neighbor)
        ordered_stops = []
        current_loc = {'lat': warehouse.latitude, 'lon': warehouse.longitude}
        remaining = list(active_postmats)
        
        total_dist = 0.0
        
        while remaining:
            # Find nearest postmat
            nearest = min(remaining, key=lambda pm: math.sqrt((pm.latitude-current_loc['lat'])**2 + (pm.longitude-current_loc['lon'])**2))
            
            dist = self._haversine(current_loc['lat'], current_loc['lon'], nearest.latitude, nearest.longitude)
            total_dist += dist
            
            ordered_stops.append((nearest, dist))
            current_loc = {'lat': nearest.latitude, 'lon': nearest.longitude}
            remaining.remove(nearest)
            
        # Add return to warehouse
        dist_home = self._haversine(current_loc['lat'], current_loc['lon'], warehouse.latitude, warehouse.longitude)
        total_dist += dist_home
        
        # 3. Create Route
        route = Route.objects.create(
            courier=driver,
            scheduled_date=date,
            status='planned',
            route_type='last_mile',
            total_distance=round(total_dist, 2),
            estimated_duration=int((total_dist / self.AVG_SPEED_KM_MIN) + (len(ordered_stops) * self.STOP_DURATION_MINUTES))
        )
        
        # 4. Create Stops
        
        # Stop 0: Warehouse (Load)
        start_stop = RouteStop.objects.create(route=route, warehouse=warehouse, order=0, distance_from_previous=0)
        
        current_order = 1
        pm_stop_map = {} 
        
        for pm, dist in ordered_stops:
            stop = RouteStop.objects.create(route=route, postmat=pm, order=current_order, distance_from_previous=round(dist, 2))
            pm_stop_map[pm.id] = stop
            current_order += 1
            
        # Stop N: Warehouse (Return)
        RouteStop.objects.create(route=route, warehouse=warehouse, order=current_order, distance_from_previous=round(dist_home, 2))
        
        # 5. Link Packages & Apply Reservations
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
                
                # PERSIST RESERVATION
                if hasattr(pkg, '_reserved_stash'):
                    stash = pkg._reserved_stash
                    # Reserve for 24h or until delivery
                    stash.reserved_until = timezone.now() + timezone.timedelta(hours=24)
                    stash.package = pkg # Optional: link package to stash if model supports it
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