# 6.3 — Charakterystyczne modele wyposażenia i wyrobów w Blenderze

Data odbioru: **2026-10-28**  
Punkt planu: **6.3** (`PLAN_ROZWOJU.md`)  
Narzędzie modelowania: **Blender 5.2.1 LTS** (headless via Python `bpy`, `--background --factory-startup --python-exit-code 1`)  
Status: **wdrożone**

---

## 1. Zakres realizacji

W ramach punktu 6.3 opracowano kompletny zestaw 10 autorskich modeli demonstracyjnych wyposażenia, regałów i wyrobów dla Layout Studio Pro. Modele pokrywają:
1. **Regały z materiałów dostarczonych przez użytkownika** (`Dane do wyposażenia`):
   * `concept-shelving-rack`: regał półkowy magazynowy $1000 \times 300 \times 2500\text{ mm}$ (5 półek).
   * `concept-pallet-rack-single`: wysokoskładowy regał paletowy PHR 1-gniazdowy $2870 \times 1100 \times 4500\text{ mm}$ (0+3 poziomy, 3 europalety na trawersach).
   * `concept-pallet-rack-double`: wysokoskładowy regał paletowy PHR 2-gniazdowy $5655 \times 1100 \times 4500\text{ mm}$ (0+3 poziomy, wspólna rama środkowa).
2. **Wyposażenie i podzespoły dla pakietów demonstracyjnych 7.12**:
   * `concept-industrial-module`: moduł przemysłowy / korpus bazowy $1200 \times 800 \times 1400\text{ mm}$ (dla Pakietu 03 *Moduł urządzenia*).
   * `concept-power-subassembly`: charakterystyczny podzespół zasilania `SUB-PWR` $500 \times 350 \times 250\text{ mm}$ (dla Pakietu 03).
   * `concept-drive-subassembly`: charakterystyczny moduł napędu `SUB-DRV` $450 \times 300 \times 280\text{ mm}$ (dla Pakietu 03).
   * `concept-assembly-fixture`: przyrząd montażowy z dociskiem szybkomocującym $600 \times 400 \times 300\text{ mm}$ (dla Pakietu 01 *Zestaw montażowy*).
3. **Koncepty zachowane z etapu 6.3b**:
   * `concept-assembly-bench`: stanowisko montażowe z nadbudową i oświetleniem $1500 \times 800 \times 1850\text{ mm}$.
   * `concept-shelf-cart`: wózek półkowy 3-poziomowy $1000 \times 600 \times 1050\text{ mm}$.
   * `concept-parts-rack`: regał na drobne części z pojemnikami $950 \times 450 \times 1650\text{ mm}$.

---

## 2. Metryki modeli (budżet złożoności i kontakt z podłożem)

Wszystkie modele mieszczą się w rygorystycznym budżecie technicznym $\le 5\,000$ trójkątów, posiadają zweryfikowany kontakt z podłożem $Z=0$ oraz symetryczne wycentrowanie rzutu $X=0, Y=0$.

