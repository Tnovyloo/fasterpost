import random
import math
from django.core.management.base import BaseCommand
from django.db import transaction
from logistics.models import Warehouse
from postmats.models import Postmat, Zone

class Command(BaseCommand):
    help = 'Automatically partitions Postmats into Zones using K-Means clustering'

    def add_arguments(self, parser):
        parser.add_argument('--zones', type=int, default=4, help='Number of zones per warehouse')

    def handle(self, *args, **options):
        warehouses = Warehouse.objects.all()
        k = options['zones']
        
        # Colors for zones to make them distinct on map
        ZONE_COLORS = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'] # Red, Blue, Green, Yellow, Purple, Pink

        self.stdout.write(f"Partitioning {len(warehouses)} warehouses into {k} zones each...")

        with transaction.atomic():
            # Clear old zones to prevent duplicates
            Zone.objects.all().delete()
            
            for wh in warehouses:
                postmats = list(wh.postmats.all())
                
                if not postmats:
                    continue
                    
                if len(postmats) <= k:
                    # If fewer postmats than zones, just assign 1 per zone or put all in Zone A
                    zone = Zone.objects.create(name=f"{wh.city} Central", warehouse=wh, color=ZONE_COLORS[0])
                    for pm in postmats:
                        pm.zone = zone
                        pm.save()
                    continue

                # --- K-MEANS ALGORITHM ---
                
                # 1. Initialize Centroids (Pick K random postmats)
                centroids = []
                initial_points = random.sample(postmats, k)
                for p in initial_points:
                    centroids.append({'lat': p.latitude, 'lon': p.longitude})
                
                assignments = {} # PostmatID -> ClusterIndex
                
                # Iterate to converge (10 iterations is plenty for simple geography)
                for _ in range(10):
                    clusters = [[] for _ in range(k)]
                    
                    # Assignment Step
                    for pm in postmats:
                        best_cluster = 0
                        min_dist = float('inf')
                        
                        for i, c in enumerate(centroids):
                            dist = math.sqrt((pm.latitude - c['lat'])**2 + (pm.longitude - c['lon'])**2)
                            if dist < min_dist:
                                min_dist = dist
                                best_cluster = i
                        
                        clusters[best_cluster].append(pm)
                        assignments[pm.id] = best_cluster
                    
                    # Update Step (Move centroids to average of cluster)
                    for i in range(k):
                        if clusters[i]:
                            avg_lat = sum(p.latitude for p in clusters[i]) / len(clusters[i])
                            avg_lon = sum(p.longitude for p in clusters[i]) / len(clusters[i])
                            centroids[i] = {'lat': avg_lat, 'lon': avg_lon}
                
                # 2. Save Zones
                zone_objects = []
                for i in range(k):
                    # Give zone a name based on direction (North/South etc) relative to Warehouse
                    lat_diff = centroids[i]['lat'] - wh.latitude
                    lon_diff = centroids[i]['lon'] - wh.longitude
                    
                    direction = ""
                    if lat_diff > 0: direction += "N"
                    else: direction += "S"
                    if lon_diff > 0: direction += "E"
                    else: direction += "W"
                    
                    zone_name = f"{wh.city} {direction} ({i+1})"
                    zone = Zone.objects.create(
                        name=zone_name, 
                        warehouse=wh, 
                        color=ZONE_COLORS[i % len(ZONE_COLORS)]
                    )
                    zone_objects.append(zone)
                
                # 3. Apply Assignments
                for pm in postmats:
                    cluster_idx = assignments[pm.id]
                    pm.zone = zone_objects[cluster_idx]
                    pm.save()
                
                self.stdout.write(f" - Partitioned {wh.city}: {len(postmats)} postmats -> {k} zones")

        self.stdout.write(self.style.SUCCESS("Successfully zoned all postmats."))