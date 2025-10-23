from rest_framework.permissions import BasePermission
from accounts.models import User


class IsCourier(BasePermission):
    """
    Allows access only to users with the 'courier' role.
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Roles.COURIER
        )


class IsWarehouseCourier(BasePermission):
    """
    Allows access only to users with the 'warehouse' role.
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Roles.WAREHOUSE_COURIER
        )


class IsBusinessUser(BasePermission):
    """
    Allows access only to users with the 'business' role.
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Roles.BUSINESS
        )


class IsNormalUser(BasePermission):
    """
    Allows access only to users with the 'normal' role.
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Roles.NORMAL
        )
