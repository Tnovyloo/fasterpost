from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import OuterRef, Subquery

from .models import Package, Actualization
from accounts.models import User
from postmats.models import Postmat

from .serializers import PackageSerializer, PackageDetailSerializer, PackageListSerializer

class UserPackagesView(APIView):
    """
    GET /user/parcels → list of user's shipments
    POST /user/parcels → create new shipment
    """

    def get(self, request):
        user = request.user

        last_status_subquery = Actualization.objects.filter(
            package_id=OuterRef("pk")
        ).order_by("-created_at").values("status")[:1]

        packages = (
            Package.objects.filter(sender=user)
            .annotate(latest_status=Subquery(last_status_subquery))
            .select_related("origin_postmat", "destination_postmat")
        )

        serializer = PackageListSerializer(packages, many=True)

        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        data = request.data.copy()
        data['sender'] = request.user.id
        serializer = PackageSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class ParcelDetailView(APIView):
    """
    GET /user/parcels/<uuid:id>
    """

    def get(self, request, id):
        user = request.user
        try:
            package = Package.objects.get(id=id)
            if package.sender != user and package.receiver != user:
                return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        except Package.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = PackageDetailSerializer(package)
        return Response(serializer.data, status=status.HTTP_200_OK)