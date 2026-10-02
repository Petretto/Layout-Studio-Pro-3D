# Weryfikacja stabilizacji E — aktualność wyników i eksportów

## E1 — 2026-10-02, punkt 1.8

Przed zmianą stanu UI wykonano backup `backup/v0.4.0_przed_E1_20261002_193011`: 114 plików źródeł, konfiguracji, przykładów i dokumentacji, zgodne SHA256 według `SHA256.txt`. Pominięto zależności, build, wyniki, wcześniejsze kopie, katalogi narzędzi i dowiązania. Odtworzenie do osobnego katalogu, instalacja według lockfile i build; lokalne dane przeglądarki nie należą do backupu.

Bilans i harmonogram symulacji są wyprowadzane z bieżącego projektu. Pobrane pliki nie aktualizują się po edycji danych. Pasek projektu oznacza teraz JSON pobrany w tej sesji jako aktualny albo nieaktualny względem bieżącego stanu; Cofnij przywracające ten sam stan przywraca oznaczenie aktualności. W otwartym widoku symulacji podpis pobranego CSV obejmuje proces, bilans, wielkość partii i odstęp uruchamiania. Zmiana szybkości odtwarzania nie zmienia wyniku i nie unieważnia CSV. Podpis parametrów nie przechowuje drugiej kopii harmonogramu.

UI na izolowanym porcie 5186: po pobraniu JSON pasek pokazał „aktualny”; zmiana nazwy projektu — „nieaktualny — pobierz ponownie”; Cofnij odtworzyło poprzedni stan i „aktualny”. W symulacji pobrany CSV miał status aktualny. Zmiana partii z 30 na 31 sztuk dała status nieaktualny i nowy czas zakończenia 5098 s; ponowny eksport przywrócił aktualny. Osobno zmiana odstępu ze 162 na 163 s dała status nieaktualny i czas 4965 s, a przywrócenie 162 s przywróciło aktualny. Zmiana samej szybkości odtwarzania na 100× pozostawiła CSV aktualny. W folderze pobierania potwierdzono JSON oraz pliki CSV z odpowiednio 30 i 31 wierszami danych.

`npm.cmd run test -- --run`: 69/69; `npm.cmd run build`: poprawny. Nie zmieniono schematu zapisu, obliczeń bilansu ani algorytmu symulacji.

Punkt 1.8 pozostaje **w trakcie**: status nie obejmuje jeszcze archiwum v4/v5, DXF, raportu MD, CSV bilansu ani plików pobranych w poprzedniej sesji. Do osobnego odbioru pozostaje komunikacja po zmianie projektu przy otwartej symulacji i w warsztacie v5.

## E2 — 2026-10-02, punkt 1.8

Przed zmianą ścieżek eksportu wykonano backup `backup/v0.4.0_przed_E2_20261002_194043`: 115 plików, zgodne SHA256 według `SHA256.txt`. Pominięto zależności, build, wyniki, wcześniejsze kopie, katalogi narzędzi i dowiązania. Odtworzenie do osobnego katalogu, instalacja według lockfile i build; lokalne dane przeglądarki nie należą do backupu.

W projekcie schematu 4 każdy z eksportów JSON, archiwum v4, DXF, bilansu CSV i raportu MD zapisuje osobną migawkę bieżącego stanu wyłącznie na czas sesji. Pasek wskazuje pobrane pliki, które nie odpowiadają już projektowi; archiwum porównuje także pierwotny import. Ponowny eksport jednego formatu odświeża tylko jego status. Wycofanie edycji przez Cofnij może przywrócić aktualność dawnych plików. Eksport archiwum v4 nie aktualizuje znacznika czasu zwykłego JSON. Nie zmieniono zawartości formatów ani danych projektu.

