import base64
import pyotp
import qrcode
import io
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate
from django.contrib.auth import get_user_model

from accounts.models import UserTOTP
from accounts.authentication import CustomTokenAuthentication
from accounts.serializers import (
    EnableTOTPSerializer,
    VerifyTOTPSerializer,
    DisableTOTPSerializer,
)

User = get_user_model()


class EnableTOTPView(APIView):
    authentication_classes = [CustomTokenAuthentication]

    def post(self, request):
        user = request.user

        # Create or reset secret
        secret = pyotp.random_base32()
        totp, created = UserTOTP.objects.get_or_create(user=user)
        totp.secret = secret
        totp.confirmed = False
        totp.save()

        # Generate QR code
        uri = totp.provisioning_uri()
        qr = qrcode.make(uri)
        img_bytes = io.BytesIO()
        qr.save(img_bytes, format="PNG")

        return Response(
            {
                "secret": secret,
                "qr_image_base64": base64.b64encode(img_bytes.getvalue()).decode(),
            }
        )


class StatusTOTPView(APIView):
    authentication_classes = [CustomTokenAuthentication]

    def get(self, request):
        user = request.user
        try:
            totp = user.totp
            return Response({"enabled": totp.confirmed}, status=status.HTTP_200_OK)
        except UserTOTP.DoesNotExist:
            # User does not have TOTP setup
            return Response({"enabled": False}, status=status.HTTP_200_OK)


class DisableTOTPView(APIView):
    authentication_classes = [CustomTokenAuthentication]

    def post(self, request):
        try:
            request.user.totp.delete()
        except UserTOTP.DoesNotExist:
            return Response({"error": "TOTP not enabled"}, status=400)

        return Response({"status": "TOTP disabled"})


class VerifyTOTPView(APIView):
    authentication_classes = [CustomTokenAuthentication]

    def post(self, request):
        user = request.user
        serializer = VerifyTOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        code = serializer.validated_data["code"]

        try:
            totp = UserTOTP.objects.get(user=user)
        except UserTOTP.DoesNotExist:
            return Response({"error": "TOTP not enabled"}, status=400)

        if pyotp.TOTP(totp.secret).verify(code):
            totp.confirmed = True
            totp.save()
            return Response({"status": "TOTP successfully verified"})
        else:
            return Response({"error": "Invalid TOTP code"}, status=400)
