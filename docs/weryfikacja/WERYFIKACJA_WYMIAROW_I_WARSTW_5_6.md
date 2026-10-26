# Weryfikacja 5.6 — Wymiarowanie, pomiary odległości, warstwy i blokowanie obiektów

Data odbioru: 2026-10-18  
ID planu: `5.6`  
Backup przed zmianami: `backup/v0.4.0_przed_5_6_20261018` (321 plików, weryfikacja `BACKUP_MANIFEST_SHA256.txt` — 0 rozbieżności)

## 1. Zakres wdrożenia

1. **Blokowanie obiektów (`LayoutObject.locked?: boolean`, `lockLayoutObjects`):**
   - Rozszerzono interfejs `LayoutObject` (`src/core/models/types.ts`) o opcjonalną flagę `locked?: boolean` oraz walidację typu logicznego w `validateProject` i `parseProject` (`src/core/validation.ts`). Istniejące projekty bez pola `locked` wczytują się bez migracji.
   - W `src/core/algorithms/layoutSelection.ts` dodano funkcję `lockLayoutObjects(objects, ids, locked)` oraz zabezpieczono `moveLayoutObjects` i `alignLayoutObjects`: zablokowane obiekty nie zmieniają położenia podczas przesuwania ani wyrównywania (natomiast zablokowany obiekt wybrany jako pierwszy może służyć jako nieruchoma baza odniesienia do wyrównania pozostałych odblokowanych obiektów). Nowo utworzone kopie (`copyLayoutObjects`) są domyślnie odblokowane.
   - W `src/components/studio/LayoutEditor.tsx` dodano przyciski **Zablokuj zaznaczone** i **Odblokuj zaznaczone** na pasku wielokrotnego zaznaczenia, pole wyboru **Zablokuj pozycję i wymiary obiektu** w panelu **Właściwości** (blokujące pola `X [mm]`, `Y [mm]`, `Szerokość [mm]`, `Głębokość [mm]`, `Wysokość [mm]`, `Obrót [stopnie]`), blokadę przeciągania myszą na rzucie CAD 2D, blokadę przycisku **Usuń wybrany obiekt** oraz oznaczenie `🔒` i przerywany obrys na rzucie, w drzewie i w tabeli dolnej.

2. **Warstwy widoku (`LayoutLayerId`, `classifyLayoutObjectLayer`):**
   - Dodano klasyfikację obiektów do warstw logicznych oraz pasek **Warstwy i pomiary odległości** z sześcioma niezależnymi przełącznikami:
     - **Warstwa: Stanowiska** (`Table`, `TableESD`, `TableToolRail`, `QualityGate`, `ReworkStation`),
     - **Warstwa: Bufory i logistyka** (`FlowRackFIFO*`, `RollerConveyor*`, `PalletEuroFloorMark`, `Shadowboard5S`, `AndonBoard`, `MaterialIn`, `FinishedGoods`),
     - **Warstwa: Strefy operatorów** (`OperatorErgoMat`),
     - **Warstwa: Relacje technologiczne** (fioletowe linie `layoutRoutes`),
     - **Warstwa: Przeszkody** (`obstacles`),
     - **Warstwa: Wymiary i pomiary** (etykiety gabarytów i nakładki pomiarowe).

3. **Wymiarowanie i pomiary odległości (`measureObjectsDistance`, `measurePointsDistance`):**
   - Na rzucie CAD 2D każdy widoczny obiekt i przeszkoda prezentuje etykietę wymiarową `szerokość × głębokość mm` (`.cad-object-dimension`, `.cad-obstacle-dimension`) przy aktywnej warstwie **Warstwa: Wymiary i pomiary**.
   - Po zaznaczeniu co najmniej dwóch obiektów automatycznie obliczana jest odległość między pierwszymi dwoma wybranymi obiektami (`measureObjectsDistance`): najmniejszy prześwit pomiędzy obróconymi wielokątami obrysu (`edgeGapMm`, 0 mm w przypadku kolizji/nakładania), prześwity osiowe `gapXMm`/`gapYMm`, odległość euklidesowa `środek–środek` (`centerDistanceMm`) oraz `ΔX` i `ΔY`. Wynik jest prezentowany w pasku stanu (`.cad-distance-readout`) oraz jako linia wymiarowa na rzucie (`.cad-dimension-overlay`).
   - Przycisk **Mierz odległość / Zakończ pomiar odległości** uruchamia interaktywną miarkę punkt–punkt na rzucie (`measurePointsDistance`, `.cad-ruler-readout`, `.cad-ruler-overlay`) z przyciąganiem do aktywnych punktów połączeń lub siatki oraz przyciskiem **Wyczyść pomiar**.

