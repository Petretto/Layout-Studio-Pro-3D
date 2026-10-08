# Weryfikacja dopuszczalnych stanowisk — 2.6

## 2.6b / 2.6.2 — 2026-10-06

Przed zmianą modelu i parsera wykonano `backup/v0.4.0_przed_2_6b_20261006`: 170 plików. Niezależne porównanie plików kopii z manifestem SHA256: 0 rozbieżności. Kopia pomija zależności, build, wcześniejsze kopie, outputs i Git; nie obejmuje localStorage. Odtwarzanie: najpierw zabezpieczyć aktualne pliki, następnie przywrócić wybrane pliki kopii, zachowując zapisy przeglądarki.

Zmiany: nowy `src/core/stationRouting.ts`, opcjonalne pole i walidacja w `domainProject.ts`, odmowa zignorowania nowych dopuszczeń w `workerSchedule.ts`, test zapisu i danych w `tests/network.test.ts`. Brak edytora i aktywnego wyboru stanowisk na tym etapie.

Test na Eko v5 oraz niezależnym procesie silników v4 potwierdził odczyt starszego szkicu bez pola, zapis nowych danych i ponowny odczyt z identycznym źródłem. Jawny egzemplarz przyrządu należy do jednej kopii, a trasa testowa ma długość 12345 mm. To syntetyczna wartość testowa; nie deklarujemy pomiaru produkcyjnego. Sprawdzono odmowy: powielenie fizycznego egzemplarza, wymaganie wyposażenia innej kopii, brak kopii lub stanowiska, obce i powtórzone ID, brak możliwości operacji, sprzeczne stanowisko egzemplarza, błędne/powtórzone trasy, ujemna/nieskończona/zerowa między kopiami długość, brak źródła lub potwierdzenia oraz konflikt zapisu. Każda odmowa zachowała poprzedni zapis. Aktywne klucze 4/5 pozostały nietknięte.

`npm.cmd run test -- --run`: **106/106**. `npm.cmd run build`: poprawny. `node tests/qa/verify_2_5c.mjs --independent`: poprawny odbiór regresji kalendarzy, pauzy, historii i odczytu w Edge CDP. Nie jest to odbiór UI 2.6; nowy edytor należy do 2.6.4.

2.6.2 wdrożone w zakresie danych i bezpiecznego zapisu. 2.6 pozostaje w trakcie: integracja harmonogramu 2.6.3 i edytor/odbiór 2.6.4. Nowe pole blokuje dotychczasowy harmonogram szkicu, aby nie dać wyniku ignorującego dopuszczenia lub wyposażenie. Starszy szkic nadal działa, aktywne silniki 4/5 nie zostały zmienione. Długości tras są deklarowane ze źródłem, bez automatycznego wyznaczania ścieżki lub czasu transportu. Ocena odległości przy wielu następcach lub wielu przyszłych stanowiskach wymaga jawnego kontraktu w 2.6.3.

## 2.6c / 2.6.3 — 2026-10-06

Backup przed zmianą harmonogramu: `backup/v0.4.0_przed_2_6c_20261006` — 172 pliki, niezależna kontrola kopii względem manifestu SHA256: 0 rozbieżności. Nie obejmuje localStorage; procedura odtworzenia jak powyżej.

Na ręcznie sprawdzalnym procesie dwuoperacyjnym potwierdzono: równy start 0 s wybiera trasę 3000 mm zamiast 9000 mm; bliższe stanowisko dostępne od 50 s przegrywa z dalszym dostępnym od 0 s. Przy równych odległościach kolejność dopuszczeń rozstrzyga remis. Krótsza trasa wygrywa także przy późniejszym końcu wynikającym z pauzy — priorytetem jest start, nie zakończenie. Cztery sztuki wykorzystują różne stałe egzemplarze i kopie; pierwsza operacja pracuje 0–5 i 15–20 s, a kopia i wyposażenie są zajęte przez pauzę. Sprawdzono brak nakładających się rezerwacji osób, kopii i egzemplarzy; powtarzalność wyniku oraz identyczny wynik po zapisaniu i ponownym odczycie szkicu. Obliczenie nie modyfikuje wejścia ani utrwalonego wyniku.

