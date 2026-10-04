# Plan rozwoju i rejestr postępu aplikacji

Data utworzenia: 2026-09-29  
Ostatnia aktualizacja: 2026-10-04
Wersja bazowa: Layout Studio Pro 3D 0.4.0  
Główny przypadek testowy: proces Eko.

## Cel i zakres

Dopracować obecną aplikację React/TypeScript/Three.js do projektowania, balansowania i porównywania wariantów linii produkcyjnych. Najpierw zapewnić poprawność modelu, bezpieczeństwo danych i wygodę pracy, następnie rozbudować symulację, CAD i 3D oraz przygotować wydanie komercyjne o jasno określonym zakresie.

Plan nie zakłada migracji do C# ani Unity. Figma lub Pencil mogą wspierać projektowanie interfejsu, a Blender przygotowanie modeli wyposażenia. Nie są wymagane do rozpoczęcia prac.

„W pełni funkcjonalna” oznacza spełnienie poniższych kryteriów odbioru i udokumentowanie ograniczeń, nie deklarację zastąpienia pełnego CAD lub Visual Components ani certyfikację przemysłową.

## Zasady aktualizacji postępu

Każdy krok ma trwałe ID oraz jeden z trzech statusów:

- **nierozpoczęte** — implementacja lub weryfikacja tego kroku jeszcze się nie rozpoczęła;
- **w trakcie** — rozpoczęto pracę, lecz nie spełniono wszystkich kryteriów odbioru;
- **wdrożone** — rezultat został ukończony, sprawdzony i opisany; przy funkcji oznacza to implementację i weryfikację, przy zadaniu dokumentacyjnym lub kontrolnym — zapisany, zweryfikowany rezultat.

Procedura przy każdym pakiecie prac:

1. Przed rozpoczęciem zmienić status odpowiednich ID na „w trakcie” i wskazać je w sekcji „Bieżący pakiet”.
2. Przed zmianami przebudowującymi moduły wykonać kopię i zapisać jej dokładną lokalizację. Nie kopiować rekurencyjnie zależności, wcześniejszych backupów ani dowiązań w `outputs`.
3. Wdrażać małe, spójne zmiany, zachowując kompatybilność danych albo zapewniając sprawdzoną migrację.
4. Dla każdego ukończonego ID dopisać do rejestru datę, rezultat, dowód weryfikacji i odnośnik do raportu lub plików.
5. Dopiero po pozytywnej weryfikacji ustawić „wdrożone”. Sam build lub samo dodanie kodu nie potwierdza działania funkcji w UI.
6. Aktualizować podsumowanie etapów, opis funkcji, instrukcję i datę ostatniej aktualizacji odpowiednio do zakresu zmian.
7. Jeśli brakuje danych lub decyzji, pozostawić „w trakcie” i zapisać blokadę oraz potrzebną informację. Nie oznaczać zadania jako ukończonego.
8. Gdy wykryto regresję ukończonego kroku, przywrócić „w trakcie” i odnotować przyczynę.

Status etapu: „nierozpoczęte”, gdy żaden jego krok nie został rozpoczęty; „w trakcie”, gdy rozpoczęto co najmniej jeden krok, lecz etap nie przeszedł pełnego odbioru; „wdrożone”, gdy wszystkie kroki są ukończone i spełniono kryterium odbioru etapu.

Dokument jest ręcznie aktualizowanym źródłem statusu podczas kolejnych prac. Nie uruchamia automatycznego monitorowania ani harmonogramu zadań.

## Punkt wyjścia

W wersji 0.4.0 istnieją m.in. import/eksport procesu i BOM, poprzednicy i następnicy, diagram przepływu, RPW/LCR i ręczny balans, liczba operatorów i kopii stanowisk, layout grafowy, CAD 2D, edycja formularzowa 3D i deterministyczna symulacja grafowa.

Według raportu `ZMIANY_v0.4.0.md` poprzednia weryfikacja zakończyła się wynikiem 35/35 testów i poprawnym buildem. Nie jest to nowy test wykonany przy zapisywaniu tego planu. Obsługa przeciągania myszą w 3D nadal wymaga jednoznacznego odbioru.

Brakuje m.in. współdzielonych pracowników, ograniczonych buforów, transportu oraz fizycznych ograniczeń montażu wspólnego korpusu. Cztery dodatkowe etapy montażu Eko mają przykładowe czasy. Aktualne ograniczenia opisuje `FUNKCJE_PROGRAMU.md`.

Istniejące funkcje nie są automatycznie oznaczane poniżej jako „wdrożone”: kroki planu dotyczą ich dalszego dopracowania albo nowej weryfikacji.

## Podsumowanie etapów

| Etap | Zakres | Status | Zależności |
| --- | --- | --- | --- |
| 1 | Stabilizacja i bezpieczeństwo projektu | wdrożone | Punkt wyjścia 0.4.0 |
| 2 | Model procesu i zasobów | w trakcie | Fundament etapu 1 |
| 3 | Symulacja powiązana z layoutem | w trakcie | Etap 2; podstawowe trasy i punkty transportowe |
| 4 | Balansowanie i porównywanie wariantów | nierozpoczęte | Etapy 2–3 |
| 5 | Edytor hali i spójny interfejs | w trakcie | Stabilny model danych; podstawowe poprawki UX od etapu 1 |
| 6 | Biblioteka wyposażenia i 3D | nierozpoczęte | Etapy 3 i 5 |
| 7 | Walidacja Eko i przygotowanie komercyjne | nierozpoczęte | Etapy 1–6; zbieranie danych od początku |

## Bieżący pakiet

2.1k / 2.1.11 (2026-10-04): zbiorczy odbiór punktu 2.1 na Eko v4/v5 i silnikach v4. Po edycji i ponownym otwarciu odrębnego szkicu 6 aktywne źródła i pełne wyniki dotychczasowej symulacji są identyczne; istniejące testy potwierdzają kompletność referencji, ochronę źródła i odmowy migracji, a Edge CDP potwierdza UI, Cofnij/Ponów, odczyt, odzyskanie i zastąpienie. 89/89 testów, build i UI poprawne. Bez zmian struktury modułów lub schematu; nowa kopia nie była wymagana. Raport `WERYFIKACJA_MODELU_2_1.md`. Punkt 2.1 wdrożony jako fundament odrębnego, nadal niekompletnego modelu; reguły zasobów i aktywacja nowej symulacji należą do 2.2–2.9.

2.1j / 2.1.10 (2026-10-04): opcjonalna, ręczna lista operacji, które wyposażenie technologiczne może obsłużyć w szkicu 6. Brak pola oznacza „nie określono” także w dawnych szkicach. Backup 129 plików: `backup/v0.4.0_przed_2_1j_20261004_211725` (zgodne SHA256). 88/88 testów i build poprawne. Edge CDP potwierdził zapis OP10/OP11, Cofnij/Ponów, przeładowanie, wyczyszczenie i przywrócenie z nienaruszonym v4/v5; zrzut `outputs/qa/verify_2_1j_capabilities.png`. Raport `WERYFIKACJA_MODELU_2_1.md`. Deklaracja możliwości nie oznacza wymagania operacji ani nie zmienia bilansu lub symulacji; punkt 2.1 nadal w trakcie.

2.1i / 2.1.9 (rozpoczęty 2026-10-03, odebrany 2026-10-04): ręczna edycja wyposażenia w szkicu 6 po trwałym ID, z opcjonalnymi jawnymi powiązaniami do stanowiska i obiektu layoutu, walidacją referencji, odrębnym zapisem oraz wspólnym Cofnij/Ponów. Backup 127 plików: `backup/v0.4.0_przed_2_1i_20261003_105556` (zgodne SHA256). 87/87 testów i build poprawne. Edge CDP potwierdził dodanie, zmianę, odmowę podwójnego lub sprzecznego powiązania, Cofnij/Ponów, usunięcie, przywrócenie i ponowne otwarcie bez zmiany v4/v5; zrzut `outputs/qa/verify_2_1i_equipment.png`. Raport `WERYFIKACJA_MODELU_2_1.md`. Punkt 2.1 pozostaje w trakcie: możliwości wyposażenia i reguły jego wymagania przez operacje pozostają nieokreślone.

2.1h / 2.1.8 (2026-10-03): ręczna edycja definicji wyrobu i podzespołów w odrębnym szkicu 6, z trwałym ID, jawnymi referencjami do operacji, walidacją, bezpiecznym zapisem oraz wspólnym Cofnij/Ponów z osobami i pulami. Backup 125 plików: `backup/v0.4.0_przed_2_1h_20261003_103639` (zgodne SHA256). 86/86 testów, build poprawny. Edge CDP `tests/qa/verify_2_1e.mjs` potwierdził dodanie, zmianę nazw, usunięcie i przywrócenie obu definicji, relacje OP10/OP11, zapis po przeładowaniu i niezmienność v4/v5; zrzut `outputs/qa/verify_2_1h_product.png`. Raport `WERYFIKACJA_MODELU_2_1.md`. Punkt 2.1 pozostaje w trakcie do edycji wyposażenia i pełnego odbioru modelu; definicje nie wpływają na bilans ani symulację.

2.1g (2026-10-03): edytor osób i pul w niekompletnym szkicu 6, z trwałymi ID, walidacją członkostwa, odmową usunięcia osoby używanej przez pulę, zapisem po każdej zaakceptowanej zmianie i Cofnij/Ponów. Backup 123 plików: `backup/v0.4.0_przed_2_1g_20261003_102214` (zgodne SHA256). Testy 85/85, build poprawny. Rozszerzony odbiór Edge CDP `tests/qa/verify_2_1e.mjs` potwierdził dodanie i zmianę osób/puli, odmowę błędnego usunięcia, bezpieczną zmianę członkostwa i usunięcie, Cofnij/Ponów, ponowne otwarcie i niezmienność v4/v5; zrzut `outputs/qa/verify_2_1g_people.png`. Raport `WERYFIKACJA_MODELU_2_1.md`. Punkt 2.1 w trakcie do edycji pozostałych bytów domenowych i pełnego odbioru modelu; osoby nie wpływają jeszcze na bilans ani symulację.

2.1f (2026-10-03): kontrolowane zastąpienie istniejącego lub uszkodzonego szkicu v6 dopiero po pobraniu jego pełnej/surowej kopii, przeglądzie nowego źródła i jawnym potwierdzeniu. Nowy szkic jest walidowany przed zapisem, a poprzednia wartość porównywana znak po znaku; konflikt i błąd pamięci nie zmieniają jej. Backup 123 plików: `backup/v0.4.0_przed_2_1f_20261003_101316` (zgodne SHA256). Testy 84/84, build poprawny. Rozszerzony odbiór Edge CDP `tests/qa/verify_2_1e.mjs` potwierdził odzyskanie uszkodzonego szkicu, jawne zastąpienie poprawnego szkicu z innym źródłem, odmowę przy konflikcie i limicie pamięci, ponowne otwarcie oraz nienaruszone dane v4/v5; zrzut `outputs/qa/verify_2_1f_recovered.png`. Raport `WERYFIKACJA_MODELU_2_1.md`. Punkt 2.1 nadal w trakcie do edytora danych domenowych i pełnego odbioru modelu.

