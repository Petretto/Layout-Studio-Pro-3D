# Plan rozwoju i rejestr postępu aplikacji

Data utworzenia: 2026-09-29  
Ostatnia aktualizacja: 2026-10-09
Wersja bazowa: Layout Studio Pro 3D 0.4.0  
Przykładowy przypadek testowy: niepełny proces Eko; odbiór uniwersalności wymaga także niezależnych procesów.

## Cel i zakres

Dopracować obecną aplikację React/TypeScript/Three.js do projektowania, balansowania i porównywania wariantów linii produkcyjnych. Najpierw zapewnić poprawność modelu, bezpieczeństwo danych i wygodę pracy, następnie rozbudować symulację, CAD i 3D oraz przygotować wydanie komercyjne o jasno określonym zakresie.

Produkt jest przeznaczony dla inżynierów projektujących procesy oraz konsultantów Lean analizujących i usprawniających procesy różnych klientów. Użytkownik ma móc wprowadzić własne dane procesu i BOM, zbudować wariant bazowy i warianty usprawnień oraz porównać wyniki. Reguły aplikacji nie mogą zależeć od struktury przykładu Eko. Eko służy do rozwoju i regresji; jego dane są niepełne i nie stanowią wzorca rzeczywistego procesu produkcyjnego.

Pierwsze użyteczne wydanie ma zapewnić samodzielny przepływ od danych klienta do wstępnego layoutu, jego korekty, symulacji, porównania wariantów i raportu. Konsultant korzysta z aplikacji razem z klientem przy analizie jego danych; wspólne logowanie i jednoczesna edycja online nie należą do tego wydania. VSM zaplanować na kolejną wersję (np. 1.5 lub 2.0), po odbiorze pierwszego wydania.

Plan nie zakłada migracji do C# ani Unity. Figma lub Pencil mogą wspierać projektowanie interfejsu, a Blender przygotowanie modeli wyposażenia. Nie są wymagane do rozpoczęcia prac.

„W pełni funkcjonalna” oznacza spełnienie poniższych kryteriów odbioru i udokumentowanie ograniczeń, nie deklarację zastąpienia pełnego CAD lub Visual Components ani certyfikację przemysłową.

## Zasady aktualizacji postępu

Każdy krok ma trwałe ID oraz jeden z trzech statusów:

- **nierozpoczęte** — implementacja lub weryfikacja tego kroku jeszcze się nie rozpoczęła;
- **w trakcie** — rozpoczęto pracę, lecz nie spełniono wszystkich kryteriów odbioru;
- **wdrożone** — rezultat został ukończony, sprawdzony i opisany; przy funkcji oznacza to implementację i weryfikację, przy zadaniu dokumentacyjnym lub kontrolnym — zapisany, zweryfikowany rezultat.

Procedura przy każdym pakiecie prac:

1. Przed rozpoczęciem zmienić status odpowiednich ID na „w trakcie” i wskazać je w sekcji „Bieżący pakiet”.
2. Przed zmianami przebudowującymi moduły wykonać kopię i zapisać jej dokładną lokalizację. Nie kopiować rekurencyjnie zależności, wcześniejszych backupów ani dowiązań w `outputs`.
3. Wdrażać małe, spójne zmiany, zachowując kompatybilność danych albo zapewniając sprawdzoną migrację.
4. Dla każdego ukończonego ID dopisać do rejestru datę, rezultat, dowód weryfikacji i odnośnik do raportu lub plików.
5. Dopiero po pozytywnej weryfikacji ustawić „wdrożone”. Sam build lub samo dodanie kodu nie potwierdza działania funkcji w UI.
6. Aktualizować podsumowanie etapów, opis funkcji, instrukcję i datę ostatniej aktualizacji odpowiednio do zakresu zmian.
7. Jeśli brakuje danych lub decyzji, pozostawić „w trakcie” i zapisać blokadę oraz potrzebną informację. Nie oznaczać zadania jako ukończonego.
8. Gdy wykryto regresję ukończonego kroku, przywrócić „w trakcie” i odnotować przyczynę.

Status etapu: „nierozpoczęte”, gdy żaden jego krok nie został rozpoczęty; „w trakcie”, gdy rozpoczęto co najmniej jeden krok, lecz etap nie przeszedł pełnego odbioru; „wdrożone”, gdy wszystkie kroki są ukończone i spełniono kryterium odbioru etapu.

Dokument jest ręcznie aktualizowanym źródłem statusu podczas kolejnych prac. Nie uruchamia automatycznego monitorowania ani harmonogramu zadań.

## Procent postępu

Na prośbę użytkownika po każdym ukończonym pakiecie podajemy procent. Licznik obejmuje wyłącznie główne ID postaci etap.krok (np. 3.2), których status to „wdrożone”; mianownik obejmuje wszystkie główne ID. Podpunkty nie zwiększają licznika ani mianownika, aby nie liczyć pracy podwójnie. „W trakcie” nie otrzymuje umownego udziału. Każdy główny punkt ma równą wagę; wskaźnik nie jest estymacją nakładu ani czasu do wydania.

Aktualnie po 3.3b: cały plan 23/67 = **34,3%**; pierwsze wydanie 23/65 = **35,4%**. Weryfikacja: `node scripts/plan_progress.mjs`.

Stan historyczny po 3.1c: cały plan 21/67 = **31,3%**. Pierwsze wydanie (etapy 1–7) 21/65 = **32,3%**. Etap 8 dotyczy kolejnej wersji. Obliczenia: `node scripts/plan_progress.mjs`; źródłem są tabele statusów tego pliku. Po 3.2a ukończony główny licznik pozostaje taki sam, bo 3.2 nie jest jeszcze odebrane.

## Hosting i synchronizacja

Adres aplikacji przekazany przez użytkownika 2026-10-09: https://layout-studio-pro-3d.vercel.app/ (Vercel). Repozytorium: https://github.com/Petretto/Layout-Studio-Pro-3D. Po ukończonych zadaniach aktualizować GitHub i raportować procent z licznika. Push nie stanowi dowodu wdrożenia Vercel.

## Punkt wyjścia

W wersji 0.4.0 istnieją m.in. import/eksport procesu i BOM, poprzednicy i następnicy, diagram przepływu, RPW/LCR i ręczny balans, liczba operatorów i kopii stanowisk, layout grafowy, CAD 2D, edycja formularzowa 3D i deterministyczna symulacja grafowa.

Według raportu `ZMIANY_v0.4.0.md` poprzednia weryfikacja zakończyła się wynikiem 35/35 testów i poprawnym buildem. Nie jest to nowy test wykonany przy zapisywaniu tego planu. Obsługa przeciągania myszą w 3D nadal wymaga jednoznacznego odbioru.

Brakuje m.in. współdzielonych pracowników, ograniczonych buforów, transportu oraz fizycznych ograniczeń montażu wspólnego korpusu. Cztery dodatkowe etapy montażu Eko mają przykładowe czasy. Aktualne ograniczenia opisuje `FUNKCJE_PROGRAMU.md`.

Istniejące funkcje nie są automatycznie oznaczane poniżej jako „wdrożone”: kroki planu dotyczą ich dalszego dopracowania albo nowej weryfikacji.

## Podsumowanie etapów

| Etap | Zakres | Status | Zależności |
| --- | --- | --- | --- |
| 1 | Stabilizacja i bezpieczeństwo projektu | wdrożone | Punkt wyjścia 0.4.0 |
| 2 | Model procesu i zasobów | w trakcie | Fundament etapu 1 |
| 3 | Symulacja powiązana z layoutem | w trakcie | Etap 2; podstawowe trasy i punkty transportowe |
| 4 | Balansowanie i porównywanie wariantów | nierozpoczęte | Etapy 2–3 |
| 5 | Edytor hali i spójny interfejs | w trakcie | Stabilny model danych; podstawowe poprawki UX od etapu 1 |
| 6 | Biblioteka wyposażenia i 3D | nierozpoczęte | Etapy 3 i 5 |
| 7 | Walidacja różnych procesów i przygotowanie komercyjne | nierozpoczęte | Etapy 1–6; zbieranie danych od początku |
| 8 | VSM i A3 w kolejnej wersji | nierozpoczęte | Po odbiorze pierwszego wydania |

## Bieżący pakiet

3.3b / 3.3.2, 3.3 (2026-10-09): wdrożone — formularze czasu wpisanego/wyliczanego, jednostki mm/s, m/s, m/min i s/min, źródła i składowe. 148/148 testów, build, dwa procesy w Edge: gałęzie i podmontaż/montaż, historia i odczyt; regresja Eko. Backup `backup/v0.4.0_przed_3_3b_20261009`: 248 plików, 0 rozbieżności SHA256. Raport `WERYFIKACJA_CZASU_TRANSPORTU_3_3.md`. Postęp 34,3% / 35,4%. Następny pakiet 3.4 — kontrakt zasobów transportowych przed integracją.

2.9b / 2.9.1–2.9.2, 2.9 (2026-10-08): wdrożone wyłącznie do testowania funkcjonalności — użytkownik zatwierdził 1A/2A i doprecyzował ramę dostarczaną z magazynu na rolotok. Trzy osobne warianty Eko: drzwi razem, kolejno, wspólna osoba; konkretne dane produkcyjne docelowo wpisuje użytkownik. 135/135 testów, build, UI wszystkich wariantów, historia/odczyt i ochrona dokładnego źródła oraz 4/5 poprawne. Backup `backup/v0.4.0_przed_2_9b_20261008`: 190 plików, 0 rozbieżności SHA256. Raport `WERYFIKACJA_EKO_2_9.md`, kontrakt `SCENARIUSZE_EKO_2_9.md`, osobne szkice i wyniki `outputs/scenarios/eko_2_9`. Bez zmiany kodu produkcyjnego/schematu. Dostawa i wciąganie ramy przed początkiem testu; brak deklaracji ich czasu. Rzeczywisty odbiór produkcyjny pozostaje w 7.1/7.2.

2.9a / 2.9.1 (2026-10-08): częściowy etap — sprawdzono eksport Eko v5 (16 operacji, 60 BOM, 17 rekordów stanowisk), graf przykładu v4 i instrukcję. Matryca i braki w `SCENARIUSZE_EKO_2_9.md`; propozycje 1A/1B, 2A/2B następnie zatwierdzone w 2.9b. Bez zmiany danych źródłowych lub algorytmu.

2.8d / 2.8.3, 2.8 (2026-10-07): wdrożone w uzgodnionym zakresie osobnego szkicu 6 — edytor jawnych grup, inspekcja całych zestawów i dopuszczeń, wspólna historia, walidowane usuwanie i zapis. 133/133 testów, build, trzy scenariusze UI (korpus, przygotowanie i pary bez trójki), regresja tras, Cofnij/Ponów i odczyt poprawne. Backup `backup/v0.4.0_przed_2_8d_20261007`: 188 plików, 0 rozbieżności SHA256. Raport `WERYFIKACJA_ROWNOLEGLOSCI_2_8.md`, instrukcja `Instrukcja/Korpus_v6.md`. Następne 2.9: rzeczywiste scenariusze Eko; dopuszczenia i dane produkcyjne wymagają jawnego opisu. Instancje/zużycie podzespołów, bufory i zasoby transportowe poza zakresem tego odbioru.

2.8c / 2.8.2 (2026-10-07): wdrożone w uzgodnionym zakresie szkicu 6 — zatwierdzone pierwszeństwo tras gałęzi 1A, automatyczne przyszłe kopie, przeliczanie przy faktycznym przydziale, jedna lokalizacja i ochrona rezerwacji. 133/133 testów, build, UI gałęzi i regresja współdzielenia, historia oraz odczyt poprawne. Backup `backup/v0.4.0_przed_2_8c_20261007`: 188 plików, 0 rozbieżności SHA256. Raport `WERYFIKACJA_ROWNOLEGLOSCI_2_8.md`. Następny pakiet 2.8.3: edytor grup i zbiorczy odbiór; cały 2.8 pozostaje w trakcie.

2.8b / 2.8.2 (2026-10-07): częściowy odbiór — jawne grupy, wiele rezerwacji korpusu i współdzielenie kopii do końca ostatniej czynności; osoby/wyposażenie wyłączne, transport czeka na wszystkie prace. 128/128 testów, build, UI i odczyt poprawne. Backup 188 plików, 0 rozbieżności SHA256. Ówczesna odmowa wielu kopii gałęzi została zastąpiona integracją w 2.8c.

2.8a / 2.8.1 (2026-10-07): wdrożone — zatwierdzone 1A/2A, opcjonalne jawne grupy, walidacja referencji i całego równoczesnego zestawu bez łączenia grup. Zapis/odczyt i migracje źródeł 4/5 z ochroną oryginału; 124/124 testów, build poprawny. Backup `backup/v0.4.0_przed_2_8a_20261007`: 186 plików, 0 rozbieżności SHA256. Raport `WERYFIKACJA_ROWNOLEGLOSCI_2_8.md`. Cały 2.8 w trakcie; następne 2.8.2 — integracja rezerwacji korpusu, kopii i zasobów. Harmonogram z nowymi regułami jawnie odmawia wyniku do tej integracji.

2.7e / 2.7.4 (2026-10-07): wdrożone — edytor ról, jawnych instancji i przypisań korpusów, czasów tras oraz inspekcja przebiegu. Opcjonalny zapis konfiguracji wejściowej w szkicu 6, wspólne Cofnij/Ponów i ochrona źródeł 4/5. 121/121 testów, build, Edge CDP przewozu i przygotowania podzespołu, ponowny odczyt i regresja 2.6e poprawne. Backup `backup/v0.4.0_przed_2_7e_20261007`: 182 pliki, 0 rozbieżności SHA256. Raport `WERYFIKACJA_KORPUSU_2_7.md`, instrukcja `Instrukcja/Korpus_v6.md`. 2.7 wdrożone w zakresie osobnego szkicu 6; instancje/zużycie podzespołów, bufory i zasoby transportowe nie są odebrane. Następny punkt: 2.8 — reguły fizycznej równoległości i wykluczania; 2.6 pozostaje w trakcie dla fizycznych gałęzi.

2.7d / 2.7.3 (2026-10-07): wdrożone w zakresie rdzenia korpusu i jego przewozu — zatwierdzone 1A (jawny czas każdej skierowanej trasy) i 2A (cel zajęty od wyjazdu do końca operacji). Automatyczny wybór najwcześniejszego startu po dojeździe, krótsza droga przy remisie; wynik oddziela jazdę, oczekiwanie i pracę. 120/120 testów i build poprawny, zapis/ponowny odczyt tras oraz rejestr zdarzeń zgodne. Backup `backup/v0.4.0_przed_2_7d_20261007`: 182 pliki, 0 rozbieżności SHA256. Raport `WERYFIKACJA_KORPUSU_2_7.md`. Następne 2.7.4: edytor czasu tras, instancji i inspekcja UI. Cały 2.7 pozostaje w trakcie; zasoby transportowe i fizyczna równoległość nie są odebrane.

2.7c / 2.7.3 (2026-10-07): w trakcie — odebrano integrację jawnych instancji i przypisań korpusu z odrębnym harmonogramem dla pracy w zadeklarowanym miejscu. Rezerwacja przez operację i pauzy, ID i zdarzenia w wyniku; przygotowanie podzespołów nie zajmuje korpusu. 117/117 testów i build poprawny. Backup `backup/v0.4.0_przed_2_7c_20261007`: 181 plików, 0 rozbieżności SHA256. Transport wymaga uzgodnienia źródła czasu i reguły zajęcia celu; propozycje w `MODEL_KORPUSU_2_7.md`. Zapis wejścia instancji i UI pozostają do 2.7.4; raport `WERYFIKACJA_KORPUSU_2_7.md`.

2.7b / 2.7.2 (2026-10-07): wdrożone — opcjonalne jawne role przygotowania podzespołów i pracy na korpusie, walidacja powiązań i edycja rdzenia. Zapis/odczyt na źródłach 4/5, odmowy błędnych referencji i ochrona oryginału; starsze szkice bez zmian. 114/114 testów i build poprawny. Backup `backup/v0.4.0_przed_2_7b_20261007`: 180 plików, 0 rozbieżności SHA256. Raport `WERYFIKACJA_KORPUSU_2_7.md`. Cały 2.7 w trakcie; następne 2.7.3 — integracja instancji z harmonogramem. Do tego momentu harmonogram z rolami jawnie odmawia wyniku; UI pozostaje do 2.7.4.

2.7a / 2.7.1 (odbiór 2026-10-07): wdrożone — niezależny rejestr fizycznych instancji korpusu, jawnych lokalizacji, zajęcia i przemieszczeń. Odmowa podwójnego zajęcia, przemieszczenia podczas pracy i cofania czasu; brak automatycznego tworzenia korpusów. 111/111 testów i build poprawny. Backup `backup/v0.4.0_przed_2_7a_20261006`: 177 plików, 0 rozbieżności SHA256. Raport `WERYFIKACJA_KORPUSU_2_7.md`. Cały 2.7 pozostaje w trakcie; następny pakiet 2.7.2: jawne role operacji i walidacja danych.

2.6e / 2.6.1, 2.6.3–2.6.4 (2026-10-06): odebrano automatyczny wybór dalszej trasy między wieloma dopuszczonymi kopiami kolejnych operacji. Najwcześniejszy start ma pierwszeństwo; droga jest przeliczana przy kolejnym przydziale, wynik oddziela plan od wybranego przejścia. Kontrakt 2.6.1 wdrożony dla jednego ciągu operacji. Testy 109/109, build, UI wielu przyszłych kopii i regresja trzyoperacyjna poprawne. Backup `backup/v0.4.0_przed_2_6e_20261006`: 175 plików, 0 rozbieżności SHA256. Raport `WERYFIKACJA_STANOWISK_2_6.md`. 2.6 pozostaje w trakcie w zakresie fizycznych gałęzi, zależnych od 2.7/2.8; następny krok to model korpusu i podzespołów 2.7.

