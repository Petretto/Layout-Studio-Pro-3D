# Layout Studio Pro 3D v0.4.0 — funkcje programu

Aktualizacja instrukcji 7.8.1 (2026-10-18): `Instrukcja/Podrecznik_Uzytkownika.md` jest aktualnym edytowalnym źródłem podręcznika po Etapach 1–4, z pochodnymi HTML/PDF (21 stron, 21 obrazów). Nowy rozdział opisuje pełną ścieżkę szkicu 6, zapis, harmonogram, bufory, materiał, kompetencje, bilans, warianty, koszty i propozycje zmian. Zrzuty opisano jako syntetyczne. Historyczny Word v0.2 nie jest nową instrukcją. Generacja i wizualny odbiór PDF PASS; raport `WERYFIKACJA_INSTRUKCJI_7_8_1.md`. Finalna aktualizacja po dalszych etapach pozostaje w 7.8.2.

Aktualizacja 4.7 / odbiór Etapu 4 (2026-10-16): w szkicu 6 wdrożono moduł generowania i sprawdzania w symulacji propozycji usprawnień (dodanie pracownika z rejestru, dopuszczenie członka zespołu do operacji, zmiana jawnego wariantu obsady, dopuszczenie/przeniesienie na istniejącą kopię stanowiska, reorganizacja przydziału RPW/LCR, odblokowanie operatora w buforze). Wszystkie propozycje bazują wyłącznie na jawnie zadeklarowanych zasobach (bez zmyślania obiektów, czasów ani stawek). Sprawdzane są w symulacji przy identycznych warunkach eksperymentu. Zawsze towarzyszy im stała metodologiczna braku gwarancji optimum (NON_OPTIMUM_DISCLAIMER) oraz notatka rozróżniająca statyczny szacunek zdolności od wyniku dynamicznego. Użytkownik może zapisać propozycję do biblioteki wariantów 4.5 lub zastosować do aktywnego szkicu 6 z obsługą Cofnij/Ponów. Raport Markdown (.md) zawiera wersję danych (schemat v6, źródło v4/v5), warunki, założenia kosztowe i dowody. Odbiór Etapu 4: 7/7 (100.0%). 20/20 testy celowane, build i Edge UI PASS. Raport: `WERYFIKACJA_PROPOZYCJI_ZMIAN_4_7.md`.

