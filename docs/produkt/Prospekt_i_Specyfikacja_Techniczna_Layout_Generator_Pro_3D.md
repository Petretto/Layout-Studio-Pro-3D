# Layout Generator Pro 3D (v0.2)
## Kompleksowy Prospekt Produktowy, Analiza Możliwości, Specyfikacja Techniczna oraz Wycena Wdrożeniowa

---

# CZĘŚĆ I: PROSPEKT PRODUKTOWO-MARKETINGOWY

## 1. Wizja Produktu i Problem Rynkowy

Współczesna inżynieria produkcji (Industrial Engineering & Lean Manufacturing) w branżach takich jak **Automotive (EV/Baterie), Elektronika, AGD czy Aerospace** zmaga się z ogromną luką narzędziową:
- Klasyczne systemy CAD (AutoCAD, MicroStation, SolidWorks) są statyczne, wymagają setek godzin manualnego rysowania stanowisk i nie posiadają wbudowanej logiki algorytmów Lean/Takt Time.
- Zaawansowane pakiety symulacyjne (Siemens Plant Simulation, FlexSim) są ekstremalnie drogie (dziesiątki tysięcy euro za licencję), skomplikowane i wymagają dedykowanych zespołów programistycznych.
- Inżynierowie procesu wciąż projektują linie w arkuszach Excel, manualnie licząc balansowanie i rysując prowizoryczne diagramy Spaghetti na papierze.

**Layout Generator Pro 3D** to zintegrowana aplikacja webowa nowej generacji, która **łączy obliczenia inżynierskie Lean Manufacturing, automatyczne balansowanie linii, procedurane generowanie hal w 3D oraz eksport do przemysłowych standardów CAD (DXF)** w jednym, płynnym środowisku dostępnym bezpośrednio z poziomu przeglądarki.

> **Wartość biznesowa w 1 zdaniu:**  
> Skrócenie czasu projektowania nowej linii montażowej z **3-4 tygodni do 2-3 godzin**, przy jednoczesnym wyeliminowaniu wąskich gardeł i strat transportowych (Muda) jeszcze przed wbiciem pierwszej łopaty na hali.

---

## 2. Kluczowe Funkcjonalności Aplikacji (Co aplikacja potrafi)

Aplikacja prowadzi inżyniera przez kompletny proces wdrożenia nowej linii produkcyjnej w 6 zintegrowanych krokach:

```
[Pulpit & Szablony] ➔ [1. Popyt & Takt] ➔ [2. Graf Procesu] ➔ [3. BOM & Logistyka] ➔ [4. Balans Yamazumi] ➔ [5. Hala 3D & Symulacja] ➔ [6. Rzut 2D CAD & DXF]
```

### Moduł 0: Pulpit Projektowy & Gotowe Szablony Przemysłowe
- **Zarządzanie projektami:** Tworzenie projektów od podstaw, natychmiastowy import i eksport stanu całego projektu do pliku `.json`.
- **Szablony branżowe typu plug-and-play:**
  - *Linia Montażu Silników Elektrycznych EV* (układ gniazdowy U-Shape z precyzyjnym montażem wirnika, stojana i testem AOI).
  - *Linia Modułów Baterii EV* (układ przepływowy liniowy Linear Continuous Flow z procesem zgrzewania szyn Busbar i testem wysokonapięciowym HV).
- **Dashboard telemetryczny:** Podgląd na żywo liczby operacji, łącznego czasu pracy na wyrób (Work Content) oraz komponentów BOM.

---

### Moduł 1: Kreator Popytu i Obliczenia Czasu Taktu (Takt Time Calculator)
- **Dwukierunkowy przelicznik wydajności:**
  - Popyt roczny, miesięczny, tygodniowy i dzienny.
  - Liczba dni roboczych, system zmianowy (1, 2 lub 3 zmiany), długość zmiany.
  - Uwzględnienie planowanych przerw (Break Time) oraz wskaźnika **OEE** (Overall Equipment Effectiveness).
- **Kalkulacja wskaźników produkcyjnych w czasie rzeczywistym:**
  - Dokładny czas taktu klienta (**Takt Time**) w sekundach.
  - Wymagana prędkość wyjściowa (szt./godzinę oraz szt./minutę).
  - Czas operacyjny netto na zmianę oraz na dobę.

---

