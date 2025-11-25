from django.contrib import admin
from django.urls import include, path
from .models import Package, Actualization


@admin.register(Package)
class PackageAdmin(admin.ModelAdmin):
    list_display = ("id", "sender", "receiver_name")
    search_fields = ("sender__username", "receiver__username", "id")


@admin.register(Actualization)
class ActualizationAdmin(admin.ModelAdmin):
    list_display = ("id", "package_id", "status")
    search_fields = ("package__id", "status")


from rest_framework.routers import DefaultRouter
from packages.views.views_custom_admin import PackageAdminViewSet

router = DefaultRouter()
router.register(r"", PackageAdminViewSet, basename="admin-users")

urlpatterns = [
    path("/", include(router.urls)),
]
