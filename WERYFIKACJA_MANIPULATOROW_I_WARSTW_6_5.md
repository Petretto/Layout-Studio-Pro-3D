# Raport weryfikacji pakietu 6.5 — Manipulatory 3D przesuwania i obrotu oraz ukrywanie warstw i obiektów

Data odbioru: 2026-10-18  
Wersja bazowa: Layout Studio Pro 3D 0.4.0 (`codex/model-process-2-1`)  
Status kroku w PLAN_ROZWOJU.md: **wdrożone**  
Kopia zapasowa przed pracami: `backup/v0.4.0_przed_6_5_20261018` (391 plików, SHA-256 w `backup/v0.4.0_przed_6_5_20261018/SHA256.txt`)

---

## 1. Zakres wdrożenia i cel techniczny

Zgodnie z zapisem w `PLAN_ROZWOJU.md` (ID 6.5 w Etapie 6 — *Biblioteka wyposażenia i czytelne 3D*):
> *„Dodać wygodne manipulatory przesuwania i obrotu oraz ukrywanie warstw i obiektów.”*

Wdrożono:
1. **Manipulatory 3D (Gizmo / Three.js TransformControls)** w `src/components/studio/Scene.tsx`:
   - Precyzyjny manipulator przesuwania w płaszczyźnie posadzki ($XZ$ w Three.js, osie $X$ i $Y$ w rzucie CAD 2D), z blokadą niepożądanej modyfikacji wysokości ponad podłogę ($Y=0$ / zadany poziom $Z$).
   - Precyzyjny manipulator obrotu wokół osi pionowej (Yaw, kąt obrotu `rotationDeg` w stopniach).
   - Przełączanie trybów: `Przesuwanie 3D (W)`, `Obrót 3D (E)`, `Wyłącz manipulator (Q)`.
   - Przyciąganie do siatki (`gridSizeMm` z konfiguracji hali) w metrach (`translationSnap`) oraz do dyskretnych kątów co 15° (`rotationSnap = 15°`), sterowane przełącznikiem siatki `Siatka 3D (G)`.
   - Ścisła ochrona obiektów zablokowanych (`locked`): gdy obiekt jest zablokowany, manipulator zostaje odłączony (`detach()`), wyświetlana jest odznaka statusu `🔒 Zablokowany (brak manipulacji)`, a pola formularza są zablokowane.
   - Synchronizacja historii zmian (`Ctrl+Z` / `Ctrl+Y`): obsługa zdarzenia `dragging-changed` powoduje, że cała operacja manipulacji myszą zapisuje dokładnie **jeden** krok w historii projektu na `mouseUp`, eliminując zaśmiecanie stosu cofania mikroruchami w pętli renderowania.
2. **Ukrywanie warstw w 3D** w `Scene.tsx` oraz `Factory3DView.tsx`:
   - Spójna z edytorem CAD 2D (`5.6`) kategoryzacja obiektów za pomocą `classifyLayoutObjectLayer`:
     - `Stanowiska` (`stations`): stoły warsztatowe, montażowe, ESD, bramki kontroli jakości, stanowiska rework.
     - `Bufory i logistyka` (`buffers`): regały FIFO, regały magazynowe, palety EPAL, pojemniki KLT, wózki transportowe, AGV/AMR, przenośniki rolkowe, strefy wejścia/wyjścia materiałów.
     - `Strefy operatorów` (`operators`): ergonomiczne maty posadzkowe i strefy pracy.
     - `Przeszkody` (`obstacles`): słupy nośne i ściany wydzielone w hali.
     - `Połączenia procesu` (`routes`): fioletowe relacje technologiczne procesu.
   - Niezależne przełączniki w rozwijanym panelu `Warstwy 3D` na pasku narzędziowym 3D.
