# 7.12.D oraz 7.2 — Zbiorczy odbiór fizyczny i szablony trzech zewnętrznych pakietów pokazowych oraz walidacja referencji analitycznych

Data: **2026-10-28**.  
Zakres: **7.12.D — Odbiór i szablony** oraz **7.2 — walidacja obliczeń referencyjnych na jawnych scenariuszach 7.12**.  
Status: **wdrożone** (zamknięcie całości punktów **7.12** oraz **7.2** w [PLAN_ROZWOJU.md](../../PLAN_ROZWOJU.md)).  
Podstawa domenowa: standard fizycznego transportu monterów (C1), gałęzi podmontaży i buforów (C2-A..C2-B3f) oraz ostateczna decyzja domenowa z 2026-10-28 wykluczająca wiszenie detali w powietrzu bez bufora wejściowego.

---

## 1. Cel i podsumowanie pakietu

Zadaniem pakietu 7.12.D oraz 7.2 jest ostateczny, łączny odbiór trzech zewnętrznych, wersjonowanych pakietów demonstracyjnych o rosnącym poziomie złożoności technologicznej i fizycznej w czystym środowisku przeglądarkowym, a także potwierdzenie zgodności wyników symulacji (zarówno w trybie uproszczonym JIT, jak i pełnym transportowym/buforowym) z niezależnymi obliczeniami analitycznymi:

| Pakiet | Stopień złożoności | Liczba operacji i gałęzi | Cechy technologiczne i logistyczne | Referencja JIT (baza / wariant) | Referencja fizyczna skonfigurowana |
| --- | --- | --- | --- | --- | --- |
| `przyklady/01_zestaw_montazowy/` | Podstawowy (7.12.B) | 3 op. (liniowy) | 3 stacje, 3 osoby, bufory wejść/wyjść, lokalna kontynuacja | **170 s** / **190 s** | — (linia czysto procesowa) |
| `przyklady/02_wozek_warsztatowy/` | Średni (7.12.C1) | 4 op. (liniowy) | Zespoły i kompetencje (`WW-C-*`), czasy zespołowe 80s/45s, transport monterów, powroty wózków, zaopatrzenie materiałowe | **390 s** / **315 s** | **460 s** / **385 s** |
| `przyklady/03_modul_urzadzenia/` | Zaawansowany (7.12.C2) | 5 op. (zbiegające się gałęzie) | Linia główna korpusu + 2 gałęzie podmontaży (`SUB-PWR`, `SUB-DRV`) zintegrowane w węźle `MU-OP20-M`, reguła A, bufory podmontaży i korpusów ze zwolnieniem/zatrzymaniem obsady | **320 s** / **270 s** | **2210 s** / **2180 s** (odstęp 1000 s / dostawy materiałowe) |

Każdy z pakietów zawiera **12 plików** oznaczonych formatem `dataOrigin: "synthetic"`, manifest inwentaryzacyjny ze skrótami SHA-256, arkusze Excela zgodne z importerami oraz niezależne obliczenia analityczne spisane w `referencje/oczekiwane_wyniki.json` i `referencje/obliczenia.md`.

---

## 2. Dowody weryfikacji automatycznej

### A. Testy jednostkowe i integracyjne suity 7.12 i 7.2 (`tests/network.test.ts`)
Uruchomienie: `node scripts/test.mjs --suite=network "--test-name-pattern=7\.12|7\.2"` $\rightarrow$ **104/104 PASS**:
- `7.12.D: wszystkie 3 pakiety (01, 02, 03) spełniają kontrakt formatu, unikalności ID, separacji danych i braku powiązań z Eko` (PASS):
  - Wszystkie obiekty pakietu 01 mają przedrostek `ZM-`.
  - Wszystkie obiekty pakietu 02 mają przedrostek `WW-` (zero wycieków `ZM-`).
  - Wszystkie obiekty pakietu 03 mają przedrostek `MU-` (zero wycieków `WW-` ani `ZM-`).
  - Żaden pakiet nie zawiera odwołań do historycznych danych testowych (`EKO`, `BATTERY`, `MOTOR`).
  - Zgodność 100% bajtowa i kryptograficzna SHA-256 manifestów ze stanem na dysku.
- `7.12.D: arkusze procesu i BOM we wszystkich 3 pakietach oraz szablony wzorcowe przechodzą bezbłędnie importery` (PASS):
  - Wszystkie 6 arkuszy Excela (`dane/proces.xlsx` i `dane/bom.xlsx` dla 01, 02, 03) przeszły importery `importProcess` i `importBOM` z wynikiem 0 błędów i 0 pominięć.
  - Ochrona przed wstrzyknięciem formuł: w arkuszach brak jakichkolwiek formuł kalkulacyjnych.
  - Szablony wzorcowe `createTemplateWorkbook` generują arkusze `Dane` i `Opis kolumn`.
- `7.12.D: walidacja formatu layout-studio-project-package, round-trip oraz odporność na uszkodzenia sum i źródeł` (PASS):
  - Bezpieczne odrzucenie pakietu przy naruszeniu sumy SHA-256, formatu lub wersji bez uszkodzenia bieżącego projektu.
  - Atomowy round-trip importu, eksportu i re-importu.
- `7.12.D / 7.2: łączna weryfikacja analityczna taktu, bilansu i symulacji wszystkich 6 wariantów w 3 pakietach` (PASS):
  - Dokładność czasów partii dla wszystkich 6 wariantów: 170 s, 190 s, 390 s, 315 s, 320 s, 270 s.
  - Zdolności nominalne odpowiadają dokładnie wartościom analitycznym $3600 / \max(\text{cykl})$.
  - Brak podwójnych rezerwacji zasobów ludzkich i stanowiskowych.

