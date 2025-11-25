import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "proj.settings")
app = Celery("proj")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()


app.conf.beat_schedule = {
    "cleanup-expired-reservations-every-5-minutes": {
        "task": "cleanup_expired_stash_reservations",
        "schedule": crontab(minute="*/1"),  # Run every 1 minute
    },
}
