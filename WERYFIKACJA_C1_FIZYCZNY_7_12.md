# 7.12.C1 — fizyczny odbiór projektu wózka warsztatowego

Data: 2026-10-25. Pakiet `przyklady/02_wozek_warsztatowy/` **1.1.0**, nadal 12 plików. Odebrano zakres jawnego modelu syntetycznego. C2/D i całe 7.12 pozostają otwarte. Brak geometrycznego przebiegu tras i odrębne źródła głównych widoków 4 są nadal ograniczeniami A2.

## Ustalenia i uzupełnienia

Poprzedni pakiet definiował role pracy na korpusie, długości/czasy tras, bufory i pięć zapasów, ale nie instancje korpusów ani zasoby wykonawcze trzech nazwanych wózków. Wzorce 390/315 s były wyłącznie JIT. Nie stanowiły odbioru fizycznego. Nie usunięto ich — pozostają osobnym eksperymentem procesowym.

Użytkownik wybrał **„Transport wykonują monterzy”**. W obu wariantach WW-W1 przewozi pomiędzy S1/S2 i wraca, WW-W2 pomiędzy S2/S3, WW-W3 pomiędzy S3/S4. WW-W5 w reorganizacji pomaga przy OP20, nie jest dodatkową osobą transportową. Zespół nadal liczy 4/5 osób. Trzy wózki mają jawne lokalizacje początkowe przy źródłowych stanowiskach i politykę powrotu. Pusty powrót **10 s** jest osobnym jawnym założeniem dydaktycznym, bez wyprowadzania go z istniejącego czasu przewozu. Kalendarze obejmują również transport.

Dodano trzy jawne korpusy i przypisanie do sztuk 1/2/3. Inna partia wymaga uzupełnienia własnych deklaracji — brak automatycznego powielania instancji. Uzupełniono pominięte WW-SRUBY i WW-WIESZ: osobne zapasy, jawna jednostka i zużycie jednego kompletu przy właściwej operacji. W sumie wszystkie siedem komponentów ma odrębne deklaracje; nic nie jest wyliczane z BOM przez symulator. Każdy zapas zaczyna od 10 zadeklarowanych jednostek, pierwsza dostawa 10 jednostek ma termin 900 s, następne co 900 s. Wszystkie dane są syntetyczne.

Formaty 4/6 i otoczki pakietu v1 bez zmian; stabilne ID zachowane. To nowa wersja zewnętrznego przykładu, bez automatycznej migracji/nadpisania projektów użytkownika. Odtworzenie poprzedniej wersji: przywrócić generator i katalog C1 z backupu/Git, ponownie przygotować katalog dystrybucji i build. Import starego pliku działa dotychczasową ścieżką. Projekty w przeglądarce nie są zmieniane przez budowanie aplikacji.

## Niezależne wzorce

Przed pierwszym uruchomieniem silnika zapisano w generatorze i referencjach ręczny rachunek wszystkich okien pracy. Generator **nie wywołuje schedulera** do wyznaczania oczekiwanych wyników.

