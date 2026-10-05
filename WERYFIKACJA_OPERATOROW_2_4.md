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

## Pakiet 2.4c / 2.4.2.2 — 2026-10-05

Przed zmianą parsera i zapisu wykonano kopię `backup/v0.4.0_przed_2_4c_20261005`: 157 plików, 157 zgodnych SHA256 z manifestem i 0 rozbieżności. Pominięto zależności, build, wcześniejsze kopie, `outputs` i Git; localStorage przeglądarki nie należy do kopii.

Test kodu potwierdził odczyt starszego szkicu bez `workerRunSelection`, zapis i odczyt kompletnych wyborów, odrzucenie obcego ID bez nadpisania, blokadę usunięcia używanej osoby lub wariantu, kontrolę konfliktu oraz przywrócenie wyboru przez ponowny zapis migawki. Źródłowy JSON pozostał identyczny. `npm.cmd run test -- --run`: **101/101**; `npm.cmd run build`: poprawny.

Edge CDP na izolowanym porcie 5200 i osobnym profilu sprawdził formularz dla 16 operacji przykładu Eko v5 z syntetycznymi osobami i założonym profilem czasu. Jawny skład, wariant i osoby dopuszczone zostały zapisane. Cofnij/Ponów, usunięcie i przywrócenie, odrzucenie niepełnego wyboru, przeładowanie i odczyt formularza przeszły. Oryginalny JSON szkicu i aktywne projekty 4/5 pozostały bez zmian. Test: `tests/qa/verify_2_4c.mjs`; zrzut: `outputs/qa/verify_2_4c_run_selection.png`.

Pakiet **2.4.2.2 wdrożony**. Punkt **2.4.2 w trakcie** do potwierdzenia faktycznego przydziału z tej listy w 2.4.3; cały **2.4 w trakcie**. Zapisany wybór nadal nie planuje czasów startu, nie czeka na wolne osoby i nie steruje aktywną symulacją. Przykładowe osoby i profile użyte w teście nie są pomiarami procesu Eko.

## Pakiet 2.4d / 2.4.3.1 — 2026-10-05

Przed nowym algorytmem wykonano kopię `backup/v0.4.0_przed_2_4d_20261005`: 161 plików, 161 zgodnych SHA256 z manifestem, 0 rozbieżności. Pominięto zależności, build, wcześniejsze kopie, `outputs` i Git; localStorage nie należy do kopii.

Ręcznie sprawdzalny scenariusz dwóch sztuk, dwóch jawnych kopii stanowiska i jednej osoby: pierwsza operacja trwa 120 s, a ta sama osoba jest potrzebna w 10–20 s oraz 70–80 s. Przy odstępie przybycia 1 s drugi start nastąpił w 70 s, z oczekiwaniem 69 s; rezerwacje 10–80 s oraz 80–150 s się stykają, ale nie nakładają. Wynik oznacza `workers` jako przyczynę oczekiwania. Wariant dwuosobowy zarezerwował obie osoby przez całe okno. Drugi scenariusz potwierdził poprzedników, jedno zajęcie kopii, brak podwójnej rezerwacji oraz ostrożną pojedynczą operację na sztukę. Brak jawnej liczby kopii, przypisania stanowiska i składu odrzucono. Dane testowe są założone, nie pochodzą z pomiarów produkcyjnych.

`npm.cmd run test -- --run`: **103/103**; `npm.cmd run build`: poprawny. Kod aktywnej symulacji 4/5, schemat zapisu i UI nie były zmieniane. Pakiety **2.4.2 oraz 2.4.3.1 wdrożone**; **2.4.3 i 2.4 w trakcie**. Integracja UI i próba Eko wymagają jawnych kopii stanowisk oraz określenia granicy równoległości podzespołów. Wyniku nie wolno traktować jako fizycznej symulacji wyrobu, transportu, kalendarza, buforów lub wyposażenia.

