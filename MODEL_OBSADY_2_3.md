# Obsada operacji i warianty czasu — punkt 2.3

Status 2026-10-05: punkt 2.3 wdrożony w zakresie danych i edycji niekompletnego szkicu schematu 6 po odbiorze pakietów 2.3a–2.3c. Aktywna symulacja nadal używa projektów 4/5.

## Kontrakt danych

Operacja może mieć opcjonalne `staffing`. Brak pola oznacza nieokreśloną wymaganą obsadę. Obiekt zawiera dodatnią, całkowitą `requiredWorkers` jako **minimalną liczbę osób potrzebnych do wykonania operacji** oraz listę `timeVariants`. Pusta lista oznacza, że minimalna obsada jest znana, lecz nie wpisano czasu dla żadnej liczebności zespołu. Żadna z tych liczb nie identyfikuje konkretnych pracowników ani nie rezerwuje zasobów.

Każdy wariant ma unikalne `workerCount` nie mniejsze niż `requiredWorkers` i pełny `timeProfile` zgodny z kontraktem punktu 2.2. Profil wariantu określa czas całkowity, pochodzenie i przedziały pracy ręcznej, automatu oraz wymaganej obecności operatora **dla tej konkretnej liczebności zespołu**. Warianty są niezależnymi, jawnymi danymi; brak wpisu dla danej obsady nie oznacza tego samego czasu co inny wariant. Walidacja odrzuca zero, liczby ułamkowe, duplikaty, wariant poniżej minimum, niepełny lub błędny profil i obce pola. Limit liczby wariantów wynosi 500.

Dotychczasowe `standardTimeSeconds` pozostaje osobnym czasem starego procesu. Opcjonalne `operations[].timeProfile` z punktu 2.2 także pozostaje osobnym profilem referencyjnym, bez przypisanej liczebności zespołu. Nie przelicza się go na wariant, nie dzieli przez `workerCount` i nie zastępuje nim `standardTimeSeconds`. Obsada ustawiona dla stanowiska w schematach 4/5 nie staje się wymaganiem operacji podczas migracji.

## Zgodność i granice

Numer szkicu pozostaje 6; dawne szkice bez `staffing` są czytelne. Migracja z aktywnych projektów 4/5 nie dopowiada obsady ani wariantów. Niezdefiniowane w starszym schemacie pole `staffing` nie przechodzi do szkicu, a dokładne źródło pozostaje zachowane w jego kopercie. Zapis szkicu używa istniejącej walidacji i odmawia nadpisania wcześniejszej wartości przy błędzie.

Obsada i warianty są na razie wyłącznie danymi szkicu. Nie są wybierane przez aktywny bilans ani symulację. Przypisanie osób, kontrola równoczesnych rezerwacji, reguły wyboru wariantu, kalendarz i użycie czasu wariantu w symulacji wymagają późniejszych kroków planu. `modelStatus` pozostaje `incomplete`.

Przed zmianą schematu wykonano kopię `backup/v0.4.0_przed_2_3a_20261004_224147`. Obejmuje 150 plików zgodnych z manifestem SHA256; pomija zależności, build, wcześniejsze kopie, `outputs` i metadane Git. Dane localStorage przeglądarki nie należą do kopii.

## Pakiet 2.3b — edycja w UI

W panelu czasu szkicu 6 można wskazać operację, zapisać lub usunąć jej minimalną obsadę i edytować osobny profil dla liczebności zespołu. Przełącznik odróżnia wariant od profilu referencyjnego bez obsady. Dla istniejących wariantów są przyciski wyboru, a wpisanie nowej liczby pracowników tworzy kolejny wariant po podaniu pełnego profilu. Pola czasu mają jawne jednostki s/min/h i pochodzenie zgodnie z punktem 2.2. Zapis minimum większego niż liczba osób w istniejącym wariancie jest odrzucany; usunięcie minimum usuwa również warianty.

Edycja korzysta z tego samego parsera, odrębnego zapisu szkicu i historii Cofnij/Ponów co pozostałe dane szkicu. Błędny profil lub minimum nie nadpisuje wcześniejszego zapisu. Po przeładowaniu zapisane warianty można ponownie wybrać i edytować. Przed zmianą ścieżki edycji wykonano kopię `backup/v0.4.0_przed_2_3b_20261004` (152 pliki zgodne z manifestem SHA256). Dane localStorage nie należą do kopii.

## Odbiór punktu 2.3 — pakiet 2.3c

Na Eko v4/v5 i przykładzie silników v4 sprawdzono brak obsady po migracji oraz jawne warianty po zapisie i odczycie szkicu. Dokładne źródło, pozostałe dane operacji i pełny wynik dotychczasowej symulacji pozostały identyczne. Odbiór UI potwierdził minimum, dwa warianty, odmowę błędu, historię oraz ponowne otwarcie. Dowody są w `WERYFIKACJA_OBSADY_2_3.md`. Odbiór nie oznacza, że obsada szkicu steruje aktywną symulacją lub rezerwuje osoby.