Odmowy objęły niekompletne dopuszczenia, brak trasy wymaganej do porównania, samą trasę w przeciwnym kierunku, wielu następców albo wiele przyszłych kopii przy remisie, sprzeczne wyposażenie i brak kalendarza dopuszczonego stanowiska. Regresja wykryła nadmiarową przyczynę oczekiwania na stanowisko, gdy istniała wolna kopia; poprawiono implementację, zachowując dotychczasowe oczekiwanie na pracowników.

`npm.cmd run test -- --run`: **108/108**. `npm.cmd run build`: poprawny. `node tests/qa/verify_2_6c.mjs --independent`: Edge CDP potwierdził na syntetycznym pakowaniu wynik 4 wykonań dla 2 sztuk, pokazanie EQ-ALT i R-short / 3000 mm, pauzę 40–70 s, edycję kalendarzy, walidację, Cofnij/Ponów, ponowny odczyt i izolację zapisów 4/5. Screenshot `outputs/qa/verify_2_6c_packing.png` obejrzano: tabela czytelna, dane wyboru i pauzy widoczne. Dane testu są syntetyczne, nie są pomiarem produkcyjnym.

2.6.3 wdrożone dla opisanego jednoznacznego celu następnej operacji. 2.6 pozostaje w trakcie: edytor dopuszczeń i pełny odbiór należą do 2.6.4, a sposób porównywania dróg przy wielu przyszłych stanowiskach lub rozgałęzieniach pozostaje nieuzgodniony. Nie naliczono czasu transportu, nie wyznaczono automatycznych ścieżek ani fizycznego stanu korpusu. Brak zmiany schematu, aktywnych silników 4/5 i algorytmu kalendarzy.

## 2.6d / 2.6.4 — 2026-10-06

Backup `backup/v0.4.0_przed_2_6d_20261006`: 173 pliki; niezależna kontrola SHA256 kopii względem manifestu — 0 rozbieżności. Odtworzenie i granice kopii jak powyżej. Dodano `DomainRoutingEditor.tsx` i podłączono go do wspólnej historii/zapisu w `DomainDraftPanel.tsx`; bez zmian schematu lub rdzenia harmonogramu.

`npm.cmd run test -- --run`: 108/108. Build poprawny. `node tests/qa/verify_2_6d.mjs` oraz `--three-steps`: poprawny Edge headless/CDP na syntetycznym pakowaniu PREP → PACK oraz obróbce/montażu CUT → ASSEMBLE → PACK. UI usunęło początkowe dopuszczenia, cofnęło i ponowiło usunięcie, następnie utworzyło konfigurację od zera: stały EQ-ALT na kopii 1, dwie kopie dopuszczone do pierwszej operacji, jedna do kolejnych, trasy 9000 i 3000 mm ze źródłem. Odmowa zapisu tras bez potwierdzenia zachowała bajtowy zapis. Po potwierdzeniu zapisano formularz i odebrano Cofnij/Ponów utworzenia, zmianę kolejności dopuszczeń, edycję długości 9000 → 10000 mm i jej cofnięcie, odmowę ujemnej długości bez mutacji, usunięcie trasy i cofnięcie. Obliczenie pokazało wybrany EQ-ALT i R-short / 3000 mm oraz pauzę 40–70 s. Przeładowanie zachowało cały projekt szkicu, aktywny projekt 4 i dokładny zapis 5. Zmiana szkicu odrzuca wcześniejszy wynik podglądu.

Screenshoty `outputs/qa/verify_2_6d_editor.png` i `outputs/qa/verify_2_6d_packing.png` dokumentują formularz i wynik. Formularz obejrzano; poprawiono układ pól potwierdzenia i wyboru wyposażenia, aby checkbox był obok opisu. Dane testów pozostają syntetyczne, nie są pomiarami rzeczywistej produkcji. Przyjęte `basis: confirmed` testuje deklarację użytkownika, a nie automatyczne sprawdzenie hali.

2.6.4 wdrożone w zakresie aktualnego kontraktu. 2.6 pozostaje w trakcie do decyzji o dalszej drodze przy wielu przyszłych celach; obecnie taki remis jest jawnie odrzucany. Edytor deklaruje długości rzeczywistych tras, nie rysuje ani nie oblicza ścieżek z przeszkodami (3.2); nie nalicza czasów transportu. Nie zmienia geometrii 2D/3D, aktywnych silników 4/5 ani fizycznych reguł korpusu.

## 2.6e — automatyczny dalszy wybór, 2026-10-06

