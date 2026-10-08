# Scenariusze Eko — 2.9

Data: 2026-10-08. Status: 1A/2A zatwierdzone i odebrane wyłącznie jako testy funkcjonalności. Docelowo użytkownik wprowadza konkretne dane własnego procesu. Dokument nie deklaruje rzeczywistej obsady ani zgód technologicznych zakładu.

## Źródła i potwierdzone dane zapisane

Źródłem eksportu jest `tests/qa/Eko_D5_actual_export_v5.json`, schemat 5: 16 operacji, 60 pozycji BOM i 17 rekordów stanowisk, w tym puste. Drugie źródło porównania: `src/core/models/ekoProject.ts`, demonstracja schematu 4. Instrukcja `Instrukcja/Eko_v0.4.md` opisuje ograniczenia starego grafowego przykładu. Dane tych plików są świadectwem zapisanej konfiguracji, nie pomiarów ani potwierdzenia technologii produkcyjnej.

| Operacje | Dane grafu w eksporcie | Czas standardowy [s] | Granica interpretacji |
| --- | --- | ---: | --- |
| OP10 | Brak poprzedników | 3480 | Nazwa podmontażu nie nadaje automatycznie roli fizycznej |
| OP11 | Po OP10 | 600 | Brak deklaracji, kiedy i gdzie istnieje rama/korpus |
| OP12 | Po OP11 | 3590 | „Etap I” nie określa czynności ani zasobów |
| OP13, OP15 | Brak poprzedników | 2640 każdy | Podmontaże drzwi; brak jawnych instancji, osób i grup |
| OP14, OP16 | Brak poprzedników | 1320, 1920 | Podmontaże paneli; brak jawnych ról i grup |
| OP17, OP18 | OP17 bez poprzedników, OP18 po OP17 | 1680, 1200 | Zależność należy zachować nawet przy grupie dopuszczeń |
| OP22 | Po OP12 i OP13 | 600 — czas testowy | Montaż drzwi lewych; brak potwierdzonej zgody pracy razem |
| OP23 | Po OP12 i OP15 | 600 — czas testowy | Montaż drzwi prawych; brak potwierdzonej zgody pracy razem |
| OP24, OP25 | Obie po OP22 i OP23; ponadto OP14 / OP16 | 480 każdy — czasy testowe | Obie wymagają zakończenia obu montaży drzwi |
| OP19 | Po OP24, OP25 i OP17 | 1800 | Zachować zapisane zależności; nie poprawiać na podstawie nazw |
| OP20, OP21 | OP20 po OP19 i OP18, OP21 po OP20 | 1200, 1320 | Brak jawnego modelu obecności i tras korpusu |

W eksporcie OP22 i OP23 należą do jednego stanowiska `ST-4f27d837-789a-4ffa-beba-e777b7e2bf8c`. To wspólne przypisanie operacji, nie dowód dopuszczenia dwóch osób do równoczesnej pracy na tej samej kopii. Bazowy przykład v4 ma osobne stanowiska WS-10/WS-11. Nie należy mieszać obu konfiguracji ani wyprowadzać jednej drogi korpusu z geometrii stołów.

Eksport nie zawiera nowych danych v6: ról fizycznych, wyrobu/podzespołów, tożsamości osób, wyboru zespołu, profili obecności, reguł równoległości, tras/czasów przewozu ani wejściowych korpusów. Czasy standardowe i ustawienia operatorów v5 nie zastępują tych deklaracji. Migracja zachowuje źródło i pozostawia braki; nie ma podstaw do przedstawienia wyniku v6 jako rzeczywistej wydajności Eko.

## Matryca odbioru po uzupełnieniu danych

