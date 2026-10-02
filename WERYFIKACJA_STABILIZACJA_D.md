# Stabilizacja D — trwałe ID stanowisk

Data: 2026-10-02. Etap 1.5 i 1.6: wdrożone (szczegóły w WERYFIKACJA_STALE_ID_1_5_1_6.md).

## D1 — fundament rejestru: ukończony

Dodano `src/core/stationRegistry.ts` i pięć testów w `tests/network.test.ts`. Rejestr oddziela trwałe ID od pozycji w tablicy (kolejności prezentacji), nazwy i zbioru operacji. Nowe stanowiska dostają UUID z prefiksem ST-. Istniejące ID trzeba wskazać jawnie: nie zgadujemy tożsamości na podstawie numeru ani podobieństwa operacji.

Rewizja zwraca listy utworzonych i wycofanych ID, aby integracja mogła jawnie obsłużyć wyposażenie i zasoby. Puste stanowiska oraz chwilowo nieprzypisane operacje są dozwolone na poziomie rejestru; wykonalność bilansu pozostaje osobną walidacją. Powtórzone/nieznane referencje i kolizje przydzielanych ID są odrzucane. Dane wejściowe nie są modyfikowane.

Testy obejmują zmianę kolejności/nazwy/operacji, podział i scalenie, niepoprawne referencje, kolizję ID oraz zachowanie ID po usunięciu operacji i serializacji JSON. Łącznie 45/45 testów, build poprawny.

## Granica wdrożenia

To moduł przygotowawczy, NIE aktywna migracja aplikacji. Obecny interfejs, balans, zasoby, CAD i symulacja nadal używają dotychczasowych WS-n. Nie zmieniono schematu 4 ani danych użytkownika. Nie przebudowano istniejącego modułu produkcyjnego, więc nie powstała nowa kopia pełnej aplikacji; dotychczasowe backupy pozostają. Przed integracją D2 wykonać pełny backup, obejmujący obecny kod, dokumentację, przykłady i eksport QA.

## Kolejne małe podetapy

### Aktualizacja D2a — 2026-09-30

Wykonano pełny backup `backup/v0.4.0_przed_migracja_D2_20260930`: 89 plików, sprawdzenie SHA256 każdej kopii. Wyłączono node_modules, dist, outputs, wcześniejsze backupy, .git, .agents, .codex i dowiązania. Odtworzenie: do osobnego katalogu skopiować zawartość kopii, zainstalować zależności według lockfile i wykonać build; nie nadpisywać bieżącej pracy bez jej zabezpieczenia. Kopia zawiera eksport QA; nie zawiera danych localStorage przeglądarki. Nie wykonywano osobnego uruchomienia z backupu.

Dodano `src/core/stationMigration.ts`: podgląd migracji zachowuje dokładny tekst źródłowego JSON, tworzy nowy rejestr z UUID, mapuje stare WS-n na nowe ID i wskazuje powiązania obiektów layoutu oraz ustawień zasobów. Bilans jest przeliczany z danych źródłowych, a nie pobierany z potencjalnie nieaktualnego cache. Nieznane przypisanie geometrii zatrzymuje podgląd; osierocone ustawienia zasobów są raportowane, nie kasowane. Geometria i projekt źródłowy pozostają bez zmian.

Podgląd ma odrębny znacznik `station-migration-preview`, nie udaje gotowego projektu schematu 5 i nie jest przyjmowany przez zwykły import. Nie dokonuje zapisów na dysku ani w przeglądarce. Ponowne przygotowanie podglądu tworzy nowe UUID; przyszły ekran zatwierdzania musi zachować jeden przygotowany podgląd, nie generować go na każdy render.

Dodano 4 testy, w tym rzeczywisty eksport Eko z pakietu B: oryginał/geometria, powiązania zasobów i osierocone klucze, odrzucenie obcej geometrii oraz błędnego JSON/wersji/kolizji ID. 49/49 testów, końcowy build poprawny (wyeliminowano użycie Object.hasOwn niezgodne z aktualnym targetem TS). Nie zmieniono UI ani schematu 4. D2 jako całość pozostaje w trakcie: zapis rejestru i migracja aktywnego projektu wymagają podłączenia konsumentów, opisanych poniżej.

### Aktualizacja D2b — 2026-10-01

Dodano `prepareStationMigration` w `src/core/stationMigration.ts`. Funkcja ponownie przelicza podgląd z zachowanego tekstu źródłowego i odrzuca zmienione lub nieaktualne powiązania. Przygotowany projekt schematu 5 zapisuje `stations` z trwałymi ID, przypisania ręczne operacji, powiązania obiektów layoutu i ustawienia zasobów pod tymi ID. Cache bilansu i tras nie jest przenoszony. Nieprzypisane klucze ustawień zasobów blokują konwersję do czasu jawnego rozstrzygnięcia. Wynik nadal zawiera dokładny oryginalny JSON, a źródło nie jest modyfikowane.

Test na rzeczywistym eksporcie Eko potwierdził 16 stanowisk, komplet referencji i niezmieniony plik źródłowy. Testy sprawdziły też mapowanie zasobów, zatrzymanie przy osieroconych kluczach i zmienionym podglądzie. Łącznie 51/51 testów, build/typecheck poprawne. Nie było zmian UI ani aktywnego schematu zapisu, więc odbiór UI i ponowne otwarcie projektu 5 nie były wykonywane. `parseProject` nadal odrzuca wersję 5. D2b jest przygotowaniem danych, nie zakończeniem D2 ani 1.5.

Istniejąca kopia sprzed integracji: `backup/v0.4.0_przed_migracja_D2_20260930` (89 plików, SHA256 zgodne). D2b nie przebudowuje aktywnych modułów aplikacji. Przed przełączeniem aktywnego schematu należy utworzyć bieżącą kopię obejmującą także D2a–D2b.

### Aktualizacja D2c — 2026-10-01

Przed dalszą integracją wykonano pełną kopię `backup/v0.4.0_przed_aktywacja_D3_20261001_171226`: 93 pliki źródeł, przykładów i dokumentacji, SHA256 źródła i kopii zgodne dla każdego pliku; lista w `SHA256.txt`. Pominięto zależności, build, wyniki, wcześniejsze backupy, katalogi narzędzi oraz dowiązania. Odtwarzanie odbywa się do osobnego katalogu, następnie instalacja według lockfile i build; nie nadpisywać bieżącej pracy bez jej zabezpieczenia. Danych localStorage kopia nie obejmuje.

Dodano `src/core/stationProject.ts` z odrębnym parserem projektu schematu 5. Sprawdza strukturę rejestru, unikatowość i istnienie referencji operacji, zgodność ręcznych wskaźników z rejestrem, kolejność poprzedników, klucze zasobów i powiązania obiektów layoutu. Odrzuca ręczne wskaźniki w bilansie automatycznym. Cache bilansu i tras pomija. `prepareStationMigration` sprawdza wynik tym parserem. Parser aktywnej aplikacji nadal odrzuca schemat 5.

