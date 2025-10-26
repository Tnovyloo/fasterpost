from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from postmats.models import Stash, Postmat
from postmats.serializers import PostmatSerializer

class PostmatView(APIView):
    def get(self, request):
        postmat_id = request.query_params.get('id', None)

        if postmat_id:
            try:
                postmat = Postmat.objects.get(id=postmat_id)
                serializer = PostmatSerializer(postmat)

                return Response(serializer.data)
            
            except Postmat.DoesNotExist:
                return Response({"error": "Postmat not found."}, status=status.HTTP_404_NOT_FOUND)

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
    
    def put(self, request):
        postmat_id = request.query_params.get('id', None)

        if postmat_id:
            try:
                postmat = Postmat.objects.get(id=postmat_id)
                serializer = PostmatSerializer(postmat, data=request.data, partial=True)

                if serializer.is_valid(raise_exception=True):
                    serializer.save()
                    return Response(serializer.data)
                
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST) 

            except Postmat.DoesNotExist:
                return Response({"error": "Postmat not found."}, status=status.HTTP_404_NOT_FOUND)
           
    def delete(self, request):
        postmat_id = request.query_params.get('id', None)

        if postmat_id:
            try:
                postmat = Postmat.objects.get(id=postmat_id)
                postmat.delete()
                
                return Response(status=status.HTTP_204_NO_CONTENT)

            except Postmat.DoesNotExist:
                return Response({"error": "Postmat not found."}, status=status.HTTP_404_NOT_FOUND) 