# 7.12.C2-B — kontrakt ograniczonych buforów podmontaży

Status: **integracja w trakcie**, 2026-10-26. Pakiet C2-A nie wdraża tej funkcji. B2a dodaje osobne dodatnie bufory podmontaży do harmonogramu gałęzi; dotychczasowy scheduler skończonych buforów korpusów nadal odrzuca gałęzie. Zabezpieczenia nieobsługiwanych kombinacji pozostają aktywne.

**B3a (2026-10-27): wspólny odbiór mieszany** — jedna partia bezpośrednia przy wejściu 0 i partie oczekujące w osobnych dodatnich buforach są pobierane przy jednym zabezpieczonym starcie operacji. Korpus, jeśli potrzebny, jest już w kopii odbiorcy. Raport `docs/weryfikacja/WERYFIKACJA_BUFOROW_PODMONTOW_C2_B3A.md`. Formularz konfiguracji został wcześniej odebrany w B3-UI. Pełna integracja B3/C2 nadal w trakcie.

**B2b odebrany w ograniczonym zakresie**: zatrzymanie montera po obróbce, ochrona przyszłych rezerwacji i powrotów, wyjście 0 oraz bezpośredni odbiór jednej partii na wejściu 0. Reszty przy wejściu 0 są odrzucane; źródło z polityką `bbas` wymaga pełnej jawnej obecności operatora. Raport `docs/weryfikacja/WERYFIKACJA_BUFOROW_PODMONTOW_C2_B2B.md`. Cały B/C2/7.12 pozostaje w trakcie. Następny B3: wspólny odbiór kilku gałęzi i korpusu, skończone bufory korpusów, obciążony C2 i formularz konfiguracji.

**Historyczny odbiór B2a**: osobna konfiguracja, dodatnie wejścia/wyjścia, polityka wyjściowa `bbas-worker-released`, rezerwacje celu i blokowanie producenta po obróbce. Reszty zachowują lokalizację i pojemność, inspekcja pokazuje zapas. Raport: `docs/weryfikacja/WERYFIKACJA_BUFOROW_PODMONTOW_C2_B2A.md`. B2b rozszerza ten zakres zgodnie z osobnym kontraktem poniżej.

**Historyczny odbiór B1**: `src/core/subassemblyBufferState.ts` — rejestr ilości, rezerwacji, ruchu pomiędzy buforami i jednorazowego pobrania odbiorcy. W samym B1 bez podłączenia do schedulera, konfiguracji zapisu lub UI. Raport: `docs/weryfikacja/WERYFIKACJA_BUFOROW_PODMONTOW_C2_B1.md`.

Decyzja użytkownika: pojemność liczymy w **sztukach podzespołu**, a nie miejscach na partie. Partia 5 sztuk zajmuje 5 jednostek pojemności. Ilości oraz jednostki muszą być jawne i zgodne; nie wyprowadzamy ich z BOM.

Decyzja użytkownika 2026-10-25, reszty: **produkcja 5 szt., pobranie 3 szt. pozostawia 2 szt. w buforze odbiorcy**. Reszta nadal zajmuje pojemność i ma być widoczna jako zapas. Bez jawnego nowego przypisania nie jest ponownie pobierana ani przewożona. B1 zachowuje pierwotną ilość partii, osobne `remainingQuantity`, lokalizację oraz znacznik `residual`. Jedno zadeklarowane przypisanie odbiorcy może pobrać ilość tylko raz. Nie dodano jeszcze możliwości nowego przypisania reszty.

## Wymagania integracji B

- Zachować regułę A: cała zadeklarowana partia staje się dostępna po zakończeniu producenta, a przypisana ilość jest zużywana atomowo przy rzeczywistym starcie odbiorcy.
- Przed odjazdem rezerwować pojemność odbiorczą w sztukach. Pojemność 0 oznacza bezpośrednie przekazanie gotowej operacji. Rozróżnić miejsce fizyczne partii, pojemność zarezerwowaną i zajętą, bez wielokrotnego liczenia tej samej ilości.
- `copy=null` oznacza osobną pojemność każdej kopii. Nakładające się deklaracje wymagają korekty. Nie mieszać jednostek różnych podzespołów bez jawnego kontraktu.
- Po zakończeniu obróbki pełny bufor zatrzymuje wyrób i zasoby stanowiska; obecność operatora wynika z wybranej polityki. Monterzy wykonują wyłącznie transport między operacjami. Dostawy magazynowe nie zajmują ich czasu.
- Reguła reszt włączona w B2a do schedulera i inspekcji przy osobnej konfiguracji buforów podmontaży. Bez tej konfiguracji pozostaje historyczna inspekcja nieograniczonych partii; sama obecność modułu B1 nie aktywuje ograniczeń.
- Zachować brak podwójnej rezerwacji monterów/wózków oraz rozdzielenie stanu technologicznego od 3D. Martwy punkt zgłaszać jawnie.

