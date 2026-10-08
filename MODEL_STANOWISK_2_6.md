# Dopuszczalne stanowiska i wyposażenie — punkt 2.6

## Pakiet 2.6a / 2.6.1 — projekt kontraktu, 2026-10-06

Status kontraktu 2.6.1: wdrożony dla jednego ciągu operacji z wieloma dopuszczonymi kopiami. Użytkownik wybrał najwcześniejszy możliwy start z dodatkowym wymaganiem najkrótszej drogi do następnej operacji oraz stałe wyposażenie stanowiska/kopii. Uzgodniono pierwszeństwo najwcześniejszego startu, następnie rzeczywistą trasę transportową.

## Ustalenia użytkownika — 2026-10-06

Wybór 1A: najwcześniejszy możliwy start; dodatkowo wybrane stanowisko ma mieć najkrótszą drogę do następnej operacji. Odległość jest kryterium wyboru. Użytkownik doprecyzował: wcześniejszy start ma pierwszeństwo, a rzeczywista długość drogi rozstrzyga remis czasu startu. Użytkownik wybrał automatyczny wybór dalszej trasy przy kilku dopuszczalnych stanowiskach następnej operacji. Nie utożsamiać automatycznie kilku następców grafu z fizycznymi trasami jednego wyrobu; te reguły należą do 2.7/2.8. Nie wolno automatycznie utożsamiać drogi z odległością w linii prostej między środkami obiektów wizualnych. Kryterium odległości nie wprowadza domyślnej prędkości ani czasu transportu.

Wybór 2A: stałe wyposażenie przypisane do konkretnego stanowiska i jego kopii. W pierwszej implementacji nie przenosimy egzemplarzy między stanowiskami ani nie modelujemy zamienników. Każdy fizyczny egzemplarz ma jedno przypisanie; liczba kopii nie powiela wyposażenia. Dopuszczenie operacji wskazuje jawnie wymagane egzemplarze, a brak wyposażenia danej kopii uniemożliwia wybór tej kopii.

Obecny rejestr `stations[].operationIds` przypisuje operację najwyżej do jednego stanowiska. Walidacja tego przypisania pochodzi ze wspólnego kontraktu v5. `scheduleWorkerRun` wybiera kopię tego stanowiska. Wyposażenie ma trwałe ID, opcjonalne `stationId` i jawną listę `capableOperationIds`; możliwość wykonania operacji nie oznacza wymagania tego wyposażenia. Liczba kopii stanowiska nie tworzy egzemplarzy wyposażenia. Geometria i nazwy nie dowodzą możliwości technologicznych.

## Proponowany kierunek do oceny

Pozostawić dotychczasowe pojedyncze przypisanie jako przypisanie bazowe dla zgodności zapisu i widoków. Dla szkicu 6 dodać opcjonalny, jawny kontrakt dopuszczeń operacji. Gdy kontrakt dla operacji jest obecny, stanowi kompletną listę dopuszczonych stanowisk dla nowego harmonogramu; nie łączyć go automatycznie z przypisaniem bazowym. Przy braku kontraktu zachować dotychczasowy harmonogram i wyraźnie wskazać brak określonych wymagań wyposażenia. Nie przenosić tej zmiany do v4/v5.

Każde dopuszczenie wskazuje ID stanowiska i jawne wymagania wyposażenia. Brak wymagań oznacza „nie określono”; pusta lista ma oznaczać jawne „nie wymaga wyposażenia”. Nie wyprowadzać wymagań z możliwości urządzeń. Obce i powtórzone ID są błędem. Gdy wskazany egzemplarz ma obsługiwać operację, musi mieć jawnie potwierdzoną możliwość jej wykonania. Ostateczna struktura wymagań zależy od decyzji o egzemplarzach, współdzieleniu lub zamiennikach.

Wynik musi pokazywać faktycznie wybrane stanowisko, kopię oraz użyte wyposażenie. Stały skład zespołu, jawne warianty czasu, pauza/wznowienie, kalendarze i ochrona przed podwójnymi rezerwacjami pozostają obowiązujące. Różne czasy operacji na różnych stanowiskach nie są obecnie określone: nie tworzyć mnożników ani korekt. Transport pozostaje zakresem etapu 3.

