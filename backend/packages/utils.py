import random
from math import radians, cos, sin, asin, sqrt
from postmats.models import Postmat, Stash


def generate_unlock_code():
    return str(random.randint(100000, 999999))


def distance(lat1, lon1, lat2, lon2):
    # Haversine
    R = 6371
    d_lat = radians(lat2 - lat1)
    d_lon = radians(lon2 - lon1)
    a = (
        sin(d_lat / 2) ** 2
        + cos(radians(lat1)) * cos(radians(lat2)) * sin(d_lon / 2) ** 2
    )
    return 2 * R * asin(sqrt(a))


def find_nearest_postmat_with_stash(origin_pm, size):
    """Returns nearest Postmat (including origin itself) with at least 1 empty Stash of given size."""
    postmats = Postmat.objects.all()
    best = None
    best_dist = None

    for pm in postmats:
        has_stash = pm.stashes.filter(
            size=size, is_empty=True, reserved_until__isnull=True
        ).exists()
        if not has_stash:
            continue

        dist = distance(
            origin_pm.latitude, origin_pm.longitude, pm.latitude, pm.longitude
        )

        if best is None or dist < best_dist:
            best = pm
            best_dist = dist

    return best
