from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.core.exceptions import ValidationError
from drf_spectacular.utils import extend_schema

from packages.models import Package
from packages.serializers import PublicPackageTrackingSerializer

@extend_schema(tags=["Public - Tracking"])
class PublicTrackingView(generics.RetrieveAPIView):
    """
    Public API to track a package by ID (UUID).
    No authentication required.
    """
    permission_classes = [AllowAny]
    serializer_class = PublicPackageTrackingSerializer
    
    def get_object(self):
        query = self.kwargs.get('query')
        # Validating if query is a valid UUID could be done here, 
        # but Django's get() will raise ValidationError or DoesNotExist anyway.
        try:
            return Package.objects.get(id=query)
        except (Package.DoesNotExist, ValueError, ValidationError): # <--- Catch ValidationError here
            # 2. Fallback: Try finding by Pickup Code (Tracking Number)
            try:
                return Package.objects.get(pickup_code=query)
            except Package.DoesNotExist:
                return None

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if not instance:
            return Response(
                {'error': 'Package not found. Please check the ID.'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)