2.1e (2026-10-03): UI podglądu migracji v4/v5 do niekompletnego szkicu v6 w warsztacie stanowisk. Pokazuje powiązania i luki danych, wymaga potwierdzenia przed pierwszym zapisem, odrzuca nieaktualny podgląd, odczytuje szkic po przeładowaniu i pozwala pobrać surową kopię uszkodzonej wartości. Backup 121 plików: `backup/v0.4.0_przed_2_1e_20261003_084320` (zgodne SHA256). Odbiór Edge CDP `tests/qa/verify_2_1e.mjs` potwierdził przepływ Eko v5, podgląd v4, zapis/ponowne otwarcie, ochronę aktywnych projektów v4/v5 i pobranie uszkodzonego szkicu; zrzuty `outputs/qa/verify_2_1e_saved.png` oraz `outputs/qa/verify_2_1e.png`. 83/83 testy i build poprawne. Raport `WERYFIKACJA_MODELU_2_1.md`. Punkt 2.1 w trakcie: szkic wymaga późniejszego edytora uzupełniania danych, jawnego zastąpienia po odzyskaniu oraz dalszego odbioru migracji.

2.1d (2026-10-03): izolowany moduł zapisu/odczytu szkicu schematu 6 pod osobnym kluczem `layout-studio-domain-v6-draft-v1`. Zachowuje dokładny tekst źródła v4/v5, waliduje oba projekty przy zapisie i odczycie, odróżnia pusty, poprawny, uszkodzony i niedostępny zapis. Odmawia nadpisania przy konflikcie, uszkodzeniu, zmianie źródła lub błędzie walidacji; błąd limitu pamięci zachowuje poprzednią wartość. Backup 120 plików: `backup/v0.4.0_przed_2_1d_20261003_083551` (zgodne SHA256). Testy Eko v4/v5, ponownego odczytu, aktualizacji i odmów: 83/83; build poprawny. Raport `WERYFIKACJA_MODELU_2_1.md`. Punkt 2.1 pozostaje w trakcie: moduł nie jest jeszcze podłączony do UI i nie ma odbioru zapisu w przeglądarce.

2.1c (2026-10-03): osobny, nieaktywny schemat roboczy 6 i parser rozdzielają operacje, stanowiska, obsadę, osoby/pule, wyposażenie technologiczne, wyrób i podzespoły. Migracja wymaga zweryfikowanego podglądu 2.1b i zachowuje dokładny tekst źródła osobno. Brakujących bytów nie dopowiedziano, szkic ma wyłącznie status `incomplete`. Backup 119 plików: `backup/v0.4.0_przed_2_1c_20261003_082515` (zgodne SHA256). Eko v4/v5, roundtrip i odmowy błędnych referencji: 81/81 testów, build poprawny; raport `WERYFIKACJA_MODELU_2_1.md`. Punkt 2.1 w trakcie do zapisu, UI i odbioru ponownego otwarcia.

2.1b (2026-10-03): odczytowy, wersjonowany podgląd migracji modelu procesu ze schematów 4/5 zachowuje oryginalny JSON, mapy operacja–stanowisko, jawnie zapisane liczby obsady/kopii i wizualne powiązania wyposażenia; wskazuje luki danych bez tworzenia osób, podzespołów ani możliwości maszyn. Backup 117 plików: `backup/v0.4.0_przed_2_1b_20261003_081637` (zgodne SHA256). Testy Eko i silników, błędnych referencji, odmowy zmienionego podglądu: 78/78; build poprawny. Raport `WERYFIKACJA_MODELU_2_1.md`. Punkt 2.1 w trakcie; nie podłączono nowego modelu do UI, zapisu ani symulacji.

2.1a (2026-10-03): opisano kontrakt oddzielnych operacji, stanowisk, pracowników/pul, wyposażenia, wyrobu i podzespołów oraz jednostki, referencje i ścieżkę migracji v4/v5. Dokument `MODEL_PROCESU_2_1.md` wskazuje dane, których nie wolno dopowiadać z obecnego projektu, i kryteria następnego pakietu. Zweryfikowano liczby w rzeczywistym eksporcie Eko i 76/76 testów; kod, schematy i wyniki symulacji bez zmian. Punkt 2.1 pozostaje w trakcie do implementacji wersjonowanego modelu, parsera, migracji i odbioru UI.
 
1.5/1.6 (2026-10-02): Domknięcie i całościowy odbiór punktów 1.5 i 1.6 (trwałe identyfikatory stanowisk niezależne od numeracji i zestawu operacji; eliminacja niejawnego resetowania zasobów i wyposażenia przy zmianie przydziału, podziale, scaleniu i usunięciu operacji). Wprowadzono i zweryfikowano: trwałe identyfikatory `ST-...` generowane stabilnie w rejestrze stanowisk v5; przesuwanie stanowisk w górę/dół bez mutacji ID i geometrii; ochronę kolejności grafu technologicznego przed niepoprawnym przestawieniem; jawny podział stanowiska z zachowaniem starego ID, zasobów i geometrii stacji źródłowej oraz utworzeniem nowego unikalnego ID bez powiązań; jawne scalenie wymagające wskazania pozostającego ID z prezentacją obiektów i ustawień wycofywanego ID przed zatwierdzeniem; panel usuwania operacji ze stanowiska (`removeStationOperation`), który czyści relacje technologiczne i referencje BOM, lecz zachowuje stanowisko jako puste (`operationIds: []`), z cyklem 0 s, nienaruszonym trwałym ID, wyposażeniem w `layoutObjects` i zasobami w `workstationSettings`. Brak wymaganego wyposażenia (np. brak stołów) natychmiast blokuje symulację jawnym błędem layoutu bez domyślania się geometrii. Zautomatyzowany odbiór UI w przeglądarce Edge (CDP) na porcie 5197 (`tests/qa/verify_1_5_1_6.mjs`) potwierdził: odmowę zamiany kolejności naruszającej graf OP10/OP11, zamianę kolejności niezależnych stacji z zachowaniem ID, podział stacji z blokadą brakującego stołu i ręczne dodanie stołu w edytorze geometrii, usunięcie OP10 ze stanowiska 1 z zachowaniem pustego stanowiska i jego ID, pełny cykl Cofnij/Ponów oraz odczyt po przeładowaniu strony (18 stanowisk z zachowanymi danymi). 76/76 testów jednostkowych i build poprawne. Raporty: `WERYFIKACJA_STALE_ID_1_5_1_6.md` oraz uzupełnienie `WERYFIKACJA_STABILIZACJA_D.md`. Punkty 1.5 i 1.6 wdrożone; Etap 1 wdrożony w całości.
 
1.7 (2026-10-02): Domknięcie i całościowy odbiór punktu 1.7 (zapis, odzyskiwanie i migracja starych projektów; ochrona oryginału przy nieudanej migracji; ponowne otwarcie). Konsolidacja zrealizowanych prac D5c–D5k: ochrona oryginału przy migracji Eko, odzyskiwanie uszkodzonego localStorage w v4 i v5 z pobraniem surowej kopii, blokada migracji przy osieroconych zasobach, import projektów bez wersji z normalizacją i zachowaniem bajtowego źródła, wersjonowane przenośne archiwa v4/v5, atomowy import przy limicie pamięci, jawna migracja starszego localStorage i walidacja dużych archiwów. Backup 128 plików: `backup/v0.4.0_przed_1_7_20261002_220500` (zgodne SHA256). Zautomatyzowany odbiór UI w przeglądarce Edge (CDP) na porcie 5194 potwierdził wszystkie 4 scenariusze: odzyskiwanie corrupt stringa, jawną migrację projektu bez wersji, blokadę migracji z osieroconym zasobem bez mutacji v5 i zachowanie danych po przeładowaniu. 75/75 testów i build poprawne. Raport: `WERYFIKACJA_MIGRACJA_ZAPIS_1_7.md`. Punkt 1.7 wdrożony.

5.11 (2026-10-02): Przełączanie prezentacji i edycji jednostek czasu między sekundami (s), minutami (min) i godzinami dziesiętnymi (h) w całym interfejsie: metrykach (Pulpit, Popyt, Bilans), polach edycyjnych operacji i zasobów, tabelach procesu i wariantów, osi czasu symulacji i diagramie. Wartości wewnętrzne pozostają niezmiennie w sekundach (brak zmian w schemacie danych i algorytmach; pełna zgodność z zapisanymi projektami). Jednostka czasu jest zawsze jawnie prezentowana. Backup 124 plików: `backup/v0.4.0_przed_5_11_20261002_215000` (zgodne SHA256). Zautomatyzowany odbiór UI w przeglądarce Edge (CDP) na porcie 5195 potwierdził przełączanie jednostek w locie, dynamiczne etykiety kolumn i formularzy, edycję 2,5 min = 150 s w modelu, niezmienność wewnętrznych sekund w localStorage oraz formatowanie metryk. 75/75 testów i build poprawne. Raport: `WERYFIKACJA_JEDNOSTKI_CZASU_5_11.md`. Punkt 5.11 wdrożony.

5.12 (2026-10-02): Gotowe, pobieralne szablony importu procesu i BOM w XLSX i CSV, zgodne z bieżącym importerem. Wzorcowe dane wielogałęziowe procesu (OP10 → OP20, OP25 → OP30) oraz 5 komponentów BOM z wszystkimi dopuszczalnymi pojemnikami (BoxKLT, Tray, Carton, Pallet). Dwuarkuszowy plik XLSX: arkusz 0 „Dane” gotowy do natychmiastowego importu bez usuwania opisów, arkusz 1 „Opis kolumn” ze specyfikacją wymagań, typów i jednostek. W UI dodano przyciski „Szablon XLSX” i „Szablon CSV”, rozwijaną tabelę specyfikacji kolumn z odznakami wymagań, a błędy importu wskazują dokładne nazwy brakujących nagłówków przy zachowaniu atomowości (dane projektu nienaruszone). Backup 105 plików: `backup/v0.4.0_przed_5_12_20261002_213500` (zgodne SHA256). Zautomatyzowany odbiór UI w przeglądarce Edge (CDP) na porcie 5196 potwierdził pobranie szablonów, import procesu (4 stacje) i czytelny błąd przy brakujących kolumnach BOM. 73/73 testy i build poprawne. Raport: `WERYFIKACJA_SZABLONY_5_12.md`. Punkt 5.12 wdrożony.

