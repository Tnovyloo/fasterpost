from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from postmats.models import Stash, Postmat
from postmats.serializers import PostmatSerializer, StashSerializer

class PostmatDetailedView(APIView):
    def get(self, request, id):
        postmat = get_object_or_404(Postmat, id=id)
        serializer = PostmatSerializer(postmat)
        return Response(serializer.data)
    
    def put(self, request, id):
        postmat = get_object_or_404(Postmat, id=id)
        serializer = PostmatSerializer(postmat, data=request.data, partial=True)

        if serializer.is_valid(raise_exception=True):
            serializer.save()
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, id):
        postmat = get_object_or_404(Postmat, id=id)
        postmat.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class PostmatView(APIView):
    def get(self, request):
        postmats = Postmat.objects.all()
        serializer = PostmatSerializer(postmats, many=True)

        return Response(serializer.data)

    def post(self, request):
        serializer = PostmatSerializer(data=request.data)
        if serializer.is_valid():
            if not Postmat.objects.filter(name=serializer.validated_data['name'], warehouse_id=serializer.validated_data['warehouse_id']).exists():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                return Response({"error": "Postmat with this name already exists in the specified warehouse."}, status=status.HTTP_400_BAD_REQUEST)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
class StashDetailedView(APIView):
    def get(self, request, id):
        stash = get_object_or_404(Stash, id=id)
        serializer = StashSerializer(stash)

        return Response(serializer.data)
    
class StashView(APIView):
    def get(self, request):
        stashes = Stash.objects.all()
        serializer = StashSerializer(stashes, many=True)

        return Response(serializer.data)
    