from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .models import Warehouse
from .views.views import WarehouseSimpleView
from .views.views_admin import WarehouseAdminViewSet

@admin.register(Warehouse)
class WarehouseAdmin(admin.ModelAdmin):
    list_display = ('id', 'city', 'status')

router = DefaultRouter()

router.register(r'warehouses', WarehouseAdminViewSet, basename='admin-warehouse')

urlpatterns = [
    path("warehouses/simple", WarehouseSimpleView.as_view()),
    path("", include(router.urls)),
]