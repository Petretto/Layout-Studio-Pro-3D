# Plan remediacji po audycie RC1 — V1.0.0

Data: 2026-11-01. Status: **plan do zatwierdzenia**. Nie rozpoczęto implementacji pakietów. Nie utworzono RC2; V1 nie jest gotowe do wydania. Decyzje biznesowe A-01–A-04 są zatwierdzone; projekt techniczny integracji wymaga odrębnego odbioru.

Aktualizacja procedury: **2026-11-02 — podstawą rozwoju jest pobrany i zweryfikowany `origin/main`, RC1 pozostaje historycznym materiałem audytu**. Reweryfikacja nie wykazała różnic main względem RC1, dlatego zakres i kolejność pakietów pozostają bez zmian. Nie wykonano nowych poprawek funkcjonalnych; zachowano wcześniej ukończony osobny monitor.

## Aktualizacja wykonania — 2026-11-03

Właściciel polecił realizację planu; G0 zamknięta. P0 wdrożone lokalnie na `codex/v1-p0-data-safety`, z bazą `f1ae9cbb8cffb9a72a244bab35e995063853e52f` (zweryfikowany main i wcześniejszy plan/monitor). S-03 odtworzono w rzeczywistym UI przed naprawą; końcowe 24/24 focused, 507/507 pełne, UI 17/17, build i verify:clean PASS. [Raport P0](../weryfikacja/WERYFIKACJA_REMEDIACJI_P0_BEZPIECZENSTWO_DANYCH.md). Niezależny przegląd kontraktu odzyskiwania pozostaje NOT_VERIFIED. G1 otwarta do PT i niezależnego odbioru; G2 wymaga oddzielnego zatwierdzenia projektu P1. Następny pakiet PT. Historyczne opisy stanu z 1–2 listopada poniżej/wyżej dokumentują etap planowania i nie są bieżącym statusem. Nie utworzono RC2 i nie wykonano deploya.

## 1. Executive Summary

Najpilniejszy jest S-03: bezpośrednie wczytanie przykładu pomija ochronę aktywnej pracy. Reprodukcja na sztucznej pamięci potwierdziła zastąpienie trzech obszarów bez trwałego zachowania poprzednich danych. Test przeglądarkowy pozostaje do wykonania jako pierwsze działanie P0. Nie należy utożsamiać tego z BL-01, który jest błędem atrapy testowej DR.

V1 musi obejmować UI3/UI4/X3 i jeden przepływ proces/BOM → bilans → layout → właściwa symulacja → warianty → wspólny raport. Rekomendowana integracja to warstwa właścicieli danych, komend i adapterów obliczeń; bez usuwania modelu 4 i bez automatycznego zastępowania go 6. Wymaga bezpiecznej migracji, jednej rewizji projektu i jawnej aktualności wyników.

Kanałem V1 jest web. Kod osadza Vercel Analytics bez warunku, więc deklaracja niewysyłania jakichkolwiek danych nie ma podstaw. Eko trzeba wyłączyć z generowania publicznych plików, usunąć pozostające assety i sprawdzić stare adresy; ukrycie karty nie wystarczy. Istniejące fixtures zostają zachowane. Vite 7.3.6 wymaga poprawki w osobnym pakiecie, bez aktualizacji podczas tej analizy.

## 2. Baza, źródła i granice dowodów

- Repo: `Petretto/Layout-Studio-Pro-3D`. Historyczna pierwsza gałąź planu: `codex/plan-remediacji-rc1`; bieżąca: **`codex/v1-audit-remediation`**.
- Po wznowieniu 2026-11-02 wykonano `git fetch origin`. Przed zmianą gałęzi HEAD wynosił `4b9d30be3cf176ab26e3c97248298b3a0e2be305`; jedyna zmiana śledzona dotyczyła daty wygenerowania `progress-dashboard/data.js`. Zachowano ją, jej kopię i zastane pliki nieśledzone.
- Nowa nazwa gałęzi nie istniała. Utworzono ją poleceniem `git branch --no-track codex/v1-audit-remediation origin/main`; reflog potwierdza bazę. Następnie lokalnym fast-forward zachowano istniejące commity `69497e8` (plan) i `4b9d30b` (wcześniej zamówiony monitor), bez ponownej implementacji, force push lub zmiany poprzedniej gałęzi. Nowa gałąź nie śledzi main jako celu push.
- Nie zmieniono `main` ani `release/v1-audit-rc1`. Raporty źródłowe i historyczne odbiory pozostają nienaruszone. Porównanie kodu aplikacji głównej i zależności między pobranym main a zachowanymi commitami jest puste.

| Wersja / punkt odniesienia | Pełny SHA, zweryfikowany 2026-11-02 |
|---|---|
| Historyczny RC1 — `release/v1-audit-rc1` | `6aa84d8129b7f7cc4d92c3c00b4d8a99a255d3eb` |
| Aktualny `origin/main` po fetch | `6aa84d8129b7f7cc4d92c3c00b4d8a99a255d3eb` |
| Podstawa utworzenia `codex/v1-audit-remediation` | `6aa84d8129b7f7cc4d92c3c00b4d8a99a255d3eb` |

`git rev-list --left-right --count RC1...origin/main`: **0 / 0**; `git diff RC1 origin/main`: **brak różnic w całym drzewie**. Żadne ustalenie nie zostało naprawione na main od RC1. Wszystkie 21 pozycji podlega nadal ocenom z macierzy, z zachowaniem luk UI, bezpieczeństwa i audytów niezależnych. Równość kodu nie jest nowym wykonaniem testów. Dowód: `outputs/qa/plan_remediacji_rc1/reconciliation_main_20261102.json` — referencje, obiekty plików dla każdego ustalenia, 16 skryptów ze starymi selektorami oraz sumy raportów.

### Obowiązująca procedura wyboru bazy i reweryfikacji

