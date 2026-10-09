# Layout Studio Pro 3D v0.4.0 — funkcje programu

Stan: 29.09.2026. Rejestr zmian i odbioru: `ZMIANY_v0.4.0.md`.
Uzupełnienie stabilizacyjne z 29.09.2026: `WERYFIKACJA_STABILIZACJA_A.md`; bieżący plan i statusy: `PLAN_ROZWOJU.md`.
Program służy do koncepcyjnego projektowania, bilansowania i porównywania wariantów linii. Jest lokalną aplikacją inżynierską, nie odpowiednikiem pełnego systemu Visual Components.
Docelowo ma obsługiwać własne procesy inżynierów i konsultantów Lean pracujących z różnymi klientami. Eko jest niepełnym przykładem testowym, a nie wymaganą strukturą projektu ani zweryfikowanym modelem produkcji.

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

Szkic 6 obsługuje opcjonalny profil czasu operacji z osobnymi przedziałami pracy ręcznej, automatu i wymaganej obecności operatora oraz oznaczeniem pochodzenia czasu. Punkt 2.2 odebrano na Eko i silnikach. Edytor pozwala ręcznie podać i sprawdzić przedziały w s/min/h, zapisać profil, usunąć go oraz użyć wspólnego Cofnij/Ponów. Profil nie jest jeszcze używany w bilansie lub symulacji. Starszy czas standardowy nie jest automatycznie dzielony. Kontrakt i dowody: `MODEL_CZASU_2_2.md`, `WERYFIKACJA_CZASU_2_2.md`.

Szkic 6 obsługuje opcjonalną minimalną obsadę operacji i osobne, pełne profile czasu dla jawnie podanych liczebności zespołu. Edytor pozwala wpisać minimum, dodać, zmienić lub usunąć wariant, usunąć obsadę oraz użyć wspólnego Cofnij/Ponów; zapis podlega walidacji i przechodzi ponowny odczyt. Punkt 2.3 odebrano na Eko v4/v5 i silnikach v4. Starsze szkice nadal się otwierają. Obsada stanowiska nie jest przenoszona na operację, a czasy nie są dzielone automatycznie. Warianty nie sterują jeszcze aktywną symulacją. Kontrakt i dowody: `MODEL_OBSADY_2_3.md`, `WERYFIKACJA_OBSADY_2_3.md`.

Punkt 2.4 wdrożono w zakresie logicznego harmonogramu niekompletnego szkicu 6. Izolowany rejestr rezerwacji pracowników sprawdza konkretne ID i nie dopuszcza nakładania przedziałów ani podwójnego zajęcia tej samej osoby; po zwolnieniu pozwala na jej ponowne użycie. Walidowany plan pojedynczego przebiegu przyjmuje stały skład po ID i jawny wariant czasu oraz listę dopuszczonych osób dla każdej operacji, bez doboru spoza składu. Edytor szkicu 6 pozwala wybrać i bezpiecznie zapisać te dane, odczytać je po przeładowaniu oraz użyć wspólnego Cofnij/Ponów; starsze szkice bez wyboru nadal się otwierają. Odrębny harmonogram w szkicu 6 przydziela konkretne osoby z ustalonego składu, czeka na ich dostępność i utrzymuje te same osoby od pierwszego do ostatniego przedziału obecności. Użytkownik podaje partię i odstęp przybycia, a podgląd pokazuje przydział, kopię stanowiska, czas oraz przyczyny oczekiwania. Wynik nie jest zapisywany i znika po zmianie wejścia lub szkicu. Harmonogram wymaga jawnych kopii stanowisk i na razie prowadzi tylko jedną operację na sztukę. Nie steruje aktywną symulacją 4/5; transport, wyposażenie i fizyczny stan wyrobu pozostają poza tym wynikiem. Szczegóły: `MODEL_OPERATOROW_2_4.md`, `WERYFIKACJA_OPERATOROW_2_4.md`.

