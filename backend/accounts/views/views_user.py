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


class UserRoleView(APIView):
    def get(self, request):
        user = request.user

        if not user.is_anonymous:
            return Response(
                {
                    "role": user.role,
                    "is_admin": user.is_admin,
                    "is_staff": user.is_staff,
                    "is_active": user.is_active,
                    "is_superuser": user.is_superuser,
                },
                status=200,
            )

        else:
            return Response(
                {
                    "role": "anonymous",
                    "is_admin": False,
                    "is_staff": False,
                    "is_active": False,
                    "is_superuser": False,
                },
                status=200,
            )
