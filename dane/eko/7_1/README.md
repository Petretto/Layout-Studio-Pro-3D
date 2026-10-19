# Zbieranie danych Eko — rama 1.4, pomiary z lipca 2026

Pakiet pomocniczy 7.1. Pliki służą do zebrania i udokumentowania danych przed wprowadzeniem ich do modelu. Nie są formatem importu aplikacji i nie zmieniają istniejącego przykładu Eko.

## Co już potwierdzono

Użytkownik potwierdził rzeczywiste pochodzenie `tests/Test Eko.xlsx` i `tests/Test Eko BOM.xlsx`, pomiary z **lipca 2026** oraz wariant ramy **1.4**. Następnie potwierdził, że **OP22–OP25 nadal mają czasy przykładowe, choć prawdopodobne**. Pozostałe 12 czasów pochodzi z rzeczywistych danych według tego potwierdzenia. Szczegółowej metody, liczby prób i dziennych dat pomiarów jeszcze nie podano.

Dowody odpowiedzi są zapisane w `potwierdzenia_zrodel.json`; pełny audyt i identyfikatory źródeł zawiera `../../../outputs/data_audit/eko_7_1c.json`. Rejestr braków: `../../../DANE_EKO_7_1.md`.

Użytkownik doprecyzował obsadę (EKO-U4): **13 osób łącznie w procesie**, po **1 osobie dla mierzonych OP10–OP20** oraz **2 osoby przy pakowaniu OP21**. Zmierzony czas pakowania **1320 s = 22 min** dotyczy tej dwuosobowej obsady; nie dzielimy go przez dwa. EKO-U5 doprecyzowuje: cały proces jest manualny, bez maszyn i automatyzacji; obie osoby są obecne przez całe pakowanie. Nie określono tożsamości osób, współdzielenia ani przedziałów obecności przy pozostałych operacjach. Karty są nadal pustymi wzorcami; liczebności obsady i pomiarowego pochodzenia czasów nie rozszerzamy na testowe OP22–OP25.

## Jak uzupełniać karty

1. Skopiuj pliki CSV do własnego katalogu pomiarów. Otwórz w Excelu jako **UTF-8**, separator **średnik**; kolumny identyfikatorów ustaw jako tekst. Pliki w tym katalogu są pustymi wzorcami — zachowaj je do następnych pomiarów.
2. `pomiary_operacji.csv` zawiera po jednym wierszu dla każdego istniejącego ID operacji, bez wpisanych wartości czasu. Nadaj ID próbki i dopisz wariant, sztukę, obsadę, okres/datę, metodę i źródło. Dla wielu prób kopiuj wiersz, zachowując ID operacji i tworząc nowe ID próbki. Nie uśredniaj jeszcze prób; zachowaj wyniki surowe i warunki każdej z nich.
3. W `przedzialy_aktywnosci.csv` zapisz osobne przedziały `praca_reczna`, `praca_maszyny`, `obecnosc_operatora`, `oczekiwanie` lub `blokada`. Start i koniec podawaj w sekundach od faktycznego początku danej obserwacji. Dla obecności wskaż konkretną osobę; dla automatu — ID maszyny. W tym procesie Eko nie wypełniaj wierszy `praca_maszyny`: potwierdzono brak maszyn. Dla OP21 zapisz obecność obu osób przez całość rzeczywistej obserwacji, gdy dostępne będą jej ID i czas; nie zastępuj surowej obserwacji standardem z arkusza. Przedziały kilku osób mogą się nakładać. Nie sumuj ich jako jednego czasu trwania operacji.
4. W `obsada_i_zasoby.csv` zapisz rzeczywiste wykonania operacji i ich zespoły. Jeden wiersz wskazuje osobę oraz konkretną kopię stanowiska w danym wykonaniu; wiele osób oznacza wiele wierszy tego samego ID obsady. Używaj lokalnych ID osób — nazwiska nie są potrzebne. Zapisz kompetencje osób i wymagania operacji, bez domyślnego nadawania uprawnień. Kompetencje zespołu mogą się uzupełniać.
5. Każda próbka powinna wskazywać ID źródła i jego lokalizację: plik/rejestr, arkusz/wiersz, datę pomiaru, osobę lub rolę potwierdzającą oraz metodę. Nowy pomiar jest nowym źródłem — nie przypisuj go automatycznie do historycznego arkusza EKO-S1.
6. Puste pole oznacza **brak danych**, nigdy zero. Nie zastępuj czterech czasów przykładowych nowymi szacunkami oznaczonymi jako pomiar. VA/NVA z arkusza nie określa przedziałów pracy ręcznej, automatu ani obecności.