3. **Ukrywanie pojedynczych i zaznaczonych obiektów w 3D**:
   - Przycisk `Ukryj w 3D (H)` ukrywający aktualnie zaznaczony obiekt lub grupę obiektów.
   - Dynamiczny przycisk `Pokaż ukryte w 3D (N)` oraz skrót `Shift+H` przywracający widoczność wszystkich ukrytych obiektów.
   - Obiekty ukryte w 3D są pomijane przez raycaster interakcji i natychmiast odłączają manipulator 3D.
4. **Niezmiennik oddzielenia modelu wizualnego od technologii (Zasada 6 i Plan 6.4)**:
   - Żadne operacje widoku 3D (manipulatory, zmiana trybu gizmo, ukrywanie warstw/obiektów) nie modyfikują struktury operacji, czasów VA/NVA, zapotrzebowania, balansu ani wyników symulacji.

---

## 2. Architektura i kluczowe moduły

- `src/core/algorithms/layoutSelection.ts`:
  - `LayoutLayer3DId`, `Layout3DLayersState`, `DEFAULT_3D_LAYERS`: typy i domyślny stan widoczności warstw 3D.
  - `isLayoutObjectVisible3D(object, layers, hiddenObjectIds)`: czysta reguła sprawdzająca widoczność obiektu na podstawie warstwy i zbioru ukrytych identyfikatorów.
  - `hideObjectIds`, `showObjectIds`, `toggleHiddenObjectIds`: niemutujące funkcje zarządzania ukrytymi obiektami.
  - `canManipulate3D(object)`: ochrona obiektów `locked`.
  - `layoutToWorldCoordinates` i `worldToLayoutCoordinates`: matematyczna konwersja współrzędnych milimetrowych CAD 2D na metryczne współrzędne Three.js z opcjonalnym przyciąganiem do siatki `gridSizeMm`.
  - `degreesToWorldRotation` i `worldRotationToDegrees`: konwersja kątów w stopniach na radiany osi pionowej Three.js i z powrotem, z normalizacją do $[0, 360)$ i przyciąganiem do dyskretnych kątów (15°).
  - `LAYOUT_SHORTCUTS`: aktualizacja rejestru o skróty 3D: `W` (przesuwanie 3D), `E` (obrót 3D), `Q` (wyłącz manipulator), `H` (ukryj w 3D), `Shift+H` (pokaż ukryte w 3D).
- `src/components/studio/Scene.tsx`:
  - Integracja `TransformControls` z `OrbitControls` (tymczasowe wyłączanie obrotu kamery podczas przeciągania uchwytów).
  - Pasek narzędziowy z przyciskami trybów manipulatora, rozwijanym menu warstw 3D i akcjami ukrywania.
  - BoxHelper (`highlights`) podążający dynamicznie za przesuwanym i obracanym obiektem.
  - Pojedyncze wywołanie `commit.current` na zakończenie manipulacji myszą (`dragging-changed` z `event.value === false`).
- `src/components/viewport3d/Factory3DView.tsx`:
  - Spójna integracja filtrowania warstw 3D (`isLayoutObjectVisible3D`) oraz przyciski przełączania warstw (Stanowiska, Bufory, Strefy, Spaghetti) na pływającym pasku sterowania.
- `src/components/studio/HallWorkspace.css`:
  - Style dla `.badge-locked-3d`, `.layer-controls-dropdown` i `.layer-checkboxes`.

---

## 3. Wyniki weryfikacji automatycznej

### A. Testy jednostkowe (`npm.cmd test -- --suite=core`)
Wykonano 75 testów automatycznych w `tests/core.test.ts`. Wynik: **75/75 PASS (100%)**, czas wykonania: ~1.26s.
Dodane testy celowane dla kroku 6.5:
1. `6.5: przeliczanie współrzędnych 2D-3D, wysokości i obrotu z zachowaniem inwersji i przyciągania` (PASS).
2. `6.5: ochrona obiektów locked przed manipulacją 3D` (PASS).
3. `6.5: filtrowanie widoczności warstw 3D (stanowiska, bufory, operatorzy, relacje, przeszkody)` (PASS).
4. `6.5: ukrywanie pojedynczych obiektów i grup w 3D oraz ich przywracanie` (PASS).
5. `6.5: skróty klawiszowe 3D (W, E, Q, H, Shift+H) w rejestrze LAYOUT_SHORTCUTS` (PASS).
6. `6.5: niezmiennik symulacji i technologii przy manipulacji i ukrywaniu (Zasada 6 i Plan 6.4)` (PASS).

