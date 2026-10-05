# Weryfikacja kalendarza zasobów — punkt 2.5

## Pakiet 2.5a / 2.5.1 — 2026-10-05

Przed dodaniem modułu i opcjonalnego pola szkicu 6 wykonano kopię `backup/v0.4.0_przed_2_5a_20261005`: 164 pliki. Niezależne sprawdzenie SHA256 względem manifestu: 164 zgodne, 0 rozbieżności. Kopia pomija zależności, build, wcześniejsze kopie, `outputs` i Git; nie obejmuje localStorage przeglądarki.

Test na niezależnym przykładzie silników potwierdził zapis i ponowny odczyt kalendarzy dwóch osób oraz stanowiska. Zmiany 0–100 s i 200–300 s, przerwy 40–60 s i 70–80 s oraz wspólna dostępność zespołu zostały wyliczone zgodnie z ręcznie sprawdzalnymi przedziałami. Wszystkie wpisane czasy testowe oznaczono `assumed`. Starszy szkic bez kalendarza pozostaje poprawny; źródłowy projekt 4 i osobny warsztat 5 pozostały nietknięte. Odrzucono obce ID, nachodzące zmiany, przerwę poza zmianą, ujemny czas i brak pochodzenia bez nadpisania zapisu. `npm.cmd run test -- --run`: **104/104**; `npm.cmd run build`: poprawny.

Punkt **2.5.1 wdrożony** jako kontrakt i niezależne obliczanie dostępności. Punkt **2.5 w trakcie**: harmonogram nadal nie stosuje kalendarza, a UI nie edytuje go jeszcze. Reguła pauzy i wznowienia z tym samym zespołem należy do 2.5.2, zapis/odczyt oraz odbiór UI do 2.5.3.
