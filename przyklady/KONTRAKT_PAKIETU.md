# Kontrakt pakietu demonstracyjnego — 7.12.A

Wersja kontraktu: **1, odbiór 2026-10-21**. W 7.12.A1 dostarczono format i importer pojedynczej rodziny projektu (opis poniżej). Manifest katalogu, trzy kompletne przykłady i integracja widoków A2 pozostają do realizacji. Schematy istniejących projektów nie zmieniły się.

## Format pliku wejściowego A1

Przycisk **Pakiet projektu** obsługuje JSON do 25 MiB (UTF-8). Nagłówek ma dokładnie pola `format: layout-studio-project-package`, `formatVersion: 1`, `appVersion`, `createdAt`, `checksumSha256` i `data`. `data` zawiera w tej kolejności:

| Pole | Typ i znaczenie |
| --- | --- |
| `dataOrigin` | `synthetic`, `user`, `mixed` lub `unspecified`; domyślnie nieokreślone, dla nowych przykładów jawnie synthetic. |
| `source4Json` | Dokładny tekst oryginału 4, obsługiwany przez dotychczasowy walidator projektu; wymagane trwałe ID. |
| `source5Json` | Dokładny tekst źródła 5 szkicu albo null dla szkicu ze źródła 4. |
| `draftRaw` | Dokładny tekst pełnej otoczki `domain-draft-save` v1, z projektem 6 i `originalJson`. |
| `variantsRaw` | Dokładny tekst biblioteki `domain-variant-library` v1 albo null. |

SHA-256 liczy się z tekstu UTF-8 `JSON.stringify(data)` po złożeniu powyższych pól w podanej kolejności, bez formatowania. Suma obejmuje dane, nie podpisuje ich autentyczności. Nieznane pola/wersje, uszkodzenia i niezgodność źródeł są odrzucane. Źródła i szkic mają to samo trwałe ID; `originalJson` szkicu jest identyczny bajtowo z odpowiednim tekstem 4/5, a każdy wariant ma ten sam dokładny oryginał i ID rodziny. Szkic może być niekompletny do symulacji: poprawny import nie jest odbiorem technologicznym.

Eksport wybiera rodzinę **zapisanego szkicu 6**, niezależnie od aktywnego projektu 4. Dla źródła 5 oryginał 4 bierze tylko ze zgodnego zapisu warsztatu 5; jeśli go brakuje, użytkownik musi jawnie dołączyć plik 4. Nazwa lub podobne ID nie służą do odgadywania brakującego oryginału. Wskazanie pliku jest deklaracją użytkownika jego pochodzenia; zgodne ID nie dowodzi historycznego wyprowadzenia 5 z 4. Obca biblioteka 6 blokuje eksport zamiast znikać po cichu.

Import pokazuje nazwę/ID/liczniki/pochodzenie i wymaga pobrania pełnej kopii ratunkowej oraz potwierdzenia jej zapisania. Zastępuje cztery obszary: aktywny 4, warsztat 5, szkic 6 i bibliotekę 6; null usuwa poprzedni obszar 5 lub bibliotekę 6. Niezależna wspólna biblioteka scenariuszy 4 i pozostałe klucze są zachowane. Zmiana obszarów od pobrania kopii blokuje import, a awaria zapisu uruchamia sprawdzone wycofanie. Po niepotwierdzonym wycofaniu edycja jest zablokowana; dostępne są snapshot i pełne odzyskiwanie. Sukces przeładowuje aplikację. Cofnij nie zastępuje kopii ratunkowej.

Partia, odstęp przybyć, tryb JIT i pozostałe ustawienia eksperymentu przechowywane tylko w sesji nie są dodawane do projektu przez A1. README każdego przyszłego przykładu musi podać ich jawne ustawienie przed uruchomieniem. Manifest nie jest plikiem importowanym przyciskiem Pakiet projektu. Importery JSON/archiwów 4/5 pozostają bez zmian. A1 nie łączy jeszcze raportu/animacji 4 z wynikami 6 (osobny A2).

## Granice i źródło prawdy

Wszystkie czasy, geometria, koszty i warunki nowych przykładów są zaprojektowanymi **danymi syntetycznymi**. Istniejące profile schematu 6 używają `basis: assumed`/`durationBasis: assumed`. `facility.isConfirmed` nie oznacza weryfikacji rzeczywistej hali; dla geometrii koncepcyjnej pozostaje false. Metadane pakietu muszą podawać pochodzenie syntetyczne również tam, gdzie model nie ma odrębnego pola źródła.

Dla każdego wariantu jedynym źródłem stanu procesu i zasobów jest jego projekt domenowy 6. Migawka źródłowa 4/5 jest wymagana przez obecny zapis szkicu, ale nie może zastępować danych 6 przy prezentacji jego wyników. Arkusze procesu/BOM są zgodnymi projekcjami do nauki importu i szablonami; po ich zmianie trzeba jawnie ponownie wygenerować i odebrać pakiet. Nie utrzymywać dwóch ręcznie rozbieżnych kopii operacji.

