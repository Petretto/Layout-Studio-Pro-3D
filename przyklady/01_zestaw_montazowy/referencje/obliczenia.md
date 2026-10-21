# Niezależny rachunek kontrolny — dane syntetyczne

Autor: Codex, 2026-10-21. Wzorzec zapisano przed pierwszym wywołaniem silnika. Nie pochodzi z raportu aplikacji. Założenia służą nauce; nie są pomiarami produkcji, normą czasu ani zatwierdzeniem technologii uchwytu.

Trzy manualne operacje jednej sztuki: OP10 = 20 s, OP20 = 30 s, OP30 = 40 s; zależność OP10 → OP20 → OP30. W każdej jedna osoba obecna przez cały czas. Nie ma maszyn, przezbrojeń ani losowości. Materiały są założone jako dostępne w jawnym trybie JIT; czas transportu i lokalizacja korpusu nie są modelowane. Kalendarze wszystkich osób i stanowisk: [0, 28800) s, bez przerw. Jawne bufory mają wejścia po 3 szt., wyjścia pośrednie po 3 szt. i końcowe wyjście null (bez limitu w modelu). Polityka zwalnia osobę podczas blokady po obróbce; w tej małej partii pojemność nie powoduje blokowania. Kontynuacja OP10→OP20 na tej samej kopii zatrzymuje ją do lokalnej kontynuacji, więc inna sztuka nie rozdziela tych operacji.

Historia projektowania: pierwszy test konfiguracji **bez buforów** dał inną, poprawną dla tamtej kolejki sekwencję: przybyłe wcześniej zadania OP10 mogą wyprzedzać gotowe później OP20. Początkowa interpretacja ciągłej kontynuacji nie była w tym modelu zagwarantowana. Przed ponownym testem jawnie dodano bufory do obu wariantów, zgodnie z istniejącą regułą lokalnej kontynuacji. Nie zmieniono wzorcowych liczb ani silnika w celu dopasowania testu; doprecyzowano model danych, dla którego ręczny rachunek jest zdefiniowany.

## Takt i materiał

- 120000 szt./rok ÷ 250 dni = 480 szt./dzień.
- 1 zmiana × 8 h × 3600 = 28800 s/dzień. Brak planowanych przerw, OEE 100% — wyłącznie założenie dydaktyczne.
- Takt klienta = 28800 / 480 = **60 s/szt.**; cel po OEE również 60 s/szt.
- Pracochłonność = 20 + 30 + 40 = **90 osobosekund/szt.**; VA = 16 + 25 + 34 = 75 s, NVA = 4 + 5 + 6 = 15 s.
- BOM: podstawa 1×8 + uchwyt 1×12 + pokrętła 2×1,50 + opakowanie 1×2 = **25 PLN/szt.** Wszystkie ceny są założeniami. Ilości BOM nie są konfiguracją zużycia ani zapasu.

## Baza — trzy stanowiska i trzy osoby

Każda operacja ma własne stanowisko, wyposażenie i osobę. Dla sztuki j i operacji k start = max(przybycie sztuki, koniec poprzedniej operacji tej sztuki, zwolnienie stanowiska/osoby przez poprzednią sztukę). Przybycia: 0, 1, 2 s. Ręczne stosowanie tego wzoru daje tabelę w `oczekiwane_wyniki.json`:

| Sztuka | OP10 | OP20 | OP30 |
| --- | --- | --- | --- |
| 1 | 0–20 | 20–50 | 50–90 |
| 2 | 20–40 | 50–80 | 90–130 |
| 3 | 40–60 | 80–110 | 130–170 |

Koniec partii = **170 s**. Nominalna zdolność statyczna = 3600 / max(20,30,40) = **90 szt./h**. Wymagane tempo = 3600/60 = 60 szt./h. Nie utożsamiać 3/170×3600 z nominalną zdolnością: mała partia zawiera rozruch linii.

## Konsolidacja — dwa aktywne stanowiska i dwie osoby

OP10 i OP20 wykonuje W1 kolejno na S1, bez zmiany ich czasów. OP30 pozostaje na S3 z W3. S2, jego stół i W2 pozostają zdefiniowaną rezerwą, nie zwiększają aktywnej zdolności. Wyposażenie EQ1 ma jawnie dopuszczone obie operacje. Zmiana obejmuje przydział i skład przebiegu, nie jest izolowanym eksperymentem pojedynczego czynnika.

| Sztuka | OP10 | OP20 | OP30 |
| --- | --- | --- | --- |
| 1 | 0–20 | 20–50 | 50–90 |
| 2 | 50–70 | 70–100 | 100–140 |
| 3 | 100–120 | 120–150 | 150–190 |

Koniec partii = **190 s**. S1 ma 50 s/szt., S3 40 s/szt.; zdolność nominalna = 3600/50 = **72 szt./h**. Oba warianty mieszczą się w celu 60 s, ale konsolidacja ma niższą maksymalną zdolność i dłuższy czas tej partii. Nie deklarować wzrostu przepustowości ani oszczędności pieniężnych bez stawek. Geometria i animacja nie skracają operacji.

Tolerancja czasu w testach: bezwzględna 1e-9 s. Liczniki, ID, ilości i przydziały wymagają zgodności dokładnej. Dodatkowo sprawdzić wszystkie 9 okien każdej odmiany, brak nakładania rezerwacji tej samej osoby i brak mutacji danych po symulacji. Wariant na jedną sztukę ma 90 s w obu układach.