## Kolejność i odbiór

1. Analiza zdarzeń wspólnego harmonogramu i kontrakt typów; backup z niezależnym sprawdzeniem SHA przed zmianami strukturalnymi lub zapisu.
2. Integracja pojemności gałęzi z transportem, rezerwacją celu i zwalnianiem zasobów; zachowanie dotychczasowego procesu liniowego i zgodności zapisów.
3. Niezależne małe referencje: partia 5/pojemność 5 oraz 4, dwaj producenci i jeden odbiorca, częściowe zużycie, pojemność 0, współdzielony monter, różne kopie, pełny bufor i martwy punkt. Następnie C2 przy nakładających się zleceniach, rzeczywisty UI i zapis/odtworzenie.

Obecny wzorzec C2-A (3 sztuki, odstęp 1000 s) izoluje połączenie gałęzi i dostawy; **nie odbiera przepustowości przy spiętrzeniu ani ograniczonych buforów**. Dopiero B umożliwi zamknięcie pełnego fizycznego C2; następnie zbiorczy odbiór D.

## Konfiguracja i zgodność B2a

Decyzja użytkownika 2026-10-26: każdy podzespół ma **osobny jawny limit**, korpusy mają własne limity. Dwa podzespoły z jednostką `szt.` nie tworzą wspólnej puli. Nowe opcjonalne pole modelu 6:

```json
{"subassemblyBuffers":{"buffers":[{"subassemblyId":"SUB-PWR","unit":"szt.","stationId":"ST-MU-MAIN2","copy":null,"inputCapacity":9,"outputCapacity":null,"blockingPolicy":"bbas-worker-released"}]}}
```

To przykład syntetyczny, nie zalecana pojemność rzeczywistej linii. Pola limitów i polityka są jawne. `null` to brak limitu; `copy=null` rozwija osobny limit każdej kopii. Nakładające się zakresy tego samego podzespołu wymagają korekty. Jednostka musi być zgodna ze wszystkimi partiami danego podzespołu; ilości buforowane są całkowitymi sztukami. Inny podzespół w tym samym miejscu ma niezależny wpis i rejestr. Miejsce bez deklaracji zachowuje brak limitu; nie tworzymy limitu z BOM lub gabarytów.

Dotychczasowe projekty 6 bez pola pozostają bez zmian. Odczyt w nowej aplikacji nie wymaga migracji ani dodania pola; oryginały 4/5 pozostają dokładne. Przy przygotowaniu migracji ze starszego źródła nie przenosimy niezweryfikowanego pola 6. Nowy zapis i import pakietu walidują referencje/ilości, a odmowa zapisu nie niszczy ostatniego poprawnego szkicu. Zgodność nowego pola ze starszą aplikacją nie jest gwarantowana — starszy silnik może nie uwzględniać tych limitów. Pakiet projektu przenosi nowe pole i zachowuje sumę integralności oraz oryginał.

Zakres B2a: dodatnie pojemności lub null, wyjście z polityką `bbas-worker-released`. Każda cała partia producenta jest odkładana atomowo, a pozostałe czekają na stanowisku do zwolnienia wyjścia. Nie wymaga się jednoczesnego miejsca na wszystkie odrębnie zadeklarowane partie tego producenta. Stanowisko i wyposażenie są zatrzymane do odłożenia ostatniej z nich, operator zwolniony według profilu. Cel rezerwowany przed przewozem, wspólne osoby/wózki i sekwencja pustych dojazdów pochodzą z istniejącego harmonogramu. Lokalny odbiór na tej samej kopii nie tworzy fikcyjnego przejazdu. B2a jawnie odrzuca pojemność 0 i zatrzymanie operatora na ograniczonym wyjściu. Połączenie z ograniczonymi buforami korpusów w grafie gałęzi pozostaje odrzucone przez dotychczasową ochronę.

