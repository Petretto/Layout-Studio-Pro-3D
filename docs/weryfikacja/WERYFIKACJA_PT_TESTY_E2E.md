# PT — status testów E2E i kontrola wzorców

Data aktualizacji: 2026-11-07. Status: **w trakcie**. Gałąź `codex/v1-pt-e2e`, baza `744b7a5837ec9a51c91d42d5c3810e167a912dc6` (P0); pobrany przed rozpoczęciem i ponownie 2026-11-07 `origin/main` oraz RC1: `6aa84d8129b7f7cc4d92c3c00b4d8a99a255d3eb`. Dalsza praca wymaga ponownego fetch i oceny zmian main przed kolejnym pakietem.

## Wykonane prace

Zaktualizowano rzeczywiste wejście przez menu, podgląd, pobranie kopii i potwierdzenie P0 w 16 skryptach wskazanych w planie RC2. Wyniki zapisano pod `outputs/qa/pt_e2e/`; stare liczby oczekiwane nie były zmieniane. Pilot wymaga widocznego rzutu CAD, płótna 3D i udanego procesu 7.12.D. 7.12.D wykonuje harmonogramy, wybór porównania i import/eksport po przeładowaniu. Wynik porównania musi mieć dwa widoczne wiersze, poprawne nazwy wariantów, wskazaną bazę i dokładny makespan we właściwym wierszu. Harmonogram wymaga dokładnej liczby w polu końca partii; po ponownym imporcie szkic jest porównywany w całości.

Wspólny `tests/qa/packageImport.mjs` obsługuje obowiązkowy import pilota, 7.12.D oraz 7.12.B i 7.12.A2a. Dwa ostatnie skrypty przeszły rzeczywiste UI po zmianie (odpowiednio `outputs/qa/pt_e2e/7_12b_ui/run_0jWHtq/` oraz `outputs/qa/pt_e2e/7_12a2a_ui/run_uVnfxU/`). Kolejne rozszerzenie opisano poniżej. Testy pomocnicze sprawdzają negatywnie brak wyniku, błędną liczbę, ukrycie, zamianę wyników między wariantami oraz uszkodzony szkic po ponownym otwarciu. To testy funkcji asercji, nie pełna iniekcja uszkodzenia wyniku w działającym workerze.

Kontynuacja 8 listopada: do helpera podłączono 7.12.A2b1, osiem prób C2 B2a–B3f, edytor C2 B3 oraz wewnętrzny R09 Eko. Wszystkie przeszły w Edge po zmianie. A1 zachowuje oddzielne kroki potrzebne do wstrzykiwania błędów, korzysta jednak ze wspólnego przygotowania kopii; przeszedł pełną sekwencję ochrony i odzyskiwania (`7_12a1/run_yZskQr`). Po wydzieleniu tego kroku powtórzono również C2 B2a (`7_12c2_b2a/run_nCY4xG`). Dowody pozostałych prób znajdują się w nowych katalogach `run_*` pod `outputs/qa/pt_e2e/`; starsze dowody zachowano. Pierwsza próba edytora C2 B3 zakończyła się błędem testu wskutek niedostosowanego drugiego wywołania importu (`run_JhqZnK`); po poprawce przebieg `run_xhen2z` przeszedł. Potrzebna jest jeszcze kontrola kompletności mapy 16 skryptów i odbiór na zamrożonym SHA.

Kontrola T07/T08 8 listopada: `ptCoverage.test.mjs` sprawdził wszystkie 16 nazw z planu, użycie wspólnego helpera (w A1 tylko etapu kopii) i brak dwóch historycznych etykiet importu. Nie zastępuje to uruchomienia wszystkich ścieżek na zamrożonym SHA. `verify_pt_pilot_faults.mjs` uruchomił dwukrotnie pełny pilot w odizolowanym Edge: po faktycznym obliczeniu R01 usunięcie widocznego wyniku i osobno zmiana odczytywanej liczby w DOM zakończyły pilot FAIL z właściwej przyczyny, bez komunikatu PASS. Iniekcje dotyczą wyłącznie UI testowego, nie danych projektu, algorytmu ani wzorców; logi `outputs/qa/pt_e2e/pilot_faults/run_qyb3dX/`. Normalny pilot bez iniekcji następnie przeszedł (`pilot_runs/run_S48vTR/`, zagnieżdżony 7.12.D `sol_reference/7_12d/run_XlgHVi/`). Nie są to testy błędów workera ani odbiór pilota przez człowieka.

W A1 wykryto brak pola wyboru oryginału projektu 4 przy eksporcie ze źródła 5. Pole nie występowało już na RC1, chociaż rdzeń eksportu i podręcznik przewidywały taki przepływ. Dodano kontrolkę `Oryginał 4 do pakietu`; A1 sprawdza rzeczywisty plik, eksport, odczyt źródła 5 i zachowanie biblioteki wariantów. To odrębna poprawka UI, a nie regresja spowodowana przez P0.

## Mapa 16 skryptów

**Próby negatywne pełnego pilota — 9 listopada.** Cztery logi w `outputs/qa/pt_e2e/pilot_faults/run_IC94dQ/` potwierdzają odrzucenie braku wyniku, błędnej liczby, ukrytego wiersza porównania i braku szkicu po ponownym imporcie. Każdy log zawiera znacznik iniekcji, oczekiwaną przyczynę asercji i komunikat NOT_VERIFIED pilota, bez komunikatu jego PASS. Zapisano je w zakończonej poprzedniej sesji, której końcowy status procesu nie był już dostępny; kontrolę powyższych warunków powtórzono na logach. Ukrycie dotyczy DOM porównania, a usunięcie szkicu odbywa się wyłącznie w izolowanym profilu na syntetycznym projekcie po imporcie. Normalny pilot po zmianie skryptów przeszedł w Edge, dowody `pilot_runs/run_2SrbCL/` i `sol_reference/7_12d/run_4mhByS/`. Testy pomocnicze 7/7 PASS. Zmiany skryptów nie były jeszcze częścią powtórzenia wszystkich 16 scenariuszy na jednym SHA.

Zestaw czterech prób negatywnych ponowiono w `outputs/qa/pt_e2e/pilot_faults/run_peRdMd/`. Skrypt kontrolujący potwierdził właściwą przyczynę każdego odrzucenia i zakończył się kodem 0.

**Powtórzenie na wskazanym SHA.** Po pobraniu `origin/main` (nadal `6aa84d8129b7f7cc4d92c3c00b4d8a99a255d3eb`) wykonano cały zestaw 16 skryptów, test dodawania CAD i test dwóch kontrolowanych błędów pilota na `f7e5def82aedbef615eceef99c9ef0fb73e5ddbb`. Wszystkie 18 procesów zakończyło się kodem 0. Wykonanie pilotów negatywnych obejmuje dwa oczekiwane błędy i kontrolę ich przyczyn. Identyczny HEAD i brak zmian w plikach śledzonych potwierdzono przed testem i po nim. Wyniki oraz oddzielne logi znajdują się w `outputs/qa/pt_e2e/regression_dfdca58dc3764baebb08bff38e70f577/`. Testy działały na wcześniejszym buildzie tego kodu w bieżącym katalogu, gdzie istnieją również pliki nieśledzone i lokalne fixtures. Nie jest to odbiór w czystym checkout ani nowy RC. Eko pozostaje testem wewnętrznym.

| Skrypty | Klasyfikacja | Lokalny wynik i zakres |
|---|---|---|
| `verify_7_12a1` | aktywny | PASS; kopia, konflikty, rollback, źródła 4/5, dołączenie oryginału, eksport/reload |
| `verify_7_12a2a`, `verify_7_12a2b1` | aktywne | PASS; aktywny model/raport i odtwarzanie 3D, undo/redo/reload |
| `verify_7_12b` | aktywny | PASS; przykład B, procesowy JIT, porównanie, zapis i eksport/import |
| `verify_7_12c2_b2a`, `b2b`, `b3a`, `b3b`, `b3c`, `b3d`, `b3e`, `b3f`, `b3_ui` | aktywne | PASS; osobne testy konfiguracji buforów, przepływu, lokalnej kontynuacji, blokad i UI; zakresy oraz konkretne wyniki w logach/plikach wynikowych |
| `verify_7_12d` | aktywny | PASS w uruchomieniu pilota 2026-11-07; trzy przykłady, harmonogramy, dokładne wiersze wariantów, round-trip |
| `verify_7_9_pilot` | aktywny | PASS **automatycznego zakresu**, log `pilot-final.txt`; udział początkującego użytkownika i niezależny odbiór nie wykonane |
| `verify_7_13_eko` | wyłącznie wewnętrzny fixture | Lokalny przebieg Terra z 2026-11-03 dopuszczał dwie wartości. Późniejszy przebieg Sol sprawdza dokładnie bazę w trybie configured. Nie jest odbiorem publicznego katalogu ani potwierdzeniem praw. Dane/zrzuty Eko nie są częścią tego commitu; P4b pozostaje otwarte |

Wszystkie 16 uruchomiono na gałęzi roboczej w izolowanych profilach Edge; daty wcześniejszych prób i ich zakres podano w surowych plikach wyników. 7.12.D uruchomiony ponownie w końcowym pilocie po wzmocnieniu asercji harmonogramów. Brak dowodu, że wszystkie 16 wykonano po ostatniej modyfikacji testów lub na przyszłym RC2. Nie przenosić PASS do nowego SHA bez stosownego ponowienia.

## Wyniki i granice

- `node --test tests/qa/ptCoverage.test.mjs tests/qa/packageImport.test.mjs tests/qa/scheduleAssertions.test.mjs`: 7/7 PASS; dodatkowo dwa negatywne uruchomienia pełnego pilota opisano wyżej.
- `npm run build`: PASS po dodaniu pola. `verify_7_12a1` po tej zmianie: PASS w Edge. `verify_7_12d`: PASS i zawarty w końcowym pilocie; log `outputs/qa/pt_e2e/pilot-final.txt`.
- Bufory B2a/B2b/B3a–d/B3 UI: PASS według osobnych logów; B3e/B3f oraz A2a/A2b1/B: PASS według osobnych `report.json`/`ui.json`.
- Kontrolę źródła i interpretacji wzorców R01–R05/R09 wykonano w Sol. Wyniki i zakres są w sekcji poniżej.
- Udział człowieka w pilocie, niezależny zewnętrzny odbiór Claude Opus, końcowy nowy RC i działanie po wyłączeniu Eko z publicznych assetów: **NOT_VERIFIED**. G1 i G2 pozostają otwarte. Wynik testu jest zakresem automatyzacji, nie odbiorem V1.
- Pierwsze dwa uruchomienia starego pilota nadpisały lokalne nieśledzone zrzuty w `outputs/qa/7_9_pilot`. Nie dysponujemy potwierdzoną kopią ich wcześniejszej treści. Skrypt przekierowano do oddzielnego katalogu PT; historycznych raportów RC1 nie zmieniano.

## Kontrola domenowa Sol — 2026-11-07

Sprawdzono stan od `fb700dd95a2f5a7c98a09b582f7af17716136fbb`. `origin/main` po fetch nadal wskazywał `6aa84d8129b7f7cc4d92c3c00b4d8a99a255d3eb`. Rachunek odtworzono z danych wejściowych i jawnych reguł. Punktem odniesienia były `referencje/obliczenia.md` oraz `referencje/oczekiwane_wyniki.json` w pakietach 01–04. Skrypt rachunkowy R01–R05 nie importuje silnika.

| Wzorzec | Warunki | Ukończenia sztuk, baza / kandydat | Rachunek |
|---|---|---|---|
| R01 | JIT, 3 sztuki, odstęp 1 s | 90/130/170 i 90/140/190 s | Czasy 20/30/40 s, w konsolidacji pierwsza kopia pracuje 50 s bez przerwania lokalnej kontynuacji |
| R02 | configured, 3 sztuki, odstęp 1 s | 260/360/460 i 225/305/385 s | Przewóz i pusty powrót po 10 s obciążają monterów źródłowych. OP20 trwa 80 lub 45 s. Test silnika sprawdza także dostawę w 900 s i blokadę bufora |
| R03 | JIT, 3 sztuki, odstęp 1 s | 230/310/390 i 195/255/315 s | Suma czasów pierwszej sztuki 230 lub 195 s, cykl wąskiego gardła 80 lub 60 s |
| R04 | configured, 3 sztuki, odstęp 1000 s | 210/1210/2210 i 180/1180/2180 s | Podmontaże jadą w oknie 60–70 s, korpus 70–80 s. Integracja 70 lub 40 s, transport do testu 10 s, test 50 s. Kolejne sztuki mają jawne przesunięcia 1000 i 2000 s |
| R05 | JIT, 3 sztuki, odstęp 1 s | 180/250/320 i 150/210/270 s | Integracja czeka na gałęzie 50/60/40 s i zwolnienie kopii. Dwa warianty używają czasów 70 i 40 s. Po integracji test trwa 50 s |

W R01–R05 dla operacji szeregowych użyto maksimum gotowości i dostępności stanowiska/obsady. W R02 dostępność monterów źródłowych obejmuje pracę, przewóz i powrót. W R04 jawne odizolowanie sztuk pozwala przesunąć cały przebieg o czas przybycia. R05 wiąże start integracji z ostatnią z trzech gałęzi oraz z poprzednią sztuką na tej kopii. Rachunek sprawdził 126 okien i 30 ukończeń w dziesięciu przebiegach. Zob. `outputs/qa/pt_e2e/sol_reference/arithmetic.json` i `verify-arithmetic.cjs` obok wyniku.

**R09 / Eko.** Szkic po imporcie jest identyczny z zapisanym `EKO-PARALLEL`. W trybie configured dla jednej sztuki i odstępu 1 s ścieżka ramy trwa 7670 s. OP22 i OP23 pracują równolegle 7670–8270 s, potem OP24 i OP25 zajmują łącznie 960 s. OP19, OP20 i pakowanie OP21 domykają 13 550 s. `EKO-SEQUENTIAL` traci równoległość z powodu braku jawnej grupy drzwi. W `EKO-SHARED-WORKER` grupa istnieje, lecz obie operacje wymagają tej samej osoby. W obu przypadkach druga operacja drzwi dodaje 600 s. Ścisły wynik to 14 150 s dla każdego z tych dwóch wariantów. Konfiguracja odtwarza eksperyment regresyjny z testowymi rolami. W 7.13 przełącznik JIT jest wyłączony, importowany szkic musi odpowiadać bazie, a test weryfikuje 16 wykonań i dokładne okna drzwi oraz pakowania. Zrzuty, pobrania i lokalny wynik Eko pozostają w `outputs/qa/pt_e2e/internal_eko_sol/`.

**Wyniki wykonania.** `verify_7_12d.mjs` w odizolowanym Edge wykonał wszystkie pięć scenariuszy, z jawną bazą i trybem porównania. Asercje objęły 63 okna i ukończenia szkicu bazowego, makespan obu wariantów w widocznym UI i pobranym Markdown oraz zachowanie szkicu po ponownym imporcie. Wynik rzeczywisty `outputs/qa/pt_e2e/sol_reference/7_12d/run_iog6Tz/report.json`. Wewnętrzny test Eko uzyskał PASS dla bazy configured. Testy silnika 9/9 PASS pokrywają oba warianty, ich pełne okna, dostawę/blokadę oraz trzy warianty Eko. Dwa pierwsze uruchomienia UI zakończyły się błędem wyboru karty Edge lub portu CDP przed scenariuszem. Udany przebieg korzysta z przydzielanego portu i własnej karty w świeżym profilu. Źródłowe liczby referencyjne pozostają w plikach pakietów.

