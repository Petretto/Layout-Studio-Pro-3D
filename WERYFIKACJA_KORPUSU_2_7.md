# Weryfikacja korpusu — 2.7

## Pakiet 2.7a / 2.7.1 — odbiór 2026-10-07

Zakres: niezależny rejestr `src/core/bodyState.ts` i dwa scenariusze w `tests/network.test.ts`. Backup przed zmianą: `backup/v0.4.0_przed_2_7a_20261006`; sprawdzono 177 plików względem manifestu SHA256, 0 rozbieżności.

Testy potwierdzają osobne tożsamości korpusów tego samego wyrobu, nieznaną lokalizację, zajęcie przez jedną operację i przemieszczenie między jawnymi kopiami. Sprawdzono odmowy podwójnej rezerwacji, transportu podczas zajęcia, przedwczesnego lub obcego zwolnienia, przedwczesnego zakończenia transportu i zastąpienia znanej lokalizacji. Korpus w ruchu nie jest dostępny ani u źródła, ani u celu.

Sprawdzono nieznany wyrób, instancję, operację i kopię, powtórzone ID, cofanie czasu, niepoprawne przedziały i pochodzenie czasu. Błędy nie mutują wejścia. Brak deklaracji nie tworzy korpusów; niezależne instancje mają własną chronologię.

Wyniki automatyczne po implementacji: `npm.cmd run test -- --run` — 111/111; `npm.cmd run build` — poprawny. Odbiór UI i zapisu nie dotyczy tego izolowanego pakietu: moduł nie jest jeszcze podłączony do aplikacji i nie zmienia formatów danych. Te ścieżki pozostają wymagane w 2.7.2–2.7.4.

Status 2.7.1: wdrożone w opisanym zakresie. Status całego 2.7: w trakcie. Wyniki nie oznaczają obsługi fizycznego korpusu przez obecny harmonogram ani walidacji rzeczywistego procesu Eko.

## Pakiet 2.7b / 2.7.2 — odbiór 2026-10-07

Zmiany: typ i walidacja `physicalRole` w `domainProject.ts`, edycja po ID w `domainPhysicalRoleEditing.ts`, jawna odmowa nieobsługiwanych ról w `workerSchedule.ts`, trzy scenariusze w `tests/network.test.ts`. Backup `backup/v0.4.0_przed_2_7b_20261007`: 180 plików; niezależna kontrola manifestu SHA256 wykazała 0 rozbieżności.

Zapis i ponowny odczyt sprawdzono dla źródła silników w schemacie 4 oraz eksportu Eko w schemacie 5. Zachowane są role, powiązania, dokładny tekst źródła i aktywne klucze 4/5. Starszy szkic bez ról czyta się poprawnie. Migracja usuwa nieobsługiwaną rolę ze źródłowych operacji 4/5, zachowując oryginał. Błędny zapis nie nadpisuje poprzedniej wartości; odczyt uszkodzonych referencji zwraca surowy zapis do odzyskania.

Sprawdzono przygotowanie kilku podzespołów bez definicji wyrobu, brak automatycznej roli po dodaniu powiązań, usunięcie roli i brak mutacji wejścia. Walidacja odrzuca nieznane i powtórzone ID, brak producenta lub sprzecznego producenta, pustą listę, nieznany rodzaj, błędny kształt i dodatkowe pola. Usunięcie używanego podzespołu lub definicji wyrobu oraz zmiana producenta są blokowane. Harmonogram jawnie odmawia dla poprawnie odczytanego szkicu z rolami.

Wyniki: `npm.cmd run test -- --run` — 114/114; `npm.cmd run build` — poprawny; `git diff --check` — bez błędów białych znaków. Regresje harmonogramów bez ról pozostały poprawne. Nie zmieniano UI; edytor i odbiór zapisu/historii w przeglądarce pozostają w 2.7.4. Testy nowych ról nie modelują instancji podzespołów ani ich zużycia.

Status 2.7.2: wdrożone w zakresie kontraktu i walidowanego zapisu/odczytu. Cały 2.7 pozostaje w trakcie; następny pakiet 2.7.3 integruje fizyczne instancje z odrębnym harmonogramem, bez wnioskowania brakujących danych.

