# 5.4 — przenoszenie stanowiska razem z przypisanym FIFO i strefą obsługi bez utraty relacji technologicznych

Odbiór 2026-10-18. Zakres: edytor CAD 2D projektu 4 (`src/core/algorithms/layoutSelection.ts`, `src/components/studio/LayoutEditor.tsx`). Wspólne zaznaczenie i gesty 2D/3D pozostają do punktu `5.10`.

## Kontrakt i działanie

Zespół stanowiska (`workstationAssemblyIds`) obejmuje elementy wyposażenia przypisane do tego samego `workstationId` i tego samego sufiksu kopii fizycznej (`-COPY-\d+$`, albo brak sufiksu przy pojedynczej kopii): stół montażowy (`TableESD`), przypisany regał buforowy (`FlowRackFIFO3Tier`) oraz strefę obsługi operatora (`OperatorErgoMat`). Zabezpieczenie wielostołowe chroni syntetyczne zestawy wielu stołów o tym samym `workstationId` bez sufiksu kopii przed niezamierzonym złączeniem.

- **Przenoś stanowisko z FIFO i strefą** (domyślnie włączone na pasku narzędzi):
  - Przeciągnięcie myszą na rzucie CAD 2D dowolnego elementu stanowiska (stołu, regału FIFO lub maty operatora) przesuwa cały zespół tej kopii stanowiska o ten sam wektor `(dx, dy)` już w trakcie podglądu na żywo (`previewObjects`), jak i w zatwierdzonym zapisie.
  - Zmiana współrzędnych X/Y we **Właściwościach** istniejącego obiektu stanowiska przesuwa cały zespół stanowiska o ten sam wektor `(dx, dy)`.
  - Wyrównywanie wielu obiektów/stanowisk (**Do lewej/prawej/góry/dołu**) przesuwa całe zespoły stanowisk z zachowaniem wewnętrznych odstępów między stołem, FIFO i strefą operatora.
  - Fioletowe linie relacji technologicznych (`layoutRoutes`) aktualizują się na żywo podczas przeciągania i po zapisie bez utraty `workstationId`, identyfikatorów obiektów ani powiązań operacji w procesie.
- **Zaznacz zespół stanowiska**: przycisk w pasku wielokrotnego wyboru jawnie rozszerza bieżące zaznaczenie na wszystkie elementy wybranych zespołów stanowisk.
- **Korekta pojedynczego elementu**: odznaczenie opcji **Przenoś stanowisko z FIFO i strefą** pozwala przesunąć lub zmienić X/Y pojedynczego regału FIFO albo strefy operatora względem stołu, nadal bez utraty przypisania `workstationId` i relacji technologicznych.

## Zapis i zgodność

Backup przed pracami: `backup/v0.4.0_przed_5_4_20261018`, 314 plików z manifestem SHA256 (`BACKUP_MANIFEST_SHA256.txt`). Odtwarzanie: zachować obecny stan, odtworzyć pliki źródłowe według manifestu i przebudować aplikację.

Brak zmian schematu zapisu (`schemaVersion` pozostaje bez zmian). Przynależność do zespołu stanowiska wynika z istniejących pól `id`, `type` oraz `workstationId`. Dotychczasowe projekty wczytują się bezpośrednio bez migracji.

## Weryfikacja

- Celowane testy jednostkowe `node scripts/test.mjs --suite=core "--test-name-pattern=5\.[34]:"`: **4/4 PASS** (2 testy `5.3` + 2 nowe testy `5.4`: przenoszenie zespołu pojedynczej i wielokrotnej kopii `-COPY-2`, wyrównywanie zespołów stanowisk z zachowaniem wewnętrznych odstępów, zachowanie tras technologicznych `layoutRoutes` oraz indywidualna korekta pozycji regału FIFO przy `includeStationAssembly = false`).
- Build produkcyjny `npm.cmd run build`: **PASS** (`tsc && vite build`).
- Weryfikacja przeglądarkowa UI `node tests/qa/verify_5_4.mjs` (Edge headless CDP): **PASS**:
  - Przycisk **Zaznacz zespół stanowiska** rozszerza wybór stołu `TBL-WS-1` na 3 elementy (`TBL-WS-1`, `FIFO-WS-1`, `MAT-WS-1`).
  - Przeciągnięcie myszą stołu `TBL-WS-1` na płótnie CAD 2D przesuwa stół, przypisany regał `FIFO-WS-1` i strefę operatora `MAT-WS-1` o identyczny wektor `(dx = +1200 mm, dy = +800 mm)`, zachowując odstępy względne (`fifoOffsetX = 0`, `fifoOffsetY = -1050`, `matOffsetX = 0`, `matOffsetY = 950`), `workstationId = WS-1` oraz wszystkie linie relacji technologicznych (współrzędna początku trasy podąża dokładnie za środkiem stołu).
  - Zmiana X/Y w panelu **Właściwości** przesuwa cały zespół stanowiska przy włączonej opcji, a po odznaczeniu **Przenoś stanowisko z FIFO i strefą** koryguje wyłącznie pojedynczy regał `FIFO-WS-1` bez naruszania pozycji stołu i strefy operatora.
  - Działają `Cofnij` / `Ponów` oraz zapis i przeładowanie strony (`reload`).
  - Zrzuty ekranu 1440 px (`outputs/qa/verify_5_4_1440.png`) i 600 px (`outputs/qa/verify_5_4_600.png`) potwierdzają brak poziomego przepełnienia (`horizontalOverflowPx = 0`) i zero błędów JS/konsoli.
- Regresja UI `node tests/qa/verify_5_2.mjs` (**PASS**) oraz `node tests/qa/verify_5_3.mjs` (**PASS**).
- Aktualizacja podręcznika użytkownika (`Instrukcja/Podrecznik_Uzytkownika.md`, `.html`, `.pdf`): `node scripts/generate_pdf_html.mjs`, `node scripts/print_manual_cdp.mjs` (23 zweryfikowane obrazy) oraz `scripts/verify_manual.py outputs/qa/manual_5_4` (**PASS**: 23 strony, 23 obrazy, zero brakujących obrazów, pustych stron i słów poza stroną; przegląd wizualny `outputs/qa/manual_5_4/contact_1.png` i `contact_2.png` bez nakładania i ucięć).
