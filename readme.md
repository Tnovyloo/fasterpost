
## Ustawienie SMTP hasła do .env pliku:
https://myaccount.google.com/apppasswords

## Migracje
docker-compose run web sh -c "python manage.py migrate"
docker-compose run web sh -c "python manage.py makemigrations"
