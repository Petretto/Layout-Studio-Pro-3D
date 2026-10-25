# Niezależne obliczenia — równoległe podmontaże

Dane syntetyczne, JIT z założoną dostępnością materiałów; nie jest to odbiór transportu fizycznego.
Popyt: 30000 / 250 = 120 szt./dzień, czas dostępny 28800 s, takt klienta 240 s.
Gałęzie A (50 s), B (60 s) i przygotowanie korpusu (40 s) mają oddzielnych monterów i stanowiska oraz jawną grupę MU-PREPARATIONS.
Dla sztuk 1/2/3 końce A to 50/100/150 s, B to 60/120/180 s, korpusu to 40/80/120 s.
Integracja wymaga obu podzespołów i korpusu, a ich zadeklarowane partie pobiera atomowo na starcie.

## Baza — integracja 70 s, test 50 s

Integracja zaczyna w max(50,60,40)=60 s; kolejne starty to max(100,120,80,130)=130 i max(150,180,120,200)=200 s.
Końce integracji 130/200/270 s, końce testu 180/250/320 s. Partia 3 sztuk: **320 s**.
Statyczny pułap kopii: 3600/70 = 51,429 szt./h, nie prognoza wydajności z transportem.

## Reorganizacja — dwie osoby na integracji, jawny czas zespołu 40 s

Integracja 60–100, 120–160, 180–220 s; test 100–150, 160–210, 220–270 s.
Partia: **270 s**, spadek 50 s. Nie dzielimy czasu 70 s przez dwa; 40 s jest jawnym założeniem wariantu.
Pułap determinuje gałąź B: 3600/60 = 60 szt./h. Koszt BOM z jawnych ilości i cen: 1350 PLN/szt.
Nie należy mylić sumy czasów operacji z osobosekundami zespołu: po dodaniu osoby zawartość pracy może rosnąć mimo krótszego wykonania.