Konfigurację B2a wczytuje się z pakietu projektu; osobny formularz pozostaje do B3. Wynik ma sekcję **Bufory podmontaży — pojemność i zapas**. Pokazuje odrębne limity/zajętość/rezerwacje oraz reszty z lokalizacją; nie obiecuje animacji brył podzespołów ani ponownego przypisania reszt. Rozróżnienie aktualnej blokady od historycznego oczekiwania jest zachowane w diagnostyce.

## Granice kontraktu B1

- Rejestr jest przejściowym stanem uruchomienia, bez zmiany modelu 6 i bez migracji istniejących zapisów. Nie zastępuje `SubassemblyRun` ani `bufferState` korpusów.
- Miejsca mają konkretne kopie, jedną jawną definicję podzespołu i jednostkę. Adapter B2 musi rozwinąć `copy=null` na osobne miejsca oraz odrzucić nakładające się konfiguracje. Współdzielenie pojemności przez różne rodzaje podzespołów i korpusy nie jest zdefiniowane przez B1.
- Ilości w sztukach są dodatnimi bezpiecznymi liczbami całkowitymi. Nie konwertujemy istniejących ilości ułamkowych ani jednostek; nie są kierowane do tego modułu przez aplikację.
- Rezerwacja całej ilości poprzedza odjazd; źródło zajmuje pojemność do odjazdu. Cel zajmuje pojemność od rezerwacji, przyjazd zmienia rezerwację w zajętość. Brak podwójnego liczenia w jednym miejscu.
- Anulowanie przed odjazdem zachowuje źródło; podczas ruchu jest zabronione. Całkowite pobranie zwalnia pojemność, częściowe zwalnia tylko pobraną ilość. Zachowane ID uniemożliwia ponowne wprowadzenie zużytej partii lub reszty.
- Pojemność 0 jest jawnie odrzucana przez B1; bezpośrednie przekazanie wymaga wspólnego uzgodnienia gotowości operacji i ruchu w B2. Rejestr nie ustala czasu przejazdu, dostępności producenta, blokowania zasobów, kalendarzy ani martwego punktu.

## Kontrakt B2b

- Schemat zapisu pozostaje bez zmian: już istniejące `blockingPolicy`, `inputCapacity` i `outputCapacity` są wykonywane w nowym zakresie. Bez zmian numeru modelu 6 lub migracji danych. Nowe pola rejestru `handoff` i polityka w opisie miejsca są wyłącznie stanem wyniku uruchomienia.
- `bbas` na wyjściu wymaga jawnej obecności operatora od początku do końca producenta. Przypadki wcześniejszego wyjścia lub późniejszego przyjścia operatora są odrzucane; nie wymyślamy powrotu ani zajętości przed zadeklarowaną obecnością. `bbas-worker-released` zachowuje dotychczasowy profil.
- Gdy po obróbce brakuje miejsca, stanowisko i wyposażenie pozostają zajęte. `bbas` zatrzymuje zespół do odłożenia/wyjazdu ostatniej oczekującej partii; przy `bbas-worker-released` nie przedłuża się rezerwacji osób. Nieznany koniec zatrzymania nie jest wolnym terminem dla przyszłego montażu, dojazdu ani powrotu wózka.
- Wyjście 0 nie magazynuje. Partia pozostaje na producencie do rzeczywistego wyjazdu. Jeżeli wyjazd ostatniej oczekującej partii zwalnia źródło, jego monter może wykonać jawnie przypisany przewóz załadowany; nie może wcześniej zostawić partii, żeby wykonać pusty dojazd. Inna jawna osoba może wykonać dojazd bez przedwczesnego zwolnienia źródła. Powrót czeka na rzeczywistą dostępność przypisanych osób.
- Wejście 0 przyjmuje jedną jawną partię do gotowej operacji. Przed wyjazdem uzgadnia się dokładny przyjazd/start, kopię, wyposażenie, kalendarz, osoby oraz dostępność i rezerwację materiałów. Nie składuje się partii na wejściu ani nie czeka z nią po przyjeździe. Rezerwacja dotyczy odbiorcy; zajętość i rezerwacja samego bufora 0 pozostają zerowe. Pełna ilość zostaje pobrana przy przyjeździe; `quantity != consumptionQuantity` jest niezgodne z pozostawianiem reszty na wejściu 0 i odmawia.
- Odbiorca potrzebujący korpusu musi mieć go już w swojej kopii; wspólny przewóz korpusu i partii pozostaje do B3. Lokalny odbiór z dodatniego wyjścia na wejście 0 odbywa się przy rzeczywistym starcie bez fikcyjnego przejazdu. Para lokalnych wejścia/wyjścia 0 wymaga jeszcze wspólnego przekazania stanowiska w B3.
- W B2b odrzucane są: kilka partii przy choć jednym wejściu 0, przezbrojenie lub jawna grupa równoległości odbiorcy bezpośredniego, odbiorca bezpośredni będący kolejnym producentem z zatrzymaniem własnej obsady, różne skończone polityki operatora dla partii jednego producenta oraz dotychczas nieobsługiwane skończone bufory korpusów z gałęziami. Nie utożsamiamy tych ograniczeń implementacji z regułami rzeczywistego procesu. Ograniczenie dalszego producenta chroni przyszły przedział nieznanego zatrzymania; nie obiecujemy jego obsady, zanim ten przedział zostanie zintegrowany.
- W UI kolumna **Operator przy blokadzie** pokazuje zadeklarowaną politykę, a inspekcja wykonania — rzeczywiste zwolnienie stanowiska, blokadę i przedział rezerwacji osób. Nie dodano formularza konfiguracji, przypisywania reszt ani animacji brył podmontaży.

