# Raport weryfikacji wdrożenia: Zmienność czasów, awarie i powtarzalne serie eksperymentów Monte Carlo (Plan 7.4)

Data odbioru: **18.10.2026**  
Status zadania: **wdrożone**  
Identyfikator planu: **ID 7.4** (Etap 7 — Walidacja różnych procesów i przygotowanie komercyjne)  
Kopia zapasowa przed wdrożeniem: `v0.4.0_przed_7_4_20261018` (1638 plików zweryfikowanych sumami SHA256)

---

## 1. Cel i zakres implementacji

Zadanie **ID 7.4** miało na celu wprowadzenie do silnika symulacji procesu produkcyjnego (`DomainProjectV6`, szkic 6) probabilistycznego modelowania niepewności i zaburzeń produkcyjnych:
1. **Deterministyczny generator liczb pseudolosowych (PRNG)**:
   - Implementacja algorytmu PRNG o wysokiej jakości (SplitMix32 / Mulberry32) ze ścisłą powtarzalnością wyników dla tego samego ziarna losowego (`seed`).
   - Gwarancja niezmiennika Zasady 5: to samo ziarno daje w 100% identyczny, powtarzalny bitowo wynik symulacji Monte Carlo.
   - Obsługa rozkładów prawdopodobieństwa:
     - `uniform` (jednostajny: min, max),
     - `normal` (Gaussa: transformacja Boxa-Mullera ze średnią i odchyleniem standardowym),
     - `triangular` (trójkątny: min, dominanta/mode, max),
     - `exponential` (wykładniczy dla modelowania czasu do awarii MTBF oraz napraw MTTR),
     - `lognormal` (logarytmiczno-normalny dla asymetrycznych czasów operacji ręcznych).
2. **Model zmienności czasów operacji (`DurationVariabilityConfig`)**:
   - Definicja rozkładu i mnożników lub wskaźnika zmienności dla operacji produkcyjnych.
   - Zachowanie podziału na pracę ręczną i maszynową oraz obecność operatora przy losowaniu zaburzeń czasu.
3. **Model awarii maszyn i wyposażenia (`EquipmentBreakdownModel`)**:
   - Parametry MTBF (Mean Time Between Failures) i MTTR (Mean Time To Repair) definiowane dla konkretnych stanowisk lub globalnie.
   - Modelowanie napraw: czasy stałe, wykładnicze lub o rozkładzie normalnym.
   - Wstrzykiwanie przerw awaryjnych do kalendarzy stanowisk i zwalnianie/blokowanie zasobów w trakcie awarii.
4. **Wielokrotne replikacje Monte Carlo i agregacja statystyczna**:
   - Automatyczny runner serii eksperymentów `runMonteCarloSimulation` generujący `N` powtórzeń (domyślnie 15-20 replikacji).
   - Obliczanie statystyk: Min, Max, Średnia, Mediana, Odchylenie standardowe (StdDev), kwantyle p10, p90, p95 (90% i 95% przedziały ufności).
   - Analiza wąskich gardeł (Bottleneck Frequency): zliczanie, które stanowiska i operacje stawały się ograniczeniem linii w poszczególnych iteracjach i jaki % czasu.
5. **Kompatybilność wsteczna i izolacja (Zasada 4 i Zasada 6)**:
   - Gdy `stochasticConfig` jest niezdefiniowany lub `enabled: false`, symulacja zachowuje się w 100% deterministycznie i bez zmian w stosunku do poprzednich wydań.
6. **Interfejs użytkownika w panelu Studio**:
   - Komponent `DomainStochasticSimulationPanel.tsx` wbudowany w widok szkicu 6 (`DomainDraftPanel.tsx`).
   - Interaktywny konfigurator rozkładów, generator ziaren PRNG, edytor MTBF/MTTR, pasek postępu replikacji oraz estetyczne karty wyników i tabelaryczne zestawienia.

---

## 2. Zrealizowane pakiety prac

### Pakiet 7.4a: Silnik stochastyczny, PRNG, perturbacja projektu i statystyki Monte Carlo
- Utworzono moduł `src/core/stochasticSimulation.ts`:
  - Klasa `DeterministicRNG` (SplitMix32 z metodami `next()`, `uniform()`, `normal()`, `triangular()`, `exponential()`, `logNormal()`).
  - Typy: `DurationVariabilityConfig`, `EquipmentBreakdownModel`, `StochasticSimulationConfig`, `StochasticIterationResult`, `StochasticSummaryReport`.
  - Funkcje: `validateStochasticConfig`, `sampleDuration`, `computePercentileStats`, `buildStochasticSummary`, `perturbProjectForIteration`, `runMonteCarloSimulation`.
