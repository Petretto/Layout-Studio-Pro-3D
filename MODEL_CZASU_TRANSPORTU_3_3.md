# Czas transportu — 3.3a / 3.3.1

2026-10-08. Rdzeń roboczego szkicu 6; formularze i szczegółowa inspekcja do 3.3.2.

Trasa stanowisk i deklarowane połączenie zewnętrzne mogą mieć jeden z dwóch opcjonalnych trybów:

- `transportTime`: dotychczasowy wpisany dodatni czas w sekundach, measured/assumed i źródło. Istniejące zapisy zachowują pełny wynik.
- `transportCalculation`: parametry speed, loading, unloading. Każdy ma value, basis measured/assumed i niepuste source. Speed jest dodatnią wartością w mm/s, loading/unloading nieujemnymi czasami w sekundach. Zero obsługi jest jawną deklaracją, nie domyślnym brakiem danych.

Tryby wzajemnie się wykluczają. Brak obu pozostaje brakiem czasu; przy wymaganym przewozie harmonogram odmawia wyniku jak dotychczas. Brak któregokolwiek parametru, nieznane pola, błędne pochodzenie, brak źródła, liczby nieskończone lub przepełnienie powodują odmowę zapisu. Wynik całkowity musi być dodatni, zgodnie z dotychczasowym kontraktem czasu przewozu. Dla tej samej kopii nie powstaje nowy przewóz.

`czas = załadunek [s] + długość [mm] / prędkość [mm/s] + rozładunek [s]`.

Długość pochodzi z jednej zadeklarowanej trasy, ze źródłem i potwierdzeniem. Wynik jest liczony ponownie przy odczycie i wykonaniu; nie ma zapisanego durationSeconds obok parametrów ani automatycznej długości z geometrii. Połączenie station-route nadal korzysta z danych wskazanej trasy, bez własnych parametrów czasu.

Wyliczony czas jest oznaczony **assumed**, również gdy poszczególne parametry są measured: pomiar parametrów nie jest pomiarem całego przewozu. Pochodzenie i źródła wejść pozostają w zapisie. Wynik zwraca durationSeconds, źródło wyliczenia i breakdown: loadingSeconds, travelSeconds, unloadingSeconds.

Harmonogram tworzy nietrwały widok wykonawczy czasu. Cały dotychczasowy przedział przewozu obejmuje teraz sumę załadunku, jazdy i rozładunku. Rezerwacja celu nadal zaczyna się na początku tego przedziału i trwa do końca pracy; nie zmieniono zatwierdzonej reguły z 2.7. Wynik operacji zawiera opcjonalne breakdown dla czasu wyliczanego. Wpisany czas zachowuje dotychczasowy kształt wyniku. Składowe nie są jeszcze osobnymi zdarzeniami lub rezerwacjami; rozszerzone stany należą do 3.6, a dostępność osób/pojazdów transportu do 3.4.

Zapis jest addytywnym rozszerzeniem szkicu 6, bez konwersji starych czasów i bez zmiany wersji. Nowy parser sprawdza oba tryby przy odczycie i zapisie. Źródła 4/5 pozostają dokładne. Aktywna symulacja 4/5 nie otrzymuje nowej reguły. Zgodnie z zatwierdzonym 1A wyliczenie dla trasy zewnętrznej pozostaje wyliczeniem definicji sieci: nie tworzy lokalizacji magazynowej korpusu ani zdarzenia dostawy.

Ręczny przykład testowy (nie domyślne dane aplikacji): 5000 mm / 1000 mm/s + 2 s + 3 s = 10 s; po zmianie długości na 10000 mm wynik to 15 s. Raport: `WERYFIKACJA_CZASU_TRANSPORTU_3_3.md`.
