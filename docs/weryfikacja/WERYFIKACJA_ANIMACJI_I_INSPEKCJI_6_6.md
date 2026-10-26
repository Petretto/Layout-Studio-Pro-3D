# Raport Weryfikacji — ID 6.6: Animacja produktów, podzespołów i transportu w 3D oraz inspekcja stanu

Aktualizacja 2026-10-23: po zgłoszeniu regresji Start wykonano ponowny odbiór sterowania opisany na końcu. Poniższy odbiór z 18 października zachowano jako historię.

Data weryfikacji: 2026-10-18  
Status: **Wdrożone (PASS)**  
Powiązany punkt planu: `PLAN_ROZWOJU.md` — **ID 6.6** (*„Animować produkty, podzespoły i transport zgodnie z harmonogramem symulacji; umożliwić pauzę i inspekcję stanu.”*)  
Środowisko: Windows 11, Node.js v24.14.0, Microsoft Edge CDP, Three.js 0.160+  
Kopia zapasowa przed wdrożeniem: `backup/v0.4.0_przed_6_6_20261018` (399 plików z sumami SHA256)

---

## 1. Zakres realizacji

W ramach punktu ID 6.6 zrealizowano deterministyczną animację 3D przepływu wyrobów i komponentów połączoną z osią czasu symulacji dyskretnej oraz interaktywną inspekcją stanu:

1. **Deterministyczny silnik snapshotów animacji (`src/core/algorithms/simulationAnimation.ts`)**:
   - Czysta funkcja `computeSimulationAnimationSnapshot(project, result, time)` wyliczająca stan każdego detalu partii w czasie `t`:
     - Fazy cyklu życia: `not_arrived`, `entering`, `processing`, `waiting_local`, `in_transit`, `waiting_queue`, `finished`.
     - Płynne pozycjonowanie w układzie współrzędnych posadzki hali (`xMm`, `yMm`) oraz wysokości roboczej (`zMm`).
     - Detale w fazie obróbki (`processing`) spoczywają na blacie stołu roboczego stacji (`zMm = table.zMm + heightMm + 40`).
     - Transport międzyoperacyjny (`in_transit`) i wejście (`entering`) poruszają się po trajektoriach posadzki z animacją wózka transportowego (`CartTuggerPlatform`/`AGVMiniLifter`).
     - Faza zakończenia (`finished`) odkłada gotowy wyrób na palecie wyjściowej `FinishedGoods`.
     - Niezmiennik Zasady 6: snapshoty animacji są czysto odczytowe i nie modyfikują danych symulacji ani technologii.

2. **Karta inspekcji stanu (`JobInspectionDetails`)**:
   - Funkcja `getJobInspectionDetails(...)` pozwalająca odpytać stan dowolnej sztuki z partii:
     - Numer sztuki (Job ID), aktualna faza, nazwa stacji i kopii, operacja procesu.
     - Procentowy postęp etapu oraz pozostały czas obróbki.
     - Całkowity czas spędzony w linii od momentu wejścia.
     - Zestawienie części z BOM powiązanych z bieżącą operacją (`associatedProcessStepId`).

3. **Interaktywny widok 3D (`src/components/studio/Scene.tsx`)**:
   - Pule meshy Three.js (`productMeshPool`, `vehicleMeshPool`) zapewniające wydajny render bez alokacji geometrii w pętli `requestAnimationFrame`.
   - Zróżnicowana kolorystyka detali w zależności od fazy:
     - Obróbka: turkusowy (`#06b6d4`), transport: bursztynowy (`#f59e0b`), kolejka: fioletowy (`#a855f7`), ukończone: zielony (`#22c55e`), zaznaczony do inspekcji: pomarańczowy (`#ff6b00`).
   - Czerwony znacznik podświetlenia (`inspectRingMesh`) otaczający badany detal na scenie 3D.
   - Pływająca karta `.simulation-inspector-card` zamykana przyciskiem `×` lub kliknięciem w detal.
   - Mini-pasek sterowania odtwarzaniem 3D (`.sim-mini-playback-bar`):
     - Przyciski Start/Pauza (`▶ Start` / `⏸ Pauza`), Reset (`⏮ Reset`), suwak osi czasu (scrubbing), czas bieżący i całkowity, przycisk włączania/odznaczania inspekcji (`🔍 Inspekcja 3D`).

