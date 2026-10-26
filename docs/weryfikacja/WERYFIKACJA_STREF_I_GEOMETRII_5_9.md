# Weryfikacja 5.9 — Strefy obsługi, odkładania i komunikacji oraz rozróżnienie ostrzeżeń geometrycznych od oceny zgodności BHP

**Data odbioru:** 2026-10-18  
**Pozycja planu:** `5.9` — *Czytelnie pokazywać strefy obsługi, odkładania i komunikacji; ostrzeżenia geometryczne odróżnić od oceny zgodności BHP.*  
**Status:** `wdrożone`

---

## 1. Zakres wdrożenia

1. **Wyznaczanie i wizualizacja stref funkcjonalnych (`computeFunctionalZones` w `src/core/algorithms/layoutSelection.ts`, `LayoutEditor.tsx`)**:
   - Dodano warstwę `'functionalZones'` (`Warstwa: Strefy obsługi, odkładania i komunikacji`) na pasku **Warstwy i pomiary odległości** w zakładce **5 Hala i CAD 2D**.
   - Wyznaczane są trzy czytelnie rozróżnione kategorie stref na rzucie 2D (`FunctionalZoneKind = 'service' | 'staging' | 'communication'`):
     - **Strefa obsługi (`service`)**: zielone ukośne kreskowanie (`#zone-service-hatch`, obrys `#4ade80`) wokół maty ergonomicznej operatora (`OperatorErgoMat`, otoczka `+150 mm`) albo przedni pas roboczy (`800 mm` głębokości) przed stołem stanowiska nieposiadającego maty, z etykietą `Strefa obsługi (WS-...)`.
     - **Strefa odkładania (`staging`)**: bursztynowe kreskowanie (`#zone-staging-hatch`, obrys `#fbbf24`) wokół regałów buforowych FIFO (`FlowRackFIFO3Tier`), stref wejścia materiału (`MaterialIn`) i wyrobów gotowych (`FinishedGoods`) z otoczką `+140 mm` oraz etykietą `Strefa odkładania (...)`.
     - **Strefa komunikacji (`communication`)**: błękitny pas komunikacyjny (`#zone-comm-hatch`, przerywany obrys `#38bdf8`) reprezentujący korytarz międzyrzędowy (`Strefa komunikacji międzyrzędowej`) w układach wielorzędowych / U-Shape albo główny korytarz wzdłuż linii (`Strefa komunikacji wzdłuż linii`) w układach jednorzędowych na podstawie parametru `aisleMm`.

2. **Kontrola geometryczna rzutu odróżniona od oceny zgodności BHP (`analyzeGeometricLayoutWarnings`, `BHP_GEOMETRY_DISCLAIMER`, `BHP_SAFE_STATE_NOTE`)**:
   - Stała `BHP_GEOMETRY_DISCLAIMER` jawnie informuje, że kontrola ma wyłącznie charakter geometryczny (obrysy 2D, granice hali, kolizje prostokątów i zadane prześwity modelowe w mm) i **NIE stanowi oceny zgodności z przepisami BHP, ergonomii, ochrony przeciwpożarowej ani dopuszczenia stanowisk do eksploatacji**.
   - Stała `BHP_SAFE_STATE_NOTE` podkreśla przy stanie bezkolizyjnym (`0` ostrzeżeń), że brak ostrzeżeń geometrycznych oznacza wyłącznie brak nakładania się prostokątnych obrysów 2D i zachowanie zadanych prześwitów modelowych — nie potwierdza spełnienia wymogów BHP.
   - Funkcja `analyzeGeometricLayoutWarnings` klasyfikuje 5 kategorii ostrzeżeń geometrycznych, każde z jawną odznaką `scopeLabel: 'Geometria rzutu (nie BHP)'` oraz prefiksem `[Geometria rzutu — nie BHP]`:
     - `hall-boundary`: wykroczenie obrysu obiektu poza wymiary modelu hali (`widthMm × lengthMm × heightMm`),
     - `obstacle-collision`: nakładanie obrysu 2D obiektu z przeszkodą / słupem hali,
     - `object-collision`: wzajemne nakładanie obrysów 2D dwóch obiektów wyposażenia,
     - `narrow-aisle`: prześwit krawędzi między stołami stanowisk poniżej progu kontrolnego `minClearanceMm`,
     - `zone-obstruction`: wejście przeszkody w obrys wyznaczonej strefy obsługi, odkładania lub komunikacji.
   - W panelu **Strefy funkcjonalne i kontrola geometryczna rzutu (nie BHP)** pod rzutem każde ostrzeżenie wyposażenia udostępnia przycisk **Zaznacz obiekt / Zaznacz kolidujące obiekty**, a kolidujące obiekty są oznaczane na płótnie SVG atrybutem `data-geo-warning="true"` i przerywanym różowo-czerwonym obrysem (`#fb7185`).

