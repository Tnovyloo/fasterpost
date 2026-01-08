# business/admin.py
from django.contrib import admin
from .models import BusinessUserRequest


@admin.register(BusinessUserRequest)
class BusinessUserRequestAdmin(admin.ModelAdmin):
    list_display = ("company_name", "tax_id", "status", "created_at")
    list_filter = ("status",)  # This will now use the Enum labels
    search_fields = ("company_name", "tax_id")
    readonly_fields = ("created_at", "address")
    fields = ("user", "company_name", "tax_id", "address", "status", "created_at")
