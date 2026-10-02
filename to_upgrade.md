# Propozycje usprawnień aplikacji

## Aktualizacja v0.4.0 — dalszy rozwój po wdrożeniu grafu i zasobów

Wdrożone następniki, zasoby stanowisk, layout grafowy i edycję 3D opisuje ZMIANY_v0.4.0.md. Dalsze propozycje:

- Zasoby współdzielone i blokada wspólnego korpusu przy pracy równoległej po kilku stronach produktu.
- Czasy transportu wynikające z tras i odległości; dopiero wtedy przesunięcie stołu będzie wpływać na wynik czasowy.
- Bufory o ograniczonej pojemności, przezbrojenia i warianty produktów, zmienność czasów oraz awarie.
- CAD: selekcja wielu obiektów, grupy stanowisko/FIFO/operator, wyrównywanie, wymiarowanie i import planu hali.
- 3D: biblioteka modeli, import geometrii, uchwyty transformacji i animowany przepływ produktów. Obecnie zielone znaczniki wskazują aktywność, nie transport.
- Kalibracja na pomiarach Eko i ręczny odbiór obsługi myszy w docelowej przeglądarce.
- Raport porównawczy wariantów z kosztami obsady, inwestycji, zużyciem powierzchni i wynikiem symulacji.
- Odrębny etap przygotowania dystrybucji komercyjnej: instalator, aktualizacje, licencje zależności, kopie i testy akceptacyjne klientów.

Poniżej zachowane wymagania historyczne.

> Aktualizacja 27.09.2026: wdrożenie tej listy w lokalnej wersji v0.3 opisano w `ZMIANY_v0.3.md`. Zakres wykonanych testów i otwarte warunki odbioru znajdują się w `WERYFIKACJA_v0.3.md`, a opis aktualnych funkcji w `FUNKCJE_PROGRAMU.md`. Poniższa lista pozostaje zachowana jako pierwotne wymagania.

Poniższe uwagi powstały podczas przygotowywania instrukcji dla nowego użytkownika Layout Generator Pro 3D v0.2. Priorytety odnoszą się do wpływu na skuteczne ukończenie pierwszego projektu.

## P1  Przejrzystość zapisu i bezpieczeństwo danych

- Wyświetlać stan „niezapisane zmiany” oraz datę ostatniego eksportu lub zapisu. Obecnie projekt jest utrzymywany w stanie aplikacji, a eksport JSON jest jedynym wyraźnym sposobem zachowania pracy; nowy użytkownik może tego nie zauważyć.
- Po utworzeniu nowego projektu pokazywać krótkie przypomnienie „wyeksportuj JSON, aby zachować projekt”.
- Po kliknięciu JSON i DXF wyświetlać potwierdzenie z pełną nazwą pobranego pliku i informacją, gdzie przeglądarka zapisuje pliki.

## P1  Import danych i walidacja

- Dodać w interfejsie przyciski „Pobierz szablon CSV/XLSX” dla procesu i BOM wraz z opisem wymaganych kolumn oraz przykładem jednego wiersza.
- Po imporcie wyświetlać raport: liczba odczytanych wierszy, pominięte wiersze, błędne ID, brakujące kolumny i duplikaty. Obecny komunikat jest zbyt ogólny, aby szybko poprawić plik.
- Walidować i wskazywać w UI odwołania BOM do nieistniejącego kroku procesu oraz poprzedniki operacji, których nie ma na liście.

## P1  Prowadzenie użytkownika przez projekt

- Wprowadzić pasek postępu z walidacją etapów: popyt -> proces -> BOM -> Yamazumi -> 3D -> CAD. Obecne karty można otworzyć w dowolnej kolejności, lecz aplikacja nie wskazuje brakujących danych ani gotowości etapu.
- W widoku startowym dodać przycisk „Rozpocznij z przykładem” i osobny „Rozpocznij od zera”, z krótkim opisem konsekwencji. Szablony w nagłówku są mało widoczne dla początkujących.
- Dodać kontekstowe podpowiedzi do wskaźników Lean: takt, OEE, VA/NVA, RPW, LCR, WIP i Spaghetti.

## P2  Edycja procesu i BOM

- Dodać potwierdzenie przed usunięciem kroku procesu lub pozycji BOM oraz przycisk Cofnij. Usunięcie kroku dodatkowo zmienia zależności innych kroków, co ma istotny efekt uboczny.
- Umożliwić walidację cykli oraz automatyczne uporządkowanie sekwencji procesu przed przejściem do Yamazumi.
- Wyraźnie pokazać, że edycja czasu standardowego automatycznie przelicza VA/NVA według stałej proporcji, i pozwolić użytkownikowi wybrać lub ręcznie zmienić tę proporcję.

## P2  Wyniki bilansu i layoutu

- Na Yamazumi dodać jednoznaczne oznaczenie „przekracza takt / w normie” dla każdej stacji oraz listę wąskich gardeł, nie tylko wykres.
- Przedstawić założenia automatycznego generowania layoutu: odległości, kolejność stanowisk, sposób rozmieszczenia dla U/L/linii i wpływ wyboru układu.
- Pozwolić edytować wymiary hali, siatkę i przeszkody w interfejsie, a nie tylko prezentować wynik; obecnie rzut 2D i 3D są przede wszystkim widokami wynikowymi.
- Uzupełnić symulację o czytelne objaśnienie tego, co oznaczają WIP, throughput i „Cel Partii”, oraz zapis wyników symulacji do raportu/CSV.

## P3  Ergonomia interfejsu

- W węższym oknie górny pasek z szablonami, wyborem układu i eksportami łatwo staje się ciasny. Warto wprowadzić menu „Więcej” lub responsywne przenoszenie akcji do drugiego wiersza.
- Dodać nazwy i dymki do samych ikon w narzędziach 2D oraz legendę kolorów na rzucie.
- Na ekranach 3D i 2D dodać przycisk „Dopasuj cały layout do widoku” oraz prostą legendę sterowania, widoczną także po pierwszym użyciu.
