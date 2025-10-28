from django.urls import path

from .views.views_user import PostmatView, PostmatDetailedView

urlpatterns = [
    path("", PostmatView.as_view()),
    path("<str:id>/", PostmatDetailedView.as_view()),
]