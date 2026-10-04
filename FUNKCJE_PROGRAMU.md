# Layout Studio Pro 3D v0.4.0 — funkcje programu

Stan: 29.09.2026. Rejestr zmian i odbioru: `ZMIANY_v0.4.0.md`.
Uzupełnienie stabilizacyjne z 29.09.2026: `WERYFIKACJA_STABILIZACJA_A.md`; bieżący plan i statusy: `PLAN_ROZWOJU.md`.
Program służy do koncepcyjnego projektowania, bilansowania i porównywania wariantów linii. Jest lokalną aplikacją inżynierską, nie odpowiednikiem pełnego systemu Visual Components.

## Uruchamianie i zapisy

- Uruchom `Uruchom_Layout_Studio_v0.3.bat` (nazwa launchera zachowana; buduje aktualną wersję). Otwórz adres wskazany przez serwer, standardowo http://127.0.0.1:4173.
- Alternatywnie: `npm ci`, `npm test`, `npm run build`, `npm start`. Node zgodny z package.json.
- Projekty: pusty, silniki EV, baterie EV oraz Eko z 16 operacjami i 60 materiałami.
- Nazwa projektu, automatyczny zapis poprawnego modelu po 700 ms, ręczny zapis, status i data zapisu.
- Eksport/import zwykłego JSON (schemat 4; odczyt starszych projektów) oraz osobnego przenośnego archiwum v4 z pierwotnym plikiem importu. Odzyskiwanie uszkodzonego zapisu i potwierdzenia zastąpienia projektu.
- Cofnij/Ponów do 40 zmian w sesji.
- Biblioteka do 20 nazwanych wariantów; porównanie cyklu docelowego, liczby stacji, sprawności i typu layoutu; wczytanie i eksport wariantu.
- Dane lokalne są przypisane do adresu, portu i profilu przeglądarki. JSON jest kopią przenośną i podstawą archiwizacji. Schemat 4 nie jest przeznaczony do starszej aplikacji.

Pasek projektu oznacza, czy JSON pobrany w bieżącej sesji odpowiada aktualnym danym, oraz wymienia nieaktualne archiwum v4, DXF, bilans CSV, raport MD i eksporty procesu/BOM XLSX/CSV, jeśli zostały wcześniej pobrane. Eksporty procesu i BOM mają oddzielne statusy dla obu formatów; zależą od własnych eksportowanych wierszy, więc sama zmiana nazwy projektu ich nie unieważnia. Karty procesu i BOM pokazują status przy przyciskach eksportu. Szablony importu mają stałą przykładową treść i nie zależą od projektu. Po zmianie danych pasek wskaże potrzebę ponownego eksportu; Cofnij przywracające poprzedni stan może przywrócić zgodność części plików. JSON zapisanego wariantu jest osobną migawką: po zleceniu pobrania karta Pulpit oznacza je w bieżącej sesji, a dalsza edycja bieżącego projektu nie zmienia tego pliku. Warsztat v5 osobno pokazuje aktualność pobranego JSON, archiwum, oryginału v4 i pierwotnego importu także po przejściu do innej karty i powrocie. Edycja stanowiska unieważnia JSON i archiwum, ale nie zmienia statusu niezmienionych źródeł. W symulacji status pobranego CSV reaguje na zmianę projektu, wielkości partii lub odstępu uruchamiania; sama szybkość odtwarzania nie zmienia obliczonego wyniku. Status CSV pozostaje widoczny po ponownym otwarciu karty w tej sesji. Gdy błąd danych lub layoutu blokuje symulację, aplikacja wskazuje, że nie może potwierdzić aktualności wcześniejszego CSV. Karta raportu oznacza, kiedy wywołano drukowanie dla wersji projektu, i ostrzega po jej zmianie; aplikacja nie potwierdza faktycznego zapisania PDF. Znaczniki dotyczą tylko bieżącej sesji i informują o przekazaniu pliku do pobrania, a nie potwierdzają fizycznego zapisu.

