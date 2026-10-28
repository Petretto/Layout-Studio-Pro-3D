# 7.12.C2-B3d — zatrzymanie obsady korpusu w grafie

Data: 2026-10-28. Status: **wdrożone dodatnie wyjścia korpusów z zatrzymaniem pełnej obsady**. Całe B3/C2/7.12 w trakcie.

## Zmiana i zgodność

`graphBodyBuffers.ts` rozpoznaje `bbas` na rzeczywistych wyjściach ścieżki korpusu. `workerSchedule.ts` zatrzymuje obsadę po obróbce, gdy wyjście jest pełne, i zamyka rezerwację przy rzeczywistym odłożeniu. Ta sama ochrona przyszłych prac, dojazdów i powrotów obejmuje obsadę korpusów i podmontaży. Lokalna kontynuacja zachowuje profile B3c; nie jest blokadą wyjścia. Nie zmieniono schematu modelu 6, migracji ani rozprowadzanych przykładów.

Backup: `backup/v0.4.0_przed_c2_b3d_20261028`, 4 pliki rdzenia/testów/UI, niezależne SHA-256 źródła i kopii PASS. Niezależny `outputs/data_audit/eko_7_1.json` pozostaje poza pakietem.

## Dowody

5 nowych testów B3d PASS:

- Niezależny mały wzorzec: trzy jawne partie i korpusy, obróbki początkowe 30–40, 40–50 i 50–60. Pierwszy korpus czeka w wejściu odbiorcy do 100, drugi zajmuje wyjście źródła, trzeci zatrzymuje obsadę od 60 do odłożenia przy 100. Przy niezależnym odbiorcy i jawnej osobie transportującej wyniki wyrobów wynoszą 110/120/133. Osoba trzeciej obróbki pozostaje zarezerwowana do 100. Identyczne czasy również bez skończonych buforów gałęzi.
- W syntetycznym C2 ze wspólnym monterem źródła/przewozu pełne wyjście nie zwalnia go do wcześniejszego korpusu: zgłaszany jest martwy punkt z jawnym `MU-W3` i polityką `bbas`, bez mutacji projektu.
- Jawne przypisanie innego montera `MU-W6` do załadowanego przewozu pozwala kontynuować. Powrót przypisany do `MU-W3` czeka na rzeczywistą dostępność: 80–90, 510–520 i 580–590. Trzecia obróbka korpusu 90–130, zatrzymanie kopii i osoby do 500, blokada 370. Wyniki 700/790/840 są referencją regresyjną zmodyfikowanej próby, nie pomiarem ani deklaracją optymalnej przepustowości. Każda udana rezerwacja ma rzeczywisty skończony koniec i brak nakładania.
- Przy wolnym wyjściu osoba kończy po obróbce. Przy lokalnej kontynuacji pierwsza osoba może kończyć przy 15, a kopia czeka do 50 zgodnie z profilem; `bbas` dotyczy dopiero rzeczywistego wyjścia z tej kopii.
- Częściowa obecność na początku lub końcu operacji mogącej zatrzymać obsadę odmawia bez dopowiadania reguły powrotu i bez mutacji.

`node scripts/test.mjs --suite=network '--test-name-pattern=7.12.C2|3.4m|3.5'`: **151/151 PASS**, log `outputs/qa/7_12c2_b3d/scoped.txt`. Dwie historyczne asercje zakresu zastąpiono aktualnymi odmowami częściowej obecności oraz niejawnego odbioru końcowego. Pełnej regresji nie powtarzano; ostatni pełny checkpoint B3b 471/471 pozostaje bazą, a bieżący podzbiór obejmuje zmienione księgi, bufory, transport i zaopatrzenie.

Build/typecheck PASS. `node tests/qa/verify_7_12c2_b3d.mjs`: rzeczywisty Edge PASS — chroniony import, wynik 840, blokada korpusu 130–500, obsada zarezerwowana 90–500, reszty 6+6, odświeżenie i eksport z porównaniem obu konfiguracji buforów oraz dokładnego źródła. Błędy runtime 0. Dowody: `outputs/qa/7_12c2_b3d/ui.json`, `body_buffers.png`, `component_stock.png`. Instrukcja MD/HTML/PDF aktualizowana; kontrola pochodnych w `outputs/qa/manual_7_12c2_b3d/`.

Kontrola instrukcji PASS: **66 stron, 53 ilustracje**, zgodność HTML/MD, kompletność sekcji, brak pustych stron i tekstu poza stroną. Oględziny strony 30 z nową polityką zatrzymania PASS. Wynik `outputs/qa/manual_7_12c2_b3d/report.json`.

## Pozostałe ograniczenia

Pojemności 0 korpusów w grafie, częściowa obecność przy zatrzymywanym wyjściu, zmienne kopie, przezbrojenia oraz wejście 0 podmontażu ze skończonymi buforami korpusu nadal wymagają dalszej integracji. Wiele bezpośrednich partii i pełny odbiór C2 pozostają w trakcie. Następny zakres wymaga Sol do oceny/implementacji/weryfikacji.

Postęp głównych ID: **61/72 = 84,7%**; pierwsze wydanie **61/68 = 89,7%**.