1. Przed analizą i przed każdym przyszłym pakietem zapisać aktualną gałąź, HEAD i status, zabezpieczyć lokalne zmiany, pobrać `origin` i zapisać pełny SHA `origin/main`. Nie opierać się wyłącznie na starym lokalnym wskaźniku lub nazwie gałęzi.
2. Porównać ten main z zamrożonym RC1 i z poprzednią bazą oceny: historia commitów, pliki i istotne ścieżki wykonania. Dla każdego BL/S rozstrzygnąć: nadal występuje, poprawione z dowodem, wymaga ponownego testu albo niepotwierdzone/nieaktualne. Historyczny raport nie przesądza aktualnego statusu.
3. Ponownie odnieść A-01–A-04 do aktualnych edytorów, właścicieli danych, migracji, raportów, kanału web i publicznych powierzchni Eko. Jeśli zmiana main narusza przyjęty kontrakt, zaktualizować projekt i jego odbiór przed implementacją zależnego pakietu; nie przenosić w ciemno projektu z RC1.
4. Planowanie prowadzić na `codex/v1-audit-remediation`, utworzonej od zweryfikowanego main. Jeśli nazwa już istnieje, sprawdzić jej bazę i zmiany; nie resetować, nie wymuszać przesunięcia ani nie nadpisywać gałęzi. Niezgodność wymaga bezpiecznego uzgodnienia dalszej gałęzi, bez utraty dotychczasowej pracy.
5. Każdą przyszłą implementację prowadzić jako osobny, spójny pakiet na gałęzi roboczej. Bazą jest zweryfikowany main oraz wyłącznie jawnie wskazane, wymagane i odebrane poprzedniki; jeśli nie są jeszcze w main, zapisać ich SHA. Nie zaczynać od historycznego RC1 ani nie włączać przypadkowych lokalnych zmian.
6. Test reprodukcji przed naprawą, focused regresja i odpowiednie UI/migracje po niej. Dokumenty planistyczne ani aktualizacja snapshotu monitora nie stanowią wykonania P0–P5. Zmiana main wymaga ponownej oceny dotkniętych dowodów, nie automatycznej zmiany expected ani pełnej suity bez uzasadnienia.
7. Dopiero po ukończeniu i weryfikacji wszystkich wymaganych pakietów przygotować nowy RC2 z konkretnym SHA, zapisać jego relację do pobranego main i uruchomić ponowny niezależny audyt. Nie przesuwać RC1 i nie deklarować gotowości V1 wcześniej. Push/deployment pozostają odrębnymi działaniami z zachowaniem zakazu automatycznego wdrożenia.

Odnaleziono i odczytano **trzy raporty** w `C:\AI\Layout Gen\audit-v1-6aa84d8\reports`:

| Raport | Data/rola | SHA-256 pliku wejściowego |
|---|---|---|
| `01_2_baseline.md` | 2026-10-30, wykonania baseline | `93042c576b6f88974f5f72786fb283b02b56c65fb7af121243fc5b09f3dec461` |
| `01_3_evidence.md` | 2026-10-30, inwentaryzacja dowodów | `2f8d4b8693de65f505010ad2efb6374155edb6875d4aec3afb79e3fd3aecdebb` |
| `01_4_release_scope.md` | 2026-10-31, Claude Opus, przegląd zakresu S-01–S-18 | `bac27898bde09d902903ddab6aea3526639255b65d96699dd3984c47b0c51d4e` |

Są to baseline, inwentaryzacja i przegląd zakresu; **nie** trzy zakończone niezależne audyty domeny/symulacji/bezpieczeństwa etapu 02. Raportów 02.1–02.5/03.1–03.2 w podanej lokalizacji nie znaleziono; nie przypisujemy im wyników. 495/495 i build PASS pochodzą z 01.2, nie z bieżącego uruchomienia. BL-01, audit i pilot w tym samym baseline mają FAIL.

Odczytano obowiązkowe dokumenty: `PLAN_ROZWOJU.md`, `AGENTS.md`, `docs/plany/audit_plan.md`, `PLAN_WDROZENIA_UI_UX.md`, `docs/README.md`, `FUNKCJE_PROGRAMU.md` i trzy raporty. Kontrakty domenowe oraz mapa kodu są wymienione w [architekturze](ARCHITEKTURA_INTEGRACJI_MODELI_V1.md). Zakres X3 odtworzono z planu głównego; nie jest synonimem samego zakończenia stylowania UI4.

### Sprawdzenia pierwszej wersji planu — 2026-11-01

1. Odczyt Git i porównanie zdalnych wierzchołków; analiza wskazanych ścieżek kodu i dokumentów.
2. S-03: `node outputs/qa/plan_remediacji_rc1/reproduce_s03.mjs`, Node 24.14.0, esbuild z lokalnej instalacji. Wynik w `outputs/qa/plan_remediacji_rc1/reproduce_s03.result.json`: `reproduced=true`, zmienione v4Project/domainDraft/domainVariants, poprzedni projekt nieobecny w pamięci. Migawka zwracana przez API, lecz nie zapisywana w sekwencji katalogu. Wyłącznie syntetyczna Map, bez localStorage użytkownika. Początkowe uruchomienie pomocniczego harnessu wymagało ustawienia loadera TS; po korekcie asercje przeszły. Nie zmieniono kodu importera.
3. W kodzie `parseProjectPackage` sprawdza wewnętrzną sumę pakietu. Bezpośrednia ścieżka nie sprawdza **zewnętrznej** `packageSha256` z katalogu; nie opisywać jej jako całkowitego braku kontroli SHA.
4. Wyszukiwanie starych etykiet potwierdziło 16 skryptów QA. Generator katalogu zapisuje aktualne pliki, lecz nie usuwa nadmiarowych. Lokalnie istnieją wygenerowane `public/demo-projects/04_eko.project.json` i `04_eko.zip` (ignorowane przez Git).
5. Przegląd aktualnych oficjalnych źródeł Vercel/GHSA/SheetJS — odnośniki i zakres w [zakresie wydania](ZAKRES_WYDANIA_V1_0_0.md). Nie wykonano nowego npm audit, aktualizacji, pełnej regresji, builda, testu przeglądarkowego ani testu produkcji w tej analizie. Kontrole dokumentacji i postępu wykonuje się przy zamknięciu niniejszego pakietu.

Reweryfikacja 2026-11-02 obejmuje fetch i porównanie całego drzewa oraz obiektów źródłowych powiązanych z 21 ustaleniami. Nie powtarzano historycznego baseline, npm audit ani testów UI produktu. Ich faktyczne wykonanie pozostaje warunkiem właściwych pakietów i nowego RC.

## 3. Decyzje → wymagania i bramki

| Decyzja | Wymaganie wykonawcze | Pakiety i warunek zamknięcia |
|---|---|---|
| A-01 | Całe UI3, UI4, X3, pozostałe obowiązki UI1/UI2/U; jeden język i nawigacja, stany/braki, ochrona nadpisania | P0, P2b–d, P3, P4c, P5; kryteria U01–U12 i rzeczywiste UI z planu testów |
| A-02 | Jeden projekt/rewizja/wariant dla danych wspólnych, jawne profile i źródła, trzy rodzaje wyników, unieważnianie, pełny raport i bezpieczny import starych projektów | P1 zatwierdzony przed P2a–d; migracje, referencje i raport tej samej rewizji PASS |
| A-03 | Web V1.0.0, rozdzielenie projektu i telemetrii, kontrola zależności, aktualizacji i odzyskiwania na stałym origin | P4a, P4c, P5; dowód produkcyjnych ustawień i testów po osobnej zgodzie na deployment |
| A-04 | Eko poza katalogiem, assetami i nowymi publicznymi dystrybucjami; regresja zachowana poza publicznym produktem | P4b wcześnie, powtórny odbiór w P5; manifest + negatywne HTTP + plan dla historycznej ekspozycji |

Bramki: **G0** zatwierdzenie tego planu; **G1** odbiór P0/PT; **G2** zatwierdzenie projektu P1 przez właściciela i niezależny przegląd kontraktów; **G3** integracja/migracje/raport i UI odebrane; **G4** czysty nowy kandydat przechodzi regresję; **G5** niezależne audyty nowego RC i odbiór właściciela. Utworzenie RC2 dopiero po zakończeniu zmian i wymaganych testów, a wydanie/deploy produkcyjny po osobnej zgodzie.

