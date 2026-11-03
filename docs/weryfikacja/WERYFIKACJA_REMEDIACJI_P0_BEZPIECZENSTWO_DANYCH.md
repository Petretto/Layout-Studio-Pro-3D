# Weryfikacja remediacji P0 — bezpieczeństwo danych

Data prac: 2026-11-02–03. Status: **wdrożone lokalnie; bez odbioru wydania V1 i bez niezależnego przeglądu zewnętrznego**.

## Zakres i wersje

- PLAN: 1.7, 5.13, 7.6, 7.12.A1, 7.13, 7.14; pakiet P0 planu remediacji. Ustalenia S-03, BL-01 i S-15.
- RC1: `6aa84d8129b7f7cc4d92c3c00b4d8a99a255d3eb`, zamrożony.
- Pobrany `origin/main` przed P0: `6aa84d8129b7f7cc4d92c3c00b4d8a99a255d3eb`, porównanie z RC1: 0/0 commitów, identyczne drzewo.
- Baza `codex/v1-p0-data-safety`: `f1ae9cbb8cffb9a72a244bab35e995063853e52f` — aktualny main plus wcześniejsze commity planu i osobnego monitora. Nie przywracano historycznego kodu nad nowszym main. Commit końcowy pakietu wyznacza commit zawierający ten raport; dowód drzewa plików w `outputs/qa/p0_data_safety/verification-manifest.json`.
- Kopia sprzed zmian: `backup/p0_data_safety_20261102/manifest.sha256.json` (32 pliki, osobno zweryfikowane SHA-256). Zachowano niezwiązane pliki użytkownika.

## Reprodukcja przed poprawką

Pierwszą czynnością produktową była reprodukcja S-03 w osobnym, syntetycznym profilu Edge. Aktywny projekt nazwano `S03_SYNTHETIC_WORK_BEFORE`. Kliknięcie wczytania karty katalogu zastąpiło pracę bez okna pakietu i bez zachowania poprzedniej zawartości w jakimkolwiek kluczu localStorage. Dowody: `reproduce_s03_ui.mjs`, `reproduce_ui.result.json`, `00_before.png`, `01_reproduced.png` w katalogu dowodowym. To historyczny test reprodukcji przed poprawką; po poprawce właściwym oczekiwaniem jest regresja, nie ponowne wystąpienie usterki.

## Zmiana i kontrakt

`DemoCatalog` przekazuje źródło do `ProjectPackageModal`; nie importuje ani nie przeładowuje samodzielnie. Podgląd sprawdza zewnętrzny hash katalogu i wewnętrzny hash pakietu. Zamknięcie pobierania anuluje request; spóźniony wynik nie otwiera okna ponownie. Wczytanie z pliku korzysta z tego samego zatwierdzenia. Tutorial nie ma już ścieżki omijającej zabezpieczenia ani wyjątku zależnego od nazwy projektu. Jego zakończenie otwiera poprzednią kopię do osobnego zatwierdzenia.

`workspaceDrafts.ts` rejestruje niezastosowane formularze procesu/BOM, zasobów i geometrii warsztatu, właściwości 2D/3D oraz edytorów domenowych. Taki formularz blokuje otwarcie importera/odzyskiwania. Przejście do innego obszaru wymaga jawnego odrzucenia; anulowanie zachowuje formularz. Zapis/undo/redo innego edytora domenowego nie może wymusić remountu i utraty roboczego formularza. Błąd zapisu szkicu nie odczytuje automatycznie obcego stanu nad formularzem. Rozdzielono rejestrację niezależnych podformularzy osób/pul, wyrobu/podzespołu, profilu/obsady i korpusów/ról.

Zastosowane zmiany projektu głównego są zapisywane przed podglądem, timer autosave jest anulowany, a zapis i skróty pozostają wstrzymane podczas okien. Zamknięcie niezmienionego podglądu nie aktualizuje nawet metadanych zapisu. Zapis kontroluje oczekiwany poprzedni raw i odczyt po setItem. Konflikt innego okna wstrzymuje zapis; użytkownik zachowuje bieżącą pracę przez eksport przed przeładowaniem. Nie jest to tryb wspólnej edycji wielu kart.

`workspaceReplacement.ts` stanowi wspólną granicę wczytania pakietu i pełnego odtworzenia:

