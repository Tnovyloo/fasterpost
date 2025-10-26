from rest_framework.views import APIView
from accounts.permissions import *
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from accounts.serializers import UserUnSafeSerializerForTests


class CourierDashboardView(APIView):
    permission_classes = [IsCourier]

    def get(self, request):
        return Response({"message": "Welcome, Courier!"})


class BusinessDashboardView(APIView):
    permission_classes = [IsBusinessUser]

    def get(self, request):
        return Response({"message": "Welcome, Business User!"})


class NormalUserDashboardView(APIView):
    permission_classes = [IsNormalUser]

    def get(self, request):
        return Response({"message": "Welcome, Client!"})


class UserInfoView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserUnSafeSerializerForTests(request.user)
        print(request.user)
        return Response(serializer.data)