### Rejestr bramek do monitorowania

Statusy poniżej są źródłem dla osobnego `progress-dashboard`. Zmiana statusu wymaga zapisanego dowodu odbioru; decyzja biznesowa nie zamyka automatycznie bramki technicznej. Pakiety i bramki nie zwiększają licznika głównych ID planu.

| Bramka | Warunek | Status | Dowód |
|---|---|---|---|
| G0 | Zatwierdzenie planu remediacji przez właściciela | zamknięta | 2026-11-02: właściciel polecił działać zgodnie z planem; G2 pozostaje osobnym odbiorem architektury |
| G1 | Ochrona danych P0 i wykonywalne testy PT odebrane | otwarta | P0 lokalnie wdrożone i sprawdzone; PT oraz niezależny odbiór kontraktu odzyskiwania pozostają otwarte |
| G2 | Właściciel zatwierdził projekt P1 po niezależnym przeglądzie | otwarta | Architektura C jest rekomendacją do zatwierdzenia |
| G3 | Migracje, integracja, wspólny raport oraz UI3/UI4/X3 odebrane | otwarta | Pakiety P2a–d/P3 nierozpoczęte |
| G4 | Ukończone zmiany i pełna weryfikacja kandydata przed RC2 | otwarta | Nie utworzono RC2; brak nowego pełnego baseline |
| G5 | Ponowny niezależny audyt nowego RC i odbiór właściciela | otwarta | V1 nie jest gotowe do wydania; deployment wymaga osobnej zgody |

## 4. Kolejność prac

| Kolejność | Pakiet | Status | Zależności | Warunek i uzasadnienie |
|---|---|---|---|---|
| 1 | P0 — ochrona danych i DR | wdrożone | — | Lokalnie 2026-11-03: 24/24 focused, 507/507 pełne, UI 17/17, build i DR PASS; niezależny przegląd kontraktu do odbioru G1 |
| 2 | PT — przywrócenie wiarygodnych testów | w trakcie | P0 | 16 skryptów wykonano lokalnie. Sol sprawdził wzorce R01–R05/R09, w tym fizyczne porównania w Edge. Otwarte pozostają helpery, uzupełnienie T08 i niezależny odbiór |
| 3 | P1 — odbiór kontraktów integracji | nierozpoczęte | P0, PT | Rozstrzyga trwałość, właścicieli i migrację przed zmianą zapisu |
| 4 | P4b — zamknięcie publicznych powierzchni Eko | w trakcie | — | Lokalny katalog i assety builda ograniczono do 01–03; pozostaje przegląd repozytorium, historii i wdrożeń oraz niezależny odbiór. [Weryfikacja](../weryfikacja/WERYFIKACJA_P4B_EKO_DYSTRYBUCJA.md) |
| 5 | P4a — web, telemetria i zależności | nierozpoczęte | — | Po G0; ustala środowisko i bezpieczną bazę builda |
| 6 | P2a — koperta, magazyn i migracje | nierozpoczęte | P0, PT, P1, P4a | Po G2; fundament wspólnej tożsamości, backupu i transakcji |
| 7 | P2b — edytory, bilans i layout | nierozpoczęte | P2a | Wszyscy edytowalni konsumenci kierują zmiany do właściwego właściciela |
| 8 | P2c — wyniki, silniki i warianty | nierozpoczęte | P2a, P2b | Bez przepisywania reguł fizycznych |
| 9 | P2d — wspólny raport | nierozpoczęte | P2c | Po kontraktach wyników; A4, MD i dane z jednej migawki |
| 10 | P3 — UI3/UI4/X3 | nierozpoczęte | P0, PT, P2b, P2c, P2d, P4b | Finalny odbiór zintegrowanego przepływu; makiety/stany można opracować po P1 |
| 11 | P4c — dokumenty i wersjonowanie | nierozpoczęte | P3, P4a, P4b | Końcowa aktualizacja zgodna z rzeczywistym UI, bez zmiany historycznych raportów |
| 12 | P5 — odbiór, RC2 i niezależne audyty | nierozpoczęte | P0, PT, P1, P4b, P4a, P2a, P2b, P2c, P2d, P3, P4c | Po wszystkich poprzednich; brak automatycznego GO |

P4a/P4b można realizować niezależnie od P1 w osobnych zadaniach, ale żaden pakiet nie startuje automatycznie w tym zadaniu. Rozbicie na 12 pozycji wynika z trzech granic wysokiego ryzyka (dane, integracja, wydanie) oraz osobnych odbiorów UI, raportu i dowodów. Sama integracja A-02 ma cztery pakiety wykonawcze; nie tworzyć checkpointu po każdym pliku.

## 5. Specyfikacje pakietów

Wspólne zasady: przed zmianą modułów/zapisu backup z niezależnym sprawdzeniem SHA oraz osobne zabezpieczenie danych przeglądarki; zachowanie RC1 i niezwiązanych zmian; focused test → poprawki → focused test, build/typecheck na granicy pakietu. Pełna regresja domyślnie co trzy pakiety wykonawcze lub wcześniej przy migracji/integracji. Weryfikacja UI/save/reopen tylko dla dotkniętych ścieżek, z osobnym wynikiem. Każdy pakiet zapisuje zakres, SHA, faktyczny model, polecenia i ograniczenia w nowym raporcie `docs/weryfikacja/`, aktualizuje plan, macierz i indeks; historycznych raportów nie przepisuje. Zakończony pakiet ma `plan_progress.mjs` i scoped commit. Push dopiero po sprawdzeniu, że gałąź nie uruchomi nieautoryzowanego wdrożenia przez integrację Git/Vercel.

### P0 — bezpieczne zastępowanie danych i odzyskiwanie