### Warsztat stanowisk schematu 5 — trwałe ID i bezpieczeństwo zasobów (wdrożone: 1.5, 1.6, 1.7)

Karta `Stanowiska v5` tworzy osobny projekt z bieżącego projektu schematu 4 lub wczytuje JSON schematu 5. Wprowadza trwałe identyfikatory stanowisk (`ST-...`), całkowicie niezależne od kolejności sekwencji i aktualnego przypisania operacji:
- **Trwałość ID i zmiana kolejności**: przesunięcie stanowiska w górę lub w dół zmienia jego pozycję na linii, lecz bezwzględnie zachowuje jego trwałe ID, przypisane obiekty wyposażenia oraz parametry zasobów. Próba przesunięcia naruszająca relacje technologiczne (poprzednik/następnik) jest odrzucana z czytelnym ostrzeżeniem.
- **Usuwanie operacji ze stanowiska**: panel `Usuń operację ze stanowiska` oczyszcza relacje poprzedników i powiązania BOM, lecz zawierające ją stanowisko pozostaje w rejestrze z nienaruszonym trwałym ID, wyposażeniem w `layoutObjects` i zasobami w `workstationSettings`. Stanowisko staje się stacją pustą (`operationIds: []`) o cyklu 0 s, eliminując niejawne resetowanie lub usuwanie stacji.
- **Jawny podział i scalenie**: podział stanowiska zachowuje dotychczasowe ID, zasoby i geometrię stacji źródłowej, tworząc nową stację z unikalnym ID bez powiązań. Scalenie wymaga wskazania pozostającego ID, prezentuje obiekty i ustawienia usuwanej stacji oraz wymaga zaznaczenia jawnej zgody i potwierdzenia.
- **Zasoby i wyposażenie**: formularz zasobów zapisuje obsadę, liczbę równoległych kopii i opcjonalny jawny cykl zespołu pod trwałym ID; pokazuje cykl bazowy, odstęp zdolności i liczbę stołów. Zwiększenie obsady nie skraca czasu automatycznie. Edytor geometrii pozwala dodawać stół ESD, regał FIFO lub strefę operatora z podaniem współrzędnych i wymiarów oraz edytować obiekty po trwałym ID. Rzut 2D i podgląd 3D korzystają z zapisanej listy obiektów.
- **Ochrona layoutu i symulacji**: brak zapisanych stołów jest traktowany jako błąd layoutu i natychmiast blokuje symulację bez cichego generowania wyposażenia. Zwiększenie liczby kopii wymaga ręcznego dodania stołu z własnymi danymi. Przycisk `Wygeneruj layout od nowa` wymaga potwierdzenia.
- **Zapis i historia**: pełne wsparcie Cofnij/Ponów w sesji, odrębny lokalny zapis v5 oraz eksport/import formatu schematu 5 i przenośnego archiwum v5. Pełna weryfikacja opisana w `WERYFIKACJA_STALE_ID_1_5_1_6.md` i `WERYFIKACJA_STABILIZACJA_D.md`.

### Roboczy szkic modelu procesu 6 (punkt 2.1 wdrożony; etap 2 w trakcie)

W karcie `Stanowiska v5` panel `Model procesu — szkic schematu 6` pozwala przejrzeć migrację aktywnego projektu 4 lub warsztatu 5, sprawdzić jawne luki danych i zapisać osobny, niekompletny szkic. Po zapisaniu można ręcznie definiować osoby i pule, wyrób i podzespoły oraz wyposażenie technologiczne. Podzespół wskazuje opcjonalną operację tworzącą i wybrane operacje zużywające. Wyposażenie może wskazywać stanowisko i pojedynczy obiekt layoutu oraz ręcznie potwierdzone operacje, które potrafi obsłużyć. Brak wskazanych możliwości oznacza „nie określono”; sama możliwość nie oznacza wymagania operacji. ID pozostają stałe po zmianie nazwy, a nieistniejące lub sprzeczne referencje są odrzucane. Wszystkie edycje szkicu mają wspólne Cofnij/Ponów i zapis pod osobnym kluczem przeglądarki. Panel pozwala pobrać szkic ze źródłem, odzyskać surowy uszkodzony zapis i jawnie zastąpić szkic po pobraniu jego kopii. Szkic nie zmienia aktywnych projektów 4/5, bilansu ani symulacji; definicje należy podać samodzielnie, bez wyprowadzania ich z BOM lub geometrii. Szczegóły: `MODEL_PROCESU_2_1.md` i `WERYFIKACJA_MODELU_2_1.md`.

