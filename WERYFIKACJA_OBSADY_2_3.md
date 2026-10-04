# Weryfikacja obsady operacji — punkt 2.3

## Pakiet 2.3a / 2.3.1 — 2026-10-04

Przed zmianą schematu szkicu wykonano kopię `backup/v0.4.0_przed_2_3a_20261004_224147`: 150 plików. Niezależne sprawdzenie SHA256 wszystkich skopiowanych plików względem manifestu: 150 zgodnych, 0 rozbieżności. Kopia nie obejmuje localStorage.

Test na rzeczywistym eksporcie Eko v5 potwierdził, że migracja nie przypisuje operacjom obsady. Starszy szkic bez tego pola zapisał się i ponownie odczytał. Po wpisaniu minimum dwóch pracowników i dwóch pełnych, niezależnych profili dla zespołów 2- i 3-osobowych parser oraz zapis i ponowny odczyt zachowały dokładne wartości 120 s i 113 s. Nie zmieniły dawnego czasu standardowego, referencyjnego profilu, pozostałych operacji, dokładnego źródła v5 ani aktywnego zapisu. Pole o tej samej nazwie w starszym źródle zostało pominięte przy migracji.

Parser i zapis odmówiły minimum równego zero lub ułamkowego, wariantu poniżej minimum, powtórzonej liczebności, profilu z pracą ręczną bez wymaganej obecności oraz obcego pola. Po każdej odmowie poprzedni szkic pozostał identyczny. `npm.cmd run test -- --run`: **95/95**. `npm.cmd run build` (TypeScript i Vite): poprawny.

Pakiet **2.3.1 wdrożony** jako kontrakt i walidacja danych szkicu. Punkt nadrzędny **2.3 w trakcie**: interfejs edycji, Cofnij/Ponów oraz odbiór zbiorczy Eko i silników należą do 2.3.2–2.3.3. Nie przeprowadzano odbioru UI dla tego pakietu, ponieważ nie zmienia on interfejsu. Obsada i warianty nie wpływają jeszcze na aktywną symulację ani rezerwacje pracowników.
