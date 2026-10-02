# Weryfikacja punktu 3.10 — wyższe mnożniki szybkości odtwarzania symulacji

## Metryka odbioru
- **Data:** 2026-10-02
- **ID planu:** 3.10
- **Status:** wdrożone
- **Lokalizacja backupu:** `backup/v0.4.0_przed_3_10_20261002_211700` — 103 pliki, zgodne SHA256 według `SHA256.txt`
- **Główny przypadek testowy:** Proces Eko (16 operacji, partia 3 sztuk: 21 170 s) oraz Linia Silników EV

## Zakres implementacji
1. **Rozszerzenie wyboru mnożników szybkości:**
   - Wyeksportowano stałą `SIMULATION_SPEEDS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000] as const` w `src/core/algorithms/simulation.ts` oraz udostępniono typ `SimulationSpeed`.
   - W widoku `Simulation.tsx` kontrolka wyboru (`<select aria-label="Szybkość odtwarzania">`) udostępnia wszystkie 12 wartości ze standardowym formatem `v×`.
2. **Krok czasowy i zabezpieczenie granic:**
   - Zdefiniowano `stepSimulationTime(currentTime, deltaRealSeconds, speed, endTime)`, który przycina opóźnienia klatki powyżej 0,25 s real-time (np. uśpienie karty w tle) oraz gwarantuje, że czas symulowany nigdy nie przekroczy `endTime` ani nie cofnie się przy ujemnej delcie zegara.
3. **Pauza, wznowienie i inspekcja:**
   - Zatrzymanie przyciskiem „Pauza” zamraża czas na dokładnej wartości ułamka sekundy.
   - Paski postępu stanowisk, stany aktywne (`runs`), kolejki (`queue`), WIP oraz wydajność są w pełni dostępne do inspekcji.
   - Zmiana szybkości w locie nie powoduje skoków ani zerowania stanu.
4. **Niezależność wyniku obliczeń:**
   - Wynik symulacji zdarzeniowej `simulateNetwork` oraz wygenerowany raport CSV zależą wyłącznie od partii, odstępu uruchamiania i definicji procesu/bilansu — szybkość animacji nie wpływa na żadne obliczenia produkcyjne.

## Testy automatyczne i build
- `node scripts/test.mjs --run`: **70/70 testów poprawnych** (w tym dedykowany test `3.10: mnożniki odtwarzania symulacji ponad 100x, krok czasowy bez przekroczenia i stałość wyników`).
- `npm.cmd run build`: **kompilacja i build produkcyjny poprawne** (tsc + vite, 67 modułów, 0 błędów).

## Odbiór w interfejsie użytkownika (UI)
Zautomatyzowany test bezgłowej przeglądarki Edge sterowanej protokołem CDP (`tests/qa/verify_3_10.mjs`) na odizolowanym porcie HTTP 5193:
1. Załadowano projekt Eko (16 operacji, układ rybia ość).
2. Przejście do karty `6 3D i symulacja`:
   - Zweryfikowano opcje wyboru szybkości: `1×, 2×, 5×, 10×, 20×, 50×, 100×, 200×, 500×, 1000×, 2000×, 5000×`.
   - Początkowy stan: czas 0 / 21 170 s dla partii 3 sztuk.
3. Uruchomiono odtwarzanie przy 1000×:
   - Po 200 ms naciśnięto „Pauza”.
   - Odczytano stan zamrożony: czas symulowany 200,3 s, WIP = 1 szt., 6 aktywnych stanowisk z widocznymi operacjami i kolejkami.
4. Przełączono szybkość na 5000× i wznowiono odtwarzanie:
   - Symulacja płynnie osiągnęła 21 170 s w ok. 4,2 s real-time.
   - Wyświetlono komunikat ukończenia: `Partia ukończona. Czas: 21 170 s; średnio 0,51 szt./h.`
   - Przyciski Start/Pauza zostały prawidłowo zablokowane po dojściu do końca.
5. Wygenerowano raport CSV symulacji:
   - Potwierdzono komunikat `Przekazano Symulacja_partii.csv do pobrania.`
   - Potwierdzono status aktualności: `Raport CSV odpowiada bieżącej partii i odstępowi.`
6. Otwarto kartę `Stanowiska v5`:
   - Wygenerowano layout w schemacie 5 i potwierdzono obecność pełnej palety mnożników (1× do 5000×) w komponencie symulacji warsztatu v5.
7. Zapisano zrzut ekranu weryfikacji: `outputs/qa/verify_3_10.png`.

## Ograniczenia i wnioski
- Mnożniki 2000× i 5000× powodują przeskok o kilkadziesiąt do stu sekund symulowanych na jedną klatkę ekranu (16 ms). Służą do szybkiego dotarcia do interesującego momentu lub ukończenia długich partii. Dokładną analizę poszczególnych sekund procesu należy wykonywać przy niższych mnożnikach (1×–10×) lub za pomocą suwaka osi czasu.