Przy imporcie starszego JSON bez numeru schematu aplikacja normalizuje projekt do schematu 4, a bajty wczytanego pliku zachowuje osobno w lokalnym zapisie. `Pobierz pierwotny import` w projekcie 4 i warsztacie 5 zwraca dokładnie importowany plik; `Pobierz oryginał 4` w warsztacie zwraca znormalizowaną migawkę używaną do migracji. Kopia importu pozostaje dostępna po zmianach projektu, Cofnij/Ponów i ponownym otwarciu. Starszy projekt zapisany bezpośrednio w localStorage otwiera się do podglądu bez automatycznego nadpisania: najpierw użyj `Pobierz starszy zapis`, sprawdź pobrany plik, potem `Potwierdź migrację i zapis`. Ten plik zawiera surową otoczkę lokalnego zapisu, odrębną od zwykłego eksportu projektu i archiwum importu. `Eksport archiwum v4` i `Eksport archiwum v5` tworzą osobne, wersjonowane pliki JSON z projektem i tymi źródłami; można je wczytać w odpowiedniej karcie na innym adresie lub w innym profilu przeglądarki. Zwykły eksport JSON nadal zawiera sam projekt. Starszych plików zaimportowanych przed archiwizacją nie da się odzyskać z samej znormalizowanej migawki. Import projektu 4 najpierw zapisuje komplet danych lokalnie; przy braku miejsca lub dostępu zostawia bieżący projekt i jego historię bez zmiany. Duży plik może przekroczyć limit pamięci przeglądarki. Gdy zapis bieżących zmian zgłasza błąd, wyeksportuj projekt JSON przed zamknięciem karty. Pojedyncze archiwum ma limit 25 MB, a pierwotny import 10 MB.

## Popyt, takt i kalendarz

Popyt roczny, dni robocze, liczba zmian, godziny zmiany, przerwy i OEE.

- Popyt dzienny = popyt roczny / dni robocze.
- Dostępny czas = (godziny × 3600 − przerwy × 60) × zmiany.
- Takt klienta = dostępny czas / popyt dzienny.
- Docelowy cykl = takt klienta × OEE / 100.
- Walidacja zakresów, maksymalnie 24 godziny zmian na dobę, OEE > 0 i ≤ 100%.

OEE jest rezerwą projektową, nie losowym modelem awarii.

## Operacje i zależności

Dodawanie, edycja i usuwanie operacji: unikalne tekstowe ID, nazwa, czas standardowy, VA i NVA. Zmiana czasu domyślnie zachowuje proporcję VA/NVA, a VA można skorygować. Suma VA i NVA musi odpowiadać czasowi.

### Jednostki prezentacji czasu (s / min / h)
Przełącznik `Jednostka czasu` w nagłówku aplikacji oraz w zakładce `1 Popyt i takt` pozwala wybrać jednostkę prezentacji: sekundy (`s`), minuty (`min`) lub godziny dziesiętne (`h`). Jednostka jest zawsze jawnie oznaczona w nagłówkach kolumn tabeli (`Czas [s/min/h]`, `VA / NVA [s/min/h]`), polach formularzy, inspektorze operacji, kafelkach diagramu przepływu, wykresie Yamazumi, edytorze zasobów stanowisk, symulacji oraz metrykach popytu i bilansu. Wewnętrzny stan modelu procesu, taktu i symulacji pozostaje ściśle i bezwzględnie w sekundach; zmiana jednostki przelicza wartości w interfejsie w locie (np. 150 s = 2,5 min = 0,0417 h; edycja 2,5 min zapisuje w modelu 150 s).


