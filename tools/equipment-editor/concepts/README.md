# Autorskie koncepty wyposażenia — 6.3

Dziesięć modeli demonstracyjnych zaprojektowanych dla Layout Studio w Blenderze 5.2.1 LTS. Modele powstały w ramach punktu 6.3 planu rozwoju: 3 koncepty z inspiracji katalogowej (6.3b), 3 modele regałów z rysunków i danych dostarczonych przez użytkownika w katalogu `Dane do wyposażenia` oraz 4 charakterystyczne modele wyposażenia i podzespołów dla pakietów pokazowych 7.12 (Pakiet 01 i Pakiet 03).

Modele nie są skanami ani zastrzeżonymi plikami CAD producentów. Geometria jest w 100% autorska i proceduralna.

## Modele w pakiecie

1. **Stanowisko montażowe z nadbudową** (`concept-assembly-bench`): $1500 \times 800 \times 1850\text{ mm}$, blat 850 mm, tablica narzędziowa, półka, belka LED, kontener z szufladami (576 trójkątów).
2. **Wózek półkowy** (`concept-shelf-cart`): $1000 \times 600 \times 1050\text{ mm}$, trzy poziomy odkładania, koła Z=0, pałąk manewrowy (508 trójkątów).
3. **Regał na części** (`concept-parts-rack`): $950 \times 450 \times 1650\text{ mm}$, 4 rzędy pojemników warsztatowych (1068 trójkątów).
4. **Regał półkowy magazynowy** (`concept-shelving-rack`): $1000 \times 300 \times 2500\text{ mm}$, 4 słupy z nóżkami, 5 poziomów półek stalowych z usztywnieniem (216 trójkątów; źródło: `Dane do wyposażenia/Regał`).
5. **Regał paletowy PHR 1-gniazdowy** (`concept-pallet-rack-single`): $2870 \times 1100 \times 4500\text{ mm}$, wnęka 2700 mm na 3 europalety, 2 niebieskie ramy słupowe RAL 5015 z kratownicą i stopami kotwionymi, 3 poziomy pomarańczowych belek trawersowych RAL 2004 (poziomy 1400, 2800, 4200 mm), tylne stężenie krzyżowe (504 trójkąty; źródło: `Dane do wyposażenia/Regał paletowy PHR jednokolumnowy`).
6. **Regał paletowy PHR 2-gniazdowy** (`concept-pallet-rack-double`): $5655 \times 1100 \times 4500\text{ mm}$, 2 wnęki po 2700 mm, 3 ramy słupowe, wspólna rama środkowa, 2x3 pary pomarańczowych trawersów (540 trójkątów; źródło: `Dane do wyposażenia/Regał paletowy PHR dwukolumnowy`).
7. **Moduł przemysłowy / korpus bazowy** (`concept-industrial-module`): $1200 \times 800 \times 1400\text{ mm}$, spawana rama stalowa z profili zamkniętych, płyta bazowa, tylna płyta montażowa, stopy poziomujące i uszy transportowe (276 trójkątów; dla Pakietu 03).
8. **Podzespół zasilania SUB-PWR** (`concept-power-subassembly`): $500 \times 350 \times 250\text{ mm}$, aluminiowa płyta montażowa, radiator wielożebrowy, transformator z miedzianym uzwojeniem, złącza przemysłowe wielopinowe (396 trójkątów; dla Pakietu 03).
9. **Podzespół napędu SUB-DRV** (`concept-drive-subassembly`): $450 \times 300 \times 280\text{ mm}$, silnik serwo z obudową żebrowaną, przekładnia planetarna z kołnierzem, wał zdawczy z wpustem pryzmatycznym i wspornik mocujący (216 trójkątów; dla Pakietu 03).
10. **Przyrząd montażowy z dociskiem** (`concept-assembly-fixture`): $600 \times 400 \times 300\text{ mm}$, stalowa płyta bazowa z rowkami T, pryzmy bazujące i dwa szybkomocujące dociski mechaniczne toggle clamp (444 trójkąty; dla Pakietu 01).

Wszystkie gabaryty i cechy mają oznaczenie `basis: assumed` i `isCertifiedTechnologicalCapacity: false`. Zgodnie z Zasadą 6 i Planem 6.4 zmiana modelu wizualnego nie modyfikuje parametrów technologicznych, taktowania linii ani czasów operacji.

## Pliki i formaty

Każdy koncept zawiera:
- `concept-*.blend`: plik źródłowy sceny w Blenderze z geometrią, materiałami i oświetleniem studyjnym.
- `concept-*.glb`: zoptymalizowana siatka glTF (jednostka metr, Y pionowo) zawierająca wyłącznie geometrię wyposażenia bez świateł i kamery.
- `concept-*.png`: render poglądowy wygenerowany w Blenderze (640x640 px).
- `concept-*.json`: karta wyposażenia zgodna z edytorem 6.3a.
- `src/core/equipment/visualAssets/concept-*.json`: skompilowane obiekty Three.js dla aplikacji głównej.

Budżet wielokątów wynosi maksymalnie 5000 trójkątów na model (najcięższy model ma 1068 trójkątów, pozostałe od 216 do 576 trójkątów).

## Odtwarzanie potoku

```bash
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --factory-startup --python-exit-code 1 --python scripts/build_equipment_concepts.py
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --factory-startup --python-exit-code 1 --python scripts/verify_equipment_concept_blends.py
node scripts/generate_equipment_concept_cards.mjs
node scripts/generate_concept_render_assets.mjs
node --test tests/equipmentConcepts.test.mjs tests/equipmentBrief.test.mjs
node tests/qa/verify_6_3a.mjs --concepts
npm.cmd run build
```