Test Eko: przygotowanie → serializacja JSON → odczyt zachowuje 16 stanowisk i layout. Test negatywny odrzuca powtórzone operacje, stare ID `WS-n`, nieznane klucze zasobów i powiązania geometrii oraz niezgodne ręczne przypisanie. Źródło pozostaje bez zmian. Łącznie 53/53 testy i build/typecheck poprawne. Nie wykonano odbioru UI, ponieważ aktywne ścieżki importu i zapisu nie zostały zmienione. D2 i 1.5 pozostają w trakcie.

### Aktualizacja D3a — 2026-10-01

Dodano `src/core/stationBalancing.ts`. Bilans schematu 5 bierze ID, nazwę i kolejność z zapisanego rejestru, a czasy z operacji. Puste fizyczne stanowisko pozostaje w wyniku z cyklem 0. W RPW/LCR wynik heurystyki jest porównywany z zapisanym przydziałem; nowe grupowanie zatrzymuje obliczenie do jawnego uzgodnienia tożsamości. Przeniesienie operacji wskazuje istniejące ID, przechodzi na bilans ręczny i zachowuje puste stanowisko, jego zasoby oraz przypisaną geometrię. Zmiana kolejności rejestru zmienia tylko numery prezentacji. Błędna kolejność poprzedników i nieznany cel są odrzucane bez zmiany wejścia.

Test Eko porównał czasy 16 stanowisk przed i po migracji. Testy sprawdziły automatyczne przegrupowanie, przeniesienie, puste stanowisko, zasoby, geometrię, kolejność i błędne referencje. 57/57 testów i build/typecheck poprawne. Kod nie został jeszcze podłączony do aktywnego edytora, więc brak odbioru UI, Cofnij/Ponów i aktywnego zapisu schematu 5. D3 i 1.5 pozostają w trakcie.

### Aktualizacja D4a — 2026-10-01

Dodano `applyStationResources` w `src/core/resources.ts`: schemat 5 pobiera obsadę, kopie i jawny czas zespołu po trwałym ID, a istniejąca ścieżka schematu 4 nadal używa klucza zbioru operacji. Puste stanowisko zachowuje ustawienia, lecz ma cykl 0 i nie staje się sztucznym wąskim gardłem. W `src/core/stationDerivation.ts` połączono bilans z zasobami, routingiem i symulacją. Zapisane obiekty layoutu są zachowywane; brak wymaganych kopii stołu daje błąd zamiast automatycznej zamiany geometrii.

Test na rzeczywistym eksporcie Eko: ta sama geometria, liczba tras i czasy zakończenia trzech sztuk po migracji. Test zmiany przydziału potwierdził zachowanie zasobów i geometrii pustego stanowiska oraz błąd layoutu po zwiększeniu liczby kopii bez stołu. Łącznie 59/59 testów i build/typecheck poprawne. Nie zmieniono aktywnego importu, edytorów ani zapisu; UI i ponowne otwarcie schematu 5 pozostają do odbioru. D4 i 1.5 w trakcie.

### Aktualizacja D4b — 2026-10-01

Dodano `src/core/stationRevision.ts`. Jawny plan rewizji wskazuje ID zachowywanych stanowisk, kolejność i operacje; pominięte ID są wycofywane, a nowe dostają trwałe ID. Przed zatwierdzeniem każda operacja musi mieć jedno stanowisko. Wynik przechodzi na bilans ręczny i jest ponownie walidowany. Rewizja zatrzymuje wycofanie ID, jeśli pozostały przy nim obiekty layoutu lub ustawienia zasobów. Nie przenosi ich automatycznie na stanowisko o podobnych operacjach.

Testy: podział zachowuje zasoby i geometrię wybranego istniejącego ID, tworzy nowe ID i zgłasza brak stołu; zmiana kolejności zachowuje referencje; scalenie z powiązaniami wycofywanego ID jest odrzucane, a po ich jawnym usunięciu przechodzi. Projekt wejściowy pozostaje bez zmian. 61/61 testów i build/typecheck poprawne. Nie zmieniono UI ani aktywnego schematu 4. D4 i 1.5 pozostają w trakcie.

### Aktualizacja D3b/D4c — 2026-10-01

Przed podłączeniem UI wykonano kopię `backup/v0.4.0_przed_UI_v5_20261001_173152`: 97 plików źródeł, konfiguracji, przykładów i dokumentacji, zgodne SHA256 źródła i kopii. Pominięto zależności, build, wyniki, wcześniejsze kopie i katalogi narzędzi. Odtwarzanie: skopiować kopię do osobnego katalogu, zainstalować zależności według lockfile i wykonać build. Kopia nie obejmuje localStorage przeglądarki.

Dodano osobną kartę `Stanowiska v5` w `src/App.tsx` i warsztat w `src/components/studio/StationWorkspace.tsx`. Projekt schematu 4 nadal działa w istniejącym edytorze. Warsztat przygotowuje migrację bieżącego projektu, przyjmuje odrębny JSON schematu 5, zapisuje go pod osobnym kluczem localStorage i udostępnia eksport oraz zachowany oryginalny JSON schematu 4. Odczyt sprawdza parserem rejestr i referencje; uszkodzony zapis można pobrać do odzyskania, a zastąpienie wymaga osobnego potwierdzenia. Edycja przenosi operację do wybranego trwałego ID, dodaje puste stanowisko, zmienia kolejność i utrzymuje historię Cofnij/Ponów. Zmiana jest zapisywana przed aktualizacją widoku. Symulacja korzysta z wyprowadzonego projektu 5 i jest blokowana przy błędach layoutu.

Podczas odbioru przykład Eko ujawnił pustą listę **zapisanych** obiektów layoutu. `deriveStationProject` generował wtedy geometrię przy odczycie, co po dodaniu stanowiska mogło niejawnie zmienić układ. Usunięto to wyprowadzenie: pusta lista pozostaje pusta i daje błędy brakujących stołów. Osobny przycisk `Wygeneruj layout od nowa` zastępuje geometrię dopiero po potwierdzeniu. Test regresyjny sprawdza brak niejawnych obiektów po migracji `DEFAULT_EKO_PROJECT`. Końcowo 62/62 testy i build/typecheck poprawne.

