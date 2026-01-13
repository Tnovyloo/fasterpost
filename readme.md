## Spis treści
1. [O projekcie](#-o-projekcie)
2. [Zespół](#-zespół)
3. [Stos Technologiczny](#-stos-technologiczny-tech-stack)
4. [Struktura Projektu](#-struktura-projektu)
5. [Modele Danych](#-modele-danych-backend)
6. [Logika Działania Aplikacji](#-logika-działania-aplikacji)
7. [Komunikacja, Autoryzacja i API](#-komunikacja-autoryzacja-i-api)
8. [Zadania Asynchroniczne](#-zadania-asynchroniczne-celery)
9. [Konteneryzacja](#-konteneryzacja-docker-compose)
10. [Testy i CI/CD](#-testy-i-cicd)
11. [Instalacja i Uruchomienie](#-instalacja-i-uruchomienie)
12. [Funkcjonalności](#-funkcjonalności)
13. [Przegląd Widoków (Galeria)](#-przegląd-widoków-galeria)
14. [Dodatkowa Konfiguracja](#-dodatkowa-konfiguracja)

---

## 1. Wstęp i Cel Projektu

**FasterPost** to kompleksowy system logistyczny obsługujący proces dostarczania przesyłek w modelu dwuwarstwowym:
1.  **Logistyka Krajowa (Hub-to-Hub):** Transport międzygrodowy pomiędzy głównymi magazynami.
2.  **Logistyka Lokalna (Last Mile):** Dostarczanie przesyłek z magazynów lokalnych do paczkomatów.

Celem aplikacji jest optymalizacja tras kurierskich, zarządzanie flotą pojazdów oraz automatyzacja procesu alokacji przesyłek do skrytek paczkomatowych.

---

## Zespół

| Profil GitHub | Rola w projekcie |
| :--- | :--- |
| [Oleksii Nawrocki](https://github.com/Tnovyloo/fasterpost) | Lider zespołu / Logistics |
| [Tomasz Nowak](https://github.com/Tnovyloo) | Auth / Backend |

---

## 2. Stos Technologiczny (Tech Stack)

Aplikacja została zbudowana w architekturze klient-serwer (rozdzielony frontend i backend).

### Backend
*   **Język:** Python 3.x
*   **Framework:** Django (z Django REST Framework)
*   **Baza danych:** PostgreSQL (relacyjna)
*   **Biblioteki algorytmiczne:** NumPy, Scikit-learn (do K-Means), GeoPy (do obliczeń geograficznych).

### Frontend
*   **Framework:** Next.js (React)
*   **Język:** TypeScript / JavaScript
*   **UI:** Tailwind CSS / Lucide React (ikony)
*   **Komunikacja:** Axios / Fetch API

---

## 3. Struktura Projektu

Projekt podzielony jest na dwa główne katalogi:

```text
fasterpost/
├── backend/                 # Logika biznesowa i API (Django)
│   ├── accounts/            # Zarządzanie użytkownikami i autoryzacją
│   ├── packages/            # Logika przesyłek i śledzenia
│   ├── logistics/           # Aplikacja: Logistyka Krajowa
│   │   ├── services/        # Algorytmy routingu (VRP)
│   │   └── models.py        # Modele Hubów i Tras krajowych
│   ├── postmats/            # Aplikacja: Logistyka Lokalna
│   │   ├── management/      # Komendy (np. seed_zones - K-Means)
│   │   ├── services/        # Algorytmy TSP i alokacji skrytek
│   │   └── models.py        # Modele Paczkomatów i Przesyłek
│   ├── core/                # Ustawienia globalne, konfiguracja Celery
│   ├── tests/               # Testy jednostkowe i integracyjne
│   ├── Dockerfile           # Obraz dla backendu
│   └── requirements.txt     # Zależności Python
├── frontend/                # Interfejs użytkownika (Next.js)
│   ├── src/
│   │   ├── components/      # Komponenty React
│   │   ├── pages/           # Widoki aplikacji
│   │   └── services/        # Klient API (połączenie z backendem)
│   └── Dockerfile           # Obraz dla frontendu
├── .github/                 # Konfiguracja CI/CD (GitHub Actions)
│   └── workflows/
│       └── tests.yml        # Automatyczne uruchamianie testów
├── docker-compose.yml       # Orkiestracja kontenerów
└── docs/                    # Dokumentacja projektowa
```

---

## 4. Modele Danych (Backend)

System opiera się na relacyjnej bazie danych. Kluczowe encje to:

### A. Użytkownicy (Accounts)
*   **User:** Rozszerzony model użytkownika Django.
    *   `email` (Primary Key), `first_name`, `last_name`.
    *   `role`: Enum (`client`, `courier`, `admin`, `warehouse_manager`).
    *   `warehouse`: FK do `Warehouse` (tylko dla kurierów i magazynierów - przypisanie do bazy).

### B. Logistyka (Logistics)
*   **Hub (Magazyn):** Reprezentuje węzeł w sieci krajowej.
    *   `name`, `city`, `address`.
    *   `latitude`, `longitude` (Decimal).
    *   `connections`: Many-to-Many (graf połączeń między magazynami).
*   **Vehicle (Pojazd):**
    *   `registration_number`, `capacity` (domyślnie 50).
    *   `max_work_minutes` (720), `current_hub` (FK).
*   **Route (Trasa Krajowa):**
    *   `courier` (FK User), `scheduled_date`.
    *   `status` (`planned`, `in_progress`, `completed`).
    *   `total_distance`, `estimated_duration`.
*   **RouteStop (Przystanek):**
    *   `route` (FK), `order` (int), `warehouse` (FK) lub `postmat` (FK).
    *   `arrival_time`, `departure_time`.

### C. Paczkomaty (Postmats)
*   **Zone (Strefa):**
    *   `name`, `warehouse` (FK), `color` (do wizualizacji na mapie).
*   **Postmat (Paczkomat):**
    *   `name`, `address`, `latitude`, `longitude`.
    *   `zone` (FK Zone - wynik algorytmu K-Means).
    *   `is_active` (bool).
*   **Stash (Skrytka):**
    *   `postmat` (FK), `size` (`small`, `medium`, `large`).
    *   `is_empty` (bool), `reserved_until` (DateTime, nullable).
*   **Package (Paczka):**
    *   `tracking_number` (UUID/String).
    *   `sender` (FK User), `receiver_email`.
    *   `size`, `weight`.
    *   `status` (`created`, `paid`, `in_warehouse`, `in_transit`, `delivered`).
    *   `origin_postmat` (FK), `destination_postmat` (FK).
*   **Actualization (Historia statusów):**
    *   `package` (FK), `status`, `timestamp`, `location_description`.

Schemat relacji encji (ERD):

!ERD Diagram

---

## 5. Logika Działania Aplikacji

### 5.1. Warstwa Krajowa (Hub-to-Hub)
Logika zaimplementowana w `backend/logistics/services/routing_service.py`.
1.  **Problem:** CVRP (Capacitated Vehicle Routing Problem) z oknami czasowymi.
2.  **Algorytm:** Heurystyka zachłanna (Greedy Construction).
3.  **Przebieg:**
    *   System grupuje paczki według Huba startowego.
    *   Dla każdego pojazdu wybierany jest cel metodą **Nearest Neighbor** (Najbliższy Sąsiad).
    *   Sprawdzane są ograniczenia: czas pracy (12h) i pojemność.
    *   **Backhauling:** W drodze powrotnej pojazd zabiera paczki zmierzające do jego bazy macierzystej, aby uniknąć "pustych przebiegów".

### 5.2. Warstwa Lokalna (Last Mile)
Logika zaimplementowana w `backend/postmats/services/routing_service.py`.
1.  **Zoning (K-Means):** Miasto dzielone jest na strefy (klastry) w oparciu o lokalizację paczkomatów. Kurierzy są przypisani do stref.
2.  **Alokacja:** Przed wyjazdem system sprawdza dostępność skrytek (`is_empty=True`) w paczkomacie docelowym. Jeśli brak miejsca -> status *DELAYED*.
3.  **Routing (TSP):** Wewnątrz strefy trasa wyznaczana jest algorytmem **Nearest Neighbor** z użyciem formuły **Haversine** do obliczania odległości sferycznej.

### 5.3. Zarządzanie Przesyłką i Płatności
1.  **Nadawanie i Wybór Paczkomatu:**
    *   Użytkownik wybiera paczkomat nadawczy i odbiorczy z interaktywnej mapy (Frontend).
    *   System filtruje paczkomaty dostępne w bazie danych, umożliwiając wybór tylko aktywnych punktów.
2.  **Płatności:**
    *   Koszt przesyłki obliczany jest dynamicznie na podstawie wybranego gabarytu (S/M/L) oraz wagi.
    *   System przewiduje integrację z bramką płatności Stripe. Po pomyślnej transakcji paczka zmienia status na `PAID` i staje się widoczna dla algorytmów logistycznych oraz niemozliwa jest jej pozniejsza edycja.
3.  **Edycja Danych:**
    *   Edycja przesyłki (np. zmiana odbiorcy, rozmiaru, paczkomatu docelowego) jest możliwa **wyłącznie przed dokonaniem płatności** (status `CREATED`).
    *   Po opłaceniu (`PAID`) dane są "zamrożone", ponieważ system mógł już rozpocząć proces rezerwacji skrytki lub planowania logistyki.

### 5.4. Szczegóły Systemu Rezerwacji Skrytek
Mechanizm ten zapobiega przepełnieniu paczkomatów (logika w `backend/postmats/services/routing_service.py`).

1.  **Weryfikacja przed trasą:** Podczas generowania trasy lokalnej, system sprawdza dostępność skrytek w paczkomacie docelowym dla każdej paczki.
2.  **Kryteria dostępności:** Skrytka jest uznana za wolną tylko wtedy, gdy spełnia łącznie dwa warunki:
    *   Jest fizycznie pusta (`is_empty=True`).
    *   Nie posiada aktywnej rezerwacji (`reserved_until IS NULL`).
3.  **Dopasowanie:** Algorytm dobiera skrytkę odpowiednią do rozmiaru paczki (S do S, M do M itd.).
4.  **Rezerwacja (Lock):**
    *   W momencie utworzenia paczki, system rezerwuje skrytkę na 24 godziny.
    *   Po opłaceniu przesyłki, rezerwacja jest odnawiana na kolejne 24 godziny od momentu płatności.
    *   Status skrytki zmienia się na zajęty (`is_empty=False`), co blokuje możliwość przypisania tam innej paczki przez ten czas.
5.  **Brak miejsca:** Jeśli paczkomat jest pełny, paczka otrzymuje status `DELAYED` i zostaje w magazynie do następnego cyklu dostaw.

---

## 6. Komunikacja, Autoryzacja i API

Aplikacja wykorzystuje architekturę **REST API**. Frontend komunikuje się z backendem za pomocą zapytań HTTP (JSON).

**Role w systemie:**
    - **Użytkownik:** Może tworzyć przesyłki i śledzić tylko swoje paczki.
    - **Kurier:** Ma dostęp do przypisanych mu tras oraz możliwość zmiany statusu paczek (np. przy odbiorze/dostarczeniu).
    - **Magazynier/Admin:** Pełny dostęp do zarządzania flotą i generowania tras.

### 6.1. Dokumentacja API (Swagger/OpenAPI)
Pełna lista endpointów, wraz z wymaganymi parametrami i strukturą odpowiedzi, jest generowana automatycznie i dostępna pod adresem:
*   **Swagger UI:** `/api/schema/swagger-ui/`
*   **Redoc:** `/api/schema/redoc/`

### 6.2. System Autoryzacji (HttpOnly Cookie)
System wykorzystuje standardowy mechanizm tokenów autoryzacyjnych, jednak ze względów bezpieczeństwa token jest przechowywany wyłącznie w ciasteczkach **HttpOnly Cookie**. Dzięki temu kod JavaScript (Frontend) nie ma do niego dostępu, co zabezpiecza aplikację przed atakami typu XSS.

#### Mechanizm działania:
1.  **Logowanie:** Użytkownik wysyła `email` i `password` na endpoint logowania.
2.  **Generacja Tokena:** Serwer weryfikuje dane i ustawia token w odpowiedzi jako ciasteczko z flagą `HttpOnly`.
    *   **Przechowywanie:** Ciasteczko jest niewidoczne dla skryptów JS.
    *   **Bezpieczeństwo:** `SameSite=Lax` oraz `Secure=True` (na produkcji).
3.  **Komunikacja:** Przeglądarka automatycznie dołącza ciasteczko do każdego zapytania do API. Backend odczytuje token z ciasteczka, a nie z nagłówka `Authorization`.
4.  **Wylogowanie:** Serwer wysyła polecenie usunięcia ciasteczka (set-cookie z datą w przeszłości).

#### Role i Uprawnienia (Permissions):
System wykorzystuje niestandardowe klasy uprawnień (Custom Permissions) w Django:
*   `IsCourier`: Sprawdza, czy `user.role == 'courier'`.
*   `IsWarehouseManager`: Dostęp do panelu generowania tras.
*   `IsOwnerOrReadOnly`: Użytkownik widzi tylko swoje paczki, chyba że jest pracownikiem.

### Szczegółowy przepływ danych:

#### Scenariusz 1: Wyświetlenie mapy paczkomatów
1.  **Frontend:** Użytkownik wchodzi na stronę mapy. Komponent React (np. `MapComponent`) w hooku `useEffect` wywołuje funkcję serwisu.
2.  **Request:** `GET /api/postmats/`
3.  **Backend:**
    *   Django Viewset odbiera zapytanie.
    *   Pobiera listę obiektów `Postmat` z bazy danych.
    *   Serializer zamienia obiekty Pythonowe na JSON (zawierający `lat`, `lng`, `status`).
4.  **Response:** JSON z listą paczkomatów.
5.  **Frontend:** Otrzymuje dane i renderuje markery na mapie (np. używając Leaflet lub Google Maps).

#### Scenariusz 2: Generowanie tras (Panel Administratora)
1.  **Frontend:** Administrator klika przycisk "Generuj Trasy".
2.  **Request:** `POST /api/logistics/generate-routes/`
3.  **Backend:**
    *   Uruchamia `RoutingService`.
    *   Algorytm pobiera nieobsłużone paczki.
    *   Wylicza trasy (zgodnie z logiką opisaną w pkt 5).
    *   Zapisuje nowe obiekty `Route` w bazie danych.
    *   Zwraca status operacji.
4.  **Response:** `200 OK` + podsumowanie (np. "Wygenerowano 5 tras").
5.  **Frontend:** Wyświetla powiadomienie o sukcesie i odświeża listę tras.

#### Scenariusz 3: Śledzenie paczki
1.  **Frontend:** Klient wpisuje numer paczki.
2.  **Request:** `GET /api/packages/{id}/track/`
3.  **Backend:** Sprawdza status paczki i jej ostatnią lokalizację (Hub lub Paczkomat).
4.  **Response:** JSON `{ "status": "IN_TRANSIT", "location": "Hub Warszawa", "estimated_delivery": "2024-05-20" }`.

---

## 7. Zadania Asynchroniczne (Celery)

Ze względu na złożoność obliczeniową algorytmów oraz konieczność wysyłania powiadomień, projekt wykorzystuje **Celery** z brokerem wiadomości **Redis**.

### Główne zadania (Tasks):
2.  **`send_status_email_task`:**
    *   Wyzwalane sygnałem (Django Signals) przy zmianie statusu paczki (np. na `DELIVERED`).
    *   Wysyła e-mail do klienta z informacją o zmianie statusu.
3.  **`release_expired_reservations`:**
    *   Zadanie okresowe (Celery Beat).
    *   Sprawdza skrytki, których `reserved_until` minął, i zwalnia je (`is_empty=True`), jeśli paczka nie dotarła.

---

## 8. Konteneryzacja (Docker Compose)

Całe środowisko jest skonteneryzowane, co zapewnia spójność między środowiskiem deweloperskim a produkcyjnym. Plik `docker-compose.yml` definiuje następujące usługi:

1.  **`db`:** Baza danych PostgreSQL (Alpine Linux). Dane są persystowane w wolumenie `postgres_data`.
2.  **`backend`:** Kontener Django (Gunicorn/Uvicorn).
    *   Zależy od `db` i `redis`.
    *   Uruchamia migracje przy starcie.
3.  **`frontend`:** Kontener Next.js (Node.js).
    *   Budowany wieloetapowo (Multi-stage build) dla optymalizacji rozmiaru obrazu.
4.  **`redis`:** Broker wiadomości dla Celery oraz cache.
5.  **`worker`:** Instancja Celery przetwarzająca zadania w tle.
6.  **`beat`:** Harmonogram zadań okresowych Celery.

Uruchomienie całego środowiska:
```bash
docker-compose up --build
```

---

## 9. Testy i CI/CD

Projekt kładzie duży nacisk na jakość kodu, wykorzystując testy automatyczne uruchamiane w potoku CI (GitHub Actions).

### Rodzaje testów:
*   **Testy Jednostkowe (Unit Tests):** Testowanie pojedynczych funkcji algorytmicznych (np. czy funkcja Haversine poprawnie liczy odległość).
*   **Testy Integracyjne (Integration Tests):** Testowanie endpointów API (np. czy próba rezerwacji zajętej skrytki zwraca błąd). Używamy `APITestCase` z Django REST Framework.

### Continuous Integration (CI):
Plik `.github/workflows/tests.yml` definiuje proces, który uruchamia się przy każdym `push` do repozytorium:
1.  Postawienie kontenera z bazą danych PostgreSQL (Service Container).
2.  Instalacja zależności (`pip install -r requirements.txt`).
3.  Uruchomienie lintera (np. `flake8`) w celu sprawdzenia stylu kodu.
4.  Wykonanie testów: `python manage.py test`.

---

## 10. Instalacja i Uruchomienie

### Wymagania wstępne
- Docker
- Docker Compose

### 10.1. Uruchomienie (Docker)

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

----
Aplikacja frontendowa jest dostępna pod adresem: `http://localhost:80`
Aplikacja backendowa jest dostępnia pod adresem: `http://localhost:8000`

### Przydatne komendy Docker

 - Zatrzymanie kontenerów: `docker-compose down`
 - Ponowne uruchomienie: `docker-compose up -d`
 - Logi: `docker-compose logs -f`

### 10.2. Uruchomienie Lokalne (Bez Dockera)

### Backend
```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_zones  # Inicjalizacja stref K-Means
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 11. Funkcjonalności

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

----
### Administrator
- [x] Zarządzanie użytkownikami (CRUD).
- [x] Zarządzanie paczkomatami i magazynami.
- [x] Podgląd logistyki.

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