# Projekty pokazowe — kontrakt 7.12.A

Status: **projekt podstawowy B gotowy dla jawnego zakresu JIT; średni i zaawansowany C nadal w planie**. Importer/eksporter A1 działa przez **Pakiet projektu**. Pierwszy kompletny katalog: [01_zestaw_montazowy/README.md](01_zestaw_montazowy/README.md), plik wejściowy [projekt-pokazowy.json](01_zestaw_montazowy/projekt-pokazowy.json). Zawiera arkusze, zasoby, warianty, manifest i niezależne obliczenia. Syntetyczne próby `outputs/qa/7_12a` i `outputs/qa/7_12a1` pozostają wyłącznie testami formatu, nie projektami pokazowymi.

Docelowe katalogi:

- `01_zestaw_montazowy/` — proces liniowy, podstawowy: 3 operacje manualne, jawne bufory, dydaktyczny JIT, baza i konsolidacja; odebrany w B;
- `02_wozek_warsztatowy/` — zasoby, kompetencje, kopie, transport i bufory;
- `03_modul_urzadzenia/` — główna nitka i co najmniej dwie gałęzie podmontaży łączące się z nią.

W każdym znajdą się kompletne pliki, instrukcja i jawne założenia syntetyczne. Szczegółowe nazwy plików, wymagania i warunki odbioru określa [KONTRAKT_PAKIETU.md](KONTRAKT_PAKIETU.md). Odbiór pierwszego katalogu: [WERYFIKACJA_PROJEKTU_PODSTAWOWEGO_7_12_B.md](../WERYFIKACJA_PROJEKTU_PODSTAWOWEGO_7_12_B.md). Macierz historycznego audytu: [WERYFIKACJA_PAKIETOW_POKAZOWYCH_7_12_A.md](../WERYFIKACJA_PAKIETOW_POKAZOWYCH_7_12_A.md).

Zewnętrzne pakiety są ładowane przez interfejs aplikacji. Nie należy wklejać ich do localStorage. Pełna kopia środowiska `.lsbackup.json` służy odzyskiwaniu wszystkich obszarów, a pojedynczy projekt przenosi otoczka `layout-studio-project-package` v1. Zakres zastąpienia, wymagania źródeł i jawne ustawienia sesji opisuje kontrakt. Integracja głównych widoków i wyników szkicu 6 pozostaje w A2.