Odbiór UI na Eko w lokalnym serwerze: migracja utworzyła 16 trwałych ID; przeniesienie OP22 do wskazanego ID zachowało puste stanowisko źródłowe; Cofnij i Ponów odtwarzały przydział; po odświeżeniu przeglądarki zapis zachował 16 stanowisk i przeniesienie. Niepoprawną zmianę kolejności odrzucono z informacją o poprzedniku. Dodano 17. puste stanowisko, a UI wskazało brak 17 stołów bez samoczynnej zmiany geometrii. Jawne wygenerowanie układu wymagało potwierdzenia; po nim pozostało 7 ostrzeżeń o obiektach poza halą Eko, które utrzymały się po odświeżeniu. Symulacja partii 1 zakończyła się po 13 670 s (16 wykonań). Są to dane testowe przykładu, nie pomiary produkcyjne.

Eksport JSON był dostępny w UI, ale pobranie pliku i ponowny import nie zostały potwierdzone w odbiorze D3b/D4c: narzędzie przeglądarkowe nie zarejestrowało zdarzenia pobrania. Wynik późniejszego odbioru D5a poniżej zamyka tę lukę. Nie wykonano jeszcze odbioru edycji zasobów/geometrii, podziału i scalenia w UI ani pełnego przejścia projektu 5 przez pozostałe karty. Dlatego 1.5 pozostaje **w trakcie**; 1.6 i 1.7 nie są tu uznane za ukończone.

### Aktualizacja D5a — 2026-10-01: eksport i ponowny import v5

Odnaleziono rzeczywisty plik pobrany po kliknięciu eksportu w UI. Kopia dowodowa: `tests/qa/Eko_D5_actual_export_v5.json`, 44 879 bajtów, SHA256 `ce745ff727030553d5ce3999518b47b3760907ff4641419be725be15cdba979f`. Brak zdarzenia `download` w automatyzacji przeglądarki był ograniczeniem obserwacji; plik istniał w katalogu pobrań. Sprawdzenie JSON potwierdziło schemat 5, 17 stanowisk, 53 obiekty layoutu i brak obcych referencji geometrii. OP22 wskazywała trwałe ID `ST-4f27d837-789a-4ffa-beba-e777b7e2bf8c`.

Zaimportowano ten sam plik przez przycisk warsztatu i potwierdzono zastąpienie wcześniejszego wariantu QA. UI odtworzył 17 stanowisk, pusty numer 10, OP22 i OP23 na numerze 11 oraz 7 wcześniejszych ostrzeżeń o geometrii poza halą. Po przeładowaniu przeglądarki liczba stanowisk, ID i przydział pozostały takie same.

Osobny poprawny plik `tests/qa/Eko_D5_v5_import.json` przygotowano z rzeczywistego eksportu Eko schematu 4 przez kod migracji, z deterministycznymi ID do testu. Ma 16 stanowisk i 50 zapisanych obiektów layoutu. Import przez UI przeszedł bez błędów; symulacja 3 sztuk zakończyła się po 21 170 s, z 48 wykonaniami, zgodnie z wcześniejszym wynikiem Eko. Plik `tests/qa/Eko_D5_v5_bad_binding.json` różni się obcym ID przy obiekcie `TBL-WS-1`; UI odrzucił go komunikatem o nieznanym stanowisku. Poprzedni poprawny projekt i jego czas zapisu pozostały bez zmian także po przeładowaniu.

Nie zmieniono kodu aplikacji w D5a. Po odbiorze ponownie wykonano 62/62 testy i build/typecheck z wynikiem poprawnym; konsola przeglądarki nie zgłosiła błędów ani ostrzeżeń technicznych. Odbiór dotyczy ścieżki eksport/import i ochrony zapisu przy błędnym pliku. Pełny odbiór 1.5 nadal wymaga podziału/scalenia i integracji trwałych ID z pozostałymi edytorami.

### Aktualizacja D4d — 2026-10-01: jawny podział i scalenie w UI

Przed zmianą tożsamości, zasobów i geometrii wykonano pełną kopię `backup/v0.4.0_przed_D4d_20261001_181257`: 101 plików źródeł, konfiguracji, przykładów i dokumentacji, wszystkie pary źródło/kopia zgodne SHA256; lista w `SHA256.txt`. Pominięto zależności, build, wyniki, wcześniejsze kopie i katalogi narzędzi. Odtworzenie: skopiować do osobnego katalogu, zainstalować zależności według lockfile i wykonać build. Kopia nie obejmuje localStorage przeglądarki.

W `src/core/stationRevision.ts` dodano atomowy podział i scalenie. Podział wymaga niepustej części operacji, zachowuje stare fizyczne ID z jego zasobami i geometrią, a nowe ID tworzy bez tych powiązań. Scalenie wymaga wskazania zachowanego i wycofywanego ID oraz dokładnej listy obiektów wycofywanych i jawnej decyzji o usunięciu jego ustawień zasobów. Brakująca lub nadmiarowa lista obiektów, brak zgody na istniejące ustawienia oraz błędny przydział zatrzymują operację. Kod nie przenosi wyposażenia ani zasobów przez podobieństwo operacji.

W `src/components/studio/StationWorkspace.tsx` dodano wybór stanowiska do podziału, operacji i nazwy nowego ID oraz formularz scalenia. Formularz pokazuje ID, zachowywane zasoby i liczbę obiektów, nazwy/ID obiektów do usunięcia i ustawienia wycofywanego stanowiska. Przycisk scalenia pozostaje nieaktywny do zaznaczenia jawnej zgody; przed zapisem pojawia się dodatkowe potwierdzenie. Zmiany korzystają z istniejącej historii i zapisu warsztatu.

Odbiór UI na wariancie Eko z D5a: stanowisko 11 z OP22 i OP23 podzielono, przenosząc OP23 na nowe `ST-e75f7fdb-6c10-47ad-ba42-16e8f33b236f`. Stare ID `ST-4f27d837-789a-4ffa-beba-e777b7e2bf8c` zachowało OP22 i trzy obiekty; nowy stół nie został wymyślony, więc UI zgłosił błąd brakującej geometrii. Cofnij/Ponów zmieniały 17 ↔ 18 stanowisk; odświeżenie zachowało nowe ID. Scalenie nowego, niepowiązanego stanowiska z powrotem do starego zachowało OP22 i OP23; Cofnij/Ponów działały.

Drugi scenariusz UI wycofał puste stanowisko 10 z trzema powiązanymi obiektami, zachowując stanowisko 11. Obiekty były wymienione w formularzu, a bez zgody scalenie było zablokowane. Po potwierdzeniu 17 → 16 stanowisk, stare ID i trzy obiekty zniknęły; Cofnij przywróciło je, Ponów ponownie scaliło, a odświeżenie utrzymało wynik 16 stanowisk. W syntetycznym pliku QA `tests/qa/Eko_D4d_resource_decision_v5.json` ustawiono na wycofywanym ID 2 operatorów × 1 kopię wyłącznie do sprawdzenia decyzji UI. Formularz pokazał tę wartość i trzy usuwane obiekty; po scaleniu Cofnij przywróciło ustawienie 2 × 1. Na koniec ponownie zaimportowano bazowy eksport Eko D5a z 17 stanowiskami. Czasy i obsada tego wariantu syntetycznego nie są pomiarami produkcyjnymi.

