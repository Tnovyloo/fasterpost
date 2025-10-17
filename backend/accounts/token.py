from django.contrib.auth.models import AbstractBaseUser
import hashlib
import time
from random import randint


def create_token(user: AbstractBaseUser) -> str:
    """
    Generate a token using the user's email and current time.

    Args:
    - user: An instance of a user which is based on AbstractBaseUser

    Returns:
    - A unique token as a string
    """
    token_input = f"{user.email}{str(time.time())}"
    return hashlib.sha256(token_input.encode("utf-8")).hexdigest()


def create_password_token(user: AbstractBaseUser) -> str:
    """
    Generate an password token using the user's email and current time with randint.

    Args:
    - user: An instance of a user which is based on AbstractBaseUser

    Returns:
    - A unique token as a string
    """
    token_input = f"{user.email}{str(time.time())}{randint(1, 5000)}"
    return hashlib.sha256(token_input.encode("utf-8")).hexdigest()
