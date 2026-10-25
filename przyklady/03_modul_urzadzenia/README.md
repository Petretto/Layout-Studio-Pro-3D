# Projekt pokazowy zaawansowany — Montaż modułu urządzenia przemysłowego

Pakiet demonstracyjny: `03_modul_urzadzenia`
Wersja: **1.0.0**
Pochodzenie danych: **jawnie syntetyczne** (dane demonstracyjno-dydaktyczne)
Identyfikator: `DEMO-MODUL-URZADZENIA-1`
Zgodność: **Layout Studio Pro 3D v0.4.0+**

## Cel i zakres demonstracji

Pakiet reprezentuje zaawansowany poziom złożoności (**advanced**) i demonstruje:
1. **Wielowątkowy proces rozgałęziony**: główna linia montażu korpusu zasilana przez dwie niezależne, równoległe gałęzie przygotowania podzespołów:
   - Gałąź A: montaż bloku zasilacza i sterowania PLC (`SUB-PWR`).
   - Gałąź B: montaż napędu śrubowego z silnikiem (`SUB-DRV`).
2. **Punkt złączenia (Joint Node)**: operacja integracji OP20-M nie ruszy bez potwierdzenia gotowości korpusu oraz obu podzespołów A i B.
3. **Reguła A przepływu podzespołów**: pełna partia podzespołu staje się dostępna po zakończeniu producenta; atomowe pobranie przy starcie odbiorcy.
4. **Zbalansowanie węzła złączenia**: wariant bazowy (70 s na węźle integracji, makespan 320 s) vs wariant zbalansowany 2-osobowy (40 s na integracji, nowy pułap odstępu 60 s, makespan 270 s).

## Zawartość katalogu

- `projekt-pokazowy.json` — główny plik pakietu (importowany przez przycisk **Pakiet projektu**).
- `manifest.json` — inwentarz pakietu z sumami kontrolnymi SHA-256.
- `dane/proces.xlsx` — arkusz procesu technologicznego z grafem poprzedników (zbieżność gałęzi).
- `dane/bom.xlsx` — zestawienie materiałowe z podzespołami i kosztem jednostkowym (1350 PLN).
- `dane/szkic6.json`, `dane/warianty6.json`, `dane/zrodlo4.json` — projekcje danych JSON.
- `dane/warunki_eksperymentu.json` — zalecane parametry sesji symulacji.
- `dane/slownik_pol.md` — słownik pojęć, jednostek i reguły A.
- `referencje/oczekiwane_wyniki.json`, `referencje/obliczenia.md` — niezależny wzorzec analityczny.

## Instrukcja uruchomienia w aplikacji

1. W aplikacji kliknij **Pakiet projektu** i wczytaj plik `projekt-pokazowy.json`.
2. Pobierz automatyczną kopię ratunkową i zatwierdź import.
3. W module **Symulacja**:
   - Ustaw partię: **3 sztuki**.
   - Odstęp przybyć: **1 s**.
4. Wybierz wariant **ADVANCED-BASE** i uruchom symulację. Zwróć uwagę na start operacji integracji (OP20-M) — czeka ona na gotowość obu podzespołów A i B. Czas ukończenia partii: **410 s**.
5. Przełącz na wariant **ADVANCED-BALANCED** i ponów symulację. Czas partii spada do **340 s** dzięki odciążeniu węzła złączenia.
6. Przejdź do modułu **Porównanie wariantów**, aby wyświetlić tabelę syntezy i pobrać raport.


## Zakres odbioru

Podane wyniki są procesowe: jawny tryb just-in-time z założoną dostępnością materiałów. Nie stanowią odbioru fizycznych przejazdów, rezerwacji wózków, rzeczywistych zapasów/dostaw ani blokowania fizycznego przepływu. Konfiguracja zasobów wymaga osobnego odbioru bez JIT przed użyciem jako wzorzec fizyczny. Główne widoki projektu 4 i warsztat 6 mają oddzielne źródła; wyniki wariantów odczytuj w warsztacie.
