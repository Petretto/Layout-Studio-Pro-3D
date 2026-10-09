# Zasoby transportowe — propozycja 3.4a / 3.4.1

Data: 2026-10-09. Status: propozycja do przeglądu użytkownika. Nie jest aktywnym kontraktem zapisu ani zmianą harmonogramu.

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
