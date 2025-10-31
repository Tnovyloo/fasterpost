from django.urls import path

from .views.views_user import (
    PostmatView, 
    PostmatDetailedView,
    StashView,
    StashDetailedView,
)

urlpatterns = [
    path("postmat/", PostmatView.as_view()),
    path("postmat/<uuid:id>/", PostmatDetailedView.as_view()),
    path("stash/", StashView.as_view()),
    path("stash/<uuid:id>/", StashDetailedView.as_view()),
]