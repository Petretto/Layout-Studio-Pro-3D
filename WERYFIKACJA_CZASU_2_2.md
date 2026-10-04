# Weryfikacja modelu czasu — punkt 2.2

## Pakiet 2.2a / 2.2.1 — 2026-10-04

Przed zmianą schematu wykonano kopię `backup/v0.4.0_przed_2_2a_20261004_214349`: 146 plików, wszystkie skopiowane pliki zgodne z manifestem SHA256. Kopia pomija zależności, build, wcześniejsze kopie, `outputs` i metadane Git. Nie obejmuje localStorage przeglądarki.

Test na eksporcie Eko v5 potwierdził odczyt wcześniejszego szkicu 6 bez profilu, brak profilu po migracji z v5, jawny profil z nakładającymi się pracą ręczną i automatem, niezależne pochodzenie czasu całkowitego i przedziałów, zapis i ponowny odczyt, niezmieniony stary czas standardowy, identyczny aktywny JSON i identyczny wynik dotychczasowej symulacji. Dodatkowy test potwierdził, że nawet obce pole `timeProfile` w źródle schematu 5 nie zostaje uznane za zweryfikowany profil schematu 6.

Odmowy objęły niepoprawny czas całkowity, przedział poza jego granicą, nakładające się przedziały w jednej kategorii, brak obecności przy pracy ręcznej, nieznane pochodzenie i obce pole profilu. W każdym przypadku zapis poprzedniego szkicu pozostał bez zmian. `npm.cmd run test -- --run`: 91/91; `npm.cmd run build`: poprawny.

Punkt 2.2 pozostaje **w trakcie**: profil nie ma jeszcze edytora UI, odbioru Cofnij/Ponów i odczytu po przeładowaniu w przeglądarce. Nie jest wejściem bilansu ani symulacji; test nie potwierdza rezerwacji operatora ani działania maszyny w harmonogramie.
