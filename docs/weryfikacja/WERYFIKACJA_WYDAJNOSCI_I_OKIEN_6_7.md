# Raport Weryfikacji — ID 6.7: Wydajność dużej sceny, tryb uproszczony 3D (LOD) oraz otwieranie widoków w osobnym oknie (Popout Window)

Data weryfikacji: 2026-10-18  
Status po odbiorze 6.7b: **wdrożone w opisanym zakresie pomiaru i obsługi okien**
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

## 6.7b — pomiar większej sceny i poprawka kadru, 2026-10-18

### Wykryta regresja i poprawka

Pierwsza próba pomiaru miała zero wywołań rysowania mimo aktywnej pętli RAF i poprawnego kontekstu WebGL. Zrzut `incomplete.png` pokazał pustą scenę. Dopasowanie kamery obejmowało cały obiekt `Scene`, w tym `TransformControls` z niewidoczną płaszczyzną `PlaneGeometry(100000, 100000)`. Three.js `Box3.setFromObject` obejmuje również niewidoczne obiekty; kamera oddalała się poza swój zakres renderowania.

Dodano `sceneContentBounds` i zastosowano je w dopasowaniu kamery: wykluczenie całego manipulatora oraz niewidocznych korzeni sceny. Zmiana lokalna, bez przebudowy modułów, schematu, danych projektu ani reguł symulacji; bez potrzeby nowej migracji lub strukturalnego backupu. Test regresji odtwarza ogromną płaszczyznę pomocniczą i ukryty obiekt, wykazuje błędne dawne granice oraz poprawny obrys hali 100×100 m po wykluczeniu pomocników.

### Metoda i środowisko

Nowy skrypt `node tests/qa/benchmark_6_7.mjs` uruchamia produkcyjny build w osobnym profilu Edge i korzysta z rzeczywistego komponentu Scene. Fixture bazuje na wbudowanym przykładzie silników, zachowuje jego stanowiska/proces i dodaje wyłącznie geometrię bez przypisania do stanowisk lub nowych zasobów. Sceny mają łącznie 100 i 300 obiektów, w tym regały FIFO, przenośniki, palety i wybrane koncepty 6.3b. Gabaryty i rozmieszczenie są jawnie syntetycznym obciążeniem renderera, nie pomiarami produkcyjnymi. Fixture nie trafia do profilu użytkownika.

- Edge **155.0.4283.62**, headless, WebGL 2.0, Three.js r168.
- Rzeczywisty renderer: **ANGLE / Intel(R) UHD Graphics (0x0000A7A8) / Direct3D11**. Bez `--disable-gpu` i bez wymuszenia SwiftShader.
- Viewport **1440×1050**, DPR 1; canvas **1376×468**.
- Dla każdej wielkości kolejność **szczegółowy → LOD → LOD → szczegółowy** (ABBA), rozgrzanie 1 s i próbka 2,5 s dla każdego przebiegu. Bez odtwarzania animacji, stref i obrysów kolizji.
- Pomiar bez dodatkowych haków w aplikacji: przechwycenie RAF i faktycznych wywołań WebGL w skrypcie testu. Rejestrowane mediany/P95 odstępów klatek, czas callbacku CPU, draw calls i liczba trójkątów. Narzut instrumentacji jest częścią wyniku; callback CPU nie jest pomiarem czasu GPU.
- Kompletny zapis projektu porównywany po każdym trybie — bez zmian. Utrata kontekstu i błędy runtime powodują odmowę odbioru.
- Końcowy przebieg wykonano bez równoległych testów przeglądarkowych. Wcześniejszy pomiar zbiegł się z regresją okien, dlatego jego czasy zastąpiono izolowanym przebiegiem.

### Wyniki końcowe

W kolumnach czasowych podano zakres dwóch median/P95; liczniki geometrii były stałe w obu próbkach danego trybu.