Eko, baterie i silniki nie są zależnością żadnego nowego przykładu. Nie kopiować ich popytu, stanów, czasów ani przypisań jako ukrytych domyślnych wartości. Dane pomocniczej próby audytu 7.12.A nie są projektem podstawowym 7.12.B.

## Zawartość każdego podkatalogu

| Plik / katalog docelowy | Rola i wymagania |
| --- | --- |
| `manifest.json` | Inwentarz: format `layout-studio-demo-manifest`, `formatVersion: 1`, `packageId`, `packageVersion`, tytuł, poziom basic/intermediate/advanced, język, zgodność z wersją aplikacji i importerem, `dataOrigin: synthetic`, jednostki s/mm, plik wejściowy, lista wariantów i plików. Każdy plik ma względną ścieżkę, rolę, format, liczbę bajtów i SHA-256. Nie jest kopią środowiska ani projektem importowanym obecnym przyciskiem JSON. |
| `projekt-pokazowy.json` | Pojedynczy punkt wczytania przykładu: otoczka A1 opisana powyżej. Używać przycisku Pakiet projektu; nie wkładać tej otoczki do dotychczasowego importera 4. |
| `dane/proces.xlsx`, `dane/bom.xlsx` | Arkusze zgodne z istniejącymi `processRows`/`bomRows` i importerami; kompletny graf ID, czasy w sekundach, jawne VA/NVA bez domyślnego 85%, poprawne odwołania BOM i jawne syntetyczne koszty/waluta. Bez formuł lub zależności od zewnętrznych skoroszytów. Źródło danych w arkuszu Dane; opis kolumn osobno. CSV można dodać jako równoważny eksport, nie jako dodatkowe źródło prawdy. |
| `dane/slownik_pol.md` | Rozróżnia wymagane/opcjonalne pola, typy, jednostki, listy ID i zależności. Wskazuje, które pliki są importowane, a które tylko opisowe. Opisuje czasy zespołu, brak automatycznego skracania czasu przez zwiększenie obsady, kompetencje uzupełniające się w zespole i kopie geometryczne bez nowej zdolności. |
| `dane/warunki_eksperymentu.json` | Dokument referencyjny dla UI: liczba wyrobów, odstęp przybyć [s], tryb transportu, stan początkowy i zakres wyniku; wspólne warunki pary baza/reorganizacja. Modelowane kalendarze, zużycie, bufory, dostawy i zasoby zawarte w projektach. W razie kosztów jawna waluta/stawki/podstawa; w razie Monte Carlo jawna konfiguracja, ziarno i replikacje. Ten plik nie ma osobnego importera; ustawienia sesyjne użytkownik ustawia jawnie według README. |
| `referencje/oczekiwane_wyniki.json`, `referencje/obliczenia.md` | Warunki, metryki, oczekiwane wartości/jednostki, tolerancja bezwzględna lub względna, metoda i autor referencji. Wzorzec wyznaczony niezależnie od badanego silnika. Zawiera kontrolne starty/końce, kolejność i bilans ilościowy; pełny harmonogram tylko gdy niezależnie wyznaczony. Nie traktować wygenerowanego raportu silnika jako wzorca dla tego samego silnika. |
| `README.md` | Opis procesu i poziomu, wyraźne dane syntetyczne, wersje, pliki i kolejność importu, uruchomienie symulacji, zapis/porównanie wariantów, interpretacja wyników, ograniczenia i pomysły własnych zmian. Wskazuje różnicę między samym importem arkuszy a kompletnym projektem oraz między raportem 4 a wynikami 6. |
| `assets/` (jeśli potrzebny) | Wszystkie wymagane lokalne modele/podkłady i ich źródła/licencje lub lista wspieranych modeli dostarczanych z aplikacją. Bez ścieżek `C:\...`, prywatnych adresów, ukrytych plików i niezbędnych pobrań z internetu. Obecny model obsługuje wbudowane ID wyglądu oraz podkład `dataUrl`; manifest nie tworzy importera dowolnego GLB/STEP. |

Poszczególne JSON szkicu, biblioteki lub źródła można dołączyć jako czytelne projekcje do nauki i audytu, ale manifest musi wskazać ich rolę. Import całego przykładu ma wykorzystywać plik wejściowy A1. Kontroler pakietu porównuje projekcje z jego treścią; nie wolno wczytywać kilku konkurujących wersji tego samego stanu. Archiwum ZIP jest wygodną dystrybucją katalogu, nie obietnicą importu ZIP.

## Minimalna kompletność domenowa

Każdy z trzech projektów ma jednoznaczne i stabilne ID, wyrób, operacje i zależności, stanowiska/kopie, jawne przydziały/routing, osoby i kwalifikacje, właściwy wariant czasu dla każdej obsady, ręczne/maszynowe odcinki i obecność, jawne kalendarze, popyt oraz geometrię. Nie przenosić danych z BOM do stanów/zużycia/dostaw bez osobnej deklaracji.

