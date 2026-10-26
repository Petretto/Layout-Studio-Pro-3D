# Raport weryfikacji — Trwałe ID stanowisk (1.5) oraz jawne decyzje zasobów i wyposażenia (1.6)

Data wdrożenia: 2026-10-02  
Wersja: Layout Studio Pro 3D 0.4.0  
Status zadań:
- **1.5 (Wprowadzić trwałe identyfikatory stanowisk, niezależne od numeracji i aktualnego zestawu operacji)**: **wdrożone**
- **1.6 (Zapewnić czytelny wybór zachowania ustawień przy zmianie przydziału, podziale lub scaleniu stanowisk; wyeliminować niejawne resetowanie zasobów)**: **wdrożone**
- **Etap 1 (Stabilizacja i bezpieczeństwo projektu)**: **wdrożone w całości** (1.1–1.8 ukończone)

---

## 1. Cel i zakres pakietu

Zadanie zlikwidowało kluczową wadę dotychczasowego modelu (schemat 4), w którym stanowiska były identyfikowane wyłącznie przez dynamiczne etykiety `WS-n` wynikające z kolejności i zbioru operacji:
- W schemacie 4 usunięcie jedynej operacji ze stanowiska powodowało jego samoczynne zniknięcie, wymuszone przenumerowanie kolejnych stanowisk (`WS-3` stawało się `WS-2`) oraz utratę przypisanych obiektów wyposażenia (stołów ESD, regałów FIFO) i ustawień zasobów (obsady, liczby kopii, czasu zespołu).
- W schemacie 5 tożsamość fizycznego stanowiska stanowi niezmienne, unikalne trwałe ID z prefiksem `ST-` (np. `ST-9e2d4aa4-d871-4da2-b951-81a8f9d98819`). Numer stanowiska (1, 2, 3...) w widokach i tabelach odzwierciedla wyłącznie porządek prezentacji w rejestrze i nie ma wpływu na powiązania techniczne.

### Kluczowe zrealizowane mechanizmy:
1. **Trwałość ID przy zmianie kolejności (1.5):**
   Przesuwanie stanowisk w górę/w dół (↑ / ↓) zmienia wyłącznie ich kolejność w rejestrze; trwałe ID pozostają nienaruszone. Relacje poprzedników są bezwzględnie weryfikowane — zamiana, która umieściłaby poprzednika za jego następcą, jest blokowana (`poprzednik jest na późniejszym stanowisku`).
2. **Jawny podział stanowiska (1.6):**
   Podział (`splitStationProject`) wymaga wskazania konkretnych operacji przenoszonych do nowego stanowiska oraz podania jego nazwy. Dotychczasowe stanowisko zachowuje swoje trwałe ID, wyposażenie (stoły) i ustawienia zasobów. Nowo utworzone stanowisko otrzymuje własne trwałe ID i rozpoczyna pracę bez wyposażenia. Kontrola layoutu natychmiast zgłasza brak wymaganego stołu i blokuje symulację, eliminując ciche domyślanie geometrii.
3. **Jawna edycja geometrii i zasobów po trwałym ID (1.6):**
   Wyposażenie (`TableESD`, `FlowRackFIFO3Tier`, `OperatorErgoMat`) oraz parametry zasobów (obsada, kopie równoległe, czas zespołu) są powiązane bezpośrednio z trwałym ID stanowiska. Dodanie stołu w edytorze geometrii usuwa błąd layoutu i odblokowuje symulację.
4. **Jawne scalenie stanowisk z potwierdzeniem (1.6):**
   Scalenie (`mergeStationProject`) wymaga wskazania zachowywanego ID (`keepId`) oraz wycofywanego ID (`retireId`). Formularz prezentuje dokładną listę usuwanych obiektów layoutu i ustawień zasobów wycofywanego stanowiska oraz wymaga zaznaczenia checkboxa zgody i potwierdzenia dialogowego.
