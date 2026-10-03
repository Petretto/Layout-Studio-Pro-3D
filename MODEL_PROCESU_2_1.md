# Model procesu i zasobów — kontrakt 2.1a

Data: 2026-10-03. Status: **kontrakt przygotowany; punkt 2.1 w trakcie**. Ten dokument wyznacza granice przyszłego modelu i migracji. Nie jest formatem pliku ani deklaracją, że obecna symulacja obsługuje wymienione zasoby.

## Stan wejściowy potwierdzony w kodzie

- Schemat 4 (`ProjectData`) przechowuje operacje w `processSteps`. `assignedWorkstationId` jest numerowanym `WS-n` przy ręcznym bilansie; przy RPW/LCR przydział jest wyliczany. Ustawienia zasobów wiążą się z dokładnym zbiorem operacji, nie z trwałym stanowiskiem.
- Schemat 5 (`StationProjectV5`) przechowuje osobny rejestr `stations` z trwałym `ST-...`; lista `operationIds` jest autorytatywna dla własności operacji. W ręcznym bilansie wskaźnik na operacji musi być z nią zgodny. Kolejność tablicy stanowisk określa kolejność prezentacji i procesu, nie tożsamość.
- `workstationSettings[stationId]` w schemacie 5 zawiera `operators` (liczbę osób **na jedną kopię**), `parallelStations` i opcjonalny jawny `assistedCycleSeconds`. Nie ma identyfikatorów osób, puli, kompetencji ani kalendarza. Brak ustawienia oznacza obecne obliczeniowe 1 osobę i 1 kopię; nie jest dowodem obsady rzeczywistej.
- `layoutObjects` zawiera geometrię i opcjonalny `workstationId`. Typ wizualny obiektu ani jego bliskość do operacji nie stanowi dowodu zdolności maszyny, wymaganego narzędzia lub dostępności zasobu.
- `BOMComponent.associatedProcessStepId` wiąże materiał z operacją. Numer części nie identyfikuje wyrobu ani podzespołu. Graf `predecessorIds` wyraża zależność operacji, ale nie określa miejsca korpusu ani tego, które operacje tworzą osobny podzespół.
- Obecna symulacja tworzy ponumerowane zadania/wyroby w pamięci i rezerwuje kopie stanowiska. Nie rezerwuje konkretnych pracowników, wyposażenia ani miejsca jednego korpusu. Jej wyniku nie wolno przedstawiać jako odbioru przyszłych ograniczeń 2.4, 2.7 i 2.8.

## Rozdzielone pojęcia i źródło tożsamości

| Pojęcie | Trwała tożsamość / relacja docelowa | Dane wejściowe, których można użyć | Czego nie wolno wywnioskować |
| --- | --- | --- | --- |
| Operacja | ID operacji; zależności po ID; osobne wymagania zasobów oraz wejść/wyjść | `ProcessStep.id`, nazwa, czas i `predecessorIds` | Praca ręczna, czas automatu, wymagane osoby i miejsce korpusu z samego czasu standardowego |
| Stanowisko | Trwałe ID niezależne od kolejności i operacji; lista dopuszczonych/przypisanych operacji | `StationRecord.id` w v5; jawna migracja v4 → v5 | Nowa tożsamość po podobieństwie nazwy, numeru lub pokrywaniu się operacji |
| Pracownik | Osobne ID fizycznej osoby, kompetencje i dostępność; w symulacji jedna osoba nie może być równocześnie zajęta dwa razy | Brak w v4/v5 | Tożsamość osób z liczby `operators` |
| Pula pracowników | Osobne ID i jawna lista członków albo jawna pojemność bez udawania tożsamości; reguła przydziału | Brak w v4/v5; `operators` może zasilić wyłącznie wymaganie obsady stanowiska | Współdzielenie lub dostępność puli z sumy obsad |
| Wyposażenie | ID fizycznego zasobu, rodzaj i jawne możliwości; opcjonalne powiązanie z obiektem 2D/3D oraz stanowiskiem | ID/geometria `LayoutObject` po zachowaniu bez zmian | Możliwości produkcyjne, liczba maszyn lub zdolność z ikony/stołu |
| Wyrób | Definicja typu wyrobu oraz oddzielne instancje w symulacji; każda instancja ma jedną bieżącą lokalizację/stadiówkę | Obecny projekt planuje jedną rodzinę produktu i symuluje zadania `job` | Fizyczne położenie, unikalna tożsamość typu wyrobu czy reguła równoległej pracy na nim |
| Podzespół | ID typu podzespołu, jawne operacje utworzenia i zużycia; instancja należy do określonej instancji wyrobu | Brak jednoznacznego pola w v4/v5 | Podzespoły z nazw operacji, numerów BOM, gałęzi grafu lub przykładu Eko |

