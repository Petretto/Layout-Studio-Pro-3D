# 7.12.C2-B — kontrakt ograniczonych buforów podmontaży

Status: **plan integracji, w trakcie**, 2026-10-25. Pakiet C2-A nie wdraża tej funkcji. Obecny scheduler buforowany odrzuca gałęzie podmontaży; zabezpieczenia pozostają aktywne.

**B1 odebrany wewnętrznie**: `src/core/subassemblyBufferState.ts` — rejestr ilości, rezerwacji, ruchu pomiędzy buforami i jednorazowego pobrania odbiorcy. Bez podłączenia do schedulera, konfiguracji zapisu lub UI. Raport: `WERYFIKACJA_BUFOROW_PODMONTOW_C2_B1.md`. Następny B2: wspólny harmonogram gałęzi i rezerwacje transportu; następnie B3: odbiór C2 pod obciążeniem oraz prezentacja zapasów/odtworzenie.

Decyzja użytkownika: pojemność liczymy w **sztukach podzespołu**, a nie miejscach na partie. Partia 5 sztuk zajmuje 5 jednostek pojemności. Ilości oraz jednostki muszą być jawne i zgodne; nie wyprowadzamy ich z BOM.

Decyzja użytkownika 2026-10-25, reszty: **produkcja 5 szt., pobranie 3 szt. pozostawia 2 szt. w buforze odbiorcy**. Reszta nadal zajmuje pojemność i ma być widoczna jako zapas. Bez jawnego nowego przypisania nie jest ponownie pobierana ani przewożona. B1 zachowuje pierwotną ilość partii, osobne `remainingQuantity`, lokalizację oraz znacznik `residual`. Jedno zadeklarowane przypisanie odbiorcy może pobrać ilość tylko raz. Nie dodano jeszcze możliwości nowego przypisania reszty.

## Wymagania integracji B

- Zachować regułę A: cała zadeklarowana partia staje się dostępna po zakończeniu producenta, a przypisana ilość jest zużywana atomowo przy rzeczywistym starcie odbiorcy.
- Przed odjazdem rezerwować pojemność odbiorczą w sztukach. Pojemność 0 oznacza bezpośrednie przekazanie gotowej operacji. Rozróżnić miejsce fizyczne partii, pojemność zarezerwowaną i zajętą, bez wielokrotnego liczenia tej samej ilości.
- `copy=null` oznacza osobną pojemność każdej kopii. Nakładające się deklaracje wymagają korekty. Nie mieszać jednostek różnych podzespołów bez jawnego kontraktu.
- Po zakończeniu obróbki pełny bufor zatrzymuje wyrób i zasoby stanowiska; obecność operatora wynika z wybranej polityki. Monterzy wykonują wyłącznie transport między operacjami. Dostawy magazynowe nie zajmują ich czasu.
- Włączyć zatwierdzoną regułę reszt do schedulera i inspekcji. Obecna inspekcja partii nie modeluje nieprzypisanych reszt; samo wdrożenie rejestru B1 nie zmienia jej działania.
- Zachować brak podwójnej rezerwacji monterów/wózków oraz rozdzielenie stanu technologicznego od 3D. Martwy punkt zgłaszać jawnie.

## Kolejność i odbiór

1. Analiza zdarzeń wspólnego harmonogramu i kontrakt typów; backup z niezależnym sprawdzeniem SHA przed zmianami strukturalnymi lub zapisu.
2. Integracja pojemności gałęzi z transportem, rezerwacją celu i zwalnianiem zasobów; zachowanie dotychczasowego procesu liniowego i zgodności zapisów.
3. Niezależne małe referencje: partia 5/pojemność 5 oraz 4, dwaj producenci i jeden odbiorca, częściowe zużycie, pojemność 0, współdzielony monter, różne kopie, pełny bufor i martwy punkt. Następnie C2 przy nakładających się zleceniach, rzeczywisty UI i zapis/odtworzenie.

Obecny wzorzec C2-A (3 sztuki, odstęp 1000 s) izoluje połączenie gałęzi i dostawy; **nie odbiera przepustowości przy spiętrzeniu ani ograniczonych buforów**. Dopiero B umożliwi zamknięcie pełnego fizycznego C2; następnie zbiorczy odbiór D.

## Granice kontraktu B1

- Rejestr jest przejściowym stanem uruchomienia, bez zmiany modelu 6 i bez migracji istniejących zapisów. Nie zastępuje `SubassemblyRun` ani `bufferState` korpusów.
- Miejsca mają konkretne kopie, jedną jawną definicję podzespołu i jednostkę. Adapter B2 musi rozwinąć `copy=null` na osobne miejsca oraz odrzucić nakładające się konfiguracje. Współdzielenie pojemności przez różne rodzaje podzespołów i korpusy nie jest zdefiniowane przez B1.
- Ilości w sztukach są dodatnimi bezpiecznymi liczbami całkowitymi. Nie konwertujemy istniejących ilości ułamkowych ani jednostek; nie są kierowane do tego modułu przez aplikację.
- Rezerwacja całej ilości poprzedza odjazd; źródło zajmuje pojemność do odjazdu. Cel zajmuje pojemność od rezerwacji, przyjazd zmienia rezerwację w zajętość. Brak podwójnego liczenia w jednym miejscu.
- Anulowanie przed odjazdem zachowuje źródło; podczas ruchu jest zabronione. Całkowite pobranie zwalnia pojemność, częściowe zwalnia tylko pobraną ilość. Zachowane ID uniemożliwia ponowne wprowadzenie zużytej partii lub reszty.
- Pojemność 0 jest jawnie odrzucana przez B1; bezpośrednie przekazanie wymaga wspólnego uzgodnienia gotowości operacji i ruchu w B2. Rejestr nie ustala czasu przejazdu, dostępności producenta, blokowania zasobów, kalendarzy ani martwego punktu.
