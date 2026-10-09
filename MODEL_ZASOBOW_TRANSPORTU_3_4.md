# Zasoby transportowe — propozycja 3.4a / 3.4.1

Data: 2026-10-09. Status: 1B wybrano dla transportu międzyoperacyjnego na montażu, z doprecyzowaniem zakresu poniżej. Nie jest aktywnym kontraktem zapisu ani zmianą harmonogramu.

## Obowiązujący zakres po doprecyzowaniu użytkownika

Użytkownik wyjaśnił: „Czasu operatorów magazynu nie liczymy, jedynie bierzemy pod uwagę co ile dostarczany musi być materiał by zachować płynność produkcji”. To doprecyzowanie ma pierwszeństwo przed wcześniejszymi propozycjami i pytaniami.

- **3.4 — transport międzyoperacyjny montażu:** przemieszczenie korpusu, wyrobu lub podzespołu między operacjami. Uwzględniamy czas i dostępność jawnie wskazanych zasobów tego transportu. Osoba montażowa wykonująca przemieszczenie ma tę samą tożsamość i rezerwacje co podczas pracy montażowej. Nie każda trasa wymaga wózka; mechanizm i wymagania podaje użytkownik dla procesu.
- **Zaopatrzenie materiałowe:** dostawa do montażu jest zdarzeniem uzupełnienia zapasu. Nie wprowadzamy operatorów magazynu do zespołu montażowego, czasu ich pracy, kalendarzy, obciążenia, lokalizacji ani rezerwacji. Trasy magazynowe nie służą do obliczania pracy magazynierów.
- **Częstotliwość dostaw:** sprawdzamy, jak często trzeba uzupełniać materiał przy podanym zużyciu, zapasie i ilości dostawy, aby uniknąć braku materiału. Połączenie ze stanami zapasu i ograniczeniami pojemności należy do 3.5, a prezentacja oczekiwania na materiał do 3.6. Nie zakładamy, że częstotliwość wynika z czasu przejazdu wózka.
- Wybór 1B dotyczy rzeczywiście używanych urządzeń transportu międzyoperacyjnego. Nie jest poleceniem modelowania floty magazynowej ani automatycznego wymagania wózka dla każdego przemieszczenia.
- Pytania o powrót do bazy i dojścia operatorów magazynu nie blokują realizacji montażu. Nie wybieramy za użytkownika żadnej takiej reguły. Dla konkretnego ruchomego zasobu montażowego dojazd bez ładunku lub powrót musi wynikać z jego jawnych danych; brak danych pozostaje brakiem danych.

### Dane i dowody dla częstotliwości uzupełnienia

Potrzebne są jawne referencje materiału i miejsca pobrania, jednostka ilości, początkowy zapas, zużycie na wykonanie, ilość jednej dostawy oraz jej terminy lub odstęp i pierwsza dostawa. Trzeba również określić moment pobrania materiału przez operację, pojemność jeśli ma ograniczać zapas oraz źródło/pochodzenie danych. BOM nie określa automatycznie zapasu początkowego, ilości dostawy ani chwili zużycia.

Weryfikacja ma opierać się na przebiegu montażu i zdarzeniach zużycia/uzupełnienia, także przy nierównym poborze i pracy równoległej. Średnie zużycie może być pomocniczym wskaźnikiem, lecz nie dowodem braku przestojów. Nie wyznaczamy liczby minut bez zadeklarowanego zapasu i ilości dostawy. Kolejność zdarzeń dostawy i pobrania przy tym samym czasie będzie jawną regułą kontraktu zapasów, nie przypadkiem kolejności w tablicy.

Odbiór wymaga pokazania niedoboru i oczekiwania przy zbyt rzadkiej dostawie oraz braku niedoboru przy wystarczających terminach i ilościach; w żadnym scenariuszu nie rezerwuje się operatora magazynu. Brak wymaganych danych musi być wyjaśniony zamiast przyjmowania nieograniczonego materiału.

## Stan zastany

