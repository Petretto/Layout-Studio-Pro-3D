# Weryfikacja zasobów transportowych — 3.4

## 3.4b / część 3.4.2 — 2026-10-09

Wybrano 1B. Backup `backup/v0.4.0_przed_3_4b_20261009`: 250 plików, niezależna kontrola SHA256 — 0 rozbieżności.

Dodano `src/core/transportState.ts`: nietrwały rejestr wykonawczy fizycznych wózków, tożsamość istniejącego egzemplarza wyposażenia, początkowa kopia, jawne kalendarze oraz początek/koniec skierowanego ruchu empty/loaded. Chroni przed niewłaściwym miejscem startu, podwójnym zajęciem, nieznanym egzemplarzem, cofnięciem czasu, przedwczesnym/spóźnionym przyjazdem, brakiem czasu/źródła i przejazdem przez przerwę. Przypisanie ruchomego wózka do stałego wyposażenia lub operacji jest odrzucane.

151/151 testów PASS. Trzy nowe testy w `tests/network.test.ts` obejmują ręcznie policzony dojazd A→C (0–5 s), osobny przewóz C→A (5–15 s, 2 + 5000/1000 + 3), jeden stan lokalizacji, brak mutacji deklaracji, odmowy ruchu oraz kalendarze. To dane syntetyczne, nie domyślne wartości aplikacji. Build/typecheck PASS; diff check bez błędów. Nie zmieniono dotychczasowych wyników ani ścieżki aplikacji.

Zakres nie obejmuje parsera/zapisu projektu, rezerwacji osób, przenośników, integracji z harmonogramem/workera lub UI. Brak zmian schematu i potrzeby migracji na tym etapie. Testy UI i ponownego otwarcia nie są dowodem tego pakietu, ponieważ nowy moduł nie jest jeszcze podłączony do aplikacji. Główny 3.4 i 3.4.2 pozostają w trakcie.

Oczekujące decyzje: pozostawanie wózka w celu / powrót do bazy i zakres fizycznych dojść osób. Bez odpowiedzi nie wprowadzamy tych reguł do obliczeń ani trwałego kontraktu. Postęp głównych ID: 23/67 = **34,3%**, pierwsze wydanie 23/65 = **35,4%**.

## Doprecyzowanie 3.4c — 2026-10-09

Użytkownik wyjaśnił, że chodzi o transport międzyoperacyjny montażu. Czas pracy i rezerwacje operatorów magazynu nie należą do modelu; zaopatrzenie ma uwzględniać częstotliwość dostaw zapewniającą ciągłość produkcji. Zaktualizowano kontrakt, główne opisy 3.4/3.5 i AGENTS.md; zachowano wcześniejsze wpisy jako historię. Do oceny częstotliwości potrzebne są jawne dane zapasu, zużycia i ilości/terminów uzupełnienia. Moduł transportState pozostaje niezależny i niepodłączony. Nie zmieniono kodu, zapisu ani wyników aplikacji; ponowne testy UI/build nie są potrzebne dla tej korekty dokumentacji. Sprawdzono diff i licznik planu. Postęp 23/67 = 34,3%, pierwsze wydanie 23/65 = 35,4%.

## 3.4d / 3.4.2 — 2026-10-09

Backup `backup/v0.4.0_przed_3_4d_20261009`: 252 pliki, niezależna kontrola SHA256 — 0 rozbieżności. Dodano assemblyTransport.ts, domainTransportEditing.ts, walidację opcjonalnego pola w domainProject.ts, filtrowanie niezweryfikowanego pola przy migracji i odmowę scheduleWorkerRun do integracji 3.4.3. Kontrakt szczegółowo w MODEL_ZASOBOW_TRANSPORTU_3_4.md.

155/155 testów PASS, build/typecheck PASS. Cztery nowe testy obejmują zapis/odczyt ze źródeł 4 i 5 z dokładnym originalJson, brak mutacji, usuwanie kontraktu, ochronę istniejącego zapisu przy złej kopii, brak polityki/źródła/czasu dojazdu, obce i powtórzone referencje/zestawy, usunięcie używanego wyposażenia/trasy, konflikt stałego egzemplarza, skierowane końce przenośnika, jawną odmowę harmonogramu i protokołu workera oraz identyczny dawny wynik po usunięciu kontraktu. Testy mają wyłącznie dane syntetyczne.

