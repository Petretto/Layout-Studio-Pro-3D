# Model czasu operacji — punkt 2.2

Status 2026-10-04: pakiet 2.2a / 2.2.1 wdrożony w niekompletnym szkicu 6; cały punkt 2.2 pozostaje w trakcie.

## Kontrakt danych

Operacja szkicu 6 może mieć opcjonalne `timeProfile`. Brak pola oznacza, że podział czasu nie został określony. Migracja z projektów 4/5 nie wyprowadza profilu z `standardTimeSeconds`, nazwy operacji, bilansu ani geometrii. Niezdefiniowane w schematach 4/5 pole o tej samej nazwie nie jest przenoszone do profilu; dokładny tekst źródła pozostaje w kopercie szkicu.

Profil zawiera `durationSeconds` i `durationBasis` oraz trzy osobne listy przedziałów: `manualWork`, `machineRun`, `operatorPresence`. Wszystkie liczby są sekundami względem początku danej operacji. Każdy przedział ma `startSeconds`, `endSeconds` i `basis`: `measured` (pomierzony) albo `assumed` (założony). Puste listy są jawnym stwierdzeniem, że w tym profilu nie wpisano czasu danej kategorii; odróżnia je brak całego profilu.

Przedziały w jednej kategorii muszą być uporządkowane, rozłączne, mieć dodatnią długość i mieścić się w `durationSeconds`. Każdy przedział pracy ręcznej musi w całości leżeć w jednym z przedziałów wymaganej obecności operatora. Przedziały różnych kategorii mogą się pokrywać, lecz takie nakładanie wynika wyłącznie z jawnych wartości. Nie dodaje się czasów kategorii ani nie oblicza `durationSeconds` z ich sumy. Czas standardowy starej operacji pozostaje osobnym polem i nie jest automatycznie zastępowany czasem profilu.

Profil jest nadal danymi szkicu, nie wejściem aktywnego bilansu ani symulacji. `operatorPresence` nie rezerwuje jeszcze konkretnego człowieka; to zakres późniejszego punktu 2.4. Kalendarz i przerwy należą do 2.5. Szczegółowa obsada operacji i warianty czasu należą do 2.3. Pakiet 2.2b doda ręczne wprowadzanie w UI, a 2.2c odbiór całego punktu.

## Zgodność

Nie zmieniono numeru schematu szkicu, koperty zapisu ani aktywnych schematów 4/5. Wcześniejsze szkice 6 bez `timeProfile` przechodzą ten sam parser. Zapis nowego profilu używa dotychczasowej walidacji całego szkicu i ochrony poprzedniej wartości przy błędzie. Odtworzenie kodu z kopii `backup/v0.4.0_przed_2_2a_20261004_214349` wymaga instalacji zależności z lockfile, testów i buildu; localStorage nie jest częścią kopii.
