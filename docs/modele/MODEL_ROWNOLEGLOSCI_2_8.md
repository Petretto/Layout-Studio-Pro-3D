# Równoległość na jednym wyrobie — propozycja kontraktu 2.8

Data: 2026-10-07. Status: zatwierdzone grupy 1A/2A oraz pierwszeństwo tras gałęzi 1A; 2.8.1–2.8.3 odebrane w zakresie szkicu 6. Rzeczywiste scenariusze Eko pozostają w 2.9.

## Stan obecny i granica zmiany

Harmonogram szkicu 6 blokuje start, jeżeli jakakolwiek operacja tej samej sztuki już trwa (`inFlight`). Rejestr korpusu ma pojedynczą rezerwację. Kopia stanowiska jest wyłączna dla pojedynczej operacji. Automatyczny plan tras obsługuje jeden ciąg, a przy rozgałęzieniu odmawia wyniku. Usunięcie tylko jednej z tych blokad nie wystarczy do poprawnej równoległości.

Nowa reguła nie może nadpisywać poprzedników, kalendarzy, wymaganej obsady ani wyłączności egzemplarzy wyposażenia. Korpus musi zachować jedną fizyczną lokalizację. Transport według zatwierdzonych 1A/2A wymaga jawnego czasu trasy i zajęcia celu od wyjazdu do końca pracy.

## Decyzja 1 — sposób deklaracji

**1A — proponowane: jawne grupy dopuszczonych operacji.** Użytkownik wskazuje zestaw operacji, które mogą zachodzić jednocześnie na jednej sztuce. Każdy aktualnie równoczesny zbiór musi w całości mieścić się w jednej zadeklarowanej grupie; dopuszczone są jej podzbiory. Grupy nie łączą się automatycznie i nie tworzą zgody przez przechodniość. Bez zgodnej grupy obowiązuje wykluczanie.

Przykład abstrakcyjny: grupy `{A, B}` i `{B, C}` pozwalają na A+B albo B+C. Nie pozwalają na A+B+C ani A+C. To nie jest deklaracja dopuszczeń żadnego rzeczywistego procesu; takie dane musi wskazać użytkownik.

**1B — alternatywa: jawne pary dopuszczeń.** Równoczesny zbiór jest dozwolony, jeśli dopuszczono każdą jego parę. Wpisy A+B, A+C i B+C dopuszczają również wszystkie trzy naraz. Ten skutek musi być świadomą częścią kontraktu, ponieważ zgoda na dwie czynności może nie oznaczać zgody na trzy.

Nie proponuje się drugiej sprzecznej listy zakazów: operacje poza jawnym dopuszczeniem są wykluczane. Użytkownik może wymusić kolejność istniejącą zależnością grafu. Powtórzone/obce ID, grupy/pary jednoelementowe i niepełne role fizyczne mają być odrzucane. Starsze szkice bez reguł zachowają dotychczasową serializację; reguły ze źródeł 4/5 nie będą automatycznie migrowane.

## Decyzja 2 — wspólny korpus i stanowisko

**2A — proponowane: dopuszczenie obejmuje pracę na wspólnym korpusie.** Dwie dopuszczone operacje mogą korzystać z tej samej kopii stanowiska tylko wtedy, gdy dotyczą tego samego jawnego korpusu, odbywają się w jego jednej zapisanej lokalizacji i spełniają regułę z decyzji 1. Współdzielenie jest jawnie deklarowaną możliwością pracy na tej kopii przez wskazane operacje, a nie ogólnym zwiększeniem pojemności stanowiska.

Pracownicy i egzemplarze wyposażenia pozostają wyłączne według ich rezerwacji. Kopia jest blokowana dla innych sztuk do zakończenia ostatniej trwającej operacji wspólnego korpusu. Zakończenie pierwszej czynności nie zwalnia całej kopii. Korpusu nie można przenieść podczas żadnej z jego rezerwacji. Pauza nie usuwa dopuszczenia ani zajęcia. Przygotowanie niezależnego podzespołu może odbywać się w innym miejscu bez przenoszenia korpusu, jeśli grupa/para to dopuszcza i zasoby są dostępne.

**2B — alternatywa pierwszego zakresu:** reguły uruchamiają tylko równoległość przygotowania podzespołów oraz przygotowania z pracą na korpusie. Dwie czynności na tym samym korpusie pozostają sekwencyjne; kopia zachowuje wyłączność pojedynczej operacji. Dopuszczenie współdzielenia korpusu i kopii stanowiłoby późniejsze rozszerzenie.

