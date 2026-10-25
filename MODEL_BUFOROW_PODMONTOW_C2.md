# 7.12.C2-B — kontrakt ograniczonych buforów podmontaży

Status: **plan integracji, w trakcie**, 2026-10-25. Pakiet C2-A nie wdraża tej funkcji. Obecny scheduler buforowany odrzuca gałęzie podmontaży; zabezpieczenia pozostają aktywne.

Decyzja użytkownika: pojemność liczymy w **sztukach podzespołu**, a nie miejscach na partie. Partia 5 sztuk zajmuje 5 jednostek pojemności. Ilości oraz jednostki muszą być jawne i zgodne; nie wyprowadzamy ich z BOM.

## Wymagania integracji B

- Zachować regułę A: cała zadeklarowana partia staje się dostępna po zakończeniu producenta, a przypisana ilość jest zużywana atomowo przy rzeczywistym starcie odbiorcy.
- Przed odjazdem rezerwować pojemność odbiorczą w sztukach. Pojemność 0 oznacza bezpośrednie przekazanie gotowej operacji. Rozróżnić miejsce fizyczne partii, pojemność zarezerwowaną i zajętą, bez wielokrotnego liczenia tej samej ilości.
- `copy=null` oznacza osobną pojemność każdej kopii. Nakładające się deklaracje wymagają korekty. Nie mieszać jednostek różnych podzespołów bez jawnego kontraktu.
- Po zakończeniu obróbki pełny bufor zatrzymuje wyrób i zasoby stanowiska; obecność operatora wynika z wybranej polityki. Monterzy wykonują wyłącznie transport między operacjami. Dostawy magazynowe nie zajmują ich czasu.
- Zdefiniować i przetestować położenie oraz dalszy los pozostałej ilości partii po częściowym zużyciu. Obecna inspekcja partii nie modeluje nieprzypisanych reszt. Nie przyjmować domyślnie ich usunięcia lub przeniesienia.
- Zachować brak podwójnej rezerwacji monterów/wózków oraz rozdzielenie stanu technologicznego od 3D. Martwy punkt zgłaszać jawnie.

## Kolejność i odbiór

1. Analiza zdarzeń wspólnego harmonogramu i kontrakt typów; backup z niezależnym sprawdzeniem SHA przed zmianami strukturalnymi lub zapisu.
2. Integracja pojemności gałęzi z transportem, rezerwacją celu i zwalnianiem zasobów; zachowanie dotychczasowego procesu liniowego i zgodności zapisów.
3. Niezależne małe referencje: partia 5/pojemność 5 oraz 4, dwaj producenci i jeden odbiorca, częściowe zużycie, pojemność 0, współdzielony monter, różne kopie, pełny bufor i martwy punkt. Następnie C2 przy nakładających się zleceniach, rzeczywisty UI i zapis/odtworzenie.

Obecny wzorzec C2-A (3 sztuki, odstęp 1000 s) izoluje połączenie gałęzi i dostawy; **nie odbiera przepustowości przy spiętrzeniu ani ograniczonych buforów**. Dopiero B umożliwi zamknięcie pełnego fizycznego C2; następnie zbiorczy odbiór D.
