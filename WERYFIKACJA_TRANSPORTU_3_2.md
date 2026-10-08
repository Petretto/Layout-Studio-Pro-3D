# Punkty materiałowe i połączenia — 3.2

## 3.2b / 3.2.2 — odbiór 2026-10-08

Użytkownik zatwierdził 1A: magazyn jest punktem sieci materiałowej, a lokalizacje początkowe korpusu nie zmieniają znaczenia. Wdrożono rdzeń, parser i zapis opcjonalnej sieci w szkicu 6. Edytor użytkownika należy do 3.2.3; nie oznaczono całego 3.2 jako wdrożonego.

Backup przed zmianą struktury: `backup/v0.4.0_przed_3_2b_20261008`, 203 pliki; niezależna kontrola SHA256 — 0 rozbieżności.

Zmiany: `src/core/materialNetwork.ts` (punkty, dwa rodzaje połączeń, walidator, jawne jednostki mm/m i odczyt danych trasy przez referencję), `domainMaterialEditing.ts` (niemutująca edycja całej sieci), `domainProject.ts` (opcjonalne pole i walidacja; usunięcie niezweryfikowanego pola z projektu przygotowywanego ze źródła 4/5). Kontrakt w `MODEL_TRANSPORTU_3_2.md`. Brak zmian silnika rezerwacji, zdarzeń, lokalizacji lub reguł wyboru trasy.

144/144 testów: PASS. Pięć nowych testów obejmuje:

- pełną zgodność harmonogramu gałęzi z siecią i bez niej, brak mutacji oraz usunięcie opcjonalnego pola;
- referencję do jednej długości/czasu istniejącej trasy i aktualny odczyt po jej edycji, bez zwrotnego mutowania czasu przez wynik helpera;
- jednostki mm/m, odmowę brakującej/ujemnej/nieskończonej wartości, nieznanej jednostki i przepełnienia;
- 27 wariantów błędnych punktów, kierunków, kopii, referencji i danych połączeń; usunięcie trasy używanej przez sieć i nieznane pola/null;
- zapis/odczyt i usunięcie sieci po migracji obu rzeczywistych plików Eko 4/5, dokładne źródło, zachowanie aktywnych zapisów i poprzedniego szkicu przy odmowie błędnej sieci; osobny test nieaktywowania niezweryfikowanego pola sieci ze źródła 5.

Pierwszy przebieg wykrył dwa błędy testu: porównanie usuniętego pola z polem ustawionym na undefined oraz niekompletną syntetyczną obsadę przy dopisaniu ustawień kopii. Poprawiono testy; nie zmieniono reguł produkcyjnych. Ponowny przebieg: 144/144 PASS. Build/typecheck: PASS; osobny worker harmonogramu zawiera nowy walidator.

Edge CDP, produkcyjny build: `node tests/qa/verify_2_7e.mjs --branches --material`, porty 5214/9354: PASS. Syntetyczny szkic gałęzi zawiera punkt magazynowy, dwa punkty jednej kopii i wejście kolejnej oraz referencję do istniejącej drogi. Aplikacja odczytuje sieć, dotychczasowy wybór stanowiska i przewóz pozostają zgodne. Edycja ról/wejścia korpusu, historia, ponowny odczyt i ponowne obliczenie zachowują pełną sieć materiałową. Dokładne źródło i aktywne 4/5 bez zmian, nieobsłużonych wyjątków JS brak. To regresja istniejącego UI i odczytu nowego modelu, nie odbiór formularza edycji sieci.

Kompatybilność: stare szkice nie otrzymują domyślnych punktów, tras, długości lub czasów. Brak pola jest poprawny; obecne pole jest walidowane. Nie ma konwersji istniejących zapisów ani zmiany roboczego schematu 6. Niezweryfikowane rozszerzenia źródła nie są aktywowane w nowym szkicu, a originalJson pozostaje dokładny. Opcjonalne połączenie magazynowe nie przenosi korpusu i nie wprowadza czasu dostawy do harmonogramu. Geometryczne położenie punktów, przeliczanie czasu transportu, zasoby przewozu i bufory pozostają poza pakietem.

Status 3.2.2: wdrożone w zakresie rdzenia i zapisu. 3.2: w trakcie. Następne 3.2.3: edytor punktów/połączeń, jednostki, wspólna historia, zapis/odczyt i odbiór dwóch niezależnych procesów. Aktualne postępy głównych ID (`node scripts/plan_progress.mjs`): cały plan **21/67 = 31,3%**, pierwsze wydanie **21/65 = 32,3%**. Ukończenie podpunktu nie zwiększa licznika głównego przed odbiorem całego 3.2.

