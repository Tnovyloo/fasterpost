from typing import List, Dict, Optional
from collections import defaultdict, deque
from datetime import date
from django.db import transaction
import math  # <--- Essential for checking 'inf'

class RoutingService:
    # 12 hours (Standard logistics shift)
    MAX_WORK_DAY_MINUTES = 720  
    # ~80 km/h (1.33 km/min)
    AVG_SPEED_KM_MIN = 1.33     
    # Unloading time per stop
    STOP_DURATION_MINUTES = 15  

    def __init__(self):
        # Using your existing DistanceService
        from logistics.services.distance_service import DistanceService
        self.distance_service = DistanceService()
    
    @transaction.atomic
    def generate_routes_for_date(
        self,
        target_date: date,
        max_stops: int = 10,
        vehicle_capacity: int = 50
    ) -> List:
        
        from accounts.models import User
        
        packages = self._get_packages_ready_for_routing()
        if not packages:
            return []
        
        couriers = list(User.objects.filter(role='warehouse', is_active=True))
        if not couriers:
            raise ValueError("No warehouse couriers available")
        
        # Group packages by their Origin Warehouse (The Hub)
        package_groups = self._group_packages(packages)
        
        route_plans = []
        for group in package_groups:
            # 1. Build a valid plan
            plan = self._build_smart_round_trip(group, vehicle_capacity)
            if plan:
                route_plans.append(plan)
        
        # 2. Assign plans to couriers
        assignments = self._assign_to_couriers(route_plans, couriers)
        
        # 3. Save to DB
        created_routes = []
        for courier, plan in assignments:
            route = self._create_route(courier, plan, target_date)
            created_routes.append(route)
            
        return created_routes

    def _get_packages_ready_for_routing(self) -> List:
        from packages.models import Actualization
        
        latest_acts = Actualization.objects.filter(
            status='in_warehouse',
            warehouse_id__isnull=False
        ).select_related(
            'package_id__origin_postmat__warehouse',
            'package_id__destination_postmat__warehouse',
            'warehouse_id'
        ).order_by('package_id', '-created_at').distinct('package_id')
        
        packages = []
        for act in latest_acts:
            pkg = act.package_id
            if pkg.destination_postmat.warehouse_id != act.warehouse_id:
                packages.append(pkg)
        return packages
    
    def _group_packages(self, packages: List) -> List[List]:
        groups = defaultdict(list)
        for pkg in packages:
            origin_id = str(pkg.origin_postmat.warehouse_id)
            groups[origin_id].append(pkg)
        return list(groups.values())

    def _build_smart_round_trip(self, packages: List, vehicle_capacity: int) -> Optional[Dict]:
        if not packages:
            return None

        start_wh = packages[0].origin_postmat.warehouse
        # Use a set to avoid duplicate destinations
        destinations = {pkg.destination_postmat.warehouse for pkg in packages}

        current_node = start_wh
        stops_sequence = [start_wh]
        accepted_packages = []
        
        total_time_min = 0.0
        total_distance_km = 0.0
        
        # Sort destinations by straight-line distance (heuristic) to prioritize closer ones
        # We catch potential errors here if distance service fails
        try:
            sorted_dests = sorted(
                list(destinations), 
                key=lambda w: self.distance_service.get_distance(str(start_wh.id), str(w.id))
            )
        except Exception:
            # Fallback if sorting fails
            sorted_dests = list(destinations)

        print(f"DEBUG: Processing Route from {start_wh.city}. Candidates: {[d.city for d in sorted_dests]}")

        for target_wh in sorted_dests:
            # 1. Find graph path (connectivity check)
            path_to_target = self._find_shortest_graph_path(current_node, target_wh)
            path_home = self._find_shortest_graph_path(target_wh, start_wh)
            
            if not path_to_target or not path_home:
                print(f"DEBUG: Skipping {target_wh.city} - Not connected in Graph.")
                continue
            
            # 2. Calculate Leg Metrics (Distance & Time)
            leg_distance = 0.0
            
            # Combine paths: Outbound + Inbound
            # Skip the first element of each path as it duplicates the previous node
            full_loop_nodes = path_to_target[1:] + path_home[1:]
            
            temp_prev = current_node
            is_reachable = True
            
            for node in full_loop_nodes:
                # CRITICAL FIX: Convert UUID to string for your Service
                d = self.distance_service.get_distance(str(temp_prev.id), str(node.id))
                
                # CRITICAL FIX: Check for Infinity
                if math.isinf(d):
                    print(f"DEBUG: Infinite distance detected between {temp_prev.city} and {node.city}. Check 'connections' JSON data.")
                    is_reachable = False
                    break
                
                leg_distance += d
                temp_prev = node
            
            if not is_reachable:
                continue

            drive_time = leg_distance / self.AVG_SPEED_KM_MIN
            # Heuristic: 15 mins per leg added roughly
            stop_time = self.STOP_DURATION_MINUTES * 2 
            added_time = drive_time + stop_time
            
            # 3. Check Time Constraints
            if total_time_min + added_time <= self.MAX_WORK_DAY_MINUTES:
                # Accept this destination
                stops_sequence.extend(full_loop_nodes)
                total_distance_km += leg_distance
                total_time_min += added_time
                current_node = start_wh # We conceptually returned home
                
                # Add matching packages
                for pkg in packages:
                    if pkg.destination_postmat.warehouse_id == target_wh.id:
                        accepted_packages.append(pkg)
            else:
                print(f"DEBUG: Skipping {target_wh.city}. Time limit exceeded (Need {int(added_time)}m).")

        if len(stops_sequence) <= 1:
            return None

        return {
            'packages': accepted_packages,
            'stops': stops_sequence,
            'total_distance': round(total_distance_km, 2),
            'package_count': len(accepted_packages)
        }

    def _find_shortest_graph_path(self, start_wh, end_wh) -> List:
        """BFS to find path through connected warehouses"""
        if start_wh.id == end_wh.id:
            return [start_wh]
            
        from logistics.models import Warehouse
        
        # Queue stores (WarehouseObject, [Path])
        queue = deque([(start_wh, [start_wh])])
        visited = {str(start_wh.id)}
        
        while queue:
            current, path = queue.popleft()
            
            if str(current.id) == str(end_wh.id):
                return path
            
            # Safe extraction of connection IDs
            conn_ids = []
            if current.connections:
                # Handle list of dicts or list of strings
                first_item = current.connections[0]
                if isinstance(first_item, dict):
                     conn_ids = [str(c.get('id')) for c in current.connections if c.get('id')]
                elif isinstance(first_item, str):
                     conn_ids = [str(c) for c in current.connections]
            
            for cid in conn_ids:
                if cid not in visited:
                    visited.add(cid)
                    try:
                        next_wh = Warehouse.objects.get(id=cid)
                        queue.append((next_wh, path + [next_wh]))
                    except Warehouse.DoesNotExist:
                        continue
                        
        return None

    def _assign_to_couriers(self, plans, couriers):
        assignments = []
        courier_loads = {c.id: 0.0 for c in couriers}
        
        # Assign longest routes first
        sorted_plans = sorted(plans, key=lambda p: p['total_distance'], reverse=True)
        
        for plan in sorted_plans:
            best_courier = min(couriers, key=lambda c: courier_loads[c.id])
            assignments.append((best_courier, plan))
            courier_loads[best_courier.id] += plan['total_distance']
            
        return assignments

    def _create_route(self, courier, plan, scheduled_date):
        from logistics.models import Route, RouteStop, RoutePackage
        
        route = Route.objects.create(
            courier=courier,
            scheduled_date=scheduled_date,
            total_distance=plan['total_distance'],
            estimated_duration=int(plan['total_distance'] / self.AVG_SPEED_KM_MIN) + (len(plan['stops']) * 15)
        )
        
        # Create Stops
        # Since we might visit the same warehouse multiple times (Hub -> A -> Hub -> B -> Hub)
        # We iterate purely by order index
        stops_created = []
        
        for i, wh in enumerate(plan['stops']):
            prev_wh_obj = plan['stops'][i-1] if i > 0 else None
            dist = 0.0
            
            if prev_wh_obj:
                d = self.distance_service.get_distance(str(prev_wh_obj.id), str(wh.id))
                dist = 0.0 if math.isinf(d) else d
                
            stop = RouteStop.objects.create(
                route=route,
                warehouse=wh,
                order=i,
                distance_from_previous=dist
            )
            stops_created.append(stop)
            
        # Link Packages
        for pkg in plan['packages']:
            origin_id = str(pkg.origin_postmat.warehouse.id)
            dest_id = str(pkg.destination_postmat.warehouse.id)
            
            # Logic: Pickup at FIRST visit to Origin
            pickup_stop = None
            for s in stops_created:
                if str(s.warehouse.id) == origin_id:
                    pickup_stop = s
                    break
            
            # Logic: Dropoff at FIRST visit to Dest AFTER Pickup
            dropoff_stop = None
            if pickup_stop:
                for s in stops_created:
                    if s.order > pickup_stop.order and str(s.warehouse.id) == dest_id:
                        dropoff_stop = s
                        break
            
            if pickup_stop and dropoff_stop:
                RoutePackage.objects.create(
                    route=route,
                    package=pkg,
                    pickup_stop=pickup_stop,
                    dropoff_stop=dropoff_stop
                )
                
        return route