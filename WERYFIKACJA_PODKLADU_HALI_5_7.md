# Weryfikacja 5.7 — Podkład hali z kalibracją skali

Data: 2026-10-18

## Zakres wdrożenia (`PLAN_ROZWOJU.md` ID `5.7`)
1. **Model danych i walidacja podkładu hali (`FacilityUnderlay` w `src/core/models/types.ts` i `src/core/validation.ts`)**:
   - Dodano opcjonalne pole `underlay?: FacilityUnderlay` w `FacilityConfig` zawierające nazwę pliku (`name`), obraz zakodowany w `dataUrl` (`data:image/(png|jpeg|jpg|webp|svg+xml);base64,...` do 4 MB), wymiary obrazu w pikselach (`imageWidthPx`, `imageHeightPx` `1–50000 px`), skalę `mmPerPixel` (`0,01–10000 mm/px`), przesunięcie początku podkładu (`xMm`, `yMm` w zakresie `-500000..500000 mm`), przezroczystość (`opacity` `0,05–1`), flagę widoczności `visible` oraz opcjonalne metadane kalibracji (`calibratedDistanceMm`, `calibratedSpanPx`).
   - Zachowano pełną kompatybilność wsteczną istniejących projektów bez podkładu.
2. **Algorytmy wymiarowania i dwupunktowej kalibracji skali (`src/core/algorithms/layoutSelection.ts`)**:
   - Dodano warstwę `'underlay'` do `LayoutLayerId`.
   - Dodano `underlayDimensionsMm(u)` wyliczającą rzeczywiste wymiary podkładu w milimetrach (`widthMm`, `lengthMm`) na podstawie `imageWidthPx`, `imageHeightPx` i `mmPerPixel`.
   - Dodano `calibrateUnderlayScale(u, p1Mm, p2Mm, actualDistanceMm)` przeliczającą rozpiętość odcinka `A–B` w pikselach obrazu (`spanPx = canvasDistMm / u.mmPerPixel`) i wyznaczającą nową skalę `mmPerPixel = actualDistanceMm / spanPx` z walidacją dodatniej odległości rzeczywistej, minimalnej rozpiętości `≥ 1 px` oraz zakresu `0,01–10000 mm/px`.
3. **Interfejs użytkownika w zakładce `5 Hala i CAD` (`src/components/studio/LayoutEditor.tsx`)**:
   - Na rzucie SVG `.cad-canvas` dodano grupę `<g className="cad-underlay" data-layer="underlay">` renderującą obraz podkładu pod siatką wyposażenia, przerywany obrys oraz etykietę `.cad-underlay-dimension` (`Podkład: nazwa (szerokość × długość mm · skala mm/px)`).
   - Na pasku **Warstwy i pomiary odległości** dodano przełącznik **Warstwa: Podkład hali** oraz przycisk **Kalibruj skalę podkładu / Zakończ kalibrację skali**.
   - W szufladzie **Parametry hali** dodano sekcję **Podkład hali i kalibracja skali** z wgrywaniem pliku (`PNG/JPG/SVG/WebP` do 3 MB), odczytem parametrów podkładu, przełącznikiem **Pokaż podkład hali**, polami **Skala podkładu [mm/px]**, **Przesunięcie podkładu X/Y [mm]**, **Przezroczystość podkładu [0.05–1]** oraz przyciskami **Wskaż 2 punkty kalibracji na rzucie**, **Dopasuj wymiary hali do podkładu** i **Usuń podkład**.
   - W trybie kalibracji dwupunktowej kliknięcie dwóch punktów `A` i `B` na rzucie wyświetla wektor `.cad-calibration-overlay` z rozpiętością w pikselach i milimetrach oraz formularz **Rzeczywista odległość A–B [mm]** + **Zastosuj kalibrację skali**.

## Dowody weryfikacji
- **Kopia zapasowa przed zmianami**: `backup/v0.4.0_przed_5_7_20261018` (`323` pliki, `0` niezgodności SHA256).
- **Testy jednostkowe (scoped)**: `node scripts/test.mjs --suite=core --test-name-pattern="5\.(3|4|5|6|7):"` — `10/10 PASS` (w tym `2` nowe testy `5.7:` obejmujące `underlayDimensionsMm`, `calibrateUnderlayScale`, błędy kalibracji oraz walidację i persystencję `facility.underlay` w `parseProject`).
- **Budowanie produkcyjne i TypeScript**: `npm.cmd run build` — `PASS`.
- **Weryfikacja UI w przeglądarce Edge CDP**:
  - `node tests/qa/verify_5_7.mjs` — `PASS` (wgranie podkładu `1500 × 1800 px`, przełączanie warstwy `Warstwa: Podkład hali`, ręczna skala `10 mm/px`, interaktywna kalibracja dwupunktowa `400 px = 8000 mm → 20 mm/px` i `30000 × 36000 mm`, przesunięcie `X=500 / Y=300 mm`, przezroczystość `0,6`, dopasowanie wymiarów hali do podkładu, `Cofnij / Ponów`, usunięcie i przywrócenie podkładu, przeładowanie z `localStorage`, brak poziomego przepełnienia dla `1440 px` i `600 px`, `0` błędów konsoli).
  - Regresja Etapu 5: `verify_5_2.mjs`, `verify_5_3.mjs`, `verify_5_4.mjs`, `verify_5_5.mjs`, `verify_5_6.mjs` — wszystkie `PASS`.
  - Zrzuty ekranu: `outputs/qa/verify_5_7_1440.png`, `outputs/qa/verify_5_7_600.png`.
- **Podręcznik użytkownika (`7.8.1`)**:
  - Zaktualizowano `Instrukcja/Podrecznik_Uzytkownika.md`, `.html` i `.pdf` oraz zweryfikowano przez `scripts/verify_manual.py outputs/qa/manual_5_7` (`26` stron, `26` obrazów, `missingImages: []`, `absentSections: []`, `blankPages: []`, `wordsOutsidePage: []`).
