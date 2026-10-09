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
