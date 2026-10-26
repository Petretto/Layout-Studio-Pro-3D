# Standard wyposażenia przemysłowego Layout Studio Pro — Specyfikacja 6.1

Data publikacji: 2026-10-18  
Status: **obowiązujący standard techniczny (Etap 6 — ID 6.1)**  
Identyfikator modułu kodu: `src/core/equipment/equipmentStandard.ts`

---

## 1. Cel i zakres standardu

Standard wyposażenia definiuje jednolite, formalne zasady parametryzacji, modelowania i reprezentacji obiektów wyposażenia przemysłowego w środowisku CAD 2D oraz scenie trójwymiarowej 3D (Three.js/WebGL) aplikacji Layout Studio Pro.

Zgodnie z nadrzędnymi zasadami projektu:
1. **Model wizualny 2D/3D nie jest źródłem prawdy technologicznej** (Zasada 6, Plan 6.4). Wymiana modelu 3D, siatki, materiału lub wyglądu obiektu nigdy nie mutuje parametrów procesu, czasów operacji, bilansu stanowisk ani harmonogramu symulacji.
2. **Geometria nie implikuje zdolności produkcyjnej** ani automatycznej zgodności BHP (Zasada 5, Plan 5.9).
3. **Kompatybilność danych**: specyfikacja wyposażenia jest w pełni opcjonalna i kompatybilna wstecznie ze schematami projektów v4, v5 i v6.

---

## 2. Skala i jednostki

| Dziedzina | Jednostka podstawowa | Oznaczenie | Przelicznik / odwzorowanie w silnikach |
| :--- | :--- | :--- | :--- |
| **Wymiary liniowe CAD 2D** | milimetr | `mm` | 1 jednostka SVG / CANVAS = 1 mm |
| **Współrzędne w scenie 3D** | metr | `m` | 1 jednostka Three.js = 1 metr = 1000 mm (`MM_TO_M = 0.001`) |
| **Kąt obrotu** | stopień | `°` (deg) | Zakres $[0, 360)$ wokół pionowej osi obrotu |
| **Masa (nośność / waga)** | kilogram | `kg` | Liczba zmiennoprzecinkowa $\ge 0$ |
| **Czasy procesowe** | sekunda | `s` | Wyłącznie w procesie technologicznym (nie w geometrii) |

### Odwzorowanie osi współrzędnych

- **CAD 2D (rzut z góry)**:
  - Oś $+X$: w prawo (szerokość hali)
  - Oś $+Y$: w dół rzutu (długość hali)
- **Scena 3D (Three.js)**:
  - Oś $+X$: w prawo (`xMm / 1000`)
  - Oś $+Y$: w górę — elewacja pionowa (`zMm / 1000`)
  - Oś $+Z$: w głąb hali (`yMm / 1000`)

---

## 3. Punkt ustawienia (punkt bazowy / insertion point)

Każde wyposażenie posiada zdefiniowany punkt bazowy (`EquipmentInsertionPoint`):

1. **Kotwica w płaszczyźnie poziomej (`anchor`)**:
   - `footprint-center` (domyślny dla 3D): środek geometryczny rzutu poziomego podstawy wyposażenia.
   - `bottom-left` / `top-left` (dla CAD 2D): narożnik obwiedni prostokątnej `(xMm, yMm)`.
   - Ścisła relacja transformacji:
     $$\text{centerX} = \text{xMm} + \frac{\text{widthMm}}{2}, \quad \text{centerY} = \text{yMm} + \frac{\text{lengthMm}}{2}$$
2. **Odniesienie pionowe (`elevation`)**:
   - `floor` ($Z = 0$): wyposażenie stojące na posadzce hali (stoły, regały, przenośniki, palety).
   - `suspended` ($Z > 0$): wyposażenie podwieszane pod stropem/konstrukcją (np. tablice Andon $Z \ge 2200\text{ mm}$, oświetlenie, szynoprzewody).
   - `tabletop`: wyposażenie montowane na blacie roboczym stołu ($Z \approx 850\text{ mm}$).
3. **Kierunek frontu (`facing`)**:
   - Domyślny kierunek frontowy przy obrocie $0^\circ$: `front-positive-y` (w stronę korytarza / operatora).

---

## 4. Obrys kolizji (Collision envelope)

Obrys kolizyjny (`EquipmentCollisionEnvelope`) wyznacza fizyczną przestrzeń zajmowaną przez obiekt:

1. **Wymiary obwiedni**: $[\text{widthMm} \times \text{lengthMm} \times \text{heightMm}]$.
2. **Margines bezpieczeństwa (`clearanceMarginMm`)**:
   - Stoły i regały: $50\text{ mm}$ do $60\text{ mm}$.
   - Bramki kontrolne i maszyny: $80\text{ mm}$ do $100\text{ mm}$.
   - Strefy manewrowe wózków widłowych: $100\text{ mm}$ do $150\text{ mm}$.
3. **Klasyfikacja fizyczna (`isSolidObstacle`)**:
   - `true` (bryła sztywna): stoły, maszyny, regały, słupy — nie wolno w nie wjechać ani postawić na nich innego obiektu.
   - `false` (element niekolizyjny w 2D): maty ergonomiczne, oznaczenia posadzkowe, podwieszone tablice sygnalizacyjne powyżej wysokości skrajni pieszej ($Z > 2000\text{ mm}$).
4. **Algorytmy detekcji**:
   - `checkEquipmentCollision2D`: sprawdza kolizję rzutów poziomych z uwzględnieniem kąta obrotu i marginesów.
   - `checkEquipmentCollision3D`: uwzględnia dodatkowo przedział elewacji $[Z_{\min}, Z_{\max}]$.
   - `checkObstacleCollision`: sprawdza kolizję ze stałymi słupami konstrukcyjnymi hali (`Obstacle`).

---

## 5. Strefa obsługi (Service and operator zone)

Strefy obsługi (`EquipmentServiceZone`) definiują przestrzeń niezbędną do bezpiecznej pracy operatora i konserwacji:

1. **Typy stref**:
   - `operator-standing`: strefa pracy stojącej (szerokość min. $800\text{ mm}$, głębokość min. $800\text{ mm}$ do $1000\text{ mm}$ wg PN-EN ISO 14738).
   - `operator-seated`: strefa pracy siedzącej z podnóżkiem.
   - `maintenance-access`: strefa dostępu serwisowego (dostęp do szaf sterowniczych, silników, pomp).
   - `loading-unloading`: strefa zasilania materiałowego (odkładanie/pobieranie palet i pojemników KLT).
2. **Zasada niezależności oceny BHP (Plan 5.9)**:
   - Każda strefa posiada atrybut `isErgonomicGuidelineOnly: true`.
   - Ostrzeżenia o przecięciu strefy obsługi z wyposażeniem lub korytarzem transportowym są oznaczone jako *ostrzeżenia geometryczne rzutu*, a nie formalny certyfikat bezpieczeństwa pracy.

---

## 6. Punkty transportu (Material transport I/O & docking ports)

Punkty transportowe (`EquipmentTransportPort`) stanowią interfejs dokowania i przeładunku materiałów:

1. **Rodzaje portów**:
   - `input`: zasilanie w komponenty / surowce (np. tył regału FIFO, lewa strona stołu montażowego).
   - `output`: odbiór wyrobu lub podzespołu gotowego (np. przód regału FIFO, zjazd z przenośnika).
   - `bidirectional`: port dwukierunkowy (np. pole europalety na posadzce).
2. **Parametry portu**:
   - `relativePositionMm`: współrzędne dokowania $(X_{\text{rel}}, Y_{\text{rel}}, Z_{\text{rel}})$ w układzie lokalnym obiektu.
   - `approachDirectionDeg`: kąt podejścia wózka/AGV/pracownika w stopniach.
   - `transferElevationMm`: wysokość robocza przekazania detalu (np. $850\text{ mm}$ blat, $800\text{ mm}$ linia rolkowa, $144\text{ mm}$ paleta posadzkowa).
   - `allowedCarriers`: dopuszczone nośniki (`cart`, `roller`, `forklift`, `manual-carry`, `agv`, `klt-box`, `pallet`).
   - `dockingClearanceMm`: wymagana wolna przestrzeń manewrowa do dokowania.
3. **Transformacja do współrzędnych świata**: funkcja `getTransportPortWorldPosition(obj, port)` przelicza lokalne współrzędne i kąt podejścia na pozycję w hali po uwzględnieniu obrotu obiektu.

---

## 7. Metadane źródła i licencji

Każda definicja wyposażenia w rejestrze zawiera metadane pochodzenia (`EquipmentMetadata`):

