# Model stanów i czasów trwania procesu — 3.6

Stan na: 2026-10-15
Zadanie: PLAN 3.6 — Pokazywać stany pracy, oczekiwania na materiał/operatora, blokady wyjścia i transportu wraz z czasami ich trwania.

## 1. Cel i zakres modelu

Celem punktu 3.6 jest jednoznaczne wyodrębnienie i sklasyfikowanie stanów, w jakich znajdują się korpusy, stanowiska, pracownicy i urządzenia transportowe podczas realizacji symulacji procesu w Szkicu 6, oraz udostępnienie precyzyjnych czasów trwania tych stanów:
1. **Stan pracy (processing)** — faktyczne wykonywanie operacji montażowej na korpusie lub przygotowania podzespołu:
   - Czas trwania brutto (`workDuration = endSeconds - startSeconds`),
   - Czas trwania netto (`netWorkDuration` — bez przerw kalendarzowych),
   - Czas przerw kalendarzowych w trakcie operacji (`pauseDuration`).
2. **Stany oczekiwania (waiting)** — czas od osiągnięcia gotowości technologicznej operacji do jej faktycznego uruchomienia (`waitDuration = waitSeconds`):
   - **Brak operatora (`workers`)** — oczekiwanie na dostępność wymaganej liczby pracowników spełniających kompetencje i profil obecności,
   - **Brak materiału lub podzespołu (`material`, `subassembly`)** — oczekiwanie na przybycie kolejnej dostawy materiału lub zakończenie i dostarczenie partii podzespołu,
   - **Transport międzyoperacyjny (`transport`)** — czas dojazdu wózków lub czas fizycznego przewozu korpusu,
   - **Brak bufora wejściowego (`buffer`)** — brak wolnego miejsca w zadeklarowanym buforze wejściowym stacji docelowej,
   - **Zajętość stanowiska, wyposażenia lub korpusu (`station`, `same-job`, `equipment`, `body`)** — oczekiwanie na zwolnienie kopii stanowiska, wymaganych urządzeń lub zakończenie poprzedniej operacji na korpusie,
   - **Kalendarz zasobów (`calendar`)** — oczekiwanie na rozpoczęcie zmiany roboczej lub zakończenie przerwy.
3. **Stany blokady wyjścia (output blocking)** — stan po zakończeniu pracy operacji przed opuszczeniem stanowiska:
   - **Blokada buforowa (`blockedSeconds`)** — przetrzymanie wyrobu na stanowisku z powodu braku miejsca w buforze wyjściowym lub u odbiorcy:
     - W polityce `bbas`: stanowisko, wyposażenie i operator pozostają zablokowani,
     - W polityce `bbas-worker-released`: stanowisko i wyposażenie pozostają zablokowane, a operator zostaje zwolniony po zakończeniu pracy.
   - **Lokalne oczekiwanie korpusu (`continuationWaitSeconds`)** — zatrzymanie korpusu na tej samej kopii stanowiska do momentu uruchomienia kolejnej lokalnej operacji.
4. **Stany transportu montażu (assembly transport)**:
   - **Przewóz ładunku (`transfer`)** — fizyczny przewóz korpusu lub partii podzespołu między stanowiskami,
   - **Dojazd bez ładunku (`approach`)** — przejazd pustego wózka ze stanowiska postojowego do stanowiska załadunku,
   - **Powrót bez ładunku (`return`)** — powrót pustego wózka po rozładunku na stanowisko początkowe/bazowe.

## 2. Niezmienniki analityczne

1. **Zachowanie bilansu czasowego partii**:
   - Dla każdej operacji: `startSeconds = readySeconds + waitDuration (+ transportDuration jeśli dotyczy)`.
   - Dla podziału przyczyn oczekiwania: suma wag cząstkowych (`partitioned`) w rozbiciu na przyczyny dokładnie sumuje się do `totalWaitSeconds` partii.
2. **Zachowanie bilansu stanowiska**:
   - Dla każdej kopii stanowiska: `makespanSeconds = totalOccupiedTimeSeconds + idleTimeSeconds`.
   - `totalOccupiedTimeSeconds = processingTimeSeconds + blockedTimeSeconds + continuationWaitTimeSeconds`.
3. **Zachowanie bilansu pracownika**:
   - Dla każdego pracownika: `totalActiveTimeSeconds = workTimeSeconds + heldBlockTimeSeconds + transportTimeSeconds`.
   - `makespanSeconds = totalActiveTimeSeconds + pauseTimeSeconds + idleTimeSeconds`.
4. **Brak dopowiadania stanów**:
   - Jeśli operacja nie czekała (`waitSeconds === 0`), nie przypisuje się jej sztucznych przyczyn oczekiwania.
   - Jeśli wyjście nie było zablokowane (`blockedSeconds === undefined || blockedSeconds === 0`), czas blokady wynosi 0.
   - W trybie JIT czasy transportu fizycznego wynoszą 0.

## 3. Pakiety wdrożeniowe

- **3.6a (2026-10-15)**: Moduł analityczny agregacji stanów i czasów trwania (`src/core/scheduleStateMetrics.ts`):
  - Obliczanie sumarycznych i jednostkowych czasów: praca, oczekiwania, blokady, transport.
  - Zestawienia dla całej partii, per stanowisko i per operator.
  - Testy jednostkowe/integracyjne w `tests/network.test.ts`.
- **3.6b (2026-10-15)**: Prezentacja w interfejsie UI Studio (`DomainWorkerSchedulePanel.tsx`):
  - Karta podsumowania stanów procesu i udziałów czasowych (`[aria-label="Podsumowanie stanów procesu i czasów trwania"]`).
  - Rozbicie przyczyn oczekiwania bez podwójnego liczenia (`[aria-label="Zestawienie przyczyn oczekiwania"]`).
  - Dedykowane kolumny w tabeli przebiegu z jawnym czasem trwania pracy i blokad (`Czas pracy [s]`, `Blokada [s]`).
  - Inspekcja obciążenia i stanów stanowisk oraz pracowników (`[aria-label="Inspekcja wykorzystania i stanów stanowisk"]`, `[aria-label="Inspekcja aktywności i stanów pracowników"]`).
  - Odbiór Edge CDP (`outputs/qa/verify_3_6b.png`, `outputs/qa/verify_3_6b_inspections.png`) i pełna regresja 266/266 PASS.
