from django.urls import path

from .views.views_user import PostmatView

urlpatterns = [
    path("", PostmatView.as_view())
]