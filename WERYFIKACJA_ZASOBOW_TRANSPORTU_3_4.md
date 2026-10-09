# Weryfikacja zasobów transportowych — 3.4

## 3.4b / część 3.4.2 — 2026-10-09

Wybrano 1B. Backup `backup/v0.4.0_przed_3_4b_20261009`: 250 plików, niezależna kontrola SHA256 — 0 rozbieżności.

Dodano `src/core/transportState.ts`: nietrwały rejestr wykonawczy fizycznych wózków, tożsamość istniejącego egzemplarza wyposażenia, początkowa kopia, jawne kalendarze oraz początek/koniec skierowanego ruchu empty/loaded. Chroni przed niewłaściwym miejscem startu, podwójnym zajęciem, nieznanym egzemplarzem, cofnięciem czasu, przedwczesnym/spóźnionym przyjazdem, brakiem czasu/źródła i przejazdem przez przerwę. Przypisanie ruchomego wózka do stałego wyposażenia lub operacji jest odrzucane.

151/151 testów PASS. Trzy nowe testy w `tests/network.test.ts` obejmują ręcznie policzony dojazd A→C (0–5 s), osobny przewóz C→A (5–15 s, 2 + 5000/1000 + 3), jeden stan lokalizacji, brak mutacji deklaracji, odmowy ruchu oraz kalendarze. To dane syntetyczne, nie domyślne wartości aplikacji. Build/typecheck PASS; diff check bez błędów. Nie zmieniono dotychczasowych wyników ani ścieżki aplikacji.

Zakres nie obejmuje parsera/zapisu projektu, rezerwacji osób, przenośników, integracji z harmonogramem/workera lub UI. Brak zmian schematu i potrzeby migracji na tym etapie. Testy UI i ponownego otwarcia nie są dowodem tego pakietu, ponieważ nowy moduł nie jest jeszcze podłączony do aplikacji. Główny 3.4 i 3.4.2 pozostają w trakcie.

Oczekujące decyzje: pozostawanie wózka w celu / powrót do bazy i zakres fizycznych dojść osób. Bez odpowiedzi nie wprowadzamy tych reguł do obliczeń ani trwałego kontraktu. Postęp głównych ID: 23/67 = **34,3%**, pierwsze wydanie 23/65 = **35,4%**.