Edge CDP `verify_2_7e.mjs --branches --calculated --transport-contract` (5220/9360): PASS — nowy zapis jest odczytywany, worker zgłasza 3.4.3 bez pozornego wyniku, odświeżenie zachowuje kontrakt i źródło, aktywne 4/5 bez zmian, brak nieobsłużonych wyjątków JS. Regresja `--branches --material --calculated` (5221/9361): PASS — stare trasy, harmonogram, historia i odczyt zachowane.

Status 3.4.2: wdrożone dla parsera, referencji i zapisu. Ograniczenia: brak edytora nowego kontraktu (3.4.4), brak wykonania jego reguł i rezerwacji (3.4.3); obecność nowego pola jawnie odmawia harmonogramu, zamiast je ignorować. Dostawy i częstotliwość uzupełnienia materiału pozostają w 3.5/3.6, bez czasu pracy magazynierów. Cały 3.4 pozostaje w trakcie. Postęp 23/67 = 34,3%, pierwsze wydanie 23/65 = 35,4%.

## 3.4e / pierwszy zakres 3.4.3 — 2026-10-09

Backup `backup/v0.4.0_przed_3_4e_20261009`: 254 pliki, niezależna kontrola SHA256 — 0 rozbieżności. Dodano assemblyMovement.ts, bez zmian schematu lub aktywnej kolejki harmonogramu.

159/159 testów PASS, build/typecheck PASS. Cztery nowe testy sprawdzają wspólne ID osoby montażowej, konflikt z montażem 0–10 s i przewóz 10–12 s (10 s oczekiwania, nadal 2 s przewozu), przyszłą rezerwację 1–8 s oraz przerwę 1–8 s przesuwające ruch na 8–10 s. Sekwencja jawnego dojazdu 0–5 s i przewozu 5–7 s zachowuje położenie i rezerwacje bez teleportacji. Nie ma niejawnego powrotu. Testy obejmują brak wspólnego okna, kalendarza lub źródła obsady dojazdu oraz błąd ID rezerwacji bez publikowania połowy przydziału. Zakończenie z aktualnymi książkami zachowuje kolejną rezerwację montażu 12–15 s. Wszystkie dane są syntetyczne.

Ograniczenia: rdzeń obsługuje jawnie wybraną alternatywę jednego wózka i pojedynczy odcinek. Nie wykonuje automatycznego wyboru zestawów, przenośników, powrotów afterUnload ani kolejki zdarzeń korpusu. Żądanie dojazdu ma jawny przydział osób ze źródłem; nie wprowadzono domyślnej obsady ani magazynierów. Integracja zapisu obsady dojazdu, harmonogramu/workera i UI pozostaje do kolejnych zakresów. Guard obecnego harmonogramu nadal działa. UI i zapis nie zostały zmienione; odbiór UI tego rdzenia nie jest deklarowany. Status całego 3.4.3: w trakcie. Postęp 23/67 = 34,3%, pierwsze wydanie 23/65 = 35,4%.

## 3.4f / integracja przewozu w 3.4.3 — 2026-10-09

Backup `backup/v0.4.0_przed_3_4f_20261009`: 255 plików, niezależna kontrola SHA256 — 0 rozbieżności. Dodano assemblyDispatch.ts; workerSchedule.ts publikuje tylko wybrany przydział, wspólny rejestr osób, konkretne urządzenia i zdarzenia przyjazdu wózka. DomainWorkerSchedulePanel.tsx pokazuje osoby/urządzenia i aktualny zakres.

162/162 testy PASS, build/typecheck PASS. Nowe testy obejmują pełny przewóz wózkiem 10–12 s przed operacją, brak nakładających rezerwacji osoby montażowej, faktyczną końcową lokalizację ST-C i niezmienność projektu. Wynik workera jest w całości zgodny z wynikiem synchronicznym. Alternatywa przenośnik + druga osoba wygrywa z wózkiem wymagającym osoby na przerwie; przegrany wózek zachowuje początkowe miejsce i nie ma rezerwacji. Jawny brak urządzeń umożliwia obsługę dwóch korpusów bez zwiększania czasu przewozu. Brak wymagań użytej trasy i brak dojazdu wózka dają odmowę. Dotychczasowy test ogólnej odmowy kontraktu zastąpiono odmową nadal nieobsłużonego powrotu return-to-initial.