## Decyzje wymagane przed implementacją

1. Potwierdzony wybór: najwcześniejszy start, następnie najkrótsza rzeczywista trasa transportowa. Kolejność zadeklarowanych dopuszczeń służy wyłącznie deterministycznemu rozstrzygnięciu równych czasów i odległości.
2. Potwierdzone wyposażenie: stałe egzemplarze przypisane do jawnej kopii stanowiska. Nigdy nie mnożyć fizycznego egzemplarza przez liczbę kopii.

## Kolejne pakiety i odbiór

- 2.6.1: uzgodniony kontrakt i granice kompatybilności; niniejszy projekt nie stanowi jeszcze akceptacji reguł.
- 2.6.2: backup, opcjonalne dane, walidacja i odczyt starszych szkiców; bez utraty oryginałów przy odmowie.
- 2.6.3: zastosowanie dopuszczeń w harmonogramie, ręcznie sprawdzalne testy wyboru, zajęcia zasobów, kalendarzy i odmów.
- 2.6.4: edytor, historia, zapis/ponowny odczyt, wynik z wybranym stanowiskiem i wyposażeniem; odbiór na niezależnych procesach i regresja 2.4/2.5.

Przed strukturalną zmianą parsera lub modelu wykonać nową kopię zgodnie z planem. Ten pakiet dokumentacyjny nie zmienia schematu, zapisu ani wyników obliczeń; nie wymaga ponowienia testów produkcyjnych. Punkt 2.6 pozostaje w trakcie do rozstrzygnięcia reguł i całego odbioru.

## Pakiet 2.6b / 2.6.2 — dane

Opcjonalne `stationRouting` w szkicu 6 zawiera `selectionRule: earliest-start-then-shortest-route`, listę `equipmentPlacements`, częściową listę dopuszczeń `operations` i skierowane `routes`. Każde dopuszczenie operacji ma niepustą listę kandydatów po ID stanowiska i numerze kopii (od 1). `requiredEquipmentIds` jest obowiązkową listą; pusta oznacza jawny brak wymagań. Każdy wymagany egzemplarz musi mieć zgodne stanowisko, jedno przypisanie do kopii i jawną możliwość wykonania operacji. Listy dopuszczeń mogą być uzupełniane stopniowo.

Trasa ma trwałe ID, początek/koniec po stanowisku i kopii, długość `distanceMm`, `basis: confirmed` oraz niepuste `source`. To jawnie deklarowana długość rzeczywistej drogi, a nie wyliczenie z geometrii. Nie ma automatycznej trasy zwrotnej ani bezpośredniej linii zastępczej. Trasy między różnymi kopiami wymagają dodatniej długości. Ten pakiet nie projektuje przejść, nie weryfikuje przeszkód ani nie wyznacza długości ścieżek; edycja geometrii tras należy do 3.2. Deklaracja użytkownika wymaga źródła; nie stanowi automatycznego pomiaru.

Starszy szkic bez pola zachowuje dotychczasowe działanie. Migracja v4/v5 nie tworzy dopuszczeń, tras ani wyposażenia i nie przenosi przypadkowego pola o tej nazwie ze źródła. Wersja szkicu i koperty pozostają bez zmian, a zapis podlega dotychczasowej walidacji i kontroli konfliktu. Gdy pole istnieje, obecny harmonogram odmawia obliczenia z informacją o wymaganej integracji 2.6.3; nie ignoruje nowych ograniczeń.

Backup: `backup/v0.4.0_przed_2_6b_20261006` — 170 plików, 0 rozbieżności SHA256. Dowody w `WERYFIKACJA_STANOWISK_2_6.md`. 2.6.2 wdrożone jako kontrakt danych; punkt 2.6 pozostaje w trakcie do harmonogramu, UI i pełnego odbioru.

## Pakiet 2.6c / 2.6.3 — harmonogram

