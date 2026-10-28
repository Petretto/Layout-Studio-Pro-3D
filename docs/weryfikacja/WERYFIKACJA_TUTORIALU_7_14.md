# 7.14 — Weryfikacja interaktywnego tutorialu krok po kroku

Data: **2026-10-28**.  
Zakres: **7.14 — Interaktywny tutorial** w [PLAN_ROZWOJU.md](../../PLAN_ROZWOJU.md).  
Status: **wdrożone**.  
Pakiet bazowy tutorialu: `przyklady/01_zestaw_montazowy/` (`01_zestaw_montazowy.project.json`).

---

## 1. Cel i zakres funkcjonalny

Zadaniem modułu **7.14** jest dostarczenie zintegrowanego, interaktywnego przewodnika dla nowych użytkowników i inżynierów produkcji, który prowadzi krok po kroku przez pełny cykl życia projektu w Layout Studio Pro 3D — od zdefiniowania popytu i taktu klienta, przez strukturę operacji, bilansowanie i wykres Yamazumi, rzut hali CAD 2D, symulację 3D harmonogramu, aż po analizę wariantów reorganizacji i wygenerowanie raportu inżynierskiego.

### Scenariusz tutorialu (8 etapów Lean):
1. **Wprowadzenie i wybór projektu** (`dashboard`): wprowadzenie do aplikacji, prezentacja koncepcji integracji technologii z geometrią, wybór bazowego pakietu `01_zestaw_montazowy`.
2. **Popyt klienta i takt time** (`demand`): pojęcie Takt Time vs Cycle Time, zależność między popytem rocznym (57 600 szt.), czasem netto na zmianę a taktem (60 s/szt.).
3. **Operacje i struktura procesu** (`process`): podział pracochłonności na czynności dodające wartość (VA) i straty (NVA), czasy operacji ZM-OP10..ZM-OP30 (90 s łącznie) oraz relacje poprzedników.
4. **Bilansowanie linii i wykres Yamazumi** (`balance`): identyfikacja wąskiego gardła (40 s), przepustowość linii (90 szt./h), wskaźnik sprawności linii i porównanie metod RPW / LCR.
5. **Rozmieszczenie hali i CAD 2D** (`layout`): separacja stanu technologicznego od geometrycznego, rozkład stanowisk liniowy / U-Shape, bezpieczne drogi komunikacyjne i strefy BHP.
6. **Symulacja harmonogramu i czasu partii** (`stations`): deterministyczny silnik symulacji partii (makespan 170 s dla 3 sztuk w trybie JIT), weryfikacja kalendarzy i brak podwójnych rezerwacji pracowników.
7. **Porównanie wariantów reorganizacji** (`stations`): decyzje inżynierskie Lean — linia 3-stanowiskowa (170 s, 90 szt./h) vs wariant skonsolidowany 2-stanowiskowy (190 s, 72 szt./h, niższy koszt obsady przy spełnieniu taktu 60 s).
8. **Raport inżynierski i eksport** (`report`): kompletna dokumentacja projektu, eksport JSON, rzuty DXF (mm), arkusze kalkulacyjne CSV/XLSX, raport inżynierski Markdown (.md) oraz wydruk PDF.

---

## 2. Architektura i odporność na uszkodzenia

1. **Silnik stanu i persystencja (`src/core/tutorial.ts`)**:
   - Stan zapisywany w `localStorage` pod kluczem `layout-studio-tutorial-v1`.
   - Zabezpieczenie przed uszkodzeniem: walidacja struktury, automatyczne klamrowanie indeksu kroków do zakresu `[0, TUTORIAL_STEPS.length - 1]`.
   - Odporność na błędy: parser bezpiecznie powraca do stanu początkowego przy napotkaniu niepoprawnego JSON lub braku dostępu do pamięci podręcznej.

2. **Ochrona danych użytkownika (Safety Snapshot)**:
   - Przed załadowaniem projektu wzorcowego tutorialu tworzona jest automatyczna migawka całego środowiska użytkownika (`createWorkspaceBackup(localStorage)`).
   - Przy wyjściu z tutorialu użytkownik jest pytany o chęć przywrócenia poprzedniego stanu projektu (`restoreWorkspaceBackup`), dzięki czemu nauka nie usuwa ani nie nadpisuje bieżącej pracy inżyniera.