Operacja, stanowisko, człowiek, wyposażenie, wyrób i podzespół pozostają odrębnymi bytami. Relacja operacja → stanowisko nie tworzy automatycznie relacji operacja → człowiek ani operacja → obiekt 3D. Przypisania i wymagania technologiczne zapisuje się po trwałych ID, a reprezentacja 2D/3D wskazuje te ID, nie przechowuje alternatywnych reguł procesu.

## Jednostki i niezmienniki

| Wielkość | Jednostka wewnętrzna | Zasada |
| --- | --- | --- |
| Czas operacji, zajętości, transportu i osi symulacji | sekunda (`s`) | Interfejs może pokazywać `s`, `min` lub godziny dziesiętne; zapis i obliczenia nie zależą od jednostki prezentacji. Obecny czas standardowy pozostaje niepodzielony do czasu jawnego wprowadzenia 2.2. |
| Wymiary i pozycje hali/wyposażenia | milimetr (`mm`) | `rotationDeg` pozostaje w stopniach; zmiana skali UI nie zmienia geometrii zapisanej. |
| Obsada i kopie | liczby całkowite | `operators` oznacza liczbę osób na kopię stanowiska, `parallelStations` liczbę kopii. Sama liczba osób nie skraca czasu; zmianę cyklu opisuje tylko jawny wariant czasu. |
| Materiały | sztuki lub jawna jednostka na wyrób | Obecne `quantityPerUnit` nie koduje innych jednostek materiałowych; nie przeliczać ich bez jawnego określenia. |
| Koszt | waluta projektu na jednostkę komponentu | Zmiana oznaczenia waluty nie dokonuje przeliczenia kursowego. |

Referencja do nieistniejącego ID jest błędem. Jeden fizyczny pracownik, egzemplarz wyposażenia, wyrób i podzespół nie mogą zajmować sprzecznych stanów jednocześnie. Sam graf poprzedników dopuszcza równoległość tylko w sensie logicznego uruchomienia; fizyczną zgodność określą późniejsze reguły 2.4 oraz 2.7–2.8.

## Granica migracji do przyszłego schematu