Dwa nowe testy rdzenia obejmują zachowanie zasobów/geometrii przy podziale i blokowanie scalenia bez dokładnej decyzji. Końcowo 64/64 testy, build/typecheck poprawny; konsola przeglądarki bez błędów technicznych. ID 1.5 i 1.6 pozostają **w trakcie**: warsztat v5 nadal nie ma edytora zasobów ani CAD/3D do rozstrzygnięcia docelowego układu po podziale, a pełny przepływ przez inne karty używa schematu 4.

### Aktualizacja D4e — 2026-10-01: zasoby stanowiska po trwałym ID

Przed zmianą wykonano kopię `backup/v0.4.0_przed_D4e_20261001_182847`: 102 pliki źródeł, konfiguracji, przykładów i dokumentacji, każda para źródło/kopia zgodna SHA256 według `SHA256.txt`. Pominięto zależności, build, wyniki, wcześniejsze kopie i katalogi narzędzi. Odtworzenie: skopiować do osobnego katalogu, zainstalować zależności według lockfile i wykonać build. Kopia nie obejmuje localStorage przeglądarki.

W `src/components/studio/StationWorkspace.tsx` dodano formularz zasobów wybierający fizyczne stanowisko po trwałym ID. Obsada i liczba kopii mają zakres liczb całkowitych 1–20; jawny cykl zespołu jest opcjonalny i musi wynosić co najmniej 0,001 s. Zapis aktualizuje tylko ustawienia wybranego ID w istniejącej historii Cofnij/Ponów. Formularz pokazuje cykl bazowy, cykl zespołu, odstęp zdolności, łączną obsadę i liczbę zapisanych stołów. Przycisk przywracania domyślnych wartości usuwa osobny wpis tego ID przez tę samą odwracalną ścieżkę. Zmiana zasobów nie edytuje geometrii.

Odbiór UI na zapisanym wariancie Eko D5a, stanowisko 1 `ST-9e2d4aa4-d871-4da2-b951-81a8f9d98819`: obsada 0 została odrzucona bez zapisu. Obsada 2 × 1 zachowała cykl bazowy i zespołu 3480 s. Przy 2 × 2 odstęp zdolności spadł do 1740 s/szt., a układ nadal miał jeden stół; UI zgłosił wymagane dwa stoły i zablokował symulację. Cofnij/Ponów odtworzyły 2 × 1 i 2 × 2. Po powrocie do jednej kopii i wpisaniu **syntetycznego** cyklu zespołu 3000 s wynik pokazał 3000 s/szt.; po przeładowaniu i otwarciu warsztatu zapisane 2 × 1 oraz 3000 s były nadal widoczne. Te liczby służą tylko testowi i nie są pomiarem produkcyjnym.

Kliknięcie pierwotnego przycisku przywracania domyślnych ustawień wywołało okno `confirm`, po którym narzędzie sterujące przeglądarką chwilowo utraciło możliwość interakcji. Przycisk zmieniono na bezpośrednią, odwracalną akcję z tekstem o Cofnij. W świeżej karcie UI zapisano testowe 2 × 1 na stanowisku 1, usunięto osobne ustawienia przyciskiem i potwierdzono 1 × 1 oraz cykl 3480 s. Cofnij przywróciło 2 × 1, Ponów ponownie usunęło wpis, a po przeładowaniu zapis nadal pokazywał brak osobnych ustawień. Projekt Eko zachował 17 stanowisk; konsola przeglądarki nie miała błędów ani ostrzeżeń technicznych. Syntetyczny cykl 3000 s nie pozostał w zapisie QA. Po ostatniej zmianie 64/64 testy i build/typecheck są poprawne. 1.6 pozostaje **w trakcie**; nie ukończono edycji CAD/3D v5 ani pełnej integracji z innymi kartami.

### Aktualizacja D4f — 2026-10-01: geometria po trwałym ID

Przed zmianą wykonano kopię `backup/v0.4.0_przed_D4f_20261001_221758`: 103 pliki źródeł, konfiguracji, przykładów i dokumentacji, wszystkie pary źródło/kopia zgodne SHA256 według `SHA256.txt`. Wyłączono zależności, build, wyniki, wcześniejsze kopie i katalogi narzędzi. Odtwarzanie: skopiować do osobnego katalogu, zainstalować zależności z lockfile i wykonać build. LocalStorage przeglądarki nie jest częścią kopii.

Dodano `src/core/stationGeometry.ts` z operacjami dodania, aktualizacji i usunięcia wyposażenia stanowiska schematu 5. Nowy obiekt wymaga jawnej nazwy, położenia, wymiarów i obrotu; otrzymuje nowe ID oraz wybrane trwałe ID stanowiska. Edycja zachowuje ID obiektu, typ i powiązanie ze stanowiskiem. Dodanie stołu ponad liczbę kopii jest odrzucane, a brak stołu nadal zgłaszany przez wyprowadzenie layoutu. Wszystkie zmiany przechodzą przez parser schematu 5 i zapis warsztatu; proces oraz ustawienia zasobów nie są modyfikowane.

W `src/components/studio/StationGeometryEditor.tsx` dodano rzut 2D z zapisanych obiektów oraz formularze stanowiska i wyposażenia. Usunięcie wymaga zaznaczenia jawnej decyzji i jest odwracalne przez Cofnij. `StationWorkspace.tsx` pokazuje również odrębny podgląd 3D, który czyta ten sam projekt v5. Istniejący `Scene.tsx` otrzymał tryb tylko do odczytu, bez narzędzi zmiany wyposażenia; aktywny edytor schematu 4 zachowuje dotychczasowy tryb edycji.

Test rdzenia na rzeczywistym eksporcie Eko: po podziale stanowiska z OP22/OP23 nowy ID nie ma stołu; jawne dodanie jednego stołu usuwa ten błąd bez zmiany procesu, zasobów ani pozostałej geometrii. Drugi stół przy jednej kopii jest blokowany. Zmiana X i obrotu zachowuje ID i powiązanie po zapisie/odczycie JSON; wskazanie obiektu przez inne stanowisko jest odrzucane, a usunięcie przywraca błąd brakującego stołu. Test końcowy: 65/65, build/typecheck poprawny.