### B. Odbiór E2E w czystym profilu przeglądarki Edge CDP (`tests/qa/verify_7_12d.mjs`)
Uruchomienie: `node tests/qa/verify_7_12d.mjs` $\rightarrow$ **PASS**:
- Utworzono odizolowany profil danych użytkownika w katalogu tymczasowym, z zerową obecnością danych w `localStorage`.
- **Pakiet 01 (Zestaw montażowy)**:
  - Wczytano `przyklady/01_zestaw_montazowy/projekt-pokazowy.json`, potwierdzono pobranie kopii ratunkowej.
  - Przeliczono harmonogram zespołu w trybie JIT (partia 3 szt., odstęp 1 s) $\rightarrow$ makespan **170 s** (baza).
  - Wykonano porównanie wariantów w UI (`DomainVariantComparisonPanel`) $\rightarrow$ potwierdzono w tabeli wariantów **170 s** (baza) oraz **190 s** (konsolidacja), pobrano raport Markdown (`.md`).
  - Zapisano zrzuty ekranu: `outputs/qa/7_12d_ui/demo01_schedule.png` i `outputs/qa/7_12d_ui/demo01_comparison.png`.
- **Pakiet 02 (Wózek warsztatowy)**:
  - Wczytano `przyklady/02_wozek_warsztatowy/projekt-pokazowy.json`, zweryfikowano czyste zastąpienie bez wycieków ID `ZM-`.
  - Przeliczono harmonogram w trybie JIT $\rightarrow$ makespan **390 s**.
  - Przeliczono harmonogram w trybie pełnego transportu monterów (odznaczone JIT) $\rightarrow$ makespan **460 s** (zgodnie z analitycznym wzorcem transportowym).
  - Wykonano porównanie wariantów w UI $\rightarrow$ potwierdzono wariant zbalansowany **315 s** (vs baza **390 s**), pobrano raport Markdown.
  - Zapisano zrzuty ekranu: `outputs/qa/7_12d_ui/demo02_schedule.png`, `outputs/qa/7_12d_ui/demo02_configured_schedule.png` i `outputs/qa/7_12d_ui/demo02_comparison.png`.
- **Pakiet 03 (Moduł urządzenia)**:
  - Wczytano `przyklady/03_modul_urzadzenia/projekt-pokazowy.json`, zweryfikowano gałęzie podmontaży i brak wycieków `WW-` ani `ZM-`.
  - Przeliczono harmonogram w trybie JIT $\rightarrow$ makespan **320 s**.
  - Przeliczono harmonogram w trybie fizycznym z odstępem 1000 s $\rightarrow$ makespan **2210 s** (zgodnie z analitycznym wzorcem dostaw i transportu).
  - Wykonano porównanie wariantów w UI $\rightarrow$ potwierdzono wariant zbalansowany **270 s** (vs baza **320 s**), pobrano raport Markdown.
  - Zapisano zrzuty ekranu: `outputs/qa/7_12d_ui/demo03_schedule.png`, `outputs/qa/7_12d_ui/demo03_configured_schedule.png` i `outputs/qa/7_12d_ui/demo03_comparison.png`.
- **Round-Trip eksportu i importu**:
  - Wyeksportowano pakiet projektu 03 z poziomu modala *Pakiet projektu*.
  - Ponownie zaimportowano wygenerowany plik i zweryfikowano dokładną tożsamość głęboką projektu (`deepStrictEqual`).
- **Stabilność środowiska**:
  - Zarejestrowano **0 nieobsłużonych wyjątków JavaScript** w konsoli (`runtimeErrors: []`).
  - Podsumowanie zapisano w `outputs/qa/7_12d_ui/report.json`.

### C. Narzędzia katalogu i odtwarzalność generatorów
- `node scripts/prepare_demo_catalog.mjs --check` $\rightarrow$ **PASS** (4 projekty, 9 zasobów w `public/demo-projects/`, zgodne manifesty).
- `node scripts/generate_demo_basic_7_12b.mjs --check` $\rightarrow$ **PASS**.
- `node scripts/generate_demo_intermediate_7_12c1.mjs --check` $\rightarrow$ **PASS**.
- `node scripts/generate_demo_advanced_7_12c2.mjs --check` $\rightarrow$ **PASS**.

---

## 3. Zamknięcie punktów 7.12 oraz 7.2 w rejestrze projektu

1. **Punkt 7.12 (Trzy zewnętrzne pakiety demonstracyjne)**:
   - Wszystkie podetapy: `7.12.A` (kontrakt/otoczka), `7.12.B` (zestaw montażowy), `7.12.C1` (wózek warsztatowy), `7.12.C2` (moduł urządzenia z gałęziami) oraz `7.12.D` (zbiorczy odbiór E2E i szablony) są w 100% zrealizowane i udokumentowane.
   - Status punktu 7.12: **wdrożone**.

2. **Punkt 7.2 (Walidacja obliczeń referencyjnych na jawnych scenariuszach)**:
   - Wyniki silnika harmonogramowania zostały zweryfikowane względem niezależnych obliczeń zdarzeniowych i stanowych spisanych przed uruchomieniem silnika.
   - Wszystkie tolerancje numeryczne spełnione bez dopasowywania wzorców do kodu.
   - Status punktu 7.2: **wdrożone**.

3. **Wskaźniki postępu [PLAN_ROZWOJU.md](../../PLAN_ROZWOJU.md)**:
   - **Cały plan:** 63/72 = **87,5%** (poprzednio 61/72 = 84,7%)
   - **Pierwsze wydanie (etapy 1–7):** 63/68 = **92,6%** (poprzednio 61/68 = 89,7%)
   - **Etap 7:** 10/14 = **71,4%** (poprzednio 8/14 = 57,1%)
