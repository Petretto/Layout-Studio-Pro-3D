# Projekty pokazowe — kontrakt 7.12.A / odbiór 7.12.D

Status 2026-10-25: **C1 1.1.0 odebrany również fizycznie: transport monterów, bufory i dostawy; C2/D oraz całe A2 nadal otwarte, 7.12 w trakcie**. C2 1.1.0: odebrany podpakiet fizyczny A (transport i zaopatrzenie), ograniczone bufory gałęzi nadal nieobsługiwane. Eko: logiczny wzorzec korpusu bez JIT, nie odwzorowanie obsady 13 osób.
Importer i eksporter formatu `layout-studio-project-package` v1 działają przez przycisk **Pakiet projektu** (w menu projektu).

Od 7.13.3 na Pulpicie dostępne są **Przykłady do pobrania**: osobny JSON projektu oraz ZIP zawierający wszystkie 12 plików katalogu. Pobieranie z kontrolą SHA-256 nie zastępuje aktywnego projektu. Wczytanie odbywa się osobno przez importer z kopią ratunkową i potwierdzeniem. `katalog.json` opisuje karty; `npm run dev` i `npm run build` przygotowują zewnętrzne pliki dystrybucji z weryfikacją manifestów. Dane nie są importowane do kodu JS. Lokalny serwer działa bez internetu; wersja hostowana wymaga połączenia do pobrania.

## Kompletne pakiety pokazowe

1. **`01_zestaw_montazowy/` — montaż zestawu montażowego (podstawowy, 7.12.B):**
   - Proces liniowy, 3 operacje manualne (20 s / 30 s / 40 s), takt 60 s, 12 plików z manifestem SHA-256.
   - Wariant bazowy (3 stacje, 3 osoby, partia 3 szt. = 170 s) vs konsolidacja (2 stacje, 2 osoby, partia 3 szt. = 190 s).
   - Wejściowy plik pakietu: [`01_zestaw_montazowy/projekt-pokazowy.json`](01_zestaw_montazowy/projekt-pokazowy.json). Raport: [`../WERYFIKACJA_PROJEKTU_PODSTAWOWEGO_7_12_B.md`](../WERYFIKACJA_PROJEKTU_PODSTAWOWEGO_7_12_B.md).

2. **`02_wozek_warsztatowy/` — montaż wózka warsztatowego (średni, 7.12.C1):**
   - Pakiet **1.1.0**, tryb fizyczny (3 szt., odstęp 1 s, JIT wyłączony): **460/385 s**. Transport wykonują monterzy, trzy jawne wózki wracają do źródła; czas pustego powrotu 10 s jest osobnym założeniem. Siedem jawnych zapasów. Próby dostawy w 900 s i blokady opisano w referencjach.
   - Zespoły pracownicze, 4 operacje, czasy zespołowe, kompetencje (`WW-C-MECH`, `WW-C-FIT`, `WW-C-QC`), bufory i jawne zaopatrzenie materiałowe, 12 plików z manifestem SHA-256.
   - Wariant bazowy (1 pracownik na OP20, 80 s, partia 3 szt. = 390 s) vs zbalansowany (zespół 2 pracowników na OP20, 45 s, partia 3 szt. = 315 s).
   - Wejściowy plik pakietu: [`02_wozek_warsztatowy/projekt-pokazowy.json`](02_wozek_warsztatowy/projekt-pokazowy.json). Raport: [`../WERYFIKACJA_PROJEKTU_SREDNIEGO_7_12_C1.md`](../WERYFIKACJA_PROJEKTU_SREDNIEGO_7_12_C1.md).

3. **`03_modul_urzadzenia/` — montaż modułu urządzenia (zaawansowany, 7.12.C2):**
   - Linia główna korpusu zasilana z dwóch równoległych zbiegających się gałęzi podzespołów (`SUB-PWR` moduł zasilania, `SUB-DRV` moduł napędowy) zbiegających się w węźle integracji `MU-OP20-M`.
   - Reguła A przepływu podzespołów (`producer-finish` $\rightarrow$ `consumer-start`), transport; ograniczone bufory gałęzi nieobsługiwane, 12 plików z manifestem SHA-256.
   - Fizyczny C2-A: 3 szt., odstęp 1000 s, JIT OFF → 2210/2180 s; pierwsza sztuka 210/180 s. Cztery wózki z obsadą monterów i powrotami, osiem jawnych zapasów. To izolowana próba łączenia gałęzi, nie przepustowości. Raport: [C2-A](../WERYFIKACJA_C2_FIZYCZNY_A_7_12.md).
   - Osobny wzorzec JIT, 3 szt./1 s: wariant bazowy (wąskie gardło OP20-M 70 s, partia 3 szt. = 320 s) vs zbalansowany (zespół 2 monterów na OP20-M 40 s, wąskie gardło OP10-B 60 s, partia 3 szt. = 270 s).
   - Wejściowy plik pakietu: [`03_modul_urzadzenia/projekt-pokazowy.json`](03_modul_urzadzenia/projekt-pokazowy.json). Raport: [`../WERYFIKACJA_PROJEKTU_ZAAWANSOWANEGO_7_12_C2.md`](../WERYFIKACJA_PROJEKTU_ZAAWANSOWANEGO_7_12_C2.md).

4. **`04_eko/` — montaż ramy Eko 1.4 (dane rzeczywiste / demonstracyjne, 7.13):**
   - 16 operacji montażu (pomiary fabryczne z lipca 2026 r. dla OP10–OP21; 4 czasy przykładowe OP22–OP25), 60 pozycji zestawienia materiałowego (BOM).
   - Równoległy montaż podzespołów i drzwi (rybia ość): wariant bazowy (równoległy, partia 1 szt. = **13 550 s**), wariant sekwencyjny (**14 150 s**), wariant ze współdzielonym monterem (**14 150 s**).
   - Wejściowy plik pakietu: [`04_eko/projekt-pokazowy.json`](04_eko/projekt-pokazowy.json). Raport: [`../WERYFIKACJA_EKO_DEMO_7_13.md`](../WERYFIKACJA_EKO_DEMO_7_13.md).

## Dystrybucja i szablony (7.12.D)

- Każdy podkatalog zawiera kompletne, samodzielne arkusze `dane/proces.xlsx` i `dane/bom.xlsx` zgodne z importerami aplikacji (arkusz 0 `Dane`, arkusz 1 `Opis kolumn`, arkusz 2 `Pochodzenie`, bez formuł).
- Aplikacja udostępnia ponadto czyste szablony startowe procesu i BOM (`tests/Szablon_process.xlsx`, `tests/Szablon_bom.xlsx` oraz pobieranie z poziomu kart *Proces i stanowiska → Operacje* i *Popyt i materiały → Materiały (BOM)*).
- Zewnętrzne pakiety są ładowane wyłącznie przez interfejs aplikacji (*Menu projektu* $\rightarrow$ *Pakiet projektu*).
- Zbiorczy raport weryfikacji E2E w czystym profilu przeglądarki: [`../WERYFIKACJA_ODBIOR_I_SZABLONY_7_12_D.md`](../WERYFIKACJA_ODBIOR_I_SZABLONY_7_12_D.md).