| Eksperyment | Baza | Reorganizacja |
| --- | --- | --- |
| JIT, 3 sztuki, odstęp 1 s | 230/310/390 s | 195/255/315 s |
| Fizyczny, te same warunki, JIT OFF | 260/360/**460 s** | 225/305/**385 s** |
| Tylko SUP-RAMA: zapas początkowy 0, dostawa nadal 900 s | 1160/1260/**1360 s** | 1125/1205/**1285 s** |

Przykład wyprowadzenia: S1 pracuje 0–60, przewóz zajmuje montera 60–70, powrót 70–80; kolejne prace S1 80–140 i 160–220. Baza S2: 70–150, przewóz/powrót 150–170, następne prace 170–250 i 270–350. S3 startuje 160/260/360, pracuje 50 s, przewóz do S4 trwa 10 s, S4 pracuje 40 s. W reorganizacji S2 pracuje 70–115, 150–195, 230–275; S3 125–175, 205–255, 285–335. Stąd końce 225/305/385. Bez niedoboru materiałów brak dostaw przed końcem partii; każdy z siedmiu zapasów zużywa 3 jednostki i kończy na 7.

Osobna próba blokady: baza, wyjście S1=1, wejście S2=0, początek zmiany S2=600 s. Drugi wyrób kończy S1 w 120 s i pozostaje zarezerwowany na S1 do 590 s; dopiero wyjazd pierwszego wyrobu do bezpośredniego przekazania w 600 s zwalnia miejsce. Osoba kończy rezerwację obróbki w 120 s zgodnie z `bbas-worker-released`. Test w 500 s potwierdza obecność drugiego korpusu na S1.

## Weryfikacja

- Backup `backup/v0.4.0_przed_7_12c1_physical_20261025`: **631 plików**, niezależny odczyt skopiowanych SHA-256 PASS.
- Celowane C1: **6/6 PASS**, w tym 2 nowe testy fizyczne. Wszystkie 24 okna operacji obu wariantów zgodne z literalnym wzorcem; 9 przewozów +9 powrotów na wariant; po 10 s, właściwy monter na trasie. Kontrola braku nakładających się rezerwacji tych samych osób obejmuje również transport. Odtworzenie historii sprawdza finalne rejestry wózków i korpusów, brak mutacji projektu.
- Testy dostaw: oba warianty przesunięte o 900 s; dostawa poprzedza zużycie w tej samej chwili. Test blokady: koniec 120 s / zwolnienie stanowiska 590 s, operator zwolniony w 120 s; fizyczny korpus w 500 s nadal na S1. Nie dopasowywano wzorca do wyjścia silnika — wszystkie literalne oczekiwania przeszły za pierwszym uruchomieniem testów C1.
- **Okresowa pełna regresja sekwencyjna 425/425 PASS: core 109/109, network 316/316.** Uzasadnienie: trzeci ukończony pakiet od poprzedniego pełnego przebiegu (katalog, A2b2b, fizyczny C1). Logi `outputs/qa/7_12c1_physical/core.txt` i `network.txt`. Progi i istniejące testy bez zmian.
- Generator C1 `--check` PASS; `tests/verify_demo_catalog.py` **3/3 PASS** (komplet ZIP, CRC, bajty i manifesty, samodzielny JSON, SHA katalogu). Katalog dystrybuuje wersję 1.1.0 i nowe warunki; cztery projekty nadal są zewnętrznymi plikami.
- **Build TypeScript/Vite PASS**, 1984 moduły, dotychczasowe ostrzeżenie dużych chunków. Kod aplikacji/schedulera nie był zmieniany w tym pakiecie.
- **Rzeczywisty UI cua_repl**, osobny produkcyjny adres `127.0.0.1:5309`: pobranie aktualnego C1 z katalogu, import z podglądem/kopią/potwierdzeniem, configured 3 szt./1 s → baza 460 s i reorganizacja 385 s. Inspekcja pokazała 18 ruchów z monterami WW-W1/W2/W3 i siedem zapasów 10/0/3/7. Zmiana SUP-RAMA na 0 w zwykłym edytorze, zapis i ponowne obliczenie reorganizacji → **1285 s**. Odświeżenie zachowało zapas 0, bez starego wyniku. Wczytanie zapisanego wariantu przywróciło zapas i 385 s.
- UI A2b2b w 65 s: trzy korpusy i trzy wózki w tabeli, BODY-1 i CART-1 w przejeździe 60–70 s (50% czasu), brak geometrycznej pozycji w ruchu jawny; pozostałe instancje przy prawidłowych stanowiskach. WebGL działa, brak zarejestrowanych błędów konsoli w tej ścieżce. Zrzut `physical_65.png`. Próba blokady i wariant bazowy opóźnionej dostawy są odebrane automatycznie; nie powtarzano ich całej konfiguracji w UI.
- Instrukcja MD/HTML/PDF, README, katalog i plan zaktualizowane. **62 strony, 51 ilustracji**; zgodność HTML/MD i komplet obrazów/sekcji PASS, bez pustych stron ani słów poza stroną. Wizualny przegląd stron 1–16, w tym zmienionych 3–4 PASS. Wynik kontroli PDF zapisany w `outputs/qa/manual_7_12c1_physical/`. Nie potwierdzono Vercel.

**Status:** C1 odebrany w powyższym zakresie; następny fizyczny C2 i zbiorczy D. Główne liczniki bez zmiany: **61/72 = 84,7%**, pierwsze wydanie **61/68 = 89,7%**.
