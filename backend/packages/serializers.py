from datetime import datetime, timedelta
from .models import Package, Actualization
from rest_framework import serializers
from postmats.models import Postmat, Stash
from packages.models import Package, Actualization
from payments.models import Payment, PricingRule
from .utils import generate_unlock_code, find_nearest_postmat_with_stash


class PackageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source="sender.firstname", read_only=True)
    receiver_name = serializers.CharField(source="receiver.firstname", read_only=True)

    origin_postmat_name = serializers.CharField(
        source="origin_postmat.name", read_only=True
    )
    destination_postmat_name = serializers.CharField(
        source="destination_postmat.name", read_only=True
    )

    destination_postmat_lat = serializers.CharField(
        source="destination_postmat.latitude", read_only=True
    )
    destination_postmat_long = serializers.CharField(
        source="destination_postmat.longitude", read_only=True
    )

    class Meta:
        model = Package
        fields = "__all__"


class PackageListSerializer(serializers.ModelSerializer):
    origin_postmat_name = serializers.CharField(
        source="origin_postmat.name", read_only=True
    )
    destination_postmat_name = serializers.CharField(
        source="destination_postmat.name", read_only=True
    )
    latest_status = serializers.CharField(read_only=True)

    # Payment information
    payment_status = serializers.SerializerMethodField()
    payment_amount = serializers.SerializerMethodField()
    payment_client_secret = serializers.SerializerMethodField()
    can_retry_payment = serializers.SerializerMethodField()

    class Meta:
        model = Package
        fields = [
            "id",
            "receiver_name",
            "receiver_phone",
            "size",
            "weight",
            "origin_postmat_name",
            "destination_postmat_name",
            "latest_status",
            "unlock_code",
            # "created_at",
            # Payment fields
            "payment_status",
            "payment_amount",
            "payment_client_secret",
            "can_retry_payment",
        ]

    def get_payment_status(self, obj):
        """Get payment status for this package"""
        try:
            payment = Payment.objects.get(package=obj)
            return payment.status
        except Payment.DoesNotExist:
            return None

    def get_payment_amount(self, obj):
        """Get payment amount for this package"""
        try:
            payment = Payment.objects.get(package=obj)
            return str(payment.amount)
        except Payment.DoesNotExist:
            return None

    def get_payment_client_secret(self, obj):
        """Get client secret for pending payments"""
        try:
            payment = Payment.objects.get(package=obj)
            # Only return client secret if payment is pending or failed
            if payment.status in [
                Payment.PaymentStatus.PENDING,
                Payment.PaymentStatus.FAILED,
            ]:
                return payment.stripe_client_secret
            return None
        except Payment.DoesNotExist:
            return None

    def get_can_retry_payment(self, obj):
        """Check if user can retry payment"""
        try:
            payment = Payment.objects.get(package=obj)
            # Allow retry for pending, failed, or cancelled payments
            return payment.status in [
                Payment.PaymentStatus.PENDING,
                Payment.PaymentStatus.FAILED,
                Payment.PaymentStatus.CANCELLED,
            ]
        except Payment.DoesNotExist:
            return False

    def get_latest_status(self, obj):
        latest = obj.actualizations.order_by("-created_at").first()
        return latest.status if latest else "created"