### Moduł 2: Cyfrowy Proces Technologiczny i Wizualny Graf Zależności (Process Flow DAG)
- **Interaktywny edytor grafu przepływu (Directed Acyclic Graph):**
  - Wizualne modelowanie powiązań między operacjami za pomocą krzywych Béziera ze strzałkami kierunkowymi.
  - Automatyczne wyliczanie poziomów sekwencji technologicznej (topologiczne szeregowanie).
  - Wykrywanie błędnych lub wiszących zależności operacji.
- **Dekonstrukcja czasu operacji (Lean Muda Analysis):**
  - Rozbicie każdego kroku na czas dodający wartość (**VA – Value Added**) oraz straty operacyjne (**NVA – Non-Value Added**).
  - Prezentacja paska efektywności VA% na każdym kafelku operacji.
- **Tryb hybrydowy (Graf / Tabela):**
  - Szybka edycja tabelaryczna czasów i powiązań.
  - **Pełny dwukierunkowy import/eksport Excel (.xlsx) oraz CSV** – możliwość załadowania marszruty technologicznej przygotowanej wcześniej w biurze technologicznym.

---

### Moduł 3: Zarządzanie Strukturą Materiałową (BOM & Logistics Containerization)
- **Kojarzenie komponentów z krokami procesu:** Precyzyjne przypisanie części składowych do konkretnych operacji montażowych.
- **Standaryzacja logistyczna pojemników:**
  - Obsługa standardów: pojemniki KLT (małe części), Palety Euro, Tacki montażowe (Tray), Kartony zbiorcze.
  - Definiowanie wielkości opakowania (opakowanie zbiorcze vs pobranie jednostkowe).
- **Kalkulator kosztu materiałowego (BOM Cost):** Automatyczne sumowanie kosztu jednostkowego komponentów wyrobu.
- **Import/Eksport Excel (.xlsx):** Błyskawiczny transfer zestawienia BOM do/z systemów ERP/MRP.

---

### Moduł 4: Silnik Balansowania Linii i Wykres Yamazumi (Line Balancing Engine)
- **Zaawansowane algorytmy optymalizacji rozłożenia pracy:**
  - **RPW (Ranked Positional Weight):** Algorytm wag pozycyjnych Helgesona-Birniego, uwzględniający sumaryczny czas wszystkich operacji następczych w grafie technologicznym.
  - **LCR (Largest Candidate Rule):** Heurystyka największych czasów cząstkowych.
- **Kluczowe wskaźniki efektywności balansowania (KPI):**
  - Teoretyczna minimalna liczba stacji ($N_{min} = \lceil \frac{\sum t}{Takt} \rceil$) vs Rzeczywista liczba stacji ($N_{akt}$).
  - Efektywność zbalansowania linii (**Line Efficiency %**).
  - Wskaźnik opóźnienia balansu (**Balance Delay %**).
  - Identyfikacja stacji krytycznej / wąskiego gardła (**Bottleneck Station & Bottleneck Cycle Time**).
- **Interaktywny wykres słupkowy Yamazumi:**
  - Czerwona linia referencyjna Takt Time.
  - Segmentacja słupków stacji na czas pracy VA (zielony) oraz NVA (pomarańczowy).
  - Automatyczne ostrzeżenia o przeciążeniu stanowiska powyżej czasu taktu.

---

### Moduł 5: Proceduralna Fabryka 3D i Symulacja Przepływu (Three.js WebGL)
- **Generowanie układu hali w 3D na podstawie obliczeń inżynierskich:**
  - Obsługa topologii linii: **U-Shape (gniazdowa)**, **Linear (liniowa z przenośnikami)**, **L-Shape**.
  - Proceduralne generowanie fizycznych obiektów produkcyjnych w skali 1:1:
    - Przemysłowe stoły ESD z nadstawkami i szynami narzędziowymi na balanse pneumatyczne.
    - 2- i 3-półkowe regały grawitacyjne FIFO z automatycznie rozstawionymi pojemnikami KLT (kodowanie barwne).
    - Ergonomiczne maty antyzmęczeniowe dla operatorów.
    - Napędzane i grawitacyjne przenośniki rolkowe łączące stanowiska.
    - Bramki automatycznej kontroli jakości (Quality Gate AOI) oraz pola odkładcze materiałów wejściowych i wyrobów gotowych.
