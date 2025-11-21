from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema, OpenApiResponse

from django.contrib.auth import get_user_model
from ..serializers import SafeUserSerializer

User = get_user_model()

class CurrentUserRetrieveUpdateView(generics.RetrieveUpdateAPIView):
    """
    GET  -> Returns current user's safe profile.
    PATCH -> Partial update of current user's profile.
    PUT  -> Full update (allowed but PATCH is preferred).
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SafeUserSerializer

    def get_object(self):
        # Always return current authenticated user (no id in the URL)
        return self.request.user

    @extend_schema(
        operation_id="CurrentUserRetrieve",
        summary="Get current user profile",
        responses={200: SafeUserSerializer},
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(
        operation_id="CurrentUserUpdate",
        summary="Update current user profile",
        request=SafeUserSerializer,
        responses={
            200: SafeUserSerializer,
            400: OpenApiResponse(description="Validation errors"),
            401: OpenApiResponse(description="Authentication required"),
        },
    )
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)

    # Optional: allow PUT as well (keeps docs clear)
    def put(self, request, *args, **kwargs):
        return super().put(request, *args, **kwargs)
