from typing import List, Optional
from logistics.models import Warehouse

class DistanceService:
    """Precomputes and caches shortest paths between warehouses"""
    
    def __init__(self):
        self.warehouses = list(Warehouse.objects.all())
        self.warehouse_ids = [str(w.id) for w in self.warehouses]
        self.id_to_index = {wid: i for i, wid in enumerate(self.warehouse_ids)}
        self.distance_matrix = self._compute_floyd_warshall()
    
    def _compute_floyd_warshall(self) -> List[List[float]]:
        """Floyd-Warshall: O(n³) all-pairs shortest paths"""
        n = len(self.warehouses)
        dist = [[float('inf')] * n for _ in range(n)]
        
        # Initialize diagonal
        for i in range(n):
            dist[i][i] = 0
        
        # Fill direct connections
        for warehouse in self.warehouses:
            i = self.id_to_index[str(warehouse.id)]
            if warehouse.connections:
                for conn in warehouse.connections:
                    try:
                        j = self.id_to_index[conn['id']]
                        dist[i][j] = conn['distance']
                    except (KeyError, TypeError):
                        continue
        
        # Floyd-Warshall algorithm
        for k in range(n):
            for i in range(n):
                for j in range(n):
                    if dist[i][k] + dist[k][j] < dist[i][j]:
                        dist[i][j] = dist[i][k] + dist[k][j]
        
        return dist
    
    def get_distance(self, from_id: str, to_id: str) -> float:
        """O(1) distance lookup"""
        if from_id == to_id:
            return 0.0
        try:
            i = self.id_to_index[from_id]
            j = self.id_to_index[to_id]
            return self.distance_matrix[i][j]
        except KeyError:
            return float('inf')