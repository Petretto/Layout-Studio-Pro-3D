# Raport z weryfikacji zadania 5.11: Przełączanie jednostek prezentacji czasu (s / min / h)

Data weryfikacji: 2026-10-02  
Status: **wdrożone**  
Zalecany i użyty model: **Terra** (implementacja React/TypeScript/Three.js)

---

## 1. Cel i kryteria odbioru (Zadanie 5.11)

Celem zadania 5.11 zapisanego w `PLAN_ROZWOJU.md` było:
> Dodać przełączanie prezentacji czasu między sekundami, minutami i godzinami dziesiętnymi w wynikach, osi czasu i właściwych polach czasu. Jednostka ma być zawsze widoczna, a zmiana widoku lub jednostki wejścia ma przeliczać wartość bez zmiany czasu zapisanego wewnętrznie w sekundach (np. 150 min = 2,5 h).

### Kluczowe zasady techniczne i niezmienniki:
1. **Niezmiennik technologiczny**: Wewnętrzny stan modelu procesu (`standardTimeSeconds`, `vaTimeSeconds`, `nvaTimeSeconds`), taktu (`customerTaktSeconds`, `taktTimeSeconds`), bilansowania (`cycleTimeSeconds`, `effectiveCycle`, `bottleneckCycleTimeSeconds`) oraz symulacji pozostaje ściśle i bezwzględnie w **sekundach**. Zmiana jednostki prezentacji wpływa wyłącznie na formatowanie i skalowanie wartości w polach formularzy, etykietach i tabelach UI.
2. **Precyzja przeliczania**: Zastosowano dokładne współczynniki konwersji (1 s = 1, 1 min = 60 s, 1 h = 3600 s) z zaokrągleniem do 6 miejsc po przecinku eliminującym artefakty binarne zmiennoprzecinkowe IEEE-754 (np. 150 min = 2,5 h).
3. **Zawsze widoczna jednostka**: Wszystkie nagłówki kolumn tabel (`Czas [s/min/h]`, `VA / NVA [s/min/h]`), etykiety pól (`Czas standardowy [s/min/h]`), kafelki przepływu procesu, słupki i linie odniesienia Yamazumi, edytory zasobów i symulacji prezentują wybraną jednostkę.
4. **Kompatybilność wsteczna**: Projekty bez zdefiniowanego pola `timeUnit` domyślnie przyjmują `'s'`, zachowując 100% zgodności ze schematem 4. Wartości `'min'` i `'h'` są poprawnie zapisywane w JSON i weryfikowane przez `parseProject`.

---

## 2. Kopia bezpieczeństwa przed realizacją pakietu

Zgodnie z wymogami `PLAN_ROZWOJU.md` przed przystąpieniem do modyfikacji kodu utworzono kopię zapasową projektu:
- **Ścieżka backupu**: `backup/v0.4.0_przed_5_11_20261002_215000`
- **Liczba zabezpieczonych plików**: 124 pliki
- **Weryfikacja spójności**: plik `SHA256.txt` wygenerowany i zweryfikowany; wykluczono foldery `node_modules`, `dist`, poprzednie kopie z `backup/` oraz artefakty z `outputs/`.

---

## 3. Zrealizowane prace implementacyjne

1. **Moduł jądra przeliczania czasu (`src/core/time.ts`)**:
   - `TimeUnit = 's' | 'min' | 'h'`
   - `TIME_UNITS` — metadane jednostek ze współczynnikami (`factor`: 1, 60, 3600)
   - `toSeconds(val, unit)` — konwersja wartości z jednostki wejściowej na sekundy
   - `fromSeconds(sec, unit)` — konwersja z sekund na jednostkę prezentacji
   - `convertTime(val, fromUnit, toUnit)` — bezpośrednie przeliczenie między jednostkami
   - `formatTimeValue(sec, unit, maxDecimals)` — formatowanie liczby z uwzględnieniem polskich reguł separatora dziesiętnego
   - `formatTimeWithUnit(sec, unit, maxDecimals)` — formatowanie liczby wraz z dołączoną jednostką (np. `2,5 min`, `0,0417 h`), z obsługą wartości pustych/nieokreślonych (`—`).

2. **Typy i walidacja schematu (`src/core/models/types.ts`, `src/core/validation.ts`)**:
   - Dodano pole `timeUnit?: TimeUnit` do interfejsu `ProjectData`.
   - Zaktualizowano `parseProject`: normalizacja do `'s'` przy braku pola, obsługa `'min'` i `'h'`, jawne odrzucanie nieobsługiwanych jednostek.

3. **Komponenty formularzy i pól (`src/components/studio/Fields.tsx`)**:
   - Utworzono komponent `TimeField`, enkapsulujący dwukierunkowe przeliczanie: przyjmuje wartość w sekundach i jednostkę `unit`, prezentuje przeliczoną wartość i etykietę `[${unit}]`, a przy wprowadzaniu zmian wywołuje `onChange` z wartością przeliczoną z powrotem na sekundy.

