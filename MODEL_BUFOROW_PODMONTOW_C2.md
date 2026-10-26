# 7.12.C2-B — kontrakt ograniczonych buforów podmontaży

Status: **integracja w trakcie**, 2026-10-26. Pakiet C2-A nie wdraża tej funkcji. B2a dodaje osobne dodatnie bufory podmontaży do harmonogramu gałęzi; dotychczasowy scheduler skończonych buforów korpusów nadal odrzuca gałęzie. Zabezpieczenia nieobsługiwanych kombinacji pozostają aktywne.

**B2a odebrany w ograniczonym zakresie**: osobna konfiguracja, dodatnie wejścia/wyjścia, polityka wyjściowa `bbas-worker-released`, rezerwacje celu i blokowanie producenta po obróbce. Reszty zachowują lokalizację i pojemność, inspekcja pokazuje zapas. Raport: `WERYFIKACJA_BUFOROW_PODMONTOW_C2_B2A.md`. Następny B2b: zatrzymanie operatora i przekazanie przy pojemności 0; potem B3: współdziałanie ze skończonymi buforami korpusów, odbiór pod obciążeniem, formularz konfiguracji i pełny fizyczny C2.

**Historyczny odbiór B1**: `src/core/subassemblyBufferState.ts` — rejestr ilości, rezerwacji, ruchu pomiędzy buforami i jednorazowego pobrania odbiorcy. W samym B1 bez podłączenia do schedulera, konfiguracji zapisu lub UI. Raport: `WERYFIKACJA_BUFOROW_PODMONTOW_C2_B1.md`.

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