Edge `verify_2_7e.mjs --branches --calculated --transport-run` (5222/9362): PASS — worker rzeczywiście wykonuje transport, UI pokazuje przydział W i końcowe miejsce korpusu, zapis/odczyt zachowuje wynik i dokładne źródło oraz 4/5, brak nieobsłużonych wyjątków JS. Zrzut `outputs/qa/verify_3_4f_transport.png`. `--transport-contract` (5223/9363): PASS — jawna odmowa nieobsłużonego powrotu bez pozornego wyniku. Regresja `--branches --material --calculated` (5224/9364): PASS — stary harmonogram, historia i odczyt zachowane. Testy są syntetyczne.

Status całego 3.4.3: w trakcie. Ograniczenia: fizyczny transport podzespołów, dojazdy/powroty w kolejce i wiele wózków w jednym zestawie nie są jeszcze wykonywane. Formularz kontraktu pozostaje w 3.4.4. Praca magazynierów i dostawy zapasu nie zostały włączone do tego harmonogramu. Postęp 23/67 = 34,3%, pierwsze wydanie 23/65 = 35,4%.


## 3.4g / dojazdy i powroty w 3.4.3 — 2026-10-09

Backup `backup/v0.4.0_przed_3_4g_20261009`: 256 plików, niezależna kontrola SHA256 — 0 rozbieżności. 166/166 testów PASS; build/typecheck PASS. Cztery nowe testy obejmują dojazd 10–15 s, przewóz 15–17 s i brak przejęcia korpusu/celu podczas dojazdu; powrót 22–27 s odłożony przez montaż tej samej osoby; dwa korpusy bez nakładania ruchów i rezerwacji; zapis/odczyt jawnej obsady, nieznane ID i odmowę wykonania starszej trasy bez obsady. Dane syntetyczne, projekt wejściowy zachowany.

Edge CDP `verify_2_7e.mjs --cart-run --approach` (5225/9365) oraz `--cart-run --return` (5226/9366): PASS. Rzeczywisty worker, osobne ruchy w inspekcji UI, końcowe miejsca korpusu/wózka, odświeżenie i zapis/odczyt z zachowaniem dokładnego źródła oraz aktywnych 4/5; brak nieobsłużonych wyjątków JS. Zrzuty `outputs/qa/verify_3_4g_approach.png` i `outputs/qa/verify_3_4g_return.png` sprawdzone wizualnie.

Zakres 3.4g zakończony; całe 3.4.3 pozostaje w trakcie (transport podzespołów i wiele wózków w zestawie). Formularz kontraktu pozostaje w 3.4.4. Postęp 23/67 = 34,3%, pierwsze wydanie 23/65 = 35,4%. Git push nie stanowi dowodu wdrożenia Vercel.


## 3.4h / zestaw wielu wózków — 2026-10-09

Backup `backup/v0.4.0_przed_3_4h_20261009`: 256 plików, niezależna kontrola SHA256 — 0 rozbieżności. 169/169 testów PASS; build/typecheck PASS. Trzy nowe testy syntetyczne: przerwa drugiego wózka przesuwa cały przewóz na 15–17 s; niewykonalny zestaw nie rezerwuje żadnego urządzenia i może przegrać z jawną alternatywą; wspólny przewóz 10–12 s i powroty 22–27 oraz 27–32 s z tą samą osobą bez nakładania rezerwacji. Jeden ruch korpusu, faktyczne położenia obu wózków, niezmienność projektu i zgodność workera z wywołaniem synchronicznym. Brak wspólnego okna i wózek poza początkiem trasy dają jawną odmowę.

Edge CDP `verify_2_7e.mjs --cart-run --return --multi-cart` (5227/9367): PASS — rzeczywisty worker, oba urządzenia w przewozie, dwa osobne powroty, końcowe lokalizacje, identyczny wynik po ponownym odczycie, zachowanie aktywnych 4/5 i dokładnego originalJson, brak nieobsłużonych wyjątków JS. Zrzut `outputs/qa/verify_3_4h_multi_cart.png` sprawdzony wizualnie. Schemat i formularze nie zmienione; odbiór edycji/historii nowego kontraktu pozostaje w 3.4.4.

Zakres 3.4h zakończony. Całe 3.4.3 w trakcie: transport podzespołów oraz dojazd zestawu wielu wózków pozostają do integracji. Praca magazynierów nie jest liczona. Postęp 23/67 = 34,3%, pierwsze wydanie 23/65 = 35,4%. Wdrożenie Vercel nie zostało zweryfikowane.


