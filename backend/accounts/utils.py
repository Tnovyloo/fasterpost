from typing import Optional
from accounts.serializers import *
from rest_framework import status
from django.core.mail import send_mail
from django.conf import settings
from .token import create_password_token, create_token
from django.template.loader import render_to_string
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes


def send_password_reset_email(user: AbstractBaseUser) -> bool:
    """Method for sending verification e-mail with token.
    Gets:
    user: AbstractBaseUser model

    Returns:
    True - If e-mail sending was properly done
    False - If e-mail sending e-mail will encounter any problem

    """
    # Sending Verification email.
    if user is None:
        return False
    try:
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        created_token = create_password_token(user=user)

        email_context = {
            "uid": uid,
            "token": created_token,
            "email": user.email,
            "domain": settings.DOMAIN_PASSWORD_RESET,
        }

        message = render_to_string(
            "accounts/password_reset_email.html", context=email_context
        )

        print("Sending password reset email with data:", email_context)

        subject = "Resetowanie Hasła"
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.EMAIL_HOST,
            recipient_list=[user.email],
        )

        reset_password_obj, created = ResetPasswordToken.objects.get_or_create(
            user=user
        )
        reset_password_obj.token = created_token
        reset_password_obj.save()

        return True

    except Exception as e:
        print("Send password reset email error:", e)
        return False


def send_verification_email(user: AbstractBaseUser):
    """Method for sending verification e-mail with token.
    Gets:
    user: AbstractBaseUser model

    Returns:
    True - If e-mail sending was properly done
    False - If e-mail sending e-mail will encounter any problem

    """
    # Sending Verification email.
    if user is None:
        return False
    try:
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        created_token = create_token(user=user)

        email_context = {
            "uid": uid,
            "token": created_token,
            "email": user.email,
            "domain": settings.DOMAIN_EMAIL_AUTHORIZATION,
        }

        message = render_to_string(
            "accounts/account_activate_email.html", context=email_context
        )

        print("Sending email with data:", email_context)

        subject = "Weryfikacja e-maila"
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.EMAIL_HOST,
            recipient_list=[user.email],
        )

        # Saving Token in EmailVerification object.
        email_verification_obj = EmailVerification.objects.get(user=user)
        email_verification_obj.token = created_token
        email_verification_obj.email_verification_sended = True
        email_verification_obj.save()
        return True

    except Exception as e:
        print("Send password email error:", e)
        return False