- **Cel / ustalenia:** usunąć S-03, zabezpieczyć S-15, przywrócić dowód BL-01; PLAN 1.7, 5.13, 7.6, 7.12.A1, 7.13, 7.14.
- **Pliki/moduły:** `DemoCatalog.tsx`, `ProjectPackageModal.tsx`, `WorkspaceBackupModal.tsx`, `App.tsx`, `projectPackage.ts`, `workspaceBackup.ts`, `scripts/verify_clean_install.mjs`; testy core i nowe `tests/qa/verify_remediation_data_safety.mjs`.
- **Zależności / wejście:** G0; kopia kodu i syntetyczny profil, bez aktywnego profilu klienta. Pierwszy krok: odtworzyć kliknięcie S-03 w przeglądarce z projektem kontrolnym, stanem dirty i autosave w toku; odnotować sloty przed/po.
- **Implementacja:** jeden kontrolowany przepływ katalog/plik/odtwarzanie/tutorial; katalog przekazuje zweryfikowany plik do potwierdzenia zamiast od razu importować. Sprawdzać zewnętrzny hash katalogu i wewnętrzny hash pakietu. Zatrzymać autosave na czas podglądu, zabezpieczyć także zmiany w RAM, wymagać zapisania/eksportu lub świadomego anulowania edycji. Przed zastąpieniem pełna kopia do pobrania i potwierdzenie jej zachowania; trwała migawka odzyskiwania zweryfikowana przed mutacją albo odmowa. Uwzględnić wszystkie edytory z dirty, także domenowe; tu potrzebny kontrakt przekazywania stanu, bez czekania na nową kopertę. Naprawić atrapę DR dodając wymagane removeItem; nie osłabiać wymagań portu. Regeneracja ręcznego layoutu: ostrzeżenie, podgląd zakresu, anulowanie, Cofnij.
- **Niezmienniki:** błąd/anulowanie/konflikt = bez zmiany aktywnych danych; snapshot localStorage nie reprezentuje niezapisanej pracy; brak skutecznej kopii blokuje import; brak automatycznego reload po częściowym błędzie.
- **Akceptacja:** S-03 zablokowane do zabezpieczenia i świadomego potwierdzenia; poprzednia rodzina odzyskiwalna po reload; stara biblioteka wariantów zachowana zgodnie z kontraktem; BL-01 round-trip kompletnym portem i UI. Komunikat „przekazano do pobrania” nie udaje potwierdzenia zapisu pliku przez system.
- **Testy U/I/E2E:** T01–T06, T20; quota na każdym slocie, rollback, null/removal, konflikt drugiej karty, hash mismatch, pending autosave, cancel, tutorial i stara migracja; S-15 undo/redo/reload. Zaktualizować minimalne selektory potrzebne tym testom, reszta w PT.
- **Ryzyko / wycofanie:** wyścig autosave i utrata RAM; przy regresji wyłączyć bezpośrednią akcję katalogu i pozostawić bezpieczny import z pliku. Nie wracać do niechronionej wersji S-03. Zachować kopie i nie odtwarzać ich nad aktywną pracą automatycznie.
- **Dokumenty / modele:** aktualizacja instrukcji ochrony danych, nowy raport P0, plan/macierz. Analiza Sol; implementacja Sol dla granicy transakcji/dirty, Terra dla modala i Luna dla removeItem w harnessie; niezależna weryfikacja Sol + zewnętrzny Claude Opus dla kontraktu odzyskiwania.

### PT — wykonywalny harness i rzeczywiste asercje

- **Cel / ustalenia:** BL-03/S-02/S-04; PLAN 7.2, 7.9, 7.12.D.
- **Pliki:** 16 skryptów wymienionych w planie testów, wspólne helpery QA, punkty `aria-label`/`data-testid` w aktywnych kontrolkach; `verify_7_9_pilot.mjs`, `verify_7_12d.mjs`.
- **Zależności / wejście:** P0; aktualna mapa działań i wymagany scenariusz bez Eko jako publicznego demo.
- **Zadania:** naprawić selektory bez zmiany oczekiwanych liczb; wybrać jeden utrzymywany helper importu, zachować testy etykiet dostępnych osobno. Usunąć warunkowe pomijanie obowiązkowych kroków. Wymagać faktycznego obliczenia, wyniku i wyboru właściwego wariantu/trybu. Missing control = FAIL, brak środowiska = jawne NOT_VERIFIED, nigdy PASS.
- **Niezmienniki / akceptacja:** test nie oblicza wzorca tym samym kodem, który bada; każdy z 16 plików sklasyfikowany: aktywny, zastąpiony z mapą pokrycia lub wewnętrzny Eko. Pilot failuje dla braku obliczenia, błędnej liczby, ukrytego porównania i braku save/reopen.
- **Testy:** U helperów tylko dla rzeczywistych rozgałęzień; I uruchomienie importu obu ścieżek; E2E T07/T08 i małe testy negatywne pilota (kontrolowane uszkodzenie testowego wyniku, bez zmiany wzorca domeny).
- **Ryzyko / rollback:** fałszywe PASS i nadmierne związanie z DOM; scoped revert helperów z zachowaniem nowych przypadków oraz raportu braków. Nie przywracać twierdzenia, że stary pilot odbiera RC.
- **Dokumenty / modele:** plan testów, mapa test→wymaganie i raport PT; analiza Terra, implementacja Terra (Luna mechaniczna zamiana dopiero po ustaleniu kontraktu), weryfikacja Terra; Sol dla poprawności referencji, zewnętrzny Opus dla niezależnego świadectwa pokrycia pilota.

### P1 — zatwierdzenie architektury, migracji i raportu

- **Cel / ustalenia:** A-02/S-08/S-11 i część S-10; PLAN 7.12.I, 7.10, 2.1/1.7.
- **Pliki:** niniejsze plany; przyszłe kontrakty w `docs/modele/`, specyfikacje API komend/adapterów; prototyp wyłącznie izolowany po G0.
- **Zależności / wejście:** znana ochrona danych i harness; G0. Brak zgody na architekturę blokuje P2, nie zwykłą dokumentację PT/P4.
- **Zadania:** odebrać trzy opcje i wybraną C, macierz własności, rozdział czasów, wersje formatu, ID/konflikty, transakcję IndexedDB, migrację v1/v2, graf unieważniania, definicje KPI i kontrakt raportu. Mały prototyp awarii transakcji i współbieżności w odrębnym magazynie. Spisać decyzje i odrzucone alternatywy.
- **Niezmienniki / akceptacja:** jeden właściciel pola; żadnej ukrytej synchronizacji/zmiany technologii; zaakceptowane schematy wejścia/wyjścia i rollback, brak nierozstrzygniętych kwestii zagrażających danym. Zewnętrzny odbiór architektury oraz akceptacja właściciela tworzą G2.
- **Testy U/I/E2E:** przegląd przykładów konfliktu 4/6 i niezależnych profili czasu, prototyp crash/quota/dwie karty; opis przebiegu T09–T16, bez deklaracji wdrożonego UI.
- **Ryzyko / rollback:** zbyt szeroka wymiana schematów; wrócić do projektu C i zachowanych modeli, zaktualizować decyzję przed zmianą produkcyjnego zapisu.
- **Dokumenty / modele:** architektura, kontrakt formatu/migracji, raport odbioru; analiza Sol, opracowanie specyfikacji Sol (Terra/Luna redakcja), niezależny zewnętrzny Claude Opus, Sol rozstrzyga uwagi. Astra tylko po udokumentowanej nierozwiązanej sprzeczności.

### P4b — Eko poza publiczną dystrybucją