5. **Usuwanie operacji z zachowaniem tożsamości stanowiska (`removeStationOperation` — 1.5 i 1.6):**
   Dodano operację atomowego usunięcia czynności z procesu w schemacie 5. Czynność jest usuwana z `processSteps`, jej referencje są czyszczone z `predecessorIds` pozostałych operacji oraz z pozycji BOM (`associatedProcessStepId`). Stanowisko zawierające dotąd tę operację **zachowuje swoje trwałe ID, wszystkie obiekty w layoutObjects oraz ustawienia w workstationSettings**. Stanowisko staje się stanowiskiem pustym (`operationIds: []`) o czasie cyklu 0 s. Pozostałe stanowiska nie ulegają przenumerowaniu tożsamości.
6. **Pełna odwracalność (Cofnij / Ponów) i trwałość (LocalStorage & JSON):**
   Wszystkie operacje (reorder, split, merge, edycja zasobów, edycja geometrii, usunięcie operacji) są w pełni odwracalne przez przyciski Cofnij/Ponów warsztatu v5 i zachowują integralność po odświeżeniu strony oraz ponownym otwarciu projektu.

---

## 2. Kopia bezpieczeństwa

Przed wprowadzeniem modyfikacji kodu wykonano pełną, zweryfikowaną kopię:
- **Katalog:** `backup/v0.4.0_przed_1_5_1_6_20261002_221500`
- **Liczba plików:** 130 plików źródeł, testów, przykładów i dokumentacji
- **Weryfikacja integralności:** Wszystkie pliki sprawdzone sumami SHA256 w `SHA256.txt`.

---

## 3. Zrealizowane zmiany w kodzie

1. `src/core/stationRevision.ts`:
   - Dodano i wyeksportowano funkcję `removeStationOperation(input: StationProjectV5, operationId: string): StationProjectV5`.
   - Usuwa operację z procesu, czyści powiązania poprzedników i powiązane komponenty BOM.
   - Stanowiska, ich wyposażenie w `layoutObjects` oraz wpisy w `workstationSettings` pozostają nienaruszone.
2. `src/components/studio/StationWorkspace.tsx`:
   - Zaimportowano `removeStationOperation`.
   - Dodano panel UI: „Usuń operację ze stanowiska” z listą wyboru operacji, ostrzeżeniem o zachowaniu tożsamości i wyposażenia, dialogiem potwierdzenia oraz odwracalnością przez Cofnij.
3. `tests/network.test.ts`:
   - Dodano test jednostkowy: `1.5/1.6: usunięcie operacji ze schematu 5 zachowuje trwałe ID stanowiska, jego wyposażenie i zasoby`.
   - Sprawdzono zachowanie ID, pusty zbiór operacji, nienaruszone stoły i ustawienia zasobów, cykl 0 s w bilansie oraz roundtrip przez parser JSON.
4. `tests/qa/verify_1_5_1_6.mjs`:
   - Zautomatyzowany test przeglądarkowy (Edge CDP) weryfikujący pełną ścieżkę na rzeczywistym eksporcie Eko v5.

---

## 4. Dowody weryfikacji

### A. Testy automatyczne jednostkowe i integracyjne
Uruchomienie polecenia `npm.cmd test -- --run`:
```text
✔ 1.5/1.6: usunięcie operacji ze schematu 5 zachowuje trwałe ID stanowiska, jego wyposażenie i zasoby (4.2177ms)
...
ℹ tests 76
ℹ suites 0
ℹ pass 76
ℹ fail 0
```
Wszystkie 76/76 testów zakończyło się wynikiem pozytywnym.

### B. Kompilacja TypeScript i budowanie produkcyjne
Uruchomienie polecenia `npm.cmd run build`:
```text
> tsc && vite build
✓ 68 modules transformed.
dist/index.html                         0.66 kB
dist/assets/index-Dzbt784G.css         62.93 kB
dist/assets/index-B9_OJvgW.js         307.42 kB
dist/assets/spreadsheets-BZe_PqlR.js  491.83 kB
dist/assets/Scene-CK1ksSlq.js         497.53 kB
✓ built in 2.17s
```
Brak błędów typowania TypeScript i ostrzeżeń kompilatora.