UI na izolowanym porcie 5187: eksport archiwum v4 pozostawił pole „Eksport JSON w sesji” puste. Następnie pobrano zwykły JSON, DXF, bilans CSV i raport MD; folder pobierania zawierał wszystkie pięć plików (archiwum 8189, JSON 7364, DXF 2826, bilans 226 i MD 1084 bajty). Po zmianie nazwy projektu pasek oznaczył JSON jako nieaktualny oraz wymienił archiwum v4, DXF, bilans CSV i raport MD do ponownego pobrania. Ponowny eksport tylko DXF usunął z listy tylko DXF. Cofnij przywróciło dawną nazwę: JSON, archiwum, bilans i MD były zgodne z projektem, natomiast DXF pobrany z edytowaną nazwą pozostał na liście. `npm.cmd run test -- --run`: 69/69; `npm.cmd run build`: poprawny.

Punkt 1.8 pozostaje **w trakcie**: statusy są ograniczone do bieżącej sesji i nie obejmują jeszcze eksportów warsztatu v5, pobrania oryginału, drukowania do PDF ani raportu CSV po ponownym otwarciu widoku symulacji. Wcześniejszy opis ograniczeń E1 należy czytać wraz z powyższą aktualizacją.

## E3 — 2026-10-02, punkt 1.8

Warsztat v5 zapisuje w pamięci bieżącej sesji oddzielne migawki czterech pobrań: JSON projektu 5, archiwum v5, oryginału projektu 4 i pierwotnego importu. JSON zależy od projektu v5; archiwum także od obu źródeł. Dwa pliki źródłowe zależą wyłącznie od własnej zawartości, dlatego edycja stanowiska ich nie unieważnia. Nie zmieniono schematu zapisu, formatów plików, modelu procesu ani wyników symulacji. Zmiana dotyczy jednego istniejącego komponentu, bez przebudowy modułu; osobny backup nie był wymagany przez punkt 2 procedury planu.

UI na porcie 5188: po migracji przykładu silników pobrano JSON v5, archiwum i oryginał v4 — wszystkie miały status „aktualny”. Dodanie pustego stanowiska oznaczyło JSON i archiwum jako nieaktualne, oryginał pozostał aktualny. Ponowne pobranie samego JSON odświeżyło tylko JSON. Cofnij przywróciło aktualność wcześniejszego archiwum i oznaczyło nowszy JSON jako nieaktualny.

UI na czystym porcie 5189: zaimportowano testowy projekt Eko v4 wraz z bajtowym źródłem i przygotowano warsztat v5 z 16 stanowiskami. Pobranie wszystkich czterech plików pokazało cztery statusy „aktualny”. Po dodaniu pustego stanowiska JSON i archiwum były nieaktualne, oryginał v4 i pierwotny import pozostały aktualne. Po odświeżeniu strony zapis zawierał 17 stanowisk, a oba pobrania źródłowe nadal były dostępne; statusy sesyjne zostały wyzerowane. W folderze pobierania potwierdzono nowe archiwum Eko v5 (62 406 bajtów). Przeglądarka testowa nie dała wiarygodnego zdarzenia pobrania dla pozostałych trzech plików, dlatego ich fizycznego zapisu nie potwierdzono w tym odbiorze.

`npm.cmd run test -- --run`: 69/69; `npm.cmd run build`: poprawny, uruchomione po zmianie kodu. Punkt 1.8 pozostaje **w trakcie**: statusy pobrań nie trwają między sesjami; brak oznaczenia PDF oraz odbioru komunikacji CSV po zmianie projektu przy otwartym widoku symulacji. Ograniczenia poprzednich pakietów czytać łącznie z aktualizacjami E2–E3.

## E4 — 2026-10-02, punkt 1.8

Przed przeniesieniem stanu między komponentami wykonano backup `backup/v0.4.0_przed_E4_20261002_200255`: 103 pliki kodu, konfiguracji, testów, przykładów i dokumentacji; każdy plik kopii miał ten sam SHA256 co źródło. Nie kopiowano zależności, buildów, poprzednich backupów ani `outputs`. Odtworzenie: skopiować pliki do osobnego katalogu, zainstalować zależności według lockfile i zbudować aplikację. Zapis przeglądarki nie należy do tej kopii.