Punkt 2.5 wdrożono w zakresie szkicu 6. Szkic 6 może zapisać opcjonalne, jawne kalendarze zmian i przerw osób oraz stanowisk z oznaczeniem, czy godziny są potwierdzone czy założone. Szkic bez pola kalendarzy zachowuje dawny, oznaczony podgląd logiczny, który nie stanowi grafiku zmian. Gdy kalendarze są podane, odrębny harmonogram wymaga wpisów ustalonego składu i używanych stanowisk; częściowe dane nie tworzą domyślnych godzin. Rozpoczęta operacja zatrzymuje się poza wspólnym oknem dostępności i wznawia pracę z tymi samymi osobami na tej samej kopii stanowiska. Wynik rdzenia zawiera odcinki pracy i pauzy; aktywna symulacja 4/5 pozostaje bez zmian. Edytor pozwala zapisywać i usuwać kalendarze zasobów, korzysta ze wspólnego Cofnij/Ponów. UI pokazuje odcinki pracy, pauzy i rezerwacje osób; zapis i odczyt odebrano na Eko oraz syntetycznym pakowaniu. Szczegóły: `MODEL_KALENDARZA_2_5.md`, `WERYFIKACJA_KALENDARZA_2_5.md`.

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

Punkt 2.6 w trakcie: odrębny harmonogram szkicu 6 obsługuje jawne dopuszczenia kopii i stałe wyposażenie. Najwcześniejszy możliwy start ma pierwszeństwo; przy remisie wybiera krótszą potwierdzoną rzeczywistą trasę do jednej określonej kopii następnej operacji. Wynik pokazuje wyposażenie i trasę rozstrzygającą wybór. Brak trasy wymaganej do porównania lub niejednoznaczny przyszły cel powoduje odmowę. Edytor tych danych pozostaje do 2.6.4; nie naliczamy czasu transportu ani nie wyznaczamy ścieżek z geometrii. Szczegóły: `MODEL_STANOWISK_2_6.md`, `WERYFIKACJA_STANOWISK_2_6.md`.

Szkic 6 ma już edytor dopuszczeń operacji po stanowisku i kopii, jawnych wymagań wyposażenia, stałego przypisania egzemplarzy i rzeczywistych długości skierowanych tras. Udostępnia kolejność dopuszczeń, zapis, usuwanie oraz wspólne Cofnij/Ponów. Nowe trasy i ich edycja wymagają potwierdzenia długości według wpisanego źródła. Odbiór zapisu/odczytu przeprowadzono na syntetycznym pakowaniu i obróbce/montażu. Punkt 2.6 nadal wymaga reguły porównania dróg przy wielu przyszłych celach; harmonogram jawnie odmawia takiego niejednoznacznego remisu.

Aktualizacja 2.6e: harmonogram wybiera dalszą drogę automatycznie także przy wielu dopuszczonych przyszłych kopiach w jednym ciągu operacji. Wymaga jawnych skierowanych długości dla wszystkich dopuszczonych przejść. Najwcześniejszy start ma pierwszeństwo, następnie krótsza droga z poprzedniej wybranej kopii i dalsze przejścia. UI oddziela planowaną następną trasę od wybranej drogi z poprzedniej operacji, ponieważ dostępność może zmienić plan. Ograniczenie jednej przyszłej kopii usunięto. Fizyczne rozgałęzienia pozostają do modelu korpusu/podzespołów 2.7/2.8; 2.6 jako całość pozostaje w trakcie.

Aktualizacja 2.7a: rdzeń zawiera niezależny rejestr jawnie zadeklarowanych instancji korpusu, ich lokalizacji, zajęcia i przemieszczeń. Chroni przed podwójnym zajęciem i transportem podczas pracy; rozróżnia czasy założone i potwierdzone. Nie jest jeszcze podłączony do harmonogramu, zapisu projektu ani UI. Punkt 2.7.1 odebrany; role operacji, integracja i edytor pozostają w kolejnych pakietach 2.7. Szczegóły: `MODEL_KORPUSU_2_7.md`, `WERYFIKACJA_KORPUSU_2_7.md`.

Aktualizacja 2.7b: kontrakt szkicu 6 rozróżnia jawne przygotowanie wskazanych podzespołów i pracę na korpusie. Waliduje powiązania i chroni przed usunięciem używanych definicji; starszy zapis bez ról pozostaje czytelny. Role nie są dopisywane z nazw ani grafu. Harmonogram z nowymi rolami jawnie odmawia obliczeń do integracji 2.7.3. Edytor i inspekcja w UI pozostają do 2.7.4. Punkt 2.7.2 odebrany w zakresie danych i zapisu/odczytu.

