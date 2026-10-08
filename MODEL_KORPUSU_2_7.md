# Model korpusu — 2.7

## 2.7.1 — niezależny rejestr, odbiór 2026-10-07

`src/core/bodyState.ts` prowadzi stan jawnie zadeklarowanych instancji korpusu. Każda instancja ma własne ID, referencję do zdefiniowanego wyrobu i lokalizację: nieznaną albo konkretną kopię stanowiska. Definicja wyrobu, zlecenie, graf operacji i geometria nie tworzą instancji ani nie określają ich położenia.

Stany: bez lokalizacji, dostępny, zajęty przez operację, w przemieszczeniu. Zajęty korpus pozostaje na swojej kopii stanowiska. Podczas przemieszczenia ma zapisany początek i cel, ale nie jest dostępny na żadnym z końców trasy. Jawne zakończenie przemieszczenia ustawia lokalizację docelową.

Zdarzenia obejmują uzupełnienie nieznanej lokalizacji, rezerwację, zwolnienie, rozpoczęcie i zakończenie przemieszczenia. Znanej lokalizacji nie można zastąpić zdarzeniem uzupełnienia. Czas nie może się cofać w obrębie jednej instancji. Rezerwacja i przemieszczenie wymagają dodatniego przedziału oraz oznaczenia czasu jako potwierdzonego lub założonego. Moduł nie wylicza czasu transportu z długości drogi.

Jedna instancja może mieć tylko jedną rezerwację; podczas rezerwacji nie można jej przenieść. Zwolnienie wymaga zgodnej operacji i osiągnięcia zadeklarowanego końca. Sam upływ czasu nie zwalnia korpusu i nie kończy przemieszczenia. Zdarzenia zwracają nowy stan, zachowując wejście przy odmowie.

To izolowany moduł wykonawczy. Nie zmienia schematu zapisu, aktywnej symulacji 4/5, szkicu 6 ani UI. Nie określa jeszcze przypisania instancji do zleceń, ról operacji, instancji podzespołów, ich zużycia ani pojemności stanowisk. Integracja i zapis wymagają kolejnych pakietów 2.7.2–2.7.4; równoległa praca na wspólnym korpusie wymaga reguł 2.8.

## 2.7.2 — jawne role operacji, odbiór 2026-10-07

Operacja szkicu 6 może mieć opcjonalne pole `physicalRole`:

- `{kind: 'subassembly-preparation', subassemblyIds: [...]}` — przygotowanie jawnie wskazanych definicji podzespołów. Lista musi być niepusta i unikalna. Każdy podzespół musi istnieć i mieć `producerOperationId` zgodne z ID tej operacji. Przygotowanie nie wymaga definicji wyrobu ani lokalizacji korpusu.
- `{kind: 'body-work'}` — praca na wspólnym korpusie zdefiniowanego wyrobu. Wymaga istniejącej definicji `product`; nie tworzy jego fizycznej instancji.

Brak pola oznacza nieokreśloną rolę. Nazwa, BOM, graf oraz istniejące powiązania tworzące/zużywające nie przypisują jej automatycznie. Jedna deklaracja wybiera jeden rodzaj roli; operacje o mieszanej fizycznej roli wymagają dalszego jawnego kontraktu. Lista podzespołów nie deklaruje ilości, chwili wytworzenia, zużycia ani dołączenia do korpusu. Istniejące `producerOperationId` i `consumerOperationIds` pozostają źródłem powiązań definicji; nowe pole nie kopiuje listy konsumentów i nie zmienia jej.

`editDomainPhysicalRole` ustawia lub usuwa rolę po trwałym ID operacji, walidując projekt przed i po zmianie. Nie zmienia wejścia. Usunięcie podzespołu używanego w roli, zmiana jego producenta albo usunięcie definicji wyrobu przy zachowanej roli pracy na korpusie jest odrzucane. Najpierw trzeba jawnie zmienić lub usunąć zależną rolę.

Starszy szkic 6 bez pola pozostaje czytelny bez migracji i bez dopisanych ról. Przy przygotowaniu szkicu z 4/5 potencjalne nieobsługiwane pole `physicalRole` jest usuwane z nowych operacji; dokładny tekst źródła pozostaje zachowany. Wersje schematów i klucze zapisu nie zmieniają się.

Harmonogram szkicu zawierającego choć jedną rolę odmawia wyniku z komunikatem o wymaganej integracji 2.7.3. Nie ignoruje ograniczeń fizycznych. Starsze szkice bez ról zachowują przebieg. Edytor UI, inspekcja, historia i odbiór w przeglądarce należą do 2.7.4; obecny pakiet obejmuje kontrakt danych, edycję rdzenia i zapis/odczyt.

