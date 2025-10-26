# proj/settings_test.py
from .settings import *

DEBUG = True
ALLOWED_HOSTS = ["*"]

# Use a separate test database
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("POSTGRES_DB", "proj"),
        "USER": os.environ.get("POSTGRES_USER", "proj"),
        "PASSWORD": os.environ.get("POSTGRES_PASSWORD", "projpassword"),
        "HOST": os.environ.get("POSTGRES_HOST", "db"),
        "PORT": os.environ.get("POSTGRES_PORT", "5432"),
    }
}

# Optional: faster password hasher for tests
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

# Email backend to prevent sending real emails
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
EMAIL_SEND_ASYNC = False  # <- Lets say, that we use synchronic email test.

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {
            "min_length": 8,
        },
    },
]