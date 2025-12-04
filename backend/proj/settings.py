import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = os.environ.get("SECRET_KEY", "changeme")
DEBUG = os.environ.get("DEBUG", "0") == "1" or os.environ.get("DEBUG") == "1"

ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "django_celery_beat",
    "corsheaders",
    # "rest_framework.authtoken",  # For Token authorization.
    "accounts",
    "postmats",
    "logistics",
    "packages",
    "payments",
    "drf_spectacular",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
ROOT_URLCONF = "proj.urls"

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",  # or your Next.js dev server
    "http://localhost",  # if your app runs on this
]

CORS_ALLOW_CREDENTIALS = True


TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": ["templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "proj.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("POSTGRES_DB", "proj"),  # should match .env
        "USER": os.environ.get("POSTGRES_USER", "proj"),
        "PASSWORD": os.environ.get("POSTGRES_PASSWORD", "projpassword"),
        "HOST": os.environ.get("POSTGRES_HOST", "db"),
        "PORT": os.environ.get("POSTGRES_PORT", "5432"),
    }
}


AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"
    },
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
# Celery
CELERY_BROKER_URL = os.environ.get("REDIS_URL", "redis://redis:6379/0")

REST_FRAMEWORK = {
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 100,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "accounts.authentication.CustomTokenAuthentication",
        # 'rest_framework.authentication.TokenAuthentication',
    ],
    # "DEFAULT_PERMISSION_CLASSES": [
    #     "rest_framework.permissions.AllowAny"  # For development only
    # ],
    # "DEFAULT_THROTTLE_CLASSES": [
    #     "rest_framework.throttling.AnonRateThrottle",  # for unauthenticated users
    #     "rest_framework.throttling.UserRateThrottle",  # for authenticated users
    # ],
    # "DEFAULT_THROTTLE_RATES": {
    #     "anon": "10/minute",  # 10 requests per minute for anonymous users
    #     "user": "10000/day",  # 1000 requests per day for authenticated users
    # },
}

# AUTH_USER_MODEL = 'accounts.Account'
AUTH_TOKEN_MODEL = "accounts.ExpiringToken"
AUTH_USER_MODEL = "accounts.User"
AUTHENTICATION_BACKENDS = ["accounts.backends.ExtendedUserModelBackend"]
TOKEN_EXPIRY_DAYS = 2

# EMAIL AUTHORIZATION DOMAIN PATH
DOMAIN_EMAIL_AUTHORIZATION = os.environ.get(
    "DOMAIN_EMAIL_AUTHORIZATION", "http://localhost:8000/accounts/user/verify/"
)
DOMAIN_PASSWORD_RESET = os.environ.get(
    "DOMAIN_PASSWORD_RESET",
    "http://localhost:8000/accounts/user/password-reset-verify/",
)

# SET GMAIL SMTP
EMAIL_BACKEND = "django.core.mail.backends.filebased.EmailBackend"
EMAIL_FILE_PATH = BASE_DIR / "sent_emails"

# EMAIL_BACKEND = os.environ.get("EMAIL_BACKEND") # Use it if you want to use Gmail or other SMTP.
EMAIL_HOST = os.environ.get("EMAIL_HOST")
EMAIL_USE_TLS = os.environ.get("EMAIL_USE_TLS")
EMAIL_PORT = os.environ.get("EMAIL_PORT")
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD")
EMAIL_SEND_ASYNC = os.environ.get("EMAIL_SEND_ASYNC", "False").lower() in (
    "true",
    "1",
    "yes",
)  # <--- This ENV variable decides on ASYNC sending from Celery.

# STRIPE Setup
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "sk_test_your_key_here")
STRIPE_PUBLISHABLE_KEY = os.environ.get("STRIPE_PUBLIC_KEY", "pk_test_your_key_here")
STRIPE_WEBHOOK_SECRET = os.environ.get(
    "STRIPE_WEBHOOK_SECRET", "whsec_your_webhook_secret"
)

########################################
# This is printing .env variables and project dependencies
# ANSI color codes
RESET = "\033[0m"
YELLOW = "\033[93m"
GREEN = "\033[92m"
MAGENTA = "\033[95m"
BRIGHT_MAGENTA = "\033[95m"
CYAN = "\033[96m"

# ASCII Logo
ascii_logo = f"""{CYAN}
 ____ ____ ____ ____ ____ ____ 
||f |||a |||s |||t |||e |||r ||
||__|||__|||__|||__|||__|||__||
|/__\|/__\|/__\|/__\|/__\|/__\|
{RESET}"""


def censor_value(name, value):
    if not value:
        return "[Not Set]"
    if "password" in name.lower() or "secret" in name.lower():
        return value[0] + "***" + value[-1] if len(value) > 2 else "***"
    return value


def print_env_var(name):
    value = os.environ.get(name)
    print(f"{YELLOW}{name}:{RESET} {GREEN}{censor_value(name, value)}{RESET}")


def print_settings_var(name, variable):
    if "secret" in name.lower():
        masked = str(variable)
        print(f"{YELLOW}{name} ={RESET} {GREEN}{masked[0] + '***' + masked[-1]}{RESET}")
    else:
        print(f"{YELLOW}{name} ={RESET} {GREEN}{variable}{RESET}")


LOGS_OFF = os.environ.get("LOGS_OFF", "0").strip() == "1"

if not LOGS_OFF:
    print(ascii_logo)
    print(f"{MAGENTA}== Environment Variables =={RESET}")
    print(f"{BRIGHT_MAGENTA}using: {__file__} {RESET}")

    print(f"\n{CYAN}Django{RESET}")
    print_settings_var("DEBUG", DEBUG)
    print_settings_var("SECRET_KEY", SECRET_KEY)

    print(f"\n{CYAN}User model configuration{RESET}")
    print_settings_var("AUTH_USER_MODEL", AUTH_USER_MODEL)
    print_settings_var("AUTHENTICATION_BACKENDS", AUTHENTICATION_BACKENDS)
    print_settings_var("TOKEN_EXPIRY_DAYS", TOKEN_EXPIRY_DAYS)
    print_settings_var("AUTH_TOKEN_MODEL", AUTH_TOKEN_MODEL)

    print(f"\n{CYAN}SMTP configuration{RESET}")
    print_env_var("EMAIL_BACKEND")
    print_env_var("EMAIL_HOST")
    print_env_var("EMAIL_USE_TLS")
    print_env_var("EMAIL_PORT")
    print_env_var("EMAIL_HOST_USER")
    print_env_var("EMAIL_HOST_PASSWORD")
    print_env_var("EMAIL_SEND_ASYNC")

    print(f"\n{CYAN}E-mail verification domains{RESET}")
    print_env_var("DOMAIN_EMAIL_AUTHORIZATION")
    print_env_var("DOMAIN_PASSWORD_RESET")

    print(f"\n{CYAN}DB Setup{RESET}")
    print_env_var("POSTGRES_DB")
    print_env_var("POSTGRES_USER")
    print_env_var("POSTGRES_PASSWORD")
    print_env_var("POSTGRES_HOST")
    print_env_var("POSTGRES_PORT")

    print(f"\n{CYAN}Stripe Setup{RESET}")
    print_settings_var("STRIPE_SECRET_KEY", STRIPE_SECRET_KEY)
    print_settings_var("STRIPE_PUBLIC_KEY", STRIPE_PUBLISHABLE_KEY)
    print_settings_var("STRIPE_WEBHOOK_SECRET", STRIPE_WEBHOOK_SECRET)
