from datetime import datetime, timedelta
from .models import Package, Actualization
from rest_framework import serializers

from rest_framework import serializers
from postmats.models import Postmat, Stash
from packages.models import Package, Actualization
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

    class Meta:
        model = Package
        fields = "__all__"


class PackageListSerializer(serializers.ModelSerializer):
    latest_status = serializers.CharField(read_only=True)
    origin_postmat_name = serializers.CharField(
        source="origin_postmat.name", read_only=True
    )
    destination_postmat_name = serializers.CharField(
        source="destination_postmat.name", read_only=True
    )
    latest_status_display = serializers.SerializerMethodField()

    def get_latest_status_display(self, obj):
        value = obj.latest_status
        if not value:
            return None
        return Actualization.PackageStatus(value).label

    class Meta:
        model = Package
        fields = [
            "id",
            "latest_status",
            "latest_status_display",
            "origin_postmat_name",
            "destination_postmat_name",
            "size",
            "weight",
        ]


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

    class Meta:
        model = Package
        fields = "__all__"


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

        return data

    def create(self, validated_data):
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
            stash = alt_pm.stashes.filter(size=size, is_empty=True).first()

        # Reserve stash
        stash.is_empty = True
        stash.reserved_until = datetime.now() + timedelta(days=1)
        stash.save()

        unlock_code = generate_unlock_code()

        # 3. Create package
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

        # 4. First actualization
        Actualization.objects.create(
            package_id=package,
            status=Actualization.PackageStatus.CREATED,
            route_remaining=None,
            courier_id=None,
            warehouse_id=None,
        )

        return package


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


class PackageListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list view"""

    origin_postmat_name = serializers.CharField(
        source="origin_postmat.name", read_only=True
    )
    destination_postmat_name = serializers.CharField(
        source="destination_postmat.name", read_only=True
    )
    sender_email = serializers.CharField(source="sender.email", read_only=True)
    latest_status = serializers.SerializerMethodField()

    class Meta:
        model = Package
        fields = [
            "id",
            "pickup_code",
            "origin_postmat_name",
            "destination_postmat_name",
            "sender_email",
            "receiver_name",
            "receiver_phone",
            "size",
            "weight",
            "latest_status",
        ]

    def get_latest_status(self, obj):
        latest = obj.actualizations.order_by("-created_at").first()
        return latest.status if latest else "created"
