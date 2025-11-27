from typing import List, Dict, Optional
from collections import defaultdict
from datetime import date
from django.db import transaction
from logistics.models import Package, Warehouse
from packages.models import Actualization
from accounts.models import User
from logistics.models import Route, RouteStop, RoutePackage
from .distance_service import DistanceService


class RoutingService:
    """Main routing logic for warehouse-to-warehouse transport"""
    
    def __init__(self):
        self.distance_service = DistanceService()
    
    @transaction.atomic
    def generate_routes_for_date(
        self,
        target_date: date,
        max_stops: int = 6,
        vehicle_capacity: int = 50
    ) -> List[Route]:
        """Generate all routes for a given date"""
        
        # Get packages in warehouses ready for transport
        packages = self._get_packages_ready_for_routing()
        
        if not packages:
            return []
        
        # Get available warehouse couriers
        couriers = User.objects.filter(
            role='warehouse',
            is_active=True
        )
        
        if not couriers.exists():
            raise ValueError("No warehouse couriers available")
        
        # Build route plans
        package_groups = self._group_packages(packages)
        route_plans = []
        
        for group in package_groups:
            plan = self._build_route_plan(group, max_stops, vehicle_capacity)
            if plan:
                route_plans.append(plan)
        
        # Assign to couriers
        assignments = self._assign_to_couriers(route_plans, list(couriers))
        
        # Create routes in DB
        created_routes = []
        for courier, plan in assignments:
            route = self._create_route(courier, plan, target_date)
            created_routes.append(route)
        
        return created_routes
    
    def _get_packages_ready_for_routing(self) -> List[Package]:
        """Find packages in warehouses waiting for inter-warehouse transport"""
        # Get latest actualization for each package
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
            # Only include if destination is different warehouse
            if pkg.destination_postmat.warehouse_id != act.warehouse_id:
                packages.append(pkg)
        
        return packages
    
    def _group_packages(self, packages: List[Package]) -> List[List[Package]]:
        """Group packages by destination warehouse"""
        groups = defaultdict(list)
        for pkg in packages:
            dest_id = str(pkg.destination_postmat.warehouse_id)
            groups[dest_id].append(pkg)
        return list(groups.values())
    
    def _build_route_plan(
        self,
        packages: List[Package],
        max_stops: int,
        vehicle_capacity: int
    ) -> Optional[Dict]:
        """Build route plan for package group"""
        
        if not packages or len(packages) > vehicle_capacity:
            return None
        
        # Collect warehouses
        origins = set(str(p.origin_postmat.warehouse_id) for p in packages)
        destinations = set(str(p.destination_postmat.warehouse_id) for p in packages)
        
        # Build stop list
        stops = list(origins) + list(destinations)
        unique_stops = []
        seen = set()
        for stop in stops:
            if stop not in seen:
                seen.add(stop)
                unique_stops.append(stop)
        
        if len(unique_stops) > max_stops:
            unique_stops = unique_stops[:max_stops]
        
        # Optimize order
        optimized_stops = self._nearest_neighbor(unique_stops)
        distance = self._calculate_distance(optimized_stops)
        
        return {
            'packages': packages,
            'stops': optimized_stops,
            'total_distance': distance,
            'package_count': len(packages)
        }
    
    def _nearest_neighbor(self, stops: List[str]) -> List[str]:
        """Nearest neighbor TSP heuristic"""
        if len(stops) <= 2:
            return stops
        
        route = [stops[0]]
        remaining = set(stops[1:])
        current = stops[0]
        
        while remaining:
            nearest = min(
                remaining,
                key=lambda s: self.distance_service.get_distance(current, s)
            )
            route.append(nearest)
            remaining.remove(nearest)
            current = nearest
        
        return route
    
    def _calculate_distance(self, stops: List[str]) -> float:
        """Calculate total route distance"""
        if len(stops) <= 1:
            return 0.0
        
        total = sum(
            self.distance_service.get_distance(stops[i], stops[i+1])
            for i in range(len(stops) - 1)
        )
        return round(total, 2)
    
    def _assign_to_couriers(
        self,
        route_plans: List[Dict],
        couriers: List[User]
    ) -> List[tuple]:
        """Assign routes to couriers with load balancing"""
        
        courier_loads = {c.id: 0.0 for c in couriers}
        assignments = []
        
        # Sort by distance (longest first)
        sorted_plans = sorted(
            route_plans,
            key=lambda p: p['total_distance'],
            reverse=True
        )
        
        for plan in sorted_plans:
            # Find courier with minimum load
            best_courier = min(couriers, key=lambda c: courier_loads[c.id])
            assignments.append((best_courier, plan))
            courier_loads[best_courier.id] += plan['total_distance']
        
        return assignments
    
    def _create_route(
        self,
        courier: User,
        plan: Dict,
        scheduled_date: date
    ) -> Route:
        """Create Route and related objects in DB"""
        
        # Create route
        route = Route.objects.create(
            courier=courier,
            scheduled_date=scheduled_date,
            total_distance=plan['total_distance'],
            estimated_duration=int(plan['total_distance'] * 2)
        )
        
        # Create stops
        stops = []
        for order, warehouse_id in enumerate(plan['stops']):
            dist_from_prev = 0 if order == 0 else self.distance_service.get_distance(
                plan['stops'][order - 1],
                warehouse_id
            )
            
            stop = RouteStop.objects.create(
                route=route,
                warehouse_id=warehouse_id,
                order=order,
                distance_from_previous=dist_from_prev
            )
            stops.append(stop)
        
        # Link packages
        for package in plan['packages']:
            origin_id = str(package.origin_postmat.warehouse_id)
            dest_id = str(package.destination_postmat.warehouse_id)
            
            pickup_stop = next((s for s in stops if str(s.warehouse_id) == origin_id), None)
            dropoff_stop = next((s for s in stops if str(s.warehouse_id) == dest_id), None)
            
            if pickup_stop and dropoff_stop:
                RoutePackage.objects.create(
                    route=route,
                    package=package,
                    pickup_stop=pickup_stop,
                    dropoff_stop=dropoff_stop
                )
        
        return route