3.10 (2026-10-02): Rozszerzenie wyboru szybkości odtwarzania symulacji ponad obecne 100× dla długich procesów (1×, 2×, 5×, 10×, 20×, 50×, 100×, 200×, 500×, 1000×, 2000×, 5000×). Funkcja pomocnicza `stepSimulationTime` zabezpiecza granicę czasu (brak przekroczenia `end`, przycięcie skoku po uśpieniu karty do 0,25 s real-time), natychmiastowa inspekcja stanu na pauzie (w tym aktywne stacje i WIP), płynna zmiana szybkości w locie. Potwierdzono całkowitą niezależność wyników symulacji i CSV od prędkości odtwarzania. Backup 103 plików: `backup/v0.4.0_przed_3_10_20261002_211700` (zgodne SHA256). Zautomatyzowany odbiór UI w przeglądarce Edge (CDP) na procesie Eko (partia 3 sztuk, 21 170 s) w karcie symulacji oraz w warsztacie v5, 70/70 testów i build poprawne. Raport: `WERYFIKACJA_SYMULACJA_3_10.md`. Punkt 3.10 wdrożony.

E6 (2026-10-02): eksporty procesu i BOM XLSX/CSV mają osobne znaczniki porównujące eksportowane wiersze; szablony są niezależne od projektu. JSON wariantu oznaczono jako niezmienną migawkę. Backup 103 plików: `backup/v0.4.0_przed_E6_20261002_203301` (zgodne SHA256). UI na porcie 5192 potwierdził selektywne unieważnianie, Cofnij, ponowny eksport, pobrania i ponowne otwarcie; 69/69 testów oraz build poprawne. Punkt 1.8 wdrożony w zakresie bieżącej sesji; raport E. Przeglądarka nie potwierdza aplikacji fizycznego zapisu pliku/PDF.

E5 (2026-10-02): znaczniki czterech eksportów warsztatu v5 przetrwały zmianę karty; porównanie podpisu projektu po ponownym odczycie zachowuje zgodność, edycja i Cofnij odświeżają status tylko właściwych plików. Karta raportu oznacza wywołanie drukowania dla wersji projektu, ostrzega po zmianie danych i nie sugeruje, że PDF został zapisany. Backup 103 plików: `backup/v0.4.0_przed_E5_20261002_201400` (zgodne SHA256). UI Eko, 69/69 testów i build poprawne; raport E. Punkt 1.8 pozostaje w trakcie do objęcia pozostałych eksportów danych i określenia granicy sesji.

E4 (2026-10-02): znacznik CSV symulacji pozostaje dostępny po przebudowaniu widoku, zmianie karty i powrocie do projektu v4/v5. Zmiana wyniku oznacza raport jako nieaktualny; przy błędach blokujących symulację pojawia się komunikat o braku możliwości potwierdzenia aktualności. Cofnij lub nowy eksport przywracają status odpowiedni do bieżącego wyniku. Backup 103 plików: `backup/v0.4.0_przed_E4_20261002_200255` (zgodne SHA256). UI v4/v5, 69/69 testów i build poprawne; raport E. Punkt 1.8 w trakcie do rozstrzygnięcia statusu drukowania PDF i granicy między sesjami.

E3 (2026-10-02): warsztat v5 pokazuje w bieżącej sesji aktualność JSON projektu, archiwum v5, oryginału v4 i pierwotnego importu. UI na izolowanych portach 5188/5189 potwierdził pobrania, edycję, selektywne ponowienie JSON, Cofnij oraz zachowanie 17 stanowisk i źródeł po odświeżeniu. 69/69 testów i build poprawne. Nie zmieniono formatu ani obliczeń; punkt 1.8 pozostaje w trakcie do statusu PDF i komunikacji CSV po zmianie projektu w symulacji. Szczegóły w raporcie E.

E2 (2026-10-02): eksporty archiwum v4, DXF, bilansu CSV i raportu MD mają osobne migawki bieżącej sesji. Po zmianie projektu pasek wskazuje, które pobrane pliki trzeba odnowić; Cofnij przywraca aktualność tylko plików odpowiadających przywróconemu stanowi. Eksport archiwum nie zmienia już czasu zwykłego JSON. Backup 115 plików: `backup/v0.4.0_przed_E2_20261002_194043` (zgodne SHA256). UI na porcie 5187 potwierdził wszystkie pięć pobrań, edycję, ponowny eksport jednego formatu i Cofnij; 69/69 testów i build poprawne. Punkt 1.8 nadal w trakcie do statusu warsztatu v5, PDF i zmian projektu w otwartej symulacji; raport E.

E1 (2026-10-02): status pobranego JSON projektu i CSV symulacji wskazuje aktualność względem bieżących danych oraz potrzebę ponownego eksportu. Cofnij przywracające dane JSON i przywrócenie identycznych parametrów symulacji przywracają status aktualny; szybkość odtwarzania nie unieważnia CSV. Backup 114 plików: `backup/v0.4.0_przed_E1_20261002_193011` (zgodne SHA256). UI na porcie 5186 potwierdził oba cykle statusu oraz pobrane pliki CSV z 30 i 31 wierszami; 69/69 testów i build poprawne. Punkt 1.8 pozostaje w trakcie do oznaczenia pozostałych eksportów i odbioru zmian projektu przy otwartej symulacji; raport E.

D5k (2026-10-02): odbiór dużego archiwum ujawnił przepełnienie stosu w walidacji długiego base64 przed próbą zapisu. Zastąpiono wyrażenie z powtarzaną grupą walidacją liniową i obliczeniem rozmiaru z długości kodowania, bez zmiany formatu. Backup 114 plików: `backup/v0.4.0_przed_D5k_20261002_192024` (zgodne SHA256). Test regresyjny najpierw odtworzył błąd; po poprawce 69/69 testów i build poprawne. UI: archiwum 5,6 MB zostało poprawnie rozpoznane i odrzucone dopiero przy limicie localStorage bez zmiany projektu, a archiwum 1,4 MB przeszło import, ponowny odczyt i pobranie źródła o identycznym SHA256. Punkt 1.7 nadal w trakcie do odbioru rzeczywistych dawnych zapisów; raport D.

D5j (2026-10-02): bezpośredni odczyt poprawnego starszego zapisu localStorage projektu 4 nie uruchamia już automatycznego nadpisania po normalizacji. Przed włączeniem zapisu użytkownik pobiera surową kopię i potwierdza migrację; anulowanie zachowuje oryginał. Backup 113 plików: `backup/v0.4.0_przed_D5j_20261002_070009` (zgodne SHA256). UI na izolowanym porcie potwierdził identyczny SHA256 zapisu bez wersji przed migracją i pobranej kopii, odczyt schematu 4 po migracji oraz 2 trwałe ID warsztatu 5 po ponownym otwarciu. 68/68 testów i build poprawne. Punkt 1.7 nadal w trakcie do szerszego odbioru dawnych rzeczywistych zapisów; raport D.

D5i (2026-10-02): import projektu 4 zapisuje projekt i archiwum źródła przed zmianą stanu UI oraz historii Cofnij/Ponów. Przy braku miejsca lub dostępu do localStorage import nie zastępuje bieżącego projektu i pokazuje jednoznaczny komunikat. Backup 112 plików: `backup/v0.4.0_przed_D5i_20261002_064811` (zgodne SHA256). UI przy wypełnionej pamięci potwierdził odmowę importu Eko bez zmiany 6 operacji projektu bazowego; po zwolnieniu miejsca import 16 operacji i 60 pozycji BOM, Cofnij/Ponów, ponowne otwarcie i bajtowy oryginał Eko przeszły odbiór. 68/68 testów i build poprawne. Punkt 1.7 pozostaje w trakcie do szerszego odbioru dawnych zapisów; raport D.

D5h (2026-10-02): dodano osobny, wersjonowany format przenośnego archiwum JSON dla projektu 4 i warsztatu 5, z projektem, pierwotnym importem oraz migawką migracji v4 w archiwum v5. Zwykłe eksporty JSON i ich import pozostały zgodne. Backup 111 plików: `backup/v0.4.0_przed_D5h_20261002_063408` (zgodne SHA256). UI na dwóch izolowanych adresach potwierdził przeniesienie v4/v5, zachowanie obu trwałych ID v5, źródła o identycznym SHA256 oraz odrzucenie nieobsługiwanej wersji bez zmiany zapisów. 68/68 testów i build poprawne. Punkt 1.7 nadal w trakcie do szerszego odbioru dawnych zapisów i dużych archiwów; raport D.

D5g (2026-10-01): importer projektu 4 zapisuje bajtowo oryginalny plik JSON jako osobny artefakt lokalny, niezależny od znormalizowanego projektu i migawki użytej do migracji v5. Kopia jest powiązana z historią Cofnij/Ponów i przenoszona do osobnego zapisu warsztatu 5; oba widoki udostępniają jej pobranie. Starsze zapisy bez nowego pola pozostają czytelne. Backup 109 plików: `backup/v0.4.0_przed_D5g_20261001_232729` (zgodne SHA256). UI: plik D5f odzyskany po migracji i przeładowaniu z identycznym SHA256, edycja i Cofnij v5 zachowały archiwum; 66/66 testów i build poprawne. Eksport przenośny projektu nie zawiera archiwum, a importy sprzed D5g nie odzyskają nieprzechowanych bajtów. Punkt 1.7 pozostaje w trakcie; raport D.

D5f (2026-10-01): odbiór starszego pliku bez pola wersji, utworzonego z dołączonego przykładu silników EV. Import do projektu 4, zapis/odczyt i migracja do v5 zachowały 6 operacji, 5 pozycji BOM i 2 stanowiska; trwałe ID v5 przetrwały przeładowanie. Kod bez zmian, 65/65 testów. Wykryto ograniczenie: „Pobierz oryginał 4” udostępnia znormalizowany projekt 4, nie bajtową kopię importowanego pliku bez wersji. Zachowanie surowego importu pozostaje do wykonania w 1.7; raport D.

D5e (2026-10-01): odbiór nieudanej migracji na syntetycznym wariancie Eko z osieroconym wpisem zasobów `["QA-OLD"]`. Projekt 4 wczytał się poprawnie, ale migracja zgłosiła błąd bez zastąpienia 16 trwałych stanowisk v5. Oryginalny JSON warsztatu miał ten sam SHA256 przed i po próbie; po przeładowaniu v5 zachował ID i zapis, a projekt 4 nadal zawierał osierocony wpis. Kod bez zmian, 65/65 testów; szczegóły w raporcie D. ID 1.7 pozostaje w trakcie do pełniejszego odbioru starszych zapisów.

