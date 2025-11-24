from django.urls import path
from rest_framework.routers import DefaultRouter

from .views.views_user import (
    PostmatView,
    PostmatDetailedView,
    StashView,
    StashDetailedView,
)

urlpatterns = [
    path("", PostmatView.as_view()),
    path("<uuid:id>/", PostmatDetailedView.as_view()),
    path("stash/", StashView.as_view()),
    path("stash/<uuid:id>/", StashDetailedView.as_view()),
]