4. **Widoki aplikacji**:
   - `src/App.tsx`:
     - Przełącznik jednostki czasu (`Jednostka czasu`) w pasku nagłówkowym oraz w zakładce `1 Popyt i takt` (obok wyboru waluty BOM).
     - Przeliczanie metryk: `Pracochłonność` na pulpicie, `Takt klienta` i `Cel cyklu po OEE` w popycie, `Odstęp wąskiego gardła` w bilansowaniu.
     - Tabela wariantów: dynamiczny nagłówek `Cel cyklu [${unit}]` oraz przeliczone wartości.
   - `src/components/studio/DataEditors.tsx`:
     - Tabela procesu: nagłówki `Czas [${unit}]` oraz `VA / NVA [${unit}]`, formatowanie komórek przez `formatTimeValue`.
     - Formularz operacji: użycie `TimeField` dla czasu standardowego i wartości dodanej VA z etykietami `[${unit}]`.
   - `src/components/studio/OperationInspector.tsx`:
     - Wyświetlanie i edycja czasu w `unit` w inspektorze operacji.
   - `src/components/studio/ProcessFlow.tsx`:
     - Etykiety czasu w nagłówkach i stopkach kafelków operacji diagramu przepływu.
   - `src/components/studio/BalancingBoard.tsx`:
     - Wykres Yamazumi: formatowanie celu taktu oraz cykli poszczególnych operacji i stanowisk w `unit`.
   - `src/components/studio/ResourceEditor.tsx`:
     - Jawny cykl zespołu oraz cykle bazowe i efektywne prezentowane i edytowane w `unit`.
   - `src/components/studio/Simulation.tsx`:
     - Wyświetlanie czasu partii, odstępu uruchamiania oraz cykli stacji w `unit`.

---

## 4. Wyniki testów automatycznych i weryfikacji builda

1. **Testy jednostkowe i integracyjne (`tests/core.test.ts`)**:
   - Dodano test `5.11: przeliczanie i formatowanie czasu między sekundami, minutami i godzinami` weryfikujący `toSeconds`, `fromSeconds`, `convertTime`, `formatTimeValue`, `formatTimeWithUnit` dla s, min, h (w tym przypadek z zadania: 150 min = 2,5 h).
   - Dodano test `5.11: walidacja projektu zachowuje jednostkę czasu i wewnętrzne sekundy` weryfikujący zachowanie sekund w modelu przy różnych jednostkach prezentacji oraz odrzucanie nieznanych jednostek.
   - Wynik wykonania testów:
     ```
     ✔ 5.11: przeliczanie i formatowanie czasu między sekundami, minutami i godzinami (10.7816ms)
     ✔ 5.11: walidacja projektu zachowuje jednostkę czasu i wewnętrzne sekundy (0.6775ms)
     ℹ tests 75
     ℹ suites 0
     ℹ pass 75
     ℹ fail 0
     ```

2. **Kompilacja i bundling (`npm run build`)**:
   - `tsc && vite build` zakończone sukcesem bez błędów i ostrzeżeń.

---

## 5. Odbiór w interfejsie użytkownika (UI verification)

Automatyczny test przeglądarkowy CDP zrealizowano w skrypcie `tests/qa/verify_5_11.mjs` (port serwera 5195, port CDP 9335, izolowany profil przeglądarki Edge):
- **Krok 1**: Uruchomienie aplikacji i weryfikacja domyślnej jednostki `s` na pulpicie (`Pracochłonność: 238 s/szt.`).
- **Krok 2**: Przejście do zakładki `2 Proces` i potwierdzenie nagłówków tabeli `Czas [s]`, `VA / NVA [s]`.
- **Krok 3**: Przełączenie `Jednostka czasu` w nagłówku na `min`.
- **Krok 4**: Potwierdzenie dynamicznej zmiany nagłówków tabeli procesu na `Czas [min]`, `VA / NVA [min]`.
- **Krok 5**: Otwarcie formularza edycji operacji — etykiety pól przyjęły postać `Czas standardowy [min]`, `VA wartość dodana [min]`.
- **Krok 6**: Wprowadzenie wartości `2.5 min` (150 s) i zatwierdzenie formularza.
- **Krok 7**: Inspekcja `localStorage['layout-studio-v3']`:
  - `timeUnit` zapisany jako `'min'`.
  - `processSteps[0].standardTimeSeconds` wynosi dokładnie **150** (nie 2.5) — zachowano niezmiennik technologiczny!
- **Krok 8**: Przejście do zakładki `4 Bilans` — wskaźnik wąskiego gardła poprawnie wyświetlił `2,5 min`.
- **Krok 9**: Przełączenie jednostki na `h` — wskaźnik wąskiego gardła poprawnie wyświetlił `0,0417 h`.
- **Zrzut ekranu**: Zapisano do `outputs/qa/verify_5_11_time_units.png`.

---

## 6. Wnioski i ograniczenia

- Zadanie 5.11 zostało w pełni wdrożone i zweryfikowane.
- Niezmiennik modelu czasu w sekundach pozostał w 100% nienaruszony.
- Eksporty CSV/XLSX posiadające jawne nagłówki `[s]` zachowują sekundy dla pełnej kompatybilności analitycznej.
