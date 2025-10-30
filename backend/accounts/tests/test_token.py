from django.urls import reverse, resolve
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from accounts.models import ExpiringToken, User
from unittest.mock import patch
from datetime import timedelta
from django.utils import timezone


class TokenHealthViewTestCase(APITestCase):
    def setUp(self):
        self.url = reverse("token-health")
        self.client = APIClient()

        self.user = User.objects.create_user(
            email="user@example.com",
            username="user@example.com",
            password="password123",
        )

        self.valid_token = ExpiringToken.objects.create(user=self.user)
        self.invalid_token_key = "invalid1234567890"

    def test_url_resolves_to_correct_view(self):
        resolver = resolve(self.url)
        self.assertEqual(resolver.func.view_class.__name__, "TokenHealthView")

    def test_no_cookie_returns_no_cookie_reason(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["valid"], False)
        self.assertEqual(response.data["reason"], "no_cookie")

    def test_invalid_token_cookie(self):
        self.client.cookies["auth_token"] = self.invalid_token_key
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["valid"], False)
        self.assertEqual(response.data["reason"], "invalid")
        self.assertIn("auth_token", response.cookies)
        self.assertEqual(response.cookies["auth_token"].value, "")

    def test_expired_token_cookie(self):
        # reuse the existing token to avoid unique constraint
        expired_token = self.valid_token
        expired_token.created = timezone.now() - timedelta(days=10)
        expired_token.save(update_fields=["created"])

        self.client.cookies["auth_token"] = expired_token.key

        with patch.object(ExpiringToken, "has_expired", return_value=True):
            response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["valid"], False)
        self.assertEqual(response.data["reason"], "expired")
        self.assertFalse(ExpiringToken.objects.filter(key=expired_token.key).exists())
        self.assertIn("auth_token", response.cookies)
        self.assertEqual(response.cookies["auth_token"].value, "")

    def test_valid_token_cookie(self):
        self.client.cookies["auth_token"] = self.valid_token.key

        with patch.object(ExpiringToken, "has_expired", return_value=False):
            response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["valid"], True)
        self.assertEqual(response.data["reason"], "ok")
        self.assertNotIn("auth_token", response.cookies)
