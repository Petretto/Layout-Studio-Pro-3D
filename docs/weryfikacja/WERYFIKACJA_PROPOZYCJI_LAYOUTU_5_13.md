# Weryfikacja 5.13 — Automatyczna pierwsza propozycja layoutu, uwzględnienie BOM, założenia wizualne i ochrona pozycji ręcznych

**Data odbioru:** 2026-10-18  
**Pozycja planu:** `5.13` — *Po wprowadzeniu lub imporcie poprawnego procesu automatycznie pokazać pierwszą propozycję layoutu opartą na grafie operacji i wstępnym bilansie, także w docelowym modelu stanowisk. Nie wymagać osobnego przycisku do utworzenia pierwszej propozycji. Uwzględniać BOM przy prezentacji przepływu materiałów, jeśli jest dostępny; jego brak nie blokuje szkicu rozmieszczenia stanowisk. Oznaczać domyślne wymiary i wyposażenie jako założenia wizualne, bez przypisywania im zdolności technologicznej. Przy braku wymiarów hali nie deklarować dopasowania do rzeczywistej przestrzeni. Ręczne pozycje chronić przed automatycznym nadpisaniem; ponowne generowanie wymaga jawnej akcji i ostrzeżenia. Odebrać na procesach niezależnych od Eko.*  
**Status:** `wdrożone`

---

## 1. Zakres wdrożenia

1. **Automatyczna pierwsza propozycja layoutu bez osobnego przycisku**:
   - W `src/core/project.ts` w funkcji `derive(p)`: jeżeli w projekcie nie ma jeszcze obiektów layoutu (`layoutObjects.length === 0` lub `layoutMode !== 'manual'`), system automatycznie generuje początkową propozycję rozmieszczenia stanowisk na podstawie wyznaczonego bilansu i grafu operacji za pomocą `generate3DLayout`.
   - W `src/core/editing.ts` w funkcji `replaceImportedProcess(p, steps)`: po zaimportowaniu nowego procesu, jeśli layout nie był ręcznie zmodyfikowany, tryb jest ustawiany na `'auto'`, co natychmiast wyzwala aktualną propozycję layoutu.
   - Użytkownik nie musi szukać ani klikać żadnego przycisku generowania, aby zobaczyć rozmieszczenie stacji po zdefiniowaniu lub zaimportowaniu procesu.

2. **Działanie w docelowym modelu stanowisk (schemat 5)**:
   - W `src/core/stationDerivation.ts` w funkcji `deriveStationProject(input)`: dotychczas brak wyposażenia w projekcie schematu 4 skutkował błędem walidacji („layout ma 0 stołów”).
   - W ramach 5.13, gdy `layoutObjects.length === 0`, a bilans wyznaczył stanowiska, funkcja automatycznie generuje propozycję wyposażenia z trwałymi identyfikatorami stanowisk (`workstationId`), ustawiając `layoutMode: 'auto'`.
   - Gdy obiekty już istnieją (`layoutMode === 'manual'`), są one bezwzględnie zachowywane bez nadpisywania.

3. **Prezentacja przepływu materiałów z uwzględnieniem BOM**:
   - Rozszerzono `generate3DLayout(stations, type, facility, settings, steps, bom)` w `src/core/algorithms/layoutEngine.ts` o opcjonalny parametr `bom?: BOMComponent[]`.
   - Regały buforowe FIFO przypisane do danego stanowiska otrzymują w nazwie numery części z BOM (np. `Regał FIFO (WS-1 · MOT-ST-01, MOT-BG-02)`).
   - Gdy zestawienie BOM jest puste lub nieobecne, regały FIFO są oznaczane ogólnym identyfikatorem stanowiska (np. `Regał FIFO (WS-1)`), nie blokując utworzenia szkicu rozmieszczenia stanowisk.

4. **Oznaczenie założeń wizualnych (koncepcyjnych)**:
   - Rozszerzono model `LayoutObject` w `src/core/models/types.ts` o pole `isVisualAssumption?: boolean`.
   - Wszystkie automatycznie wygenerowane obiekty layoutu są oznaczane jako `isVisualAssumption: true`.
   - Zdefiniowano `VISUAL_ASSUMPTION_DISCLAIMER` w `src/core/algorithms/layoutSelection.ts`.
   - W edytorze 2D (`LayoutEditor.tsx`) i widoku 3D (`Scene.tsx`) wyświetlany jest baner informacyjny `.visual-assumption-note`, a w formularzach właściwości obiektu dodano odznakę `.badge-visual-assumption` z objaśnieniem, że domyślne gabaryty i wyposażenie stanowią założenie wizualne (koncepcyjne) i nie definiują zdolności technologicznej.

