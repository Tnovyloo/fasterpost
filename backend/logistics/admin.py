from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .models import Warehouse
from .views.views import WarehouseSimpleView

@admin.register(Warehouse)
class WarehouseAdmin(admin.ModelAdmin):
    list_display = ('id', 'city', 'status')

router = DefaultRouter()

urlpatterns = [
    path("warehouses/simple", WarehouseSimpleView.as_view())
]