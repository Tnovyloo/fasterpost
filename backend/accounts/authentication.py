from rest_framework.authentication import TokenAuthentication
from rest_framework.exceptions import AuthenticationFailed

from .models import ExpiringToken


class CustomTokenAuthentication(TokenAuthentication):
    """
    Custom authentication class that supports both Bearer token in the header
    and token in the cookies.
    """

    model = ExpiringToken

    def authenticate(self, request):
        # Try to get the token from the Authorization header
        auth_header = request.META.get("HTTP_AUTHORIZATION")
        print(auth_header)
        if auth_header:
            # Extract the token from the header (e.g., "Bearer <token>")
            parts = auth_header.split()
            if len(parts) == 2 and parts[0].lower() == "bearer":
                token = parts[1]
                return self.authenticate_credentials(token)

        # If no token in the header, try to get the token from the cookie
        token = request.COOKIES.get(
            "auth_token"
        )  # Replace 'auth_token' with your cookie name
        print(request.COOKIES)
        if token:
            return self.authenticate_credentials(token)

        # If no token is found, return None (authentication fails)
        return None

    def authenticate_credentials(self, key):
        """
        Override default authentication to check token expiration.
        """
        # Fetch the token using the model (ExpiringToken)
        token = self.get_model().objects.filter(key=key).first()

        if not token:
            raise AuthenticationFailed("Invalid token.")

        # Check if token has expired
        if hasattr(token, "has_expired") and token.has_expired():
            token.delete()  # Remove expired token
            raise AuthenticationFailed("Token has expired.")

        # Check if the user is active (mimicking parent behavior)
        if not token.user.is_active:
            raise AuthenticationFailed("User inactive or deleted.")

        # Return the user and token tuple directly
        return (token.user, token)