| Scenariusz | Jawne wejście do potwierdzenia | Oczekiwany warunek, bez wymyślania wartości |
| --- | --- | --- |
| EKO-P: niezależne podmontaże | Role przygotowania, definicje producentów/podzespołów, grupa całego dopuszczonego zestawu, osobne zasoby | Brak sztucznej serializacji; graf OP17→OP18 nadal obowiązuje; przygotowania nie rezerwują ramy |
| EKO-D-R: drzwi razem | Grupa OP22+OP23, jeden korpus i dokładnie ta sama dopuszczona kopia, osobne osoby/wyposażenie | Możliwy wspólny start dopiero po wymaganych poprzednikach, bez dwóch lokalizacji ramy |
| EKO-D-S: drzwi kolejno | Brak zgody dla OP22+OP23 lub jawna dodatkowa zależność w osobnym wariancie | Brak nakładania obu prac; zależność zmienia tylko wskazany wariant |
| EKO-W: wspólna obsada | Konkretne osoby i profile ich obecności dla obu montaży | Brak nakładania rezerwacji tej samej osoby, także gdy grupa dopuszcza równoległość |
| EKO-B: dostępność ramy | Jedno jawne ID, miejsce początkowe, reguła dostępności i trasy z czasami | Przewóz czeka na wszystkie prace; kopia zwalnia się po ostatniej rezerwacji; OP24/OP25 czekają na oba montaże |
| EKO-IO: historia i odczyt | Uzgodnione warianty zapisane osobno | Wynik powtarzalny po odczycie; źródło 4/5 chronione; Cofnij/Ponów odtwarza dane |

Wartości końca, przepustowości i oczekiwania należy policzyć dopiero z kompletnych, zatwierdzonych danych. Zbiorcze testy 2.8 potwierdziły mechanizmy na syntetycznych scenariuszach, ale nie stanowią zgody procesu Eko.

## Proponowany podział i decyzja zakresu

1. **2.9.1 — inwentaryzacja i kontrakt scenariuszy:** niniejszy dokument, wskazanie źródeł i luk, uzgodnienie danych testowych albo rzeczywistych. Nie zmieniać aktywnych projektów, schematu ani produkcyjnych założeń.
2. **2.9.2 — wykonanie i odbiór:** jawne konfiguracje wariantów, ręcznie sprawdzalne wyniki, testy i UI, zapis/odczyt oraz raport ograniczeń po zatwierdzeniu zakresu.

**1A — proponowane dla rozwoju aplikacji:** przygotować scenariusze demonstracyjne Eko z następującym jawnym kontraktem testowym. Zachować czasy standardowe źródła, ale wszystkie profile obecności oznaczyć jako założone: jedna osoba przez cały czas operacji, bez dzielenia czasu przez obsadę. Rola przygotowania dla OP10 i OP13–OP18; rola pracy na korpusie dla OP11, OP12 i OP19–OP25. Zadeklarować testową grupę przygotowań oraz osobną grupę OP22+OP23 tylko w wariancie drzwi razem. W wariancie kolejno usunąć tę grupę; w wariancie wspólnej obsady przypisać tę samą osobę do OP22/OP23. Pozostałe operacje mają własne testowe osoby. W osobnej konfiguracji testowej wszystkie prace korpusu dopuścić na jednej wspólnej kopii montażowej, bez przewozu; przygotowania zachowują osobne stanowiska. Graf źródła, w tym OP17→OP18 i złączenie po obu drzwiach, pozostaje bez zmian. Każdą dodaną regułę opisać jako założenie testu, oddzielić od dokładnego źródła, nie nadpisywać przykładów i nie ogłaszać odbioru produkcyjnego. Zatwierdzenie 1A dotyczy tego kontraktu, a wynik służy sprawdzeniu mechanizmów.

**1B — alternatywa:** wykonać 2.9 na rzeczywistych danych procesu. Potrzebne są role operacji (szczególnie OP11/OP12), dopuszczenia zestawów, tożsamości i profile obecności osób, dopuszczone kopie/wyposażenie, miejsce i moment dostępności ramy oraz wymagane skierowane trasy z długościami i czasami. Braków nie uzupełniać domysłami.