## 3.4i / edytor wymagań tras — 2026-10-09

Backup `backup/v0.4.0_przed_3_4i_20261009`: 256 plików, niezależna kontrola SHA256 — 0 rozbieżności. 169/169 testów regresji PASS; build/typecheck PASS. Dodano DomainTransportEditor.tsx i podłączono istniejący editDomainAssemblyTransport do wspólnego zapisu/historii DomainDraftPanel. Schemat, migracja i algorytm harmonogramu bez zmian.

Edge CDP verify_2_7e.mjs: `--cart-run --return --transport-editor` (5228/9368), `--branches --calculated --transport-run --transport-editor` (5229/9369), `--cart-run --transport-editor --editor-new` (5230/9370): PASS. W pierwszym procesie zachowano istniejący wózek/politykę i wykonano jego powrót; drugi proces ma gałęzie montażowe; trzeci tworzy nowy kontrakt i regułę trasy przez formularz. Testy obejmują źródło reguły, wybór trasy i osoby, dodanie zestawu, jawne braki, odmowę błędnego źródła i niepotwierdzonego pustego zestawu bez zmiany zapisu, Cofnij/Ponów, odrzucenie niezapisanej zmiany, usunięcie zestawu i odtworzenie go, odświeżenie/ponowny odczyt z identycznym wynikiem rzeczywistego workera. Aktywne 4/5 i dokładny originalJson zachowane, brak nieobsłużonych wyjątków JS. Dane syntetyczne.

Pierwsza weryfikacja wykryła kasowanie potwierdzeń pozostałych pustych zestawów przy usuwaniu jednego wpisu. Poprawiono przenumerowanie stanu potwierdzeń; wszystkie trzy scenariusze ponownie poprawne. Zrzuty `outputs/qa/verify_3_4i_{cart,branches,new}.png` sprawdzone wizualnie, osobne zrzuty wyników `verify_3_4i_worker_{cart,branches,new}.png`.

Pakiet 3.4i zakończony; całe 3.4.4 w trakcie. Nie ma jeszcze formularzy deklaracji urządzeń, ich kalendarzy, lokalizacji, polityk i pustych tras. Ograniczenia wykonania podzespołów i dojazdów wielu wózków z 3.4.3 zachowane. Postęp 23/67 = 34,3%, pierwsze wydanie 23/65 = 35,4%. Git push nie potwierdza wdrożenia Vercel.


## 3.4j / pełny edytor kontraktu — 2026-10-12

Backup `backup/v0.4.0_przed_3_4j_20261012`: 257 plików, niezależna kontrola SHA256 — 0 rozbieżności. 169/169 testów regresji PASS; build/typecheck PASS (końcowy build 106 modułów). Dodano TransportResourceFields.tsx, rozszerzono DomainTransportEditor.tsx. Kontrakt, migracja i algorytm harmonogramu bez zmian; zapisy korzystają z istniejącego editDomainAssemblyTransport i wspólnej historii szkicu.

Edge CDP verify_2_7e.mjs: `--cart-run --return --transport-resources --resource-new` (5231/9371), `--cart-run --return --transport-resources` (5233/9373), `--branches --calculated --transport-run --transport-resources` (5232/9372): PASS. Pierwszy przypadek tworzy przez UI od pustego kontraktu wózek, jego kalendarz/politykę, regułę przewozu i pustą trasę z wpisanym czasem/obsadą. Potem edytuje przerwę, źródło i czas wyliczony 5000 mm / 1000 mm/s + jawne zera = 5 s. Drugi edytuje istniejące dane. Gałęzie obejmują przenośnik z kalendarzem, skierowane końce i przydział do trasy. Wszystkie dane syntetyczne.

Odmowy bez zmiany zapisu: brak polityki, niepoprawna przerwa, niepotwierdzona droga, niepotwierdzony brak osób, nieprawidłowe końce przenośnika i duplikat urządzenia. Jawny brak osób pustego ruchu zapisuje się, po czym można przywrócić osobę. Cofnij/Ponów odtwarza urządzenia, kalendarze, puste trasy i referencje zestawów; odrzucenie odświeża formularz. Używanego urządzenia nie można usunąć ani zmienić jego egzemplarza; po zwolnieniu referencji można usunąć przenośnik i odtworzyć go historią. Pustą trasę można usunąć i przywrócić. Zapis/odczyt ma identyczny wynik rzeczywistego workera; dokładny originalJson oraz aktywne 4/5 zachowane; brak nieobsłużonych wyjątków JS.

