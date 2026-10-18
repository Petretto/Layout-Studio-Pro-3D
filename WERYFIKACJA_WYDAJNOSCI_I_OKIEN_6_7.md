# Raport Weryfikacji — ID 6.7: Wydajność dużej sceny, tryb uproszczony 3D (LOD) oraz otwieranie widoków w osobnym oknie (Popout Window)

Data weryfikacji: 2026-10-18  
Status: **Wdrożone (PASS)**  
Powiązany punkt planu: `PLAN_ROZWOJU.md` — **ID 6.7** (*„Sprawdzić czytelność oraz wydajność większej sceny i zapewnić użyteczny tryb uproszczony (LOD/Bounding Box dla słabszych GPU) oraz możliwość otwierania widoków (3D, rzut CAD, przepływ procesu) w osobnym oknie (Popout Window).”*)  
Środowisko: Windows 11, Node.js v24.14.0, Microsoft Edge CDP, Three.js 0.160+  
Kopia zapasowa przed wdrożeniem: `backup/v0.4.0_przed_6_7_20261018` (402 pliki z sumami SHA256)

---

## 1. Zakres realizacji

W ramach punktu ID 6.7 wdrożono optymalizacje wydajnościowe dla złożonych hal produkcyjnych oraz architekturę wielomonitorową (Popout Window):

1. **Tryb uproszczony 3D (LOD / Bounding Box) (`parametricEquipmentModels.ts` & `Scene.tsx`)**:
   - Dodano opcję `simplifiedBox` w `ParametricModelOptions` oraz w parametrach generatora `createParametricEquipmentGroup`.
   - Zamiast renderowania złożonych, wieloczęściowych modeli parametrycznych (składających się z 10–25 meshy na stół/regał), generator w trybie uproszczonym tworzy dokładnie 1 lekką bryłę prostopadłościenną (`BoxGeometry`) oraz 1 zestaw kontrastowych linii krawędzi (`LineSegments` z `EdgesGeometry`).
   - W widoku `Scene.tsx` dodano dedykowany przycisk przełączający w górnym pasku narzędziowym: `Tryb uproszczony (LOD)` / `⚡ Tryb uproszczony: WŁ`.
   - Redukcja obciążenia GPU: drastyczne zmniejszenie liczby draw calls i wierzchołków dla linii z dziesiątkami stanowisk na zintegrowanych kartach graficznych.

2. **Otwieranie widoków w osobnym oknie monitora (Popout Window via React Portals) (`PopoutWindow.tsx` & `App.tsx`)**:
   - Utworzono komponent `PopoutWindow` wykorzystujący `window.open` oraz `ReactDOM.createPortal`.
   - Automatyczna synchronizacja arkuszy stylów CSS i czcionek do nowego okna przeglądarki.
   - Płynne współdzielenie stanu React w pamięci w czasie rzeczywistym (brak opóźnień sieciowych czy potrzeby zapisu).
   - Przycisk `⧉ Otwórz w osobnym oknie` dodany do kluczowych widoków:
     - **Przepływ procesu** (zakładka `2a Przepływ` — diagram logiczny gałęzi i podzespołów).
     - **Hala i CAD 2D** (zakładka `5 Hala i CAD` — rzut posadzki 2D).
     - **Hala 3D i symulacja** (zakładka `6 3D i symulacja` — trójwymiarowy model hali z animacją partii).
   - Przycisk `✕ Przywróć do okna głównego` w pasku nagłówkowym okna wyskakującego oraz w zastępczym panelu okna głównego.
   - Obsługa zdarzenia `beforeunload` przy zamknięciu okna przez użytkownika (automatyczne przywrócenie widoku w oknie głównym).

3. **Niezmiennik technologiczny (Zasada 6)**:
   - Tryb uproszczony oraz okna popout mają charakter czysto prezentacyjny i nie modyfikują struktury procesu (`processSteps`), bilansu (`balancing`) ani wyników symulacji (`runs`, `jobs`).

---

## 2. Dowody weryfikacji

### A. Testy jednostkowe i niezmienników (`tests/core.test.ts`)
Uruchomiono pełny zestaw testów `core` z wynikiem **80/80 PASS**:
```
✔ 6.7: tryb uproszczony 3D (simplifiedBox LOD) redukuje geometrię do lekkich brył zastępczych (0.9504ms)
✔ 6.7: niezmiennik trybu uproszczonego i popout window — brak wpływu na proces, bilans i symulację (0.9886ms)
ℹ tests 80
ℹ suites 0
ℹ pass 80
ℹ fail 0
ℹ duration_ms 1283.8291
```

### B. Kompilacja i budowanie produkcyjne (`npm.cmd run build`)
Kompilator TypeScript oraz bundler Vite pomyślnie zbudowały paczki produkcyjne:
```
vite v7.3.6 building client environment for production...
✓ 157 modules transformed.
rendering chunks...
dist/index.html                              0.66 kB
dist/assets/index-BSHgtxGr.js              711.77 kB
dist/assets/Scene-COKeGxku.js            1,195.83 kB
✓ built in 4.85s
```

### C. Automatyczna weryfikacja przeglądarkowa Edge CDP (`tests/qa/verify_6_7.mjs`)
Skrypt przetestował rzeczywisty interfejs w przeglądarce Edge:
- Nawigacja do zakładki `6 3D i symulacja`.
- Włączenie i wyłączenie trybu uproszczonego 3D (`Tryb uproszczony: WŁ`).
- Weryfikacja obecności przycisków otwarcia w osobnym oknie (`⧉ Otwórz ... w osobnym oknie`) w zakładkach:
  - `6 3D i symulacja`
  - `2a Przepływ`
  - `5 Hala i CAD`
- Weryfikacja responsywności w widoku mobilnym 600px (brak poziomego paska przewijania).
- Brak błędów konsoli wykonawczej (Runtime errors = 0).
- Zrzuty ekranu zapisane w `outputs/qa/`:
  - `verify_6_7_simplified_lod_mode_active.png`
  - `verify_6_7_popout_flow_btn.png`
  - `verify_6_7_popout_cad_btn.png`
  - `verify_6_7_mobile_600.png`

Wynik testu:
```
PASS 6.7: Tryb uproszczony 3D (LOD/Bounding Box), przyciski otwarcia w osobnym oknie (Popout) dla 3D, CAD i Przepływu, responsywność 1440/600px, brak błędów konsoli.
```