Żaden wariant nie dopuszcza równoczesnej pracy na tym samym korpusie na różnych kopiach ani nie przypisuje mu dwóch lokalizacji. Zmiana stanowiska przy rozgałęzionym grafie wymaga rozstrzygnięcia pojedynczej drogi korpusu; algorytm nie może przemieszczać go według dwóch niezależnych gałęzi. Reguła najwcześniejszego startu i rzeczywistej odległości pozostaje obowiązująca.

## Scenariusze odbioru po decyzji

| Scenariusz | Oczekiwane zachowanie |
| --- | --- |
| Brak deklaracji równoległości | Dotychczasowy wynik sekwencyjny |
| Dopuszczone niezależne przygotowania, osobne zasoby | Możliwy równoczesny start |
| Dopuszczenie, ale zależność A → B | B czeka na zakończenie A |
| Dopuszczenie, ale ta sama osoba lub egzemplarz wyposażenia | Oczekiwanie na zwolnienie zasobu |
| Dopuszczona praca na wspólnym korpusie, jedna kopia | Równolegle tylko przy wariancie 2A, zgodnej regule i dostępnych osobach/wyposażeniu |
| Jedna czynność kończy wcześniej | Korpus i kopia nadal zajęte przez pozostałą czynność |
| Próba przewozu przy trwającej pracy | Odmowa lub oczekiwanie do zwolnienia wszystkich rezerwacji |
| Dwa różne korpusy, ta sama kopia | Brak współdzielenia; wyłączność kopii |
| A+B i B+C zadeklarowane, trzy operacje gotowe | Wariant 1A nie dopuszcza wszystkich trzech bez obejmującej je grupy |
| Cofnij/Ponów i ponowny odczyt | Identyczne reguły i odtwarzalny wynik; brak zmiany źródeł 4/5 |

## Pakiety wykonania

1. **2.8.1:** uzgodnienie kontraktu, opcjonalne dane reguł, walidacja referencji i zgodność zapisu.
2. **2.8.2:** integracja dopuszczeń/wykluczeń z harmonogramem, rejestrem korpusu i kopiami; przypadki ręcznie policzone, oczekiwanie i ochrona zasobów. Fizyczne trasy przy gałęziach wymagają osobnego odbioru w tym zakresie.
3. **2.8.3:** edytor, inspekcja przyczyn, historia, zapis/odczyt i różne procesy w UI; raport zbiorczy.

Nie wprowadzono danych ani zgód równoległości Eko. Wymagają jawnego opisu procesu w 2.9. Użytkownik zatwierdził 1A i 2A; alternatywy 1B/2B powyżej pozostają zapisem przeanalizowanych opcji.

## Dane i walidacja 2.8.1

Szkic 6 może mieć opcjonalne `physicalConcurrency: {groups: [{id, operationIds}]}`. Grupa wskazuje co najmniej dwie unikalne operacje. Wymagane są jawne role wszystkich operacji; reguła nie dopisuje ich. ID grup i zestawy operacji muszą być unikalne. Kolejność ID w grupie nie tworzy nowego zestawu; powtórzenie A+B jako B+A jest błędem. Maksymalnie 500 grup, każda do 500 operacji. Nieznane pola, ID i niepoprawne kształty danych są odrzucane.

`matchingConcurrencyGroup` znajduje jedną grupę obejmującą cały wskazany równoczesny zestaw. Nie łączy grup i nie buduje zgody z par. Brak grupy oznacza wykluczenie, a nie błąd zapisu. Pusta lista grup jest poprawną jawną deklaracją bez dopuszczeń. Zależność grafu może nadal wymusić sekwencję wewnątrz grupy; zapis nie usuwa poprzedników i nie obiecuje rzeczywistego startu równoległego.

Schemat i klucz zapisu pozostają bez zmian. Starszy szkic bez pola czyta się bez migracji. Przy przygotowaniu szkicu z 4/5 potencjalne nieobsługiwane `physicalConcurrency` jest usuwane z nowego projektu, a dokładny tekst źródła zachowany. Zapis weryfikuje referencje i nie nadpisuje poprawnej wartości przy błędzie; uszkodzony odczyt zachowuje surową wartość. Usunięcie wymaganej roli przy zachowanych regułach jest blokowane.

Do integracji w 2.8.2 harmonogram z polem nowych reguł jawnie odmawia obliczeń. Starsze wyniki bez pola pozostają niezmienione. Moduł reguł ocenia wyłącznie dopuszczenie zestawu; nie rezerwuje korpusu, kopii, osób ani wyposażenia. Wariant 2A jest zatwierdzonym kontraktem następnej implementacji, a nie już uruchomionym współdzieleniem.

## 2.8.2 — pierwszy zakres wykonania, 2026-10-07