- **Wirtualny Digital Twin i sterowanie kamerą:** Fotorealistyczne cieniowanie (PCF Soft Shadows), oświetlenie ambientowe i kierunkowe, mgła głębi, płynne obracanie (Orbit Controls) i przybliżanie.
- **Dyskretna symulacja przepływu materiału (Discrete-Event Simulation):**
  - Fizyczny ruch detali pomiędzy kolejnymi stacjami montażowymi z czasami buforowania.
  - Konfiguracja partii produkcyjnej (np. partia 30 szt. lub przepływ ciągły Continuous Flow).
  - Miernik wydajności na żywo: stoper partii, licznik detali ukończonych, poziom produkcji w toku (**WIP – Work in Progress**), realna wydajność godzinowa (**Throughput [szt./h]**).
- **Automatyczny Diagram Spaghetti 3D:**
  - Trójwymiarowa, świecąca wstęga trajektorii materiału przechodząca przez wszystkie węzły linii.
  - Algorytmiczne wyliczenie dystansu cyklu, dystansu na zmianę oraz rocznego przebiegu transportowego w kilometrach.
  - Ocena poziomu strat transportowych (Muda Rating: *Doskonały*, *Umiarkowany*, *Wysoki Koszt Strat*).

---

### Moduł 6: Przemysłowy Rzut 2D CAD i Eksport DXF
- **Interaktywna przeglądarka CAD 2D:**
  - Renderowanie hali na silniku HTML5 Canvas w rzeczywistej skali milimetrowej.
  - Siatka technologiczna 1000 mm, obrys hali, słupy konstrukcyjne i przeszkody.
  - Płynny Pan (przesuwanie) i Zoom (skalowanie px/metr) oraz linie wymiarowe gabarytów.
- **Bezpośredni generator plików DXF (AutoCAD R15 / 2000):**
  - Eksport układu do formatu wektorowego kompatybilnego z **AutoCAD, SolidWorks, Inventor, BricsCAD, Catia**.
  - Automatyczny podział na warstwy branżowe (Layers):
    - `FACILITY_WALLS` (ściany i obrys hali),
    - `EQUIPMENT_ESD` (stoły i stacje robocze),
    - `LOGISTICS_FIFO` (regały grawitacyjne i palety),
    - `OPERATOR_SAFETY` (strefy bezpieczeństwa i ergonomii).

---

## 3. Dla kogo przeznaczona jest aplikacja? (Grupa Docelowa)

1. **Inżynierowie Procesu i Technologii (Process Engineers):** Szybkie tworzenie koncepcji gniazd montażowych na etapie ofertowania lub wdrażania nowego projektu.
2. **Kierownicy i Inżynierowie Lean / Ciągłego Doskonalenia (Lean Champions, Kaizen):** Balansowanie obciążenia operatorów, eliminacja wąskich gardeł, redukcja zapasów WIP i minimalizacja diagramu spaghetti.
3. **Firmy Integratorskie i Producenci Maszyn (System Integrators):** Generowanie profesjonalnych wizualizacji 3D i rzutów CAD dla klienta w trakcie spotkań ofertowych, pokazujące wysoki profesjonalizm i cyfryzację.
4. **Dyrektorzy Fabryk i Plant Managerowie:** Natychmiastowa weryfikacja czy nowa linia zmieści się na dostępnej powierzchni hali i czy osiągnie docelowy wolumen sprzedaży.

---

## 4. Kierunki Rozwoju Aplikacji (Roadmap Produktowa)

Aplikacja v0.2 stanowi stabilny fundament (Proof of Concept / MVP produkcyjne). Poniżej zestawiono rekomendowane kierunki jej rozbudowy w podziale na 3 fazy:

```
[Faza 1: Rozszerzenie CAD & Ergonomia] ➔ [Faza 2: Logistyka Intralogistyczna & AGV] ➔ [Faza 3: AI Generatywne & Digital Twin MES]
```

### Faza 1: Zaawansowana interaktywność i ergonomia operatora (Short-term: 1-3 miesiące)
- **Drag-and-Drop stanowisk bezpośrednio w 3D / 2D:** Możliwość swobodnego przesuwania i obracania poszczególnych stołów myszką z automatycznym przyciąganiem do siatki (Snapping) i wykrywaniem kolizji ze słupami.
- **Biblioteka modeli 3D (Import GLTF / STEP):** Wczytywanie dokładnych brył robotów (Kuka, Fanuc, Universal Robots), wkrętaków elektrycznych i pras zaciskowych.
- **Cyfrowy Człowiek i Ergonomia (RULA / REBA):** Awatary operatorów przy stołach z automatyczną weryfikacją stref zasięgu rąk (Golden Zone) i obciążenia układu mięśniowo-szkieletowego.

