import json
import urllib.request
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .models import BusinessUserRequest
from .serializers import BusinessUserRequestSerializer
from rest_framework import generics


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
