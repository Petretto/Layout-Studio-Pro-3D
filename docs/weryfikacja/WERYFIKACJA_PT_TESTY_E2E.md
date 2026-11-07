# PT — status testów E2E i przekazanie do kontroli domenowej

Data aktualizacji: 2026-11-07. Status: **w trakcie**. Gałąź `codex/v1-pt-e2e`, baza `744b7a5837ec9a51c91d42d5c3810e167a912dc6` (P0); pobrany przed rozpoczęciem i ponownie 2026-11-07 `origin/main` oraz RC1: `6aa84d8129b7f7cc4d92c3c00b4d8a99a255d3eb`. Dalsza praca wymaga ponownego fetch i oceny zmian main przed kolejnym pakietem.

## Wykonane prace

Zaktualizowano rzeczywiste wejście przez menu, podgląd, pobranie kopii i potwierdzenie P0 w 16 skryptach wskazanych w planie RC2. Wyniki zapisano pod `outputs/qa/pt_e2e/`; stare liczby oczekiwane nie były zmieniane. Pilot wymaga widocznego rzutu CAD, płótna 3D i udanego procesu 7.12.D. 7.12.D wykonuje harmonogramy, wybór porównania i import/eksport po przeładowaniu. Wynik porównania musi mieć dwa widoczne wiersze, poprawne nazwy wariantów, wskazaną bazę i dokładny makespan we właściwym wierszu. Harmonogram wymaga dokładnej liczby w polu końca partii; po ponownym imporcie szkic jest porównywany w całości.

Wspólny `tests/qa/packageImport.mjs` obsługuje obowiązkowy import pilota i 7.12.D. Pozostałe skrypty utrzymują obecnie własne, poprawione procedury importu; ich dalsza konsolidacja lub decyzja o zastąpieniu z mapą pokrycia pozostaje do wykonania przed zamknięciem PT. Testy pomocnicze sprawdzają negatywnie brak wyniku, błędną liczbę, ukrycie, zamianę wyników między wariantami oraz uszkodzony szkic po ponownym otwarciu. To testy funkcji asercji, nie pełna iniekcja uszkodzenia wyniku w działającym workerze.

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
| `verify_7_13_eko` | wyłącznie wewnętrzny fixture | Lokalny przebieg PASS 2026-11-03; test nadal dopuszcza jedną z dwóch wartości i wymaga kontroli Sol. Nie jest odbiorem publicznego katalogu ani potwierdzeniem praw. Dane/zrzuty Eko nie są częścią tego commitu; P4b pozostaje otwarte |

Wszystkie 16 uruchomiono na gałęzi roboczej w izolowanych profilach Edge; daty wcześniejszych prób i ich zakres podano w surowych plikach wyników. 7.12.D uruchomiony ponownie w końcowym pilocie po wzmocnieniu asercji harmonogramów. Brak dowodu, że wszystkie 16 wykonano po ostatniej modyfikacji testów lub na przyszłym RC2. Nie przenosić PASS do nowego SHA bez stosownego ponowienia.

## Wyniki i granice

- `node --test tests/qa/packageImport.test.mjs tests/qa/scheduleAssertions.test.mjs`: 4/4 PASS; scenariusze negatywne są testami pomocniczych asercji.
- `npm run build`: PASS po dodaniu pola. `verify_7_12a1` po tej zmianie: PASS w Edge. `verify_7_12d`: PASS i zawarty w końcowym pilocie; log `outputs/qa/pt_e2e/pilot-final.txt`.
- Bufory B2a/B2b/B3a–d/B3 UI: PASS według osobnych logów; B3e/B3f oraz A2a/A2b1/B: PASS według osobnych `report.json`/`ui.json`.
- Niezależna kontrola źródła i interpretacji wartości, odpowiedniego trybu i przypisania baz/wariantów: **NOT_VERIFIED — Sol**. W szczególności Eko używa alternatywy 13550/14150 i nie może być przedstawione jako ścisły wzorzec jednego wariantu bez niezależnej analizy.
- Udział człowieka w pilocie, niezależny zewnętrzny odbiór Claude Opus, końcowy nowy RC i działanie po wyłączeniu Eko z publicznych assetów: **NOT_VERIFIED**. G1 i G2 pozostają otwarte. Wynik testu jest zakresem automatyzacji, nie odbiorem V1.
- Pierwsze dwa uruchomienia starego pilota nadpisały lokalne nieśledzone zrzuty w `outputs/qa/7_9_pilot`. Nie dysponujemy potwierdzoną kopią ich wcześniejszej treści. Skrypt przekierowano do oddzielnego katalogu PT; historycznych raportów RC1 nie zmieniano.

## Kolejność dalszej pracy

Teraz potrzebny **Sol** do niezależnej kontroli wzorców i ich pochodzenia, w tym wyboru wariantów i trybów 7.12.D, kontraktu Eko oraz skutków ewentualnych różnic. Nie zmieniać wartości expected tylko po to, aby uzyskać PASS. Po ocenie Sol kontynuować w **Terra** konsolidację helperów lub udokumentowane zastąpienie skryptów, a następnie powtórzyć testy na właściwym SHA. Niezależny audytor Claude Opus ocenia pokrycie pilota; człowiek przeprowadza osobny odbiór. Projekt integracji P1 wymaga Sol i bramki G2; nie wdrażano P2.
