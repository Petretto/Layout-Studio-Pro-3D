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


## 5. Przegląd po 3.5a i zatwierdzone reguły — 2026-10-14
Powyższy kontrakt 3.5a pochodzi z pracy Gemini i pozostaje historią pierwszej propozycji. Użytkownik zatwierdził 2026-10-14: jawne zużycie materiału dla operacji, pobranie całości przy faktycznym starcie oraz dostawę przed pobraniem przy równym czasie. Terminy dostaw, także pierwszej cyklicznej, mają być jawne. Bufor wyjściowy blokuje PO zakończeniu przetwarzania: wyrób i stanowisko/wyposażenie pozostają zajęte do zwolnienia miejsca, a konfiguracja jawnie rozstrzyga zatrzymanie/zwolnienie operatora. Nazwa „Blocking Before Service” w sekcji 2.1 nie opisuje tej zatwierdzonej reguły; etykiety bbas z pierwszego kontraktu nie mogą same przesądzać zachowania silnika.
Przed integracją trzeba uzupełnić kontrakt jawnego zużycia (referencje operacji, ilości i jednostki), określić zakres punktu zapasu/kopii i buforów oraz ochronę odczytu istniejących szkiców. Obecny kontrakt zaopatrzenia nie ma zużycia. Walidator 3.5a dopuszcza brak firstDeliverySeconds i wylicza lokalnie zero; nie jest to zatwierdzone założenie do symulacji. Zachowujemy stare dane odczytywalne, ale fizyczna symulacja nie może z nich wywnioskować dostawy w 0 s. Faktyczna nazwa pola w kodzie to schedule, nie deliverySchedule z sekcji 3.2. Referencja componentId pozostaje dziś tylko tekstem; nie ma potwierdzonej referencji do rejestru materiałów.

## 6. Pakiet 3.5a1 — jawne odmowy do integracji
Przed 3.5b harmonogram i worker odmawiają wyniku dla niepustego materialSupply w trybie skonfigurowanym. JIT jest jawną opcją zakładającą dostępność materiału. Bufory z jakąkolwiek ograniczoną pojemnością, również 0, powodują odmowę w obu trybach: JIT nie jest zgodą na ignorowanie ograniczeń stanowisk. Puste kontrakty oraz jawne null pojemności zachowują dotychczasowe wyniki. Parser i zapis nie zostały zaostrzone, żadne istniejące deklaracje nie są usuwane ani migrowane. Zmiana chroni przed pozornym uwzględnieniem danych, a nie wdraża zapasów czy blokowania.
Następny zakres 3.5b: najpierw kompletny jawny kontrakt zużycia/terminów i rejestr dostępności, potem integracja z faktycznym startem i kolejką zdarzeń. Bufory wymagają osobnego spójnego zakresu miejsc oczekiwania oraz zajęcia/zwolnienia zasobów. Nie liczymy pracy magazynierów. Główne 3.5 pozostaje w trakcie.


## 7. Zaopatrzenie wykonawcze 3.5b1 — 2026-10-14
Dodano opcjonalne materialSupply.consumptions: listę `{operationId, supplyId, quantity, source}`. Ilość jest dodatnia/skończona, w jednostce wskazanej przez referencjonowaną pozycję zaopatrzenia; nie ma automatycznej konwersji ani wartości z BOM. Operacja i supplyId muszą istnieć, para nie może się powtarzać. componentId pozostaje jawnym identyfikatorem/nazwą materiału, a wykonawcza referencja korzysta z trwałego supplyId. Każda aktywna pozycja zaopatrzenia wymaga przynajmniej jednego jawnego zużycia. Zapas pozycji przy targetStationId jest wspólny dla kopii tego stanowiska; operacja nie pobiera go z innego stanowiska. Oddzielne supplyId oznaczają oddzielne deklaracje zapasu, bez cichego scalania.
Pierwszy termin cykliczny pozostaje opcjonalny tylko dla odczytu starych kontraktów. Walidator nie tworzy już domyślnego zera; wykonanie wymaga jawnego terminu. Stary kontrakt bez consumptions jest odczytywalny i zachowuje raw, lecz symulacja skonfigurowana wyjaśnia konieczność uzupełnienia danych. Nie zmieniono wersji schematu, klucza zapisu ani oryginałów 4/5; to opcjonalne rozszerzenie szkicu 6. Nie dodano nowych pól do migracji źródeł 4/5 — kontrakt nadal nie jest z nich dopowiadany.
MaterialStockRun utrzymuje zapas i osobne rezerwacje pobrań. Sprawdzenie wariantu jest odczytowe; dopiero przydzielona operacja rezerwuje całą ilość swoich materiałów. Faktyczne pobranie następuje przy jej starcie, również po transporcie/przerwie/kalendarzu. Przyszłe przydzielone pobrania pozostają chronione przed przejęciem zapasu przez inne wykonanie. Zestaw materiałów jest pobierany atomowo, bez ujemnego zapasu i bez podwójnego pobrania. Dostawy w tym samym czasie są doliczane przed pobraniem. Zdarzenia zużycia nie rezerwują magazynierów.
Niedobór przesuwa start do jawnej dostawy; niewystarczający skończony harmonogram odmawia kompletnego wyniku z identyfikacją materiału. Dostawy cykliczne są wyznaczane arytmetycznie, bez nieskończonej kolejki. Między zdarzeniami procesu inspekcja grupuje je z liczbą, pierwszym/ostatnim terminem i łączną ilością. Bilans obejmuje dostawy do końca produkcji, nie późniejsze powroty wózków. Liczba dostaw/czas/ilość muszą mieścić się w bezpiecznym/skończonym zakresie; przekroczenie jest raportowane. Działania na ilościach i cyklicznych terminach wykorzystują dziesiętne wartości deklaracji, aby nie kumulować typowych błędów binarnych (0,3 przy trzech pobraniach 0,1).
Wynik zawiera materialStocks/materialEvents oraz przyczynę material. UI pokazuje zapas początkowy, dostarczono/pobrano/pozostało i zdarzenia. JIT omija rejestr dostępności i nadal jawnie zakłada materiał dostępny. Brak/puste kontrakty zachowują dawne wyniki. Pełny edytor zaopatrzenia pozostaje do 3.5c; dane tego zakresu są dostępne przez API/zapis szkicu. Ograniczone bufory nadal powodują odmowę do integracji 3.5b2. Pojemność składowania, odpady, zwroty i analiza optymalnej częstotliwości dostaw nie są deklarowane jako wdrożone.