D5d (2026-10-01): UI odzyskiwania uszkodzonego localStorage v5 potwierdzone na izolowanym porcie. Surowy znacznik QA pobrano bez zmian, import bez zgody nie nadpisał go, anulowanie i samo odblokowanie nie zmieniły zapisu; dopiero potwierdzony import Eko v5 odtworzył 16 stanowisk po przeładowaniu. Natywne `confirm` zastąpiono potwierdzeniem w warsztacie. Backup 107 plików: `backup/v0.4.0_przed_D5d_20261001_225237` (zgodne SHA256). 65/65 testów i build poprawne. Raport D; 1.7 w trakcie do próby nieudanej migracji.

D5c (2026-10-01): odbiór ochrony oryginalnego JSON schematu 4 po migracji Eko. Rzeczywisty plik `tests/qa/Eko_D5c_original_v4.json` ma 16 operacji i 60 pozycji BOM; ponowne pobranie po przeładowaniu dało ten sam SHA256. Import pliku do projektu 4 i ponowny odczyt odtworzyły dane, a osobny warsztat 5 pozostał dostępny. Kod bez zmian; odzyskiwanie uszkodzonego zapisu nadal otwarte. Raport D. ID 1.7 w trakcie.

D5b (2026-10-01): warsztat v5 korzysta z pełnej osi czasu symulacji i pokazuje trwałe ID stanowisk; aktywne wykonania są przekazywane do podglądu 3D. Błędy layoutu nadal blokują kontrolki. Backup 105 plików: `backup/v0.4.0_przed_D5b_20261001_223242` (zgodne SHA256). UI Eko: partia 3 sztuk 21 170 s, Cofnij po błędzie brakującego stołu i ponowny odczyt poprawnego zapisu. 65/65 testów i build poprawne. Szczegóły w raporcie D; 1.5–1.6 pozostają w trakcie.

D4f (2026-10-01): dodano edycję geometrii wyposażenia warsztatu schematu 5 po trwałym ID stanowiska. Backup 103 plików: `backup/v0.4.0_przed_D4f_20261001_221758` (zgodne SHA256). UI Eko na izolowanym porcie: podział 17 → 18 stanowisk, jawne dodanie stołu, usunięcie błędu layoutu, symulacja, edycja X i obrotu, Cofnij/Ponów, usunięcie z Cofnij i ponowny odczyt. Rzut 2D oraz podgląd 3D korzystają z zapisanej geometrii; 65/65 testów i build poprawne. Szczegóły w raporcie D. ID 1.5 i 1.6 pozostają w trakcie do integracji z pozostałymi widokami.

D4e (2026-10-01): dodano edycję ustawień zasobów po trwałym ID w warsztacie schematu 5. Backup 102 plików: `backup/v0.4.0_przed_D4e_20261001_182847` (zgodne SHA256). UI Eko potwierdził walidację, niezależność cyklu od samej obsady, jawny cykl zespołu, błąd brakującego stołu po zwiększeniu kopii, blokadę symulacji, Cofnij/Ponów i odczyt po przeładowaniu. Późniejszy odbiór potwierdził przywrócenie domyślnych zasobów, jego Cofnij/Ponów i odczyt po ponownym otwarciu; zapis testowy wrócił do wartości bazowych. 64/64 testy i build poprawne. Szczegóły w raporcie D. ID 1.6 pozostaje w trakcie.

D4d (2026-10-01): dodano UI jawnego podziału i scalenia stanowisk schematu 5. Podział zachowuje stare ID, zasoby i geometrię, tworząc nowe ID bez powiązań. Scalenie wymaga wskazania zachowanego ID, pokazuje obiekty i ustawienia wycofywanego ID oraz wymaga zaznaczenia zgody i potwierdzenia. Backup 101 plików: `backup/v0.4.0_przed_D4d_20261001_181257` (SHA256 zgodne). Eko: podział/scalenie, Cofnij/Ponów, zapis/odświeżenie i syntetyczne ustawienia zasobów potwierdzone w UI; 64/64 testy i build poprawne. 1.5 i 1.6 pozostają w trakcie. Raport D.

D5a (2026-10-01): potwierdzono zapis pliku wyeksportowanego przez UI, jego strukturę i ponowny import przez UI. Rzeczywisty eksport Eko schematu 5 (`tests/qa/Eko_D5_actual_export_v5.json`, 44 879 bajtów, SHA256 w raporcie D) odtworzył 17 trwałych stanowisk, 53 obiekty layoutu i przydział OP22 po odświeżeniu. Błędny plik z obcym ID geometrii został odrzucony bez zastąpienia poprawnego zapisu. Osobny poprawny plik Eko 16 stanowisk przeszedł import i symulację 3 sztuk (21 170 s). 1.5 pozostaje w trakcie: otwarte są podział/scalenie i integracja edytorów. Raport D.

D3b/D4c (2026-10-01): uruchomiono odrębny warsztat projektu schematu 5 z migracją bieżącego projektu, zapisem lokalnym, trwałymi ID, przenoszeniem operacji, zmianą kolejności, pustym stanowiskiem, Cofnij/Ponów, eksportem/importem JSON i symulacją. Brak layoutu pozostaje jawny; jego wygenerowanie wymaga osobnej akcji. Backup 97 plików: `backup/v0.4.0_przed_UI_v5_20261001_173152` (SHA256 zgodne). 62/62 testy i build poprawne. UI Eko: migracja, przeniesienie OP22, Cofnij/Ponów, zapis/odświeżenie, dodanie stanowiska i jawne generowanie potwierdzone; eksport/import pliku oraz podział/scalenie w UI pozostają do odbioru. 1.5 w trakcie. Raport D.

D4b (2026-10-01): dodano atomową zmianę rejestru stanowisk dla kolejności, podziału i scalenia. Wycofanie ID z powiązanymi zasobami lub geometrią jest blokowane do jawnego rozstrzygnięcia; istniejące ID zachowują ustawienia i obiekty. 61/61 testów i build poprawne. Brak jeszcze UI dla decyzji 1.6; 1.5 w trakcie. Raport D.

D4a (2026-10-01): zasoby schematu 5 wiążą się z trwałym ID stanowiska, a odrębne wyprowadzenie bilansu/layoutu zachowuje zapisaną geometrię i zgłasza brakujące kopie. Eko po migracji ma tę samą liczbę tras i te same czasy zakończenia partii w symulacji. 59/59 testów i build poprawne. Aktywne UI i zapis pozostają w schemacie 4; 1.5 w trakcie. Raport D.

D3a (2026-10-01): dodano bilans schematu 5 oparty na rejestrze stanowisk i przeniesienie operacji do istniejącego trwałego ID. Numer wynika wyłącznie z kolejności. Zmiana grupowania przez RPW/LCR wymaga jawnego uzgodnienia tożsamości; puste stanowisko zachowuje ID, zasoby i geometrię. Test Eko i przypadki negatywne: 57/57 testów, build poprawny. Edytor UI i aktywna ścieżka schematu 5 nadal nie są podłączone; 1.5 w trakcie. Raport D.

D2c (2026-10-01): kopia bieżących 93 plików z kontrolą SHA256 w `backup/v0.4.0_przed_aktywacja_D3_20261001_171226`. Dodano odrębny parser schematu 5 z walidacją rejestru, ręcznych przypisań, zasobów i powiązań layoutu; przygotowana migracja jest nim sprawdzana. Eksport Eko przechodzi zapis/odczyt 16 stanowisk. 53/53 testy i build poprawne. Aktywny import/zapis nadal używa schematu 4; etap 1.5 w trakcie. Raport D.

D2b (2026-10-01): dodano jawną konwersję sprawdzonego podglądu do przygotowanego projektu schematu 5. Przypisania ręczne, powiązania geometrii i zasoby otrzymują trwałe ID; nieaktualne cache bilansu i tras są pomijane. Osierocone zasoby lub zmieniony podgląd zatrzymują konwersję. Oryginalny JSON jest zachowany. 51/51 testów i build poprawne. Schemat 5 nadal nie jest przyjmowany przez aplikację; D2–D5 i etap 1.5 pozostają w trakcie. Raport D.

D2a (2026-09-30): pełny backup 89 plików ze sprawdzeniem SHA256 i podgląd migracji powiązań stanowisk gotowe. Nie przełączono schematu zapisu; etap 1.5 nadal w trakcie. D2b–D4 wymagają integracji rejestru z edytorami i zapisami. Raport D.

Pakiet D / 1.5–1.6 zamknięty 2026-10-02: rejestr stanowisk v5 zapewnia trwałe ID (`ST-...`), niezależność od numeracji, edycję zasobów i geometrii po trwałym ID, bezpieczną zamianę kolejności z walidacją grafu, jawny podział i scalenie z ochroną wyposażenia oraz panel usuwania operacji z zachowaniem pustej stacji i jej obiektów. Odbiór UI zrealizowany w teście Edge CDP (`tests/qa/verify_1_5_1_6.mjs`), 76/76 testów jednostkowych i build poprawne. Szczegóły w `WERYFIKACJA_STALE_ID_1_5_1_6.md` i `WERYFIKACJA_STABILIZACJA_D.md`. Etap 1 został w pełni wdrożony.

Pakiet C zamknięty 2026-09-30: potwierdzono przeciąganie z siatką/bez siatki, Cofnij/Ponów, synchronizację 2D–3D i zapis. Poniższe otwarte diagnozy C są historią; rozstrzygnięcie w raporcie C3. Następny krok: 1.5 — trwałe identyfikatory stanowisk.

- Pakiet A wykonany w ograniczonym zakresie: backup, testy bazowe, poprawki wspólnego usuwania i synchronizacji formularzy. Raport: `WERYFIKACJA_STABILIZACJA_A.md`.
- Kroki nadrzędne 1.2–1.3 zakończone; dowody zapisano w raporcie pakietu B.
- Pakiet B zakończony: odbiór importu/usuwania i zapisu w UI (1.2.2, 1.3.1, 1.3.4) na odizolowanych danych portu 4193. Następny mały pakiet: obsługa myszy 3D (1.4).
- Dane Eko można zbierać równolegle w ramach 7.1.
- Aktywny pakiet C / 1.4: synchronizacja formularza 3D po Cofnij/Ponów poprawiona i sprawdzona. Przeciąganie oraz czarny widok po geście wymagają dalszej diagnozy; raport `WERYFIKACJA_STABILIZACJA_C.md`.
- C2a: zabezpieczono kamerę przed obrotem pod podłogę; w edycji lewy przycisk nie obraca kamery. Powtórzona próba nie wywołała czarnego widoku. Samo przeciąganie nadal niepotwierdzone, 1.4 pozostaje w trakcie. Backup i zakres odbioru w raporcie C.
- Warunki pakietu B spełnione: usunięcie OP11 i Cofnij/Ponów poprawne; operacja przywrócona. Rzeczywisty eksport JSON pobrany i ponownie zaimportowany; wynik symulacji zachowany. Dowód: `tests/qa/Eko_B_export_20260930_183858.json`. Kalibracja będzie wymagała rzeczywistych danych procesu.
- Kopia bazowa: `backup/v0.4.0_przed_stabilizacja_20260929_225906` — 81 plików, zgodność SHA256. Procedura odtworzenia w raporcie pakietu A. Przed kolejną przebudową modułu wykonać nową kopię.

