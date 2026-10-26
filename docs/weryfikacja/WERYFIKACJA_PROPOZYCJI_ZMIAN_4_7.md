# Weryfikacja propozycji zmian i sprawdzenia w symulacji bez deklaracji optimum (4.7)

- Data weryfikacji: `2026-10-16`
- Punkt planu: `4.7` — *Proponować zmiany wraz z uzasadnieniem i wynikiem sprawdzenia w symulacji; bez deklaracji gwarantowanego optimum.*
- Zamknięcie etapu: **Etap 4: Bilansowanie, takt i przepustowość — ukończony w całości (`7/7 = 100.0%`)**
- Kryteria odbioru etapu: *można porównać dodanie operatora, stanowiska i reorganizację pracy, rozróżniając szacunek zdolności od wyniku symulacji. Raport zawiera wersję danych, warunki eksperymentu i założenia kosztowe.*
- Backup przed implementacją: `backup/v0.4.0_przed_4_7_20261016` (314 plików, zweryfikowany `SHA256.txt`)

## 1. Zakres wdrożenia

1. **Silnik generowania i symulacyjnej weryfikacji propozycji zmian (`src/core/domainImprovementProposals.ts`)**:
   - **Metodologiczne zastrzeżenie braku gwarancji optimum (`NON_OPTIMUM_DISCLAIMER`)**:
     Każdy raport, prezentacja UI i eksport Markdown zawiera jawne oświadczenie: *„Propozycje zmian są generowane heurystycznie wyłącznie na podstawie jawnie zadeklarowanych zasobów, wariantów czasu, kompetencji, kopii stanowisk i buforów w szkicu 6 oraz obserwowanych dowodów z harmonogramu. Wynik sprawdzenia w symulacji weryfikuje wykonalność i efekt dla zadanych warunków eksperymentu — nie stanowi deklaracji ani dowodu gwarantowanego optimum globalnego.”*
   - **Generowanie konkretnych kandydatów na podstawie jawnych zasobów (bez zmyślania danych)**:
     - `add-team-worker` (kategoria `additional-worker`): włącza do składu zespołu (`teamWorkerIds`) zadeklarowanego pracownika z `project.workers`, który nie należał do aktywnej obsady przebiegu, wraz z rozszerzeniem dopuszczeń (`eligibleWorkerIds`) do operacji, dla których pracownik spełnia wymogi kompetencji.
     - `expand-worker-eligibility` (kategoria `additional-worker`): dopuszcza istniejącego członka zespołu posiadającego wymagane kompetencje do operacji, na której liście wykonawców był dotąd pominięty.
     - `change-staffing-variant` (kategoria `additional-worker`): przełącza operację na alternatywny jawnie zadeklarowany wariant obsady (`timeVariants`), weryfikując dostępność i kompetencje zespołu (`assertCompetentTeamExists`), bez zgadywania fikcyjnych czasów ani obsad.
     - `activate-station-copy` (kategoria `additional-station`): dopuszcza istniejącą fizyczną kopię stanowiska równoległego (`parallelStations >= 2`) posiadającą komplet wymaganego wyposażenia (`copyHasRequiredEquipment`), bądź przenosi operację między kopiami wielooperacyjnego gniazda.
     - `rebalance-work` (kategoria `additional-station` / reorganizacja pracy): uruchamia formalny silnik bilansowania `4.3` (`proposeDomainBalance(project, target, 'RPW' | 'LCR')`) na jawnie dopuszczonych kopiach stanowisk i bada w symulacji realny wpływ wyrównania obciążeń.
     - `release-blocked-worker` (kategoria `changed-layout` / polityka buforów): przełącza politykę blokowania bufora wyjściowego z zatrzymania operatora (`bbas`) na jego zwolnienie (`bbas-worker-released`), sprawdzając czy uwolnienie osoby skraca oczekiwania na innych stanowiskach.
     - `saved-variant` (kategoria wg wariantu): uwzględnia w zestawieniu warianty zapisane przez użytkownika w bibliotece wariantów `4.5`.
   - **Jednakowe warunki eksperymentu i rozróżnienie szacunku statycznego od wyniku dynamicznego**:
     - Wszystkie propozycje sprawdzane są w symulacji przy identycznych warunkach `VariantExperimentConditions` (wielkość partii, odstęp przybycia, tryb transportu JIT/configured, opcjonalne założenia kosztowe).
     - Każda propozycja zawiera pole `staticVsDynamicNote`, które wyraźnie zestawia statyczny szacunek zdolności (`staticSummary.staticCapacityPerHour` i obciążenie maks. kopii) z wynikiem symulacji dynamicznej (`throughputPerHour`, `makespanSeconds`, `averageLeadTimeSeconds`, `averageActiveWipPieces`).
     - Wynik weryfikacji jest kategoryzowany na: `improved` (skrócenie makespanu lub wzrost przepustowości), `unchanged` (brak zmiany makespanu), `regressed` (wydłużenie czasu realizacji) lub `refused` (odmowa symulacji / błąd ograniczeń).
   - **Raport Markdown propozycji (`buildImprovementProposalsMarkdownReport`)**:
     - Zawiera wersję danych: `schemat roboczy szkicu v6 (projekt źródłowy v4/v5)`.
     - Zawiera zastrzeżenie metodologiczne o braku gwarancji optimum.
     - Zawiera tabelę propozycji ze wskaźnikami przed i po zmianie, różnicami ($\Delta$), statusem weryfikacji, szczegółowym uzasadnieniem oraz dowodami z harmonogramu bazowego.
     - Odnotowuje powody pominięcia poszczególnych kategorii (np. brak nieużywanych stanowisk, brak innych wariantów obsady).

