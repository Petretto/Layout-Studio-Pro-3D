# Obliczenia w tle — 3.1

## 3.1a / 3.1.1 — odbiór 2026-10-08

Zakres: osobny harmonogram szkicu 6. Aktywna ścieżka symulacji 4/5 i animacja nie zostały przeniesione ani zmienione; należą do następnego pakietu 3.1.2. Backup `backup/v0.4.0_przed_3_1a_20261008`: 193 pliki, niezależna kontrola SHA256 — 0 rozbieżności.

Moduły: `scheduleTask.ts` (cykl życia zadania), `scheduleWorkerRequest.ts` (ten sam rdzeń i komunikaty), `schedule.worker.ts` (punkt wejścia workera), opcjonalny obserwator postępu w `workerSchedule.ts` i asynchroniczny panel. Żadnych nowych reguł symulacji, zmian schematu lub migracji.

Każde obliczenie ma osobny worker z kopią wejścia przesłaną przez `postMessage`. Rdzeń pozostaje synchroniczny wewnątrz workera i identyczny z używanym w weryfikacji. Postęp liczy zakończone wykonania operacji względem całej partii; wysyłany najwyżej przy zmianie całkowitego procentu, z początkiem i końcem. To nie szacunek czasu pozostałego; podczas walidacji/przygotowania licznik pozostaje na początku. Wynik jest akceptowany dopiero jako komunikat pełnego zakończenia.

Anulowanie używa `terminate`, więc nie wymaga dojścia rdzenia do kolejnego zdarzenia. Zamyka odbiorniki, a spóźnione zdarzenia nie zmieniają widoku. Ukończenie/błąd także zwalniają worker. Zmiana parametrów oraz odmontowanie panelu przy zmianie szkicu kończą poprzednie zadanie; stary wynik nie wraca. Nie zapisuje się postępu lub częściowego wyniku. Nie ma automatycznego powrotu do blokujących obliczeń przy błędzie uruchomienia workera — UI pokazuje błąd.

137/137 testów: PASS. Nowe testy potwierdzają pełną równość wyniku protokołu z bezpośrednim harmonogramem dla wszystkich trzech wariantów Eko, monotoniczny postęp 0→16, niezmienność wejścia, odmowę błędnego odstępu, przerwanie zadania, odrzucenie spóźnionego zdarzenia, niezależność następnego zadania i błąd uruchomienia. Dotychczasowe testy transportu, zasobów, kalendarzy, lokalizacji, zapisów i starszych wyników pozostają poprawne.

Build: PASS. Vite generuje osobny plik `schedule.worker-*.js` (około 51,5 kB). Bez instalowania zależności. Główny widok nie importuje już wykonania harmonogramu do obsługi przycisku.

Edge CDP `node tests/qa/verify_2_7e.mjs --eko --background`: PASS. Testowy proces 50 operacji i partia 100 sztuk (5000 wykonań), jawny postęp i dostępny przycisk anulowania. UI anuluje; od kliknięcia do odświeżenia komunikatu zmierzono 7,0 ms w tej jednej próbie, nie jest to gwarancja na innych urządzeniach ani pomiar całej partii. Po 700 ms brak spóźnionego wyniku. Następny start jednej sztuki kończy 50 operacji. Surowy szkic i aktywne 4/5 bez zmian. Pierwszą próbę QA odrzuciła walidacja, bo fixture zawierało BOM ze starymi operacjami; poprawiono wyłącznie testowy proces przez usunięcie niepasującego BOM.

Regresje UI `--eko`, `--eko --shared-worker`, `--branches`: PASS. Poprawne wyniki, przyczyny oczekiwania, błędy braku ramy, historia i odczyt. Screenshot `outputs/qa/verify_3_1a_background.png` obejrzano: wynik po ponownym starcie czytelny. Błędy JS nie wystąpiły. Obliczenia nie zależą od prędkości animacji; ta ścieżka jest podglądem wyników bez sterowania animacją.

Status 3.1.1: wdrożone dla szkicu 6. Cały 3.1: w trakcie. Następne pakiety: 3.1.2 — aktywne obliczenia 4/5 i izolacja od animacji; 3.1.3 — zbiorczy odbiór responsywności, anulowania/starych wyników i zgodności obu ścieżek. Render dużego wyniku oraz koszt przesłania danych do workera nie są pełnym pomiarem skalowalności; szerszy odbiór należy także do 3.9.

## 3.1b / 3.1.2 — odbiór 2026-10-08

Zakres: aktywna symulacja projektów 4/5 w obu miejscach użycia wspólnego panelu Simulation. Backup `backup/v0.4.0_przed_3_1b_20261008`: 197 plików, niezależna kontrola SHA256 — 0 rozbieżności. Schemat, migracja, reguły obliczeń i dane produkcyjne bez zmian.

