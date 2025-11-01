from django.urls import path
from .views import UserParcelsView, ParcelDetailView

urlpatterns = [
    path("user/", UserParcelsView.as_view()),
    path("user/<uuid:id>", ParcelDetailView.as_view()),
]