| Pole | Typ | Opis |
| :--- | :--- | :--- |
| `source` | `'built-in' \| 'catalog' \| 'custom-import' \| 'user-defined'` | Pochodzenie modelu |
| `author` | `string` | Autor / organizacja projektowa |
| `vendor` | `string` (opcjonalny) | Producent wyposażenia |
| `catalogNumber` | `string` (opcjonalny) | Numer katalogowy producenta |
| `license` | `'MIT' \| 'CC-BY-4.0' \| 'CC0' \| 'Commercial-Proprietary' \| 'Custom'` | Prawa autorskie i licencja modelu |
| `version` | `string` | Wersja specyfikacji (np. `'1.0.0'`) |
| `polygonCountLimit` | `number` | Budżet wielokątów (dla optymalizacji 3D, np. $\le 2500$ trójkątów) |
| `isCertifiedTechnologicalCapacity` | `false` | **Zawsze false** — ochrona przed zmyślaniem zdolności technologicznej |

---

## 8. Zestawienie wbudowanych specyfikacji standardu

W pliku `src/core/equipment/equipmentStandard.ts` zdefiniowano pełny rejestr `DEFAULT_EQUIPMENT_SPECS` obejmujący 15 standardowych typów obiektów:

| Typ obiektu (`ObjectType`) | Wymiary $[W \times L \times H]$ mm | Elewacja Z | Margines | Strefy obsługi | Porty transportowe | Licencja |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `Table` | $1500 \times 800 \times 850$ | 0 mm (podłoga) | 50 mm | Stojący (przód) | In (lewy), Out (prawy) | MIT |
| `TableESD` | $1500 \times 800 \times 850$ | 0 mm (podłoga) | 50 mm | Stojący ESD | In (lewy), Out (prawy) | MIT |
| `TableToolRail` | $1500 \times 800 \times 2000$ | 0 mm (podłoga) | 50 mm | Stojący z balanserem | In (lewy) | MIT |
| `QualityGate` | $1800 \times 900 \times 2100$ | 0 mm (podłoga) | 80 mm | Kontroler jakości | In (wejście), Out (OK) | MIT |
| `ReworkStation` | $1500 \times 800 \times 1900$ | 0 mm (podłoga) | 60 mm | Technik napraw | In (NOK) | MIT |
| `FlowRackFIFO2Tier` | $1200 \times 1000 \times 1400$ | 0 mm (podłoga) | 50 mm | Pobieranie + Zasilanie | Port ładowania (tył), Port odbioru (przód) | MIT |
| `FlowRackFIFO3Tier` | $1200 \times 1000 \times 1700$ | 0 mm (podłoga) | 50 mm | Pobieranie + Zasilanie | Port zasilania (tył), Port odbioru (przód) | MIT |
| `RollerConveyorGravity` | $2000 \times 600 \times 800$ | 0 mm (podłoga) | 60 mm | — | Wlot (0°), Wylot (180°) | MIT |
| `RollerConveyorMotorized` | $2000 \times 600 \times 800$ | 0 mm (podłoga) | 70 mm | Serwis napędu | Wlot napędzany, Wylot napędzany | MIT |
| `PalletEuroFloorMark` | $1200 \times 800 \times 144$ | 0 mm (podłoga) | 100 mm | — | Dojazd wózkiem widłowym/paletowym | MIT |
| `OperatorErgoMat` | $900 \times 600 \times 15$ | 0 mm (posadzka) | 0 mm | Strefa stania | — | MIT |
| `Shadowboard5S` | $1000 \times 300 \times 1800$ | 0 mm (podłoga) | 50 mm | Strefa sięgania | — | MIT |
| `AndonBoard` | $1200 \times 200 \times 600$ | 2200 mm (strop) | 20 mm | — | — | MIT |
| `MaterialIn` | $2000 \times 1500 \times 200$ | 0 mm (podłoga) | 100 mm | Rozładunek dostaw | Wjazd logistyki magazynowej | MIT |
| `FinishedGoods` | $2000 \times 1500 \times 200$ | 0 mm (podłoga) | 100 mm | Odbiór wyrobów | Odbiór palet wyrobu gotowego | MIT |

---

## 9. Niezmiennik oddzielenia modelu wizualnego od parametrów technologicznych

Niezmiennik jest chroniony funkcją:
```typescript
assertVisualModelIndependence(technologicalParamsBefore, technologicalParamsAfter)
```
Próba zmiany:
- czasu cyklu stanowiska (`cycleTimeSeconds`),
- czasu operacji (`standardTimeSeconds`),
- możliwości technologicznych (`capableOperationIds`)
w ramach podmiany geometrii lub modelu 3D rzuca wyjątek błędu i odrzuca mutację.