W pełnym trybie fizycznym: instancje korpusów i przypisania wykonań, rzeczywisty dla przykładu stan początkowy, skierowane trasy i czasy/prędkości, wymagane zestawy wózków i ich obsada, pojemności wejść/wyjść, blokowanie operatora oraz jawne ilości i czasy dostaw. Dojazdy wielu wózków sekwencyjnie w `equipmentIds`; rezerwacja miejsca docelowego przed wyjazdem; pojemność 0 oznacza bezpośrednie przekazanie. Nie włączać ukrytego JIT, aby uruchomić niekompletne dane.

Jeżeli projekt podstawowy ma demonstrować tryb JIT, README i warunki eksperymentu muszą go wybrać jawnie i wyjaśnić założoną dostępność materiału oraz pominięcie transportu. To odrębny wariant dydaktyczny; zakres fizyczny dla projektów średniego i zaawansowanego pozostaje wymagany. Brak funkcji lub konfiguracji jest jawną luką, nie zerem lub domyślną nieskończoną pojemnością.

W projekcie zaawansowanym co najmniej dwie gałęzie mają rzeczywiste przypisania operacji producentów i odbiorców, ilości/partie/jednostki i zasoby pozwalające na zamierzoną równoległość. Cała partia podzespołu dostępna po końcu producenta, zużycie przypisanej ilości atomowo przy starcie odbiorcy; dostawy przed zużyciem przy równej chwili. Sam graf poprzedników lub strzałki na rzucie nie wystarczają.

## Warianty i odtwarzalność

Co najmniej baza i jedna reorganizacja. Biblioteka 6 obecnie dopuszcza kategorie `baseline`, `additional-worker`, `additional-station`, `changed-layout` i wymaga identycznego `originalJson`; nie dodawać dowolnej kategorii do pliku. Opisać faktycznie zmienione czynniki. Ta sama nazwa procesu lub podobne ID nie potwierdzają zgodności źródła. Nie zmieniać popytu między bazą i reorganizacją i nie deklarować wzrostu przepustowości z samego spadku liczby stanowisk.

Ustawienia eksperymentu nie są dziś automatycznie częścią eksportu biblioteki; kontrakt pakietu zawiera je osobno. Koszty i konfiguracje losowe są opcjonalne, deterministyczny przypadek kontrolny jest obowiązkowy. Nie wymyślać odchylenia standardowego na podstawie samych średnich.

## Referencje do przygotowania w 7.12.B/C

- Liniowy przypadek jednego wyrobu: przy oddzielnych dostępnych zasobach i bez dodatkowych opóźnień starty i końce są sumami poprzednich czasów; nominalna zdolność 3600 / największy jawny efektywny odstęp. Jawnie uwzględnić transport, jeśli włączony.
- Rozgałęzienie: najwcześniejszy start połączenia jest ograniczony końcem każdej gałęzi i dostępnością wszystkich potrzebnych zasobów/ilości; gałąź kończąca się później musi wpływać na start montażu. Pokazać także kontrolę celowo opóźnionego podzespołu.
- Współdzielona osoba: brak nakładających się rezerwacji; żadna zmiana animacji lub prędkości odtwarzania nie może zmienić harmonogramu.
- Bufor i dostawy: kontrolne pary pojemności/polityk oraz opóźnienie pierwszej dostawy mają niezależnie obliczalny wpływ na konkretny start. Ten sam korpus ma jedną lokalizację, a lokalna kontynuacja na tej samej kopii nie powoduje fikcyjnego transportu.

Dokładne liczby i tolerancje powstają przy projektowaniu scenariusza przed uruchomieniem badanego silnika. 7.12.A nie wyznacza jeszcze czasów trzech procesów ani ich wyników.

## Bramka przed generowaniem i odbiorem

Ochronę odzyskiwania 7.6a odebrano po audycie (raport 7.6). Następnie 7.12.A1 (sprawdzony import/export pojedynczego pakietu 4/5/6 i wariantów). Przed odbiorem fizycznych przykładów sprawdzić także A2: zgodność wybranego modelu z widocznym bilansem, layoutem, animacją i raportem; nie podawać wyników aktywnego 4 jako wyników szkicu 6. Jeśli integracja nie istnieje, opisać i wdrożyć potrzebną część osobno, bez fałszywego odbioru 7.12.C/D.

Akceptacja plików: zgodność wersji/manifestu/SHA i limitów, unikalne ID i kompletne referencje, jawne pochodzenie i konfiguracje, brak zewnętrznych zależności, zgodność arkuszy z projektem. Akceptacja UI: czysty profil → plik → podgląd/akceptacja → symulacja → porównanie → raport → pobranie → ponowny import → odświeżenie. Sprawdzić też anulowanie, obce/uszkodzone źródło, konflikt istniejącego szkicu/biblioteki i błąd zapisu bez utraty stanu. Odbiór 7.12.D jest osobny od audytu wykonalności A.
