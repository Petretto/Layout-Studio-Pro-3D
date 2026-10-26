# Model buforów i zaopatrzenia materiałowego (PLAN 3.5)

## 1. Cel i zakres
Dokument definiuje kontrakt danych dla punktu **3.5** (`PLAN_ROZWOJU.md`):
- Ograniczona pojemność buforów stanowisk (wejściowych i wyjściowych) oraz reguły blokowania i zwalniania stanowisk.
- Zaopatrzenie montażu materiałami: jawny zapas początkowy, zużycie, wielkość partii dostawy oraz harmonogram/częstotliwość dostaw, zapewniające ciągłość produkcji bez przerw.
- **Bez modelowania czasu, kalendarzy, obciążenia czy rezerwacji operatorów magazynu** (zgodnie z decyzjami 2026-10-09 i AGENTS.md).
- **Bez wyprowadzania parametrów zaopatrzenia automatycznie z BOM czy transportu** — wartości są jawne i sprawdzalne.

## 2. Model buforów stanowisk (`StationBuffersV6`)
Pojemność bufora określa maksymalną liczbę jednostek wyrobów/korpusów, które mogą oczekiwać przed rozpoczęciem operacji (bufor wejściowy) lub po jej zakończeniu przed przekazaniem do kolejnego etapu (bufor wyjściowy).

### 2.1. Kontrakt struktury
Każdy wpis w rejestrze konfiguracji buforów dotyczy konkretnego stanowiska (i opcjonalnie konkretnej kopii stanowiska):
- `stationId`: identyfikator istniejącego stanowiska w `project.stations`.
- `copy`: numer kopii (jeśli stanowisko ma ich kilka) lub `null` (gdy konfiguracja dotyczy wszystkich kopii danego stanowiska).
- `inputCapacity`: maksymalna liczba jednostek w buforze wejściowym (`null` oznacza bufor nieograniczony, domyślny). Gdy podana: liczba całkowita $\ge 0$.
- `outputCapacity`: maksymalna liczba jednostek w buforze wyjściowym (`null` oznacza bufor nieograniczony, domyślny). Gdy podana: liczba całkowita $\ge 0$.
- `blockingPolicy`: reguła blokowania stanowiska przy zapełnieniu bufora wyjściowego:
  - `'bbas'` (Blocking Before Service / Brak miejsca na wyjściu uniemożliwia zwolnienie gniazda po zakończeniu operacji; stanowisko i ewentualne urządzenia/narzędzia pozostają zajęte dopóki bufor nie zwolni miejsca).
  - `'bbas-worker-released'` (Stanowisko i korpus są zablokowane na stanowisku, lecz operator zostaje zwolniony do innej pracy, o ile technologia nie wymaga jego stałej obecności).
  Domyślnie: `'bbas'`.

### 2.2. Inwarianty i walidacja
1. `stationId` musi istnieć w projekcie.
2. Jeśli `copy` jest określone, musi mieścić się w zakresie $1 \dots \text{parallelStations}$.
3. Wartości pojemności (`inputCapacity`, `outputCapacity`) muszą być liczbami całkowitymi $\ge 0$ lub `null` (brak limitu).
4. Nie dopuszcza się duplikatów konfiguracji dla tej samej pary `(stationId, copy)`.
5. Brak konfiguracji dla stanowiska oznacza brak ograniczeń pojemności (wsteczna kompatybilność ze wszystkimi istniejącymi projektami).

---

## 3. Model zaopatrzenia materiałowego (`MaterialSupplyV6`)
Zaopatrzenie montażu modeluje dostępność komponentów/materiałów przy stanowiskach montażowych.

### 3.1. Zasady domenowe
- Zgodnie z AGENTS.md: magazynierzy nie mają kalendarzy, rezerwacji ani czasu pracy.
- Zaopatrzenie to czysta dostępność materiałowa:
  - Zapas początkowy na stanowisku/punkcie (ilość dostępna w chwili $t = 0$).
  - Zużycie na sztukę wyrobu / operację.
  - Dostawy uzupełniające: każda dostawa zwiększa stan zapasu o określoną wielkość partii w określonym czasie (harmonogram dostaw cyklicznych lub jawna lista zdarzeń dostaw).
- W chwili startu operacji wymagającej materiału:
  - Sprawdzany jest bieżący stan zapasu.
  - Jeśli zapas jest wystarczający: materiał jest atomowo pobierany w ilości jednostkowej, a operacja rozpoczyna pracę.
  - Jeśli zapas jest niewystarczający: operacja przechodzi w stan oczekiwania na materiał (do nadejścia kolejnej dostawy uzupełniającej).
- Tryb JIT („Symulacja bez transportu — wszystko dostępne just in time”):
  - W trybie JIT zaopatrzenie materiałowe jest traktowane jako zawsze dostępne bez opóźnień.

