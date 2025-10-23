from collections import UserDict
from http import cookies
import re
import secrets
import requests

from unittest.mock import patch
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

# from accounts.models import User
from accounts.models import EmailVerification, ResetPasswordToken, User
from django.core import mail
from django.contrib.auth import get_user_model

# from rest_framework.authtoken.models import Token
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.utils.encoding import force_bytes, force_str
from django.utils.timezone import now, timedelta

from ..models import ExpiringToken as Token


User = get_user_model()


class AuthenticationAPITestCase(APITestCase):
    def setUp(self):
        # Get URLs to test rest API
        self.register_url = reverse("user-register")
        self.login_url = reverse("user-login")
        self.logout_url = reverse("user-logout")
        self.verification_url_pattern = (
            r"http://localhost:8000/accounts/user/verify/\w+/\w+"
        )
        self.resend_verification_email_url = reverse("user-resend-verification-email")
        self.reset_password_url = reverse("user-password-reset")
        self.password_reset_url_pattern = r"http://localhost:8000/accounts/user/password-reset-verify/\w+/[a-fA-F0-9]+"

        # Set up client
        self.client = APIClient()

        # Set up users
        self.super_user = User.objects.create_user(
            username="admin@admin.com", password="testpassword", email="admin@admin.com"
        )
        self.user_dict = {
            "email": "name@example.com",
            "password": "klsadfjAA",
        }


