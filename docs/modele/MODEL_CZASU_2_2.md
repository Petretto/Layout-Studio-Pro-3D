# Model czasu operacji — punkt 2.2

Status 2026-10-04: punkt 2.2 wdrożony w zakresie niekompletnego szkicu 6 po odbiorze 2.2a–2.2c. Aktywna symulacja nadal używa projektów 4/5.

## Kontrakt danych

Operacja szkicu 6 może mieć opcjonalne `timeProfile`. Brak pola oznacza, że podział czasu nie został określony. Migracja z projektów 4/5 nie wyprowadza profilu z `standardTimeSeconds`, nazwy operacji, bilansu ani geometrii. Niezdefiniowane w schematach 4/5 pole o tej samej nazwie nie jest przenoszone do profilu; dokładny tekst źródła pozostaje w kopercie szkicu.

Profil zawiera `durationSeconds` i `durationBasis` oraz trzy osobne listy przedziałów: `manualWork`, `machineRun`, `operatorPresence`. Wszystkie liczby są sekundami względem początku danej operacji. Każdy przedział ma `startSeconds`, `endSeconds` i `basis`: `measured` (pomierzony) albo `assumed` (założony). Puste listy są jawnym stwierdzeniem, że w tym profilu nie wpisano czasu danej kategorii; odróżnia je brak całego profilu.

Przedziały w jednej kategorii muszą być uporządkowane, rozłączne, mieć dodatnią długość i mieścić się w `durationSeconds`. Każdy przedział pracy ręcznej musi w całości leżeć w jednym z przedziałów wymaganej obecności operatora. Przedziały różnych kategorii mogą się pokrywać, lecz takie nakładanie wynika wyłącznie z jawnych wartości. Nie dodaje się czasów kategorii ani nie oblicza `durationSeconds` z ich sumy. Czas standardowy starej operacji pozostaje osobnym polem i nie jest automatycznie zastępowany czasem profilu.

Profil jest nadal danymi szkicu, nie wejściem aktywnego bilansu ani symulacji. `operatorPresence` nie rezerwuje jeszcze konkretnego człowieka; to zakres późniejszego punktu 2.4. Kalendarz i przerwy należą do 2.5. Szczegółowa obsada operacji i warianty czasu należą do 2.3.

## Zgodność

Nie zmieniono numeru schematu szkicu, koperty zapisu ani aktywnych schematów 4/5. Wcześniejsze szkice 6 bez `timeProfile` przechodzą ten sam parser. Zapis nowego profilu używa dotychczasowej walidacji całego szkicu i ochrony poprzedniej wartości przy błędzie. Odtworzenie kodu z kopii `backup/v0.4.0_przed_2_2a_20261004_214349` wymaga instalacji zależności z lockfile, testów i buildu; localStorage nie jest częścią kopii.

## Pakiet 2.2b — edycja w UI

Panel szkicu 6 pozwala wskazać operację, ręcznie dodać lub usunąć przedziały każdej kategorii, podać czas całkowity i osobno oznaczyć pochodzenie każdej wartości. Lokalny przełącznik s/min/h zmienia tylko prezentację; zapis nadal używa sekund. Puste pola nie są zamieniane w zero. Zapis przechodzi parser szkicu i istniejącą kontrolę poprzedniej wartości localStorage; błędny profil pozostawia poprzedni zapis. Usunięcie profilu przywraca stan „brak danych”. Edycja korzysta z tej samej historii Cofnij/Ponów co osoby, wyrób i wyposażenie. Stary czas standardowy jest widoczny do porównania, lecz nie jest aktualizowany przez edytor.

## Odbiór punktu 2.2 — pakiet 2.2c

Na Eko v4/v5 i przykładzie silników v4 sprawdzono brak profilu po migracji, jawny profil po edycji i ponownym odczycie, niezmienność dawnego czasu standardowego, dokładnego aktywnego źródła oraz całego wyniku obecnej symulacji. Scenariusz UI potwierdził jednostki s/min/h, pochodzenie, ochronę zapisu przy błędzie, Cofnij/Ponów, usunięcie i odczyt po przeładowaniu. Te dowody zamykają rozdzielenie danych czasu w szkicu; nie oznaczają obsługi obsady, kalendarza lub fizycznej pracy maszyny w harmonogramie.
