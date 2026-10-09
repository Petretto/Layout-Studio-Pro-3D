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
