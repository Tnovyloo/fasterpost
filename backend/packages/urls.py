from django.urls import path
from packages.views.views_packages import (
    UserPackagesView,
    SendPackageView,
    PricingCalculatorView,
    PaymentStatusView,
    UserIncomingPackagesView,
    UserPaymentsView,
    StripeWebhookView,
    RetryPaymentView,
    OpenStashView,
    PackageDetailView,
    CollectPackageView,
)
from packages.views import views_public

urlpatterns = [
    path("user/", UserPackagesView.as_view()),
    path(
        "user/incoming/",
        UserIncomingPackagesView.as_view(),
        name="user-incoming-packages",
    ),
    path("send-package/", SendPackageView.as_view(), name="send-package"),
    path(
        "send-package/<uuid:package_id>", SendPackageView.as_view(), name="edit-package"
    ),
    path(
        "send-package/<uuid:package_id>/",
        SendPackageView.as_view(),
        name="delete-package",
    ),
    path("open-stash/<uuid:package_id>/", OpenStashView.as_view(), name="open-stash"),
    path(
        "collect/<uuid:package_id>/",
        CollectPackageView.as_view(),
        name="collect-package",
    ),
    path(
        "details/<uuid:package_id>/", PackageDetailView.as_view(), name="package-detail"
    ),
    # # Pricing calculator
    path(
        "payments/calculate-price/",
        PricingCalculatorView.as_view(),
        name="calculate-price",
    ),
    # # Payment status
    path(
        "payments/status/<uuid:package_id>/",
        PaymentStatusView.as_view(),
        name="payment-status",
    ),
    # # User's payment history
    path("payments/my-payments/", UserPaymentsView.as_view(), name="my-payments"),
    # # Stripe webhook
    path("payments/webhook/", StripeWebhookView.as_view(), name="stripe-webhook"),
    # Retry payment for failed/pending packages
    path(
        "payments/retry/<uuid:package_id>/",
        RetryPaymentView.as_view(),
        name="retry-payment",
    ),
    path(
        "public/track/<str:query>/",
        views_public.PublicTrackingView.as_view(),
        name="public-track",
    ),
    path(
        "public/pickup/",
        views_public.AnonymousPickupView.as_view(),
        name="public-pickup",
    ),
]