- `stationRouting.ts` i `transportTime.ts`: skierowane trasy konkretnych kopii, jawne czasy albo wyliczenie z długości, prędkości i obsługi. Brak czasu wymaganej trasy powoduje odmowę.
- `workerSchedule.ts`: osoby są rezerwowane dla operacji; przewóz korpusu nie ma obecnie wymaganej osoby ani urządzenia. Cel jest zajęty od wyjazdu do końca operacji. Wybór najwcześniejszego startu i rozstrzyganie remisu drogą pozostają obowiązujące.
- `resourceCalendar.ts`: jawne zmiany i przerwy osób oraz stanowisk, przedziały półotwarte. Brak mapy kalendarzy i brak konkretnego wpisu w aktywnej mapie mają różne znaczenie; transport musi zachować tę jawność.
- Rejestr korpusu zna lokalizację korpusu; nie jest rejestrem lokalizacji wózka ani osoby. Położenie obiektu w 3D nie może zastąpić takiego rejestru.
- Sieć materiałowa może opisywać magazyn, lecz połączenia zewnętrzne nie uruchamiają przewozu. Eko testuje proces po dostawie ramy. 3.4 nie może dopowiedzieć danych dostawy.

## Proponowane wspólne reguły

1. Rozszerzenie dotyczy odrębnego szkicu 6. Starsze szkice bez nowych reguł zachowują pełne wyniki i dokładne źródła 4/5. Interfejs opisuje je jako transport bez ograniczeń zasobowych; nie deklaruje potwierdzonej dostępności transportu.
2. Włączenie ograniczeń jest jawne. Każda trasa używana przez fizyczny przewóz musi wtedy mieć regułę: wymagane zasoby albo jawnie zadeklarowany brak takich wymagań ze źródłem. Brak reguły powoduje odmowę, bez automatycznego nieograniczonego transportu. Definicje połączeń zewnętrznych nadal nie uruchamiają dostawy.
3. Osoba transportowa wskazuje istniejące ID w `workers`. Nie tworzymy osobnego rejestru osób transportu; ta sama osoba nie może jednocześnie przewozić i montować. Kalendarz osoby pozostaje wspólny.
4. Urządzenie ma trwałe ID i nazwę oraz rodzaj wózek/przenośnik. Konkretne egzemplarze są wyłączne; dwóch wózków nie zastępujemy anonimową pojemnością 2. Nie duplikujemy istniejącego egzemplarza wyposażenia jako niezależnego urządzenia transportowego — przed implementacją parser musi ustalić wspólną referencję i blokować sprzeczne użycie.
5. Reguła trasy zawiera listę jawnych alternatywnych zestawów. Zestaw wymaga wszystkich wskazanych osób i urządzeń równocześnie. Brak wymagań osoby lub urządzenia musi być jawny. Przenośnik nie oznacza automatycznie braku osoby ani nieograniczonego przepływu.
6. Proponowany pierwszy zakres rezerwuje cały przedział załadunek + jazda + rozładunek, bez przerwania przewozu podczas przerwy. Zestaw musi mieć wspólne, ciągłe okno dostępności. Wpisany czas bez składowych rezerwuje cały wpisany przedział. Nie dodajemy ponownie czasów obsługi do sumy z 3.3.
7. Brak wolnego zestawu oznacza oczekiwanie, a nie wydłużenie czasu jazdy. Wynik oddziela okres oczekiwania na transport, przyczyny i ID blokujących zasobów od czasu przewozu. Przy kilku jednoczesnych blokadach nie sumuje ich jako niezależnych czasów. Rezerwacja celu rozpoczyna się dopiero przy faktycznym wyjeździe, zgodnie z 2.7.
8. Osoby i urządzenia są przydzielane atomowo razem z korpusem i docelową kopią. Planowanie kandydatów nie rezerwuje przegranych wariantów. Ponowny wybór uwzględnia faktyczne rezerwacje. Przy równej wykonalności stosujemy jawną kolejność alternatyw, zachowując obecne pierwszeństwo startu operacji i reguły tras.
9. Zajęta osoba transportowa może później wykonać operację dopiero po zwolnieniu rezerwacji przewozu. Trzeba również sprawdzać przyszłe rezerwacje montażu; sama bieżąca lista wolnych osób nie wystarcza.
10. Jeżeli nie istnieje dostatecznie długie okno lub brakuje danych, harmonogram zwraca wyjaśnioną odmowę. Nie pomija wymagania i nie produkuje częściowego wyniku przedstawionego jako kompletny.

## Decyzja przed implementacją

