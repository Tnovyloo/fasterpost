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

**FastPost Express** to zintegrowana platforma logistyczna, mająca na celu symulację działania nowoczesnego systemu paczkomatów, inspirowanego rozwiązaniami stosowanymi przez liderów rynku, takich jak **InPost**. System został zaprojektowany w sposób modułowy i odzwierciedla kluczowe procesy biznesowe realizowane w rzeczywistych systemach dostaw "ostatniej mili".

Projekt skupia się na rozwiązaniu problemu dostępności skrytek poprzez system dynamicznej rezerwacji oraz automatyzacji procesów nadawania i odbioru przesyłek w trybie 24/7.

**Główne cele projektu:**
- **Odwzorowanie architektury systemu:** Implementacja rozproszonego środowiska uwzględniającego aplikację webową, panel administracyjny oraz symulację terminali kurierskich i paczkomatów.
- **Implementacja ról systemowych:** Stworzenie dedykowanych interfejsów i logiki biznesowej dla:
  - **Użytkownika:** Nadawanie, śledzenie i odbiór paczek (w tym obsługa kodów QR/PIN).
  - **Kuriera:** Obsługa tras logistycznych, zarządzanie statusami przesyłek i obsługa skrytek.
  - **Administratora:** Zarządzanie infrastrukturą (magazyny, paczkomaty), użytkownikami i monitoring systemu.
- **Wizualizacja przepływu danych:** Prezentacja pełnego cyklu życia paczki – od płatności i nadania, przez transport między magazynami, aż po umieszczenie w skrytce docelowej.
- **Symulacja zaawansowanych scenariuszy:** Obsługa sytuacji brzegowych, takich jak przepełnienie paczkomatu (kolejkowanie FIFO), rezerwacja skrytek oraz obsługa punktów biznesowych (Pickup Points).

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
- [x] Odbieranie paczek.

### Kurier
- [x] Przegląd paczek do odebrania i dostarczenia.
- [x] Obsługa procesu umieszczania paczki w paczkomacie.
- [x] Transport między magazynami a paczkomatami.

### Administrator
- [x] Zarządzanie użytkownikami (CRUD).
- [x] Zarządzanie paczkomatami i magazynami.
- [x] Podgląd logistyki.

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

5. **Testowanie**
   ```bash   
   docker-compose -f test.yml run web sh -c "DJANGO_SETTINGS_MODULE=proj.settings_test python manage.py test"
   ```

Aplikacja dostępna pod adresem: `http://localhost:80`

### Przydatne komendy Docker

- Zatrzymanie kontenerów: `docker-compose down`
- Ponowne uruchomienie: `docker-compose up -d`
- Logi: `docker-compose logs -f`

---

## Baza Danych

Schemat relacji encji (ERD):

![ERD Diagram](sciezka/do/obrazka_erd.png)

---

## Przegląd Widoków (Galeria)

### 1. Strona Główna i Uwierzytelnianie

| Strona Główna | Logowanie |
| :---: | :---: |
| ![Home Page](https://github.com/Tnovyloo/fasterpost/blob/cd4e1d5a6b8f5ec1955990829d1f7ead5e0d504d/docs/screenshots/1_home_page.png) | ![Login](https://github.com/Tnovyloo/fasterpost/blob/cd4e1d5a6b8f5ec1955990829d1f7ead5e0d504d/docs/screenshots/2_login_screen.png) |

**Rejestracja i Weryfikacja:**

| Rejestracja | Walidacja Błędów |
| :---: | :---: |
| ![Register](docs/screenshots/3_register_screen.png) | ![Register Invalid](docs/screenshots/3_register_screen_invalid_input.png) |

| Poprawne Dane | Weryfikacja Email |
| :---: | :---: |
| ![Register Valid](docs/screenshots/3_register_screen_valid_input.png) | ![Email Verification](docs/screenshots/4_email_verification.png) |

---

### 2. Panel Użytkownika Indywidualnego

**Dashboard i Ustawienia:**

| Kokpit Użytkownika | Nadchodzące Paczki |
| :---: | :---: |
| ![User Dashboard](docs/screenshots/7_user_dashboard.png) | ![Incoming Packages](docs/screenshots/7_user_dashboard_incoming_packages.png) |

![Ustawienia Konta](docs/screenshots/7_user_dashboard_settings.png)
*Ustawienia konta użytkownika*

**Proces Nadawania Paczki:**

1. **Formularz nadania:**
   ![Sending Package](docs/screenshots/8_normal_user_sending_package.png)

2. **Ostrzeżenia i Walidacja:**
   ![Sending Warning](docs/screenshots/8_normal_user_sending_package_warning.png)

3. **Płatność:**
   ![Payment](docs/screenshots/8_normal_user_payment.png)

4. **Potwierdzenie i Umieszczenie w Skrytce:**
   | Sukces Płatności | Umieszczenie w Skrytce |
   | :---: | :---: |
   | ![Payment Success](docs/screenshots/8_normal_user_payment_successfull.png) | ![Place in Stash](docs/screenshots/8_normal_user_place_in_stash.png) |

---

### 3. Panel Biznesowy

Dedykowany panel dla klientów biznesowych z obsługą masowych wysyłek.

| Strona Biznesowa | Dashboard Biznesowy |
| :---: | :---: |
| ![Business Home](docs/screenshots/6_business_homepage.png) | ![Business Dashboard](docs/screenshots/6_business_dashboard.png) |

**Zarządzanie Zasobami:**

| Twoje Paczki | Płatności i Faktury |
| :---: | :---: |
| ![Business Packages](docs/screenshots/6_business_packages.png) | ![Business Payments](docs/screenshots/6_business_payments.png) |

| Masowe Płatności | Zarządzanie Magazynami |
| :---: | :---: |
| ![Bulk Payment](docs/screenshots/6_business_bulk_payment.png) | ![Business Magazines](docs/screenshots/6_business_magazines.png) |

**Operacje:**
- **Wysyłanie paczek:** `docs/screenshots/6_business_sending_packages.png`
- **Zgłoszenia/Wnioski:** `docs/screenshots/6_business_request.png`

---

### 4. Obsługa Paczek (Wspólne)

| Śledzenie Przesyłki | Odbiór Paczki |
| :---: | :---: |
| ![Tracking](docs/screenshots/9_tracking_package.png) | ![Pickup](docs/screenshots/10_pickup_package.png) |

---

### 5. Panel Administratora

Zarządzanie całym systemem logistycznym.

| Dashboard Admina | Logistyka |
| :---: | :---: |
| ![Admin Dashboard](docs/screenshots/11_admin_dashboard.png) | ![Admin Logistics](docs/screenshots/11_admin_logistics.png) |

**Zarządzanie Infrastrukturą:**

| Paczkomaty i Skrytki | Magazyny |
| :---: | :---: |
| ![Postmats](docs/screenshots/12_admin_postmats_and_stashes.png) | ![Warehouses](docs/screenshots/12_admin_warehouses.png) |

![Packages Management](docs/screenshots/12_admin_packages.png)
*Lista wszystkich paczek w systemie*

---

### 6. Inne

![FAQ](docs/screenshots/5_faq.png)
*Sekcja Najczęściej Zadawanych Pytań*

---

## 🔧 Dodatkowa Konfiguracja

### Ustawienie SMTP hasła do .env pliku:
https://myaccount.google.com/apppasswords

### Klucz Stripe
Aby otrzymać klucze stripe nalezy wejść pod link (z wcześniej załozonym kontem):
https://dashboard.stripe.com/

---

&copy; 2024 [Nazwa Twojego Zespołu/Firmy]. Wszelkie prawa zastrzeżone.