Przed zmianą modułów backup `backup/v0.4.0_przed_2_6e_20261006`: 175 plików, niezależna kontrola manifestu SHA256 — 0 rozbieżności. Procedura odtworzenia i granice kopii jak powyżej.

Dodano `stationRoutePlan.ts`, integrowano go z harmonogramem i rozróżniono planowaną oraz wybraną drogę w panelu. Edytor wyjaśnia kompletność tras i automatyczny wybór. Brak zmian schematu lub aktywnych silników 4/5.

Ręcznie sprawdzalny test: pierwsza operacja może trafić na A lub B, druga na C lub D. Drogi A→C = 9000, A→D = 2000, B→C = 3000, B→D = 8000 mm; przy jednakowym starcie wybierane są A i D. Gdy D zaczyna zmianę od 50 s, pierwsza operacja nadal ma plan A→D, lecz druga startuje na C od 10 s i wynik pokazuje wybraną A→C = 9000 mm; krótsza droga nie opóźnia startu. Test trzyoperacyjny rozstrzyga równe najbliższe przejścia długością dalszej drogi i uzyskuje B→D→E. Cztery sztuki nie nakładają rezerwacji osób, kopii ani stałych egzemplarzy. Zapis/odczyt zachowuje identyczny wynik, a obliczenie nie zmienia wejścia.

Odmowy: brak którejkolwiek wymaganej skierowanej trasy (również gdy jedna kopia jest chwilowo niedostępna), trasy w samym odwrotnym kierunku i niejednoznaczny fizyczny graf. Zaktualizowano wcześniejsze testy odmów: wielu przyszłych kopii już nie odrzucamy, lecz wymagamy kompletnych danych ich dróg. Dane długości i obsady w testach są syntetyczne.

`npm.cmd run test -- --run`: **109/109**; build poprawny. `node tests/qa/verify_2_6e.mjs`: UI dwóch przyszłych kopii, utworzenie konfiguracji od zera, potwierdzenia, walidacja, edycja/kolejność, usuwanie i historia, ponowny odczyt, wybór R-future-short / 2000 mm i zmiana drogi dla drugiej sztuki. Zrzut `outputs/qa/verify_2_6e_packing.png` obejrzano: widoczna różnica między planowaną drogą 5000 mm i wybraną 9000 mm dla wcześniejszego startu. Aktywne dane 4/5 zachowano. `node tests/qa/verify_2_6d.mjs --three-steps`: regresja trzyoperacyjnego edytora poprawna po dodaniu jawnej trasy między drugim i trzecim krokiem.

2.6.1 wdrożone dla uzgodnionego automatycznego wyboru w jednym ciągu, a rozszerzenie 2.6.3/2.6.4 odebrane. 2.6 pozostaje w trakcie w zakresie fizycznych rozgałęzień; wymagają modelu korpusu i podzespołów 2.7/2.8. Nowy plan nie jest globalną optymalizacją całego harmonogramu: długość najbliższego przejścia ma pierwszeństwo przed dalszymi, a przyszła dostępność może zmienić drogę. Rzeczywisty czas transportu i wyznaczanie ścieżek pozostają zakresem etapu 3.

## Zbiorcze domknięcie 2.6 — 2026-10-08

Pozostała granica fizycznych gałęzi została wykonana i odebrana w 2.7, 2.8c–d oraz testach 2.9. Kontrakt pierwszeństwa technologicznego 1A, porównanie rzeczywistych dróg bez sumowania, automatyczne przyszłe kopie i ponowny przydział udokumentowano w `MODEL_ROWNOLEGLOSCI_2_8.md`; dowody w `WERYFIKACJA_ROWNOLEGLOSCI_2_8.md`. Testy obejmują remisy/starty, różne kopie przyszłe, zmianę celu przy kalendarzu, przygotowania, złączenie, ochronę wyposażenia i jedną lokalizację korpusu. UI tras gałęzi, grup i pełnego Eko, historia i odczyt odebrane. Aktualna regresja 137/137 testów, build i ponowne `--branches`: PASS.

Status 2.6: wdrożone w uzgodnionym zakresie odrębnego szkicu 6. Nie oznacza globalnej optymalizacji ani automatycznego wyznaczania ścieżek z CAD; brakujące rzeczywiste dane nadal powodują odmowę. Zapis i aktywne 4/5 zachowane. To aktualizacja odbioru na podstawie zrealizowanych pakietów, nie nowa zmiana algorytmu.
