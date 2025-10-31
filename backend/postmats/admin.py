from django.contrib import admin

from .models import Postmat, Stash

from django.contrib import admin
from .models import Postmat, Stash


@admin.register(Postmat)
class PostmatAdmin(admin.ModelAdmin):
    list_display = ('name', 'warehouse_id', 'status', 'latitude', 'longitude', 'postal_code')
    list_filter = ('status', 'warehouse_id')
    search_fields = ('name', 'postal_code')
    ordering = ('name',)
    list_per_page = 20


@admin.register(Stash)
class StashAdmin(admin.ModelAdmin):
    list_display = ('id', 'postmat', 'size', 'is_empty', 'reserved_until')
    list_filter = ('size', 'is_empty')
    search_fields = ('postmat__name',)
    ordering = ('postmat', 'size')
    list_per_page = 20
