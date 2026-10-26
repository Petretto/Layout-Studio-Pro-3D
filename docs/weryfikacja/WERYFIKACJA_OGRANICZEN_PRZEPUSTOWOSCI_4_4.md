# Wyjaśnianie ograniczeń przepustowości — 4.4

Data: 2026-10-16. Status: **wdrożone w zakresie obserwacji harmonogramu szkicu 6**.

## Zakres

Moduł `src/core/throughputExplanation.ts` analizuje gotowy wynik harmonogramu bez zmiany danych wejścia, algorytmu, rezerwacji ani wyniku. Panel `ThroughputExplanationPanel.tsx`, osadzony w wyniku `DomainWorkerSchedulePanel.tsx`, grupuje dowody dla pracy technologicznej, obsady, transportu, blokad/buforów i materiałów/podzespołów. Kalendarze oraz pozostałe ograniczenia (kopie, wyposażenie, korpus, zależności i oczekiwanie lokalne) są osobnymi grupami.

Każdy dowód wykonania zawiera sztukę, operację, trwałe ID stanowiska/kopię, opis, czas obserwacji i przejście do właściwego wykonania na Gantcie. Widoczne jest źródło czasu wybranego wariantu operacji: pomiar, założenie lub brak danych. Tabela szczegółowa pokazuje do 50 dowodów w kategorii; agregaty obejmują całość wyniku. Wyniki nie są zapisywane jako dane procesu, nie zmieniają schematu i znikają z poprzednim harmonogramem po edycji lub reloadzie.

## Reguły interpretacji

- Praca netto pochodzi z `workWindows`. Na kopii liczymy unię przedziałów pracy wszystkich wykonań: jawna równoległość nie zwiększa sztucznie udziału zajętości. Suma pracy poszczególnych operacji może być większa od unii pracy kopii. Najdłużej pracująca kopia jest kandydatem do analizy, nie automatycznie potwierdzonym wąskim gardłem. Mianownik udziału: horyzont od 0 do końca ostatniej ukończonej sztuki.
- Dla oczekiwania z jedną zapisaną przyczyną pokazujemy czas tego oczekiwania. Przy kilku kodach zapisanych na wykonaniu nie znamy przedziałów poszczególnych przyczyn. Całe oczekiwanie mieszane liczymy raz w osobnym agregacie; w kategoriach pokazujemy współwystąpienie i liczbę wykonań, bez podziału sekund między przyczyny. Brak kodów trafia do osobnej pozycji „bez zapisanej przyczyny”.
- Materiał i podzespoły obejmują `material` i `subassembly`; nie nadajemy zaopatrzenia z BOM ani nie liczymy magazynierów. JIT ma wyraźne oznaczenie założonej dostępności materiału i pominięcia transportu. Brak takiego oczekiwania w JIT nie jest dowodem braku ograniczenia w rzeczywistości.
- Blokady po pracy pochodzą z `blockedSeconds`. Oczekiwanie lokalne `continuationWaitSeconds` pozostaje odrębne, w grupie pozostałych ograniczeń. Przerwy podczas realizacji są oddzielone od pracy netto i oczekiwania przed startem.
- Czasy ruchów pochodzą z `transportMovements`; gdy ruchów nie ma, wykorzystujemy jawne dane transportu przy wykonaniach. Nie dodajemy tych dwóch źródeł razem. Suma ruchów to czas zdarzeń, nie utrata czasu całej partii ani gwarantowany zysk po zmianie trasy. Dotychczasowa szczegółowa inspekcja transportu pozostaje dostępna.
- Nie sumujemy grup do makespanu i nie przedstawiamy największej sumy jako dowiedzionej głównej przyczyny ograniczenia przepustowości. Współbieżność i wieloprzyczynowość wykluczają takie wnioskowanie. Każda grupa ma opis mechanizmu i wskazanie danych/rezerwacji do sprawdzenia; potwierdzenie wpływu usprawnienia wymaga porównania przy tych samych warunkach (następny punkt 4.5).

Starsze zestawienie 3.6 z równym podziałem czasu pozostawiono obliczeniowo zgodne, lecz poprawiono jego opis: jest to pomocnicza **umowna agregacja**, a nie pomiar czasu każdej przyczyny. Nowy panel korzysta bezpośrednio z dowodów harmonogramu, bez tego podziału. Nie zmieniano reguł produkcyjnych.

## Dowody weryfikacji

Backup przed zmianami: `backup/v0.4.0_przed_4_4_20261016` — 304 pliki, manifest SHA256.

`node scripts/test.mjs --suite=network '--test-name-pattern=4\.4|3\.6|3\.8|3\.5b1'`: **22/22 PASS**, w tym 4 nowe testy 4.4. Zakres:

- oczekiwanie mieszane 12 s przy `workers/material` nie zmienia się w dwa „zmierzone” czasy po 6 s; inne oczekiwanie z samym `workers` zachowuje 7 s;
- nakładająca się praca na kopii ma 10 s unii zamiast 13 s sumy prac operacji; przerwa 3 s, blokada 4 s i lokalne oczekiwanie 2 s pozostają rozdzielone;
- rzeczywiste przebiegi istniejących fixture zaopatrzenia, buforów i fizycznego transportu dają właściwe dowody; blokada po pracy 10 s, transport liczony raz;
- oczekiwanie 9 s bez kodu nie tworzy fikcyjnej przyczyny, a remis kopii i JIT nie tworzą fikcyjnego transportu; wejściowy wynik pozostaje nienaruszony;
- regresje materiału, metryk stanów i Gantta.

`npm.cmd run build`: **PASS**, TypeScript i Vite; ostrzeżenie Vite o chunku ponad 500 kB. Pełnej regresji nie uruchamiano: ostatni pełny odbiór to 296/296 w 4.3c; obecny pakiet dodaje analizę/prezentację gotowego wyniku i nie zmienia harmonogramu ani zapisu.

`node tests/qa/verify_4_3c.mjs --throughput`: **Edge CDP UI PASS** na końcowym buildzie. Rozszerzono istniejący runner o scenariusze wyjaśnień, zachowując jego kontrolę bilansu, historii, workera i izolacji zapisu. Zweryfikowano:

- syntetyczna partia 3 sztuk kończy się w 60 s, kopie mają po 30 s pracy netto; panel pokazuje 7 kategorii i założenia JIT;
- otwarcie dowodów pracy, rozróżnienie czasu założonego i przycisk wskazujący wykonanie `1 · QA-A` na Gantcie;
- syntetyczny zapas początkowy 0, jawna dostawa o 15 s, pobranie 1 sztuki: kategoria materiału pokazuje dowód oczekiwania 15 s przy `QA-A` w przebiegu bez JIT;
- reload usuwa poprzednie wyjaśnienie, dopóki nie wykonano nowego obliczenia; projekty 4/5 i dokładny tekst oryginału pozostają zachowane;
- zrzut `outputs/qa/verify_4_4.png` obejrzano: horyzont, praca kopii, oczekiwania mieszane i grupy są czytelne. Rozwinięcie dowodów i przejście do Gantta potwierdza runner.

Pierwsza próba UI ujawniła błędny kształt syntetycznej dostawy w runnerze; poprawiono fixture do istniejących pól `kind: explicit-deliveries` i `deliveryTimeSeconds`. Nie zmieniano kontraktu produktu, by dopasować go do testu.

Vercel nie zweryfikowano. Zakres 4.4 nie obejmuje automatycznej optymalizacji ani ilościowej prognozy zysku po usunięciu ograniczenia. Następny punkt: 4.5 — porównanie zapisanych wariantów na tych samych warunkach eksperymentu.
