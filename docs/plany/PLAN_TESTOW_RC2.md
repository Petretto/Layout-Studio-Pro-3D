# Plan testów RC2

Data: 2026-11-01. Status: **projekt testów; RC2 nie istnieje i nie jest tworzony w tym zadaniu**. Baza porównawcza RC1: `6aa84d8129b7f7cc4d92c3c00b4d8a99a255d3eb`.

Powiązania: [pakiety](PLAN_REMEDIACJI_PO_AUDYCIE_RC1.md), [architektura](ARCHITEKTURA_INTEGRACJI_MODELI_V1.md), [zakres i ograniczenia](ZAKRES_WYDANIA_V1_0_0.md), [ustalenia](MACIERZ_AUDYT_REMEDIACJA.md).

## 1. Metoda, środowisko i niezależność

Testować w izolowanym checkout/profilu z syntetycznymi projektami. Nigdy nie otwierać aktywnego profilu klienta, nie czyścić jego localStorage/IndexedDB i nie przenosić klientowskich plików do logów. Zewnętrzne środowisko audytora zapisuje dokładny SHA, wersję modelu, OS/Node/npm/przeglądarki, polecenia, stdout/stderr, exit code, sumy fixture i artefaktów. Wyniki: PASS, FAIL, NOT_VERIFIED, NOT_APPLICABLE z przyczyną; brak asercji lub warunkowo pominięty obowiązek nie daje PASS.

| Środowisko | Wymagany zakres | Uwagi |
|---|---|---|
| Windows, aktualny wspierany Edge i Chrome | Pełna ścieżka, pliki, klawiatura/wskaźnik, WebGL, popout, druk, odzyskiwanie | Dokładne wersje i GPU w raporcie, nie przenosić numeru Edge z historycznego audytu |
| Czyste środowisko Node zgodne z engines, plus faktyczny build hostingu | npm ci, test/build/DR/audit, formaty i manifesty | Wersja Node/npm/lock i pochodzenie SheetJS ustalone w P4a; poprzedni 403 raportować jawnie |
| Rozmiary 1440×900, 1280×720, 390×844 i zoom 200% | UI3/UI4/X3; 2D/3D desktop i odczyt/inspekcja małego ekranu | Emulacja wymiarów nie zastępuje testu dotyku na rzeczywistym urządzeniu |
| Drugie rzeczywiste urządzenie/profil; telefon Chrome do deklarowanego odczytu mobilnego | Otworzenie web, import/eksport w obsługiwanym zakresie, brak utraty stanu, focus/touch | Przy braku urządzenia NOT_VERIFIED i brak odbioru odpowiedniej obietnicy; zakres wsparcia zawęzić jawnie przed wydaniem, bez ukrywania braku |
| Bez WebGL, bez storage/quota, bez internetu po załadowaniu, z blokadą telemetry SDK | Kontrolowana degradacja, komunikaty i odzyskanie | Nie deklarować PWA/pełnego offline z testu po załadowaniu |
| Ten sam origin, stara i nowa wersja, dwie karty | Migracje/aktualizacja/rollback i konflikty | Osobne konta/profil syntetyczny; produkcyjne wdrożenie wymaga odrębnej zgody |

Najmniejsze testy najpierw: `node scripts/test.mjs --suite=core|network --test-name-pattern=...` według nazw faktycznie dodanych przypadków. Po trzech pakietach pełny test, wcześniej przy P2a (migracja) i P2c (integracja). W P5 pełny baseline i wszystkie wymagane osobne QA. Nie uruchamiać pełnej suity w pętli po każdej zmianie dokumentu. Build zawiera tsc; dodatkowy typecheck tylko gdy potrzebny do lokalizacji błędu.

Oracle: istniejące ręczne obliczenia w `przyklady/01..03/referencje/obliczenia.md` i `oczekiwane_wyniki.json`, niezależny rachunek małych fixture oraz audytor domenowy. Test adaptera może porównać stary i nowy silnik dla regresji, ale to nie jest niezależny dowód poprawności samych silników. Expected nie powstaje przez wywołanie funkcji testowanej. Zmiana wzorca wymaga osobnej analizy zdarzeń, danych i kontraktu oraz akceptacji; nie dopasowywać liczb do wyniku.

