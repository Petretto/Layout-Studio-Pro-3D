# Weryfikacja stanów i czasów trwania procesu — 3.6

Stan na: 2026-10-15
Zadanie: PLAN 3.6 — Pokazywać stany pracy, oczekiwania na materiał/operatora, blokady wyjścia i transportu wraz z czasami ich trwania.

## 1. Zakres pakietu 3.6a (2026-10-15)

Wprowadzono moduł analityczny `src/core/scheduleStateMetrics.ts`:
- Klasyfikacja przyczyn oczekiwania do kategorii: `workers` (operator), `material` (zaopatrzenie/podzespoły), `transport` (dojazd/przewóz), `buffer` (bufor wejściowy), `station` (stanowisko/wyposażenie/korpus) oraz `calendar` (przerwy/zmiany).
- Obliczanie rozbicia oczekiwań: `partitioned` (dokładny podział sumujący się do całkowitego czasu oczekiwania partii) oraz `presence` (czas trwania obecności danej przyczyny).
- Obliczanie czasów trwania dla każdego wykonania operacji (`RunStateDurations`): czas pracy brutto, czas pracy netto, pauzy kalendarzowe, czas oczekiwania, czas blokady wyjścia (`blockedDuration`), czas oczekiwania lokalnego (`continuationWaitDuration`) oraz czas transportu.
- Obliczanie zagregowanych metryk per stanowisko i kopia (`StationStateMetrics`): czas przetwarzania, czas blokady, czas oczekiwania lokalnego, czas całkowitego zajęcia, czas bezczynności (`idleTimeSeconds`) oraz wskaźniki wykorzystania (`occupancyRatio`, `processingRatio`).
- Obliczanie zagregowanych metryk per pracownik (`WorkerStateMetrics`): czas pracy montażowej, czas zatrzymania przy blokadzie (`heldBlockTimeSeconds` w polityce `bbas`), czas udziału w ruchach transportowych (`transportTimeSeconds`), czas przerw kalendarzowych, całkowity czas aktywności oraz wskaźnik aktywności (`activityRatio`).
- Obliczanie metryk transportu (`TransportStateMetrics`): liczba ruchów oraz sumaryczny czas przewozów (`transfer`), dojazdów (`approach`) i powrotów (`return`).
- Złożona struktura podsumowania partii (`ScheduleStateSummary`).

## 2. Wyniki weryfikacji 3.6a

- **Backup**: utworzono i zweryfikowano niezależnie SHA256: `backup/v0.4.0_przed_3_6a_20261015` (280 plików).
- **Testy jednostkowe w `tests/network.test.ts`**:
  - `3.6a: obliczanie czasów trwania stanów, oczekiwań, blokad i ruchów transportowych dla symulacji` — PASS.
  - `3.6a: podział przyczyn oczekiwania zachowuje dokładną sumę całkowitego oczekiwania partii` — PASS (potwierdzono ścisłe sumowanie wag cząstkowych do całkowitego `totalWaitSeconds` oraz klasyfikację wszystkich przyczyn).
  - `3.6a: metryki stanu stanowisk i pracowników rozróżniają blokady bbas, oczekiwanie lokalne i transport` — PASS (potwierdzono przetrzymanie operatora w blokadzie `bbas`, uwzględnienie czasów dojazdów i powrotów w bilansie pracownika oraz czasy zajęcia i bezczynności stanowisk).
- **Zestaw testów celowanych**:
  - `node scripts/test.mjs --suite=network --test-name-pattern="3\.6"`: **3/3 PASS** (czas: 0,16 s).
  - `node scripts/test.mjs --suite=network --test-name-pattern="3\.5"`: **69/69 PASS** (czas: 0,40 s).
- **Kompilacja i build**:
  - `node node_modules/typescript/bin/tsc --noEmit`: PASS, 0 błędów typowania.
  - `npm run build`: PASS (czas: 2,66 s).

Status 3.6: **w trakcie** (zakończono pakiet 3.6a).
Kolejny krok: **3.6b** — prezentacja metryk stanów i czasów trwania w interfejsie UI Studio (`DomainWorkerSchedulePanel.tsx`), weryfikacja Edge CDP i zbiorczy odbiór 3.6.