### Faza 2: Intralogistyka, AGV/AMR i buforowanie (Mid-term: 3-6 miesięcy)
- **Symulacja zasilania linii przez wózki AGV/AMR:** Definiowanie pętli Milk Run, czasów dostaw komponentów z magazynu wysokiego składowania i monitorowanie stanów minimalnych w regałach FIFO.
- **Kalkulacja buforów międzyoperacyjnych (Supermarkety i bufory dynamiczne):** Wyliczanie optymalnej pojemności buforów w oparciu o statystyczną zmienność czasów operacji (rozkład Gaussa / Weibulla) oraz awaryjność maszyn (MTBF / MTTR).
- **Raport PDF jednym kliknięciem:** Automatyczny generator wielostronicowego raportu inżynierskiego dla zarządu (podsumowanie Takt, wykres Yamazumi, zrzuty 3D, specyfikacja wyposażenia, kosztorys linii).

### Faza 3: Generatywna Optymalizacja AI i Digital Twin IoT (Long-term: 6-12 miesięcy)
- **AI Generative Layout Optimizer:** Zastosowanie algorytmów genetycznych (Genetic Algorithms) do automatycznego znalezienia układu hali, który minimalizuje diagram spaghetti przy zadanych wymiarach pomieszczenia i słupach nośnych.
- **Chmura i współpraca wieloosobowa (SaaS):** Praca zespołowa w czasie rzeczywistym nad jednym projektem hali produkcyjnej (WebSockets, synchronizacja stanu).
- **Połączenie z systemami MES / SCADA (Live Digital Twin):** Zasilanie symulacji rzeczywistymi danymi z czujników linii i sterowników PLC w czasie rzeczywistym – wizualizacja aktualnego tempa fabryki w 3D.

---

# CZĘŚĆ II: INSTRUKCJA I ARCHITEKTURA DLA DEVELOPERA
*(Przewodnik techniczny: Jak stworzyć taką aplikację od podstaw)*

## 1. Rekomendowany Stack Technologiczny

| Warstwa | Technologia | Uzasadnienie |
| :--- | :--- | :--- |
| **Język** | **TypeScript 5.x** | Silne typowanie struktur inżynierskich (`ProcessStep`, `Workstation`, `LayoutObject`). |
| **Framework SPA** | **React 18 / 19** | Komponentowa architektura, wydajne zarządzanie stanem i obsługa cyklu życia widoków. |
| **Build Tool** | **Vite 5 / 6** | Błyskawiczny Hot Module Replacement (HMR), szybka kompilacja bundla produkcyjnego. |
| **Styling & UI** | **Tailwind CSS v4** + **Lucide React** | Spójny, nowoczesny interfejs w ciemnej tonacji industrialnej (Dark Mode), responsywność. |
| **Silnik 3D WebGL** | **Three.js (^0.168.0)** | Standard branżowy 3D w przeglądarce; lekki, wydajny, pełna kontrola nad oświetleniem i buforami geometrii. |
| **Silnik Rzutu 2D CAD** | **HTML5 Canvas 2D API** | Bezpośrednia obsługa macierzy transformacji (Pan/Zoom) i rendering tysięcy elementów wektorowych bez narzutu DOM. |
| **Arkusze Kalkulacyjne** | **SheetJS (xlsx)** | Wydajne parsowanie binarne plików `.xlsx`, `.xls` i `.csv` po stronie klienta. |
| **Eksport Inżynierski** | **Własny parser/generator DXF R15** | Brak ciężkich bibliotek zewnętrznych; generowanie tekstu ASCII zgodnego ze specyfikacją Autodesk DXF. |

---

## 2. Architektura Danych (Core Data Models)

Kluczem do spójności aplikacji jest jednolity model stanu. Wszystkie moduły operują na jednym obiekcie głównym `ProjectData`:

```typescript
export type LayoutType = 'UShape' | 'Linear' | 'LShape';
export type ContainerType = 'BoxKLT' | 'Pallet' | 'Tray' | 'Carton';

export interface ProcessStep {
  id: string;
  name: string;
  standardTimeSeconds: number;
  vaTimeSeconds: number;       // Czas wartości dodanej
  nvaTimeSeconds: number;      // Czas straty
  sequenceNumber: number;
  predecessorIds: string[];    // Tablica ID kroków poprzedzających (relacja DAG)
}

export interface BOMComponent {
  id: string;
  partNumber: string;
  name: string;
  quantityPerUnit: number;
  container: ContainerType;
  packageQuantity: number;
  associatedProcessStepId: string;
  unitCost: number;
}

export interface Workstation {
  id: string;
  name: string;
  sequenceIndex: number;
  assignedStepIds: string[];
  cycleTimeSeconds: number;
  isBottleneck: boolean;
  xMm: number;
  yMm: number;
}

export interface LayoutObject {
  id: string;
  name: string;
  type: 'TableESD' | 'FlowRackFIFO3Tier' | 'RollerConveyorMotorized' | 'OperatorErgoMat' | 'QualityGate' | 'MaterialIn' | 'FinishedGoods';
  xMm: number;
  yMm: number;
  zMm: number;
  widthMm: number;
  lengthMm: number;
  heightMm: number;
  rotationDeg: number;
  colorHex: string;
  workstationId?: string;
}

export interface DemandConfig {
  yearlyDemand: number;
  workingDaysPerYear: number;
  shiftsPerDay: number;
  hoursPerShift: number;
  plannedBreaksMinutesPerShift: number;
  oeePercent: number;
}

export interface ProjectData {
  id: string;
  name: string;
  targetLayoutType: LayoutType;
  facility: { widthMm: number; lengthMm: number; heightMm: number; gridSizeMm: number };
  obstacles: Array<{ id: string; name: string; xMm: number; yMm: number; widthMm: number; lengthMm: number; heightMm: number }>;
  demand: DemandConfig;
  processSteps: ProcessStep[];
  bom: BOMComponent[];
  layoutObjects: LayoutObject[];
  balancing?: LineBalancingResult;
  spaghetti?: SpaghettiMetrics;
}
```

---

## 3. Implementacja Kluczowych Algorytmów

### A. Algorytm Czasu Taktu (Takt Time Engine)
Formuła inżynierska:
$$TaktTime = \frac{\text{Dostępny czas operacyjny netto na dobę}}{\text{Dzienne zapotrzebowanie klienta}}$$

```typescript
export function calculateTaktTime(demand: DemandConfig) {
  const dailyDemand = demand.yearlyDemand / demand.workingDaysPerYear;
  const grossSeconds = demand.hoursPerShift * 3600;
  const breakSeconds = demand.plannedBreaksMinutesPerShift * 60;
  const oee = demand.oeePercent / 100;
  
  const netOperatingSecondsPerShift = (grossSeconds - breakSeconds) * oee;
  const netDailySeconds = netOperatingSecondsPerShift * demand.shiftsPerDay;
  const taktTimeSeconds = netDailySeconds / dailyDemand;
  
  return { taktTimeSeconds: Number(taktTimeSeconds.toFixed(1)), dailyDemand };
}
```

### B. Algorytm Balansowania Linii RPW (Ranked Positional Weight)
1. Zbuduj mapę następców dla każdego kroku w grafie zależności.
2. Zdefiniuj funkcję rekurencyjną `getDownstreamTime(stepId)` obliczającą wagę pozycyjną (czas operacji własnej + czas wszystkich operacji zależnych po niej).
3. Posortuj listę kroków malejąco po wyliczonej wadze.
4. Przypisuj kroki do kolejnych stacji zachowując warunki:
   - Wszystkie operacje poprzedzające (`predecessorIds`) zostały już przypisane.
   - Suma czasów na stacji nie przekracza dopuszczalnego Takt Time (z tolerancją dozwoloną przy pojedynczych operacjach).
5. Oznacz stację o najdłuższym czasie cyklu jako **Bottleneck**.

### C. Proceduralny Generator Layoutu 3D (Layout Engine)
- Dla układu **U-Shape**:
  - Podziel liczbę stacji $N$ na dwa skrzydła (lewe i prawe).
  - Skrzydło lewe: układane od $y=0$ w górę, rotacja $0^\circ$.
  - Skrzydło prawe: układane od góry w dół, rotacja $180^\circ$.
  - Generuj dla każdej stacji krotkę obiektów: `Stół ESD` + `Regał FIFO z kontenerami KLT` z zewnętrznej strony + `Mata ergonomiczna` od strony wewnętrznej operatora.
  - Wygeneruj strefę wejścia materiałów `MaterialIn` przy starcie i strefę `FinishedGoods` przy wyjściu z U-kształtu.

