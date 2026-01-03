from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views.views_user import (
    PostmatView,
    PostmatDetailedView,
    StashView,
    StashDetailedView,
)

from .views.views_public import PublicPostmatViewSet

router = DefaultRouter()

router.register(r'points', PublicPostmatViewSet, basename='public-postmats')

urlpatterns = [
    path("", PostmatView.as_view()),
    path("<uuid:id>/", PostmatDetailedView.as_view()),
    path("stash/", StashView.as_view()),
    path("stash/<uuid:id>/", StashDetailedView.as_view()),
    path("public/", include(router.urls)),
]
