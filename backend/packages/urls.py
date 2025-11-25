from django.urls import path
from .views.views_packages import UserPackagesView, ParcelDetailView, SendPackageView

urlpatterns = [
    path("user/", UserPackagesView.as_view()),
    path("user/<uuid:id>", ParcelDetailView.as_view()),
    path("send-package/", SendPackageView.as_view()),
]