Podczas weryfikacji zidentyfikowano możliwość zablokowania korekty nowego duplikatu używanego egzemplarza; poprawiono blokadę tylko dla jednoznacznej deklaracji i ponowiono odbiór na końcowym buildzie. Jeden wcześniejszy przebieg gałęzi zgłosił zmianę aktywnego zapisu 4/5. Dodano diagnostykę różnic; kolejne dwa przebiegi oraz końcowy odbiór były poprawne, bez odtworzenia tego błędu. Pierwszy test duplikatu został omyłkowo uruchomiony przed zakończeniem nowego builda; końcowy test po ukończeniu builda PASS.

Zrzuty UI `outputs/qa/verify_3_4j_new.png`, `verify_3_4j_branches.png`, `verify_3_4j_empty_new.png` sprawdzone wizualnie. Zachowano również przypadek cart, jego pustą trasę oraz osobne wyniki worker_{new,cart,branches}. 3.4.4 wdrożone w zakresie edytora/inspekcji istniejącego kontraktu. Całe 3.4 nadal w trakcie przez zakres 3.4.3 (podzespoły i dojazdy wielu wózków). Postęp 23/67 = 34,3%, pierwsze wydanie 23/65 = 35,4%. Wdrożenie Vercel nie zostało potwierdzone.


## 3.4k / kolejne dojazdy zestawu — 2026-10-12

Użytkownik wybrał „Zawsze kolejno, według kolejności wózków w zapisanym zestawie”; decyzja zapisana również w AGENTS.md. Backup `backup/v0.4.0_przed_3_4k_20261012`: 258 plików, niezależna kontrola SHA256 — 0 rozbieżności. Rozszerzono assemblyDispatch.ts i opis/zmianę kolejności w DomainTransportEditor.tsx. Schemat, migracja i struktura zapisanych projektów bez zmian.

173/173 testy PASS; build/typecheck PASS. Cztery nowe testy syntetyczne: rozłączne osoby nadal dają dojazdy 10–15 i 15–23 s, wspólny przewóz 23–25 s; odwrócenie urządzeń daje 10–18 i 18–23 s; wspólna osoba/przerwa drugiego wózka przesuwają drugi dojazd na 20–28 s i przewóz na 28–30 s. Wózek już przy odbiorze pomija dojazd. Brak drogi lub wspólnego okna odmawia wyniku; wybrana alternatywa bez urządzeń nie przejmuje wózków przegranego zestawu. Partia dwóch korpusów kończy się bez nakładania wspólnych urządzeń/osób; oba wózki mają rzeczywiste końcowe miejsca. Cel i korpus przejmowane od wyjazdu z wyrobem, nie od dojazdu. Projekt wejściowy zachowany, worker zgodny z wywołaniem synchronicznym.

Edge CDP `verify_2_7e.mjs --cart-run --approach --multi-cart --sequential-approach` (5234/9374) i ten sam z `--reverse-approach` (5235/9375): PASS. Odwrócenie kolejności wykonane przyciskiem formularza, zapisane i sprawdzone przez Cofnij/Ponów. Rzeczywisty worker, dwie osobne pozycje dojazdu, późniejszy wspólny przewóz, końcowe miejsca, identyczny wynik po odczycie, zachowane aktywne 4/5 oraz dokładny originalJson, brak nieobsłużonych wyjątków JS. Zrzuty `outputs/qa/verify_3_4k_ordered.png` i `verify_3_4k_reverse.png`. Zrzut ordered sprawdzony wizualnie.

Zakres 3.4k zakończony; całe 3.4.3 pozostaje w trakcie przez fizyczny transport podzespołów. Nie zmieniono reguł magazynu ani zapasów. Postęp 23/67 = 34,3%, pierwsze wydanie 23/65 = 35,4%. Wdrożenie Vercel nie zostało potwierdzone.

