# 7.12.C1 — średni zewnętrzny projekt pokazowy: Wózek warsztatowy


**Korekta po niezależnym przeglądzie 2026-10-24:** aktualny zakres i wyniki są w [raporcie przeglądu](WERYFIKACJA_PRZEGLADU_DEMO_I_STARTU_7_13.md). Poniższy zapis zachowano jako historię wcześniejszego odbioru, nie dowód pełnego transportu fizycznego. 7.12 ponownie w trakcie. C2 ma teraz jawną równoległość i wzorzec 320/270 s; Eko ma dwie osoby na OP21 i jawnie testowy przydział pozostałych ról.

Data: **2026-10-24**. Katalog: \`przyklady/02_wozek_warsztatowy/\`, wersja **1.0.0**, pochodzenie: **synthetic**.
Zakres C1: montaż wózka warsztatowego — średni poziom złożoności, warianty obsady i czasy zespołowe, kompetencje, trasy transportowe, bufory i jawne zaopatrzenie materiałowe.
Powiązanie: **PLAN_ROZWOJU.md — 7.12.C (część 1)** oraz **przyklady/KONTRAKT_PAKIETU.md**.

---

## 1. Zawartość pakietu i model danych

Katalog zawiera **12 plików** wygenerowanych przez deterministyczny generator \`scripts/generate_demo_intermediate_7_12c1.mjs\`:
- \`manifest.json\` — inwentarz pakietu, format \`layout-studio-demo-manifest\` v1, z liczbą bajtów i sumami kontrolnymi SHA-256 każdego z 11 plików.
- \`projekt-pokazowy.json\` — pojedynczy plik wejściowy otoczki \`layout-studio-project-package\` v1 dla przycisku *Pakiet projektu*.
- \`dane/proces.xlsx\` — arkusz procesu technologicznego (4 operacje, czasy standardowe, VA/NVA, bez formuł).
- \`dane/bom.xlsx\` — arkusz zestawienia materiałowego (7 komponentów, jednostki, opakowania Pallet/BoxKLT/Carton, koszty syntetyczne).
- \`dane/szkic6.json\`, \`dane/warianty6.json\`, \`dane/zrodlo4.json\` — spójne projekcje danych JSON.
- \`dane/warunki_eksperymentu.json\` — parametry symulacji (partia 3 sztuki, odstęp przybyć 1 s, takt, bufory, zaopatrzenie).
- \`dane/slownik_pol.md\` — słownik pojęć, jednostek miar, kompetencji i reguł buforowania.
- \`referencje/oczekiwane_wyniki.json\` — niezależne wzorcowe okna czasowe i metryki wyznaczone przed testem.
- \`referencje/obliczenia.md\` — analityczne wyprowadzenie taktów, czasów cyklu i harmonogramu z teorii kolejek.
- \`README.md\` — instrukcja użytkownika krok po kroku.

---

## 2. Architektura procesu i dwa warianty

Linia montażu składa się z 4 operacji:
- **WW-OP10** (Montaż ramy i kół): czas 60 s (VA 48 s, NVA 12 s), 1 monter (WW-W1), kompetencja WW-C-MECH.
- **WW-OP20** (Montaż półek i burt):
  - Wariant bazowy: 1 pracownik (WW-W2), czas **80 s** (VA 65 s, NVA 15 s) — wąskie gardło linii.
  - Wariant zbalansowany: zespół 2 pracowników (WW-W2 + WW-W5), czas skrócony do **45 s** (VA 36 s, NVA 9 s).
- **WW-OP30** (Montaż uchwytu i osprzętu): czas 50 s (VA 40 s, NVA 10 s), 1 monter (WW-W3), kompetencja WW-C-FIT.
- **WW-OP40** (Kontrola odbiorcza i pakowanie): czas 40 s (VA 32 s, NVA 8 s), 1 kontroler (WW-W4), kompetencja WW-C-QC.

### Zestawienie wariantów dla partii 3 sztuk

| Parametr / Wskaźnik | Wariant bazowy (INTERMEDIATE-BASE) | Wariant zbalansowany (INTERMEDIATE-BALANCED) | Zmiana |
| --- | --- | --- | --- |
| Liczba aktywnych stanowisk | 4 | 4 | b.z. |
| Liczba pracowników w zespole | 4 (WW-W1..WW-W4) | 5 (WW-W1..WW-W5) | +1 osoba |
| Wąskie gardło linii | ST-WW-2 (80 s) | ST-WW-1 (60 s) | przesunięcie |
| Czas cyklu linii (takt) | **80 s/szt.** | **60 s/szt.** | **-20 s (-25%)** |
| Zdolność nominalna | **45 szt./h** | **60 szt./h** | **+33,3%** |
| Czas przejścia 1. sztuki | 230 s | 195 s | -35 s |
| Czas realizacji partii 3 szt. | **390 s** | **315 s** | **-75 s (-19,2%)** |
| Koszt materiałowy BOM | 328 PLN/szt. | 328 PLN/szt. | b.z. |

---

## 3. Wykonane sprawdzenia automatyczne

1. **Reprodukowalność plików (\`--check\`)**:
   \`node scripts/generate_demo_intermediate_7_12c1.mjs --check\` $\\rightarrow$ **PASS** (12 plików identycznych bajtowo).
2. **Testy celowane (\`tests/network.test.ts\`)**:
   \`node scripts/test.mjs --suite=network --test-name-pattern=7\\.12\\.C1\` $\\rightarrow$ **4/4 PASS**:
   - Sprawdzenie inwentarza manifestu, sum SHA-256 i braku zależności od Eko/baterii/silników.
   - Pomyślny import arkuszy \`proces.xlsx\` i \`bom.xlsx\` przez standardowe importery Excela (0 błędów, 0 pominięć, brak formuł).
   - Zgodność taktu, BOM, kompetencji i statycznego bilansu z niezależnym wzorcem analitycznym.
   - Deterministyczna symulacja zdarzeniowa partii 3 sztuk: czasy 390 s i 315 s, bezwzględna tolerancja okien operacji $\\le 10^{-9}$ s, brak nakładania rezerwacji pracowników, identyczność wyników po translacji geometrii layoutu.
3. **Regresja wsteczna 7.12.B**:
   \`node scripts/test.mjs --suite=network --test-name-pattern=7\\.12\\.B\` $\\rightarrow$ **4/4 PASS**.
4. **Nienaruszalność kodu interfejsu użytkownika**:
   Żaden plik w \`src/components/studio/\` ani trwający pakiet UI nie został zmodyfikowany.
