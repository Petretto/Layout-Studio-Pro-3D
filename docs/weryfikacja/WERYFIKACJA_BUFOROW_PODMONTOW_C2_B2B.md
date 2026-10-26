# 7.12.C2-B2b — zatrzymanie operatora i pojedynczy odbiór bez składowania

Data: 2026-10-26. **Podpakiet odebrany w opisanym zakresie; całe C2-B/7.12 pozostaje w trakcie.** Ocena, implementacja i weryfikacja: Sol, użytkownik potwierdził aktywny model. Workflow: layout-task-router → layout-implementation → layout-verification. Następny B3 wymaga Sol do oceny, implementacji algorytmu i weryfikacji integralności; mechaniczny formularz można wydzielić dla Terra po ustaleniu kontraktu.

## Zakres

`SubassemblyBufferRun` obsługuje wyjście 0 i politykę `bbas`. Przy pełnym wyjściu utrzymuje stanowisko, wyposażenie i — zgodnie z polityką — zespół do odłożenia lub wyjazdu ostatniej oczekującej partii. Nieznany koniec zatrzymania nie jest dostępnością pracownika dla przyszłej operacji lub ruchu. Rezerwacja zatrzymanej osoby zostaje zamknięta rzeczywistym czasem zwolnienia. Powroty czekają na rzeczywistą dostępność przypisanych osób; nie są obiecywane w czasie, w którym producent może się zablokować. `bbas` wymaga obecności od początku do końca operacji; wcześniejsze wyjście lub późniejsze przyjście nie są zastępowane wymyśloną regułą powrotu.

Rejestr ma osobne przejścia do bezpośredniego odbioru. Przy wejściu 0 część nie jest magazynowana; przed wyjazdem zabezpiecza się gotową operację, kopię, wyposażenie, kalendarze, osoby i materiał. Przyjazd jest równy rzeczywistemu startowi i pełnemu pobraniu partii. Zapas i rezerwacja samego bufora 0 wynoszą 0, a przyszły odbiorca ma ochronę w harmonogramie. Reszta na wejściu 0 jest odrzucana, bo pozostawienie jej w takim buforze nie spełnia zatwierdzonego kontraktu reszt.

Monter ostatniej partii z zatrzymanego źródła może wykonać jawnie przydzielony przewóz załadowany, gdy wyjazd zwalnia jego źródło. Nie wolno zwolnić go wcześniej do pustego dojazdu. Dojazd innej jawnej osoby nie skraca zatrzymania operatora źródła. UI dodaje kolumnę **Operator przy blokadzie** i objaśnienie pojemności 0. Inspekcja wykonania pokazuje faktyczne zwolnienie stanowiska, blokadę i rezerwację osób.

Bez zmian konfiguracji zapisu, numeru schematu 6 lub migracji. Wykorzystano istniejące pojemności/polityki. Pole `handoff` i polityka w opisie miejsca są stanem wyniku, nie nowymi danymi projektu. Oryginały i istniejące przykłady pozostawiono bez zmian. JIT nadal pomija fizyczne bufory podmontaży i rezerwacje transportu.

## Referencje niezależne od symulatora

- Producent 0–10 s, odbiorca od 50, trasa 2: wyjazd **48**, przyjazd/start **50**, koniec **60**. Oba bufory 0. Blokada źródła **10–48 =38 s**, monter przy `bbas` zarezerwowany do **48**, przy zwolnieniu do **10**.
- Ta sama osoba przewozi i odbiera: przewóz **48–50**, montaż **50–60**, powrót **60–65**. Drugi producent nie wchodzi w przyszły odbiór/powrót: start **65**, końce wyrobów **60/87**.
- Dodatnie bufory po 2 szt., cztery pełne partie po 2, odbiorca od 50: producent startuje **0/10/20/50**, kończy **10/20/30/60**, zwalnia stanowisko **10/20/50/60**. Przy `bbas` jego trzecia rezerwacja osób trwa do **50**, bez nakładania kolejnych przydziałów. Końce sztuk **60/70/80/90**.
- Powrót wymagający osoby zatrzymanej na pełnym wyjściu: jawne zakleszczenie w **20 s**. Identyczny scenariusz ze zwolnieniem operatora kończy sztuki **60/70**, z powrotami **20–25, 27–32, 52–57**. Nie tworzy się pozornie wolnego terminu po planowanym końcu obróbki.
- Częściowa obecność odbiorcy **53–60** przy starcie **50** jest chroniona przed powrotem; dostawa materiału w **80** przesuwa wyjazd na **78** i koniec wyrobu na **90**. Dostawa jest przed zużyciem przy równym czasie.
- Wzorzec UI jest osobną, zredukowaną syntetyczną próbą na bazie danych C2: producent **0–50**, zatrzymanie do **90**, przewóz **90–100**, odbiorca **100–170**, powrót **170–180**. Jawne ilości 5/5, jawna testowa kwalifikacja montera do obu operacji, korpus już na odbiorcy i brak modułu zaopatrzenia w tej próbie. Nie jest to wynik całego C2 ani pomiar produkcji.

