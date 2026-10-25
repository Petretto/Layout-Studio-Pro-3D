# Obliczenia referencyjne — Projekt Eko (04_eko)

Pochodzenie danych: **mixed**. Średnie OP10–OP21 pochodzą z lipca 2026, rama 1.4; OP22–OP25 są przykładowe. Obsada pomiaru: 13 osób, nieznane przypisania; tu użyto 17 ról testowych. OP21 zawsze dwie osoby przez 1320 s.

## 1. Ścieżka krytyczna i montaż równoległy drzwi

Dla pojedynczego wyrobu:
- Ścieżka przygotowania korpusu (rama główna):
  $$t_{\text{rama}} = t_{\text{OP10}} + t_{\text{OP11}} + t_{\text{OP12}} = 3480 + 600 + 3590 = 7670\text{ s}$$
- Równoległe podmontaże drzwi i osprzętu (OP13..OP18) kończą się przed upływem 7670 s, więc nie opóźniają rozpoczęcia montażu na korpusie.
- W wariancie **EKO-PARALLEL**:
  - OP22 (drzwi lewe) i OP23 (drzwi prawe) ruszają w chwili $t = 7670\text{ s}$ równolegle.
  - OP22/OP23 kończą się w 8270 s. OP24 i OP25 po 480 s są sekwencyjne na tej samej kopii korpusu bez jawnej grupy równoległej: 8270–8750 i 8750–9230 s. Dalej OP19: 1800 s, OP20: 1200 s, OP21: 1320 s dla dwóch osób; 9230 + 1800 + 1200 + 1320 = **13 550 s**.
- W wariantach **EKO-SEQUENTIAL** oraz **EKO-SHARED-WORKER**:
  - Brak równoległości na drzwiach powoduje wydłużenie ścieżki krytycznej o czas dodatkowego oczekiwania na zwolnienie stacji / montera (+600 s).
  - Całkowity czas wykonania wynosi dokładnie **14 150 s**.