## Pakiet 2.4e / 2.4.3.2 — 2026-10-05

Do zapisanego szkicu 6 dodano odrębny, tylko odczytowy podgląd harmonogramu. Wymaga jawnej wielkości partii i dodatniego odstępu przybycia, pokazuje konkretne ID przydzielonych osób, kopię stanowiska, gotowość, start, koniec, czas i przyczyny oczekiwania. Wynik nie trafia do trwałego zapisu; zmiana pól albo szkicu usuwa poprzedni widok wyniku. Brak składu, kopii stanowisk lub innych wymaganych danych powoduje jawną odmowę. UI ogranicza podgląd do 100 sztuk i pokazuje pierwsze 100 wykonań, z podsumowaniem całej partii.

Edge CDP na odizolowanym porcie 5201, z osobnym profilem, sprawdził szkic oparty na przykładzie Eko ze **sztucznymi** profilami i jedną osobą: 2 sztuki, 32 wykonania, przydział tej samej osoby z zapisanego składu oraz widoczne oczekiwanie na nią. Usunięcie odstępu wejścia ukryło poprzedni wynik i pokazało odmowę. Dokładne wartości localStorage projektu 4, warsztatu 5 i szkicu 6 pozostały bez zmian. Test: `tests/qa/verify_2_4e.mjs`. Wcześniejsze testy rdzenia potwierdzają brak podwójnej rezerwacji i zwolnienie po ostatnim przedziale obecności. `npm.cmd run test -- --run`: **103/103**; `npm.cmd run build`: poprawny.

Nie zmieniano schematu, tożsamości, parsera, modułu zapisu ani aktywnej symulacji 4/5; nowa kopia strukturalna nie była wymagana. Punkty **2.4.3.2 i 2.4.3 wdrożone**; **2.4 pozostaje w trakcie** do zbiorczego odbioru 2.4.4. Podgląd nadal nie modeluje kalendarza, transportu, wyposażenia, buforów ani równoległych operacji na jednej sztuce bez jawnych reguł fizycznych.

## Pakiet 2.4f / 2.4.4 — częściowy odbiór, 2026-10-05

Rozszerzono próbę Edge CDP o kontrolę 32 widocznych wykonań: przy jednej osobie i testowym profilu 10–20 s oraz 70–80 s żadne okresy rezerwacji od startu +10 do startu +80 s nie nakładają się. Po przeładowaniu wynik nie był zapisany; ponowne obliczenie z tego samego szkicu dało identyczne wiersze. Dokładny zapis szkicu 6 i warsztatu 5 pozostał taki sam. W projekcie 4 nie zmieniły się dane projektu; zwykły automatyczny zapis przy ponownym otwarciu odświeżył tylko znacznik czasu zewnętrznego opakowania localStorage. Brak jawnego odstępu wejścia nadal pokazuje odmowę. `node tests/qa/verify_2_4e.mjs`: PASS. Testy rdzenia 103/103 i build z pakietu 2.4e pozostają aktualne, bo zmieniono tylko skrypt odbiorowy i dokumentację.

Testy rdzenia z pakietów 2.4b–2.4d objęły niezależny przykład silników, dwa warianty liczebności zespołu, graf poprzedników, odmowy brakujących danych, trwałość wyborów i brak podwójnej rezerwacji. Po uwzględnieniu korekty celu produktu przez użytkownika produkcyjna walidacja Eko nie jest bramką dla ogólnego mechanizmu 2.4; należy do 7.1/7.2. Kryterium 2.4.4 doprecyzowano dla jawnych scenariuszy testowych różnych procesów. Punkty **2.4.4 i 2.4 wdrożone w zakresie logicznego harmonogramu niekompletnego szkicu 6**. Przykład Eko nadal używa syntetycznych osób, kopii i czasów; nie potwierdza dokładności odwzorowania produkcji. Reguły równoległości wyrobu pozostają w 2.8.
