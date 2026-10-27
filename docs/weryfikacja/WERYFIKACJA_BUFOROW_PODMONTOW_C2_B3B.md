# 7.12.C2-B3b — dodatnie bufory korpusów z gałęziami

Data: 2026-10-27. Status: **wdrożone w zakresie dodatnich buforów i zwolnienia operatora po obróbce**. Całe B3/C2/7.12 w trakcie.

## Zakres i bezpieczeństwo

Wspólny grafowy harmonogram obsługuje korpus, skończone bufory jego uporządkowanej ścieżki, partie podmontaży oraz wspólne zasoby. `graphBodyBuffers.ts` łączy istniejące zdarzenia korpusu i pojemności atomowo; transport nie omija rezerwacji celu. Pełne wyjście zatrzymuje korpus, kopię i wyposażenie, ale zwalnia osobę zgodnie z `bbas-worker-released`. Operacja zaczyna się po rzeczywistej dostępności korpusu, wszystkich przypisanych partii i materiału.

Bez zmiany schematu modelu 6 lub migracji. Rozprowadzane przykłady pozostają niezmienione. Kopia przed zmianami: `backup/v0.4.0_przed_c2_b3b_20261027`, 5 plików, niezależne SHA-256 źródła i kopii PASS. Zmieniony niezależnie `outputs/data_audit/eko_7_1.json` pozostaje poza pakietem.

## Dowody

5 nowych testów B3b:

- Niezależny mały wzorzec: podmontaż 0–10, początkowa obróbka korpusu 10–20, korpus jedzie 20–22, wózek wraca 22–27, partia jedzie 27–29 i wózek wraca 29–34. Korpus oraz partia czekają na odbiorcę do 50; praca kończy się przy 60. Brak nakładania osób, zgodność historii korpusu w ruchu przy 21 i na odbiorcy przy 30.
- Rezerwacja ostatniego miejsca wejściowego podczas ruchu odmawia przewozu drugiego korpusu bez mutacji obu ksiąg. Miejsce zwalnia dopiero rozpoczęcie pierwszej operacji.
- Dostawa przy 80 nie przesuwa przyjazdu korpusu przy 22. Pobranie partii i materiału następuje przy 80 po dostawie, koniec przy 90.
- Jawne odmowy: pojemność 0, zatrzymanie obsady korpusu, skończony bufor końcowy, niewłaściwa początkowa lokalizacja i wejście 0 podmontażu w połączeniu ze skończonymi buforami korpusu.
- Syntetyczne spiętrzenie pełnego grafu C2, 3 zlecenia co 1 s, jawny kalendarz integracji od 500, bufory korpusów po 1, osobne wejścia podmontaży po 20 i partie 5/3. To próba regresyjna, nie pomiar produkcji ani certyfikowana referencja przepustowości. Wyniki wyrobów: 700/790/840 s. Trzeci korpus obrabiany 100–140, zatrzymuje stanowisko do 500, czyli 360 s; osoba kończy przy 140. Podmontaże pozostawiają 6+6 szt. reszt. Historia przy 400 zachowuje trzeci korpus jako zajęty na pierwszej kopii. Priorytet zadań i wspólni monterzy mogą odraczać transport wyrobu po końcu operacji; wynik nie jest deklaracją optimum.

Pełny checkpoint integracyjny: **471/471 PASS = 109 core + 362 network**. Uruchomiono ze względu na zmianę wyboru schedulera i wspólnych ksiąg korpusu/pojemności, po poprzednich pakietach od checkpointu B2b. Dwie dawne asercje odmowy zaktualizowano do aktualnego zakresu i jednoznacznych błędów; brak usunięcia kontroli braku zużycia materiałowego. Logi `outputs/qa/7_12c2_b3b/core.txt` i `network.txt`. Dodatkowy związany zakres: **139/139 PASS**, log `final_scoped.txt`.

Build/typecheck PASS. `node tests/qa/verify_7_12c2_b3b.mjs`: rzeczywisty Edge PASS — chroniony import, wynik 840, blokada 140–500, osoba 100–140, osobne zapasy 6+6, odświeżenie i eksport z porównaniem konfiguracji korpusów/podmontaży oraz dokładnego źródła. Błędy runtime 0. Dowody: `outputs/qa/7_12c2_b3b/ui.json`, `body_buffers.png`, `component_stock.png`.

Instrukcja MD/HTML/PDF i komunikaty UI aktualizowane do zakresu B3b. Kontrola PASS: 65 stron, 53 ilustracje, zgodność HTML/MD, brak brakujących sekcji, pustych stron i tekstu poza stroną. Oględziny stron 29–30 z nowym zakresem PASS. Wyniki w `outputs/qa/manual_7_12c2_b3b/report.json`.

## Pozostały zakres

Zera i `bbas` korpusów w grafie, lokalna kontynuacja w grafie, wiele bezpośrednich partii, alternatywne kopie ścieżki i przezbrojenia pozostają poza B3b. Obecny test spiętrzenia nie zamyka pełnego fizycznego C2 ani zbiorczego odbioru D. Kontynuacja oceny/implementacji/weryfikacji wymaga Sol.

Postęp głównych ID: **61/72 = 84,7%**; pierwsze wydanie **61/68 = 89,7%**.
