# Weryfikacja kalendarza zasobów — punkt 2.5

## Pakiet 2.5a / 2.5.1 — 2026-10-05

Przed dodaniem modułu i opcjonalnego pola szkicu 6 wykonano kopię `backup/v0.4.0_przed_2_5a_20261005`: 164 pliki. Niezależne sprawdzenie SHA256 względem manifestu: 164 zgodne, 0 rozbieżności. Kopia pomija zależności, build, wcześniejsze kopie, `outputs` i Git; nie obejmuje localStorage przeglądarki.

Test na niezależnym przykładzie silników potwierdził zapis i ponowny odczyt kalendarzy dwóch osób oraz stanowiska. Zmiany 0–100 s i 200–300 s, przerwy 40–60 s i 70–80 s oraz wspólna dostępność zespołu zostały wyliczone zgodnie z ręcznie sprawdzalnymi przedziałami. Wszystkie wpisane czasy testowe oznaczono `assumed`. Starszy szkic bez kalendarza pozostaje poprawny; źródłowy projekt 4 i osobny warsztat 5 pozostały nietknięte. Odrzucono obce ID, nachodzące zmiany, przerwę poza zmianą, ujemny czas i brak pochodzenia bez nadpisania zapisu. `npm.cmd run test -- --run`: **104/104**; `npm.cmd run build`: poprawny.

Punkt **2.5.1 wdrożony** jako kontrakt i niezależne obliczanie dostępności. Punkt **2.5 w trakcie**: harmonogram nadal nie stosuje kalendarza, a UI nie edytuje go jeszcze. Reguła pauzy i wznowienia z tym samym zespołem należy do 2.5.2, zapis/odczyt oraz odbiór UI do 2.5.3.

## Pakiet 2.5b / 2.5.2 — 2026-10-06

Przed zmianą harmonogramu wykonano kopię `backup/v0.4.0_przed_2_5b_20261006` z manifestem SHA256 (167 plików, niezależnie zweryfikowane: 0 rozbieżności). Kalendarze stałego składu i używanych stanowisk są teraz wymagane przez odrębny harmonogram. Test ręcznie sprawdzalny: operacja wymagająca 100 s pracy, przy przerwie osoby 40–60 s i stanowiska 50–70 s, pracuje w przedziałach 0–40 i 70–130 s; rezerwacja osoby oraz kopia stanowiska trwają przez pauzę. Druga sztuka czeka i kończy o 230 s. Dodatkowy scenariusz dwuosobowy zachowuje te same dwie osoby oraz rezerwację 10–110 s przez pauzę 40–70 s. Dwie równoległe sztuki z różnymi osobami zajmują odrębne kopie przez pauzę. Sprawdzono oczekiwanie do pierwszego okna, brak kalendarzy i zbyt krótki horyzont. Dawne scenariusze 2.4 przechodzą z jawnymi kalendarzami bez przerw.

Szkic bez całego pola kalendarzy nadal daje dawny podgląd logiczny, wyraźnie oznaczony w wyniku; częściowy kalendarz odmawia przebiegu kalendarzowego. `npm.cmd run test -- --run`: **105/105**; `npm.cmd run build`: poprawny. Zmiany dotyczą wyłącznie odrębnego harmonogramu szkicu 6 i tekstu jego panelu. Nie zmieniono danych ani silników aktywnych projektów 4/5. UI nie ma jeszcze edytora kalendarzy ani prezentacji pauz; pełny odbiór w przeglądarce należy do 2.5.3. Punkt **2.5.2 wdrożony**, punkt **2.5 w trakcie**.

## Pakiet 2.5c / 2.5.3 — 2026-10-06

Backup `backup/v0.4.0_przed_2_5c_20261006`: 167 plików; niezależna kontrola manifestu kopii wykazała 0 rozbieżności SHA256. Odtwarzanie: najpierw zabezpieczyć aktualny katalog, następnie skopiować wybrane pliki z kopii; nie usuwać zapisów przeglądarki. Kopia nie obejmuje localStorage.

Dodano formularz kalendarzy zasobów po ID: jawne zmiany/przerwy w sekundach od początku przebiegu i pochodzenie potwierdzone/założone. Nowe wiersze mają puste granice; nie dopowiadamy godzin. Zapis korzysta z istniejącej walidacji, kontroli konfliktu szkicu oraz wspólnej historii. Usunięcie pojedynczego kalendarza pozostawia tryb kalendarzowy i brakujące dane; usunięcie wszystkich jawnie przywraca podgląd logiczny. Zmiana szkicu usuwa poprzedni wynik harmonogramu. Wynik prezentuje odcinki pracy, pauzy i granice rezerwacji osób.

`npm.cmd run test -- --run`: 105/105. `npm.cmd run build`: poprawny. `node tests/qa/verify_2_5c.mjs` oraz wariant `--independent` przeszły w Edge headless przez CDP: Eko (syntetyczne czasy i obsada) oraz niezależny dwustopniowy proces pakowania PREP → PACK. Sprawdzono zapis przerwy 40–70 s, odmowę przerwy poza zmianą bez mutacji zapisu, Cofnij/Ponów, kalendarze wszystkich stanowisk, prezentację pauzy w wyniku, dokładny odczyt projektu szkicu po przeładowaniu, usunięcie wszystkich kalendarzy i cofnięcie usunięcia. Projekt 4 oraz dokładny zapis 5 zachowano. Screenshoty: `outputs/qa/verify_2_5c_eko.png`, `outputs/qa/verify_2_5c_packing.png`.

Punkty 2.5.3 i 2.5 wdrożone w zakresie odrębnego szkicu 6. Nie zmieniono schematu, migracji ani aktywnych silników 4/5. Kalendarze są względnymi przedziałami, bez automatycznej powtarzalności zmian lub dat; zgodność z rzeczywistą produkcją pozostaje w 7.1/7.2. Następny punkt 2.6 wymaga określenia kontraktu wyboru stanowisk i wymaganego wyposażenia.
