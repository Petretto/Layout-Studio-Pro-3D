# 7.13 — Weryfikacja pustego startu, katalogu przykładów zewnętrznych i ochrony danych

Data: **2026-10-28**.  
Zakres: **7.13 — start bez projektów wbudowanych, pusty dokument, zewnętrzny katalog pakietów 7.12 oraz ochrona środowiska** w [PLAN_ROZWOJU.md](../../PLAN_ROZWOJU.md).  
Status: **wdrożone** (zamknięcie całości punktu **7.13**).  
Podstawa domenowa: decyzja użytkownika z 2026-10-19 (brak projektów zaszytych w produkcyjnym bundle, Eko wyłącznie zewnętrznym pakietem testowym), kontrakt pakietów 7.12, bezpieczny Disaster Recovery (7.6a) oraz interaktywny tutorial (7.14).

---

## 1. Cel i zakres funkcjonalny punktu 7.13

Zadaniem modułu **7.13** jest całkowite wyeliminowanie na sztywno zaszytych danych demonstracyjnych z produkcyjnego kodu aplikacji, zapewnienie czystego, pustego startu dla nowo uruchomionego środowiska oraz dostarczenie bezpiecznych ścieżek wprowadzania i pobierania danych:

1. **Pusty start (`newProject()`)**:
   - Nowy profil przeglądarki uruchamia się z pustym projektem (`processSteps: []`, `bom: []`, `layoutObjects: []`, `obstacles: []`).
   - Pulpit czytelnie informuje o braku danych komunikatem ostrzegawczym (`.notice[role="note"]`) i wskazuje 0 operacji, 0 stanowisk oraz 0 materiałów.
   - Usunięto wszelkie dawne przyciski predefiniowane (np. „Wczytaj Eko”, „Silniki EV”, „Baterie EV”) z głównego interfejsu i nagłówka.

2. **Rozwijany katalog pakietów demonstracyjnych (`DemoCatalog`)**:
   - Dostępny na pulpicie pod nagłówkiem „Przykłady do pobrania”.
   - Ładuje metadane na żądanie z `public/demo-projects/index.json` (formatVersion: 1) bez naruszania aktywnego projektu użytkownika.
   - Prezentuje 4 wersjonowane pakiety demonstracyjne o rosnącej złożoności:
     1. `01_zestaw_montazowy` (Podstawowy, v1.0.0, syntetyczny proces liniowy, 12 plików)
     2. `02_wozek_warsztatowy` (Średni, v1.1.0, obsada zespołowa, transport monterów, bufory i zapasy, 12 plików)
     3. `03_modul_urzadzenia` (Zaawansowany, v1.2.0, zbiegające się gałęzie podmontaży C2, 12 plików)
     4. `04_eko` (Dane historyczne, v1.0.0, montaż ramy 1.4, realne pomiary OP10–OP21, 12 plików)
   - Każda karta udostępnia pobranie pojedynczego pliku projektu `.project.json` oraz kompletnego archiwum `.zip` (12 plików z arkuszami XLSX bez formuł, referencjami i instrukcją).
   - Weryfikacja integralności kryptograficznej SHA-256 w locie przed przekazaniem pobieranego pliku do systemu operacyjnego.

3. **Bezpieczeństwo danych użytkownika (Data Loss Prevention)**:
   - Działania zastępujące stan projektu („Nowy projekt”, „Wczytaj pakiet”, „Importuj JSON”, „Rozpocznij tutorial”) wymagają jawnego potwierdzenia użytkownika.
   - Przed importem lub uruchomieniem tutorialu tworzona jest automatyczna migawka ratunkowa (`createWorkspaceBackup(localStorage)`), która pozwala na cofnięcie operacji w razie pomyłki.
   - Pobrana kopia zapasowa lub pliki wariantów pozostają niezależne i nie są nadpisywane przez przeładowanie strony.

---

## 2. Wyniki weryfikacji automatycznej

