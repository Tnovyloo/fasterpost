from django.contrib import admin, messages
from rest_framework.routers import DefaultRouter
from .views.views_admin import (
    PostmatAdminViewSet,
    StashAdminViewSet,
)

from .views.views_routing import LocalRouteViewSet

from django.urls import path, include

from .models import Postmat, Stash

from django.contrib import admin
from .models import Postmat, Stash


@admin.register(Postmat)
class PostmatAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "warehouse_id",
        "status",
        "latitude",
        "longitude",
        "postal_code",
    )
    list_filter = ("status", "warehouse_id")
    search_fields = ("name", "postal_code")
    ordering = ("name",)
    list_per_page = 20


@admin.register(Stash)
class StashAdmin(admin.ModelAdmin):
    list_display = ("id", "postmat", "size", "is_empty", "reserved_until", "package")
    list_filter = ("size", "is_empty")
    search_fields = ("postmat__name",)
    ordering = ("postmat", "size")
    list_per_page = 20

    @admin.action(description="Remove reservations")
    def action_remove_reservation(self, request, queryset):
        updated = queryset.update(reserved_until=None)
        self.message_user(request, f"Removed {updated} reservations.", messages.SUCCESS)

    @admin.action(description="Empty stashes")
    def action_empty_stashes(self, request, queryset):
        updated = queryset.update(is_empty=True)
        self.message_user(request, f"Changed {updated} stashes.", messages.SUCCESS)

    actions = (
        "action_remove_reservation",
        "action_empty_stashes",
    )


router = DefaultRouter()
router.register(r"postmats", PostmatAdminViewSet, basename="admin-postmats")
router.register(r"stashes", StashAdminViewSet, basename="admin-stashes")
router.register(r"local-routes", LocalRouteViewSet, basename="admin-local-routes")

urlpatterns = [
    path("", include(router.urls)),
]
