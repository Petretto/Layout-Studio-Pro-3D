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

Status 3.6a: **zakończony pomyślnie**.

## 3. Zakres i wyniki pakietu 3.6b (2026-10-15)

Wdrożono prezentację stanów procesu i czasów trwania w interfejsie użytkownika Studio (`src/components/studio/DomainWorkerSchedulePanel.tsx`):
1. **Podsumowanie stanów procesu i czasów trwania (`[aria-label="Podsumowanie stanów procesu i czasów trwania"]`)**:
   - Kafelki metryk partii: czas partii (makespan), czas pracy operacji (suma trwania operacji), czas oczekiwania (suma opóźnień przed startem), blokady i oczekiwanie (blokada wyjścia bbas oraz oczekiwanie lokalne), transport montażu (łączny czas, liczba ruchów, przewozy).
   - Zestawienie przyczyn oczekiwania (`[aria-label="Zestawienie przyczyn oczekiwania"]`): ścisłe partycjonowane rozbicie (`waitBreakdownPartitioned`), którego suma jest dokładnie równa `totalWaitSeconds` partii, z podaniem czasu współwystępowania (`waitBreakdownPresence`):
     - Pracownicy (brak dostępności osób),
     - Materiały i podzespoły (brak zapasu/partii),
     - Transport montażu (dojazdy i dostępność wózków),
     - Bufory (brak miejsca na wejściu/wyjściu),
     - Stanowiska, korpusy i wyposażenie (zajętość kopii/lokalizacji),
     - Kalendarz (brak wspólnego okna pracy),
     - Struktura transportu montażu (przewozy, dojazdy, powroty).
2. **Rozszerzona tabela wykonań (`runs`)**:
   - Dodano kolumnę `Czas pracy [s]` (czas brutto oraz netto z pauzami kalendarzowymi),
   - Dodano kolumnę `Blokada [s]` (blokada wyjścia po pracy w polityce bbas lub oczekiwanie lokalne na tej samej kopii),
   - Zachowano kolumny: Sztuka, Operacja, Stanowisko / kopia, Pracownicy, Gotowa [s], Start [s], Koniec [s], Oczekiwanie [s], Przyczyna.
3. **Inspekcja wykorzystania i stanów stanowisk (`[aria-label="Inspekcja wykorzystania i stanów stanowisk"]`)**:
   - Tabela per stanowisko i kopia: nazwa/ID, liczba operacji, czas przetwarzania, czas blokady wyjścia, czas oczekiwania lokalnego, łączne zajęcie, czas bezczynności, wskaźnik zajęcia (%) oraz wskaźnik pracy (%).
4. **Inspekcja aktywności i stanów pracowników (`[aria-label="Inspekcja aktywności i stanów pracowników"]`)**:
   - Tabela per pracownik: imię/ID, liczba operacji, czas montażu, czas transportu, czas zatrzymania w blokadzie bbas, pauzy kalendarzowe, łączny czas aktywny, bezczynność, wskaźnik aktywności (%).

### Weryfikacja 3.6b:
- **Backup**: `backup/v0.4.0_przed_3_6b_20261015` (283 pliki, zweryfikowano SHA256).
- **Testy celowane**: `node scripts/test.mjs --suite=network --test-name-pattern="3\.6"` — **3/3 PASS**.
- **Kompilacja i build**:
  - `tsc --noEmit`: PASS, 0 błędów.
  - `npm run build`: PASS (czas: 3,34 s).
- **Weryfikacja w przeglądarce Edge (CDP)**:
  - `node tests/qa/verify_2_7e.mjs --cart-run --physical-buffer-run --state-metrics`: **PASS**.
  - Potwierdzono poprawne obliczenie i wyrenderowanie podsumowania metryk partii, rozbicia przyczyn oczekiwania, kolumn tabeli wykonań oraz rozwijanych tabel inspekcji stanowisk i pracowników.
  - Sprawdzono odtwarzalność wyników, przełączanie trybu JIT, ponowny odczyt po reloadzie oraz nienaruszalność oryginalnych źródeł schematu 4 i 5.
  - Dowody wizualne zapisano w:
    - `outputs/qa/verify_3_6b.png` (widok podsumowania metryk, rozbicia przyczyn i tabeli wykonań),
    - `outputs/qa/verify_3_6b_inspections.png` (widok rozwiniętych tabel inspekcji stanowisk i pracowników).
- **Pełna regresja**: `node scripts/test.mjs` — **266/266 PASS** (100%).

## 4. Podsumowanie punktu 3.6

Punkt 3.6 został w pełni zrealizowany, zweryfikowany i odebrany:
- Model analityczny wyznacza rzeczywiste stany i czasy trwania bez dopowiadania założeń produkcyjnych.
- UI prezentuje pełny bilans czasów, rozbicie oczekiwań, blokad wyjścia i transportu oraz wskaźniki wykorzystania zasobów.
- Status punktu 3.6 w `PLAN_ROZWOJU.md`: **wdrożone**.
- Postęp planu: cały plan **26/67 = 38,8%**, pierwsze wydanie **26/65 = 40,0%**.