5. **Zastrzeżenie przy braku potwierdzonych wymiarów hali**:
   - Rozszerzono `FacilityConfig` w `src/core/models/types.ts` o opcjonalne pole `isConfirmed?: boolean`.
   - Zdefiniowano `FACILITY_UNCONFIRMED_NOTE` w `src/core/algorithms/layoutSelection.ts`.
   - Gdy wymiary hali nie zostały zweryfikowane skalibrowanym podkładem posadzki (`underlay.calibratedDistanceMm`) ani potwierdzone przez użytkownika (`isConfirmed`), w edytorze 2D i widoku 3D wyświetlana jest nota informująca, że model nie deklaruje dopasowania do rzeczywistej przestrzeni fizycznej obiektu.

6. **Ścisła ochrona ręcznych pozycji (`layoutMode: 'manual'`)**:
   - Jakakolwiek ręczna zmiana współrzędnych (przeciągnięcie myszą, klawisze strzałek, edycja we właściwościach) przełącza projekt w tryb `layoutMode = 'manual'`.
   - Funkcja `derive` nie nadpisuje ręcznie rozmieszczonych obiektów przy kolejnych przeliczeniach.
   - Ponowna automatyczna generacja wymaga jawnego wyboru typu układu w menu wyboru i potwierdzenia w oknie dialogowym.

7. **Odbiór na niezależnych procesach (nie Eko)**:
   - Odbiór przeprowadzono na montażu silników elektrycznych EV (`DEFAULT_MOTOR_PROJECT`, 6 operacji, układ U) oraz montażu modułów baterii EV (`DEFAULT_BATTERY_PROJECT`, 6 operacji, przepływ ciągły liniowy).

---

## 2. Wyniki testów automatycznych, pełnej regresji i budowania

- **Kopia zapasowa przed wdrożeniem:** `backup/v0.4.0_przed_5_13_20261018` (`343` pliki, `0` niezgodności SHA256 w `BACKUP_MANIFEST_SHA256.txt`).
- **Testy ukierunkowane (`node scripts/test.mjs --suite=core --test-name-pattern="5\.(3|4|5|6|7|8|9|10|13):"`):** `18/18 PASS`:
  - `5.13: automatyczna pierwsza propozycja layoutu oparta na grafie i bilansie z uwzględnieniem BOM i założeń wizualnych` — PASS
  - `5.13: automatyczna propozycja w docelowym modelu stanowisk v5 oraz ochrona pozycji ręcznych (baterie EV)` — PASS
  - Regresja `5.3`–`5.10` (`16` testów) — PASS
- **Budowanie produkcyjne (`npm.cmd run build`):** `tsc && vite build` — PASS (`0` błędów TypeScript, czas `7,79 s`).

---

## 3. Odbiór UI w przeglądarce Edge CDP (`tests/qa/verify_5_13.mjs`)

Przeprowadzono odbiór w bezgłowej przeglądarce Microsoft Edge przez CDP (`node tests/qa/verify_5_13.mjs`):
1. **Automatyczna propozycja layoutu w 2D**: natychmiast po wczytaniu projektu bez layoutu generowane są stoły, bufory FIFO, strefy operatorów i linie relacji technologicznych bez klikania przycisków generowania.
2. **Noty ostrzegawcze i założenia wizualne**: obecność banera `.visual-assumption-note` i `.facility-unconfirmed-note` na górze widoku 2D i 3D.
3. **Uwzględnienie BOM w etykietach FIFO**: etykiety regałów buforowych FIFO zawierają numery części `MOT-ST-01, MOT-BG-02` dla silników EV oraz `CELL-21700, BUS-CU-01, BMS-MST-01` dla baterii EV.
4. **Ochrona pozycji ręcznych**: po przesunięciu obiektu (np. `TBL-WS-1` klawiszem strzałki) projekt przechodzi w tryb `manual`, a nowe współrzędne są zachowane i nie ulegają nadpisaniu.
5. **Widok 3D i odznaka założeń**: w widoku 3D formularz edycji obiektu zawiera odznakę `.badge-visual-assumption`.
6. **Responsywność i brak błędów konsoli**: brak przepełnienia poziomego przy szerokości `1440px` (`outputs/qa/verify_5_13_desktop_2d.png`, `verify_5_13_desktop_3d.png`) oraz `600px` (`outputs/qa/verify_5_13_mobile_3d.png`), przy `0` błędach konsoli CDP.
7. **Docelowy model stanowisk v5**: w `Warsztacie stanowisk v5` migracja z bieżącego projektu bez manualnego layoutu automatycznie inicjalizuje wyposażenie bez błędu „layout ma 0 stołów”.
8. **Aktualizacja Podręcznika Użytkownika**: zaktualizowano `Instrukcja/Podrecznik_Uzytkownika.md`, `.html` i `.pdf` (`py -3.10 scripts/verify_manual.py`: `30` stron, `30` obrazów, `0` brakujących zasobów, `0` pustych stron, `0` słów poza stroną, zrzuty `outputs/qa/manual_5_13`).