Aktualizacja 2.7c: rdzeń harmonogramu przyjmuje jawne instancje korpusu i przypisania do sztuk jako osobne wejście przebiegu. Operacje na korpusie rezerwują go w jego zapisanej lokalizacji przez cały czas, również podczas pauz; przygotowanie podzespołów go nie zajmuje. Wynik zawiera ID korpusu i zdarzenia rejestru. Wymagany transport powoduje odmowę do ustalenia czasu i zajęcia celu. Panel UI nie podaje jeszcze tych instancji; 2.7.3 pozostaje w trakcie, a edytor i zapis wejścia przebiegu czekają na 2.7.4.

Aktualizacja 2.7d: według zatwierdzonych 1A/2A rdzeń przewozi korpus przy jawnym czasie skierowanej trasy i zajmuje cel od wyjazdu do końca operacji. Wybiera automatycznie najwcześniejszy start po dojeździe; remis rozstrzyga rzeczywista droga. Wynik oddziela jazdę, oczekiwanie i pracę oraz zawiera zdarzenia lokalizacji korpusu. Brak wymaganego czasu powoduje odmowę. Zapis tras zachowuje czas, źródło i oznaczenie pomiar/założenie. Edytor czasu i instancji oraz inspekcja UI pozostają do 2.7.4. Zasoby ekip i pojazdów transportowych nie są jeszcze modelowane.

Aktualizacja 2.7e: UI szkicu 6 ma edytor ról, jawnych korpusów i ich początkowych kopii oraz czasu transportu ze źródłem i pochodzeniem. Zapis, usuwanie i wspólne Cofnij/Ponów zachowują referencje i chronią źródła 4/5. Podgląd pokazuje przewóz, rezerwację celu, przygotowanie bez zajęcia korpusu, końcowe lokalizacje i zdarzenia. Zapisana konfiguracja początkowa nie jest zmieniana przez wynik; po przeładowaniu trzeba ponownie wpisać odstęp przybycia. Instrukcja: `Instrukcja/Korpus_v6.md`. Punkt 2.7 odebrany dla szkicu 6; fizyczna równoległość pozostaje do 2.8.

Aktualizacja 2.8a: szkic 6 obsługuje opcjonalny zapis jawnych grup dopuszczonej równoległości, z walidacją referencji i ochroną starszych zapisów. Cały równoczesny zestaw musi mieścić się w jednej grupie; grupy nie łączą się automatycznie. Zatwierdzono współdzielenie korpusu na jednej kopii przy wyłącznych osobach i wyposażeniu. Integracja wykonania pozostaje do 2.8.2, a edytor do 2.8.3; harmonogram z nowymi regułami na razie jawnie odmawia wyniku.

Aktualizacja 2.8b: harmonogram wykonuje jawne grupy równolegle, zachowując jedną lokalizację korpusu i blokadę wspólnej kopii do końca ostatniej czynności. Osoby i wymagane egzemplarze wyposażenia pozostają wyłączne; przewóz czeka na wszystkie prace korpusu. Przygotowanie w innym miejscu może działać równolegle bez jego zajęcia. Gałęzie z jedną dopuszczoną kopią są obsługiwane; wiele kopii przy fizycznych gałęziach wymaga dalszej integracji tras w 2.8.2 i obecnie powoduje jawną odmowę. Edytor grup pozostaje do 2.8.3.

Aktualizacja 2.8c: zatwierdzone pierwszeństwo technologiczne 1A włącza automatyczny wybór wielu dopuszczonych kopii przy fizycznych gałęziach. Najwcześniejszy start i rzeczywista droga przychodząca mają pierwszeństwo; dalsze odległości porównywane są według kolejności gałęzi, bez sumowania. Przygotowania nie wyznaczają drogi korpusu. Plan nie zamraża przyszłego celu; przy przydziale ponownie uwzględnia się kalendarze, zasoby i rzeczywistą lokalizację. Brak wymaganej trasy/czasu pozostaje jawną odmową. 2.8.2 odebrane dla szkicu 6; następne 2.8.3 — edytor grup i zbiorczy odbiór. Schemat zapisu bez zmian.

Aktualizacja 2.8d: UI szkicu 6 ma edytor jawnych grup równoległości z wyborem operacji, walidacją, zapisem/usuwaniem i wspólnym Cofnij/Ponów. Inspekcja harmonogramu pokazuje cały równoczesny zestaw, jedną dopuszczającą grupę, przedział z pauzami oraz miejsca i zasoby. Zapis pustych grup wyklucza równoległość; usunięcie reguł przywraca starszy tryb. Dane i wynik odtwarzają się po odczycie, źródła 4/5 zachowane. 2.8 odebrane w zakresie osobnego szkicu 6; rzeczywiste scenariusze Eko pozostają w 2.9. Instrukcja: `Instrukcja/Korpus_v6.md`.

