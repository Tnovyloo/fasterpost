from rest_framework.permissions import BasePermission
from accounts.models import User


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_staff


class HasRolePermission(BasePermission):
    """
    Base permission class that allows access if the user's role
    is in the allowed_roles list.
    """

    allowed_roles: list[str] = []

    def has_permission(self, request, view):
        user = request.user
        return (
            bool(user and user.is_authenticated)
            and getattr(user, "role", None) in self.allowed_roles
        )


class IsCourier(HasRolePermission):
    allowed_roles = [User.Roles.COURIER]


class IsWarehouseCourier(HasRolePermission):
    allowed_roles = [User.Roles.WAREHOUSE_COURIER]


class IsBusinessUser(HasRolePermission):
    allowed_roles = [User.Roles.BUSINESS]


class IsNormalUser(HasRolePermission):
    allowed_roles = [User.Roles.NORMAL]


class IsCourierOrWarehouse(HasRolePermission):
    """
    Example: combined role permission
    """

    allowed_roles = [User.Roles.COURIER, User.Roles.WAREHOUSE_COURIER]
