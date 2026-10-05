# Weryfikacja współdzielonych operatorów — punkt 2.4

## Pakiet 2.4a / 2.4.1 — 2026-10-05

Przed dodaniem modułu wykonano kopię `backup/v0.4.0_przed_2_4a_20261005`: 153 pliki. Niezależne sprawdzenie SHA256 wszystkich skopiowanych plików względem manifestu: 153 zgodne, 0 rozbieżności. Kopia pomija zależności, build, wcześniejsze kopie, `outputs`, Git i localStorage przeglądarki.

Testy rejestru objęły równoczesną rezerwację różnych osób przez dwa stanowiska, odmowę nakładających się rezerwacji tej samej osoby, dozwolone stykanie się przedziałów, wcześniejsze zwolnienie i ponowne użycie. Sprawdzono odmowę nieznanej i powtórzonej osoby, pustego zespołu, błędnego czasu, powtórzonego ID rezerwacji, zwolnienia poza okresem i ponownego zwolnienia. Pierwotny rejestr pozostawał niezmieniony po odmowach oraz po utworzeniu nowej wersji. `npm.cmd run test -- --run`: **99/99**; `npm.cmd run build`: poprawny.

Pakiet **2.4.1 wdrożony** jako izolowany rejestr. Punkt **2.4 w trakcie**. Moduł nie zmienia schematu ani aktywnych wyników 4/5 i nie ma jeszcze ścieżki UI; odbiór UI oraz harmonogramowania należą do dalszych pakietów. Użytkownik potwierdził regułę utrzymywania tego samego zespołu od pierwszego do ostatniego przedziału obecności operatora, także między przedziałami. Jej zastosowanie do operacji nie jest częścią tego pakietu.