- **Cel / ustalenia:** A-04/S-14; PLAN 7.1, 7.12, 7.13, 7.7.
- **Pliki:** `przyklady/katalog.json`, `scripts/prepare_demo_catalog.mjs`, walidator katalogu, `DemoCatalog.tsx`, tutorial/help/README, konfiguracja build/public; źródła `przyklady/04_eko`, `dane/eko`, `tests/Test Eko*.xlsx`, `tests/qa/Eko_*`, `src/core/models/ekoProject.ts` podlegają inwentaryzacji, bez automatycznego kasowania.
- **Zależności / wejście:** G0, wykaz powierzchni z zakresu wydania; zabezpieczony wewnętrzny komplet fixture z sumami. Przeniesienie lub usunięcie śledzonych danych wymaga osobnej decyzji właściciela.
- **Zadania:** jawna lista dozwolonych pakietów 01–03; generator w stagingu, kontrolowana wymiana wyłącznie wygenerowanego katalogu i odmowa nadmiarowych plików. Sprawdzić pozostałości public/dist, ZIP/JSON/XLSX/PDF/DXF, mapy źródeł, bundlowane fixtures, dokumenty udostępniane w produkcie, release assets i stare deploymenty. Zachować regresję poza produkcyjnymi assetami; test Eko korzysta z wewnętrznej fixture, nie publicznego HTTP.
- **Niezmienniki / akceptacja:** brak Eko w indeksie i zawartości/manifestach publikowanego artefaktu; bezpośrednie stare URL nie zwracają danych; brak importu Eko do runtime bundle; regresja wewnętrzna nadal dostępna. Publiczny Git i stare deploymenty są osobnym zakresem ekspozycji, jawnie nierozwiązanym samą zmianą katalogu.
- **Testy:** U allowlist/nadmiarowy plik; I build czysty i po buildzie ze starym Eko; E2E T21/T22: trzy pakiety i odmowa starych URL, sprawdzenie body/type/status przy SPA fallback; test regresji fixture wewnętrznej.
- **Ryzyko / rollback:** pozostawione pliki/cache i przypadkowe usunięcie fixture; rollback kodu ma utrzymać blokadę dystrybucji Eko, nie przywracać publicznego indeksu. Decyzja o historii Git/retencji/osobnych publicznych archiwach poza automatycznym rollback.
- **Dokumenty / modele:** rejestr powierzchni i praw, macierz Eko public/internal, instrukcja i raport; analiza Terra, implementacja Terra (Luna etykiety/indeks), niezależna weryfikacja Terra i zewnętrzny Opus ocenia kompletność ekspozycji; prawa ocenia właściciel/prawnik, nie LLM.

### P4a — web, zależności, telemetria i aktualizacje

- **Cel / ustalenia:** A-03/BL-02/S-13, część S-07; PLAN 7.6/7.7.
- **Pliki:** `package.json`, lockfile, `vite.config.ts`, `vercel.json`, `src/main.tsx`, `index.html`, launchery/README, `scripts/serve.mjs`, `audit_licenses_and_security.mjs`; polityka sieci i ustawienia projektu Vercel poza Git.
- **Zależności / wejście:** G0, inwentaryzacja zależności/wywołań. Bez wdrożenia produkcyjnego. Ustalić faktyczne Git auto-deploy zanim wykona się push gałęzi implementacyjnej.
- **Zadania:** wybrać wspieraną poprawioną wersję Vite na podstawie nowego audytu i zgodności Node/pluginów (7.3.7 to minimum historycznie wskazane dla BL-02, nie gwarancja na dzień przyszłej instalacji). Sprawdzić źródło/integrity/licencję/advisories SheetJS 0.20.3 i czysty npm ci; nie zamieniać automatycznie na starą paczkę npm. Przyjąć rekomendację: analityka opcjonalna, domyślnie OFF do zatwierdzenia polityki; jeśli włączana, jawny profil produkcyjny, redakcja URL/referrer/eventów i brak nazw/danych projektów. Zaprojektować nagłówki CSP i politykę zasobów dla Vercel, cache HTML/assets, brak dev endpointów i bezpieczne błędy. Opracować informację o pamięci origin, aktualizacji bez reload podczas dirty, backupie i rollbacku kodu/danych.
- **Niezmienniki / akceptacja:** dane projektu nie trafiają do telemetrii; build bez sieci runtime do SheetJS/font CDN; hosting widzi żądania techniczne, więc brak obietnicy „zero transmisji”. Nie deklarować PWA/offline bez testu. Lockfile i skaner z oceną ekspozycji; brak nierozstrzygniętej podatności HIGH/CRITICAL istotnej dla kanału web lub narzędzi użytych do wydania.
- **Testy:** U bramki analytics/redakcji; I npm ci/build/audit i SRI pochodzenia tarballa; E2E T23–T26: sieć z sentinelami, blokada analityki, CSP/workery, aktualizacja A→B i powrót, brak dostępu storage, mobilny odczyt. Nagłówki lokalnego serve nie zastępują sprawdzenia nagłówków hostingu.
- **Ryzyko / rollback:** zmiana bundlera/workera i transgraniczna telemetria; scoped rollback zależności tylko do bezpiecznej wersji, analytics OFF, zachowane aktualne dane. Osobna zgoda na produkcję; preview też wymaga autoryzacji wdrożenia.
- **Dokumenty / modele:** informacja prywatności, matryca sieci, instrukcja web/odzyskiwanie i raport dependency review; analiza Terra dla dystrybucji, Sol dla aktualizacji/trwałości; implementacja Terra, weryfikacja Terra dla deploymentu i Sol dla odzyskania danych; zewnętrzny Opus kluczowy przegląd, ewentualna ocena prawna osobno.

### P2a — magazyn projektu, źródła i migracje

- **Cel / ustalenia:** A-02/S-08, bezpieczeństwo S-03; PLAN 1.5–1.7, 2.1, 7.6/7.12.I.
- **Pliki:** nowe `core/integration/projectEnvelope.ts`, `projectRepository.ts`, `legacyAdapters.ts`; istniejące parsery/migracje, `domainDraftStorage.ts`, `portableArchive.ts`, `projectPackage.ts`, `workspaceBackup.ts`, historia App/DomainDraftPanel.
- **Zależności / wejście:** G2 oraz P0/PT, backup z manifestem i zatwierdzony kontrakt v2; P4a zapewnia docelowy toolchain.
- **Zadania:** wdrożyć transakcyjną kopertę, manifest oryginałów, mapy ID, metadane pochodzenia i expectedRevision. Trójstronny podgląd różnic 4/6, jawne konflikty, nowy magazyn bez nadpisania legacy. Backup/import v1 i v2, odczyt uszkodzeń i recovery po crash, jedna historia między sekcjami; odłączyć stary autosave dopiero po poprawnej aktywacji.
- **Niezmienniki / akceptacja:** brak zgadywania czasu/obsady/dostaw, brak przypisywania pomiarów nieznanym polom; ID/referencje i dokładne oryginały zachowane; wszystkie fixture migracji przechodzą albo odmawiają bez mutacji; żadnego częściowego aktywnego dokumentu.
- **Testy:** U parser/komendy/mapy; I transakcje, konflikty, quota, formaty i wersje; E2E T09–T13, dwa okna/karty, abort w każdym etapie, backup/reopen/eksport i odzyskanie starej pracy.
- **Ryzyko / rollback:** największe ryzyko utraty źródeł i pomieszania rodzin. Wyłączyć aktywację integracji, pozostawić nowy magazyn i eksport v2; wrócić do zachowanej kopii legacy, bez automatycznego downgrade edycji.
- **Dokumenty / modele:** kontrakt zapisu/migracji i instrukcja, raport P2a; analiza i implementacja Sol (Terra izolowane adaptery po kontrakcie), niezależna weryfikacja Sol oraz zewnętrzny Claude Opus. Pełna regresja uzasadniona checkpointem migracji.