Osobno trzeba potwierdzić znaczenie ramy: **2A** — istniejący korpus jest wejściem przebiegu, dostępnym od początku w jawnej kopii; **2B** — korpus powstaje dopiero w konkretnej operacji, którą trzeba wskazać. Obecny rejestr przyjmuje początkowe deklaracje, a wariant tworzenia instancji w trakcie wymaga osobnego kontraktu i implementacji. Nie zastępować 2B wcześniejszą fikcyjną dostępnością. Dla 1A/2A początkowe miejsce jest wspólną kopią montażową testu; dla danych rzeczywistych wymaga rzeczywistego wskazania.

## Zatwierdzenie i doprecyzowanie użytkownika

Użytkownik zatwierdził 1A tylko do testów i 2A. W rzeczywistym przykładzie Eko rama jest konkretną częścią dostarczaną z magazynu na linię i wciąganą na rolotok (podest z rolkami). Eko służy testowaniu uniwersalnej aplikacji. „Korpus” oznacza jawnie wskazany obiekt danego procesu; nie wymusza ramy ani identycznego początku w każdym projekcie. Test rozpoczyna się po dostawie i wciągnięciu na wejście montażu. Nie przypisano tym czynnościom zerowego czasu: nie należą do przebiegu testowego, a ich rzeczywiste odwzorowanie wymaga konkretnych danych.

## Wykonane warianty 2.9.2

Generator `node tests/qa/generate_2_9.mjs` zapisuje trzy osobne szkice wraz z dokładnym źródłem i trzema plikami wyników do `outputs/scenarios/eko_2_9`. Implementacja deklaracji znajduje się wyłącznie w `tests/fixtures/ekoDomainScenarios.ts`; nie jest domyślną migracją ani nowym przykładem produkcyjnym w aplikacji. Zachowano 16 operacji, 60 BOM, poprzedniki, czasy standardowe i tożsamości źródła. Geometrię pominięto w testowym podglądzie; dokładny oryginał pozostaje w każdym szkicu. Nie wyprowadzano obsady z ustawień v5 ani nie dopisano pomiarów.

Każdy wariant ma jedną sztukę i ramę już na tej samej jawnej kopii dla wszystkich prac korpusu. Testowe profile mają pełną obecność jednej osoby i pochodzenie `assumed`, bez deklarowania rozdziału pracy ręcznej/maszynowej. Grupa przygotowań nie daje zgody na równoległość przygotowania z dowolną pracą korpusu; drzwi mają osobną grupę. OP24/OP25 pozostają kolejno, bo nie otrzymały dodatkowego dopuszczenia.

| Wariant / plik szkicu | OP22 [s] | OP23 [s] | Koniec jednej sztuki [s] |
| --- | --- | --- | ---: |
| Drzwi razem — `parallel.json` | 7670–8270 | 7670–8270 | 13550 |
| Drzwi kolejno — `sequential.json` | 7670–8270 | 8270–8870 | 14150 |
| Wspólna osoba — `shared-worker.json` | 7670–8270 | 8270–8870 | 14150 |

Ręczna kontrola: sześć niezależnych przygotowań zaczyna w 0 s, OP18 po OP17 w 1680 s; OP10 kończy w 3480 s. OP11: 3480–4080, OP12: 4080–7670. Po drzwiach OP24 i OP25 zajmują kolejno 480 s, dalej OP19 1800 s, OP20 1200 s i OP21 1320 s. Daje to odpowiednio 13550 albo 14150 s. Te wartości nie są wynikiem rzeczywistej wydajności zakładu ani obietnicą usprawnienia.

Odbiór: 135/135 testów, build, UI trzech pełnych wariantów, historia i odczyt. Brak jawnej ramy lub próba innego miejsca bez trasy daje odmowę. Zdarzenia odtwarzają jeden końcowy stan ramy; pracownicy nie mają nakładających się rezerwacji. Szczegóły: `WERYFIKACJA_EKO_2_9.md`. Scenariusze nie obejmują magazynu, przewozu, rzeczywistego wyposażenia, instancji/zużycia podzespołów ani pojemności rolotoku.
