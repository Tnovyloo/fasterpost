from django.contrib import admin
from payments.models import Payment, PricingRule, WebhookEvent


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "package",
        "user",
        "amount",
        "status",
        "created_at",
        "paid_at",
    ]
    list_filter = ["status", "created_at", "paid_at"]
    search_fields = ["id", "stripe_payment_intent_id", "user__username", "package__id"]
    readonly_fields = [
        "id",
        "stripe_payment_intent_id",
        "stripe_client_secret",
        "created_at",
        "updated_at",
        "paid_at",
    ]

    fieldsets = (
        ("Payment Info", {"fields": ("id", "package", "user", "status")}),
        (
            "Stripe Details",
            {
                "fields": (
                    "stripe_payment_intent_id",
                    "stripe_client_secret",
                    "payment_method",
                )
            },
        ),
        (
            "Pricing Breakdown",
            {
                "fields": (
                    "amount",
                    "currency",
                    "base_price",
                    "size_surcharge",
                    "weight_surcharge",
                )
            },
        ),
        ("Timestamps", {"fields": ("created_at", "updated_at", "paid_at")}),
        ("Additional Info", {"fields": ("failure_reason",), "classes": ("collapse",)}),
    )


@admin.register(PricingRule)
class PricingRuleAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "base_price",
        "small_price",
        "medium_price",
        "large_price",
        "price_per_kg",
        "is_active",
        "created_at",
    ]
    list_filter = ["is_active", "created_at"]

    fieldsets = (
        ("Base Pricing", {"fields": ("base_price", "is_active")}),
        (
            "Size-Based Pricing",
            {"fields": ("small_price", "medium_price", "large_price")},
        ),
        ("Weight-Based Pricing", {"fields": ("weight_threshold_kg", "price_per_kg")}),
    )

    def save_model(self, request, obj, form, change):
        # When activating a new pricing rule, deactivate all others
        if obj.is_active:
            PricingRule.objects.exclude(pk=obj.pk).update(is_active=False)
        super().save_model(request, obj, form, change)


@admin.register(WebhookEvent)
class WebhookEventAdmin(admin.ModelAdmin):
    list_display = ["id", "event_type", "stripe_event_id", "processed", "created_at"]
    list_filter = ["event_type", "processed", "created_at"]
    search_fields = ["stripe_event_id", "event_type"]
    readonly_fields = ["id", "stripe_event_id", "event_type", "payload", "created_at"]

    def has_add_permission(self, request):
        return False  # Webhooks are created automatically
