# Porównywanie zapisanych wariantów — 4.5

Data: 2026-10-16. Status: **wdrożone w zakresie zapisanych wariantów szkicu 6**.

## Zakres

Moduł `src/core/domainVariantComparison.ts` oraz panel `src/components/studio/DomainVariantComparisonPanel.tsx` (osadzony w `DomainDraftPanel.tsx`) realizują punkt 4.5 planu: zapisywanie nazwanych wariantów szkicu 6 (`baseline`, `additional-worker`, `additional-station`, `changed-layout`), przywracanie wariantu do aktywnego szkicu 6 z obsługą historii `Cofnij / Ponów` oraz porównywanie wybranych wariantów przy dokładnie tych samych, jawnych warunkach eksperymentu (`batch`, `arrivalIntervalSeconds`, `transportMode: 'configured' | 'just-in-time'`).

Zapis biblioteki wariantów odbywa się pod osobnym kluczem `layout-studio-domain-v6-variants-v1` (maks. 20 wariantów), odizolowanym od aktywnych projektów 4/5 (`layout-studio-v3`, `layout-studio-scenarios-v3`, `layout-studio-stations-v5`) oraz od pojedynczego zapisu roboczego szkicu 6 (`layout-studio-domain-v6-draft-v1`). Zapisane warianty przechowują dokładny `originalJson` źródła v4/v5 i przechodzą pełną walidację `parseDomainProjectV6`; uszkodzony zapis lub biblioteka z innego źródła nie są nadpisywane automatycznie i udostępniają eksport kopii JSON przed wyczyszczeniem.

## Reguły porównywalności i separacji metryk

- **Wspólne warunki eksperymentu**: wszystkie porównywane warianty są uruchamiane dla tej samej liczby sztuk (`batch`), tego samego odstępu przybycia (`arrivalIntervalSeconds`) i tego samego trybu transportu (`configured` albo `just-in-time`). W UI obliczenia każdego wariantu wykonują się kolejno w tle przez istniejący `schedule.worker.ts` (`startScheduleTask`) z paskiem postępu i możliwością anulowania przebiegu.
- **Kontrola zmienionego czynnika (`inspectVariantFactors`)**: każdy wariant jest porównywany ze wskazanym wariantem bazowym w czterech wymiarach (`process`, `workers`, `stations`, `layout`). Zmiana definicji procesu/czasów/popytu, brak zmian względem bazy albo zmiana czynników spoza zadeklarowanej roli wariantu (`additional-worker`, `additional-station`, `changed-layout`) generują jawne ostrzeżenia porównywalności (`comparabilityWarnings`). Dodanie trasy łączącej nowo dodaną kopię stanowiska bez zmiany tras istniejących kopii jest klasyfikowane jako część zmiany stanowisk (`stations`), natomiast zmiana istniejących tras lub układu hali jako `layout`.
- **Rozdział szacunku statycznego od wyniku dynamicznego**:
  - `summarizeStaticVariant` podaje wyłącznie dane konfiguracyjne (liczbę osób w zespole i rejestrze, aktywne stanowiska i kopie, sumę wybranych czasów operacji `[s/szt.]` bez dzielenia czasu operacji przez liczbę pracowników, maksymalne statyczne obciążenie kopii o jednoznacznym kandydacie, pochodzenie czasów `measured / assumed / mixed` oraz sumę długości tras).
  - Wynik dynamiczny pochodzi wyłącznie z rzeczywistego harmonogramu `scheduleWorkerRun`: `makespanSeconds` i `deltaMakespanSeconds` względem bazy, średnia przepustowość `throughputPerHour [szt./h]` i `deltaThroughputPerHour`, średni czas przejścia sztuki (`averageLeadTimeSeconds`), praca netto (`netProcessingSeconds`), najdłużej pracująca kopia liczona unią przedziałów pracy (`busiestCopy`) oraz jawne założenia przebiegu (`assumptions`).
- **Nierozdzielanie oczekiwań mieszanych (zgodność z 4.4)**: czasy oczekiwań jednoprzyczynowych (`singleCauseWaitSeconds`: `workers`, `transport`, `blocking`, `material`, `calendar`, `other`) są prezentowane oddzielnie od czasu oczekiwań wieloprzyczynowych (`mixedWaitSeconds`), bez arbitralnego dzielenia oczekiwań mieszanych pomiędzy przyczyny.
- **Unieważnianie wyników**: każda zmiana warunków eksperymentu (`batch`, `arrivalIntervalSeconds`, `transportMode`), zmiana wariantu bazowego, zmiana zestawu wybranych wariantów lub modyfikacja/wczytanie aktywnego szkicu 6 natychmiast unieważnia poprzednie zestawienie porównawcze.

