from django.contrib import admin
from .models import Package

@admin.register(Package)
class PackageAdmin(admin.ModelAdmin):
     list_display = ('id', 'sender', 'receiver_name')
     search_fields = ('sender__username', 'receiver__username', 'id')