Poprzednicy i następnicy są edytowalni w tabeli i inspektorze diagramu/Yamazumi. Obie strony przedstawiają ten sam graf: w JSON źródłem jest lista poprzedników, następnicy są wyliczani. Zapis następnika aktualizuje poprzednika operacji docelowej. ID nie wyznacza kolejności; OP25 może poprzedzać OP19.

Graf obsługuje:
- niezależne początki, rozgałęzienia i złączenia wielu gałęzi;
- oczekiwanie na wszystkich poprzedników (AND), bez probabilistycznych wyborów OR;
- sekwencyjny lub równoległy montaż, określony zależnościami i dostępnymi stanowiskami;
- sortowanie topologiczne;
- wykrywanie brakujących ID, duplikatów, samopowiązań i cykli.

Usunięcie operacji usuwa jej połączenia. BOM pozostaje do ponownego przypisania, z widocznym błędem referencji.

Tabela i diagram korzystają ze wspólnej funkcji usuwania, kompaktującej numery ręcznych stanowisk po opróżnieniu stacji. Nie tworzy ona automatycznie nowych zależności w miejsce usuniętej operacji. Otwarte formularze procesu i BOM synchronizują dane po Cofnij/Ponów; zaakceptowany import czyści formularz. Zakres odbioru tych poprawek i pozostałe próby UI opisuje raport pakietu A.

## Edytowalny diagram przepływu

Zakładka „2a Przepływ” i przycisk Diagram:
- kafelki z ID, nazwą, czasem, VA i liczbą materiałów;
- przeciąganie kafelków, siatka, przesuwanie tła, zoom, dopasowanie;
- automatyczne ułożenie według zależności;
- dodawanie operacji i następnika, łączenie portami lub listami, rozłączanie i usuwanie;
- inspektor nazwy, czasów, poprzedników/następników oraz BOM i kosztów.

Pozycje diagramu są zapisywane, ale nie zmieniają technologii ani współrzędnych CAD.

## Import/eksport XLSX i CSV

Pierwszy arkusz, nagłówki w pierwszym wierszu. Maksymalnie 10 MB i 5000 wierszy importu. Proces do 500 operacji, BOM do 5000 pozycji. Import jest atomowy: błędy odrzucają całość, a projekt pozostaje nienaruszony. Raport wskazuje odczytane, poprawne i pominięte wiersze oraz błędy (w tym dokładne nazwy brakujących wymaganych kolumn). Poprawny import zastępuje wybraną listę po potwierdzeniu.

Pobieralne szablony importu (przyciski `Szablon XLSX` i `Szablon CSV` w kartach Proces i BOM):
- Szablon XLSX zawiera dwa arkusze: **Dane** (arkusz 0, natychmiast importowalny do programu bez konieczności usuwania opisów) oraz **Opis kolumn** (arkusz 1, ze szczegółową specyfikacją techniczną kolumn, typów i jednostek).
- Szablon procesu demonstruje proces wielogałęziowy (rozgałęzienie i złączenie gałęzi: OP10 → OP20, OP25 → OP30).
- Szablon BOM zawiera 5 komponentów powiązanych z krokami procesu, demonstrujących wszystkie 4 typy pojemników (BoxKLT, Tray, Carton, Pallet) oraz format kosztów jednostkowych.
- Pod tabelami edytorów dostępna jest rozwijana specyfikacja kolumn (`Format importu i specyfikacja kolumn`) z tabelarycznym wykazem: status (Wymagana / Opcjonalna), typ danych, jednostka oraz szczegółowy opis zasad walidacji.