Odbiór UI przeprowadzono na izolowanym porcie 5174, bez zmiany wcześniejszego localStorage z portu 5173. Zaimportowano `tests/qa/Eko_D5_actual_export_v5.json` (17 stanowisk), podzielono stanowisko 11, przenosząc OP23 na nowe `ST-6ad66ff7-839d-4439-9ff9-ed299da59b57` (18 stanowisk). UI zgłosił 0 stołów przy wymaganym 1. Pusty formularz odmówił zapisu bez podanych wymiarów. Po wpisaniu **syntetycznej geometrii QA** stołu `EQ-fedbb5ab-bebf-452a-b880-99ab8dad0a39` (X/Y 1000/1000 mm, 1800 × 900 × 850 mm) błąd zniknął i symulacja jednej sztuki zakończyła się po 13 070 s, 16 wykonań. Zmiana X na 3200 mm i obrotu na 90° była widoczna w formularzu oraz na rzucie 2D; podgląd 3D wyrenderował zapisany projekt. Cofnij/Ponów usuwały i przywracały stół wraz z błędem layoutu. Po przeładowaniu zachowały się nowe ID, stół, X/Y 3200/1000 mm i wymiary. Usunięcie stołu ponownie zgłosiło brak geometrii, a Cofnij odtworzyło obiekt. Konsola przeglądarki bez błędów i ostrzeżeń technicznych. Wartości QA nie są pomiarami ani proponowanym układem produkcyjnym.

ID 1.5 i 1.6 pozostają **w trakcie**. Edytor geometrii działa we własnym warsztacie schematu 5; pozostałe karty nadal używają schematu 4. Pełny przepływ i odzyskiwanie wymagają osobnego odbioru.

### Aktualizacja D5b — 2026-10-01: oś czasu symulacji v5

Przed integracją wykonano kopię `backup/v0.4.0_przed_D5b_20261001_223242`: 105 plików źródeł, konfiguracji, przykładów i dokumentacji; pary źródło/kopia zgodne SHA256 według `SHA256.txt`. Wyłączono zależności, build, wyniki, wcześniejsze kopie i katalogi narzędzi. Odtworzenie: skopiować do osobnego katalogu, zainstalować zależności z lockfile i wykonać build. LocalStorage przeglądarki nie jest częścią kopii.

W `StationWorkspace.tsx` zastąpiono skrócony wynik symulacji istniejącym widokiem osi czasu. Widok dostaje wyprowadzony projekt schematu 5, pokazuje nazwę i trwałe ID stanowiska oraz przekazuje aktywne wykonania do podglądu 3D. Po imporcie, edycji, Cofnij/Ponów odtwarzanie wraca do początku i przelicza bieżący projekt. Błąd layoutu nadal zatrzymuje dostęp do kontrolek symulacji. Schemat zapisu i algorytm symulacji pozostały bez zmian; dotychczasowy widok schematu 4 zachowuje swoje etykiety i domyślną partię.

Odbiór UI na izolowanym porcie 5175 z `tests/qa/Eko_D5_v5_import.json`: 16 stanowisk, domyślna partia 1 sztuka zakończyła się po 13 070 s. Po ustawieniu partii 3 sztuk pełny wynik wyniósł **21 170 s**, zgodnie z wcześniejszą próbą Eko. Oś czasu pokazała aktywne OP10, OP13–OP17 po przejściu z końca do początku, a lista stanowisk używała `ST-QA-01` itd. Podgląd 3D otworzył się przy aktywnej osi czasu; znaczników aktywności na canvas nie oceniono osobnym porównaniem obrazu. Ustawienie syntetycznych 2 kopii na `ST-QA-01` przy jednym zapisanym stole zgłosiło wymagane 2 stoły i zastąpiło kontrolki symulacji komunikatem blokady. Cofnij przywróciło 1 kopię oraz oś czasu; po przeładowaniu zapis nadal miał 16 stanowisk, 1 kopię i dostępny widok symulacji. To dane QA, nie pomiary produkcyjne.

Końcowo `npm.cmd run test -- --run`: 65/65, `npm.cmd run build`: poprawny. ID 1.5 i 1.6 pozostają **w trakcie**: inne karty nadal używają schematu 4, a pełna ścieżka projektu 5 wymaga dalszego odbioru.

### Aktualizacja D5c — 2026-10-01: oryginalny JSON po migracji

Na izolowanym porcie 5176 wczytano testowy przykład Eko schematu 4 i przygotowano migrację do 16 trwałych stanowisk schematu 5. Przycisk `Pobierz oryginał 4` utworzył rzeczywisty plik, zachowany jako `tests/qa/Eko_D5c_original_v4.json`: 14 831 bajtów, SHA256 `3F5CAE5C91ECCDFB891ED26844C1C47F15A747B71B3486DB93054156E24121EC`. Plik ma `schemaVersion: 4`, 16 operacji i 60 pozycji BOM. Jest to surowy projekt źródłowy przed wyprowadzaniem bilansu i layoutu.

Po przeładowaniu aplikacji warsztat v5 zachował 16 stanowisk i udostępniał pobranie oryginału. Drugi pobrany plik miał tę samą długość i SHA256. Zdarzenie `download` nie było zgłaszane przez automatyzację przeglądarki, dlatego sprawdzono rzeczywiste pliki w katalogu pobrań. Ponowny import kopii dowodowej do projektu schematu 4 przeszedł walidację; UI pokazał 16 operacji, 60 materiałów i 16 wyliczonych stanowisk. Po przeładowaniu te liczby pozostały, a odrębny zapis warsztatu v5 nadal był dostępny.

Nie zmieniono kodu ani schematu zapisu. Odbiór potwierdza ochronę i ponowne użycie oryginalnego pliku przy poprawnej migracji. Uszkodzone localStorage oraz ścieżka nieudanej migracji wymagają dalszej próby w ramach 1.7, które pozostaje **w trakcie**.

### Aktualizacja D5d — 2026-10-01: odzyskiwanie uszkodzonego localStorage v5

Przed poprawką potwierdzenia wykonano kopię `backup/v0.4.0_przed_D5d_20261001_225237`: 107 plików źródeł, konfiguracji, przykładów i dokumentacji, każda para źródło/kopia zgodna SHA256 według `SHA256.txt`. Wyłączono zależności, build, wyniki, wcześniejsze kopie i katalogi narzędzi. Odtwarzanie wymaga skopiowania do osobnego katalogu i instalacji zależności z lockfile; localStorage nie wchodzi do kopii.

Do próby UI dodano `tests/qa/D5d_recovery_harness.html`. Jego przycisk działa tylko na `127.0.0.1:5177` i zapisuje pod kluczem warsztatu v5 jednoznaczny uszkodzony znacznik QA. Na tym izolowanym porcie aplikacja po wejściu do warsztatu wykryła błąd JSON, wyłączyła zapis i udostępniła pobranie kopii. Rzeczywisty `Odzyskiwanie_stanowisk_v5.json` zawierał dokładnie `D5d_CORRUPTED_LOCAL_STORAGE_QA_20261001` (39 bajtów, SHA256 `D6BCD5BF8515BD7975BDF158B7EF5C8C3A7620C11D005E9CA3CAF621C23741AC`). Próba importu poprawnego `tests/qa/Eko_D5_v5_import.json` bez zgody została odrzucona; po przeładowaniu uszkodzony zapis nadal był obecny.