W nagłówku `Czas_obserwacji_s` podaj zakres całej obserwacji od jej początku do końca. Oczekiwanie i blokady ujmij oddzielnymi przedziałami, aby przy przygotowaniu profilu nie zostały ponownie doliczone do czasu pracy. Samo zwiększenie liczby osób nie określa czasu zespołu.

## Pozostałe materiały potrzebne do 7.1

Można przekazać własne arkusze, CAD lub opis z identyfikatorami, jednostkami i źródłami; nie trzeba dopasowywać ich do nowego formatu aplikacji.

| Obszar | Wymagana informacja |
| --- | --- |
| Stanowiska i wyposażenie | ID stanowiska, istniejące kopie, wyposażenie każdej kopii, dopuszczenia operacji, rzeczywiste warianty obsady i czasu. Nie wnioskuj kopii ze skopiowanej geometrii. |
| Równoległość | Konkretne pary/grupy operacji, dostęp do wspólnej ramy, zasoby wykluczające jednoczesność, osoba potwierdzająca i ograniczenia. |
| Geometria | Jednostki, pomierzone gabaryty hali/stanowisk/przeszkód, punkt bazowy, położenia, geometria obrysu, rewizja rysunku. Materiały Jabama i koncepty Blender nie są pomiarami stanowisk Eko. |
| Transport montażowy | Początek/koniec skierowanej trasy, konkretne kopie, długość, czas przejazdu/podejścia, wózki w jawnej kolejności, obsada. Nie wyliczaj czasu z geometrii bez jawnej prędkości/reguły. |
| Bufory | Konkretna kopia i wejście/wyjście, pojemność [szt.], zajętość początkowa, zasada operatora podczas blokady; 0 oznacza bezpośrednie przekazanie, nie brak ograniczenia. |
| Kalendarz | Okna pracy i przerwy każdej osoby i kopii, punkt zerowy czasu, początkowy stan linii i lokalizacje ram/podzespołów. |
| Materiał | Stan początkowy, jednostki, jawne zużycie na operację, ilości i czasy dostaw, w tym pierwszej dostawy okresowej. BOM nie jest dowodem stanu magazynowego ani harmonogramu dostaw. Bez rozliczania pracy operatorów magazynu. |
| Podzespoły | Producent/odbiorca, jawna ilość partii i ilość zużywana, jednostka, przypisane wykonania. Cała partia jest dostępna po końcu producenta, a przypisana ilość zużywana na starcie odbiorcy zgodnie z uzgodnioną regułą. |
| Wyniki produkcji | Okres obserwacji, uruchomione/ukończone/dobre sztuki, znaczniki startów/końców, WIP początkowy/końcowy, przestoje, braki i ponowna obróbka. Te same warunki trzeba potem odtworzyć w 7.2. |
| Straty i OEE | Źródło i zakres strat oraz rezerwy OEE; jawnie wskazać elementy już wliczone w czasy i postoje, aby nie liczyć ich dwukrotnie. Rozdzielenie pozostaje do 7.5. |

## Ponowienie audytu

Z katalogu głównego repozytorium uruchom:

```powershell
node scripts/audit_eko_data_7_1.mjs
```

Skrypt czyta źródła i rejestr potwierdzeń, porównuje ID/czasy z wbudowanym przykładem, liczy pozycje BOM, sprawdza jego odwołania i zapisuje SHA-256 w `outputs/data_audit/eko_7_1c.json`. Brak maszyn zapisuje jako potwierdzoną pustą listę odcinków, a pełną obecność 2 osób OP21 jako wymaganie bez wymyślonych ID osób. Zapisuje wynik do `outputs/data_audit/eko_7_1c.json`, pozostawiając historyczny `eko_7_1.json` i jego lokalne zmiany. Nie edytuje arkuszy, kart CSV ani aplikacji. Zgodność plików nie oznacza kompletności lub odbioru modelu produkcyjnego.

Tolerancje i okres porównania wyników należy uzgodnić przed odbiorem 7.2; ten pakiet nie nadaje im wartości domyślnych.

## Najbliższe uzupełnienie

Podaj, czy wartości OP10–OP21 w arkuszu są pojedynczymi pomiarami, średnimi z kilku prób (jeśli tak, z ilu), czy przyjętymi normami. Nie zmieniaj liczb tylko po to, aby uzupełnić ich metrykę. Następnie można przypisać lokalne ID 13 osób i określić, czy przechodzą między operacjami; sama suma 13 nie potwierdza jednoczesnej dostępności wszystkich zespołów.
