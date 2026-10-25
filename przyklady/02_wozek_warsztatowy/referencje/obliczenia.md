# Niezależny analityczny rachunek wzorcowy — Projekt średni

Data: **2026-10-24**. Autor: **Antigravity Codex**.
Projekt: **02_wozek_warsztatowy** (poziom intermediate, 7.12.C).

Obliczenia wyprowadzono ręcznie na podstawie prawideł inżynierii przemysłowej i teorii kolejek, całkowicie niezależnie od kodu symulatora aplikacji.

## 1. Popyt, czas dostępny i takt klienta

- Roczne zapotrzebowanie: $D = 40\,000$ szt./rok.
- Dni robocze: $250$ dni/rok $\rightarrow$ popyt dzienny: $40\,000 / 250 = 160$ szt./dzień.
- Czas dostępny: $1$ zmiana $\times 8$ h $= 28\,800$ s/dzień.
- **Takt klienta (Takt Time)**:
  $$TT = \frac{28\,800\text{ s}}{160\text{ szt.}} = 180\text{ s/szt.}$$
  Oba warianty montażu bez trudu pokrywają zapotrzebowanie klienta z dużym marginesem bezpieczeństwa.

## 2. Wariant Bazowy (INTERMEDIATE-BASE)

- **Obsada**: 4 pracowników jednoosobowo na 4 stanowiskach:
  - $S_1$ (OP10): $60$ s (Jan Monter, kompetencja WW-C-MECH)
  - $S_2$ (OP20): $80$ s (Adam Mechanik, kompetencja WW-C-MECH) — **wąskie gardło linii**
  - $S_3$ (OP30): $50$ s (Piotr Wyposażeniowiec, kompetencja WW-C-FIT)
  - $S_4$ (OP40): $40$ s (Ewa Kontroler, kompetencja WW-C-QC)
- **Czas cyklu linii (takt nominalny)**:
  $$CT_{\text{base}} = \max(60, 80, 50, 40) = 80\text{ s/szt.}$$
- **Nominalna zdolność produkcyjna**:
  $$Cap_{\text{base}} = \frac{3600}{80} = 45\text{ szt./h}$$
- **Czas przejścia pierwszej sztuki (Lead Time)**:
  $$LT_1 = 60 + 80 + 50 + 40 = 230\text{ s}$$
- **Czas realizacji partii $N=3$ sztuki**:
  Kolejne sztuki opuszczają wąskie gardło co $80$ s:
  - Sztuka 1: $230$ s
  - Sztuka 2: $230 + 80 = 310$ s
  - Sztuka 3: $310 + 80 = 390$ s
  - Makespan partii 3 sztuk: **390 s**.

## 3. Wariant Zbalansowany (INTERMEDIATE-BALANCED)

- **Reorganizacja**: Do wąskiego gardła OP20 przydzielono drugiego pracownika (Marek Monter wspierający, WW-W5).
- **Czasy operacji**:
  - $S_1$ (OP10): $60$ s (1 monter) — **nowe wąskie gardło**
  - $S_2$ (OP20): $45$ s (2 monterów wspólnie)
  - $S_3$ (OP30): $50$ s (1 monter)
  - $S_4$ (OP40): $40$ s (1 kontroler)
- **Nowy czas cyklu linii**:
  $$CT_{\text{bal}} = \max(60, 45, 50, 40) = 60\text{ s/szt.}$$
- **Nominalna zdolność produkcyjna**:
  $$Cap_{\text{bal}} = \frac{3600}{60} = 60\text{ szt./h} \quad (+33,3\%)$$
- **Czas przejścia pierwszej sztuki**:
  $$LT_1 = 60 + 45 + 50 + 40 = 195\text{ s} \quad (-35\text{ s})$$
- **Czas realizacji partii $N=3$ sztuki**:
  Kolejne sztuki opuszczają nowe wąskie gardło co $60$ s:
  - Sztuka 1: $195$ s
  - Sztuka 2: $195 + 60 = 255$ s
  - Sztuka 3: $255 + 60 = 315$ s
  - Makespan partii 3 sztuk: **315 s** (skrócenie o $75$ s, czyli $19,2\%$).


## Odbiór fizyczny C1 (2026-10-25)

Powyższe 390/315 s pozostają wzorcami JIT. W trybie configured, 3 sztuki / odstęp 1 s / JIT WYŁĄCZONY, monter źródłowy wykonuje transport i powrót. Założono oddzielnie 10 s przejazdu i 10 s pustego powrotu; nie wyprowadzono czasu powrotu z długości ani czasu załadunku. WW-W1 obsługuje S1–S2, WW-W2 S2–S3, WW-W3 S3–S4; WW-W5 wspiera montaż S2, nie transport.

Rachunek przed uruchomieniem silnika: S1 pierwszej sztuki 0–60, przewóz 60–70, powrót 70–80, więc następna praca S1 80–140 i 160–220. Baza: S2 70–150, potem przewóz/powrót 150–170, następne prace S2 170–250 i 270–350. S3 zaczyna po dojeździe w 160/260/360, pracuje po 50 s i przekazuje do S4 po dalszych 10 s. S4 kończy w 260/360/460.

Reorganizacja: S2 pracuje 70–115, 150–195 i 230–275 (zespół 2 osób), a S3 125–175, 205–255 i 285–335. Po 10 s przewozu i 40 s pracy S4 końce to 225/305/385. Pełne okna obu wariantów zapisano w JSON. Każdy z 7 zapasów zużywa 3 jawne jednostki: końcowo 7, brak dostaw przed 900 s.

Próba dostawy: ustaw tylko zapas początkowy SUP-RAMA na 0. Pierwsza dostawa nadal 900 s, więc cała sekwencja przesuwa się o 900 s: baza 1160/1260/1360, reorganizacja 1125/1205/1285. Dostawa w 900 s poprzedza zużycie w tej samej chwili.

Próba blokady (baza): wyjście S1=1, wejście S2=0, zmiana kalendarza S2 zaczyna się w 600 s. Pierwszy wyrób czeka po S1; drugi kończy S1 w 120 s i pozostaje na stanowisku. Bezpośredni przewóz pierwszego wyrobu może ruszyć najwcześniej 590 s, aby przyjechać na gotowe S2 w 600 s. Zwolnienie miejsca wyjściowego zwalnia blokadę drugiego wyrobu w 590 s. Operator jest zwolniony zgodnie z bbas-worker-released; fizyczny korpus/stanowisko nie znikają przy zakończeniu pracy w 120 s.