## Dowody weryfikacji

Backup przed zmianami: `backup/v0.4.0_przed_4_5_20261016` — 307 plików, manifest `SHA256.txt`.

`node scripts/test.mjs --suite=network '--test-name-pattern=4\.5|4\.4|4\.3c|3\.6|2\.1d'`: **19/19 PASS**, w tym 3 nowe testy 4.5:

- `4.5: porównanie 4 wariantów (bazowy, dodatkowy pracownik, dodatkowe stanowisko, zmieniony layout) przy tych samych warunkach eksperymentu`: weryfikuje cztery warianty w trybie `configured` oraz `just-in-time`, brak dzielenia czasu operacji przez liczbę pracowników (`selectedWorkContentSeconds = 30 s/szt.`), skrócenie makespanu i wzrost przepustowości dla dodatkowego pracownika (`66 s → 62 s`), dodatkowej kopii stanowiska (`66 s → 50 s`) i skróconej trasy layoutu (`66 s → 62 s`, czas ruchów `12 s → 4 s`), oraz brak wpływu samej zmiany długości trasy w trybie JIT (`60 s vs 60 s`);
- `4.5: kontrola warunków eksperymentu wykrywa zmiany wieloczynnikowe i zachowuje nierozdzielanie oczekiwań mieszanych`: weryfikuje ostrzeżenia przy jednoczesnej zmianie pracowników i layoutu, przy braku różnic względem bazy i przy zmianie czasu operacji, zachowanie `mixedWaitSeconds = 14 s` bez dzielenia na przyczyny oraz raportowanie odmowy harmonogramu dla niespójnego wariantu bez przerywania pozostałych wierszy;
- `4.5: izolowany zapis biblioteki wariantów szkicu 6, odzyskiwanie, przywracanie i ochrona źródeł 4/5`: weryfikuje zapis/usuwanie/przywracanie wariantów pod kluczem `layout-studio-domain-v6-variants-v1`, blokadę `expectedRaw`, odmowę mieszania innego `originalJson`, zachowanie uszkodzonego zapisu (`status: 'corrupt'`) do pobrania kopii oraz nienaruszalność kluczy `layout-studio-v3`, `layout-studio-stations-v5` i `layout-studio-domain-v6-draft-v1`.

`npm.cmd run build`: **PASS**, TypeScript i Vite (`dist/assets/schedule.worker-Ab2UGT6J.js`, `dist/assets/index-C9VYy0Vr.js`). Zgodnie z polityką testową `AGENTS.md` pełnej regresji nie uruchamiano (ostatnia pełna regresja: `296/296 PASS` w `4.3c`; obecny punkt jest drugim pakietem od pełnego przebiegu i nie zmienia istniejących schematów ani algorytmu harmonogramowania).

`node tests/qa/verify_4_5.mjs`: **Edge CDP UI PASS** na produkcyjnym buildzie. Zweryfikowano:

- zapis 4 wariantów przez UI (`1. Wariant bazowy`, `2. Dodatkowy pracownik (+W-B)`, `3. Dodatkowe stanowisko (ST-2 kopia 2)`, `4. Zmieniony layout (trasa 800 mm / 2 s)`);
- porównanie 4 wariantów w Web Workerze dla wspólnych warunków (`partia 2 szt., odstęp przybycia 1 s, tryb: skonfigurowany`), poprawność czasów partii (`66 s`, `62 s (-4 s)`, `50 s (-16 s)`, `62 s (-4 s)`), czasu ruchów (`12 s` vs `4 s`) i oddzielenia oczekiwań mieszanych;
- natychmiastowe unieważnienie tabeli wyników po przełączeniu trybu na `just-in-time` i ponowne przeliczenie w trybie JIT;
- wczytanie zapisanego wariantu do aktywnego szkicu 6 (`Wczytaj do szkicu 6`) wraz z weryfikacją przycisków `Cofnij dane szkicu` i `Ponów dane szkicu`;
- zachowanie biblioteki 4 wariantów po przeładowaniu strony (`Page.reload`) oraz pełną izolację aktywnych projektów v4/v5 i `originalJson`;
- zrzut ekranu `outputs/qa/verify_4_5.png` obejrzano i zweryfikowano wizualnie.

Wdrożenia Vercel nie zweryfikowano. Następny punkt planu: **4.6** — zestawianie wydajności, czasu przejścia, WIP, obsady, powierzchni i kosztów przy jawnych stawkach oraz założeniach.