`network.worker.ts` i `networkWorkerRequest.ts` wywołują dotychczasowy simulateNetwork z opcjonalnym obserwatorem zakończeń operacji. Postęp wysyłany przy zmianie całkowitego procentu (do 101 komunikatów); nie szacuje czasu pozostałego. Wspólny `backgroundTask.ts` obsługuje cykl życia workerów obu ścieżek. Zakończenie, anulowanie, błąd i odmontowanie zwalniają worker; zamknięte odbiorniki oraz aktywna flaga odrzucają późne zdarzenia. Nie ma blokującego fallbacku.

Panel automatycznie oblicza po zmianie procesu/bilansu, partii lub odstępu. Wynik jest przypisany do klucza wejścia; poprzedni znika już w renderze zmienionego wejścia. Anulowanie pozostawia jawny komunikat; dostępne ponowienie. Animacja używa wyłącznie pełnego wyniku, a prędkość, pauza, reset i skok do końca nie rozpoczynają nowego zadania. Eksport i oś czasu są zablokowane bez pełnego wyniku. Postęp/wynik nie trafiają do zapisu projektu. Dotychczasowy przycisk „Oblicz całą partię” zachowuje funkcję przejścia odtwarzania do końca; osobne „Oblicz ponownie symulację” uruchamia obliczenie.

138/138 testów: PASS. Nowy test porównuje pełne jobs/runs/stepIds z wywołaniem bezpośrednim dla silników, Eko 4 i Eko 5, sprawdza monotoniczny postęp 0→liczba wykonań, limit komunikatów, brak mutacji, błędny odstęp/partię i limit 200000 wykonań. Dotychczasowy test cyklu życia przez startScheduleTask obejmuje teraz wspólny helper (anulowanie, późne zdarzenia, ukończenie, następne zadanie, błąd uruchomienia). Build/typecheck: PASS; osobny network.worker około 4,24 kB i schedule.worker około 51,49 kB.

Edge CDP `node tests/qa/verify_3_1b.mjs`: PASS dla 4 i 5. Pełny wynik trzech sztuk z odstępem 4050 s: 21170 s / 21770 s zgodnie z bezpośrednim rdzeniem. Rzeczywiste workery (licznik konstrukcji bez zastępowania obliczeń), prędkości 5000×/1×, start/pauza/reset/koniec bez dodatkowego workera, aktualny CSV oraz oznaczenie poprzedniego raportu po zmianie partii. Anulowano zadanie 10000 sztuk × 16 operacji; od kliknięcia do komunikatu 0,7 ms dla v4 i 0,6 ms dla v5 w pojedynczych próbach. To pomiar reakcji UI, nie gwarancja wydajności ani ukończenie dużej partii. Po 700 ms brak późnego wyniku; powrót do trzech sztuk i ręczne ponowienie poprawne. Zapisy obu projektów bez zmian; odczyt używa istniejących plików 4/5. Screenshoty `outputs/qa/verify_3_1b_v4.png` i `verify_3_1b_v5.png` obejrzano: formularz, metryki i sterowanie czytelne. Błędów JS brak.

Regresja `verify_2_7e.mjs --eko --background`: PASS — 5000 wykonań, anulowanie, brak późnego wyniku, ponowienie i niezmienność danych. Reakcja 2,3 ms w jednej próbie. W QA poprawiono selektory etykiet formularza; środowisko ograniczone nie otwierało strony i test uruchomiono z zatwierdzonym dostępem. Kolizję portu CDP rozwiązano osobnymi portami przez opcjonalne LAYOUT_QA_PORT/LAYOUT_QA_CDP, bez zmian aplikacji.

Status 3.1.2: wdrożone. 3.1 nadal w trakcie do 3.1.3: zbiorczy odbiór obu ścieżek, zmian wejścia w trwających obliczeniach, odmontowania/błędów i ograniczeń responsywności. Koszt kopiowania danych przez postMessage oraz renderowania dużego wyniku pozostaje poza pomiarem skalowalności tego pakietu (także 3.9). Aktywny model 4/5 nadal ma własne dotychczasowe uproszczenia opisane w panelu; przeniesienie do tła nie nadaje mu reguł fizycznych szkicu 6.

## 3.1c / 3.1.3 — zbiorczy odbiór 2026-10-08

Wykonano rozszerzony odbiór obu ścieżek. Zmiany dotyczą wyłącznie tests/network.test.ts oraz skryptów QA verify_3_1b.mjs i verify_2_7e.mjs (tryb --acceptance), planu i dokumentacji. Nie wykryto usterki wymagającej zmiany aplikacji. Brak zmian strukturalnych, schematu, migracji lub reguł symulacji; nowy backup strukturalny nie był wymagany, poprzednie backupy 3.1a/b zachowane.

