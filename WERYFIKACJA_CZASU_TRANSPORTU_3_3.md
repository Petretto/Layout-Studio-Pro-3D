# Weryfikacja czasu transportu — 3.3

## 3.3a / 3.3.1 — 2026-10-08

Backup `backup/v0.4.0_przed_3_3a_20261008`: 207 plików, niezależna kontrola SHA256 — 0 rozbieżności.

Zmiany: `transportTime.ts` (kontrakt, walidator, wzór i resolver), `stationRouting.ts` i `materialNetwork.ts` (opcjonalne parametry i rozłączne tryby, odczyt jednej aktualnej długości/czasu), `workerSchedule.ts` (nietrwałe wyliczenie czasu i opcjonalne składowe w wyniku). Formularze nie są częścią pakietu. Model w `MODEL_CZASU_TRANSPORTU_3_3.md`.

148/148 testów: PASS. Cztery nowe testy obejmują ręczny wzór 2 + 5000/1000 + 3 = 10 s, zmianę długości na 15 s, jawne zera obsługi, brak mutacji i brak pomiarowej etykiety wyliczonego wyniku. Odmowy: brak parametrów, niepoprawne wartości, źródła/pochodzenie, nieznane pola, dwa tryby, zerowa suma i przepełnienie. Pierwszy przebieg ujawnił brak przekazania jawnego wejścia korpusu w nowym teście zapisu; poprawiono test, bez zmiany reguł.

Pełny harmonogram dwóch korpusów z wyliczonym czasem 10 s jest równy harmonogramowi z wpisanym czasem 10 s po pominięciu nowych składowych. Sprawdzono czas transportu, zachowanie jednej lokalizacji przez odtworzenie wszystkich zdarzeń, wyłączność kopii i brak nakładających się rezerwacji osób, brak mutacji wejścia oraz pełną zgodność protokołu workera. Istniejące testy wyboru tras, kalendarzy, równoległości i starszych wyników pozostają poprawne.

Zapis/odczyt obejmuje parametry trasy stanowisk i zewnętrznej, bez zapisanego wyliczonego durationSeconds. Dokładne źródło zachowane; błąd sprzecznych trybów nie nadpisuje wcześniejszego szkicu. Połączenie materiałowe odczytuje aktualny czas po zmianie długości zarówno przez referencję, jak i dla własnej trasy zewnętrznej.

Build/typecheck: PASS. Edge CDP `verify_2_7e.mjs --branches --material --calculated` (5217/9357): PASS. Wszystkie skierowane trasy syntetycznych gałęzi mają jawne parametry dające dokładnie dotychczasową sekundę przewozu: załadunek 0,25 s, jazda 0,5 s i rozładunek 0,25 s. Rzeczywisty worker daje dotychczasowy wynik, a UI pokazuje wyliczony czas w odczycie połączenia materiałowego. Historia, ponowny odczyt, niezmienność parametrów, źródła i aktywnych zapisów 4/5 potwierdzone. Nieobsłużonych wyjątków JS brak. To odbiór rdzenia, odczytu i regresji, nie formularza wyliczeń.

Ograniczenia: brak domyślnych danych produkcyjnych, brak zasobów transportowych i nowych faz zdarzeń; cały przedział przewozu zawiera obsługę i jazdę. Nie włączono dostawy z magazynu do przebiegu ani nowych reguł do aktywnej symulacji 4/5. UI wpisywania parametrów, jednostek prędkości/czasu i inspekcji składowych pozostaje do 3.3.2. W obecnym edytorze nie należy próbować dodawać wpisanego czasu do trasy z zapisanym wyliczeniem: parser odrzuci sprzeczne tryby; wybór trybu zostanie udostępniony w 3.3.2.

Status 3.3.1: wdrożone w zakresie rdzenia i zapisu. 3.3: w trakcie. Postęp głównych ID: cały plan **22/67 = 32,8%**, pierwsze wydanie **22/65 = 33,8%**. Następny pakiet: 3.3.2 — formularze i zbiorczy odbiór UI.

## 3.3b / 3.3.2 — 2026-10-09

Backup `backup/v0.4.0_przed_3_3b_20261009`: 248 plików, niezależna kontrola SHA256: 0 rozbieżności.

`TransportTimingEditor.tsx` podłączono do tras stanowisk i zewnętrznych. Wybór brak/wpisany/wyliczany usuwa poprzedni tryb; nowe parametry są puste, bez domyślnych danych produkcyjnych. Jednostki mm/s, m/s, m/min i s/min są prezentacją; zapis używa mm/s i sekund. Każdy parametr wymaga źródła i pochodzenia. Podgląd sumy i składowych korzysta z resolvera rdzenia.

148/148 testów PASS, końcowy build/typecheck PASS. Edge CDP `verify_2_7e.mjs --branches --material --calculated --timing-editor` (5218/9358) i `--preparation --timing-editor` (5219/9359): PASS. Odmowa niepełnych parametrów bez nadpisania, 60 m/min = 1000 mm/s, min/s, rozłączne tryby, założona etykieta wyniku przy zmierzonych parametrach, składowe, Cofnij/Ponów, zapis/odczyt i zgodny wynik workera po odświeżeniu. Zewnętrzne parametry zapisane niezależnie; aktywne 4/5 i dokładne źródło zachowane. Brak nieobsłużonych wyjątków JS. Zrzuty: `outputs/qa/verify_3_3b_branches.png`, `outputs/qa/verify_3_3b_preparation.png`; wizualna kontrola formularza poprawna.

Poprawki z odbioru: oczekiwanie na zakończenie inicjalizacji przed migawką 4/5; konwersja m/min mnoży przed dzieleniem, aby uniknąć artefaktu 1000.0000000000001; test odczytu jawnie wpisuje odstęp przybycia zgodnie z kontraktem panelu. Eko parallel przeszedł regresję; nie zawiera tras między kopiami, więc odbiór formularza wykonano na dwóch innych procesach. Nie zmieniono schematu ani algorytmu harmonogramu.

Ograniczenia 3.3a pozostają: brak zasobów transportowych, osobnych zdarzeń faz, dostaw zewnętrznych w przebiegu i nowych reguł w aktywnej symulacji 4/5. Status 3.3.2 i 3.3: wdrożone. Postęp 23/67 = **34,3%**, pierwsze wydanie 23/65 = **35,4%**. Następny pakiet 3.4: kontrakt zasobów transportowych.
