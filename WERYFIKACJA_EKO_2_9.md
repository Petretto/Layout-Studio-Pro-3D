# Weryfikacja scenariuszy Eko — 2.9

Odbiór: 2026-10-08. Zakres zatwierdzony przez użytkownika: 1A wyłącznie testowe deklaracje, 2A rama już istniejąca na wejściu. Docelowo konkretne dane procesu podaje użytkownik. W Eko rama trafia z magazynu na rolotok; test zaczyna po tych czynnościach i nie modeluje ich czasu ani zasobów.

Backup `backup/v0.4.0_przed_2_9b_20261008`: 190 plików, niezależna kontrola SHA256 — 0 rozbieżności. Zmiany ograniczono do fixture, generatora, testów/QA i dokumentacji. Kod produkcyjny, schemat, migracje oraz źródło eksportu Eko bez zmian.

Fixture `tests/fixtures/ekoDomainScenarios.ts` przygotowuje osobną testową konfigurację po walidowanej migracji. Dokładny tekst źródła v5 zachowany. Role, tożsamości, profile obecności, grupy, wspólna kopia i początkowa rama są jawnym zatwierdzonym założeniem testu. Nie tworzy się ich automatycznie dla projektów użytkownika. Wszystkie profile oznaczono jako założone, zachowując czasy standardowe źródła i testowe oznaczenia OP22–OP25.

Generator `node tests/qa/generate_2_9.mjs` zapisuje do `outputs/scenarios/eko_2_9` szkice `parallel.json`, `sequential.json`, `shared-worker.json` i oddzielne pliki `.result.json`. Szkic nie zawiera końcowego stanu zamiast deklaracji wejściowej. Wyniki mają informację, że są wyłącznie testowe.

## Dowody rdzenia

135/135 testów: PASS. Nowe dwa testy obejmują trzy pełne warianty oraz odmowy brakującej ramy i innej lokalizacji bez trasy. Sprawdzono zachowanie 16 operacji, 60 BOM, poprzedników, wszystkich czasów standardowych, dokładnego źródła i aktywnych kluczy 4/5. Wynik odtwarza się po zapisaniu/odczycie. Projekt wejściowy nie jest mutowany.

Przygotowania OP10, OP13–OP17 zaczynają razem w 0 s, OP18 dopiero po OP17 w 1680 s. Żadne przygotowanie nie zajmuje ramy. OP11 startuje w 3480 s, OP12 w 4080 s i kończy w 7670 s. Drzwi równolegle: obie operacje 7670–8270 s; kolejno i wspólna osoba: OP22 7670–8270, OP23 8270–8870 s. Końce jednej sztuki: 13550/14150/14150 s. Ręczne dodanie czasów opisano w kontrakcie; nie są to wartości produkcyjne.

Sprawdzono każdy poprzednik i brak nakładania rezerwacji tych samych osób. Wariant wspólnej osoby raportuje oczekiwanie na pracownika mimo dopuszczającej grupy drzwi; wariant kolejny brak dopuszczenia. Niezależne odtworzenie wszystkich zdarzeń ramy daje ten sam rejestr końcowy. Rama cały czas pozostaje na jednej kopii; brak fikcyjnego przewozu. Brak instancji wejściowej oraz inna początkowa kopia bez zadeklarowanej trasy odmawiają wyniku, bez zmiany danych.

## Build i UI

Build: PASS. Po błędzie EPERM `realpath src/main.tsx` w sandboxie powtórzono dozwolone uruchomienie poza sandboxem — poprawny build 98 modułów. Nie instalowano zależności.

Edge CDP `node tests/qa/verify_2_7e.mjs --eko`, `--eko --sequential`, `--eko --shared-worker`: PASS. Każdy test czyta osobny wygenerowany szkic, oblicza 16 operacji, sprawdza czasy drzwi, podsumowanie i obecność/nieobecność całego zestawu drzwi w inspekcji. Wspólna osoba ma właściwą przyczynę oczekiwania. Zmiana ID grupy/Cofnij/Ponów, ponowny odczyt i identyczny wynik potwierdzone. Usunięcie ramy daje odmowę, Cofnij odtwarza deklarację. Dokładne źródło i aktywne wartości 4/5 zachowane; brak wyjątków JS.

Pierwsze uruchomienie UI zgłosiło różnicę aktywnego zapisu podczas rozruchu. Powtórzenia przeszły; QA pobiera punkt odniesienia po ustabilizowaniu początkowego odczytu i nadal porównuje surowy zapis v5 oraz dane projektu v4. Nie zmieniono ani nie osłabiono kodu zapisu aplikacji. Screenshots `outputs/qa/verify_2_9_parallel.png` i `verify_2_9_shared-worker.png` obejrzano: czytelne czasy, rama, osoba i oczekiwanie. Screenshot wariantu kolejnego również zapisano.

## Status i ograniczenia

2.9.1, 2.9.2 i 2.9 wdrożone w zatwierdzonym zakresie testowania funkcjonalności na Eko. Nie jest to odbiór procesu produkcyjnego; rzeczywiste dane i akceptacja zakładu pozostają w 7.1/7.2. Brak modelowania dostawy magazynowej/wciągania na rolotok, pojemności linii, instancji/zużycia podzespołów i rzeczywistego wyposażenia. Szkic 6 nie steruje aktywną symulacją 4/5. Korpus jest obiektem procesu wskazanym przez użytkownika, a Eko nie narzuca jego rodzaju innym projektom.