1. Wymaga braku niezapisanej pracy, pobranej kopii i świadomego potwierdzenia. Silnik porównuje bieżące pięć slotów z zatwierdzonym snapshotem.
2. Przed pierwszą zmianą legacy zapisuje surowy pełny backup pod nowym kluczem `layout-studio-before-replace-v1:<uuid>` i weryfikuje odczyt. Nie nadpisuje ani nie kasuje starszych kopii.
3. Utrwala i odczytuje blokadę `layout-studio-workspace-recovery-required-v1`. Brak miejsca lub błędny odczyt kopii/blokady zatrzymuje mutację.
4. Istniejący silnik zapisuje/usuwa odpowiednie sloty i sprawdza odczyt, a przy błędzie próbuje rollbacku wszystkich dotkniętych obszarów. Import pakietu zachowuje niezależną bibliotekę scenariuszy 4 bajt w bajt; pełne odtworzenie nadal ma semantykę pięciu obszarów i null/removal.
5. Blokada znika po potwierdzonym sukcesie albo potwierdzonym powrocie do wcześniej bezpiecznego stanu. Nieudana próba odzyskiwania nie usuwa wcześniejszej nierozstrzygniętej blokady. Niepotwierdzony rollback pozostawia blokadę po reload; aplikacja otwiera odzyskiwanie i nie uruchamia autosave.
6. UI udostępnia kopie do pobrania, a poprawne także do wyboru i jawnego odtworzenia. Uszkodzone raw są materiałem ratunkowym do pobrania, nie obietnicą poprawnego importu. Komunikat o pobieraniu nie udaje potwierdzenia zapisu pliku przez system.

Nie zmieniono formatów projektów 4/5/6, formatów backupu/pakietów, migracji domeny, tożsamości, algorytmów symulacji ani oczekiwanych wyników referencyjnych. Legacy import JSON 4 i zwykłe zastępowanie wariantu nadal mają własne potwierdzenie/Cofnij, z dodanym blokowaniem niezastosowanych formularzy; nie są prezentowane jako pełny import środowiska z nowym dziennikiem.

S-15: regeneracja z listy kontroli wymaga teraz ostrzeżenia o zastąpieniu ręcznych pozycji i obiektów, anulowania i jawnego potwierdzenia. Zmiana pozostaje w historii Cofnij/Ponów. BL-01: do atrapy nowej pamięci DR dodano wymagane `removeItem`; kontraktu silnika i wartości expected nie osłabiono. Wynik skryptu opisuje zakres sprawdzeń, nie gotowość komercyjną ani pełny brak ruchu sieciowego.

## Wyniki i źródła expected

| Sprawdzenie | Rzeczywisty wynik / zakres | Dowód |
|---|---|---|
| Focused core | 24/24 PASS: 12 nowych P0 i 12 istniejących backup/package/DR; quota, readback, stale snapshot, wcześniejsze kopie, rollback/lock, failed recovery | `focused-core.txt`, `tests/core.test.ts` |
| Pełna regresja | 507/507 PASS po końcowych zmianach granicy odzyskiwania; poprzedni checkpoint 505/505 przed dodaniem dwóch przypadków awarii blokady | `full-regression.txt` |
| TypeScript/Vite | PASS; znane ostrzeżenie o chunkach >500 kB, bez aktualizacji zależności | `build.txt` |
| `verify:clean` | PASS: lokalny start HTTP i DR round-trip z zachowaniem ID/sumy; nie zastępuje odbioru web | `verify-clean.txt` |
| Rzeczywisty UI | 17/17 scenariuszy PASS, izolowany Edge, 1440×1000, rzeczywiste kliknięcia, pobrania oraz kontrolowane awarie Storage/fetch; brak wyjątków runtime | `regression-ui.result.json`, `tests/qa/verify_remediation_data_safety.mjs` |
| Instrukcja | MD/HTML/PDF PASS: 67 stron, 53 obrazy; brak pustych stron, brakujących sekcji/obrazów i słów poza stroną; oględziny renderu | `outputs/qa/manual_p0_data_safety/report.json` |
| Dokumentacja/monitor | PASS: 138 dokumentów/112 linków, monitor 7/7 testów i rzeczywisty snapshot UI PASS (P0 wdrożone, następny PT, G1/G2 otwarte); liczniki głównych ID bez zmiany | `documentation.txt`, `progress.txt`, `dashboard-check.txt`, `dashboard-ui.result.json` |