1. **Ochrona źródła.** Zachować dokładny JSON/archiwum v4 lub v5 i dotychczasowe klucze localStorage. Migracja musi być osobnym podglądem i zapisem; samo otwarcie starszego projektu nie może go nadpisać. Nie używać zapisanego cache bilansu jako danych technologicznych.
2. **v4 → trwałe stanowiska.** Skorzystać z istniejącego, walidowanego podglądu `previewStationMigration` i jawnego `prepareStationMigration`. Osierocone ustawienia i obca geometria zatrzymują migrację. Nie nadawać ID stanowiska po numerze `WS-n` bez sprawdzonej mapy.
3. **v5 → rozdzielony model.** Zachować ID i kolejność stanowisk, operacje, relacje poprzedników, BOM, ustawienia oraz oryginalne obiekty layoutu. Wymaganie liczby osób i liczba kopii zachowują obecną wartość, ale żaden pracownik ani pula nie powstaje automatycznie. Obiekt wizualny może zachować swoje ID i powiązanie geometryczne; wymagania/moc produkcyjna wyposażenia pozostają nieokreślone.
4. **Dane nieobecne.** Definicję wyrobu, podzespoły, tożsamości/pule pracowników, kompetencje, możliwości wyposażenia, czasy ręczne/automatyczne i reguły obecności oznaczyć jako wymagające jawnego uzupełnienia. Nie wstawiać fikcyjnych wartości „domyślnych”, które mogłyby uruchomić nową symulację. Dotychczasowa symulacja v4/v5 działa nadal według dotychczasowych zasad.
5. **Weryfikacja i zapis.** Nowy parser musi sprawdzić unikalność ID, każdą referencję i jednostkę, a podgląd pokazać mapę zachowanych, nieprzeniesionych i wymagających decyzji pól. Zapis dopiero po zatwierdzeniu oraz udanym walidowanym zapisie całej nowej wersji pod osobnym kluczem. Błąd pozostawia źródło i historię nienaruszone; eksport obu wersji jest możliwy do sprawdzenia.

Pakiet 2.1c ustanawia nieaktywny, roboczy schemat 6 dla niekompletnego projektu. Nie należy dopisywać tych pól do v4/v5: ich parsowanie i archiwa mają odrębne kontrakty. Schemat 6 nie jest jeszcze zapisem aktywnej aplikacji ani wejściem nowej symulacji.

## Warunki odbioru punktu 2.1

- Wykonano w 2.1c: wersjonowany typ i parser niekompletnego modelu z walidacją powiązań. Osobna przestrzeń trwałego zapisu pozostaje do wykonania.
- Wykonano w 2.1b: odczytowy podgląd migracji v5 oraz drogę v4 przez sprawdzoną migrację do v5, z jawnymi brakami danych.
- Testować stary projekt silników i Eko: komplet ID operacji/BOM/stanowisk, brak utraty geometrii i ustawień, rozpoznanie nieznanych referencji, brak fikcyjnych osób/podzespołów, niezmienność źródłowego JSON przy odmowie oraz ponowny odczyt po zapisie.
- Potwierdzić w UI wybór i wynik migracji, Cofnij/Ponów lub osobną bezpieczną ścieżkę zastąpienia, a także brak zmiany dotychczasowych czasów i wyników dla niezmigrowanych projektów. Dopiero wtedy rozważyć status „wdrożone” dla 2.1.

Podczas przeglądu rzeczywistego pliku `tests/qa/Eko_D5_actual_export_v5.json` stwierdzono: schemat 5, 16 operacji, 17 trwałych stanowisk, 60 pozycji BOM, 53 obiekty layoutu i 16 ręcznych przypisań. To jest przypadek regresyjny, nie źródło pomiarów produkcyjnych ani definicji podzespołów.

## Weryfikacja pakietu 2.1a

Porównano kontrakt z `src/core/models/types.ts`, `stationRegistry.ts`, `stationProject.ts`, `stationMigration.ts`, `resources.ts`, `stationDerivation.ts`, `algorithms/networkSimulation.ts` i parserem schematu 4. Liczby przypadku Eko sprawdzono bezpośrednio w pliku QA. `npm.cmd run test -- --run`: 76/76. Ten pakiet zmienia wyłącznie plan i dokument kontraktu; build, UI i ponowny odczyt nie są nowym dowodem działania modelu docelowego. Nie zmieniono schematów, kodu aplikacji ani danych przeglądarki, więc nie była wymagana kopia przed przebudową modułów. `git diff --check` powinien pozostać bez błędów po zamknięciu wpisu planu.

## Pakiet 2.1b — podgląd migracji bez zapisu

