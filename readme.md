
## Ustawienie SMTP hasła do .env pliku:
https://myaccount.google.com/apppasswords

## Migracje
```docker-compose run web sh -c "python manage.py migrate"```
```docker-compose run web sh -c "python manage.py makemigrations"```

## Testy
```docker-compose -f test.yml run web sh -c "DJANGO_SETTINGS_MODULE=proj.settings_test python manage.py test"```


## Klucz Stripe
Aby otrzymać klucze stripe nalezy wejść pod link (z wcześniej załozonym kontem)
https://dashboard.stripe.com/


