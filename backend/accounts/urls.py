from django.urls import include, path
from rest_framework.urlpatterns import format_suffix_patterns
from .views.views_user_auth import *
from .views.views_token import *
from .views.views_info import *

from .views import views_courier
from .views import views_totp
from .views import views_user

from rest_framework.routers import DefaultRouter
from accounts.views.views_custom_admin import AdminUserViewSet


router = DefaultRouter()
router.register(r"users", AdminUserViewSet, basename="admin-users")

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
    # URLs for TOTP
    path("user/totp/enable", views_totp.EnableTOTPView.as_view(), name="totp-enable"),
    path("user/totp/verify", views_totp.VerifyTOTPView.as_view(), name="totp-verify"),
    path(
        "user/totp/disable", views_totp.DisableTOTPView.as_view(), name="totp-disable"
    ),
    path("user/totp/status", views_totp.StatusTOTPView.as_view(), name="totp-status"),
    # URLs for TokenHealthView
    path("user/token-health/", TokenHealthView.as_view(), name="token-health"),
    # URLs for testing permissions.
    path("courier", views_courier.CourierDashboardView.as_view()),
    path("bussiness", views_courier.BusinessDashboardView.as_view()),
    path("base", views_courier.NormalUserDashboardView.as_view()),
    path("user/", views_user.UserProfileView.as_view(), name="user-profile"),
    path("user/info/", views_courier.UserInfoView.as_view(), name="user-info"),
    path("user/me/", CurrentUserRetrieveUpdateView.as_view(), name="current-user")
]
