# Weryfikacja zestawienia wydajności, czasu przejścia, WIP, obsady, powierzchni i kosztów wariantów (4.6)

- Data weryfikacji: `2026-10-16`
- Punkt planu: `4.6` — *Zestawiać wydajność, czas przejścia, WIP, obsadę, powierzchnię i koszty przy jawnych stawkach oraz założeniach*
- Powiązane punkty: `4.1` (statyczne vs dynamiczne obciążenie i mianowniki), `4.4` (ograniczenia przepustowości i nierozdzielanie oczekiwań mieszanych), `4.5` (porównywanie zapisanych wariantów przy wspólnych warunkach eksperymentu)
- Backup przed implementacją: `backup/v0.4.0_przed_4_6_20261016` (311 plików, zweryfikowany `SHA256.txt`)

## 1. Zakres wdrożenia

1. **Synteza wskaźników porównawczych (`src/core/domainVariantComparison.ts`)**:
   - **Wydajność statyczna vs dynamiczna**:
     - `staticSummary.staticCapacityPerHour`: teoretyczny pułap najwolniejszej kopii stanowiska (`3600 / maxStaticCopyLoadSeconds` `[szt./h]`, `null` przy braku pełnego wyboru obsady), prezentowany jawnie jako szacunek statyczny (nie dowód przepustowości).
     - `dynamic.throughputPerHour` oraz `deltaThroughputPerHour`: rzeczywista wydajność partii z harmonogramu zdarz-po-zdarzeniu (`(batch / makespanSeconds) * 3600` `[szt./h]`) i różnica względem wariantu bazowego.
   - **Czas przejścia i sprawność przepływu**:
     - Od przybycia sztuki (`job.finish - job.arrival`): średni (`averageLeadTimeSeconds`), zakres (`minLeadTimeSeconds`–`maxLeadTimeSeconds`) oraz różnica względem bazy (`deltaAverageLeadTimeSeconds`).
     - W procesie od startu pierwszej operacji (`job.finish - Math.min(...job.starts)`): średni (`averageProcessingSpanSeconds`), zakres (`minProcessingSpanSeconds`–`maxProcessingSpanSeconds`) oraz różnica względem bazy (`deltaAverageProcessingSpanSeconds`).
     - Praca netto na sztukę (`netProcessingPerPieceSeconds = netProcessingSeconds / batch`) oraz sprawność przepływu (`flowEfficiencyRatio = netProcessingPerPieceSeconds / averageProcessingSpanSeconds`).
   - **WIP (produkcja w toku dla całych wyrobów w oknie `[0, makespanSeconds]`)**:
     - W procesie (`[firstStart_j, finish_j)`): średni ważony czasem (`averageActiveWipPieces = sum(finish_j - firstStart_j) / makespanSeconds`), maksymalna liczba równoległych sztuk (`maxActiveWipPieces` wyznaczana algorytmem zamiatania dla przedziałów półotwartych) oraz `deltaAverageActiveWipPieces`.
     - W systemie od przybycia (`[arrival_j, finish_j)`, prawo Little’a): średni (`averageSystemWipPieces`), maksymalny (`maxSystemWipPieces`) oraz `deltaAverageSystemWipPieces`.
   - **Obsada i stanowiska (wykorzystanie zasobów w horyzoncie makespanu)**:
     - Powiązane z `calculateScheduleStateMetrics` (`3.7`/`4.1`): łączny czas aktywności zespołu (`workerActiveSeconds`), średnie i maksymalne wykorzystanie zespołu (`averageTeamWorkerUtilization`, `maxTeamWorkerUtilization`), łączny czas zajętości aktywnych kopii stanowisk (`stationOccupiedSeconds`) oraz średnia i maksymalna zajętość kopii (`averageActiveCopyOccupancy`, `maxActiveCopyOccupancy`).
   - **Powierzchnia (rozróżnienie obrysu obiektów od hali bez zgadywania wymiarów)**:
     - `facilityAreaSqm`: powierzchnia hali (`widthMm * lengthMm / 1_000_000` `[m²]`).
     - `objectsFootprintSqm` i `deltaObjectsFootprintSqm`: suma powierzchni rzutów obiektów `layoutObjects` (`widthMm * lengthMm / 1_000_000` `[m²]`).
     - `boundingBoxAreaSqm`: powierzchnia prostokąta otaczającego wszystkie obiekty `layoutObjects` z uwzględnieniem obrotu `rotationDeg` (`null`, gdy `layoutObjects.length === 0` — program nie wymyśla wymiarów stanowisk przy pustej liście obiektów).
   - **Koszty przy jawnych stawkach oraz założeniach (`VariantCostAssumptions` i `VariantCostEvaluation`)**:
     - Walidacja `validateCostAssumptions`: wymaga jawnej waluty (`PLN` | `EUR` | `USD`), podstawy (`confirmed` | `assumed`), trybu rozliczania czasu zasobów (`committed-makespan` — zaangażowanie zespołu i aktywnych kopii w horyzoncie makespanu vs `active-time` — wyłącznie czas aktywnej pracy/zajętości), nieujemnych stawek (`operatorHourlyRate`, `stationHourlyRate`, `floorSqmRate`) oraz niepustego opisu źródła/założeń (`source`), gdy podano którąkolwiek stawkę.
     - Gdy nie podano stawek, `costEvaluation` pozostaje `null` (brak domyślnych lub ukrytych stawek godzinowych i powierzchniowych).
     - Niezależnie od stawek godzinowych prezentowany jest jednostkowy koszt materiałowy z BOM (`bomUnitCost = sum(quantityPerUnit * unitCost)` oraz `bomBatchCost`), o ile projekt posiada pozycje BOM.
   - **Eksport i podgląd raportu Markdown (`buildVariantComparisonMarkdownReport`)**:
     - Generuje kompletny raport `.md` ze wspólnymi warunkami eksperymentu, jawnymi stawkami i założeniami kosztowymi, tabelą syntezy `4.6` oraz sekcją ograniczeń przepustowości `4.4` i kontroli czynników `4.5`.