2.6d / 2.6.4 (2026-10-06): wdrożony edytor dopuszczeń i ich kolejności, stałego wyposażenia konkretnej kopii oraz rzeczywistych długości skierowanych tras ze źródłem i potwierdzeniem. Edge CDP: pakowanie i obróbka/montaż — utworzenie od zera, zapis, edycja, walidacja, usuwanie, Cofnij/Ponów i ponowny odczyt; projekty 4/5 bez zmian. Testy 108/108, build poprawny. Backup `backup/v0.4.0_przed_2_6d_20261006`: 173 pliki, 0 rozbieżności SHA256. Raport `WERYFIKACJA_STANOWISK_2_6.md`. Punkt 2.6 w trakcie: do uzgodnienia cel porównania drogi przy wielu przyszłych stanowiskach/rozgałęzieniach w 2.6.1.

2.6c / 2.6.3 (2026-10-06): wdrożone dopuszczenia kopii i stałe wyposażenie w odrębnym harmonogramie. Najwcześniejszy start ma pierwszeństwo; rzeczywista długość trasy rozstrzyga remis do jednoznacznej kopii następnej operacji. Brak trasy lub niejednoznaczny cel wymagany do porównania powoduje odmowę. Wynik UI pokazuje egzemplarze i trasę rozstrzygającą. Testy 108/108, build i Edge CDP poprawne; zapis/ponowny odczyt zachowuje wynik. Backup `backup/v0.4.0_przed_2_6c_20261006`: 172 pliki, 0 rozbieżności SHA256. Raport `WERYFIKACJA_STANOWISK_2_6.md`. 2.6 w trakcie; następne 2.6.4 i doprecyzowanie wielu przyszłych stanowisk/rozgałęzień.

2.6b / 2.6.2 (2026-10-06): wdrożony opcjonalny kontrakt dopuszczeń kopii, stałego wyposażenia i potwierdzonych długości rzeczywistych tras ze źródłem. Zapis/odczyt Eko v5 i niezależnych silników v4; walidacja nieznanych ID, sprzecznych kopii/wyposażenia i błędnych tras. Backup `backup/v0.4.0_przed_2_6b_20261006`: 170 plików, 0 rozbieżności SHA256. Testy 106/106, build i regresja UI 2.5 poprawne. Raport `WERYFIKACJA_STANOWISK_2_6.md`. Punkt 2.6 w trakcie; następny pakiet 2.6.3. Harmonogram szkicu zawierającego nowe dopuszczenia jawnie odmawia wyniku do integracji, bez ignorowania ograniczeń.

2.6a / 2.6.1 (2026-10-06): w trakcie — projekt kontraktu dopuszczalnych stanowisk i wymagań wyposażenia w `MODEL_STANOWISK_2_6.md`. Wybrano najwcześniejszy start z kryterium najkrótszej drogi do następnej operacji oraz stałe wyposażenie stanowiska/kopii. Potwierdzono pierwszeństwo najwcześniejszego startu; rzeczywista trasa rozstrzyga remis. Wybór wyposażenia: stałe egzemplarze konkretnej kopii.

2.5c / 2.5.3 (2026-10-06): wdrożony edytor jawnych zmian i przerw osób/stanowisk z pochodzeniem oraz podgląd odcinków pracy, pauz i rezerwacji. Edge CDP na Eko i niezależnym syntetycznym pakowaniu potwierdził zapis, odmowę błędnych danych, Cofnij/Ponów, usunięcie, ponowny odczyt i izolację projektów 4/5. Backup `backup/v0.4.0_przed_2_5c_20261006`: 167 plików, 0 rozbieżności SHA256. Testy 105/105, build poprawny. Punkty 2.5.3 i 2.5 wdrożone w zakresie szkicu 6; raport `WERYFIKACJA_KALENDARZA_2_5.md`. Następny punkt: 2.6 — wymaga kontraktu wyboru dopuszczalnego stanowiska i wymaganego wyposażenia.

2.5b / 2.5.2 (2026-10-06): kalendarzowy przebieg odrębnego harmonogramu szkicu 6 wymaga jawnych kalendarzy osób i stanowisk, pauzuje pracę poza wspólnym oknem i wznawia ją z tym samym zespołem oraz na tej samej kopii. Wynik rdzenia zawiera odcinki pracy, pauzy i oczekiwanie na kalendarz; częściowe dane lub zbyt krótki horyzont blokują ten przebieg. Szkic bez pola kalendarzy zachowuje jawnie oznaczony podgląd logiczny 2.4. Backup 167 plików: `backup/v0.4.0_przed_2_5b_20261006` (0 rozbieżności SHA256); testy 105/105 i build poprawne. Kontrakt `MODEL_KALENDARZA_2_5.md`, raport `WERYFIKACJA_KALENDARZA_2_5.md`. Punkt 2.5.2 wdrożony; 2.5 w trakcie do edytora, podglądu i odbioru UI w 2.5.3.

2.5a / 2.5.1 (2026-10-05): opcjonalne kalendarze po ID osób i stanowisk w szkicu 6, walidacja zmian, przerw i pochodzenia czasu oraz wyznaczanie wspólnej dostępności bez domyślnych godzin. Starsze szkice pozostają czytelne. Backup 164 plików: `backup/v0.4.0_przed_2_5a_20261005` (164 zgodne SHA256, 0 rozbieżności). Testy 104/104 i build poprawne; zapis/odczyt na niezależnym przykładzie silników, odmowy błędnych danych i izolacja 4/5. Kontrakt `MODEL_KALENDARZA_2_5.md`, raport `WERYFIKACJA_KALENDARZA_2_5.md`. Punkt 2.5.1 wdrożony; 2.5 w trakcie do zastosowania pauzy i wznowienia z tym samym zespołem w 2.5.2 oraz UI w 2.5.3.

2.4f / 2.4.4 (2026-10-05): zbiorczy odbiór logicznego przydziału w niekompletnym szkicu 6 — Edge CDP potwierdził brak nakładających się rezerwacji tej samej osoby w 32 wykonaniach, identyczny wynik po ponownym otwarciu szkicu, nietrwałość samego wyniku i odmowę brakującego odstępu wejścia. Testy rdzenia objęły także niezależne scenariusze silników, dwie osoby, graf poprzedników i odmowy błędnych danych. Dokładne zapisy szkicu 6 i warsztatu 5 oraz dane projektu 4 bez zmian; ponowne otwarcie odświeża tylko znacznik automatycznego zapisu 4. Punkty 2.4.4 i 2.4 wdrożone w zakresie szkicu 6. Produkcyjna walidacja Eko należy do 7.1/7.2, a fizyczna równoległość podzespołów do 2.8. Raport `WERYFIKACJA_OPERATOROW_2_4.md`.

2.4e / 2.4.3.2 (2026-10-05): osobny podgląd harmonogramu szkicu 6 przyjmuje jawną partię i odstęp przybycia, pokazuje przydział osób/kopii, czas i przyczyny oczekiwania oraz odmawia brakujących danych. Wynik jest tylko w pamięci widoku i znika po zmianie wejścia lub szkicu. Edge CDP potwierdził 32 wykonania na przykładowym Eko z syntetyczną obsadą, oczekiwanie na osobę, odmowę braku odstępu i brak zmian zapisów 4/5/6. Testy 103/103 i build poprawne. Raport `WERYFIKACJA_OPERATOROW_2_4.md`. Punkty 2.4.3.2 i 2.4.3 wdrożone; 2.4 pozostaje w trakcie do odbioru 2.4.4.

2.4d / 2.4.3.1 (2026-10-05): odrębny rdzeń zdarzeniowy szkicu 6 wyznacza przydział konkretnych osób z zamrożonego składu, zajmuje jawną kopię stanowiska, rezerwuje te same osoby od pierwszej do ostatniej obecności i raportuje czas oraz przyczyny oczekiwania. Brak jawnej liczby kopii albo przypisania operacji blokuje przebieg. Z ostrożności jedna sztuka ma jedną trwającą operację; równoległość podzespołów czeka na reguły fizyczne 2.8. Backup 161 plików: `backup/v0.4.0_przed_2_4d_20261005` (161 zgodnych SHA256, 0 rozbieżności). Testy 103/103 i build poprawne; raport `WERYFIKACJA_OPERATOROW_2_4.md`. Punkty 2.4.2 i 2.4.3.1 wdrożone; 2.4.3 i 2.4 w trakcie do integracji UI i odbioru.

2.4c / 2.4.2.2 (2026-10-05): edytor stałego składu i jawnych wyborów wariantów oraz dopuszczonych osób dla wszystkich operacji szkicu 6. Opcjonalny zapis odrzuca obce ID, brak wariantu i niepełny skład; starsze szkice czyta bez migracji, a zmiany przechodzą przez kontrolę konfliktu i wspólne Cofnij/Ponów. Backup 157 plików: `backup/v0.4.0_przed_2_4c_20261005` (157 zgodnych SHA256, 0 rozbieżności). Testy 101/101 i build poprawne. Edge CDP: 16 operacji, zapis, odmowa niepełnego wyboru, usunięcie, historia, ponowny odczyt i izolacja v4/v5; `outputs/qa/verify_2_4c_run_selection.png`. Raport `WERYFIKACJA_OPERATOROW_2_4.md`. Punkt 2.4.2.2 wdrożony; 2.4.2 i 2.4 w trakcie do faktycznego przydziału i harmonogramu 2.4.3.

2.4b / 2.4.2.1 (2026-10-05): nieaktywny, walidowany plan pojedynczego przebiegu ze stałą listą ID pracowników, jawnym wariantem czasu każdej operacji i wskazanymi osobami dopuszczonymi do niej. Okres rezerwacji obejmuje pierwszy do ostatniego przedziału obecności, również przerwę między nimi. Brak danych, obce ID i zbyt mały skład blokują plan. Backup 156 plików: `backup/v0.4.0_przed_2_4b_20261005` (156 zgodnych SHA256, 0 rozbieżności). Testy 100/100 i build poprawne. Kontrakt `MODEL_OPERATOROW_2_4.md`, raport `WERYFIKACJA_OPERATOROW_2_4.md`. Punkt 2.4.2.1 wdrożony; 2.4.2 w trakcie do UI i zapisu wyborów.

2.4 — doprecyzowanie reguły (2026-10-05): przed każdym przebiegiem produkcyjnym użytkownik wskazuje stały skład zespołu. Harmonogram może przydzielać operacje tylko tym osobom, bez automatycznego dodawania lub zamiany pracowników w trakcie. Brak wystarczającej liczby wolnych osób powoduje oczekiwanie; po zwolnieniu pracownik może przejść na inne stanowisko. Dla pojedynczej operacji przydzielone osoby pozostają te same od pierwszego do ostatniego przedziału obecności. Kontrakt `MODEL_OPERATOROW_2_4.md`; status 2.4 pozostaje w trakcie.

2.4a / 2.4.1 (2026-10-05): niezależny od aktywnej symulacji rejestr rezerwacji konkretnych pracowników po trwałych ID i jawnych przedziałach czasu. Odrzuca nieznane lub powtórzone osoby i nakładające się rezerwacje, pozwala na ponowne użycie od chwili zwolnienia. Użytkownik ustalił, że przy operacji te same osoby pozostaną zarezerwowane od pierwszego do ostatniego przedziału obecności, także między nimi; powiązanie reguły z operacją należy do 2.4.2. Backup 153 plików: `backup/v0.4.0_przed_2_4a_20261005` (153 zgodne SHA256, 0 rozbieżności). Testy 99/99 i build poprawne. Kontrakt `MODEL_OPERATOROW_2_4.md`, raport `WERYFIKACJA_OPERATOROW_2_4.md`. Punkt 2.4.1 wdrożony; 2.4 w trakcie.

2.3c / 2.3.3 (2026-10-05): zbiorczy odbiór obsady na Eko v4/v5 i silnikach v4. Po jawnym wpisaniu dwóch założonych wariantów zapis i odczyt szkicu zachowały dokładne źródło, pozostałe dane operacji i aktywne projekty; pełne wyniki dotychczasowej symulacji są identyczne. Ponowiony Edge CDP potwierdził edytor, odmowę błędu, Cofnij/Ponów, usuwanie i odczyt po przeładowaniu. Testy 97/97 oraz build poprawne. Bez zmiany schematu, algorytmu lub ścieżki trwałości; nowa kopia strukturalna nie była wymagana. Raport `WERYFIKACJA_OBSADY_2_3.md`. Punkt 2.3 wdrożony w zakresie niekompletnego szkicu 6; etap 2 pozostaje w trakcie.

2.3b / 2.3.2 (2026-10-04): edytor minimum obsady i jawnych wariantów czasu w szkicu 6, z walidacją, bezpiecznym zapisem, usuwaniem, wspólnym Cofnij/Ponów i odczytem po przeładowaniu. Profil referencyjny i aktywne projekty 4/5 pozostały odrębne. Backup 152 plików: `backup/v0.4.0_przed_2_3b_20261004` (152 zgodne SHA256, 0 rozbieżności). Testy 96/96 i build poprawne; Edge CDP potwierdził dwa warianty, odmowę błędnego minimum, historię, usuwanie i ponowny odczyt. Ponowiony test UI profilu czasu 2.2 przeszedł. Raport `WERYFIKACJA_OBSADY_2_3.md`, zrzut `outputs/qa/verify_2_3b_staffing.png`. Punkt 2.3.2 wdrożony; 2.3 w trakcie do odbioru zbiorczego.

2.3a / 2.3.1 (2026-10-04): w niekompletnym szkicu 6 dodano opcjonalne minimum obsady operacji i niezależne, pełne profile czasu dla jawnie podanych liczebności zespołu. Parser odrzuca błędne liczby, duplikaty, wariant poniżej minimum i niepoprawny profil bez nadpisania szkicu. Dawne szkice pozostają czytelne; migracja nie wyprowadza obsady ze stanowisk ani nie dzieli czasu. Backup 150 plików: `backup/v0.4.0_przed_2_3a_20261004_224147` (150 zgodnych SHA256, 0 rozbieżności). Testy 95/95 i build poprawne; zapis/odczyt na Eko v5 i dokładne źródło zachowane. Kontrakt `MODEL_OBSADY_2_3.md`, raport `WERYFIKACJA_OBSADY_2_3.md`. Punkt 2.3.1 wdrożony; 2.3 w trakcie do edytora i odbioru zbiorczego.

2.2c / 2.2.3 (2026-10-04): zbiorczy odbiór profilu czasu na Eko v4/v5 i silnikach v4. Migracja nie dopowiada profili; zapis i ponowny odczyt jawnego profilu zachowują stary czas standardowy, dokładne źródło i pełne wyniki aktywnej symulacji. Ponowny Edge CDP potwierdził edytor, jednostki, walidację, Cofnij/Ponów i odczyt po przeładowaniu. 93/93 testy i build poprawne. Bez przebudowy modułów lub schematu; nowa kopia nie była wymagana. Raport `WERYFIKACJA_CZASU_2_2.md`. Punkt 2.2 wdrożony w zakresie niekompletnego szkicu 6; etap 2 pozostaje w trakcie.

2.2b / 2.2.2 (2026-10-04): ręczny edytor profilu czasu operacji w szkicu 6: wybór operacji, jawne przedziały i pochodzenie, s/min/h w prezentacji, walidacja, odrębny zapis z kontrolą konfliktu, wspólne Cofnij/Ponów, usunięcie i ponowne otwarcie. Backup 148 plików: `backup/v0.4.0_przed_2_2b_20261004_215035` (zgodne SHA256). 92/92 testy i build poprawne. Edge CDP potwierdził wpis 2,5 min jako 150 s, zmianę jednostki bez mutacji, odmowę błędnego przedziału, historię, przeładowanie i niezmienność v4/v5; zrzut `outputs/qa/verify_2_2b_time_profile.png`. Raport `WERYFIKACJA_CZASU_2_2.md`. Punkt 2.2 pozostaje w trakcie do zbiorczego odbioru 2.2.3.

2.2a / 2.2.1 (2026-10-04): opcjonalny, jawny profil czasowy operacji w niekompletnym szkicu 6. Rozdziela przedziały pracy ręcznej, pracy automatu i wymaganej obecności operatora oraz pochodzenie pomierzone/założone bez wyprowadzania ich z dawnego czasu standardowego. Walidacja i zapis odrzucają niepoprawne przedziały bez nadpisania szkicu; dawne szkice pozostają czytelne, aktywne v4/v5 i wyniki symulacji bez zmian. Backup 146 plików: `backup/v0.4.0_przed_2_2a_20261004_214349` (zgodne SHA256). 91/91 testów i build poprawne; kontrakt `MODEL_CZASU_2_2.md`, raport `WERYFIKACJA_CZASU_2_2.md`. Punkt 2.2 w trakcie do edytora UI i odbioru końcowego.

2.1k / 2.1.11 (2026-10-04): zbiorczy odbiór punktu 2.1 na Eko v4/v5 i silnikach v4. Po edycji i ponownym otwarciu odrębnego szkicu 6 aktywne źródła i pełne wyniki dotychczasowej symulacji są identyczne; istniejące testy potwierdzają kompletność referencji, ochronę źródła i odmowy migracji, a Edge CDP potwierdza UI, Cofnij/Ponów, odczyt, odzyskanie i zastąpienie. 89/89 testów, build i UI poprawne. Bez zmian struktury modułów lub schematu; nowa kopia nie była wymagana. Raport `WERYFIKACJA_MODELU_2_1.md`. Punkt 2.1 wdrożony jako fundament odrębnego, nadal niekompletnego modelu; reguły zasobów i aktywacja nowej symulacji należą do 2.2–2.9.

2.1j / 2.1.10 (2026-10-04): opcjonalna, ręczna lista operacji, które wyposażenie technologiczne może obsłużyć w szkicu 6. Brak pola oznacza „nie określono” także w dawnych szkicach. Backup 129 plików: `backup/v0.4.0_przed_2_1j_20261004_211725` (zgodne SHA256). 88/88 testów i build poprawne. Edge CDP potwierdził zapis OP10/OP11, Cofnij/Ponów, przeładowanie, wyczyszczenie i przywrócenie z nienaruszonym v4/v5; zrzut `outputs/qa/verify_2_1j_capabilities.png`. Raport `WERYFIKACJA_MODELU_2_1.md`. Deklaracja możliwości nie oznacza wymagania operacji ani nie zmienia bilansu lub symulacji; punkt 2.1 nadal w trakcie.