| Obiekty | Tryb | Draw calls / klatkę | Trójkąty / klatkę | Mediana odstępu [ms] | P95 odstępu [ms] |
| --- | --- | ---: | ---: | ---: | ---: |
| 100 | szczegółowy | 3374 | 63140 | 42,4–48,2 | 48,3–48,8 |
| 100 | LOD | 207 | 1416 | 6,1 | 6,3 |
| 300 | szczegółowy | 9960 | 191176 | 121,3–139,6 | 133,0–163,6 |
| 300 | LOD | 607 | 3816 | 12,0 | 12,4 |

Dla 300 obiektów redukcja draw calls wynosi **93,9%**, a trójkątów **98,0%**. LOD istotnie poprawia użyteczność tego konkretnego obciążenia na zmierzonym zintegrowanym GPU. Widok szczegółowy 300 obiektów pozostaje wolny. Wartość `observedFps` w surowym raporcie jest wyprowadzona z RAF w headless i nie oznacza liczby klatek faktycznie wyświetlanych przez monitor.

Źródło wszystkich próbek i rozpoznanego renderera: `outputs/qa/benchmark_6_7/report.json`. Raport zawiera również identyfikację przeglądarki i flagi uruchomienia. Plik `report.partial.json` jest roboczy i nie stanowi dowodu końcowego.

### Weryfikacja i czytelność

- `node scripts/test.mjs --suite=core --test-name-pattern=6.7`: **3/3 PASS** — regresja kadru, geometria LOD i niezmiennik technologiczny. Pełnej regresji nie powtarzano: ostatnie **354/354 PASS** w 6.7a; bieżąca zmiana dotyczy wyłącznie wyliczania kadru i testu pomiarowego.
- `npm.cmd run build`: **PASS**, 158 modułów, dotychczasowe ostrzeżenie dużych pakietów pozostaje.
- `node tests/qa/verify_6_7.mjs` po poprawce kadru: **PASS** — rzeczywiste okna CAD/przepływu/3D, edycja, historia, zapis i 1440/600 px.
- `node tests/qa/benchmark_6_7.mjs`: **PASS**, 8 próbek, w każdej co najmniej 5 klatek z faktycznym rysowaniem; LOD zmniejsza wywołania i trójkąty o ponad 50%, brak wyjątków i utraty kontekstu, cały zapis niezmieniony.
- Na scenie 300 obiektów sprawdzono wybór `qa-visual-296` z listy, zbliżenie, ukrycie/przywrócenie i ponowne dopasowanie całej hali w LOD. Automatyczny wynik PASS; zrzuty `300_detailed.png` i `300_focused_lod.png` obejrzano. Widok ogólny pozwala ocenić rozłożenie, ale przy tej skali szczegóły wymagają zbliżenia. Wybrana bryła i manipulator są czytelne po zbliżeniu. Szczegóły części wymagają wyłączenia LOD.
- Instrukcja MD/HTML/PDF uzupełniona o pomiar, ograniczenia i obsługę większej sceny, z nowym zrzutem. `generate_pdf_html.mjs` i `print_manual_cdp.mjs`: PASS; `verify_manual.py outputs/qa/manual_6_7b`: **45 stron / 42 obrazy**, brak brakujących obrazów/sekcji, pustych stron i tekstu poza stroną. Wizualny odbiór końcowych stron zapisano w contact_3.

### Status i ograniczenia

**6.7 wdrożone w opisanym zakresie**, uzupełniając rzeczywisty odbiór okien z 6.7a. Wcześniejsze wpisy o braku pomiaru pozostają historyczne. Pomiar nie obejmuje czasu pierwszego wczytania/kompilacji shaderów, pamięci GPU, odtwarzania dużej animowanej partii, 4K/DPR 2, innych kart ani fizycznej konfiguracji wielomonitorowej użytkownika. Nie deklarujemy płynności wszystkich projektów; pilotaż na docelowym stanowisku pozostaje częścią 7.9. Brak weryfikacji wdrożenia Vercel.

Postęp `node scripts/plan_progress.mjs`: **53/69 = 76,8%** całego planu, **53/65 = 81,5%** pierwszego wydania; Etap 6 **6/7 = 85,7%**. 6.3 nadal wymaga rzeczywistych referencji maszyn/Eko. Następny punkt 7.1 wymaga rejestru rzeczywistych danych i źródeł, bez zastępowania braków założeniami.