Dowody w `outputs/qa/remediacja_rc2/<pakiet>/<run-id>/`: metryka, log, asercje JSON, manifest plików i ich hash, screeny, pobrania, dla sieci zredagowany HAR. Dokument odbioru w `docs/weryfikacja/`, indeks w docs/README. Zdjęcie obecności przycisku nie dowodzi obliczenia, save/reload ani zgodności liczb.

## 2. Scenariusze referencyjne

| Ref | Wejście i warunki | Oczekiwane / źródło |
|---|---|---|
| R01 — podstawowy 01 | Trzy sztuki, odstęp 1 s, domenowy JIT, BASIC-BASE / BASIC-CONSOLIDATED | Makespan **170 / 190 s**; ukończenia [90,130,170] / [90,140,190]; takt klienta/cel 60 s; work content 90 s, VA75/NVA15, BOM25 PLN/szt. Odczytane referencje pakietu 01 |
| R02 — wózek 02, fizyczny | Trzy sztuki, odstęp 1 s, JIT OFF, wariant bazowy i zbilansowany, jawny transport/bufory/7 zapasów | **460 / 385 s**; wzorzec fizyczny w referencjach pakietu 02 i 7.12.D. Dodatkowo jawny case dostawy w 900 s i blokady zgodnie z plikiem źródłowym, bez dopowiadania stanów |
| R03 — wózek 02, JIT | Trzy sztuki, odstęp 1 s, JIT ON, oba warianty | **390 / 315 s**; nie traktować jako fizycznej przepustowości. Dokładne okna/ukończenia z ręcznej referencji |
| R04 — moduł 03, fizyczny | Trzy sztuki, odstęp **1000 s**, JIT OFF, dwie gałęzie i body spine, warunki pakietu C2 v1.2.0 | **2210 / 2180 s**. To próba izolacji strumieni/dostaw, nie benchmark przepustowości przy spiętrzeniu |
| R05 — moduł 03, JIT | Trzy sztuki, odstęp 1 s, JIT ON, baza/usprawniony | **320 / 270 s**; MERGE po gotowości wszystkich wymaganych poprzedników, zgodne z referencją pakietu |
| R06 — małe fixture C2 | Partie 5 szt., input capacity 5 i 4; pobranie 3; niezależne limity dwóch podzespołów, copy=null i różne kopie | Zajętość w sztukach, reszta 2 widoczna/zajmuje limit, brak drugiego zużycia; brak wspólnej puli dla podzespołów. Zdarzenia rozpisane ręcznie |
| R07 — guardy i zasoby | Shared workers, dwa wózki i sekwencyjne approach, held-worker output, zero/direct, local continuation, deadlock | Rozłączne rezerwacje i jedna lokalizacja; rzeczywiste release/arrive=start, chronione przyszłe commitments; odrzucenia z macierzy zakresu |
| R08 — migracje/ochrona | Legacy bez wersji, v4, v5 i pełny v6 z wariantami; zgodna rodzina, rozbieżny 4/6, obca rodzina, corrupt/unknown format | Mapy ID, dokładne bajty i źródła zachowane albo odmowa bez zapisu. Nie są danymi klienta |
| R09 — Eko internal | Istniejące testy Eko/importy zachowane jako wewnętrzny regresyjny zbiór | Dotychczasowe jawne wzorce niezmienione, uruchamiane bez publicznego katalogu. Nie służy jako publiczna bramka UX ani dowód wydajności rzeczywistego zakładu |

Dla R01–R05 dokładne dane maszynowe porównywać z tolerancją zapisaną w danej referencji (w odczytanych referencjach JIT `1e-9 s`); wynik UI sprawdzać w jednostce i precyzji, którą faktycznie pokazuje, oraz porównać pobrany wynik maszynowy. Nie wymagać dziesięciu miejsc w zaokrąglonej etykiecie. Przepustowość/horyzont i statyczne capacity/hour sprawdzać jako oddzielne wielkości, bez utożsamiania `3600/cykl` z `jobs/makespan`.

## 3. Macierz testów T01–T28

U = jednostkowe, I = integracyjne, E = rzeczywiste UI/E2E. Przypadki obowiązkowe nie są uzależniane od `if(buttonExists)`.