Natywne `window.confirm` przy `Włącz zastąpienie` zablokowało sterowanie kartą testową. W `StationWorkspace.tsx` zastąpiono je jawnym potwierdzeniem w interfejsie, bez zmiany schematu lub reguł zapisu. Odbiór nowej ścieżki: Anuluj pozostawiło blokadę; potwierdzenie jedynie odblokowało możliwość zastąpienia i po przeładowaniu ostrzeżenie wróciło. Po ponownym potwierdzeniu i imporcie poprawnego Eko v5 warsztat zapisał 16 trwałych stanowisk. Po przeładowaniu projekt i symulacja były dostępne, a konsola UI nie zgłosiła błędów ani ostrzeżeń technicznych.

`npm.cmd run test -- --run`: 65/65; `npm.cmd run build`: poprawny. Schemat zapisu i algorytmy pozostają bez zmian. Próba ochrony oryginału przy nieudanej migracji oraz pełniejszy odbiór 1.7 nadal są otwarte; status **w trakcie**.

### Aktualizacja D5e — 2026-10-01: nieudana migracja bez utraty oryginału

Z pobranego w D5c oryginału schematu 4 przygotowano wyłącznie do QA `tests/qa/Eko_D5e_orphan_resource_v4.json` (21 764 bajty, SHA256 `D545BCBB5152DFD7168D00109FFD7B367BC5C545D3F256AE3BB84B1FCC21FD2A`). Zachowano 16 operacji i 60 pozycji BOM; dodano syntetyczny, osierocony klucz ustawień zasobów `["QA-OLD"]` z 2 operatorami × 1 kopią. Nie są to dane produkcyjne.

Na izolowanym porcie 5178 najpierw zaimportowano poprawny oryginał Eko do projektu 4 i przygotowano warsztat v5 z 16 trwałymi stanowiskami. Pobrany oryginał warsztatu miał SHA256 `D3642553CF462004E398201CE2BB355241D6EC5538DA02D856D8325C1FB3BA19`. Następnie plik QA z osieroconym zasobem przeszedł import projektu 4; UI nadal pokazał 16 operacji, 60 materiałów i 16 wyliczonych stanowisk. Kliknięcie `Przygotuj z bieżącego projektu` zakończyło się komunikatem `Migracja zatrzymana: Osierocone ustawienia zasobów: ["QA-OLD"]. Rozstrzygnij je przed migracją.`

Warsztat v5 zachował czas poprzedniego zapisu, 16 stanowisk i pierwsze ID `ST-8b1018b4-8f10-4245-8aed-1b243d98e5d3`. Oryginalny JSON pobrany po odmowie miał identyczną długość i SHA256 jak przed próbą. Po przeładowaniu v5 nadal miał ten sam czas zapisu i ID. Eksport projektu 4 po przeładowaniu potwierdził, że osierocony klucz pozostał w źródle; migracja nie usunęła go po cichu. Konsola UI bez błędów technicznych. Kod aplikacji bez zmian; `npm.cmd run test -- --run`: 65/65.

Ten odbiór zamyka konkretną próbę ochrony oryginału przy nieudanej migracji. Punkt 1.7 pozostaje **w trakcie** do szerszego odbioru zapisów starszych niż schemat 4 i ich ponownego otwarcia.

### Aktualizacja D5f — 2026-10-01: import pliku bez wersji i ponowny odczyt

Z dołączonego do repozytorium `DEFAULT_MOTOR_PROJECT` utworzono plik QA `tests/qa/D5f_legacy_motor_untagged.json` (3714 bajtów, SHA256 `5374CA4458D0C87E2A4DDC0277C2EF4C086E06943944C74F83BB6B1A2876CAA6`). Ma starszy kształt bez `schemaVersion`, `algorithm` i `currency`; zawiera 6 operacji, 5 pozycji BOM i 2 przeszkody. Nie jest to odtworzony plik użytkownika ani dowód obsługi wszystkich dawnych wersji.

Na izolowanym porcie 5179 plik przeszedł import przez UI. Projekt 4 pokazał 6 operacji, 5 materiałów, 2 wyliczone stanowiska i pracochłonność 238 s/szt. Po zapisie i przeładowaniu liczby pozostały. Eksport z aplikacji miał `schemaVersion: 4`, domyślny `algorithm: RPW`, `currency: USD` i 2 stanowiska. Przygotowanie warsztatu v5 utworzyło 2 trwałe ID; po przeładowaniu pozostały `ST-61115b07-43f0-4393-be64-5b01cc6a0a17` oraz `ST-699263a6-1875-4da0-86ac-940108fa74bf`. Konsola UI bez błędów i ostrzeżeń technicznych. Kod aplikacji bez zmian; `npm.cmd run test -- --run`: 65/65.

Odbiór ujawnił ograniczenie: `Pobierz oryginał 4` w warsztacie zwrócił projekt już znormalizowany do schematu 4 (2689 bajtów, SHA256 `29FA28F25F8A05F7C7F5452C112EC551613A058D51752CFB7E7BE741726F083D`), a nie dokładne 3714 bajtów pliku bez wersji. Obecny importer 4 nie archiwizuje oryginalnych bajtów pliku. Zanim 1.7 zostanie uznany za wdrożony, trzeba zachować i odróżnić surowy import od znormalizowanej migawki użytej do migracji v5, z zachowaniem zgodności dotychczasowych zapisów.

### Aktualizacja D5g — 2026-10-01: bajtowe archiwum źródła importu

Przed zmianą zapisów wykonano pełny backup `backup/v0.4.0_przed_D5g_20261001_232729`: 109 plików źródeł, konfiguracji, przykładów i dokumentacji, zgodność SHA256 każdej pary źródło/kopia według `SHA256.txt`. Pominięto zależności, build, wyniki, poprzednie backupy, katalogi narzędzi i dowiązania. Odtworzenie do osobnego katalogu, instalacja według lockfile i build; kopia nie zawiera localStorage.

Importer projektu 4 archiwizuje surowe bajty pliku w opcjonalnym polu otoczki lokalnego zapisu, bez zmiany schematu `ProjectData`. Cofnij/Ponów przenosi projekt razem z jego źródłem. Migrowany warsztat 5 zapisuje osobno znormalizowaną migawkę schematu 4 oraz archiwum pierwotnego pliku. Dawne otoczki bez pola archiwum są czytane z pustym źródłem. Import projektu 5 czyści odniesienie do dawnego źródła. Błąd zapisu z powodu limitu localStorage zachowuje poprzedni poprawny zapis i jest pokazywany użytkownikowi.

