# Weryfikacja modelu czasu — punkt 2.2

## Pakiet 2.2a / 2.2.1 — 2026-10-04

Przed zmianą schematu wykonano kopię `backup/v0.4.0_przed_2_2a_20261004_214349`: 146 plików, wszystkie skopiowane pliki zgodne z manifestem SHA256. Kopia pomija zależności, build, wcześniejsze kopie, `outputs` i metadane Git. Nie obejmuje localStorage przeglądarki.

Test na eksporcie Eko v5 potwierdził odczyt wcześniejszego szkicu 6 bez profilu, brak profilu po migracji z v5, jawny profil z nakładającymi się pracą ręczną i automatem, niezależne pochodzenie czasu całkowitego i przedziałów, zapis i ponowny odczyt, niezmieniony stary czas standardowy, identyczny aktywny JSON i identyczny wynik dotychczasowej symulacji. Dodatkowy test potwierdził, że nawet obce pole `timeProfile` w źródle schematu 5 nie zostaje uznane za zweryfikowany profil schematu 6.

Odmowy objęły niepoprawny czas całkowity, przedział poza jego granicą, nakładające się przedziały w jednej kategorii, brak obecności przy pracy ręcznej, nieznane pochodzenie i obce pole profilu. W każdym przypadku zapis poprzedniego szkicu pozostał bez zmian. `npm.cmd run test -- --run`: 91/91; `npm.cmd run build`: poprawny.

Punkt 2.2 pozostaje **w trakcie**: profil nie ma jeszcze edytora UI, odbioru Cofnij/Ponów i odczytu po przeładowaniu w przeglądarce. Nie jest wejściem bilansu ani symulacji; test nie potwierdza rezerwacji operatora ani działania maszyny w harmonogramie.

## Pakiet 2.2b / 2.2.2 — 2026-10-04

Przed zmianą ścieżki edycji wykonano kopię `backup/v0.4.0_przed_2_2b_20261004_215035`: 148 plików zgodnych z manifestem SHA256. Pominięto zależności, build, starsze kopie, `outputs` i metadane Git. Dane localStorage nie należą do kopii.

`domainTimeEditing.ts` zmienia profil tylko wskazanej operacji i ponownie waliduje cały szkic. Test jednostkowy potwierdził niezmienność wejścia, brak zmiany innych operacji, odmowę obcego ID i błędnej obecności, zapis i ponowny odczyt, usunięcie oraz przywrócenie profilu. `DomainTimeEditor.tsx` dodaje ręczne pola dla przedziałów i pochodzenia, wybór s/min/h, zapis oraz usunięcie profilu. `DomainDraftPanel` podłącza je do dotychczasowej kontroli zapisu i wspólnej historii.

`npm.cmd run test -- --run`: 92/92; `npm.cmd run build`: poprawny. Rozszerzony `node tests/qa/verify_2_1e.mjs` w Edge CDP na eksporcie Eko v5 potwierdził wpis czasu 2,5 min jako dokładnych 150 s, pomierzony czas ręczny i założony czas maszyny, zmianę jednostki na godziny bez mutacji sekund, odmowę przedziału poza czasem całkowitym bez nadpisania szkicu, Cofnij/Ponów, odczyt po przeładowaniu, usunięcie profilu i przywrócenie przez Cofnij. Profil OP11 oraz aktywne projekty v4/v5 pozostały nienaruszone. Zrzut UI: `outputs/qa/verify_2_2b_time_profile.png`.

Punkt 2.2 pozostaje **w trakcie** do zbiorczego odbioru 2.2.3 na Eko i silnikach. Profil nadal nie jest wejściem bilansu ani symulacji.
