import json
import urllib.request
import stripe
from django.conf import settings
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework import serializers
from .models import BusinessUserRequest, Magazine
from .serializers import BusinessUserRequestSerializer
from rest_framework import generics
from django.apps import apps
from django.db import IntegrityError

stripe.api_key = settings.STRIPE_SECRET_KEY


def fetch_ceidg_data(nip):
    """Fetches company info from the Polish White List API (wl-api.mf.gov.pl)"""
    from datetime import date

    url = f"https://wl-api.mf.gov.pl/api/search/nip/{nip}?date={date.today().strftime('%Y-%m-%d')}"
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
            subject = data.get("result", {}).get("subject")
            if subject:
                return {
                    "name": subject.get("name"),
                    "address": subject.get("workingAddress")
                    or subject.get("residenceAddress"),
                }
    except:
        return None
    return None


class BusinessRequestView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Look for a request belonging to the logged-in user
        business_req = BusinessUserRequest.objects.filter(user=request.user).first()
        if not business_req:
            # Return a 204 (No Content) or 404 so the frontend knows no request exists
            return Response(
                {"detail": "No request found"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = BusinessUserRequestSerializer(business_req)
        return Response(serializer.data)

    def post(self, request):
        nip = request.data.get("tax_id")

        # 1. Check if this NIP is already used by anyone
        if BusinessUserRequest.objects.filter(tax_id=nip).exists():
            return Response(
                {"error": "This NIP is already registered with an existing account."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 2. Check if user already has a request
        if BusinessUserRequest.objects.filter(user=request.user).exists():
            return Response(
                {"error": "You have already submitted a business request."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 3. Download data from CEIDG
        company_data = fetch_ceidg_data(nip)
        if not company_data:
            return Response(
                {
                    "error": "Could not verify NIP with CEIDG. Please ensure it is correct."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 4. Save with downloaded information
        business_req = BusinessUserRequest.objects.create(
            user=request.user,
            tax_id=nip,
            company_name=company_data["name"],
            address=company_data["address"],
        )

        serializer = BusinessUserRequestSerializer(business_req)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class BusinessRequestAdminListView(generics.ListAPIView):
    permission_classes = [permissions.IsAdminUser]
    serializer_class = BusinessUserRequestSerializer
    queryset = BusinessUserRequest.objects.all().order_by("-created_at")


class BusinessRequestAdminActionView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        action = request.data.get("action")
        business_req = get_object_or_404(BusinessUserRequest, pk=pk)

        if action == "delete":
            business_req.delete()
            return Response({"status": "success", "deleted": True})

        if action == "approve":
            business_req.status = BusinessUserRequest.Status.APPROVED
            # Update user role to business
            user = business_req.user
            user.role = "business"
            user.save()
        elif action == "reject":
            business_req.status = BusinessUserRequest.Status.REJECTED

        business_req.save()
        return Response({"status": "success", "new_status": business_req.status})


# --- Business Panel Views ---


class BusinessDashboardStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Assuming Package model exists in packages app
        try:
            Payment = apps.get_model("payments", "Payment")
            Package = apps.get_model("packages", "Package")
            total_packages = Package.objects.filter(sender=request.user).count()
            unpaid_packages = (
                Payment.objects.filter(user=request.user)
                .exclude(status="succeeded")
                .count()
            )
        except LookupError:
            total_packages = 0
            unpaid_packages = 0

        # Assuming Magazine model exists in business app
        try:
            total_magazines = Magazine.objects.filter(user=request.user).count()
        except LookupError:
            total_magazines = 0

        return Response(
            {
                "total_packages": total_packages,
                "unpaid_packages": unpaid_packages,
                "total_magazines": total_magazines,
            }
        )


class MagazineView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            magazines = Magazine.objects.filter(user=request.user)
            data = [
                {
                    "id": m.id,
                    "name": m.name,
                    "address": m.address,
                    "lat": m.lat,
                    "lng": m.lng,
                }
                for m in magazines
            ]
            return Response(data)
        except LookupError:
            return Response([], status=200)

    def post(self, request):
        try:
            data = request.data
            magazine = Magazine.objects.create(
                user=request.user,
                name=data.get("name"),
                address=data.get("address"),
                lat=data.get("lat"),
                lng=data.get("lng"),
            )
            return Response({"id": magazine.id, "status": "created"}, status=201)
        except LookupError:
            return Response({"error": "Magazine model not found"}, status=500)


class BusinessPackageView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            Package = apps.get_model("packages", "Package")
            packages = (
                Package.objects.filter(sender=request.user)
                .select_related("payment")
                .order_by("-created_at")
            )

            data = []
            for p in packages:
                is_paid = False
                price = 0.0
                if hasattr(p, "payment"):
                    is_paid = p.payment.status == "succeeded"
                    price = p.payment.amount

                data.append(
                    {
                        "id": p.id,
                        "receiver_name": p.receiver_name,
                        "status": (
                            p.actualizations.last().status
                            if p.actualizations.exists()
                            else "created"
                        ),
                        "is_paid": is_paid,
                        "created_at": p.created_at,
                        "price": price,
                    }
                )

            return Response(data)
        except LookupError:
            return Response([])

    def post(self, request):
        # Create package logic
        try:
            Package = apps.get_model("packages", "Package")
            Payment = apps.get_model("payments", "Payment")
            PricingRule = apps.get_model("payments", "PricingRule")
            Postmat = apps.get_model("postmats", "Postmat")
            User = apps.get_model("accounts", "User")

            from .serializers import BusinessPackageCreateSerializer

            serializer = BusinessPackageCreateSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            data = serializer.validated_data

            magazine = get_object_or_404(
                Magazine, pk=data.get("magazine_id"), user=request.user
            )
            destination_postmat = get_object_or_404(
                Postmat, pk=data.get("destination_postmat_id")
            )
            receiver_user = User.objects.filter(
                email=data.get("receiver_email")
            ).first()

            # Map size S/M/L to small/medium/large
            raw_size = data.get("size")
            size_map = {"S": "small", "M": "medium", "L": "large"}
            size = size_map.get(raw_size, raw_size)

            # Create package linked to magazine
            package = Package.objects.create(
                sender=request.user,
                source_magazine=magazine,
                destination_postmat=destination_postmat,
                receiver_name=data.get("receiver_name"),
                receiver_phone=data.get("receiver_phone"),
                receiver_email=data.get("receiver_email"),
                receiver_user=receiver_user,
                origin_postmat=None,
                size=size,
                weight=data.get("weight"),
                route_path=[],
            )

            # Create Payment
            weight = float(data.get("weight"))

            # Use PricingRule for calculation
            pricing = PricingRule.calculate_price(size, weight)

            Payment.objects.create(
                package=package,
                user=request.user,
                amount=pricing["total"],
                base_price=pricing["base_price"],
                size_surcharge=pricing["size_surcharge"],
                weight_surcharge=pricing["weight_surcharge"],
                status="pending",
                currency="usd",
            )

            return Response({"id": package.id, "status": "created"}, status=201)
        except LookupError:
            return Response({"error": "Models not found"}, status=500)


class BusinessPriceCalculatorView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        size = request.data.get("size")
        weight = request.data.get("weight")

        if not size or not weight:
            return Response(
                {"error": "Size and weight are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            PricingRule = apps.get_model("payments", "PricingRule")

            # Map size S/M/L to small/medium/large
            raw_size = size
            size_map = {"S": "small", "M": "medium", "L": "large"}
            mapped_size = size_map.get(raw_size, raw_size)

            pricing = PricingRule.calculate_price(mapped_size, float(weight))
            return Response(pricing)
        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class BusinessBulkPaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        package_ids = request.data.get("package_ids", [])
        if not package_ids:
            return Response(
                {"error": "No packages provided"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            Payment = apps.get_model("payments", "Payment")

            payments = Payment.objects.filter(
                package__id__in=package_ids, user=request.user
            ).select_related("package")

            line_items = []
            valid_payment_ids = []

            for payment in payments:
                # Only include unpaid packages
                if payment.status not in ["succeeded", "processing"]:
                    valid_payment_ids.append(str(payment.id))
                    line_items.append(
                        {
                            "price_data": {
                                "currency": "usd",
                                "product_data": {
                                    "name": f"Package {payment.package.pickup_code or str(payment.package.id)[:8]}",
                                    "description": f"Size: {payment.package.size}, Weight: {payment.package.weight}kg",
                                },
                                "unit_amount": int(payment.amount * 100),
                            },
                            "quantity": 1,
                        }
                    )

            if not line_items:
                return Response(
                    {"error": "No valid unpaid packages found"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            checkout_session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                line_items=line_items,
                mode="payment",
                success_url="http://localhost:80/business/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}",
                cancel_url="http://localhost:80/business/payments?payment=cancelled",
                metadata={
                    "payment_ids": ",".join(valid_payment_ids),
                    "type": "business_bulk_payment",
                },
            )

            return Response({"url": checkout_session.url})

        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class BusinessPaymentVerifyView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        session_id = request.data.get("session_id")
        if not session_id:
            return Response(
                {"error": "Session ID required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            session = stripe.checkout.Session.retrieve(session_id)
            if session.payment_status == "paid":
                metadata = session.get("metadata", {})
                if metadata.get("type") == "business_bulk_payment":
                    payment_ids_str = metadata.get("payment_ids", "")
                    if payment_ids_str:
                        payment_ids = payment_ids_str.split(",")
                        payment_intent_id = session.get("payment_intent")

                        Payment = apps.get_model("payments", "Payment")
                        payments = Payment.objects.filter(id__in=payment_ids)

                        try:
                            payments.update(
                                status="succeeded",
                                stripe_payment_intent_id=payment_intent_id,
                                paid_at=timezone.now(),
                            )
                            return Response({"status": "verified"})
                        except IntegrityError as e:
                            print(f"Database IntegrityError: {e}")
                            return Response(
                                {
                                    "error": "Database schema mismatch: Please run migrations to remove unique constraint on payment intent ID."
                                },
                                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            )
                        except Exception as e:
                            # Likely IntegrityError if migrations weren't run
                            print(f"Error updating payments: {e}")
                            return Response(
                                {"error": str(e)},
                                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            )

            return Response(
                {"status": "unpaid or invalid"}, status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