class RegistrationTestCase(AuthenticationAPITestCase):
    def setUp(self):
        return super().setUp()

    def test_valid_registration(self):
        """Test successful user registration"""
        response = self.client.post(
            self.register_url,
            data={
                "email": "new@example.com",
                "password_1": "ValidPass123",
                "password_2": "ValidPass123",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(User.objects.filter(email="new@example.com").exists())

    def test_similar_password_registration(self):
        # Test creating user with similar password to email
        response = self.client.post(
            self.register_url,
            data={
                "email": self.user_dict["email"],
                "password_1": "ExamplE123",
                "password_2": "ExamplE123",
            },
        )

        print(response.data)
        self.assertEqual(
            response.status_code,
            200,
            msg="Registering user with similar password to e-mail, response from API should be 200 (similarity password validator turned off) !",
        )
        # Check if mail is sended
        self.assertEqual(len(mail.outbox), 1)

    def test_too_short_password_registration(self):
        # Test creating user with too short password
        response = self.client.post(
            self.register_url,
            data={
                "email": "test@example.com",
                "password_1": "Example",
                "password_2": "Example",
            },
        )

        self.assertEqual(
            response.status_code,
            400,
            msg=f"Registering user with too short password! status should be 400!:\n {response.status_code}, {response.data}",
        )
        self.assertEqual(len(mail.outbox), 0)

    def test_password_mismatch(self):
        """Test registration with mismatched passwords"""
        response = self.client.post(
            self.register_url,
            data={
                "email": "test@example.com",
                "password_1": "Password123",
                "password_2": "Password124",
            },
        )
        self.assertEqual(response.status_code, 404)
        self.assertEqual(len(mail.outbox), 0)

    def test_existing_email_registration(self):
        """Test registering with existing email"""
        # First registration
        self.client.post(self.register_url, data=self.user_dict)
        # Second registration attempt
        response = self.client.post(self.register_url, data=self.user_dict)
        self.assertEqual(response.status_code, 404)
        self.assertEqual(len(mail.outbox), 0)

    def test_registration_and_verification_edge_cases(self):
        """Test successful user registration and verification.
        Chronology of this test:
            - registering new user
            - trying to login with this unverifed user
            - resending verification email
            - resending verification email (this above will be expired)
            - sending old token from first email (will be expired)
            - veryfing user with the newest email (will be ok)
            - testing if email verification obj, and user obj changes after verification
            - testing if user could login
            - testing if user could logout
        """
        # Register new user
        response = self.client.post(
            self.register_url,
            data={
                "email": self.user_dict["email"],
                "password_1": self.user_dict["password"],
                "password_2": self.user_dict["password"],
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)

        # Try to login with unverifed user.
        login_response = self.client.post(
            self.login_url,
            data={
                "email": self.user_dict["email"],
                "password": self.user_dict["password"],
            },
        )

        self.assertEqual(
            login_response.status_code,
            401,
            msg=f"Trying to login with unverified user. Response should be 401 with proper information of error: {login_response.data, login_response.status_code}",
        )

        # Resend verification e-mail
        response = self.client.post(
            self.resend_verification_email_url,
            data={
                "email": self.user_dict["email"],
            },
        )
        print(
            "Testing resending verification e-mail with user that exists: ",
            response.data,
            response.status_code,
        )
        self.assertEqual(
            response.status_code,
            200,
            msg=f"Testing resending verification e-mail with user that exists: {response.data}, {response.status_code}",
        )

        self.assertEqual(len(mail.outbox), 2)
        email = mail.outbox.pop()
        self.assertEqual(email.to, [self.user_dict["email"]])

        match = re.search(self.verification_url_pattern, email.body)
        first_verification_url = match.group(0)

        # Resend new verification e-mail, old one will be expired
        response = self.client.post(
            self.resend_verification_email_url,
            data={
                "email": self.user_dict["email"],
            },
        )

        # Get data from old verification link
        verify_get_response = self.client.get(first_verification_url).data

        # Send old one token to verify user (it will be expired)
        response = self.client.post(
            first_verification_url,
            data={
                "verify_token": verify_get_response["verify_token"],
                "uid": verify_get_response["uid"],
            },
        )

        self.assertEqual(
            400,
            response.status_code,
            msg=f"Old verify token should be expired (400) {response}",
        )

        # Check if e-mail is sended, search with regex for a verification link
        self.assertEqual(len(mail.outbox), 2)
        email = mail.outbox.pop()
        mail.outbox.pop()
        self.assertEqual(email.to, [self.user_dict["email"]])

        match = re.search(self.verification_url_pattern, email.body)
        verification_url = match.group(0)

        print("Extracted url from e-mail: ", verification_url)
        verify_get_response = self.client.get(verification_url).data
        print("new: ", verification_url, "old: ", first_verification_url)

        # Get user.is_verify before verification
        user_before = User.objects.get(email=self.user_dict["email"])
        user_before_is_active = user_before.is_active
        email_before = EmailVerification.objects.get(
            user__email=self.user_dict["email"]
        )
        email_before_is_verified = email_before.verified
        print(
            "EmailVerification.verifed before verification: ", email_before_is_verified
        )
        print("User.is_active before verification: ", user_before_is_active)

        # Send same user data to RegisterView after creating not verified user.
        response = self.client.post(
            self.register_url,
            data={
                "email": self.user_dict["email"],
                "password_1": self.user_dict["password"],
                "password_2": self.user_dict["password"],
            },
        )

        self.assertEqual(
            response.status_code,
            401,
            msg=f"Post to register APIView data of user that already exists: {response.data, response.status_code}",
        )

        # Post wrong uid data with correct token to verification APIView
        response = self.client.post(
            verification_url,
            data={
                "uid": verify_get_response["uid"] + "xd",
                "verify_token": verify_get_response["verify_token"],
            },
        )

        print(
            "Testing e-mail verification (invalid uid)",
            response.data,
            response.status_code,
        )
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data["error"], "User not found.")

        # Posting wrong data (token) to verification APIView
        response = self.client.post(
            verification_url,
            data={
                "uid": verify_get_response["uid"],
                "verify_token": verify_get_response["verify_token"] + "124123vlksj",
            },
        )

        print(
            "Testing e-mail verification (invalid token)",
            response.data,
            response.status_code,
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data["error"],
            "Token expired.",
            msg=f"Checking if {response.data['error']} is 'Token expired",
        )

        # Check if user is not active after posting invalid data.
        #  Also check if EmailVerification object related to the user is not verifed at all
        user_before_verification = User.objects.get(email=self.user_dict["email"])
        self.assertEqual(
            user_before_verification.is_active,
            False,
            msg=f"Checking if user object before verification is not active",
        )
        email_obj_before_verification = EmailVerification.objects.get(
            user__email=self.user_dict["email"]
        )
        self.assertEqual(
            email_obj_before_verification.verified,
            False,
            msg=f"Checking if email object before verification is False",
        )

        # Test if user could resend verification e-mail with user that does not exists
        response = self.client.post(
            self.resend_verification_email_url,
            data={
                "email": "testtttttttttrrrrr@gmail.com",
            },
        )
        print(
            "Testing resending verification e-mail with user that doesn't exists: ",
            response.data,
            response.status_code,
        )
        self.assertEqual(
            response.status_code,
            404,
            msg=f"Testing resending verification e-mail with user that doesn't exists: {response.data}, {response.status_code}",
        )

        # Posting proper data to verification APIView, to verify our created user
        response = self.client.post(
            verification_url,
            data={
                "uid": verify_get_response["uid"],
                "verify_token": verify_get_response["verify_token"],
            },
        )

        print(
            "Testing e-mail verification (correct data)",
            response.data,
            response.status_code,
        )
        self.assertEqual(
            response.status_code,
            200,
            msg=f"Testing e-mail verification (correct data): {response.data}, {response.status_code}",
        )

        # Test if user was verified properly after sending proper data
        user_after_verification = User.objects.get(email=self.user_dict["email"])
        print(
            "\nUser.is_active before verification: ",
            user_before_is_active,
            "\n",
            "User.is_active after verification: ",
            user_after_verification.is_active,
        )
        # Check if user.is_active changed properly
        self.assertNotEqual(user_before_is_active, user_after_verification.is_active)

        # Check if EmailVerification after verification changed
        self.assertNotEqual(
            email_before_is_verified,
            EmailVerification.objects.get(user__email=self.user_dict["email"]).verified,
        )

        # Check if user could login
        login_response = self.client.post(
            self.login_url,
            data={
                "email": self.user_dict["email"],
                "password": self.user_dict["password"],
            },
        )

        self.assertEqual(login_response.status_code, 200)

        # Test logout (via http cookies)
        response = self.client.post(
            self.logout_url,
            cookies=login_response.cookies,
        )

        print("logout response: ", response, " ", response.data)
        self.assertEqual(200, response.status_code)

        print("test registration and verification edge cases passed.")

    def test_password_reset(self):
        """Testing registration, verification and changing password"""

        # Register new user
        response = self.client.post(
            self.register_url,
            data={
                "email": self.user_dict["email"],
                "password_1": self.user_dict["password"],
                "password_2": self.user_dict["password"],
            },
        )

        self.assertEqual(response.status_code, 200)

        # Verify new user
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox.pop()
        self.assertEqual(email.to, [self.user_dict["email"]])

        match = re.search(self.verification_url_pattern, email.body)
        verification_url = match.group(0)

        # Get data from "GET" method
        verify_get_response = self.client.get(verification_url).data
        # Send it via "POST" method to verify user
        response = self.client.post(verification_url, data=verify_get_response)

        print(f"Verifing user: {response.data}")
        self.assertEqual(
            200,
            response.status_code,
            msg=f"Veryfing new user should work (all data is proper)",
        )

        # Change password
        response = self.client.post(
            self.reset_password_url,
            data={
                "email": self.user_dict["email"],
            },
        )

        # Get e-mail url
        self.assertEqual(
            response.status_code,
            200,
            msg=f"Sending post request to send password reset e-mail {response.data, response.status_code}",
        )
        self.assertEqual(len(mail.outbox), 1)
        password_reset_email = mail.outbox.pop()
        print("Password reset email:", password_reset_email.body)
        self.assertEqual(
            password_reset_email.to[0],
            self.user_dict["email"],
            msg="Email should be sended to email that wants to get it",
        )
        match = re.search(self.password_reset_url_pattern, password_reset_email.body)
        password_verification_url = match.group(0)
        print("Extracted url from password reset e-mail: ", password_verification_url)
        password_change_email_get_response = self.client.get(
            password_verification_url
        ).data
        print(
            "Response from GET response to verify password reset view:",
            password_change_email_get_response,
        )

        password_change_email_get_response["password_1"] = "RtvEuroAgd"
        password_change_email_get_response["password_2"] = "RtvEuroAgd"

        # POST proper data to reset password
        response = self.client.post(
            password_verification_url, data=password_change_email_get_response
        )

        self.assertEqual(200, response.status_code)

        # login with new password
        response = self.client.post(
            self.login_url,
            data={"email": self.user_dict["email"], "password": "RtvEuroAgd"},
        )

        self.assertEqual(200, response.status_code)

        # check if old password doesnt work
        response = self.client.post(
            self.login_url,
            data={
                "email": self.user_dict["email"],
                "password": self.user_dict["password"],
            },
        )

        self.assertEqual(401, response.status_code)

    # This maybe will be on other test Class
    def test_http_cookie_auth(self):
        pass

    def test_headers_bearer_token_auth(self):
        pass

    def test_registration_and_login_views(self):
        pass


class EmailVerificationTestCase(AuthenticationAPITestCase):
    def setUp(self):
        super().setUp()

    def test_successful_verification(self):
        """Test successful email verification"""
        response = self.client.post(
            self.register_url,
            data={
                "email": self.user_dict["email"],
                "password_1": self.user_dict["password"],
                "password_2": self.user_dict["password"],
            },
        )

        # Verify new user
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox.pop()
        self.assertEqual(email.to, [self.user_dict["email"]])

        match = re.search(self.verification_url_pattern, email.body)
        verification_url = match.group(0)

        # Get data from "GET" method
        verify_get_response = self.client.get(verification_url).data

        # Test if we could verify user with invalid token
        response = self.client.post(
            verification_url,
            data={
                "uid": verify_get_response["uid"],
                "verify_token": verify_get_response["verify_token"] + "1231kl",
            },
        )
        self.assertEqual(400, response.status_code)

        # Test if we could verify user that doesn't exists in DB
        response = self.client.post(
            verification_url,
            data={
                "uid": verify_get_response["uid"] + "!XD",
                "verify_token": verify_get_response["verify_token"],
            },
        )
        # It returns User not found!
        self.assertEqual(404, response.status_code)

        # TESTING if user token would work for another user
        response = self.client.post(
            self.register_url,
            data={
                "email": "example@examplee.com",
                "password_1": self.user_dict["password"],
                "password_2": self.user_dict["password"],
            },
        )

        # Verify newer user
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox.pop()
        self.assertEqual(email.to, ["example@examplee.com"])

        match = re.search(self.verification_url_pattern, email.body)
        verification_url_second_user = match.group(0)

        # Get data from "GET" method
        verify_newer_user_get_response = self.client.get(
            verification_url_second_user
        ).data
        response = self.client.post(
            verification_url_second_user,
            data={
                "uid": verify_newer_user_get_response["uid"],
                "verify_token": verify_get_response["verify_token"],
            },
        )
        print("Sending verify e-mail with other user token", response.data)
        self.assertEqual(400, response.status_code)

        # Test if we could send invalid data
        response = self.client.post(
            verification_url,
            data={
                "uid": 123,
                "verify_token": verify_get_response["verify_token"] + "1231kl",
            },
        )
        self.assertEqual(404, response.status_code)

        # Send it via "POST" method to verify user
        response = self.client.post(verification_url, data=verify_get_response)

        self.assertEqual(
            200,
            response.status_code,
            msg="Veryfing new user - it should work (all data is properly sended)",
        )

    def test_resend_verification_email(self):
        """Test resending verification email"""
        response = self.client.post(
            self.register_url,
            data={
                "email": self.user_dict["email"],
                "password_1": self.user_dict["password"],
                "password_2": self.user_dict["password"],
            },
        )
        self.assertEqual(200, response.status_code)

        # Verify new user
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox.pop()
        self.assertEqual(email.to, [self.user_dict["email"]])

        match = re.search(self.verification_url_pattern, email.body)
        verification_url = match.group(0)

        # Get data from "GET" method
        verify_get_response = self.client.get(verification_url).data

        # Resend verification email
        response = self.client.post(
            self.resend_verification_email_url, data={"email": self.user_dict["email"]}
        )
        self.assertEqual(200, response.status_code)

        self.assertEqual(len(mail.outbox), 1)
        verify_email_1 = mail.outbox.pop()
        self.assertEqual(verify_email_1.to, [self.user_dict["email"]])
        match = re.search(self.verification_url_pattern, verify_email_1.body)
        verification_url_1 = match.group(0)
        # Get data from "GET" method
        resend_verify_get_response = self.client.get(verification_url_1).data

        # Check if token is diffrent
        self.assertNotEqual(
            verify_get_response["verify_token"],
            resend_verify_get_response["verify_token"],
        )

        # Test if we could verify user with expired token
        response = self.client.post(
            verification_url,
            data={
                "uid": verify_get_response["uid"],
                "verify_token": verify_get_response["verify_token"],
            },
        )
        self.assertEqual(400, response.status_code)

        # Now resend verification email again.
        response = self.client.post(
            self.resend_verification_email_url, data={"email": self.user_dict["email"]}
        )
        self.assertEqual(200, response.status_code)

        self.assertEqual(len(mail.outbox), 1)
        verify_email_2 = mail.outbox.pop()
        self.assertEqual(verify_email_2.to, [self.user_dict["email"]])
        match = re.search(self.verification_url_pattern, verify_email_2.body)
        verification_url_2 = match.group(0)

        # Get data from "GET" method
        resend_verify_get_response_2 = self.client.get(verification_url_2).data

        # Check if third verify token is diffrent than other.
        self.assertNotEqual(
            resend_verify_get_response["verify_token"],
            resend_verify_get_response_2["verify_token"],
        )
        self.assertNotEqual(
            resend_verify_get_response_2["verify_token"],
            verify_get_response["verify_token"],
        )

        # Check if we could verify user with second verify token
        response = self.client.post(
            verification_url,
            data={
                "uid": verify_get_response["uid"],
                "verify_token": resend_verify_get_response["verify_token"],
            },
        )
        self.assertEqual(400, response.status_code)

        # Check if we could verify user with first token
        response = self.client.post(
            verification_url,
            data={
                "uid": verify_get_response["uid"],
                "verify_token": verify_get_response["verify_token"],
            },
        )
        self.assertEqual(400, response.status_code)

        # Check if we could verify user with neweset token
        response = self.client.post(
            verification_url,
            data={
                "uid": verify_get_response["uid"],
                "verify_token": resend_verify_get_response_2["verify_token"],
            },
        )
        self.assertEqual(200, response.status_code)

    def test_resend_verification_email_to_non_existing_user(self):
        response = self.client.post(
            self.resend_verification_email_url,
            data={
                "email": "testtttttttttrrrrr@gmail.com",
            },
        )
        print(
            "Testing resending verification e-mail with user that doesn't exists: ",
            response.data,
            response.status_code,
        )
        self.assertEqual(
            response.status_code,
            404,
            msg=f"Testing resending verification e-mail with user that doesn't exists: {response.data}, {response.status_code}",
        )
        self.assertEqual(len(mail.outbox), 0)


class LoginTestCase(AuthenticationAPITestCase):
    def setUp(self):
        super().setUp()
        print("Starting LoginTestCase")
        # Create and verify a test user
        self.auth_user = User.objects.create_user(
            username=self.user_dict["email"],
            password=self.user_dict["password"],
            email=self.user_dict["email"],
        )
        self.auth_user.is_active = True
        self.auth_user.save()

    def test_successful_login(self):
        """Test valid login credentials"""
        response = self.client.post(self.login_url, data=self.user_dict)
        self.assertEqual(response.status_code, 200)
        self.assertIn("token", response.data)

        # Check if token is created successfully
        token = Token.objects.get(key=response.data["token"])
        self.assertEqual(token.key, response.data["token"])

    def test_invalid_login(self):
        """Test invalid login credentials"""
        response = self.client.post(
            self.login_url, data={"email": self.user_dict["email"], "password": "wrong"}
        )
        self.assertEqual(response.status_code, 401)

        response = self.client.post(
            self.login_url,
            data={
                "email": self.user_dict["email"],
                "password": self.user_dict["password"] + "123",
            },
        )
        self.assertEqual(response.status_code, 401)

    def test_two_sessions_on_one_account(self):
        """Test two sessions on one account, login on two sessions and then logout on one and check if second session is still authorized"""
        response = self.client.post(
            self.login_url,
            data={
                "email": self.user_dict["email"],
                "password": self.user_dict["password"],
            },
        )
        self.assertEqual(response.status_code, 200)

        response = self.client.get(self.login_url, cookies=response.cookies)
        print("Testing cookies auth:", response.data)
        self.assertEqual(response.data["is_auth"], True)

        response_2 = self.client.post(
            self.login_url,
            data={
                "email": self.user_dict["email"],
                "password": self.user_dict["password"],
            },
        )
        self.assertEqual(response_2.status_code, 200)

        response = self.client.post(self.logout_url, cookies=response.cookies)
        self.assertEqual(response.status_code, 200)

        new_client = APIClient()
        response_2 = new_client.get(self.login_url, cookies=response_2.cookies)
        self.assertEqual(False, response_2.data["is_auth"])

    def test_if_login_view_rotates_token(self):
        """
        Check if new Token is created when old one expires, after user successfully logs in
        """
        # Step 1: Perform initial login to get a token
        response = self.client.post(
            self.login_url,
            data={
                "email": self.user_dict["email"],
                "password": self.user_dict["password"],
            },
            format="json",  # Assuming JSON data; adjust if needed
        )
        self.assertEqual(response.status_code, 200)

        # Step 2: Get the initial token from the cookie
        initial_token = response.cookies.get("auth_token").value
        token_obj = Token.objects.get(key=initial_token)

        # Step 3: Verify the token is assigned to the correct user
        self.assertEqual(token_obj.user.email, self.user_dict["email"])

        # Step 4: Manually expire the token by setting expires_at to a past date
        token_obj.expires_at = now() - timedelta(days=1)  # Expired 1 day ago
        token_obj.save()

        # Step 5: Log in again with the expired token
        new_client = APIClient()
        response = new_client.post(
            self.login_url,
            data={
                "email": self.user_dict["email"],
                "password": self.user_dict["password"],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)

        # Step 6: Get the new token from the cookie
        new_token = response.cookies.get("auth_token").value

        # Step 7: Verify that a new token was created (different from the initial one)
        self.assertNotEqual(initial_token, new_token)

        # Step 8: Verify the new token exists in the database and is assigned to the user
        new_token_obj = Token.objects.get(key=new_token)
        self.assertEqual(new_token_obj.user.email, self.user_dict["email"])

        # Step 9: Verify the old token was deleted
        self.assertFalse(Token.objects.filter(key=initial_token).exists())

    def test_if_unsuccessfull_login_dont_create_token(self):
        response = self.client.post(
            self.login_url,
            data={
                "email": self.user_dict["email"],
                "password": self.user_dict["password"] + "123",
            },
        )
        self.assertEqual(401, response.status_code)
        self.assertFalse(
            Token.objects.filter(user__email=self.user_dict["email"]).exists()
        )


class PasswordResetTestCase(AuthenticationAPITestCase):
    def setUp(self):
        print("Starting PasswordResetTestCase")
        super().setUp()
        self.register_and_verify_user()

    def register_and_verify_user(self):
        # Create user here
        response = self.client.post(
            self.register_url,
            data={
                "email": self.user_dict["email"],
                "password_1": self.user_dict["password"],
                "password_2": self.user_dict["password"],
            },
        )
        self.assertEqual(200, response.status_code)
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox.pop()
        self.assertEqual(email.to, [self.user_dict["email"]])

        match = re.search(self.verification_url_pattern, email.body)
        verification_url = match.group(0)

        # Get data from "GET" method
        verify_get_response = self.client.get(verification_url).data
        response = self.client.post(verification_url, verify_get_response)
        self.assertEqual(200, response.status_code)
        print("Created user!")

    def test_successful_password_reset(self):
        """Test complete password reset flow"""

        response = self.client.post(
            self.reset_password_url, data={"email": self.user_dict["email"]}
        )
        self.assertEqual(200, response.status_code)
        self.assertEqual(len(mail.outbox), 1)

        email = mail.outbox.pop()
        self.assertEqual(email.to, [self.user_dict["email"]])
        match = re.search(self.password_reset_url_pattern, email.body)
        password_reset_url = match.group(0)
        # Get data from GET response
        password_reset_data = self.client.get(password_reset_url).data

        # Send inproper data to reset password (inproper token)
        response = self.client.post(
            password_reset_url,
            data={
                "uid": password_reset_data["uid"],
                "verify_token": password_reset_data["verify_token"] + "123",
                "password_1": self.user_dict["password"] + "1",
                "password_2": self.user_dict["password"] + "1",
            },
        )

        self.assertEqual(409, response.status_code)

        # Send unmatched password
        response = self.client.post(
            password_reset_url,
            data={
                "uid": password_reset_data["uid"],
                "verify_token": password_reset_data["verify_token"],
                "password_1": self.user_dict["password"] + "12",
                "password_2": self.user_dict["password"] + "1",
            },
        )

        self.assertEqual(400, response.status_code)

        # User password:
        old_password = User.objects.get(email=self.user_dict["email"]).password

        # Send valid data
        response = self.client.post(
            password_reset_url,
            data={
                "uid": password_reset_data["uid"],
                "verify_token": password_reset_data["verify_token"],
                "password_1": self.user_dict["password"] + "1",
                "password_2": self.user_dict["password"] + "1",
            },
        )

        self.assertEqual(200, response.status_code)

        new_password = User.objects.get(email=self.user_dict["email"]).password

        # Check if password changed
        self.assertNotEqual(old_password, new_password)

        # Try to login with old password
        response = self.client.post(
            self.login_url,
            data={
                "email": self.user_dict["email"],
                "password": self.user_dict["password"],
            },
        )
        self.assertEqual(401, response.status_code)

        # Login after changing password
        response = self.client.post(
            self.login_url,
            data={
                "email": self.user_dict["email"],
                "password": self.user_dict["password"] + "1",
            },
        )

        self.assertEqual(200, response.status_code)

    def test_sending_password_reset_email_to_non_existent_user(self):
        """Testing if sending email works to non existent user"""
        response = self.client.post(
            self.reset_password_url, data={"email": "exampleee@exampleee.com"}
        )

        self.assertEqual(404, response.status_code)

    def test_unverified_user_reseting_password(self):
        """Testing if unverifed user could send reset password"""
        response = self.client.post(
            self.register_url,
            data={
                "email": "exam@example.com",
                "password_1": self.user_dict["password"],
                "password_2": self.user_dict["password"],
            },
        )
        self.assertEqual(200, response.status_code)
        self.assertEqual(len(mail.outbox), 1)

        response = self.client.post(
            self.reset_password_url, data={"email": "exam@example.com"}
        )
        self.assertEqual(404, response.status_code)

    def test_second_resend_password_reset_email(self):
        """Check if we could change password with first token, after we send second password reset email"""
        old_password = User.objects.get(email=self.user_dict["email"]).password

        # Send first email
        response = self.client.post(
            self.reset_password_url, data={"email": self.user_dict["email"]}
        )
        # Check if first email arrived
        self.assertEqual(200, response.status_code)
        self.assertEqual(len(mail.outbox), 1)

        email = mail.outbox.pop()
        self.assertEqual(email.to, [self.user_dict["email"]])
        match = re.search(self.password_reset_url_pattern, email.body)
        password_reset_url = match.group(0)
        # Get data from GET response
        password_reset_data = self.client.get(password_reset_url).data

        # Check if ResetPasswordToken is created successfully
        reset_password_token_obj = ResetPasswordToken.objects.all().first()
        self.assertEqual(reset_password_token_obj.user.email, self.user_dict["email"])

        # Send second email
        response = self.client.post(
            self.reset_password_url, data={"email": self.user_dict["email"]}
        )
        # Check if second email arrived
        self.assertEqual(200, response.status_code)
        self.assertEqual(len(mail.outbox), 1)

        # Check if second ResetPasswordToken is created successfully (first one object should be deleted in DB)
        all_password_reset_tokens = ResetPasswordToken.objects.all()
        self.assertEqual(len(all_password_reset_tokens), 1)

        email = mail.outbox.pop()
        self.assertEqual(email.to, [self.user_dict["email"]])
        match = re.search(self.password_reset_url_pattern, email.body)
        password_reset_url_2 = match.group(0)
        # Get data from GET response
        password_reset_data_2 = self.client.get(password_reset_url_2).data

        # Check if UID of data is same
        self.assertEqual(password_reset_data["uid"], password_reset_data_2["uid"])

        # Now after sending two emails send first token to reset password
        response = self.client.post(
            password_reset_url_2,
            data={
                "uid": password_reset_data["uid"],
                "verify_token": password_reset_data["verify_token"],
                "password_1": self.user_dict["password"] + "1",
                "password_2": self.user_dict["password"] + "1",
            },
        )

        self.assertEqual(409, response.status_code)

        response = self.client.post(
            password_reset_url,
            data={
                "uid": password_reset_data["uid"],
                "verify_token": password_reset_data_2["verify_token"],
                "password_1": self.user_dict["password"] + "1",
                "password_2": self.user_dict["password"] + "1",
            },
        )
        self.assertEqual(
            200,
            response.status_code,
            msg=f"response (after sending proper reset password token): {response.data}",
        )

        # Check if old password is changed
        new_password = User.objects.get(email=self.user_dict["email"]).password
        print(f"New password: {new_password}, old password: {old_password}")
        self.assertNotEqual(new_password, old_password)

        # Check if PasswordResetToken is deleted successfully
        all_password_reset_tokens = ResetPasswordToken.objects.all()
        self.assertEqual(len(all_password_reset_tokens), 0)

        # Try to login with old password
        response = self.client.post(
            self.login_url,
            data={
                "email": self.user_dict["email"],
                "password": self.user_dict["password"],
            },
        )
        self.assertEqual(401, response.status_code)

        # Try to login with new password
        response = self.client.post(
            self.login_url,
            data={
                "email": self.user_dict["email"],
                "password": self.user_dict["password"] + "1",
            },
        )
        self.assertEqual(200, response.status_code)

    def test_if_reset_password_removes_auth_token(self):
        """Testing if changing password removes auth token from db (it should of course)"""
        # Login user
        response = self.client.post(
            self.login_url,
            data={
                "email": self.user_dict["email"],
                "password": self.user_dict["password"],
            },
        )

        self.assertEqual(200, response.status_code)

        # Check if user is authorized with this token
        first_auth_cookies = response.cookies

        # Check if user is authorized
        response = self.client.get(self.login_url, cookies=first_auth_cookies)
        self.assertEqual(response.data["is_auth"], True)

        # Get this freshly created token
        user = User.objects.get(email=self.user_dict["email"])
        old_token = Token.objects.get(user=user)
        tokens = Token.objects.all()
        self.assertEqual(len(tokens), 1)

        # Send reset password email
        response = self.client.post(
            self.reset_password_url, data={"email": self.user_dict["email"]}
        )

        # Check if first email arrived
        self.assertEqual(200, response.status_code)
        self.assertEqual(len(mail.outbox), 1)

        email = mail.outbox.pop()
        self.assertEqual(email.to, [self.user_dict["email"]])
        match = re.search(self.password_reset_url_pattern, email.body)
        password_reset_url = match.group(0)
        # Get data from GET response
        password_reset_data = self.client.get(password_reset_url).data

        # Check if ResetPasswordToken is related to user
        self.assertEqual(
            self.user_dict["email"], ResetPasswordToken.objects.all().first().user.email
        )

        all_password_reset_tokens = ResetPasswordToken.objects.all()
        print(
            "All password_reset_tokens:",
            all_password_reset_tokens,
            len(all_password_reset_tokens),
        )

        # Send password email confirmation and check if auth token and password reset token is deleted succesfully
        response = self.client.post(
            password_reset_url,
            data={
                "uid": password_reset_data["uid"],
                "verify_token": password_reset_data["verify_token"],
                "password_1": self.user_dict["password"] + "123",
                "password_2": self.user_dict["password"] + "123",
            },
        )

        self.assertEqual(response.status_code, 200)
        second_auth_cookies = response.cookies

        # Check if token is deleted successfully
        all_password_reset_tokens = ResetPasswordToken.objects.all()
        print(
            "All password_reset_tokens:",
            all_password_reset_tokens,
            len(all_password_reset_tokens),
        )
        self.assertEqual(len(all_password_reset_tokens), 0)

        # Check if old auth token is removed:
        new_token = Token.objects.all().first()
        print(f"New auth token: {new_token.key}, old token: {old_token.key}")
        self.assertNotEqual(new_token.key, old_token.key)
        print(f"Old cookies: {first_auth_cookies}, New cookies: {second_auth_cookies}")

        removed_token = Token.objects.filter(key=old_token)
        self.assertEqual(len(removed_token), 0)

        # Check if user will be authorized with new token (token from proper password reset response)
        print("First request")
        response = self.client.get(self.login_url, cookies=second_auth_cookies)
        self.assertEqual(response.data["is_auth"], True)

        # Check if user is still authorized with old token (we need to create new client, because of some type of cookies bug(?))
        print("Second request")
        new_client = APIClient()
        response = new_client.get(self.login_url, cookies=first_auth_cookies)
        self.assertEqual(response.data["is_auth"], False)

    def test_invalid_data(self):
        """Testing sending unmatched passwords, too short password, invalid token, and invalid uid"""
        # Send reset password email
        response = self.client.post(
            self.reset_password_url, data={"email": self.user_dict["email"]}
        )
        self.assertEqual(200, response.status_code)
        self.assertEqual(len(mail.outbox), 1)

        email = mail.outbox.pop()
        self.assertEqual(email.to, [self.user_dict["email"]])
        match = re.search(self.password_reset_url_pattern, email.body)
        password_reset_url = match.group(0)
        # Get data from GET response
        password_reset_data = self.client.get(password_reset_url).data

        # Check if ResetPasswordToken is related to user
        self.assertEqual(
            self.user_dict["email"], ResetPasswordToken.objects.all().first().user.email
        )

        all_password_reset_tokens = ResetPasswordToken.objects.all()
        print(
            "All password_reset_tokens:",
            all_password_reset_tokens,
            len(all_password_reset_tokens),
        )

        # Send unmatched password
        response = self.client.post(
            password_reset_url,
            data={
                "uid": password_reset_data["uid"],
                "verify_token": password_reset_data["verify_token"],
                "password_1": self.user_dict["password"] + "123",
                "password_2": self.user_dict["password"] + "1234",
            },
        )
        self.assertEqual(response.status_code, 400)

        # Send to short password
        response = self.client.post(
            password_reset_url,
            data={
                "uid": password_reset_data["uid"],
                "verify_token": password_reset_data["verify_token"],
                "password_1": "123",
                "password_2": "123",
            },
        )
        self.assertEqual(response.status_code, 406)

        # Send invalid UID
        print("Sending invalid UID!!!")
        response = self.client.post(
            password_reset_url,
            data={
                "uid": "NDI",
                "verify_token": password_reset_data["verify_token"],
                "password_1": self.user_dict["password"] + "123",
                "password_2": self.user_dict["password"] + "123",
            },
        )
        self.assertEqual(response.status_code, 404)

        # Send invalid token
        response = self.client.post(
            password_reset_url,
            data={
                "uid": password_reset_data["uid"],
                "verify_token": password_reset_data["verify_token"] + "123",
                "password_1": self.user_dict["password"] + "123",
                "password_2": self.user_dict["password"] + "123",
            },
        )
        self.assertEqual(response.status_code, 409)

    # TODO check two users test


class LogoutTestCase(AuthenticationAPITestCase):
    def setUp(self):
        super().setUp()
        print("Starting LogoutTestCase")
        # Create and verify a test user
        self.auth_user = User.objects.create_user(
            username=self.user_dict["email"],
            password=self.user_dict["password"],
            email=self.user_dict["email"],
        )
        self.auth_user.is_active = True
        self.auth_user.save()

    def test_successful_logout(self):
        """Test token invalidation after logout"""
        # Login user
        response = self.client.post(
            self.login_url,
            data={
                "email": self.user_dict["email"],
                "password": self.user_dict["password"],
            },
        )
        self.assertEqual(response.status_code, 200)

        cookies = response.cookies

        # Check if user is authorized
        response = self.client.get(self.login_url, cookies=cookies)
        self.assertEqual(response.data["is_auth"], True)
        print("Before deleting token", response.data)

        # Logout
        response = self.client.post(self.logout_url, cookies=cookies)
        self.assertEqual(response.status_code, 200)

        # Check if token is deleted
        response = self.client.get(self.login_url, cookies=cookies)
        self.assertEqual(response.data["is_auth"], False)
        print("After deleting token", response.data)


class ExpiringTokenTestCase(AuthenticationAPITestCase):
    """
    ExpiringToken test cases, for checking if token expires.
    """

    def setUp(self):
        return super().setUp()

    def check_if_token_expires(self):
        """
        Check if token could expire
        """

        # Login with self.client
        response = self.client.post(
            self.login_url,
            data={
                "email": self.user_dict["email"],
                "password": self.user_dict["password"],
            },
        )

        # self.client should be authorized because of httpCookies
        response = self.client.get(
            self.login_url,
        )
        self.assertEqual(response.data["is_auth"], True)

        # new_client should not be authorized because httpCookies doesn't exists.
        new_client = APIClient()
        response = new_client.get(self.login_url)
        self.assertEqual(response.data["is_auth"], False)

        # Get old token
        initial_token = Token.objects.get(
            key=self.client.cookies.get("auth_token").value
        )

        # Verify the token is assigned to the correct user
        self.assertEqual(initial_token.user.email, self.user_dict["email"])

        # Manually expire the token by setting expires_at to a past date
        initial_token.expires_at = now() - timedelta(days=1)  # Expired 1 day ago
        initial_token.save()

        # Check if Token expired
        response = self.client.get(
            self.login_url,
        )
        self.assertEqual(response.data["is_auth"], False)


class ExpiringTokenEndpointsTestCase(APITestCase):
    """
    Testing if authorization works properly on other enpoints
    """

    def setUp(self):
        # Get URLs to test rest API
        self.verification_url_pattern = r"http://localhost:8000/accounts/verify/\w+/\w+"
        self.login_url = reverse("login")
        self.logout_url = reverse("logout")

        # Set up client
        self.client = APIClient()

        # Set up account in DB
        self.user_dict = {
            "email": "adminadminamdin@adminxd.com",
            "password": "Testpassword123",
        }
        self.user = User.objects.create_user(
            username=self.user_dict["email"],
            password=self.user_dict["password"],
            email=self.user_dict["email"],
        )
        self.user.is_active = True
        self.user.save()
