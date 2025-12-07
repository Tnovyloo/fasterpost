from typing import List, Dict, Optional, Set
from collections import defaultdict, deque
from datetime import date
from django.db import transaction
from django.conf import settings
import math

class RoutingService:
    # Relaxed slightly to 13 hours to ensure return trips fit, 
    # but practically we aim for 8-10h driving
    MAX_WORK_DAY_MINUTES = 720 
    AVG_SPEED_KM_MIN = 1.33     
    STOP_DURATION_MINUTES = 15 

    def __init__(self):
        from logistics.services.distance_service import DistanceService
        self.distance_service = DistanceService()
    
    @transaction.atomic
    def generate_routes_for_date(
        self,
        target_date: date,
        max_stops: int = 15,
        vehicle_capacity: int = 50
    ) -> List:
        
        from accounts.models import User
        from logistics.models import Route
        
        all_packages = self._get_packages_ready_for_routing()
        if not all_packages:
            return []
        
        packages_at_warehouse = defaultdict(list)
        for pkg in all_packages:
            packages_at_warehouse[str(pkg.origin_postmat.warehouse_id)].append(pkg)

        couriers = list(User.objects.filter(role='warehouse', is_active=True))
        if not couriers:
            raise ValueError("No warehouse couriers available")
        
        hub_ids = list(packages_at_warehouse.keys())
        route_plans = []
        assigned_package_ids = set()

        for hub_id in hub_ids:
            hub_packages = packages_at_warehouse[hub_id]
            available_packages = [p for p in hub_packages if p.id not in assigned_package_ids]
            
            if not available_packages:
                continue

            while available_packages:
                # RESTORED LOGIC WITH DEBUG CONDITION:
                # In Production (DEBUG=False): Strict 1:1 limit (1 truck per driver).
                # In Development (DEBUG=True): Allow infinite routes for simulation.
                if not settings.DEBUG and len(route_plans) >= len(couriers):
                    break 

                chunk = available_packages[:vehicle_capacity]
                
                plan = self._build_optimized_tour(
                    hub_packages=chunk,
                    all_packages_map=packages_at_warehouse,
                    assigned_ids=assigned_package_ids,
                    vehicle_capacity=vehicle_capacity
                )
                
                if plan and plan['packages']:
                    route_plans.append(plan)
                    for p in plan['packages']:
                        assigned_package_ids.add(p.id)
                    
                    routed_ids = {p.id for p in plan['packages']}
                    available_packages = [p for p in available_packages if p.id not in routed_ids]
                else:
                    break
        
        assignments = self._assign_to_couriers(route_plans, couriers)
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

    def _build_optimized_tour(
        self, 
        hub_packages: List, 
        all_packages_map: Dict, 
        assigned_ids: Set, 
        vehicle_capacity: int
    ) -> Optional[Dict]:
        if not hub_packages:
            return None

        start_wh = hub_packages[0].origin_postmat.warehouse
        
        candidates = list(hub_packages)
        required_destinations = {pkg.destination_postmat.warehouse for pkg in candidates}
        
        current_node = start_wh
        stops_sequence = [start_wh]
        total_time_min = 0.0
        total_distance_km = 0.0
        
        current_load = len(candidates) 
        remaining_dests = list(required_destinations)
        visited_dest_ids = set()

        while remaining_dests:
            # 1. Find nearest next stop
            best_next = None
            best_dist = float('inf')
            
            for candidate_wh in remaining_dests:
                d = self.distance_service.get_distance(str(current_node.id), str(candidate_wh.id))
                if not math.isinf(d) and d < best_dist:
                    best_dist = d
                    best_next = candidate_wh
            
            if not best_next:
                # print(f"DEBUG: No path to remaining destinations from {current_node.city}")
                break
                
            # 2. Check path OUTBOUND
            path_leg = self._find_shortest_graph_path(current_node, best_next)
            if not path_leg:
                remaining_dests.remove(best_next)
                continue
            
            # Calculate cost of this leg
            leg_dist = 0.0
            temp_prev = current_node
            for node in path_leg[1:]:
                leg_dist += self.distance_service.get_distance(str(temp_prev.id), str(node.id))
                temp_prev = node
                
            drive_time = leg_dist / self.AVG_SPEED_KM_MIN
            stop_time = self.STOP_DURATION_MINUTES
            
            # 3. Check path HOME (Lookahead)
            path_home_test = self._find_shortest_graph_path(best_next, start_wh)
            home_dist = 0.0
            if path_home_test:
                temp_prev_h = best_next
                for node in path_home_test[1:]:
                    home_dist += self.distance_service.get_distance(str(temp_prev_h.id), str(node.id))
                    temp_prev_h = node
            else:
                # print(f"DEBUG: Cannot return home from {best_next.city}")
                remaining_dests.remove(best_next)
                continue

            drive_home_time = home_dist / self.AVG_SPEED_KM_MIN

            # 4. Total Projected Time Check
            projected_total = total_time_min + drive_time + stop_time + drive_home_time
            
            if projected_total > self.MAX_WORK_DAY_MINUTES:
                # print(f"DEBUG: Limit hit. Trip to {best_next.city} would result in {int(projected_total)}m shift.")
                remaining_dests.remove(best_next)
                continue
            
            # Commit Move
            total_distance_km += leg_dist
            total_time_min += (drive_time + stop_time)
            stops_sequence.extend(path_leg[1:])
            current_node = best_next
            if best_next in remaining_dests:
                remaining_dests.remove(best_next)
            
            visited_dest_ids.add(str(current_node.id))
            
            # Backhaul Logic
            available_space = vehicle_capacity - current_load
            if available_space > 0:
                potential_backhauls = all_packages_map.get(str(current_node.id), [])
                for pkg in potential_backhauls:
                    if pkg.id in assigned_ids: continue
                    if pkg in candidates: continue
                    
                    if str(pkg.destination_postmat.warehouse_id) == str(start_wh.id):
                        candidates.append(pkg)
                        available_space -= 1
                        if available_space <= 0: break

        # 5. Return to Hub
        if str(current_node.id) != str(start_wh.id):
            path_home = self._find_shortest_graph_path(current_node, start_wh)
            if path_home:
                leg_dist = 0.0
                temp_prev = current_node
                for node in path_home[1:]:
                    leg_dist += self.distance_service.get_distance(str(temp_prev.id), str(node.id))
                    temp_prev = node
                
                total_distance_km += leg_dist
                total_time_min += (leg_dist / self.AVG_SPEED_KM_MIN)
                stops_sequence.extend(path_home[1:])
                visited_dest_ids.add(str(start_wh.id))
            else:
                # print("CRITICAL: Cannot return to hub.")
                return None

        # 6. Filter Packages
        final_valid_packages = []
        stop_indices = defaultdict(list)
        for idx, wh in enumerate(stops_sequence):
            stop_indices[str(wh.id)].append(idx)
            
        for pkg in candidates:
            origin_id = str(pkg.origin_postmat.warehouse_id)
            dest_id = str(pkg.destination_postmat.warehouse_id)
            
            if origin_id in stop_indices and dest_id in stop_indices:
                valid_flow = False
                for pickup_idx in stop_indices[origin_id]:
                    for dropoff_idx in stop_indices[dest_id]:
                        if dropoff_idx > pickup_idx:
                            valid_flow = True
                            break
                    if valid_flow: break
                
                if valid_flow:
                    final_valid_packages.append(pkg)

        if not final_valid_packages:
            return None

        return {
            'packages': final_valid_packages,
            'stops': stops_sequence,
            'total_distance': round(total_distance_km, 2),
            'package_count': len(final_valid_packages)
        }

    def _find_shortest_graph_path(self, start_wh, end_wh) -> List:
        if start_wh.id == end_wh.id:
            return [start_wh]
            
        from logistics.models import Warehouse
        
        queue = deque([(start_wh, [start_wh])])
        visited = {str(start_wh.id)}
        
        while queue:
            current, path = queue.popleft()
            if str(current.id) == str(end_wh.id):
                return path
            
            conn_ids = []
            if current.connections:
                first = current.connections[0]
                if isinstance(first, dict):
                     conn_ids = [str(c.get('id')) for c in current.connections if c.get('id')]
                elif isinstance(first, str):
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
        sorted_plans = sorted(plans, key=lambda p: p['total_distance'], reverse=True)
        
        # Round-robin assignment for simulation if we have fewer couriers than routes
        courier_cycle = []
        while len(courier_cycle) < len(plans):
            courier_cycle.extend(couriers)
        
        # In DEBUG mode with few couriers, assign multiple routes to same person
        if settings.DEBUG:
             for i, plan in enumerate(sorted_plans):
                courier = courier_cycle[i]
                assignments.append((courier, plan))
        else:
            # Production mode: Greedy load balancing (1 per person max usually enforced by loop break)
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
            
        for pkg in plan['packages']:
            origin_id = str(pkg.origin_postmat.warehouse.id)
            dest_id = str(pkg.destination_postmat.warehouse.id)
            
            pickup_stop = None
            for s in stops_created:
                if str(s.warehouse.id) == origin_id:
                    pickup_stop = s
                    break 
            
            dropoff_stop = None
            if pickup_stop:
                for s in stops_created:
                    if s.order > pickup_stop.order and str(s.warehouse.id) == dest_id:
                        dropoff_stop = s
                        break
            
            if pickup_stop and dropoff_stop and pickup_stop != dropoff_stop:
                RoutePackage.objects.create(
                    route=route,
                    package=pkg,
                    pickup_stop=pickup_stop,
                    dropoff_stop=dropoff_stop
                )
                
        return route