Proces: ID Kroku, Nazwa Operacji, Czas Standardowy [s], Wartość Dodana VA [s], Strata NVA [s], Poprzednicy, Następnicy. Pierwsze trzy wymagane. Domyślne VA to 85%; NVA to różnica. Listy ID rozdzielane przecinkiem/średnikiem.

Zależności obu kolumn są łączone jako suma. Można używać tylko jednej kolumny. Aby usunąć relację w pliku zawierającym obie kolumny, trzeba usunąć oba jej zapisy. Eksport i szablony zawierają obie kolumny.

BOM: numer części, nazwa, ilość na wyrób, typ pojemnika, ilość w opakowaniu, przypisany krok, koszt jednostkowy. Wszystkie kolumny są wymagane. Obsługiwane są również angielskie nagłówki. Eksport zabezpiecza tekst zaczynający się znakami formuł.

Import procesu resetuje przydziały i zasoby do RPW, zgodnie z komunikatem potwierdzenia. Nie usuwa istniejącego BOM ani ręcznej geometrii. Przy obcych ID najpierw utwórz pusty projekt albo zaimportuj właściwy BOM po procesie.

## BOM i logistyka

CRUD materiałów, wybór operacji, BoxKLT/Pallet/Tray/Carton, koszt jednostkowy (także zero), ilość i pojemność.

- Koszt wyrobu = suma ilość × koszt.
- Zużycie dzienne = ilość na wyrób × popyt dzienny.
- Pojemniki/zmianę = zużycie / zmiany / pojemność, zaokrąglone w górę.
- PLN/EUR/USD to etykiety wartości, bez kursów walut.

BOM nie steruje dostępnością zapasu w symulacji. Nie ma milk-run, dostaw ani zapasu bezpieczeństwa.

## Bilansowanie, zasoby i Yamazumi

RPW: priorytet czasu operacji i jej unikalnych następników. LCR: priorytet najdłuższych dostępnych operacji. Operacje są niepodzielne; zbyt długa operacja nie znika, tylko otrzymuje oznaczenie przekroczenia. Algorytmy respektują zależności, nie gwarantują optimum.

Manual: numery stacji od 1 bez luk; poprzednik nie może być przypisany do późniejszego numeru stacji. Numeracja stacji jest porządkiem technologicznym, a nie pozycją w hali. „Każda operacja osobno” tworzy przydział topologiczny i zachowuje widoczność gałęzi.

Yamazumi:
- segmenty operacji, przeciąganie między stacjami lub do nowej stacji, alternatywa przez listy;
- automatyczna kompakcja pustych stacji, zachowanie BOM, blokada złych zależności;
- inspektor operacji, regulacja skali, linia celu, obciążenie i przekroczenia;
- wysokość słupka = odstęp zdolności; segmenty proporcjonalnie skalowane, etykiety pokazują bazowe czasy.

Zasoby każdej grupy:
- operatorzy na jedną kopię: 1–20;
- identyczne równoległe kopie: 1–20, maksymalnie 1000 fizycznych stanowisk w projekcie;
- opcjonalny zmierzony/założony czas zespołu [s/szt.];
- obsada całkowita = suma operatorzy × kopie.

Sam dodatkowy pracownik nie dzieli czasu. Bez jawnego czasu zespołu obowiązuje suma czasów operacji. Odstęp zdolności = cykl zespołu / liczba kopii; nie jest czasem przejścia pojedynczej sztuki.

Ustawienia są związane z dokładnym zestawem ID operacji. Po zmianie grupowania należy je sprawdzić i ustawić dla nowych grup. Samo przenumerowanie nie przypisuje cudzych zasobów.

