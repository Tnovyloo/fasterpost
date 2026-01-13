# Dokumentacja Algorytmów Logistycznych FasterPost

```
Oleksii Nawrocki
Tomasz Nowak
```

## Spis Treści
1. Wstęp
2. Logika Tras Krajowych (Hub-to-Hub)
    * Teoria: Problem VRP
    * Implementacja Algorytmu
    * Mechanizmy Optymalizacyjne
3. Logika Tras Lokalnych (Last Mile)
    * Faza 1: Klasteryzacja (K-Means)
    * Faza 2: Alokacja Zasobów
    * Faza 3: Wyznaczanie Trasy (TSP)
4. Podsumowanie Matematyczne

---

## 1. Wstęp

System **FasterPost** wykorzystuje dwuwarstwową architekturę logistyczną:
1.  **Warstwa Krajowa (Logistics):** Transport paczek między magazynami głównymi (Hubami). Celem jest przewiezienie paczek na duże odległości przy ograniczeniach czasu pracy kierowców i pojemności pojazdów.
2.  **Warstwa Lokalna (Postmats):** Dostarczanie paczek z magazynu docelowego do paczkomatów (Last Mile Delivery). Celem jest obsługa gęstej siatki punktów w mieście.

---

## 2. Logika Tras Krajowych (Hub-to-Hub)

**Plik źródłowy:** `backend/logistics/services/routing_service.py`

### Teoria: Problem VRP
Problem ten jest wariantem **CVRP (Capacitated Vehicle Routing Problem)** z ograniczeniem czasowym (Time Windows/Max Duration).
*   **Cel:** Zminimalizować liczbę nieobsłużonych paczek i łączny dystans, przy zachowaniu ograniczeń.
*   **Ograniczenia:**
    *   Maksymalny czas pracy: 720 minut (12h).
    *   Pojemność pojazdu: 50 paczek.
    *   Średnia prędkość: 1.33 km/min (~80 km/h).
    *   Czas postoju w punkcie: 15 minut.

### Implementacja Algorytmu Krajowego

Algorytm działa w sposób **zachłanny (Greedy Construction Heuristic)** z elementami lokalnego przeszukiwania dla "Backhauling" (ładunków powrotnych).

#### Krok 1: Grupowanie i Inicjalizacja
Paczki są pobierane z bazy danych i grupowane według magazynu startowego (Hubu). Dla każdego Hubu algorytm sprawdza dostępność kurierów przypisanych *ściśle* do tego magazynu.

#### Krok 2: Konstrukcja Trasy (Nearest Neighbor)
Dla dostępnego pojazdu algorytm buduje trasę iteracyjnie:
1.  **Start:** Magazyn źródłowy.
2.  **Wybór następnego kroku:** Spośród paczek oczekujących w pojeździe, algorytm szuka magazynu docelowego, który jest **najbliżej** obecnej lokalizacji (`Nearest Neighbor`).
3.  **Weryfikacja Wykonalności:** Przed dodaniem punktu sprawdzane jest, czy po dojechaniu do celu i powrocie do bazy nie zostanie przekroczony limit `MAX_WORK_DAY_MINUTES`.

#### Krok 3: Obsługa "Stranded Packages" (Transfer Hubs)
Jeśli nie można dowieźć paczki bezpośrednio do celu (zbyt daleko, brak czasu), algorytm szuka **Huba Pośredniego (Transfer Hub)**.
*   **Warunek:** Hub pośredni musi znajdować się bliżej celu ostatecznego niż obecna lokalizacja (dodatni `progress`).
*   **Działanie:** Paczka jest zostawiana w Hubie pośrednim, skąd inny kierowca zabierze ją w kolejnym cyklu.

#### Krok 4: Backhauling (Ładunki Powrotne)
Gdy pojazd ma wolne miejsce (`available_space > 0`) i znajduje się w obcym magazynie, algorytm sprawdza, czy są tam paczki, które muszą trafić do magazynu startowego kierowcy. Pozwala to uniknąć "pustych przebiegów" w drodze powrotnej.

### Przykład Działania (Krajowy)
Załóżmy:
*   Start: **Warszawa**
*   Paczki w pojeździe do: **Kraków**, **Gdańsk**.

1.  Algorytm oblicza dystanse: Warszawa->Kraków (300km), Warszawa->Gdańsk (340km).
2.  Wybiera **Kraków** (bliżej).
3.  Sprawdza czas: Dojazd + Rozładunek + Powrót do Warszawy < 720 min? **TAK**.
4.  Pojazd jedzie do Krakowa.
5.  W Krakowie: Zostały paczki do Gdańska. Dystans Kraków->Gdańsk jest ogromny. Czas pracy się kończy.
6.  **Transfer Hub:** Algorytm szuka huba pośredniego. Jeśli Łódź jest po drodze i bliżej Gdańska, paczki mogą zostać zrzucone w Łodzi.
7.  **Backhaul:** W Krakowie są paczki do Warszawy. Kierowca ładuje je i wraca do bazy.

---

## 3. Logika Tras Lokalnych (Last Mile)

