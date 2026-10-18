# Raport Weryfikacji — ID 6.7: Wydajność dużej sceny, tryb uproszczony 3D (LOD) oraz otwieranie widoków w osobnym oknie (Popout Window)

Data weryfikacji: 2026-10-18  
Status po przeglądzie 6.7a: **w trakcie — poprawka okien odebrana; pomiar większej sceny pozostaje do wykonania**
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

## 6.7a — przegląd i poprawka okien, 2026-10-18

Przegląd commitu `5c73561` wykazał brak rzeczywistego otwarcia dodatkowych okien w dotychczasowym teście. Zmienny callback `onClose` znajdował się w zależnościach efektu tworzącego okno; każde odświeżenie rodzica (edycja, zaznaczenie, odtwarzanie) uruchamiało jego zamknięcie i ponowne utworzenie. Callback jest teraz czytany przez ref, bez zmiany czasu życia okna. Lokalne skróty CAD i 3D korzystają z `ownerDocument.defaultView`, a wspólne Ctrl+S/Z/Y obsługuje zdarzenie React na korzeniu aplikacji, obejmujące także portale. Ochrona edycji pól obejmuje również contenteditable.

Zmiany obejmują wyłącznie UI, test i dokumentację; bez przebudowy modułów, zmiany schematu lub reguł procesu. Nie było potrzeby nowej migracji ani strukturalnego backupu. Zachowano istniejące lokalne pliki użytkownika i wcześniejsze kopie.

### Dowody aktualnego odbioru

- `npm.cmd run build`: PASS, 157 modułów; dotychczasowe ostrzeżenie pakietów ponad 500 kB pozostaje.
- `npm.cmd run test -- --run`: pełna okresowa regresja po trzech pakietach 6.5–6.7, **354/354 PASS**, 0 pominiętych. Uruchomiona raz po głównych poprawkach. Po końcowym zachowaniu globalnych skrótów przy fokusie na body ponownie wykonano build i odpowiednią regresję UI (Ctrl+Y/S/Z w oknie głównym oraz dodatkowe okna); PASS. Nie powtarzano pełnego zestawu dla tej izolowanej poprawki UI.
- `node tests/qa/verify_6_7.mjs`: **PASS** w rzeczywistym Edge headless/CDP. Nowe okna CAD, przepływu i 3D faktycznie otwarte. CAD: zaznaczenie, przesunięcie strzałką zmienia obrys i zapis projektu; Ctrl+S, Ctrl+Z i ponowny zapis odtwarzają wcześniejszą geometrię. To samo okno pozostaje otwarte podczas edycji i cofania. Przepływ: aktualizacja nazwy projektu w rodzicu zachowuje okno; natywne zamknięcie przywraca widok główny. 3D: canvas i skrót G przełączający siatkę w dodatkowym oknie; powrót przyciskiem. LOD, 1440/600 px i brak wyjątków runtime również PASS.
- Test przeglądarkowy wymagał wykonania poza piaskownicą. Pierwsze próby zakończyły się timeoutami CDP; do sterowania oknami w headless dodano `--disable-popup-blocking`. Następnie poprawiono odczyt wrappera `project` oraz odniesienie do geometrii początkowej w trybie auto w samym teście. Końcowy przebieg PASS.
- Instrukcja MD/HTML/PDF uzupełniona o skróty i poprawne ograniczenia wydajności; usunięto niepopartą pomiarem obietnicę płynnej pracy na słabszych GPU. `generate_pdf_html.mjs`, `print_manual_cdp.mjs`: PASS. `verify_manual.py outputs/qa/manual_6_7a`: **44 strony, 41 obrazów**, brak brakujących obrazów/sekcji, pustych stron i tekstu poza stroną. Odbiór wizualny contact_3 (strony 33–44): PASS. Biblioteka PDF wypisuje dotychczasowe ostrzeżenie FontBBox.

### Pozostały zakres i status

Pakiet naprawczy 6.7a jest odebrany. Główne **6.7 pozostaje w trakcie**: wcześniejszy raport nie zawierał pomiaru większej sceny, FPS/czasu klatki ani próby na docelowym słabszym GPU. Zmniejszenie geometrii nie dowodzi wymaganej płynności. Obecny test nie potwierdza również wielomonitorowego odbioru na sprzęcie użytkownika ani wszystkich narzędzi edycji w dodatkowych oknach. Blokada pop-upów w ustawieniach użytkownika nadal wymaga zezwolenia w przeglądarce. Brak weryfikacji wdrożenia Vercel.

`node scripts/plan_progress.mjs`: cały plan **52/69 = 75,4%**, pierwsze wydanie **52/65 = 80,0%**. Poprzedni odbiór 6.7 powyżej pozostaje historycznym zapisem; niniejsza sekcja koryguje jego zakres.
