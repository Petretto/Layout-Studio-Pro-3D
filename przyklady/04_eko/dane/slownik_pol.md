# Słownik pojęć, operacji i danych — Projekt Eko (04_eko)

Pochodzenie danych: **mixed** (pomiary rzeczywiste lipiec 2026 dla operacji OP10–OP21; 4 czasy przykładowe OP22–OP25).

## 1. Operacje montażu (16 kroków)

- **OP10** — Podmontaż stelaża: **3480 s**; średnia z kilku pomiarów, liczba prób nieznana.
- **OP11** — Montaż stelaża w ramie: **600 s**; średnia z kilku pomiarów, liczba prób nieznana.
- **OP12** — Etap I: **3590 s**; średnia z kilku pomiarów, liczba prób nieznana.
- **OP13** — Podmontaż drzwi lewych: **2640 s**; średnia z kilku pomiarów, liczba prób nieznana.
- **OP14** — Podmontaż front panel: **1320 s**; średnia z kilku pomiarów, liczba prób nieznana.
- **OP15** — Podmonta drzwi prawych: **2640 s**; średnia z kilku pomiarów, liczba prób nieznana.
- **OP16** — Podmontaż tylnego panela: **1920 s**; średnia z kilku pomiarów, liczba prób nieznana.
- **OP17** — Podmontaż dachu: **1680 s**; średnia z kilku pomiarów, liczba prób nieznana.
- **OP18** — Podmontaż „trumny”: **1200 s**; średnia z kilku pomiarów, liczba prób nieznana.
- **OP22** — Montaż drzwi lewych na ramie [CZAS TESTOWY]: **600 s**; czas przykładowy.
- **OP23** — Montaż drzwi prawych na ramie [CZAS TESTOWY]: **600 s**; czas przykładowy.
- **OP24** — Montaż panelu przedniego na ramie [CZAS TESTOWY]: **480 s**; czas przykładowy.
- **OP25** — Montaż panelu tylnego na ramie [CZAS TESTOWY]: **480 s**; czas przykładowy.
- **OP19** — Test: **1800 s**; średnia z kilku pomiarów, liczba prób nieznana.
- **OP20** — Montaż „trumny” na ramie: **1200 s**; średnia z kilku pomiarów, liczba prób nieznana.
- **OP21** — Pakowanie: **1320 s**; średnia z kilku pomiarów, liczba prób nieznana.

Suma czasów: **25550 s**, nie liczba osobosekund. OP21: dwie osoby przez całe 1320 s; czas nie jest dzielony przez dwa. Pozostałe przydziały i równoległość to jawne założenia demonstracyjne (17 ról testowych), nie odtworzenie rzeczywistych 13 osób.

## 2. Warianty wykonania

1. **EKO-PARALLEL (Wariant bazowy)**:
   - Jednoczesny montaż drzwi lewych (OP22) i prawych (OP23) przez dwóch niezależnych monterów na korpusie.
   - Czas realizacji partii 1 sztuki: **13 550 s**.
2. **EKO-SEQUENTIAL (Wariant sekwencyjny)**:
   - Montaż drzwi lewych i prawych wykonywany sekwencyjnie.
   - Czas realizacji partii 1 sztuki: **14 150 s** (+600 s).
3. **EKO-SHARED-WORKER (Wariant ze współdzielonym monterem)**:
   - Jeden monter wykonuje kolejno OP22 i OP23.
   - Czas realizacji partii 1 sztuki: **14 150 s** (+600 s).
