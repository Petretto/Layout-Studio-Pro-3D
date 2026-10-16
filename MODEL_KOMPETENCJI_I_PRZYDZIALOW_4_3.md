# Kompetencje i wykonalność przydziału — 4.3

Data: 2026-10-16. Status 4.3: **wdrożone w opisanym zakresie szkicu 6**. Pakiety 4.3a (rdzeń), 4.3b (formularz) i 4.3c (bilans z dopuszczeniami) zakończone. Historia odbiorów poniżej zachowana.

## Odbiór 4.3c — bilans z dopuszczeniami

Decyzja użytkownika 2026-10-16: bilansowanie dotyczy wyłącznie istniejących, jawnie dopuszczonych kopii stanowisk; bez generowania nowych stanowisk.

`proposeDomainBalance` w `src/core/domainBalancing.ts` tworzy przejściową propozycję. Nie zmienia projektu. Wymaga pełnych dopuszczeń `stationRouting` i wyboru wariantu obsady dla wszystkich operacji. Wymagane wyposażenie i jego możliwości/kopia są walidowane przez istniejący kontrakt dopuszczeń. `createWorkerRunPlan` sprawdza pokrycie kompetencji przez obsadę dokładnej wybranej liczebności. Blokada stanowiska ogranicza wybór do jego trwałego ID; nie blokuje konkretnej kopii. Jawne miejsca zaopatrzenia nie są przenoszone wraz z operacją.

Użytkownik podaje dodatni limit sumy czasów technologicznych na kopię na jedną sztukę. Czas pochodzi z wybranego wariantu obsady, nie z podzielenia przez liczbę osób; UI pokazuje liczbę osób i pochodzenie czasu (pomiar/założenie). To statyczna suma pracy, nie wyliczenie odstępu wyjścia, obciążenia kalendarzowego lub przepustowości. Jawna równoległość wewnątrz kopii może oznaczać, że taki konserwatywny bilans nie znajdzie przydziału, mimo że proces da się zaplanować w czasie.

Operacje gotowe według grafu mają priorytet RPW (suma czasu operacji i unikalnych następców) lub LCR (czas operacji). Wybór dopuszczonych kopii preferuje mniejsze już przydzielone obciążenie; remisy rozstrzygają trwałe ID/kopia. Powrót po nietrafionym przydziale przeszukuje alternatywy. Przypisania zachowują kolejność stanowisk wymaganą przez istniejący walidator ręcznego rejestru; indeks służy wyłącznie sprawdzeniu tej kolejności, nigdy ustalaniu tożsamości. Układ z powrotem do wcześniejszego stanowiska może pozostać poprawny dla dynamicznego routingu, ale nie jest obsługiwany przez tę propozycję ręcznego bilansu.

Wyniki są rozdzielone: propozycja przydziału, brak przydziału spełniającego zadane **statyczne** ograniczenia, albo limit 20000 prób z nierozstrzygniętą wykonalnością. Brak kompetentnej obsady, jawnych dopuszczeń lub poprawnych referencji wyposażenia daje komunikat wymagający korekty danych. Żaden z komunikatów o statycznym bilansie nie jest dowodem globalnej niewykonalności procesu.

`applyDomainBalance` wymaga zgodności bieżącego projektu z dokładną migawką wejścia i ponownie wylicza przydział, odrzucając zmienione/nieaktualne propozycje. Zapis wymaga zaznaczenia przeglądu w UI. Aktualizuje grupy operacji istniejących stanowisk, ustawia ręczne przypisanie oraz zawęża dopuszczenia każdej operacji do pokazanej kopii z jej oryginalnym wyposażeniem. Alternatywy są przywracalne przez wspólne Cofnij/Ponów. Nie ma nowego pola schematu: wynik używa dotychczasowych `stations` i `stationRouting`. Trasy, umiejscowienie wyposażenia, jego ID, geometria i puste stanowiska pozostają zachowane. Odczyt/zapis i źródła 4/5 nie zmieniają modelu; starszy aktywny bilans 4/5 nie jest potajemnie łączony ze szkicem.

Ujawniony przez test blokad problem walidacji rozwiązano przez `domainOperationOrder`: tymczasowe wskaźniki przypisań dla wspólnej kontroli grafu pochodzą z rejestru stanowisk; nie trafiają do zapisu operacji. Harmonogram zwykły, buforowy i wybór kopii odbiorców podzespołów respektują zablokowane ID stanowiska. Planowanie w czasie nadal kontroluje osoby, kalendarze, fizyczne trasy/korpusy, bufory i materiał. Po przyjęciu bilansu wymagany jest nowy przebieg harmonogramu; samo zatwierdzenie nie przenosi fizycznego korpusu ani zasobów.

Backup przed zmianami: `backup/v0.4.0_przed_4_3c_20261016` — 301 plików i manifest SHA256.

Weryfikacja:

- Celowane `node scripts/test.mjs --suite=network '--test-name-pattern=4\.3c|4\.3a|2\.6c|3\.5b2'`: **59/59 PASS**, w tym 7 nowych testów 4.3c. Testy obejmują trwałe ID, wyposażenie/kompetencje, powrót po nietrafionej kopii, poprzedników, blokady, osobne kopie, jawny czas wariantu, brak dopuszczeń, zaopatrzenie, limit poszukiwania, ochronę nieaktualnej/zmienionej propozycji i zapis/odczyt z oryginałem. Pierwsze 5/6 ujawniło problem walidacji blokady w szkicu; po poprawce i dodaniu regresji harmonogramów wskazany podzbiór 59/59.
- Pełna regresja `node scripts/test.mjs --suite=all`: **296/296 PASS**. Uzasadnienie: trzeci pakiet od pełnego odbioru 4.2 i integracja bilansu z wyborem kopii oraz blokadami harmonogramów.
- `npm.cmd run build`: **PASS**, TypeScript/Vite; ostrzeżenie o chunku ponad 500 kB.
- `node tests/qa/verify_4_3c.mjs`: **Edge CDP UI PASS** — RPW/LCR, jawny limit i odmowa przy zbyt małym limicie, wyposażenie i pochodzenie czasu, podgląd bez mutacji, zatwierdzenie po przeglądzie, zachowanie ID/pustego stanowiska/wyposażenia/geometrii/tras, Cofnij/Ponów, rzeczywisty Web Worker w JIT, unieważnienie wyniku, zapis/reload, odmowa kompetencji, izolacja projektów 4/5 i dokładnego tekstu oryginału. Testowe czasy/role/nazwy są jawnie syntetyczne.
- Zrzut `outputs/qa/verify_4_3c.png` obejrzano: tabela przydziałów, czasów/pochodzenia i obciążeń oraz informacja o zawężeniu dopuszczeń i przycisk zatwierdzenia są czytelne.

Vercel nie zweryfikowano. Odbiór 4.3 dotyczy funkcji i ograniczeń powyżej, a nie optymalizacji dynamicznej przepustowości ani automatycznego tworzenia stanowisk. Następny punkt planu: 4.4.

## Decyzja użytkownika i kontrakt

Kompetencje obsady mogą się uzupełniać: każda wymagana kompetencja musi należeć do co najmniej jednej osoby rzeczywiście wybranej do operacji. Suma kompetencji wszystkich dopuszczonych osób nie wystarcza, jeśli żadna obsada wybranej liczebności nie pokrywa wymagań. Nie zmieniamy liczebności ani czasów wariantu.

Opcjonalne `DomainProjectV6.competencyRequirements` zawiera jawny słownik `competencies: {id, name}[]`, przypisania `workers: {workerId, competencyIds}[]` i wymagania `operations: {operationId, requiredCompetencyIds}[]`. ID są stabilne. Parser odrzuca obce/powtórzone referencje, powtórzone definicje i nieznane pola kontraktu. Brak wpisu osoby nie nadaje jej kompetencji. Brak wymagań operacji oznacza brak zadeklarowanego ograniczenia, a nie potwierdzenie uprawnień. Nazwa, pula, geometria i czas nie nadają kompetencji. Usuwanie referencjonowanej osoby/operacji/kompetencji wymaga uprzedniej korekty kontraktu.

To opcjonalne rozszerzenie szkicu 6. Dotychczasowe szkice bez kontraktu zachowują semantykę. Odczyt i zapis zachowują nowy kontrakt, błędny zapis chroni poprzednie dane. Migracja źródeł 4/5 odrzuca przypadkowe pole o tej nazwie jako źródło kompetencji i zachowuje dokładny tekst oryginału. Starsze wersje aplikacji nie mają zagwarantowanej obsługi nowego ograniczenia.

## Kontrola wykonania

`createWorkerRunPlan` sprawdza istnienie zespołu dokładnej wybranej liczebności spośród `eligibleWorkerIds`. Brak zespołu daje komunikat z ID operacji i liczebnością. Limit 10000 kombinacji daje osobny komunikat „wykonalność nierozstrzygnięta”; nie jest dowodem niewykonalności.

`teamCoversCompetencies` filtruje każdą rzeczywiście rozważaną obsadę przed kalendarzami/rezerwacjami w `workerSchedule.ts`, `bufferedProcessSchedule.ts` i `directHandoffPlan.ts`. Dotyczy to także JIT i odbioru przy pojemności 0. Obowiązują dotychczasowe kalendarze, rezerwacje osób, stałe wyposażenie i jawne dopuszczenia kopii. Statyczne pokrycie kompetencji nie dowodzi dostępności czasowej ani globalnej wykonalności procesu. Ten kontrakt opisuje operacje, nie wprowadza kompetencji obsługi transportu bez osobnych jawnych danych.

## Dalsze pakiety — stan historyczny po 4.3a/4.3b