### C. Zautomatyzowany odbiór UI w przeglądarce Edge (CDP)
Uruchomiono `node tests/qa/verify_1_5_1_6.mjs` na dedykowanym, odizolowanym serwerze HTTP (port 5197) z portem zdalnego debugowania Edge 9337:
1. **Wczytanie projektu Eko v5:** 17 stanowisk załadowanych z trwałymi identyfikatorami `ST-...`. Stanowisko 1: `ST-9e2d4aa4-d871-4da2-b951-81a8f9d98819` (OP10).
2. **Kontrola zależności grafu przy zmianie kolejności:** Próba przesunięcia Stanowiska 1 w dół została natychmiast zablokowana komunikatem: `Zmiana odrzucona: OP11: poprzednik jest na późniejszym stanowisku.`
3. **Niezmienność trwałego ID przy zmianie kolejności (1.5):** Przesunięcie pustego Stanowiska 10 w górę (zamiana z Stanowiskiem 9) zamieniło pozycje 9 i 10, zachowując bez zmian ich trwałe ID (`ST-947cf188-d95d-4ded-a992-b5be65061876` oraz `ST-79bfb2de-1fb5-4544-b1ee-ae9bdf60d3db`). Przycisk „Cofnij” przywrócił pierwotną kolejność.
4. **Podział stanowiska i brak cichego domyślania wyposażenia (1.6):** Podział stanowiska z OP22 i OP23 przeniósł OP23 na `Nowe Stanowisko QA`. Liczba stanowisk wzrosła do 18. Kontrola layoutu natychmiast zgłosiła: `Nowe Stanowisko QA: layout ma 0 stołów, wymagane 1. Uzgodnij geometrię jawnie.` i zablokowała symulację.
5. **Jawne uzupełnienie geometrii po trwałym ID (1.6):** W edytorze geometrii dodano stół ESD (`1800 × 900 × 850 mm`) powiązany z nowym trwałym ID. Ostrzeżenie o braku stołu zniknęło.
6. **Usunięcie operacji z zachowaniem tożsamości stanowiska (1.5 i 1.6):** Usunięto operację OP10. Liczba stanowisk pozostała równa 18. Stanowisko 1 zachowało swoje trwałe ID `ST-9e2d4aa4-d871-4da2-b951-81a8f9d98819`, ma cykl 0 s, status `Puste` oraz nienaruszone powiązane obiekty layoutu. Przycisk „Cofnij” natychmiast przywrócił OP10 i cykl 3480 s; „Ponów” ponownie usunął operację.
7. **Przeładowanie strony i pełny roundtrip persystencji:** Po odświeżeniu aplikacji (`Page.reload`) i wejściu do warsztatu v5 stan 18 stanowisk, puste Stanowisko 1 z trwałym ID oraz Nowe Stanowisko QA ze stołem zostały w 100% odtworzone z `layout-studio-stations-v5`.
8. **Zrzut ekranu:** Utworzono plik dowodowy `outputs/qa/verify_1_5_1_6_stable_ids.png`.

---

## 5. Ograniczenia i wnioski

1. Warsztat v5 stanowi w pełni ustabilizowany, przetestowany fundament tożsamości stanowisk (Etap 1).
2. W schemacie 4 (starsze karty aplikacji) zachowano pełną kompatybilność wsteczną; schemat 5 jest w pełni walidowany i gotowy do dalszego rozwoju w Etapie 2 (zaawansowany model zasobów i procesów).
3. Podział i scalenie stanowisk oraz usunięcie operacji nie przypisują automatycznie wyposażenia przez domysły — każde wyposażenie wymaga jawnej decyzji użytkownika, co całkowicie eliminuje ukryte błędy produkcyjne.
