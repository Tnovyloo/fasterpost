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
        stash = origin_pm.stashes.filter(size=size, is_empty=True).first()

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
        stash.is_empty = False
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
