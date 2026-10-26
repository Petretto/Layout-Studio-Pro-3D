# Weryfikacja importu geometrii DXF — 5.8

**Data odbioru:** 2026-10-18  
**ID planu:** `5.8` (*Ustalić i wdrożyć obsługiwany podzbiór importu DXF, z raportem pominiętej geometrii i sprawdzeniem jednostek*)  
**Backup przed wdrożeniem:** `backup/v0.4.0_przed_5_8_20261018` (`336` plików, pełna zgodność SHA256 z `BACKUP_MANIFEST_SHA256.txt`)

## 1. Zakres wdrożenia

1. **Jawnie zdefiniowany i wdrożony podzbiór importu DXF (`src/core/export/dxfImporter.ts`)**:
   - Parser sekcji `HEADER` i `ENTITIES` (z pominięciem definicji w sekcji `BLOCKS`, tak aby geometria szablonów bloków nie była fałszywie umieszczana na hali).
   - **Obsługiwane encje 2D (`ENTITIES`)**:
     - `LWPOLYLINE` (co najmniej 3 wierzchołki tworzące niezdegenerowany obrys 2D),
     - `POLYLINE` + `VERTEX` + `SEQEND` (obrysy 2D, z wyłączeniem siatek 3D Polyface Mesh),
     - `CIRCLE` (okręgi zamieniane na obrysy słupów `2R × 2R`),
     - osiowe odcinki `LINE` na warstwach hali/ścian/przeszkód (`FACILITY`, `HALA`, `HALL`, `BOUNDARY`, `OBSTACLES`, `COLUMNS`, `WALLS`),
     - etykiety tekstowe `TEXT` oraz `MTEXT` parowane z obrysami na tej samej warstwie.
   - **Klasyfikacja warstw i pełny roundtrip z `exportToDxf`**:
     - Warstwy hali (`FACILITY`, `HALA`, `HALL`, `BUDYNEK`, `BOUNDARY`, `OBRYS_HALI`, `WALL_OUTER`) wyznaczają gabaryty hali (`widthMm × lengthMm`) i początek układu odniesienia.
     - Warstwy przeszkód (`OBSTACLES`, `PRZESZKODY`, `COLUMNS`, `SLUPY`, `WALLS`, `SCIANY`, `FILARY`) oraz warstwy nieznane tworzą obiekty `Obstacle`.
     - Warstwy wyposażenia (`EQUIPMENT`, `LOGISTICS`, `OPERATORS`) tworzą obiekty wizualne `LayoutObject` bez przypisania technologicznego (`workstationId`), chroniąc niezmiennik separacji wizualnej geometrii od zdolności produkcyjnej.
     - Automatyczna obsługa konwencji ujemnej osi Y (`-yMm`) stosowanej przez `exportToDxf`, dzięki czemu eksport i ponowny import DXF zachowują wymiary hali, przeszkody i obiekty 1:1.

2. **Weryfikacja jednostek miary (`$INSUNITS` i jawny wybór użytkownika)**:
   - Odczyt zmiennej nagłówkowej `$INSUNITS`: `1` = cale (`×25,4 mm`), `2` = stopy (`×304,8 mm`), `4` = milimetry (`×1 mm`), `5` = centymetry (`×10 mm`), `6` = metry (`×1000 mm`).
   - Gdy plik DXF nie posiada nagłówka `$INSUNITS` lub deklaruje `$INSUNITS=0` (bezjednostkowy), raport ustawia `requiresUnitConfirmation = true`, prezentuje ostrzeżenie i blokuje przycisk **Zastosuj import DXF** do chwili jawnego wybrania jednostki (`mm`, `cm`, `m`, `in`, `ft`) przez użytkownika.
   - Gdy użytkownik jawnie wybierze inną jednostkę niż zadeklarowana w `$INSUNITS`, raport wyświetla ostrzeżenie o nadpisaniu jednostki nagłówka.

