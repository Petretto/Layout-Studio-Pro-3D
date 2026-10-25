# 7.12.C2-A — transport i zaopatrzenie równoległych podmontaży

Data: 2026-10-25. **Podpakiet A odebrany; całe C2 i 7.12 pozostają w trakcie.** Następny pakiet B: ograniczone bufory gałęzi, według `MODEL_BUFOROW_PODMONTOW_C2.md`.

## Zakres

Zewnętrzny pakiet `przyklady/03_modul_urzadzenia/` 1.1.0, nadal 12 plików. Trzy jawne korpusy, cztery wózki z lokalizacją początkową i powrotami. Transport wykonują monterzy źródłowych operacji, bez dodatkowej obsady. Załadowany przejazd i pusty powrót po 10 s są odrębnymi założeniami syntetycznymi. Osiem jawnych zapasów materiałowych po 10 sztuk, zużycie przy starcie operacji, dostawy po 10 od 900 s co 900 s. Magazyn dostarcza przez inne osoby, bez modelowania ich obciążenia i bez rezerwowania monterów.

Generator nie wywołuje harmonogramu do wyznaczania oczekiwanych wyników. Literalne okna i rachunek przygotowano przed uruchomieniem silnika; przeszły za pierwszym sprawdzeniem. Poprawiono pozostały historyczny opis JIT 410/340 na aktualne 320/270 s. Nie zmieniono algorytmu aplikacji ani formatu pakietu/zapisów istniejących projektów.

Backup przed pracą: `backup/v0.4.0_przed_7_12c2_physical_a_20261025`, **632 pliki**, niezależnie odczytane i sprawdzone SHA-256 kopii PASS.

## Niezależne referencje

Tryb configured, JIT wyłączony, **3 sztuki i odstęp 1000 s**. Odstęp rozdziela zlecenia, aby izolować zbieganie gałęzi; nie jest próbą przepustowości pod obciążeniem.

| Próba | Baza — końce sztuk [s] | Zbalansowany — końce sztuk [s] |
| --- | --- | --- |
| Pełny zapas | 210, 1210, 2210 | 180, 1180, 2180 |
| Tylko SUP-MU-ZASIL: zapas początkowy 0 | 1100, 1210, 2210 | 1070, 1180, 2180 |

Przy pełnym zapasie przygotowania kończą w 50/60/40 s. Przewozy obu podzespołów 60–70, powroty 70–80. Korpus jedzie 70–80; integracja 80–150 lub 80–120. Ostatni przewóz i test dają 210/180 s. Przy braku zasilacza gałąź A startuje w 900 s; B i przygotowanie korpusu nadal w 0 s. JIT ma osobną referencję 3 szt./1 s = 320/270 s, bez transportu i zapasów.

## Weryfikacja

- Generator i `--check`: PASS; manifesty i wszystkie projekcje pakietu zgodne.
- Celowane C2: **6/6 PASS**, w tym 2 nowe próby fizyczne i 4 istniejące.
- Regresja network `7.12.C2|7.12.D|3.4m`: **28/28 PASS** (`outputs/qa/7_12c2_physical_a/tests.txt`). Dokładne okna obu wariantów, 6 partii i atomowe zużycie, 12 przewozów +12 powrotów, brak nakładania rezerwacji osób, osiem zapasów, historia fizyczna i niezmienność modelu. Próba dodania ograniczonego bufora jawnie odrzucona — to kontrola zabezpieczenia, nie odbiór buforów.
- Katalog/ZIP: **3/3 PASS**, kontrola CRC, manifestów i zgodności binarnej źródeł.
- `npm run build`: PASS, 1984 moduły; pozostaje wcześniejsze ostrzeżenie rozmiaru fragmentu JS.
- Rzeczywisty UI pod `127.0.0.1:5310`: pobranie bieżącego JSON, kopia ratunkowa i chroniony import, baza 2210 i wariant 2180 s, inspekcja sześciu zużytych partii. Próba braku zasilacza: pierwszy test 1020–1070, późniejsze sztuki bez opóźnienia. Odświeżenie zachowuje zapas 0 i wymaga ponownego obliczenia; przywrócenie wariantu odtwarza pełny zapas i wynik 2180 s. W 65 s historia pokazuje dwa wózki w przewozie 60–70 s i trzy korpusy w punkcie początkowym; brak geometrycznej drogi zgłoszony jawnie. 3D włączone, bez oddzielnej animacji partii podzespołów. Konsola: brak zarejestrowanych błędów. Dowody: `outputs/qa/7_12c2_physical_a/ui.json` i `physical_65.png`.
- Pełnej regresji nie powtarzano: poprzedni pakiet C1 ma okresowy wynik 425/425. W tym pakiecie zmieniono dane przykładu i testy, bez zmiany algorytmów.

## Ograniczenia i następny krok

Ograniczone bufory gałęzi nie są obsługiwane przez obecny scheduler buforowany; jego zabezpieczeń nie usunięto. Nieprzypisane reszty partii i ich położenie wymagają kontraktu przed integracją B. Decyzja użytkownika: **pojemność w sztukach podzespołu; partia 5 sztuk zajmuje 5**. Historia 3D dotyczy korpusów i wózków, nie brył partii. Trasy mają końce, czas i długość, bez geometrycznego przebiegu; pozycja w przejeździe pozostaje nieznana. Nie odebrano zbiorczego D ani całego A2. Aktualizacja instrukcji MD/HTML/PDF jest częścią tego pakietu; szczegóły kontroli PDF w `outputs/qa/manual_7_12c2_physical_a/report.json`.

Instrukcja MD/HTML/PDF zaktualizowana: 63 strony, 51 odwołań do obrazów, brak brakujących obrazów, pustych stron, tekstu poza stroną i brakujących sekcji. Zgodność HTML ze źródłem PASS. Wizualna kontrola arkusza stron 1–16 (w tym zmieniona strona 4) PASS; nie powtarzano oględzin wszystkich niezmienionych stron. Ekstraktor zgłosił ostrzeżenia FontBBox, bez błędu weryfikacji.

Postęp głównych ID bez zmiany: cały plan 61/72 (84,7%), pierwsze wydanie 61/68 (89,7%). Push nie potwierdza wdrożenia Vercel.
