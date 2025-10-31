from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from accounts.models import ExpiringToken as Token
from drf_spectacular.utils import (
    extend_schema_view,
    extend_schema,
    OpenApiResponse,
    OpenApiExample,
)


@extend_schema_view(
    get=extend_schema(
        summary="Check Authentication Token Health",
        description="""
        Validates the `auth_token` HttpOnly cookie.
        
        - Returns `valid: true` if token exists, is valid, and not expired.
        - Returns `valid: false` with a `reason` if:
          - Cookie is missing (`no_cookie`)
          - Token doesn't exist (`invalid`)
          - Token is expired (`expired`)
        
        Automatically deletes invalid/expired tokens and clears the cookie.
        """,
        tags=["Authentication"],
        responses={
            200: OpenApiResponse(
                response=dict,
                description="Token health status",
                examples=[
                    OpenApiExample(
                        name="Valid Token",
                        value={"valid": True, "reason": "ok"},
                        summary="Token is valid and active",
                    ),
                    OpenApiExample(
                        name="No Cookie",
                        value={"valid": False, "reason": "no_cookie"},
                        summary="No auth_token cookie present",
                    ),
                    OpenApiExample(
                        name="Invalid Token",
                        value={"valid": False, "reason": "invalid"},
                        summary="Token key not found in database",
                    ),
                    OpenApiExample(
                        name="Expired Token",
                        value={"valid": False, "reason": "expired"},
                        summary="Token has expired",
                    ),
                ],
            )
        },
    )
)
class TokenHealthView(APIView):
    permission_classes = [AllowAny]  # anyone can call; checks cookie manually
    authentication_classes = []

    def get(self, request):
        token_key = request.COOKIES.get("auth_token")
        if not token_key:
            return Response(
                {"valid": False, "reason": "no_cookie"},
                status=status.HTTP_200_OK,
            )

        try:
            token = Token.objects.get(key=token_key)
        except Token.DoesNotExist:
            # Invalid token → delete cookie server-side
            response = Response(
                {"valid": False, "reason": "invalid"},
                status=status.HTTP_200_OK,
            )
            response.delete_cookie("auth_token")
            return response

        # Check if expired
        if hasattr(token, "has_expired") and token.has_expired():
            # Delete expired token and cookie
            token.delete()
            response = Response(
                {"valid": False, "reason": "expired"},
                status=status.HTTP_200_OK,
            )
            response.delete_cookie("auth_token")
            return response

        # Token valid
        return Response(
            {"valid": True, "reason": "ok"},
            status=status.HTTP_200_OK,
        )
