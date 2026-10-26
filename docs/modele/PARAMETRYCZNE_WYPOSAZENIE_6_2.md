# Parametryczne Wyposażenie 3D — Specyfikacja Techniczna (Plan Rozwoju ID 6.2)

Dokument stanowi autorytatywną specyfikację techniczną parametrycznych modeli 3D wyposażenia produkcyjnego dla aplikacji **Layout Studio Pro 3D** wdrożonych w ramach punktu **Plan ID 6.2** (*Przygotować parametryczne stoły, regały, palety, pojemniki, wózki i przenośniki*).

---

## 1. Cel i zakres modułu

Moduł `src/core/equipment/parametricEquipmentModels.ts` dostarcza procedurę generowania trójwymiarowych modeli wyposażenia przemysłowego w silniku Three.js na podstawie zadeklarowanych parametrów obiektu layoutu (`widthMm`, `lengthMm`, `heightMm`, `colorHex`, `rotationDeg`) oraz standardów wyposażenia zdefiniowanych w punkcie 6.1.

### Podstawowe zasady konstrukcyjne
1. **Zasada 6 & Plan 6.4 (Niezależność wizualna)**: Model wizualny 3D i obrys CAD nie są źródłem prawdy technologicznej. Zmiana geometrii, koloru, siatki trójkątów czy poziomu detali nie modyfikuje czasów operacji, zdolności maszynowej ani bilansu linii.
2. **Kanon skali i jednostek (6.1)**: Wewnętrzny model Three.js operuje w metrach ($1\text{ jednostka} = 1\text{ m} = 1000\text{ mm}$), podczas gdy interfejs i dane wejściowe operują w milimetrach [mm].
3. **Płaskość podłogi i punkt bazowy**: Każdy obiekt naziemny posiada punkt styku z posadzką na $Z=0$, a punkt wstawienia odpowiada środkowi rzutu poziomego (`footprint-center`).
4. **Wydajność i budżet trójkątów**: Zastosowano zoptymalizowane bryły parametryczne i współdzieloną paletę materiałów PBR, co gwarantuje płynne 60 FPS nawet przy ponad 50 stanowiskach roboczych na scenie.
5. **Zapobieganie wyciekom pamięci GPU**: Dedykowana funkcja `disposeEquipmentGroup` zwalnia geometrie i unikalne materiały przy usuwaniu lub przeładowaniu obiektów.

---

## 2. Katalog parametrycznych rodzin wyposażenia

### 2.1. Stoły montażowe i stanowiskowe (Workbenches & Tables)
Obsługiwane typy: `Table`, `TableESD`, `TableToolRail`, `QualityGate`, `ReworkStation`, `TestStationBench`.

- **Blat roboczy**: Płyta nośna o grubości 50 mm, wykonana z materiału o wykończeniu laminowanym lub ESD (`#1e3a8a` / `#1d4ed8`) z zaoblonymi krawędziami czołowymi.
- **Konstrukcja nośna**: 4 nogi z profili aluminiowych lub stali (60×60 mm) ze stopami wahliwymi (średnica 70 mm, wysokość 20 mm) spoczywającymi na $Z=0$.
- **Wieniec usztywniający**: Wzdłużne i poprzeczne belki podblatowe (40×40 mm) zapobiegające ugięciom blatu.
- **Podnóżek ergonomiczny**: Stalowa belka na wysokości 150 mm nad podłogą dla komfortu operatora.
- **Nadbudowa modułowa**:
  - Dwa tylne słupy pionowe wznoszące się na wysokość 800–1200 mm nad blat.
  - Górna półka wspornikowa o regulowanej głębokości (300–350 mm).
  - Tablica perforowana (euro-perforacja 5S) do zawieszania narzędzi podręcznych.
  - Szyna podwieszenia balanserów narzędziowych z oprawą oświetlenia LED stanowiska.
- **Wariant ESD (`TableESD`)**: Specjalna nakładka z maty rozpraszającej ładunki elektrostatyczne o grubości 5 mm.
- **Wariant testowy (`TestStationBench`)**: Półka na aparaturę pomiarową (oscyloskopy, zasilacze), aluminiowy kanał elektroinstalacyjny z gniazdami oraz ramię z monitorem diagnostycznym.

---

### 2.2. Regały przepływowe i magazynowe (Racks & Shelving)
Obsługiwane typy: `FlowRackFIFO2Tier`, `FlowRackFIFO3Tier`, `ShelvingUnitBulk`.

