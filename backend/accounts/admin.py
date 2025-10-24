from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.utils import timezone
from django.urls import reverse
from django.http import HttpResponseRedirect

from accounts.models import (
    User,
    EmailVerification,
    ResetPasswordToken,
    ExpiringToken,
)
from accounts.forms.forms_admin import UserCreationForm, UserChangeForm
from accounts.utils import (
    send_verification_email,
    send_password_reset_email,
)


# Inline for EmailVerification
class EmailVerificationInline(admin.StackedInline):
    model = EmailVerification
    readonly_fields = ("verified", "email_verification_sended", "token", "created_at")
    can_delete = False
    max_num = 1
    extra = 0


# Inline for ResetPasswordToken
class ResetPasswordTokenInline(admin.StackedInline):
    model = ResetPasswordToken
    readonly_fields = ("token", "created_at")
    can_delete = True
    max_num = 1
    extra = 0


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    form = UserChangeForm
    add_form = UserCreationForm

    list_display = (
        "id",
        "email",
        "username",
        "full_name_display",
        "role",
        "is_active",
        "is_staff",
        "is_superuser",
        "email_verified",
        "last_login",
        "date_joined",
    )
    list_filter = ("role", "is_active", "is_staff", "is_superuser", "date_joined")
    search_fields = ("email", "username", "first_name", "last_name", "phone_number")
    ordering = ("-date_joined",)
    readonly_fields = ("date_joined",)
    inlines = [EmailVerificationInline, ResetPasswordTokenInline]
    filter_horizontal = ()
    prepopulated_fields = {"username": ("email",)}

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (
            "Personal info",
            {"fields": ("first_name", "last_name", "username", "phone_number")},
        ),
        (
            "Role & status",
            {"fields": ("role", "is_active", "is_staff", "is_admin", "is_superuser")},
        ),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "username",
                    "first_name",
                    "last_name",
                    "role",
                    "password1",
                    "password2",
                ),
            },
        ),
    )

    actions = (
        "action_make_active",
        "action_make_inactive",
        "action_send_verification",
        "action_resend_password_reset",
        "action_set_role_courier",
        "action_set_role_business",
        "action_set_role_normal",
        "action_set_role_warehouse",
    )

    def full_name_display(self, obj):
        return obj.full_name()

    full_name_display.short_description = "Full name"

    def email_verified(self, obj):
        try:
            return EmailVerification.objects.get(user=obj).verified
        except EmailVerification.DoesNotExist:
            return False

    email_verified.boolean = True
    email_verified.short_description = "Email verified"

    # ----- Admin actions -----
    def _perform_email_action(self, request, queryset, email_func, action_name: str):
        """
        Generic helper to perform any email function on selected users.
        """
        successes, failures = 0, 0
        for user in queryset:
            try:
                # For verification, ensure EmailVerification exists
                if email_func == send_verification_email:
                    EmailVerification.objects.get_or_create(user=user)

                ok = email_func(user)
                if ok:
                    successes += 1
                else:
                    failures += 1
            except Exception as e:
                failures += 1
                print(f"{action_name} error for {user.email}: {e}")

        self.message_user(
            request,
            f"{action_name}: successes={successes}, failures={failures}",
            messages.INFO,
        )

    @admin.action(description="Mark selected users as active")
    def action_make_active(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(
            request, f"Marked {updated} users as active.", messages.SUCCESS
        )

    @admin.action(description="Mark selected users as inactive")
    def action_make_inactive(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(
            request, f"Marked {updated} users as inactive.", messages.SUCCESS
        )

    @admin.action(description="Send verification email to selected users")
    def action_send_verification(self, request, queryset):
        self._perform_email_action(
            request, queryset, send_verification_email, "Verification email"
        )

    @admin.action(description="Send password reset email to selected users")
    def action_resend_password_reset(self, request, queryset):
        self._perform_email_action(
            request, queryset, send_password_reset_email, "Password reset email"
        )

    @admin.action(description="Set role to Courier")
    def action_set_role_courier(self, request, queryset):
        updated = queryset.update(role=User.Roles.COURIER)
        self.message_user(
            request, f"Set Courier role on {updated} users.", messages.SUCCESS
        )

    @admin.action(description="Set role to Business")
    def action_set_role_business(self, request, queryset):
        updated = queryset.update(role=User.Roles.BUSINESS)
        self.message_user(
            request, f"Set Business role on {updated} users.", messages.SUCCESS
        )

    @admin.action(description="Set role to Normal")
    def action_set_role_normal(self, request, queryset):
        updated = queryset.update(role=User.Roles.NORMAL)
        self.message_user(
            request, f"Set Normal role on {updated} users.", messages.SUCCESS
        )

    @admin.action(description="Set role to Warehouse Courier")
    def action_set_role_warehouse(self, request, queryset):
        updated = queryset.update(role=User.Roles.WAREHOUSE_COURIER)
        self.message_user(
            request, f"Set Warehouse Courier role on {updated} users.", messages.SUCCESS
        )


@admin.register(EmailVerification)
class EmailVerificationAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "verified",
        "email_verification_sended",
        "short_token",
        "created_at",
    )
    search_fields = ("user__email", "token")
    readonly_fields = (
        "user",
        "verified",
        "email_verification_sended",
        "token",
        "created_at",
    )
    list_filter = ("verified", "email_verification_sended", "created_at")

    def short_token(self, obj):
        if not obj.token:
            return "-"
        display = obj.token if len(obj.token) < 40 else f"{obj.token[:30]}..."
        return display

    short_token.short_description = "Token (truncated)"


@admin.register(ResetPasswordToken)
class ResetPasswordTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "short_token", "created_at")
    search_fields = ("user__email", "token")
    readonly_fields = ("user", "token", "created_at")

    def short_token(self, obj):
        if not obj.token:
            return "-"
        return obj.token if len(obj.token) < 40 else f"{obj.token[:30]}..."

    short_token.short_description = "Token (truncated)"


@admin.register(ExpiringToken)
class ExpiringTokenAdmin(admin.ModelAdmin):
    list_display = ("key", "user", "expires_at", "has_expired_display")
    search_fields = ("user__email", "key")
    readonly_fields = ("key", "user", "expires_at")

    def has_expired_display(self, obj):
        return obj.has_expired()

    has_expired_display.boolean = True
    has_expired_display.short_description = "Expired?"
