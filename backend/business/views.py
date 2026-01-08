import json
import urllib.request
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework import serializers
from .models import BusinessUserRequest, Magazine
from .serializers import BusinessUserRequestSerializer
from rest_framework import generics
from django.apps import apps


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
                .exclude(status="SUCCEEDED")
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
                    is_paid = p.payment.status == "SUCCEEDED"
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

            data = request.data
            magazine = get_object_or_404(
                Magazine, pk=data.get("magazine_id"), user=request.user
            )

            # Create package linked to magazine
            package = Package.objects.create(
                sender=request.user,
                source_magazine=magazine,
                receiver_name=data.get("receiver_name"),
                receiver_address=data.get("receiver_address"),
                receiver_phone=data.get(
                    "receiver_phone", "000000000"
                ),  # Default if not provided
                size=data.get("size"),
                weight=data.get("weight"),
                route_path=[],
            )

            # Create Payment
            price = 10.0 + (float(data.get("weight")) * 1.5)  # Simple pricing logic
            Payment.objects.create(
                package=package,
                user=request.user,
                amount=price,
                status="PENDING",
                currency="usd",
            )

            return Response({"id": package.id, "status": "created"}, status=201)
        except LookupError:
            return Response({"error": "Models not found"}, status=500)
