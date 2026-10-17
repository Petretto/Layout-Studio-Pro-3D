# 5.5 — przyciąganie do siatki, krawędzi i punktów połączeń oraz możliwość jego wyłączenia

Odbiór 2026-10-18. Zakres: edytor CAD 2D aktywnego projektu 4 (`src/core/algorithms/layoutSelection.ts`, `src/components/studio/LayoutEditor.tsx`). Wspólne zaznaczenie i gesty 2D–3D pozostają do punktu `5.10`.

## Kontrakt i działanie

W module `src/core/algorithms/layoutSelection.ts` wdrożono wyznaczanie punktów połączeń obiektu (`objectConnectionPoints`) oraz silnik przyciągania podczas translacji obiektu/grupy/zespołu stanowiska (`snapLayoutTranslation`):

1. **Punkty połączeń (`objectConnectionPoints`)**:
   - Dla każdego obiektu wyposażenia (`LayoutObject`) wyznaczane jest 5 portów: punkt centralny (`center` — zgodny z punktem zaczepienia tras technologicznych `layoutRoutes`) oraz środki czterech krawędzi obróconego obrysu (`left`, `right`, `top`, `bottom`).
   - Gdy aktywne jest **Przyciąganie do punktów połączeń**, porty są widoczne na rzucie CAD 2D (`.cad-connection-point`), a zbliżenie portu przesuwanego obiektu do portu nieruchomego obiektu (w progu `120 mm`) lub wyrównanie osiowe punktów centralnych przyciąga obiekt i wyświetla żółtą prowadnicę (`.cad-snap-guide`).
2. **Przyciąganie do krawędzi (`edges`)**:
   - Gdy aktywne jest **Przyciąganie do krawędzi**, zewnętrzne krawędzie obróconego obrysu (`minX`, `maxX`, `minY`, `maxY`) przesuwanego obiektu są przyciągane (w progu `120 mm`) do krawędzi pozostałych nieruchomych obiektów wyposażenia oraz przeszkód (`obstacles`), umożliwiając zarówno wyrównanie krawędzi w jednej linii, jak i styk obrysów, z wyświetleniem przerywanej niebieskiej prowadnicy (`#38bdf8`).
3. **Przyciąganie do siatki (`grid`)**:
   - Gdy oś nie została przechwycona przez aktywne przyciąganie do punktu połączenia ani krawędzi, a włączone jest **Przyciąganie do siatki**, współrzędna zaokrąglana jest do wielokrotności `facility.gridSizeMm`.
4. **Możliwość wyłączenia przyciągania**:
   - Trzy niezależne przełączniki na pasku narzędzi (**Przyciąganie do siatki**, **Przyciąganie do krawędzi**, **Przyciąganie do punktów połączeń**) pozwalają włączać i wyłączać każdy tryb osobno.
   - Przycisk **Wyłącz przyciąganie / Włącz przyciąganie** jednym kliknięciem wyłącza lub przywraca wszystkie trzy tryby.
   - Przytrzymanie klawisza `Alt` podczas przeciągania tymczasowo wyłącza przyciąganie na czas ruchu (swobodne pozycjonowanie z dokładnością `1 mm`).

## Zapis i zgodność

Backup przed pracami: `backup/v0.4.0_przed_5_5_20261018` (464 pliki z manifestem SHA256 `BACKUP_MANIFEST_SHA256.txt`, 0 rozbieżności).
Schemat zapisu projektu (`schemaVersion`) pozostaje bez zmian.

## Weryfikacja

- Celowane testy jednostkowe `node scripts/test.mjs --suite=core "--test-name-pattern=5\.[345]:"`: **6/6 PASS** (2 testy `5.3`, 2 testy `5.4`, 2 nowe testy `5.5`: przyciąganie do siatki, krawędzi obiektów i przeszkód, wyłączenie przyciągania z ruchem co `1 mm`, wyznaczanie 5 punktów połączeń, dokowanie portów bocznych oraz wyrównanie osiowe centrów technologicznych z priorytetem nad siatką).
- Build produkcyjny `npm.cmd run build`: **PASS** (`tsc && vite build`).
- Weryfikacja przeglądarkowa UI `node tests/qa/verify_5_5.mjs` (Edge headless CDP): **PASS**:
  - Renderowanie znaczników punktów połączeń `.cad-connection-point` na płótnie CAD 2D oraz ich ukrywanie po wyłączeniu przyciągania.
  - Przycisk **Wyłącz przyciąganie** wyłącza wszystkie tryby i pozwala przesunąć stanowisko `TBL-WS-1` (wraz z `FIFO-WS-1` i `MAT-WS-1`) na współrzędną spoza siatki (`xMm % 200 !== 0`).
  - Przycisk **Włącz przyciąganie** przywraca przyciąganie; przeciągnięcie `TBL-WS-1` w pobliże lewego portu `TBL-WS-2` wyświetla aktywną prowadnicę `.cad-snap-guide` i dokuje prawy port `TBL-WS-1` do lewego portu `TBL-WS-2` (`connTbl1.xMm + connTbl1.widthMm === initTbl2.xMm`, `connTbl1.yMm === initTbl2.yMm`).
  - Przy wyłączonym przyciąganiu do punktów połączeń i aktywnym **Przyciąganiu do krawędzi** przeciągnięcie na innej wysokości (`dy = +500 mm`) wyświetla prowadnicę krawędziową i wyrównuje prawą krawędź `TBL-WS-1` do lewej krawędzi `TBL-WS-2`.
  - Działają `Cofnij` / `Ponów` oraz zapis i `reload`.
  - Zrzuty ekranu 1440 px (`outputs/qa/verify_5_5_1440.png`) i 600 px (`outputs/qa/verify_5_5_600.png`) potwierdzają brak przepełnienia poziomego i zero błędów JS/konsoli.
- Regresja UI: `node tests/qa/verify_5_2.mjs` (**PASS**), `node tests/qa/verify_5_3.mjs` (**PASS**) oraz `node tests/qa/verify_5_4.mjs` (**PASS**).
- Aktualizacja podręcznika użytkownika (`Instrukcja/Podrecznik_Uzytkownika.md`, `.html`, `.pdf`): `node scripts/generate_pdf_html.mjs`, `node scripts/print_manual_cdp.mjs` (24 zweryfikowane obrazy) oraz `scripts/verify_manual.py outputs/qa/manual_5_5` (**PASS**: 24 strony, 24 obrazy, zero braków, pustych stron i tekstu poza stroną; przegląd wizualny `outputs/qa/manual_5_5/contact_1.png` i `contact_2.png`).