4. **Integracja z modułem symulacji (`Simulation.tsx` & `App.tsx`)**:
   - Przekazywanie stanu odtwarzania (`SimulationPlaybackState`) i komend sterujących (`SimulationControlCommand`) dwukierunkowo między sceną 3D a silnikiem symulacji w tle.

---

## 2. Dowody weryfikacji

### A. Testy jednostkowe i niezmienników (`tests/core.test.ts`)
Uruchomiono pełny zestaw testów `core` z wynikiem **78/78 PASS**:
```
✔ 6.6: wyznaczanie snapshotu animacji 3D wyrobów i podzespołów w czasie symulacji (1.5273ms)
✔ 6.6: karta inspekcji stanu wyrobu (JobInspectionDetails) (0.5631ms)
✔ 6.6: niezmiennik Zasady 6 — czysta deterministyczna animacja nie modyfikuje symulacji ani procesu (0.5585ms)
ℹ tests 78
ℹ suites 0
ℹ pass 78
ℹ fail 0
ℹ duration_ms 1230.4793
```

### B. Kompilacja i budowanie produkcyjne (`npm.cmd run build`)
Kompilator TypeScript oraz bundler Vite pomyślnie zbudowały paczki produkcyjne:
```
vite v7.3.6 building client environment for production...
✓ 155 modules transformed.
rendering chunks...
dist/index.html                              0.66 kB
dist/assets/index-DEduH8gM.js              706.89 kB
dist/assets/Scene-CZMiieng.js            1,195.26 kB
✓ built in 4.77s
```

### C. Automatyczna weryfikacja przeglądarkowa Edge CDP (`tests/qa/verify_6_6.mjs`)
Skrypt przetestował rzeczywisty interfejs w przeglądarce Edge:
- Nawigacja do zakładki `6 3D i symulacja`.
- Sprawdzenie widoczności mini-paska sterowania odtwarzaniem `.sim-mini-playback-bar`.
- Odtworzenie animacji, pauza i przesunięcie suwaka czasu na osi symulacji.
- Włączenie inspekcji 3D i weryfikacja karty `.simulation-inspector-card` (nagłówek `Sztuka #1`, stanowisko, postęp etapu, komponenty BOM).
- Weryfikacja responsywności w widoku mobilnym 600px (brak poziomego paska przewijania).
- Brak błędów konsoli wykonawczej (Runtime errors = 0).
- Zrzuty ekranu zapisane w `outputs/qa/`:
  - `verify_6_6_simulation_tab_started.png`
  - `verify_6_6_3d_playback_scrubbed.png`
  - `verify_6_6_inspection_card_3d.png`
  - `verify_6_6_mobile_600.png`

Wynik testu:
```
PASS 6.6: Animacja 3D produktów i transportu, mini-pasek sterowania w 3D, suwak scrubbingu, karta inspekcji stanu .simulation-inspector-card z BOM i postępem, responsywność 1440/600px, brak błędów konsoli.
```

---

## 3. Zgodność z Niezmiennikami Projektu

- **Zasada 6**: Wyliczanie animacji i podgląd stanu wyrobu nie modyfikują struktury procesu (`processSteps`), bilansu (`balancing`) ani wyników symulacji (`runs`, `jobs`).
- **Niezmiennik transportu**: Ruch wózków bazuje ściśle na harmonogramie symulacji, pozycjonując wyroby na wysokości transportowej (280–300 mm) lub stole roboczym (890 mm).
- **Zasada kompatybilności**: Schemat projektu oraz format persystencji JSON pozostają w 100% zgodne wstecznie.

## 4. Regresja uruchamiania — 2026-10-23 (6.6-fix)

Użytkownik zgłosił brak startu w głównej zakładce. Odtworzono na stronie Vercel: po kliknięciu Start na pasku 3D czas przesunął się o kilka milisekund i odtwarzanie wróciło do pauzy. Dolny przycisk Wznów również zatrzymywał się natychmiast. Przyczyna: efekt w `Simulation.tsx` zależy od `controlCommand`, `end` i `time`; nieprzetworzone jednorazowo polecenie `toggle_run` było powtarzane po każdej zmianie czasu. Analogicznie pozostawiony `reset`/`set_time` blokował kolejne wznowienie.

