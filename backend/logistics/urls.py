from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views.views_routing import RouteAdminViewSet

from .views import views_warehouse_courier

router = DefaultRouter()
router.register(r'routes', views_warehouse_courier.CourierRouteViewSet, basename='courier-routes')

urlpatterns = [
    path('', include(router.urls)),
]