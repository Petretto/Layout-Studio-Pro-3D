# Kalendarz zasobów — punkt 2.5

## Potwierdzona reguła

Użytkownik wybrał zatrzymanie rozpoczętej operacji na przerwę lub koniec zmiany i wznowienie jej po ponownej dostępności z **tym samym zespołem**. Przydział osób i kopii stanowiska pozostaje zajęty przez pauzę; harmonogram nie dobiera zastępstwa. Czas pracy operacji postępuje tylko wtedy, gdy stanowisko i wszystkie przydzielone osoby są dostępne. Regułę zastosowano w odrębnym harmonogramie szkicu 6 w 2.5.2; edycja i odbiór UI należą do 2.5.3.

## Pakiet 2.5.1 — dane i dostępność

Opcjonalne pole `resourceCalendars` w niekompletnym szkicu 6 zawiera osobne kalendarze po trwałym ID pracownika i stanowiska. Każdy kalendarz ma jawne przedziały zmian i przerw w sekundach względem początku przebiegu. Przedziały są półotwarte `[startSeconds, endSeconds)`, uporządkowane i nie mogą się nakładać; przerwa musi w całości mieścić się w jednej zmianie. Każda zmiana i przerwa ma `basis: confirmed | assumed`, aby przykład nie uchodził za potwierdzony grafik.

Brak pola w starszym szkicu pozostaje brakiem kalendarza. Pusta mapa lub brak wpisu dla danej osoby bądź stanowiska nie oznacza pracy bez przerw ani nie tworzy domyślnej zmiany. Szkic może być uzupełniany stopniowo, lecz przyszły przebieg kalendarzowy musi odmówić brakującego kalendarza używanego zasobu. Godziny, położenie przerw i ich powtarzanie nie są wyprowadzane z rocznego popytu, liczby zmian ani sumy minut przerw w projekcie 4/5.

`availableWindows` odejmuje przerwy od zmian, `intersectWindows` znajduje wspólną dostępność, a `sharedAvailability` wymaga jawnych kalendarzy stanowiska i wszystkich osób stałej podgrupy. Nie są to jeszcze czasy startu operacji ani nowy harmonogram. Aktywna symulacja 4/5 pozostaje bez zmian. Nie zmieniono wersji schematu 6 ani formatu zewnętrznego opakowania szkicu; jest to opcjonalne pole wewnątrz istniejącego zapisu.

## Pakiet 2.5.2 — harmonogram

Odrębny `scheduleWorkerRun` zachowuje dawny podgląd logiczny (`mode: logical`) dla starszego szkicu bez całego pola `resourceCalendars`. Nie interpretuje go jako kalendarza bez przerw. Gdy pole jest obecne, tryb kalendarzowy (`mode: calendar`) wymaga jawnych kalendarzy wszystkich osób ustalonego składu oraz stanowisk używanych przez operacje; brak wpisu blokuje przebieg. Dla wybranej podgrupy oblicza przecięcie dostępności z kalendarzem stanowiska. Operacja może wystartować w dostępnym oknie, a jej czas roboczy przechodzi przez kolejne wspólne okna. Wynik zapisuje odcinki pracy `workWindows`, przerwy `pauses` i przyczynę oczekiwania `calendar`; pauza nie jest liczona do czasu roboczego.

Wybrane osoby i kopia stanowiska pozostają przypisane do tej samej operacji aż do jej końca. Rezerwacja osób nadal biegnie od pierwszego do ostatniego przedziału wymaganej obecności z profilu wariantu; mapowanie tych granic na czas kalendarzowy obejmuje każdą pauzę wewnątrz rezerwacji. Kopia pozostaje zajęta również poza przedziałami obecności, do zakończenia operacji. Gdy jawne okna nie pozwalają dokończyć wszystkich operacji, harmonogram odmawia wyniku. Nie zmieniono schematu zapisu ani aktywnej symulacji 4/5. Edytor kalendarzy i prezentacja pauz w UI pozostają do 2.5.3.

## Pakiet 2.5.3 — UI

Edytor pozwala zapisać lub usunąć kalendarz pojedynczej osoby/stanowiska oraz jawnie usunąć wszystkie kalendarze, przywracając podgląd logiczny. Granice nowych wierszy pozostają puste do wpisania. Wiersze wymagają pochodzenia; zapis podlega istniejącej walidacji i historii szkicu. Podgląd pokazuje odcinki pracy, pauzy i rezerwację osób. Odbiór UI Eko i niezależnego pakowania zapisano w `WERYFIKACJA_KALENDARZA_2_5.md`.