Wyniki: bazowa pracochłonność, bazowe minimum teoretyczne, fizyczne kopie i obsada, odstęp wąskiego gardła, sprawność, szacowana zdolność dobowa i lista przekroczeń. Sprawność = suma cykli zespołów / [suma kopii × max(cel, maksymalny odstęp zdolności)] × 100%. To wykorzystanie stanowisk, nie wydajność pracowników. Zdolność dobowa jest oszacowaniem pojemności, nie wynikiem symulacji partii. Porównanie RPW/LCR dotyczy bazowego przydziału bez optymalizacji obsady.

## Layout, hala i CAD 2D

- Wymiary hali, siatka, przeszkody/strefy wyłączone.
- Układy U, liniowy, L oraz „Z procesu — gałęzie / rybia ość”.
- Układ grafowy wyznacza poziomy zależności i główną nitkę na podstawie skumulowanych czasów; pozostałe gałęzie rozkłada obok. Nie odczytuje technologii z nazw operacji.
- Każda fizyczna kopia otrzymuje stół, FIFO i strefę obsady; wejście i wyjście, centrowanie, edycja odstępów i wymiarów.
- Fioletowe linie pokazują połączenia technologiczne między stołami, również alternatywnymi kopiami. Nie są ilością transportów ani drogą operatora.
- Edycja nazw, pozycji, wymiarów i obrotu, dodatkowe wyposażenie, lista obiektów i przeszkód.
- Przeciąganie z podglądem i siatką, przesuwanie widoku, zoom i dopasowanie.
- Edycja przełącza layout w tryb ręczny. Zmiana procesu nie nadpisuje ręcznych pozycji. Niezgodna liczba stołów/kopii jest raportowana.
- Regeneracja wymaga potwierdzenia zastąpienia geometrii.
- Kontrola obróconych obrysów, kolizji, granic hali i poziomu/wysokości.

Generator nie omija przeszkód i nie optymalizuje dróg. To kontrola geometrii rzutu, nie certyfikacja BHP ani kolizji 3D brył na różnych poziomach.

## Edycja i prezentacja 3D

Hala, stoły, regały, maty, wyposażenie i przeszkody w skali metrycznej. Lewy przycisk: obrót, prawy: pan, kółko: zoom. Dopasowanie hali, widok z góry i zbliżenie na wybrany obiekt.

Tryb edycji: wybór i przeciąganie wyposażenia po podłodze z opcjonalną siatką. Formularz/lista umożliwia dokładny zapis X, Y, Z, wymiarów i obrotu. CAD i 3D używają tej samej geometrii; działa Cofnij/Ponów. Kamera jest zachowywana przy zmianach w tym widoku. Zielone znaczniki wskazują aktywne kopie stanowisk w bieżącym czasie symulacji. Nie przedstawiają ruchu produktu ani człowieka.

Wymagane WebGL; przy jego braku obliczenia i CAD 2D pozostają dostępne.

## Symulacja grafowa partii

Deterministyczny harmonogram zdarzeń, nie szereg wynikający z ID. Każda sztuka uruchamia własne podmontaże. Operacja czeka na wszystkich poprzedników tej sztuki i wolną kopię stanowiska. Koniec sztuki następuje po wykonaniu wszystkich jej operacji.

Kopia stanowiska wykonuje jedną operację naraz. Kolejki według gotowości, przy remisie numer sztuki i kolejność topologiczna. Pracownicy są dedykowani do kopii. Zadany cykl zespołu skaluje czasy przypisanych operacji proporcjonalnie. Kolejne operacje tej samej sztuki mogą korzystać z innych kopii tej samej grupy — model nie blokuje stołu na cały pobyt wyrobu.

- Partia 1–10000, nie więcej niż 200000 wykonań operacji.
- Odstęp uruchamiania sztuk, prędkości odtwarzania 1/2/5/10/20/50/100/200/500/1000/2000/5000× z zabezpieczeniem granicy czasu, pauzą i natychmiastową inspekcją stanu. Wynik obliczeń i raporty CSV nie zależą od prędkości animacji.
- Start, pauza, wznowienie, reset, obliczenie całej partii, oś czasu.
- Ukończone sztuki, WIP liczony jako całe wyroby (nie podzespoły), czas, średnia wydajność z rozruchem.
- Aktualne sztuki/operacje/kopie, kolejki i CSV początku/końca każdej operacji.
- Zmiana procesu lub zasobów resetuje przebieg. Zmiana geometrii nie zmienia czasów: transport wynosi zero.

