from django.urls import path
from rest_framework.urlpatterns import format_suffix_patterns
from .views.views_user import *

from .views import views_courier

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
    # URLs for testing permissions.
    path("courier", views_courier.CourierDashboardView.as_view()),
    path("bussiness", views_courier.BusinessDashboardView.as_view()),
    path("base", views_courier.NormalUserDashboardView.as_view()),
    path("user/info/", views_courier.UserInfoView.as_view(), name="user-info"),
]