## Kontrakt B3a — odbiór mieszany

- Odbiorca może mieć dokładnie jedną partię bezpośrednią i pozostałe partie z osobnych dodatnich wejść. Warunki B2b dotyczące korpusu, obecności producenta, wyposażenia, kalendarza i przyszłych rezerwacji nadal obowiązują. Wiele partii bezpośrednich jest nadal odrzucane.
- Partie z dodatnimi wejściami są przewożone przed partią bezpośrednią, niezależnie od kolejności deklaracji. Przed odjazdem bezpośrednim wszystkie towarzyszące partie muszą być dostępne w kopii odbiorcy i mieć zabezpieczoną pojemność wejściową. Ich lokalne odłożenie jest możliwe zgodnie z istniejącym kontraktem; nie powstaje fikcyjny ruch fizyczny.
- Dodatnie bufory przechowują całe partie; wejście 0 nie przechowuje niczego. Przyjazd partii bezpośredniej jest rzeczywistym startem odbiorcy. Wszystkie przypisane ilości są pobierane w tym samym zdarzeniu startu. Pełne pobranie jest wymagane tylko dla partii bezpośredniej; towarzysząca może pozostawić widoczną resztę zajmującą pojemność.
- To wspólny odbiór technologiczny, nie deklaracja wspólnego przewozu jednym wózkiem. Zestawy, osoby, puste dojazdy i powroty nadal wynikają z jawnych tras. Równoległość producentów wymaga zapisanej grupy równoległości.
- Bez zmiany schematu modelu 6 i bez migracji. Harmonogram nie zmienia źródłowego projektu; odtworzenie/eksport zachowują konfigurację i oryginał. Próby B3a są oddzielnymi syntetycznymi fixture'ami; rozprowadzany C2-A pozostaje bez zmian.
- Decyzja użytkownika 2026-10-27: mieszane polityki wyjściowe jednego producenta są obsługiwane według zatrzymania wspólnej obsady do odłożenia/wyjazdu **wszystkich** oczekujących partii. Odłożenie partii z `bbas` nie zwalnia osoby, gdy na producencie nadal czeka partia z `bbas-worker-released`. Stanowisko/wyposażenie również pozostają zajęte. Obowiązuje pełna jawna obecność producenta oraz ochrona przyszłych rezerwacji i dojazdów; wyjazd ostatniej partii może zwolnić własną obsadę do przewozu załadowanego. Gdy wszystkie partie zostają odłożone bez czekania, zwolnienie następuje po obróbce.
- Skończone bufory korpusów w grafie, wspólny przewóz korpusu/partii, kilka bezpośrednich partii, ograniczenia lokalnego podwójnego zera, przezbrojeń i zatrzymania dalszej obsady pozostają do kolejnego zakresu B3.