2.1i / 2.1.9 (rozpoczęty 2026-10-03, odebrany 2026-10-04): ręczna edycja wyposażenia w szkicu 6 po trwałym ID, z opcjonalnymi jawnymi powiązaniami do stanowiska i obiektu layoutu, walidacją referencji, odrębnym zapisem oraz wspólnym Cofnij/Ponów. Backup 127 plików: `backup/v0.4.0_przed_2_1i_20261003_105556` (zgodne SHA256). 87/87 testów i build poprawne. Edge CDP potwierdził dodanie, zmianę, odmowę podwójnego lub sprzecznego powiązania, Cofnij/Ponów, usunięcie, przywrócenie i ponowne otwarcie bez zmiany v4/v5; zrzut `outputs/qa/verify_2_1i_equipment.png`. Raport `WERYFIKACJA_MODELU_2_1.md`. Punkt 2.1 pozostaje w trakcie: możliwości wyposażenia i reguły jego wymagania przez operacje pozostają nieokreślone.

2.1h / 2.1.8 (2026-10-03): ręczna edycja definicji wyrobu i podzespołów w odrębnym szkicu 6, z trwałym ID, jawnymi referencjami do operacji, walidacją, bezpiecznym zapisem oraz wspólnym Cofnij/Ponów z osobami i pulami. Backup 125 plików: `backup/v0.4.0_przed_2_1h_20261003_103639` (zgodne SHA256). 86/86 testów, build poprawny. Edge CDP `tests/qa/verify_2_1e.mjs` potwierdził dodanie, zmianę nazw, usunięcie i przywrócenie obu definicji, relacje OP10/OP11, zapis po przeładowaniu i niezmienność v4/v5; zrzut `outputs/qa/verify_2_1h_product.png`. Raport `WERYFIKACJA_MODELU_2_1.md`. Punkt 2.1 pozostaje w trakcie do edycji wyposażenia i pełnego odbioru modelu; definicje nie wpływają na bilans ani symulację.

2.1g (2026-10-03): edytor osób i pul w niekompletnym szkicu 6, z trwałymi ID, walidacją członkostwa, odmową usunięcia osoby używanej przez pulę, zapisem po każdej zaakceptowanej zmianie i Cofnij/Ponów. Backup 123 plików: `backup/v0.4.0_przed_2_1g_20261003_102214` (zgodne SHA256). Testy 85/85, build poprawny. Rozszerzony odbiór Edge CDP `tests/qa/verify_2_1e.mjs` potwierdził dodanie i zmianę osób/puli, odmowę błędnego usunięcia, bezpieczną zmianę członkostwa i usunięcie, Cofnij/Ponów, ponowne otwarcie i niezmienność v4/v5; zrzut `outputs/qa/verify_2_1g_people.png`. Raport `WERYFIKACJA_MODELU_2_1.md`. Punkt 2.1 w trakcie do edycji pozostałych bytów domenowych i pełnego odbioru modelu; osoby nie wpływają jeszcze na bilans ani symulację.

2.1f (2026-10-03): kontrolowane zastąpienie istniejącego lub uszkodzonego szkicu v6 dopiero po pobraniu jego pełnej/surowej kopii, przeglądzie nowego źródła i jawnym potwierdzeniu. Nowy szkic jest walidowany przed zapisem, a poprzednia wartość porównywana znak po znaku; konflikt i błąd pamięci nie zmieniają jej. Backup 123 plików: `backup/v0.4.0_przed_2_1f_20261003_101316` (zgodne SHA256). Testy 84/84, build poprawny. Rozszerzony odbiór Edge CDP `tests/qa/verify_2_1e.mjs` potwierdził odzyskanie uszkodzonego szkicu, jawne zastąpienie poprawnego szkicu z innym źródłem, odmowę przy konflikcie i limicie pamięci, ponowne otwarcie oraz nienaruszone dane v4/v5; zrzut `outputs/qa/verify_2_1f_recovered.png`. Raport `WERYFIKACJA_MODELU_2_1.md`. Punkt 2.1 nadal w trakcie do edytora danych domenowych i pełnego odbioru modelu.

2.1e (2026-10-03): UI podglądu migracji v4/v5 do niekompletnego szkicu v6 w warsztacie stanowisk. Pokazuje powiązania i luki danych, wymaga potwierdzenia przed pierwszym zapisem, odrzuca nieaktualny podgląd, odczytuje szkic po przeładowaniu i pozwala pobrać surową kopię uszkodzonej wartości. Backup 121 plików: `backup/v0.4.0_przed_2_1e_20261003_084320` (zgodne SHA256). Odbiór Edge CDP `tests/qa/verify_2_1e.mjs` potwierdził przepływ Eko v5, podgląd v4, zapis/ponowne otwarcie, ochronę aktywnych projektów v4/v5 i pobranie uszkodzonego szkicu; zrzuty `outputs/qa/verify_2_1e_saved.png` oraz `outputs/qa/verify_2_1e.png`. 83/83 testy i build poprawne. Raport `WERYFIKACJA_MODELU_2_1.md`. Punkt 2.1 w trakcie: szkic wymaga późniejszego edytora uzupełniania danych, jawnego zastąpienia po odzyskaniu oraz dalszego odbioru migracji.

2.1d (2026-10-03): izolowany moduł zapisu/odczytu szkicu schematu 6 pod osobnym kluczem `layout-studio-domain-v6-draft-v1`. Zachowuje dokładny tekst źródła v4/v5, waliduje oba projekty przy zapisie i odczycie, odróżnia pusty, poprawny, uszkodzony i niedostępny zapis. Odmawia nadpisania przy konflikcie, uszkodzeniu, zmianie źródła lub błędzie walidacji; błąd limitu pamięci zachowuje poprzednią wartość. Backup 120 plików: `backup/v0.4.0_przed_2_1d_20261003_083551` (zgodne SHA256). Testy Eko v4/v5, ponownego odczytu, aktualizacji i odmów: 83/83; build poprawny. Raport `WERYFIKACJA_MODELU_2_1.md`. Punkt 2.1 pozostaje w trakcie: moduł nie jest jeszcze podłączony do UI i nie ma odbioru zapisu w przeglądarce.

2.1c (2026-10-03): osobny, nieaktywny schemat roboczy 6 i parser rozdzielają operacje, stanowiska, obsadę, osoby/pule, wyposażenie technologiczne, wyrób i podzespoły. Migracja wymaga zweryfikowanego podglądu 2.1b i zachowuje dokładny tekst źródła osobno. Brakujących bytów nie dopowiedziano, szkic ma wyłącznie status `incomplete`. Backup 119 plików: `backup/v0.4.0_przed_2_1c_20261003_082515` (zgodne SHA256). Eko v4/v5, roundtrip i odmowy błędnych referencji: 81/81 testów, build poprawny; raport `WERYFIKACJA_MODELU_2_1.md`. Punkt 2.1 w trakcie do zapisu, UI i odbioru ponownego otwarcia.

2.1b (2026-10-03): odczytowy, wersjonowany podgląd migracji modelu procesu ze schematów 4/5 zachowuje oryginalny JSON, mapy operacja–stanowisko, jawnie zapisane liczby obsady/kopii i wizualne powiązania wyposażenia; wskazuje luki danych bez tworzenia osób, podzespołów ani możliwości maszyn. Backup 117 plików: `backup/v0.4.0_przed_2_1b_20261003_081637` (zgodne SHA256). Testy Eko i silników, błędnych referencji, odmowy zmienionego podglądu: 78/78; build poprawny. Raport `WERYFIKACJA_MODELU_2_1.md`. Punkt 2.1 w trakcie; nie podłączono nowego modelu do UI, zapisu ani symulacji.

2.1a (2026-10-03): opisano kontrakt oddzielnych operacji, stanowisk, pracowników/pul, wyposażenia, wyrobu i podzespołów oraz jednostki, referencje i ścieżkę migracji v4/v5. Dokument `MODEL_PROCESU_2_1.md` wskazuje dane, których nie wolno dopowiadać z obecnego projektu, i kryteria następnego pakietu. Zweryfikowano liczby w rzeczywistym eksporcie Eko i 76/76 testów; kod, schematy i wyniki symulacji bez zmian. Punkt 2.1 pozostaje w trakcie do implementacji wersjonowanego modelu, parsera, migracji i odbioru UI.
 
1.5/1.6 (2026-10-02): Domknięcie i całościowy odbiór punktów 1.5 i 1.6 (trwałe identyfikatory stanowisk niezależne od numeracji i zestawu operacji; eliminacja niejawnego resetowania zasobów i wyposażenia przy zmianie przydziału, podziale, scaleniu i usunięciu operacji). Wprowadzono i zweryfikowano: trwałe identyfikatory `ST-...` generowane stabilnie w rejestrze stanowisk v5; przesuwanie stanowisk w górę/dół bez mutacji ID i geometrii; ochronę kolejności grafu technologicznego przed niepoprawnym przestawieniem; jawny podział stanowiska z zachowaniem starego ID, zasobów i geometrii stacji źródłowej oraz utworzeniem nowego unikalnego ID bez powiązań; jawne scalenie wymagające wskazania pozostającego ID z prezentacją obiektów i ustawień wycofywanego ID przed zatwierdzeniem; panel usuwania operacji ze stanowiska (`removeStationOperation`), który czyści relacje technologiczne i referencje BOM, lecz zachowuje stanowisko jako puste (`operationIds: []`), z cyklem 0 s, nienaruszonym trwałym ID, wyposażeniem w `layoutObjects` i zasobami w `workstationSettings`. Brak wymaganego wyposażenia (np. brak stołów) natychmiast blokuje symulację jawnym błędem layoutu bez domyślania się geometrii. Zautomatyzowany odbiór UI w przeglądarce Edge (CDP) na porcie 5197 (`tests/qa/verify_1_5_1_6.mjs`) potwierdził: odmowę zamiany kolejności naruszającej graf OP10/OP11, zamianę kolejności niezależnych stacji z zachowaniem ID, podział stacji z blokadą brakującego stołu i ręczne dodanie stołu w edytorze geometrii, usunięcie OP10 ze stanowiska 1 z zachowaniem pustego stanowiska i jego ID, pełny cykl Cofnij/Ponów oraz odczyt po przeładowaniu strony (18 stanowisk z zachowanymi danymi). 76/76 testów jednostkowych i build poprawne. Raporty: `WERYFIKACJA_STALE_ID_1_5_1_6.md` oraz uzupełnienie `WERYFIKACJA_STABILIZACJA_D.md`. Punkty 1.5 i 1.6 wdrożone; Etap 1 wdrożony w całości.
 
1.7 (2026-10-02): Domknięcie i całościowy odbiór punktu 1.7 (zapis, odzyskiwanie i migracja starych projektów; ochrona oryginału przy nieudanej migracji; ponowne otwarcie). Konsolidacja zrealizowanych prac D5c–D5k: ochrona oryginału przy migracji Eko, odzyskiwanie uszkodzonego localStorage w v4 i v5 z pobraniem surowej kopii, blokada migracji przy osieroconych zasobach, import projektów bez wersji z normalizacją i zachowaniem bajtowego źródła, wersjonowane przenośne archiwa v4/v5, atomowy import przy limicie pamięci, jawna migracja starszego localStorage i walidacja dużych archiwów. Backup 128 plików: `backup/v0.4.0_przed_1_7_20261002_220500` (zgodne SHA256). Zautomatyzowany odbiór UI w przeglądarce Edge (CDP) na porcie 5194 potwierdził wszystkie 4 scenariusze: odzyskiwanie corrupt stringa, jawną migrację projektu bez wersji, blokadę migracji z osieroconym zasobem bez mutacji v5 i zachowanie danych po przeładowaniu. 75/75 testów i build poprawne. Raport: `WERYFIKACJA_MIGRACJA_ZAPIS_1_7.md`. Punkt 1.7 wdrożony.

5.11 (2026-10-02): Przełączanie prezentacji i edycji jednostek czasu między sekundami (s), minutami (min) i godzinami dziesiętnymi (h) w całym interfejsie: metrykach (Pulpit, Popyt, Bilans), polach edycyjnych operacji i zasobów, tabelach procesu i wariantów, osi czasu symulacji i diagramie. Wartości wewnętrzne pozostają niezmiennie w sekundach (brak zmian w schemacie danych i algorytmach; pełna zgodność z zapisanymi projektami). Jednostka czasu jest zawsze jawnie prezentowana. Backup 124 plików: `backup/v0.4.0_przed_5_11_20261002_215000` (zgodne SHA256). Zautomatyzowany odbiór UI w przeglądarce Edge (CDP) na porcie 5195 potwierdził przełączanie jednostek w locie, dynamiczne etykiety kolumn i formularzy, edycję 2,5 min = 150 s w modelu, niezmienność wewnętrznych sekund w localStorage oraz formatowanie metryk. 75/75 testów i build poprawne. Raport: `WERYFIKACJA_JEDNOSTKI_CZASU_5_11.md`. Punkt 5.11 wdrożony.

5.12 (2026-10-02): Gotowe, pobieralne szablony importu procesu i BOM w XLSX i CSV, zgodne z bieżącym importerem. Wzorcowe dane wielogałęziowe procesu (OP10 → OP20, OP25 → OP30) oraz 5 komponentów BOM z wszystkimi dopuszczalnymi pojemnikami (BoxKLT, Tray, Carton, Pallet). Dwuarkuszowy plik XLSX: arkusz 0 „Dane” gotowy do natychmiastowego importu bez usuwania opisów, arkusz 1 „Opis kolumn” ze specyfikacją wymagań, typów i jednostek. W UI dodano przyciski „Szablon XLSX” i „Szablon CSV”, rozwijaną tabelę specyfikacji kolumn z odznakami wymagań, a błędy importu wskazują dokładne nazwy brakujących nagłówków przy zachowaniu atomowości (dane projektu nienaruszone). Backup 105 plików: `backup/v0.4.0_przed_5_12_20261002_213500` (zgodne SHA256). Zautomatyzowany odbiór UI w przeglądarce Edge (CDP) na porcie 5196 potwierdził pobranie szablonów, import procesu (4 stacje) i czytelny błąd przy brakujących kolumnach BOM. 73/73 testy i build poprawne. Raport: `WERYFIKACJA_SZABLONY_5_12.md`. Punkt 5.12 wdrożony.

3.10 (2026-10-02): Rozszerzenie wyboru szybkości odtwarzania symulacji ponad obecne 100× dla długich procesów (1×, 2×, 5×, 10×, 20×, 50×, 100×, 200×, 500×, 1000×, 2000×, 5000×). Funkcja pomocnicza `stepSimulationTime` zabezpiecza granicę czasu (brak przekroczenia `end`, przycięcie skoku po uśpieniu karty do 0,25 s real-time), natychmiastowa inspekcja stanu na pauzie (w tym aktywne stacje i WIP), płynna zmiana szybkości w locie. Potwierdzono całkowitą niezależność wyników symulacji i CSV od prędkości odtwarzania. Backup 103 plików: `backup/v0.4.0_przed_3_10_20261002_211700` (zgodne SHA256). Zautomatyzowany odbiór UI w przeglądarce Edge (CDP) na procesie Eko (partia 3 sztuk, 21 170 s) w karcie symulacji oraz w warsztacie v5, 70/70 testów i build poprawne. Raport: `WERYFIKACJA_SYMULACJA_3_10.md`. Punkt 3.10 wdrożony.

E6 (2026-10-02): eksporty procesu i BOM XLSX/CSV mają osobne znaczniki porównujące eksportowane wiersze; szablony są niezależne od projektu. JSON wariantu oznaczono jako niezmienną migawkę. Backup 103 plików: `backup/v0.4.0_przed_E6_20261002_203301` (zgodne SHA256). UI na porcie 5192 potwierdził selektywne unieważnianie, Cofnij, ponowny eksport, pobrania i ponowne otwarcie; 69/69 testów oraz build poprawne. Punkt 1.8 wdrożony w zakresie bieżącej sesji; raport E. Przeglądarka nie potwierdza aplikacji fizycznego zapisu pliku/PDF.

E5 (2026-10-02): znaczniki czterech eksportów warsztatu v5 przetrwały zmianę karty; porównanie podpisu projektu po ponownym odczycie zachowuje zgodność, edycja i Cofnij odświeżają status tylko właściwych plików. Karta raportu oznacza wywołanie drukowania dla wersji projektu, ostrzega po zmianie danych i nie sugeruje, że PDF został zapisany. Backup 103 plików: `backup/v0.4.0_przed_E5_20261002_201400` (zgodne SHA256). UI Eko, 69/69 testów i build poprawne; raport E. Punkt 1.8 pozostaje w trakcie do objęcia pozostałych eksportów danych i określenia granicy sesji.

E4 (2026-10-02): znacznik CSV symulacji pozostaje dostępny po przebudowaniu widoku, zmianie karty i powrocie do projektu v4/v5. Zmiana wyniku oznacza raport jako nieaktualny; przy błędach blokujących symulację pojawia się komunikat o braku możliwości potwierdzenia aktualności. Cofnij lub nowy eksport przywracają status odpowiedni do bieżącego wyniku. Backup 103 plików: `backup/v0.4.0_przed_E4_20261002_200255` (zgodne SHA256). UI v4/v5, 69/69 testów i build poprawne; raport E. Punkt 1.8 w trakcie do rozstrzygnięcia statusu drukowania PDF i granicy między sesjami.

E3 (2026-10-02): warsztat v5 pokazuje w bieżącej sesji aktualność JSON projektu, archiwum v5, oryginału v4 i pierwotnego importu. UI na izolowanych portach 5188/5189 potwierdził pobrania, edycję, selektywne ponowienie JSON, Cofnij oraz zachowanie 17 stanowisk i źródeł po odświeżeniu. 69/69 testów i build poprawne. Nie zmieniono formatu ani obliczeń; punkt 1.8 pozostaje w trakcie do statusu PDF i komunikacji CSV po zmianie projektu w symulacji. Szczegóły w raporcie E.