---

## 2. Wyniki testów automatycznych, okresowej pełnej regresji i budowania

- **Kopia zapasowa przed wdrożeniem:** `backup/v0.4.0_przed_5_9_20261018` (`487` plików, `0` niezgodności SHA256 w `BACKUP_MANIFEST_SHA256.txt`).
- **Testy ukierunkowane (`node scripts/test.mjs --suite=core --test-name-pattern="5\.(3|4|5|6|7|8|9):"`):** `14/14 PASS`:
  - `5.9: generowanie czytelnych stref obsługi, odkładania i komunikacji (computeFunctionalZones)` — PASS
  - `5.9: kontrola geometryczna rzutu odróżnia ostrzeżenia geometryczne 2D od oceny zgodności BHP` — PASS
  - Regresja `5.3`–`5.8` (`12` testów) — PASS
- **Okresowa pełna regresja (`node scripts/test.mjs --suite=all` — 3. pakiet od ostatniej pełnej regresji w `5.6`):** `321/321 PASS` (`0` błędów, czas `2,42 s`).
- **Budowanie produkcyjne (`npm.cmd run build`):** `tsc && vite build` — PASS (`0` błędów TypeScript, `145` modułów).

---

## 3. Odbiór UI w przeglądarce Edge CDP (`tests/qa/verify_5_9.mjs`)

Przeprowadzono odbiór w bezgłowej przeglądarce Microsoft Edge przez CDP (`node tests/qa/verify_5_9.mjs` oraz regresja `verify_5_7.mjs` i `verify_5_8.mjs`):
1. **Strefy funkcjonalne na rzucie 2D**: potwierdzono renderowanie grupy `.cad-functional-zones` (`2` strefy obsługi, `4` strefy odkładania, `1` strefa komunikacji międzyrzędowej) oraz działanie przełącznika `Warstwa: Strefy obsługi, odkładania i komunikacji`.
2. **Rozróżnienie od oceny BHP w stanie bezkolizyjnym**: potwierdzono wyświetlanie `BHP_GEOMETRY_DISCLAIMER`, liczników stref oraz `BHP_SAFE_STATE_NOTE` przy `0` ostrzeżeniach geometrycznych.
3. **Wykrywanie kolizji i przeszkód w strefach**: po przesunięciu `TBL-WS-1` na słup `COL-1` oraz dodaniu przeszkody w pasie komunikacji międzyrzędowej potwierdzono pojawienie się ostrzeżeń z odznaką `Geometria rzutu (nie BHP)` i prefiksem `[Geometria rzutu — nie BHP]`, wyróżnienie stołu na rzucie (`data-geo-warning="true"`) oraz działanie przycisku `Zaznacz obiekt`.
4. **Historia i responsywność**: sprawdzono `Cofnij / Ponów` oraz brak poziomego przepełnienia (`scrollWidth <= clientWidth`) przy szerokościach `1440px` (`outputs/qa/verify_5_9_1440.png`) i `600px` (`outputs/qa/verify_5_9_600.png`), przy `0` błędach konsoli i runtime.
5. **Aktualizacja Podręcznika Użytkownika**: zaktualizowano `Instrukcja/Podrecznik_Uzytkownika.md`, `.html` i `.pdf` (`scripts/verify_manual.py`: `28` stron, `28` obrazów, `0` brakujących zasobów, `0` pustych stron, `0` słów poza stroną).