- **Regał przepływowy FIFO (`FlowRackFIFO3Tier` / `FlowRackFIFO2Tier`)**:
  - Konstrukcja ramowa z rur modułowych (system rur D28 / profili aluminiowych) ze stężeniami ukośnymi.
  - 2 lub 3 nachylone półki grawitacyjne o spadku ~3,5° w stronę operatora (załadunek od tyłu $-Z$, pobieranie od przodu $+Z$).
  - Tory rolkowe z listwami rozdzielającymi oraz czołową burtą oporową ze stali ocynkowanej.
  - Odwrócona półka dolna ze spadkiem wstecznym do grawitacyjnego zwrotu pustych pojemników KLT.
  - Proceduralnie rozmieszczone pojemniki KLT na bieżących torach rolkowych.
- **Regał magazynowy wysokiego składowania (`ShelvingUnitBulk`)**:
  - Płaskie ramy drabinowe z perforowanych słupów stalowych (70×50 mm) z kotwionymi płytami podstawy.
  - Poziome belki nośne (trawersy) w kolorze bezpieczeństwa pomarańczowym (`#ea580c`).
  - 3 do 5 poziomów składowania z wypełnieniem kratownicowym lub stalowymi półkami półkowymi.
  - Kartony i zasobniki magazynowe ułożone na półkach proporcjonalnie do rozpiętości regału.

---

### 2.3. Palety i oznakowania podłogowe (Pallets & Floor Demarcation)
Obsługiwane typy: `PalletEuroFloorMark`, `PalletEuroStack`.

- **Standard palety Euro (EPAL 1200×800×144 mm)**:
  - 5 desek górnych: 3 deski skrajne/środkowa (szerokość 145 mm) oraz 2 deski pośrednie (100 mm), grubość 22 mm.
  - 3 deski poprzeczne spinające (145×22×800 mm).
  - 9 litych klocków dystansowych (145×145×78 mm w narożnikach/środku oraz 145×100×78 mm na bokach).
  - 3 płozy dolne o sfazowanych krawędziach wprowadzających dla wideł wózków paletowych.
  - Naturalna faktura drewna sosnowego/świerkowego (`#c89f68` / `#8b5a2b`).
- **Oznakowanie podłogowe pola odkładczego (`PalletEuroFloorMark`)**:
  - Pasy wyznaczające strefę odkładczą o szerokości 80 mm w kolorze żółtym ostrzegawczym (`#facc15`).
  - 4 stalowe narożniki ochronne / ograniczniki bazujące w kolorze czerwonym (`#ef4444`).
- **Stos palet Euro (`PalletEuroStack`)**:
  - Proceduralny stos 3 do 5 palet Euro ułożonych jedna na drugiej do zadanej wysokości.

---

### 2.4. Pojemniki i skrzynki KLT (Containers & KLT Boxes)
Obsługiwane typy: `KltBoxStack`, `MaterialIn`, `FinishedGoods`.

- **Geometria zgodna z normą VDA 4500 (RL-KLT / R-KLT)**:
  - Wzmocnione dno o usztywniającej strukturze żebrowej.
  - Ergonomiczne uchwyty muszlowe na ściankach czołowych.
  - Zintegrowane kieszenie na etykiety logistyczne i karty kanban.
  - Górny kołnierz sztaplowy z zamkiem blokującym stabilne układanie w stosy.
- **Kodyfikacja kolorystyczna zgodna ze standardami przemysłowymi**:
  - `MaterialIn`: kolor zielony sygnałowy (`#16a34a`) lub niebieski, oznaczający wejście materiałów.
  - `FinishedGoods`: kolor niebieski szafirowy (`#2563eb`) z pokrywą zabezpieczającą gotowe wyroby.
  - `KltBoxStack`: matowy grafit (`#475569`) lub niebieski, ułożony w siatce kontenerowej (np. 2×2, 2×3) zależnie od wymiarów obrysu.

---

### 2.5. Wózki transportowe i roboty mobilne (Transport Carts & AMR/AGV)
Obsługiwane typy: `CartTuggerPlatform`, `AGVMiniLifter`.

- **Wózek platformowy pociągowy (`CartTuggerPlatform`)**:
  - Rama nośna spawana ze stalowych profili zamkniętych w kolorze niebieskim (`#1d4ed8`).
  - Płyta ładunkowa z krawędziami zabezpieczającymi ładunek w barwie żółto-czarnej.
  - 4 przemysłowe zestawy kołowe z poliuretanowym bieżnikiem: 2 skrętne z przodu, 2 stałe z tyłu, dotykające posadzki na $Z=0$.
  - Ergonomiczny uchwyt do pchania ręcznego oraz dyszel holowniczy z przednim i tylnym zaczepem sworzniowym do pociągów logistycznych.