E2 (2026-10-02): eksporty archiwum v4, DXF, bilansu CSV i raportu MD mają osobne migawki bieżącej sesji. Po zmianie projektu pasek wskazuje, które pobrane pliki trzeba odnowić; Cofnij przywraca aktualność tylko plików odpowiadających przywróconemu stanowi. Eksport archiwum nie zmienia już czasu zwykłego JSON. Backup 115 plików: `backup/v0.4.0_przed_E2_20261002_194043` (zgodne SHA256). UI na porcie 5187 potwierdził wszystkie pięć pobrań, edycję, ponowny eksport jednego formatu i Cofnij; 69/69 testów i build poprawne. Punkt 1.8 nadal w trakcie do statusu warsztatu v5, PDF i zmian projektu w otwartej symulacji; raport E.

E1 (2026-10-02): status pobranego JSON projektu i CSV symulacji wskazuje aktualność względem bieżących danych oraz potrzebę ponownego eksportu. Cofnij przywracające dane JSON i przywrócenie identycznych parametrów symulacji przywracają status aktualny; szybkość odtwarzania nie unieważnia CSV. Backup 114 plików: `backup/v0.4.0_przed_E1_20261002_193011` (zgodne SHA256). UI na porcie 5186 potwierdził oba cykle statusu oraz pobrane pliki CSV z 30 i 31 wierszami; 69/69 testów i build poprawne. Punkt 1.8 pozostaje w trakcie do oznaczenia pozostałych eksportów i odbioru zmian projektu przy otwartej symulacji; raport E.

D5k (2026-10-02): odbiór dużego archiwum ujawnił przepełnienie stosu w walidacji długiego base64 przed próbą zapisu. Zastąpiono wyrażenie z powtarzaną grupą walidacją liniową i obliczeniem rozmiaru z długości kodowania, bez zmiany formatu. Backup 114 plików: `backup/v0.4.0_przed_D5k_20261002_192024` (zgodne SHA256). Test regresyjny najpierw odtworzył błąd; po poprawce 69/69 testów i build poprawne. UI: archiwum 5,6 MB zostało poprawnie rozpoznane i odrzucone dopiero przy limicie localStorage bez zmiany projektu, a archiwum 1,4 MB przeszło import, ponowny odczyt i pobranie źródła o identycznym SHA256. Punkt 1.7 nadal w trakcie do odbioru rzeczywistych dawnych zapisów; raport D.

D5j (2026-10-02): bezpośredni odczyt poprawnego starszego zapisu localStorage projektu 4 nie uruchamia już automatycznego nadpisania po normalizacji. Przed włączeniem zapisu użytkownik pobiera surową kopię i potwierdza migrację; anulowanie zachowuje oryginał. Backup 113 plików: `backup/v0.4.0_przed_D5j_20261002_070009` (zgodne SHA256). UI na izolowanym porcie potwierdził identyczny SHA256 zapisu bez wersji przed migracją i pobranej kopii, odczyt schematu 4 po migracji oraz 2 trwałe ID warsztatu 5 po ponownym otwarciu. 68/68 testów i build poprawne. Punkt 1.7 nadal w trakcie do szerszego odbioru dawnych rzeczywistych zapisów; raport D.

D5i (2026-10-02): import projektu 4 zapisuje projekt i archiwum źródła przed zmianą stanu UI oraz historii Cofnij/Ponów. Przy braku miejsca lub dostępu do localStorage import nie zastępuje bieżącego projektu i pokazuje jednoznaczny komunikat. Backup 112 plików: `backup/v0.4.0_przed_D5i_20261002_064811` (zgodne SHA256). UI przy wypełnionej pamięci potwierdził odmowę importu Eko bez zmiany 6 operacji projektu bazowego; po zwolnieniu miejsca import 16 operacji i 60 pozycji BOM, Cofnij/Ponów, ponowne otwarcie i bajtowy oryginał Eko przeszły odbiór. 68/68 testów i build poprawne. Punkt 1.7 pozostaje w trakcie do szerszego odbioru dawnych zapisów; raport D.

D5h (2026-10-02): dodano osobny, wersjonowany format przenośnego archiwum JSON dla projektu 4 i warsztatu 5, z projektem, pierwotnym importem oraz migawką migracji v4 w archiwum v5. Zwykłe eksporty JSON i ich import pozostały zgodne. Backup 111 plików: `backup/v0.4.0_przed_D5h_20261002_063408` (zgodne SHA256). UI na dwóch izolowanych adresach potwierdził przeniesienie v4/v5, zachowanie obu trwałych ID v5, źródła o identycznym SHA256 oraz odrzucenie nieobsługiwanej wersji bez zmiany zapisów. 68/68 testów i build poprawne. Punkt 1.7 nadal w trakcie do szerszego odbioru dawnych zapisów i dużych archiwów; raport D.

D5g (2026-10-01): importer projektu 4 zapisuje bajtowo oryginalny plik JSON jako osobny artefakt lokalny, niezależny od znormalizowanego projektu i migawki użytej do migracji v5. Kopia jest powiązana z historią Cofnij/Ponów i przenoszona do osobnego zapisu warsztatu 5; oba widoki udostępniają jej pobranie. Starsze zapisy bez nowego pola pozostają czytelne. Backup 109 plików: `backup/v0.4.0_przed_D5g_20261001_232729` (zgodne SHA256). UI: plik D5f odzyskany po migracji i przeładowaniu z identycznym SHA256, edycja i Cofnij v5 zachowały archiwum; 66/66 testów i build poprawne. Eksport przenośny projektu nie zawiera archiwum, a importy sprzed D5g nie odzyskają nieprzechowanych bajtów. Punkt 1.7 pozostaje w trakcie; raport D.

D5f (2026-10-01): odbiór starszego pliku bez pola wersji, utworzonego z dołączonego przykładu silników EV. Import do projektu 4, zapis/odczyt i migracja do v5 zachowały 6 operacji, 5 pozycji BOM i 2 stanowiska; trwałe ID v5 przetrwały przeładowanie. Kod bez zmian, 65/65 testów. Wykryto ograniczenie: „Pobierz oryginał 4” udostępnia znormalizowany projekt 4, nie bajtową kopię importowanego pliku bez wersji. Zachowanie surowego importu pozostaje do wykonania w 1.7; raport D.

D5e (2026-10-01): odbiór nieudanej migracji na syntetycznym wariancie Eko z osieroconym wpisem zasobów `["QA-OLD"]`. Projekt 4 wczytał się poprawnie, ale migracja zgłosiła błąd bez zastąpienia 16 trwałych stanowisk v5. Oryginalny JSON warsztatu miał ten sam SHA256 przed i po próbie; po przeładowaniu v5 zachował ID i zapis, a projekt 4 nadal zawierał osierocony wpis. Kod bez zmian, 65/65 testów; szczegóły w raporcie D. ID 1.7 pozostaje w trakcie do pełniejszego odbioru starszych zapisów.

D5d (2026-10-01): UI odzyskiwania uszkodzonego localStorage v5 potwierdzone na izolowanym porcie. Surowy znacznik QA pobrano bez zmian, import bez zgody nie nadpisał go, anulowanie i samo odblokowanie nie zmieniły zapisu; dopiero potwierdzony import Eko v5 odtworzył 16 stanowisk po przeładowaniu. Natywne `confirm` zastąpiono potwierdzeniem w warsztacie. Backup 107 plików: `backup/v0.4.0_przed_D5d_20261001_225237` (zgodne SHA256). 65/65 testów i build poprawne. Raport D; 1.7 w trakcie do próby nieudanej migracji.

D5c (2026-10-01): odbiór ochrony oryginalnego JSON schematu 4 po migracji Eko. Rzeczywisty plik `tests/qa/Eko_D5c_original_v4.json` ma 16 operacji i 60 pozycji BOM; ponowne pobranie po przeładowaniu dało ten sam SHA256. Import pliku do projektu 4 i ponowny odczyt odtworzyły dane, a osobny warsztat 5 pozostał dostępny. Kod bez zmian; odzyskiwanie uszkodzonego zapisu nadal otwarte. Raport D. ID 1.7 w trakcie.

D5b (2026-10-01): warsztat v5 korzysta z pełnej osi czasu symulacji i pokazuje trwałe ID stanowisk; aktywne wykonania są przekazywane do podglądu 3D. Błędy layoutu nadal blokują kontrolki. Backup 105 plików: `backup/v0.4.0_przed_D5b_20261001_223242` (zgodne SHA256). UI Eko: partia 3 sztuk 21 170 s, Cofnij po błędzie brakującego stołu i ponowny odczyt poprawnego zapisu. 65/65 testów i build poprawne. Szczegóły w raporcie D; 1.5–1.6 pozostają w trakcie.

D4f (2026-10-01): dodano edycję geometrii wyposażenia warsztatu schematu 5 po trwałym ID stanowiska. Backup 103 plików: `backup/v0.4.0_przed_D4f_20261001_221758` (zgodne SHA256). UI Eko na izolowanym porcie: podział 17 → 18 stanowisk, jawne dodanie stołu, usunięcie błędu layoutu, symulacja, edycja X i obrotu, Cofnij/Ponów, usunięcie z Cofnij i ponowny odczyt. Rzut 2D oraz podgląd 3D korzystają z zapisanej geometrii; 65/65 testów i build poprawne. Szczegóły w raporcie D. ID 1.5 i 1.6 pozostają w trakcie do integracji z pozostałymi widokami.

D4e (2026-10-01): dodano edycję ustawień zasobów po trwałym ID w warsztacie schematu 5. Backup 102 plików: `backup/v0.4.0_przed_D4e_20261001_182847` (zgodne SHA256). UI Eko potwierdził walidację, niezależność cyklu od samej obsady, jawny cykl zespołu, błąd brakującego stołu po zwiększeniu kopii, blokadę symulacji, Cofnij/Ponów i odczyt po przeładowaniu. Późniejszy odbiór potwierdził przywrócenie domyślnych zasobów, jego Cofnij/Ponów i odczyt po ponownym otwarciu; zapis testowy wrócił do wartości bazowych. 64/64 testy i build poprawne. Szczegóły w raporcie D. ID 1.6 pozostaje w trakcie.

D4d (2026-10-01): dodano UI jawnego podziału i scalenia stanowisk schematu 5. Podział zachowuje stare ID, zasoby i geometrię, tworząc nowe ID bez powiązań. Scalenie wymaga wskazania zachowanego ID, pokazuje obiekty i ustawienia wycofywanego ID oraz wymaga zaznaczenia zgody i potwierdzenia. Backup 101 plików: `backup/v0.4.0_przed_D4d_20261001_181257` (SHA256 zgodne). Eko: podział/scalenie, Cofnij/Ponów, zapis/odświeżenie i syntetyczne ustawienia zasobów potwierdzone w UI; 64/64 testy i build poprawne. 1.5 i 1.6 pozostają w trakcie. Raport D.

D5a (2026-10-01): potwierdzono zapis pliku wyeksportowanego przez UI, jego strukturę i ponowny import przez UI. Rzeczywisty eksport Eko schematu 5 (`tests/qa/Eko_D5_actual_export_v5.json`, 44 879 bajtów, SHA256 w raporcie D) odtworzył 17 trwałych stanowisk, 53 obiekty layoutu i przydział OP22 po odświeżeniu. Błędny plik z obcym ID geometrii został odrzucony bez zastąpienia poprawnego zapisu. Osobny poprawny plik Eko 16 stanowisk przeszedł import i symulację 3 sztuk (21 170 s). 1.5 pozostaje w trakcie: otwarte są podział/scalenie i integracja edytorów. Raport D.

D3b/D4c (2026-10-01): uruchomiono odrębny warsztat projektu schematu 5 z migracją bieżącego projektu, zapisem lokalnym, trwałymi ID, przenoszeniem operacji, zmianą kolejności, pustym stanowiskiem, Cofnij/Ponów, eksportem/importem JSON i symulacją. Brak layoutu pozostaje jawny; jego wygenerowanie wymaga osobnej akcji. Backup 97 plików: `backup/v0.4.0_przed_UI_v5_20261001_173152` (SHA256 zgodne). 62/62 testy i build poprawne. UI Eko: migracja, przeniesienie OP22, Cofnij/Ponów, zapis/odświeżenie, dodanie stanowiska i jawne generowanie potwierdzone; eksport/import pliku oraz podział/scalenie w UI pozostają do odbioru. 1.5 w trakcie. Raport D.

D4b (2026-10-01): dodano atomową zmianę rejestru stanowisk dla kolejności, podziału i scalenia. Wycofanie ID z powiązanymi zasobami lub geometrią jest blokowane do jawnego rozstrzygnięcia; istniejące ID zachowują ustawienia i obiekty. 61/61 testów i build poprawne. Brak jeszcze UI dla decyzji 1.6; 1.5 w trakcie. Raport D.

D4a (2026-10-01): zasoby schematu 5 wiążą się z trwałym ID stanowiska, a odrębne wyprowadzenie bilansu/layoutu zachowuje zapisaną geometrię i zgłasza brakujące kopie. Eko po migracji ma tę samą liczbę tras i te same czasy zakończenia partii w symulacji. 59/59 testów i build poprawne. Aktywne UI i zapis pozostają w schemacie 4; 1.5 w trakcie. Raport D.

D3a (2026-10-01): dodano bilans schematu 5 oparty na rejestrze stanowisk i przeniesienie operacji do istniejącego trwałego ID. Numer wynika wyłącznie z kolejności. Zmiana grupowania przez RPW/LCR wymaga jawnego uzgodnienia tożsamości; puste stanowisko zachowuje ID, zasoby i geometrię. Test Eko i przypadki negatywne: 57/57 testów, build poprawny. Edytor UI i aktywna ścieżka schematu 5 nadal nie są podłączone; 1.5 w trakcie. Raport D.

D2c (2026-10-01): kopia bieżących 93 plików z kontrolą SHA256 w `backup/v0.4.0_przed_aktywacja_D3_20261001_171226`. Dodano odrębny parser schematu 5 z walidacją rejestru, ręcznych przypisań, zasobów i powiązań layoutu; przygotowana migracja jest nim sprawdzana. Eksport Eko przechodzi zapis/odczyt 16 stanowisk. 53/53 testy i build poprawne. Aktywny import/zapis nadal używa schematu 4; etap 1.5 w trakcie. Raport D.

D2b (2026-10-01): dodano jawną konwersję sprawdzonego podglądu do przygotowanego projektu schematu 5. Przypisania ręczne, powiązania geometrii i zasoby otrzymują trwałe ID; nieaktualne cache bilansu i tras są pomijane. Osierocone zasoby lub zmieniony podgląd zatrzymują konwersję. Oryginalny JSON jest zachowany. 51/51 testów i build poprawne. Schemat 5 nadal nie jest przyjmowany przez aplikację; D2–D5 i etap 1.5 pozostają w trakcie. Raport D.

D2a (2026-09-30): pełny backup 89 plików ze sprawdzeniem SHA256 i podgląd migracji powiązań stanowisk gotowe. Nie przełączono schematu zapisu; etap 1.5 nadal w trakcie. D2b–D4 wymagają integracji rejestru z edytorami i zapisami. Raport D.

Pakiet D / 1.5–1.6 zamknięty 2026-10-02: rejestr stanowisk v5 zapewnia trwałe ID (`ST-...`), niezależność od numeracji, edycję zasobów i geometrii po trwałym ID, bezpieczną zamianę kolejności z walidacją grafu, jawny podział i scalenie z ochroną wyposażenia oraz panel usuwania operacji z zachowaniem pustej stacji i jej obiektów. Odbiór UI zrealizowany w teście Edge CDP (`tests/qa/verify_1_5_1_6.mjs`), 76/76 testów jednostkowych i build poprawne. Szczegóły w `WERYFIKACJA_STALE_ID_1_5_1_6.md` i `WERYFIKACJA_STABILIZACJA_D.md`. Etap 1 został w pełni wdrożony.

Pakiet C zamknięty 2026-09-30: potwierdzono przeciąganie z siatką/bez siatki, Cofnij/Ponów, synchronizację 2D–3D i zapis. Poniższe otwarte diagnozy C są historią; rozstrzygnięcie w raporcie C3. Następny krok: 1.5 — trwałe identyfikatory stanowisk.

- Pakiet A wykonany w ograniczonym zakresie: backup, testy bazowe, poprawki wspólnego usuwania i synchronizacji formularzy. Raport: `WERYFIKACJA_STABILIZACJA_A.md`.
- Kroki nadrzędne 1.2–1.3 zakończone; dowody zapisano w raporcie pakietu B.
- Pakiet B zakończony: odbiór importu/usuwania i zapisu w UI (1.2.2, 1.3.1, 1.3.4) na odizolowanych danych portu 4193. Następny mały pakiet: obsługa myszy 3D (1.4).
- Dane Eko można zbierać równolegle w ramach 7.1.
- Aktywny pakiet C / 1.4: synchronizacja formularza 3D po Cofnij/Ponów poprawiona i sprawdzona. Przeciąganie oraz czarny widok po geście wymagają dalszej diagnozy; raport `WERYFIKACJA_STABILIZACJA_C.md`.
- C2a: zabezpieczono kamerę przed obrotem pod podłogę; w edycji lewy przycisk nie obraca kamery. Powtórzona próba nie wywołała czarnego widoku. Samo przeciąganie nadal niepotwierdzone, 1.4 pozostaje w trakcie. Backup i zakres odbioru w raporcie C.
- Warunki pakietu B spełnione: usunięcie OP11 i Cofnij/Ponów poprawne; operacja przywrócona. Rzeczywisty eksport JSON pobrany i ponownie zaimportowany; wynik symulacji zachowany. Dowód: `tests/qa/Eko_B_export_20260930_183858.json`. Kalibracja będzie wymagała rzeczywistych danych procesu.
- Kopia bazowa: `backup/v0.4.0_przed_stabilizacja_20260929_225906` — 81 plików, zgodność SHA256. Procedura odtworzenia w raporcie pakietu A. Przed kolejną przebudową modułu wykonać nową kopię.

## Etap 1 — Stabilizacja i bezpieczeństwo projektu