| ID / poziom | Wejście, działanie i wymagany wynik | Oracle i dowód | Pakiet / ustalenia |
|---|---|---|---|
| T01 U/I/E — S-03 przed naprawą | Syntetyczny projekt „praca przed importem”, odrębne dane 4/6/variants i zmiana w RAM; klik katalogu. Najpierw zapisać rzeczywiste niechronione zastąpienie lub rozbieżność z hipotezą, bez naprawy expected | Sloty przed/po + stan RAM, przeładowanie, nagranie/asercje. Obecny API repro potwierdza brak trwałej kopii, UI nadal otwarte | P0 / S-03 |
| T02 U/I/E — ochrona importu | Katalog i plik: brak zabezpieczenia→brak mutacji; kopia/potwierdzenie→kontrolowana zmiana; cancel/close/error i dirty→zachowanie poprzedniej pracy; odtworzenie kopii po reload | Dokładne raw/hashes slotów i pól RAM, pobrany backup odczytany i porównany; brak automatycznego uznania pobrania za zapis | P0 / S-03, A-02 |
| T03 U/I/E — integralność i konflikty | Zmieniony byte katalogowego JSON, poprawny wewnętrzny hash ale niezgodny z katalogiem, uszkodzony wewnętrzny hash, obca rodzina, zmiana pamięci po snapshot, pending autosave/dwie karty | Odmowa przed mutacją, wskazany powód, nowa kopia wymagana po konflikcie; brak reload w połowie błędu | P0/P2a / S-03 |
| T04 U/I — BL-01 | Port bez removeItem nadal odmawia zmieniającego restore; kompletny port odtwarza fixture, również null/removal i zachowanie biblioteki zgodnie z kontraktem | Snapshot before/after oraz checksum, verify:clean exit0 po poprawce harnessu; brak osłabienia API | P0 / BL-01 |
| T05 U/I — błędy zapisu | Wstrzyknąć set/remove/get failure na każdym zmienianym slocie, quota przy kopii, błąd rollback; w nowym magazynie abort każdego etapu transakcji | Cały poprzedni stan lub recovery lock z kompletną kopią i jednoznacznym komunikatem; brak „success” po częściowym zapisie | P0/P2a / BL-01, S-03 |
| T06 E — DR/tutorial | Kopia całej rodziny→nowy profil→restore→reopen→eksport; tutorial start/exit/restart/resume z dirty i autosave oraz przerwanie wczytania | Dane/ID/variants identyczne; oryginały pobieralne; tutorial nie porzuca RAM ani nie nadpisuje innej pracy przy wznowieniu | P0/P3 / BL-01, S-03 |
| T07 I/E — selektory | Każdy z 16 skryptów ma decyzję utrzymany/zastąpiony/internal; aktywne ścieżki wykonują bezpieczny import i poprawne akcje | Lista skryptów i log wykonania, brak starych selektorów w aktywnym harnessie; test widocznych nazw osobno od data-testid | PT / BL-03, S-02 |
| T08 I/E — siła pilota | Harmonogram uruchomiony, wynik odczytany, porównanie obowiązkowe, CAD zmieniony i cofnięty; w kontrolowanej próbie brak wyniku lub zła liczba powoduje FAIL | R01–R05 i test negatywny harnessu; brak opcjonalnego pomijania; obecność przycisku/screenshot niewystarczająca | PT/P5 / S-04 |
| T09 U/I/E — podstawowe migracje | R08 v4→mapa5→envelope, v5 z ST-ID, v6 z pełną logistyką/qualifications; preview/cancel/confirm, reload | ID i referencje/pola porównane z fixture, legacy/original raw bajtowo zachowane, brak dorobionych zasobów/profili | P2a / A-02, S-08 |
| T10 U/I/E — rozbieżności | Ten sam projectId, różne dane 4 i 6 względem oryginału; konflikt czasu, przypisania, BOM/geometrii; brak bazy i obce IDs | Jawny diff per pole, wybór/oddzielne gałęzie lub odmowa; nie wolno wygrać przez latest updatedAt ani nazwę. Export obu źródeł możliwy | P2a / S-08 |
| T11 U/I/E — formaty i rollback | Zwykły JSON/portable4/5, draft6, variants, package1, backup1→v2; nowy pełny eksport/import; appVersion 0.4.0 i nowe; unknown format/schema | Format+checksum, raw/IDs, round-trip; stary czytnik jawnie odmawia v2, bez cichego strip pól. Cofnięcie kodu zachowuje nowy magazyn i kopię | P2a/P4c / S-07, E-09 |
| T12 U/I/E — kwalifikacja | Pole legacy bez basis, synthetic/mixed package i istniejące measured/assumed profile; uzupełnianie źródeł i cofnięcie | Unknown nie zmienia się w measured; package user nie promuje pól; kompletność osobno od weryfikacji. Te same etykiety w edycji i raporcie | P2a/d / S-11 |
| T13 U/I/E — tożsamość i historia | Zmiana nazwy/reorder, usunięcie użytej operacji/stanowiska/pracownika/wyposażenia; undo/redo między sekcjami, reload i druga karta | Stabilne ID/mapy; usuwanie referencji zablokowane do jawnego uzgodnienia, brak częściowego commit; druga karta nie nadpisuje expectedRevision | P2a/b / A-02 |
| T14 U/I/E — spójna edycja | Import procesu/BOM→zmiana operacji→dwa bilanse→layout→edycja domenowa→save/reopen; zmiana standardu przy odrębnym profilu obsady | Wszędzie ta sama rewizja; standard i profil nie są potajemnie zrównane; propozycja przydziału nie tworzy wyposażenia/dostaw. Identyczne wejścia dają te same dotychczasowe wyniki | P2b / UI3, S-08 |
| T15 U/I/E — aktualność | Uruchom A, zmień dane na B, opóźnij worker A; zmień po kolei DAG, profile, worker/calendar, materiały, transport, popyt, koszty i pochodzenie | Graf zależności z architektury, requestId/fingerprint. A nie podmienia B; stale w UI/raporcie; nieistotna zmiana UI nie uruchamia obliczeń | P2c/d / A-02.7 |
| T16 U/I/E — warianty | Migawka pełnych danych, modyfikacja kandydata, zmiana bazy po obliczeniu, restore i rename, porównanie z innym trybem/warunkami | Baza niezmienna, fingerprinty i diff czynników; nieporównywalne warunki jawne, brak kosztów przy brakujących stawkach; biblioteki nie mieszają rodzin | P2c / S-08 |
| T17 U/I/E — wartości referencyjne | R01–R05 w obu wariantach, faktyczny worker, tabela/eksport i odtworzenie po reopen | Ręczne referencje i dokładne warunki; makespan, completion/operation windows, ograniczenia transportu/materiału i jednostki. Nie tylko etykieta wyniku | P2c/PT/P5 / E-03, S-04 |
| T18 U/I/E — niezmienniki i odmowy | R06/R07 oraz każdy wiersz macierzy ograniczeń; dodatnie/zero body/subassembly, held crew/mixed policy, direct/residual, lokalny handoff i realny deadlock | Niezależny ślad zdarzeń; conservation części, brak double-booking, cel zarezerwowany przed depart, same-copy bez ruchu, arrival=start. 0+0 remote i wiele direct lots jawnie odrzucone. Partial presence/variable routing/changeover/direct parallel w ograniczonym graph również odmawiają | P2c/P3/P5 / S-09/S-10 |
| T19 U/I/E — raport | R01 i R04 oraz niekompletny/mixed projekt, dwa warianty, wynik stale/deadlock; A4→PDF, MD i dane | Jeden report snapshot/revision, sekcje A-02 obecne, te same liczby i źródła, brak danych nazwany, horyzont/mianowniki jawne. PDF krótki/długi obejrzany strona po stronie; brak obcięć/tabel poza stroną | P2d/P4c / S-08/S-11/S-12 |
| T20 I/E — UI i ochrona layoutu | Wszystkie U01–U12, ręczne pozycje i regeneracja oboma wejściami, cancel/confirm/undo/redo/reload, pointer drag/locked/popout | BoundingClientRect rzeczywistego viewport, stany i akcje dostępne, jedna historia, niezmienione wyniki po stylowaniu i wyglądzie | P0/P2b/P3 / S-01/S-15/S-17 |
| T21 U/I/E — nowa dystrybucja bez Eko | Czysty build i build po wcześniej wygenerowanym 04_eko; celowo podrzucony stary plik w wygenerowanym katalogu, porównanie manifestu i UI | Dokładna allowlist 01–03, brak nadmiarowych JSON/ZIP/XLSX/PDF/DXF/map w dist i payloadu Eko w bundle; regresja internal nadal działa. Same nazwy plików niewystarczające | P4b/P5 / S-14 |
| T22 I/E + inwentaryzacja — stare powierzchnie | Bezpośrednie 04_eko JSON/ZIP i znane stare adresy, produkcyjny katalog, aliasy/preview/CDN/release assets/history refs | Lista URL/status/type/body i manifesty; brak payloadu przy SPA 200. Stare wdrożenia i publiczny Git mają decyzję właściciela. Nie można potwierdzić skasowania kopii osób trzecich | P4b/P5 / A-04 |
| T23 I — zależności/build | Czyste npm ci, wersja/integrity tarballa SheetJS, pełne i runtime skany/SBOM/licencje, build i manifest wejść/wyjść | Logi/lock hash, ocena każdego advisory i ekspozycji; brak nierozstrzygniętego istotnego HIGH/CRITICAL. CDN403 = FAIL dostępności instalacji, nie PASS. Nie wykonywać automatycznego audit fix | P4a/P5 / BL-02, E-01 |
| T24 U/I/E — transmisje | Syntetyczne sentinel w project name/BOM/operations/filename/URL i kontrolowany błąd; import, symulacja, report/export, analytics OFF/ON/blocked | Zredagowany HAR i schema odbiorców/body/URL/referrer; sentinel nie opuszcza przeglądarki. Sprawdzić dynamiczne intake SDKv2, nie tylko /_vercel/insights. Biblioteki/fonty/arkusze nie pobierają runtime CDN bez jawnej polityki | P4a/P5 / S-13 |
| T25 U/I/E — aktualizacja i dane origin | Build A z legacy/nowym dokumentem→B na tym samym origin; dirty/pending autosave/running worker/2 karty; restart i rollback zgodnego kodu; drugi origin | Brak utraty RAM/zapisu, backup i migracja po potwierdzeniu, metryka wersji właściwa; drugi origin nie udaje dostępu do poprzedniej pamięci; stary backup nadal czytelny | P4a/P2a/P4c/P5 / S-07/S-13 |
| T26 I/E — hosting produkcyjny | Po osobnej zgodzie: właściwy build SHA, HTTPS/deep link, statusy brakujących assetów, CSP/workery/WebGL/druk/popout, cache HTML i hashowanych chunks, storage-denied i blokowana telemetria | Dowód rzeczywistych nagłówków i metryki deploya plus test strony; brak Vite dev/HMR/launch-editor endpointów, brak nadmiarowych public danych. Preview ≠ dowód produkcji | P4a/P5 / A-03, E-11 |
| T27 U/I/E — baseline i osobne QA | npm test, build, verify:clean, audit, docs, generator check oraz wymagane geometria/equipment/CAD/C2/import/start/tutorial/variants | Exit0 i liczba realnych przypadków; domyślne 495 w RC1 nie obejmuje całego katalogu QA. Nowe liczby z wykonania, bez wpisywania oczekiwanej sumy z pamięci | P5 / wszystkie BL i E-07/E-10 |
| T28 I/E + odbiór — dokumenty i człowiek | Spec→funkcja→test→dowód, instrukcja MD/HTML/PDF, nazwy/tutorial, wersje i limitations; początkujący przechodzi R01→porównanie→report→save/reopen i R04 jako odrębny fizyczny przykład | Protokół rzeczywistych działań i pomocy, zagubienia/błędy/braki, bez wymyślonego czasu zadania; udział użytkownika potwierdzony. Zgodne scope/changelog/plan; niezależny audit nowego SHA | P3/P4c/P5 / S-04–S-07/S-12/S-16–S-18 |