## Etap 1 — Stabilizacja i bezpieczeństwo projektu

| ID | Krok / oczekiwany rezultat | Status |
| --- | --- | --- |
| 1.1 | Utworzyć nowy backup kodu, konfiguracji, przykładów i dokumentacji; opisać bezpieczne odtworzenie. | wdrożone |
| 1.2 | Ponownie uruchomić testy i build; zapisać stan bazowy oraz przejść ścieżkę nowy projekt → import → proces → balans → layout → symulacja → raport → otwarcie zapisu. | wdrożone |
| 1.3 | Zweryfikować importy, usuwanie operacji, zmianę zależności, ciągłość ręcznych przydziałów oraz Cofnij/Ponów; naprawić wykryte regresje i dodać testy. | wdrożone |
| 1.4 | Potwierdzić i w razie potrzeby naprawić wybór i przeciąganie myszą w 3D oraz synchronizację geometrii 2D–3D. | wdrożone |
| 1.5 | Wprowadzić trwałe identyfikatory stanowisk, niezależne od numeracji i aktualnego zestawu operacji. | wdrożone |
| 1.6 | Zapewnić czytelny wybór zachowania ustawień przy zmianie przydziału, podziale lub scaleniu stanowisk; wyeliminować niejawne resetowanie zasobów. | wdrożone |
| 1.7 | Dopracować zapis, odzyskiwanie i migrację starych projektów; chronić oryginał przy nieudanej migracji i przetestować ponowne otwarcie. | wdrożone |
| 1.8 | Oznaczać nieaktualne wyniki po zmianie danych i wskazywać, co wymaga ponownego przeliczenia. | wdrożone |

**Odbiór etapu:** projekt można zmodyfikować, zapisać, zamknąć i odtworzyć bez utraty danych. Podstawowe operacje mają testy oraz potwierdzony odbiór w UI. Nie ma nierozwiązanych błędów powodujących utratę danych lub niejawnie błędne wyniki w sprawdzanym zakresie.

### Mniejsze podetapy stabilizacji

Te pozycje uszczegóławiają kroki nadrzędne; nie są dodatkowymi niezależnymi wymaganiami.

| ID | Zakres i dowód / pozostała praca | Status |
| --- | --- | --- |
| 1.2.1 | Testy bazowe 35/35 i build; po poprawkach 40/40 i build. Wyniki w raporcie A. | wdrożone |
| 1.2.2 | B: pełna ścieżka Eko/BOM, bilans, CAD, symulacja, raport, zapis lokalny oraz rzeczywisty eksport/import JSON. Po odtworzeniu 16 operacji, 60 materiałów, 16 stanowisk; partia 3 sztuk nadal 21170 s. | wdrożone |
| 1.3.1 | UI: usunięcie OP11 daje 15 stanowisk bez luk i 5 oczekiwanych brakujących referencji BOM; Cofnij/Ponów poprawne, formularz wyczyszczony. Ostatecznie przywrócono 16 stanowisk i 0 błędów. | wdrożone |
| 1.3.2 | Ochrona przed nieistniejącą operacją przy usuwaniu i edycji relacji; dwa testy najpierw odtworzyły błąd, po poprawce przechodzą. | wdrożone |
| 1.3.3 | Synchronizacja otwartego formularza procesu i BOM po Cofnij/Ponów; sprawdzona w przeglądarce na przykładzie silników. | wdrożone |
| 1.3.4 | Czyszczenie formularza po zaakceptowanym imporcie; odbiór UI na XLSX Eko: 16 operacji, 60 materiałów, oba szkice formularzy wyczyszczone. Raport B, B02–B03. | wdrożone |

## Etap 2 — Dokładniejszy model procesu i zasobów

| ID | Krok / oczekiwany rezultat | Status |
| --- | --- | --- |
| 2.1 | Rozdzielić operację, stanowisko, pracownika/pulę pracowników, wyposażenie, wyrób i podzespół; opisać jednostki, relacje i migrację danych. | wdrożone |
| 2.1.1 | Spisać kontrakt bytów, jednostek i referencji oraz bezstratną ścieżkę migracji v4/v5 z jawnymi lukami danych; dowód w `MODEL_PROCESU_2_1.md`. | wdrożone |
| 2.1.2 | Przygotować odczytowy podgląd migracji v4/v5 z zachowaniem źródła, trwałych ID i jawnymi brakami danych; odrzucać błędne referencje i zmieniony podgląd. | wdrożone |
| 2.1.3 | Dodać osobny roboczy schemat 6, parser referencji i przygotowanie migracji tylko po zweryfikowanym podglądzie, bez aktywowania zapisu i symulacji. | wdrożone |
| 2.1.4 | Dodać izolowany zapis szkicu 6 i odczyt z walidacją, zachowując dokładne źródło v4/v5 i chroniąc poprzedni zapis przy błędzie lub konflikcie. | wdrożone |
| 2.1.5 | Pokazać podgląd migracji i luki danych w UI, jawnie zapisać pierwszy szkic 6, ponownie go otworzyć i udostępnić surową kopię uszkodzonego zapisu. | wdrożone |
| 2.1.6 | Umożliwić jawne zastąpienie istniejącego lub uszkodzonego szkicu 6 po pobraniu jego kopii, bez utraty poprzedniej wartości przy konflikcie, błędzie walidacji lub zapisu. | wdrożone |
| 2.1.7 | Edytować osoby i pule osób w szkicu 6 po trwałym ID, z walidacją członkostwa, bezpiecznym usuwaniem, zapisem i Cofnij/Ponów. | wdrożone |
| 2.1.8 | Edytować definicję wyrobu i podzespoły w szkicu 6 po trwałym ID, z jawnymi referencjami operacji, zapisem i wspólnym Cofnij/Ponów. | wdrożone |
| 2.1.9 | Edytować wyposażenie technologiczne w szkicu 6 po trwałym ID, z jawnymi opcjonalnymi powiązaniami do stanowiska i obiektu layoutu, bez wnioskowania możliwości z geometrii. | wdrożone |
| 2.1.10 | Pozwolić ręcznie deklarować operacje obsługiwane przez wyposażenie w szkicu 6, z walidacją referencji i zgodnością wcześniejszych szkiców; nie utożsamiać możliwości z wymaganiem operacji. | wdrożone |
| 2.1.11 | Zbiorczo odebrać migrację Eko i silników, odrębny zapis szkicu, UI oraz niezmienność wyników aktywnej symulacji v4/v5 po edycji szkicu. | wdrożone |
| 2.2 | Rozdzielić czas pracy ręcznej, automatyczny czas maszyny i okres wymaganej obecności operatora. | nierozpoczęte |
| 2.3 | Określać wymaganą liczbę pracowników przy operacji oraz jawne warianty czasu dla obsady, bez automatycznego dzielenia czasu przez liczbę osób. | nierozpoczęte |
| 2.4 | Obsłużyć operatorów współdzielonych między stanowiskami, ich rezerwację i zwalnianie bez nakładania przydziałów w czasie. | nierozpoczęte |
| 2.5 | Uwzględnić kalendarz zasobów, zmiany i przerwy; jednoznacznie określić zachowanie rozpoczętej operacji na granicy przerwy. | nierozpoczęte |
| 2.6 | Przypisywać operację do wielu dopuszczalnych stanowisk, z określoną regułą wyboru i wymaganym wyposażeniem. | nierozpoczęte |
| 2.7 | Rozróżnić przygotowanie podzespołu od montażu na wspólnym korpusie; śledzić miejsce i dostępność korpusu. | nierozpoczęte |
| 2.8 | Wprowadzić reguły dopuszczalnej równoległości i wzajemnego wykluczania czynności na jednym wyrobie. | nierozpoczęte |
| 2.9 | Przygotować scenariusze Eko: niezależne podmontaże, montaż drzwi razem lub kolejno, wspólna obsada i dostępność ramy. | nierozpoczęte |

**Odbiór etapu:** jedna osoba nie wykonuje dwóch czynności jednocześnie; jeden korpus nie znajduje się na dwóch odległych stanowiskach. Równoległe czynności przy jednym korpusie są możliwe tylko przy zgodnych regułach, miejscu i dostępnej obsadzie. Czasy założone są odróżnione od pomiarowych.

## Etap 3 — Symulacja powiązana z rzeczywistym layoutem

| ID | Krok / oczekiwany rezultat | Status |
| --- | --- | --- |
| 3.1 | Oddzielić obliczenia symulacji od animacji; uruchamiać obliczenia w tle, z postępem i możliwością anulowania. | nierozpoczęte |
| 3.2 | Dodać punkty wejścia/wyjścia materiału i edytowalne trasy transportowe, z kontrolą jednostek i połączeń. | nierozpoczęte |
| 3.3 | Wyznaczać czas transportu z długości trasy, prędkości, załadunku i rozładunku. | nierozpoczęte |
| 3.4 | Modelować dostępność transportu: operator, wózek lub przenośnik; odróżnić czas przejazdu od oczekiwania na zasób. | nierozpoczęte |
| 3.5 | Wprowadzić bufory o ograniczonej pojemności oraz jednoznaczne reguły blokowania i zwalniania stanowiska. | nierozpoczęte |
| 3.6 | Pokazywać stany pracy, oczekiwania na materiał/operatora, blokady wyjścia i transportu wraz z czasami ich trwania. | nierozpoczęte |
| 3.7 | Wykrywać zatrzymanie lub zakleszczenie procesu i przedstawiać jego przyczynę zamiast pozornego zakończenia symulacji. | nierozpoczęte |
| 3.8 | Dodać wykres Gantta operacji, stanowisk i pracowników oraz przejście z wyniku do odpowiedniego obiektu. | nierozpoczęte |
| 3.9 | Sprawdzić wyniki na ręcznie policzonych scenariuszach i większych partiach; zapisać pomiary czasu obliczeń i responsywności UI. | nierozpoczęte |
| 3.10 | Rozszerzyć wybór szybkości odtwarzania symulacji ponad obecne 100× dla długich procesów. Przy wysokich mnożnikach zachować dokładny czas symulowany, kolejność zdarzeń, pauzę i możliwość inspekcji; wynik obliczeń nie może zależeć od prędkości odtwarzania. | wdrożone |