`src/core/domainMigrationPreview.ts` tworzy podgląd formatu `domain-migration-preview` w wersji 1. Przyjmuje zwykły JSON projektu 4 lub 5. Dla v4 przechodzi istniejącą kontrolę `previewStationMigration` → `prepareStationMigration`; dla v5 używa parsera projektu 5. W obu przypadkach przechowuje dokładny tekst źródłowy, sprawdzony projekt stanowiskowy, mapę operacja → trwałe stanowisko, jawne liczby obsady i kopii, powiązania wizualne oraz listę brakujących danych domenowych. Brak zapisanego ustawienia obsady jest reprezentowany jako `null`, a nie jako domniemana osoba. Niewłaściwy projekt, osierocone zasoby lub obce ID geometrii zatrzymują podgląd. `verifyDomainMigrationPreview` odtwarza go ze źródła i odrzuca zmienioną zawartość.

To nadal artefakt **tylko do przeglądu**. Nie powstał schemat 6, parser projektu 6, nowy zapis lokalny, migracja zatwierdzająca ani ścieżka UI. Obecna symulacja nie konsumuje podglądu. Następny pakiet może zbudować model docelowy na sprawdzonej mapie, ale musi zachować opisane wyżej luki zamiast tworzyć fikcyjne osoby, możliwości wyposażenia lub podzespoły. Dowody pakietu są w `WERYFIKACJA_MODELU_2_1.md`.

## Pakiet 2.1c — roboczy schemat 6

`src/core/domainProject.ts` zawiera typ i parser `DomainProjectV6` oraz `prepareDomainMigration`. Jedynym źródłem przypisania operacji do stanowiska jest `stations[].operationIds`; `operations` nie może zawierać starego wskaźnika `assignedWorkstationId`. Jawne ustawienia obsady są w `stationSettings`, a osoby i pule są osobnymi listami z walidowanymi ID i referencjami. Wyposażenie technologiczne jest odrębne od `layoutObjects`; opcjonalne wskazanie obiektu wizualnego nie nadaje mu samoistnie możliwości technologicznych. Definicja wyrobu może być `null`, a podzespoły stanowią osobną listę. Parser odrzuca ponowne `processSteps`/`workstationSettings` i zapisane cache wyników, aby nie tworzyć drugiego źródła prawdy.

Migracja po zweryfikowanym podglądzie zachowuje ID stanowisk, operacje, BOM, ustawienia, geometrię, popyt i pozostałe pola projektu. Usuwa jedynie redundantny wskaźnik stanowiska z operacji; lista stanowisk pozostaje autorytatywna. Zwraca obok projektu dokładny JSON źródłowy. Osoby, pule, wyposażenie technologiczne i podzespoły pozostają puste, a definicja wyrobu `null`; `modelStatus` ma wyłącznie wartość `incomplete`. Żadna z tych pustych list nie jest dowodem, że rzeczywisty proces nie wymaga tych bytów. Model jest szkicem do uzupełnienia i nie wolno uruchamiać na nim nowej symulacji.

Ten pakiet nie zmienia parserów v4/v5, lokalnych kluczy zapisu, archiwów, formularzy ani algorytmów. Kolejny pakiet wymaga osobnej ścieżki trwałego zapisu/odczytu z ochroną oryginału i przejrzystego UI podglądu; dopiero po ich odbiorze można rozważyć zamknięcie 2.1. Szczegóły w `WERYFIKACJA_MODELU_2_1.md`.

## Pakiet 2.1d — odrębny zapis szkicu

`src/core/domainDraftStorage.ts` definiuje kopertę zapisu v1 dla niekompletnego projektu schematu 6. Klucz `layout-studio-domain-v6-draft-v1` jest oddzielny od aktywnych kluczy v4 i v5. Koperta przechowuje dokładny tekst źródła i jego zweryfikowaną wersję, projekt po walidacji oraz datę. Odczyt nie naprawia ani nie nadpisuje uszkodzonej wartości: zwraca jej surowy tekst do późniejszego pobrania przez UI. Zapis wymaga wartości odczytanej uprzednio, odmawia zapisu przy konflikcie, uszkodzeniu lub zmianie źródła i zachowuje poprzednią wartość przy błędzie zapisu.

