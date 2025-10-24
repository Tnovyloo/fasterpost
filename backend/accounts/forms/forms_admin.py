from django import forms
from django.contrib.auth.forms import ReadOnlyPasswordHashField
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from accounts.models import User


class UserCreationForm(forms.ModelForm):
    """
    A form for creating new users. Includes repeated password validation.
    """

    password1 = forms.CharField(
        label=_("Password"), widget=forms.PasswordInput, required=False
    )
    password2 = forms.CharField(
        label=_("Password confirmation"), widget=forms.PasswordInput, required=False
    )

    class Meta:
        model = User
        fields = (
            "email",
            "username",
            "first_name",
            "last_name",
            "role",
            "phone_number",
        )

    def clean_password2(self):
        p1 = self.cleaned_data.get("password1")
        p2 = self.cleaned_data.get("password2")
        # allow empty password for oauth users, but if one is provided they must match
        if p1 or p2:
            if p1 != p2:
                raise ValidationError(_("Passwords don't match"))
        return p2

    def save(self, commit=True):
        user = super().save(commit=False)

        if not user.username:
            user.username = self.cleaned_data.get("email").lower()

        password = self.cleaned_data.get("password1")
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        if commit:
            user.save()
        return user


class UserChangeForm(forms.ModelForm):
    """
    A form for updating users in admin. Shows password hash as read-only.
    """

    password = ReadOnlyPasswordHashField(
        label=_("Password"),
        help_text=_(
            "Raw passwords are not stored, so there is no way to see "
            "the user's password, but you can change the password "
            'using <a href="../password/">this form</a>.'
        ),
    )

    class Meta:
        model = User
        fields = (
            "email",
            "username",
            "first_name",
            "last_name",
            "role",
            "phone_number",
            "is_active",
            "is_staff",
            "is_admin",
            "is_superuser",
        )

    def clean_password(self):
        # Regardless of what the user provides, return the initial value.
        return self.initial.get("password")
