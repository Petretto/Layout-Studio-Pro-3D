# Weryfikacja równoległości — 2.8

## 2.8a / 2.8.1 — odbiór 2026-10-07

Użytkownik zatwierdził 1A (jawne grupy bez automatycznego łączenia) i 2A (dopuszczona praca na wspólnym korpusie na jednej kopii, przy wyłączności osób i wyposażenia). Kontrakt: `MODEL_ROWNOLEGLOSCI_2_8.md`.

Zmiany: `physicalConcurrency.ts`, pole i walidacja w `domainProject.ts`, odmowa nieobsługiwanych reguł w `workerSchedule.ts`, trzy scenariusze `network.test.ts`. Backup `backup/v0.4.0_przed_2_8a_20261007`: 186 plików, 0 rozbieżności w niezależnej kontroli manifestu SHA256.

Test zestawów potwierdza dopuszczenie A+B i B+C przez osobne grupy, odmowę A+C oraz A+B+C, a następnie dopuszczenie podzbiorów i całej grupy A+B+C po jej jawnym wpisaniu. Powtórzone ID zapytania nie tworzą równoległych instancji operacji. Deklaracja nie zmienia poprzedników technologicznych.

Zapis i odczyt sprawdzono na źródle silników v4 i eksporcie Eko v5 z jawnie syntetycznymi deklaracjami. Zachowane są grupy, tekst źródła i aktywne klucze 4/5. Starszy szkic bez pola czyta się bez dopisanych reguł. Migracja odrzuca nieobsługiwane pole ze źródłowego projektu 4/5, zachowując oryginał.

Odmowy obejmują pusty/obcy/powtórzony ID grupy lub operacji, zestaw jednoelementowy, powtórzenie zestawu w odwrotnej kolejności, niepełne role, nieznane pola i przekroczenie limitu grup. Puste `groups` jest poprawnym brakiem dopuszczeń. Błędny zapis pozostawia poprzednią wartość, a uszkodzony odczyt surowy tekst. Wejście nie jest mutowane.

Wynik: 124/124 testów, build poprawny. UI nie zmieniano — edytor i odbiór historii pozostają w 2.8.3. Obecny harmonogram jawnie odmawia dla zapisanych nowych reguł; integracja rezerwacji, współdzielenia kopii i korpusu pozostaje w 2.8.2. Status 2.8.1: wdrożone; cały 2.8: w trakcie.

## 2.8b / 2.8.2 — częściowy odbiór 2026-10-07

Zmiany: wiele rezerwacji w `bodyState.ts`, wykonanie grup i współdzielenie kopii w `workerSchedule.ts`, etykiety przyczyn w panelu, cztery scenariusze rdzenia i wariant `--concurrent` istniejącego testu UI. Backup `backup/v0.4.0_przed_2_8b_20261007`: 188 plików, 0 rozbieżności w niezależnej kontroli SHA256.

Scenariusz dwóch sztuk i jednej kopii: pierwsza sztuka wykonuje A 0–10 i B 0–20 na jednym korpusie; druga A 20–30 i B 20–40. Zwolnienie A w 10 s pozostawia korpus zajęty przez B; przewóz jest odrzucany. Zdarzenia odtworzono w niezależnym rejestrze i porównano końcowy stan. Bez grup lub przy zależności A → B przebieg wraca do A 0–10, B 10–30.

Pauza 5–10 s daje A 0–15 i B 0–25 przy osobnych osobach. Przy jednej osobie B czeka do 15 s. Wspólny wymagany egzemplarz wyposażenia wymusza sekwencję, dwa osobne egzemplarze dopuszczają równoległy start. Grupy A+B i B+C nie pozwalają na trójkę: C startuje dopiero po końcu A, gdy pozostaje zgodna grupa B+C. Próba dołączenia w drugim miejscu jest odrzucana.

Przygotowanie na A i praca na korpusie na C startują razem, bez zajęcia korpusu przez przygotowanie. Następna praca po A, która ma grupę z nadal trwającym B, ale wymaga przeniesienia korpusu, czeka na koniec B: przewóz 20–22 s, praca 22–32 s. Cel zajęty od 20 s. Gałęzie z wieloma dopuszczonymi kopiami jawnie odmawiają wyniku do dalszej integracji tras.

