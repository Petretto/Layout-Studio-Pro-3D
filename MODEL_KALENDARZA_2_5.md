# Kalendarz zasobów — punkt 2.5

## Potwierdzona reguła

Użytkownik wybrał zatrzymanie rozpoczętej operacji na przerwę lub koniec zmiany i wznowienie jej po ponownej dostępności z **tym samym zespołem**. Przydział osób i kopii stanowiska pozostaje zajęty przez pauzę; harmonogram nie dobiera zastępstwa. Czas pracy operacji postępuje tylko wtedy, gdy stanowisko i wszystkie przydzielone osoby są dostępne. Tę regułę trzeba zastosować w 2.5.2 i odebrać w 2.5.3; sam kontrakt 2.5.1 nie zmienia jeszcze wyników.

## Pakiet 2.5.1 — dane i dostępność

Opcjonalne pole `resourceCalendars` w niekompletnym szkicu 6 zawiera osobne kalendarze po trwałym ID pracownika i stanowiska. Każdy kalendarz ma jawne przedziały zmian i przerw w sekundach względem początku przebiegu. Przedziały są półotwarte `[startSeconds, endSeconds)`, uporządkowane i nie mogą się nakładać; przerwa musi w całości mieścić się w jednej zmianie. Każda zmiana i przerwa ma `basis: confirmed | assumed`, aby przykład nie uchodził za potwierdzony grafik.

Brak pola w starszym szkicu pozostaje brakiem kalendarza. Pusta mapa lub brak wpisu dla danej osoby bądź stanowiska nie oznacza pracy bez przerw ani nie tworzy domyślnej zmiany. Szkic może być uzupełniany stopniowo, lecz przyszły przebieg kalendarzowy musi odmówić brakującego kalendarza używanego zasobu. Godziny, położenie przerw i ich powtarzanie nie są wyprowadzane z rocznego popytu, liczby zmian ani sumy minut przerw w projekcie 4/5.

`availableWindows` odejmuje przerwy od zmian, `intersectWindows` znajduje wspólną dostępność, a `sharedAvailability` wymaga jawnych kalendarzy stanowiska i wszystkich osób stałej podgrupy. Nie są to jeszcze czasy startu operacji ani nowy harmonogram. Aktywna symulacja 4/5 pozostaje bez zmian. Nie zmieniono wersji schematu 6 ani formatu zewnętrznego opakowania szkicu; jest to opcjonalne pole wewnątrz istniejącego zapisu.
