from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from accounts.serializers import UserProfileSerializer, UserUpdateSerializer


class UserProfileView(APIView):
    """
    GET: Retrieve current user's profile information
    PUT: Update current user's profile information
    PATCH: Partially update current user's profile information
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        serializer = UserUpdateSerializer(
            request.user, data=request.data, context={"request": request}
        )

        if serializer.is_valid():
            serializer.save()
            # Return full profile data after update
            profile_serializer = UserProfileSerializer(request.user)
            return Response(
                {
                    "status": "Profile updated successfully",
                    "user": profile_serializer.data,
                },
                status=status.HTTP_200_OK,
            )

        return Response(
            {"error": "Validation failed", "details": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    def patch(self, request):
        serializer = UserUpdateSerializer(
            request.user, data=request.data, partial=True, context={"request": request}
        )

        if serializer.is_valid():
            serializer.save()
            # Return full profile data after update
            profile_serializer = UserProfileSerializer(request.user)
            return Response(
                {
                    "status": "Profile updated successfully",
                    "user": profile_serializer.data,
                },
                status=status.HTTP_200_OK,
            )

        return Response(
            {"error": "Validation failed", "details": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )
