# PT — status testów E2E i kontrola wzorców

Data aktualizacji: 2026-11-07. Status: **w trakcie**. Gałąź `codex/v1-pt-e2e`, baza `744b7a5837ec9a51c91d42d5c3810e167a912dc6` (P0); pobrany przed rozpoczęciem i ponownie 2026-11-07 `origin/main` oraz RC1: `6aa84d8129b7f7cc4d92c3c00b4d8a99a255d3eb`. Dalsza praca wymaga ponownego fetch i oceny zmian main przed kolejnym pakietem.

## Wykonane prace

Zaktualizowano rzeczywiste wejście przez menu, podgląd, pobranie kopii i potwierdzenie P0 w 16 skryptach wskazanych w planie RC2. Wyniki zapisano pod `outputs/qa/pt_e2e/`; stare liczby oczekiwane nie były zmieniane. Pilot wymaga widocznego rzutu CAD, płótna 3D i udanego procesu 7.12.D. 7.12.D wykonuje harmonogramy, wybór porównania i import/eksport po przeładowaniu. Wynik porównania musi mieć dwa widoczne wiersze, poprawne nazwy wariantów, wskazaną bazę i dokładny makespan we właściwym wierszu. Harmonogram wymaga dokładnej liczby w polu końca partii; po ponownym imporcie szkic jest porównywany w całości.

Wspólny `tests/qa/packageImport.mjs` obsługuje obowiązkowy import pilota, 7.12.D oraz, od 8 listopada, 7.12.B i 7.12.A2a. Dwa ostatnie skrypty przeszły rzeczywiste UI po zmianie (odpowiednio `outputs/qa/pt_e2e/7_12b_ui/run_0jWHtq/` oraz `outputs/qa/pt_e2e/7_12a2a_ui/run_uVnfxU/`). Pozostałe skrypty utrzymują własne procedury importu; ich dalsza konsolidacja lub decyzja o zastąpieniu z mapą pokrycia pozostaje do wykonania przed zamknięciem PT. Testy pomocnicze sprawdzają negatywnie brak wyniku, błędną liczbę, ukrycie, zamianę wyników między wariantami oraz uszkodzony szkic po ponownym otwarciu. To testy funkcji asercji, nie pełna iniekcja uszkodzenia wyniku w działającym workerze.

W A1 wykryto brak pola wyboru oryginału projektu 4 przy eksporcie ze źródła 5. Pole nie występowało już na RC1, chociaż rdzeń eksportu i podręcznik przewidywały taki przepływ. Dodano kontrolkę `Oryginał 4 do pakietu`; A1 sprawdza rzeczywisty plik, eksport, odczyt źródła 5 i zachowanie biblioteki wariantów. To odrębna poprawka UI, a nie regresja spowodowana przez P0.

## Mapa 16 skryptów

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

- `node --test tests/qa/packageImport.test.mjs tests/qa/scheduleAssertions.test.mjs`: 4/4 PASS; scenariusze negatywne są testami pomocniczych asercji.
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

**Pozostały odbiór PT.** Wzorce liczbowe R01–R05/R09 sprawdzone w opisanym zakresie. Okna kandydatów są sprawdzone na poziomie silnika, a UI porównuje ich makespan. Próby zasobów R06/R07 zachowują lokalne dowody PT i wymagają odbioru na nowym kandydacie. Terra konsoliduje pozostałe helpery importu i przeprowadza próby T08, w tym rzeczywistą edycję CAD z Cofnij oraz kontrolowane awarie pełnego przepływu testowego. Następnie potrzebne są ponowienie całego wymaganego zakresu na zamrożonym SHA, zewnętrzny odbiór oraz protokół pilota z człowiekiem. PT i G1 pozostają otwarte. P1 oraz G2 zachowują osobną ścieżkę zatwierdzenia.

## Bieżąca próba pilota CAD

W dwóch przebiegach pilota wejście do hali powiodło się, ale po wybraniu „Dodaj wyposażenie” skrypt nie doczekał się pola „Nazwa obiektu”. To obserwacja wymagająca odrębnej, minimalnej reprodukcji w UI; przyczyna i zakres problemu nie są potwierdzone. Nie zmieniono aplikacji. Częściowe zrzuty są w osobnych katalogach `outputs/qa/pt_e2e/pilot_runs/`; nie stanowią dowodu pełnego przebiegu.

8 listopada uruchomiono pilota w odizolowanym profilu Edge: **PASS** dla automatycznego przebiegu, w tym edycji współrzędnej X istniejącego obiektu, zapisu i porównania zapisanego layoutu po Cofnij. Następnie przebieg wykonał 7.12.D z pięcioma scenariuszami, porównaniem wyników i eksportem oraz ponownym importem. Dowody pilota: `outputs/qa/pt_e2e/pilot_runs/run_8DfLCP/`; dowody zagnieżdżonego 7.12.D: `outputs/qa/pt_e2e/sol_reference/7_12d/run_YXyIRH/`. Nie jest to potwierdzenie dodawania wyposażenia ani odbiór z człowiekiem.

Kontrolowane awarie całego przepływu i konsolidacja pozostałych importów pozostają **NOT_VERIFIED**. Potrzebne są także niezależny odbiór i pełne powtórzenie na zamrożonym SHA. PT i G1 pozostają otwarte.