Odrębny harmonogram wykorzystuje kompletne jawne dopuszczenia wszystkich operacji, zamiast przypisania bazowego. Rozpatruje wszystkie dopuszczone kopie i ich kalendarze; startuje przy najwcześniejszym zdarzeniu, dla którego da się przydzielić kopię i ten sam zespół na cały wymagany okres obecności. Nie odkłada możliwego startu tylko po to, aby uzyskać krótszą trasę. Spośród kopii mogących wystartować w tej samej chwili wybiera najkrótszą deklarowaną rzeczywistą trasę; przy równej długości zachowuje kolejność dopuszczeń. Czas końca nie zastępuje kryterium czasu startu.

Porównanie odległości obsługuje jednoznaczny przypadek: jedna następna operacja, z jedną dopuszczoną kopią. Jeśli jest kilku kandydatów do startu i kilku następców lub kilka przyszłych kopii, obliczenie odmawia porównania zamiast przyjmować minimum, średnią, sumę lub fikcyjny cel. Brak skierowanej trasy wymaganej do porównania także odmawia wyniku; nie wyprowadza trasy zwrotnej. Przy jednej możliwej kopii nie ma remisu do rozstrzygnięcia, a operacja końcowa nie ma kryterium drogi do następcy. To ograniczenie obowiązuje do uzgodnienia fizycznego przepływu i reguł rozgałęzień.

Stałe wyposażenie jest przypisane do dokładnie jednej kopii, a ta pozostaje zajęta od startu do końca operacji, również przez pauzy i po zwolnieniu osób. Nie jest potrzebny odrębny mechanizm rezerwacji wyposażenia współdzielonego: takie współdzielenie jest zabronione kontraktem danych. Wynik zawiera listę wymaganych egzemplarzy oraz ID i długość trasy, która rozstrzygnęła remis. Nie nalicza czasu transportu. Panel harmonogramu wyświetla te dane; edytor dopuszczeń i pełny odbiór UI pozostają w 2.6.4.

Starsze szkice bez `stationRouting` zachowują poprzedni wynik, kolejność kopii/osób i przyczyny oczekiwania. Szkic z częściową listą dopuszczeń odmawia przebiegu. Samo obliczenie nie zmienia szkicu ani aktywnych zapisów 4/5. Dowody: `WERYFIKACJA_STANOWISK_2_6.md`.

## Pakiet 2.6d / 2.6.4 — edytor i odbiór

Edytor szkicu udostępnia wybór operacji, dodawanie/usuwanie dopuszczonych kopii i zmianę ich kolejności. Wymagane egzemplarze są wskazywane jawnie, a pusta lista jest opisana jako brak wymagań. Osobny formularz przypisuje stałe wyposażenie do konkretnej kopii. Lista tras zawiera ID, skierowane końce, długość w mm, źródło i potwierdzenie. Zmiana dowolnych danych trasy kasuje lokalne potwierdzenie; wymagane jest ponowne potwierdzenie przed zapisem. Nowe wiersze mają puste ID, końce i długości, bez fikcyjnych wartości.

Zapis całego formularza korzysta z dotychczasowej walidacji, kontroli konfliktu i wspólnej historii szkicu. Dane można uzupełniać częściowo, ale harmonogram odmawia niekompletnej konfiguracji. Usunięcie całego pola jawnie przywraca przypisanie bazowe; również podlega historii. Zmiana szkicu usuwa poprzedni wynik harmonogramu. Nie powstaje drugi model geometrii ani czasu transportu.

Odbiór UI objął syntetyczne pakowanie PREP → PACK i obróbkę/montaż CUT → ASSEMBLE → PACK. Punkt 2.6.4 wdrożono w zakresie edytora i odbioru aktualnego kontraktu. 2.6 oraz 2.6.1 pozostają w trakcie: przy remisie kilku możliwych startów nadal trzeba uzgodnić cel porównania drogi, gdy następny proces ma kilka możliwych kopii lub kilka fizycznych gałęzi. Możliwe kierunki do oceny: jawny cel przed przebiegiem albo automatyczny wybór dalszej trasy; drugi wymaga określenia, jak wiąże przyszłe przydziały i respektuje priorytet najwcześniejszego startu. Żadnego z tych rozszerzeń nie włączono automatycznie.