## 2. Wyniki weryfikacji automatycznej i UI (Edge CDP)

- **Testy jednostkowe celowane (`5.3`–`5.6`):** `node scripts/test.mjs --suite=core --test-name-pattern="5\.(3|4|5|6):"` — **8/8 PASS** (w tym 2 nowe testy `5.6`).
- **Okresowa pełna regresja testów (trzeci pakiet od `5.3`, po `5.4`, `5.5` i `5.6`):** `node scripts/test.mjs` — **315/315 PASS**.
- **Typecheck i build produkcyjny:** `npm.cmd run build` (`tsc && vite build`) — **PASS**.
- **Weryfikacja UI w przeglądarce Microsoft Edge (CDP):**
  - `node tests/qa/verify_5_6.mjs` — **PASS**:
    - Domyślna obecność etykiet wymiarowych `.cad-object-dimension` oraz warstw `[data-layer="buffers"]`, `[data-layer="operators"]` i `.cad-route-line`.
    - Niezależne ukrywanie i przywracanie warstw (`Warstwa: Bufory i logistyka`, `Warstwa: Strefy operatorów`, `Warstwa: Relacje technologiczne`, `Warstwa: Wymiary i pomiary`).
    - Automatyczny pomiar odległości po zaznaczeniu dwóch stołów (`TBL-WS-1 ↔ TBL-WS-2`) z odczytem `.cad-distance-readout` i linią wymiarową `.cad-dimension-overlay`.
    - Interaktywny pomiar punkt–punkt (`Mierz odległość`, `.cad-ruler-readout`, `.cad-ruler-overlay`, `Wyczyść pomiar`).
    - Zablokowanie `TBL-WS-1` (`Zablokuj zaznaczone`), weryfikacja zapisu `locked: true`, zablokowanych pól geometrii we **Właściwościach**, nieaktywnego przycisku **Usuń wybrany obiekt**, ochrony przed przeciągnięciem myszą w trybie `Przesuwaj obiekty`, zachowania po przeładowaniu strony oraz odblokowania (`Odblokuj zaznaczone`).
    - Brak poziomego przepełnienia na szerokościach `1440 px` i `600 px`; zrzuty zapisane w `outputs/qa/verify_5_6_1440.png` oraz `outputs/qa/verify_5_6_600.png`.
  - Regresja UI pakietów `5.2`–`5.5`:
    - `node tests/qa/verify_5_2.mjs` — **PASS**
    - `node tests/qa/verify_5_3.mjs` — **PASS**
    - `node tests/qa/verify_5_4.mjs` — **PASS**
    - `node tests/qa/verify_5_5.mjs` — **PASS**

## 3. Aktualizacja instrukcji użytkownika

- Zaktualizowano `Instrukcja/Podrecznik_Uzytkownika.md` (Krok 7 — sekcja 5.6 ze zrzutem `outputs/qa/verify_5_6_1440.png`), wygenerowano `Instrukcja/Podrecznik_Uzytkownika.html` oraz `Instrukcja/Podrecznik_Uzytkownika.pdf` (25 stron, 25 obrazów) i zweryfikowano skryptem `scripts/verify_manual.py outputs/qa/manual_5_6` (`missingImages: []`, `absentSections: []`, `blankPages: []`, `wordsOutsidePage: []`).
