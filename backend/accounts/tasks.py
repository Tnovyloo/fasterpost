from celery import shared_task
from accounts.models import User
from accounts.utils import send_password_reset_email, send_verification_email


@shared_task
def send_password_reset_email_task(user_id):
    print("Hello from Celery")
    user = User.objects.get(id=user_id)
    return send_password_reset_email(user)


@shared_task
def send_verification_email_task(user_id):
    user = User.objects.get(id=user_id)
    return send_verification_email(user)
