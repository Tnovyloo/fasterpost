from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from postmats.models import Stash, Postmat
from postmats.serializers import PostmatInfoSerializer

class PostmatInfoView(APIView):
    def get(self, request):
        postmats = Postmat.objects.all()
        serializer = PostmatInfoSerializer(postmats, many=True)

        return Response(serializer.data)