Aktualizacja 2.9b: odebrano trzy wyłącznie testowe konfiguracje pełnego Eko w szkicu 6 (drzwi razem, kolejno i wspólna osoba). Założenia są jawne; czasy standardowe, graf, BOM i dokładne źródło zachowane. Pliki w `outputs/scenarios/eko_2_9`, generator `tests/qa/generate_2_9.mjs`, opis `SCENARIUSZE_EKO_2_9.md`. W przykładzie rama jest częścią dostarczaną z magazynu na rolotok; test zaczyna po dostawie. Docelowo użytkownik wskazuje obiekt i konkretne dane własnego procesu. Nie wprowadzono testowej obsady/zgód jako domyślnych danych aplikacji ani nie odebrano rzeczywistej wydajności zakładu.

Aktualizacja 3.1a: harmonogram szkicu 6 oblicza się w osobnym Web Workerze, pokazuje liczbę zakończonych wykonań i pozwala anulować zadanie. Anulowanie, zmiana parametrów lub szkicu kończy worker; spóźniony wynik jest ignorowany. Ponowny start liczy nowe wejście, bez zmiany zapisu. Błędy pokazuje panel. Wyniki pozostają zgodne z rdzeniem synchronicznym. Aktywna symulacja 4/5 pozostaje do pakietu 3.1.2; nie oznaczono całego 3.1 jako zakończonego.

Aktualizacja 3.1b: aktywna symulacja projektów 4/5 również oblicza partię w tle z postępem i anulowaniem. Zmiana wejścia usuwa poprzedni wynik, a eksport wymaga pełnego aktualnego obliczenia. Start/pauza, prędkość i reset sterują odtwarzaniem gotowego wyniku. Można ponowić anulowane obliczenie. Zachowano pełne wyniki i zgodność zapisu; 3.1.2 odebrane, 3.1.3 pozostaje do zbiorczego odbioru.

Aktualizacja 3.1c: zakończono zbiorczy odbiór obliczeń w tle w projektach 4/5 i szkicu 6. Zmiana wejścia, zamknięcie panelu oraz zapis szkicu kończą stare zadanie. Obsłużono i sprawdzono błędne wejście, odmowę uruchomienia/ładowania workera i ponowienie. Wyniki, dane zapisane i źródła zachowane; animacja nie steruje obliczeniami. 3.1 wdrożone. Koszt kopiowania danych i renderowania maksymalnych wyników wymaga odrębnych pomiarów w 3.9; nie zmieniono reguł transportu ani połączono modeli.

Aktualizacja 3.2a: przygotowano propozycję punktów materiałowych i połączeń (`MODEL_TRANSPORTU_3_2.md`). Nie jest to nowa działająca funkcja. Reprezentacja magazynu jako początkowej lokalizacji korpusu wymaga decyzji przed implementacją. Procent postępu głównych ID planu oblicza `scripts/plan_progress.mjs`, bez podwójnego liczenia podpunktów.

Aktualizacja 3.2b: rdzeń szkicu 6 przyjmuje opcjonalne punkty materiałowe i połączenia, z kierunkami wejścia/wyjścia, referencjami do konkretnych kopii i punktami zewnętrznymi (zatwierdzone 1A). Połączenia stanowisk korzystają z jednej istniejącej długości/czasu, a magazynowe deklaracje sieci nie uruchamiają dostawy w harmonogramie. Walidacja i zapis/odczyt odebrane; formularz użytkownika pozostaje do 3.2.3. Postęp: 31,3% całego planu, 32,3% pierwszego wydania.

Aktualizacja 3.2c: w warsztacie Stanowiska v5, w osobnym szkicu 6, działa edytor punktów i połączeń materiałowych. Wejścia/wyjścia konkretnych kopii i punkty zewnętrzne, skierowane trasy, długości mm/m ze źródłem i potwierdzeniem, wspólne Cofnij/Ponów, usuwanie i zapis/odczyt. Połączenia stanowisk korzystają z istniejącej trasy; zmiana jej długości jest od razu widoczna. Połączenie magazynowe pozostaje definicją sieci w zakresie 1A. 3.2 odebrane; postęp 32,8% całego planu / 33,8% pierwszego wydania.