3. **Raport pominiętej geometrii (`skippedEntities`, `totalSkippedCount`)**:
   - Zgodnie z zasadą domeny (*Unsupported CAD/import geometry is reported rather than silently misread*), żadna nieobsługiwana encja w `ENTITIES` nie jest milcząco ignorowana.
   - Raport grupuje pominięte encje według typu, warstwy, liczby wystąpień i czytelnego wyjaśnienia inżynierskiego (m.in. `INSERT` — nierozbite bloki wymagające `EXPLODE`, `SPLINE`, `ARC`, `ELLIPSE`, `HATCH`, `DIMENSION`, `LEADER`/`MLEADER`, `SOLID`, `3DFACE`, `MESH`, `POINT`, `VIEWPORT`, łuki `bulge` w `LWPOLYLINE` oraz polilinie o mniej niż 3 wierzchołkach).

4. **Integracja w UI edytora hali (`src/components/studio/LayoutEditor.tsx`)**:
   - W panelu **Parametry hali** dodano sekcję **Import geometrii DXF** z wyborem pliku `.dxf`, wyborem **Jednostki pliku DXF**, wyborem **Zakresu importu DXF** (`Wymiary hali i przeszkody`, `Tylko przeszkody do istniejącej hali`, `Pełny rzut CAD (hala, przeszkody i obiekty wizualne)`), opcją **Zastąp istniejące przeszkody przy imporcie** oraz kompletnym podglądem **Raportu importu DXF** przed zatwierdzeniem.
   - Zastosowanie importu wspiera historię **Cofnij / Ponów** oraz zapis lokalny i eksport JSON.

## 2. Wyniki testów i weryfikacji

- **Testy jednostkowe (`node scripts/test.mjs --suite=core --test-name-pattern="5\.(3|4|5|6|7|8):"`)**: `12/12 PASS` (w tym 2 nowe testy `5.8:` sprawdzające roundtrip `exportToDxf -> parseDxfImport`, skalowanie `$INSUNITS=6` m $\rightarrow$ mm, blokadę przy `$INSUNITS=0`, raportowanie 8 pominiętych encji CAD oraz 3 zakresy `applyDxfImportToProject`).
- **Build produkcyjny (`npm.cmd run build`)**: `PASS` (`tsc && vite build`).
- **Odbiór UI w przeglądarce Edge CDP (`tests/qa/verify_5_8.mjs`)**: `PASS` (`1440 px` i `600 px`, `0` błędów konsoli/runtime):
  - Wczytanie pliku `hala_b3_cad.dxf` (`$INSUNITS=0`) z halą `32 × 38`, dwoma słupami (`LWPOLYLINE` + `CIRCLE`), obiektem `EQUIPMENT` oraz encjami `INSERT` ($\times 2$), `SPLINE`, `HATCH`, `DIMENSION`.
  - Potwierdzono blokadę przycisku **Zastosuj import DXF** przed wyborem jednostki oraz wyświetlenie ostrzeżenia o braku jednostki i raportu pominiętej geometrii.
  - Po wyborze jednostki `Metry (m, ×1000 mm)` i zakresu `Pełny rzut CAD` potwierdzono przeliczenie wymiarów na `32000 × 38000 mm`, import 2 przeszkód (`Słup żelbetowy S-1`, `Słup okrągły S-2`) i obiektu wizualnego (`Bramka KJ DXF`), działanie **Cofnij / Ponów** oraz trwałość po przeładowaniu strony.
  - Zrzuty ekranu zapisane w `outputs/qa/verify_5_8_1440.png` i `outputs/qa/verify_5_8_600.png`.
- **Regresja UI (`verify_5_2.mjs` – `verify_5_7.mjs`)**: `6/6 PASS`.
- **Aktualizacja podręcznika użytkownika (`Instrukcja/Podrecznik_Uzytkownika.md`, `.html`, `.pdf`)**:
  - Dodano opis i zrzut ekranu `5.8` w Kroku 7.
  - Kontrola `scripts/verify_manual.py`: `27` stron, `27` obrazów, `0` brakujących obrazów, `0` pustych stron, `0` słów poza stroną.