Na izolowanym porcie 5180 zaimportowano przez UI `tests/qa/D5f_legacy_motor_untagged.json`. Przycisk pobrania pierwotnego pliku w projekcie 4 pojawił się po imporcie, zniknął po Cofnij i wrócił po Ponów. Po ręcznym zapisie i przeładowaniu pozostał dostępny. Migracja do v5 utworzyła 2 stanowiska z trwałymi ID; po przeładowaniu warsztatu pobrano oba artefakty. Pierwotny plik miał 3714 bajtów i SHA256 `5374CA4458D0C87E2A4DDC0277C2EF4C086E06943944C74F83BB6B1A2876CAA6`, identyczny z fixture; znormalizowana migawka 4 miała 2689 bajtów i inny SHA256. Dodanie pustego stanowiska oraz Cofnij nie usunęły archiwum. Konsola UI bez błędów i ostrzeżeń. Test archiwum sprawdza także znacznik UTF-8 BOM i dane poza granicą bloku kodowania; `npm.cmd run test -- --run`: 66/66, `npm.cmd run build`: poprawny.

Zgodność starych otoczek sprawdzono także w UI przez izolowaną stronę `tests/qa/D5g_legacy_wrapper_harness.html`: usunięto z obu lokalnych zapisów nowe pole archiwum bez zmiany projektów. Projekt 4 ponownie otworzył się z 6 operacjami, a warsztat 5 z 2 stanowiskami i aktywnym `Pobierz oryginał 4`; `Pobierz pierwotny import` był prawidłowo nieaktywny. Konsola nie zgłosiła błędów ani ostrzeżeń.

Ograniczenia: archiwum nie jest częścią przenośnego eksportu projektu 4 lub 5, więc przy przenosinach trzeba pobrać je oddzielnie. Wcześniejsze importy nie mają zachowanych pierwotnych bajtów. Przy plikach zbliżonych do 10 MB localStorage może nie pomieścić jednocześnie projektu i archiwum; brak zapisu jest jawny. Punkt 1.7 pozostaje **w trakcie** do rozstrzygnięcia przenośnego archiwum i szerszej zgodności dawnych zapisów.

### Aktualizacja D5h — 2026-10-02: przenośne archiwum v4/v5

Przed zmianą formatu przenośnego wykonano pełny backup `backup/v0.4.0_przed_D5h_20261002_063408`: 111 plików źródeł, konfiguracji, przykładów i dokumentacji, zgodność SHA256 wszystkich par według `SHA256.txt`. Wyłączono zależności, build, wyniki, wcześniejsze backupy, katalogi narzędzi i dowiązania. Odtworzenie do osobnego katalogu, instalacja według lockfile i build; localStorage nie należy do kopii.

Dodano wersjonowaną otoczkę `layout-studio-portable-archive` w osobnych eksportach v4 i v5. Zawiera projekt oraz zakodowane bajty pierwotnego importu, a dla v5 także znormalizowany JSON projektu 4 użyty do migracji. Zwykłe pliki projektu nadal mają dotychczasowy format. Importer rozpoznaje otoczkę, sprawdza wersję, schemat, kompletność i limit źródła, a następnie waliduje projekt i źródła przed potwierdzeniem zastąpienia. Nieznana wersja lub błędny plik nie zmienia zapisu. Limit archiwum: 25 MB; pierwotnego importu: 10 MB. LocalStorage nadal może mieć niższy limit, a brak miejsca jest jawny.

UI: na porcie 5181 zaimportowano plik D5f, zapisano projekt 4 i pobrano archiwum v4 (13 141 bajtów); następnie przygotowano 2 stanowiska i pobrano archiwum v5 (12 708 bajtów). Na osobnym porcie 5182 zaimportowano archiwum v4, zapisano i przeładowano projekt; pobrany pierwotny plik miał 3714 bajtów i SHA256 `5374CA4458D0C87E2A4DDC0277C2EF4C086E06943944C74F83BB6B1A2876CAA6`, identyczny z fixture. Import archiwum v5, ponowny odczyt i pobranie źródła zachowały ten sam hash oraz oba ID: `ST-51af5433-c95f-40c0-a80f-9c344b04b8ba`, `ST-093843f1-77e2-47f3-9573-8810e3a5e4f5`. Migawka `Pobierz oryginał 4` z obu adresów miała 2689 bajtów i ten sam SHA256 `8A7CD39299C9168D4794AEABD150F60806C4AD0496AF212E80197700359BE55B`. Archiwum z `formatVersion: 2` zostało odrzucone w UI; po przeładowaniu projekt 4 nadal miał 6 operacji i źródło, a v5 oba ID. Konsola bez błędów i ostrzeżeń. `npm.cmd run test -- --run`: 68/68, `npm.cmd run build`: poprawny.

Przenośny format zamyka lukę D5g dla nowych importów. Nie odtwarza bajtów importów sprzed D5g. Szerszy odbiór dawnych rzeczywistych plików oraz zachowania przy dużych archiwach pozostaje do wykonania; punkt 1.7 nadal **w trakcie**.

### Aktualizacja D5i — 2026-10-02: atomowy import przy limicie pamięci

Przed zmianą ścieżki zapisu wykonano pełny backup `backup/v0.4.0_przed_D5i_20261002_064811`: 112 plików źródeł, konfiguracji, przykładów i dokumentacji, zgodne SHA256 według `SHA256.txt`. Pominięto zależności, build, wyniki, wcześniejsze kopie, katalogi narzędzi i dowiązania. Odtworzenie do osobnego katalogu, instalacja według lockfile i build; localStorage nie należy do backupu.

W projekcie 4 importer przed zmianą stanu UI zapisuje zwalidowany projekt razem z bajtowym źródłem. Jeśli zapis się nie powiedzie, projekt i historia Cofnij/Ponów pozostają bez zmian. Odmowa importu ma osobny komunikat i nie oznacza poprawnego bieżącego zapisu jako uszkodzonego. Warsztat v5 wcześniej stosował zapis przed podmianą stanu. Dodano izolowany harness `tests/qa/D5i_storage_limit_harness.html` wyłącznie dla portu 5183; wypełnia i zwalnia osobny klucz QA, nie modyfikując zapisu projektu.

UI: projekt bazowy silników EV zapisano na porcie 5183; harness wypełnił klucz QA do 5 238 784 znaków i potwierdził osiągnięcie limitu. Próba importu oryginalnego Eko v4 (14 831 bajtów) została odrzucona z komunikatem o braku miejsca. Na ekranie pozostało 6 operacji, 5 materiałów, nieaktywne Cofnij i pobranie pierwotnego importu; nowa karta tego samego adresu otworzyła ten sam projekt bazowy. Po zwolnieniu klucza QA identyczny plik zaimportowano poprawnie: 16 operacji, 60 materiałów, Cofnij/Ponów i ponowny odczyt projektu. Pobrane źródło miało 14 831 bajtów i SHA256 `3F5CAE5C91ECCDFB891ED26844C1C47F15A747B71B3486DB93054156E24121EC`, identyczny z fixture. Konsola bez błędów i ostrzeżeń. `npm.cmd run test -- --run`: 68/68; `npm.cmd run build`: poprawny.