## 3.2c / 3.2.3 — odbiór 2026-10-08

Backup `backup/v0.4.0_przed_3_2c_20261008`: 206 plików, niezależna kontrola SHA256 — 0 rozbieżności. Dodano DomainMaterialEditor i podłączono go do istniejącego applyDraftChange/Cofnij/Ponów w DomainDraftPanel, z remountem po zapisanej zmianie. Parser, model, silnik, geometria oraz klucze zapisu bez nowych zmian.

Formularz pozwala dodawać i edytować ID/nazwy/kierunki punktów, wybierać punkt zewnętrzny albo konkretną kopię stanowiska, tworzyć skierowane połączenia, wybierać istniejącą trasę albo wpisywać długość i źródło trasy zewnętrznej. Nowe wiersze mają puste ID, końce i dane pomiaru; brak przykładowych długości lub czasów. mm/m przeliczają tę samą wewnętrzną długość. Zmiana danych trasy zewnętrznej usuwa lokalne potwierdzenie, a zmiana jednostki prezentacji nie usuwa go i nie zmienia odległości. Wcześniej zapisany opcjonalny czas zewnętrzny jest zachowany i pokazany odczytowo; formularz nie nadaje mu czasu domyślnego.

Połączenie stanowisk odczytuje aktualną długość/źródło/czas z jednej istniejącej trasy. UI informuje, że połączenie zewnętrzne jest definicją sieci i nie uruchamia dostawy korpusu. Usuwanie punktu używanego przez połączenie wymaga wcześniejszej zmiany/usunięcia połączenia. Zapis całej sieci oraz usunięcie całego opcjonalnego zapisu korzystają z walidacji i wspólnej historii. Niepoprawny formularz nie nadpisuje poprzedniego zapisu. Cofnij/Ponów odtwarzają zapisane dane formularza; przeładowanie odtwarza sieć, a historię sesji zeruje zgodnie z istniejącą obsługą szkicu.

144/144 testów: PASS. Dotychczasowe testy rdzenia sieci, źródeł, kompatybilności i harmonogramów pozostają poprawne. Build/typecheck: PASS. Nie dodano testów odwzorowujących mechanikę formularza; jego zachowanie odebrano w rzeczywistym UI.

Rozszerzone Edge CDP `verify_2_7e.mjs --branches --material-editor` (5215/9355) oraz `--preparation --material-editor` (5216/9356): PASS. Dwa jawnie syntetyczne, niezależne procesy poza Eko: trzy gałęziowe operacje na korpusie z wyborem kopii oraz dwie operacje podmontażu/montażu. W obu utworzono przez UI cztery punkty (magazyn, wejście/wyjście pierwszej kopii, wejście kolejnej) i dwa połączenia. Potwierdzono:

- odmowę długości bez potwierdzenia; 1,25 m → 1250 mm, zmianę jednostki bez zmiany zapisu i 1,5 m → 1500 mm po ponownym potwierdzeniu;
- odczyt 7 mm/1 s lub 3000 mm z istniejącej trasy, zmianę długości w jej pierwotnym edytorze i aktualny odczyt w sieci, następnie Cofnij;
- odmowę zmiany ID istniejącej trasy osierocającej połączenie oraz niezmienność zapisu;
- odmowy usunięcia używanego punktu, powtórzonego ID, niedozwolonego kierunku i nieistniejącej kopii;
- wspólne Cofnij/Ponów długości; usunięcie połączenia/punktu i Cofnij; usunięcie całej sieci i Cofnij;
- ponowny odczyt pełnej sieci i identyczny tekst szczegółowego harmonogramu przed dodaniem sieci, po jej edycji i po przeładowaniu;
- zachowanie dokładnego originalJson oraz aktywnych projektów 4/5. Nieobsłużonych wyjątków JS brak.

Screenshoty `outputs/qa/verify_3_2c_branches.png`, `verify_3_2c_branches_links.png`, `verify_3_2c_preparation.png` i `verify_3_2c_preparation_links.png`: formularze punktów, jednostki, potwierdzenia i odczyt trasy. Obejrzano widok punktów i połączeń; układ i komunikaty czytelne.

Status 3.2.3 i całego 3.2: wdrożone w zatwierdzonym zakresie 1A. Nie dodano położenia punktów na mapie/3D, automatycznej długości z geometrii ani zdarzeń dostawy z magazynu. Wyliczanie czasu należy do 3.3, zasoby przewozu do 3.4, a skalowalność dużej listy do 3.9. Punktów nie wolno interpretować jako nowych lokalizacji rejestru korpusu. Następne 3.3. Postęp głównych ID: cały plan **22/67 = 32,8%**, pierwsze wydanie **22/65 = 33,8%**.
