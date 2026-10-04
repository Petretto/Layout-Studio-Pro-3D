# Weryfikacja obsady operacji — punkt 2.3

## Pakiet 2.3a / 2.3.1 — 2026-10-04

Przed zmianą schematu szkicu wykonano kopię `backup/v0.4.0_przed_2_3a_20261004_224147`: 150 plików. Niezależne sprawdzenie SHA256 wszystkich skopiowanych plików względem manifestu: 150 zgodnych, 0 rozbieżności. Kopia nie obejmuje localStorage.

Test na rzeczywistym eksporcie Eko v5 potwierdził, że migracja nie przypisuje operacjom obsady. Starszy szkic bez tego pola zapisał się i ponownie odczytał. Po wpisaniu minimum dwóch pracowników i dwóch pełnych, niezależnych profili dla zespołów 2- i 3-osobowych parser oraz zapis i ponowny odczyt zachowały dokładne wartości 120 s i 113 s. Nie zmieniły dawnego czasu standardowego, referencyjnego profilu, pozostałych operacji, dokładnego źródła v5 ani aktywnego zapisu. Pole o tej samej nazwie w starszym źródle zostało pominięte przy migracji.

Parser i zapis odmówiły minimum równego zero lub ułamkowego, wariantu poniżej minimum, powtórzonej liczebności, profilu z pracą ręczną bez wymaganej obecności oraz obcego pola. Po każdej odmowie poprzedni szkic pozostał identyczny. `npm.cmd run test -- --run`: **95/95**. `npm.cmd run build` (TypeScript i Vite): poprawny.

Pakiet **2.3.1 wdrożony** jako kontrakt i walidacja danych szkicu. Punkt nadrzędny **2.3 w trakcie**: interfejs edycji, Cofnij/Ponów oraz odbiór zbiorczy Eko i silników należą do 2.3.2–2.3.3. Nie przeprowadzano odbioru UI dla tego pakietu, ponieważ nie zmienia on interfejsu. Obsada i warianty nie wpływają jeszcze na aktywną symulację ani rezerwacje pracowników.

## Pakiet 2.3b / 2.3.2 — 2026-10-04

Przed zmianą ścieżki edycji wykonano kopię `backup/v0.4.0_przed_2_3b_20261004`: 152 pliki, niezależnie sprawdzone względem manifestu SHA256, 0 rozbieżności. Kopia nie obejmuje localStorage.

Test edycji szkicu na eksporcie Eko v5 objął zapis minimum, dwóch wariantów, zmianę i usunięcie wariantu, usunięcie całej obsady oraz przywrócenie. Odrzucono wariant przed określeniem minimum, nieznaną operację, wariant poniżej minimum i podwyższenie minimum ponad liczebność istniejących wariantów. Profil referencyjny, stary czas standardowy i pozostałe operacje pozostały niezmienione. Zapis i ponowny odczyt zachowały obsadę oraz źródło. `npm.cmd run test -- --run`: **96/96**; `npm.cmd run build`: poprawny.

Automatyczny odbiór UI w headless Edge (`node tests/qa/verify_2_3b.mjs`) na osobnym profilu przeglądarki potwierdził: minimum 2 osób, profile 120 s dla 2 osób i 105 s dla 3 osób wpisane w minutach, odmowę minimum 4 bez nadpisania szkicu, Cofnij/Ponów, usunięcie wariantu i całej obsady, przywrócenie, ponowne otwarcie oraz niezmienność aktywnych projektów 4/5 i dokładnego źródła szkicu. Zrzut: `outputs/qa/verify_2_3b_staffing.png`. Ponowiony wcześniejszy scenariusz `node tests/qa/verify_2_1e.mjs` przeszedł dotychczasowy edytor profilu referencyjnego, pozostałe edytory, historię, odczyt, odzyskanie i ochronę zapisu.

Pakiet **2.3.2 wdrożony**; punkt **2.3 w trakcie** do odbioru zbiorczego 2.3.3 na Eko i silnikach. Warianty nie są jeszcze wybierane przez aktywną symulację ani nie rezerwują osób.