## 3.4l — JIT, odbiór 2026-10-12
Backup `backup/v0.4.0_przed_3_4l_20261012`: 258 plików, niezależna kontrola SHA256 PASS. `npm.cmd run test -- --run`: 176/176 PASS. `npm.cmd run build`: typecheck i build PASS. Test porównawczy: 22 s z przewozem i 20 s JIT, bez zmiany wejścia i bez fizycznego stanu korpusów w wyniku; worker daje ten sam wynik. Bez tras/transportów/korpusów JIT działa; kalendarz montażu i brak podwójnej rezerwacji pracowników pozostają sprawdzane.
Edge CDP: `verify_2_7e.mjs --cart-run --return --jit-run`, dodatkowo `--jit-unconfigured`, oraz `--branches --calculated --transport-run --jit-run`: PASS. Domyślnie OFF, przełączenie czyści wynik, OFF odtwarza wynik skonfigurowany, reload przywraca OFF, ponowne JIT daje identyczny wynik. Zapisy szkicu i źródła oraz danych 4/5 bez zmian, brak wyjątków. Zrzuty `outputs/qa/verify_3_4l_{configured,unconfigured,branches}.png`; wizualny odbiór wariantu bez konfiguracji PASS.
Zakres: opcja w harmonogramie szkicu 6; nie jest prognozą braków materiałowych ani weryfikacją dostaw. Fizyczny transport podzespołów nadal do integracji. Push nie potwierdza wdrożenia Vercel.


## 3.4m1 — kontrakt partii, 2026-10-12
Backup `backup/v0.4.0_przed_3_4m1_20261012`: 258 plików, niezależna kontrola SHA256 PASS. 179/179 testów PASS, build/typecheck PASS. Sprawdzono roundtrip kontraktu, brak mutacji wejścia, usunięcie kontraktu, błędne/powtórzone ID, role i referencje, ilości, jednostkę, źródło, numery wykonań i odmowę innych reguł czasowych. Zapisy na źródłach 4/5, odczyt, cofnięcie/ponowienie przez API i odrzucony zapis chronią dokładne oryginały i poprzedni raw; uszkodzony raw pozostaje odzyskiwalny. Worker odmawia niepodłączonego fizycznego przepływu, JIT działa.
Edge: `verify_2_7e.mjs --cart-run --return --jit-run --subassembly-contract` na 5239/9379 PASS: odczyt kontraktu, komunikat 3.4m2, przełączenie JIT/wynik 20 s, powrót do jawnej odmowy, reload, identyczny zapis i źródło, izolacja danych 4/5, brak wyjątków. Zrzut `outputs/qa/verify_3_4m1_configured.png`. Formularza partii nie ma w tym pakiecie. Fizyczne zdarzenia/transport/zużycie pozostają do 3.4m2; UI do 3.4m3. Całe 3.4.3/3.4 nadal w trakcie. Push nie potwierdza wdrożenia Vercel.


## 3.4m2 — zdarzenia partii, 2026-10-12
Backup `backup/v0.4.0_przed_3_4m2_20261012`: 260 plików, niezależne SHA256 PASS. 188/188 testów, build/typecheck PASS. Syntetyczny przebieg 10 s przygotowania + 2 s przewozu + 10 s montażu: zdarzenia 10/10/12/12 s, koniec 22 s. Wspólna osoba montażu i powrotu: pobranie przy faktycznym starcie 17 s, koniec 27 s. Dwie partie, dwie sztuki, lokalne pobranie, czas bez zasobów, dojazd, przerwa urządzenia, transport pomiędzy przygotowaniami bez korpusu, worker, niezmienność wejścia i JIT: PASS. Kontrole nakładania urządzeń/osób, brak trasy/partii, wykonanie poza partią, wiele kopii i zakleszczenie przez producenta zależnego od odbiorcy: PASS/wyjaśniona odmowa. Testy kontraktu 3.4m1 zaktualizowano: guard integracji zastąpiono aktywnym przebiegiem, brak wymaganych korpusów nadal daje odmowę.
Edge CDP: `verify_2_7e.mjs --cart-run --jit-run --subassembly-contract` i wariant `--return` na 5240/9380 oraz 5241/9381: PASS. Rzeczywisty worker, koniec 22/27 s, inspekcja wytworzenia/przyjazdu/pobrania i przewóz podzespołu, JIT 20 s, OFF odtwarza fizyczny wynik, reload i identyczny zapis/źródło oraz izolacja 4/5, brak wyjątków. Zrzuty `outputs/qa/verify_3_4m2_transfer.png`, `verify_3_4m2_return.png`, `verify_3_4m2_jit_configured.png`; odbiór wizualny wariantu powrotu PASS.
Ograniczenia: jedna kopia odbiorcy, brak pojemności buforów/dzielenia partii/ponownego wykorzystania pozostałej ilości; edytor partii jeszcze nie istnieje. Całe 3.4.3/3.4 nadal w trakcie. Do dalszych zakresów: wybór wielu kopii 3.4m2b i formularz 3.4m3. Push nie potwierdza wdrożenia Vercel.


