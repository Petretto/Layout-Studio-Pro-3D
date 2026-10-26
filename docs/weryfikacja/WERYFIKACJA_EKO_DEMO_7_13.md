# 7.13 — Pakiet demonstracyjny Eko z realnymi danymi procesu (przygotowanie do czystego startu)


**Korekta po niezależnym przeglądzie 2026-10-24:** aktualny zakres i wyniki są w [raporcie przeglądu](WERYFIKACJA_PRZEGLADU_DEMO_I_STARTU_7_13.md). Poniższy zapis zachowano jako historię wcześniejszego odbioru, nie dowód pełnego transportu fizycznego. 7.12 ponownie w trakcie. C2 ma teraz jawną równoległość i wzorzec 320/270 s; Eko ma dwie osoby na OP21 i jawnie testowy przydział pozostałych ról.

Data: **2026-10-24**.
Katalog: `przyklady/04_eko/`, wersja **1.0.0**, pochodzenie: **mixed**.
Zakres: adaptacja projektu Eko do pełnego, zewnętrznego pakietu demonstracyjnego w standardzie `layout-studio-project-package` v1, zawierającego rzeczywiste pomiary fabryczne z lipca 2026 r. (dla operacji OP10–OP21) oraz 60 pozycji zestawienia materiałowego (BOM).
Powiązanie: **PLAN_ROZWOJU.md — 7.13 (krok 1: oddzielenie danych demonstracyjnych od kodu produkcyjnego)** oraz decyzja użytkownika z 2026-10-24.

---

## 1. Zawartość pakietu i model danych

Katalog `przyklady/04_eko/` zawiera **12 samowystarczalnych plików** wygenerowanych przez deterministyczny generator `scripts/generate_demo_eko_7_13.mjs`:
- `manifest.json` — inwentarz pakietu, format `layout-studio-demo-manifest` v1, liczba bajtów i sumy SHA-256 każdego z 11 plików.
- `projekt-pokazowy.json` — pojedynczy plik wejściowy otoczki `layout-studio-project-package` v1 dla przycisku *Pakiet projektu*. Zawiera:
  - `source4Json` — projekt schematu 4 z 16 operacjami i 60 pozycjami BOM,
  - `source5Json` — źródło schematu 5 z warsztatu stanowisk,
  - `draftRaw` — otoczka `domain-draft-save` v1 modelu domenowego szkicu 6 (wariant bazowy równoległy),
  - `variantsRaw` — biblioteka `domain-variant-library` v1 z trzema wariantami: `EKO-PARALLEL`, `EKO-SEQUENTIAL`, `EKO-SHARED-WORKER`.
- `dane/proces.xlsx` — arkusz procesu technologicznego z 16 operacjami (arkusze: *Dane*, *Opis kolumn*, *Pochodzenie*, bez formuł).
- `dane/bom.xlsx` — arkusz zestawienia materiałowego z 60 komponentami w opakowaniach `Pallet` i `BoxKLT`.
- `dane/szkic6.json`, `dane/warianty6.json`, `dane/zrodlo4.json` — czytelne projekcje formatów JSON.
- `dane/warunki_eksperymentu.json` — parametry symulacji dla partii 1 sztuki.
- `dane/slownik_pol.md` — słownik pojęć, operacji montażu ramy i drzwi.
- `referencje/oczekiwane_wyniki.json` — wzorcowe czasy wykonania partii:
  - **EKO-PARALLEL**: **13 550 s** (montaż równoległy drzwi lewych OP22 i prawych OP23 na korpusie),
  - **EKO-SEQUENTIAL**: **14 150 s** (+600 s przy montażu sekwencyjnym),
  - **EKO-SHARED-WORKER**: **14 150 s** (+600 s przy współdzieleniu montera).
- `referencje/obliczenia.md` — analityczne wyprowadzenie ścieżki krytycznej ramy i podzespołów.
- `README.md` — instrukcja użytkownika krok po kroku.

---

## 2. Wykonane sprawdzenia automatyczne

1. **Reprodukowalność generatora (`--check`)**:
   `node scripts/generate_demo_eko_7_13.mjs --check` $\rightarrow$ **PASS** (12 plików identycznych bajtowo, zgodność SHA-256).
2. **Testy jednostkowe / integracyjne (`tests/network.test.ts`)**:
   `node scripts/test.mjs --suite=network --test-name-pattern=7\.13` $\rightarrow$ **3/3 PASS**:
   - Sprawdzenie inwentarza manifestu, sum SHA-256 i poprawności struktury otoczki pakietu projektu (16 operacji, 60 BOM, 7 podzespołów).
   - Bezbłędny import arkuszy `proces.xlsx` i `bom.xlsx` przez standardowe importery Excela (0 błędów, 0 pominięć, brak zewnętrznych formuł).
   - Deterministyczna symulacja zdarzeniowa trzech wariantów: czasy 13 550 s oraz 14 150 s, brak nakładających się rezerwacji monterów, niezmienność wyników przy translacji geometrii layoutu.
3. **Łączna regresja suity projektów pokazowych**:
   `node scripts/test.mjs --suite=network "--test-name-pattern=7\.(12|13)"` $\rightarrow$ **33/33 PASS** (pokrywa 7.12.A, 7.12.B, 7.12.C1, 7.12.C2, 7.12.D oraz 7.13 Eko).
4. **Zautomatyzowany test w przeglądarce Edge (`tests/qa/verify_7_13_eko.mjs`)**:
   Uruchomiono czysty profil Microsoft Edge: zaimportowano pakiet `04_eko/projekt-pokazowy.json`, zweryfikowano poprawne wczytanie 16 operacji i 60 pozycji BOM, obliczono harmonogram szkicu 6 bez błędów w konsoli (`errors: []`).

---

## 3. Ochrona trwających prac nad UI

Wszystkie operacje wykonano bez wprowadzania jakichkolwiek modyfikacji w plikach interfejsu (`src/components/studio/`, `LayoutEditor.tsx`, `HallWorkspace.css`, `PopoutWindow.tsx` itp.), dzięki czemu prace równoległego agenta nad redesignem UI pozostały nienaruszone.