**1A — etapowy model dostępności (rekomendowany):** osoby i urządzenia to wyłączne zasoby dostępności na jawnie dopuszczonych trasach, rezerwowane przez cały przewóz. Nie modeluje się ich lokalizacji ani przejazdów bez ładunku. UI i raport jawnie opisują to uproszczenie; wynik nie stanowi fizycznego harmonogramu ruchu wózka. Użytkownik musi świadomie dopuścić ten zakres. Późniejsze fizyczne dojazdy wymagają odrębnego kontraktu i danych.

**1B — fizyczny ruch wózków od początku:** każde mobilne urządzenie ma początkową lokalizację, zdarzenia ruchu i wymagane skierowane trasy dojazdu bez ładunku ze źródłami czasu. Dojazd oraz przewóz nie mogą nakładać się z inną rezerwacją urządzenia. Brak dojazdu nie oznacza teleportacji lub zerowego czasu. Trzeba ustalić również zakres dojazdów osób oraz to, czy po rozładunku zasób pozostaje w celu czy wraca; nie wolno tego wywnioskować z nazwy „wózek”. To dodatkowy pakiet modelu ruchu przed odbiorem harmonogramu.

Oba warianty powyżej proponują rezerwację osób i urządzeń przez cały przewóz. Zwolnienie osoby po załadunku albo wykorzystanie jej wyłącznie do rozładunku wymaga jawnego przypisania faz i osobnego uzgodnienia. Przenośniki o przepływie ciągłym, przewozy wielu sztuk oraz bufory wejścia/wyjścia nie należą do tej propozycji; ich pojemności i reguł nie dopowiadamy.

Zgodnie z `AGENTS.md`, Execution and checkpoint policy: „Stop for user review when ... multiple valid domain interpretations remain unresolved”. Decyzja 1A/1B rozstrzyga fizyczne dojazdy i może istotnie zmienić harmonogram. Samo polecenie kontynuacji nie wskazuje wariantu.

## Pakiety

- **3.4.1 / 3.4a:** inwentaryzacja, propozycja kontraktu, ograniczenia i kryteria odbioru. Zadanie dokumentacyjne zakończone; wybór domenowy oczekuje na użytkownika.
- **3.4.2:** po decyzji backup, typy, parser, bezpieczny zapis, referencje osób/wyposażenia i kalendarze urządzeń. Dla 1B także kontrakt lokalizacji/dojazdów przed integracją. Szkic z nowymi wymaganiami odmawia harmonogramu do czasu ich rzeczywistej obsługi.
- **3.4.3:** wspólne rezerwacje, wybór wykonalnego zestawu, oczekiwanie i wyniki workera; ręcznie policzalne scenariusze i regresja dawnych wyników.
- **3.4.4:** edytor, inspekcja oczekiwania i przydziałów, historia, zapis/odczyt oraz dwa niezależne procesy w UI. Dopiero wtedy odbiór głównego 3.4.

## Wymagane dowody

- Dwa korpusy rywalizujące o jeden egzemplarz: brak nakładania; drugi oczekuje, jego czas przewozu nie rośnie. Dwa zadeklarowane egzemplarze pozwalają na równoległość wyłącznie przy dostępności wszystkich pozostałych zasobów.
- Ta sama osoba w montażu i transporcie: brak nakładania także z przyszłą rezerwacją montażu; po zwolnieniu może przejąć inne zadanie.
- Jawne kalendarze i przerwy: przewóz mieści się w ciągłym oknie; brak okna daje odmowę. Zmiana i przerwa nie tworzą ukrytego czasu dojazdu.
- Zestaw osoba + wózek: atomowość, bez porzuconych rezerwacji przegranej alternatywy; zmiana dostępności może zmienić wybór kopii według obecnych reguł.
- Nieznane/powtórzone ID, usunięcie używanej osoby/urządzenia, brak reguły i sprzeczne role wyposażenia: odmowa bez nadpisania oryginału.
- Brak nowych reguł: pełna zgodność starych wyników, migracji i źródeł 4/5. Nowy zapis: odczyt, Cofnij/Ponów i worker zachowują wymagania.
- Dla 1B dodatkowo: ręczna trasa bez ładunku, brak teleportacji, odmowa brakujących dojazdów, jeden stan lokalizacji urządzenia i wyłączność wszystkich jego ruchów.

Nie wpisano żadnych rzeczywistych prędkości, czasów, liczby transportowców ani urządzeń. Te dane podaje użytkownik dla własnego procesu.

## Zatwierdzenie 1B i rdzeń wykonawczy — 2026-10-09