Znacznik pobranego CSV przeniesiono z komponentu `Simulation` do nadrzędnego stanu projektu 4 lub warsztatu 5. Podpis wyniku nadal obejmuje proces, bilans, wielkość partii i odstęp uruchamiania. Komponent może zostać przebudowany po zmianie projektu, a wcześniejszy podpis pozwala wskazać nieaktualny CSV. Gdy błędy danych lub layoutu blokują symulację, widok nie deklaruje zgodności raportu, lecz wskazuje potrzebę kontroli i ponownego pobrania po naprawie. Nie zmieniono algorytmu symulacji, harmonogramu, CSV ani schematu zapisu projektu.

UI na izolowanym porcie 5190, projekt 4: pobrano CSV partii 30 sztuk przy odstępie 162 s, z końcem 4936 s. Po zmianie popytu rocznego z 75 000 na 76 000 i powrocie do karty symulacji pokazano „nieaktualny — pobierz ponownie”; domyślny odstęp wynosił 159,8684210526316 s, koniec 4874,18 s. Ponowny eksport przywrócił status aktualny. Popyt 0 zablokował symulację i pokazał komunikat o braku możliwości potwierdzenia aktualności pobranego CSV. Cofnij przywróciło poprawny projekt i status aktualny.

UI na tym samym porcie, osobny warsztat 5: zaimportowano testowy plik Eko z 17 stanowiskami i pobrano CSV symulacji jednej sztuki (13 670 s). Dodanie pustego stanowiska zablokowało symulację przez brak stołu i wyświetliło komunikat o niepotwierdzonej aktualności CSV; Cofnij przywróciło wcześniejszy wynik i status aktualny. Po wyjściu do Pulpitu i ponownym otwarciu karty warsztatu status pobranego CSV pozostał aktualny. Sprawdzono również czytelność komunikatu w widoku.

Dodatkowa próba poprawnej zmiany bez blokady layoutu: w odizolowanym projekcie testowym jawny cykl zespołu pierwszego stanowiska zmieniono z 3480 na 3481 s. Symulacja jednej sztuki zakończyła się po 13 671 s, a wcześniej pobrany CSV został oznaczony jako nieaktualny. Cofnij przywróciło 13 670 s oraz status aktualny. Wartość 3481 s służyła wyłącznie próbie regresyjnej i nie jest założeniem dla rzeczywistego procesu Eko.

Po końcowej zmianie `npm.cmd run test -- --run`: 69/69; `npm.cmd run build`: poprawny. Punkt 1.8 pozostaje **w trakcie**: znaczniki eksportów są sesyjne, a drukowanie/zapis PDF z systemowego okna nie zwraca aplikacji potwierdzenia, że plik powstał. Wymaga osobnej decyzji o tym, jak komunikować status PDF bez sugerowania, że pobranie jest potwierdzone.

## E5 — 2026-10-02, punkt 1.8

Przed przeniesieniem znaczników eksportu v5 do nadrzędnego stanu wykonano backup `backup/v0.4.0_przed_E5_20261002_201400`: 103 pliki kodu, konfiguracji, testów, przykładów i dokumentacji, zgodne SHA256. Pominięto zależności, buildy, poprzednie kopie i `outputs`. Odtworzenie do osobnego katalogu, instalacja według lockfile i build; dane przeglądarki są poza kopią.

Migawki czterech eksportów warsztatu v5 są przechowywane w `App`, więc zmiana karty nie usuwa ich w bieżącej sesji. Projekt v5 jest porównywany przez podpis jego serializacji; po ponownym odczycie lokalnego zapisu identyczny projekt pozostaje aktualny. JSON i archiwum zależą od projektu, archiwum także od obu źródeł; oryginał v4 i pierwotny import zależą tylko od swoich danych. Nie zmieniono formatu żadnego pliku ani schematu zapisu.

Przycisk `Drukuj / zapisz PDF` zapisuje jedynie fakt wywołania drukowania dla bieżącej wersji projektu. Karta raportu każe sprawdzić w przeglądarce, czy PDF został zapisany; po zmianie projektu wskazuje potrzebę ponownego druku, a Cofnij przywracające wersję usuwa ostrzeżenie. Aplikacja nie otrzymuje potwierdzenia z okna drukowania i nie deklaruje pobrania PDF. Nie zmieniono wyglądu raportu — to osobny punkt 7.10.

