# 7.12.C2 — zaawansowany zewnętrzny projekt pokazowy: Moduł urządzenia


**Korekta po niezależnym przeglądzie 2026-10-24:** aktualny zakres i wyniki są w [raporcie przeglądu](WERYFIKACJA_PRZEGLADU_DEMO_I_STARTU_7_13.md). Poniższy zapis zachowano jako historię wcześniejszego odbioru, nie dowód pełnego transportu fizycznego. 7.12 ponownie w trakcie. C2 ma teraz jawną równoległość i wzorzec 320/270 s; Eko ma dwie osoby na OP21 i jawnie testowy przydział pozostałych ról.

Data: **2026-10-24**. Katalog: `przyklady/03_modul_urzadzenia/`, wersja **1.0.0**, pochodzenie: **synthetic**.
Zakres C2: montaż modułu urządzenia — linia główna korpusu zasilana z dwóch równoległych, zbiegających się gałęzi podzespołów (`SUB-PWR` oraz `SUB-DRV`) zintegrowanych w węźle scalającym (`MU-OP20-M`), reguła A przepływu podzespołów, transport międzyoperacyjny i buforowanie.
Powiązanie: **PLAN_ROZWOJU.md — 7.12.C (część 2)** oraz **przyklady/KONTRAKT_PAKIETU.md**.

---

## 1. Zawartość pakietu i model danych

Katalog zawiera **12 plików** wygenerowanych przez deterministyczny generator `scripts/generate_demo_advanced_7_12c2.mjs`:
- `manifest.json` — inwentarz pakietu, format `layout-studio-demo-manifest` v1, z liczbą bajtów i sumami kontrolnymi SHA-256 każdego z 11 plików.
- `projekt-pokazowy.json` — pojedynczy plik wejściowy otoczki `layout-studio-project-package` v1 dla przycisku *Pakiet projektu*.
- `dane/proces.xlsx` — arkusz procesu technologicznego z 5 operacjami, jawnymi kodami poprzedników dla węzła zbieżnego, czasami VA/NVA, bez formuł.
- `dane/bom.xlsx` — arkusz zestawienia materiałowego z 10 komponentami przypisanymi do gałęzi podzespołów i linii głównej.
- `dane/szkic6.json`, `dane/warianty6.json`, `dane/zrodlo4.json` — spójne projekcje danych JSON.
- `dane/warunki_eksperymentu.json` — parametry symulacji (partia 3 sztuki, odstęp przybyć 1 s, takt, reguła podzespołów A, bufory, wózki transportowe).
- `dane/slownik_pol.md` — słownik pojęć, jednostek miar, kompetencji i reguł buforowania i podzespołów.
- `referencje/oczekiwane_wyniki.json` — niezależne wzorcowe okna czasowe i metryki wyznaczone przed testem.
- `referencje/obliczenia.md` — analityczne wyprowadzenie taktów, ścieżek krytycznych zbieżności i harmonogramu z teorii kolejek.
- `README.md` — instrukcja użytkownika krok po kroku.

---

## 2. Architektura procesu i zbieżność gałęzi podzespołów

Struktura procesu obejmuje linię główną korpusu oraz 2 gałęzie podzespołów przygotowawczych:
- **Gałąź główna (korpus)**:
  - `MU-OP10-M` (Montaż ramy nośnej): czas 40 s (VA 32 s, NVA 8 s), monter MU-W1 na `ST-MU-MAIN-1`.
- **Gałąź podzespołu A (`SUB-PWR`)**:
  - `MU-OP10-A` (Montaż modułu zasilania): wariant bazowy 50 s (VA 40 s, NVA 10 s), wariant zbalansowany 45 s (VA 36 s, NVA 9 s), monter MU-W2 na `ST-MU-PWR`. Przygotowuje podzespół `SUB-PWR`.
