from django.core.management.base import BaseCommand
from logistics.models import Route

class Command(BaseCommand):
    help = 'Deletes all routes, stops, and route-package assignments. Useful for resetting simulation.'

    def handle(self, *args, **options):
        count = Route.objects.count()
        
        if count == 0:
            self.stdout.write(self.style.WARNING("No routes found to delete."))
            return

        confirm = input(f"Are you sure you want to delete {count} routes? [y/N]: ")
        if confirm.lower() != 'y':
            self.stdout.write(self.style.ERROR("Operation cancelled."))
            return

        # Cascading delete will handle stops and route_packages
        deleted, _ = Route.objects.all().delete()
        
        self.stdout.write(self.style.SUCCESS(f"Successfully deleted {deleted} items (Routes + dependencies)."))