### D. Generator Wektorowy AutoCAD DXF (DXF Exporter)
Implementacja emituje standardowy plik tekstowy ASCII zgodny ze standardem AutoCAD R15 / AC1015:
- Nagłówek `HEADER` i sekcja `TABLES` z definicjami warstw (`LAYER`).
- Sekcja `ENTITIES` zawierająca:
  - Zamknięte polilinie `LWPOLYLINE` o 4 wierzchołkach dla obrysu hali i każdego stanowiska.
  - Etykiety tekstowe `TEXT` wyśrodkowane w środku geometrycznym stołów.

---

## 4. Architektura Symulacji i Wizualizacji 3D (Three.js)

Aby osiągnąć 60 FPS w przeglądarce:
1. **Zarządzanie instancjami i geometrią:** Wykorzystanie standardowych prymitywów `BoxGeometry` i `CylinderGeometry` z parametrem `castShadow` i `receiveShadow`.
2. **Kamera sferyczna (Custom Orbit Controls):**
   $$x = r \cdot \sin(\phi) \cdot \sin(\theta), \quad y = r \cdot \cos(\phi), \quad z = r \cdot \sin(\phi) \cdot \cos(\theta)$$
   Obsługa zdarzeń `mousedown`, `mousemove` i `wheel` z ograniczeniem kąta elewacji ($\phi \in [0.1, \frac{\pi}{2} - 0.05]$), uniemożliwiająca wpadnięcie kamery pod podłogę hali.
3. **Pętla symulacji przepływu detali:**
   - Wykorzystanie liniowej interpolacji pozycji detali: `mesh.position.lerp(targetWaypoint, speed * dt)`.
   - Zegar czasu rzeczywistego synchronizowany przez `performance.now()`.
   - Dynamiczny bufor usuwanych i dodawanych obiektów detali ze zliczaniem throughputu i auto-zatrzymaniem po osiągnięciu wielkości partii.

---

# CZĘŚĆ III: ESTYMACJA KOSZTÓW I HARMONOGRAMU WDROŻENIA
*(Kalkulacja budżetowa dla inwestora / zleceniodawcy)*

Poniższa wycena zakłada stworzenie aplikacji **od zera do stanu identycznego z wersją v0.2**, w architekturze produkcyjnej, z testami i pełną dokumentacją.

## 1. Rozbicie Prac na Moduły (Work Breakdown Structure - WBS)

| Moduł / Zadanie | Zakres prac | Estymacja (Roboczodni - MD) | Estymacja (Roboczogodziny - h) |
| :--- | :--- | :---: | :---: |
| **M1: Architektura & Fundamenty** | Konfiguracja projektu (Vite, TS, Tailwind, router stanów, struktury danych types.ts, szablony domyślne) | **4 MD** | 32 h |
| **M2: Kalkulator Popytu & Taktu** | Formularze dwukierunkowe, kalkulacje OEE, zmianowości, czasu operacyjnego, walidacja i wizualizacja KPI | **3 MD** | 24 h |
| **M3: Graf Procesu Technologicznego (DAG)** | Silnik wyliczania poziomów hierarchii, interaktywny edytor SVG (krzywe Béziera, strzałki), tryb tabeli, edycja VA/NVA | **9 MD** | 72 h |
| **M4: Import/Eksport Excel (SheetJS)** | Parsowanie plików Excel/CSV dla marszruty i BOM, dynamiczne mapowanie nagłówków, eksporty `.xlsx` | **4 MD** | 32 h |
| **M5: Moduł BOM & Logistyka** | Zarządzanie listą materiałową, typy pojemników KLT/Palety, kalkulacja kosztów, wiązanie z krokami | **3 MD** | 24 h |
| **M6: Silnik Balansowania & Yamazumi** | Implementacja algorytmów RPW i LCR, wykrywanie wąskich gardeł, interaktywny wykres słupkowy z linią taktu | **6 MD** | 48 h |
| **M7: Silnik Proceduralnego Layoutu** | Obliczanie współrzędnych przestrzennych dla U-Shape, Linear, L-Shape; generowanie wyposażenia (stoły, FIFO, maty, rolki) | **6 MD** | 48 h |
| **M8: Trójwymiarowy Viewport WebGL (Three.js)** | Scena 3D, cieniowanie PBR, oświetlenie, siatka hali, proceduralne meshe maszyn i regałów, sterowanie kamerą | **8 MD** | 64 h |
| **M9: Symulacja Przepływu & Diagram Spaghetti** | Pętla animacji detali, kolejkowanie, stoper, licznik WIP/Throughput, 3D Tube Spaghetti i metryki Muda | **7 MD** | 56 h |
| **M10: Moduł 2D CAD & Eksport DXF** | Widok Canvas 2D (pan/zoom, siatka, wymiarowanie), generator plików DXF R15 z podziałem na warstwy | **5 MD** | 40 h |
| **M11: UI/UX & Industrial Dark Theme** | Dopracowanie mikrointerakcji, responsywności, powiadomień, spójności wizualnej | **4 MD** | 32 h |
| **M12: Testy, QA i Wdrożenie** | Testy jednostkowe algorytmów, testy wydajności WebGL, skrypt uruchomieniowy bat, build produkcyjny | **5 MD** | 40 h |
| **SUMA ŁĄCZNA** | **Kompletna aplikacja od podstaw** | **64 MD** | **512 roboczogodzin** |

