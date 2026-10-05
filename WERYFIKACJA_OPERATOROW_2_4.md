# Weryfikacja współdzielonych operatorów — punkt 2.4

## Pakiet 2.4a / 2.4.1 — 2026-10-05

Przed dodaniem modułu wykonano kopię `backup/v0.4.0_przed_2_4a_20261005`: 153 pliki. Niezależne sprawdzenie SHA256 wszystkich skopiowanych plików względem manifestu: 153 zgodne, 0 rozbieżności. Kopia pomija zależności, build, wcześniejsze kopie, `outputs`, Git i localStorage przeglądarki.

Testy rejestru objęły równoczesną rezerwację różnych osób przez dwa stanowiska, odmowę nakładających się rezerwacji tej samej osoby, dozwolone stykanie się przedziałów, wcześniejsze zwolnienie i ponowne użycie. Sprawdzono odmowę nieznanej i powtórzonej osoby, pustego zespołu, błędnego czasu, powtórzonego ID rezerwacji, zwolnienia poza okresem i ponownego zwolnienia. Pierwotny rejestr pozostawał niezmieniony po odmowach oraz po utworzeniu nowej wersji. `npm.cmd run test -- --run`: **99/99**; `npm.cmd run build`: poprawny.

Pakiet **2.4.1 wdrożony** jako izolowany rejestr. Punkt **2.4 w trakcie**. Moduł nie zmienia schematu ani aktywnych wyników 4/5 i nie ma jeszcze ścieżki UI; odbiór UI oraz harmonogramowania należą do dalszych pakietów. Użytkownik potwierdził regułę utrzymywania tego samego zespołu od pierwszego do ostatniego przedziału obecności operatora, także między przedziałami. Jej zastosowanie do operacji nie jest częścią tego pakietu.

## Doprecyzowanie kontraktu — 2026-10-05

Użytkownik określił stały skład zespołu dla całego przebiegu produkcyjnego, bez dobierania dodatkowych osób w trakcie. Zapisano w `MODEL_OPERATOROW_2_4.md` rozróżnienie między składem przebiegu a chwilową rezerwacją osób do operacji oraz uściślono kroki 2.4.2–2.4.3. Izolowany rejestr 2.4.1 już przyjmuje zamkniętą listę ID i odrzuca osoby spoza niej; nie zmieniano kodu ani statusu punktu 2.4. Nowy odbiór harmonogramu będzie potrzebny po implementacji tych kroków.

## Pakiet 2.4b / 2.4.2.1 — 2026-10-05

Przed dodaniem modułu planu wykonano kopię `backup/v0.4.0_przed_2_4b_20261005`: 156 plików. Niezależne sprawdzenie SHA256 względem manifestu: 156 zgodnych, 0 rozbieżności. Kopia nie obejmuje localStorage.

Test na szkicu migracji przykładu silników ze wskazanymi, syntetycznymi osobami i założonymi profilami potwierdził stałą listę ID, jawny wybór wariantu dla każdej operacji i okres rezerwacji 10–80 s obejmujący przerwę między przedziałami obecności 10–20 s i 70–80 s. Plan zachował odrębny czas wariantu i nie zmienił szkicu. Odrzucono osobę spoza składu, powtórzenie osoby, brak wyboru operacji, obcą operację, nieistniejący wariant, zbyt małą listę dopuszczonych osób oraz brak okresu obecności. Rejestr rezerwacji utworzony ze składu planu odmówił osoby z zewnątrz. `npm.cmd run test -- --run`: **100/100**; `npm.cmd run build`: poprawny.

Pakiet **2.4.2.1 wdrożony**. Punkt **2.4.2 w trakcie** do UI i zapisu wyborów w 2.4.2.2; punkt **2.4 w trakcie** do harmonogramu i odbioru końcowego. Moduł nie zmienia schematu projektu ani dotychczasowej symulacji 4/5. Nie potwierdza jeszcze czasu oczekiwania na pracownika, przydziału konkretnej podgrupy do zadania lub trwałości wyborów.