| ID | Krok / oczekiwany rezultat | Status |
| --- | --- | --- |
| 1.1 | Utworzyć nowy backup kodu, konfiguracji, przykładów i dokumentacji; opisać bezpieczne odtworzenie. | wdrożone |
| 1.2 | Ponownie uruchomić testy i build; zapisać stan bazowy oraz przejść ścieżkę nowy projekt → import → proces → balans → layout → symulacja → raport → otwarcie zapisu. | wdrożone |
| 1.3 | Zweryfikować importy, usuwanie operacji, zmianę zależności, ciągłość ręcznych przydziałów oraz Cofnij/Ponów; naprawić wykryte regresje i dodać testy. | wdrożone |
| 1.4 | Potwierdzić i w razie potrzeby naprawić wybór i przeciąganie myszą w 3D oraz synchronizację geometrii 2D–3D. | wdrożone |
| 1.5 | Wprowadzić trwałe identyfikatory stanowisk, niezależne od numeracji i aktualnego zestawu operacji. | wdrożone |
| 1.6 | Zapewnić czytelny wybór zachowania ustawień przy zmianie przydziału, podziale lub scaleniu stanowisk; wyeliminować niejawne resetowanie zasobów. | wdrożone |
| 1.7 | Dopracować zapis, odzyskiwanie i migrację starych projektów; chronić oryginał przy nieudanej migracji i przetestować ponowne otwarcie. | wdrożone |
| 1.8 | Oznaczać nieaktualne wyniki po zmianie danych i wskazywać, co wymaga ponownego przeliczenia. | wdrożone |

**Odbiór etapu:** projekt można zmodyfikować, zapisać, zamknąć i odtworzyć bez utraty danych. Podstawowe operacje mają testy oraz potwierdzony odbiór w UI. Nie ma nierozwiązanych błędów powodujących utratę danych lub niejawnie błędne wyniki w sprawdzanym zakresie.

### Mniejsze podetapy stabilizacji

Te pozycje uszczegóławiają kroki nadrzędne; nie są dodatkowymi niezależnymi wymaganiami.

| ID | Zakres i dowód / pozostała praca | Status |
| --- | --- | --- |
| 1.2.1 | Testy bazowe 35/35 i build; po poprawkach 40/40 i build. Wyniki w raporcie A. | wdrożone |
| 1.2.2 | B: pełna ścieżka Eko/BOM, bilans, CAD, symulacja, raport, zapis lokalny oraz rzeczywisty eksport/import JSON. Po odtworzeniu 16 operacji, 60 materiałów, 16 stanowisk; partia 3 sztuk nadal 21170 s. | wdrożone |
| 1.3.1 | UI: usunięcie OP11 daje 15 stanowisk bez luk i 5 oczekiwanych brakujących referencji BOM; Cofnij/Ponów poprawne, formularz wyczyszczony. Ostatecznie przywrócono 16 stanowisk i 0 błędów. | wdrożone |
| 1.3.2 | Ochrona przed nieistniejącą operacją przy usuwaniu i edycji relacji; dwa testy najpierw odtworzyły błąd, po poprawce przechodzą. | wdrożone |
| 1.3.3 | Synchronizacja otwartego formularza procesu i BOM po Cofnij/Ponów; sprawdzona w przeglądarce na przykładzie silników. | wdrożone |
| 1.3.4 | Czyszczenie formularza po zaakceptowanym imporcie; odbiór UI na XLSX Eko: 16 operacji, 60 materiałów, oba szkice formularzy wyczyszczone. Raport B, B02–B03. | wdrożone |

## Etap 2 — Dokładniejszy model procesu i zasobów

| ID | Krok / oczekiwany rezultat | Status |
| --- | --- | --- |
| 2.1 | Rozdzielić operację, stanowisko, pracownika/pulę pracowników, wyposażenie, wyrób i podzespół; opisać jednostki, relacje i migrację danych. | wdrożone |
| 2.1.1 | Spisać kontrakt bytów, jednostek i referencji oraz bezstratną ścieżkę migracji v4/v5 z jawnymi lukami danych; dowód w `MODEL_PROCESU_2_1.md`. | wdrożone |
| 2.1.2 | Przygotować odczytowy podgląd migracji v4/v5 z zachowaniem źródła, trwałych ID i jawnymi brakami danych; odrzucać błędne referencje i zmieniony podgląd. | wdrożone |
| 2.1.3 | Dodać osobny roboczy schemat 6, parser referencji i przygotowanie migracji tylko po zweryfikowanym podglądzie, bez aktywowania zapisu i symulacji. | wdrożone |
| 2.1.4 | Dodać izolowany zapis szkicu 6 i odczyt z walidacją, zachowując dokładne źródło v4/v5 i chroniąc poprzedni zapis przy błędzie lub konflikcie. | wdrożone |
| 2.1.5 | Pokazać podgląd migracji i luki danych w UI, jawnie zapisać pierwszy szkic 6, ponownie go otworzyć i udostępnić surową kopię uszkodzonego zapisu. | wdrożone |
| 2.1.6 | Umożliwić jawne zastąpienie istniejącego lub uszkodzonego szkicu 6 po pobraniu jego kopii, bez utraty poprzedniej wartości przy konflikcie, błędzie walidacji lub zapisu. | wdrożone |
| 2.1.7 | Edytować osoby i pule osób w szkicu 6 po trwałym ID, z walidacją członkostwa, bezpiecznym usuwaniem, zapisem i Cofnij/Ponów. | wdrożone |
| 2.1.8 | Edytować definicję wyrobu i podzespoły w szkicu 6 po trwałym ID, z jawnymi referencjami operacji, zapisem i wspólnym Cofnij/Ponów. | wdrożone |
| 2.1.9 | Edytować wyposażenie technologiczne w szkicu 6 po trwałym ID, z jawnymi opcjonalnymi powiązaniami do stanowiska i obiektu layoutu, bez wnioskowania możliwości z geometrii. | wdrożone |
| 2.1.10 | Pozwolić ręcznie deklarować operacje obsługiwane przez wyposażenie w szkicu 6, z walidacją referencji i zgodnością wcześniejszych szkiców; nie utożsamiać możliwości z wymaganiem operacji. | wdrożone |
| 2.1.11 | Zbiorczo odebrać migrację Eko i silników, odrębny zapis szkicu, UI oraz niezmienność wyników aktywnej symulacji v4/v5 po edycji szkicu. | wdrożone |
| 2.2 | Rozdzielić czas pracy ręcznej, automatyczny czas maszyny i okres wymaganej obecności operatora. | wdrożone |
| 2.2.1 | W szkicu 6 zdefiniować opcjonalny profil z jawnymi przedziałami czasu ręcznego, automatu i obecności operatora; walidować go bez zgadywania podziału z v4/v5 i zachować zgodność dawnych szkiców. | wdrożone |
| 2.2.2 | Dodać edycję profilu w UI, odrębny zapis, Cofnij/Ponów i ponowny odczyt z jawnymi jednostkami i pochodzeniem czasu. | wdrożone |
| 2.2.3 | Zbiorczo odebrać spójność profilu, migracji i UI na Eko i silnikach oraz niezmienność dotychczasowej symulacji. | wdrożone |
| 2.3 | Określać wymaganą liczbę pracowników przy operacji oraz jawne warianty czasu dla obsady, bez automatycznego dzielenia czasu przez liczbę osób. | wdrożone |
| 2.3.1 | Zdefiniować opcjonalne wymaganie minimalnej obsady i odrębne jawne profile czasu dla liczebności zespołu w szkicu 6, z walidacją i zgodnością dawnych szkiców. | wdrożone |
| 2.3.2 | Umożliwić edycję obsady i wariantów czasu w UI szkicu, z zapisem, usuwaniem, Cofnij/Ponów i ponownym odczytem. | wdrożone |
| 2.3.3 | Odebrać spójność obsady, wariantów, migracji i niezmienność aktywnej symulacji na Eko i silnikach. | wdrożone |
| 2.4 | Obsłużyć operatorów współdzielonych między stanowiskami, ich rezerwację i zwalnianie bez nakładania przydziałów w czasie. | wdrożone |
| 2.4.1 | Zbudować niezależny rejestr rezerwacji konkretnych osób w jawnych przedziałach czasu, z ochroną trwałych ID, odmową kolizji i sprawdzonym zwalnianiem. | wdrożone |
| 2.4.2 | Przed przebiegiem jawnie ustalić stały skład zespołu po ID; powiązać wymagania operacji, profil obecności i wybrany wariant czasu z przydziałem wyłącznie z tego składu. Nie dodawać ani nie zamieniać osób w trakcie przebiegu. | wdrożone |
| 2.4.2.1 | Zbudować walidowany plan przebiegu ze stałą listą osób, jawnym wyborem wariantu i dopuszczonych osób dla każdej operacji; obliczyć okres wymaganej rezerwacji. | wdrożone |
| 2.4.2.2 | Udostępnić wybór składu i wariantów w UI, bezpieczny zapis i ponowny odczyt wyborów oraz Cofnij/Ponów bez zmiany aktywnych projektów 4/5. | wdrożone |
| 2.4.3 | Włączyć rezerwacje do nowej ścieżki harmonogramowania z oczekiwaniem na osoby z ustalonego zespołu; przy operacji utrzymać te same osoby od pierwszego do ostatniego przedziału obecności i zwolnić je po nim. Zachować wyniki aktywnych projektów 4/5. | wdrożone |
| 2.4.3.1 | Zbudować odrębny rdzeń harmonogramu z jawnym składem, wariantami, kopiami stanowisk, kolejkami i rezerwacjami osób bez podwójnego zajęcia. | wdrożone |
| 2.4.3.2 | Podłączyć nową ścieżkę do szkicu 6, pokazać oczekiwanie i przydział oraz odebrać scenariusze UI bez zmiany aktywnej symulacji 4/5. | wdrożone |
| 2.4.4 | Odebrać brak podwójnego przydziału, zapis/odczyt, UI i odmowy błędnych danych na jawnych scenariuszach różnych procesów, w tym Eko z wyraźnie testowymi założeniami. Zgodność Eko z produkcją odbierać osobno w 7.1/7.2, a fizyczną równoległość w 2.8. | wdrożone |
| 2.5 | Uwzględnić kalendarz zasobów, zmiany i przerwy; rozpoczętą operację zatrzymać na przerwę i wznowić z tym samym zespołem. | wdrożone |
| 2.5.1 | Zdefiniować i walidować jawne kalendarze zmian i przerw osób oraz stanowisk w szkicu 6, zachowując odczyt starszych szkiców; wyznaczać dostępne okna bez domyślnych godzin. | wdrożone |
| 2.5.2 | Włączyć kalendarze do odrębnego harmonogramu szkicu 6: pauza operacji na niedostępność, wznowienie z tym samym zespołem i kopią stanowiska, bez podwójnej rezerwacji i bez zmiany aktywnej symulacji 4/5. | wdrożone |
| 2.5.3 | Udostępnić edycję kalendarzy i czytelny podgląd pauz/oczekiwania w UI szkicu 6; odebrać zapis, ponowny odczyt, Cofnij/Ponów i scenariusze różnych procesów. | wdrożone |
| 2.6 | Przypisywać operację do wielu dopuszczalnych stanowisk, z określoną regułą wyboru i wymaganym wyposażeniem. | wdrożone |
| 2.6.1 | Uzgodnić kontrakt dopuszczeń, regułę wyboru stanowiska i sposób zajmowania wyposażenia, zachowując kompatybilność. | wdrożone |
| 2.6.2 | Dodać opcjonalne dane i walidację dopuszczeń oraz wymagań; odebrać starszy odczyt i ochronę zapisu. | wdrożone |
| 2.6.3 | Zastosować kontrakt w odrębnym harmonogramie z kalendarzami i ochroną przed podwójną rezerwacją; sprawdzić ręcznie policzone scenariusze. | wdrożone |
| 2.6.4 | Dodać edytor i podgląd wybranego stanowiska/wyposażenia; odebrać historię, zapis/odczyt i różne procesy. | wdrożone |
| 2.7 | Rozróżnić przygotowanie podzespołu od montażu na wspólnym korpusie; śledzić miejsce i dostępność korpusu. | wdrożone |
| 2.7.1 | Zdefiniować niezależny rejestr fizycznych instancji korpusu z jawną lokalizacją, zajęciem i przemieszczeniem; bez wnioskowania z grafu i 3D. | wdrożone |
| 2.7.2 | Dodać jawne role operacji: przygotowanie podzespołu lub praca na korpusie, powiązania i walidację odczytu/zapisu bez dopowiadania danych. | wdrożone |
| 2.7.3 | Podłączyć lokalizację i dostępność korpusu do odrębnego harmonogramu, z odmową brakujących danych i ochroną tożsamości. | wdrożone |
| 2.7.4 | Dodać edytor i inspekcję korpusu/podzespołów; odebrać UI, historię, zapis/odczyt i różne procesy. | wdrożone |
| 2.8 | Wprowadzić reguły dopuszczalnej równoległości i wzajemnego wykluczania czynności na jednym wyrobie. | wdrożone |
| 2.8.1 | Uzgodnić kontrakt jawnych dopuszczeń i domyślnych wykluczeń; dodać opcjonalne dane, walidację referencji i zgodność zapisu. | wdrożone |
| 2.8.2 | Włączyć reguły do harmonogramu, rejestru korpusu i zajęcia kopii bez konfliktów lokalizacji/osób/wyposażenia; odebrać scenariusze i fizyczne trasy gałęzi w uzgodnionym zakresie. | wdrożone |
| 2.8.3 | Dodać edytor i inspekcję przyczyn, odebrać UI, Cofnij/Ponów, zapis/odczyt oraz różne procesy i raport ograniczeń. | wdrożone |
| 2.9 | Przygotować scenariusze Eko: niezależne podmontaże, montaż drzwi razem lub kolejno, wspólna obsada i dostępność ramy. | wdrożone |
| 2.9.1 | Sprawdzić źródła i braki, przygotować matrycę scenariuszy oraz uzgodnić jawne deklaracje testowe lub dane rzeczywiste. | wdrożone |
| 2.9.2 | Wykonać uzgodnione warianty Eko, odebrać wyniki, zasoby, lokalizację ramy, UI, historię i odczyt oraz raport ograniczeń. | wdrożone |

**Odbiór etapu:** jedna osoba nie wykonuje dwóch czynności jednocześnie; jeden korpus nie znajduje się na dwóch odległych stanowiskach. Równoległe czynności przy jednym korpusie są możliwe tylko przy zgodnych regułach, miejscu i dostępnej obsadzie. Czasy założone są odróżnione od pomiarowych.

## Etap 3 — Symulacja powiązana z rzeczywistym layoutem

3.1a / 3.1.1 (2026-10-08): wdrożone dla szkicu 6 — osobny Web Worker, postęp zakończonych wykonań, anulowanie przez terminate i ochrona przed spóźnionym wynikiem. 137/137 testów, build, UI anulowania 5000 wykonań/ponownego startu i regresje Eko/tras poprawne. Reakcja UI 7,0 ms w jednej próbie. Backup `backup/v0.4.0_przed_3_1a_20261008`: 193 pliki, 0 rozbieżności SHA256. Raport `WERYFIKACJA_TLA_3_1.md`. 3.1 w trakcie; następne 3.1.2 — aktywne obliczenia 4/5 i izolacja od animacji. Domknięto status 2.6 na podstawie odbiorów 2.7–2.9, bez nowej zmiany reguł tras.

3.1b / 3.1.2 (2026-10-08): aktywna symulacja 4/5 oblicza w osobnym workerze, z postępem, anulowaniem i odrzuceniem wyniku poprzednich parametrów. Odtwarzanie/prędkość/reset nie uruchamiają obliczeń. 138/138 testów, build i UI obu wersji poprawne: Eko 3 sztuki/4050 s kończy odpowiednio 21170 s i 21770 s. UI anuluje zadanie 160000 wykonań i pozwala ponowić; dane zapisu bez zmian. Regresja tła szkicu 6 poprawna. Backup `backup/v0.4.0_przed_3_1b_20261008`: 197 plików, 0 rozbieżności SHA256. Raport `WERYFIKACJA_TLA_3_1.md`. 3.1 pozostaje w trakcie do zbiorczego odbioru 3.1.3.

3.1c / 3.1.3 (2026-10-08): zbiorczy odbiór obu ścieżek zakończony; 3.1 wdrożone. 139/139 testów i build poprawne. Rozszerzone UI Edge 4/5/6 potwierdza zmianę wejścia podczas obliczeń, odmontowanie, błędne wejście, błąd konstrukcji i rzeczywisty błąd ładowania workera oraz odzyskanie. Szkic 6: zapis/Cofnij kończy stary worker, dane i źródło zachowane. Anulowanie i niezależność od animacji odebrane. Zmieniono wyłącznie testy i dokumentację; bez zmiany aplikacji/schematu. Raport ograniczeń `WERYFIKACJA_TLA_3_1.md`; koszt kopiowania wejścia i render dużych wyników pozostają do 3.9. Następne 3.2 — punkty materiałowe i edytowalne trasy.

