# Kompetencje i wykonalność przydziału — 4.3

Data: 2026-10-16. Status 4.3: **w trakcie**. Pakiety 4.3a (rdzeń) i 4.3b (formularz kompetencji szkicu 6) zakończone.

## Decyzja użytkownika i kontrakt

Kompetencje obsady mogą się uzupełniać: każda wymagana kompetencja musi należeć do co najmniej jednej osoby rzeczywiście wybranej do operacji. Suma kompetencji wszystkich dopuszczonych osób nie wystarcza, jeśli żadna obsada wybranej liczebności nie pokrywa wymagań. Nie zmieniamy liczebności ani czasów wariantu.

Opcjonalne `DomainProjectV6.competencyRequirements` zawiera jawny słownik `competencies: {id, name}[]`, przypisania `workers: {workerId, competencyIds}[]` i wymagania `operations: {operationId, requiredCompetencyIds}[]`. ID są stabilne. Parser odrzuca obce/powtórzone referencje, powtórzone definicje i nieznane pola kontraktu. Brak wpisu osoby nie nadaje jej kompetencji. Brak wymagań operacji oznacza brak zadeklarowanego ograniczenia, a nie potwierdzenie uprawnień. Nazwa, pula, geometria i czas nie nadają kompetencji. Usuwanie referencjonowanej osoby/operacji/kompetencji wymaga uprzedniej korekty kontraktu.

To opcjonalne rozszerzenie szkicu 6. Dotychczasowe szkice bez kontraktu zachowują semantykę. Odczyt i zapis zachowują nowy kontrakt, błędny zapis chroni poprzednie dane. Migracja źródeł 4/5 odrzuca przypadkowe pole o tej nazwie jako źródło kompetencji i zachowuje dokładny tekst oryginału. Starsze wersje aplikacji nie mają zagwarantowanej obsługi nowego ograniczenia.

## Kontrola wykonania

`createWorkerRunPlan` sprawdza istnienie zespołu dokładnej wybranej liczebności spośród `eligibleWorkerIds`. Brak zespołu daje komunikat z ID operacji i liczebnością. Limit 10000 kombinacji daje osobny komunikat „wykonalność nierozstrzygnięta”; nie jest dowodem niewykonalności.

`teamCoversCompetencies` filtruje każdą rzeczywiście rozważaną obsadę przed kalendarzami/rezerwacjami w `workerSchedule.ts`, `bufferedProcessSchedule.ts` i `directHandoffPlan.ts`. Dotyczy to także JIT i odbioru przy pojemności 0. Obowiązują dotychczasowe kalendarze, rezerwacje osób, stałe wyposażenie i jawne dopuszczenia kopii. Statyczne pokrycie kompetencji nie dowodzi dostępności czasowej ani globalnej wykonalności procesu. Ten kontrakt opisuje operacje, nie wprowadza kompetencji obsługi transportu bez osobnych jawnych danych.

## Dalsze pakiety

- **4.3b — zakończony:** edytor słownika, kompetencji osób i wymagań operacji; historia, unieważnienie wyniku, czytelna diagnostyka, zapis/reload i odbiór UI. Dowody poniżej.
- **4.3c:** integracja bilansu z dopuszczeniami kopii, wymaganiami wyposażenia i kompetencji. `runLineBalancing` przyjmuje tylko operacje, cel i algorytm; nie ma rejestru osób/wyposażenia. `runStationBalancing` chroni tożsamości zapisanych stanowisk i odmawia nieuzgodnionego przegrupowania. Integracja musi rozdzielić propozycję przydziału, kontrolę wykonalności i zatwierdzenie tożsamości. Nie mapować stanowisk po indeksach; nie przedstawiać niepowodzenia heurystyki jako dowodu braku rozwiązania.

Całe 4.3 pozostaje otwarte; 4.3a nie rozszerza automatycznego bilansowania ani formularzy.

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