## Pakiet 2.7c / 2.7.3 — częściowy odbiór 2026-10-07

Zmiany: `bodyRunInput.ts`, integracja rezerwacji i zwolnień w `workerSchedule.ts`, trzy scenariusze w `tests/network.test.ts`. Backup `backup/v0.4.0_przed_2_7c_20261007`: 181 plików, 0 rozbieżności w niezależnej kontroli manifestu SHA256.

Ręcznie policzony scenariusz dwóch sztuk: korpusy BODY-1 i BODY-2 mają odpowiednio kopie 1 i 2 stanowiska A. Przerwa stanowiska 5–10 s. Pierwsze operacje zajmują korpusy 0–15 i 1–16 s; drugie 15–25 i 16–26 s. Rezerwacje obejmują pauzę, zachowują tożsamość i położenie; osoby oraz kopie nie mają nakładających się rezerwacji. Zdarzenia wyniku odtworzono w niezależnym rejestrze i porównano końcowy stan.

Scenariusz przygotowania na B i pracy na korpusie na C potwierdza, że przygotowanie nie zajmuje korpusu znajdującego się od początku na C. Scenariusz wyłącznie przygotowawczy działa bez korpusu i definicji wyrobu. Nie wyprowadza się instancji podzespołów ani potwierdzenia zużycia z zakończenia operacji.

Odmowy obejmują brak instancji, częściowe role, nieznaną sztukę/instancję, przypisanie tego samego korpusu kilku sztukom, nieznaną lokalizację, nieprzypisane instancje oraz operację wymagającą przeniesienia. Wejście nie jest mutowane. Zapis i odczyt szkicu zachowują wynik po ponownym podaniu tego samego jawnego wejścia przebiegu; deklaracje instancji nie są dopisywane do projektu.

Weryfikacja: 117/117 testów, build poprawny po skorygowaniu zachowania typu operacji domenowej podczas sortowania. Starsze scenariusze bez ról pozostają poprawne. UI i zapis wejścia instancji pozostają do 2.7.4; obecny panel bez tych danych nadal otrzymuje jawną odmowę dla pracy na korpusie.

Status 2.7.3: w trakcie. Odebrano pracę w zadeklarowanym miejscu. Transport między stanowiskami wymaga decyzji o źródle czasu i zajęciu celu opisanych w `MODEL_KORPUSU_2_7.md`. Nie odebrano pojemności miejsc oczekiwania, transportu, instancji podzespołów ani całego procesu Eko.

## Pakiet 2.7d / 2.7.3 — transport, odbiór 2026-10-07

Podstawa: odpowiedź użytkownika `1A, 2A`. Zmiany w `stationRouting.ts`, `workerSchedule.ts` i trzech nowych scenariuszach `network.test.ts`. Backup `backup/v0.4.0_przed_2_7d_20261007`: 182 pliki, 0 rozbieżności w niezależnym porównaniu z manifestem SHA256.

Scenariusz dwóch sztuk: pierwsza kończy pracę na A w 10 s, jedzie do C przez 2 s i pracuje 12–22 s. C jest zajęte od 10 s. Druga kończy A w 20 s, czeka na C do 22 s, jedzie 22–24 s i pracuje 24–34 s. Test kontroluje brak nakładania rezerwacji celu od wyjazdu oraz osób w przedziałach obecności. Zdarzenia odtworzono w niezależnym rejestrze; podczas przewozu korpus jest niedostępny na obu końcach.

Scenariusz wyboru: C ma dojazd 2 s/9000 mm, D 10 s/1000 mm — wybierane C, bo startuje wcześniej. Po wyrównaniu czasu dojazdu do 2 s wybierane D z krótszą drogą; po przesunięciu zmiany D na 50 s znów C. Potwierdzono różne pochodzenie czasu jazdy i rezerwacji pracy.

Scenariusz kalendarza: przewóz 10–12 s, zmiana celu od 50 s, pauza 55–60 s; praca 50–65 s. Cel jest zajęty 10–65 s. Wynik pokazuje 38 s oczekiwania, osobno 2 s jazdy, przyczynę kalendarzową i pauzę. Odmowy dotyczą brakującego czasu trasy, czasu zerowego, nieznanego pochodzenia, pustego źródła i dodatkowych pól. Błędny zapis nie nadpisuje poprawnego; ponowny odczyt szkicu i podanie identycznych instancji odtwarzają wynik. Dane wejściowe pozostają bez mutacji.