Aktualizacja 4.6 (2026-10-16): warianty szkicu 6 zawierają tabelę syntezy wskaźników 4.6 (wydajność stat. vs dyn., czasy przejścia lead time i in-process, wskaźnik przepływu, WIP aktywny i w systemie wg Little'a, obsada i obciążenie zasobów, powierzchnia obiektów/obrysu/hali oraz koszty operacyjne i powierzchniowe przy jawnych stawkach, walucie, podstawie i źródle/założeniach). Raport Markdown (.md) ze wspólnymi warunkami eksperymentu. 18/18 testy celowane, pełna regresja 305/305 PASS, build i Edge UI PASS. Raport: `WERYFIKACJA_ZESTAWIENIA_WARIANTOW_4_6.md`.

Aktualizacja 4.5 (2026-10-16): biblioteka zapisanych wariantów szkicu 6 (wariant bazowy, dodatkowy pracownik, dodatkowe stanowisko, zmieniony layout) oraz ich eksperymentalne porównanie przy wspólnych warunkach (partia, odstęp przybycia, tryb transportu JIT/configured) z kontrolą zmienionego czynnika, ochroną projektów 4/5 i izolacją zapisu. 16/16 testy celowane, build i Edge UI PASS. Raport: `WERYFIKACJA_POROWNANIA_WARIANTOW_4_5.md`.

Aktualizacja 4.4 (2026-10-16): wynik harmonogramu szkicu 6 zawiera panel „Co ogranicza przebieg — dowody z harmonogramu”: praca, obsada, transport, blokady i materiał, a także kalendarze i pozostałe ograniczenia. Pokazuje wykonania, czasy obserwacji, źródło czasu operacji i przejście do Gantta. Oczekiwania mieszane nie są dzielone arbitralnie; praca kopii jest liczona unią przedziałów. JIT jest oznaczony jako założenie dostępności. Panel wyjaśnia zaobserwowane ograniczenia, ale nie wyznacza jednej przyczyny ani zysku usprawnienia bez porównania przebiegów. 22/22 testy celowane, build i Edge UI PASS. Raport: `WERYFIKACJA_OGRANICZEN_PRZEPUSTOWOSCI_4_4.md`. Następny punkt 4.5.

Aktualizacja 4.3c / odbiór 4.3 (2026-10-16): szkic 6 ma panel „Bilans z wyposażeniem i kompetencjami”. Tworzy propozycję przydziałów do istniejących, jawnie dopuszczonych kopii z priorytetami RPW/LCR, wybranymi czasami obsady, wymaganym wyposażeniem i uzupełniającymi się kompetencjami. Użytkownik podaje limit sumy czasów na kopię [s/szt.]. Podgląd nie zmienia danych; po przeglądzie zatwierdzenie zapisuje przypisania i zawęża dopuszczenia do pokazanych kopii, z możliwością Cofnij/Ponów. Zachowane są trwałe ID, puste stanowiska, wyposażenie, geometria i trasy. Bilans statyczny nie potwierdza dynamicznej przepustowości; wynik trzeba sprawdzić harmonogramem z rzeczywistymi ograniczeniami. Brak przydziału dla statycznych ograniczeń i limit poszukiwania są raportowane oddzielnie. Brak generowania nowych stanowisk; aktywny bilans starszych projektów 4/5 pozostaje odrębny. Pełna regresja 296/296, build i Edge UI PASS; raport `MODEL_KOMPETENCJI_I_PRZYDZIALOW_4_3.md`. Punkt 4.3 odebrany w tym zakresie, następny 4.4.

Aktualizacja 4.3b (2026-10-16): w warsztacie „Stanowiska v5”, w osobnym szkicu 6 dostępny jest formularz „Kompetencje obsady”: słownik, kompetencje osób, wymagania operacji i ocena pokrycia wybranej obsady. Obsługuje walidację, Odrzuć, usuwanie, wspólne Cofnij/Ponów i zapis/reload. Zmiana unieważnia harmonogram. Kompetencje mogą się uzupełniać w rzeczywistej obsadzie. Formularz nie rozszerza jeszcze automatycznego bilansu projektów 4/5; pozostaje 4.3c. Dowody: `MODEL_KOMPETENCJI_I_PRZYDZIALOW_4_3.md`.

Aktualizacja 4.3a (2026-10-16): rdzeń szkicu 6 obsługuje opcjonalny słownik kompetencji, jawne kompetencje osób i wymagania operacji (API/zapis). Rzeczywista obsada musi łącznie pokryć wymagania; osoby mogą się uzupełniać. Kontrola działa także z buforami, bezpośrednim przekazaniem i JIT. Niewykonalna liczebność daje odmowę, limit poszukiwania ma osobny komunikat. Formularz i integracja z automatycznym bilansem pozostają do 4.3b/4.3c; całe 4.3 w trakcie. Kontrakt i dowody: `MODEL_KOMPETENCJI_I_PRZYDZIALOW_4_3.md`.

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

Blokowanie przydziałów przed automatycznym balansowaniem (punkt 4.2):
- Każda operacja może mieć zablokowany przydział do określonego stanowiska (`lockedWorkstation: true`, `assignedWorkstationId: 'WS-k'`).
- Na wykresie Yamazumi operacje zablokowane są oznaczone ikoną kłódki `🔒` bezpośrednio na klocku operacji oraz na liście rozwijanej panelu przydziałów.
- Szybki przycisk w toolbarze (`Zablokuj na WS-X` / `Odblokuj przydział`) oraz checkbox z selektorem stanowiska w `OperationInspector` pozwalają wygodnie blokować i odblokowywać operacje w locie.
- Heurystyki RPW i LCR utrzymują operacje zablokowane na ich docelowych stanowiskach, a pozostałe operacje swobodne dopakowują optymalnie wokół nich z zachowaniem czasu taktu i relacji pierwszeństwa.
- Weryfikacja spójności: zablokowanie poprzednika na późniejszym stanowisku niż następnik lub powstanie luki w numeracji stanowisk jest natychmiast wykrywane i blokowane jawnym błędem.

Manual: numery stacji od 1 bez luk; poprzednik nie może być przypisany do późniejszego numeru stacji. Numeracja stacji jest porządkiem technologicznym, a nie pozycją w hali. „Każda operacja osobno” tworzy przydział topologiczny i zachowuje widoczność gałęzi.

Yamazumi:
- segmenty operacji, przeciąganie między stacjami lub do nowej stacji, alternatywa przez listy;
- automatyczna kompakcja pustych stacji, zachowanie BOM, blokada złych zależności;
- inspektor operacji, regulacja skali, linia celu, obciążenie i przekroczenia;
- wysokość słupka = odstęp zdolności; segmenty proporcjonalnie skalowane, etykiety pokazują bazowe czasy;
- wyróżnienie operacji zablokowanych (🔒) z ochroną przed automatycznym przestawieniem przez RPW/LCR.

Zasoby każdej grupy:
- operatorzy na jedną kopię: 1–20;
- identyczne równoległe kopie: 1–20, maksymalnie 1000 fizycznych stanowisk w projekcie;
- opcjonalny zmierzony/założony czas zespołu [s/szt.];
- obsada całkowita = suma operatorzy × kopie.

Sam dodatkowy pracownik nie dzieli czasu. Bez jawnego czasu zespołu obowiązuje suma czasów operacji. Odstęp zdolności = cykl zespołu / liczba kopii; nie jest czasem przejścia pojedynczej sztuki.

Ustawienia są związane z dokładnym zestawem ID operacji. Po zmianie grupowania należy je sprawdzić i ustawić dla nowych grup. Samo przenumerowanie nie przypisuje cudzych zasobów.

Wyniki: bazowa pracochłonność, bazowe minimum teoretyczne, fizyczne kopie i obsada, odstęp wąskiego gardła, sprawność, szacowana zdolność dobowa i lista przekroczeń. Sprawność = suma cykli zespołów / [suma kopii × max(cel, maksymalny odstęp zdolności)] × 100%. To wykorzystanie stanowisk, nie wydajność pracowników. Zdolność dobowa jest oszacowaniem pojemności, nie wynikiem symulacji partii. Porównanie RPW/LCR dotyczy bazowego przydziału bez optymalizacji obsady.

## Layout, hala i CAD 2D

- 5.13: automatyczna pierwsza propozycja layoutu oparta na grafie operacji i wstępnym bilansie po wprowadzeniu lub imporcie procesu, bez wymogu klikania osobnego przycisku generowania (także w docelowym modelu stanowisk `Warsztatu stanowisk v5` przez `deriveStationProject`), prezentacja przepływu materiałów z uwzględnieniem numerów części z BOM w etykietach FIFO (brak BOM nie blokuje szkicu rozmieszczenia), oznaczanie domyślnych wymiarów i wyposażenia jako założeń wizualnych (`isVisualAssumption: true`, odznaka `Założenie wizualne`, `VISUAL_ASSUMPTION_DISCLAIMER`) bez przypisywania zdolności technologicznej, nota o braku deklaracji dopasowania do rzeczywistej przestrzeni przy braku potwierdzonych wymiarów hali (`FACILITY_UNCONFIRMED_NOTE`) oraz bezwzględna ochrona ręcznych pozycji (`layoutMode: 'manual'`) przed automatycznym nadpisaniem. Odebrane na procesach niezależnych od Eko (silniki EV `DEFAULT_MOTOR_PROJECT` i baterie EV `DEFAULT_BATTERY_PROJECT`).
- 5.10: wspólny stan zaznaczenia 2D–3D (`selectedLayoutObjectIds`), obwiednia `THREE.BoxHelper` w 3D (błękitna dla aktywnych, żółta dla zablokowanych), ochrona obiektów zablokowanych (`locked`) w 3D, spójne skróty klawiszowe (`LAYOUT_SHORTCUTS`, `Ctrl+Z`, `Ctrl+Y`, `Ctrl+S`, `F`, `T`, `G`, `M`, `L`, `S`, `Arrow` precyzyjny ruch z krokiem 5× z `Shift`), ściągawka skrótów `<kbd>` pod rzutem i widokiem 3D oraz podpowiedzi `title`.
- 5.7: podkład hali z kalibracją skali (`FacilityUnderlay` w `facility.underlay`: wczytywanie rysunku architektonicznego PNG/JPG/SVG/WebP jako `dataUrl` do 4 MB, wyświetlanie na warstwie `Warstwa: Podkład hali` pod siatką wyposażenia z etykietą wymiarów w mm i skali `mm/px`, ręczna edycja skali `mmPerPixel`, przesunięcia `xMm`/`yMm` i przezroczystości `opacity`, dopasowanie wymiarów hali do podkładu oraz interaktywna dwupunktowa kalibracja skali na rzucie `calibrateUnderlayScale` poprzez wskazanie odcinka `A–B` i wpisanie jego rzeczywistej długości w milimetrach).
- 5.6: wymiarowanie obiektów i przeszkód (`szerokość × głębokość mm` na rzucie CAD 2D), automatyczny pomiar odległości między dwoma zaznaczonymi obiektami (`measureObjectsDistance`: dokładny prześwit obróconych obrysów `edgeGapMm`, odległość `środek–środek`, `ΔX`, `ΔY` oraz linia wymiarowa `.cad-dimension-overlay`), interaktywny pomiar odległości punkt–punkt na rzucie (`Mierz odległość`, `measurePointsDistance`, `.cad-ruler-overlay`), przełączanie widoczności 7 warstw (`Podkład hali`, `Stanowiska`, `Bufory i logistyka`, `Strefy operatorów`, `Relacje technologiczne`, `Przeszkody`, `Wymiary i pomiary`) oraz trwałe blokowanie obiektów (`LayoutObject.locked`, przyciski **Zablokuj zaznaczone / Odblokuj zaznaczone**, checkbox **Zablokuj pozycję i wymiary obiektu**) chroniące przed przesunięciem, zmianą wymiarów, wyrównaniem i usunięciem.
- 5.5: przyciąganie podczas przesuwania obiektów w CAD 2D do siatki (`facility.gridSizeMm`), do krawędzi obiektów i przeszkód (wyrównanie oraz dosunięcie obrysów z przerywaną prowadnicą `#38bdf8`) oraz do punktów połączeń (środki boków i punkt centralny stołu/obiektu ze znacznikami portów `.cad-connection-point` i prowadnicą `#facc15`). Niezależne przełączniki każdego trybu, przycisk **Wyłącz przyciąganie / Włącz przyciąganie** oraz tymczasowe wyłączenie klawiszem `Alt` (ruch swobodny co 1 mm).
- 5.4: wspólne przenoszenie i wyrównywanie zespołu stanowiska (stół ESD, przypisany regał FIFO i strefa obsługi operatora tej samej kopii `-COPY-N`) z zachowaniem wzajemnych odstępów, `workstationId` oraz fioletowych linii relacji technologicznych (`layoutRoutes`). Przełącznik **Przenoś stanowisko z FIFO i strefą** (domyślnie aktywny) oraz przycisk **Zaznacz zespół stanowiska**; odznaczenie opcji pozwala korygować pojedynczy element względem stanowiska.
- 5.3: wielokrotne zaznaczenie wyposażenia (Shift/Ctrl, pola wyboru drzewa), wizualne grupy zapisane przy obiektach, wspólne przesuwanie i wyrównywanie obróconych obrysów z zachowaniem odstępów grup. Kopiowanie z jawnym przesunięciem i nowymi ID/grupami bez przypisania do stanowiska technologicznego; nie zwiększa zdolności linii. Przeszkody pozostają w osobnym edytorze.
- Wariant B (5.2): rzut na pełnej szerokości, drzewo po lewej i właściwości/parametry hali po prawej otwierane nad rzutem; jeden panel naraz, Escape i wewnętrzne przewijanie. Dolne listy oraz wyniki i oś czasu aktywnego projektu 4 są zwijane. Symulacja uruchamia się dopiero po otwarciu wyników, zachowuje przebieg przy zwijaniu i korzysta z istniejących założeń modelu 4. Szkic 6 pozostaje osobnym kontekstem.
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


Aktualizacja 3.4j (2026-10-12): edytor transportu montażowego szkicu 6 obejmuje wózki/przenośniki z istniejących egzemplarzy wyposażenia, konkretne kopie, jawne kalendarze urządzeń, początkowe miejsca i polityki wózków oraz puste trasy z długością, czasem wpisanym/wyliczonym i osobną obsadą ze źródłem. Odmowy błędów chronią zapis; używane urządzenia wymagają wcześniejszego usunięcia referencji. Wspólne Cofnij/Ponów, odrzucenie, usuwanie, odczyt i worker odebrane na procesie sekwencyjnym oraz gałęziach. 169/169 testów, build i Edge poprawne. 3.4.4 wdrożone; całe 3.4 w trakcie przez brak fizycznego transportu podzespołów i dojazdów wielu wózków. Czas pracy magazynierów nie jest liczony. Postęp 34,3% / 35,4%.


Aktualizacja 3.4k (2026-10-12): harmonogram wykonuje dojazdy kilku wózków zawsze kolejno, według kolejności urządzeń zestawu zatwierdzonej przez użytkownika. Także rozłączne osoby nie powodują równoległych dojazdów. Przewóz czeka na przyjazd wszystkich wózków i wspólne okno. UI pokazuje kolejność i pozwala ją zmienić; zapis, Cofnij/Ponów i odczyt odebrane. 173/173 testy, build i Edge poprawne. Całe 3.4 w trakcie przez brak fizycznego transportu podzespołów. Postęp 34,3% / 35,4%.

### Symulacja procesu bez transportu — 3.4l (2026-10-12)
W zakładce Stanowiska v5, panel Harmonogram zespołu — szkic 6, dostępny jest domyślnie wyłączony przełącznik „Symulacja bez transportu — wszystko dostępne just in time”. Pozwala liczyć sam proces bez konfiguracji transportów i korpusów, zachowując zależności, osoby, stanowiska, wyposażenie operacji i kalendarze. Wynik oznacza założoną dostępność materiałów; nie oblicza ruchów ani fizycznych lokalizacji korpusów. Wyłączenie przywraca transport według zapisanych danych. Opcja nie zmienia konfiguracji projektu i po ponownym otwarciu jest wyłączona.


### Fizyczne partie podzespołów — 3.4m2 (2026-10-12)
Harmonogram szkicu 6 wykonuje jawny kontrakt partii: wytworzenie po zakończeniu przygotowania, przewóz do jedynej dopuszczonej kopii odbiorcy i pobranie przy jego faktycznym starcie. Transport dzieli osoby i urządzenia z montażem, korzysta z dojazdów/powrotów i kalendarzy. Odbiorca czeka na wszystkie wymagane partie. Inspekcja pokazuje zdarzenia i ilości oraz odróżnia przewóz podzespołu od korpusu. Kontrakt na razie dostępny przez API/zapis szkicu; formularz jest w planowanym 3.4m3. Wiele kopii odbiorcy oraz pojemność buforów pozostają poza tym zakresem. JIT pomija fizyczny przepływ partii.


### Wybór kopii odbiorcy podzespołów — 3.4m2b (2026-10-12)
Dla jawnych partii harmonogram porównuje dopuszczone kopie odbiorcy razem z dostawami, operacjami i wspólnymi zasobami. Każde wykonanie odbiorcze może mieć inne miejsce odbioru. Pierwszeństwo ma start operacji, potem długość tras; przegrane warianty nie zostawiają rezerwacji. Limit podglądu wynosi 64 kombinacje przypisań — większy zakres wymaga zawężenia dopuszczeń albo mniejszej partii sztuk. Opcja JIT działa bez tego porównania. Pełny formularz partii jest nadal w przygotowaniu.


### Edytor partii podzespołów — 3.4m3 (2026-10-12)
W Stanowiska v5, w szkicu 6, panel „Partie podzespołów — przygotowanie i pobranie” pozwala dodawać i edytować ID partii, definicję podzespołu, ilość wytworzoną/pobieraną, wspólną jednostkę, źródło oraz numery sztuk i operacje producenta/odbiorcy. Nowe pola są puste. Zapis waliduje dane i współpracuje z Cofnij/Ponów; można odrzucić lokalne zmiany lub jawnie usunąć konfigurację. Zapis zmiany unieważnia dotychczasowy wynik harmonogramu. Transport i JIT działają według wcześniej opisanych reguł; bufory/zapasy/dostawy cykliczne należą do dalszych etapów.


### Bufory i zaopatrzenie — stan 3.5a1, 2026-10-14
Kontrakty pojemności buforów i dostaw są odczytywane w szkicu 6, lecz jeszcze nie sterują symulacją. Harmonogram wyjaśnia odmowę przy zapisanych ograniczeniach buforów lub zaopatrzeniu, zamiast je pomijać. Jawny JIT może założyć dostępność materiałów; nie znosi nieobsługiwanych ograniczeń buforów. Puste kontrakty i bufory bez limitów zachowują dawne zachowanie. Integracja zapasu/zużycia i blokowania pozostaje w 3.5b.


### Zużycie i dostawy materiałów — 3.5b1 (2026-10-14)
Harmonogram szkicu 6 uwzględnia kompletny jawny kontrakt zaopatrzenia: zapas początkowy, ilości i terminy dostaw oraz zużycie przypisane do operacji. Niedobór przesuwa faktyczny start, a dostawa w tym samym czasie poprzedza pobranie. Operacja pobiera wszystkie swoje materiały atomowo i chroni wcześniej przydzielone przyszłe pobrania. Zapas jest wspólny dla kopii zadeklarowanego stanowiska. Inspekcja pokazuje bilans i zdarzenia; nie rezerwuje się magazynierów. Stare niekompletne kontrakty nadal można odczytać, lecz trzeba uzupełnić zużycie i pierwszy termin przed symulacją. JIT omija zapas, zakładając dostępność. Pełny formularz pozostaje do 3.5c, a ograniczone bufory do 3.5b2.


### Bufory w procesie JIT — 3.5b2b (2026-10-14)
Jawnie włączony JIT może obliczać ograniczone bufory dla jednego ciągu operacji i jednej kopii każdej operacji. Koniec pracy jest oddzielony od zwolnienia stanowiska i wyposażenia; pełne wyjście zatrzymuje albo zwalnia operatora według zapisanej polityki. Inspekcja pokazuje blokady i przekazania, bez fizycznego transportu. Polityka zatrzymania operatora wymaga w tym pierwszym zakresie pełnej obecności przez wszystkie operacje. Gałęzie, wybór kopii i ograniczone wyjście końcowe wymagają dalszej obsługi; fizyczny tryb z ograniczonymi buforami nadal wyjaśnia odmowę. Formularz buforów pozostaje w 3.5c.


### Bufory z fizycznym transportem — 3.5b2c2 (2026-10-15)
Harmonogram szkicu 6 obsługuje dodatnie/nieograniczone bufory dla pojedynczego ciągu na jawnych korpusach i jednej kopii każdej operacji. Miejsce w wejściu jest rezerwowane przed wyjazdem; przyjazd może poprzedzać dostępność stanowiska/osoby/materiału, a wejście zwalnia dopiero start operacji. Pełne wyjście blokuje stanowisko i wyposażenie oraz zatrzymuje lub zwalnia osobę według polityki. Działają sekwencyjne dojazdy zestawów, wspólne zasoby, kalendarze, powroty i przenośniki oraz jawne pobrania materiałów przy starcie. Inspekcja rozróżnia przebieg fizyczny i JIT. Zakleszczenie nie daje częściowego wyniku. Konfiguracja wciąż pochodzi z zapisu/API; formularz jest w 3.5c. Pojemność 0, kolejne operacje tej samej kopii, gałęzie/wiele kopii, partie podzespołów z buforami i ograniczone wyjście końcowe wymagają dalszej integracji i jawnie odmawiają. Przy zatrzymaniu osób pozostaje wymaganie pełnej obecności wszystkich operacji w tym zakresie. JIT jest nadal opcją do świadomego włączenia, domyślnie OFF.


### Bezpośrednie przekazanie przy pojemności 0 — 3.5b2c3 (2026-10-15)
W fizycznym przebiegu pojedynczego ciągu korpusu wejście 0 oznacza start operacji dokładnie przy przyjeździe, bez składowania. Przed wyjazdem harmonogram rezerwuje przyszłą gotowość odbiorcy, jego osoby, wyposażenie i materiały. Kalendarz lub późna dostawa przesuwają wyjazd; pewne zwolnienie kopii pozwala przyjechać na jej granicy, bez dodatkowej przerwy. Wyjście 0 zatrzymuje korpus na stanowisku do wyjazdu z wybraną polityką osoby. Przydziały przewozu i montażu pozostają wspólne, zestawy nadal dojeżdżają kolejno. Działa też początkowe wejście 0. JIT pozostaje opcją OFF domyślnie. Nadal wymagają dalszej obsługi lokalne przekazania tej samej kopii, gałęzie/wiele kopii, podzespoły z buforami i ograniczony odbiór końcowy; przy zatrzymywaniu operatorów pozostaje wymaganie pełnej obecności. Formularze buforów są w 3.5c.


### Kontynuacja na tej samej kopii i późniejsza obecność — 3.5b2c4 (2026-10-15)
W liniowym harmonogramie z ograniczonymi buforami kolejne operacje tej samej kopii pozostawiają korpus na stanowisku. Stanowisko i wyposażenie nie mogą być przejęte do startu kolejnej lokalnej operacji; osoba działa według jawnego profilu. Lokalne oczekiwanie ma osobny czas i inspekcję, bez fikcyjnej trasy ani pobytu w buforach. Bufor wyjściowy działa po ostatniej lokalnej operacji przed wyjazdem do innej kopii. Proces całkowicie lokalny nie potrzebuje zestawu transportowego. Polityka zatrzymania operatora dopuszcza późniejsze rozpoczęcie jego obecności, pod warunkiem obecności do końca operacji mogącej zablokować wyjście. Przyszłe rezerwacje są chronione przed nieznanym wydłużeniem blokady. Formularz buforów pozostaje kolejnym 3.5c1; szersze gałęzie/kopie i przepływ podzespołów z buforami nadal nie są obsługiwane.


### Formularz buforów stanowisk — 3.5c1 (2026-10-15)
W module Stanowiska v5 w Szkicu 6 dodano panel „Bufory stanowisk — pojemności i reguły blokowania” (`DomainBuffersEditor.tsx`).
Umożliwia konfigurację buforów wejściowych i wyjściowych stanowisk:
- wybór stanowiska z listy istniejących w projekcie;
- wybór zakresu kopii: wszystkie kopie osobno (`copy=null`) lub konkretna kopia `1..parallelStations`;
- deklarację pojemności wejściowej i wyjściowej: opcja „Bez limitu (nieskończona)” lub wartość liczbowa $\ge 0$ (w tym 0 na wejściu dla bezpośredniego przekazania oraz 0 na wyjściu dla zatrzymania korpusu na stanowisku do wyjazdu);
- wybór reguły blokowania wyjścia z polityką operatora: `bbas` (zatrzymanie operatora) lub `bbas-worker-released` (zwolnienie operatora po zakończeniu przetwarzania);
- walidację spójności: wykrywanie duplikatów konfiguracji dla tej samej stacji i kopii, nakładających się reguł wszystkich i konkretnych kopii, ujemnych pojemności oraz nieznanych stacji;
- integrację ze wspólną historią Cofnij/Ponów, odrzucenie niezapisanych zmian pól oraz usunięcie całej konfiguracji buforów;
- natychmiastowe unieważnienie starego wyniku symulacji w panelu harmonogramu po zapisaniu zmian.
Kolejny krok to formularz zaopatrzenia materiałowego montażu w 3.5c2.

### Formularz zaopatrzenia materiałowego montażu — 3.5c2 (2026-10-15)
W module Stanowiska v5 w Szkicu 6 dodano panel „Zaopatrzenie materiałowe montażu — zapasy i dostawy” (`DomainSupplyEditor.tsx`).
Umożliwia pełną konfigurację dostępności materiałów i ich zużycia na linii montażowej:
- definiowanie pozycji materiałowych (`MaterialSupplyItem`): unikalne ID, identyfikator komponentu/materiału (`componentId`), powiązanie ze stanowiskiem docelowym linii, zapas początkowy ($\ge 0$), jednostka miary oraz źródło danych;
- harmonogramy dostaw:
  - cykliczne (`periodic`): wielkość partii dostawy (> 0), interwał dostaw (> 0) oraz opcjonalny jawny termin pierwszej dostawy ($\ge 0$);
  - jawne terminy (`explicit-deliveries`): dynamiczna lista dostaw z czasem dostawy [s] ($\ge 0$) oraz ilością (> 0);
- przypisywanie zużycia materiałów do operacji (`MaterialConsumptionV6`): wybór operacji montażowej, powiązanie z pozycją zaopatrzenia, ilość zużycia na wykonanie (> 0) oraz źródło danych zużycia;
- walidację spójności danych: odrzucanie ujemnych zapasów/ilości, duplikatów identyfikatorów pozycji, powtórzonych przypisań zużycia tej samej operacji i zaopatrzenia, nieznanych stanowisk lub operacji oraz pustych pól;
- integrację ze wspólną historią operacji Cofnij/Ponów, odrzucenie niezapisanych zmian pól oraz usunięcie całej konfiguracji zaopatrzenia;
- natychmiastowe unieważnienie starego wyniku symulacji w panelu harmonogramu po zapisaniu zmian zaopatrzenia (remount panelu przez unikalny klucz `draft.raw`).

### Prezentacja stanów procesu, czasów trwania, rozbicia oczekiwań i wykorzystania zasobów — 3.6 (2026-10-15)
W panelu harmonogramu zespołu w module Stanowiska v5 (`DomainWorkerSchedulePanel.tsx`), na bazie modułu analitycznego `scheduleStateMetrics.ts`, wdrożono pełną prezentację stanów i czasów trwania procesu:
- **Kafelki sumaryczne procesu**:
  - Czas realizacji partii (*makespan* [s]) — czas zakończenia ostatniej operacji na ostatniej sztuce;
  - Czas pracy operacji [s] — suma czasów trwania operacji w partii;
  - Czas oczekiwania [s] — całkowity czas opóźnień przed startem operacji;
  - Blokady i oczekiwanie lokalne [s] — suma czasów blokad wyjścia po zakończeniu obróbki (polityka `bbas`) oraz oczekiwania korpusu na kontynuację na tej samej kopii;
  - Transport montażu [s] — łączny czas ruchów transportowych, liczba ruchów oraz suma czasów przewozów z ładunkiem (*transfer*).
- **Ścisłe partycjonowane rozbicie przyczyn oczekiwania**:
  - Klasyfikacja do 6 jednoznacznych kategorii: pracownicy (`workers`), materiały i podzespoły (`material`), transport montażu (`transport`), bufory wejściowe/wyjściowe (`buffer`), stanowiska i wyposażenie (`station`), kalendarz (`calendar`);
  - Algorytm partycjonowania gwarantuje, że suma czasów cząstkowych jest dokładnie równa całkowitemu czasowi oczekiwania partii, eliminując sztuczne zawyżanie bilansu przy jednoczesnym wystąpieniu wielu przyczyn;
  - Prezentacja czasu współwystępowania danej przyczyny (*presence*);
  - Struktura transportu montażu z podziałem na przewozy ładunku, dojazdy bez ładunku i powroty wózków.
- **Wzbogacona tabela wykonań**:
  - Kolumny `Czas pracy [s]` (z prezentacją czasu netto i pauz kalendarzowych) oraz `Blokada [s]` (jawne rozróżnienie blokady wyjścia i lokalnego oczekiwania).
- **Inspekcje stanów stanowisk i pracowników**:
  - Stanowiska: czas przetwarzania, blokady wyjścia, oczekiwania lokalnego, łącznego zajęcia, bezczynności oraz wskaźniki zajęcia (% obecności korpusu) i przetwarzania (% faktycznej obróbki);
  - Pracownicy: czas montażu, czas transportu, czas zatrzymania w blokadzie `bbas`, pauzy, łączny czas aktywny, bezczynność oraz wskaźnik aktywności (%).

### Wykrywanie zatrzymań i zakleszczeń procesu — 3.7 (2026-10-15)
W silnikach symulacji (`bufferedProcessSchedule.ts`, `workerSchedule.ts`) oraz w interfejsie użytkownika (`DomainWorkerSchedulePanel.tsx`) zaimplementowano moduł diagnostyki zatrzymań i zakleszczeń procesu (`processStallDetection.ts`), zapobiegający pozornemu zakończeniu symulacji lub prezentowaniu niepełnych wyników przy zablokowaniu przepływu:
- **Jednoznaczna typologia zatrzymań (`ProcessStallType`)**:
  - `worker-deadlock` — zakleszczenie wzajemne operatora przetrzymywanego na zablokowanym stanowisku w polityce `bbas`, podczas gdy inna stacja wymaga go do podjęcia pracy;
  - `buffer-deadlock` — zablokowanie przepływu z powodu wysycenia zadeklarowanej pojemności bufora wyjściowego lub docelowego bufora wejściowego;
  - `material-starvation` — zatrzymanie procesu z powodu wyczerpania zadeklarowanego zaopatrzenia materiałowego (zapasu początkowego i harmonogramu dostaw);
  - `calendar-exhaustion` — wygaśnięcie okien pracy w kalendarzu roboczym stanowisk lub przypisanego zespołu;
  - `transport-deadlock` — brak możliwości realizacji przewozów międzyoperacyjnych (brak wolnych wózków, personelu transportowego lub zablokowane trasy);
  - `subassembly-starvation` — brak ukończenia pobrania zadeklarowanej partii podzespołu;
  - `process-stall` — ogólne zatrzymanie symulacji przy wyczerpaniu kolejki zdarzeń.
- **Konkretne rekomendacje naprawcze**:
  - Każdy zidentyfikowany typ zatrzymania generuje dedykowane zalecenie inżynierskie (np. zmiana polityki bufora na `bbas-worker-released`, dodanie dostaw w harmonogramie zaopatrzenia, poszerzenie okien kalendarza zmian lub zwiększenie pojemności buforów).
- **Szczegółowa inspekcja stanu zatrzymania w UI**:
  - Karta diagnostyczna w panelu harmonogramu z ostrzegawczym wyróżnieniem typu zatrzymania, dokładnym czasem wystąpienia w symulacji [s], ramką z podsumowaniem i rekomendacją;
  - Tabela zablokowanych stanowisk i korpusów: identyfikator stacji i kopii, zablokowana sztuka/operacja, przetrzymywani pracownicy, oczekiwanie na zwolnienie stacji docelowej oraz aktywna polityka blokowania;
  - Tabela wstrzymanych operacji: numer sztuki, nazwa operacji, stacja i kopia, stan zadania (`waiting`, `blocked`, `local-wait`), przyczyny oczekiwania oraz szczegółowe wyjaśnienie brakującego zasobu.
- **Bezpieczeństwo na granicy Web Worker**:
  - Diagnostyka przekazywana w ustrukturyzowanej formie lub jako bezpieczny znacznik tekstowy `[PROCESS_STALL_DIAGNOSTIC]...` odporny na serializację w wątkach roboczych przeglądarki.

### Wykres Gantta operacji, stanowisk i pracowników — 3.8 (2026-10-15)
W panelu harmonogramu zespołu (`DomainWorkerSchedulePanel.tsx`), na bazie dedykowanego modułu analitycznego `scheduleGantt.ts` oraz komponentu `ScheduleGanttChart.tsx`, wdrożono interaktywny wykres Gantta prezentujący przebieg symulacji w trzech perspektywach:
- **Trzy perspektywy widoku (`GanttViewMode`)**:
  - **Operacje w partii** — każdy wiersz odpowiada wykonaniu konkretnej operacji na określonej sztuce (`Sztuka X — Operacja Y na ST / k.Z`). Paski pokazują czas oczekiwania przed startem (`wait`), okna pracy netto (`work`), przerwy kalendarzowe (`pause`), blokadę wyjścia (`blocked`) oraz oczekiwanie na lokalną kontynuację (`local-wait`);
  - **Stanowiska i kopie** — każdy wiersz odpowiada fizycznej kopii stacji (`ST-... / kopia K`). Prezentuje zadania obróbcze, wyprzedzające rezerwacje celu transportu przed przyjazdem (`reserve`), blokady stacji po pracy oraz oczekiwanie korpusu na kontynuację;
  - **Pracownicy** — każdy wiersz odpowiada zadeklarowanemu pracownikowi (`W-...`). Prezentuje wykonywane czynności montażowe, przetrzymanie w blokadzie stacji (polityka `bbas`), ruchy transportu montażu (przewozy z ładunkiem oraz dojazdy/powroty bez ładunku) oraz przerwy kalendarzowe.
- **Sterowanie osią czasu i nawigacją**:
  - Automatyczne wyznaczanie podziałki czasu (`calculateGanttTimeGrid`) z czytelnymi krokami głównymi i podrzędnymi;
  - Wybór skali osi czasu (75%, 100%, 150%, 200%, 300%) z horyzontalnym przewijaniem i stałą kolumną nagłówków;
  - Wyszukiwarka filtrująca wiersze według nazwy lub identyfikatora;
  - Czytelna legenda kolorystyczna stanów procesu.
- **Dwukierunkowe przejście do odpowiedniego obiektu**:
  - Kliknięcie słupka lub nagłówka wiersza na wykresie Gantta zaznacza obiekt, wyświetla baner wybranego obiektu i podświetla powiązany wiersz w tabeli wykonań (`.selected-row`);
  - W przypadku wyboru stanowiska lub pracownika automatycznie rozwija odpowiednią sekcję inspekcji stanów (`open=true`) i podświetla wiersz danego zasobu;
  - Kliknięcie dowolnego wiersza w tabeli wykonań, tabeli stanowisk lub tabeli pracowników natychmiast synchronizuje zaznaczenie i podświetla odpowiadające mu słupki na wykresie Gantta.

### Dokładność analityczna, skalowalność i responsywność UI — 3.9 (2026-10-16)
W ramach zamknięcia Etapu 3 zrealizowano kompleksowy audyt i zautomatyzowane testy weryfikacyjne:
- **Matematyczna zgodność z ręcznymi wyliczeniami analitycznymi (dokładność 1 ms)**:
  - Potwierdzono, że zmiana trasy lub prędkości transportu przesuwa starty i zakończenia odbiorcy dokładnie o $\Delta t$ czasu przejazdu;
  - Potwierdzono, że zmiana współrzędnych wizualnych 3D w `layoutObjects` bez modyfikacji zadeklarowanej trasy daje bajtowo identyczny wynik (model wizualny 3D nie steruje wynikiem technologicznym);
  - Potwierdzono, że wyzerowanie pojemności buforów wywołuje bezpośrednie przekazanie i wyliczalną blokadę wyjścia z właściwym przetrzymaniem lub zwolnieniem operatora (`bbas` vs `bbas-worker-released`), a zwiększenie bufora do 1 uwalnia blokadę stanowiska;
  - Potwierdzono, że lokalna kontynuacja na tej samej kopii realizuje się bez ruchu transportowego i bez bufora, zachowując korpus na stanowisku;
  - Potwierdzono, że opóźnienie dostaw materiałów wstrzymuje operację dokładnie o brakujący czas z poprawną atrybucją przyczyny (`material`);
  - Potwierdzono, że prędkość odtwarzania w UI (1×–5000×) oraz pauza animacji nie mają najmniejszego wpływu na wynik obliczeń symulacyjnych i wykres Gantta.
- **Weryfikacja skalowalności dla dużych partii**:
  - Algorytm harmonogramu szkicu 6 oblicza partię 100 sztuk (200 operacji i dziesiątki zdarzeń transportowych) w czasie poniżej 300 ms, z narzutem serializacji Web Workera 2,5 ms i czasem generowania 3 widoków Gantta poniżej 30 ms;
  - Dyskretny silnik symulacji sieciowej wykonuje partię 1000 sztuk (6000 zdarzeń) w zaledwie 52 ms;
  - W przeglądarce Edge (CDP) zweryfikowano płynność przełączania widoków Gantta (68 ms) oraz kliknięcia/nawigacji do obiektów (4 ms), bez zamrażania wątku interfejsu (zrzut `outputs/qa/verify_3_9.png`).
- **Formalny odbiór Etapu 3**: Wszystkie kryteria etapu zostały spełnione; Etap 3 osiągnął status **wdrożone (10/10 = 100,0%)**.

### Oddzielne obciążenie stanowisk, maszyn i operatorów oraz mianowniki wskaźników — 4.1 (2026-10-16)
W ramach rozpoczęcia Etapu 4 wdrożono precyzyjne rozdzielenie i objaśnienie wskaźników obciążenia:
- **Statyczne bilansowanie i analiza zdolności (Yamazumi / BalancingBoard)**:
  - Wprowadzono moduł `src/core/workloadBalancing.ts` obliczający oddzielnie obciążenie stanowiska, maszyny oraz operatorów;
  - Wskaźnik stanowiska: odnosi cykl stacji do iloczynu kopii i czasu taktu ($K \cdot T_{\text{takt}}$);
  - Wskaźnik maszyny: odnosi czas technologicznego biegu maszyn do iloczynu kopii i czasu taktu ($K \cdot T_{\text{takt}}$);
  - Wskaźnik operatorów: odnosi czas pracy ręcznej do iloczynu obsady i czasu taktu ($(O \cdot K) \cdot T_{\text{takt}}$);
  - Dodano czytelną tabelę w widoku bilansowania z jawną formułą matematyczną i słownym objaśnieniem bazy mianownika dla każdej stacji.
- **Dynamiczny harmonogram symulacji partii (szkic 6 / scheduleStateMetrics)**:
  - Zdefiniowano `EquipmentStateMetrics` oraz algorytm `calculateEquipmentMetrics(...)` śledzący czas biegu maszyn (z profilu `machineRun` lub operacji) oraz ruchy transportowe wyposażenia (np. wózków);
  - Do `StationStateMetrics` i `WorkerStateMetrics` dodano jawne pola bazy mianownika (`denominatorSeconds`, `denominatorBasis`) oraz formuły obliczeniowe (`occupancyFormula`, `processingFormula`, `activityFormula`);
  - Rozszerzono panel harmonogramu szkicu 6 (`DomainWorkerSchedulePanel.tsx`) o dedykowaną tabelę inspekcji maszyn i wyposażenia oraz kolumny z objaśnieniem mianowników dla stanowisk i pracowników.
- **Weryfikacja**:
  - Testy jednostkowe `calculateStaticWorkload` i `calculateScheduleStateMetrics` w `tests/network.test.ts` potwierdziły poprawność matematyczną formuł i mianowników;
  - Weryfikacja Edge CDP w `tests/qa/verify_4_1.mjs` potwierdziła poprawne renderowanie tabeli i etykiet (zrzut `outputs/qa/verify_4_1.png`).

### Bilansowanie z uwzględnieniem kompetencji, wyposażenia i dopuszczonych kopii — 4.3 (2026-10-16)
W szkicu 6 (`DomainCompetencyEditor.tsx`, `DomainBalancingPanel.tsx`, `src/core/competencies.ts`, `src/core/domainBalancing.ts`) wdrożono jawny kontrakt kompetencji oraz wspomagane bilansowanie na istniejących kopiach stanowisk:
- Kompetencje członków rzeczywiście wybranej obsady operacji mogą się uzupełniać (każda wymagana kompetencja operacji musi wystąpić u co najmniej jednej osoby z wybranego podzespołu, nie wystarczy pokrycie przez całą listę dopuszczonych osób).
- Propozycja bilansu (`RPW` / `LCR`) działa na istniejących, jawnie dopuszczonych kopiach stanowisk z weryfikacją wyposażenia, blokad stanowisk (`lockedWorkstation`) i wykonalnej obsady, bez dzielenia czasu operacji przez liczbę pracowników i bez tworzenia nowych stanowisk.
- Zatwierdzenie po przeglądzie zawęża dopuszczenia do wskazanych kopii z zachowaniem trwałych ID, geometrii, tras oraz historii `Cofnij / Ponów`. Szczegóły: `MODEL_KOMPETENCJI_I_PRZYDZIALOW_4_3.md`, `WERYFIKACJA_KOMPETENCJI_I_BILANSU_4_3.md`.

### Wyjaśnianie ograniczeń przepustowości na podstawie harmonogramu — 4.4 (2026-10-16)
W panelu harmonogramu szkicu 6 (`ThroughputExplanationPanel.tsx`, `src/core/throughputExplanation.ts`) wdrożono wyjaśnianie ograniczeń przepustowości na podstawie dowodów z gotowego przebiegu:
- Siedem grup obserwacji: praca technologiczna na kopiach (unia `workWindows`), obsada i dostępność pracowników, transport międzyoperacyjny, blokady wyjścia i bufory, dostępność materiałów i podzespołów, kalendarze zmian/przerw oraz pozostałe ograniczenia.
- Czas oczekiwania jednoprzyczynowego jest prezentowany oddzielnie od czasu oczekiwań mieszanych (`mixedWaitSeconds`), bez arbitralnego dzielenia oczekiwań wieloprzyczynowych na poszczególne przyczyny i bez ogłaszania największej sumy jako dowiedzionej głównej przyczyny.
- Każdy dowód wskazuje sztukę, operację, kopię stanowiska, źródło czasu (`measured / assumed`) i umożliwia bezpośrednie przejście do odpowiedniego wykonania na wykresie Gantta. Szczegóły: `WERYFIKACJA_OGRANICZEN_PRZEPUSTOWOSCI_4_4.md`.

### Porównywanie zapisanych wariantów przy tych samych warunkach eksperymentu — 4.5 (2026-10-16)
W szkicu 6 (`DomainVariantComparisonPanel.tsx`, `src/core/domainVariantComparison.ts`) wdrożono bibliotekę zapisanych wariantów (`layout-studio-domain-v6-variants-v1`, maks. 20 wariantów) oraz ich porównanie eksperymentalne:
- Zapisywanie nazwanych migawek szkicu 6 w kategoriach: **wariant bazowy** (`baseline`), **dodatkowy pracownik** (`additional-worker`), **dodatkowe stanowisko** (`additional-station`) oraz **zmieniony layout** (`changed-layout`), z możliwością wczytania wariantu z powrotem do aktywnego szkicu 6 (`Cofnij / Ponów`), eksportu JSON i odzyskiwania uszkodzonej biblioteki.
- Uruchamianie porównania wybranych wariantów w tle (`schedule.worker.ts`) przy dokładnie tych samych, jawnie wybranych warunkach eksperymentu: liczbie sztuk (`batch`), odstępie przybycia (`arrivalIntervalSeconds`) i trybie transportu (`configured` lub `just-in-time`).
- Kontrola zmienionego czynnika względem wariantu bazowego (`process`, `workers`, `stations`, `layout`) z jawnymi ostrzeżeniami przy zmianach wieloczynnikowych lub zmianie definicji procesu/popytu.
- Oddzielenie szacunku statycznego (zasoby, kopie, suma wybranych czasów operacji `[s/szt.]` bez dzielenia czasu przez liczbę osób, długość tras) od wyników dynamicznych harmonogramu (*makespan* i $\Delta$ względem bazy, średnia przepustowość `[szt./h]` i $\Delta$, średni czas przejścia sztuki, praca netto, najdłużej pracująca kopia liczona unią przedziałów, oczekiwania jednoprzyczynowe, oddzielne oczekiwania mieszane bez dzielenia czasu, blokady wyjścia, ruchy transportowe oraz jawne założenia przebiegu). Szczegóły: `WERYFIKACJA_POROWNANIA_WARIANTOW_4_5.md`.

### Zestawienie wydajności, czasu przejścia, WIP, obsady, powierzchni i kosztów przy jawnych stawkach oraz założeniach — 4.6 (2026-10-16)
W module porównywania wariantów szkicu 6 (`src/core/domainVariantComparison.ts`, `src/components/studio/DomainVariantComparisonPanel.tsx`) wdrożono ustrukturyzowane zestawienie sześciu grup wskaźników oraz raport porównawczy (`.md`):
- **Wydajność**: bezpośrednie zestawienie statycznego szacunku zdolności (`3600 / maks. obciążenie kopii [s/szt.]`) z rzeczywistą przepustowością symulacji (`3600 * N / makespan`) oraz różnicą $\Delta$ względem wariantu bazowego.
- **Czas przejścia wyrobu**: rozróżnienie całkowitego czasu przejścia wyrobu w systemie (`lead time` od przybycia $t_{\text{arrival}}$ do ukończenia ostatniej operacji: średni, min–max i $\Delta$) od czasu w procesie (`in-process span` od faktycznego startu pierwszej operacji $O_1$) oraz wskaźnika przepływu w procesie ($T_{\text{netto}} / T_{\text{span}}$).
- **WIP (produkcja w toku — całe wyroby)**: analityczne całkowanie na osi czasu $[0, T_{\text{makespan}}]$ liczby sztuk po starcie pierwszej operacji przed ukończeniem ostatniej (**WIP aktywny**: średni, szczytowy i $\Delta$) oraz liczby sztuk od przybycia przed ukończeniem (**WIP w systemie**: średni i szczytowy).
- **Obsada i wykorzystanie zasobów**: zestawienie zadeklarowanej liczby pracowników, stanowisk i kopii z łącznym czasem aktywności zespołu (praca + przetrzymanie + transport montażu), średnim i maksymalnym wykorzystaniem zespołu względem makespanu oraz średnim i maksymalnym zajęciem aktywnych kopii stanowisk.
- **Powierzchnia**: prezentacja powierzchni hali (`facilityAreaSqm`), sumy obrysów 2D obiektów layoutu (`objectsFootprintSqm` i $\Delta$) oraz obrysu minimalnego prostokąta otaczającego (AABB, `boundingBoxAreaSqm`). Gdy wariant nie zawiera obiektów w `layoutObjects`, program jawnie raportuje `brak geometrii (0 obiektów layoutObjects)` bez zmyślania domyślnych wymiarów stanowisk.
- **Koszty przy jawnych stawkach i założeniach**: opcjonalny formularz jawnych stawek (`operatorRatePerHour`, `stationRatePerHour`, `areaCostPerSqm`), waluty, podstawy stawek (`assumed / contract / internal-tariff`) i trybu rozliczania czasu zasobów (`makespan` — pełna obsada i aktywne kopie przez czas trwania partii vs `active-only` — wyłącznie aktywne roboczogodziny i stanowiskogodziny). Brak domyślnych stawek, odrzucenie wartości ujemnych i nieliczbowych oraz natychmiastowe unieważnienie wyniku porównania po zmianie stawek lub założeń.
- **Raport porównania (`.md`)**: funkcja `buildVariantComparisonMarkdownReport(...)` oraz przyciski podglądu i pobrania raportu Markdown zawierającego wersję danych (`schemaVersion`), datę wygenerowania, warunki eksperymentu, założenia kosztowe i pełną tabelę syntezy wskaźników 4.6. Szczegóły: `WERYFIKACJA_ZESTAWIENIA_WARIANTOW_4_6.md`.

### Proponowanie zmian wraz z uzasadnieniem i wynikiem sprawdzenia w symulacji (bez deklaracji gwarantowanego optimum) — 4.7 (2026-10-16)
W module analizy i porównań szkicu 6 (`src/core/domainImprovementProposals.ts`, `src/components/studio/DomainVariantComparisonPanel.tsx`) wdrożono generowanie konkretnych propozycji zmian, ich symulacyjną weryfikację oraz raportowanie:
- **Brak deklaracji optimum (`NON_OPTIMUM_DISCLAIMER`)**: każda prezentacja propozycji i generowany raport Markdown zawiera wyraźne zastrzeżenie metodologiczne informujące, że propozycje wynikają z reguł inżynierskich i dowodów z harmonogramu bazowego, a symulacja weryfikuje ich wykonalność i rezultat bez roszczenia sobie prawa do gwarantowanego optimum globalnego.
- **Jawne źródło propozycji (bez zmyślania obiektów ani parametrów)**:
  - `add-team-worker`: włącza do zespołu zadeklarowanego pracownika z `project.workers`, który nie należał do `teamWorkerIds`, aktualizując dopuszczenia do operacji zgodnych z jego kompetencjami.
  - `expand-worker-eligibility`: rozszerza dopuszczenie istniejącego członka zespołu do operacji, dla której posiada kompetencje, lecz dotąd nie był dopuszczony.
  - `change-staffing-variant`: wybiera alternatywny, jawnie zadeklarowany profil czasowy obsady operacji (`timeVariants`), weryfikując kompetencje i dostępność liczebną zespołu.
  - `activate-station-copy`: dopuszcza istniejącą fizyczną kopię równoległą (`parallelStations >= 2`) wyposażoną w wymagane maszyny lub rozdziela operacje w obrębie istniejących kopii.
  - `rebalance-work`: wyznacza propozycję przydziału operacji algorytmem RPW/LCR (silnik `4.3`) na jawnie dopuszczonych kopiach.
  - `release-blocked-worker`: w buforze wyjściowym z blokadą `bbas` proponuje politykę zwolnienia operatora (`bbas-worker-released`).
  - `saved-variant`: dołącza do oceny warianty zapisane przez użytkownika w bibliotece wariantów `4.5`.
- **Weryfikacja symulacyjna i rozróżnienie szacunku od wyniku dynamicznego**: wszystkie propozycje podlegają symulacji przy identycznych warunkach eksperymentu (`VariantExperimentConditions`). Każda propozycja zestawia szacunek zdolności statycznej z wynikiem dynamicznym oraz klasyfikuje status weryfikacji: `Poprawa w symulacji` (`improved`), `Brak zmiany` (`unchanged`), `Pogorszenie` (`regressed`) lub `Odmowa / niewykonalność` (`refused`).
- **Interakcja i historia operacji**: użytkownik może zapisać dowolną propozycję jako wariant w bibliotece `4.5` lub zastosować ją bezpośrednio do aktywnego szkicu 6 (z pełną obsługą historii `Cofnij dane szkicu` / `Ponów dane szkicu`).
- **Raport Markdown (`.md`)**: generator `buildImprovementProposalsMarkdownReport(...)` z wersją danych (schemat roboczy `v6`, źródło `v4/v5`), warunkami eksperymentu, założeniami kosztowymi, zastrzeżeniem metodologicznym, tabelą wyników, uzasadnieniami, dowodami i rejestrem pominiętych kategorii. Szczegóły: `WERYFIKACJA_PROPOZYCJI_ZMIAN_4_7.md`.

### Podkład hali z kalibracją skali, import geometrii DXF oraz strefy funkcjonalne i kontrola geometryczna rzutu — 5.7, 5.8 i 5.9 (2026-10-18)
W edytorze hali CAD 2D (`src/components/studio/LayoutEditor.tsx`, `src/core/algorithms/layoutSelection.ts`, `src/core/export/dxfImporter.ts`) wdrożono obsługę podkładu rastrowego/wektorowego, kontrolowany import geometrii DXF oraz wizualizację stref funkcjonalnych i kontrolę geometryczną rzutu:
- **Podkład hali i dwupunktowa kalibracja skali (5.7)**: wczytywanie rysunków posadzki (`PNG`, `JPEG`, `SVG`, `WebP`) zapisywanych w `facility.underlay`, przełącznik `Warstwa: Podkład hali`, ręczna edycja skali `mmPerPixel`, przesunięcia `xMm`/`yMm`, przezroczystości `opacity`, dopasowanie wymiarów hali do podkładu oraz interaktywna dwupunktowa kalibracja skali A–B bezpośrednio na rzucie CAD 2D (`calibrateUnderlayScale`). Szczegóły: `WERYFIKACJA_PODKLADU_HALI_5_7.md`.
- **Import geometrii DXF z weryfikacją jednostek i raportem pominiętej geometrii (5.8)**: parser `parseDxfImport` obsługujący zamknięte obrysy 2D `LWPOLYLINE` i `POLYLINE` (`VERTEX` + `SEQEND`), `CIRCLE`, osiowe odcinki `LINE` na warstwach hali/przeszkód oraz etykiety `TEXT`/`MTEXT` w sekcji `ENTITIES` (z ignorowaniem definicji szablonów w sekcji `BLOCKS` i zachowaniem pełnego roundtripu z `exportToDxf`). Weryfikacja zmiennej nagłówkowej `$INSUNITS` (`mm`, `cm`, `m`, `in`, `ft`) blokuje zastosowanie importu przy braku jednoznacznej jednostki (`$INSUNITS=0` lub brak nagłówka) do chwili jawnego wyboru jednostki przez użytkownika. Wszystkie nieobsługiwane encje CAD (`INSERT`, `SPLINE`, `ARC`, `ELLIPSE`, `HATCH`, `DIMENSION`, `3DFACE`, łuki `bulge`, polilinie `< 3` wierzchołków) są jawnie raportowane w **Raporcie pominiętej geometrii** wraz z warstwą, liczbą wystąpień i przyczyną. Szczegóły: `WERYFIKACJA_IMPORTU_DXF_5_8.md`.
- **Strefy obsługi, odkładania i komunikacji oraz rozróżnienie ostrzeżeń geometrycznych od oceny zgodności BHP (5.9)**: funkcja `computeFunctionalZones` i warstwa `Warstwa: Strefy obsługi, odkładania i komunikacji` (`layers.functionalZones`) wizualizują na rzucie 2D kreskowane obrysy **stref obsługi** (`service` — wokół mat operatorów lub przed stołami bez mat), **stref odkładania** (`staging` — wokół regałów FIFO oraz stref wejścia/wyjścia materiału) i **stref komunikacji** (`communication` — pas międzyrzędowy lub wzdłużny). Funkcja `analyzeGeometricLayoutWarnings` oraz panel **Strefy funkcjonalne i kontrola geometryczna rzutu (nie BHP)** oznaczają kolizje obrysów 2D, wykroczenia poza granice hali, naruszenia prześwitu między stołami i przeszkody w strefach odznaką `Geometria rzutu (nie BHP)` (`[Geometria rzutu — nie BHP]`) z jawnym zastrzeżeniem (`BHP_GEOMETRY_DISCLAIMER`, `BHP_SAFE_STATE_NOTE`), że kontrola ma wyłącznie charakter geometryczny i nie stanowi oceny zgodności z przepisami BHP ani dopuszczenia stanowisk do eksploatacji. Szczegóły: `WERYFIKACJA_STREF_I_GEOMETRII_5_9.md`.
- **Wspólne zaznaczenie i dane 2D–3D, spójne skróty, nazwy narzędzi i podpowiedzi (5.10)**: synchronizacja stanu zaznaczenia obiektów wyposażenia (`selectedLayoutObjectIds`) między rzutem 2D (`5 Hala i CAD`) a widokiem symulacji 3D (`6 Widok 3D i symulacja`), wizualne wyróżnienie zaznaczenia obwiednią `THREE.BoxHelper` w 3D (błękitna ramka dla aktywnych, ostrzegawcza żółta dla zablokowanych), ochrona obiektów zablokowanych (`locked`) przed przypadkowym przesunięciem przeciąganiem myszy w 3D oraz blokada pól edycyjnych współrzędnych w formularzu właściwości 3D, spójne globalne (`Ctrl+Z`, `Ctrl+Y`, `Ctrl+S`) i kontekstowe skróty klawiszowe (`Escape`, `F`, `T`, `G`, `M`, `L`, `S`, `Arrow` precyzyjne przesuwanie z ochroną `locked` i opcjonalnym krokiem 5× z `Shift` poprzez algorytm `nudgeLayoutObjects`), spójne podpowiedzi `title` ze skrótami na paskach narzędziowych 2D/3D oraz rozwijana ściągawka skrótów `cad-shortcuts-cheatsheet` ze znacznikami `<kbd>` i definicjami `LAYOUT_SHORTCUTS`. Szczegóły: `WERYFIKACJA_SPOJNOSCI_2D_3D_5_10.md`.
- **Automatyczna pierwsza propozycja layoutu, uwzględnienie BOM i oznaczenia założeń wizualnych (5.13)**: automatyczne generowanie pierwszej propozycji rozmieszczenia stanowisk opierające się na grafie operacji i wstępnym bilansie (`generate3DLayout`, `derive`, `replaceImportedProcess`) bez wymogu klikania osobnego przycisku; obsługa w docelowym modelu stanowisk (`Warsztat stanowisk v5`, `deriveStationProject`) zapobiegająca błędom braku stołów przy nowych procesach; odzwierciedlenie przypisanych części z BOM w etykietach buforów FIFO (brak BOM nie blokuje szkicu); oznaczanie obiektów generowanych jako założenia wizualne (`isVisualAssumption: true`) z odznakami w panelach właściwości 2D i 3D (`badge-visual-assumption`) oraz notami ostrzegawczymi (`visual-assumption-note`, `facility-unconfirmed-note`) bez przypisywania zdolności technologicznej i bez deklarowania dopasowania do przestrzeni fizycznej; ścisła ochrona ręcznych pozycji (`layoutMode: 'manual'`) przed nadpisaniem; odbiór na niezależnych procesach (silniki EV `DEFAULT_MOTOR_PROJECT` i baterie EV `DEFAULT_BATTERY_PROJECT`). Szczegóły: `WERYFIKACJA_PROPOZYCJI_LAYOUTU_5_13.md`.
- **Standard wyposażenia: skala, jednostki, punkt ustawienia, obrys kolizji, strefa obsługi, punkty transportu i metadane (6.1)**: wprowadzenie formalnej specyfikacji wyposażenia przemysłowego (`src/core/equipment/equipmentStandard.ts`, `STANDARD_WYPOSAZENIA_6_1.md`) ustalającej kanoniczną skalę i jednostki (CAD 2D: 1 jednostka = 1 mm; 3D Three.js: 1 jednostka = 1 m = 1000 mm; kąty obrotu w stopniach 0–360° wokół osi pionowej), punkt bazowy ustawienia (`EquipmentInsertionPoint`: elewacja posadzki Z=0, wisząca lub na blacie, kotwica rzutu `footprint-center` / `bottom-left`, kierunek frontowy), obrys kolizji 2D i 3D z marginesem bezpieczeństwa (`EquipmentCollisionEnvelope`, `checkEquipmentCollision2D`, `checkEquipmentCollision3D`, `checkObstacleCollision`), strefy obsługi i konserwacji operatora wg normy PN-EN ISO 14738 z rygorem wytycznych geometrycznych bez certyfikacji BHP (`isErgonomicGuidelineOnly: true`), punkty dokowania transportu materiałowego z kierunkiem podejścia, wysokością roboczą i dozwolonymi nośnikami (`EquipmentTransportPort`, `getTransportPortWorldPosition`), metadane pochodzenia i licencji (`EquipmentMetadata`: MIT, CC-BY-4.0, CC0; limit wielokątów; `isCertifiedTechnologicalCapacity: false`), wbudowany rejestr `DEFAULT_EQUIPMENT_SPECS` dla 15 standardowych typów obiektów (`ObjectType`) oraz ścisłą ochronę niezmiennika oddzielenia modelu wizualnego od technologii (`assertVisualModelIndependence` — zakaz zmiany czasów i zdolności przy zmianie geometrii 3D, Zasada 6 i Plan 6.4). Szczegóły: `WERYFIKACJA_STANDARDU_WYPOSAZENIA_6_1.md`.
- **Parametryczne wyposażenie 3D: stoły, regały, palety, pojemniki, wózki i przenośniki (6.2)**: wdrożenie generatorów parametrycznych modeli 3D (`src/core/equipment/parametricEquipmentModels.ts`, `PARAMETRYCZNE_WYPOSAZENIE_6_2.md`) w Three.js dla wszystkich standardowych i rozszerzonych kategorii wyposażenia przemysłowego:
  - *Stoły i stanowiska robocze* (`Table`, `TableESD`, `TableToolRail`, `QualityGate`, `ReworkStation`, `TestStationBench`): blat o zadanym wymiarze, nakładka antystatyczna ESD, nogi z profili stalowych/aluminiowych ze stopkami poziomującymi, rama podblatowa, nadstawka pionowa, półka narzędziowa, perforowana tablica 5S, belka oświetleniowa LED oraz przyrządy kontrolne/aparatury.
  - *Regały przepływowe FIFO i magazynowe* (`FlowRackFIFO2Tier`, `FlowRackFIFO3Tier`, `ShelvingUnitBulk`): pochylone bieżnie rolkowe grawitacyjne z prowadnicami, pojemniki KLT na torach, rurkowo-złączkowa konstrukcja lean pipe z ukośnymi stężeniami, półka zwrotna pustych pojemników oraz słupy regałowe z belkami nośnymi.
  - *Palety i pola odkładcze* (`PalletEuroFloorMark`, `PalletEuroStack`): realistyczna geometria europalety EPAL (1200×800×144 mm — 5 desek górnych, 3 poprzecznice, 9 klocków dystansowych, 3 płozy dolne), narożniki wyznaczenia pola odkładczego na posadzce z pasami bezpieczeństwa oraz wielowarstwowe sztaple palet.
  - *Pojemniki i skrzynki KLT* (`KltBoxStack`, `MaterialIn`, `FinishedGoods`): znormalizowane pojemniki VDA 4500 (obrzeże sztaplowania, ożebrowanie podstawy, uchwyty muszlowe, klipsy na etykiety) w modularnych układach siatkowych.
  - *Wózki transportowe i autonomiczne roboty AMR/AGV* (`CartTuggerPlatform`, `AGVMiniLifter`): spawana rama platformy wózka ze stalowymi burtami zabezpieczającymi, dyszel holowniczy, 4 koła skrętne/stałe na poziomie posadzki Z=0; kompaktowe podwozie AGV ze skanerami laserowymi LIDAR, pierścieniem LED 360° i stołem podnośnikowym nożycowym.
  - *Przenośniki rolkowe* (`RollerConveyorGravity`, `RollerConveyorMotorized`): boczne ceowniki stalowe, ocynkowane rolki nośne rozmieszczane parametrycznie co 100 mm wzdłuż długości przenośnika, podpory w układzie H ze stopami kotwionymi do posadzki oraz napęd elektromechaniczny motoreduktora.
  - *Ergonomia, tablice 5S i Andon* (`OperatorErgoMat`, `Shadowboard5S`, `AndonBoard`): amortyzujące maty z fazowanymi krawędziami bezpieczeństwa, tablice cieni na narzędzia z hakami oraz trójkolorowe słupy sygnalizacyjne Andon (zielony/żółty/czerwony).
  - *Wizualne nakładki 3D standardu 6.1*: opcjonalne renderowanie stref obsługi operatora (półprzezroczysty zielony prostopadłościan), obrysów kolizji 3D (półprzezroczysta żółta obwiednia z ostrzegawczą ramką krawędzi) oraz portów transportowych (niebieskie markery dokowania ze strzałkami kierunku podejścia wózka/AGV), sterowane niezależnymi przełącznikami w widokach `Scene.tsx` i `Factory3DView.tsx`.
  - *Wydajność i gospodarka pamięcią GPU*: współdzielona paleta materiałów PBR (`MeshStandardMaterial`), współdzielona tablica wskaźników tekstur oraz funkcja bezpiecznego zwalniania pamięci WebGL `disposeEquipmentGroup` chroniąca materiały współdzielone przed unieważnieniem. Pełna zgodność z Zasadą 6 i Planem 6.4 (brak wpływu geometrii 3D na czasy i balans). Szczegóły: `WERYFIKACJA_PARAMETRYCZNEGO_WYPOSAZENIA_6_2.md`.





### Pomocnicza karta wyposażenia — 6.3a (2026-10-18)
Samodzielny edytor lokalny w tools/equipment-editor/index.html: formularz znanych wymiarów i ich źródeł, opis wyglądu, punkt bazowy, referencje i uprawnienia; eksport/import osobnego JSON i pusty szablon. Bez automatycznych wymiarów i bez zmiany projektu/zdolności/symulacji. Szczegóły obsługi w tools/equipment-editor/README.md. To przygotowanie danych do 6.3, nie wdrożenie modeli Blender.

### Autorskie koncepty wyposażenia — 6.3b (2026-10-18)
Galeria pomocniczego edytora zawiera stanowisko montażowe z nadbudową, wózek półkowy i regał na części: własne pliki Blender/GLB/rendery i edytowalne karty JSON. Inspiracja ogólnymi kategoriami materiałów Jabama; wszystkie gabaryty i detale są jawnymi założeniami demonstracyjnymi, bez kopiowania materiałów producenta i bez automatycznej zmiany głównego projektu lub zdolności linii. Źródła i szczegóły: tools/equipment-editor/concepts/README.md.

### Niezależny wybór wyglądu wyposażenia — 6.4 (2026-10-18)
Aktywny edytor 2D/3D pozwala przypisać zapisanym obiektom jeden z 3 konceptów 6.3b lub przywrócić generator według typu. Wygląd nie zmienia ID, typu, przypisania stanowiska, gabarytów, czasu, obsady, zdolności ani trybu layoutu. Zachowuje proporcje wewnątrz obrysu. Osobne zatwierdzenie, ochrona niezapisanych wymiarów, historia i zapis/odczyt; metadane czytane przez schematy 4/5/6. Konfigurator części jest w 8.3, import CAD w 8.4. Kontrakt i granice: MODEL_WYGLADU_WYPOSAZENIA_6_4.md.

### Manipulatory 3D przesuwania i obrotu oraz ukrywanie warstw i obiektów — 6.5 (2026-10-18)
W widoku 3D (`Scene.tsx` oraz `Factory3DView.tsx`) wdrożono:
- **Interaktywne manipulatory 3D (Three.js TransformControls)**:
  - *Przesuwanie 3D (W)*: manipulator osiowy w płaszczyźnie posadzki hali (osie X/Z w Three.js odpowiadające X/Y w rzucie CAD 2D), z zachowaniem wysokości obiektu Z=0 lub zadanej elewacji.
  - *Obrót 3D (E / R)*: manipulator obrotu wokół osi pionowej (Yaw, `rotationDeg` 0–360°), z przyciąganiem do kątów co 15° przy włączonej siatce.
  - *Wyłącz manipulator (Q)*: powrót do swobodnej nawigacji i obrotu kamery.
  - *Przyciąganie do siatki (G)*: przyciąganie przesunięcia do `gridSizeMm` w milimetrach oraz obrotu do dyskretnych kątów 15°.
  - *Ochrona obiektów zablokowanych (L)*: dla obiektów z `locked: true` manipulator zostaje natychmiast odłączony, pola numeryczne są wyłączone, a w pasku pojawia się odznaka `🔒 Zablokowany (brak manipulacji)`.
  - *Jednokrokowa historia zmian (Ctrl+Z / Ctrl+Y)*: rejestracja operacji w historii następuje wyłącznie na `mouseUp` (zakończenie przeciągania), zapobiegając zaśmiecaniu historii mikroramkami pętli Three.js.
- **Filtrowanie warstw w 3D**:
  - Rozwijany panel *Warstwy 3D* spójny z CAD 2D (`5.6`): `Stanowiska`, `Bufory i logistyka`, `Strefy operatorów`, `Przeszkody` i `Połączenia procesu` (spaghetti).
  - Niezależne przełączanie widoczności elementów w scenie 3D.
- **Ukrywanie i odkrywanie obiektów w 3D**:
  - Przycisk *Ukryj w 3D (H)* pozwala ukryć wybrany obiekt w gęstym układzie linii produkcyjnej.
  - Przycisk *Pokaż ukryte w 3D (N)* oraz skrót *Shift+H* przywracają widoczność wszystkich ukrytych obiektów.
  - Obiekty ukryte są ignorowane przez raycaster i natychmiast odłączają manipulator 3D.
- **Niezmiennik technologiczny (Zasada 6 i Plan 6.4)**:
  - Operacje manipulacji wizualnej, ukrywania warstw i obiektów nie wpływają na strukturę procesu, czasy operacji, bilans ani wyniki symulacji. Szczegóły: `WERYFIKACJA_MANIPULATOROW_I_WARSTW_6_5.md`.

