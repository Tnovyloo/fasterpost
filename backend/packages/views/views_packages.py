from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response

from django.http import HttpResponse
from django.db.models import OuterRef, Subquery
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.utils import timezone

from ..models import Package, Actualization
from accounts.models import User
from postmats.models import Postmat
from payments.models import Payment, WebhookEvent

from ..serializers import SendPackageSerializer
from accounts.authentication import CustomTokenAuthentication

import stripe
from django.conf import settings

from packages.serializers import (
    SendPackageSerializer,
    PaymentSerializer,
    PricingCalculationSerializer,
    PackageSerializer,
    PackageDetailSerializer,
    PackageListSerializer,
)


class UserPackagesView(APIView):
    """
    GET /user/parcels → list of user's shipments
    POST /user/parcels → create new shipment
    """

    def get(self, request):
        user = request.user

        last_status_subquery = (
            Actualization.objects.filter(package_id=OuterRef("pk"))
            .order_by("-created_at")
            .values("status")[:1]
        )

        packages = (
            Package.objects.filter(sender=user)
            .annotate(latest_status=Subquery(last_status_subquery))
            .select_related("origin_postmat", "destination_postmat")
        )

        serializer = PackageListSerializer(packages, many=True)

        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        data = request.data.copy()
        data["sender"] = request.user.id
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
                return Response(
                    {"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND
                )
        except Package.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = PackageDetailSerializer(package)
        return Response(serializer.data, status=status.HTTP_200_OK)


stripe.api_key = settings.STRIPE_SECRET_KEY


class SendPackageView(APIView):
    authentication_classes = [CustomTokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = SendPackageSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        package = serializer.save()

        # Get payment info
        payment = Payment.objects.get(package=package)

        return Response(
            {
                "message": "Package registered. Please complete payment.",
                "package_id": str(package.id),
                "origin_postmat": str(package.origin_postmat.name),
                "unlock_code": package.unlock_code,
                "payment": {
                    "client_secret": payment.stripe_client_secret,
                    "amount": str(payment.amount),
                    "base_price": str(payment.base_price),
                    "size_surcharge": str(payment.size_surcharge),
                    "weight_surcharge": str(payment.weight_surcharge),
                },
            },
            status=status.HTTP_201_CREATED,
        )


class PricingCalculatorView(APIView):
    """Calculate price before creating package"""

    authentication_classes = [CustomTokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PricingCalculationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        pricing = serializer.validated_data["pricing"]

        return Response(
            {
                "size": request.data["size"],
                "weight": request.data["weight"],
                "base_price": str(pricing["base_price"]),
                "size_surcharge": str(pricing["size_surcharge"]),
                "weight_surcharge": str(pricing["weight_surcharge"]),
                "total": str(pricing["total"]),
                "currency": "USD",
            }
        )


class PaymentStatusView(APIView):
    """Check payment status for a package"""

    authentication_classes = [CustomTokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, package_id):
        try:
            package = Package.objects.get(id=package_id, sender=request.user)
            payment = Payment.objects.get(package=package)

            serializer = PaymentSerializer(payment)
            return Response(serializer.data)
        except Package.DoesNotExist:
            return Response(
                {"error": "Package not found"}, status=status.HTTP_404_NOT_FOUND
            )
        except Payment.DoesNotExist:
            return Response(
                {"error": "Payment not found"}, status=status.HTTP_404_NOT_FOUND
            )


@method_decorator(csrf_exempt, name="dispatch")
class StripeWebhookView(APIView):
    """Handle Stripe webhook events"""

    permission_classes = []
    authentication_classes = []

    def post(self, request):
        payload = request.body
        sig_header = request.META.get("HTTP_STRIPE_SIGNATURE")

        print(f"[WEBHOOK DEBUG] Received webhook")
        print(f"[WEBHOOK DEBUG] Signature header: {sig_header}")
        print(
            f"[WEBHOOK DEBUG] Webhook secret configured: {bool(settings.STRIPE_WEBHOOK_SECRET)}"
        )
        print(
            f"[WEBHOOK DEBUG] Webhook secret (first 10 chars): {settings.STRIPE_WEBHOOK_SECRET[:10] if settings.STRIPE_WEBHOOK_SECRET else 'NOT SET'}"
        )

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
            print(f"[WEBHOOK DEBUG] Event verified successfully: {event['type']}")
        except ValueError as e:
            print(f"[WEBHOOK ERROR] Invalid payload: {e}")
            return HttpResponse(status=400)
        except stripe.error.SignatureVerificationError as e:
            print(f"[WEBHOOK ERROR] Invalid signature: {e}")
            print(
                f"[WEBHOOK ERROR] Make sure your STRIPE_WEBHOOK_SECRET matches the CLI output"
            )
            return HttpResponse(status=400)
        except Exception as e:
            print(f"[WEBHOOK ERROR] Unexpected error: {e}")
            return HttpResponse(status=400)

        # Log webhook event
        try:
            WebhookEvent.objects.create(
                stripe_event_id=event["id"], event_type=event["type"], payload=event
            )
            print(f"[WEBHOOK DEBUG] Event logged to database")
        except Exception as e:
            print(f"[WEBHOOK ERROR] Failed to log event: {e}")

        # Handle the event
        try:
            if event["type"] == "payment_intent.succeeded":
                self.handle_payment_succeeded(event["data"]["object"])
            elif event["type"] == "payment_intent.payment_failed":
                self.handle_payment_failed(event["data"]["object"])
            elif event["type"] == "payment_intent.canceled":
                self.handle_payment_canceled(event["data"]["object"])
            else:
                print(f"[WEBHOOK DEBUG] Unhandled event type: {event['type']}")
        except Exception as e:
            print(f"[WEBHOOK ERROR] Error handling event: {e}")
            import traceback

            traceback.print_exc()

        return HttpResponse(status=200)

    def handle_payment_succeeded(self, payment_intent):
        """Handle successful payment"""
        print(f"[WEBHOOK] Processing payment_intent.succeeded: {payment_intent['id']}")
        try:
            payment = Payment.objects.get(stripe_payment_intent_id=payment_intent["id"])
            print(f"[WEBHOOK] Found payment: {payment.id}")

            payment.status = Payment.PaymentStatus.SUCCEEDED
            payment.paid_at = timezone.now()
            payment.payment_method = payment_intent.get("payment_method")
            payment.save()
            print(f"[WEBHOOK] Payment status updated to SUCCEEDED")

            # Update package status
            from packages.models import Actualization

            Actualization.objects.create(
                package_id=payment.package,
                status=Actualization.PackageStatus.WAITING_FOR_PICKUP,
                route_remaining=None,
                courier_id=None,
                warehouse_id=None,
            )
            print(f"[WEBHOOK] Actualization created for package {payment.package.id}")
            print(f"[WEBHOOK] ✓ Payment succeeded for package {payment.package.id}")
        except Payment.DoesNotExist:
            print(
                f"[WEBHOOK ERROR] Payment not found for intent {payment_intent['id']}"
            )
        except Exception as e:
            print(f"[WEBHOOK ERROR] Error in handle_payment_succeeded: {e}")
            import traceback

            traceback.print_exc()

    def handle_payment_failed(self, payment_intent):
        """Handle failed payment"""
        print(
            f"[WEBHOOK] Processing payment_intent.payment_failed: {payment_intent['id']}"
        )
        try:
            payment = Payment.objects.get(stripe_payment_intent_id=payment_intent["id"])
            payment.status = Payment.PaymentStatus.FAILED
            payment.failure_reason = payment_intent.get("last_payment_error", {}).get(
                "message"
            )
            payment.save()

            # Release the stash
            package = payment.package
            stash = package.origin_postmat.stashes.filter(
                size=package.size, is_empty=False
            ).first()

            if stash:
                stash.is_empty = True
                stash.reserved_until = None
                stash.save()
                print(f"[WEBHOOK] Stash released for failed payment")

            print(f"[WEBHOOK] ✓ Payment marked as failed for package {package.id}")
        except Payment.DoesNotExist:
            print(
                f"[WEBHOOK ERROR] Payment not found for intent {payment_intent['id']}"
            )
        except Exception as e:
            print(f"[WEBHOOK ERROR] Error in handle_payment_failed: {e}")
            import traceback

            traceback.print_exc()

    def handle_payment_canceled(self, payment_intent):
        """Handle canceled payment"""
        print(f"[WEBHOOK] Processing payment_intent.canceled: {payment_intent['id']}")
        try:
            payment = Payment.objects.get(stripe_payment_intent_id=payment_intent["id"])
            payment.status = Payment.PaymentStatus.CANCELLED
            payment.save()

            # Release the stash
            package = payment.package
            stash = package.origin_postmat.stashes.filter(
                size=package.size, is_empty=False
            ).first()

            if stash:
                stash.is_empty = True
                stash.reserved_until = None
                stash.save()
                print(f"[WEBHOOK] Stash released for canceled payment")

            print(f"[WEBHOOK] ✓ Payment marked as canceled for package {package.id}")
        except Payment.DoesNotExist:
            print(
                f"[WEBHOOK ERROR] Payment not found for intent {payment_intent['id']}"
            )
        except Exception as e:
            print(f"[WEBHOOK ERROR] Error in handle_payment_canceled: {e}")
            import traceback

            traceback.print_exc()


class UserPaymentsView(APIView):
    """Get all payments for the authenticated user"""

    authentication_classes = [CustomTokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        payments = Payment.objects.filter(user=request.user)
        serializer = PaymentSerializer(payments, many=True)
        return Response(serializer.data)