Aktualizacja 3.3a: rdzeń szkicu 6 obsługuje jawne wyliczanie czasu trasy z prędkości i czasów załadunku/rozładunku. Każdy parametr ma pochodzenie i źródło. Wynik jest przeliczany z aktualnej długości, oznaczony jako założony i nie jest zapisywany jako drugi czas trasy. Dotychczasowy tryb wpisanego czasu zachowany; tryby nie mogą współistnieć. Harmonogram uwzględnia sumę i zwraca składowe. Formularze parametrów i inspekcja UI pozostają do 3.3.2; magazyn nie staje się lokalizacją korpusu. Postęp 32,8% całego planu / 33,8% pierwszego wydania.

Aktualizacja 3.3b (2026-10-09): formularze wpisanego i wyliczanego czasu tras stanowisk i zewnętrznych, źródła/pochodzenie parametrów, jednostki mm/s, m/s, m/min i s/min oraz podgląd sumy i składowych. Wyliczenie pozostaje założeniem. Odmowa błędów, historia i odczyt odebrane na gałęziach i podmontażu/montażu. 3.3 wdrożone dla szkicu 6; zasoby transportowe i dostawy magazynowe pozostają poza przebiegiem. Postęp 34,3% / 35,4%.

Aktualizacja 3.4d (2026-10-09): szkic 6 ma opcjonalny walidowany kontrakt transportu międzyoperacyjnego montażu: wspólne ID osób, konkretne wózki/przenośniki, jawne kalendarze, lokalizacje/dojazdy wózków i wybierane w danych reguły po rozładunku. To etap zapisu/parsera; formularz i wykonanie reguł pozostają do 3.4.3/3.4.4. Szkic z tym kontraktem jawnie odmawia harmonogramu do integracji, a szkice bez niego zachowują wyniki. Praca magazynierów nie jest liczona; uzupełnianie materiału będzie oceniane przez zapas/zużycie/ilość/częstotliwość w 3.5/3.6. Postęp 34,3% / 35,4%.

Aktualizacja 3.4f (2026-10-09): harmonogram szkicu 6 wykonuje transport korpusu przy jawnych wymaganiach osób montażowych i urządzeń (przenośniki, do jednego wózka w zestawie). Osoby mają wspólne rezerwacje z montażem; wybrany wariant jest publikowany atomowo, przyjazd aktualizuje położenie wózka. Wynik/UI pokazuje osoby i urządzenia. Dojazdy i powroty wózków oraz transport podzespołów pozostają do integracji; brak dojazdu i nieobsłużony powrót powodują odmowę. 162/162 testy, build i Edge poprawne. Cały 3.4.3 w trakcie. Postęp 34,3% / 35,4%.


Aktualizacja 3.4g (2026-10-09): harmonogram szkicu 6 wykonuje jawne dojazdy i zadeklarowane powroty wózków z osobną obsadą, wspólną z montażem. UI pokazuje osobne ruchy i końcowe położenie wózka. Brak trasy/obsady daje odmowę. 166/166 testów, build i Edge (worker, inspekcja, odczyt) PASS. Transport podzespołów i wiele wózków w zestawie pozostają do integracji; formularz do 3.4.4. Czas pracy magazynierów nie jest liczony. Postęp 34,3% / 35,4%.


Aktualizacja 3.4h (2026-10-09): harmonogram wykonuje atomowy przewóz zadeklarowanym zestawem kilku wózków znajdujących się przy miejscu odbioru. Uwzględnia wspólne kalendarze, osobne położenia i osobne powroty; niewykonalny zestaw nie rezerwuje części urządzeń. 169/169 testów, build i Edge (worker, inspekcja, odczyt) PASS. Dojazdy wielu wózków i fizyczny transport podzespołów pozostają do integracji; edytor do 3.4.4. Postęp 34,3% / 35,4%.


Aktualizacja 3.4i (2026-10-09): szkic 6 ma formularz wymagań transportu istniejących tras, źródeł i alternatywnych zestawów osób montażowych/zadeklarowanych urządzeń. Brak osoby lub urządzenia wymaga jawnej decyzji. Dodawanie/usuwanie zestawów, wspólne Cofnij/Ponów, odrzucenie zmian i zapis/odczyt odebrane na procesie sekwencyjnym i gałęziach. Można utworzyć nowy kontrakt z transportem bez urządzenia. Deklaracje urządzeń i pustych tras są zachowane, ich formularze pozostają do następnego zakresu. 169/169 testów, build i Edge poprawne. Całe 3.4.4 w trakcie; postęp 34,3% / 35,4%.