Powyższa odmowa reguł została zastąpiona integracją. Harmonogram prowadzi zbiór przydzielonych, niezakończonych operacji każdej sztuki. Start kolejnej wymaga jednej grupy obejmującej cały ten zbiór wraz z nową operacją; bez grup obowiązuje dawna serializacja. Graf poprzedników nadal steruje gotowością. Operacje przydzielone na przyszły start po kalendarzu/przewozie także są uwzględniane, aby nie omijać zgody przez rezerwacje z wyprzedzeniem.

Rejestr korpusu zachowuje `reservation` jako pierwszą rezerwację i opcjonalne `additionalReservations` dla kolejnych. Dołączenie wymaga jednej grupy wszystkich operacji i nie tworzy drugiej lokalizacji. Zwolnienie usuwa tylko wskazaną rezerwację; po zwolnieniu pierwszej pozostała staje się główną. Korpus staje się dostępny dopiero po ostatnim zwolnieniu. Przewóz zajętego korpusu jest nadal zabroniony.

Współdzielenie kopii jest dozwolone wyłącznie dla tego samego korpusu w jego zapisanej lokalizacji, przy jednej zgodnej grupie. Zakończenie krótszej operacji nie zwalnia kopii dla innej sztuki. Osoby zachowują wyłączne rezerwacje obecności, a wymagany egzemplarz wyposażenia jest wyłączny przez całą operację. Przygotowanie na innym stanowisku może działać równolegle bez zajęcia/przeniesienia korpusu. Przyczyną oczekiwania może być brak dopuszczenia zestawu, osoba, kopia, kalendarz, wyposażenie albo korpus w wymaganym miejscu.

Obsługiwane są rozgałęzione przebiegi bez danych tras (wspólny początkowy korpus bez przewozu) oraz z jawnymi trasami i jedną dopuszczoną kopią każdej operacji. W drugim przypadku przewóz odbywa się z rzeczywistego miejsca korpusu, po zakończeniu wszystkich jego prac, według reguł 1A/2A. Nie zapisuje się fikcyjnej trasy między równoległymi operacjami na podstawie kolejności iteracji.

**Pozostały zakres 2.8.2:** automatyczny wybór dalszej drogi przy fizycznych gałęziach i wielu dopuszczonych kopiach. Taki przebieg jawnie odmawia wyniku. Dotychczasowy wybór w jednym ciągu nadal działa. Punkt 2.8.2 pozostaje w trakcie; edytor grup i zbiorczy odbiór UI należą do 2.8.3. Brak modelu instancji/zużycia podzespołów i zasobów przewozowych pozostaje ograniczeniem 2.7.

## 2.8c — propozycja pierwszeństwa dalszych gałęzi, do zatwierdzenia

Analiza 2026-10-07: dotychczasowe zatwierdzenia obejmują automatyczny wybór przyszłych kopii w jednym ciągu oraz grupy równoległości i wspólny korpus. Nie rozstrzygają, która z kilku dalszych gałęzi ma pierwszeństwo przy porównywaniu odległości. Najwcześniejszy start i najkrótsza rzeczywista droga przychodząca nadal rozstrzygają wcześniej. Poniższa decyzja dotyczy dopiero remisu tych kryteriów; nie zmienia zależności ani zezwolenia na równoległość.

Ręcznie policzony, wyłącznie syntetyczny przykład: dwie aktualne kopie X i Y mają jednakowy możliwy start i jednakową drogę przychodzącą. Po bieżącej operacji są dwie gałęzie pracy na korpusie P i Q. Podane wartości to najkrótsze zadeklarowane drogi skierowane do dopuszczonych kopii danej gałęzi, a nie odległości geometryczne.

| Aktualna kopia | Do P [mm] | Do Q [mm] |
| --- | ---: | ---: |
| X | 2 | 100 |
| Y | 10 | 3 |

Pierwszeństwo P daje X; pierwszeństwo Q daje Y. Żadna kopia nie ma najkrótszej drogi do obu procesów. Sumowanie odległości albo wybór minimum spośród gałęzi wprowadzałby dodatkową niezatwierdzoną regułę.

**1A — proponowane:** zachować istniejącą kolejność technologiczną harmonogramu jako pierwszeństwo gałęzi w remisie. Porównywać drogi do kolejnych gałęzi w tej kolejności, bez sumowania. W przykładzie P przed Q oznacza X. Kopie przyszłych stanowisk nadal wybierane automatycznie, a preferencja przeliczana przy rzeczywistym przydziale; nie rezerwuje przyszłych zasobów. Nie wymaga nowego pola zapisu. Jest to jawne zatwierdzenie znaczenia dotychczasowej kolejności dla nowego kryterium tras.

**1B — alternatywa:** wymagać jawnego priorytetu gałęzi wskazanego przez użytkownika. Ten priorytet rozstrzyga porównanie dalszych dróg dopiero po remisie wcześniejszych kryteriów. W przykładzie zadeklarowane Q przed P daje Y. Wymaga osobnego kontraktu danych, walidacji, edytora oraz zgodności starszych szkiców.

