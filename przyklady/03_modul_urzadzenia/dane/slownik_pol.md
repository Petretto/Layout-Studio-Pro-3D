# Słownik pól i jednostek — Projekt zaawansowany: Moduł urządzenia

Pochodzenie danych: **syntetyczne**. Projekt demonstracyjny poziomu zaawansowanego (7.12.C) przygotowany zgodnie ze standardem 7.12.A.

## Jednostki miar

| Wielkość | Jednostka | Uwagi |
| --- | --- | --- |
| Czas | sekundy [s] | Wewnętrzny format wszystkich czasów w silniku symulacji |
| Geometria / Długość | milimetry [mm] | Koordynaty 2D/3D, odległości między stołami, gabaryty wyposażenia |
| Zdolność produkcyjna | [szt./h] | Zdolność nominalna: $3600 / \text{takt}$ |
| Waluta / Koszty | PLN | Koszty jednostkowe komponentów BOM |

## Struktura procesu i operacji

- **Gałąź A (Podmontaż zasilacza i sterownika)**:
  - **MU-OP10-A**: Czas 50 s (VA 40 s, NVA 10 s). Wytwarza podzespół `SUB-PWR` (Blok zasilania i sterowania PLC). Rola: `subassembly-preparation`.
- **Gałąź B (Podmontaż napędu śrubowego)**:
  - **MU-OP10-B**: Czas 60 s (VA 50 s, NVA 10 s). Wytwarza podzespół `SUB-DRV` (Blok napędu śrubowego z silnikiem). Rola: `subassembly-preparation`.
- **Główna nitka montażu korpusu**:
  - **MU-OP10-M**: Inspekcja i przygotowanie korpusu nośnego: czas 40 s (VA 32 s, NVA 8 s). Rola: `body-work`.
  - **MU-OP20-M** (Węzeł złączenia / integracja):
    - Wymaga jednoczesnej gotowości: korpusu głównego oraz obu podzespołów `SUB-PWR` i `SUB-DRV`.
    - Obsada 1 osoba: czas standardowy 70 s (VA 58 s, NVA 12 s) — wąskie gardło wariantu bazowego.
    - Obsada 2 osoby: czas standardowy 40 s (VA 32 s, NVA 8 s) — zbalansowany wariant reorganizacji.
  - **MU-OP30-M**: Test funkcjonalny, kalibracja i pakowanie końcowe: czas 50 s (VA 42 s, NVA 8 s). Rola: `body-work`.

## Reguła A przepływu podzespołów (Subassembly Flow)

- Dostępność partii następuje dokładnie w momencie zakończenia operacji producenta (`availability: 'producer-finish'`).
- Pobranie i zużycie partii następuje atomowo dokładnie przy starcie operacji odbiorcy (`consumption: 'consumer-start'`).
- Operacja złączenia nie może wystartować przed ukończeniem obu gałęzi podmontaży.