Odbiór obejmuje rdzeń i zapis danych tras, bez UI wejścia instancji (2.7.4). Nie oznacza odbioru pojemności ekip/pojazdów przewozowych, instancji podzespołów ani całego procesu Eko. Status 2.7.3: wdrożone w opisanym zakresie; cały 2.7 w trakcie do 2.7.4.

Końcowe sprawdzenia po korekcie przyczyn oczekiwania: `npm.cmd run test -- --run` — 120/120; `npm.cmd run build` — poprawny; kontrola różnic — bez błędów białych znaków. Starsze scenariusze 2.6 i stacjonarne korpusy 2.7c pozostały poprawne.

## Pakiet 2.7e / 2.7.4 — odbiór 2026-10-07

Zakres: `DomainBodyEditor.tsx`, edytor czasu w `DomainRoutingEditor.tsx`, integracja zapisu/historii w `DomainDraftPanel.tsx`, inspekcja w `DomainWorkerSchedulePanel.tsx`; opcjonalny zapis `bodyRunInput`, walidacja bez rekurencji parsera i ochrona migracji 4/5. Backup `backup/v0.4.0_przed_2_7e_20261007`: 182 pliki, 0 rozbieżności SHA256.

Test rdzenia sprawdza zapis/odczyt instancji, zachowanie konfiguracji początkowej po wykonaniu, źródło, błędne ID i kopie, obcy wyrób, usunięcie wymaganej roli i dodatkowe pola. Błędny zapis nie nadpisuje poprzedniego; uszkodzony odczyt zachowuje surową wartość. Migracje ze źródeł 4 i 5 usuwają nieobsługiwane wejście przebiegu, zachowując oryginalny tekst. Testy automatyczne: 121/121.

Edge CDP `node tests/qa/verify_2_7e.mjs`: role dwóch operacji, wpis korpusu od pustego formularza, odmowa kopii 999 i brakującego czasu trasy, wpis czasu 2 s jako zmierzonego ze źródłem, zapis oraz Cofnij/Ponów czasu. Wynik: przewóz 10–12 s, praca 12–22 s, cel zajęty 10–22 s, końcowy korpus na C, sześć zdarzeń. Usunięcie korpusów i jego cofnięcie poprawne.

Edge CDP `node tests/qa/verify_2_7e.mjs --preparation`: jawna rola przygotowania wskazanego podzespołu na A, praca na korpusie na C. Korpus od początku na C; przygotowanie go nie zajmuje i nie przenosi, wynik ma tylko dwa zdarzenia korpusu 10–20 s. Oba scenariusze potwierdzają ponowny odczyt, identyczny wynik po ponownym wpisaniu odstępu przybycia, ochronę źródła oraz izolację aktywnych projektów 4/5; brak wyjątków wykonania JS.

Screenshots `outputs/qa/verify_2_7e_transport.png` i `outputs/qa/verify_2_7e_preparation.png` obejrzano: tabela, rezerwacja celu, czasy przewozu, rozróżnienie przygotowania, końcowe miejsce i rozwinięte zdarzenia czytelne. Instrukcja `Instrukcja/Korpus_v6.md` dokumentuje przepływ, sesyjną historię, ponowne wpisanie odstępu i ograniczenia.

Status 2.7.4 i 2.7: wdrożone w zakresie osobnego szkicu 6. Ograniczenia: instancje/zużycie podzespołów, bufory i zasoby transportowe poza zakresem; automatyczny plan tras jest linearny, a fizyczna równoległość wymaga 2.8. Odbiór nie potwierdza rzeczywistego procesu Eko.

Regresja Edge CDP `node tests/qa/verify_2_6e.mjs` poprawna: dopuszczenia i trasy od zera, kalendarze, automatyczny wybór dalszej drogi, pauza, walidacja, historia i izolacja 4/5. Końcowy build poprawny; kontrola różnic bez błędów białych znaków.