**Odbiór etapu:** wyniki prostych scenariuszy zgadzają się z obliczeniami ręcznymi. Wpływ zmiany trasy i pojemności bufora można wyjaśnić harmonogramem. Przesunięcie obiektu wpływa na czas tylko wtedy, gdy zmienia modelowaną trasę lub inne jawne ograniczenie. Animacja nie wpływa na wynik obliczeń.

## Etap 4 — Balansowanie i porównywanie wariantów

| ID | Krok / oczekiwany rezultat | Status |
| --- | --- | --- |
| 4.1 | Pokazywać oddzielnie obciążenie stanowisk, maszyn i operatorów oraz objaśnić mianowniki wskaźników. | nierozpoczęte |
| 4.2 | Umożliwić blokowanie przydziałów przed automatycznym balansowaniem. | nierozpoczęte |
| 4.3 | Uwzględniać wymagania wyposażenia i kompetencji oraz wskazywać brak wykonalnego przydziału. | nierozpoczęte |
| 4.4 | Wyjaśniać przyczynę ograniczenia przepustowości: obróbka, obsada, transport, blokada lub brak materiału. | nierozpoczęte |
| 4.5 | Porównywać zapisane warianty przy tych samych warunkach eksperymentu: bazowy, dodatkowy pracownik, dodatkowe stanowisko, zmieniony layout. | nierozpoczęte |
| 4.6 | Zestawiać wydajność, czas przejścia, WIP, obsadę, powierzchnię i koszty przy jawnych stawkach oraz założeniach. | nierozpoczęte |
| 4.7 | Proponować zmiany wraz z uzasadnieniem i wynikiem sprawdzenia w symulacji; bez deklaracji gwarantowanego optimum. | nierozpoczęte |

**Odbiór etapu:** można porównać dodanie operatora, stanowiska i reorganizację pracy, rozróżniając szacunek zdolności od wyniku symulacji. Raport zawiera wersję danych, warunki eksperymentu i założenia kosztowe.

## Etap 5 — Wygodny edytor hali i spójny interfejs

Podstawowe poprawki UX mogą być realizowane wcześniej. Większa reorganizacja następuje po ustabilizowaniu modelu danych.

| ID | Krok / oczekiwany rezultat | Status |
| --- | --- | --- |
| 5.1 | Przygotować i porównać dwie propozycje organizacji UI; w razie potrzeby użyć Figmy lub Pencil i zapisać decyzję projektową. | nierozpoczęte |
| 5.2 | Uporządkować przestrzeń pracy: biblioteka/drzewo po lewej, główny widok w środku, właściwości po prawej, wyniki i oś czasu na dole; uwzględnić mniejsze ekrany. | nierozpoczęte |
| 5.3 | Dodać zaznaczanie wielu obiektów, grupowanie, kopiowanie i wyrównywanie. | nierozpoczęte |
| 5.4 | Przenosić stanowisko razem z przypisanym FIFO i strefą obsługi bez utraty relacji technologicznych. | nierozpoczęte |
| 5.5 | Dodać przyciąganie do siatki, krawędzi i punktów połączeń oraz możliwość jego wyłączenia. | nierozpoczęte |
| 5.6 | Dodać wymiarowanie, pomiary odległości, warstwy i blokowanie obiektów. | nierozpoczęte |
| 5.7 | Obsłużyć podkład hali z kalibracją skali. | nierozpoczęte |
| 5.8 | Ustalić i wdrożyć obsługiwany podzbiór importu DXF, z raportem pominiętej geometrii i sprawdzeniem jednostek. | nierozpoczęte |
| 5.9 | Czytelnie pokazywać strefy obsługi, odkładania i komunikacji; ostrzeżenia geometryczne odróżnić od oceny zgodności BHP. | nierozpoczęte |
| 5.10 | Zapewnić wspólne zaznaczenie i dane 2D–3D, spójne skróty, nazwy narzędzi i podpowiedzi. | nierozpoczęte |
| 5.11 | Dodać przełączanie prezentacji czasu między sekundami, minutami i godzinami dziesiętnymi w wynikach, osi czasu i właściwych polach czasu. Jednostka ma być zawsze widoczna, a zmiana widoku lub jednostki wejścia ma przeliczać wartość bez zmiany czasu zapisanego wewnętrznie w sekundach (np. 150 min = 2,5 h). | wdrożone |
| 5.12 | Udostępnić gotowe, pobieralne szablony importu procesu i BOM co najmniej w XLSX, zgodne z bieżącym importerem. Opisać wymagane i opcjonalne kolumny, formaty, jednostki i identyfikatory; sprawdzić import wypełnionych szablonów oraz czytelne błędy przy brakach. Inne formaty są opcjonalne. | wdrożone |

**Odbiór etapu:** użytkownik samodzielnie odwzorowuje prostą halę i reorganizuje linię bez edycji plików. Grupy i powiązania pozostają spójne po przesuwaniu, kopiowaniu i cofaniu. Próba wykonana w docelowej przeglądarce jest opisana w raporcie.

## Etap 6 — Biblioteka wyposażenia i czytelne 3D

| ID | Krok / oczekiwany rezultat | Status |
| --- | --- | --- |
| 6.1 | Ustalić standard wyposażenia: skala, jednostki, punkt ustawienia, obrys kolizji, strefa obsługi, punkty transportu i metadane źródła/licencji. | nierozpoczęte |
| 6.2 | Przygotować parametryczne stoły, regały, palety, pojemniki, wózki i przenośniki. | nierozpoczęte |
| 6.3 | Przygotować charakterystyczne modele Eko/maszyn w Blenderze tam, gdzie prosta geometria nie wystarcza; sprawdzić skalę i budżet złożoności. | nierozpoczęte |
| 6.4 | Oddzielić model wizualny od parametrów technologicznych, aby wymiana wyglądu nie zmieniała zdolności produkcyjnej. | nierozpoczęte |
| 6.5 | Dodać wygodne manipulatory przesuwania i obrotu oraz ukrywanie warstw i obiektów. | nierozpoczęte |
| 6.6 | Animować produkty, podzespoły i transport zgodnie z harmonogramem symulacji; umożliwić pauzę i inspekcję stanu. | nierozpoczęte |
| 6.7 | Sprawdzić czytelność oraz wydajność większej sceny i zapewnić użyteczny tryb uproszczony. | nierozpoczęte |

**Odbiór etapu:** 3D pozwala zlokalizować problem i edytować układ, a animacja pozostaje zgodna z harmonogramem. Model wizualny nie jest źródłem czasów operacji ani niezależną kopią danych procesu.

## Etap 7 — Walidacja Eko i przygotowanie komercyjne

| ID | Krok / oczekiwany rezultat | Status |
| --- | --- | --- |
| 7.1 | Zebrać rzeczywiste dane Eko: obsada, czasy ręczne/maszynowe, równoległość, wymiary, trasy, bufory, kalendarz i wyniki produkcji; oznaczyć braki oraz źródła. | nierozpoczęte |
| 7.2 | Zastąpić przykładowe czasy pomiarami i porównać model z produkcją; przed odbiorem uzgodnić tolerancje i warunki porównania. | nierozpoczęte |
| 7.3 | Dodać przezbrojenia i warianty produktów, z regułami kolejności oraz czasami przejść. | nierozpoczęte |
| 7.4 | Dodać zmienność czasów i awarie oraz powtarzalne serie eksperymentów z ziarnem losowym i zakresem niepewności wyników. | nierozpoczęte |
| 7.5 | Rozdzielić szczegółowo modelowane straty od rezerwy OEE, aby nie naliczać tych samych strat dwukrotnie. | nierozpoczęte |
| 7.6 | Ustalić sposób dystrybucji i wdrożyć instalację/uruchamianie, aktualizacje oraz kopie i odzyskiwanie projektu; sprawdzić na czystym komputerze. | nierozpoczęte |
| 7.7 | Przeprowadzić przegląd zależności, licencji kodu i modeli oraz bezpieczeństwa adekwatnego do sposobu dystrybucji. | nierozpoczęte |
| 7.8 | Zaktualizować edytowalną instrukcję ze screenshotami, pełny opis funkcji, rejestr zmian i znane ograniczenia. | nierozpoczęte |
| 7.9 | Wykonać pilotażowy odbiór z użytkownikiem na uzgodnionych scenariuszach, usunąć błędy krytyczne i zapisać zakres gotowego wydania. | nierozpoczęte |
| 7.10 | Dopracować wygląd generowanego raportu PDF: czytelną hierarchię, typografię, tabele i wykresy, podziały stron oraz wersję do druku. Sprawdzić na krótkim i długim projekcie, także pod kątem obciętego tekstu i zgodności liczb z wynikami aplikacji. | nierozpoczęte |

**Odbiór etapu:** wyniki mieszczą się w wcześniej uzgodnionych tolerancjach dla zweryfikowanych przypadków. Aplikację można zainstalować, zaktualizować i odzyskać dane na docelowym komputerze. Dostępne są instrukcja, rejestr zmian, jawne ograniczenia i raport odbioru. Testy nie zastępują oceny technologicznej, ergonomicznej ani certyfikacji przemysłowej.

Po ustabilizowaniu pakietu D punkty 3.10, 5.11 i 5.12 można wykonać jako małe, niezależne pakiety wcześniej niż resztę ich etapów, jeżeli nie zmienią modelu czasu ani kontraktu importu. Punkt 7.10 jest zaplanowany później, po ustaleniu docelowej zawartości raportu.

## Dane i decyzje do uzupełnienia

Braki nie blokują stabilizacji. Nie należy zastępować ich domysłami przedstawianymi jako pomiary.

| Temat | Potrzebne informacje | Stan |
| --- | --- | --- |
| Proces Eko | Czasy pomiarowe, rozdział pracy ręcznej/maszynowej, obsada i dopuszczalna równoległość montażu | Do zebrania w 7.1 |
| Hala i logistyka | Rzut z wymiarami, rzeczywiste stanowiska, strefy, trasy i bufory | Do zebrania w 7.1 |
| Odbiór modelu | Zestaw danych porównawczych, tolerancje i scenariusze | Do ustalenia przed 7.2 |
| Koszty | Stawki pracy i transportu, koszty inwestycji, okres porównania | Do ustalenia przed 4.6 |
| Import CAD | Docelowe pliki i wymagany zakres obsługi DXF | Do ustalenia przed 5.8 |
| Dystrybucja | Docelowe komputery/przeglądarki, praca offline, sposób aktualizacji i licencjonowania produktu | Do ustalenia przed 7.6 |

## Rejestr wykonanych prac i zmian statusów

Każdy kolejny wpis powinien wskazywać konkretne ID. Nie usuwać historii przy zmianie statusu.

