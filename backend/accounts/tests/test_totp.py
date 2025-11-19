import pyotp
from rest_framework.test import APITestCase, APIClient
from django.contrib.auth import get_user_model
from accounts.models import UserTOTP
from rest_framework.authtoken.models import Token
from django.urls import reverse

User = get_user_model()


class TOTPViewTestCase(APITestCase):
    def setUp(self):
        # Create a test user
        self.user = User.objects.create_user(
            username="totpuser@example.com",
            email="totpuser@example.com",
            password="StrongPass123",
        )
        self.user.is_active = True
        self.user.save()

        # API client
        self.client = APIClient()

        # Login and set token for authenticated requests
        response = self.client.post(
            reverse("user-login"),
            {
                "email": "totpuser@example.com",
                "password": "StrongPass123",
            },
        )
        self.token = response.data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token}")

        # TOTP endpoints
        self.enable_url = reverse("totp-enable")
        self.verify_url = reverse("totp-verify")
        self.disable_url = reverse("totp-disable")
        self.status_url = reverse("totp-status")

    def test_enable_totp(self):
        """Enable TOTP returns secret and QR code"""
        response = self.client.post(self.enable_url)
        self.assertEqual(response.status_code, 200)
        self.assertIn("secret", response.data)
        self.assertIn("qr_image_base64", response.data)

        totp_obj = UserTOTP.objects.get(user=self.user)
        self.assertFalse(totp_obj.confirmed)
        self.assertEqual(totp_obj.secret, response.data["secret"])

    def test_verify_totp_success(self):
        """Verify TOTP with correct code"""
        enable_resp = self.client.post(self.enable_url)
        secret = enable_resp.data["secret"]
        code = pyotp.TOTP(secret).now()

        response = self.client.post(self.verify_url, {"code": code})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "TOTP successfully verified")

        totp_obj = UserTOTP.objects.get(user=self.user)
        self.assertTrue(totp_obj.confirmed)

    def test_verify_totp_invalid(self):
        """Verify TOTP with invalid code fails"""
        self.client.post(self.enable_url)
        response = self.client.post(self.verify_url, {"code": "123456"})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "Invalid TOTP code")

        totp_obj = UserTOTP.objects.get(user=self.user)
        self.assertFalse(totp_obj.confirmed)

    def test_disable_totp(self):
        """Disable TOTP deletes UserTOTP"""
        self.client.post(self.enable_url)
        response = self.client.post(self.disable_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "TOTP disabled")
        self.assertFalse(UserTOTP.objects.filter(user=self.user).exists())

    def test_status_totp(self):
        """Status endpoint shows correct TOTP status"""
        # No TOTP yet
        response = self.client.get(self.status_url)
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["enabled"])

        # Enable TOTP but not verified
        self.client.post(self.enable_url)
        response = self.client.get(self.status_url)
        self.assertEqual(response.data["enabled"], False)

        # Verify TOTP
        totp_obj = UserTOTP.objects.get(user=self.user)
        code = pyotp.TOTP(totp_obj.secret).now()
        self.client.post(self.verify_url, {"code": code})

        # Status should now be enabled
        response = self.client.get(self.status_url)
        self.assertTrue(response.data["enabled"])


class LoginTOTPTestCase(APITestCase):
    def setUp(self):
        self.client = APIClient()

        # Create a test user
        self.user = User.objects.create_user(
            username="totpuser@example.com",
            email="totpuser@example.com",
            password="StrongPass123",
        )
        self.user.is_active = True
        self.user.save()

        # URLs
        self.login_url = reverse("user-login")

    def test_login_without_totp(self):
        """Login succeeds if user has no TOTP"""
        response = self.client.post(
            self.login_url,
            {"email": "totpuser@example.com", "password": "StrongPass123"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("token", response.data)

    def test_login_with_totp_requires_code(self):
        """Login returns 206 if TOTP is enabled but code missing"""
        # Enable TOTP for user
        totp_secret = pyotp.random_base32()
        UserTOTP.objects.create(user=self.user, secret=totp_secret, confirmed=True)

        response = self.client.post(
            self.login_url,
            {"email": "totpuser@example.com", "password": "StrongPass123"},
        )
        self.assertEqual(response.status_code, 206)
        self.assertTrue(response.data.get("require_2fa"))
        self.assertIn("message", response.data)

    def test_login_with_totp_correct_code(self):
        """Login succeeds with correct TOTP code"""
        totp_secret = pyotp.random_base32()
        UserTOTP.objects.create(user=self.user, secret=totp_secret, confirmed=True)

        code = pyotp.TOTP(totp_secret).now()
        response = self.client.post(
            self.login_url,
            {
                "email": "totpuser@example.com",
                "password": "StrongPass123",
                "code": code,
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("token", response.data)

    def test_login_with_totp_wrong_code(self):
        """Login fails with wrong TOTP code"""
        totp_secret = pyotp.random_base32()
        UserTOTP.objects.create(user=self.user, secret=totp_secret, confirmed=True)

        response = self.client.post(
            self.login_url,
            {
                "email": "totpuser@example.com",
                "password": "StrongPass123",
                "code": "000000",
            },
        )
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data["error"], "Invalid TOTP code")