2. **Interfejs użytkownika (`src/components/studio/DomainVariantComparisonPanel.tsx`)**:
   - Sekcja `Jawne stawki kosztowe i założenia porównania (opcjonalne — 4.6)` z polami waluty, podstawy (`assumed`/`confirmed`), trybu rozliczania czasu zasobów, stawek operatora `[/h]`, stanowiska `[/h]`, powierzchni `[/m²]` oraz źródła/założeń.
   - Każda zmiana stawek lub założeń kosztowych natychmiast unieważnia poprzedni wynik porównania do czasu ponownego uruchomienia symulacji.
   - Tabela `Synteza wskaźników 4.6: wydajność, czas przejścia, WIP, obsada, powierzchnia i koszty` oraz przyciski `Pobierz raport porównania (.md)` i `Pokaż/ukryj podgląd raportu (.md)`.

## 2. Wykonane testy i weryfikacja

1. **Testy jednostkowe (celowane `4.6 / 4.5 / 4.4 / 4.3c / 4.1`)**:
   - Polecenie: `node scripts/test.mjs --suite=network '--test-name-pattern=4\.6|4\.5|4\.4|4\.3c|4\.1'`
   - Wynik: `18/18 PASS`.
2. **Okresowa pełna regresja (po 3 ukończonych pakietach od `4.3c`: `4.4`, `4.5`, `4.6` zgodnie z `AGENTS.md`)**:
   - Polecenie: `node scripts/test.mjs`
   - Wynik: `305/305 PASS` (`fail 0`, `skipped 0`).
3. **Build i kontrola typów TypeScript**:
   - Polecenie: `npm.cmd run build` (`tsc && vite build`)
   - Wynik: `PASS`.
4. **Weryfikacja UI w rzeczywistej przeglądarce Microsoft Edge (CDP)**:
   - Polecenie: `node tests/qa/verify_4_6.mjs`
   - Wynik: `PASS` — sprawdzono przebieg bez stawek (brak zgadywania kosztów + koszt BOM/szt.), odmowę walidacji przy wpisaniu stawki bez źródła/założenia, pełne porównanie 4 wariantów z jawnymi stawkami (`120 PLN/h` operator, `60 PLN/h` stanowisko, `50 PLN/m²` powierzchnia), tabelę syntezy `4.6`, podgląd raportu Markdown (`.md`) oraz nienaruszalność zapisów `layout-studio-v3`, `layout-studio-stations-v5` i `originalJson`.
   - Zrzut ekranu: `outputs/qa/verify_4_6.png`.

## 3. Ograniczenia

- Zestawienie `4.6` operuje na zapisanych wariantach szkicu `6` (odizolowanych od aktywnych projektów `4/5`).
- Koszt powierzchni obiektów (`objectsFootprintCost`) jest wyliczany wyłącznie wtedy, gdy wariant posiada zdefiniowane obiekty w `layoutObjects` oraz podano jawną stawkę `floorSqmRate`; przy pustym `layoutObjects` koszt obrysu obiektów pozostaje `null` (nie jest utożsamiany z powierzchnią całej hali `facilityAreaSqm`).