### P2b — wspólna edycja, bilans i geometria

- **Cel / ustalenia:** A-01/A-02/S-08/S-15; PLAN 4.x, 5.10/5.13, 7.13.UI3.
- **Pliki:** `App.tsx`, `DataEditors`, `ProcessFlow`, `StationWorkspace`, `DomainDraftPanel`, `Domain*Editor`, `ResourceEditor`, `BalancingBoard`, `LayoutEditor`, `Scene`, `projectCommands.ts`, adaptery `derive` i bilansu.
- **Zależności / wejście:** P2a; zatwierdzona lista właścicieli pól i mapa istniejących akcji. UI starych dokumentów pozostaje czytelne do migracji.
- **Zadania:** kierować wszystkie wspólne operacje do komend; powiązać tabelę/diagram/inspektor przez stabilne ID; zachować edycję BOM/popytu/profili/kompetencji/kalendarzy. Dwie metody bilansu z jawną podstawą czasu. Propozycje nowych stanowisk nie stają się zasobami fizycznymi bez uzgodnienia. CAD zapisuje tylko geometrię/powiązania, nie możliwości technologiczne; wspólne undo/redo i ochrona ręcznej geometrii.
- **Niezmienniki / akceptacja:** żadnego edytowalnego obejścia repozytorium; jedna zmiana operacji widoczna we wszystkich właściwych widokach bez ręcznej kopii 4→6; brak utraty profili przy imporcie procesu; zależne usunięcia blokowane do rozstrzygnięcia.
- **Testy:** U komendy i adaptery; I import→edycja→bilans→layout i referencje; E2E T14/U01–U05, te same dane/wyniki, filtr/anulowanie/undo/reload, import niepoprawny i usuwanie użytej operacji.
- **Ryzyko / rollback:** stary komponent może nadal używać setRaw/localStorage; feature gate wyłącza edycję niepodłączonego widoku, zachowuje dane i odczyt. Scoped revert komend z kopiami nowego formatu.
- **Dokumenty / modele:** instrukcja danych/CAD, macierz akcji i raport; analiza Sol dla granic, implementacja Terra, Sol dla mapowania bilansu/tożsamości; niezależna weryfikacja Sol, Terra dla wykonania UI.

### P2c — silniki, aktualność i warianty

- **Cel / ustalenia:** A-02/S-08/S-10; PLAN 3.x, 4.5/4.6, 7.3–7.5, 7.12.I.
- **Pliki:** nowe `resultRegistry.ts`, adaptery silników; `Simulation.tsx`, `DomainWorkerSchedulePanel`, `SimulationWorkspace`, workery, `domainVariantComparison.ts`, `DomainVariantComparisonPanel`, `DomainStochasticSimulationPanel`, odczyt animacji.
- **Zależności / wejście:** P2a/b, zatwierdzone fingerprinty i definicje trybów. Wzorce ręczne odseparowane od silnika.
- **Zadania:** trzy rodzaje wyniku, graf zależności i odrzucanie spóźnionych komunikatów; snapshoty wariantów całej rodziny, wspólne warunki eksperymentu; zamrożenie danych run/seed/obsady/kalendarzy. Obliczenia zużywają projekcje, playback wyłącznie wynik. Zachować wszystkie guardy C2 i rozdzielić trwałe reguły od limitów implementacji.
- **Niezmienniki / akceptacja:** bez podwójnej rezerwacji zasobów/dwóch lokalizacji; zgodność referencji liczbowych; JIT jawny i OFF; brak użycia stale result; zmiana wyglądu/animacji nie zmienia wyniku. Żadnego automatycznego uproszczenia po odmowie fizyki.
- **Testy:** U hashe/stan result; I worker race, snapshot, zmiana profilu/stanu, porównanie trybów, C2 residuals/zero/held workers; E2E T15–T18 i T27. Pełna regresja w checkpoint integracji, focused przed nią.
- **Ryzyko / rollback:** pozornie aktualne KPI lub zmiana kolejności zdarzeń; wyłączyć użycie nowych wyników, wrócić do wersjonowanych adapterów i zachować snapshoty. Nie poprawiać referencji do nowego rezultatu bez niezależnego dowodu domenowego.
- **Dokumenty / modele:** macierz kombinacji i raport aktualności/wariantów; analiza i implementacja Sol, Terra UI po kontrakcie; niezależna weryfikacja Sol i zewnętrzny Claude Opus (02.3B niezależnie od 02.3A).

### P2d — wspólny raport inżynierski

- **Cel / ustalenia:** A-02/S-08/S-11; PLAN 7.10, 4.6, UI4.
- **Pliki:** nowe `core/integration/engineeringReport.ts`; `EngineeringReportView.tsx/.css`, `project.ts:engineeringReport`, raporty domenowe/eksport, `reportCapacity.ts`.
- **Zależności / wejście:** P2c, przyjęte definicje KPI i horyzontów; kontrakt raportu z architektury.
- **Zadania:** jeden model raportu z rewizją i wynikami właściwego wariantu; wszystkie sekcje procesu/BOM/taktu/layoutu/symulacji/przepustowości/zasobów/wariantów/ograniczeń; status braku i kwalifikacja pól; A4/PDF przez druk, MD i dane z tej samej migawki. Usunąć mylący zielony globalny sukces; podpisy tylko rzeczywiste/puste pola.
- **Niezmienniki / akceptacja:** brak obcych lub nieaktualnych wyników; brak danych ≠ zero; metryka i liczby zgodne we wszystkich formatach; grafika layoutu tego samego wariantu; brak deklaracji norm/BHP/CE bez dowodu.
- **Testy:** U składanie raportu/dobór rewizji, I niezależny oracle danych i formatów; E2E T19: raport syntetyczny/mieszany/niekompletny, po zmianie danych, dwa warianty i PDF wielostronicowy z oględzinami tabel/stron.
- **Ryzyko / rollback:** mieszanie mianowników i starego report renderer; udostępnić wersjonowany raport roboczy z jawnymi brakami, bez oznaczania kompletnego V1; zachować snapshoty.
- **Dokumenty / modele:** specyfikacja raportu, instrukcja, raport odbioru; analiza Sol, implementacja Terra (Sol agregacja/mianowniki), niezależna weryfikacja Sol + zewnętrzny Opus dla znaczenia inżynierskiego; Terra weryfikacja druku/UI.

### P3 — zakończenie UI3, UI4 i X3