Wyniki końcowe: 128/128 testów, build poprawny. Zapis i ponowny odczyt reguł oraz wejścia korpusów odtwarzają wynik. Starsze testy sekwencyjne, kalendarzowe i transportowe bez reguł pozostały poprawne.

Edge CDP `node tests/qa/verify_2_7e.mjs --concurrent`: zadeklarowana grupa w zapisie, dwie osoby, jeden korpus i kopia; UI pokazuje starty 0 s, końce 10/20 s oraz cztery zdarzenia. Sprawdzono wpis korpusu, odmowę błędnej kopii, usuwanie/Cofnij, identyczny wynik po odczycie oraz niezmienione źródło i aktywne projekty 4/5. Screenshot `outputs/qa/verify_2_8b_concurrent.png` obejrzano; tabela i zdarzenia czytelne. Edytor grup nie jest jeszcze dostępny (2.8.3).

Status 2.8.2 i całego 2.8: w trakcie. Odebrano powyższy zakres; automatyczne trasy gałęzi z wieloma kopiami wymagają dalszej implementacji i odbioru. Nie zadeklarowano dopuszczeń rzeczywistego procesu Eko.

## 2.8c / 2.8.2 — odbiór tras gałęzi 2026-10-07

Użytkownik zatwierdził pierwszeństwo technologiczne 1A dla porównania dalszych dróg w remisie startu i odległości przychodzącej. Zmiany: preferencje grafu w `stationRoutePlan.ts`, integracja w `workerSchedule.ts`, pięć testów rdzenia oraz `--branches` w istniejącym skrypcie QA. Backup `backup/v0.4.0_przed_2_8c_20261007`: 188 plików, 0 rozbieżności niezależnej kontroli SHA256. Nie zmieniono schematu zapisu ani migracji.

Przykład z kontraktu: drogi X→P 2, X→Q 100, Y→P 10, Y→Q 3 mm; start i droga przychodząca równe. P przed Q wybiera X mimo większej sumy; Q przed P wybiera Y. Remis do P rozstrzyga Q. Wcześniejszy start albo krótsza rzeczywista droga przychodząca mają pierwszeństwo przed preferencją gałęzi. Odwrócenie kolejności dopuszczonych kopii nie zmienia rozstrzygnięcia różnymi odległościami.

Ręcznie policzony przebieg: ROOT na X 1–11 s, P 12–22 s, Q 23–33 s. Faktyczny przewóz do Q zaczyna się po końcu P i biegnie z P, nie z miejsca ROOT ani z fikcyjnego poprzednika iteracji. Odtworzone zdarzenia korpusu dają identyczny stan końcowy, wejście bez mutacji. Dwie gałęzie z wieloma wspólnymi kopiami mogą dołączyć równolegle w rzeczywistym miejscu korpusu, pozostając bez przewozu. Dwie sztuki nie współdzielą kopii w nakładających się okresach rezerwacji.

Przyszły cel nie jest zamrożony: ROOT planuje najkrótszą drogę do P, lecz kalendarz P opóźnia pracę do 50 s; późniejszy przydział wybiera inną dopuszczoną kopię Q ze startem 12 s. Przygotowanie między ROOT a gałęziami nie wpływa na drogę korpusu; złączenie czeka na obie gałęzie. Brak zadeklarowanej drogi albo czasu rzeczywistego przewozu daje jawną odmowę. Dotychczasowe testy osób, wyposażenia, pauz i blokady przewozu przy pracy pozostały poprawne.

Wyniki końcowe: 133/133 testów, build poprawny. Edge CDP `node tests/qa/verify_2_7e.mjs --branches` oraz regresja `--concurrent`: PASS. UI pokazał wybraną X, plan X→C 2 mm, rzeczywiste S→X→C→Q i 12 zdarzeń. Screenshot `outputs/qa/verify_2_8c_branches.png` obejrzano; tabela i inspekcja czytelne. Ponowny odczyt daje identyczne dane i wynik; usunięcie wejścia/Cofnij działa. Dokładne źródło i aktywne projekty 4/5 zachowane. Pierwsza próba QA ujawniła brak przypisań stanowisk w syntetycznej konfiguracji Manual; poprawiono wyłącznie fixture QA.

