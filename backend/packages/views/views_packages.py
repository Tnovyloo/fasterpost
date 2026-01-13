from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from django.http import HttpResponse
from django.db.models import OuterRef, Subquery, Q, F
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.utils import timezone

from ..models import Package, Actualization
from accounts.models import User
from postmats.models import Postmat, Stash
from payments.models import Payment, WebhookEvent

from ..serializers import SendPackageSerializer, PackageDetailSerializer
from accounts.authentication import CustomTokenAuthentication

import stripe
from django.conf import settings

from packages.serializers import (
    SendPackageSerializer,
    PaymentSerializer,
    PricingCalculationSerializer,
    PackageSerializer,
    SenderPackageDetailSerializer,
    PackageListSerializer,
)


class UserPackagesView(APIView):
    """
    GET /user/parcels → list of user's shipments
    POST /user/parcels → create new shipment
    """

    authentication_classes = [CustomTokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        last_status_subquery = (
            Actualization.objects.filter(package_id=OuterRef("pk"))
            .order_by("-created_at")
            .values("status")[:1]
        )

        reservation_subquery = Stash.objects.filter(package_id=OuterRef("pk")).values(
            "reserved_until"
        )[:1]

        packages = (
            Package.objects.filter(sender=user)
            .annotate(
                latest_status=Subquery(last_status_subquery),
                payment_status=F("payment__status"),
                reserved_until=Subquery(reservation_subquery),
            )
            .select_related("origin_postmat", "destination_postmat", "payment")
        )

        serializer = PackageListSerializer(
            packages, many=True, context={"request": request}
        )
        # The PackageListSerializer needs to be updated to include
        # `payment_status` and `reserved_until` fields.

        return Response(serializer.data, status=status.HTTP_200_OK)


class UserIncomingPackagesView(APIView):
    """
    GET /user/incoming/ → list of packages sent TO the user
    """

    authentication_classes = [CustomTokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        last_status_subquery = (
            Actualization.objects.filter(package_id=OuterRef("pk"))
            .order_by("-created_at")
            .values("status")[:1]
        )

        packages = (
            Package.objects.filter(receiver_user=user)
            .annotate(latest_status=Subquery(last_status_subquery))
            .select_related("origin_postmat", "destination_postmat", "sender")
        )

        serializer = PackageListSerializer(
            packages, many=True, context={"request": request}
        )

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

        # Get stash reservation info
        reserved_until = None
        if hasattr(package, "stash_assignment"):
            stash = package.stash_assignment.first()
            if stash:
                reserved_until = stash.reserved_until

        return Response(
            {
                "message": "Package registered. Please complete payment. Stash reserved for 24 hours.",
                "package_id": str(package.id),
                "origin_postmat": str(package.origin_postmat.name),
                "reserved_until": reserved_until,
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

    def patch(self, request, package_id):
        try:
            package = Package.objects.get(id=package_id, sender=request.user)
        except Package.DoesNotExist:
            return Response(
                {"error": "Package not found or you don't have permission to edit it."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check if payment has been completed
        try:
            payment = Payment.objects.get(package=package)
            if payment.status == Payment.PaymentStatus.SUCCEEDED:
                return Response(
                    {
                        "error": "Cannot edit package. Payment has already been completed.",
                        "message": "After payment, you won't be able to edit any parcel information (recipient's email, phone number, parcel locker selection, etc.).",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except Payment.DoesNotExist:
            return Response(
                {"error": "Payment information not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        # Store old values to check if pricing fields changed
        old_size = package.size
        old_weight = package.weight

        # Use the same serializer with partial update
        serializer = SendPackageSerializer(
            package, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        updated_package = serializer.save()

        # Recalculate payment if pricing-related fields changed
        pricing_changed = (
            updated_package.size != old_size or updated_package.weight != old_weight
        )

        if pricing_changed:
            # Recalculate pricing
            from payments.models import PricingRule

            pricing_data = PricingRule.calculate_price(
                updated_package.size, updated_package.weight
            )

            # Update payment with new amounts
            payment.base_price = pricing_data["base_price"]
            payment.size_surcharge = pricing_data["size_surcharge"]
            payment.weight_surcharge = pricing_data["weight_surcharge"]
            payment.amount = pricing_data["total"]
            payment.save()

            # If you need to update Stripe PaymentIntent with new amount
            if payment.stripe_payment_intent_id:
                import stripe

                try:
                    stripe.PaymentIntent.modify(
                        payment.stripe_payment_intent_id,
                        amount=int(payment.amount * 100),  # Convert to cents
                    )
                except stripe.error.StripeError as e:
                    # Log error but don't fail the request
                    print(f"Failed to update Stripe PaymentIntent: {e}")

        payment.refresh_from_db()

        return Response(
            {
                "message": "Package updated successfully.",
                "package_id": str(updated_package.id),
                "origin_postmat": str(updated_package.origin_postmat.name),
                "destination_postmat": str(updated_package.destination_postmat.name),
                "receiver_name": updated_package.receiver_name,
                "receiver_phone": updated_package.receiver_phone,
                "size": updated_package.size,
                "weight": updated_package.weight,
                "payment": {
                    "client_secret": payment.stripe_client_secret,
                    "amount": str(payment.amount),
                    "base_price": str(payment.base_price),
                    "size_surcharge": str(payment.size_surcharge),
                    "weight_surcharge": str(payment.weight_surcharge),
                    "status": payment.status,
                },
                "pricing_recalculated": pricing_changed,
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request, package_id=None):
        if not package_id:
            package_id = request.data.get("package_id") or request.query_params.get(
                "package_id"
            )

        if not package_id:
            return Response(
                {"error": "Package ID is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            package = Package.objects.get(id=package_id, sender=request.user)
        except Package.DoesNotExist:
            return Response(
                {
                    "error": "Package not found or you don't have permission to delete it."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check if payment has been completed
        try:
            payment = Payment.objects.get(package=package)
            if payment.status == Payment.PaymentStatus.SUCCEEDED:
                return Response(
                    {
                        "error": "Cannot delete package. Payment has already been completed.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except Payment.DoesNotExist:
            pass

        # Release stash reservation
        if hasattr(package, "stash_assignment"):
            package.stash_assignment.update(
                package=None, is_empty=True, reserved_until=None
            )

        package.delete()

        return Response(
            {"message": "Package deleted successfully."},
            status=status.HTTP_200_OK,
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
        # Be careful logging secrets in production
        # print(
        #     f"[WEBHOOK DEBUG] Webhook secret (first 10 chars): {settings.STRIPE_WEBHOOK_SECRET[:10] if settings.STRIPE_WEBHOOK_SECRET else 'NOT SET'}"
        # )

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
            elif event["type"] == "checkout.session.completed":
                self.handle_checkout_session_completed(event["data"]["object"])
            elif event["type"] == "payment_intent.canceled":
                self.handle_payment_canceled(event["data"]["object"])
            else:
                print(f"[WEBHOOK DEBUG] Unhandled event type: {event['type']}")
        except Exception as e:
            print(f"[WEBHOOK ERROR] Error handling event: {e}")
            import traceback

            traceback.print_exc()

        return HttpResponse(status=200)

    def handle_checkout_session_completed(self, session):
        """Handle bulk payment completion"""
        print(f"[WEBHOOK] Processing checkout.session.completed: {session['id']}")
        metadata = session.get("metadata", {})

        if metadata.get("type") == "business_bulk_payment":
            payment_ids_str = metadata.get("payment_ids", "")
            if payment_ids_str:
                payment_ids = payment_ids_str.split(",")
                payment_intent_id = session.get("payment_intent")

                # Update all related payments
                from django.apps import apps

                Payment = apps.get_model("payments", "Payment")
                payments = Payment.objects.filter(id__in=payment_ids)

                updated_count = payments.update(
                    status=Payment.PaymentStatus.SUCCEEDED,
                    stripe_payment_intent_id=payment_intent_id,
                    paid_at=timezone.now(),
                )
                print(
                    f"[WEBHOOK] Bulk payment succeeded. Updated {updated_count} payments."
                )

    def handle_payment_succeeded(self, payment_intent):
        """Handle successful payment"""
        print(f"[WEBHOOK] Processing payment_intent.succeeded: {payment_intent['id']}")

        payments = Payment.objects.filter(stripe_payment_intent_id=payment_intent["id"])
        if not payments.exists():
            print(
                f"[WEBHOOK ERROR] Payment not found for intent {payment_intent['id']}"
            )
            return

        for payment in payments:
            payment.status = Payment.PaymentStatus.SUCCEEDED
            payment.paid_at = timezone.now()
            payment.payment_method = payment_intent.get("payment_method")
            payment.save()
            print(f"[WEBHOOK] Payment status updated to SUCCEEDED")

            # Update stash reservation to 24h from payment time
            if hasattr(payment.package, "stash_assignment"):
                payment.package.stash_assignment.update(
                    reserved_until=timezone.now() + timezone.timedelta(hours=24)
                )

            # Update package status
            # from packages.models import Actualization

            # Actualization.objects.create(
            #     package_id=payment.package,
            #     status=Actualization.PackageStatus.WAITING_FOR_PICKUP,
            #     route_remaining=None,
            #     courier_id=None,
            #     warehouse_id=None,
            # )
            # print(f"[WEBHOOK] Actualization created for package {payment.package.id}")
            print(f"[WEBHOOK] ✓ Payment succeeded for package {payment.package.id}")

    def handle_payment_failed(self, payment_intent):
        """Handle failed payment"""
        print(
            f"[WEBHOOK] Processing payment_intent.payment_failed: {payment_intent['id']}"
        )

        payments = Payment.objects.filter(stripe_payment_intent_id=payment_intent["id"])
        if not payments.exists():
            print(
                f"[WEBHOOK ERROR] Payment not found for intent {payment_intent['id']}"
            )
            return

        for payment in payments:
            payment.status = Payment.PaymentStatus.FAILED
            payment.failure_reason = payment_intent.get("last_payment_error", {}).get(
                "message"
            )
            payment.save()

            # Release the stash
            package = payment.package
            if package.origin_postmat:
                stash = package.origin_postmat.stashes.filter(
                    size=package.size, is_empty=False
                ).first()

                if stash:
                    stash.is_empty = True
                    stash.reserved_until = None
                    stash.save()
                    print(f"[WEBHOOK] Stash released for failed payment")

            print(f"[WEBHOOK] ✓ Payment marked as failed for package {package.id}")

    def handle_payment_canceled(self, payment_intent):
        """Handle canceled payment"""
        print(f"[WEBHOOK] Processing payment_intent.canceled: {payment_intent['id']}")

        payments = Payment.objects.filter(stripe_payment_intent_id=payment_intent["id"])
        if not payments.exists():
            print(
                f"[WEBHOOK ERROR] Payment not found for intent {payment_intent['id']}"
            )
            return

        for payment in payments:
            payment.status = Payment.PaymentStatus.CANCELLED
            payment.save()

            # Release the stash
            package = payment.package
            if package.origin_postmat:
                stash = package.origin_postmat.stashes.filter(
                    size=package.size, is_empty=False
                ).first()

                if stash:
                    stash.is_empty = True
                    stash.reserved_until = None
                    stash.save()
                    print(f"[WEBHOOK] Stash released for canceled payment")

            print(f"[WEBHOOK] ✓ Payment marked as canceled for package {package.id}")


class UserPaymentsView(APIView):
    """Get all payments for the authenticated user"""

    authentication_classes = [CustomTokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        payments = Payment.objects.filter(user=request.user)
        serializer = PaymentSerializer(payments, many=True)
        return Response(serializer.data)


class RetryPaymentView(APIView):
    """
    POST /api/payments/retry/<package_id>/
    Create a new payment intent for a failed/pending payment
    """

    authentication_classes = [CustomTokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, package_id):
        try:
            # Get package and verify ownership
            package = Package.objects.get(id=package_id, sender=request.user)

            # Get existing payment
            payment = Payment.objects.get(package=package)

            # Check if payment can be retried
            if payment.status not in [
                Payment.PaymentStatus.PENDING,
                Payment.PaymentStatus.FAILED,
                Payment.PaymentStatus.CANCELLED,
            ]:
                return Response(
                    {
                        "error": f"Payment cannot be retried. Current status: {payment.status}"
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Create new payment intent if needed
            if (
                not payment.stripe_payment_intent_id
                or payment.status == Payment.PaymentStatus.FAILED
            ):
                try:
                    # Cancel old payment intent if it exists
                    if payment.stripe_payment_intent_id:
                        try:
                            stripe.PaymentIntent.cancel(
                                payment.stripe_payment_intent_id
                            )
                            print(
                                f"[RETRY] Cancelled old payment intent: {payment.stripe_payment_intent_id}"
                            )
                        except Exception as e:
                            print(f"[RETRY] Could not cancel old intent: {e}")
                            pass  # If cancellation fails, continue anyway

                    # Create new payment intent
                    payment_intent = stripe.PaymentIntent.create(
                        amount=int(payment.amount * 100),  # Convert to cents
                        currency="usd",
                        metadata={
                            "package_id": str(package.id),
                            "user_id": str(request.user.id),
                            "size": package.size,
                            "weight": package.weight,
                            "retry": "true",
                        },
                        automatic_payment_methods={"enabled": True},
                    )

                    # Update payment record
                    payment.stripe_payment_intent_id = payment_intent.id
                    payment.stripe_client_secret = payment_intent.client_secret
                    payment.status = Payment.PaymentStatus.PENDING
                    payment.failure_reason = None
                    payment.save()

                    print(f"[RETRY] Created new payment intent: {payment_intent.id}")

                except stripe.error.StripeError as e:
                    print(f"[RETRY ERROR] Stripe error: {e}")
                    return Response(
                        {"error": f"Failed to create payment: {str(e)}"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            # Return payment details
            return Response(
                {
                    "message": "Payment ready",
                    "package_id": str(package.id),
                    "payment": {
                        "client_secret": payment.stripe_client_secret,
                        "amount": str(payment.amount),
                        "status": payment.status,
                        "base_price": str(payment.base_price),
                        "size_surcharge": str(payment.size_surcharge),
                        "weight_surcharge": str(payment.weight_surcharge),
                    },
                }
            )

        except Package.DoesNotExist:
            return Response(
                {"error": "Package not found"}, status=status.HTTP_404_NOT_FOUND
            )
        except Payment.DoesNotExist:
            return Response(
                {"error": "Payment not found"}, status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            print(f"[RETRY ERROR] Unexpected error: {e}")
            import traceback

            traceback.print_exc()
            return Response(
                {"error": "An unexpected error occurred"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class OpenStashView(APIView):
    authentication_classes = [CustomTokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, package_id):
        try:
            # Get the package
            package = Package.objects.get(id=package_id, sender=request.user)

            # Check if payment exists and was successful
            if not hasattr(package, "payment"):
                return Response(
                    {"error": "No payment found for this package"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if package.payment.status != Payment.PaymentStatus.SUCCEEDED:
                return Response(
                    {
                        "error": "Payment must be completed before opening stash",
                        "payment_status": package.payment.status,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Check if package has a stash assigned
            if (
                not hasattr(package, "stash_assignment")
                or not package.stash_assignment.exists()
            ):
                return Response(
                    {"error": "No stash assigned to this package"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            stash = package.stash_assignment.first()

            # Update stash
            stash.reserved_until = None
            stash.is_empty = False
            stash.save()

            # Create actualization
            Actualization.objects.create(
                package_id=package,
                status=Actualization.PackageStatus.PLACED_IN_STASH,
                created_at=timezone.now(),
            )

            return Response(
                {
                    "message": "Package placed in stash successfully",
                    "stash_id": str(stash.id),
                    "postmat": stash.postmat.name,
                },
                status=status.HTTP_200_OK,
            )

        except Package.DoesNotExist:
            return Response(
                {"error": "Package not found"}, status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PackageDetailView(APIView):
    # Fix: Ensure user is authenticated
    authentication_classes = [CustomTokenAuthentication]
    permission_classes = [IsAuthenticated]
    authentication_classes = [CustomTokenAuthentication]

    def get(self, request, package_id):
        try:
            # Get package and ensure user owns it
            package = (
                Package.objects.select_related(
                    "origin_postmat", "destination_postmat", "sender", "payment"
                )
                .prefetch_related(
                    "actualizations__courier_id", "actualizations__warehouse_id"
                )
                .get(
                    Q(id=package_id)
                    & (Q(sender=request.user) | Q(receiver_user=request.user))
                )
            )

            serializer = SenderPackageDetailSerializer(
                package, context={"request": request}
            )
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Package.DoesNotExist:
            return Response(
                {"error": "Package not found or you don't have permission to view it"},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CollectPackageView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [CustomTokenAuthentication]

    def post(self, request, package_id):
        try:
            # Ensure user is the receiver
            package = Package.objects.get(id=package_id, receiver_user=request.user)

            # Check if package is ready for collection (must be DELIVERED)
            is_ready = False
            latest_act = package.actualizations.order_by("-created_at").first()

            if (
                latest_act
                and latest_act.status == Actualization.PackageStatus.DELIVERED
            ):
                is_ready = True
            elif hasattr(package, "stash_assignment"):
                stash = package.stash_assignment.first()
                if stash and stash.postmat_id == package.destination_postmat_id:
                    is_ready = True

            if not is_ready:
                return Response(
                    {
                        "error": "Package is not ready for collection or has already been collected."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Update status to PICKED_UP
            Actualization.objects.create(
                package_id=package,
                status=Actualization.PackageStatus.PICKED_UP,
                created_at=timezone.now(),
            )

            # Release the stash
            if hasattr(package, "stash_assignment"):
                package.stash_assignment.update(
                    package=None, is_empty=True, reserved_until=None
                )

            return Response(
                {"message": "Package collected successfully!"},
                status=status.HTTP_200_OK,
            )

        except Package.DoesNotExist:
            return Response(
                {"error": "Package not found or you are not the receiver."},
                status=status.HTTP_404_NOT_FOUND,
            )