| ID | Krok / oczekiwany rezultat | Status |
| --- | --- | --- |
| 3.1 | Oddzielić obliczenia symulacji od animacji; uruchamiać obliczenia w tle, z postępem i możliwością anulowania. | wdrożone |
| 3.1.1 | Przenieść podgląd harmonogramu szkicu 6 do osobnego workera, dodać postęp/anulowanie i ochronę przed nieaktualnymi zdarzeniami, odebrać zgodność wyników i UI. | wdrożone |
| 3.1.2 | Przenieść aktywne obliczenia 4/5 do tła bez zmiany wyników i oddzielić cykl obliczeń od animacji. | wdrożone |
| 3.1.3 | Odebrać obie ścieżki: responsywność, postęp, anulowanie, zmiana wejścia i brak zależności wyniku od animacji; raport ograniczeń. | wdrożone |
| 3.2 | Dodać punkty wejścia/wyjścia materiału i edytowalne trasy transportowe, z kontrolą jednostek i połączeń. | wdrożone |
| 3.2.1 | Zinwentaryzować istniejące trasy, przygotować propozycję kontraktu punktów i połączeń oraz wskazać decyzję dotyczącą magazynu. | wdrożone |
| 3.2.2 | Wdrożyć uzgodniony model punktów/tras, walidację referencji i kompatybilny zapis szkicu 6; zweryfikować ochronę źródeł i istniejących wyników. | wdrożone |
| 3.2.3 | Dodać edycję punktów i połączeń, jednostki, wspólną historię i odbiór UI/zapisu; opisać zakres użycia w symulacji. | wdrożone |
| 3.3 | Wyznaczać czas transportu z długości trasy, prędkości, załadunku i rozładunku. | wdrożone |
| 3.3.1 | Dodać jawny model parametrów i wyliczenie czasu, walidację, kompatybilny zapis oraz integrację z rdzeniem przewozu i połączeniami materiałowymi. | wdrożone |
| 3.3.2 | Dodać formularze czasu wpisanego/wyliczanego, jednostki i inspekcję składowych; odebrać historię, zapis/odczyt i wyniki dwóch procesów w UI. | wdrożone |
| 3.4 | Modelować dostępność transportu: operator, wózek lub przenośnik; odróżnić czas przejazdu od oczekiwania na zasób. | nierozpoczęte |
| 3.5 | Wprowadzić bufory o ograniczonej pojemności oraz jednoznaczne reguły blokowania i zwalniania stanowiska. | nierozpoczęte |
| 3.6 | Pokazywać stany pracy, oczekiwania na materiał/operatora, blokady wyjścia i transportu wraz z czasami ich trwania. | nierozpoczęte |
| 3.7 | Wykrywać zatrzymanie lub zakleszczenie procesu i przedstawiać jego przyczynę zamiast pozornego zakończenia symulacji. | nierozpoczęte |
| 3.8 | Dodać wykres Gantta operacji, stanowisk i pracowników oraz przejście z wyniku do odpowiedniego obiektu. | nierozpoczęte |
| 3.9 | Sprawdzić wyniki na ręcznie policzonych scenariuszach i większych partiach; zapisać pomiary czasu obliczeń i responsywności UI. | nierozpoczęte |
| 3.10 | Rozszerzyć wybór szybkości odtwarzania symulacji ponad obecne 100× dla długich procesów. Przy wysokich mnożnikach zachować dokładny czas symulowany, kolejność zdarzeń, pauzę i możliwość inspekcji; wynik obliczeń nie może zależeć od prędkości odtwarzania. | wdrożone |

**Odbiór etapu:** wyniki prostych scenariuszy zgadzają się z obliczeniami ręcznymi. Wpływ zmiany trasy i pojemności bufora można wyjaśnić harmonogramem. Przesunięcie obiektu wpływa na czas tylko wtedy, gdy zmienia modelowaną trasę lub inne jawne ograniczenie. Animacja nie wpływa na wynik obliczeń.

## Etap 4 — Balansowanie i porównywanie wariantów

| ID | Krok / oczekiwany rezultat | Status |
| --- | --- | --- |
| 4.1 | Pokazywać oddzielnie obciążenie stanowisk, maszyn i operatorów oraz objaśnić mianowniki wskaźników. | nierozpoczęte |
| 4.2 | Umożliwić blokowanie przydziałów przed automatycznym balansowaniem. | nierozpoczęte |
| 4.3 | Uwzględniać wymagania wyposażenia i kompetencji oraz wskazywać brak wykonalnego przydziału. | nierozpoczęte |
| 4.4 | Wyjaśniać przyczynę ograniczenia przepustowości: obróbka, obsada, transport, blokada lub brak materiału. | nierozpoczęte |
| 4.5 | Porównywać zapisane warianty przy tych samych warunkach eksperymentu: bazowy, dodatkowy pracownik, dodatkowe stanowisko, zmieniony layout. | nierozpoczęte |
| 4.6 | Zestawiać wydajność, czas przejścia, WIP, obsadę, powierzchnię i koszty przy jawnych stawkach oraz założeniach. | nierozpoczęte |
| 4.7 | Proponować zmiany wraz z uzasadnieniem i wynikiem sprawdzenia w symulacji; bez deklaracji gwarantowanego optimum. | nierozpoczęte |

**Odbiór etapu:** można porównać dodanie operatora, stanowiska i reorganizację pracy, rozróżniając szacunek zdolności od wyniku symulacji. Raport zawiera wersję danych, warunki eksperymentu i założenia kosztowe.

## Etap 5 — Wygodny edytor hali i spójny interfejs

Podstawowe poprawki UX mogą być realizowane wcześniej. Większa reorganizacja następuje po ustabilizowaniu modelu danych.

| ID | Krok / oczekiwany rezultat | Status |
| --- | --- | --- |
| 5.1 | Przygotować i porównać dwie propozycje organizacji UI; w razie potrzeby użyć Figmy lub Pencil i zapisać decyzję projektową. | nierozpoczęte |
| 5.2 | Uporządkować przestrzeń pracy: biblioteka/drzewo po lewej, główny widok w środku, właściwości po prawej, wyniki i oś czasu na dole; uwzględnić mniejsze ekrany. | nierozpoczęte |
| 5.3 | Dodać zaznaczanie wielu obiektów, grupowanie, kopiowanie i wyrównywanie. | nierozpoczęte |
| 5.4 | Przenosić stanowisko razem z przypisanym FIFO i strefą obsługi bez utraty relacji technologicznych. | nierozpoczęte |
| 5.5 | Dodać przyciąganie do siatki, krawędzi i punktów połączeń oraz możliwość jego wyłączenia. | nierozpoczęte |
| 5.6 | Dodać wymiarowanie, pomiary odległości, warstwy i blokowanie obiektów. | nierozpoczęte |
| 5.7 | Obsłużyć podkład hali z kalibracją skali. | nierozpoczęte |
| 5.8 | Ustalić i wdrożyć obsługiwany podzbiór importu DXF, z raportem pominiętej geometrii i sprawdzeniem jednostek. | nierozpoczęte |
| 5.9 | Czytelnie pokazywać strefy obsługi, odkładania i komunikacji; ostrzeżenia geometryczne odróżnić od oceny zgodności BHP. | nierozpoczęte |
| 5.10 | Zapewnić wspólne zaznaczenie i dane 2D–3D, spójne skróty, nazwy narzędzi i podpowiedzi. | nierozpoczęte |
| 5.11 | Dodać przełączanie prezentacji czasu między sekundami, minutami i godzinami dziesiętnymi w wynikach, osi czasu i właściwych polach czasu. Jednostka ma być zawsze widoczna, a zmiana widoku lub jednostki wejścia ma przeliczać wartość bez zmiany czasu zapisanego wewnętrznie w sekundach (np. 150 min = 2,5 h). | wdrożone |
| 5.12 | Udostępnić gotowe, pobieralne szablony importu procesu i BOM co najmniej w XLSX, zgodne z bieżącym importerem. Opisać wymagane i opcjonalne kolumny, formaty, jednostki i identyfikatory; sprawdzić import wypełnionych szablonów oraz czytelne błędy przy brakach. Inne formaty są opcjonalne. | wdrożone |
| 5.13 | Po wprowadzeniu lub imporcie poprawnego procesu automatycznie pokazać pierwszą propozycję layoutu opartą na grafie operacji i wstępnym bilansie, także w docelowym modelu stanowisk. Nie wymagać osobnego przycisku do utworzenia pierwszej propozycji. Uwzględniać BOM przy prezentacji przepływu materiałów, jeśli jest dostępny; jego brak nie blokuje szkicu rozmieszczenia stanowisk. Oznaczać domyślne wymiary i wyposażenie jako założenia wizualne, bez przypisywania im zdolności technologicznej. Przy braku wymiarów hali nie deklarować dopasowania do rzeczywistej przestrzeni. Ręczne pozycje chronić przed automatycznym nadpisaniem; ponowne generowanie wymaga jawnej akcji i ostrzeżenia. Odebrać na procesach niezależnych od Eko. | nierozpoczęte |

**Odbiór etapu:** po poprawnym imporcie procesu użytkownik widzi wstępną propozycję layoutu, a następnie samodzielnie odwzorowuje prostą halę i reorganizuje linię bez edycji plików. Grupy i powiązania pozostają spójne po przesuwaniu, kopiowaniu i cofaniu. Próba wykonana w docelowej przeglądarce jest opisana w raporcie.

## Etap 6 — Biblioteka wyposażenia i czytelne 3D

| ID | Krok / oczekiwany rezultat | Status |
| --- | --- | --- |
| 6.1 | Ustalić standard wyposażenia: skala, jednostki, punkt ustawienia, obrys kolizji, strefa obsługi, punkty transportu i metadane źródła/licencji. | nierozpoczęte |
| 6.2 | Przygotować parametryczne stoły, regały, palety, pojemniki, wózki i przenośniki. | nierozpoczęte |
| 6.3 | Przygotować charakterystyczne modele Eko/maszyn w Blenderze tam, gdzie prosta geometria nie wystarcza; sprawdzić skalę i budżet złożoności. | nierozpoczęte |
| 6.4 | Oddzielić model wizualny od parametrów technologicznych, aby wymiana wyglądu nie zmieniała zdolności produkcyjnej. | nierozpoczęte |
| 6.5 | Dodać wygodne manipulatory przesuwania i obrotu oraz ukrywanie warstw i obiektów. | nierozpoczęte |
| 6.6 | Animować produkty, podzespoły i transport zgodnie z harmonogramem symulacji; umożliwić pauzę i inspekcję stanu. | nierozpoczęte |
| 6.7 | Sprawdzić czytelność oraz wydajność większej sceny i zapewnić użyteczny tryb uproszczony. | nierozpoczęte |

**Odbiór etapu:** 3D pozwala zlokalizować problem i edytować układ, a animacja pozostaje zgodna z harmonogramem. Model wizualny nie jest źródłem czasów operacji ani niezależną kopią danych procesu.

## Etap 7 — Walidacja różnych procesów i przygotowanie komercyjne

| ID | Krok / oczekiwany rezultat | Status |
| --- | --- | --- |
| 7.1 | Zebrać rzeczywiste dane Eko: obsada, czasy ręczne/maszynowe, równoległość, wymiary, trasy, bufory, kalendarz i wyniki produkcji; oznaczyć braki oraz źródła. | nierozpoczęte |
| 7.2 | Zastąpić przykładowe czasy pomiarami i porównać model z produkcją; przed odbiorem uzgodnić tolerancje i warunki porównania. | nierozpoczęte |
| 7.3 | Dodać przezbrojenia i warianty produktów, z regułami kolejności oraz czasami przejść. | nierozpoczęte |
| 7.4 | Dodać zmienność czasów i awarie oraz powtarzalne serie eksperymentów z ziarnem losowym i zakresem niepewności wyników. | nierozpoczęte |
| 7.5 | Rozdzielić szczegółowo modelowane straty od rezerwy OEE, aby nie naliczać tych samych strat dwukrotnie. | nierozpoczęte |
| 7.6 | Ustalić sposób dystrybucji i wdrożyć instalację/uruchamianie, aktualizacje oraz kopie i odzyskiwanie projektu; sprawdzić na czystym komputerze. | nierozpoczęte |
| 7.7 | Przeprowadzić przegląd zależności, licencji kodu i modeli oraz bezpieczeństwa adekwatnego do sposobu dystrybucji. | nierozpoczęte |
| 7.8 | Zaktualizować edytowalną instrukcję ze screenshotami, pełny opis funkcji, rejestr zmian i znane ograniczenia. | nierozpoczęte |
| 7.9 | Wykonać pilotażowy odbiór z użytkownikiem na uzgodnionych scenariuszach, usunąć błędy krytyczne i zapisać zakres gotowego wydania. | nierozpoczęte |
| 7.10 | Dopracować wygląd generowanego raportu PDF: czytelną hierarchię, typografię, tabele i wykresy, podziały stron oraz wersję do druku. Sprawdzić na krótkim i długim projekcie, także pod kątem obciętego tekstu i zgodności liczb z wynikami aplikacji. | nierozpoczęte |
| 7.11 | Odebrać uniwersalność na co najmniej dwóch odmiennych procesach niezależnych od Eko, w zadaniach inżyniera procesu i konsultanta Lean: wprowadzenie lub import własnych danych procesu i BOM, wariant bazowy i usprawniony, porównanie, eksport oraz ponowny odczyt projektu. Sprawdzić brak założeń zakodowanych pod Eko, rozdzielenie danych projektów i jawne wskazanie brakujących danych. | nierozpoczęte |

**Odbiór etapu:** wyniki mieszczą się w wcześniej uzgodnionych tolerancjach dla zweryfikowanych przypadków, a scenariusze 7.11 potwierdzają pracę na różnych procesach i danych klientów. Aplikację można zainstalować, zaktualizować i odzyskać dane na docelowym komputerze. Dostępne są instrukcja, rejestr zmian, jawne ograniczenia i raport odbioru. Testy nie zastępują oceny technologicznej, ergonomicznej ani certyfikacji przemysłowej.

Po ustabilizowaniu pakietu D punkty 3.10, 5.11 i 5.12 można wykonać jako małe, niezależne pakiety wcześniej niż resztę ich etapów, jeżeli nie zmienią modelu czasu ani kontraktu importu. Punkt 7.10 jest zaplanowany później, po ustaleniu docelowej zawartości raportu.

## Etap 8 — Po pierwszym wydaniu

Poniższe kroki należą do kolejnej wersji (np. 1.5 lub 2.0). Nie są warunkiem odbioru pierwszego użytecznego wydania.

| ID | Krok / oczekiwany rezultat | Status |
| --- | --- | --- |
| 8.1 | Dodać VSM: mapę obecnego i docelowego strumienia wartości z przepływem materiału i informacji, zapasami, czasami oraz jawnymi źródłami danych. Przed implementacją ustalić zakres symboli, poziom agregacji i kryteria odbioru. | nierozpoczęte |
| 8.2 | Dodać kartę A3 analizy problemu powiązaną z projektem i wariantami: stan obecny, cel, rozpoznanie przyczyn, proponowane działania, odpowiedzialność i termin, wyniki weryfikacji oraz eksport czytelny do omówienia z klientem. Przed implementacją ustalić zakres danych i kryteria odbioru. | nierozpoczęte |

Wspólne logowanie i jednoczesna edycja online również pozostają poza zakresem pierwszego wydania; nie są automatyczną częścią 8.1 ani 8.2.

## Dane i decyzje do uzupełnienia

Braki nie blokują stabilizacji. Nie należy zastępować ich domysłami przedstawianymi jako pomiary.

| Temat | Potrzebne informacje | Stan |
| --- | --- | --- |
| Proces Eko | Czasy pomiarowe, rozdział pracy ręcznej/maszynowej, obsada i dopuszczalna równoległość montażu | Do zebrania w 7.1 |
| Hala i logistyka | Rzut z wymiarami, rzeczywiste stanowiska, strefy, trasy i bufory | Do zebrania w 7.1 |
| Odbiór modelu | Zestaw danych porównawczych, tolerancje i scenariusze | Do ustalenia przed 7.2 |
| Koszty | Stawki pracy i transportu, koszty inwestycji, okres porównania | Do ustalenia przed 4.6 |
| Import CAD | Docelowe pliki i wymagany zakres obsługi DXF | Do ustalenia przed 5.8 |
| Dystrybucja | Docelowe komputery/przeglądarki, praca offline, sposób aktualizacji i licencjonowania produktu | Do ustalenia przed 7.6 |

## Rejestr wykonanych prac i zmian statusów

Aktualizacja 2026-10-08: **3.1** nierozpoczęte → w trakcie, **3.1.1** wdrożone w zakresie szkicu 6. Worker/protokół/postęp/anulowanie, 137/137 testów, build, rzeczywiste UI i regresje; backup 193 zgodny SHA256, raport `WERYFIKACJA_TLA_3_1.md`. **2.6** w trakcie → wdrożone: pozostały zakres gałęzi odebrany w 2.7–2.9; zbiorcze domknięcie w `WERYFIKACJA_STANOWISK_2_6.md`. Poprzednie wpisy pozostają historią.

Każdy kolejny wpis powinien wskazywać konkretne ID. Nie usuwać historii przy zmianie statusu.