**Pozostały odbiór PT.** Wzorce liczbowe R01–R05/R09 sprawdzono w opisanym zakresie. Okna kandydatów sprawdza silnik, a UI porównuje ich makespan. Próby zasobów R06/R07 zachowują lokalne dowody PT i wymagają odbioru na nowym kandydacie. Lokalnie wykonano T07 i dwie próby negatywne T08 oraz sprawdzono edycję i dodawanie w CAD. Pozostają powtórzenie wymaganego zakresu na zamrożonym SHA, zewnętrzny odbiór i protokół pilota z człowiekiem. PT i G1 pozostają otwarte. P1 i G2 zachowują osobną ścieżkę zatwierdzenia.

## Bieżąca próba pilota CAD

W dwóch przebiegach pilota wejście do hali powiodło się, ale po wybraniu „Dodaj wyposażenie” skrypt nie doczekał się pola „Nazwa obiektu”. Częściowe zrzuty zapisano w `outputs/qa/pt_e2e/pilot_runs/`.

W minimalnej reprodukcji 8 listopada kliknięcie „Dodaj wyposażenie” w czystym projekcie otworzyło panel właściwości bez pola „Nazwa obiektu”. Test `verify_cad_add_equipment.mjs` zakończył się FAIL w Edge. Stan i zrzut zapisano w `outputs/qa/pt_e2e/cad_add/run_JoyPww/`.

Przycisk tworzył szkic równocześnie z wyczyszczeniem zaznaczenia. Efekt synchronizacji po tej zmianie usuwał szkic. W `LayoutEditor.tsx` puste zaznaczenie zachowuje teraz szkic obiektu, którego jeszcze nie ma w layoucie. Zmiana projektu nadal odświeża szkic według aktualnej geometrii. Zatwierdzenie korzysta z dotychczasowej ścieżki zapisu i dodaje jeden wpis do historii.

Po poprawce test Edge potwierdził anulowanie bez zmiany zapisu, dodanie i zapis, Cofnij/Ponów oraz zachowanie geometrii i identyfikatora po ponownym otwarciu pustego projektu. W syntetycznym projekcie 01 sprawdzono dodanie po zaznaczeniu istniejącego obiektu, zachowanie poprzedniej geometrii, procesu, BOM, popytu i ustawień stanowisk oraz odczyt tego samego identyfikatora w widoku 3D. Pierwsze podejście do 3D na pustym projekcie zakończyło się przekroczeniem czasu, ponieważ widok 3D wymaga procesu i stanowisk. Dowody udanej próby są w `outputs/qa/pt_e2e/cad_add/run_bYnpSG/`. Build produkcyjny i 19 celowanych testów rdzenia dla 5.3, 5.4, 6.1, 6.4 oraz 6.5 przeszły.

8 listopada uruchomiono pilota w odizolowanym profilu Edge: **PASS** dla automatycznego przebiegu, w tym edycji współrzędnej X istniejącego obiektu, zapisu i porównania zapisanego layoutu po Cofnij. Następnie przebieg wykonał 7.12.D z pięcioma scenariuszami, porównaniem wyników i eksportem oraz ponownym importem. Dowody pilota: `outputs/qa/pt_e2e/pilot_runs/run_8DfLCP/`; dowody zagnieżdżonego 7.12.D: `outputs/qa/pt_e2e/sol_reference/7_12d/run_YXyIRH/`. Nie jest to potwierdzenie dodawania wyposażenia ani odbiór z człowiekiem.

Po poprawce ponowiono pełny automatyczny pilot w Edge. Edycja istniejącego obiektu CAD, Cofnij, 3D oraz 7.12.D z obliczeniami i ponownym importem przeszły. Dowody są w `outputs/qa/pt_e2e/pilot_runs/run_JxV2oE/` oraz `outputs/qa/pt_e2e/sol_reference/7_12d/run_C2eUKR/`. Niezależny odbiór, udział człowieka i pełne powtórzenie na zamrożonym SHA pozostają **NOT_VERIFIED**. PT i G1 pozostają otwarte.
