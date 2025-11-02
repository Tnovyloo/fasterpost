from django.contrib import admin
from .models import Package, Actualization

@admin.register(Package)
class PackageAdmin(admin.ModelAdmin):
     list_display = ('id', 'sender', 'receiver_name')
     search_fields = ('sender__username', 'receiver__username', 'id')

@admin.register(Actualization)
class ActualizationAdmin(admin.ModelAdmin):
    list_display = ('id', 'package_id', 'status')
    search_fields = ('package__id', 'status')
