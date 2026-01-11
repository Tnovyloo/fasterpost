from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from django.core.exceptions import ValidationError
from django.db.models import Q
from django.utils import timezone
from drf_spectacular.utils import extend_schema

from packages.models import Package, Actualization
from packages.serializers import (
    PublicPackageTrackingSerializer,
    SenderPackageDetailSerializer,
    AnonymousPickupSerializer,
)
from accounts.authentication import CustomTokenAuthentication


@extend_schema(tags=["Public - Tracking"])
class PublicTrackingView(generics.RetrieveAPIView):
    """
    Public API to track a package by ID (UUID).
    No authentication required, but if authenticated and owner, returns full details.
    """

    authentication_classes = [CustomTokenAuthentication]
    permission_classes = [AllowAny]
    serializer_class = PublicPackageTrackingSerializer

    def get_object(self):
        query = self.kwargs.get("query")
        # Validating if query is a valid UUID could be done here,
        # but Django's get() will raise ValidationError or DoesNotExist anyway.
        try:
            return Package.objects.get(id=query)
        except (
            Package.DoesNotExist,
            ValueError,
            ValidationError,
        ):  # <--- Catch ValidationError here
            # 2. Fallback: Try finding by Pickup Code (Tracking Number)
            try:
                return Package.objects.get(pickup_code=query)
            except Package.DoesNotExist:
                return None

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if not instance:
            return Response(
                {"error": "Package not found. Please check the ID."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check ownership
        is_owner = False
        if request.user and request.user.is_authenticated:
            if (
                instance.sender == request.user
                or instance.receiver_user == request.user
            ):
                is_owner = True

        if is_owner:
            serializer = SenderPackageDetailSerializer(
                instance, context={"request": request}
            )
        else:
            serializer = self.get_serializer(instance)

        data = serializer.data
        data["isOwner"] = is_owner
        return Response(data)


@extend_schema(tags=["Public - Pickup"])
class AnonymousPickupView(APIView):
    """
    Public API for anonymous users to pick up a package using contact info and unlock code.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        request=AnonymousPickupSerializer,
        responses={200: {"message": "Package collected successfully!"}},
    )
    def post(self, request):
        serializer = AnonymousPickupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        contact = serializer.validated_data["contact"]
        unlock_code = serializer.validated_data["unlock_code"]

        try:
            # Check against both email and phone
            package = Package.objects.get(
                Q(unlock_code=unlock_code)
                & (Q(receiver_email=contact) | Q(receiver_phone=contact))
            )
        except Package.DoesNotExist:
            return Response(
                {"error": "Invalid credentials or package not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check if package is ready for collection
        is_ready = False
        latest_act = package.actualizations.order_by("-created_at").first()

        if latest_act and latest_act.status == Actualization.PackageStatus.DELIVERED:
            is_ready = True
        elif hasattr(package, "stash_assignment"):
            stash = package.stash_assignment.first()
            if stash and stash.postmat_id == package.destination_postmat_id:
                is_ready = True

        if not is_ready:
            return Response(
                {
                    "error": "Package is not ready for collection or has already been collected."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Reuse the collection logic (update status and release stash)
        # We can't easily reuse CollectPackageView because of permissions, so we duplicate the core logic here.

        Actualization.objects.create(
            package_id=package,
            status=Actualization.PackageStatus.PICKED_UP,
            created_at=timezone.now(),
        )

        if hasattr(package, "stash_assignment"):
            package.stash_assignment.update(
                package=None, is_empty=True, reserved_until=None
            )

        return Response(
            {"message": "Package collected successfully!"}, status=status.HTTP_200_OK
        )
