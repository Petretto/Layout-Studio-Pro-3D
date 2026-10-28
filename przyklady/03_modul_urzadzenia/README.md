# Projekt pokazowy zaawansowany — Montaż modułu urządzenia przemysłowego

Pakiet demonstracyjny: `03_modul_urzadzenia`
Wersja: **1.2.0 — pełny odbiór fizyczny transportu, zaopatrzenia i buforów (C2 zakończone)**
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
3. Dla procesowego wzorca w **Proces i stanowiska → Stanowiska i zasoby** włącz jawnie **JIT**:
   - Ustaw partię: **3 sztuki**.
   - Odstęp przybyć: **1 s**.
4. Wybierz wariant **ADVANCED-BASE** i uruchom symulację. Graf JIT zachowuje poprzedniki obu gałęzi; rejestr ilości i transport partii sprawdza osobny eksperyment fizyczny poniżej. Czas ukończenia partii JIT: **320 s**.
5. Przełącz na wariant **ADVANCED-BALANCED** i ponów symulację JIT. Czas partii spada do **270 s** dzięki odciążeniu węzła złączenia.
6. Przejdź do modułu **Porównanie wariantów**, aby wyświetlić tabelę syntezy i pobrać raport.


## Odbiór fizyczny transportu, zaopatrzenia i buforów (1.2.0)

W Proces i stanowiska → Stanowiska i zasoby ustaw **3 sztuki, odstęp 1000 s, JIT WYŁĄCZONY**. Baza: 210/1210/2210 s; reorganizacja: 180/1180/2180 s. Odstęp izoluje łączenie gałęzi, nie jest próbą wydajności pod obciążeniem. Osobne 320/270 s pozostają wzorcami procesowymi JIT przy odstępie 1 s.

Monterzy źródłowi MU-W1/W2 transportują podmontaże do integracji, MU-W3 przewozi korpus do integracji, MU-W4 do testu; cztery wózki wracają do źródeł. Czas załadowany 10 s i pusty powrót 10 s to dwa jawne założenia dydaktyczne. Dostawy ośmiu komponentów z magazynu wykonują inne osoby: zdarzenia dostępności nie zajmują monterów. Próba niedoboru: ustaw tylko SUP-MU-ZASIL na zapas 0 i pozostaw pierwszą dostawę 900 s; baza kończy w 1100/1210/2210 s, reorganizacja 1070/1180/2180 s. Pozostałe dwie gałęzie pierwszej sztuki nadal pracują od 0 s.

**Zakończenie podpakietu C2 (2026-10-28):** ograniczone bufory dla gałęzi i partii podzespołów (`subassemblyBuffers`, C2-B) oraz skończone i zerowe bufory korpusów (`stationBuffers`) są w pełni zintegrowane w schedulerze. Zgodnie z decyzją domenową użytkownika z 2026-10-28 detale zbiegające się na węźle integracji nie mogą „wisieć w powietrzu” ani być odkładane poza wyznaczonym buforem — bufor wejściowy (`inputCapacity >= 1`) jest wymagany po co najmniej jednej stronie zbiegu strumieni. Silnik poprawnie odrzuca jednoczesne wejście bezpośrednie 0 korpusu i podmontażu, chroniąc poprawność organizacji procesu. Brak geometrii przebiegu tras pozostaje jawny; A2b2b pokazuje historię korpusów/wózków, rejestr podzespołów jest w inspekcji wyniku, bez ich osobnej animacji. Główne widoki 4 i model 6 pozostają osobne.