139/139 testów: PASS. Dodatkowy test wspólnego cyklu życia obu rodzajów żądań sprawdza błąd wykonania przez onerror, preventDefault, zwolnienie workera i obu odbiorników, ignorowanie spóźnionego pełnego wyniku, wielokrotne anulowanie oraz błąd postMessage/klonowania. Pełne porównania wyników i monotonicznego postępu z 3.1a/b pozostają poprawne. Build/typecheck: PASS.

| Odbiór | Aktywna symulacja 4/5 | Harmonogram szkicu 6 |
| --- | --- | --- |
| Obliczenia w rzeczywistym workerze, postęp, anulowanie i ponowienie | PASS | PASS |
| Zmiana wejścia podczas zadania kończy stary worker | PASS; partia 10000→2, zgodny nowy wynik po 700 ms | PASS; partia 100→1, bez późnego wyniku; ponowienie 50 operacji |
| Odmontowanie przez przejście na Pulpit i powrót | PASS; worker kończy się, nowa partia zgodna | PASS; worker kończy się, nowy harmonogram poprawny |
| Błędne dane nie pozostawiają poprzedniego wyniku | PASS; partia 0 | PASS; odstęp 0 |
| Błąd konstrukcji workera i odzyskanie | PASS; kontrolowana odmowa konstrukcji | PASS; kontrolowana odmowa konstrukcji |
| Rzeczywisty błąd ładowania modułu workera i odzyskanie | PASS; brakujący moduł pod tym samym origin | PASS; brakujący moduł pod tym samym origin |
| Zapis szkicu w trwającym zadaniu, Cofnij i ponowienie | Nie dotyczy osobnego szkicu 6 | PASS; usunięcie reguł równoległości remountuje panel, kończy worker, Cofnij odtwarza dane |
| Animacja nie uruchamia nowych obliczeń i nie zmienia wyniku | PASS; start/pauza/reset/koniec, prędkości 5000×/1× | Ścieżka podglądu nie steruje animacją |
| Izolacja danych i źródła, ochrona aktualności CSV | PASS; oba projekty zachowane, stary CSV oznaczony, eksport zablokowany bez wyniku | PASS; szkic/oryginał zachowane po Cofnij, aktywne 4/5 bez zmian |

Polecenia: `node tests/qa/verify_3_1b.mjs --acceptance` oraz `node tests/qa/verify_2_7e.mjs --eko --background --acceptance` (osobne porty LAYOUT_QA_PORT=5213 i LAYOUT_QA_CDP=9353). Headless Edge, produkcyjny build i lokalny serwer. Liczniki konstrukcji/terminate opakowują rzeczywiste workery; żaden poprawny wynik w UI nie jest zastąpiony atrapą. Odmowa konstrukcji jest celowo wstrzykniętym błędem testowym; błąd ładowania pochodzi z rzeczywistego żądania nieistniejącego modułu. Obsłużone błędy są widoczne w panelu, postęp znika, a ponowienie po usunięciu przyczyny daje zgodny wynik. Nie wystąpiły nieobsłużone wyjątki strony.

W ponownym odbiorze końce Eko 3 sztuki/4050 s wynoszą 21170 s i 21770 s. Reakcja anulowania: 0,5 ms / 0,8 ms dla 4/5 (160000 zaplanowanych wykonań) i 2,0 ms dla szkicu 6 (5000 wykonań), pojedyncze próby. Duże zadania przerwano; wartości te nie opisują czasu ukończenia tych partii ani gwarancji dla innych urządzeń. Postęp to liczba zakończonych operacji, nie czas pozostały; przygotowanie/walidacja mogą pozostawić licznik na początku.

Ograniczenia: structured clone wejścia w postMessage nadal wykonuje się przy wysłaniu z głównego wątku; przesłanie wyniku i jego renderowanie także mają koszt. Nie przeprowadzono pełnego testu pamięci ani renderu maksymalnej partii. 3.9 pozostaje właściwym etapem pomiaru skalowalności i ewentualnej wirtualizacji. Anulowanie zwalnia worker i odrzuca późne zdarzenia, bez częściowego zapisu wyniku. Modele 4/5 oraz szkic 6 nadal zachowują własne reguły i zakresy; odbiór tła nie oznacza ich połączenia ani uzupełnienia transportu/buforów.

Status 3.1.3 oraz całego 3.1: wdrożone na podstawie odbiorów 3.1a–c. Następny punkt: 3.2, punkty wejścia/wyjścia materiału i edytowalne trasy z kontrolą jednostek/połączeń.