- **Cel / ustalenia:** A-01/S-01/S-09/S-15/S-17, reszty UI1/UI2; PLAN 7.13.X/U, 7.14/7.9.
- **Pliki:** `AppShell`, `uiNavigation.ts`, `App.tsx`, aktywne komponenty studio/raportu, CSS, tutorial i testy QA; materiał referencyjny w `design/` po sprawdzeniu przenośności i praw. S-16: najpierw mapa entrypointów, usuwanie martwego kodu tylko gdy potrzebne w tym zakresie, bez masowego cleanup.
- **Zależności / wejście:** P2b–d i P0, PT; zatwierdzony kontrakt źródeł, mapa działań/stany na trzech szerokościach. Przygotowanie projektów UI może zacząć się po P1.
- **Zadania:** trzy ekrany danych/procesu/bilansu, powiązana selekcja, podwidoki zaawansowane, pulpit i raporty; jeden język użytkowy bez wersji schematów w głównej ścieżce. Komunikaty buforów/3D/reguł C2 odpowiadają aktywnemu trybowi. Zamknięcie braków UI2: gesty wskaźnika, popout i brak WebGL; tutorial wskazuje rzeczywiste kontrolki bez automatycznego zaliczania działań.
- **Niezmienniki / akceptacja:** U01–U12 z mierzalnym odbiorem; brak utraty edycji przez filtr/panel/zmianę widoku; pełna ścieżka jednego wariantu i raportu, czytelny stale/error; klawiatura i nowicjusz w P5.
- **Testy:** U nawigacja/stan kontrolek; I historia i zdarzenia playback bez dublowania; E2E T20/U01–U12: 1440×900, 1280×720, 390×844, zoom 200%, focus/Escape, przeciąganie, popout, wymuszony brak WebGL i save/reload.
- **Ryzyko / rollback:** kosmetyczne przykrycie rozdzielnych źródeł lub zgubienie akcji; scoped przywrócenie komponentu z zachowaniem nowego repozytorium, bez powrotu do niechronionego importu.
- **Dokumenty / modele:** plan UI, mapa akcji i ograniczeń, instrukcja MD/HTML/PDF/screenshoty, raport P3; analiza Terra, implementacja Terra (Luna teksty/CSS), niezależna weryfikacja Terra; Sol tylko tożsamość/stan/wyniki, zewnętrzny Opus odbiór kluczowego przepływu.

### P4c — spójne dokumenty i oznaczenie wydania

- **Cel / ustalenia:** S-05–S-07/S-12/S-17/S-18; A-03; PLAN 7.8/7.9.
- **Pliki:** `PLAN_ROZWOJU.md`, `docs/README.md`, `FUNKCJE_PROGRAMU.md`, nowy `docs/historia/ZMIANY_v1.0.0.md`, podręcznik i pochodne, README/launchery, `package.json`, lockfile, `index.html`, źródło APP_VERSION i metryki builda.
- **Zależności / wejście:** odebrane funkcje i P3/P4a/b; faktyczny zakres ograniczeń i wyniki testów. Aktualizacje instrukcji wykonuje się również w każdym wcześniejszym pakiecie; P4c konsoliduje wydanie.
- **Zadania:** jedna generowana wersja aplikacji, oddzielna od schematów/pakietów; w rozwoju `1.0.0-rc.N`, finalne `1.0.0` dopiero przy wydaniu. Nie używać nazwy prerelease jako deklaracji utworzenia RC2. Aktualny opis i errata do starych deklaracji bez edycji historycznego raportu 7.9; tutorial tekstowy, C2 i wersje pakietów. Historyczne liczby modułów nie są metryką produktu ani kryterium jakości.
- **Niezmienniki / akceptacja:** backup appVersion nowego wydania nadal odtwarza stary format; wersja build/UI/HTML/pakietu zgodna; brak obietnic ISO/BHP/GLB importu/offline/0 podatności bez pokrycia. Wszystkie lokalne odnośniki poprawne; wygenerowane PDF/HTML odpowiadają źródłu.
- **Testy:** U/I metadane i zgodność 0.4.0→nowa wersja, validator dokumentacji; E2E T19/T25: wersja/raport/backup, druk i instrukcja odczytane wizualnie. Dokumentacja bez testów całej symulacji, jeśli kod metadanych jej nie dotyka.
- **Ryzyko / rollback:** podmiana numeru schematu zamiast wersji aplikacji; wrócić do poprzednich metadanych z zachowaniem formatów, errata pozostaje jako aktualny dowód.
- **Dokumenty / modele:** wymienione wyżej i raport P4c; analiza Terra, implementacja Luna dla tekstu/metadanych, Terra generacja/łączenie; niezależna weryfikacja Terra, Sol jedynie zgodność backupu/migracji; zewnętrzny Opus odbiór twierdzeń wydania.

### P5 — regresja, pilot użytkownika i nowy RC

- **Cel / ustalenia:** cała macierz BL/S i bramki audit_plan; PLAN 7.2/7.9/7.11/7.12.D/X3.
- **Pliki:** zestawy testów i QA, niezależne referencje, CI/artefakty release jeśli zostaną dodane; nowe raporty weryfikacji i audytów. Kod zmieniać wyłącznie w osobnych scoped poprawkach wynikających z odtworzonego błędu.
- **Zależności / wejście:** wszystkie pakiety odebrane, brak otwartych blokad danych/architektury; test plan z oracle i macierzą środowisk. Nie tworzyć RC2 przed tym stanem.
- **Zadania:** pełny baseline test/build/DR/audit/docs, wszystkie wymagane osobne QA (domyślne npm test ich nie obejmuje), migracje i sieć/asset audit; pełny pilot z początkującym. Następnie zamrozić nowy SHA i utworzyć RC2 zgodnie z decyzją właściciela, ponowić kontrolę artefaktu tego SHA, audyty niezależne 02/03 i konsolidację. 03.1/03.2 i 02.3A/B bez wzajemnego czytania raportów przed zakończeniem.
- **Niezmienniki / akceptacja:** [plan testów](PLAN_TESTOW_RC2.md) spełniony, każda pozycja macierzy ma dowód i brak nierozstrzygniętych blokad; brakujący sprzęt/prawnik/użytkownik pozostawia odpowiednią bramkę otwartą. GO wyłącznie właściciel po ponownym audycie.
- **Testy:** T01–T28 i U01–U12, pełna suita, osobne core geometrii/equipment i QA; produkcyjne testy web dopiero po osobnej zgodzie. Niezgodności wyników wracają do właściwego pakietu, bez korygowania wzorców na ślepo.
- **Ryzyko / rollback:** włączenie zmian po audycie unieważnia odpowiednie dowody; nowy poprawkowy SHA i ponowna weryfikacja. RC1 pozostaje nieruchomy. Rollback produktu obejmuje kod i zgodność danych, bez resetu przeglądarki klienta.
- **Dokumenty / modele:** nowy baseline/evidence/readiness z metryką SHA, raport pilota i nowe audyty; analiza Sol, wykonanie rutynowych testów Terra, mechaniczna konsolidacja Luna, niezależny zewnętrzny Claude Opus oraz oddzielny Sol dla domeny/symulacji. Astra wyłącznie udokumentowana eskalacja sporu nierozwiązanego przez Sol.

## 6. Model LLM — mapa zbiorcza