3. **Komponenty interfejsu (`src/components/tutorial/`)**:
   - `TutorialOverlay.tsx`: pływający dock na dole ekranu, pasek postępu, wskaźnik kroków, fiszka pojęcia Lean, instrukcja, podpowiedź, przyciski nawigacyjne ("← Wstecz", "Następny krok →", "Pomiń", "Reset", "Zamknij"), obsługa skrótów klawiaturowych (Escape, Ctrl/Alt+Strzałki).
   - Automatyczne przełączanie kart widoków aplikacji przy przechodzeniu między krokami.
   - Dynamiczne podświetlanie elementów docelowych w interfejsie (`tutorial-highlight-target`).
   - `TutorialModalText.tsx`: dostępna, pełnotekstowa wersja przewodnika z możliwością natychmiastowego przejścia do dowolnego kroku.
   - `Tutorial.css`: nowoczesne style zgodne z paletą Slate/Indigo, zoptymalizowane pod kątem kontrastu, responsywności i widoczności nad elementami canvas.

---

## 3. Wyniki testów automatycznych

### A. Testy jednostkowe (`tests/core.test.ts`)
Polecenie: `node scripts/test.mjs --suite=core "--test-name-pattern=7\.14"`
```
✔ 7.14: silnik tutorialu, definicja scenariusza, zapis/odczyt i odporność na uszkodzenia (2.2647ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
```
- Potwierdzono 8 poprawnych definicji kroków z pojęciami Lean.
- Zweryfikowano odczyt domyślny, zapis, klamrowanie błędnych indeksów oraz odporność na uszkodzone dane.

### B. Automatyczny test akceptacyjny przeglądarki Edge CDP (`tests/qa/verify_7_14.mjs`)
Polecenie: `node tests/qa/verify_7_14.mjs`
```
1. Sprawdzenie stanu początkowego na pulpicie...
2. Uruchomienie interaktywnego tutorialu z pulpitu...
   Krok 1 zaliczony: Wprowadzenie i wybór projektu
   Krok 2 zaliczony: Popyt klienta i takt time
   Krok 3 zaliczony: Operacje i struktura procesu
   Krok 4 zaliczony: Bilansowanie linii i wykres Yamazumi
   Krok 5 zaliczony: Rozmieszczenie hali i CAD 2D
   Krok 6 zaliczony: Symulacja harmonogramu i czasu partii
   Krok 7 zaliczony: Porównanie wariantów reorganizacji
   Krok 8 zaliczony: Raport inżynierski i eksport
3. Weryfikacja alternatywnej instrukcji tekstowej...
   Modal tekstowy zaliczony (wykryto 8 kroków)
4. Weryfikacja powrotu wstecz...
   Nawigacja wstecz zaliczona: Porównanie wariantów reorganizacji
5. Zakończenie tutorialu...
   Wykryto modal potwierdzenia wyjścia/przywrócenia migawki.
   Dock tutorialu został pomyślnie zamknięty.
WERYFIKACJA 7.14 ZAKOŃCZONA SUKCESEM! 8 kroków, modal, nawigacja i obsługa snapshotu przetestowane.
```

### Zrzuty ekranu z weryfikacji (`outputs/qa/7_14_tutorial/`):
- `01_tutorial_step_welcome.png` — Krok 1: Wprowadzenie na pulpicie
- `02_tutorial_step_demand.png` — Krok 2: Popyt i takt time
- `03_tutorial_step_process.png` — Krok 3: Struktura procesu i operacje
- `04_tutorial_step_balance.png` — Krok 4: Wykres Yamazumi i bilans
- `05_tutorial_step_layout.png` — Krok 5: CAD 2D i rozkład stanowisk
- `06_tutorial_step_simulation.png` — Krok 6: Symulacja 3D i harmonogram
- `07_tutorial_step_variants.png` — Krok 7: Zestawienie wariantów
- `08_tutorial_step_report.png` — Krok 8: Raport inżynierski
- `09_tutorial_text_modal.png` — Modal z pełną instrukcją tekstową
- `10_tutorial_dock_closed.png` — Zamknięcie i przywrócenie środowiska

---

## 4. Wnioski i status odbioru

Moduł **7.14** spełnia wszystkie kryteria określone w `PLAN_ROZWOJU.md`. Interfejs jest w pełni responsywny, odporny na uszkodzenia pamięci podręcznej, chroni dane użytkownika i stanowi gotowe, dydaktyczne wprowadzenie do projektowania linii montażowych w metodyce Lean Manufacturing.
Pozycja zostaje oznaczona jako **wdrożona**.
