# Model buforów i zaopatrzenia materiałowego (PLAN 3.5)

## 1. Cel i zakres
Dokument definiuje kontrakt danych dla punktu **3.5** (`PLAN_ROZWOJU.md`):
- Ograniczona pojemność buforów stanowisk (wejściowych i wyjściowych) oraz reguły blokowania i zwalniania stanowisk.
- Zaopatrzenie montażu materiałami: jawny zapas początkowy, zużycie, wielkość partii dostawy oraz harmonogram/częstotliwość dostaw, zapewniające ciągłość produkcji bez przerw.
- **Bez modelowania czasu, kalendarzy, obciążenia czy rezerwacji operatorów magazynu** (zgodnie z decyzjami 2026-10-09 i AGENTS.md).
- **Bez wyprowadzania parametrów zaopatrzenia automatycznie z BOM czy transportu** — wartości są jawne i sprawdzalne.

## 2. Model buforów stanowisk (`StationBuffersV6`)
Pojemność bufora określa maksymalną liczbę jednostek wyrobów/korpusów, które mogą oczekiwać przed rozpoczęciem operacji (bufor wejściowy) lub po jej zakończeniu przed przekazaniem do kolejnego etapu (bufor wyjściowy).

### 2.1. Kontrakt struktury
Każdy wpis w rejestrze konfiguracji buforów dotyczy konkretnego stanowiska (i opcjonalnie konkretnej kopii stanowiska):
- `stationId`: identyfikator istniejącego stanowiska w `project.stations`.
- `copy`: numer kopii (jeśli stanowisko ma ich kilka) lub `null` (gdy konfiguracja dotyczy wszystkich kopii danego stanowiska).
- `inputCapacity`: maksymalna liczba jednostek w buforze wejściowym (`null` oznacza bufor nieograniczony, domyślny). Gdy podana: liczba całkowita $\ge 0$.
- `outputCapacity`: maksymalna liczba jednostek w buforze wyjściowym (`null` oznacza bufor nieograniczony, domyślny). Gdy podana: liczba całkowita $\ge 0$.
- `blockingPolicy`: reguła blokowania stanowiska przy zapełnieniu bufora wyjściowego:
  - `'bbas'` (Blocking Before Service / Brak miejsca na wyjściu uniemożliwia zwolnienie gniazda po zakończeniu operacji; stanowisko i ewentualne urządzenia/narzędzia pozostają zajęte dopóki bufor nie zwolni miejsca).
  - `'bbas-worker-released'` (Stanowisko i korpus są zablokowane na stanowisku, lecz operator zostaje zwolniony do innej pracy, o ile technologia nie wymaga jego stałej obecności).
  Domyślnie: `'bbas'`.

### 2.2. Inwarianty i walidacja
1. `stationId` musi istnieć w projekcie.
2. Jeśli `copy` jest określone, musi mieścić się w zakresie $1 \dots \text{parallelStations}$.
3. Wartości pojemności (`inputCapacity`, `outputCapacity`) muszą być liczbami całkowitymi $\ge 0$ lub `null` (brak limitu).
4. Nie dopuszcza się duplikatów konfiguracji dla tej samej pary `(stationId, copy)`.
5. Brak konfiguracji dla stanowiska oznacza brak ograniczeń pojemności (wsteczna kompatybilność ze wszystkimi istniejącymi projektami).

---

## 3. Model zaopatrzenia materiałowego (`MaterialSupplyV6`)
Zaopatrzenie montażu modeluje dostępność komponentów/materiałów przy stanowiskach montażowych.

### 3.1. Zasady domenowe
- Zgodnie z AGENTS.md: magazynierzy nie mają kalendarzy, rezerwacji ani czasu pracy.
- Zaopatrzenie to czysta dostępność materiałowa:
  - Zapas początkowy na stanowisku/punkcie (ilość dostępna w chwili $t = 0$).
  - Zużycie na sztukę wyrobu / operację.
  - Dostawy uzupełniające: każda dostawa zwiększa stan zapasu o określoną wielkość partii w określonym czasie (harmonogram dostaw cyklicznych lub jawna lista zdarzeń dostaw).
- W chwili startu operacji wymagającej materiału:
  - Sprawdzany jest bieżący stan zapasu.
  - Jeśli zapas jest wystarczający: materiał jest atomowo pobierany w ilości jednostkowej, a operacja rozpoczyna pracę.
  - Jeśli zapas jest niewystarczający: operacja przechodzi w stan oczekiwania na materiał (do nadejścia kolejnej dostawy uzupełniającej).
- Tryb JIT („Symulacja bez transportu — wszystko dostępne just in time”):
  - W trybie JIT zaopatrzenie materiałowe jest traktowane jako zawsze dostępne bez opóźnień.

### 3.2. Kontrakt struktury
- `items`: lista konfiguracji zaopatrzenia komponentów:
  - `id`: unikalny identyfikator wpisu.
  - `componentId`: identyfikator komponentu (np. z BOM lub unikalna nazwa materiału).
  - `targetStationId`: identyfikator stanowiska odbiorczego.
  - `initialStock`: zapas początkowy (liczba $\ge 0$).
  - `unit`: jednostka miary (np. `szt.`, `kg`).
  - `deliverySchedule`:
    - `kind: 'periodic'`: `batchQuantity` (wielkość partii dostawy $> 0`), `intervalSeconds` (częstotliwość/odstęp dostaw $> 0$), `firstDeliverySeconds` (czas pierwszej dostawy $\ge 0$).
    - `kind: 'explicit-deliveries'`: lista dostaw `{ deliveryTimeSeconds: number; quantity: number }`.
  - `source`: opis źródła danych (wymóg identyfikowalności danych).

### 3.3. Inwarianty i walidacja
1. Unikalne ID wpisów.
2. `targetStationId` musi wskazywać istniejące stanowisko.
3. Wielkości dostaw i zapasów nie mogą być ujemne.
4. Zgodność z projektami ze starszych szkiców: pole `materialSupply` jest opcjonalne w `DomainProjectV6`. Brak pola oznacza, że materiały są zawsze dostępne (dotychczasowe zachowanie).

---

## 4. Zakres wdrożenia w pakietach
- **3.5a (ten pakiet):** definicja typów TypeScript, schemat, parsery walidacji, odmowy przy błędnych danych, testy kontraktu, integracja w `DomainProjectV6` i `prepareDomainMigration`.
- **3.5b:** obsługa blokowania buforów i zużycia zapasów w rdzeniu symulacji (`simulation.ts` / worker), raportowanie czasu blokady i braku materiału.
- **3.5c:** edytor w UI Studio, historia operacji (undo/redo), testy w przeglądarce i aktualizacja dokumentacji.