Do decyzji nie zmieniono algorytmu ani zapisu. Brak trasy/czasu, inna lokalizacja korpusu podczas rezerwacji i brak zgody całego zestawu pozostają odmową lub przyczyną oczekiwania, nigdy domyślnym zerowym przejściem. Przygotowania podzespołów nie wyznaczają drogi korpusu.

## 2.8c / 2.8.2 — zatwierdzenie 1A i wykonanie

Użytkownik zatwierdził 1A. Powyższa propozycja pozostaje historią decyzji. Dla rozgałęzionego grafu z jawnymi regułami porównanie kopii obejmuje kolejno: najwcześniejszy możliwy start, rzeczywistą drogę z bieżącej lokalizacji korpusu, następnie odległości do kolejnych gałęzi pracy na korpusie według istniejącego sortowania topologicznego (`sequenceNumber` wśród gotowych operacji). Remis zachowuje kolejność dopuszczonych kopii. Nie sumuje się odległości.

Plan preferencji prowadzi do pierwszych operacji korpusu na dalszych ścieżkach grafu, pomijając przygotowania podzespołów. Złączenie osiągnięte kilkoma ścieżkami pojawia się w danym zestawie dalszych celów raz. Najpierw porównuje się wszystkie następne odcinki w kolejności gałęzi, a dopiero przy ich pełnym remisie kolejne odcinki. Dopuszczone przyszłe kopie wybiera się automatycznie; remis drogi do tej samej gałęzi rozstrzygają jej dalsze preferencje. Porównanie współdzielonych części grafu pamięta wynik pary planów, aby nie przeliczać każdego dojścia do złączenia osobno.

Pozostanie na tej samej kopii ma odległość zero i nie jest przewozem. Inne przejścia wymagają jawnej skierowanej trasy; nie zastępuje się brakujących danych geometrią. Plan wymaga dróg dla wszystkich rozważanych przejść do dalszych dopuszczonych kopii. Czas przewozu jest wymagany przy rzeczywistym przemieszczeniu.

Preferencja nie rezerwuje przyszłego stanowiska ani nie wymusza jego późniejszego wyboru. Przy kolejnym przydziale rzeczywisty czas startu, bieżąca lokalizacja i dostępność zasobów są oceniane ponownie. Trwająca praca korpusu nadal uniemożliwia przewóz; dołączenie może nastąpić wyłącznie w tym samym miejscu. Przygotowania nie otrzymują fikcyjnej trasy korpusu. Zachowano dotychczasowy plan i wyniki jednego ciągu oraz dawną odmowę niejawnych gałęzi bez kontraktu równoległości.

Odbiór: 133/133 testów, build, UI gałęzi i regresja współdzielenia, historia i odczyt. Schemat i migracje bez nowych pól. 2.8.2 wdrożone w powyższym zakresie; 2.8.3 pozostaje do realizacji. Nie dodano instancji/zużycia podzespołów, buforów ani zasobów przewozowych.

## 2.8d / 2.8.3 — edytor i inspekcja

Panel szkicu ma edytor grup z własnym ID i wyborem operacji. Zapis pełnej listy korzysta z walidacji i wspólnej historii; błędne dane nie zmieniają zapisu. Usunięcie pojedynczej grupy w formularzu wymaga zapisu. Osobno można usunąć całe opcjonalne pole. Pusta lista zachowuje jawny kontrakt bez dopuszczeń; brak pola przywraca starszy tryb. Role wymagane przez zapisane reguły pozostają chronione przed usunięciem.

Inspekcja obliczonego wyniku pokazuje przedziały równoczesnej pracy jednej sztuki (od startu do końca, z pauzami), cały aktywny zestaw oraz jedną obejmującą go grupę. Podaje miejsca, korpusy, osoby i wymagane wyposażenie. Nie łączy grup przez pary. Rezerwacje przed startem i przewóz pozostają w tabeli harmonogramu. Przy braku równoległych przedziałów inspekcja odsyła do przyczyn oczekiwania. To odczyt wyniku, nie dodatkowe źródło stanu technologicznego. Widok ogranicza tabelę do pierwszych 100 przedziałów, liczy wszystkie.

Odbiór trzech syntetycznych scenariuszy UI, regresji tras, 133/133 testów i build opisano w raporcie. Dane zapisane i wynik odtwarzają się po odczycie; Cofnij/Ponów odświeża formularz i usuwa stary wynik. Schemat bez zmian, źródła i projekty 4/5 chronione. 2.8 wdrożone w zakresie szkicu 6; nadal brak rzeczywistych zgód Eko, instancji/zużycia podzespołów, buforów i zasobów przewozowych.
