from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views.views_routing import RouteAdminViewSet, CourierRouteViewSet

router = DefaultRouter()
router.register(r'courier/routes', CourierRouteViewSet, basename='courier-routes')

urlpatterns = [
    path('api/', include(router.urls)),
]