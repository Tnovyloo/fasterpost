from django.urls import path
from rest_framework.urlpatterns import format_suffix_patterns
from .views.views_user import *

urlpatterns = [
    # URLs for Login and Register
    path("user/login", LoginView.as_view(), name="user-login"),
    path("user/register", RegisterView.as_view(), name="user-register"),
    path("user/logout", LogoutView.as_view(), name="user-logout"),
    # URLs for e-mail verification
    path(
        "user/resend-verification-email",
        ResendRegisterView.as_view(),
        name="user-resend-verification-email",
    ),
    path("user/verify/<str:uid>/<str:token>", VerifyView.as_view(), name="user-verify"),
    # URLs for password reset
    path(
        "user/password-reset", PasswordResetView.as_view(), name="user-password-reset"
    ),
    path(
        "user/password-reset-verify/<str:uid>/<str:token>",
        PasswordResetConfirmView.as_view(),
        name="user-confirm-password-reset",
    ),
]
