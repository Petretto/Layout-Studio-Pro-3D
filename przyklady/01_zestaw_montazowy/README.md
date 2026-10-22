# 01 — Zestaw uchwytu montażowego

**Wszystkie dane są syntetyczne.** Projekt pokazowy 1.0.0 dla Layout Studio Pro 0.4.0, format pakietu projektu v1. Nie opisuje rzeczywistej technologii, pomiarów, hali ani cen. Ma uczyć ładowania danych, taktu, bilansu i interpretacji symulacji. Nie zależy od Eko, baterii ani silników.

Wyrób: prosty zestaw podstawy, uchwytu, dwóch pokręteł i opakowania. Trzy operacje manualne: przygotowanie 20 s → montaż 30 s → kontrola/pakowanie 40 s. Nie ma maszyn ani automatyzacji. Każdy czas obejmuje całą pracę jednej osoby i jej obecność; dodanie osoby nie skraca go automatycznie.

## Co wczytać

**`projekt-pokazowy.json` jest kompletnym plikiem wejściowym** dla tego dydaktycznego trybu. Wczytuje źródło 4, zapisany szkic 6, zasoby, profile czasów, kalendarze, przydziały, dopuszczenia, kompetencje, layout i dwie migawki wariantów. Plik nie zawiera ustawień sesji — wybierz je jawnie poniżej. Źródło 5 nie jest potrzebne; import usuwa poprzedni warsztat 5. Biblioteka scenariuszy 4 pozostaje bez zmian.

| Plik | Rola |
| --- | --- |
| `manifest.json` | Inwentarz plików, wersja, bajty i SHA-256; nie wczytuj go jako projektu. Manifest nie hashuje samego siebie. |
| `projekt-pokazowy.json` | Import przez **Pakiet projektu**. |
| `dane/proces.xlsx`, `dane/bom.xlsx` | Kompletne arkusze do nauki importu i jako szablony. Pierwszy arkusz Dane, osobno opis kolumn i pochodzenie. Same nie odtwarzają obsady/kalendarzy/wariantów. |
| `dane/zrodlo4.json` | Projekcja źródła do dotychczasowego importera JSON 4; nie zastępuje pakietu. |
| `dane/szkic6.json`, `dane/warianty6.json` | Czytelne projekcje do nauki/audytu; nie importuj ich starym importerem 4. |
| `dane/warunki_eksperymentu.json` | Jawne warunki do ustawienia w UI, nie plik z osobnym importerem. |
| `dane/slownik_pol.md` | Typy, ID, jednostki, przypisania i zakres modelu. |
| `referencje/oczekiwane_wyniki.json`, `referencje/obliczenia.md` | Niezależne wzorce i ręczne obliczenia, zapisane przed uruchomieniem silnika. |

Nie trzeba importować wszystkich plików kolejno. Pakiet jest jednym źródłem wczytania; pozostałe pliki uczą struktury danych. Wszystkie wymagane geometrie są prostymi stołami dostarczanymi przez aplikację; brak zewnętrznych modeli, fontów czy prywatnych ścieżek. Wymiary hali i stołów są koncepcyjne, `isConfirmed: false`.

## Pierwsze uruchomienie

1. Otwórz aplikację. Jeżeli pracujesz nad własnym projektem, zachowaj go przed zmianą. Aby rozpocząć demonstrację od pustego projektu, na pulpicie wybierz **Rozpocznij od zera** i potwierdź po zabezpieczeniu pracy.
2. Kliknij **Pakiet projektu** w górnym pasku. Wybierz `projekt-pokazowy.json`. Podgląd powinien pokazać nazwę zestawu, źródło 4, trzy operacje, trzy stanowiska, trzy osoby i dwa warianty, pochodzenie `synthetic`.
3. Pobierz kopię ratunkową, sprawdź plik, zaznacz potwierdzenie i kliknij **Wczytaj pakiet i przeładuj**. To zastępuje aktywne 4, warsztat 5, szkic 6 i bibliotekę wariantów 6. Nie używaj zwykłego importera 4 do pliku pakietu.
4. W **1 Popyt i takt** sprawdź takt **60 s**; w **2 Proces** trzy czasy **20/30/40 s**; w **3 BOM** koszt materiałów **25 PLN/szt.** Ceny są syntetyczne. **4 Bilans** i **5 Hala i CAD** pokazują źródłową bazę: trzy stanowiska z obciążeniami 20/30/40 s oraz trzy stoły. Stanowiska źródłowe WS-1..3 po migracji mają trwałe ID ST-ZM-1..3.
5. Przejdź do **Stanowiska v5** — tam znajduje się wczytany **szkic 6**. Nie wykonuj nowej migracji ani nie zastępuj go domyślnym warsztatem. Używaj paneli szkicu 6 opisanych poniżej.

## Symulacja i porównanie

Ten projekt **jawnie demonstruje tryb procesowy JIT**: zakłada dostępną dostawę materiału do operacji. Nie liczy tras/czasu transportu, fizycznych lokalizacji korpusów, zapasu ani dostaw. Jawne bufory wejściowe mają po 3 szt., pośrednie wyjściowe po 3 szt.; końcowe wyjście jest jawnie bez limitu w modelu (null). Przy tej partii nie ma blokowania pojemnością. Kontynuacja OP10→OP20 na tej samej kopii jest ciągła: inna sztuka nie zajmuje jej pomiędzy tymi operacjami. Nie włączono tego trybu w pliku ani po cichu w aplikacji. Domyślnie jest wyłączony — musisz go wybrać w każdym panelu po ponownym otwarciu. Fizyczny transport i zaopatrzenie będą demonstrowane w projekcie średnim.