Odbiór zamyka konkretną próbę limitu localStorage dla importu projektu 4. Rzeczywiste starsze pliki użytkownika i inne profile przeglądarek pozostają do szerszej walidacji; punkt 1.7 nadal **w trakcie**.

### Aktualizacja D5j — 2026-10-02: jawna migracja starszego localStorage

Przed zmianą odczytu i zapisu wykonano backup `backup/v0.4.0_przed_D5j_20261002_070009`: 113 plików źródeł, konfiguracji, przykładów i dokumentacji, zgodne SHA256 według `SHA256.txt`. Pominięto zależności, build, wyniki, wcześniejsze kopie, katalogi narzędzi i dowiązania. Odtworzenie do osobnego katalogu, instalacja według lockfile i build; localStorage nie należy do backupu.

Poprawny starszy projekt znajdujący się już pod kluczem `layout-studio-v3` jest normalizowany w pamięci, ale automatyczny i ręczny zapis pozostają zablokowane. UI wymaga pobrania surowej otoczki localStorage i jawnego potwierdzenia migracji. Uszkodzony zapis nadal korzysta z dotychczasowej ścieżki odzyskiwania. Nie zmieniono schematu projektu ani formatu przenośnego archiwum.

UI na odizolowanym porcie 5184: harness `tests/qa/D5j_legacy_storage_harness.html` umieścił pod kluczem lokalnym dołączony projekt silników EV bez `schemaVersion` (6 operacji, 5 pozycji BOM). Surowa otoczka miała 2642 znaki i SHA256 `2C25DFE103B5ED321018CD2239A781A06FAE1F7A14078CBAF2E7B7C01A2FE247`. Po otwarciu aplikacji migracja była niedostępna do pobrania kopii. Ręczny zapis oraz anulowanie potwierdzenia nie zmieniły SHA256. Pobrany `Starszy_zapis_lokalny.json` miał identyczny SHA256. Po potwierdzeniu localStorage zawierał schemat 4, nadal 6 operacji i 5 materiałów; ponowne otwarcie nie pokazało ostrzeżenia. Migracja do warsztatu 5 utworzyła 2 trwałe ID, które przetrwały kolejne otwarcie. `npm.cmd run test -- --run`: 68/68; `npm.cmd run build`: poprawny.

Przycisk pobrania potwierdza próbę pobrania w przeglądarce; użytkownik powinien sprawdzić plik przed zatwierdzeniem migracji. Szerszy odbiór dawnych rzeczywistych zapisów i innych profili przeglądarek pozostaje do wykonania; punkt 1.7 nadal **w trakcie**.

### Aktualizacja D5k — 2026-10-02: walidacja dużych archiwów

Przed zmianą walidatora archiwum wykonano backup `backup/v0.4.0_przed_D5k_20261002_192024`: 114 plików źródeł, konfiguracji, przykładów i dokumentacji, zgodne SHA256 według `SHA256.txt`. Pominięto zależności, build, wyniki, wcześniejsze kopie, katalogi narzędzi i dowiązania. Odtworzenie do osobnego katalogu, instalacja według lockfile i build; localStorage nie należy do backupu.

Na izolowanym porcie 5185 przygotowano poprawne archiwum projektu 4 o rozmiarze 5 600 126 bajtów, z pierwotnym JSON powiększonym białymi znakami do 4 198 018 bajtów. Przed poprawką import zwrócił `Maximum call stack size exceeded` w walidacji base64. Nowy test regresyjny odtworzył ten sam wyjątek w `RegExp.test`. Wyrażenie z powtarzaną grupą zastąpiono sprawdzeniem alfabetu, długości i położenia dopełnienia oraz obliczeniem liczby bajtów z długości base64. Format archiwum i limit 10 MB źródła pozostały takie same.

Po poprawce ten sam plik przeszedł walidację i doszedł do potwierdzenia. Zapis został odrzucony czytelnym komunikatem o limicie localStorage; UI zachowało 6 operacji, 5 materiałów, nieaktywne Cofnij i pobranie pierwotnego importu, także po otwarciu nowej karty. Archiwum o rozmiarze 1 405 822 bajtów z pierwotnym JSON 1 052 290 bajtów zostało zapisane. Po ponownym otwarciu pobrany pierwotny plik miał 1 052 290 bajtów i SHA256 `1C4F6E02CB78A6F352190DA3042FB5B63B96FE985D1B72FB85A47E28AECC93DA`, identyczny z wygenerowanym źródłem. Pliki testowe utworzono w `outputs/qa` i nie są częścią backupu. `npm.cmd run test -- --run`: 69/69; `npm.cmd run build`: poprawny.

Limit localStorage zależy od przeglądarki i profilu. Duże archiwum przenośne może mieścić się w limicie pliku 25 MB, ale nie zmieścić się w pamięci lokalnej; importer zachowuje wtedy poprzedni projekt. Rzeczywiste dawne zapisy użytkownika i inne profile pozostają do szerszego odbioru; punkt 1.7 nadal **w trakcie**.

### Domknięcie i pełny odbiór punktów 1.5 oraz 1.6 (2026-10-02)

Punkty 1.5 oraz 1.6 zostały w całości zrealizowane i odebrane:
- Zaimplementowano usuwanie operacji ze stanowiska (`removeStationOperation`) w schemacie 5: stanowisko zachowuje swoje trwałe ID (`ST-...`), wyposażenie w `layoutObjects` oraz wpisy w `workstationSettings`, stając się stanowiskiem pustym o cyklu 0 s. Pozostałe stanowiska nie są przenumerowywane.
- W warsztacie v5 dodano panel usuwania operacji z zachowaniem tożsamości stanowiska, z ostrzeżeniem, potwierdzeniem i odwracalnością przez Cofnij/Ponów.
- Zautomatyzowany test UI w przeglądarce Edge (CDP) `tests/qa/verify_1_5_1_6.mjs` potwierdził na rzeczywistym projekcie Eko v5 zachowanie trwałych ID przy zmianie kolejności, odmowę niepoprawnej kolejności naruszającej zależności, podział z błędem braku stołu i jawnym dodaniem wyposażenia, usunięcie operacji z zachowaniem ID i stołów, Cofnij/Ponów oraz odczyt po przeładowaniu strony.
- 76/76 testów jednostkowych i integracyjnych oraz build produkcyjny zakończone sukcesem.
- Szczegółowy raport odbioru: `WERYFIKACJA_STALE_ID_1_5_1_6.md`.
- Punkty 1.5 i 1.6 mają status **wdrożone**. Etap 1 został w całości ukończony.
