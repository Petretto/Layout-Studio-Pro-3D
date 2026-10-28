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


## Niezależny wzorzec fizyczny C2 — 2026-10-28

Dla każdej odizolowanej sztuki przygotowania startują razem w t=0: zasilanie kończy w 50, napęd w 60, korpus w 40 s. W obecnej regule harmonogramowania gotowość technologiczna integracji w 60 s poprzedza zlecenie dostarczenia partii. Oba podmontaże jadą 60–70 niezależnymi wózkami i monterami, ich puste powroty zajmują 70–80. Korpus jedzie 70–80, gdy partie już dotarły, i jego wózek wraca 80–90. Integracja startuje w 80: koniec 150 (baza) lub 120 (zespół). Przewóz do testu 150–160 lub 120–130, osobny powrót 160–170 lub 130–140. Test trwa 50 s: końce 210/180 s. Kolejne sztuki przybywają w 1000 i 2000 s; zasoby poprzedniej są już zwolnione, więc wzorzec przesuwa się o te jawne czasy.

Dla zerowego zapasu zasilacza gałąź A czeka do dostawy w 900 s, pracuje 900–950; gałąź napędu i korpus pozostają 0–60 oraz 0–40. Złączenie czeka na A. Podmontaże jadą 950–960, korpus 960–970, integracja 970–1040 lub 970–1010, a test 1050–1100 lub 1020–1070. Następne sztuki z odstępem 1000 s nie są już opóźnione. Wszystkie ilości, zapasy, terminy, obsady i czasy są jawnymi założeniami syntetycznymi, bez danych magazynowych pracowników.

Ograniczone bufory rozgałęzień (C2-B) oraz skończone i zerowe bufory korpusów zostały wdrożone w schedulerze. Reguła domenowa z 2026-10-28 wyklucza odkładanie detali poza buforem („wiszenie w powietrzu”) przy zbiegu strumieni; silnik poprawnie wymusza bufor wejściowy co najmniej po jednej stronie.