## 2.7.3 — pierwszy zakres integracji, 2026-10-07

Powyższa odmowa z 2.7.2 została zastąpiona walidacją jawnego wejścia przebiegu. `scheduleWorkerRun` przyjmuje opcjonalny czwarty argument `BodyRunInput`: deklaracje instancji oraz listę `{job, bodyId}`. Nie tworzy korpusów z liczby sztuk. Przebieg z rolami wymaga ról wszystkich operacji; praca na korpusie dodatkowo wymaga dokładnie jednego jawnego, unikalnego przypisania do każdej sztuki, bez nieprzypisanych deklaracji. To ograniczenie bieżącego przebiegu, a nie reguła tworzenia korpusów lub podziału wyrobu.

Lokalizacja początkowa musi być znana. Każda operacja pracy na korpusie musi dopuszczać tę kopię stanowiska. Przy przydziale harmonogram sprawdza dostępność korpusu właśnie na niej, zajmuje go od startu do końca operacji (również przez pauzy), a następnie jawnie zwalnia. Wynik zawiera ID korpusu przy operacjach, rejestr końcowy i chronologiczne zdarzenia. Pochodzenie czasu rezerwacji odpowiada pochodzeniu czasu wybranego wariantu obsady.

Przygotowanie podzespołu nie zajmuje i nie przenosi korpusu. Przebieg wyłącznie przygotowawczy nie wymaga instancji korpusu. Nadal działa zachowawcza blokada jednej trwającej operacji na sztukę; fizyczna równoległość pozostaje do 2.8. Samo wykonanie przygotowania nie tworzy instancji podzespołu ani nie potwierdza jego zużycia. Opisy tras pomiędzy operacjami nie są zdarzeniami przemieszczenia korpusu.

Wejście instancji jest na razie parametrem wykonawczym rdzenia, poza zapisem projektu i UI. Odczyt szkicu zachowuje role, ale odtworzenie przebiegu wymaga ponownego podania jawnych instancji. Nie zmieniono schematów ani kluczy zapisu. Fizyczna pojemność miejsc oczekiwania, obecność nieruchomego korpusu jako blokada stanowiska, wyjście gotowego korpusu i instancje podzespołów nie są jeszcze modelowane; rezerwacje kopii dotyczą wykonywanych operacji. To ograniczenia zakresu, bez deklaracji kompletnej symulacji fizycznej.

Gdy wymagana operacja nie jest dopuszczona w początkowym miejscu korpusu, przebieg odmawia z komunikatem o przemieszczeniu. Nie teleportuje korpusu ani nie wyprowadza czasu przejazdu z samej długości. Reguły automatycznego wyboru stanowiska, najwcześniejszego startu i krótszej rzeczywistej drogi pozostają ustaleniami 2.6; transport musi umożliwić ich użycie przy jawnym czasie i zajęciu celu.

Do uzgodnienia przed następną częścią 2.7.3:

1. Źródło czasu transportu: proponowany jawny czas dla każdej skierowanej trasy, z oznaczeniem pomiar/założenie i źródłem. Alternatywa to wyliczenie z jawnej prędkości oraz jawnych czasów obsługi. Żadna wartość nie będzie domyślna.
2. Zajęcie celu: proponowana rezerwacja kopii docelowej przed rozpoczęciem przewozu, utrzymana przez dojazd i operację. Alternatywa dopuszczająca dojazd do zajętego celu wymaga jawnego bufora oczekiwania i jego pojemności. Obecny moduł nie rozstrzyga tej reguły.

Obsada i środki transportu również wymagają jawnych danych, jeśli mają brać udział w rezerwacjach; nie przydzielamy do przewozu zespołu operacji bez takiej deklaracji.

## 2.7.3 — transport według 1A/2A, odbiór 2026-10-07

Użytkownik zatwierdził jawny czas każdej trasy (1A) i zajęcie celu przed przewozem, przez dojazd i operację (2A). Poprzednia odmowa przemieszczenia została zastąpiona obsługą tych reguł. Skierowana trasa może mieć opcjonalne `transportTime: {durationSeconds, basis, source}`. Czas musi być dodatni i skończony; `basis` to `measured` albo `assumed`, a źródło musi być niepuste. Starsze trasy pozostają czytelne. Do przewozu korpusu wymagana jest jawna trasa z jego rzeczywistej lokalizacji do każdego rozważanego innego celu i jej czas; nie wyliczamy go z odległości. Praca w tej samej kopii nie tworzy przewozu.