Expected P0 jest niezależnym od aplikacji porównaniem raw pięciu slotów przed/po, znaczników syntetycznej pracy, istnienia wcześniejszej kopii i blokady oraz stanu DOM. Nie oblicza oczekiwań tym samym algorytmem importera. Existing core utrzymuje niezmienione wzorce domeny. Test monitora przestał zakładać na stałe zero wdrożonych pakietów: liczbę i następną pozycję porównuje z bezpośrednim odczytem tabeli rejestru. Przypadek zmiany statusu modyfikuje bieżący wiersz P0, a nie nieistniejący już historyczny tekst. To uzasadniona zmiana kontraktu źródła monitora, bez zmiany wzorców symulacji. Pierwsze uruchomienie ujawniło te dwa stare założenia oraz ograniczenie lokalnego HTTP w sandboxie; po korekcie i wykonaniu z uprawnieniem do localhost 7/7 PASS.

Aktualizacja oczekiwanej nazwy przycisku w weryfikatorze instrukcji wynika z obejrzanego UI i wykonanych kliknięć `Wczytaj projekt i zastosuj`, nie z dostosowania wyniku produkcyjnego.

Scenariusze UI: preview/cancel; import z zachowaniem rodziny; odtworzenie po reload; niezastosowany formularz procesu/nawigacja; stale snapshot; quota kopii; failed rollback/reload/recovery; formularz domeny i zapis innego podformularza; hash zewnętrzny; start tutorialu; zakończenie tutorialu; pending autosave; zmiana aktywnego 4 w innym oknie; stale save 6 bez utraty formularza; S-15 cancel/confirm/undo/redo/reload; anulowanie wolnego fetch; rzeczywiste pliki pobranych kopii. Mapowanie: T01–T03, T06 i T20; T04/T05 częściowo istniejącymi testami round-trip/zgodności. Nie oznaczono całej macierzy RC2 PASS.

## Ograniczenia i bramki

- Brak niezależnego przeglądu Sol/Claude Opus; ta sesja nie jest niezależnym audytorem własnej implementacji. Kontrakt odzyskiwania należy odebrać niezależnie przed zamknięciem G1/P5.
- Edge/localhost to wykonane środowisko. Inna przeglądarka/system, zoom/mobilne pełne UI3/UI4/X3, produkcyjny web i aktualizacja hostingu pozostają w PT/P3/P4/P5. Nie wykonano nowego `npm ci` w czystym systemie.
- Testowano syntetyczny profil. Nie otwierano aktywnego profilu klienta. Rzeczywista fizyczna utrata zasilania, trwała awaria dysku i równoczesne niezależne procesy przeglądarki nie otrzymują gwarancji atomowej transakcji localStorage.
- Kopie zwiększają wykorzystanie limitu pamięci. Brak automatycznego kasowania chroni poprzednie dane, ale może zablokować kolejny import; plik zewnętrzny pozostaje konieczny. Usunięcie danych witryny usuwa lokalny dziennik. Brak zmiany schematu nie jest nowym odbiorem migracji P2a.
- Zwykłe przełączanie elementu wewnątrz pojedynczego edytora i wszystkie dawne operacje legacy nie otrzymały nowego kompleksowego odbioru UX; dalszą spójność nawigacji obejmuje P3. Zarejestrowano formularze do granicy zastępowania, a nie wszystkie ustawienia eksperymentów sesji jako dane projektu.
- G1 pozostaje otwarta do PT i niezależnego odbioru. G2/P1 nadal do zatwierdzenia. Nie rozpoczęto P2, nie utworzono RC2, nie zmieniono main ani RC1. Nie aktualizowano pakietów i nie wykonano deploymentu.

Push pozostaje wstrzymany: repozytorium ma wdrożenie Vercel, a konfiguracja lokalna nie potwierdza wyłączenia automatycznych deploymentów gałęzi. Wymóg właściciela osobnej zgody na deployment ma pierwszeństwo przed ogólną instrukcją synchronizacji GitHub. Przygotowano lokalny commit do przeglądu; nie zmieniano ustawień Vercel w celu obejścia tej granicy.

## Wycofanie i następny pakiet

Wycofanie: osobny commit na gałęzi roboczej, z zachowaniem dziennika/kopii i bez automatycznego odtworzenia nad bieżącymi danymi. Przy regresji odłączyć akcję katalogu, zamiast wracać do niechronionego `loadDirect`. Nie usuwać kluczy ratunkowych ani nie odblokowywać częściowego stanu przez sam revert kodu. Dane odtwarza użytkownik z jawnie wybranej poprawnej kopii.

Następny pakiet **PT**: ocena i implementacja Terra; mechaniczne zmiany po ustaleniu kontraktu mogą trafić do Luna; weryfikacja harnessu Terra, poprawność liczbowych referencji Sol, zewnętrzny Opus dla niezależnego pokrycia pilota. To rekomendacje, nie deklaracje wykonanej zmiany modelu. Kolejny fetch i ocena aktualnego main przed utworzeniem gałęzi PT.