Użytkownik wybrał 1B. Rejestr `transportState.ts` jest niezależnym, nietrwałym modelem wykonawczym wózków, jeszcze poza harmonogramem i parserem projektu. Tożsamość egzemplarza pochodzi z istniejącego `equipmentId`; egzemplarz nie może równocześnie być wyposażeniem operacji/stałej kopii. Deklaracja wymaga początkowej kopii i jawnego kalendarza. Miejsca są kopiami stanowisk, bez domyślnych magazynów ani współrzędnych 3D.

Początek ruchu wymaga aktualnej lokalizacji zgodnej z początkiem skierowanej trasy, dodatniej długości ze źródłem i potwierdzeniem oraz jawnego czasu zgodnego z 3.3. Ruch `empty`/`loaded` ma start i koniec; w czasie ruchu urządzenie nie znajduje się na żadnym końcu. Przyjazd ma dokładny czas i ustawia cel. Ewentualny powrót wymaga kolejnego jawnego ruchu — sam rejestr nie określa polityki automatycznego powrotu. Wyłączne rezerwacje osób, przydziały do korpusów i wybór tras pozostają do integracji.

Historycznie przed integracją zadano pytania o powrót wózka i zakres dojść osób. Późniejsze doprecyzowanie użytkownika zawęziło zakres do montażu i wyłączyło pracę magazynierów (sekcja na początku dokumentu). Nie zapisano domyślnych reguł powrotu ani dojść w projekcie. Status 3.4.2: w trakcie.

## Kontrakt zapisu 3.4d / 3.4.2 — 2026-10-09

Opcjonalne pole `assemblyTransport` w szkicu 6: scope zawsze `assembly-only`; jawne listy carts, conveyors, emptyRoutes i routes. Brak pola zachowuje dotychczasowe zachowanie. Listy mają maksymalnie 500 wpisów; częściowe definicje są dozwolone, lecz nieznane pola/referencje i sprzeczne wymagania nie są dozwolone.

Cart: equipmentId istniejącego egzemplarza, initialLocation stationId/copy, calendar zmian i przerw, afterUnload `stay-at-destination` albo `return-to-initial` oraz źródło reguły. Obie polityki są wyborem użytkownika w danych, żadna nie jest domyślna. Egzemplarz wózka nie może być równocześnie wyposażeniem operacji lub stałej kopii. Conveyor: equipmentId, jawne from/to kopie i calendar; wymaganie trasy musi odpowiadać jego skierowanym końcom, bez automatycznej osoby.

EmptyRoute: id, equipmentId zadeklarowanego wózka, from/to kopie, distanceMm > 0, basis confirmed, source oraz dokładnie jeden jawny tryb czasu z 3.3. Nie kopiuje czasu przewozu z ładunkiem. Para equipmentId/from/to i ID muszą być unikalne; brak trasy zwrotnej niczego nie tworzy. Wszystkie końce dotyczą montażu, nie magazynu.

Route requirement: istniejące stationRouteId z czasem, source i niepusta lista alternatives. Każda alternatywa ma obowiązkowe listy workerIds i equipmentIds z istniejącymi, niepowtórzonymi ID. Puste listy są jawnym brakiem wymagań; nie powstają z brakujących pól. Powtórzony zestaw zasobów jest odrzucany także przy innej kolejności ID. Osoby odnoszą się do wspólnego rejestru montażu, bez tworzenia personelu magazynu. Kolejność alternatyw jest przechowywana.

Parser projektu sprawdza całość także przy usuwaniu osób, urządzeń i tras. `editDomainAssemblyTransport` zastępuje/usuwa pole przez ponowną walidację bez mutacji. Zapis pozostaje addytywny w szkicu 6; migracja źródeł 4/5 nie aktywuje niezweryfikowanego assemblyTransport z importu i zachowuje dokładne originalJson. Nie zmieniono numeru schematu; obsługa dotyczy bieżącego wydania, nie gwarantuje działania nowych pól w starszym kodzie aplikacji.

Do czasu 3.4.3 każda obecność tego kontraktu powoduje jawną odmowę harmonogramu, także w workerze. To zapis do przygotowania integracji, nie działający model dostępności. Nie wdrożono jeszcze wyłączności osób transportujących, wyboru zestawów, ruchów wynikających z afterUnload ani uzupełniania materiału. UI edycji pozostaje w 3.4.4. Status 3.4.2: wdrożone w zakresie kontraktu/parsera/zapisu; cały 3.4 w trakcie.

