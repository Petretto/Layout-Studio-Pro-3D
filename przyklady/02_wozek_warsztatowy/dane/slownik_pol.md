# Słownik pól i jednostek — Projekt średni: Wózek warsztatowy

Pochodzenie danych: **syntetyczne**. Projekt demonstracyjny poziomu średniego (7.12.C) przygotowany zgodnie ze standardem 7.12.A.

## Jednostki miar

| Wielkość | Jednostka | Uwagi |
| --- | --- | --- |
| Czas | sekundy [s] | Wewnętrzny format wszystkich czasów w silniku symulacji |
| Geometria / Długość | milimetry [mm] | Koordynaty 2D/3D, odległości między stołami, gabaryty wyposażenia |
| Zdolność produkcyjna | [szt./h] | Zdolność nominalna: $3600 / \text{takt}$ |
| Waluta / Koszty | PLN | Koszty jednostkowe komponentów BOM |

## Struktura procesu i operacji

- **WW-OP10** — *Montaż ramy dolnej i kół skrętnych*: czas standardowy 60 s (VA 48 s, NVA 12 s). Wymagana kompetencja: `WW-C-MECH`.
- **WW-OP20** — *Montaż półek i burt wózka*:
  - Obsada 1 osoba: czas standardowy 80 s (VA 65 s, NVA 15 s) — wąskie gardło wariantu bazowego.
  - Obsada 2 osoby: czas standardowy 45 s (VA 36 s, NVA 9 s) — zbalansowany wariant reorganizacji.
  - Wymagana kompetencja: `WW-C-MECH`.
- **WW-OP30** — *Montaż uchwytu ergonomicznego i akcesoriów*: czas standardowy 50 s (VA 40 s, NVA 10 s). Wymagana kompetencja: `WW-C-FIT`.
- **WW-OP40** — *Kontrola odbiorcza, próba toczenia i pakowanie*: czas standardowy 40 s (VA 32 s, NVA 8 s). Wymagana kompetencja: `WW-C-QC`.

## Zespoły, pracownicy i kompetencje

- **WW-C-MECH** (Montaż mechaniczny / konstrukcyjny): posiadają `WW-W1`, `WW-W2`, `WW-W5`.
- **WW-C-FIT** (Montaż wyposażenia i detali): posiadają `WW-W2`, `WW-W3`, `WW-W5`.
- **WW-C-QC** (Kontrola jakości i odbiór): posiada `WW-W4`.

## Buforowanie i zaopatrzenie materiałowe

- **Pojemności buforów**: wejście 2 szt., wyjście 2 szt. Polityka: `bbas-worker-released` (operator zwalniany po zakończeniu pracy nawet przy zablokowanym wyjściu).
- **Zaopatrzenie**: 5 zdefiniowanych pozycji materiałowych z zapasem początkowym 10 szt. i harmonogramem dostaw co 900 s.