---

## 2. Wycena Finansowa (Stawki Rynkowe 2024 / 2025)

### Wariant A: Zespół Zewnętrzny / Software House (Polska / CEE)
Software house zapewnia pełen zespół: Senior Frontend/3D Developer, Inżynier Algorytmów/Fullstack, UI/UX Designer, QA i Project Manager.
- Średnia rynkowa stawka agencyjna: **180 – 260 PLN netto / godzinę** (ok. 42 – 60 EUR/h).
- **Całkowity koszt realizacji (512 h):**  
  $$\mathbf{92\ 000\ PLN\ -\ 133\ 000\ PLN\ netto}\quad (\sim 21\ 500\ -\ 31\ 000\ EUR)$$
- **Czas realizacji:** 7 – 9 tygodni (zespół 2-osobowy).

### Wariant B: Doświadczony Senior Full-Stack / Three.js Freelancer / Kontraktor B2B
Doświadczony programista łączący kompetencje matematyczno-algorytmiczne z Three.js i React.
- Średnia stawka B2B: **140 – 190 PLN netto / godzinę** (ok. 33 – 45 EUR/h).
- **Całkowity koszt realizacji (512 h):**  
  $$\mathbf{71\ 500\ PLN\ -\ 97\ 000\ PLN\ netto}\quad (\sim 16\ 800\ -\ 22\ 800\ EUR)$$
- **Czas realizacji:** ok. 3 – 3.5 miesiąca (1 osoba na pełny etat).

---

## 3. Wycena Wdrożenia Kolejnych Faz Rozwojowych (Opcje Dodatkowe)

Jeśli planowane jest rozszerzenie projektu poza obecną wersję v0.2:

1. **Faza 1 (Interaktywny Drag-and-Drop w 3D + Import modeli GLTF/STEP):**  
   - Pracochłonność: ok. 140 – 180 h  
   - Koszt orientacyjny: **22 000 – 38 000 PLN netto**
2. **Faza 2 (Symulacja Intralogistyki AGV + Buforowanie stochastyczne + Generator PDF):**  
   - Pracochłonność: ok. 180 – 240 h  
   - Koszt orientacyjny: **30 000 – 50 000 PLN netto**
3. **Faza 3 (Silnik chmurowy SaaS + AI Generative Layout Optimization):**  
   - Pracochłonność: ok. 300 – 450 h  
   - Koszt orientacyjny: **55 000 – 95 000 PLN netto**

---

## 4. Podsumowanie i Rekomendacja

Aplikacja **Layout Generator Pro 3D** w obecnej postaci reprezentuje bardzo wysoki poziom dojrzałości koncepcyjnej i inżynierskiej. Posiada rzadkie na rynku połączenie **twardej wiedzy Lean Manufacturing (Takt, RPW, Yamazumi, Spaghetti) z nowoczesną technologią grafiki 3D czasu rzeczywistego (Three.js WebGL)**.

Jej rynkowa wartość odtworzeniowa wynosi od **70 000 do 130 000 PLN netto**. Ze względu na unikalny profil, aplikacja posiada ogromny potencjał komercjalizacji – zarówno jako samodzielny produkt SaaS dla inżynierów produkcji, jak i narzędzie pre-sales dla integratorów robotyki i producentów wyposażenia fabryk.