System lokalny składa się z dwóch etapów: statycznego podziału na strefy (Zoning) i dynamicznego wyznaczania tras (Routing).

### Faza 1: Klasteryzacja Stref (K-Means)

**Plik źródłowy:** `backend/postmats/management/commands/seed_zones.py`

Aby uprościć problem komiwojażera (TSP) dla dużej liczby paczkomatów, system dzieli miasto na **Strefy (Zones)**. Wykorzystywany jest algorytm **K-Means Clustering**.

#### Algorytm K-Means:
1.  **Inicjalizacja:** Wybierz losowo $k$ paczkomatów jako środki klastrów (centroidy).
2.  **Przypisanie:** Dla każdego paczkomatu znajdź najbliższy centroid (odległość euklidesowa).
3.  **Aktualizacja:** Oblicz nowe współrzędne centroidów jako średnią arytmetyczną współrzędnych (lat, lon) wszystkich punktów w klastrze.
4.  **Iteracja:** Powtarzaj kroki 2-3 przez ustaloną liczbę razy (w kodzie: 10 iteracji).

**Efekt:** Każdy magazyn ma przypisane strefy (np. Północ, Południe), a kurierzy są przydzielani do konkretnych stref, co zwiększa ich efektywność (znajomość terenu).

### Faza 2: Alokacja Zasobów (Skrytek)

**Plik źródłowy:** `backend/postmats/services/routing_service.py` (metoda `_allocate_stashes`)

Zanim trasa zostanie wyznaczona, system musi zagwarantować, że w paczkomacie docelowym jest wolna skrytka.

1.  Pobierane są puste skrytki (`is_empty=True`) dla danego paczkomatu.
2.  Dopasowanie rozmiaru (Small/Medium/Large).
3.  **Rezerwacja:** Jeśli skrytka jest dostępna, jest tymczasowo rezerwowana w pamięci (`_reserved_stash`).
4.  **Odrzucenie:** Jeśli brak skrytek, paczka otrzymuje status "delayed" i nie wchodzi do trasy na dany dzień.

### Faza 3: Wyznaczanie Trasy (TSP)

**Plik źródłowy:** `backend/postmats/services/routing_service.py` (metoda `_create_zone_route`)

Dla paczek w danej strefie, które przeszły alokację, wyznaczana jest trasa.
Problem: **TSP (Traveling Salesperson Problem)**.
Rozwiązanie: **Algorytm Najbliższego Sąsiada (Nearest Neighbor)**.

#### Algorytm:
1.  **Start:** Magazyn lokalny.
2.  **Pętla:**
    *   Znajdź paczkomat z listy `remaining`, który jest najbliżej obecnej lokalizacji.
    *   Oblicz odległość używając **formuły Haversine'a** (uwzględnia krzywiznę Ziemi).
    *   Dodaj paczkomat do listy przystanków.
    *   Ustaw paczkomat jako nową obecną lokalizację.
3.  **Powrót:** Dodaj dystans powrotny do magazynu.
4.  **Zapis:** Utwórz obiekty `Route`, `RouteStop` i `RoutePackage` w bazie danych.

### Wzór Haversine'a (użyty w kodzie):
Służy do obliczania odległości "w linii prostej" po powierzchni sfery (Ziemi).

$$ a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1) \cdot \cos(\phi_2) \cdot \sin^2\left(\frac{\Delta\lambda}{2}\right) $$
$$ c = 2 \cdot \text{atan2}(\sqrt{a}, \sqrt{1-a}) $$
$$ d = R \cdot c $$

Gdzie:
*   $\phi$ - szerokość geograficzna (latitude)
*   $\lambda$ - długość geograficzna (longitude)
*   $R$ - promień Ziemi (6371 km)

---

## 4. Podsumowanie Matematyczne

| Cecha | Logistyka Krajowa (Hub-to-Hub) | Logistyka Lokalna (Last Mile) |
| :--- | :--- | :--- |
| **Problem algorytmiczny** | CVRP z oknami czasowymi | TSP (Problem Komiwojażera) |
| **Metoda rozwiązania** | Heurystyka konstrukcyjna (Greedy) | Nearest Neighbor (Greedy) |
| **Metryka odległości** | Graf drogowy (DistanceService) | Odległość sferyczna (Haversine) |
| **Grupowanie** | Według magazynu źródłowego | K-Means Clustering (Strefy) |
| **Ograniczenia** | Czas pracy (720 min), Pojemność (50) | Dostępność skrytek (Allocation) |
| **Prędkość średnia** | 1.33 km/min (~80 km/h) | 0.5 km/min (~30 km/h) |

### Przykład kodu (Pseudokod TSP Lokalnego):

```python
current_location = Warehouse
remaining_postmats = [P1, P2, P3, P4]
route = [Warehouse]

while remaining_postmats is not empty:
    nearest = FindMinDistance(current_location, remaining_postmats)
    route.append(nearest)
    current_location = nearest
    remaining_postmats.remove(nearest)

route.append(Warehouse) // Powrót
```