| Data | ID | Zmiana statusu | Rezultat / dowód / uwagi |
| --- | --- | --- | --- |
| 2026-09-29 | PLAN | Utworzenie rejestru | Zapisano uzgodniony plan w `PLAN_ROZWOJU.md`. Wszystkie kroki implementacyjne i odbiorowe pozostają nierozpoczęte. Nie zmieniano kodu ani nie uruchamiano ponownie testów aplikacji. |
| 2026-09-29 | 1.1–1.3 | nierozpoczęte → w trakcie | Rozpoczęto pakiet A: zabezpieczenie wersji 0.4.0, ponowna weryfikacja bazowa i przegląd wspólnych operacji edycji. |
| 2026-09-29 | 1.1 | w trakcie → wdrożone | Backup 81 plików, zgodne SHA256, procedura powrotu w `WERYFIKACJA_STABILIZACJA_A.md`. Nie uruchamiano osobnej instalacji z backupu. |
| 2026-09-29 | 1.2.1, 1.3.2, 1.3.3 | wdrożone — wydzielone podetapy | 40/40 testów, poprawny build, odrzucanie nieistniejących operacji, odbiór Cofnij/Ponów w formularzach procesu i BOM; brak ostrzeżeń/błędów w odczycie konsoli. |
| 2026-09-29 | 1.2, 1.3 | pozostają w trakcie | Pozostały pełna ścieżka UI oraz odbiór importu i usuwania. Nie uznano samych testów funkcji za potwierdzenie wszystkich działań w interfejsie. |
| 2026-09-29 | 1.2.2, 1.3.1, 1.3.4 | kontynuacja — pakiet B | Rozpoczęto odbiór ścieżki interfejsu na osobnym porcie 4193. |
| 2026-09-30 | 1.3.4 | w trakcie → wdrożone | Potwierdzono import obu XLSX przez UI i czyszczenie pól szkicu. Szczegóły w `WERYFIKACJA_STABILIZACJA_B.md`. |
| 2026-09-30 | 1.2.2, 1.3.1 | częściowy odbiór B | Poprawne importy, ręczny bilans, edycja CAD/Cofnij, symulacja i zapis lokalny; błędny import i cykl bez mutacji danych. 40/40 testów i build poprawny. Usuwanie oczekuje potwierdzenia; eksport JSON niepotwierdzony. |
| 2026-10-01 | 1.5 | kontynuacja — D3b/D4c | Odrębny warsztat schematu 5 i odbiór migracji, trwałych ID, edycji przydziału, historii, zapisu/odczytu oraz jawnego layoutu w UI. 62/62 testy, build poprawny. Eksport/import pliku i podział/scalenie w UI otwarte; raport D. |
| 2026-10-01 | 1.5 | kontynuacja — D5a | Rzeczywisty eksport v5 zapisano, sprawdzono i ponownie zaimportowano w UI; zachowano ID i geometrię po przeładowaniu. Błędny plik odrzucono bez utraty poprawnego zapisu. 1.5 nadal w trakcie; raport D. |
| 2026-10-01 | 1.6 | nierozpoczęte → w trakcie | Rozpoczęto D4d: jawny wybór zachowanego ID i losu powiązanych zasobów/geometrii przy podziale/scaleniu. |
| 2026-10-01 | 1.5, 1.6 | kontynuacja — D4d | UI Eko potwierdził podział/scalenie, listę wycofywanych obiektów, syntetyczne ustawienia zasobów, Cofnij/Ponów i ponowny odczyt. 64/64 testy, build poprawny. Pełna integracja edytorów pozostaje otwarta; raport D. |
| 2026-10-01 | 1.6 | kontynuacja — D4e | Edytor zasobów v5 po trwałym ID; UI potwierdził zapis, walidację, zależność kopii od geometrii, reset domyślnych zasobów, Cofnij/Ponów i ponowny odczyt. 64/64 testy i build poprawne; status w trakcie. |
| 2026-10-01 | 1.5, 1.6 | kontynuacja — D4f | Edytor geometrii v5 po trwałym ID, rzut 2D i podgląd 3D. UI Eko potwierdził podział, jawne dodanie stołu, korektę położenia, historię, zapis/odczyt i symulację; 65/65 testów i build poprawne. Integracja pozostałych widoków otwarta; raport D. |
| 2026-10-01 | 1.5, 1.6 | kontynuacja — D5b | Pełna oś czasu symulacji w warsztacie v5, nazwy i trwałe ID stacji, aktywne wykonania dla podglądu 3D. UI Eko: 21 170 s dla 3 sztuk, blokada przy brakującym stole, Cofnij i ponowny odczyt; 65/65 testów i build poprawne. Pełna integracja nadal otwarta; raport D. |
| 2026-10-01 | 1.7 | nierozpoczęte → w trakcie — D5c | Po migracji Eko pobrano oryginalny JSON schematu 4, powtórzono pobranie po przeładowaniu z identycznym SHA256, zaimportowano do projektu 4 i ponownie otwarto. Odbiór uszkodzonego zapisu pozostaje otwarty; raport D. |
| 2026-10-01 | 1.7 | kontynuacja — D5d | UI odzyskiwania: surowy uszkodzony zapis pobrany, import przed zgodą odrzucony, anulowanie i odblokowanie bez nadpisania, po jawnym imporcie Eko v5 16 stanowisk zachowanych po przeładowaniu. 65/65 testów i build poprawne; nieudana migracja nadal do odbioru. |
| 2026-10-01 | 1.7 | kontynuacja — D5e | UI zatrzymał migrację Eko z osieroconym zasobem bez nadpisania projektu v5 i jego oryginalnego JSON; po przeładowaniu oba zapisy zachowały dane. Kod bez zmian, 65/65 testów; starsze zapisy nadal do odbioru. |
| 2026-10-01 | 1.7 | kontynuacja — D5f | Plik bez wersji z dołączonego przykładu silników EV przeszedł import, zapis, migrację v5 i ponowny odczyt; 2 trwałe ID zachowane. Otwarta luka: oryginalne bajty starszego pliku nie są archiwizowane przez importer 4. Kod bez zmian, 65/65 testów. |
| 2026-10-01 | 1.7 | kontynuacja — D5g | Osobne archiwum bajtów importu w zapisie 4 i 5; UI potwierdził Cofnij/Ponów, migrację, przeładowanie oraz SHA256 pobranego pierwotnego pliku. Backup 109 plików, 66/66 testów, build poprawny. Pozostaje przenośne archiwum i szerszy odbiór starszych zapisów. |
| 2026-10-02 | 1.7 | kontynuacja — D5h | Przenośne archiwa projektu 4 i 5; UI na osobnych adresach potwierdził import, ponowny odczyt, dwa trwałe ID, bajtowy oryginał i odmowę złej wersji bez utraty danych. Backup 111 plików, 68/68 testów i build poprawne. Szerszy odbiór dawnych zapisów pozostaje otwarty. |
| 2026-10-02 | 1.7 | kontynuacja — D5i | Import projektu 4 zapisuje przed podmianą stanu. Pełny localStorage odrzucił import Eko bez zmiany projektu bazowego; po zwolnieniu miejsca import, Cofnij/Ponów i odczyt źródła przeszły UI. Backup 112 plików, 68/68 testów i build poprawne. |
| 2026-10-02 | 1.7 | kontynuacja — D5j | Starszy zapis localStorage bez wersji zachował surową postać do pobrania i jawnego potwierdzenia migracji. UI sprawdził SHA256, anulowanie, ponowny odczyt v4 i 2 trwałe ID v5. Backup 113 plików, 68/68 testów, build poprawny. |
| 2026-10-02 | 1.7 | kontynuacja — D5k | Duże archiwum 5,6 MB ujawniło błąd walidacji base64, który odtworzono testem i usunięto. UI potwierdził odmowę przy limicie pamięci bez utraty projektu oraz pełny odczyt źródła z mniejszego archiwum. Backup 114 plików, 69/69 testów, build poprawny. |
| 2026-10-02 | 1.8 | nierozpoczęte → w trakcie — E1 | JSON projektu i CSV symulacji pokazują, czy pobrany plik odpowiada bieżącym danym. UI potwierdził edycję/Cofnij, zmianę partii i odstępu, powrót do parametrów oraz brak wpływu szybkości odtwarzania. Backup 114 plików, 69/69 testów, build poprawny; raport E. |
| 2026-10-02 | 1.8 | kontynuacja — E2 | Osobne statusy archiwum v4, DXF, bilansu CSV i raportu MD; archiwum nie zmienia czasu eksportu JSON. UI potwierdził selektywne odnowienie pliku i Cofnij. Backup 115 plików, 69/69 testów, build poprawny; raport E. |
| 2026-10-02 | 1.8 | kontynuacja — E3 | Status czterech pobrań warsztatu v5; UI Eko sprawdził, że edycja unieważnia tylko JSON/archiwum, a źródła pozostają zgodne. Cofnij i ponowne otwarcie sprawdzone; 69/69 testów i build poprawne. Raport E. |
| 2026-10-02 | 1.8 | kontynuacja — E4 | Status pobranego CSV symulacji zachowany po przebudowaniu widoku i zmianie karty v4/v5; UI potwierdził edycję, blokadę przy błędach, Cofnij i ponowny eksport. Backup 103 plików, 69/69 testów, build poprawny; raport E. |
| 2026-10-02 | 1.8 | kontynuacja — E5 | Znaczniki czterech eksportów v5 zachowane po zmianie karty; druk/PDF oznaczony jako wywołanie bez potwierdzenia zapisu. UI sprawdził edycję i Cofnij. Backup 103 plików, 69/69 testów, build poprawny; raport E. |
| 2026-10-02 | 1.8 | w trakcie → wdrożone — E6 | Osobne statusy XLSX/CSV procesu i BOM, stałe szablony i migawka JSON wariantu. UI potwierdził selektywne unieważnienie, Cofnij, ponowny eksport i granicę sesji; fizyczne pliki sprawdzone. Backup 103 plików, 69/69 testów, build poprawny; raport E. |
| 2026-10-02 | 1.7 | w trakcie → wdrożone | Całościowy odbiór zapisu, odzyskiwania, migracji starszych projektów i ochrony oryginału. Konsolidacja prac D5c–D5k. Zautomatyzowany odbiór UI CDP na porcie 5194 (`verify_1_7.mjs`) potwierdził: 1) odzyskiwanie uszkodzonego localStorage, 2) jawną migrację projektu bez wersji z pobraniem surowej kopii, 3) blokadę migracji przy osieroconych zasobach z zachowaniem oryginału i projektu docelowego, 4) ponowne otwarcie i pełny roundtrip. Backup 128 plików `backup/v0.4.0_przed_1_7_20261002_220500`, 75/75 testów i build poprawne; raport `WERYFIKACJA_MIGRACJA_ZAPIS_1_7.md`. |
| 2026-10-02 | 3.10 | nierozpoczęte → wdrożone | Wybór mnożników odtwarzania symulacji 1×–5000×, zabezpieczenie granicy czasu w `stepSimulationTime`, inspekcja na pauzie i niezmienność wyników symulacji. Backup 103 plików `backup/v0.4.0_przed_3_10_20261002_211700`, odbiór UI na procesie Eko (21 170 s) w karcie symulacji oraz warsztacie v5, 70/70 testów i build poprawne; raport `WERYFIKACJA_SYMULACJA_3_10.md`. |
| 2026-10-02 | 5.11 | nierozpoczęte → wdrożone | Przełączanie jednostek czasu s/min/h w całym UI (nagłówek, popyt, proces, bilans, symulacja, warianty). Komponent TimeField z automatycznym przeliczaniem, dynamiczne etykiety [s/min/h]. Zachowanie niezmiennika modelu czasu w sekundach potwierdzone testami jednostkowymi i zapisem localStorage. Backup 124 plików `backup/v0.4.0_przed_5_11_20261002_215000`, odbiór UI CDP na porcie 5195 (`outputs/qa/verify_5_11_time_units.png`), 75/75 testów i build poprawne; raport `WERYFIKACJA_JEDNOSTKI_CZASU_5_11.md`. |
| 2026-10-02 | 5.12 | nierozpoczęte → wdrożone | Pobieralne szablony importu procesu i BOM w XLSX (arkusz Dane do natychmiastowego importu, arkusz Opis kolumn ze specyfikacją techniczną) oraz CSV. Wzorcowy proces wielogałęziowy (OP10 → OP20, OP25 → OP30), 5 komponentów ze wszystkimi pojemnikami (BoxKLT, Tray, Carton, Pallet), rozwijana specyfikacja w UI oraz precyzyjne zgłaszanie brakujących wymaganych kolumn przy zachowaniu atomowości. Backup 105 plików `backup/v0.4.0_przed_5_12_20261002_213500`, odbiór UI na porcie 5196, 73/73 testy i build poprawne; raport `WERYFIKACJA_SZABLONY_5_12.md`. |
| 2026-10-01 | 3.10, 5.11, 5.12, 7.10 | dodano do planu — nierozpoczęte | Zapisano wymagania użytkownika: wyższe mnożniki odtwarzania, przełączane s/min/h, szablony importu XLSX procesu i BOM oraz późniejsze dopracowanie PDF. Nie zmieniono statusu aktywnego pakietu D. |
| 2026-10-03 | 2.1.2 | wdrożone — 2.1b | Wersjonowany podgląd migracji v4/v5 bez zapisu i symulacji; zachowuje źródło, ID, jawne ustawienia i pokazuje luki. Backup 117 plików, 78/78 testów i build; raport `WERYFIKACJA_MODELU_2_1.md`. Punkt 2.1 nadal w trakcie. |
| 2026-10-03 | 2.1.3 | wdrożone — 2.1c | Roboczy schemat 6, parser i przygotowanie migracji po podglądzie 2.1b; Eko v4/v5 i przypadki negatywne, 81/81 testów, build, backup 119 plików. Bez aktywnego zapisu i UI; punkt 2.1 w trakcie. Raport `WERYFIKACJA_MODELU_2_1.md`. |
| 2026-10-03 | 2.1.4 | w trakcie → wdrożone — 2.1d | Izolowany zapis i odczyt szkicu 6 z zachowaniem źródła v4/v5, kontrolą konfliktu i odmową nadpisania uszkodzonego szkicu; 83/83 testy, build, backup 120 plików. Bez podłączenia do UI; punkt 2.1 w trakcie. Raport `WERYFIKACJA_MODELU_2_1.md`. |
| 2026-10-03 | 2.1.5 | w trakcie → wdrożone — 2.1e | Podgląd migracji i luk w UI, pierwszy zapis szkicu i odczyt po przeładowaniu, pobranie uszkodzonej wartości. Edge CDP na porcie 5198 potwierdził też niezmienność danych v4/v5 i blokadę nieaktualnego podglądu. Backup 121 plików, 83/83 testy i build. Punkt 2.1 w trakcie; raport `WERYFIKACJA_MODELU_2_1.md`. |
| 2026-10-03 | 2.1.6 | w trakcie → wdrożone — 2.1f | Jawne zastąpienie po pobraniu kopii; walidacja nowego szkicu i porównanie poprzedniej wartości. Edge CDP potwierdził odzyskanie, zastąpienie z innym źródłem, konflikt, błąd pamięci i ponowne otwarcie. Backup 123 plików, 84/84 testy i build. Punkt 2.1 w trakcie; raport `WERYFIKACJA_MODELU_2_1.md`. |
| 2026-10-03 | 2.1.7 | w trakcie → wdrożone — 2.1g | Edycja osób i pul po trwałym ID, odmowa usunięcia osoby używanej przez pulę, zapis i Cofnij/Ponów. Edge CDP potwierdził tworzenie, zmianę członkostwa, ponowne otwarcie i niezmienność v4/v5. Backup 123 plików, 85/85 testów i build. Punkt 2.1 w trakcie; raport `WERYFIKACJA_MODELU_2_1.md`. |
| 2026-10-03 | 2.1.8 | w trakcie → wdrożone — 2.1h | Jawna edycja wyrobu i podzespołów po trwałym ID, sprawdzone referencje operacji, wspólne Cofnij/Ponów. Edge CDP potwierdził edycję, usuwanie, przywrócenie i ponowny odczyt bez zmiany v4/v5. Backup 125 plików, 86/86 testów i build. Punkt 2.1 w trakcie; raport `WERYFIKACJA_MODELU_2_1.md`. |
| 2026-10-04 | 2.1.9 | w trakcie → wdrożone — 2.1i | Ręczna definicja wyposażenia po trwałym ID i jawne opcjonalne powiązania; odmowa błędnych i podwójnych referencji. Edge CDP potwierdził edycję, Cofnij/Ponów, usunięcie, przywrócenie i ponowny odczyt bez zmiany v4/v5. Backup 127 plików, 87/87 testów i build. Punkt 2.1 w trakcie; raport `WERYFIKACJA_MODELU_2_1.md`. |
| 2026-10-04 | 2.1.10 | w trakcie → wdrożone — 2.1j | Opcjonalne jawne możliwości wyposażenia po ID operacji, zgodny odczyt dawnych szkiców. Edge CDP potwierdził wybór, wyczyszczenie, Cofnij/Ponów i ponowny odczyt bez zmiany v4/v5. Backup 129 plików, 88/88 testów i build. Punkt 2.1 w trakcie; raport `WERYFIKACJA_MODELU_2_1.md`. |
| 2026-10-04 | 2.1, 2.1.11 | w trakcie → wdrożone — 2.1k | Zbiorczy odbiór Eko v4/v5 i silników v4: po edycji szkicu 6 dokładne aktywne JSON i pełne wyniki symulacji bez zmian; istniejące testy referencji/migracji i ponowny odbiór UI Edge CDP (zapis, Cofnij/Ponów, odczyt, odzyskanie, zastąpienie). 89/89 testów i build; raport `WERYFIKACJA_MODELU_2_1.md`. Etap 2 pozostaje w trakcie. |
| 2026-10-04 | Etap 3 | nierozpoczęte → w trakcie | Korekta podsumowania zgodnie z zasadą statusu etapu: punkt 3.10 został wcześniej odebrany, choć pozostałe kroki etapu czekają. |
| 2026-10-03 | 2.1, 2.1.1 | 2.1 nierozpoczęte → w trakcie; 2.1.1 wdrożone — 2.1a | Kontrakt nowego modelu i migracji w `MODEL_PROCESU_2_1.md`; potwierdzono fakty w pliku Eko, 76/76 testów. Brak zmiany kodu i schematów; parser, migracja i UI pozostają do wykonania. |

