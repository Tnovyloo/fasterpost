# FasterPost - Dokumentacja

> Prędkość jest naszym obowiązkiem

[Link do repozytorium](https://github.com/Tnovyloo/fasterpost)

---

## Spis treści
1. [O projekcie](#-o-projekcie)
2. [Zespół](#-zespół)
3. [Architektura i Technologie](#-architektura-i-technologie)
4. [Funkcjonalności](#-funkcjonalności)
5. [Instalacja i Uruchomienie](#-instalacja-i-uruchomienie)
6. [Baza Danych](#-baza-danych)
7. [Przegląd Widoków (Galeria)](#-przegląd-widoków-galeria)
8. [Dodatkowa Konfiguracja](#-dodatkowa-konfiguracja)

---

## O projekcie

[Tutaj wstaw opis ogólny projektu]

Projekt ma na celu stworzenie symulacji działania systemu [np. paczkomatów], inspirowanego rozwiązaniami stosowanymi przez [np. InPost]. System został zaprojektowany w sposób modułowy i odzwierciedla kluczowe procesy biznesowe.

**Główne cele projektu:**
- Zrozumienie i odwzorowanie architektury systemu.
- Implementacja funkcjonalności dla ról: Użytkownik, Kurier, Administrator.
- Wizualizacja przepływu danych między modułami.
- Symulacja scenariuszy (nadawanie, odbiór, śledzenie).

---

## Zespół

| Profil GitHub | Rola w projekcie |
| :--- | :--- |
| [Oleksii Nawrocki](https://github.com/Tnovyloo/fasterpost) | Lider zespołu / Logistics |
| [Tomasz Nowak](https://github.com/Tnovyloo) | Auth / Backend |

---

## Architektura i Technologie

Projekt oparty jest o wzorzec **REST**, zapewniając logiczny podział odpowiedzialności.

**Wykorzystane technologie:**
- **Backend:** Django + DRF
- **Frontend:** NextJS
- **Baza danych:** PostgreSQL
- **Konteneryzacja:** Docker & Docker Compose
- **Zarządzanie zależnościami:** PIP, NPM

---

## Funkcjonalności

System oferuje następujące możliwości w podziale na role:

### Użytkownik (Klient)
- [x] Zakładanie konta i logowanie.
- [x] Nadawanie paczek i wybór paczkomatu.
- [x] Śledzenie statusu przesyłki.
- [x] Odbieranie paczek (kod odbioru/QR).

### Kurier
- [x] Przegląd paczek do odebrania i dostarczenia.
- [x] Obsługa procesu umieszczania paczki w paczkomacie.
- [x] Transport między magazynami a paczkomatami.

### Administrator
- [x] Zarządzanie użytkownikami (CRUD).
- [x] Zarządzanie paczkomatami i magazynami.
- [x] Podgląd statystyk i logistyki.

---

## Instalacja i Uruchomienie

### Wymagania wstępne
- Docker
- Docker Compose

### 1. Uruchomienie

1. **Konfiguracja środowiska:**
   Skopiuj plik przykładowy `.env`.
   ```bash
   cd src
   cp .env.example .env
   ```

2. **Uruchomienie kontenerów:**
   ```bash
   docker-compose -f backend/docker-compose.yml build --no-cache
   docker-compose -f backend/docker-compose.yml up
   ```

3. **Inicjalizacja aplikacji:**
   ```bash
   docker-compose run web sh -c "python manage.py makemigrations"
   docker-compose run web sh -c "python manage.py migrate"
   ```
   
4. **Seedowanie**
    ```
    docker-compose run web sh -c "python manage.py seed_warehouses"
    docker-compose run web sh -c "python manage.py seed_logistics"
    docker-compose run web sh -c "python manage.py seed_accounts"
    docker-compose run web sh -c "python manage.py seed_zones"
    docker-compose run web sh -c "python manage.py seed_local_delivery"
    ```

Aplikacja dostępna pod adresem: `http://localhost:80`

### 🛠 Przydatne komendy Docker

- Zatrzymanie kontenerów: `docker-compose down`
- Ponowne uruchomienie: `docker-compose up -d`
- Logi: `docker-compose logs -f`

---

## 🗄 Baza Danych

Schemat relacji encji (ERD):

![ERD Diagram](sciezka/do/obrazka_erd.png)

---

## 📸 Przegląd Widoków (Galeria)

### 1. Panel Użytkownika
| Landing Page | Logowanie/Rejestracja |
| :---: | :---: |
| ![Landing](sciezka/img.png) | ![Login](sciezka/img.png) |

**Proces wysyłki:**
- Wybór paczkomatu (mapa/lista).
- Formularz nadania.
- Podsumowanie i płatność.

### 2. Panel Kuriera
| Lista Zadań | Odbiór Paczki |
| :---: | :---: |
| ![Tasks](sciezka/img.png) | ![Pickup](sciezka/img.png) |

> Kurier posiada widok paczek "w trasie" oraz możliwość zmiany ich statusu (np. "W magazynie", "W doręczeniu").

### 3. Panel Administratora
| Statystyki | Zarządzanie Magazynem |
| :---: | :---: |
| ![Stats](sciezka/img.png) | ![Warehouse](sciezka/img.png) |

### 4. Proces Odbioru (Klient)
1. Otrzymanie kodu odbioru.
2. Wpisanie kodu w paczkomacie.
3. Otwarcie skrytki i odbiór.

![Odbiór](sciezka/do/obrazka_odbioru.png)

---

## 🔧 Dodatkowa Konfiguracja

### Ustawienie SMTP hasła do .env pliku:
https://myaccount.google.com/apppasswords

### Migracje
```bash
docker-compose run web sh -c "python manage.py migrate"
docker-compose run web sh -c "python manage.py makemigrations"
```

### Testy
```bash
docker-compose -f test.yml run web sh -c "DJANGO_SETTINGS_MODULE=proj.settings_test python manage.py test"
```

### Klucz Stripe
Aby otrzymać klucze stripe nalezy wejść pod link (z wcześniej załozonym kontem):
https://dashboard.stripe.com/

---

&copy; 2024 [Nazwa Twojego Zespołu/Firmy]. Wszelkie prawa zastrzeżone.