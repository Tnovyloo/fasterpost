from django.db.models import Q
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from logistics.models import Warehouse
from logistics.serializers.admin_serializers import WarehouseListSerializer, WarehouseDetailSerializer
from logistics.serializers.serializers import WarehouseSimpleSerializer
from accounts.permissions import IsAdmin
from postmats.pagination import StandardPagination

from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample
from drf_spectacular.types import OpenApiTypes


@extend_schema(
    tags=["Admin - Warehouses"],
    description="Manage warehouses and their connections. Only accessible to admin users.",
)
class WarehouseAdminViewSet(viewsets.ModelViewSet):
    queryset = Warehouse.objects.all()
    serializer_class = WarehouseDetailSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    pagination_class = StandardPagination

    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'list':
            return WarehouseListSerializer
        elif self.action == 'simple':
            return WarehouseSimpleSerializer
        return WarehouseDetailSerializer

    def get_queryset(self):
        qs = Warehouse.objects.all()

        # Search by city
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(city__icontains=search)

        # Filter by status
        status = self.request.query_params.get("status")
        if status:
            qs = qs.filter(status=status)

        # Sorting
        ordering = self.request.query_params.get("ordering")
        allowed_ordering = ["city", "-city", "status", "-status"]
        if ordering and ordering in allowed_ordering:
            qs = qs.order_by(ordering)
        else:
            qs = qs.order_by("city")

        return qs

    @extend_schema(
        summary="List all warehouses",
        description="Returns a paginated list of all warehouses with their connections.",
        parameters=[
            OpenApiParameter(
                name="search",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description="Search by city name (case-insensitive)",
                examples=[OpenApiExample("Warsaw", value="Warsaw")],
            ),
            OpenApiParameter(
                name="status",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description="Filter by status",
                enum=["active", "inactive", "under_maintenance"],
            ),
            OpenApiParameter(
                name="ordering",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description="Sort results",
                examples=[
                    OpenApiExample("A to Z", value="city"),
                    OpenApiExample("Z to A", value="-city"),
                ],
            ),
            OpenApiParameter(name="page", type=OpenApiTypes.INT, location=OpenApiParameter.QUERY),
            OpenApiParameter(name="page_size", type=OpenApiTypes.INT, location=OpenApiParameter.QUERY),
        ],
        responses={200: WarehouseListSerializer(many=True)},
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Create a new warehouse",
        description="Create a warehouse with optional connections. Connections are automatically bidirectional.",
        responses={201: WarehouseDetailSerializer}
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(summary="Retrieve a warehouse", responses={200: WarehouseDetailSerializer})
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        summary="Update a warehouse",
        description="Update warehouse details and connections. Provide full connection list.",
        responses={200: WarehouseDetailSerializer}
    )
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @extend_schema(summary="Partial update a warehouse", responses={200: WarehouseDetailSerializer})
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @extend_schema(summary="Delete a warehouse (removes all connections)")
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)

    @extend_schema(
        summary="Get simple warehouse list",
        description="Returns simplified warehouse list for dropdowns/selects without connection details.",
        parameters=[
            OpenApiParameter(
                name="status",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description="Filter by status",
                enum=["active", "inactive", "under_maintenance"],
            ),
        ],
        responses={200: WarehouseSimpleSerializer(many=True)},
    )
    @action(detail=False, methods=['get'], url_path='simple')
    def simple(self, request):
        """Get simple list of warehouses for dropdowns"""
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)