Jest to moduł trwałości niepodłączony jeszcze do interfejsu. Następny pakiet powinien pokazać podgląd migracji i źródło, jawnie uruchomić zapis szkicu, umożliwić odzyskanie uszkodzonej wartości oraz sprawdzić zapis i ponowne otwarcie w przeglądarce. Schemat 6 pozostaje poza aktywną symulacją i bilansem.

## Pakiet 2.1e — podgląd i pierwszy zapis w UI

`DomainDraftPanel` w warsztacie stanowisk pokazuje podgląd migracji v4 lub v5 z jawnymi lukami danych i tabelą powiązań. Pierwszy zapis szkicu jest osobnym działaniem po potwierdzeniu niekompletności. Panel odczytuje szkic po przeładowaniu, pozwala pobrać zapis wraz ze źródłem oraz surową kopię uszkodzonej wartości. Nie pozwala automatycznie nadpisać już istniejącego szkicu ani zapisać podglądu, jeśli źródło zmieniło się w trakcie przeglądu. Dalsza praca nad 2.1 wymaga edycji danych domenowych i kontrolowanej ścieżki zastąpienia szkicu po zabezpieczeniu poprzedniej wersji. Bilans i symulacja nadal korzystają wyłącznie z dotychczasowych modeli.

## Pakiet 2.1f — kontrolowane zastąpienie

Istniejący szkic można teraz zastąpić po pobraniu jego kopii, przygotowaniu nowego podglądu i osobnym potwierdzeniu. Dla uszkodzonego zapisu pobierany jest dokładny surowy tekst; dla poprawnego — pełna koperta wraz z oryginalnym źródłem. `replaceDomainDraft` porównuje poprzedni tekst tuż przed zapisem i zapisuje tylko zweryfikowany szkic. Konflikt lub błąd pamięci pozostawia poprzednią wartość; UI wymaga ponownego pobrania kopii. Zapis szkicu nadal nie zmienia aktywnych danych v4/v5 ani wyników bilansu i symulacji. Dalszy zakres 2.1 to edytor jawnych danych domenowych i odbiór ich zapisania, ponownego otwarcia oraz referencji.

## Pakiet 2.1g — osoby i pule

Szkic 6 ma osobny edytor osób i pul z ręcznie podawanymi ID, nazwami oraz członkostwem. Zmiana nazwy zachowuje ID i powiązania. Usunięcie osoby wskazanej w puli jest blokowane, dopóki użytkownik nie zmieni członkostwa. Każda zaakceptowana edycja oraz Cofnij/Ponów są walidowane i zapisywane pod odrębnym kluczem szkicu; źródło v4/v5 pozostaje nienaruszone. Osoby i pule są obecnie definicjami roboczymi, bez przypisania do operacji i bez udziału w bilansie lub symulacji.

## Pakiet 2.1h — wyrób i podzespoły

Wyrób ma ręcznie podane ID i nazwę. Podzespół ma własne trwałe ID, nazwę, opcjonalną operację tworzącą i listę jawnie wybranych operacji zużywających. Brak wyboru pozostaje brakiem danych; parser odrzuca obce i powtórzone referencje. W edytorze można dodać, zmienić nazwę, usunąć oraz cofnąć lub ponowić definicję. Historia szkicu jest wspólna z edycją osób i pul. Żadne definicje nie powstają z BOM, nazw operacji, grafu lub geometrii. Schemat 6 nadal ma status `incomplete`; definiuje typy, a nie instancje wyrobów i podzespołów w symulacji. Kolejny zakres 2.1 obejmuje wyposażenie technologiczne, jego jawne możliwości i referencje oraz pełny odbiór modelu.
