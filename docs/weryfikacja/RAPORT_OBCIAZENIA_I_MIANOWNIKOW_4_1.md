# Raport weryfikacji i odbioru: Punkt 4.1 — Oddzielne obciążenie stanowisk, maszyn i operatorów oraz mianowniki wskaźników

Data: **2026-10-16**  
Status zadania 4.1: **wdrożone**  
Gałąź: `codex/model-process-2-1`  
Powiązany kamień milowy: **Etap 4 — Balansowanie i porównywanie wariantów**

---

## 1. Cel i zakres implementacji (ID 4.1)

Zgodnie z zapisem w `PLAN_ROZWOJU.md` (punkt 4.1):
> *„Pokazywać oddzielnie obciążenie stanowisk, maszyn i operatorów oraz objaśnić mianowniki wskaźników.”*

Wskaźniki wykorzystania w inżynierii produkcji i lean manufacturing nie mogą być prezentowane jako pojedyncza, niejednoznaczna liczba procentowa bez jasnej definicji licznika i mianownika. W szczególności:
- **Stanowisko** może być zajęte przez korpus dłużej niż trwa praca człowieka lub maszyny (np. blokada wyjścia przy braku miejsca w buforze, oczekiwanie na kolejną operację na tej samej kopii);
- **Maszyna / wyposażenie** może wykonywać cykl automatyczny bez obecności operatora lub uczestniczyć w transportach montażu (np. wózki, transportery, zrobotyzowane gniazda);
- **Operator** wykonuje pracę ręczną, przemieszcza się, asystuje przy załadunku, ma przerwy kalendarzowe lub może być zatrzymany przy zablokowanym korpusie (polityka `bbas`).

Wdrożenie objęło:
1. **Statyczne bilansowanie linii i analiza zdolności (Yamazumi / `BalancingBoard`)**:
   - Wyodrębnienie obciążeń stanowisk, maszyn i operatorów w module `src/core/workloadBalancing.ts`.
   - Jawne wyliczanie i prezentacja mianowników:
     - Stanowisko: $\text{Mianownik} = K \cdot T_{\text{takt}}$ (czas taktu pomnożony przez liczbę równoległych kopii stanowiska);
     - Maszyna: $\text{Mianownik} = K \cdot T_{\text{takt}}$;
     - Operator: $\text{Mianownik} = (O \cdot K) \cdot T_{\text{takt}}$ (czas taktu pomnożony przez łączną obsadę stanowiska).
   - Jawna formuła obliczeniowa i opis słowny mianownika w tabeli w `src/components/studio/BalancingBoard.tsx`.
2. **Dynamiczny harmonogram symulacji partii (szkic 6 / `scheduleStateMetrics.ts` i `DomainWorkerSchedulePanel.tsx`)**:
   - Definicja `EquipmentStateMetrics` oraz funkcja `calculateEquipmentMetrics(...)` śledząca czas biegu technologicznego maszyn (`machineRun` z profilu czasu operacji lub czas wykonania operacji) oraz czas transportu montażu.
   - Rozszerzenie `StationStateMetrics` i `WorkerStateMetrics` o jawne pola bazy mianownika (`denominatorSeconds`, `denominatorBasis`) oraz formuły obliczeniowe (`occupancyFormula`, `processingFormula`, `activityFormula`).
   - Dodanie nowej tabeli inspekcji maszyn i wyposażenia w `DomainWorkerSchedulePanel.tsx` oraz uzupełnienie tabel stanowisk i pracowników o kolumny z objaśnieniem mianownika i wzoru matematycznego.

---

## 2. Architektura i modele danych

