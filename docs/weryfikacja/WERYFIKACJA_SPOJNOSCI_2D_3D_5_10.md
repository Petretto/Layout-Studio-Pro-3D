# Weryfikacja 5.10 — Wspólne zaznaczenie i dane 2D–3D, spójne skróty, nazwy narzędzi i podpowiedzi

**Data odbioru:** 2026-10-18  
**Pozycja planu:** `5.10` — *Zapewnić wspólne zaznaczenie i dane 2D–3D, spójne skróty, nazwy narzędzi i podpowiedzi.*  
**Status:** `wdrożone`

---

## 1. Zakres wdrożenia

1. **Wspólny stan zaznaczenia 2D–3D (`selectedLayoutObjectIds`)**:
   - W `src/App.tsx` przeniesiono stan zaznaczenia obiektów layoutu do nadrzędnego komponentu aplikacji (`selectedLayoutObjectIds`), przekazywanego jako `selectedIds` i `onSelect` zarówno do `<LayoutEditor>` (`5 Hala i CAD`), jak i `<Scene>` (`6 Widok 3D i symulacja`).
   - Wybór obiektu w edytorze 2D (drzewo obiektów, kliknięcie na płótnie SVG, zaznaczenie wielokrotne) jest natychmiast widoczny po przejściu do widoku 3D.
   - Kliknięcie obiektu w scenie 3D (detekcja raycastingiem `THREE.Raycaster` powiązana z `pointerdown` / `pointerup` o przesunięciu `< 5px`, bez zakłócania obracania kamery `OrbitControls`) natychmiast synchronizuje zaznaczenie w 2D i otwiera panel właściwości.

2. **Wizualna identyfikacja zaznaczenia i ochrona obiektów zablokowanych w 3D (`THREE.BoxHelper`, `locked`)**:
   - Zaznaczone obiekty w widoku 3D są wyróżniane obwiednią `THREE.BoxHelper` o grubości i kolorze dopasowanym do stanu obiektu:
     - aktywne, edytowalne obiekty: błękitna ramka (`#38bdf8`),
     - zablokowane obiekty (`locked: true`): ostrzegawcza żółta ramka (`#facc15`).
   - W widoku 3D przeciąganie myszą obiektów zablokowanych jest zablokowane (`if (hitObject.userData.isLocked) return;`), uniemożliwiając przypadkowe przesunięcie geometrii w przestrzeni hali.
   - Formularz właściwości w 3D zawiera pole wyboru blokady (`Zablokuj obiekt (ochrona przed przesunięciem)`) oraz blokuje edycję pól współrzędnych (`X`, `Y`, `Z`, `Obrót`) przy `draft.locked = true`.