## 4. Mierzalne testy UI — UI3/UI4/X3

Każdy wiersz wymaga prawdziwej interakcji i asercji stanu/danych, nie samych zrzutów. Realizowane w P2b–d/P3 i powtórzone w P5 w odpowiednim zakresie.

| UI ID | Punkt planu | Interakcja i mierzalny warunek |
|---|---|---|
| U01 | UI3 Popyt/BOM | Import poprawnego XLSX i CSV, niepoprawnego pliku i cancel; edycja popytu, jednostek i BOM. Pola/walidacja i właściwy takt zgodne z R01; filtr/sekcja nie kasuje zmian, zużycie/dostawy nie pojawiają się z BOM |
| U02 | UI3 proces | Wybór operacji w tabeli→diagram→inspektor/wykres wskazuje to samo ID, także po sortowaniu i filtrze. Zmiana predecessor pokazuje prawdziwą gałąź/merge; cykl i unknown ID odrzucone bez zmiany zapisu |
| U03 | UI3 zasoby | Zmiana profilu, obsady, kalendarza, kompetencji i wyposażenia przez podwidoki; wrong/empty data daje błąd przy polu i nawigację do niego; undo/redo/save/reload zachowuje zasoby i źródła, nie zmienia standardu |
| U04 | UI3 bilans | Ręczny drag/drop i RPW/LCR, blokada stanowiska i dopuszczone kopie; propozycja wymaga przeglądu, wynik ujawnia podstawę czasu. Brak dopuszczeń/kompetencji to jawna odmowa, nie pusta tabela sukcesu |
| U05 | UI3→CAD | Zatwierdzony przydział widoczny w layoucie tego wariantu; regeneracja ręcznej geometrii ostrzega w każdym wejściu; cancel identyczny stan, undo/redo i reload poprawne. Brak automatycznego nadania możliwości z modelu wizualnego |
| U06 | UI4 pulpit | Czysty profil pusty; istniejący projekt zachowany; nazwa/wariant/stan zapisu i next action prawdziwe. Nowy/Otwórz/przykład/restore/tutorial respektują RAM/backup/confirm i konflikt T02–T06 |
| U07 | UI4 raport/eksport | Raport R01/R04 dotyczy wybranego wariantu i fingerprintu; zmiana wejść oznacza stale. A4/MD/dane i plik PDF zawierają tę samą metrykę, źródła, komplet sekcji i ograniczenia; nie ma obcego wyniku pod aktualnym tytułem |
| U08 | UI4 pełny przebieg | Nowy/Otwórz→dane→proces→bilans→CAD/symulacja→wariant/porównanie→raport→save/reopen/export/import. Tutorial można zamknąć/wznowić/resetować; completed oznacza faktyczne działanie, brak kotwicy daje komunikat, tekstowa alternatywa dostępna; końcowy pilot z początkującym |
| U09 | X3 rozmiary i viewport | Przy zamkniętych panelach 1440×900 i 1280×720 rzeczywisty rect viewport ≥70% szerokości i ≥60% wysokości okna aplikacji; na 390×844 osiągalne podstawowe akcje/zamknięcie panelu. Zmierzony rect i screenshot, nie wielkość karty. Zoom 200% bez utraty akcji |
| U10 | X3 język/dostępność | Jedna mapa sześciu obszarów, zgodne menu/stopka/tutorial; brak „szkic 6/Stanowiska v5” w zwykłej ścieżce, wersje w diagnostyce. Tab/focus/Escape/powrót focusu, bez pułapki, kontrast 4,5:1 i cele 32/44 px według planu; komunikat nie zależy tylko od koloru |
| U11 | X3 gesty/3D/popout | Rzeczywisty pointer drag i edycja formularzem, locked guard, undo/redo, popout i powrót, wymuszony brak WebGL z użytecznym odczytem. Jeden worker/sterowanie; Start/Pauza/Reset, scrubbing, 1×/5000× i zmiana widoku nie dublują polecenia ani nie zmieniają wyniku |
| U12 | X3 stany/źródła | Wymusić brak danych, błąd importu, obliczanie, cancel, stale, błąd solvera/deadlock i unsupported; każdy stan czytelny i ma właściwe działanie. Bufory/3D/reguły C2 opisane zgodnie z rzeczywistym kontraktem. Nieznane/syntetyczne dane nie dają globalnego zielonego „zatwierdzony” |

