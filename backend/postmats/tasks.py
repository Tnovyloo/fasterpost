from celery import shared_task
from django.utils import timezone
from django.db.models import Q
from .models import Stash
import logging


@shared_task(name="cleanup_expired_stash_reservations")
def cleanup_expired_stash_reservations():
    """
    Remove expired reservations from stashes.
    Sets reserved_until to None for all stashes where the reservation has expired.
    """
    now = timezone.now()

    # Find all stashes with expired reservations
    expired_stashes = Stash.objects.filter(
        Q(reserved_until__isnull=False) & Q(reserved_until__lt=now)
    )

    count = expired_stashes.count()

    if count > 0:
        # Clear the reservations
        updated = expired_stashes.update(reserved_until=None)
        print(f"Cleared {updated} expired stash reservations")
        return f"Successfully cleared {updated} expired reservations"

    print("No expired reservations found")
    return "No expired reservations to clear"
