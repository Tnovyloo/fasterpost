from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class BusinessUserRequest(models.Model):
    # Definition of the Enumeration
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="business_request"
    )
    company_name = models.CharField(max_length=255)
    tax_id = models.CharField(max_length=50, unique=True)
    address = models.TextField(blank=True, null=True)

    # Using the Enum in the field
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.company_name} ({self.tax_id}) - {self.status}"