## 5. Skrypty wymagające utrzymania lub jawnego zastąpienia

Wyszukiwanie w bieżącym kodzie potwierdziło stare selektory w 16 plikach:

`verify_7_12a1.mjs`, `verify_7_12a2a.mjs`, `verify_7_12a2b1.mjs`, `verify_7_12b.mjs`, `verify_7_12c2_b2a.mjs`, `verify_7_12c2_b2b.mjs`, `verify_7_12c2_b3a.mjs`, `verify_7_12c2_b3b.mjs`, `verify_7_12c2_b3c.mjs`, `verify_7_12c2_b3d.mjs`, `verify_7_12c2_b3e.mjs`, `verify_7_12c2_b3f.mjs`, `verify_7_12c2_b3_ui.mjs`, `verify_7_12d.mjs`, `verify_7_13_eko.mjs`, `verify_7_9_pilot.mjs` — wszystkie pod `tests/qa/`.

Eko QA staje się wewnętrznym testem fixture po P4b; nie utrzymywać dla niego publicznego endpointu. Testy dawnych podetapów mogą zostać zastąpione nowszym testem pełnego zakresu tylko z mapą stary przypadek→nowa asercja i niezależnym przeglądem. Nie wymagać utrzymania 16 kopii helpera dla samej liczby skryptów, ale zachować 100% wymaganych zachowań. S-16 wymaga briefu aktywnych entrypointów: App/komponenty studio/LayoutEditor/Scene, nie alternatywnych nieużywanych ekranów.

