# views.py
from django.db.models import Q
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from postmats.models import Postmat, Stash
from postmats.serializers import PostmatAdminSerializer, StashAdminSerializer
from accounts.permissions import IsAdmin
from postmats.pagination import StandardPagination


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
            qs = qs.order_by("-id")  # default

        return qs
    
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