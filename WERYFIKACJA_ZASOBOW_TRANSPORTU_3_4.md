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