| Data | ID | Zmiana statusu | Rezultat / dowód / uwagi |
| --- | --- | --- | --- |
| 2026-10-06 | 2.5.2 | w trakcie → wdrożone | Pauza i wznowienie z tym samym zespołem oraz kopią, jawne odcinki pracy i pauzy, odmowa częściowego kalendarza lub zbyt krótkiego horyzontu; starszy szkic zachowuje podgląd logiczny. Backup 167 plików, testy 105/105, build; `WERYFIKACJA_KALENDARZA_2_5.md`. UI pozostaje w 2.5.3. |
| 2026-10-06 | 2.5.2 | nierozpoczęte → w trakcie | Rozpoczęto podłączenie jawnych kalendarzy do odrębnego harmonogramu szkicu 6. |
| 2026-10-05 | 2.5.1 | w trakcie → wdrożone | Jawne kalendarze osób i stanowisk w szkicu 6, walidacja przedziałów i źródła, obliczenie wspólnej dostępności, zapis/odczyt i odmowy; backup 164 zgodne SHA256, 104/104 testy, build. Kontrakt `MODEL_KALENDARZA_2_5.md`, raport `WERYFIKACJA_KALENDARZA_2_5.md`. Punkt 2.5 pozostaje w trakcie. |
| 2026-10-05 | 2.5, 2.5.1 | nierozpoczęte → w trakcie | Rozpoczęto kontrakt kalendarzy osób i stanowisk. Użytkownik wybrał pauzę rozpoczętej operacji z późniejszym wznowieniem przez ten sam zespół. Rozdzielono kontrakt, harmonogram i UI na 2.5.1–2.5.3. |
| 2026-10-05 | 2.4, 2.4.4 | w trakcie → wdrożone; w trakcie → wdrożone | Odbiór logicznego harmonogramu szkicu 6: 32 wykonania bez podwójnej rezerwacji, identyczne wyniki po ponownym otwarciu, odmowa braku danych i izolacja projektów 4/5. Testy rdzenia objęły także scenariusze silników i graf poprzedników. Rzeczywiste Eko pozostaje w 7.1/7.2, reguły fizyczne w 2.8; raport `WERYFIKACJA_OPERATOROW_2_4.md`. |
| 2026-10-05 | 2.4.4 | nierozpoczęte → w trakcie | Rozpoczęto odbiór zbiorczy rezerwacji, odczytu, UI i izolacji aktywnych projektów. |
| 2026-10-05 | 2.4.3, 2.4.3.2 | w trakcie → wdrożone; w trakcie → wdrożone | Odrębny podgląd szkicu 6, oczekiwanie i przydział; Edge CDP 32 wykonania na danych testowych, odmowa braku odstępu, izolacja zapisów 4/5/6. Testy 103/103, build. Punkt 2.4 pozostaje w trakcie do 2.4.4. |
| 2026-10-05 | PLAN, 8.1, 8.2, 2.4.3.2 | Dodano 8.1 i 8.2 jako nierozpoczęte; 2.4.3.2 nierozpoczęte → w trakcie | VSM i A3 zapisano na kolejną wersję. Rozpoczęto integrację UI odrębnego harmonogramu szkicu 6; aktywne projekty 4/5 pozostają poza zakresem zmian. |
| 2026-10-05 | PLAN, 5.13 | Doprecyzowanie zakresu; dodano 5.13 jako nierozpoczęte | Ustalono samodzielny przepływ pierwszego wydania, automatyczną wstępną propozycję layoutu po danych procesu, pracę konsultanta na danych klienta bez współedycji online i VSM w kolejnej wersji. Bez zmian kodu i statusów dotychczasowych kroków. |
| 2026-10-05 | PLAN, 7.11 | Doprecyzowanie celu; dodano 7.11 jako nierozpoczęte | Eko określono jako niepełny przykład testowy. Zapisano odbiór uniwersalności na niezależnych procesach oraz w pracy inżyniera i konsultanta Lean. Bez zmian kodu i statusów dotychczasowych kroków. |
| 2026-09-29 | PLAN | Utworzenie rejestru | Zapisano uzgodniony plan w `PLAN_ROZWOJU.md`. Wszystkie kroki implementacyjne i odbiorowe pozostają nierozpoczęte. Nie zmieniano kodu ani nie uruchamiano ponownie testów aplikacji. |
| 2026-09-29 | 1.1–1.3 | nierozpoczęte → w trakcie | Rozpoczęto pakiet A: zabezpieczenie wersji 0.4.0, ponowna weryfikacja bazowa i przegląd wspólnych operacji edycji. |
| 2026-09-29 | 1.1 | w trakcie → wdrożone | Backup 81 plików, zgodne SHA256, procedura powrotu w `WERYFIKACJA_STABILIZACJA_A.md`. Nie uruchamiano osobnej instalacji z backupu. |
| 2026-09-29 | 1.2.1, 1.3.2, 1.3.3 | wdrożone — wydzielone podetapy | 40/40 testów, poprawny build, odrzucanie nieistniejących operacji, odbiór Cofnij/Ponów w formularzach procesu i BOM; brak ostrzeżeń/błędów w odczycie konsoli. |
| 2026-09-29 | 1.2, 1.3 | pozostają w trakcie | Pozostały pełna ścieżka UI oraz odbiór importu i usuwania. Nie uznano samych testów funkcji za potwierdzenie wszystkich działań w interfejsie. |
| 2026-09-29 | 1.2.2, 1.3.1, 1.3.4 | kontynuacja — pakiet B | Rozpoczęto odbiór ścieżki interfejsu na osobnym porcie 4193. |
| 2026-09-30 | 1.3.4 | w trakcie → wdrożone | Potwierdzono import obu XLSX przez UI i czyszczenie pól szkicu. Szczegóły w `WERYFIKACJA_STABILIZACJA_B.md`. |
| 2026-09-30 | 1.2.2, 1.3.1 | częściowy odbiór B | Poprawne importy, ręczny bilans, edycja CAD/Cofnij, symulacja i zapis lokalny; błędny import i cykl bez mutacji danych. 40/40 testów i build poprawny. Usuwanie oczekuje potwierdzenia; eksport JSON niepotwierdzony. |
| 2026-10-01 | 1.5 | kontynuacja — D3b/D4c | Odrębny warsztat schematu 5 i odbiór migracji, trwałych ID, edycji przydziału, historii, zapisu/odczytu oraz jawnego layoutu w UI. 62/62 testy, build poprawny. Eksport/import pliku i podział/scalenie w UI otwarte; raport D. |
| 2026-10-01 | 1.5 | kontynuacja — D5a | Rzeczywisty eksport v5 zapisano, sprawdzono i ponownie zaimportowano w UI; zachowano ID i geometrię po przeładowaniu. Błędny plik odrzucono bez utraty poprawnego zapisu. 1.5 nadal w trakcie; raport D. |
| 2026-10-01 | 1.6 | nierozpoczęte → w trakcie | Rozpoczęto D4d: jawny wybór zachowanego ID i losu powiązanych zasobów/geometrii przy podziale/scaleniu. |
| 2026-10-01 | 1.5, 1.6 | kontynuacja — D4d | UI Eko potwierdził podział/scalenie, listę wycofywanych obiektów, syntetyczne ustawienia zasobów, Cofnij/Ponów i ponowny odczyt. 64/64 testy, build poprawny. Pełna integracja edytorów pozostaje otwarta; raport D. |
| 2026-10-01 | 1.6 | kontynuacja — D4e | Edytor zasobów v5 po trwałym ID; UI potwierdził zapis, walidację, zależność kopii od geometrii, reset domyślnych zasobów, Cofnij/Ponów i ponowny odczyt. 64/64 testy i build poprawne; status w trakcie. |
| 2026-10-01 | 1.5, 1.6 | kontynuacja — D4f | Edytor geometrii v5 po trwałym ID, rzut 2D i podgląd 3D. UI Eko potwierdził podział, jawne dodanie stołu, korektę położenia, historię, zapis/odczyt i symulację; 65/65 testów i build poprawne. Integracja pozostałych widoków otwarta; raport D. |
| 2026-10-01 | 1.5, 1.6 | kontynuacja — D5b | Pełna oś czasu symulacji w warsztacie v5, nazwy i trwałe ID stacji, aktywne wykonania dla podglądu 3D. UI Eko: 21 170 s dla 3 sztuk, blokada przy brakującym stole, Cofnij i ponowny odczyt; 65/65 testów i build poprawne. Pełna integracja nadal otwarta; raport D. |
| 2026-10-01 | 1.7 | nierozpoczęte → w trakcie — D5c | Po migracji Eko pobrano oryginalny JSON schematu 4, powtórzono pobranie po przeładowaniu z identycznym SHA256, zaimportowano do projektu 4 i ponownie otwarto. Odbiór uszkodzonego zapisu pozostaje otwarty; raport D. |
| 2026-10-01 | 1.7 | kontynuacja — D5d | UI odzyskiwania: surowy uszkodzony zapis pobrany, import przed zgodą odrzucony, anulowanie i odblokowanie bez nadpisania, po jawnym imporcie Eko v5 16 stanowisk zachowanych po przeładowaniu. 65/65 testów i build poprawne; nieudana migracja nadal do odbioru. |
| 2026-10-01 | 1.7 | kontynuacja — D5e | UI zatrzymał migrację Eko z osieroconym zasobem bez nadpisania projektu v5 i jego oryginalnego JSON; po przeładowaniu oba zapisy zachowały dane. Kod bez zmian, 65/65 testów; starsze zapisy nadal do odbioru. |
| 2026-10-01 | 1.7 | kontynuacja — D5f | Plik bez wersji z dołączonego przykładu silników EV przeszedł import, zapis, migrację v5 i ponowny odczyt; 2 trwałe ID zachowane. Otwarta luka: oryginalne bajty starszego pliku nie są archiwizowane przez importer 4. Kod bez zmian, 65/65 testów. |
| 2026-10-01 | 1.7 | kontynuacja — D5g | Osobne archiwum bajtów importu w zapisie 4 i 5; UI potwierdził Cofnij/Ponów, migrację, przeładowanie oraz SHA256 pobranego pierwotnego pliku. Backup 109 plików, 66/66 testów, build poprawny. Pozostaje przenośne archiwum i szerszy odbiór starszych zapisów. |
| 2026-10-02 | 1.7 | kontynuacja — D5h | Przenośne archiwa projektu 4 i 5; UI na osobnych adresach potwierdził import, ponowny odczyt, dwa trwałe ID, bajtowy oryginał i odmowę złej wersji bez utraty danych. Backup 111 plików, 68/68 testów i build poprawne. Szerszy odbiór dawnych zapisów pozostaje otwarty. |
| 2026-10-02 | 1.7 | kontynuacja — D5i | Import projektu 4 zapisuje przed podmianą stanu. Pełny localStorage odrzucił import Eko bez zmiany projektu bazowego; po zwolnieniu miejsca import, Cofnij/Ponów i odczyt źródła przeszły UI. Backup 112 plików, 68/68 testów i build poprawne. |
| 2026-10-02 | 1.7 | kontynuacja — D5j | Starszy zapis localStorage bez wersji zachował surową postać do pobrania i jawnego potwierdzenia migracji. UI sprawdził SHA256, anulowanie, ponowny odczyt v4 i 2 trwałe ID v5. Backup 113 plików, 68/68 testów, build poprawny. |
| 2026-10-02 | 1.7 | kontynuacja — D5k | Duże archiwum 5,6 MB ujawniło błąd walidacji base64, który odtworzono testem i usunięto. UI potwierdził odmowę przy limicie pamięci bez utraty projektu oraz pełny odczyt źródła z mniejszego archiwum. Backup 114 plików, 69/69 testów, build poprawny. |
| 2026-10-02 | 1.8 | nierozpoczęte → w trakcie — E1 | JSON projektu i CSV symulacji pokazują, czy pobrany plik odpowiada bieżącym danym. UI potwierdził edycję/Cofnij, zmianę partii i odstępu, powrót do parametrów oraz brak wpływu szybkości odtwarzania. Backup 114 plików, 69/69 testów, build poprawny; raport E. |
| 2026-10-02 | 1.8 | kontynuacja — E2 | Osobne statusy archiwum v4, DXF, bilansu CSV i raportu MD; archiwum nie zmienia czasu eksportu JSON. UI potwierdził selektywne odnowienie pliku i Cofnij. Backup 115 plików, 69/69 testów, build poprawny; raport E. |
| 2026-10-02 | 1.8 | kontynuacja — E3 | Status czterech pobrań warsztatu v5; UI Eko sprawdził, że edycja unieważnia tylko JSON/archiwum, a źródła pozostają zgodne. Cofnij i ponowne otwarcie sprawdzone; 69/69 testów i build poprawne. Raport E. |
| 2026-10-02 | 1.8 | kontynuacja — E4 | Status pobranego CSV symulacji zachowany po przebudowaniu widoku i zmianie karty v4/v5; UI potwierdził edycję, blokadę przy błędach, Cofnij i ponowny eksport. Backup 103 plików, 69/69 testów, build poprawny; raport E. |
| 2026-10-02 | 1.8 | kontynuacja — E5 | Znaczniki czterech eksportów v5 zachowane po zmianie karty; druk/PDF oznaczony jako wywołanie bez potwierdzenia zapisu. UI sprawdził edycję i Cofnij. Backup 103 plików, 69/69 testów, build poprawny; raport E. |
| 2026-10-02 | 1.8 | w trakcie → wdrożone — E6 | Osobne statusy XLSX/CSV procesu i BOM, stałe szablony i migawka JSON wariantu. UI potwierdził selektywne unieważnienie, Cofnij, ponowny eksport i granicę sesji; fizyczne pliki sprawdzone. Backup 103 plików, 69/69 testów, build poprawny; raport E. |
| 2026-10-02 | 1.7 | w trakcie → wdrożone | Całościowy odbiór zapisu, odzyskiwania, migracji starszych projektów i ochrony oryginału. Konsolidacja prac D5c–D5k. Zautomatyzowany odbiór UI CDP na porcie 5194 (`verify_1_7.mjs`) potwierdził: 1) odzyskiwanie uszkodzonego localStorage, 2) jawną migrację projektu bez wersji z pobraniem surowej kopii, 3) blokadę migracji przy osieroconych zasobach z zachowaniem oryginału i projektu docelowego, 4) ponowne otwarcie i pełny roundtrip. Backup 128 plików `backup/v0.4.0_przed_1_7_20261002_220500`, 75/75 testów i build poprawne; raport `WERYFIKACJA_MIGRACJA_ZAPIS_1_7.md`. |
| 2026-10-09 | 3.3.2, 3.3 | w trakcie → wdrożone | Formularze, jednostki i składowe; 148/148 testów, build, dwa procesy w Edge, historia i odczyt; raport 3.3. Postęp 23/67 = 34,3%, pierwsze wydanie 23/65 = 35,4%. |
| 2026-10-08 | 3.3.1 | nierozpoczęte → w trakcie → wdrożone | Rdzeń czasu transportu: jawne parametry i źródła, brak cache, rozłączne tryby, harmonogram i odczyt przez sieć. 148/148 testów, build, UI workera/historii/odczytu. Backup 207 zgodnych plików. Raport `WERYFIKACJA_CZASU_TRANSPORTU_3_3.md`. 3.3 w trakcie; postęp 22/67 = 32,8%, pierwsze wydanie 22/65 = 33,8%. |
| 2026-10-08 | 3.2.3, 3.2 | nierozpoczęte → w trakcie → wdrożone; w trakcie → wdrożone | Edytor punktów/połączeń, mm/m, potwierdzenia, historia/usuwanie, zapis/odczyt. Dwa niezależne odbiory Edge i zgodne harmonogramy, 144/144 testów i build. Backup 206 zgodnych plików. Raport `WERYFIKACJA_TRANSPORTU_3_2.md`. Postęp 22/67 = 32,8%; pierwsze wydanie 22/65 = 33,8%. |
| 2026-10-08 | 3.2.2 | nierozpoczęte → w trakcie → wdrożone | Zatwierdzone 1A, opcjonalne punkty/połączenia i referencje do istniejących tras, jednostki mm/m, parser i kompatybilny zapis. 144/144 testów, build, UI historii/odczytu i regresji. Backup 203 zgodnych plików. Raport `WERYFIKACJA_TRANSPORTU_3_2.md`. Postęp głównych ID 21/67 = 31,3%; edytor pozostaje do 3.2.3. |
| 2026-10-08 | 3.2, 3.2.1 | nierozpoczęte → w trakcie; pakiet dokumentacyjny wdrożony | Inwentaryzacja i propozycja kontraktu punktów/tras, decyzja o magazynie przed zmianą modelu. `MODEL_TRANSPORTU_3_2.md`; bez zmian aplikacji/schematu. Powtarzalny postęp głównych ID: 21/67 = 31,3%, pierwsze wydanie 21/65 = 32,3%. |
| 2026-10-08 | 3.1, 3.1.3 | w trakcie / nierozpoczęte → wdrożone | Zbiorczy odbiór obu ścieżek workera: 139/139 testów, build, UI 4/5/6, zmiana wejścia, odmontowanie, zapis/Cofnij szkicu, błędy i odzyskanie. Wyniki i dane zachowane, animacja niezależna. Raport `WERYFIKACJA_TLA_3_1.md`; ograniczenia dużych danych pozostają do 3.9. |
| 2026-10-02 | 3.10 | nierozpoczęte → wdrożone | Wybór mnożników odtwarzania symulacji 1×–5000×, zabezpieczenie granicy czasu w `stepSimulationTime`, inspekcja na pauzie i niezmienność wyników symulacji. Backup 103 plików `backup/v0.4.0_przed_3_10_20261002_211700`, odbiór UI na procesie Eko (21 170 s) w karcie symulacji oraz warsztacie v5, 70/70 testów i build poprawne; raport `WERYFIKACJA_SYMULACJA_3_10.md`. |
| 2026-10-02 | 5.11 | nierozpoczęte → wdrożone | Przełączanie jednostek czasu s/min/h w całym UI (nagłówek, popyt, proces, bilans, symulacja, warianty). Komponent TimeField z automatycznym przeliczaniem, dynamiczne etykiety [s/min/h]. Zachowanie niezmiennika modelu czasu w sekundach potwierdzone testami jednostkowymi i zapisem localStorage. Backup 124 plików `backup/v0.4.0_przed_5_11_20261002_215000`, odbiór UI CDP na porcie 5195 (`outputs/qa/verify_5_11_time_units.png`), 75/75 testów i build poprawne; raport `WERYFIKACJA_JEDNOSTKI_CZASU_5_11.md`. |
| 2026-10-02 | 5.12 | nierozpoczęte → wdrożone | Pobieralne szablony importu procesu i BOM w XLSX (arkusz Dane do natychmiastowego importu, arkusz Opis kolumn ze specyfikacją techniczną) oraz CSV. Wzorcowy proces wielogałęziowy (OP10 → OP20, OP25 → OP30), 5 komponentów ze wszystkimi pojemnikami (BoxKLT, Tray, Carton, Pallet), rozwijana specyfikacja w UI oraz precyzyjne zgłaszanie brakujących wymaganych kolumn przy zachowaniu atomowości. Backup 105 plików `backup/v0.4.0_przed_5_12_20261002_213500`, odbiór UI na porcie 5196, 73/73 testy i build poprawne; raport `WERYFIKACJA_SZABLONY_5_12.md`. |
| 2026-10-01 | 3.10, 5.11, 5.12, 7.10 | dodano do planu — nierozpoczęte | Zapisano wymagania użytkownika: wyższe mnożniki odtwarzania, przełączane s/min/h, szablony importu XLSX procesu i BOM oraz późniejsze dopracowanie PDF. Nie zmieniono statusu aktywnego pakietu D. |
| 2026-10-03 | 2.1.2 | wdrożone — 2.1b | Wersjonowany podgląd migracji v4/v5 bez zapisu i symulacji; zachowuje źródło, ID, jawne ustawienia i pokazuje luki. Backup 117 plików, 78/78 testów i build; raport `WERYFIKACJA_MODELU_2_1.md`. Punkt 2.1 nadal w trakcie. |
| 2026-10-03 | 2.1.3 | wdrożone — 2.1c | Roboczy schemat 6, parser i przygotowanie migracji po podglądzie 2.1b; Eko v4/v5 i przypadki negatywne, 81/81 testów, build, backup 119 plików. Bez aktywnego zapisu i UI; punkt 2.1 w trakcie. Raport `WERYFIKACJA_MODELU_2_1.md`. |
| 2026-10-03 | 2.1.4 | w trakcie → wdrożone — 2.1d | Izolowany zapis i odczyt szkicu 6 z zachowaniem źródła v4/v5, kontrolą konfliktu i odmową nadpisania uszkodzonego szkicu; 83/83 testy, build, backup 120 plików. Bez podłączenia do UI; punkt 2.1 w trakcie. Raport `WERYFIKACJA_MODELU_2_1.md`. |
| 2026-10-03 | 2.1.5 | w trakcie → wdrożone — 2.1e | Podgląd migracji i luk w UI, pierwszy zapis szkicu i odczyt po przeładowaniu, pobranie uszkodzonej wartości. Edge CDP na porcie 5198 potwierdził też niezmienność danych v4/v5 i blokadę nieaktualnego podglądu. Backup 121 plików, 83/83 testy i build. Punkt 2.1 w trakcie; raport `WERYFIKACJA_MODELU_2_1.md`. |
| 2026-10-03 | 2.1.6 | w trakcie → wdrożone — 2.1f | Jawne zastąpienie po pobraniu kopii; walidacja nowego szkicu i porównanie poprzedniej wartości. Edge CDP potwierdził odzyskanie, zastąpienie z innym źródłem, konflikt, błąd pamięci i ponowne otwarcie. Backup 123 plików, 84/84 testy i build. Punkt 2.1 w trakcie; raport `WERYFIKACJA_MODELU_2_1.md`. |
| 2026-10-03 | 2.1.7 | w trakcie → wdrożone — 2.1g | Edycja osób i pul po trwałym ID, odmowa usunięcia osoby używanej przez pulę, zapis i Cofnij/Ponów. Edge CDP potwierdził tworzenie, zmianę członkostwa, ponowne otwarcie i niezmienność v4/v5. Backup 123 plików, 85/85 testów i build. Punkt 2.1 w trakcie; raport `WERYFIKACJA_MODELU_2_1.md`. |
| 2026-10-03 | 2.1.8 | w trakcie → wdrożone — 2.1h | Jawna edycja wyrobu i podzespołów po trwałym ID, sprawdzone referencje operacji, wspólne Cofnij/Ponów. Edge CDP potwierdził edycję, usuwanie, przywrócenie i ponowny odczyt bez zmiany v4/v5. Backup 125 plików, 86/86 testów i build. Punkt 2.1 w trakcie; raport `WERYFIKACJA_MODELU_2_1.md`. |
| 2026-10-04 | 2.1.9 | w trakcie → wdrożone — 2.1i | Ręczna definicja wyposażenia po trwałym ID i jawne opcjonalne powiązania; odmowa błędnych i podwójnych referencji. Edge CDP potwierdził edycję, Cofnij/Ponów, usunięcie, przywrócenie i ponowny odczyt bez zmiany v4/v5. Backup 127 plików, 87/87 testów i build. Punkt 2.1 w trakcie; raport `WERYFIKACJA_MODELU_2_1.md`. |
| 2026-10-04 | 2.1.10 | w trakcie → wdrożone — 2.1j | Opcjonalne jawne możliwości wyposażenia po ID operacji, zgodny odczyt dawnych szkiców. Edge CDP potwierdził wybór, wyczyszczenie, Cofnij/Ponów i ponowny odczyt bez zmiany v4/v5. Backup 129 plików, 88/88 testów i build. Punkt 2.1 w trakcie; raport `WERYFIKACJA_MODELU_2_1.md`. |
| 2026-10-04 | 2.1, 2.1.11 | w trakcie → wdrożone — 2.1k | Zbiorczy odbiór Eko v4/v5 i silników v4: po edycji szkicu 6 dokładne aktywne JSON i pełne wyniki symulacji bez zmian; istniejące testy referencji/migracji i ponowny odbiór UI Edge CDP (zapis, Cofnij/Ponów, odczyt, odzyskanie, zastąpienie). 89/89 testów i build; raport `WERYFIKACJA_MODELU_2_1.md`. Etap 2 pozostaje w trakcie. |
| 2026-10-04 | Etap 3 | nierozpoczęte → w trakcie | Korekta podsumowania zgodnie z zasadą statusu etapu: punkt 3.10 został wcześniej odebrany, choć pozostałe kroki etapu czekają. |
| 2026-10-04 | 2.2, 2.2.1 | 2.2 nierozpoczęte → w trakcie; 2.2.1 w trakcie → wdrożone — 2.2a | Opcjonalny profil czasu w szkicu 6 z jawnymi przedziałami i pochodzeniem; brak wnioskowania z czasu v4/v5, odczyt dawnych szkiców, ochrona zapisu i niezmienny wynik starej symulacji. Backup 146 plików zgodny SHA256, 91/91 testów i build; `MODEL_CZASU_2_2.md`, `WERYFIKACJA_CZASU_2_2.md`. UI i odbiór całego 2.2 pozostają do wykonania. |
| 2026-10-04 | 2.2.2 | w trakcie → wdrożone — 2.2b | Edytor profilu czasu z jawnymi przedziałami, s/min/h i pochodzeniem, odrębny zapis oraz wspólne Cofnij/Ponów. Edge CDP: 2,5 min → 150 s, odrzucenie niepoprawnego przedziału bez nadpisania, ponowny odczyt i nienaruszone v4/v5; `outputs/qa/verify_2_2b_time_profile.png`. Backup 148 plików zgodny SHA256, 92/92 testy i build; raport `WERYFIKACJA_CZASU_2_2.md`. Punkt 2.2 w trakcie do odbioru zbiorczego. |
| 2026-10-04 | 2.2, 2.2.3 | w trakcie → wdrożone — 2.2c | Odbiór Eko v4/v5 i silników v4: brak profilu po migracji, jawny profil po zapisie/odczycie, stary czas, dokładne źródło i pełne wyniki aktywnej symulacji bez zmian. Ponowny Edge CDP, 93/93 testy i build poprawne. Raport `WERYFIKACJA_CZASU_2_2.md`. Etap 2 w trakcie; szkic 6 nie steruje jeszcze nową symulacją. |
| 2026-10-05 | 2.4.2.2 | w trakcie → wdrożone — 2.4c | Edytor stałego składu, wariantów i dopuszczonych osób w szkicu 6; bezpieczny opcjonalny zapis, stare szkice, odrzucenie błędu i wspólne Cofnij/Ponów. Edge CDP: 16 operacji, przeładowanie, usunięcie i izolacja v4/v5. Backup 157 plików zgodny SHA256, 101/101 testów i build; `WERYFIKACJA_OPERATOROW_2_4.md`. 2.4.2 w trakcie do faktycznego przydziału. |
| 2026-10-05 | 2.4.2, 2.4.3.1 | w trakcie → wdrożone — 2.4d | Odrębny harmonogram wiąże wybór z konkretnymi osobami i kopiami stanowisk; testy dwóch sztuk, oczekiwania, całego okresu rezerwacji, zespołu dwuosobowego, poprzedników i odmowy brakujących danych. Jedna operacja na sztukę do reguł 2.8; bez UI i aktywacji. Backup 161 plików zgodny SHA256, 103/103 testy i build; `WERYFIKACJA_OPERATOROW_2_4.md`. 2.4.3 i 2.4 w trakcie. |
| 2026-10-03 | 2.1, 2.1.1 | 2.1 nierozpoczęte → w trakcie; 2.1.1 wdrożone — 2.1a | Kontrakt nowego modelu i migracji w `MODEL_PROCESU_2_1.md`; potwierdzono fakty w pliku Eko, 76/76 testów. Brak zmiany kodu i schematów; parser, migracja i UI pozostają do wykonania. |

