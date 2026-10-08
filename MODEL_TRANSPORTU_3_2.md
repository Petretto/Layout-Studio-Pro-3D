# Punkty materiałowe i trasy — propozycja 3.2a

Data: 2026-10-08. Zakres bieżącego pakietu: 3.2.1, inwentaryzacja i propozycja kontraktu. Historyczna propozycja poniżej została następnie zatwierdzona w wariancie 1A. Rdzeń wdrożono w 3.2b; szczegóły aktualnego zapisu i odbioru na końcu dokumentu.

## Stan zastany

- `stationRouting.ts`: skierowane trasy między konkretnymi kopiami stanowisk, trwałe ID, potwierdzona długość w mm i źródło; opcjonalny jawny czas zmierzony/założony w sekundach.
- `DomainRoutingEditor.tsx`: edycja tras i końców, potwierdzenie rzeczywistej długości, zapis i wspólne Cofnij/Ponów. Brak osobnych punktów materiałowych i końców magazynowych.
- `stationRoutePlan.ts` i harmonogram 6: zatwierdzony wybór najwcześniejszego startu, potem rzeczywistej drogi przychodzącej, następnie preferencji kolejnych procesów. Bez automatycznego tworzenia tras zwrotnych lub zastępowania odległości geometrią.
- `bodyState.ts` i `bodyRunInput.ts`: początkowa lokalizacja i rezerwacje korpusu odnoszą się do kopii stanowiska. Magazyn nie jest obecnie lokalizacją korpusu w tym rejestrze.
- Aktywna symulacja 4/5 zachowuje własne uproszczenie zerowego transportu. Dodanie definicji punktu nie może samo zmienić jej wyników.
- Test Eko zaczyna po dostarczeniu i wciągnięciu ramy na rolotok. Jest przykładem, nie regułą wszystkich procesów. Brak danych o czasie dostawy i wciągania.

## Proponowany kontrakt wspólny

1. Punkt ma trwałe ID, nazwę i kierunek przepływu: wejście, wyjście albo oba. Punkt może należeć do konkretnej kopii stanowiska albo być niezależnym punktem materiałowym, np. magazynu. Nie narzucamy ramy ani nazw procesu Eko.
2. Kopia może mieć kilka jawnych punktów, np. osobne wejście części i wyjście produktu. Brak punktów nie tworzy ich automatycznie na podstawie środka bryły.
3. Lokalizacja technologiczna i opcjonalne położenie wizualne są odrębne. Nie wymuszamy wymiarów, pozycji lub odległości, których użytkownik nie podał. Kierunek osi i integrację z layoutem należy uzgodnić z istniejącym modelem przed implementacją współrzędnych.
4. Trasa jest skierowana i wskazuje istniejące końce: od punktu dopuszczającego wyjście do punktu dopuszczającego wejście. Walidacja blokuje nieznane ID, błędne kopie, ujemne/nieskończone długości oraz usunięcie punktu używanego przez trasę. Brak połączenia oznacza brak danych, bez trasy zastępczej.
5. Wewnętrzna długość pozostaje w mm. UI może przyjmować mm/m z jawnym przeliczeniem, źródłem i potwierdzeniem. Zmiana jednostki prezentacji nie zmienia zapisanej długości. Położenie 2D/3D nie nadpisuje zatwierdzonej długości.
6. Zachowujemy jawne czasy tras i ich podstawę. Wyliczanie czasu z prędkości, załadunku i rozładunku należy do 3.3; zasoby przewozu do 3.4. Nie wprowadzamy domyślnego czasu/prędkości.
7. Starsze szkice bez punktów muszą zachować dotychczasowe trasy i pełne wyniki. Nie tworzymy drugiej niezależnej długości/czasu tej samej trasy. Dokładny kontrakt rozszerzenia istniejących końców należy wdrożyć po decyzji poniżej, z backupem, parserem, referencjami i testami zgodności.
8. Edycja obejmuje walidowany zapis, usuwanie, wspólne Cofnij/Ponów, ponowny odczyt i ochronę źródeł 4/5. UI wyraźnie opisuje, które połączenia są używane przez harmonogram, a które pozostają definicją sieci do dalszej integracji.

## Decyzja o magazynie

**1A — proponowany zakres 3.2:** magazyn jest niezależnym punktem sieci materiałowej. Definiujemy i edytujemy połączenie magazyn → wejście stanowiska, zachowując obecną początkową lokalizację korpusu i dotychczasowe wyniki. Włączenie rzeczywistej dostawy do przebiegu wymaga osobnego rozszerzenia rejestru lokalizacji i jawnych danych przewozu w kolejnych pakietach transportu. Definicja trasy magazynowej sama nie przesuwa korpusu.

**1B — rozszerzony zakres 3.2:** magazyn od razu może być początkową lokalizacją korpusu w przebiegu 6. Wymaga rozszerzenia lokalizacji, referencji wejściowych, przejścia do pierwszej kopii stanowiska i zdarzeń transportu. Dostawa musi mieć jawny czas albo przebieg odmawia wyniku; potrzebny dodatkowy pakiet integracji i odbiór migracji/zasobów. Nie można wnioskować tych danych z przykładu Eko.

