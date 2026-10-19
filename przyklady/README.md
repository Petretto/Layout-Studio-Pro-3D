# Projekty pokazowe — kontrakt 7.12.A

Status: **przygotowanie, nie gotowe przykłady do importu**. W tym pakiecie nie utworzono trzech projektów ani nowego importera. Syntetyczna próba z `outputs/qa/7_12a` służy audytowi formatów i jest celowo niekompletna technologicznie.

Docelowe katalogi:

- `01_zestaw_montazowy/` — proces liniowy, podstawowy;
- `02_wozek_warsztatowy/` — zasoby, kompetencje, kopie, transport i bufory;
- `03_modul_urzadzenia/` — główna nitka i co najmniej dwie gałęzie podmontaży łączące się z nią.

W każdym znajdą się kompletne pliki, instrukcja i jawne założenia syntetyczne. Szczegółowe nazwy plików, wymagania i warunki odbioru określa [KONTRAKT_PAKIETU.md](KONTRAKT_PAKIETU.md). Macierz obecnych możliwości i luk: [WERYFIKACJA_PAKIETOW_POKAZOWYCH_7_12_A.md](../WERYFIKACJA_PAKIETOW_POKAZOWYCH_7_12_A.md).

Zewnętrzne pakiety będą ładowane przez interfejs aplikacji. Nie należy wklejać ich do localStorage. Pełna kopia środowiska `.lsbackup.json` nie jest docelowym formatem pojedynczego przykładu: obejmuje kilka obszarów danych, a audyt wykazał luki wymagające osobnego odbioru 7.6a.
