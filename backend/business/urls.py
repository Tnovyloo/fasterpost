from django.urls import path

from business.views import (
    BusinessRequestView,
    BusinessRequestAdminListView,
    BusinessRequestAdminActionView,
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
]
