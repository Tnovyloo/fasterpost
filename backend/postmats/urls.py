from django.urls import path

from .views.views_user import PostmatInfoView

urlpatterns = [
    path("info", PostmatInfoView.as_view())
]