| Pakiet | Ocena/analiza | Implementacja | Niezależna weryfikacja |
|---|---|---|---|
| P0 | Sol | Sol granice danych; Terra UI; Luna harness | Sol + Opus kontrakt |
| PT | Terra | Terra / Luna mechaniczne selektory | Terra; Sol referencje |
| P1 | Sol | Sol specyfikacja | Zewnętrzny Opus + właściciel |
| P4b | Terra | Terra / Luna katalog | Terra + Opus powierzchnie |
| P4a | Terra; Sol aktualizacje danych | Terra | Terra + Sol recovery; Opus przegląd |
| P2a | Sol | Sol / Terra adaptery | Sol + zewnętrzny Opus |
| P2b | Sol kontrakty | Terra; Sol tożsamość/bilans | Sol + Terra UI |
| P2c | Sol | Sol; Terra UI | Sol + zewnętrzny Opus niezależnie |
| P2d | Sol znaczenie wyników | Terra; Sol KPI | Sol/Opus merytorycznie; Terra druk |
| P3 | Terra | Terra / Luna teksty i CSS | Terra; Sol stan; Opus odbiór |
| P4c | Terra | Luna / Terra | Terra; Sol backup |
| P5 | Sol | Terra wykonania; Luna indeks | Opus i oddzielny Sol |

Są to rekomendacje. Nie oznaczają wykonanej zmiany modelu ani uruchomienia zewnętrznego audytora. Użytkownik przełącza model ręcznie; przed pakietem wymagającym zmiany zastosować AGENTS. Następny znany pakiet **P0: ocena Sol, implementacja granic danych Sol z wydzielonym UI Terra, niezależna weryfikacja Sol/Opus**.

## 7. Ryzyka krytyczne i decyzje pozostające techniczne

| Ryzyko | Ograniczenie i bramka |
|---|---|
| Nadpisanie pracy zapisanej lub w RAM | P0 pierwsze, wspólna ochrona dirty/autosave, trwałe odzyskanie i test reload |
| Połączenie dwóch rozbieżnych rodzin 4/6 | P1/P2a: baza/original hash + diff po ID, brak automatycznego zwycięzcy |
| Milcząca zmiana czasu/zdolności | Osobny standard/profil/obsada; wygląd nie tworzy technologii; porównanie wyników adapterów |
| Wynik z innej rewizji lub silnika | P2c/P2d: fingerprint, requestId, rodzaj wyniku i immutable report |
| Niepełne E2E mimo PASS | PT/P5: obligatoryjne asercje, niezależny oracle, użytkownik, brak if-skip |
| Dane Eko już publiczne | P4b: brak nowych assetów; lista historycznych powierzchni, osobna decyzja o historii/retencji, bez force push |
| Push powodujący deployment Vercel | Sprawdzić Git integration/preview/production branch i ignorowanie gałęzi. Jeśli nie można dowieść braku deploya, pozostawić lokalny commit do czasu ustawienia blokady lub osobnej zgody |
| Telemetria/prywatność i dostawcy | OFF jako proponowany domyślny profil; pomiar sieci i informacja użytkownika; prawnik ocenia podstawę, role, transfery i zgody |
| „100% planu” mylone z gotowością | Przywrócić aktualne statusy dotkniętych głównych ID, zachować historyczne odbiory; osobny rejestr bramek V1 |

Wymagane zatwierdzenia techniczne w P1 są konkretnie opisane w architekturze. Decyzje biznesowe nie są ponownie otwierane: UI w V1, integracja i wspólny raport, web V1.0.0, Eko poza publicznym produktem. Pilot z człowiekiem pozostaje wymaganiem istniejącego planu; nie przyjmujemy jego zniesienia bez nowej decyzji.

## 8. Rezultat tego zadania i pierwszy krok

Powstały: niniejszy plan, [architektura](ARCHITEKTURA_INTEGRACJI_MODELI_V1.md), [zakres V1](ZAKRES_WYDANIA_V1_0_0.md), [macierz ustaleń](MACIERZ_AUDYT_REMEDIACJA.md), [plan testów RC2](PLAN_TESTOW_RC2.md), odnośniki w indeksie i aktualny wpis w głównym planie. Dowód API S-03 pozostaje w outputs/qa.

**Pierwszy pakiet po zatwierdzeniu planu: P0 — przeglądarkowa reprodukcja S-03, następnie zabezpieczenie wczytywania i odzyskiwania.** Zakończenie planowania nie upoważnia do rozpoczęcia P0. Nie wykonano zmian funkcjonalnych, aktualizacji zależności ani publikacji produktu.

### Weryfikacja dokumentów przy pierwszym odbiorze planowania — 2026-11-01

- `node scripts/verify_documentation.mjs`: PASS, 136 dokumentów, 103 lokalne odnośniki, bez nowych raportów w katalogu głównym.
- `node scripts/plan_progress.mjs`: cały plan 61/72 = 84,7%, pierwsze wydanie 61/68 = 89,7%, Etap 7 7/14 = 50,0%. Ponownie otwarto siedem głównych ID; podpakiety nie zwiększają mianownika.
- Kontrola kompletności: 12 unikalnych pakietów, 21 wierszy BL/S, 28 scenariuszy T i 12 kryteriów U; wynik w `outputs/qa/plan_remediacji_rc1/planning_checks.json`. To kontrola dokumentacji, nie wykonanie tych 40 testów.
- `git diff --check`: PASS; RC1 i sumy trzech raportów wejściowych niezmienione; brak różnic funkcjonalnych w src/scripts/tests/public i konfiguracji. Bieżące testy aplikacji/build/UI nie były uruchamiane; wykonano wyłącznie opisany test reprodukcji API oraz kontrole planowania.
- Brak dowodu, że push nowej gałęzi nie uruchomi automatycznego Vercel preview/deploy. Zgodnie z zakazem automatycznego wdrożenia pakiet można zachować lokalnym commitem; publikacja gałęzi wymaga najpierw potwierdzonej blokady integracji lub osobnej zgody na wywołane wdrożenie.

### Odbiór aktualizacji procedury — 2026-11-02

Fetch origin i reweryfikacja RC1→main: ten sam SHA i całe drzewo, bez poprawek w main. Gałąź `codex/v1-audit-remediation` ma zweryfikowaną bazę main i zachowuje istniejący plan/monitor. Zmieniono pięć planów, procedurę audytu, główny rejestr i indeks; odświeżono wyłącznie pochodne dane monitora, bez zmian jego logiki. Zakres i kolejność 12 pakietów oraz rekomendacja C pozostają bez zmian.

Wykonano `verify_documentation` (PASS: 137 dokumentów, 107 lokalnych odnośników), `plan_progress` (61/72 = 84,7%; V1 61/68 = 89,7%) i focused testy odczytu źródeł monitora (7/7 PASS). Log: `outputs/qa/plan_remediacji_rc1/monitor_source_check_20261102.txt`; dowód wersji i plików: `reconciliation_main_20261102.json` w tym samym katalogu. Nie wykonano nowego baseline produktu, UI produktu, skanu podatności ani deploymentu. P0 i RC2 nadal nierozpoczęte; następny pakiet wymaga zatwierdzenia planu oraz ponownej kontroli aktualności main.
