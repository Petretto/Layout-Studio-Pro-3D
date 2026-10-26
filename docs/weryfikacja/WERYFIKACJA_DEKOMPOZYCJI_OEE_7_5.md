# Raport weryfikacji wdrożenia: Rozdzielenie szczegółowo modelowanych strat od rezerwy OEE (Plan 7.5)

Data odbioru: **18.10.2026**  
Status zadania: **wdrożone**  
Identyfikator planu: **ID 7.5** (Etap 7 — Walidacja różnych procesów i przygotowanie komercyjne)  
Kopia zapasowa przed wdrożeniem: `backup/v0.4.0_przed_7_5_20261018` (420 plików zweryfikowanych sumami SHA256)

---

## 1. Cel i problem inżynierski

W klasycznym podejściu do bilansowania linii czas taktu wyznaczany jest ze wzoru:
$$\text{Takt Time} = \frac{\text{Czas dostępny} \times \text{OEE}}{\text{Popyt}}$$
gdzie ryczałtowy wskaźnik OEE (np. 80–85%) odzwierciedla łącznie wszystkie straty: dostępności ($A$), wydajności ($P$) i jakości ($Q$).

Wraz z rozwojem zaawansowanego modelu procesu (szkic 6) wprowadzono szczegółowe, jawne modelowanie składowych strat w czasie symulacji:
- **Awarie maszyn i wyposażenia** (`stochasticConfig.breakdowns` — MTBF / MTTR),
- **Przezbrojenia partii produkcyjnych** (`changeoverMatrix`),
- **Przerwy kalendarzowe** (`resourceCalendars`),
- **Straty transportu montażowego** (`assemblyTransport`),
- **Blokady buforów wyjściowych** (`stationBuffers` — BBAS).

**Problem:** Jeśli inżynier ustawi w module popytu ryczałtowe OEE = 80% (rezerwując 20% czasu na straty), a w symulacji dynamicznej zdefiniuje awarie (np. 10%) i przezbrojenia (np. 8%), te same zjawiska zostaną policzone **podwójnie** (*double counting of operational losses*). Prowadzi to do sztucznego zaniżenia Taksu i niepotrzebnego przewymiarowania liczby stanowisk roboczych.

**Zadanie ID 7.5** rozwiązuje ten problem poprzez:
1. Analityczną dekompozycję strat projektu na straty modelowane jawnie w symulacji oraz rezerwę rezydualną.
2. Wykrywanie poziomu ryzyka podwójnego naliczenia strat (`none`, `moderate`, `high`).
3. Wyznaczenie skorygowanego Taksu netto (`adjustedTaktSeconds`) uwzględniającego wyłącznie straty niemodelowane dynamicznie.
4. Prezentację w interfejsie użytkownika (`DemandWizardView.tsx`) zintegrowaną z zaleceniami Lean i możliwością natychmiastowego dostosowania suwaka OEE do rezerwy rezydualnej.

---

## 2. Zrealizowane prace

### Pakiet 7.5a: Silnik analityczny dekompozycji strat OEE
- Utworzono moduł `src/core/oeeLossDecomposition.ts`:
  - `analyzeExplicitProjectLosses(project, demand)`: agreguje straty z awarii (MTBF/MTTR), przezbrojeń, przerw kalendarza i transportu.
  - `decomposeOee(demand, explicitLosses)`: wyznacza relację między ryczałtem a jawnymi stratami, oblicza rezerwę rezydualną OEE oraz porównanie Taksu nominalnego vs skorygowanego.
  - Wykrywanie ryzyka dublowania strat: reguła progowa dla jawnych strat $\ge 5\%$ i ryczałtu $\ge 10\%$.
- Testy jednostkowe w `tests/core.test.ts`:
  - Sprawdzenie braku ryzyka dla czystego procesu bez awarii.
  - Sprawdzenie poprawnej detekcji wysokiego ryzyka dla procesu z awariami MTBF/MTTR i przezbrojeniami.
  - Sprawdzenie wyższych wartości Taksu skorygowanego (`adjustedTaktSeconds > nominalTaktSeconds`).

### Pakiet 7.5b: Integracja z UI kreatora zapotrzebowania i Taksu
- Rozbudowano `src/components/demand/DemandWizardView.tsx`:
  - Dodano kartę `3. Dekompozycja Strat OEE (Plan 7.5)` w kolumnie wejściowej.
  - Wyświetlanie odznaki stanu ryzyka: `✓ Rozdział strat: Spójny`, `⚡ Ryzyko dublowania: Umiarkowane`, `⚠️ Ryzyko dublowania: Wysokie`.
  - Pasek szczegółów strat: udział awarii, przezbrojeń, przerw i transportu.
  - Przycisk szybkiego dostosowania OEE: `Dostosuj OEE (X%)`, eliminujący podwójne buforowanie jednym kliknięciem.
  - Prezentacja w karcie głównej Taksu: informacja o Takcie netto bez podwójnego naliczania i różnicy $\Delta t$.

---

## 3. Wyniki weryfikacji i testów

| Obszar | Wynik |
|---|---|
| Testy jednostkowe (`npm test -- --suite=core --test-name-pattern=7.5`) | **1 / 1 PASS (3.4 ms)** |
| Pełna suita testów (`npm test`) | **366 / 366 PASS (2.25 s)** |
| Kompilacja produkcyjna (`tsc && vite build`) | **162 moduły, 0 błędów (PASS)** |

---

## 4. Wnioski i zgodność z zasadami projektu

1. **Zasada 5 (Niezmiennik braku zmyślania pomiarów)**: Obliczenia bazują wyłącznie na jawnie zadeklarowanych w projekcie czasach MTBF/MTTR, przezbrojeniach i przerwach kalendarzowych.
2. **Lean Engineering**: Inżynier procesu otrzymuje jednoznaczną informację, gdzie w modelu zlokalizowane są straty i nie dochodzi do sztucznego przewymiarowania linii w bilansie.