## 3.4m2b — wiele kopii odbiorcy, 2026-10-12
Backup `backup/v0.4.0_przed_3_4m2b_20261012`: 261 plików, niezależna kontrola SHA256 PASS. 194/194 testów, build/typecheck PASS. Sprawdzono wcześniejszy start alternatywnej kopii (koniec 21 s zamiast 22 s), kalendarz odbiorcy ważniejszy niż krótszy przewóz, remis/drogę/kolejność kandydatów, brak rezerwacji przegranej trasy, niewykonalną alternatywę i odmowę wszystkich wariantów, kilka partii do jednego wspólnego celu, wpływ przewozu korpusu i różne cele dwóch sztuk, zgodność workera, nienaruszone wejście, limit >64 oraz JIT poza limitem. Regresja pojedynczych kopii i wcześniejszych zakresów PASS.
Edge: `verify_2_7e.mjs --cart-run --jit-run --subassembly-contract --subassembly-copies`, drugi przebieg z `--recipient-calendar`, porty 5242/9382 i 5243/9383: PASS. Rzeczywisty worker wybrał ST-D z końcem 21 s, a po zmianie kalendarza ST-C z końcem 22 s. Inspekcja partii i ruchów, przełączenie JIT/OFF, identyczny wynik po reload, izolacja zapisów i dokładnego źródła 4/5, brak wyjątków: PASS. Zrzuty `outputs/qa/verify_3_4m2b_fastest.png`, `verify_3_4m2b_calendar.png` i `verify_3_4m2b_jit_configured.png`; wizualny odbiór fastest PASS.
Ograniczenia: najwyżej 64 kombinacje przypisań, brak pojemności buforów i ponownego wykorzystania pozostałej ilości; edytor partii pozostaje do 3.4m3. Jest to deterministyczne porównanie według startu/tras, nie globalna optymalizacja czasu końca partii. Git push nie potwierdza wdrożenia Vercel.


## 3.4m3 — formularz i zamknięcie 3.4, 2026-10-12
Backup `backup/v0.4.0_przed_3_4m3_20261012`: 261 plików, niezależne SHA256 PASS. 194/194 testów regresji i build/typecheck PASS. Schemat i klucz zapisu bez zmian. Nowy formularz korzysta ze zweryfikowanego parsera/API i wspólnego zapisu/historii.
Edge CDP na 5244/9384: `verify_2_7e.mjs --cart-run --return --jit-run --subassembly-contract --subassembly-editor --subassembly-new`; na 5245/9385: `--cart-run --jit-run --subassembly-contract --subassembly-copies --subassembly-editor`. Oba PASS: pusty start bez domyślnych ilości/numerów/jednostki/źródła, utworzenie i edycja, odmowa nadmiernego pobrania/duplikatu/pustej listy, brak zmiany zapisu przy błędzie, Odrzuć, usunięcie kontraktu, Cofnij/Ponów i reload formularza. Proces przygotowanie → montaż z korpusem oraz przygotowanie → przygotowanie z wyborem kopii dają rzeczywiste wyniki 27 i 21 s; JIT daje 20 s. Zapis zmiany partii usuwa stary wynik i resetuje JIT, a Cofnij odtwarza identyczny wynik. Zapis szkicu, dokładne źródła 4/5 i projekty 4/5 pozostają odizolowane; brak wyjątków.
Zrzuty `outputs/qa/verify_3_4m3_new.png`, `verify_3_4m3_existing.png`, `verify_3_4m3_run_new.png`, `verify_3_4m3_run_existing.png`, `verify_3_4m3_jit_configured.png`. Odbiór wizualny formularza nowej partii PASS. Status 3.4.4 i głównego 3.4: wdrożone w zakresie szkicu 6 oraz jawnych ograniczeń. Pojemności buforów, zapasy i częstotliwość dostaw pozostają do 3.5/3.6. Wdrożenie na Vercel nie było weryfikowane; Git push go nie potwierdza.