## Pakiet 2.6e — automatyczny wybór dalszej trasy, 2026-10-06

Użytkownik wybrał wariant B: automatyczny wybór dalszej trasy zamiast ręcznego zamrożenia przyszłego celu. Poniższy kontrakt zastępuje wcześniejsze ograniczenie do jednej dopuszczonej kopii następnej operacji i wcześniejszą odmowę porównania przy kilku takich kopiach.

`stationRoutePlan.ts` buduje od końca ciągu preferencje dróg między dopuszczonymi kopiami. Porównuje długość najbliższego przejścia, a przy równych długościach kolejne przejścia; nie minimalizuje sumy odległości kosztem dłuższej najbliższej drogi. Przy całkowicie równych drogach zachowuje kolejność dopuszczeń. Wymagane są jawne skierowane trasy dla wszystkich par dopuszczonych kopii kolejnych operacji, także przy tej samej kopii (jawna długość, bez domyślnego zera). Brak trasy jest brakiem danych, nie dowodem nieosiągalności. Nie tworzymy trasy zwrotnej ani długości zastępczej.

Preferencje nie rezerwują przyszłych zasobów i nie obiecują przyszłego czasu startu. Harmonogram najpierw sprawdza kopie, zespół, rezerwacje i kalendarze w bieżącym zdarzeniu. Pierwsza operacja porównuje dalsze preferencje spośród możliwych startów teraz. W następnych operacjach przy remisie startu najpierw porównuje drogę z rzeczywiście wybranej poprzedniej kopii, następnie dalsze przejścia. Gdy preferowany cel nie może rozpocząć pracy równie wcześnie, wybierana jest inna dostępna kopia. Nie odkładamy startu dla krótszej drogi i nie rezerwujemy kopii lub osób z wyprzedzeniem.

Wynik osobno pokazuje planowaną następną trasę i wybraną trasę z poprzedniej operacji. Różnica tych pól może wynikać ze zmienionej dostępności. Nie deklarujemy globalnego optimum czasu zakończenia ani łącznej drogi. Nie naliczamy czasu transportu, nie symulujemy fizycznego przemieszczenia i nie tworzymy niezależnego stanu 3D.

Automatyczny wybór obsługuje jeden ciąg operacji, z dowolną liczbą dopuszczonych kopii w kolejnych krokach. Kilka niezależnych korzeni, rozgałęzienie lub złączenie fizycznych podzespołów są odrzucane w tej ścieżce do reguł 2.7/2.8. Starszy szkic bez dopuszczeń nadal korzysta ze starego harmonogramu. Format zapisu nie zmienia się; starszy szkic z niepełnymi trasami pozostaje czytelny, ale obliczenie wymaga uzupełnienia danych i nie nadpisuje szkicu.

Kontrakt 2.6.1 dla powyższego zakresu wdrożono. Punkt 2.6 pozostaje w trakcie w zakresie fizycznych gałęzi — dalszy model korpusu i podzespołów należy przygotować w 2.7/2.8. Dowody: `WERYFIKACJA_STANOWISK_2_6.md`.

Aktualizacja odbioru 2026-10-08: zakres fizycznych gałęzi został wykonany w 2.7/2.8 i sprawdzony na testowym Eko 2.9. Pierwszeństwo technologiczne gałęzi 1A oraz rzeczywista droga z jednej lokalizacji korpusu opisane są w `MODEL_ROWNOLEGLOSCI_2_8.md`. W tym fizycznym kontrakcie pozostanie na tej samej kopii nie jest przewozem i ma zerową drogę; dawna ścieżka liniowa bez fizycznego kontraktu zachowuje wcześniejsze zasady. 2.6 wdrożone dla szkicu 6; wcześniejsze akapity pozostają historią etapów i ograniczeń.