- Rozszerzono `src/core/domainProject.ts`:
  - Dodano opcjonalne pole `stochasticConfig?: StochasticSimulationConfig` do interfejsu `DomainProjectV6`.
  - Dodano walidację konfiguracji w `parseDomainProjectV6(raw)` oraz usuwanie ze starszych migrowanych struktur w `prepareDomainMigration`.
- Wdrożono testy w `tests/core.test.ts`:
  - Test generatora `DeterministicRNG` (powtarzalność tego samego ziarna, rozbieżność dla różnych ziaren, weryfikacja granic rozkładów).
  - Test agregacji statystycznej kwantyli i raportu podsumowującego `StochasticSummaryReport`.
  - Test walidacji schematu w `DomainProjectV6`.

### Pakiet 7.4b: Integracja z harmonogramem, poprawa tolerancji float i testy integracyjne
- Rozwiązano problem artefaktów zaokrągleń IEEE 754 w `src/core/workProjection.ts`:
  - Wprowadzono tolerancję `EPSILON = 1e-9` przy porównywaniu `remaining <= EPSILON` w oknach kalendarzy, zapobiegając fałszywym zakleszczeniom `calendar-exhaustion` przy ułamkowych sekundach generowanych przez rozkłady probabilistyczne.
- Dodano kompleksowy test weryfikacyjny w `tests/network.test.ts`:
  - Wykonanie 15 powtórzeń Monte Carlo z ziarnem 42, zmiennością trójkątną czasów operacji (±15%) oraz awariami maszyny na stanowisku ST-1 (MTBF = 120s, MTTR = 20s).
  - Weryfikacja poprawności statystyk: `min <= p10 <= median <= mean <= p90 <= max`.
  - Weryfikacja bitowej powtarzalności: dwie niezależne serie z identycznym ziarnem 42 zwracają w 100% identyczny wynik `summary1 === summary2`.
  - Weryfikacja rozbieżności z innym ziarnem: ziarno 999 zwraca inne czasy realizacji niż ziarno 42.

### Pakiet 7.4c: Interfejs użytkownika w Studio i integracja z panelem szkicu 6
- Utworzono komponent `src/components/studio/DomainStochasticSimulationPanel.tsx`:
  - Sekcja parametrów PRNG: aktywacja stochastyki, wybór liczby replikacji, wprowadzanie ziarna losowego z przyciskiem szybkiego losowania `🎲 Losuj`.
  - Sekcja zmienności czasów operacji: rozwijana lista rozkładów (`triangular`, `normal`, `uniform`, `lognormal`, `none`) oraz dynamiczne pola mnożników/odchylenia standardowego.
  - Sekcja awarii maszyn (MTBF / MTTR): tabela stanowisk z możliwością przypisania parametrów niezawodnościowych do konkretnego stanowiska lub globalnie dla linii.
  - Pasek narzędzi z obsługą historii `Cofnij / Ponów` (`canUndo`, `canRedo`) oraz zapisem do draftu `localStorage`.
  - Kontrolki wykonania eksperymentu Monte Carlo z paskiem postępu replikacji w czasie rzeczywistym.
  - Karty wyników ze wskaźnikami Makespanu i Throughputu (średnia, odchylenie standardowe, p10–p90, p95).
  - Tabela częstotliwości występowania wąskich gardeł (Bottlenecks) z wizualnymi paskami procentowego udziału stacji.
  - Rozwijana lista szczegółowych wyników poszczególnych iteracji.
- Wpięto komponent do `src/components/studio/DomainDraftPanel.tsx`.

---

## 3. Wyniki testów i weryfikacji

| Pakiet / Suita | Liczba testów | Wynik | Czas wykonania |
|---|---|---|---|
| `npm test -- --suite=core` | 89 / 89 | **PASS** | 0.72 s |
| `npm test -- --suite=network` | 276 / 276 | **PASS** | 2.04 s |
| **Pełna suita regresyjna (`npm test`)** | **365 / 365** | **PASS** | **2.08 s** |
| Kompilacja TypeScript & Vite (`npm run build`) | 162 moduły | **PASS** | 5.59 s |

---

## 4. Wnioski i zgodność z zasadami projektu

1. **Zasada 4 (Zgodność wsteczna)**: Projekty bez konfiguracji stochastycznej zachowują dotychczasowe deterministyczne harmonogramy co do ułamka sekundy.
2. **Zasada 5 (Niezmiennik braku zmyślania i determinizm)**: Wyniki symulacji Monte Carlo są ściśle powtarzalne dla podanego ziarna PRNG; żadne losowe liczby nie modyfikują pierwotnych bazowych czasów standardowych wyrobów.
3. **Zasada 6 (Oddzielenie logiki od widoku 3D)**: Silnik stochastyczny działa w czystym TypeScript w warstwie `src/core`, niezależnie od Three.js i renderowania sceny.
