from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from accounts.permissions import IsAdmin
from accounts.serializers import AdminUserSerializer
from accounts.pagination import StandardPagination

from accounts.models import User


class AdminUserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = AdminUserSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    pagination_class = StandardPagination

    def get_queryset(self):
        qs = User.objects.all()
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(email__icontains=search)
                | Q(username__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
            )

        role = self.request.query_params.get("role")
        if role:
            qs = qs.filter(role=role)

        ordering = self.request.query_params.get("ordering")
        if ordering:
            allowed = [
                "email",
                "username",
                "date_joined",
                "role",
                "is_active",
                "-email",
                "-username",
                "-date_joined",
                "-role",
                "-is_active",
            ]
            if ordering in allowed:
                qs = qs.order_by(ordering)

        return qs.order_by("-date_joined") if not ordering else qs