## Rdzeń rezerwacji 3.4e / część 3.4.3 — 2026-10-09

`assemblyMovement.ts` atomowo łączy pojedynczy fizyczny odcinek z rejestrem `WorkerReservationBook` używanym przez montaż. Przewóz wskazuje istniejącą trasę i numer jawnej alternatywy z dokładnie jednym wózkiem. Pozostałe zestawy, przenośniki i automatyczny wybór alternatywy nie są jeszcze wykonywane. Dojazd wskazuje osobną emptyRoute i jawne workerIds oraz assignmentSource w żądaniu wykonawczym; obsada dojazdu nie jest dziedziczona z przewozu. Zapis takiej obsady dojazdu do formularza/kontraktu pozostaje do dalszej integracji; żadna osoba nie jest dopowiadana.

Osoby wybranego odcinka wymagają jawnych kalendarzy. Ruch jest nieprzerywany i musi zmieścić się we wspólnym ciągłym oknie urządzenia/osób. Szukanie czasu uwzględnia wszystkie istniejące rezerwacje osób, również przyszłe rezerwacje montażu, a nie tylko bieżące zajęcie. Wynik oddziela waitSeconds i przyczyny workers/calendar od rzeczywistego przedziału ruchu. Busy lub niewłaściwie zlokalizowany wózek daje odmowę do przyjazdu/wcześniejszego jawnego dojazdu, bez domyślnego przemieszczenia.

Rezerwacja nie mutuje wejściowych książek. Zakończenie przyjmuje aktualne książki, zachowuje rezerwacje innych prac dodane po rozpoczęciu ruchu i kontroluje zgodność z kończonym ruchem; nie nadpisuje rejestru starą migawką. Te API stanowią rdzeń dla przyszłej kolejki zdarzeń, nie już aktywny harmonogram. Automatyczne powroty afterUnload i kolejność zdarzeń korpusu/celu czekają na integrację. Guard 3.4.3 nadal zapobiega pomijaniu nowych wymagań przez obecny harmonogram.

## Integracja przewozu 3.4f / część 3.4.3 — 2026-10-09

Harmonogram używa teraz jawnych wymagań dla rzeczywiście wybieranych tras fizycznego korpusu. Wspólny rejestr osób obejmuje również zadeklarowane osoby transportu spoza wybranego zespołu operacji; to wciąż osoby montażowe, bez magazynierów. Osoby transportu wymagają jawnych kalendarzy. Preview wybiera najwcześniejszy wykonalny przewóz, przy remisie zachowując kolejność alternatyw; potem dotychczasowe reguły wybierają kopię operacji według startu i trasy. Niewybrany wariant nie publikuje żadnej rezerwacji. Konflikty przyszłej obsady operacji uwzględniają już wybrane rezerwacje przewozu.

Dopuszczone są jawne zestawy osób, przenośników oraz najwyżej jednego wózka w zestawie. Przenośniki rezerwują konkretne egzemplarze; wózek musi faktycznie znajdować się przy początku trasy i po przyjeździe pozostaje w celu. Kolejka zwalnia osoby i aktualizuje położenie wózka w czasie przyjazdu; korpus zachowuje własne zdarzenia ruchu, a cel jest rezerwowany od wyjazdu do końca operacji. Przy odłożonym wyjeździe przewóz jest ponownie planowany przy zdarzeniu wybudzenia, bez przedwczesnego przejęcia zasobów/celu.

Wynik dodaje transport.workerIds/equipmentIds, transportReservations oraz cartBook. UI pokazuje przydzielone osoby/urządzenia i przyczynę oczekiwania transport. Starszy kontrakt bez assemblyTransport zachowuje dotychczasowy kształt i wyniki.

Nie obsługujemy jeszcze fizycznego transportu podzespołów, dojazdu wózka do innego miejsca odbioru, zestawu wielu wózków i polityki return-to-initial. Nieobsłużone powroty oraz brak wymaganego dojazdu wywołują odmowę, nie teleportację lub ich pominięcie. API rezerwacji pojedynczego dojazdu z 3.4e pozostaje rdzeniem do następnej integracji; zapis jego jawnej obsady wymaga następnego zakresu. Cały 3.4.3 pozostaje w trakcie.
