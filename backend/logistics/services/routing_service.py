from typing import List, Dict, Optional, Set, Tuple
from collections import defaultdict, deque
from datetime import date
from django.db import transaction
from django.conf import settings
import math

class RoutingService:
    MAX_WORK_DAY_MINUTES = 720 
    AVG_SPEED_KM_MIN = 1.33     
    STOP_DURATION_MINUTES = 15 

    def __init__(self):
        from logistics.services.distance_service import DistanceService
        self.distance_service = DistanceService()
        from logistics.models import Warehouse
        
        self.all_warehouses = list(Warehouse.objects.all())
        self.warehouse_map = {str(w.id): w for w in self.all_warehouses}
    
    @transaction.atomic
    def generate_routes_for_date(
        self,
        target_date: date,
        max_stops: int = 15,
        vehicle_capacity: int = 50
    ) -> List:
        
        from accounts.models import User
        
        pkg_locations = self._get_packages_and_locations()
        if not pkg_locations:
            return []
        
        packages_at_warehouse = defaultdict(list)
        for pkg, current_wh in pkg_locations:
            wh_id_str = str(current_wh.id)
            packages_at_warehouse[wh_id_str].append(pkg)

        couriers = list(User.objects.filter(role='warehouse', is_active=True))
        if not couriers:
            raise ValueError("No warehouse couriers available")
        
        hub_ids = list(packages_at_warehouse.keys())
        route_plans = []
        assigned_package_ids = set()

        for hub_id in hub_ids:
            hub_packages = packages_at_warehouse[hub_id]
            hub_packages.sort(key=lambda p: str(p.destination_postmat.warehouse_id))
            
            available_packages = [p for p in hub_packages if p.id not in assigned_package_ids]
            
            if not available_packages:
                continue

            # Driver Capacity Check
            # STRICT RULE: Only count drivers belonging to THIS hub
            # We removed the DEBUG override. You must have drivers to move packages.
            drivers_at_hub = [c for c in couriers if str(getattr(c, 'warehouse_id', '')) == str(hub_id)]
            max_hub_routes = len(drivers_at_hub)
            
            if not drivers_at_hub:
                print(f"WARNING: No drivers found assigned to Hub {hub_id}. {len(available_packages)} packages will remain in warehouse.")
                continue

            routes_generated_this_hub = 0

            while available_packages:
                # Stop if we don't have free drivers left
                if routes_generated_this_hub >= max_hub_routes:
                    print(f"DEBUG: Capacity reached for hub {hub_id}. Drivers: {max_hub_routes}, Routes: {routes_generated_this_hub}")
                    break 

                chunk = available_packages[:vehicle_capacity]
                chunk_ids = {p.id for p in chunk}
                
                plan = self._build_optimized_tour(
                    hub_packages=chunk,
                    all_packages_map=packages_at_warehouse,
                    assigned_ids=assigned_package_ids,
                    vehicle_capacity=vehicle_capacity,
                    start_hub_id=hub_id
                )
                
                if plan and plan['assignments']:
                    plan['start_hub_id'] = hub_id
                    route_plans.append(plan)
                    routes_generated_this_hub += 1
                    
                    for pkg, _, _ in plan['assignments']:
                        assigned_package_ids.add(pkg.id)
                    
                    routed_ids = {p.id for p, _, _ in plan['assignments']}
                    available_packages = [p for p in available_packages if p.id not in chunk_ids]
                else:
                    available_packages = [p for p in available_packages if p.id not in chunk_ids]
        
        assignments = self._assign_to_couriers(route_plans, couriers)
        created_routes = []
        for courier, plan in assignments:
            route = self._create_route(courier, plan, target_date)
            created_routes.append(route)
            
        return created_routes

    def _get_packages_and_locations(self) -> List[Tuple]:
        from packages.models import Actualization
        
        latest_acts = Actualization.objects.order_by('package_id', '-created_at').distinct('package_id').select_related(
            'package_id__origin_postmat__warehouse',
            'package_id__destination_postmat__warehouse',
            'warehouse_id'
        )
        
        results = []
        for act in latest_acts:
            if act.status == 'in_warehouse' and act.warehouse_id:
                pkg = act.package_id
                if str(pkg.destination_postmat.warehouse_id) != str(act.warehouse_id.id):
                    results.append((pkg, act.warehouse_id))
        return results

    def _build_optimized_tour(self, hub_packages, all_packages_map, assigned_ids, vehicle_capacity, start_hub_id):
        if not hub_packages: return None

        start_wh = self.warehouse_map.get(str(start_hub_id))
        if not start_wh: return None
        
        candidates = {pkg: pkg.destination_postmat.warehouse for pkg in hub_packages}
        pkg_pickup_locs = {pkg: start_wh for pkg in hub_packages}
        
        current_node = start_wh
        stops_sequence = [start_wh]
        total_time_min = 0.0
        total_distance_km = 0.0
        current_load = len(candidates)
        
        def get_remaining_dests():
            return {target_wh for pkg, target_wh in candidates.items() 
                    if str(target_wh.id) != str(current_node.id) 
                    and str(target_wh.id) not in [str(s.id) for s in stops_sequence]}

        remaining_dests = list(get_remaining_dests())

        while remaining_dests:
            best_next = None
            best_dist = float('inf')
            
            for candidate_wh in remaining_dests:
                d = self.distance_service.get_distance(str(current_node.id), str(candidate_wh.id))
                if not math.isinf(d) and d < best_dist:
                    best_dist = d
                    best_next = candidate_wh
            
            if not best_next: break

            path_leg = self._find_shortest_graph_path(current_node, best_next)
            can_visit = False
            
            if path_leg:
                leg_dist = self._calculate_path_distance(path_leg)
                drive_time = leg_dist / self.AVG_SPEED_KM_MIN
                
                path_home = self._find_shortest_graph_path(best_next, start_wh)
                if path_home:
                    home_dist = self._calculate_path_distance(path_home)
                    drive_home = home_dist / self.AVG_SPEED_KM_MIN
                    
                    if total_time_min + drive_time + self.STOP_DURATION_MINUTES + drive_home <= self.MAX_WORK_DAY_MINUTES:
                        can_visit = True
                        total_distance_km += leg_dist
                        total_time_min += (drive_time + self.STOP_DURATION_MINUTES)
                        stops_sequence.extend(path_leg[1:])
                        current_node = best_next
                        remaining_dests = list(get_remaining_dests())
            
            if not can_visit:
                stranded_pkgs = [p for p, t in candidates.items() if t.id == best_next.id]
                transfer_hub = self._find_best_transfer_hub(current_node, best_next, start_wh, total_time_min)
                
                if transfer_hub and str(transfer_hub.id) != str(start_wh.id):
                    for p in stranded_pkgs: candidates[p] = transfer_hub
                    remaining_dests = list(get_remaining_dests())
                else:
                    for p in stranded_pkgs: 
                        del candidates[p]
                        if p in pkg_pickup_locs: del pkg_pickup_locs[p]
                    remaining_dests = list(get_remaining_dests())

            available_space = vehicle_capacity - current_load
            if available_space > 0 and str(current_node.id) != str(start_wh.id):
                potential_backhauls = all_packages_map.get(str(current_node.id), [])
                for pkg in potential_backhauls:
                    if pkg.id in assigned_ids: continue
                    if pkg in candidates: continue
                    
                    if str(pkg.destination_postmat.warehouse_id) == str(start_wh.id):
                        candidates[pkg] = pkg.destination_postmat.warehouse
                        pkg_pickup_locs[pkg] = current_node
                        available_space -= 1
                        if available_space <= 0: break
                        
        if str(current_node.id) != str(start_wh.id):
            path_home = self._find_shortest_graph_path(current_node, start_wh)
            if path_home:
                leg_dist = self._calculate_path_distance(path_home)
                total_distance_km += leg_dist
                total_time_min += (leg_dist / self.AVG_SPEED_KM_MIN)
                stops_sequence.extend(path_home[1:])
            else:
                return None

        final_assignment = []
        stop_indices = defaultdict(list)
        for idx, wh in enumerate(stops_sequence):
            stop_indices[str(wh.id)].append(idx)
            
        for pkg, target_wh in candidates.items():
            if pkg not in pkg_pickup_locs: continue
            
            source_wh = pkg_pickup_locs[pkg]
            origin_id = str(source_wh.id)
            dest_id = str(target_wh.id)
            
            if origin_id in stop_indices and dest_id in stop_indices:
                valid_flow = False
                for pickup_idx in stop_indices[origin_id]:
                    for dropoff_idx in stop_indices[dest_id]:
                        if dropoff_idx > pickup_idx:
                            valid_flow = True
                            break
                    if valid_flow: break
                
                if valid_flow:
                    final_assignment.append((pkg, source_wh, target_wh))

        if not final_assignment: return None

        return {
            'assignments': final_assignment,
            'stops': stops_sequence,
            'total_distance': round(total_distance_km, 2),
            'package_count': len(final_assignment)
        }

    def _find_best_transfer_hub(self, current_node, final_dest, start_wh, current_time_used):
        current_dist = self.distance_service.get_distance(str(current_node.id), str(final_dest.id))
        best_hub = None
        best_progress = -1.0
        
        for hub in self.all_warehouses:
            if hub.id == current_node.id or hub.id == final_dest.id: continue
            hub_dist = self.distance_service.get_distance(str(hub.id), str(final_dest.id))
            progress = current_dist - hub_dist
            if progress <= 0: continue
            
            if progress > best_progress:
                path_to = self._find_shortest_graph_path(current_node, hub)
                path_home = self._find_shortest_graph_path(hub, start_wh)
                
                if path_to and path_home:
                    dist_out = self._calculate_path_distance(path_to)
                    dist_back = self._calculate_path_distance(path_home)
                    time_cost = (dist_out + dist_back) / self.AVG_SPEED_KM_MIN + self.STOP_DURATION_MINUTES
                    if current_time_used + time_cost <= self.MAX_WORK_DAY_MINUTES:
                        best_progress = progress
                        best_hub = hub
        return best_hub

    def _calculate_path_distance(self, nodes):
        dist = 0.0
        prev = nodes[0]
        for node in nodes[1:]:
            d = self.distance_service.get_distance(str(prev.id), str(node.id))
            dist += 0 if math.isinf(d) else d
            prev = node
        return dist

    def _find_shortest_graph_path(self, start_wh, end_wh) -> List:
        if start_wh.id == end_wh.id: return [start_wh]
        queue = deque([(start_wh, [start_wh])])
        visited = {str(start_wh.id)}
        while queue:
            current, path = queue.popleft()
            if str(current.id) == str(end_wh.id): return path
            conn_ids = []
            if current.connections:
                first = current.connections[0]
                if isinstance(first, dict): conn_ids = [str(c.get('id')) for c in current.connections if c.get('id')]
                elif isinstance(first, str): conn_ids = [str(c) for c in current.connections]
            for cid in conn_ids:
                if cid not in visited:
                    visited.add(cid)
                    next_wh = self.warehouse_map.get(cid)
                    if next_wh:
                        queue.append((next_wh, path + [next_wh]))
        return None

    def _assign_to_couriers(self, plans, couriers):
        assignments = []
        busy_courier_ids = set()
        
        # Sort plans by distance, so we assign the hardest routes first
        sorted_plans = sorted(plans, key=lambda p: p['total_distance'], reverse=True)
        
        for i, plan in enumerate(sorted_plans):
            start_hub_id = plan.get('start_hub_id')
            if not start_hub_id:
                start_hub_id = str(plan['stops'][0].id)
            
            # STRICT ASSIGNMENT: Only drivers from this hub
            candidates = [c for c in couriers if str(getattr(c, 'warehouse_id', '')) == start_hub_id]
            
            # Filter out drivers already assigned today
            available_candidates = [c for c in candidates if c.id not in busy_courier_ids]
            
            if not available_candidates:
                print(f"CRITICAL: No available driver for route at Hub {start_hub_id}. Route skipped.")
                continue

            # Simple Load Balancing (or just pick first available)
            # Since we only do 1 route per driver now, load balancing is moot.
            best_courier = available_candidates[0]

            busy_courier_ids.add(best_courier.id)
            assignments.append((best_courier, plan))
            
        return assignments

    def _create_route(self, courier, plan, scheduled_date):
        from logistics.models import Route, RouteStop, RoutePackage
        
        route = Route.objects.create(
            courier=courier,
            scheduled_date=scheduled_date,
            total_distance=plan['total_distance'],
            estimated_duration=0
        )
        
        stops_created = []
        for i, wh in enumerate(plan['stops']):
            prev = plan['stops'][i-1] if i > 0 else None
            dist = self.distance_service.get_distance(str(prev.id), str(wh.id)) if prev else 0.0
            stop = RouteStop.objects.create(route=route, warehouse=wh, order=i, distance_from_previous=0 if math.isinf(dist) else dist)
            stops_created.append(stop)
            
        active_stop_ids = set()
        
        for pkg, pickup_wh, dropoff_wh in plan['assignments']:
            pickup_id = str(pickup_wh.id)
            dropoff_id = str(dropoff_wh.id)
            
            pickup_stop = None
            for s in stops_created:
                if str(s.warehouse.id) == pickup_id:
                    pickup_stop = s
                    break 
            
            dropoff_stop = None
            if pickup_stop:
                for s in stops_created:
                    if s.order > pickup_stop.order and str(s.warehouse.id) == dropoff_id:
                        dropoff_stop = s
                        break
            
            if pickup_stop and dropoff_stop and pickup_stop != dropoff_stop:
                RoutePackage.objects.create(
                    route=route,
                    package=pkg,
                    pickup_stop=pickup_stop,
                    dropoff_stop=dropoff_stop
                )
                active_stop_ids.add(pickup_stop.id)
                active_stop_ids.add(dropoff_stop.id)

        drive_time = route.total_distance / self.AVG_SPEED_KM_MIN
        stop_penalty = len(active_stop_ids) * self.STOP_DURATION_MINUTES
        route.estimated_duration = int(drive_time + stop_penalty)
        route.save()
                
        return route