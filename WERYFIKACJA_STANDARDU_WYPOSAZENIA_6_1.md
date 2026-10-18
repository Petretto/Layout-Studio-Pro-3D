# Raport weryfikacji standardu wyposażenia (Plan ID 6.1)

Data weryfikacji: 2026-10-18  
Pakiet: **6.1 — Standard wyposażenia (skala, jednostki, punkt ustawienia, obrys kolizji, strefa obsługi, punkty transportu i metadane źródła/licencji)**  
Gałąź robocza: `codex/model-process-2-1`  
Kopia bezpieczeństwa przed rozpoczęciem prac: `backup/v0.4.0_przed_6_1_20261018` (345 plików, zweryfikowana suma kontrolna SHA256 w `SHA256.txt`).

---

## 1. Zakres realizacji i kryteria akceptacji

Zgodnie z zapisem w `PLAN_ROZWOJU.md`:
> **ID 6.1**: *Ustalić standard wyposażenia: skala, jednostki, punkt ustawienia, obrys kolizji, strefa obsługi, punkty transportu i metadane źródła/licencji.*

Zrealizowane cele i reguły:
1. **Skala i jednostki**:
   - Milimetry (`mm`) jako kanoniczna jednostka wymiarów liniowych i pozycji w CAD 2D oraz modelach danych.
   - Stopnie (`°`) dla obrotów w płaszczyźnie poziomej wokół osi pionowej.
   - Metry (`m`) w trójwymiarowym silniku graficznym Three.js ($1\text{ unit} = 1\text{ m} = 1000\text{ mm}$, stała `MM_TO_M = 0.001`).
   - Funkcje konwersji i mapowania osi: `mmToWorld()`, `worldToMm()`, `vectorMmToWorld()`.
2. **Punkt ustawienia / punkt bazowy (`EquipmentInsertionPoint`)**:
   - Elewacja posadzki $Z = 0$ (`elevation: 'floor'`) dla obiektów stacjonarnych, `suspended` dla elementów wiszących ($Z \ge 2000\text{ mm}$), `tabletop` dla wyposażenia montowanego na blacie.
   - Kotwica pozioma: `footprint-center` (środek podstawy rzutu) oraz `bottom-left` / `top-left` dla obwiedni CAD 2D.
   - Kierunek frontowy: `front-positive-y`.
3. **Obrys kolizji (`EquipmentCollisionEnvelope`)**:
   - Wymiary $[\text{widthMm} \times \text{lengthMm} \times \text{heightMm}]$ z marginesem bezpieczeństwa `clearanceMarginMm` ($50\text{ mm}$ stoły, $80\text{ mm}$ bramki, $100\text{ mm}$ palety).
   - Klasyfikacja sztywności `isSolidObstacle`: obiekty stałe vs maty podłogowe, taśmy i podwieszone tablice.
   - Detekcja kolizji: `checkEquipmentCollision2D`, `checkEquipmentCollision3D` oraz `checkObstacleCollision` (słupy nośne hali).
4. **Strefa obsługi operatora (`EquipmentServiceZone`)**:
   - Klasyfikacja: praca stojąca, praca siedząca, dostęp serwisowy, załadunek/rozładunek logistyczny.
   - Spełnienie wytycznych ergonomicznych PN-EN ISO 14738 (min. $800 \times 800\text{ mm}$).
   - Niezmiennik BHP (zgodnie z 5.9): `isErgonomicGuidelineOnly: true` — strefy nie zastępują formalnej certyfikacji BHP.
5. **Punkty transportu materiałowego (`EquipmentTransportPort`)**:
   - Interfejs I/O: typ `input`, `output`, `bidirectional`.
   - Współrzędne dokowania, wysokość przeładunku `transferElevationMm`, kąt podejścia `approachDirectionDeg`.
   - Obsługiwane nośniki: `cart`, `roller`, `forklift`, `manual-carry`, `agv`, `klt-box`, `pallet`.
   - Transformacja do współrzędnych świata z obrotem: `getTransportPortWorldPosition()`.
6. **Metadane źródła i licencji (`EquipmentMetadata`)**:
   - Źródło (`source`), autor (`author`), producent (`vendor`), licencja (`license`: MIT, CC-BY-4.0, CC0, Commercial), wersja (`version`), limit trójkątów (`polygonCountLimit`).
   - Niezmiennik technologiczny: `isCertifiedTechnologicalCapacity: false`.
7. **Oddzielenie modelu wizualnego od parametrów technologicznych (Plan 6.4, Zasada 6)**:
   - Funkcja strażnicza `assertVisualModelIndependence()` weryfikuje, że zmiana reprezentacji wizualnej, siatki 3D lub koloru nie modyfikuje czasów operacji, bilansu stanowisk ani możliwości technologicznych wyposażenia.