Status 2.8.2: wdrożone w uzgodnionym zakresie szkicu 6. Cały 2.8 nadal w trakcie: edytor grup, pełna inspekcja i zbiorczy odbiór różnych procesów w 2.8.3. Dane Eko, instancje/zużycie podzespołów, bufory i zasoby transportowe pozostają poza tym odbiorem.

## 2.8d / 2.8.3 — odbiór zbiorczy 2026-10-07

Zmiany: `DomainConcurrencyEditor.tsx`, podłączenie do wspólnego zapisu/historii w `DomainDraftPanel.tsx`, inspekcja całych równoczesnych zestawów w `DomainWorkerSchedulePanel.tsx`, rozszerzenie QA i instrukcji. Algorytm harmonogramu, schemat i migracje bez zmian. Backup `backup/v0.4.0_przed_2_8d_20261007`: 188 plików, 0 rozbieżności niezależnej kontroli SHA256.

133/133 testów rdzenia oraz build: PASS. Edge CDP przez `verify_2_7e.mjs`: `--concurrent --groups`, `--preparation --groups`, `--concurrent --groups --three` i regresja `--branches`: PASS. Pierwsze trzy scenariusze tworzą i edytują grupy przez UI, bez gotowych reguł w wejściu.

Wspólny korpus: A 0–10, C 0–20, jedna kopia, dwie osobne osoby. Przygotowanie na A i korpus na C: oba 0–10, przygotowanie bez rezerwacji/przewozu korpusu. Trzy czynności z grupami A+C i C+Q: A 0–10, C 0–20, Q 10–20. Inspekcja pokazuje całe pary w 0–10 i 10–20 wraz z jedną właściwą grupą; nie pokazuje nieuprawnionej trójki. Kopia i korpus pozostają zablokowane przez pozostałą pracę. Są to wyłącznie syntetyczne scenariusze różnych przebiegów, a nie deklaracje technologii Eko.

UI odrzuca grupę jednoelementową, powtórzone ID i powtórzony zestaw operacji bez zmiany surowego zapisu. Zmiana ID, dodanie/usunięcie grupy, usunięcie całego pola i zapis pustej listy sprawdzone. Pusta lista wymusza sekwencję 0–10/10–30 (trójka: dodatkowo 30–40; przygotowanie: 0–10/10–20). Cofnij/Ponów odtwarza grupy i formularze, usuwa stary wynik. Usunięcie używanej roli jest blokowane. Po przeładowaniu dane i ponownie obliczony wynik identyczne. Zachowane dokładne źródło i aktywne projekty 4/5; brak wyjątków JS. Regresja tras po pierwszej odmowie uruchomienia Edge CDP w sandboxie przeszła przy dozwolonym uruchomieniu poza sandboxem.

Screenshots `verify_2_8d_three_editor.png`, `verify_2_8d_three_inspection.png`, `verify_2_8d_preparation_inspection.png` obejrzano. Formularz, zestawy, grupy, miejsca i zasoby czytelne. Pozostałe screenshots scenariusza korpusu zapisane w `outputs/qa`. Instrukcja `Instrukcja/Korpus_v6.md` obejmuje nową funkcję oraz limity inspekcji.

Status 2.8.3 i 2.8: wdrożone w uzgodnionym zakresie osobnego szkicu 6. Dowody 2.8a–d obejmują walidację grup, zgodność starych zapisów, ochronę osób/wyposażenia/lokalizacji, pauzy, przewóz, gałęzie i złączenie, UI oraz historię/odczyt. Ograniczenia: brak rzeczywistych dopuszczeń procesu Eko (2.9), instancji/zużycia podzespołów, buforów i zasobów transportowych. Reguły nie sterują aktywnym bilansem ani symulacją 4/5.
