from email.message import EmailMessage
from encodings.punycode import T
from urllib import response
from django.shortcuts import render
from django.contrib.auth import authenticate
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ObjectDoesNotExist

from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authentication import TokenAuthentication
from rest_framework import status

from django.contrib.sites.shortcuts import get_current_site
from django.template.loader import render_to_string
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.utils.encoding import force_bytes, force_str

# from rest_framework.authtoken.models import Token

from accounts.utils import send_password_reset_email, send_verification_email
from accounts.tasks import send_password_reset_email_task, send_verification_email_task
from accounts.authentication import CustomTokenAuthentication
from accounts.serializers import *

from ..models import ExpiringToken as Token

UserModel = get_user_model()


class LoginView(APIView):
    """APIView for user login."""

    authentication_classes = []
    serializers = UserLoginSerializer

    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():

            validated_data = serializer.validated_data

            user = authenticate(
                username=validated_data["email"], password=validated_data["password"]
            )
            # DONT Check if user is verified. to CHECK authentication
            if user:
                # Make an Token for authorization and authentication
                token, created = Token.objects.get_or_create(user=user)

                if not created and token.has_expired():
                    token.delete()
                    token = Token.objects.create(user=user)

                response = Response(
                    data={"status": "User authenticated", "token": token.key},
                    status=status.HTTP_200_OK,
                )

                response.set_cookie(
                    key="auth_token",
                    value=token.key,
                    httponly=True,
                    secure=True,
                    samesite="Lax",
                )

                return response
                # return Response(data={'token': token.key, 'status': 'User authenticated'}, status=status.HTTP_200_OK)

            else:
                try:
                    login_user = UserModel.objects.get(email=validated_data["email"])
                    if login_user.is_active:
                        return Response(
                            data={
                                "error": f"Invalid credentials for {validated_data['email']}"
                            },
                            status=status.HTTP_401_UNAUTHORIZED,
                        )
                    else:
                        return Response(
                            data={"error": f"User email is not verified!"},
                            status=status.HTTP_401_UNAUTHORIZED,
                        )
                except Exception as e:
                    return Response(
                        data={
                            "error": f"Invalid credentials for {validated_data['email']}"
                        },
                        status=status.HTTP_401_UNAUTHORIZED,
                    )

        else:
            return Response(data=serializer.errors, status=status.HTTP_404_NOT_FOUND)

    def get(self, request):
        # Instantiate CustomTokenAuthentication
        auth = CustomTokenAuthentication()
        # Call the authenticate method on the instance
        auth_result = auth.authenticate(request)

        print("Auth result in login view: ", auth_result)
        if auth_result is not None:
            user, token = auth_result
            is_authenticated = user.is_authenticated
        else:
            is_authenticated = False

        return Response(
            data={
                "is_auth": is_authenticated,
                "message": "Post correct data to this endpoint to login.",
                "post_data": {"email": "string", "password": "string"},
            },
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    authentication_classes = [CustomTokenAuthentication]

    def get(self, request):
        """Get method for logout"""
        if request.user.is_anonymous is False:
            return Response(
                data={"status": "User is authorized!"}, status=status.HTTP_200_OK
            )
        else:
            return Response(
                data={"error": "User is anonymous!"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

    def post(self, request):
        """Post method for logout"""

        if request.user.is_anonymous is False:
            try:
                token = Token.objects.get(user=request.user)
                print(request.user, token)
                token.delete()

                response = Response(
                    data={"status": "Token was destroyed"}, status=status.HTTP_200_OK
                )
                response.set_cookie(
                    key="auth_token",
                    value="",
                    httponly=True,
                    secure=True,
                    samesite="Lax",
                )
                return response

            except Exception as e:
                return Response(
                    data={"error": "Token was not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )

        else:
            return Response(
                data={"error": "User is anonymous!"},
                status=status.HTTP_401_UNAUTHORIZED,
            )


class RegisterView(APIView):
    """APIView for registering user."""

    authentication_classes = []

    def get(self, request):
        return Response(
            data={
                "message": "Post correct data to this endpoint to register new user.",
                "post_data": {
                    "email": "string",
                    "password_1": "string",
                    "password_2": "string",
                },
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        """Post method for registering user, after proper verification of creating new user method sends E-mail with token to verify email."""

        response_message = ""
        # Check if validated data is proper.
        serializer = UserRegisterSerializer(data=request.data)

        # In production prevent a new user registering with an existing verified email address.

        # This code prevent a new user registering with an existing verified email address.
        # It checks that if email is unique.
        if serializer.is_valid() == False:
            print(serializer.errors)

            # Try to check if Error refers to e-mail unique Error.
            try:
                if "email" in serializer.errors:
                    # Try to get 'code' from ErrorDetail object and if it's 'unique' code then try to check if this email is verfied.
                    # If user is not verfied then re-send verification e=mail.
                    try:
                        print(serializer.errors)
                        code = serializer.errors["email"][0].code
                        if code == "unique":
                            # Get pre-validated data.
                            post_data = serializer.data
                            print(post_data)

                            existing_user = UserModel.objects.get(
                                email=post_data["email"]
                            )
                            is_existing_user_verified = EmailVerification.objects.get(
                                user=existing_user
                            )

                            if is_existing_user_verified.verified == True:
                                return Response(
                                    data={
                                        "data": "User with this E-mail already exists!"
                                    },
                                    status=status.HTTP_406_NOT_ACCEPTABLE,
                                )
                            else:
                                # TODO SEND Re-Verification E-mail with proper verification token.
                                # send_mail("Subject", "message", settings.EMAIL_HOST_USER, [serializer.validated_data['email']])
                                # sended_email = send_verification_email(user=existing_user)
                                # if sended_email:
                                #     return Response(data={'data': 'Your account was not verified! Verification E-mail was sended now again.'}, status=status.HTTP_401_UNAUTHORIZED)
                                # else:
                                #     return Response(data={'error': 'E-mail sending function encounter problem'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

                                # TODO, DONT SEND VERIFICATION EMAIL
                                return Response(
                                    data={
                                        "error": "E-mail was not verified! You cannot register to account which email is not verified."
                                    },
                                    status=status.HTTP_401_UNAUTHORIZED,
                                )

                    except Exception as e:
                        print(e)

            except Exception as e:
                print(e)

            return Response(
                data={"data": serializer.errors}, status=status.HTTP_404_NOT_FOUND
            )

        validated_data = serializer.validated_data

        if validated_data["password_1"] == validated_data["password_2"]:

            try:
                user = UserModel.objects.create_user(
                    email=validated_data["email"],
                    username=validated_data["email"],
                    password=validated_data["password_1"],
                )

                user.save()
            except Exception as e:
                return Response(
                    data={"error": str(e)}, status=status.HTTP_400_BAD_REQUEST
                )

            if getattr(settings, "EMAIL_SEND_ASYNC", False):
                send_verification_email_task.delay(user.id)

                return Response(
                    {"status": "Verification e-mail is being sent"},
                    status=status.HTTP_200_OK,
                )
            else:
                sended_email = send_verification_email(user=user)
                if sended_email:
                    return Response(
                        data={
                            "user": validated_data["email"],
                            "status": "Verification e-mail sended.",
                        },
                        status=status.HTTP_200_OK,
                    )
                else:
                    return Response(
                        data={
                            "user": validated_data["email"],
                            "status": "Sending verification e-mail function encounter problem",
                        },
                        status=status.HTTP_503_SERVICE_UNAVAILABLE,
                    )

        else:
            return Response(
                data={"error": "Passwords doesn't match"},
                status=status.HTTP_404_NOT_FOUND,
            )


class ResendRegisterView(APIView):
    """APIView for resending verification e-mail to user."""

    def post(self, request):
        """Post method for resending email with token to verify user email."""
        serializer = ResendTokenSerializer(data=request.data)

        if serializer.is_valid():
            validated_data = serializer.validated_data

            # Try if user exists
            try:
                email = validated_data["email"]
                user = User.objects.get(email=email)

                email_verification_obj = EmailVerification.objects.get(user=user)
                if email_verification_obj.verified == True:
                    return Response(
                        data={
                            "success": "Your account was already verified. You don't have to verify it second time!"
                        },
                        status=status.HTTP_200_OK,
                    )

            except Exception as e:
                print(e)
                return Response(
                    data={"error": "User does not exists"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if getattr(settings, "EMAIL_SEND_ASYNC", False):
                send_verification_email_task.delay(user.id)

                return Response(
                    {"status": "Verification e-mail is being sent"},
                    status=status.HTTP_200_OK,
                )
            else:
                sended_email = send_verification_email(user=user)

                if sended_email:
                    return Response(
                        data={
                            "user": validated_data["email"],
                            "status": "Sended e-mail!",
                        },
                        status=status.HTTP_200_OK,
                    )
                else:
                    return Response(
                        data={
                            "user": validated_data["email"],
                            "status": "Sending verification e-mail function encounter problem",
                        },
                        status=status.HTTP_503_SERVICE_UNAVAILABLE,
                    )

        else:
            return Response(data=serializer.errors)


class VerifyView(APIView):
    """APIView for veryfing user email"""

    def get(self, request, uid, token):
        """
        Return uid and token from url.
        """
        return Response(
            data={"verify_token": token, "uid": uid}, status=status.HTTP_200_OK
        )

    def post(self, request, uid, token):
        """Post method that gets Token and UID from URL and verifies that created token in email belongs to User."""

        serializer = UserVerifyToken(data=request.data)
        if serializer.is_valid():
            token = serializer.validated_data["verify_token"]
            uid = serializer.validated_data["uid"]

            try:
                user_id = force_str(urlsafe_base64_decode(uid))
                print("User_id:", user_id, "Coded user id:", uid)
                user = UserModel.objects.get(pk=user_id)
                email_verification_obj = (
                    EmailVerification.objects.filter(user_id=user_id)
                    .order_by("-created_at")
                    .first()
                )

                if user.is_active and email_verification_obj.verified:
                    return Response(
                        data={"status": "User is already verified."},
                        status=status.HTTP_200_OK,
                    )

                print(token, email_verification_obj.token)
                if token == email_verification_obj.token:
                    user.is_active = True
                    email_verification_obj.verified = True
                    user.save()
                    email_verification_obj.save()

                    # Sending token in http cookies and in response. Just authorize user without login.
                    auth_token, created = Token.objects.get_or_create(user=user)

                    response = Response(
                        data={"status": "User verified", "token": auth_token.key},
                        status=status.HTTP_200_OK,
                    )

                    response.set_cookie(
                        key="auth_token",
                        value=auth_token.key,
                        httponly=True,
                        secure=True,
                        samesite="Lax",
                    )
                    return response

                    # return Response(data={"status": "User verified."}, status=status.HTTP_200_OK)
                else:
                    return Response(
                        data={"error": "Token expired."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            except Exception as e:
                print(f"Error in VerifyView: {e}")
                return Response(
                    data={"error": "User not found."}, status=status.HTTP_404_NOT_FOUND
                )

        return Response(data=serializer.errors, status=status.HTTP_404_NOT_FOUND)


class PasswordResetView(APIView):
    """APIView for sending reset password e-mail."""

    # https://dev.to/earthcomfy/django-reset-password-3k0l

    def post(self, request):

        serializer = PasswordResetSerializer(data=request.data)
        if serializer.is_valid():
            validated_data = serializer.validated_data

            try:
                user = UserModel.objects.get(email=validated_data["email"])

                try:
                    email_verification = EmailVerification.objects.get(user=user)
                except Exception as e:
                    print(e)
                    return Response(
                        data={"error": "E-mail was not verifed"},
                        status=status.HTTP_401_UNAUTHORIZED,
                    )

                if user is not None and email_verification.verified:
                    # Check if there is no older ResetPasswordToken objects, delete expired one!
                    user_password_tokens = ResetPasswordToken.objects.filter(user=user)
                    if user_password_tokens.exists():
                        user_password_tokens.delete()

                    if getattr(settings, "EMAIL_SEND_ASYNC", False):
                        send_password_reset_email_task.delay(user.id)

                        return Response(
                            {"status": "Password reset email is being sent"},
                            status=status.HTTP_200_OK,
                        )
                    else:
                        is_sended = send_password_reset_email(user=user)
                        if is_sended:
                            return Response(
                                data={"status": "Password reset email was sended"},
                                status=status.HTTP_200_OK,
                            )
                        else:
                            return Response(
                                data={"error": "User is None"},
                                status=status.HTTP_401_UNAUTHORIZED,
                            )
                else:
                    return Response(
                        data={"error": "User was not found"},
                        status=status.HTTP_404_NOT_FOUND,
                    )

            except Exception as e:
                print(e)
                return Response(
                    data={"error": "User was not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )

        else:
            return Response(data=serializer.errors, status=status.HTTP_404_NOT_FOUND)


class PasswordResetConfirmView(APIView):
    """APIView for getting reset password tokens and passwords."""

    def get(self, request, uid, token):
        return Response(
            data={
                "uid": uid,
                "verify_token": token,
                "password_1": "",
                "password_2": "",
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request, uid, token):
        serializer = PasswordResetVerifySerializer(data=request.data)
        if serializer.is_valid():
            validated_data = serializer.validated_data
            print(
                validated_data["uid"],
                validated_data["verify_token"],
                validated_data["password_1"],
                validated_data["password_2"],
            )

            # Check if passwords match
            if validated_data["password_1"] == validated_data["password_2"]:

                # Get user model
                try:
                    user_id = force_str(urlsafe_base64_decode(validated_data["uid"]))
                    user = UserModel.objects.get(pk=user_id)
                    print(
                        "User id: ",
                        user_id,
                        ", uid: ",
                        validated_data["uid"],
                        ", user obj: ",
                        user,
                    )
                except:
                    return Response(
                        data={"error": "User not found"},
                        status=status.HTTP_404_NOT_FOUND,
                    )

                password = validated_data["password_1"]

                # Validate password
                errors = dict()
                try:
                    validate_password(password=password, user=user)
                except ValidationError as e:
                    errors["password"] = list(e.messages)
                    return Response(
                        data={"errors": errors}, status=status.HTTP_406_NOT_ACCEPTABLE
                    )

                # Check if password token is proper
                try:
                    reset_password_obj = (
                        ResetPasswordToken.objects.filter(user=user)
                        .order_by("-created_at")
                        .first()
                    )
                    if validated_data["verify_token"] == reset_password_obj.token:
                        user.set_password(password)
                        user.save()
                        # We have to delete this object because if somebody e-mail was stolen, thieft could thief also this account
                        reset_password_obj.delete()
                        # reset_password_obj.token = ''
                        # reset_password_obj.save()

                    else:
                        return Response(
                            data={"error": "Reset password token is invalid"},
                            status=status.HTTP_409_CONFLICT,
                        )

                except Exception as e:
                    print(e)
                    return Response(
                        data={"error": "Reset password object does not exists"},
                        status=status.HTTP_401_UNAUTHORIZED,
                    )

                # Remove old authentication token (if exists), and add new.
                try:
                    auth_token = Token.objects.get(user=user)
                    auth_token.delete()
                except Token.DoesNotExist:
                    new_auth_token, created = Token.objects.get_or_create(user=user)

                    response = Response(
                        data={
                            "token": new_auth_token.key,
                            "status": "Password reseted successfully (User never logged in. Token does not exists)",
                        },
                        status=status.HTTP_202_ACCEPTED,
                    )
                    response.set_cookie(
                        key="auth_token",
                        value=new_auth_token.key,
                        httponly=True,
                        secure=True,
                        samesite="Lax",
                    )

                    return response

                new_auth_token, created = Token.objects.get_or_create(user=user)

                if not created and token.has_expired():
                    new_auth_token.delete()
                    new_auth_token = Token.objects.create(user=user)

                response = Response(
                    data={
                        "token": new_auth_token.key,
                        "status": "Password reseted successfully",
                    },
                    status=status.HTTP_200_OK,
                )
                response.set_cookie(
                    key="auth_token",
                    value=new_auth_token.key,
                    httponly=True,
                    secure=True,
                    samesite="Lax",
                )

                return response
            else:
                return Response(
                    data={"error": "Passwords doesn't match"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        else:
            return Response(data=serializer.errors, status=status.HTTP_404_NOT_FOUND)