Rozróżnienie jest istotne: 1B zmienia stan technologiczny i początek harmonogramu, podczas gdy 1A przygotowuje punkty i połączenia. `AGENTS.md`, „Execution and checkpoint policy”, wymaga przeglądu użytkownika, gdy decyzja architektoniczna/domenowa istotnie zmienia planowany projekt lub pozostają różne interpretacje domenowe. Dlatego nie rozszerzono automatycznie lokalizacji korpusu.

## Pakiety i odbiór

- 3.2.1: inwentaryzacja, propozycja i wskazanie decyzji — dokumentacja gotowa; nie jest odbiorem implementacji ani zatwierdzeniem kontraktu przez użytkownika.
- 3.2.2: po odpowiedzi — uzgodnione typy, parser, referencje, kompatybilny zapis; backup przed zmianą struktury. Testy starego zapisu, nowych końców, jednostek, odmów i ochrony dokładnego źródła.
- 3.2.3: UI punktów i połączeń, historia, zapis/odczyt, dwa niezależne przykłady, regresja istniejących tras i harmonogramów. Przy 1B konieczny dodatkowy spójny pakiet integracji lokalizacji magazynowej przed odbiorem całego 3.2.

Po 3.2.1 postęp głównych ID: cały plan 21/67 = 31,3%; pierwsze wydanie 21/65 = 32,3%. Punkt 3.2 jest w trakcie. Procent nie przyznaje częściowych wag ani nie jest prognozą czasu realizacji.

## Zatwierdzenie 1A i implementacja 3.2b / 3.2.2

Użytkownik wybrał **1A**. Nie rozszerzamy lokalizacji korpusu o magazyn. Sieć materiałowa jest opcjonalnym polem `materialNetwork` w roboczym schemacie 6. Brak pola zachowuje dotychczasowy zapis i zachowanie; brak automatycznie tworzonych punktów i tras.

`MaterialPoint`: ID, nazwa, direction input/output/both i kind station/external. Punkt station ma obowiązkowe stationId/copy zgodne z rejestrem oraz jawną liczbą kopii. External nie przyjmuje tych pól. Położenie wizualne nie jest częścią tej zmiany.

`MaterialRoute`: ID, fromPointId, toPointId, kind. Połączenie **station-route** wymaga stationRouteId; końce punktów muszą odpowiadać dokładnie from/to istniejącej trasy. Nie przyjmuje własnej długości, źródła ani czasu. Jedna trasa stanowisk ma najwyżej jedno przypisanie pary punktów, aby nie udawać różnych dróg jedną długością. `materialRouteData` odczytuje dane przez referencję; edycja dotychczasowej trasy zmienia odczyt bez dublowania wartości.

Połączenie **declared** wymaga co najmniej jednego punktu external i jawnych distanceMm, basis=confirmed, source. Opcjonalny transportTime ma dodatnie durationSeconds, basis measured/assumed i źródło. Bez niego nie powstaje domyślny czas. Długość jest skończona i nieujemna; zero musi być jawnie podane i potwierdzone, nie jest zastępczą długością braku danych. Trasa między dwiema kopiami zawsze korzysta z istniejącego stationRouting. Brak trasy zwrotnej nie tworzy jej automatycznie.

Parser blokuje osierocone referencje po usunięciu punktu, kopii lub istniejącej trasy, niedozwolone kierunki, ten sam punkt na obu końcach, powtórzone ID/skierowane pary, nieznane lub sprzeczne pola. Usunięcie punktu wymaga wcześniejszego usunięcia jego połączeń w proponowanej sieci. `editDomainMaterialNetwork` sprawdza całą nową sieć i nie zmienia wejścia. Jednostki mm/m mają jawne helpery; nieznane jednostki, brak liczby i przepełnienie powodują odmowę.

Rozszerzenie zapisu jest addytywne, bez konwersji istniejących szkiców i bez zmiany numeru schematu roboczego. Migracja źródła 4/5 nie aktywuje znajdującego się w nim niezweryfikowanego pola materialNetwork; dokładne źródło pozostaje w originalJson. Nowy parser obowiązuje przy zapisie i odczycie oraz przy zmianach stationRouting. Starsze wydanie aplikacji nie ma walidatora nowych połączeń; odbiór dotyczy obecnego wydania.

Sieć nie tworzy nowych zdarzeń harmonogramu. station-route opisuje końce istniejącej drogi używanej przez rdzeń; declared jest definicją sieci materiałowej do przyszłej integracji. Reguły wyboru, transportu i rezerwacji korpusu oraz aktywna symulacja 4/5 pozostają zgodne z poprzednimi wynikami. UI edycji sieci pozostaje do 3.2.3. Raport: `WERYFIKACJA_TRANSPORTU_3_2.md`.

## Odbiór UI 3.2c

Edytor punktów i połączeń działa w szkicu 6, ze wspólnym zapisem i historią. Potwierdzenia, mm/m, ochrona referencji, usuwanie i odczyt odebrane w dwóch niezależnych procesach. Cały 3.2 wdrożony w zatwierdzonym zakresie 1A. Opcjonalny zapisany czas trasy zewnętrznej jest w tym edytorze odczytowy; wyliczanie czasu należy do 3.3. Definicja sieci nie dodaje magazynowej lokalizacji korpusu. Raport `WERYFIKACJA_TRANSPORTU_3_2.md`.
