# Raport porównania wariantów szkicu 6 (4.5 / 4.6)

## 1. Wersja danych, wspólne warunki eksperymentu i założenia kosztowe
- **Wersja danych:** schemat roboczy szkicu `v6` (projekt źródłowy `v4`)
- **Wariant bazowy:** Baza — 3 stanowiska / 3 osoby (`BASIC-BASE`, zapis: `2026-10-21T00:00:00.000Z`)
- **Wielkość partii:** 3 szt.
- **Odstęp przybycia sztuk:** 1 s
- **Tryb transportu:** Tylko proces (just-in-time, pominięty transport i założona dostępność materiałów)
- **Stawki kosztowe:** nie podano jawnych stawek godzinowych ani powierzchniowych — koszty operacyjne i powierzchniowe nie są zgadywane.

## 2. Zestawienie wskaźników: wydajność, czas przejścia, WIP, obsada, powierzchnia i koszty (4.6)

| Wariant | Kategoria | Wydajność stat. / dyn. [szt./h] | Makespan [s] (Δ) | Czas przejścia śr. od przybycia / w procesie [s] | WIP śr. / maks. w procesie (w systemie) [szt.] | Obsada (wykorzystanie śr./maks.) | Stanowiska i kopie (zajętość śr./maks.) | Powierzchnia ob. / obrys / hala [m²] | Koszt oper. partii / jedn. (Δ) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Baza — 3 stanowiska / 3 osoby** *(baza)* | Wariant bazowy | stat. 90 / **63.529** (0 szt./h) | **170** (0 s) | 129 (0 s) / 110 (0 s) | 1.941 (0) / 3 (sys: 2.276 / 3) | 3/3 os. (52.9% / 70.6%) | 3/3 st., 3/3 kopii (52.9% / 70.6%) | 2.88 (0 m²) / 4.16 / 48 | brak jawnych stawek |
| **Konsolidacja — 2 aktywne stanowiska / 2 osoby** | Zmieniony layout | stat. 72 / **56.842** (-6.687 szt./h) | **190** (+20 s) | 139 (+10 s) / 90 (-20 s) | 1.421 (-0.52) / 2 (sys: 2.195 / 3) | 2/3 os. (71.1% / 78.9%) | 2/3 st., 2/3 kopii (71.1% / 78.9%) | 2.88 (0 m²) / 14.56 / 48 | brak jawnych stawek |

## 3. Ograniczenia przepustowości (4.4), czynniki zmian i założenia wariantów

### Baza — 3 stanowiska / 3 osoby (Wariant bazowy) — Wariant bazowy
- **Zmienione czynniki względem bazy:** Punkt odniesienia porównania (wariant bazowy)
- **Najbardziej obciążona kopia stanowiska:** ST-ZM-3#1 (120 s, 70.6% makespanu)
- **Oczekiwania jednoprzyczynowe łącznie:** 117 s (pracownicy: 0 s, transport: 0 s, blokady/kolejki: 0 s, materiał/podzespoły: 0 s, kalendarz: 0 s, inne: 117 s)
- **Oczekiwania wieloprzyczynowe (nierozdzielane arbitralnie):** 0 s
- **Przetrzymanie na zablokowanym wyjściu / kontynuacji:** 0 s
- **Ruchy transportowe:** 0 (0 s)
- **Założenia przebiegu:** JIT: pominięto trasy i zasoby transportu oraz założono dostępność materiałów; Czasy operacji zawierają wartości założone (niepomiarowe); Kalendarze zmian/przerw zawierają przedziały założone

### Konsolidacja — 2 aktywne stanowiska / 2 osoby (Zmieniony layout)
- **Zmienione czynniki względem bazy:** Obsada zespołu: 3 → 2 osób (rejestr: 3 → 3); Zmieniono wybraną liczebność lub listę dopuszczonych osób dla operacji; Stanowiska aktywne: 3/3 → 2/3, kopie: 3 → 3; Zmieniono przypisania operacji lub dopuszczone kopie stanowisk; Układ hali / obiekty: Linear (3 ob.) → Linear (3 ob.)
- **Ostrzeżenie porównywalności:** Poza deklarowanym czynnikiem („Zmieniony layout”) zmieniono także: obsada/pracownicy, stanowiska/kopie.
- **Najbardziej obciążona kopia stanowiska:** ST-ZM-1#1 (150 s, 78.9% makespanu)
- **Oczekiwania jednoprzyczynowe łącznie:** 147 s (pracownicy: 0 s, transport: 0 s, blokady/kolejki: 0 s, materiał/podzespoły: 0 s, kalendarz: 0 s, inne: 147 s)
- **Oczekiwania wieloprzyczynowe (nierozdzielane arbitralnie):** 0 s
- **Przetrzymanie na zablokowanym wyjściu / kontynuacji:** 0 s
- **Ruchy transportowe:** 0 (0 s)
- **Założenia przebiegu:** JIT: pominięto trasy i zasoby transportu oraz założono dostępność materiałów; Czasy operacji zawierają wartości założone (niepomiarowe); Kalendarze zmian/przerw zawierają przedziały założone
