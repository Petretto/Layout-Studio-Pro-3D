# Projekt pokazowy średni — Montaż wózka warsztatowego 3-półkowego

Pakiet demonstracyjny: `02_wozek_warsztatowy`
Wersja: **1.1.0**
Pochodzenie danych: **jawnie syntetyczne** (dane demonstracyjno-dydaktyczne, brak pomiarów produkcyjnych)
Identyfikator: `DEMO-WOZEK-WARSZTATOWY-1`
Zgodność: **Layout Studio Pro 3D v0.4.0+**

## Cel i zakres demonstracji

Pakiet reprezentuje średni poziom złożoności (**intermediate**) i demonstruje:
1. **Wielowariantową obsadę i czasy zespołowe**: operacja OP20 posiada zdefiniowane warianty obsady — 1 pracownik (80 s) oraz zespół 2-osobowy (45 s).
2. **Macierz kompetencji personelu**: trzej pracownicy montażu mechanicznego, jeden montażysta wyposażenia i kontroler jakości. Zespół zbalansowany angażuje pracownika wielozadaniowego.
3. **Zaopatrzenie materiałowe i bufory**: jawne zapasy początkowe komponentów, zużycie atomowe na operacjach oraz bufory stanowiskowe z polityką `bbas-worker-released`.
4. **Porównanie wariantów**: wariant bazowy (wąskie gardło na montażu półek, takt 80 s) vs wariant zreorganizowany z obsadą 2-osobową (nowy takt 60 s, wzrost wydajności o +33,3%).

## Zawartość katalogu

- `projekt-pokazowy.json` — główny plik pakietu (importowany przez przycisk **Pakiet projektu**).
- `manifest.json` — inwentarz pakietu z sumami kontrolnymi SHA-256.
- `dane/proces.xlsx` — arkusz procesu technologicznego z czasami VA/NVA.
- `dane/bom.xlsx` — zestawienie materiałowe z cenami i pojemnikami magazynowymi.
- `dane/szkic6.json`, `dane/warianty6.json`, `dane/zrodlo4.json` — projekcje danych JSON.
- `dane/warunki_eksperymentu.json` — zalecane parametry sesji symulacji.
- `dane/slownik_pol.md` — słownik pojęć, jednostek i kompetencji.
- `referencje/oczekiwane_wyniki.json`, `referencje/obliczenia.md` — niezależny analityczny wzorzec wyników.

## Instrukcja uruchomienia w aplikacji

1. W aplikacji kliknij **Pakiet projektu** i wczytaj plik `projekt-pokazowy.json`.
2. Pobierz automatyczną kopię ratunkową i zatwierdź import.
3. Dla historycznego eksperymentu procesowego w **Proces i stanowiska → Stanowiska i zasoby** włącz jawnie **JIT**:
   - Ustaw partię: **3 sztuki**.
   - Odstęp przybyć: **1 s**.
4. Wybierz wariant **INTERMEDIATE-BASE** i uruchom symulację. Zwróć uwagę na czas zakończenia partii: **390 s** oraz obciążenie stanowiska S2.
5. Przełącz na wariant **INTERMEDIATE-BALANCED** i ponów symulację. Czas partii spada do **315 s**, a obciążenie stacji ulega zrównoważeniu.
6. Przejdź do modułu **Porównanie wariantów**, aby wyświetlić tabelę syntezy i pobrać raport.


## Fizyczny tryb i próby odbioru

W Proces i stanowiska → Stanowiska i zasoby ustaw 3 sztuki, odstęp 1 s, JIT WYŁĄCZONY, następnie oblicz harmonogram. Baza: 460 s, reorganizacja: 385 s. Transport i puste powroty wykonują monterzy źródłowi; dodatkowy monter WW-W5 pomaga tylko przy OP20. Powroty mają osobny dydaktyczny czas 10 s. Są trzy jawne korpusy, trzy wózki i siedem pozycji zaopatrzenia. Wszystkie dane są syntetyczne. Dodatkowe próby dostawy i blokady opisano w referencje/obliczenia.md.

Historyczne 390/315 s dotyczą jawnego JIT z założoną dostępnością materiałów. Nie porównuj ich jako tego samego eksperymentu z 460/385 s. Korpusy i wózki mają historię fizyczną w odtwarzaniu A2b2b; brak geometrycznego przebiegu tras pozostaje jawny. Główne widoki projektu 4 i warsztatu 6 pozostają osobnymi źródłami.
