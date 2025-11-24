from django.db.models import Q
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from postmats.models import Postmat, Stash
from postmats.serializers import PostmatAdminSerializer, StashAdminSerializer
from accounts.permissions import IsAdmin
from postmats.pagination import StandardPagination

from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample
from drf_spectacular.types import OpenApiTypes

@extend_schema(
    tags=["Admin - Postmats"],
    description="Manage postmats (lockers). Only accessible to admin users.",
)
class PostmatAdminViewSet(viewsets.ModelViewSet):
    qs = Postmat.objects.select_related("warehouse").all()
    serializer_class = PostmatAdminSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    pagination_class = StandardPagination

    def get_queryset(self):
        qs = Postmat.objects.select_related("warehouse").all()

        # Search by name or postal_code
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(name__icontains=search) |
                Q(postal_code__icontains=search)
            )

        # Filter by status
        status = self.request.query_params.get("status")
        if status:
            qs = qs.filter(status=status)

        # Filter by warehouse
        warehouse = self.request.query_params.get("warehouse")
        if warehouse:
            qs = qs.filter(warehouse_id=warehouse)

        # Sorting
        ordering = self.request.query_params.get("ordering")
        allowed_ordering = [
            "name", "-name",
            "status", "-status",
            "date_created", "-date_created",  # assuming you have a timestamp
            "warehouse__name", "-warehouse__name",
        ]
        if ordering and ordering in allowed_ordering:
            qs = qs.order_by(ordering)
        else:
            qs = qs.order_by("name")

        return qs
        
    @extend_schema(
        summary="List all postmats",
        description="Returns a paginated list of all postmats with their stashes included.",
        parameters=[
            OpenApiParameter(
                name="search",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description="Search in name or postal code (case-insensitive)",
                examples=[OpenApiExample("PM001", value="PM001")],
            ),
            OpenApiParameter(
                name="status",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description="Filter by status",
                enum=["active", "inactive", "maintenance"],
            ),
            OpenApiParameter(
                name="warehouse",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description="Filter by warehouse ID",
            ),
            OpenApiParameter(
                name="ordering",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description="Sort results. Allowed: name, -name, status, warehouse__name, etc.",
                examples=[
                    OpenApiExample("A to Z", value="name"),
                    OpenApiExample("Z to A", value="-name"),
                ],
            ),
            OpenApiParameter(name="page", type=OpenApiTypes.INT, location=OpenApiParameter.QUERY),
            OpenApiParameter(name="page_size", type=OpenApiTypes.INT, location=OpenApiParameter.QUERY),
        ],
        responses={200: PostmatAdminSerializer(many=True)},
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(summary="Create a new postmat", responses={201: PostmatAdminSerializer})
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(summary="Retrieve a postmat", responses={200: PostmatAdminSerializer})
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(summary="Update a postmat", responses={200: PostmatAdminSerializer})
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @extend_schema(summary="Partial update a postmat", responses={200: PostmatAdminSerializer})
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @extend_schema(summary="Delete a postmat (and all its stashes)")
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)


@extend_schema(
    tags=["Admin - Stashes"],
    description="Manage individual stash slots inside postmats. Only admins.",
)
class StashAdminViewSet(viewsets.ModelViewSet):
    queryset = Stash.objects.select_related("postmat__warehouse").all()
    serializer_class = StashAdminSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    pagination_class = StandardPagination

    def get_queryset(self):
        qs = Stash.objects.select_related("postmat__warehouse").all()

        postmat_id = self.request.query_params.get("postmat")
        if postmat_id:
            qs = qs.filter(postmat_id=postmat_id)

        return qs.order_by("postmat__name", "size")
    
    @extend_schema(
        summary="List all stashes",
        description="Returns all stash slots. Use ?postmat=123 to filter by postmat.",
        parameters=[
            OpenApiParameter(
                name="postmat",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description="Filter stashes by postmat ID",
                examples=[OpenApiExample("Postmat ID 5", value="5")],
            ),
        ],
        responses={200: StashAdminSerializer(many=True)},
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(summary="Create a new stash slot")
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(summary="Retrieve a stash")
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(summary="Update a stash (e.g. reserve or clear reservation)")
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @extend_schema(summary="Partial update a stash")
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @extend_schema(summary="Delete a stash slot")
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)