3. **Spójne skróty klawiszowe (`LAYOUT_SHORTCUTS`, `nudgeLayoutObjects`)**:
   - Zdefiniowano centralną strukturę `LAYOUT_SHORTCUTS` w `src/core/algorithms/layoutSelection.ts` (11 spójnych definicji z opisami i kategoriami):
     - **Globalne:** `Ctrl+Z` (Cofnij), `Ctrl+Y` (Ponów), `Ctrl+S` (Zapisz lokalnie w pamięci przeglądarki).
     - **Rzut i nawigacja:** `F` (Dopasuj widok / Fit view), `T` (Widok z góry w 3D / Top view), `G` (Przełącz przyciąganie do siatki / Snap toggle), `M` (Przełącz tryb przesuwania / Move mode), `L` (Zablokuj / odblokuj zaznaczone obiekty), `S` (Relacje technologiczne procesu / Spaghetti), `Escape` (Odznacz / zamknij panel / anuluj pomiar).
     - **Precyzyjne przesuwanie:** Klawisze strzałek (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`) przesuwają zaznaczone niezablokowane obiekty o krok siatki (z klawiszem `Shift` krok 5×) za pomocą funkcji `nudgeLayoutObjects`, z zachowaniem integralności zespołu stanowiska (`stationAssembly`).
   - Obsługa skrótów klawiszowych została wdrożona w `src/App.tsx` (nasłuch globalny), `src/components/studio/LayoutEditor.tsx` (2D) oraz `src/components/studio/Scene.tsx` (3D).

4. **Spójne nazwy narzędzi, podpowiedzi (`title`) i ściągawka skrótów**:
   - Wszystkie przyciski pasków narzędziowych 2D i 3D posiadają atrybuty `title` ze wskazaniem przypisanego skrótu klawiszowego (np. `title="Cofnij (Ctrl+Z)"`, `title="Dopasuj cały layout (F)"`, `title="Zablokuj zaznaczone obiekty (L)"`).
   - Pod rzutem 2D oraz pod widokiem 3D dodano rozwijaną sekcję `<details className="cad-shortcuts-cheatsheet">` prezentującą pełną ściągawkę skrótów ze stylizowanymi znacznikami `<kbd>`.

---

## 2. Wyniki testów automatycznych, okresowej pełnej regresji i budowania

- **Kopia zapasowa przed wdrożeniem:** `backup/v0.4.0_przed_5_10_20261018` (`341` plików, `0` niezgodności SHA256 w `BACKUP_MANIFEST_SHA256.txt`).
- **Testy ukierunkowane (`node scripts/test.mjs --suite=core --test-name-pattern="5\.(3|4|5|6|7|8|9|10):"`):** `16/16 PASS`:
  - `5.10: LAYOUT_SHORTCUTS zawiera komplet spójnych skrótów klawiszowych dla 2D i 3D` — PASS
  - `5.10: nudgeLayoutObjects przesuwa obiekty o krok siatki i chroni obiekty zablokowane` — PASS
  - Regresja `5.3`–`5.9` (`14` testów) — PASS
- **Budowanie produkcyjne (`npm.cmd run build`):** `tsc && vite build` — PASS (`0` błędów TypeScript, czas `4,58 s`).

---

## 3. Odbiór UI w przeglądarce Edge CDP (`tests/qa/verify_5_10.mjs`)

Przeprowadzono odbiór w bezgłowej przeglądarce Microsoft Edge przez CDP (`node tests/qa/verify_5_10.mjs` oraz regresje `verify_5_8.mjs` i `verify_5_9.mjs`):
1. **Płynne przekazywanie zaznaczenia 2D -> 3D**: zaznaczenie `WS-1` w drzewie 2D zachowuje stan po przejściu do zakładki `6 Widok 3D i symulacja`; w widoku 3D renderowany jest `THREE.BoxHelper`.
2. **Synchronizacja zaznaczenia 3D -> 2D**: kliknięcie raycastingiem na stole `WS-2` w widoku 3D natychmiast zaznacza obiekt i synchronizuje stan po powrocie do zakładki 2D.
3. **Blokowanie skrótem `L` i ochrona w 3D**: wciśnięcie klawisza `L` w widoku 3D przełącza stan `locked` na `true`, zmienia kolor ramki na ostrzegawczy żółty (`#facc15`) i blokuje przeciąganie obiektu.
4. **Precyzyjne przesuwanie strzałkami i historia `Ctrl+Z` / `Ctrl+Y`**: przesunięcie obiektu klawiszem `ArrowRight` w 3D aktualizuje współrzędną `xMm` (np. z 1000 na 1200 mm), a globalny skrót `Ctrl+Z` cofa zmianę z powrotem na 1000 mm.
5. **Ściągawka skrótów i podpowiedzi `title`**: potwierdzono obecność paska `.cad-shortcuts-cheatsheet` z 11 kartami skrótów oraz podpowiedzi z cue skrótu na przyciskach paska narzędzi.
6. **Responsywność i brak błędów konsoli**: brak poziomego przepełnienia (`scrollWidth <= clientWidth`) przy szerokościach `1440px` (`outputs/qa/verify_5_10_desktop_3d.png`) i `600px` (`outputs/qa/verify_5_10_mobile_3d.png`), przy `0` błędach konsoli i runtime.
7. **Aktualizacja Podręcznika Użytkownika**: zaktualizowano `Instrukcja/Podrecznik_Uzytkownika.md`, `.html` i `.pdf` (`py -3.10 scripts/verify_manual.py`: `29` stron, `29` obrazów, `0` brakujących zasobów, `0` pustych stron, `0` słów poza stroną, zrzuty `outputs/qa/manual_5_10`).
