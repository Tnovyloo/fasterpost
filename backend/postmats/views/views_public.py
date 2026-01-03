from rest_framework import viewsets, filters, generics, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from django.db.models import Q
from drf_spectacular.utils import extend_schema, OpenApiParameter

from postmats.models import Postmat
from packages.models import Package
from postmats.serializers import PostmatSerializer

@extend_schema(tags=["Public"])
class PublicPostmatViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public API for browsing Postmats.
    Returns a plain list of all active postmats (No Pagination).
    """
    queryset = Postmat.objects.filter(status='active').order_by('name')
    serializer_class = PostmatSerializer
    permission_classes = [AllowAny]
    
    # Disable pagination entirely to return the full list for the map
    pagination_class = None
    
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'address', 'postal_code', 'warehouse__city']
    ordering_fields = ['name', 'warehouse__city']
