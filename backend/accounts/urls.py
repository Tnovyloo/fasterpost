from django.urls import path
from rest_framework.urlpatterns import format_suffix_patterns
from .views.email_views import *

urlpatterns = [
    # URLs for Login and Register
    path("login", LoginView.as_view(), name="login"),
    path("register", RegisterView.as_view(), name="register"),
    path("logout", LogoutView.as_view(), name="logout"),
    # URLs for e-mail verification
    path(
        "resend-verification-email",
        ResendRegisterView.as_view(),
        name="resend-verification-email",
    ),
    path("verify/<str:uid>/<str:token>", VerifyView.as_view(), name="verify"),
    # URLs for password reset
    path("password-reset", PasswordResetView.as_view(), name="password-reset"),
    path(
        "password-reset-verify/<str:uid>/<str:token>",
        PasswordResetConfirmView.as_view(),
        name="confirm-password-reset",
    ),
]
