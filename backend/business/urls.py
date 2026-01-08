from django.urls import path

from business.views import (
    BusinessRequestView,
    BusinessRequestAdminListView,
    BusinessRequestAdminActionView,
    BusinessDashboardStatsView,
    MagazineView,
    BusinessPackageView,
)

urlpatterns = [
    # # Business User Requests
    path("request/", BusinessRequestView.as_view(), name="business-request"),
    path(
        "admin/requests",
        BusinessRequestAdminListView.as_view(),
        name="business-request-list",
    ),
    path(
        "admin/requests/<int:pk>/action",
        BusinessRequestAdminActionView.as_view(),
        name="business-request-action",
    ),
    # Business Panel
    path(
        "dashboard/stats",
        BusinessDashboardStatsView.as_view(),
        name="business-dashboard-stats",
    ),
    path("magazines", MagazineView.as_view(), name="business-magazines"),
    path("packages", BusinessPackageView.as_view(), name="business-packages"),
]
