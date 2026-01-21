
---

# Sprawozdanie z Realizacji Projektu FasterPost Express

**Temat:** Optymalizacja Logistyki Miejskiej (Last Mile) – Klasteryzacja Stref i Rozwiązywanie Problemu TSP

**Data wykonania:** 5 styczeń 2026 r.

**Autorzy:** Oleksii Nawrocki, Tomasz Nowak

**Kierunek:** Informatyka, Rok 3, 2025/2026

---

## 1. Cel Zadania

Celem tego etapu prac było zaprojektowanie i wdrożenie systemu dystrybucji paczek w skali miejskiej. Głównym wyzwaniem było efektywne podzielenie miasta na strefy operacyjne oraz wyznaczenie optymalnych tras kurierskich łączących magazyn lokalny z wieloma paczkomatami (Postmatami), przy uwzględnieniu dynamicznie zmieniającej się dostępności skrytek.

## 2. Architektura Logistyki Lokalnej (Last Mile)

W przeciwieństwie do logistyki krajowej, warstwa lokalna charakteryzuje się dużą gęstością punktów odbioru i mniejszymi odległościami. System został podzielony na trzy kluczowe fazy procesowe.

### 2.1. Monitoring Systemowy

Zarządzanie procesem lokalnym odbywa się z poziomu centralnego panelu kontrolnego, który pozwala na nadzór nad wszystkimi trasami w czasie rzeczywistym.

*[Rys 1. Centralny interfejs monitorowania statusu logistycznego systemu FasterPost]*

## 3. Implementacja Algorytmów

### Faza 1: Statyczny Podział na Strefy (K-Means Clustering)

Aby uniknąć sytuacji, w której dwóch kurierów jeździ w te same rejony miasta, zaimplementowaliśmy algorytm **K-Means**. Pozwala on na automatyczne pogrupowanie paczkomatów w zwarte geograficznie strefy (Zones).

**Przebieg procesu:**

1. **Inicjalizacja:** System losuje  punktów (centroidów).
2. **Przypisanie:** Każdy paczkomat zostaje przypisany do najbliższego centroidu na podstawie odległości euklidesowej.
3. **Aktualizacja:** Wyznaczane są nowe środki klastrów jako średnia współrzędnych wszystkich przypisanych punktów.
4. **Konwergencja:** Po 10 iteracjach strefy są stabilne i gotowe do przypisania kurierom.

### Faza 2: Alokacja Zasobów i Rezerwacja Skrytek

Zanim kurier wyruszy w trasę, system wykonuje krytyczny krok: **_allocate_stashes**.

* System sprawdza fizyczną dostępność wolnych skrytek w bazie danych dla każdego paczkomatu na trasie.
* Paczki są dopasowywane pod kątem gabarytów (S, M, L).
* Tylko paczki z potwierdzoną rezerwacją skrytki trafiają na listę przewozową. Pozostałe są automatycznie przesuwane na kolejny dzień operacyjny, co eliminuje problem "pustych podjazdów".

### Faza 3: Wyznaczanie Trasy (Traveling Salesperson Problem)

Dla każdej strefy wyznaczana jest trasa przy użyciu algorytmu **Nearest Neighbor** (Najbliższego Sąsiada).

**Model Matematyczny (Formuła Haversine'a):**
Ponieważ w mieście precyzja jest kluczowa, do obliczania dystansu między współrzędnymi  wykorzystujemy wzór uwzględniający krzywiznę globu:

## 4. Weryfikacja Operacyjna

Po przeliczeniu trasy, kurier w magazynie lokalnym otrzymuje gotowy plan pracy. System wymusza start z magazynu, odwiedzenie wszystkich punktów w optymalnej kolejności i powrót do bazy.

![Panel Kontrolny Logistyki](/docs/screenshots/13_isi_logistic_control_warsaw.png)

Po zatwierdzeniu paczek, kurier widzi podsumowanie operacyjne trasy:

![Panel Kontrolny kuriera](/docs/screenshots/13_isi_localcourier_panel.png)

Odbieranie paczek z magazynu:

![Panel Kontrolny kuriera](/docs/screenshots/13_isi_localcourier_take_packages.png)

Wkładanie paczek do paczkomatu:

![Panel Kontrolny kuriera](/docs/screenshots/13_isi_localcourier_put_packages.png)

Finał trasy:
![Panel Kontrolny kuriera](/docs/screenshots/13_isi_localcourier_final.png)

## 5. Podsumowanie i Wnioski

Wdrożenie dwuetapowej optymalizacji (K-Means + TSP) przyniosło wymierne korzyści:

* **Efektywność paliwowa:** Dzięki podziałowi na strefy, kurierzy nie nakładają swoich tras na siebie.
* **Redukcja błędów:** System rezerwacji skrytek wyeliminował problem braku miejsca w paczkomacie w momencie dojazdu kuriera.
* **Skalowalność:** Algorytm radzi sobie z obsługą setek punktów w czasie krótszym niż 2 sekundy dzięki podziałowi na mniejsze podproblemy (strefy).

System jest w pełni zintegrowany z bazą danych PostgreSQL, co zapewnia spójność statusów paczek na każdym etapie dostawy "ostatniej mili".

---