Dodano referencję ostatnio obsłużonego polecenia. Efekt zachowuje aktualne granice i czas, lecz daną instancję polecenia wykonuje tylko raz. Referencja jest inicjalizowana wartością zastaną przy montowaniu, więc nowa sesja nie powtarza starego kliknięcia po powrocie do zakładki. Nie zmieniano harmonogramowania, stanów technologicznych, prędkości, schematów i zapisu. To przywrócenie zachowania już opisanego w instrukcji, bez nowych kroków obsługi; podręcznik MD/HTML/PDF nie wymaga regeneracji.

Backup `backup/v0.4.0_przed_6_6_start_fix_20261023`: **479 plików**, osobno odczytane skopiowane bajty i sprawdzone SHA-256 **PASS**.

Wykonane sprawdzenia:

- `node scripts/test.mjs --suite=core '--test-name-pattern=3\.10:|6\.6:'`: **4/4 PASS**, krok czasu i limity prędkości, snapshot animacji, inspekcja oraz niezmienność obliczeń.
- `npm.cmd run build`: **TypeScript/Vite PASS**, wcześniejsze ostrzeżenie o dużych chunkach pozostaje.
- Rzeczywisty UI przez `cua_repl`, Vite na 5173 (zastany projekt Eko, bez edycji danych) i produkcyjny build na 5302 (domyślny przykład silników EV): **PASS**. Start z paska 3D, ciągły przyrost czasu, pauza utrzymująca identyczną wartość, reset z paska i dolny Start, zmiana suwaka klawiaturą i wznowienie, powrót Pulpit → Symulacja z czasem 0 i bez starego polecenia. W buildzie czas po starcie wzrósł z 2,421 do 109,504 s, kolejne odtworzenie działało po ukończeniu i resecie. Przycisk Oblicz całą partię dał **30/30, 4936 s, WIP 0**; odczyt konsoli produkcyjnej karty: **0 błędów**.
- Rozszerzono `tests/qa/verify_6_6.mjs`: przyrost czasu przez wiele klatek, stabilna pauza, skuteczny suwak, start po resecie i ponownym montowaniu; poprawiono ustawienie wartości suwaka tak, aby React otrzymał rzeczywistą zmianę. `node --check` **PASS**. **Całego skryptu CDP w tym odbiorze nie uruchamiano**; powyższe próby UI wykonano interaktywnie. Nie powtarzano mobilnego odbioru, inspekcji i pełnej regresji, gdyż ich zachowania nie zmieniono; ostatnia pełna sekwencyjna to 393/393 z A2b1, obecna poprawka jest drugim pakietem od tego przebiegu.

Dowody: `outputs/qa/6_6_start_fix/production_running.png`, `production_complete.png`. Lokalny zastany plik audytu Eko oraz pozostałe pliki użytkownika zachowane. Status 6.6: ponownie **wdrożone** po weryfikacji; wcześniejsze odebranie nie wykryło tej regresji, ponieważ sam widoczny pasek nie potwierdzał ciągłego przyrostu czasu. Postęp 61/72 = **84,7%**, pierwsze wydanie 61/68 = **89,7%**. Wysyłka Git i odbiór Vercel to odrębne zdarzenia; wynik zdalnego wdrożenia należy odnotować po jego sprawdzeniu.

### Odbiór Vercel po wysyłce

Commit aplikacji `5adb875bfbd966f37c73056ad9a33b50fe113114` wysłany na gałąź roboczą i `main` (fast-forward). GitHub potwierdził status Vercel `success`, „Deployment has completed”. Początkowe odświeżenia nadal ładowały stary bundle `index-B7_fngC4.js` i wykazywały regresję; nie zaliczono ich jako odbioru. Po wczytaniu adresu `https://layout-studio-pro-3d.vercel.app/?v=5adb875` załadowano `index-Be2HTMZ7.js`. Rzeczywisty Start z paska 3D: czas **3,115 → 89,956 s**, odtwarzanie nadal aktywne; po pauzie czas stabilny. **Vercel UI PASS** dla zgłoszonego uruchamiania i pauzy. Dowody `vercel_running.png` i `vercel_report.json` w tym samym katalogu QA. Pozostały szerszy zakres UI odebrano lokalnie, nie raportujemy pełnej zdalnej regresji. Użytkownikowi zalecane Ctrl+F5 w starej, otwartej karcie.