### B. Kompilacja TypeScript i Vite (`npm.cmd run build`)
Kompilacja `tsc && vite build` zakończona kodem 0 bez żadnych błędów typowania:
```
dist/index.html                              0.66 kB │ gzip:   0.42 kB
dist/assets/network.worker-BwNqyDQp.js       4.61 kB
dist/assets/schedule.worker-RPR1f3nM.js    140.17 kB
dist/assets/index-DbXCfLCL.css              69.40 kB │ gzip:  13.19 kB
dist/assets/spreadsheets-BZe_PqlR.js       491.83 kB │ gzip: 160.48 kB
dist/assets/index-CCBHOInk.js              706.12 kB │ gzip: 201.31 kB
dist/assets/Scene-DljO7CRZ.js            1,182.27 kB │ gzip: 203.47 kB
✓ built in 6.89s
```

### C. Weryfikacja przeglądarkowa Edge CDP (`tests/qa/verify_6_5.mjs`)
Uruchomiono bezgłowy Microsoft Edge za pośrednictwem protokołu Chrome DevTools Protocol (port CDP 9395, serwer 5255):
- Załadowanie aplikacji, nawigacja do widoku 3D (`6 3D`).
- Przełączenie trybu manipulatora na przesuwanie (`Przesuwanie 3D (W)`): weryfikacja pojawienia się osi gizmo na posadzce i obwiedni BoxHelper.
- Przełączenie trybu manipulatora na obrót (`Obrót 3D (E)`): weryfikacja pojawienia się pierścienia rotacji wokół osi pionowej.
- Otwarcie rozwijanego menu `Warstwy 3D`: weryfikacja checkboxów dla stanowisk, buforów, operatorów, przeszkód i relacji.
- Wyłączenie warstwy buforów: natychmiastowe zniknięcie regałów/buforów ze sceny 3D.
- Ukrycie aktywnego obiektu przyciskiem `Ukryj w 3D (H)`: obiekt znika ze sceny, pojawia się przycisk `Pokaż ukryte w 3D (1)`.
- Przywrócenie widoczności przyciskiem `Pokaż ukryte w 3D`: obiekt powraca do sceny.
- Weryfikacja ochrony obiektów `locked`: po zaznaczeniu opcji blokady obiekt odłącza manipulator, pola edycji stają się nieaktywne (`disabled`), pojawia się odznaka `🔒 Zablokowany (brak manipulacji)`.
- Test responsywności w szerokości 600 px (mobile): brak niepożądanego przewijania poziomego (`scrollWidth <= innerWidth`).
- Zero błędów i wyjątków w konsoli przeglądarki (`Runtime.exceptionThrown`: 0).
- Zapisane zrzuty ekranu w `outputs/qa/`:
  - `verify_6_5_gizmo_translate_3d.png`
  - `verify_6_5_gizmo_rotate_3d.png`
  - `verify_6_5_layers_dropdown_3d.png`
  - `verify_6_5_locked_protection_3d.png`
  - `verify_6_5_mobile_600.png`

Wynik testu QA:
`PASS 6.5: Manipulatory 3D (W/E/Q), menu i przełączniki warstw 3D, ukrywanie/pokazywanie w 3D, ochrona locked, brak błędów konsoli, 1440/600 px.`

---

## 4. Wskaźniki postępu po wdrożeniu 6.5

Zgodnie z `node scripts/plan_progress.mjs`:
- **Cały plan:** 51/69 = **73,9%**
- **Pierwsze wydanie:** 51/65 = **78,5%**
- **Etap 6:** 4/7 = **57,1%**