### Szablon wpisu odbioru pakietu

2026-09-30 — 1.5: **nierozpoczęte → w trakcie**. D1: dodano niezależny, testowany rejestr stanowisk, bez zmiany zapisu i UI. ID zachowywane przy zmianie kolejności i operacji; podział/scalenie wymagają jawnego wskazania zachowanej tożsamości. Integracja oraz migracja pozostają do wykonania.

2026-09-30 — 1.4: **w trakcie → wdrożone**. Rozstrzygnięto mapowanie współrzędnych narzędzia: wcześniejszy gest nie trafiał w obiekt. Potwierdzono przeciąganie, zgodność 2D–3D, historię i zapis. Logi diagnostyczne usunięte; powtórzono odbiór na końcowym buildzie i przywrócono bazowy layout QA. 40/40 testów i build poprawne. Raport C, sekcja C3.

2026-09-30 — 1.4: **nierozpoczęte → w trakcie**. Wdrożono C1 (odświeżenie formularza 3D po zmianie modelu), wykonano backup modułów, 40/40 testów i build. UI potwierdza Cofnij/Ponów pól. C2 pozostaje otwarte: gest nie potwierdził przesunięcia, pojawił się czarny widok. Szczegóły i procedura powrotu w raporcie C.

Odbiór 2026-09-30 — 1.2, 1.2.2, 1.3, 1.3.1: **w trakcie → wdrożone**. Zamknięto B06 oraz B09–B10. Pobrano rzeczywisty JSON (42836 bajtów), zachowano w `tests/qa`, odtworzono projekt przez UI i powtórzono symulację (21170 s). Bez zmian kodu produkcyjnego; raport `WERYFIKACJA_STABILIZACJA_B.md`. Etap 1 jako całość nadal w trakcie; następny krok 1.4.

- Data i wersja:
- Zrealizowane ID:
- Lokalizacja backupu:
- Zmienione moduły / pliki:
- Testy automatyczne i build — polecenia oraz wynik:
- Scenariusze UI i wynik:
- Migracja/zapis/ponowne otwarcie — wynik:
- Nowe lub pozostałe ograniczenia:
- Aktualizacje dokumentacji:
- Następne kroki / wymagane decyzje:

## Powiązane dokumenty

- [Funkcje obecnej aplikacji](FUNKCJE_PROGRAMU.md)
- [Zmiany i weryfikacja wersji 0.4.0](ZMIANY_v0.4.0.md)
- [Historyczne wymagania i propozycje usprawnień](to_upgrade.md)
- [Instrukcja Eko 0.4](Instrukcja/Eko_v0.4.md)

Ten dokument jest głównym rejestrem przyszłych prac. Historyczne raporty pozostają zapisem stanu wcześniejszych wersji i nie zastępują aktualizacji statusów tutaj.
