# Projekty pokazowe — kontrakt 7.12.A

Status: **przygotowanie, nie gotowe przykłady do importu**. Jest już importer i eksporter pojedynczej rodziny projektu A1 (przycisk **Pakiet projektu**). Trzy kompletne projekty pozostają do utworzenia w B/C. Syntetyczne próby z `outputs/qa/7_12a` i `outputs/qa/7_12a1` sprawdzają formaty; są celowo niekompletne technologicznie.

Docelowe katalogi:

- `01_zestaw_montazowy/` — proces liniowy, podstawowy;
- `02_wozek_warsztatowy/` — zasoby, kompetencje, kopie, transport i bufory;
- `03_modul_urzadzenia/` — główna nitka i co najmniej dwie gałęzie podmontaży łączące się z nią.

W każdym znajdą się kompletne pliki, instrukcja i jawne założenia syntetyczne. Szczegółowe nazwy plików, wymagania i warunki odbioru określa [KONTRAKT_PAKIETU.md](KONTRAKT_PAKIETU.md). Macierz obecnych możliwości i luk: [WERYFIKACJA_PAKIETOW_POKAZOWYCH_7_12_A.md](../WERYFIKACJA_PAKIETOW_POKAZOWYCH_7_12_A.md).

Zewnętrzne pakiety są ładowane przez interfejs aplikacji. Nie należy wklejać ich do localStorage. Pełna kopia środowiska `.lsbackup.json` służy odzyskiwaniu wszystkich obszarów, a pojedynczy projekt przenosi otoczka `layout-studio-project-package` v1. Zakres zastąpienia, wymagania źródeł i jawne ustawienia sesji opisuje kontrakt. Integracja głównych widoków i wyników szkicu 6 pozostaje w A2.