class ActualizationSerializer(serializers.ModelSerializer):
    warehouse_city = serializers.CharField(
        source="warehouse_id.city", read_only=True, allow_null=True
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Actualization
        fields = ["id", "status", "warehouse_city", "status_display", "created_at"]


class PackageDetailSerializer(serializers.ModelSerializer):
    actualizations = ActualizationSerializer(many=True, read_only=True)
    size_display = serializers.CharField(source="get_size_display", read_only=True)

    destination_postmat_lat = serializers.CharField(
        source="destination_postmat.latitude", read_only=True
    )
    destination_postmat_long = serializers.CharField(
        source="destination_postmat.longitude", read_only=True
    )

    class Meta:
        model = Package
        fields = "__all__"


from datetime import datetime, timedelta
import stripe
from django.conf import settings

stripe.api_key = settings.STRIPE_SECRET_KEY


class SendPackageSerializer(serializers.Serializer):
    origin_postmat_id = serializers.UUIDField()
    destination_postmat_id = serializers.UUIDField()
    receiver_name = serializers.CharField()
    receiver_phone = serializers.CharField()
    size = serializers.ChoiceField(choices=Package.PackageSize.choices)
    weight = serializers.IntegerField()

    def validate(self, data):
        # Check postmats exist
        try:
            data["origin_postmat"] = Postmat.objects.get(id=data["origin_postmat_id"])
        except Postmat.DoesNotExist:
            raise serializers.ValidationError("Origin Postmat does not exist.")

        try:
            data["destination_postmat"] = Postmat.objects.get(
                id=data["destination_postmat_id"]
            )
        except Postmat.DoesNotExist:
            raise serializers.ValidationError("Destination Postmat does not exist.")

        # Validate weight is positive
        if data["weight"] <= 0:
            raise serializers.ValidationError("Weight must be greater than 0.")

        return data

    def create(self, validated_data):
        from .utils import find_nearest_postmat_with_stash, generate_unlock_code
        from .models import Actualization

        user = self.context["request"].user
        origin_pm = validated_data["origin_postmat"]
        size = validated_data["size"]

        # 1. Find stash in origin postmat
        stash = origin_pm.stashes.filter(
            size=size, is_empty=True, reserved_until__isnull=True
        ).first()

        if not stash:
            # 2. Find nearest postmat
            alt_pm = find_nearest_postmat_with_stash(origin_pm, size)
            if not alt_pm:
                raise serializers.ValidationError(
                    "No available stash in any postmat for this size."
                )

            origin_pm = alt_pm
            stash = alt_pm.stashes.filter(
                size=size, is_empty=True, reserved_until__isnull=True
            ).first()

        # Reserve stash
        stash.is_empty = True
        stash.reserved_until = datetime.now() + timedelta(days=1)

        unlock_code = generate_unlock_code()

        # 3. Create package (without payment yet)
        package = Package.objects.create(
            origin_postmat=origin_pm,
            destination_postmat=validated_data["destination_postmat"],
            sender=user,
            receiver_name=validated_data["receiver_name"],
            receiver_phone=validated_data["receiver_phone"],
            size=size,
            weight=validated_data["weight"],
            unlock_code=unlock_code,
            route_path=[],
        )

        stash.package = package
        stash.save()

        # 4. Calculate pricing
        pricing = PricingRule.calculate_price(size, validated_data["weight"])

        # 5. Create Stripe Payment Intent
        try:
            payment_intent = stripe.PaymentIntent.create(
                amount=int(pricing["total"] * 100),  # Convert to cents
                currency="usd",
                metadata={
                    "package_id": str(package.id),
                    "user_id": str(user.id),
                    "size": size,
                    "weight": validated_data["weight"],
                },
                automatic_payment_methods={"enabled": True},
            )

            # 6. Create Payment record
            payment = Payment.objects.create(
                package=package,
                user=user,
                stripe_payment_intent_id=payment_intent.id,
                stripe_client_secret=payment_intent.client_secret,
                amount=pricing["total"],
                base_price=pricing["base_price"],
                size_surcharge=pricing["size_surcharge"],
                weight_surcharge=pricing["weight_surcharge"],
                status=Payment.PaymentStatus.PENDING,
            )

        except stripe.error.StripeError as e:
            # Delete package if payment creation fails
            package.delete()
            stash.is_empty = True
            stash.reserved_until = None
            stash.save()
            raise serializers.ValidationError(f"Payment error: {str(e)}")

        # 7. Create actualization (package created but not paid)
        Actualization.objects.create(
            package_id=package,
            status=Actualization.PackageStatus.CREATED,
            route_remaining=None,
            courier_id=None,
            warehouse_id=None,
        )

        return package


class PaymentSerializer(serializers.ModelSerializer):
    package_id = serializers.UUIDField(source="package.id", read_only=True)

    class Meta:
        model = Payment
        fields = [
            "id",
            "package_id",
            "amount",
            "currency",
            "status",
            "base_price",
            "size_surcharge",
            "weight_surcharge",
            "stripe_client_secret",
            "created_at",
            "paid_at",
        ]
        read_only_fields = fields


class PricingCalculationSerializer(serializers.Serializer):
    size = serializers.ChoiceField(choices=Package.PackageSize.choices)
    weight = serializers.IntegerField(min_value=1)

    def validate(self, data):
        pricing = PricingRule.calculate_price(data["size"], data["weight"])
        data["pricing"] = pricing
        return data


# Admin page serializers:
from rest_framework import serializers
from packages.models import Package, Actualization
from postmats.models import Postmat
from accounts.models import User


class PostmatMinimalSerializer(serializers.ModelSerializer):
    warehouse_name = serializers.CharField(source="warehouse_id.name", read_only=True)

    class Meta:
        model = Postmat
        fields = [
            "id",
            "name",
            "warehouse_name",
            "status",
            "latitude",
            "longitude",
            "postal_code",
        ]


class UserMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name"]


class ActualizationSerializer(serializers.ModelSerializer):
    courier = UserMinimalSerializer(source="courier_id", read_only=True)
    warehouse_name = serializers.CharField(source="warehouse_id.name", read_only=True)

    class Meta:
        model = Actualization
        fields = [
            "id",
            "status",
            "courier",
            "warehouse_name",
            "route_remaining",
            "created_at",
        ]


class PackageAdminSerializer(serializers.ModelSerializer):
    origin_postmat_detail = PostmatMinimalSerializer(
        source="origin_postmat", read_only=True
    )
    destination_postmat_detail = PostmatMinimalSerializer(
        source="destination_postmat", read_only=True
    )
    sender_detail = UserMinimalSerializer(source="sender", read_only=True)
    latest_actualization = serializers.SerializerMethodField()
    actualizations = ActualizationSerializer(many=True, read_only=True)

    # Writable fields for updates
    origin_postmat = serializers.PrimaryKeyRelatedField(queryset=Postmat.objects.all())
    destination_postmat = serializers.PrimaryKeyRelatedField(
        queryset=Postmat.objects.all()
    )
    sender = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())

    class Meta:
        model = Package
        fields = [
            "id",
            "pickup_code",
            "unlock_code",
            "origin_postmat",
            "origin_postmat_detail",
            "destination_postmat",
            "destination_postmat_detail",
            "sender",
            "sender_detail",
            "receiver_name",
            "receiver_phone",
            "size",
            "weight",
            "route_path",
            "latest_actualization",
            "actualizations",
        ]

    def get_latest_actualization(self, obj):
        latest = obj.actualizations.order_by("-created_at").first()
        if latest:
            return ActualizationSerializer(latest).data
        return None