| 2026-10-06 | 2.5.3, 2.5 | w trakcie → wdrożone | Edytor i podgląd pauz szkicu 6; UI Eko i syntetycznego pakowania: zapis, walidacja, historia, usuwanie, ponowny odczyt, izolacja 4/5. Backup 167 plików zgodny SHA256, 105/105 testów, build. |

| 2026-10-06 | 2.6, 2.6.1 | nierozpoczęte → w trakcie | Projekt kontraktu w `MODEL_STANOWISK_2_6.md`; wymagane uzgodnienie wyboru stanowiska i zakresu wyposażenia. Bez zmian kodu i danych. |

| 2026-10-06 | 2.6.2 | nierozpoczęte → w trakcie → wdrożone | Opcjonalne dopuszczenia kopii, stałe wyposażenie i jawne rzeczywiste długości tras; zapis/odczyt i ochrona przed błędem. Backup 170 zgodny SHA256, 106/106 testów, build i UI regresji 2.5. Harmonogram i edytor pozostają otwarte. |

| 2026-10-06 | 2.6.3 | nierozpoczęte → w trakcie → wdrożone | Dopuszczenia i wyposażenie w harmonogramie, najwcześniejszy start i rzeczywista trasa do jednoznacznego następcy. Odmowa braku trasy/niejednoznacznego celu, 108/108 testów, build i UI; backup 172 zgodny SHA256. 2.6 w trakcie. |

| 2026-10-06 | 2.6.4 | nierozpoczęte → w trakcie → wdrożone | Edytor, kolejność dopuszczeń, przypisania egzemplarzy i rzeczywiste długości tras. Odbiór dwóch syntetycznych procesów, historia, walidacja, odczyt, 108/108 testów, build, backup 173 zgodny SHA256. 2.6 nadal w trakcie do reguły wielu przyszłych celów. |

| 2026-10-08 | 2.9, 2.9.1, 2.9.2 | w trakcie → wdrożone; w trakcie → wdrożone; nierozpoczęte → wdrożone — 2.9b | Zatwierdzone 1A tylko testy i 2A rama z magazynu na rolotok. Warianty razem/kolejno/wspólna osoba, 135/135 testów, build, trzy UI, historia/odczyt oraz ochrona źródła. Backup 190 zgodny SHA256; WERYFIKACJA_EKO_2_9.md. Bez zmian algorytmu/schematu, bez odbioru produkcyjnego. |
| 2026-10-08 | 2.9, 2.9.1 | nierozpoczęte → w trakcie | Inwentaryzacja eksportu i demonstracji Eko, matryca i konkretna propozycja deklaracji w SCENARIUSZE_EKO_2_9.md. Do uzgodnienia zakres danych i dostępność ramy. Bez zmiany algorytmu/schematu i dopowiadania danych produkcyjnych. |
| 2026-10-07 | 2.8.3, 2.8 | nierozpoczęte → wdrożone; w trakcie → wdrożone — 2.8d | Edytor grup, inspekcja całych zestawów, walidacja i wspólna historia. 133/133 testów, build, trzy syntetyczne scenariusze UI i regresja tras, odczyt oraz ochrona 4/5; backup 188 zgodny SHA256. Odbiór szkicu 6, rzeczywiste Eko w 2.9; raport WERYFIKACJA_ROWNOLEGLOSCI_2_8.md. |
| 2026-10-07 | 2.8.2 | w trakcie → wdrożone — 2.8c | Zatwierdzone pierwszeństwo technologiczne 1A, automatyczne trasy wielu kopii gałęzi bez sumowania, rzeczywista droga korpusu, ponowny wybór przyszłego celu. 133/133 testów, build, UI gałęzi i regresja, historia/odczyt; backup 188 zgodny SHA256. Następne 2.8.3; raport WERYFIKACJA_ROWNOLEGLOSCI_2_8.md. |
| 2026-10-07 | 2.8.2 | nierozpoczęte → w trakcie | Równoległe grupy na wspólnym korpusie i kopii, wyłączność osób/wyposażenia, przewóz dopiero po zwolnieniu wszystkich prac. 128/128 testów, build, UI i odczyt; backup 188 zgodny SHA256. Wielokrotne cele tras gałęzi pozostają do integracji; raport WERYFIKACJA_ROWNOLEGLOSCI_2_8.md. |
| 2026-10-07 | 2.8.1 | w trakcie → wdrożone | Użytkownik zatwierdził 1A/2A. Jawne grupy bez łączenia, walidacja i zapis/odczyt z ochroną źródeł 4/5. 124/124 testów, build, backup 186 zgodny SHA256. Integracja w 2.8.2, UI w 2.8.3; WERYFIKACJA_ROWNOLEGLOSCI_2_8.md. |
| 2026-10-07 | 2.8, 2.8.1 | nierozpoczęte → w trakcie | Propozycja kontraktu grup/par i współdzielenia korpusu/kopii, scenariusze oraz podział na trzy pakiety. Decyzje domenowe do uzgodnienia; nie zmieniono algorytmu ani schematu danych. MODEL_ROWNOLEGLOSCI_2_8.md. |
| 2026-10-07 | 2.7.4, 2.7 | w trakcie → wdrożone | Edytor ról i korpusów, zapis początkowych instancji, czasy tras, inspekcja i wspólna historia. 121/121 testów, build, UI transport/przygotowanie, odczyt, regresja 2.6e; backup 182 zgodny SHA256. Zakres szkicu 6, instrukcja Korpus_v6; fizyczna równoległość w 2.8. |
| 2026-10-07 | 2.7.3 | w trakcie → wdrożone (rdzeń) | Transport według zatwierdzonych 1A/2A, jawne czasy tras, cel zarezerwowany od wyjazdu do końca operacji, najwcześniejszy start po dojeździe i krótsza droga przy remisie. 120/120 testów, build, zapis/odczyt, backup 182 zgodny SHA256. UI w 2.7.4; zasoby ekip/pojazdów poza zakresem. |
| 2026-10-07 | 2.7.3 | nierozpoczęte → w trakcie | Jawne instancje i przypisania, rezerwacja korpusu przez operację i pauzy w jego lokalizacji, wynik ze zdarzeniami. 117/117 testów, build, backup 181 zgodny SHA256. Transport wymaga kontraktu czasu i zajęcia celu; nie oznaczono całego punktu jako wdrożonego. |
| 2026-10-07 | 2.7.2 | nierozpoczęte → w trakcie → wdrożone | Opcjonalne role fizyczne, walidacja referencji i edycja rdzenia; zapis/odczyt 4/5, ochrona źródła i starszych szkiców. 114/114 testów, build, backup 180 zgodny SHA256. Harmonogram jawnie odmawia ról do 2.7.3; UI w 2.7.4. |
| 2026-10-07 | 2.7.1 | w trakcie → wdrożone | Izolowany rejestr tożsamości, lokalizacji, rezerwacji i przemieszczeń korpusu; jawne czasy i odmowy sprzecznych zdarzeń. 111/111 testów, build; backup 177 zgodny SHA256. Integracja, zapis i UI pozostają do 2.7.2–2.7.4. |
| 2026-10-06 | 2.6.1, 2.6.3–2.6.4 | 2.6.1 w trakcie → wdrożone; rozszerzenie odbioru | Automatyczny wybór dalszej drogi dla wielu przyszłych kopii w jednym ciągu, priorytet najwcześniejszego startu, osobny plan i wybrane przejście. 109/109 testów, build i UI; backup 175 zgodny SHA256. Fizyczne gałęzie wymagają 2.7/2.8; 2.6 pozostaje w trakcie. |

### Szablon wpisu odbioru pakietu

2026-09-30 — 1.5: **nierozpoczęte → w trakcie**. D1: dodano niezależny, testowany rejestr stanowisk, bez zmiany zapisu i UI. ID zachowywane przy zmianie kolejności i operacji; podział/scalenie wymagają jawnego wskazania zachowanej tożsamości. Integracja oraz migracja pozostają do wykonania.

2026-09-30 — 1.4: **w trakcie → wdrożone**. Rozstrzygnięto mapowanie współrzędnych narzędzia: wcześniejszy gest nie trafiał w obiekt. Potwierdzono przeciąganie, zgodność 2D–3D, historię i zapis. Logi diagnostyczne usunięte; powtórzono odbiór na końcowym buildzie i przywrócono bazowy layout QA. 40/40 testów i build poprawne. Raport C, sekcja C3.

2026-09-30 — 1.4: **nierozpoczęte → w trakcie**. Wdrożono C1 (odświeżenie formularza 3D po zmianie modelu), wykonano backup modułów, 40/40 testów i build. UI potwierdza Cofnij/Ponów pól. C2 pozostaje otwarte: gest nie potwierdził przesunięcia, pojawił się czarny widok. Szczegóły i procedura powrotu w raporcie C.

Odbiór 2026-09-30 — 1.2, 1.2.2, 1.3, 1.3.1: **w trakcie → wdrożone**. Zamknięto B06 oraz B09–B10. Pobrano rzeczywisty JSON (42836 bajtów), zachowano w `tests/qa`, odtworzono projekt przez UI i powtórzono symulację (21170 s). Bez zmian kodu produkcyjnego; raport `WERYFIKACJA_STABILIZACJA_B.md`. Etap 1 jako całość nadal w trakcie; następny krok 1.4.

- Data i wersja:
- Zrealizowane ID:
- Lokalizacja backupu:
- Zmienione moduły / pliki:
- Testy automatyczne i build — polecenia oraz wynik:
- Scenariusze UI i wynik:
- Migracja/zapis/ponowne otwarcie — wynik:
- Nowe lub pozostałe ograniczenia:
- Aktualizacje dokumentacji:
- Następne kroki / wymagane decyzje:

## Powiązane dokumenty

- [Funkcje obecnej aplikacji](FUNKCJE_PROGRAMU.md)
- [Zmiany i weryfikacja wersji 0.4.0](ZMIANY_v0.4.0.md)
- [Historyczne wymagania i propozycje usprawnień](to_upgrade.md)
- [Instrukcja Eko 0.4](Instrukcja/Eko_v0.4.md)

Ten dokument jest głównym rejestrem przyszłych prac. Historyczne raporty pozostają zapisem stanu wcześniejszych wersji i nie zastępują aktualizacji statusów tutaj.