- **Gałąź podzespołu B (`SUB-DRV`)**:
  - `MU-OP10-B` (Montaż modułu napędowego): czas 60 s (VA 48 s, NVA 12 s), monter MU-W3 na `ST-MU-DRV`. Przygotowuje podzespół `SUB-DRV`.
- **Węzeł zbieżny integracji**:
  - `MU-OP20-M` (Integracja zasilania i napędu z ramą): poprzednicy `['MU-OP10-M', 'MU-OP10-A', 'MU-OP10-B']`.
    - Wariant bazowy: 1 monter (MU-W4), czas **70 s** (VA 58 s, NVA 12 s) — wąskie gardło bazy.
    - Wariant zbalansowany: zespół 2 monterów (MU-W4 + MU-W6), czas skrócony do **35 s** (VA 28 s, NVA 7 s).
    - Konsumuje natychmiast na starcie po 1 szt. `SUB-PWR` i `SUB-DRV` (Reguła A).
- **Gałąź końcowa (korpus)**:
  - `MU-OP30-M` (Kontrola końcowa i test funkcjonalny): czas 45 s (VA 38 s, NVA 7 s), kontroler MU-W5 na `ST-MU-MAIN-3`.

### Zestawienie wariantów dla partii 3 sztuk

| Parametr / Wskaźnik | Wariant bazowy (ADVANCED-BASE) | Wariant zbalansowany (ADVANCED-BALANCED) | Zmiana |
| --- | --- | --- | --- |
| Liczba aktywnych stanowisk | 5 | 5 | b.z. |
| Liczba pracowników w zespole | 5 (MU-W1..MU-W5) | 6 (MU-W1..MU-W6) | +1 osoba |
| Wąskie gardło linii | ST-MU-MAIN-2 (70 s) | ST-MU-DRV (60 s) | przesunięcie |
| Czas cyklu linii (takt) | **70 s/szt.** | **60 s/szt.** | **-10 s (-14,3%)** |
| Zdolność nominalna | **51,43 szt./h** | **60,00 szt./h** | **+16,7%** |
| Czas przejścia 1. sztuki | 175 s | 140 s | -35 s (-20,0%) |
| Czas realizacji partii 3 szt. | **410 s** | **340 s** | **-70 s (-17,1%)** |
| Koszt materiałowy BOM | 572 PLN/szt. | 572 PLN/szt. | b.z. |

---

## 3. Wykonane sprawdzenia automatyczne

1. **Reprodukowalność plików (`--check`)**:
   `node scripts/generate_demo_advanced_7_12c2.mjs --check` $\rightarrow$ **PASS** (12 plików identycznych bajtowo).
2. **Testy celowane (`tests/network.test.ts`)**:
   `node scripts/test.mjs --suite=network --test-name-pattern=7\.12\.C2` $\rightarrow$ **4/4 PASS**:
   - Sprawdzenie inwentarza manifestu, sum SHA-256 i braku zależności od Eko/baterii/silników.
   - Pomyślny import arkuszy `proces.xlsx` i `bom.xlsx` przez standardowe importery Excela (0 błędów, 0 pominięć, brak formuł, zachowane relacje wieloargumentowych poprzedników).
   - Zgodność taktu, BOM, bilansu podzespołów i statycznego bilansu z niezależnym wzorcem analitycznym.
   - Deterministyczna symulacja zdarzeniowa partii 3 sztuk: czasy 410 s i 340 s, bezwzględna tolerancja okien operacji $\le 10^{-9}$ s, brak nakładania rezerwacji pracowników, zgodność reguły A dla zbiegu podzespołów.
3. **Regresja wsteczna pakietu 7.12**:
   `node scripts/test.mjs --suite=network --test-name-pattern=7\.12` $\rightarrow$ **26/26 PASS** (pokrywa 7.12.A2b2a, 7.12.A2b1, 7.12.A2a, 7.12.B, 7.12.C1 i 7.12.C2).
4. **Nienaruszalność kodu interfejsu użytkownika**:
   Żaden plik w `src/components/studio/` ani trwający pakiet UI nie został naruszony.