- **Robot mobilny / samojezdny podnośnik (`AGVMiniLifter`)**:
  - Niski profil podwozia (prześwit 30 mm, wysokość bryły do 280 mm) z zaoblonymi narożnikami bezpieczeństwa.
  - Dwa skanery laserowe LIDAR 2D zamontowane po przekątnej (przód-lewo, tył-prawo) zapewniające pole widzenia 360°.
  - Dookolna taśma świetlna LED oraz maszt sygnalizacyjny wskazujący status pracy robota (ruch, postój, ostrzeżenie).
  - Górny stół z podnośnikiem nożycowym/sworzniowym do automatycznego pobierania wózków i palet.

---

### 2.6. Przenośniki rolkowe (Conveyors)
Obsługiwane typy: `RollerConveyorGravity`, `RollerConveyorMotorized`, `ConveyorRollerSegment`.

- **Profile burtowe**: Konstrukcja ze stali giętej lub tłoczonego aluminium (wysokość burt 120 mm) z otworami montażowymi osi rolek.
- **Rolki transportowe**: Cylindry ze stali ocynkowanej (średnica 70 mm) osadzone łożyskowane ze stałą podziałką 100 mm wzdłuż całej długości przenośnika. Liczba rolek wyliczana jest ściśle z długości segmentu: $\lfloor (L - 100) / 100 \rfloor$.
- **Podpory w układzie H**: Regulowane teleskopowe nogi wsporcze rozmieszczone co 1,5–2,0 m z płytami stopowymi kotwionymi do posadzki i stężeniami poprzecznymi.
- **Wariant z napędem (`RollerConveyorMotorized`)**: Boczna obudowa motoreduktora i osłona cięgien napędowych.

---

### 2.7. Elementy 5S, ergonomia i sygnalizacja wizualna
Obsługiwane typy: `OperatorErgoMat`, `Shadowboard5S`, `AndonBoard`.

- **Mata ergonomiczna (`OperatorErgoMat`)**: Sprężysta mata antyzmęczeniowa o grubości 20 mm z bąbelkową fakturą powierzchni i bezpiecznymi ściętymi krawędziami najazdowymi w żółtym kolorze ostrzegawczym (`#facc15`).
- **Tablica cieni 5S (`Shadowboard5S`)**: Mobilna tablica narzędziowa na kółkach z wyciętymi sylwetkami kluczy, młotka i wkrętaków, wspierająca standaryzację stanowiska.
- **Tablica Andon (`AndonBoard`)**: Podwieszana pod stropem tablica świetlna LED z 3-kolorową wieżą sygnalizacyjną (czerwony/żółty/zielony) informującą o stanie linii.

---

## 3. Zintegrowane nakładki wizualne (Overlays 3D)

W oparciu o specyfikację 6.1, generator parametryczny udostępnia opcjonalne warstwy diagnostyczne:

1. **Strefa obsługi operatora (`showServiceZone`)**:
   - Przezroczysty błękitny prostopadłościan (`#38bdf8`, krycie 22%) z obrysem liniowym, pokazujący przestrzeń roboczą wymaganą dla operatora stojącego lub siedzącego zgodnie z ISO 14738.
2. **Obrys kolizyjny z marginesem (`showCollisionEnvelope`)**:
   - Bursztynowy obrys siatkowy (`#f59e0b`, krycie 45%) uwzględniający strefę bezpieczeństwa i minimalne prześwity komunikacyjne (50–100 mm).
3. **Porty dokowania i transportu (`showTransportPorts`)**:
   - Płytki dokujące w kolorze zielonym (wejście materiału) i czerwonym (wyjście wyrobu) wraz ze strzałkami wektorowymi wskazującymi kierunek podjazdu wózka lub podania detalu.

---

## 4. Weryfikacja i testy automatyczne

Implementacja została zweryfikowana zestawem testów w `tests/core.test.ts`:
- Generowanie wszystkich 15 standardowych i rozszerzonych typów wyposażenia.
- Prawidłowe skalowanie parametryczne (liczba nóg, rozstaw rolek, grubość blatów).
- Prawidłowe pozycjonowanie w trójwymiarowym układzie współrzędnych ($X, Y, Z$) oraz transformacje obrotu wokół osi pionowej.
- Włączanie i wyłączanie nakładek stref obsługi, obrysów kolizji i portów dokujących.
- Bezpieczne zwalnianie pamięci GPU przez `disposeEquipmentGroup` (brak wycieków zasobów WebGL).