Minimalny baseline P5: `npm ci` w czystym środowisku, `npm test`, `npm run build`, `npm run verify:clean`, `npm run audit:licenses`, `npm audit --json`, `node scripts/verify_documentation.mjs`, `node scripts/plan_progress.mjs`, `node scripts/prepare_demo_catalog.mjs --check` oraz utrzymane skrypty QA/geometry/equipment. Najpierw sprawdzić skutki zapisujących skryptów; nie uruchamiać ich na RC1 lub danych klienta. `--check` katalogu musi po P4b kontrolować również nadmiarowe pliki, czego obecny kod nie robi.

## 6. Warunki utworzenia RC2, audytu i wydania

1. Plan i architektura zatwierdzone; wszystkie planowane zmiany funkcjonalne ukończone i odebrane w pakietach. Nie używać utworzenia RC do obejścia brakującego odbioru migracji/UI.
2. Wymagane U/I/E i kontrole dependency/data safety PASS, brak nierozstrzygniętej utraty danych, spójności wyników, publicznych nowych assetów Eko albo istotnej ekspozycji security. Wszystkie pozycje macierzy mają aktualny dowód lub jawnie uzasadnione wykluczenie. NOT_VERIFIED nie jest zamknięciem obowiązku.
3. Czysty checkout bez niepowiązanych plików w artefakcie, właściwe app/schema/package versions, dostępne npm ci/lock i manifest hash. Ponowny odbiór na pełnym SHA docelowego commita, nie tylko na zmienionej później gałęzi.
4. Właściciel zatwierdza zamrożenie; dopiero wtedy nowa gałąź/tag RC2 od nowego SHA, bez zmiany RC1. Dokładna metryka nowego kandydata w raportach; żadnego force push.
5. Nowy baseline/evidence i read-only audyty 02.1 domena/migracje, 02.2 inżynieria, 02.3A/B symulacja niezależnie, 02.4 CAD/3D, 02.5 bezpieczeństwo/UX/web oraz 03.1/03.2 całość zgodnie z audit_plan. Kluczowe kontrakty/migracje odbiera zewnętrzny Claude Opus; drugi audyt Sol bez poznania wyników pierwszego. Wynik audytu może wrócić do poprawek i nowego kandydata.
6. Właściciel otrzymuje raport pilota człowieka, stan ograniczeń, decyzje prywatności/praw do danych oraz readiness z dowodami. Gotowość V1 dopiero po ponownym audycie i jego akceptacji.
7. Osobna zgoda na deployment produkcyjny; po nim T22/T24/T26 na faktycznej domenie/build SHA oraz sprawdzenie odzyskania i braku Eko. Bez tej zgody testy produkcyjne są otwartą bramką; nie deklarować pełnego produkcyjnego odbioru na podstawie staging ani Git push.

Kontrole techniczne mogą wykonać Terra/Luna, ale ocena poprawności migracji, referencji, rezerwacji i symulacji wymaga Sol. Audyty niezależne i odbiór architektury: zewnętrzny Claude Opus. To przypisanie przyszłych ról, nie deklaracja ich wykonania.