- **4.3b — zakończony:** edytor słownika, kompetencji osób i wymagań operacji; historia, unieważnienie wyniku, czytelna diagnostyka, zapis/reload i odbiór UI. Dowody poniżej.
- **4.3c:** integracja bilansu z dopuszczeniami kopii, wymaganiami wyposażenia i kompetencji. `runLineBalancing` przyjmuje tylko operacje, cel i algorytm; nie ma rejestru osób/wyposażenia. `runStationBalancing` chroni tożsamości zapisanych stanowisk i odmawia nieuzgodnionego przegrupowania. Integracja musi rozdzielić propozycję przydziału, kontrolę wykonalności i zatwierdzenie tożsamości. Nie mapować stanowisk po indeksach; nie przedstawiać niepowodzenia heurystyki jako dowodu braku rozwiązania.

Na tym historycznym etapie całe 4.3 pozostawało otwarte; sam pakiet 4.3a nie rozszerzał automatycznego bilansowania ani formularzy. Aktualny odbiór 4.3c opisano na początku dokumentu.

## Weryfikacja 4.3b — formularz

`DomainCompetencyEditor.tsx` w `DomainDraftPanel.tsx` korzysta z istniejącego `editDomainCompetencies` i wspólnej historii/zapisu szkicu. Nie zmienia schematu ani reguł harmonogramu. Słownik umożliwia dodawanie i zmianę nazw; zapisane ID pozostają stałe. Używaną kompetencję można usunąć dopiero po odznaczeniu jej przypisań i wymagań. Osobny przycisk usuwa całą konfigurację. Niezapisane zmiany można odrzucić. Puste/duplikowane definicje odrzuca walidacja. Przypisania i wymagania są jawnie zaznaczane osobno dla każdej osoby i operacji.

Tabela oceny dotyczy **zapisanych** danych: wskazuje brak zadeklarowanych wymagań, brak wyboru obsady, istnienie zespołu o zadanej liczebności, brak pokrycia lub limit przeszukiwania. Informuje o oddzielnej ocenie kalendarzy/zasobów w harmonogramie oraz o braku integracji z aktywnym automatycznym bilansem 4/5.

Backup: `backup/v0.4.0_przed_4_3b_20261016`, 299 plików i manifest SHA256. Testy `node scripts/test.mjs --suite=network '--test-name-pattern=4\.3a'`: **6/6 PASS**. `npm.cmd run build`: **PASS** (TypeScript i Vite), ostrzeżenie o chunku ponad 500 kB. Pełnej regresji nie uruchamiano: pakiet obejmuje formularz istniejącego kontraktu, bez zmian algorytmu; odbiór dotyczy UI i zależnego rdzenia.

`node tests/qa/verify_4_3b.mjs`: **Edge CDP PASS**. Syntetyczny proces dwóch operacji, dwie osoby o uzupełniających się kompetencjach i jawny wariant dwuosobowy. Sprawdzono: odrzucenie pustych/duplikowanych definicji, zapis kompetencji/wymagań, stałe ID i blokadę usuwania używanych definicji, Cofnij/Ponów, Odrzuć, wynik rzeczywistego Web Workera w JIT, unieważnienie wyniku po zmianie, ocenę i odmowę przy braku pokrycia, reload, usunięcie konfiguracji i cofnięcie usunięcia. Projekty 4/5 oraz dokładny tekst źródła zachowane. Bazę projektu 4 ustalono po standardowym odczycie normalizującym domyślne `layoutMode` i `timeUnit`; dane porównano niezależnie od kolejności kluczy i daty zapisu. Wstępne próby ujawniły błędy przygotowania testu (oczekiwanie na reload, brak jawnego odstępu przybycia, początkowa normalizacja v4); poprawiono runner, bez zmian zachowania produktu.

Zrzut `outputs/qa/verify_4_3b.png` obejrzano: widoczne definicje, zaznaczenia osób/operacji, przyciski i tabela oceny; brak obciętych pól. Test wykonano lokalnie na buildzie. Vercel nie zweryfikowano. Pozostaje 4.3c; status całego 4.3 nie zmienia się na „wdrożone”.

## Weryfikacja 4.3a

Backup: `backup/v0.4.0_przed_4_3a_20261016`, 296 plików i manifest SHA256.

`node scripts/test.mjs --suite=network '--test-name-pattern=4\.3a|2\.4|2\.6c|3\.5b2'`: **58/58 PASS**, w tym 6 nowych testów. Zakres: uzupełniająca się obsada, za mała liczebność, czekanie na kompetentną osobę, zachowanie wyposażenia, przydział buforowy i bezpośredni, rezerwacje bez nakładania, protokół workera (wynik i odmowa), walidacja, migracja 4/5, round-trip zapisu i ochrona poprzedniego zapisu. Pierwszy przebieg: 57/58; poprawiono źródło testu zapisu o jawny `schemaVersion:4`, następnie cały podzbiór 58/58.

`npm.cmd run build`: **PASS**, TypeScript/Vite; ostrzeżenie o chunku ponad 500 kB. Pełnej regresji nie uruchamiano; zastosowano podzbiór zmienionego zachowania i zależności. UI nie zmieniano i nie weryfikowano. Zapis sprawdzono przez rzeczywisty moduł `domainDraftStorage` na pamięciowym porcie storage, nie w przeglądarce. Vercel nie zweryfikowano.
