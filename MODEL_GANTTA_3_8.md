# Model wykresu Gantta harmonogramu (Punkt 3.8)

## Cel i zakres (PLAN 3.8)
Punkt 3.8 `PLAN_ROZWOJU.md` stawia za cel:
*Dodać wykres Gantta operacji, stanowisk i pracowników oraz przejście z wyniku do odpowiedniego obiektu.*

Wykres Gantta w Layout Studio Pro wizualizuje deterministyczny harmonogram zespołu na osi czasu, integrując stany pracy netto, pauzy kalendarzowe, oczekiwania przed startem, blokady wyjścia (`bbas`), lokalne oczekiwania na kontynuację oraz przewozy i dojazdy transportowe.

## Perspektywy widoku (`GanttViewMode`)

1. **`operations` (Operacje w partii)**:
   - Każdy pas (lane) odpowiada wykonaniu konkretnej operacji na określonej sztuce (`Sztuka X — Operacja Y`).
   - Przedziały czasowe:
     - Oczekiwanie przed startem (`readySeconds` $\rightarrow$ `startSeconds`, stan `wait`);
     - Okna faktycznej obróbki (`workWindows`, stan `work`);
     - Przerwy kalendarzowe w toku obróbki (`pauses`, stan `pause`);
     - Blokada bufora wyjściowego po zakończeniu obróbki (`blockedSeconds`, stan `blocked`);
     - Oczekiwanie na kontynuację na tym samym stanowisku (`continuationWaitSeconds`, stan `local-wait`).

2. **`stations` (Stanowiska i kopie)**:
   - Każdy pas odpowiada fizycznej kopii stanowiska (`ST-... / kopia K`).
   - Przedziały czasowe:
     - Wyprzedzająca rezerwacja celu transportu (`stationReserveStartSeconds` $\rightarrow$ `startSeconds`, stan `reserve`);
     - Obróbka operacji (`workWindows`, stan `work`, etykieta `Szt. X: Nazwa`);
     - Przerwy kalendarzowe stacji (`pauses`, stan `pause`);
     - Blokada stacji przez nieodebrany korpus (`blockedSeconds`, stan `blocked`);
     - Przetrzymanie korpusu przed lokalną kontynuacją (`continuationWaitSeconds`, stan `local-wait`).

3. **`workers` (Pracownicy)**:
   - Każdy pas odpowiada zadeklarowanemu pracownikowi (`W-...`).
   - Przedziały czasowe:
     - Czynności montażowe (`workWindows`, stan `work`);
     - Przetrzymanie pracownika w blokadzie stacji (polityka `bbas` bez zwolnienia operatora, stan `blocked`);
     - Przewozy ładunku korpusu/partii (`transfer`, stan `transport-transfer`);
     - Dojazdy bez ładunku i powroty wózków (`approach` / `return`, stan `transport-empty`);
     - Przerwy kalendarzowe w pracy pracownika (`pauses`, stan `pause`).

## Podziałka osi czasu (`calculateGanttTimeGrid`)
- Algorytm dynamicznie wyznacza czytelne, dziesiętne kroki główne (`majorStep` $\in \{1, 2, 5, 10, 20, 50, 100, 200, 500, \dots\}$) oraz podrzędne (`minorStep = majorStep / 5`), obejmujące cały czas trwania partii (*makespan*).

## Przejście z wyniku do odpowiedniego obiektu (Dwukierunkowa interaktywność)
- Wybór elementu na wykresie Gantta (kliknięcie słupka lub nagłówka wiersza):
  - Ustawia cel selekcji `GanttSelectionTarget` (`category: 'operation' | 'station' | 'worker'`, `id`, `job`, `copy`);
  - Prezentuje baner informacyjny wybranego obiektu;
  - Podświetla skorelowany wiersz w tabeli wykonań (klasa `.selected-row`);
  - W przypadku stanowiska lub pracownika automatycznie rozwija odpowiednią sekcję inspekcji (`open=true`) i podświetla wiersz;
- Kliknięcie wiersza w tabeli wykonań, tabeli stanowisk lub tabeli pracowników natychmiast przenosi i podświetla odpowiadające mu słupki na wykresie Gantta.