| Identyfikator | Nazwa modelu | Gabaryty X × Y × Z [mm] | Trójkąty | Limit | Rozmiar GLB | Rozmiar .blend |
| --- | --- | --- | --- | --- | --- | --- |
| `concept-assembly-bench` | Stanowisko montażowe z nadbudową | 1500 × 800 × 1850 | 576 | 5000 | 75.0 kB | 113.3 kB |
| `concept-shelf-cart` | Wózek półkowy | 1000 × 600 × 1050 | 508 | 5000 | 46.4 kB | 103.4 kB |
| `concept-parts-rack` | Regał na drobne części | 950 × 450 × 1650 | 1068 | 5000 | 138.1 kB | 126.5 kB |
| `concept-shelving-rack` | Regał półkowy magazynowy | 1000 × 300 × 2500 | 216 | 5000 | 27.9 kB | 98.8 kB |
| `concept-pallet-rack-single` | Regał paletowy PHR 1-gniazdowy | 2870 × 1100 × 4500 | 504 | 5000 | 64.9 kB | 108.5 kB |
| `concept-pallet-rack-double` | Regał paletowy PHR 2-gniazdowy | 5655 × 1100 × 4500 | 540 | 5000 | 69.2 kB | 109.4 kB |
| `concept-industrial-module` | Moduł przemysłowy / korpus bazowy | 1200 × 800 × 1400 | 276 | 5000 | 36.2 kB | 102.0 kB |
| `concept-power-subassembly` | Podzespół zasilania SUB-PWR | 500 × 350 × 250 | 396 | 5000 | 37.4 kB | 102.7 kB |
| `concept-drive-subassembly` | Podzespół napędu SUB-DRV | 450 × 300 × 280 | 216 | 5000 | 18.3 kB | 97.8 kB |
| `concept-assembly-fixture` | Przyrząd montażowy z dociskiem | 600 × 400 × 300 | 444 | 5000 | 35.5 kB | 99.1 kB |

---

## 3. Ochrona niezmienników domenowych

* **Zasada 6 i Plan 6.4:** Modele wizualne są wyłącznie reprezentacją graficzną w Three.js (`visualModelId`). Wybór lub zmiana modelu nie wpływa na czas operacji, taktowanie linii, zdolność produkcyjną, przypisania zasobów ani pojemności buforów.
* **Czystość pochodzenia danych:** Modele są w 100% autorską geometrią proceduralną wygenerowaną w Blenderze. Wszystkie karty posiadają flagi `basis: "assumed"` oraz `isCertifiedTechnologicalCapacity: false`.
* **Automatyczna kompilacja:** Pliki GLB są kompilowane skryptem `generate_concept_render_assets.mjs` do natywnego JSON Three.js w `src/core/equipment/visualAssets/`, co uniemożliwia wstrzykiwanie dowolnego, niezweryfikowanego kodu do sceny.

---

## 4. Dowody weryfikacji

1. **Bezgłowy generator Blendera (`scripts/build_equipment_concepts.py`):**
   * Wygenerowano 10 scen `.blend`, 10 plików `.glb` i 10 renderów `.png`.
   * Wynik: `CONCEPTS_PASS` (kod wyjścia 0).
2. **Niezależne ponowne otwarcie w Blenderze (`scripts/verify_equipment_concept_blends.py`):**
   * Zweryfikowano strukturę obiektów, jednostki metryczne, kontakt Z=0 i metadane założeń dla wszystkich 10 plików `.blend`.
   * Wynik: 10/10 `BLEND_REOPEN_PASS` (kod wyjścia 0).
3. **Testy jednostkowe Three.js i kart briefów (`tests/equipmentConcepts.test.mjs`, `tests/equipmentBrief.test.mjs`):**
   * Odczyt GLB za pomocą `GLTFLoader`, kontrola wymiarów z dokładnością do 0,1 mm, weryfikacja braku elementów studia (kamer/świateł), zgodność trójkątów z raportem.
   * Wynik: **13/13 PASS** (0 błędów).
4. **Weryfikacja w przeglądarce Edge via CDP (`tests/qa/verify_6_3a.mjs --concepts`):**
   * Weryfikacja galerii 10 modeli, wczytywania kart, ochrony niezapisanych danych, eksportu JSON i responsywności w rozdzielczościach 1440 px i 600 px bez błędów konsoli i bez przepełnienia widoku.
   * Wynik: **PASS**.
5. **Regresja niezmiennika wyglądu (`node scripts/test.mjs --suite=core "--test-name-pattern=6\.4"`):**
   * Wynik: **4/4 PASS** (niezmienność technologii, auto-zapis, izolacja instancji GPU).
6. **Kompilacja i typecheck aplikacji:**
   * `npm.cmd run build` zakończony pomyślnie z kodem 0 (7.37s).