## Weryfikacja

- Backup przed pracą: `backup/v0.4.0_przed_c2_b2b_20261026`, **12 plików**, niezależny odczyt SHA-256 źródeł i kopii **12/12 PASS**, manifest SHA256.txt. Obejmuje moduły, test, plan, kontrakt, instrukcję i dotychczasowe AGENTS.
- Nowe B2b: **15/15 PASS** w końcowym podzbiorze **92/92**. Rejestr zera i odmowa złego czasu/ilości, obie polityki, wspólne osoby, przyszłe rezerwacje, blokowanie dodatniego wyjścia, rzeczywisty martwy punkt, źródło z częściową obecnością, lokalne przekazanie bez ruchu, częściowa obecność odbiorcy, dostawa, C2 z `bbas` i resztami, mieszane polityki, wzorzec UI oraz pusty dojazd. Rozszerzenie testu odmowy obejmuje także bezpośredniego odbiorcę z zatrzymaniem własnej obsady.
- Pełny checkpoint integracyjny uruchomiono z powodu zmian we wspólnych rezerwacjach osób i obsłudze powrotów: sekwencyjnie **109 core +349 network =458/458 PASS**, logi `core.txt`/`network.txt` w `outputs/qa/7_12c2_b2b/`. Ten przebieg był przed ostatnimi ograniczeniami pełnej obecności i dalszego producenta oraz dodatkowym testem dojazdu. Po nich wykonano **92/92 PASS** (`final_scoped.txt`: C2, 3.4m i bufory liniowe 3.5b2a/c). Dodatkowego testu nie przedstawia się jako wykonanego w pełnym 458.
- Dwie początkowe usterki testów (powtórzona nazwa istniejącego helpera i założenie niepustego pola manualWork w fixture) poprawiono w testach. Jedną niezgodność TypeScript przy ponownym użyciu jawnego transportu poprawiono w kodzie; nie zmieniano progów ani zasad procesu dla uzyskania PASS.
- Końcowy typecheck/build PASS, **1987 modułów**; pozostaje dotychczasowe ostrzeżenie fragmentów JS >500 kB.
- Rzeczywisty Edge, izolowany profil: `node tests/qa/verify_7_12c2_b2b.mjs`. Chroniony import z kopią ratunkową, 1 szt./1000 s/configured, wynik **170 s**, blokada **40 s**, rezerwacja osób **0–90**, dwa bufory 0 bez reszt oraz ruchy **90–100/170–180** — PASS. Odświeżenie zachowuje dokładny zapis, ponowne obliczenie odtwarza identyczną inspekcję. Eksport pakietu zachowuje konfigurację oraz dokładny oryginał 4. **0 wyjątków runtime**. Dowody `ui.json` i `direct_zero.png`; screenshot wizualnie sprawdzony, tabela czytelna.
- Instrukcja MD/HTML/PDF zaktualizowana: **65 stron /53 ilustracje**. Kontrola: zgodność HTML ze źródłem PASS, brak brakujących obrazów/sekcji/terminów, pustych stron i słów poza stroną. Oględziny zmienionych stron **1, 4, 28, 29, 30 PASS**; bez ponownego oglądania wszystkich niezmienionych stron. Dwa wcześniejsze ostrzeżenia ekstraktora FontBBox nie spowodowały błędu weryfikacji. Dowód `outputs/qa/manual_7_12c2_b2b/report.json`.
- `node scripts/verify_documentation.mjs`: PASS; nowy raport jest w `docs/weryfikacja/`, główny katalog pozostaje bez nowych raportów i modeli.

## Granice i następny pakiet

Wejście 0: jedna partia, pełne zużycie, korpus już na miejscu lub odbiorca bez korpusu. Bez wspólnego przyjazdu kilku partii/korpusu, lokalnych obu zer, bezpośredniego odbiorcy z równoległością/przezbrojeniem lub z własnym zatrzymaniem operatora. Źródło z `bbas` wymaga pełnej obecności; mieszane polityki skończonych wyjść jednego producenta pozostają odrzucone. Nadal brak skończonych buforów korpusów z gałęziami, formularza konfiguracji, nowych przypisań reszt i animacji ich brył. Te przypadki należą do **B3**, nie do odebranego zakresu B2b. Nie liczono pracy osób magazynowych.

Cały plan **61/72 =84,7%**, pierwsze wydanie **61/68 =89,7%** (`node scripts/plan_progress.mjs`). Główne 7.12 pozostaje w trakcie, bez ułamkowego zwiększania postępu.