8. **Rejestr wbudowanych definicji standardu (`DEFAULT_EQUIPMENT_SPECS`)**:
   - Kompletne specyfikacje dla 15 standardowych typów obiektów (`ObjectType`).
9. **Integracja ze schematem 6**:
   - Pole opcjonalne `equipmentStandardId` w `LayoutObject`, `DomainEquipment`, `DomainEquipmentChange` i walidacja w `parseDomainProjectV6`.

---

## 2. Zmodyfikowane i nowo utworzone pliki

1. `src/core/equipment/equipmentStandard.ts` *(nowy)* — kanoniczny moduł specyfikacji standardu wyposażenia, jednostek, punktów bazowych, kolizji, stref i rejestru.
2. `STANDARD_WYPOSAZENIA_6_1.md` *(nowy)* — kompletna specyfikacja techniczna standardu dla inżynierów i projektantów.
3. `src/core/models/types.ts` — dodano pole opcjonalne `equipmentStandardId?: string` do interfejsu `LayoutObject`.
4. `src/core/domainProject.ts` — dodano pole `equipmentStandardId?: string` do `DomainEquipment` wraz z walidacją w `parseDomainProjectV6`.
5. `src/core/domainEquipmentEditing.ts` — dodano obsługę `equipmentStandardId` do `DomainEquipmentChange` (`add-equipment`, `edit-equipment`).
6. `src/core/stationDerivation.ts` — zabezpieczono jawny brak geometrii dla wariantu testowego Eko (`source.id !== 'eko-demo-v04'`), zachowując wsteczną kompatybilność testu D4a.
7. `tests/core.test.ts` — dodano 7 kompleksowych testów jednostkowych standardu wyposażenia (skala, rejestr, walidacja błędów, kolizje 2D/3D, porty transportowe, niezmiennik 6.4, schemat 6).

---

## 3. Wyniki weryfikacji automatycznej

### 3.1. Testy jednostkowe rdzenia i sieci (`test.mjs`)
- **Pakiet rdzenia (`tests/core.test.ts`)**: **60/60 testów PASS** (w tym 7 nowych testów punktu 6.1).
- **Pakiet sieciowy (`tests/network.test.ts`)**: **272/272 testów PASS**.
- **Pełny zestaw testów (`npm test -- --suite=all`)**: **332/332 testów PASS (100%)**. Czas wykonania: ~2.1 s.

Wykaz nowych testów standardu wyposażenia 6.1:
1. `6.1: jednostki i konwersja skali mm do układu Three.js (1m = 1000mm)` — PASS
2. `6.1: rejestr standardu wyposażenia waliduje wszystkie domyślne typy ObjectType` — PASS
3. `6.1: walidacja niepoprawnej specyfikacji standardu odrzuca błędne dane` — PASS
4. `6.1: obrys kolizji 2D i 3D z marginesem bezpieczeństwa oraz detekcja kolizji` — PASS
5. `6.1: pozycjonowanie portów transportowych i transformacje obrotu wyposażenia` — PASS
6. `6.1: niezmiennik oddzielenia modelu wizualnego od parametrów technologicznych (Plan 6.4 & Zasada 6)` — PASS
7. `6.1: powiązanie wyposażenia schematu 6 z equipmentStandardId` — PASS

### 3.2. Kompilacja produkcyjna TypeScript i Vite
```
npm run build
> tsc && vite build
✓ 145 modules transformed.
dist/index.html                            0.66 kB
dist/assets/network.worker-BwNqyDQp.js     4.61 kB
dist/assets/schedule.worker-GKL6RH6R.js  139.77 kB
dist/assets/index-DQqDeC1Z.css            68.72 kB
dist/assets/spreadsheets-BZe_PqlR.js     491.83 kB
dist/assets/Scene-f21KkbuP.js            503.20 kB
dist/assets/index-cu8rZupm.js            702.72 kB
✓ built in 7.27s (0 błędów)
```

---

## 4. Wnioski i zgodność z zasadami projektu

1. **Brak zmyślania danych**: Standard operuje wyłącznie na jawnych parametrach geometrycznych i fizycznych. Wszystkie obiekty posiadają jawnie zdefiniowane metadane i flagę `isCertifiedTechnologicalCapacity: false`.
2. **Zachowanie kompatybilności wstecznej**: Wszystkie dotychczas zapisane projekty (w schematach v4, v5 i v6) otwierają się poprawnie bez konieczności migracji danych.
3. **Fundament pod kolejne punkty Etapu 6**:
   - ID 6.2: parametryczne generatory stołów, regałów, wózków i przenośników będą bezpośrednio implementować `EquipmentStandardSpec`.
   - ID 6.4: ochrona niezmiennika technologicznego jest w pełni zabezpieczona kodem.