1. W panelu harmonogramu szkicu ustaw **3 sztuki**, **odstęp przybyć 1 s**, zaznacz symulację bez transportu — just in time i oblicz harmonogram. Pierwsza sztuka startuje w chwili 0; przybycia to 0/1/2 s.
2. Baza kończy sztuki w **90, 130, 170 s**. Sprawdź Gantt/tabelę operacji względem plików referencyjnych. Dla jednej sztuki oba warianty powinny dać 90 s.
3. W panelu **Porównanie wariantów szkicu 6** wybierz bazę **Baza — 3 stanowiska / 3 osoby**, ustaw **Liczba sztuk w porównaniu = 3**, **Odstęp przybycia = 1 s** oraz jawnie zaznacz **Symulacja porównania bez transportu — just in time**. Uwzględnij oba zapisane warianty; stawek kosztowych nie wpisuj.
4. Uruchom porównanie. Baza: 3 aktywne stanowiska, 3 osoby składu, koniec partii **170 s**, nominalna zdolność statyczna **90 szt./h**. Konsolidacja: 2 aktywne stanowiska, 2 osoby składu, koniec partii **190 s**, nominalna zdolność **72 szt./h**. Czasy operacji i popyt nie zmieniają się. W2/S2 pozostają zdefiniowaną rezerwą, bez aktywnej pracy.
5. Pobierz **raport porównania (.md)**. Zawiera warunki JIT, pochodzenie czasów i wyniki dwóch modeli 6. To raport właściwy dla tej demonstracji. Główny raport A4, layout i animacja 4 opisują nadal źródłową bazę, także po przywróceniu wariantu 6 — nie przedstawiaj ich jako raportu konsolidacji. Integracja widoków jest osobnym A2.

Wariant konsolidacji przenosi OP20 do istniejącego ST-ZM-1, jawnie dopuszcza W1 i stół EQ1, a nieaktywny stół S2 przesuwa w strefę rezerwy. Zmienia przydział i skład przebiegu, więc nie jest eksperymentem izolującym jeden czynnik. Nie deklaruj wzrostu przepustowości z powodu zmniejszenia liczby stanowisk. Oba odstępy statyczne 40/50 s są poniżej taktu 60 s. Przepustowość małej partii (3/makespan) różni się od zdolności stacjonarnej.

Po aktualizacji A2a panel **Aktywny szkic 6 — przydziały, rzut i raport** pokazuje własne przydziały i geometrię tego modelu. Po przywróceniu konsolidacji sprawdź sumę S1=50 s, rezerwę S2 i stół S2 przy Y=4000 mm. Możesz pobrać raport statyczny oznaczony tym samym SHA-256 co panel; nie zastępuje on dynamicznego raportu porównania. Główne widoki 4 nadal pozostają oddzielne.

Po A2b1 panel harmonogramu ma **Pokaż geometrię 3D** oraz odtwarzanie jego wyniku: pauza, krok, suwak, prędkość i wybór wykonania operacji. W konsolidacji przy 25 s wybierz operację OP20 sztuki 1: znacznik powinien wskazywać stół S1, wynik końcowy nadal 190 s. To znacznik pracy, nie fizyczna lokalizacja wyrobu. Nie pokazuje tras ani ruchu wózków; w JIT ich pozycje nie są obliczane. Po zmianie warunków lub wariantu oraz po odświeżeniu wymagane są nowe obliczenia. Fizyczny ruch pozostaje A2b2.

## Własna zmiana, zapis i ponowne otwarcie

W tabeli wariantów użyj przywrócenia konsolidacji do szkicu. Sprawdź, że OP10 i OP20 należą do S1, S2 jest puste, a skład to W1 i W3. Cofnij/Ponów powinno odtwarzać tę zmianę; odczyt wyników przelicz po każdej zmianie. Możesz zapisać własną migawkę pod nową nazwą. Nie zmieniaj oryginalnej biblioteki wzorcowej w dostarczonym katalogu.

Po zapisaniu szkicu kliknij **Pakiet projektu**, wybierz pochodzenie syntetyczne i pobierz pakiet. Wczytaj pobrany plik z kopią ratunkową i potwierdzeniem, odśwież aplikację, przejdź do szkicu i sprawdź przydziały oraz bibliotekę. Ponownie ustaw 3 sztuki, odstęp 1 s i JIT przed przeliczeniem. Eksport JSON 4 nie zapisuje aktywnego szkicu 6.

## Arkusze jako szablony i ograniczenia

Na kopii projektu możesz w **2 Proces** wczytać `dane/proces.xlsx`, a w **3 BOM** `dane/bom.xlsx`. Sprawdź ID operacji przed importem BOM. Arkusze nie zawierają nazwanych osób, dopuszczeń, kalendarzy i wariantów; po ich edycji potrzebny jest nowy przegląd i konfiguracja projektu. Nie należy podmieniać arkusza i zakładać automatycznego przeliczenia istniejącego szkicu 6.

Nie ma Monte Carlo, awarii, przezbrojeń, podmontaży, wyznaczonego stanu magazynu ani stawek kosztu pracy. Brak tych modeli nie oznacza zerowych kosztów lub nieskończonego magazynu rzeczywistej linii. `modelStatus: incomplete` jest bieżącym oznaczeniem szkiców 6; ten zestaw jest kompletny wyłącznie dla zadeklarowanego zakresu JIT. Nie stanowi odbioru rzeczywistego procesu ani całego punktu 7.12.

Zmiany szablonu należy wersjonować i sprawdzać względem własnych danych; wszystkie nowe założenia oznaczaj osobno. Plików nie trzeba edytować w kodzie ani w pamięci przeglądarki. Skrypt deweloperski `scripts/generate_demo_basic_7_12b.mjs` odtwarza projekcje z jawnej definicji i manifest, bez generowania wzorców z silnika.
