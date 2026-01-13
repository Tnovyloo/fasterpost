from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.db.models import Q, Prefetch
from packages.models import Package, Actualization
from packages.serializers import PackageAdminSerializer, PackageListSerializer
from packages.serializers import ActualizationSerializer


class PackageAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]
    queryset = Package.objects.all()

    def get_serializer_class(self):
        if self.action == "list":
            return PackageListSerializer
        return PackageAdminSerializer

    def get_queryset(self):
        queryset = Package.objects.select_related(
            "origin_postmat", "destination_postmat", "sender"
        ).prefetch_related(
            Prefetch(
                "actualizations",
                queryset=Actualization.objects.select_related(
                    "courier_id", "warehouse_id"
                ).order_by("-created_at"),
            )
        )

        # Search functionality
        search = self.request.query_params.get("search", None)
        if search:
            queryset = queryset.filter(
                Q(pickup_code__icontains=search)
                | Q(receiver_name__icontains=search)
                | Q(receiver_phone__icontains=search)
                | Q(sender__email__icontains=search)
            )

        # Filter by status
        status_filter = self.request.query_params.get("status", None)
        if status_filter:
            # Use subquery to avoid duplicates
            from django.db.models import Exists, OuterRef

            has_status = Actualization.objects.filter(
                package_id=OuterRef("pk"), status=status_filter
            )
            queryset = queryset.filter(Exists(has_status))

        # Filter by size
        size_filter = self.request.query_params.get("size", None)
        if size_filter:
            queryset = queryset.filter(size=size_filter)

        return queryset

    @action(detail=True, methods=["post"])
    def update_status(self, request, pk=None):
        """Update package status by creating new actualization"""
        package = self.get_object()
        new_status = request.data.get("status")

        if not new_status:
            return Response(
                {"error": "Status is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        actualization = Actualization.objects.create(
            package_id=package,
            status=new_status,
            courier_id=request.data.get("courier_id"),
            warehouse_id=request.data.get("warehouse_id"),
            route_remaining=request.data.get("route_remaining"),
        )

        return Response(
            {
                "message": "Status updated successfully",
                "actualization": ActualizationSerializer(actualization).data,
            }
        )

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Get package statistics"""
        from django.db.models import Count

        total = Package.objects.count()
        by_status = Actualization.objects.values("status").annotate(
            count=Count("package_id", distinct=True)
        )
        by_size = Package.objects.values("size").annotate(count=Count("id"))

        return Response(
            {
                "total_packages": total,
                "by_status": list(by_status),
                "by_size": list(by_size),
            }
        )
