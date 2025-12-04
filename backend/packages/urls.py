from django.urls import path
from packages.views.views_packages import (
    UserPackagesView,
    ParcelDetailView,
    SendPackageView,
    PricingCalculatorView,
    PaymentStatusView,
    UserPaymentsView,
    StripeWebhookView,
)

urlpatterns = [
    path("user/", UserPackagesView.as_view()),
    path("user/<uuid:id>", ParcelDetailView.as_view()),
    path("send-package/", SendPackageView.as_view(), name="send-package"),
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
]
