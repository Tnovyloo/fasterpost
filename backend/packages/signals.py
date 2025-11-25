from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Package, Actualization

@receiver(post_save, sender=Package)
def create_initial_actualization(sender, instance, created, **kwargs):
    """
    Automatically create the first Actualization when a Package is created,
    no matter if it's created via API, admin, or shell.
    """
    if created and not instance.actualizations.exists():
        Actualization.objects.create(
            package_id=instance,
            status="created",
        )