UI na izolowanym porcie 5191: zaimportowano testowy Eko v4, przygotowano v5 z 16 stanowiskami i pobrano JSON, archiwum, oryginał v4 oraz pierwotny import. Wszystkie cztery statusy „aktualny” pozostały po przejściu do Pulpitu i powrocie. Dodanie pustego stanowiska oznaczyło tylko JSON i archiwum jako nieaktualne; oba źródła pozostały aktualne. Cofnij przywróciło wszystkie cztery statusy „aktualny”. W projekcie 4 wywołanie drukowania na karcie raportu pokazało informację o niepotwierdzonym zapisie PDF. Zmiana nazwy projektu pokazała ostrzeżenie na karcie i pasku projektu; Cofnij oraz opuszczenie i powrót do karty zachowały właściwy status. Weryfikacja wizualna potwierdziła czytelność informacji; konsola przeglądarki bez błędów.

`npm.cmd run test -- --run`: 69/69; `npm.cmd run build`: poprawny po zmianie kodu. Punkt 1.8 pozostaje **w trakcie**: znaczniki są ograniczone do bieżącej sesji i nie obejmują jeszcze eksportów procesu/BOM XLSX/CSV ani JSON wariantów. Faktyczne zapisanie PDF może potwierdzić tylko użytkownik w oknie przeglądarki.

## E6 — 2026-10-02, punkt 1.8

Przed zmianą stanu eksportów procesu i BOM wykonano backup `backup/v0.4.0_przed_E6_20261002_203301`: 103 pliki kodu, konfiguracji, testów, przykładów i dokumentacji, zgodne SHA256. Pominięto zależności, buildy, poprzednie kopie i `outputs`. Odtworzenie do osobnego katalogu, instalacja według lockfile i build; dane przeglądarki są poza kopią.

Każdy z czterech plików danych — proces XLSX/CSV i BOM XLSX/CSV — ma oddzielny znacznik w nadrzędnym stanie aplikacji. Podpis obejmuje dokładnie wiersze przekazywane do eksportu, więc zmiana samej nazwy projektu nie wymusza ponownego pobierania tych plików. Edycja operacji nie unieważnia BOM, a edycja BOM nie unieważnia procesu. Szablony zawierają stałe przykłady i nie dostają znacznika aktualności. Zapisany wariant jest niezmienną migawką z własnym ID; Pulpit pokazuje zlecenie pobrania jego JSON w tej sesji i wyjaśnia, że późniejsza edycja bieżącego projektu nie zmienia wariantu. Nie zmieniono schematów, zawartości plików, obliczeń ani zapisu projektu.

UI na izolowanym porcie 5192: pobrano XLSX i CSV procesu oraz BOM; oba statusy były aktualne. Zmiana nazwy projektu zachowała wszystkie cztery. Zmiana nazwy materiału oznaczyła tylko BOM XLSX/CSV jako nieaktualne, a Cofnij przywróciło zgodność. Zmiana nazwy operacji oznaczyła tylko proces XLSX/CSV. Pobranie szablonu nie odświeżyło statusu danych; ponowny eksport XLSX odświeżył wyłącznie XLSX, a Cofnij przywróciło zgodność starszego CSV. Statusy przetrwały przejście między kartami. JSON wariantu `Wariant E6` został przekazany do pobrania i pozostał migawką po zmianie nazwy bieżącego projektu. W folderze pobierania potwierdzono pliki procesu/BOM XLSX/CSV, szablon XLSX oraz `Wariant_E6.json` (7331 bajtów, 6 operacji, 5 pozycji BOM, nazwa sprzed późniejszej edycji). Nowa karta tego samego adresu odczytała zapisany projekt i wariant, lecz wyzerowała znaczniki pobrań zgodnie z granicą sesji.

`npm.cmd run test -- --run`: 69/69; `npm.cmd run build`: poprawny. Punkt 1.8 oznaczono jako **wdrożone** w zakresie bieżącej sesji. Aplikacja rejestruje zlecenie pobrania, ponieważ przeglądarka nie potwierdza fizycznego zapisania pliku; zapis PDF również wymaga sprawdzenia przez użytkownika. Te ograniczenia są jawne w UI i opisie funkcji.