### 3.2. Kontrakt struktury
- `items`: lista konfiguracji zaopatrzenia komponentów:
  - `id`: unikalny identyfikator wpisu.
  - `componentId`: identyfikator komponentu (np. z BOM lub unikalna nazwa materiału).
  - `targetStationId`: identyfikator stanowiska odbiorczego.
  - `initialStock`: zapas początkowy (liczba $\ge 0$).
  - `unit`: jednostka miary (np. `szt.`, `kg`).
  - `deliverySchedule`:
    - `kind: 'periodic'`: `batchQuantity` (wielkość partii dostawy $> 0`), `intervalSeconds` (częstotliwość/odstęp dostaw $> 0$), `firstDeliverySeconds` (czas pierwszej dostawy $\ge 0$).
    - `kind: 'explicit-deliveries'`: lista dostaw `{ deliveryTimeSeconds: number; quantity: number }`.
  - `source`: opis źródła danych (wymóg identyfikowalności danych).

### 3.3. Inwarianty i walidacja
1. Unikalne ID wpisów.
2. `targetStationId` musi wskazywać istniejące stanowisko.
3. Wielkości dostaw i zapasów nie mogą być ujemne.
4. Zgodność z projektami ze starszych szkiców: pole `materialSupply` jest opcjonalne w `DomainProjectV6`. Brak pola oznacza, że materiały są zawsze dostępne (dotychczasowe zachowanie).

---

## 4. Zakres wdrożenia w pakietach
- **3.5a (ten pakiet):** definicja typów TypeScript, schemat, parsery walidacji, odmowy przy błędnych danych, testy kontraktu, integracja w `DomainProjectV6` i `prepareDomainMigration`.
- **3.5b:** obsługa blokowania buforów i zużycia zapasów w rdzeniu symulacji (`simulation.ts` / worker), raportowanie czasu blokady i braku materiału.
- **3.5c:** edytor w UI Studio, historia operacji (undo/redo), testy w przeglądarce i aktualizacja dokumentacji.


## 5. Przegląd po 3.5a i zatwierdzone reguły — 2026-10-14
Powyższy kontrakt 3.5a pochodzi z pracy Gemini i pozostaje historią pierwszej propozycji. Użytkownik zatwierdził 2026-10-14: jawne zużycie materiału dla operacji, pobranie całości przy faktycznym starcie oraz dostawę przed pobraniem przy równym czasie. Terminy dostaw, także pierwszej cyklicznej, mają być jawne. Bufor wyjściowy blokuje PO zakończeniu przetwarzania: wyrób i stanowisko/wyposażenie pozostają zajęte do zwolnienia miejsca, a konfiguracja jawnie rozstrzyga zatrzymanie/zwolnienie operatora. Nazwa „Blocking Before Service” w sekcji 2.1 nie opisuje tej zatwierdzonej reguły; etykiety bbas z pierwszego kontraktu nie mogą same przesądzać zachowania silnika.
Przed integracją trzeba uzupełnić kontrakt jawnego zużycia (referencje operacji, ilości i jednostki), określić zakres punktu zapasu/kopii i buforów oraz ochronę odczytu istniejących szkiców. Obecny kontrakt zaopatrzenia nie ma zużycia. Walidator 3.5a dopuszcza brak firstDeliverySeconds i wylicza lokalnie zero; nie jest to zatwierdzone założenie do symulacji. Zachowujemy stare dane odczytywalne, ale fizyczna symulacja nie może z nich wywnioskować dostawy w 0 s. Faktyczna nazwa pola w kodzie to schedule, nie deliverySchedule z sekcji 3.2. Referencja componentId pozostaje dziś tylko tekstem; nie ma potwierdzonej referencji do rejestru materiałów.

## 6. Pakiet 3.5a1 — jawne odmowy do integracji
Przed 3.5b harmonogram i worker odmawiają wyniku dla niepustego materialSupply w trybie skonfigurowanym. JIT jest jawną opcją zakładającą dostępność materiału. Bufory z jakąkolwiek ograniczoną pojemnością, również 0, powodują odmowę w obu trybach: JIT nie jest zgodą na ignorowanie ograniczeń stanowisk. Puste kontrakty oraz jawne null pojemności zachowują dotychczasowe wyniki. Parser i zapis nie zostały zaostrzone, żadne istniejące deklaracje nie są usuwane ani migrowane. Zmiana chroni przed pozornym uwzględnieniem danych, a nie wdraża zapasów czy blokowania.
Następny zakres 3.5b: najpierw kompletny jawny kontrakt zużycia/terminów i rejestr dostępności, potem integracja z faktycznym startem i kolejką zdarzeń. Bufory wymagają osobnego spójnego zakresu miejsc oczekiwania oraz zajęcia/zwolnienia zasobów. Nie liczymy pracy magazynierów. Główne 3.5 pozostaje w trakcie.


## 7. Zaopatrzenie wykonawcze 3.5b1 — 2026-10-14
Dodano opcjonalne materialSupply.consumptions: listę `{operationId, supplyId, quantity, source}`. Ilość jest dodatnia/skończona, w jednostce wskazanej przez referencjonowaną pozycję zaopatrzenia; nie ma automatycznej konwersji ani wartości z BOM. Operacja i supplyId muszą istnieć, para nie może się powtarzać. componentId pozostaje jawnym identyfikatorem/nazwą materiału, a wykonawcza referencja korzysta z trwałego supplyId. Każda aktywna pozycja zaopatrzenia wymaga przynajmniej jednego jawnego zużycia. Zapas pozycji przy targetStationId jest wspólny dla kopii tego stanowiska; operacja nie pobiera go z innego stanowiska. Oddzielne supplyId oznaczają oddzielne deklaracje zapasu, bez cichego scalania.
Pierwszy termin cykliczny pozostaje opcjonalny tylko dla odczytu starych kontraktów. Walidator nie tworzy już domyślnego zera; wykonanie wymaga jawnego terminu. Stary kontrakt bez consumptions jest odczytywalny i zachowuje raw, lecz symulacja skonfigurowana wyjaśnia konieczność uzupełnienia danych. Nie zmieniono wersji schematu, klucza zapisu ani oryginałów 4/5; to opcjonalne rozszerzenie szkicu 6. Nie dodano nowych pól do migracji źródeł 4/5 — kontrakt nadal nie jest z nich dopowiadany.
MaterialStockRun utrzymuje zapas i osobne rezerwacje pobrań. Sprawdzenie wariantu jest odczytowe; dopiero przydzielona operacja rezerwuje całą ilość swoich materiałów. Faktyczne pobranie następuje przy jej starcie, również po transporcie/przerwie/kalendarzu. Przyszłe przydzielone pobrania pozostają chronione przed przejęciem zapasu przez inne wykonanie. Zestaw materiałów jest pobierany atomowo, bez ujemnego zapasu i bez podwójnego pobrania. Dostawy w tym samym czasie są doliczane przed pobraniem. Zdarzenia zużycia nie rezerwują magazynierów.
Niedobór przesuwa start do jawnej dostawy; niewystarczający skończony harmonogram odmawia kompletnego wyniku z identyfikacją materiału. Dostawy cykliczne są wyznaczane arytmetycznie, bez nieskończonej kolejki. Między zdarzeniami procesu inspekcja grupuje je z liczbą, pierwszym/ostatnim terminem i łączną ilością. Bilans obejmuje dostawy do końca produkcji, nie późniejsze powroty wózków. Liczba dostaw/czas/ilość muszą mieścić się w bezpiecznym/skończonym zakresie; przekroczenie jest raportowane. Działania na ilościach i cyklicznych terminach wykorzystują dziesiętne wartości deklaracji, aby nie kumulować typowych błędów binarnych (0,3 przy trzech pobraniach 0,1).
Wynik zawiera materialStocks/materialEvents oraz przyczynę material. UI pokazuje zapas początkowy, dostarczono/pobrano/pozostało i zdarzenia. JIT omija rejestr dostępności i nadal jawnie zakłada materiał dostępny. Brak/puste kontrakty zachowują dawne wyniki. Pełny edytor zaopatrzenia pozostaje do 3.5c; dane tego zakresu są dostępne przez API/zapis szkicu. Ograniczone bufory nadal powodują odmowę do integracji 3.5b2. Pojemność składowania, odpady, zwroty i analiza optymalnej częstotliwości dostaw nie są deklarowane jako wdrożone.


## 8. Rejestr miejsc buforowych 3.5b2a — 2026-10-14
Użytkownik zatwierdził: copy=null oznacza osobne pojemności każdej kopii; nakładanie konfiguracji wszystkich kopii z konkretną wymaga usunięcia konfliktu. Miejsce docelowe ma być rezerwowane przed wyjazdem. Pojemność 0 oznacza przekazanie bez oczekiwania do gotowej operacji.
Dodano niezależny wykonawczy bufferState.ts: wejście/wyjście konkretnej kopii, jawna pojemność, ID jednostek i chronologiczne zdarzenia. createBufferBook zaczyna od pustego rejestru, bez dopisywania WIP/korpusów/materiałów. Rozwija copy=null na osobne kopie i wymaga jawnej liczby kopii. Wykonawczo odrzuca nakładające deklaracje oraz brak jawnej polityki dla ograniczonego wyjścia; starszy parser/zapis pozostaje odczytywalny i nie jest zaostrzany.
Rezerwacja liczy się do pojemności przed przyjazdem. Jednostka może mieć jedną lokalizację źródłową i jedną obietnicę celu, nie dwie lokalizacje fizyczne. Wyjazd zwalnia źródło, cel pozostaje zarezerwowany; przyjazd zamienia rezerwację w obecność bez zmiany zajętości. Wyjście do operacji zwalnia miejsce. Anulowanie niewykorzystanej rezerwacji jest odwracalne, ale nie można odebrać celu jednostce już w ruchu. Zdarzenia są niemutujące i nie cofają czasu. ID są podawane jawnie; moduł nie tworzy instancji z geometrii lub definicji wyrobu.
Pełne wyjście zwraca deklarację blokady stanowiska i wyposażenia oraz stan zatrzymania operatora według jawnej polityki. Nie przedłuża jeszcze faktycznych rezerwacji harmonogramu. Dla pojemności 0 nie powstaje miejsce oczekiwania; osobne zapytanie wymaga jawnej informacji, że operacja jest gotowa do przekazania bez oczekiwania. Nie wyznacza ani nie dopowiada jej gotowości. Kolejność produkcji, czas ruchu i lokalizacja korpusu pozostają odpowiedzialnością kolejki zdarzeń.
To fundament, nie aktywna symulacja ograniczonych buforów. Harmonogram zachowuje odmowę do integracji 3.5b2b, która musi połączyć miejsca, zdarzenia zakończenia/przekazania, lokalizacje korpusów i faktyczne rezerwacje stanowisk/wyposażenia/osób. Zapis, UI i wynik zaopatrzenia bez zmian.


## 9. Blokowanie w podglądzie procesu JIT — 3.5b2b, 2026-10-14
Dodano oddzielną ścieżkę ograniczonych buforów wyłącznie po jawnym włączeniu JIT. Pierwszy zakres obejmuje jeden liniowy ciąg operacji i jedną dopuszczoną kopię dla każdej operacji. Nie wykonuje fizycznych przewozów, zgodnie z JIT, ani nie tworzy lokalizacji korpusów z geometrii. Bufory zawierają identyfikatory logicznych sztuk żądanej partii. Wszystkie źródłowe role/korpusy/transport/dostawy pozostają zapisane i nienaruszone.
Stan wykonania rozdziela zakończenie przetwarzania od zwolnienia miejsca. Gdy wyjście jest pełne, stanowisko i wyposażenie pozostają zajęte; bbas zatrzymuje osoby, a bbas-worker-released pozostawia ich zwolnienie według profilu. Rezultat dodaje stationReleaseSeconds i blockedSeconds. Nie wydłuża czasu technologicznego endSeconds/workWindows. Zatrzymanie jest czasem rezerwacji/blokady, a nie dopisanym czasem pracy manualnej. Stanowisko, jego wyposażenie i zatrzymane osoby nie mogą być przejęte przez następne wykonanie. Podgląd z polityką zatrzymania operatora wymaga w tym zakresie pełnej obecności przez wszystkie operacje; częściowe i przyszłe obecności nie są dopowiadane, a nieobsłużony wariant odmawia z wyjaśnieniem.
Bufor wejściowy i wyjściowy są osobne, pojemność uwzględnia rezerwację. Przy logicznym przekazaniu do dodatniego bufora wejściowego najpierw rezerwujemy miejsce, potem zwalniamy źródło i potwierdzamy przyjazd w tym samym czasie (transport jawnie pominięty w JIT). Wejście 0 dopuszcza przekazanie tylko do gotowej operacji. Wyjście 0 nie przechowuje sztuki: oczekuje ona na stanowisku do bezpośredniego przekazania do gotowej operacji lub dostępnego wejścia odbiorcy. Dodatnie pełne wyjście zatrzymuje zakończoną sztukę do zwolnienia miejsca. Gotowe sztuki są uporządkowane według gotowości i numeru sztuki. Nowe operacje rozpoczynają się dopiero przy faktycznej gotowości, bez przedwczesnego zajęcia kopii na przyszły kalendarz.
Końcowy bufor wyjściowy musi pozostać nieograniczony w tym pierwszym zakresie: odbiór gotowych sztuk nie jest dopowiadany. Ograniczone wyjście końcowe, gałęzie, wiele kopii do wyboru i fizyczny przebieg z buforami odmawiają zamiast pomijać ograniczenia. Brak okna/zakleszczenie nie publikuje częściowego wyniku. Brak lub nieograniczone bufory nadal korzystają z poprzedniego silnika, bez zmiany wyników. Wspólny projectWork przeniesiono do workProjection.ts bez zmiany algorytmu; używają go oba przebiegi.
UI pokazuje czas pracy, zwolnienie i blokadę oraz zdarzenia buforów w oddzielnej inspekcji. Pełny formularz jest nadal w 3.5c. Kolejny 3.5b2c ma objąć połączenie z fizycznym transportem/lokalizacjami i dalsze zakresy profili; nie uznajemy ograniczonych buforów w trybie skonfigurowanym za wdrożone.


## 10. 3.5b2c1 — atomowy korpus/bufor i pojedynczy przewóz (2026-10-14)
Wykonano wewnętrzną podstawę 3.5b2c: `bufferedBodyState.ts` wiąże token bufora z jawnym ID korpusu. Strona wejście/wyjście doprecyzowuje lokalizację w kopii stanowiska; nie powstaje druga niezależna lokalizacja fizyczna ani nowy schemat zapisu. Zakończenie operacji i wejście do dodatniego/nieograniczonego wyjścia są atomowe. Pełne wyjście odmawia całej zmiany: korpus pozostaje zajęty, a późniejsze zwolnienie po blokadzie musi wykonać harmonogram. Nie dopisujemy zapasu początkowego.
Rezerwacja wejścia odbiorcy nie zwalnia wyjścia źródłowego. Dopiero rzeczywisty wyjazd usuwa zajęcie źródła i rozpoczyna ruch korpusu; miejsce celu pozostaje zajęte przez obietnicę przyjazdu. Przyjazd zmienia obietnicę w zajęcie, a start operacji atomowo usuwa korpus z wejścia i rezerwuje go do pracy. Nie można anulować celu w ruchu, cofnąć czasu, zająć ostatniego obiecanego miejsca ani zaakceptować sprzecznego korpusu/bufora.
`bufferedAssemblyMovement.ts` składa ten rejestr z istniejącym pojedynczym przewozem wózka i wspólnym rejestrem osób montażu. Odmowa miejsca, kalendarza, obsady lub ruchu nie publikuje połowy przydziału. Czasy i pochodzenie pochodzą z jawnej trasy. Kandydat z późniejszym startem jest publikowany dopiero przez przyszły harmonogram w chwili startu; oczekiwanie nie jest skróceniem jazdy. Zakończenie korzysta z aktualnych wspólnych rejestrów, chroniąc zdarzenia innych korpusów i nowsze rezerwacje osób.
To moduły wewnętrzne, jeszcze bez podłączenia do `scheduleWorkerRun`. Nie odbieramy aktywnej symulacji buforów fizycznych. Pojemność 0 wymaga przyszłego wspólnego przydziału gotowej operacji/osób/wyposażenia, dlatego adapter odmawia przechowywania sztuki w takim buforze. Zestawy wózków, dojazdy/powroty, bezpośrednie przekazanie, blokady stanowisk/osób i zaopatrzenie pozostają do integracji 3.5b2c2; istniejące aktywne reguły 3.4 i JIT nie zostały zmienione.


## 11. 3.5b2c2 — aktywny transport z dodatnimi buforami (2026-10-15)
`scheduleWorkerRun` uruchamia fizyczną kolejkę buforów dla jawnego ciągu operacji na korpusie: jedna dopuszczona kopia każdej operacji, różne kolejne kopie, jawne korpusy początkowo przy pierwszej kopii, jawne zasoby i czasy transportu montażowego. Bufory używają rzeczywistych ID korpusów. Przybycie sztuki dopuszcza ją do wejścia pierwszej kopii w granicach pojemności; deklaracje nie są zamieniane w domyślny zapas początkowy. Nie zmieniamy schematu projektu ani zapisanych konfiguracji.
Korpus po zakończeniu pracy trafia do wyjścia albo pozostaje na zajętym stanowisku i wyposażeniu do zwolnienia miejsca. Polityka bbas utrzymuje także osobę; bbas-worker-released zachowuje zwolnienie według profilu. Przy zablokowanym korpusie nie wolno użyć tej osoby do transportu. Zakleszczenie lub brak wykonalnego okna odmawia całego wyniku. Nie deklarujemy optymalności kolejki ani automatycznego rozwiązywania zakleszczeń. W fizycznej fazie przydziału gotowe wyjścia są rozpatrywane przed nową pracą; w ramach tej grupy pozostaje kolejność gotowości/numeru sztuki. JIT zachowuje dotychczasową kolejność.
Transport jest odrębnym zdarzeniem: bufor docelowy musi mieć miejsce przed załadowanym wyjazdem; źródło zwalnia się przy wyjeździe, a wejście pozostaje zajęte do faktycznego startu operacji. Przyjazd może poprzedzać wolny kalendarz stanowiska, dostępność osoby lub materiału. Nie rezerwujemy stanowiska obróbczego na czas oczekiwania w buforze. Zestawy korzystają z dotychczasowego previewAssemblyDispatch: dojazdy zawsze kolejno według equipmentIds, publikowany tylko pierwszy rzeczywisty dojazd, loaded po przyjeździe wszystkich. Zachowane alternatywy zestawów, przenośniki, wspólne osoby, kalendarze i jawne powroty z blokadą wózka do ich ukończenia. Przyszłego kandydata nie publikujemy z wyprzedzeniem: po obudzeniu ponownie sprawdzamy stan i miejsce.
Zaopatrzenie jest podłączone także w tym zakresie: jawne ilości, pobranie przy faktycznym starcie, dostawy przed pobraniem. Oczekiwanie na materiał nie powstrzymuje wcześniejszego przyjazdu do wolnego bufora. Końcowy bilans obejmuje horyzont produkcji, nie późniejszy powrót wózka. Brak rezerwacji magazynierów. JIT pozostaje opcją OFF domyślnie i omija transport oraz dostępność materiału, zachowując bufory i zasoby operacji.
Granice tego odbioru: dodatnie/nieograniczone wejścia i wyjścia, nieograniczone wyjście końcowe, pełna obecność wszystkich operacji przy jakiejkolwiek polityce zatrzymania osób, maks. 5000 wykonań. Pojemność 0, lokalne przekazanie kolejnych operacji tej samej kopii, gałęzie, wybór wielu kopii, partie podzespołów z buforami i odbiór ograniczonego wyjścia końcowego nadal jawnie odmawiają. Nie ograniczamy wcześniejszej obsługi tych konfiguracji bez ograniczonych buforów. Pojemność 0 i dalsze profile są kolejnym 3.5b2c3; formularze pozostają w 3.5c.
UI rozróżnia fizyczną inspekcję buforów od JIT, pokazuje przyjazdy, blokady, koniec pracy i zwolnienie oraz fizyczne ruchy urządzeń. Brak nowego zapisu/ustawienia ani zmiany wizualnego źródła prawdy.


## 12. 3.5b2c3 — bezpośrednie przekazanie przy pojemności 0 (2026-10-15)
W fizycznym zakresie pojedynczego ciągu/jednej kopii na operację obsługiwane są także wejście i wyjście 0. W buforze 0 nie powstaje token oczekiwania ani rezerwacja miejsca składowania. Początkowe wejście 0 dopuszcza jawny korpus bezpośrednio do gotowej operacji przy pierwszej kopii. Wyjście 0 utrzymuje korpus i stanowisko/wyposażenie po zakończeniu pracy do rzeczywistego wyjazdu; osoba pozostaje zajęta albo jest zwalniana zgodnie z zapisaną polityką. Osoba zatrzymana przy tym korpusie może przejść do loaded dokładnie przy zwolnieniu źródła, lecz nie może w tym czasie wykonywać wcześniejszego dojazdu bez ładunku.
Przed załadowanym wyjazdem do wejścia 0 przydzielamy przyszłe wykonanie odbiorcy: kopię, wyposażenie, konkretne osoby i ich przedziały, projekcję kalendarza oraz pobranie materiałów. Przedziały pracy i zajęcia kopii rozpoczynają się przy przyjeździe; sama obietnica jest zapisana w kolejce przed wyjazdem. Inne przydziały nie mogą jej przejąć. Materiał jest rezerwowany dla tej przyszłej chwili, a pobierany dopiero przy faktycznym przyjeździe/starcie, po dostawach o tym samym czasie. W czasie ruchu korpus ma jedynie stan moving; atomowy przyjazd/start nie tworzy stanu oczekiwania w zerowym wejściu. Błędny czas przyjazdu, brak gotowego odbioru lub sprzeczne rejestry nie publikują częściowego wyniku.
Gotowość w chwili przyjazdu, nie wcześniejszą gotowość w chwili wyjazdu, określa planDirectOperation. Późniejszy kalendarz, obecność lub dostawa przesuwa wyjazd. Znany koniec operacji na kopii/wyposażeniu pozwala zsynchronizować przyjazd tylko wtedy, gdy wyjście tej operacji jest nieograniczone i zwolnienie nie może być zablokowane. Przy skończonym wyjściu czekamy na rzeczywiste zwolnienie; nie zakładamy, że endSeconds oznacza dostępność stanowiska. Nie przewidujemy nieznanego końca blokady osób. Dopuszczona częściowa obecność przy polityce zwolnienia zachowuje przyszłe rezerwacje i chroni je także przed powrotem wózka. Dotychczasowe wymaganie pełnej obecności przy jakiejkolwiek polityce zatrzymania pozostaje.
Dojazdy zestawu nadal odbywają się kolejno według equipmentIds i nie rezerwują odbiorcy ani nie przemieszczają korpusu. Dopiero po ich ukończeniu wspólny loaded i przydział odbioru mogą zostać opublikowane. Wewnętrzny adapter pojedynczego przewozu z 3.5b2c1 nadal dotyczy dodatnich buforów; aktywny silnik korzysta ze wspólnego dispatch zestawów i rozszerzonego atomowego rejestru korpusu/bufora.
JIT pozostaje jawną opcją, domyślnie OFF; nie zmieniono jego założeń ani zapisu transportu. UI odróżnia fizyczne „Przekazanie bez oczekiwania” od logicznego przekazania JIT. Schemat projektu i format zapisu bez zmian, brak migracji. Nadal poza zakresem: kolejne operacje tej samej kopii, gałęzie/wybór wielu kopii, partie podzespołów z buforami, skończone wyjście końcowe bez jawnego odbioru oraz dalsze profile zatrzymania. Następny 3.5b2c4 — lokalne przekazania i dalsze profile. Nie deklarujemy optymalności harmonogramu ani automatycznego rozwiązywania zakleszczeń.


## 13. 3.5b2c4 — lokalna kontynuacja i profile obecności (2026-10-15)
Użytkownik zatwierdził: kolejne operacje na tej samej kopii nie wyprowadzają korpusu do buforów. Korpus, stanowisko i dotychczasowe wyposażenie pozostają zajęte do faktycznego startu kolejnej operacji. Zasady zapisano także w AGENTS.md. W aktualnym zakresie liniowym kończy to ograniczenie lokalnego przekazania: źródłowa operacja przechodzi w oczekiwanie lokalne, a przy gotowości osoby, nowego wyposażenia, materiału i kalendarza następuje atomowe release/reserve korpusu bez start-transfer/finish-transfer. Wejście/wyjście stanowiska nie jest używane pomiędzy takimi operacjami, nawet jeśli wejście zawiera już następną sztukę. Kolejna sztuka nie może przejąć zajętej kopii.
Osoba jest rezerwowana według profilu i nie otrzymuje dodatkowej pracy z samego lokalnego oczekiwania. Korpus/stanowisko/wyposażenie nadal pozostają zajęte. Wynik rozróżnia continuationWaitSeconds (lokalne oczekiwanie) od blockedSeconds (blokada pełnego wyjścia); stationReleaseSeconds poprzedniego wykonania oznacza przy kontynuacji granicę przekazania zasobów następnej operacji, nie wolne stanowisko między nimi. UI opisuje tę granicę jako przekazanie do kolejnej operacji i pokazuje osobne zdarzenia pozostania/kontynuacji. Po ostatniej operacji lokalnego ciągu dopiero działa zwykła pojemność wyjścia i ewentualny fizyczny transport do innej kopii. Proces całkowicie lokalny nie wymaga deklaracji zestawu ani trasy transportowej. JIT respektuje te same zajęcia kopii/wyposażenia, nadal bez fizycznej lokalizacji korpusu.
Zastąpiono globalny wymóg pełnej obecności wszystkich operacji warunkiem dotyczącym tylko wykonania mogącego zablokować wyjście z zatrzymaniem osoby. W takim wykonaniu osoba musi być obecna do końca przetwarzania, ale może rozpocząć obecność później. Operacje lokalne wewnątrz tego samego stanowiska, operacje ze zwolnieniem osoby i nieograniczonym wyjściem zachowują także wcześniejszy koniec obecności. Nadal nie zakładamy automatycznego powrotu osoby po wcześniejszym zakończeniu jej obecności do późniejszej blokady bbas.
Późniejsza/future obecność jest chroniona w obu ścieżkach przydziału (start na miejscu i wspólne planowanie przyjazdu do wejścia 0). Jeśli nowe wykonanie mogłoby zatrzymać osobę na nieznany czas, nie wolno go uruchomić przed już obiecaną późniejszą obecnością tej osoby, nawet gdy sam czas pracy mieściłby się przed obietnicą. Aktywna potencjalna blokada nie jest traktowana jak pewne przyszłe zwolnienie. Dopuszczamy konserwatywne oczekiwanie; nie deklarujemy optymalności kolejki.
Schematy projektu i zapis bez zmian. Lokalny zakres dotyczy silnika buforów uruchamianego przy ograniczonych pojemnościach; wcześniejsze ścieżki bez takich limitów pozostają bez przepisywania w tym pakiecie. Nadal poza odbiorem: gałęzie/wiele kandydatów kopii, partie podzespołów z buforami, ograniczony końcowy odbiór wyrobów oraz powrót osoby po przedwcześnie kończącym się profilu bbas. Główne 3.5 jest w trakcie. Następny 3.5c1 — formularz jawnych pojemności i polityk z historią oraz zapisem, bez rozszerzania zakresu silnika.


## 14. 3.5c1 — edytor buforów w UI Studio (2026-10-15)
Wprowadzono formularz `DomainBuffersEditor.tsx` wbudowany w panel Szkicu 6 (`DomainDraftPanel.tsx`), powiązany ze wspólną historią operacji Cofnij/Ponów, bezpośrednią walidacją i zapisem w `localStorage` pod kluczem szkicu 6.
Edytor umożliwia:
- Konfigurację buforów stanowisk: wybór stanowiska z listy istniejących w projekcie, wybór zakresu kopii („Wszystkie kopie osobno (copy=null)” lub konkretna kopia `1..parallelStations`).
- Jawne deklarowanie pojemności wejściowej i wyjściowej: przełącznik „Bez limitu (nieskończona)” oraz pole liczbowe dla pojemności skończonej ($\ge 0$, w tym 0 dla bezpośredniego przekazania/utrzymania korpusu).
- Wybór reguły blokowania wyjścia (`blockingPolicy`): `bbas` (zatrzymanie operatora na stanowisku do zwolnienia wyjścia) lub `bbas-worker-released` (zwolnienie operatora po zakończeniu przetwarzania).
- Walidację spójności: wykrywanie i odrzucanie duplikatów konfiguracji dla tej samej stacji i kopii, nakładających się deklaracji wszystkich i konkretnych kopii, ujemnych lub nieliczbowych pojemności oraz nieznanych stanowisk. Błędy walidacji są prezentowane w UI i uniemożliwiają zapis uszkodzonych danych.
- Bezpieczeństwo danych: odrzucenie niezapisanych zmian przywraca stan do poprzednio zapisanego kontraktu; przycisk „Usuń konfigurację buforów” pozwala jawnie usunąć deklarację buforów (`stationBuffers: undefined`).
- Integrację z symulacją: każda zmiana i zapis buforów automatycznie unieważnia stary wynik symulacji harmonogramu zespołu (remount panelu harmonogramu przez zmianę klucza draftu).
- Nienaruszanie dotychczasowych modeli: aktywne projekty v4/v5, format JSON i logika symulacji pozostają ściśle odizolowane i niezmienione.
Kolejny pakiet: 3.5c2 — formularz zaopatrzenia materiałowego montażu w UI.

## 15. 3.5c2 — edytor zaopatrzenia materiałowego montażu w UI Studio (2026-10-15)
Wprowadzono formularz `DomainSupplyEditor.tsx` wbudowany w panel Szkicu 6 (`DomainDraftPanel.tsx`), powiązany ze wspólną historią operacji Cofnij/Ponów, bezpośrednią walidacją kontraktu `MaterialSupplyV6` i zapisem w `localStorage` pod kluczem szkicu 6.
Edytor umożliwia:
- Konfigurację pozycji materiałowych (`MaterialSupplyItem`): unikalne ID, identyfikator komponentu/materiału (`componentId`), przypisanie do stanowiska docelowego (wybór z listy stanowisk projektu), zapas początkowy ($\ge 0$), jednostkę miary (np. `szt.`, `kg`) oraz źródło danych.
- Definiowanie harmonogramów dostaw (`SupplySchedule`):
  - Harmonogram cykliczny (`periodic`): wielkość partii dostawy (> 0), interwał dostaw (> 0) oraz opcjonalny jawny termin pierwszej dostawy ($\ge 0$).
  - Harmonogram jawnych dostaw (`explicit-deliveries`): dynamiczna lista pojedynczych dostaw z czasem dostawy ($\ge 0$) i ilością (> 0).
- Przypisywanie zużycia materiałów do operacji (`MaterialConsumptionV6`): wybór operacji z listy operacji projektu, wybór pozycji zaopatrzenia ze skonfigurowanych pozycji, ilość zużycia na wykonanie (> 0) oraz źródło danych zużycia.
- Pełną walidację spójności: wykrywanie i odrzucanie duplikatów ID zaopatrzenia, powtórzonych przypisań tej samej operacji i zaopatrzenia, ujemnych zapasów/ilości, nieznanych stanowisk lub operacji oraz pustych identyfikatorów. Błędy walidacji są prezentowane w UI i uniemożliwiają zapis uszkodzonego stanu.
- Bezpieczeństwo danych: odrzucenie niezapisanych zmian przywraca stan do poprzednio zapisanego kontraktu; przycisk „Usuń konfigurację zaopatrzenia” pozwala jawnie usunąć deklarację zaopatrzenia (`materialSupply: undefined`).
- Integrację z symulacją i unieważnienie wyników: zapis zaopatrzenia automatycznie aktualizuje klucz draftu (`key={supply-${draft.raw}}` oraz `key={schedule-${draft.raw}}`), natychmiastowo unieważniając nieaktualne wyniki symulacji.
- Nienaruszanie dotychczasowych modeli: aktywne projekty v4/v5, format JSON i logika symulacji pozostają ściśle odizolowane i niezmienione.