Nie ma awarii, zmienności, braków jakościowych, przezbrojeń, limitów buforów, współdzielonych pracowników, braku materiału, fizycznego transportu ani blokady jednego wspólnego korpusu między różnymi stacjami. Równoległy montaż tego samego wyrobu jest zależnością logiczną; wykonalność przestrzenną musi potwierdzić inżynier.

## Raporty i eksporty

JSON całego projektu/warian­tu; XLSX/CSV procesu i BOM; CSV bilansu z obsadą, kopiami i odstępem zdolności; CSV harmonogramu; DXF rzutu z jednostkami mm, przeszkodami i obrotem; Markdown założeń, bilansu, materiałów i kontroli; druk/PDF przez przeglądarkę.

## Eko: dane przykładu i dalsza praca

`tests/Test Eko.xlsx`: oryginalne 12 czasów zachowane. Dodano OP22/OP23 (drzwi, po 600 s) i OP24/OP25 (panele, po 480 s), jednoznacznie jako czasy testowe. Zmieniono graf, aby podmontaże zasilały właściwe etapy. Obecny przykład dopuszcza równoległe pary. Dodanie OP22 → OP23 wymusza kolejność drzwi; analogicznie OP24 → OP25 dla paneli.

`tests/Test Eko BOM.xlsx` pozostaje bez zmian: 60 materiałów dla pierwotnych 12 operacji. Nowe etapy nie otrzymały automatycznie drugiego kosztu tych samych podzespołów. Ewentualne dodatkowe materiały montażowe należy uzupełnić.

Przykład w aplikacji ma testową halę 40 × 40 m i popyt 1500 szt./rok. Nie opisuje rzeczywistych wymiarów ani wymaganego tempa zakładu. Instrukcja nowych funkcji: `Instrukcja/Eko_v0.4.md`. Starszy DOCX dotyczy poprzedniej wersji.

## Granice komercyjnego wdrożenia

Brak kont, współpracy wielu użytkowników, licencjonowania, płatności, ERP/MES i chmurowych kopii. Lokalny serwer udostępnia tylko dist na 127.0.0.1. Nie wystawiaj serwera developerskiego ani katalogu projektu publicznie. Przed wdrożeniem potrzebne są pomiary rzeczywiste, odbiór technologiczny/ergonomiczny, sprawdzenie DXF w docelowym CAD oraz wybór sposobu dystrybucji. Testy automatyczne nie stanowią certyfikacji przemysłowej.
# Aktualizacja stabilizacji 2026-09-30 — formularz 3D

Odbiór C3 zakończony: przeciąganie myszą z siatką 100 mm i bez siatki (1 mm), Cofnij/Ponów, zgodność 2D–3D i zachowanie po zapisie/przeładowaniu potwierdzone. Poniższe uwagi o otwartym odbiorze dotyczą stanu sprzed C3.

Kamera 3D ma ograniczony obrót nad podłogą i odległość 0.5–1500 m. W trybie edycji lewy przycisk nie obraca kamery; prawy przesuwa widok, kółko przybliża. Obrót wraca po wyłączeniu edycji. Przeciąganie wyposażenia pozostaje w odbiorze (C2).

Otwarty formularz geometrii 3D odświeża się po zmianie danych projektu, w tym Cofnij/Ponów; nie zachowuje nieaktualnej cofniętej geometrii. Zmiana modelu zastępuje niezapisany szkic aktualnymi wartościami. Odbiór przeciągania myszą pozostaje otwarty — szczegóły w `WERYFIKACJA_STABILIZACJA_C.md`.