Harmonogram porównuje możliwe starty operacji po dojeździe, z uwzględnieniem kalendarzy, osób i zajęcia celu. Najwcześniejszy start wygrywa; remis rozstrzyga długość rzeczywistego dojazdu i dalsza droga z kontraktu 2.6. Jeżeli lepszy cel jest zajęty, korpus czeka u źródła do jego zwolnienia, a wybór jest wtedy przeliczany. Kopia wybranego celu jest zajmowana w momencie wyjazdu i pozostaje zajęta do końca operacji, również podczas oczekiwania na zmianę lub osoby oraz pauz. Nie rezerwuje się zajętego celu i nie wysyła do niego korpusu.

Zdarzenia oddzielają początek przewozu, jego zakończenie, start pracy i zwolnienie. Podczas jazdy korpus nie ma lokalizacji stanowiskowej; po dojeździe ma cel, a pracę rozpoczyna dopiero w obliczonym terminie. Zespół operacji jest rezerwowany na swoje jawne przedziały obecności w operacji. Dane przewozu nie przydzielają automatycznie tych osób ani środka transportowego — bieżący zakres modeluje zadeklarowany czas przemieszczenia, bez modelu pojemności ekip i pojazdów transportowych.

Wynik operacji zawiera `stationReserveStartSeconds` oraz opcjonalne `transport` z ID trasy, początkiem, końcem i pochodzeniem czasu. `startSeconds` oznacza początek pracy; `waitSeconds` obejmuje oczekiwanie przed i po dojeździe, z wyłączeniem czasu jazdy. Rejestr zdarzeń i końcowy stan korpusów są odtwarzalne. Przebieg nadal serializuje operacje jednej sztuki; automatyczny plan tras nadal wymaga linearnego ciągu. Fizyczne gałęzie i równoległość należą do 2.8.

Pole czasu trasy jest zapisywane i walidowane w istniejącym szkicu 6, bez nowej wersji schematu i bez zmiany źródeł 4/5. Edycja czasu oraz wejścia instancji i inspekcja przebiegu w UI pozostają do 2.7.4. Punkt 2.7.3 odebrano w zakresie rejestru korpusu i jego przewozu; ograniczenia instancji/zużycia podzespołów, pojemności fizycznych miejsc oczekiwania i zasobów transportowych pozostają jawne.

## 2.7.4 — zapis i UI, odbiór 2026-10-07

Opcjonalne `bodyRunInput` w szkicu 6 zapisuje deklaracje początkowe instancji i ich przypisania do sztuk. Parser waliduje je względem ról, wyrobu i jawnych kopii stanowisk. Zapisany stan jest konfiguracją wejściową; wynik wykonania i końcowy rejestr nie zastępują go. Schemat i klucz zapisu pozostają bez zmian; starszy szkic bez pola jest czytelny. Migracja 4/5 usuwa potencjalne nieobsługiwane `bodyRunInput`, zachowując dokładne źródło.

Walidacja rejestru na ścieżce parsera korzysta z definicji już sprawdzonych, aby nie wywoływać parsera rekurencyjnie. Publiczne tworzenie rejestru nadal sprawdza projekt. Błędne referencje lub dodatkowe pola zapisanej konfiguracji blokują zapis; uszkodzony odczyt pozostawia surową wartość do odzyskania.

`DomainBodyEditor` udostępnia role wszystkich operacji, wskazane definicje przygotowywanych podzespołów i jawne korpusy. Każda deklaracja w formularzu ma sztukę, ID instancji, wybrany wyrób i początkową kopię. Nie dopisuje numerów, lokalizacji ani instancji. `DomainRoutingEditor` pozwala dodać/usunąć czas trasy, oznaczyć go jako zmierzony/założony i podać źródło. Zmiany przechodzą przez wspólną kontrolę konfliktu zapisu i Cofnij/Ponów; remontaż edytorów przy zmianie szkicu usuwa nieaktualne lokalne formularze i wyniki.

Podgląd harmonogramu przekazuje zapisaną konfigurację instancji, rozpoczyna od ich zadeklarowanych miejsc i pokazuje ID korpusu, okres zajęcia celu, przewóz, końcowe lokalizacje oraz zdarzenia. Przygotowanie podzespołów jest oznaczone jako niezajmujące korpusu. Liczba sztuk domyślnie odpowiada zapisanym przypisaniom; odstęp przybycia nadal jest jawnym polem podglądu i trzeba go ponownie podać po przeładowaniu. Historia jest sesyjna, a wynik nie jest zapisywany jako stan technologiczny.

UI pokazuje do 100 wykonań w tabeli i 500 zdarzeń z informacją o ograniczeniu; pełny wynik rdzenia pozostaje w pamięci przebiegu. Instrukcja: `Instrukcja/Korpus_v6.md`. Odbiór 2.7 dotyczy osobnego szkicu 6 i opisanego zakresu; nie obejmuje instancji podzespołów, ich zużycia, zasobów przewozowych ani fizycznej równoległości 2.8.