### 2.1 Moduł obliczeniowy statycznego bilansu (`src/core/workloadBalancing.ts`)
```typescript
export interface StationWorkloadBreakdown {
  stationId: string;
  stationName: string;
  copies: number;
  operatorsPerCopy: number;
  totalOperators: number;

  // 1. Obciążenie stanowiska
  stationCycleSeconds: number;
  stationWorkloadPercent: number;
  stationDenominatorSeconds: number;
  stationDenominatorDescription: string;
  stationFormula: string;

  // 2. Obciążenie maszyn
  machineCycleSeconds: number;
  machineWorkloadPercent: number;
  machineDenominatorSeconds: number;
  machineDenominatorDescription: string;
  machineFormula: string;

  // 3. Obciążenie operatorów
  operatorCycleSeconds: number;
  operatorWorkloadPercent: number;
  operatorDenominatorSeconds: number;
  operatorDenominatorDescription: string;
  operatorFormula: string;
}
```

### 2.2 Rozszerzenie dynamicznych metryk stanu (`src/core/scheduleStateMetrics.ts`)
```typescript
export interface EquipmentStateMetrics {
  equipmentId: string;
  equipmentName: string;
  stationId?: string;
  operationsCount: number;
  runTimeSeconds: number;
  transportTimeSeconds: number;
  totalActiveTimeSeconds: number;
  idleTimeSeconds: number;
  utilizationRatio: number;
  denominatorSeconds: number;
  denominatorBasis: string;
  formula: string;
}
```

---

## 3. Wyniki weryfikacji testowej

### 3.1 Testy automatyczne jednostkowe i regresyjne
Uruchomiono pełny zestaw testów `node scripts/test.mjs`:
- Test jednostkowy `4.1: statyczne oddzielne obciążenie stanowisk, maszyn i operatorów oraz objaśnienie mianowników (calculateStaticWorkload)`:
  - Weryfikacja 1 kopii i 1 operatora: cykl 50 s, takt 60 s $\to$ obciążenie stanowiska 83.3%, operatora 83.3%, maszyny 0.0%, mianownik 60 s.
  - Weryfikacja 2 kopii i 2 operatorów na kopię (obsada 4): mianownik stacji $2 \times 50 = 100\text{ s} \to 50.0\%$, mianownik operatorów $4 \times 50 = 200\text{ s} \to 25.0\%$.
  - Weryfikacja operacji schematu 6 z podziałem technologicznym na czas ręczny (10 s) i maszynowy (30 s) przy takcie 50 s $\to$ stanowisko 80.0%, maszyna 60.0%, operator 20.0%.
- Test jednostkowy `4.1: dynamiczne oddzielne metryki obciążenia stanowisk, maszyn i operatorów oraz mianowniki w harmonogramie partii (calculateScheduleStateMetrics)`:
  - Weryfikacja dokładnego czasu biegu wkrętaka automatycznego (12 s z profilu), czasu transportu wózka montażowego, czasów bezczynności oraz formuł i mianowników makespan.
- Wynik pełnej regresji: **282/282 testów PASS (0 błędów, czas: 1.94 s)**.

### 3.2 Weryfikacja interfejsu użytkownika (Edge CDP QA)
Uruchomiono test `node tests/qa/verify_4_1.mjs`:
- Sprawdzenie obecności nowej tabeli w zakładce bilansowania z nagłówkami:
  `['Stanowisko', 'Kopie / Obsada', 'Obciążenie stanowiska [%]', 'Mianownik stanowiska', 'Obciążenie operatorów [%]', 'Mianownik operatorów', 'Obciążenie maszyn [%]', 'Mianownik maszyn']`.
- Zrzut ekranu zapisany do pliku: `outputs/qa/verify_4_1.png` (111 505 bajtów).
- Czas przełączenia widoku: 415 ms.

---

## 4. Ochrona danych i tożsamości
- Utworzono backup przed structural/schema zmianami: `backup/v0.4.0_przed_4_1_20261016` (162 pliki z sumami SHA-256).
- Zachowano pełną kompatybilność wsteczną ze schematami v3, v4, v5 i v6.
- Zmiany w metrykach są czystymi rozszerzeniami (brak destrukcyjnych zmian w typach danych).