2. **Interfejs użytkownika (`src/components/studio/DomainVariantComparisonPanel.tsx`)**:
   - Przycisk `Generuj i sprawdź propozycje zmian w symulacji (4.7)`.
   - Sekcja propozycji z widocznym ostrzeżeniem `NON_OPTIMUM_DISCLAIMER` i parametrami punktu odniesienia (aktywnego szkicu 6).
   - Tabela `Tabela propozycji zmian 4.7` z kolumnami: propozycja i zakres, uzasadnienie i dowody z harmonogramu bazowego, szacunek zdolności vs wynik symulacji (status), wskaźniki w symulacji ($\Delta$ vs baza) oraz akcje.
   - Akcja `Zapisz jako wariant`: zapisuje wybraną propozycję do odizolowanej biblioteki wariantów szkicu 6.
   - Akcja `Zastosuj do szkicu 6`: aplikuje propozycję bezpośrednio do aktywnego szkicu roboczego z pełnym wsparciem historii `Cofnij dane szkicu` / `Ponów dane szkicu`.
   - Podgląd i pobieranie kompletnego raportu Markdown (`.md`).

## 2. Wykonane testy i weryfikacja

1. **Testy jednostkowe (celowane `4.7 / 4.6 / 4.5 / 4.4 / 4.3c / 4.1`)**:
   - Polecenie: `node scripts/test.mjs --suite=network '--test-name-pattern=4\.7|4\.6|4\.5|4\.4|4\.3c|4\.1'`
   - Wynik: `20/20 PASS` (w tym oba dedykowane testy punktu 4.7).
2. **Build i kontrola typów TypeScript**:
   - Polecenie: `npm.cmd run build` (`tsc && vite build`)
   - Wynik: `PASS` (czas kompilacji 4.04 s, 0 błędów).
3. **Weryfikacja UI w rzeczywistej przeglądarce Microsoft Edge (CDP)**:
   - Skrypt: `tests/qa/verify_4_7.mjs`
   - Polecenie: `node tests/qa/verify_4_7.mjs`
   - Wynik: `PASS` — sprawdzono generowanie propozycji na jawnych zasobach, weryfikację w symulacji JIT, zastrzeżenie braku gwarancji optimum, tabelę propozycji, notatkę rozróżniającą szacunek statyczny od wyniku dynamicznego, zapisanie propozycji do biblioteki wariantów, zastosowanie propozycji do szkicu 6, przywrócenie stanu pierwotnego przyciskiem `Cofnij dane szkicu`, podgląd raportu Markdown (`.md`) oraz nienaruszalność zapisów projektów 4/5 i `originalJson`.
   - Zrzut ekranu: `outputs/qa/verify_4_7.png`.

## 3. Zgodność z kryteriami odbioru Etapu 4

- **Porównanie dodania operatora, stanowiska i reorganizacji pracy**:
  Warianty i propozycje z kategorii `additional-worker`, `additional-station` oraz `rebalance-work` są sprawdzane w symulacji i zestawiane z wariantem bazowym.
- **Rozróżnienie szacunku zdolności od wyniku symulacji**:
  Wskaźniki statyczne (suma czasów, najwolniejsza kopia, statyczny pułap kopii) są konsekwentnie oddzielone od dynamicznych wyników harmonogramu (makespan, przepustowość, czasy przejścia, WIP).
- **Raport zawiera wersję danych, warunki eksperymentu i założenia kosztowe**:
  Raporty 4.5, 4.6 i 4.7 jawnie rejestrują schemat roboczy szkicu (`v6`), wersję projektu źródłowego (`v4` lub `v5`), wielkość partii, odstęp przybycia, tryb transportu oraz jawne stawki godzinowe/powierzchniowe wraz ze źródłem.
- **Brak deklaracji gwarantowanego optimum**:
  Wyraźne zastrzeżenie metodologiczne (`NON_OPTIMUM_DISCLAIMER`) jest integralną częścią modelu domenowego, interfejsu UI oraz generowanych raportów.