### A. Testy jednostkowe i integracyjne suity 7.13 (`tests/core.test.ts` i `tests/network.test.ts`)
Polecenie: `node scripts/test.mjs --suite=all "--test-name-pattern=7\.13"` $\rightarrow$ **6/6 PASS**:
1. `7.13: nowy dokument jest pusty, niezależny i nie zawiera danych demonstracyjnych` (PASS):
   - Weryfikacja fabryki `newProject()`: pusta lista operacji, BOM, wyposażenia i przeszkód.
   - Puste metryki bilansowania, brak błędów krytycznych walidacji.
2. `7.13: pakiet demonstracyjny Eko (04_eko) spełnia kontrakt, zawiera realne pomiary i zgodne sumy SHA-256` (PASS).
3. `7.13: arkusze procesu i BOM pakietu Eko przechodzą importery Excela z zerem błędów` (PASS).
4. `7.13: symulacja harmonogramu trzech wariantów Eko (parallel 13550s, sequential 14150s, shared-worker 14150s)` (PASS).
5. `7.13: demo Eko respektuje dwie osoby pakowania i odróżnia pomiary od testowych przydziałów` (PASS).
6. `7.13: dokumentacja Eko ma rzeczywiste nazwy/czasy i poprawną sumę bez zmyślonych wartości` (PASS).

### B. Integralność katalogu assetów demonstracyjnych
- `node scripts/prepare_demo_catalog.mjs --check` $\rightarrow$ **PASS** (4 projekty, 9 assetów, zgodne sumy SHA-256).
- `python tests/verify_demo_catalog.py` $\rightarrow$ **3/3 PASS** (niezależny czytnik ZIP Pythona potwierdza 100% integralność archiwów i manifestów).

### C. Test akceptacyjny w czystej przeglądarce Edge CDP (`tests/qa/verify_7_13_closure.mjs`)
Polecenie: `node tests/qa/verify_7_13_closure.mjs` $\rightarrow$ **PASS**:
```
1. Weryfikacja czystego startu na nowym profilu...
   Pusty start zaliczony: 0 operacji, 0 stanowisk, 0 materiałów.
2. Weryfikacja braku na sztywno zaszytych przycisków demonstracyjnych...
   Brak zaszytych danych potwierdzony.
3. Weryfikacja rozwijanego katalogu przykładów zewnętrznych (DemoCatalog)...
   Katalog przykładów zaliczony (wykryto 4 zewnętrzne pakiety): Zestaw uchwytu montażowego — DEMO syntetyczne, Wózek warsztatowy 3-półkowy — DEMO syntetyczne, Moduł urządzenia przemysłowego — DEMO syntetyczne zaawansowane, Eko — montaż ramy 1.4 (realne dane procesu)
4. Weryfikacja pobierania i kontroli SHA-256 w katalogu...
5. Weryfikacja ochrony danych i menu projektu...
WERYFIKACJA 7.13 ZAKOŃCZONA SUKCESEM! Czysty start, brak zaszytych projektów, rozwijany katalog 4 pakietów i menu projektu przetestowane.
```
- Brak wyjątków runtime (`errors: []`).
- Zrzuty ekranu w `outputs/qa/7_13_closure/`:
  - `01_empty_start_dashboard.png` — Czysty pulpit po starcie aplikacji
  - `02_demo_catalog_expanded.png` — Rozwinięty katalog 4 pakietów zewnętrznych
  - `03_project_menu.png` — Menu zarządzania projektem i kopiami

---

## 3. Podsumowanie i status odbioru

Punkt **7.13** spełnia wszystkie kryteria określone w planie rozwoju:
- Aplikacja startuje bez zaszytych na sztywno projektów.
- Zapewniono pełną separację danych demonstracyjnych od runtime.
- Pakiety demonstracyjne są dystrybuowane jako zewnętrzne pliki weryfikowane sumą SHA-256.
- Użytkownik ma pełną kontrolę nad środowiskiem, a jego praca jest chroniona przed przypadkowym nadpisaniem.

Pozycja **7.13** zostaje oznaczona w rejestrze jako **wdrożone**.
