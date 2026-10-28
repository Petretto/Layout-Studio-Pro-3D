# 7.12.C2-B3c — lokalna kontynuacja korpusu w grafie

Data: 2026-10-28. Status: **wdrożona lokalna kontynuacja na tej samej jawnej kopii**, w dotychczasowym zakresie dodatnich buforów korpusów z gałęziami. Całe B3/C2/7.12 w trakcie.

## Zmiana

`graphBodyBuffers.ts` rozpoznaje lokalne granice kolejnych operacji ścieżki. `workerSchedule.ts` zachowuje wtedy zajęcie korpusu, kopii i poprzedniego wyposażenia aż do rzeczywistego startu następnej operacji. Nie odkłada korpusu w pośrednim buforze i nie tworzy przejazdu. Używa istniejącego atomowego `continue-operation`; zdarzenia rejestru korpusu pozwalają odtworzyć identyczny końcowy stan. Oczekiwanie lokalne ma odrębny czas od blokady pełnego wyjścia; osoby kończą według profili.

Backup przed zmianami: `backup/v0.4.0_przed_c2_b3c_20261028`, 4 pliki rdzenia/testów/UI, niezależne SHA-256 źródła i kopii PASS. Numer modelu 6, migracje i rozprowadzane przykłady bez zmian. Niezależna zmiana `outputs/data_audit/eko_7_1.json` poza pakietem.

## Dowody i referencje

7 nowych testów B3c PASS:

- Mały niezależny wzorzec: producent partii 0–10, pierwsza obróbka korpusu 10–20, lokalne oczekiwanie 20–50 na jawny materiał, lokalna operacja 50–60, przewóz korpusu 60–62 i powrót 62–67, koniec 72. Podmontaż i materiał pobrane przy 50. Korpus zajęty na poprzedniej kopii przy 30; brak pośredniego depozytu i ruchu.
- Poprzednie wyposażenie przechodzi na lokalną operację, a osoba pierwszej operacji kończy przy 15. Następna zaczyna przy 50 z obecnością osoby 53–60. Lokalna kopia pozostaje zajęta do 50 niezależnie od profilu osób.
- Dwa zlecenia: drugie nie przejmuje kopii w lokalnej przerwie pierwszego. Jawny limit podmontaży uwzględnia resztę pierwszej partii oraz następną całą partię. Zachowane księgi osób bez nakładania.
- Cały lokalny ciąg działa bez trasy i zestawu transportowego, bez ruchów korpusu i zbędnych tokenów buforowych.
- Atomowy adapter odrzuca przedwczesne przekazanie, samodzielny depozyt na lokalnej granicy i błędny poprzednik bez mutacji.
- Brak materiału przy lokalnym oczekiwaniu nie jest klasyfikowany jako pozorna blokada pojemności wyjścia; diagnostyka zachowuje przyczynę materiałową w szczegółach operacji.
- Syntetyczny wzorzec UI oparty na C2: pierwsza obróbka 0–40, lokalne oczekiwanie 40–100, lokalna obróbka 100–140. Jawna dostawa przy 100; przyrząd i kopia zatrzymane do 100, osoba pierwszej operacji kończy przy 40. Przejazdy korpusu 140–150 i 570–580, koniec wyrobu 630. To oddzielna próba z kalendarzem integracji od 500, nie wynik rozprowadzanego C2-A ani pomiar produkcji.

`node scripts/test.mjs --suite=network '--test-name-pattern=7.12.C2|3.4m|3.5'`: **146/146 PASS**, w tym wszystkie 7 nowych i związane przypadki korpusów, partii, transportu oraz zaopatrzenia. Log `outputs/qa/7_12c2_b3c/scoped.txt`. Pełnej regresji nie powtarzano: ostatni checkpoint B3b 471/471, bieżąca zmiana ma celowany zakres.

Build/typecheck PASS. `node tests/qa/verify_7_12c2_b3c.mjs`: rzeczywisty Edge PASS — chroniony import, wynik 630, lokalne oczekiwanie 40–100, osoba 0–40, brak pośredniego depozytu, reszty 2+2, odświeżenie oraz eksport z porównaniem obu konfiguracji buforów i dokładnego źródła. Błędy runtime 0. Dowody: `outputs/qa/7_12c2_b3c/ui.json`, `local_continuation.png`, `component_stock.png`. Instrukcja i jej pochodne aktualizowane; kontrola w `outputs/qa/manual_7_12c2_b3c/`.

Instrukcja MD/HTML/PDF: **66 stron, 53 ilustracje**, zgodność HTML/MD, kompletność sekcji i kontrola tekstu poza stronami PASS. Oględziny strony 30 z nowym opisem PASS. Wynik `outputs/qa/manual_7_12c2_b3c/report.json`. Zrzuty UI wymuszają jawny rozmiar 1440×1100; końcowy obraz pokazuje zdarzenia 40/100/140 i odrębne reszty.

## Granice

Nadal odrzucane w grafie: zerowe bufory korpusów, zatrzymanie ich obsady, zmienne kopie, przezbrojenia i bezpośrednie wejście 0 podmontażu ze skończonymi buforami korpusu. Wiele bezpośrednich partii i pełny zbiorczy odbiór fizycznego C2 pozostają do dalszej integracji. Następny zakres: Sol do oceny, implementacji i weryfikacji.

Postęp: **61/72 = 84,7%**; pierwsze wydanie **61/68 = 89,7%**.
