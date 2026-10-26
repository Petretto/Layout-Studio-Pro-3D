# Weryfikacja punktu 5.12 — pobieralne szablony importu procesu i BOM (XLSX / CSV) oraz specyfikacja kolumn

## Metryka odbioru
- **Data:** 2026-10-02
- **ID planu:** 5.12
- **Status:** wdrożone
- **Lokalizacja backupu:** `backup/v0.4.0_przed_5_12_20261002_213500` — 105 plików, zgodne SHA256 według `SHA256.txt`
- **Główny przypadek testowy:** Pobranie i roundtrip szablonów procesu (4 operacje wielogałęziowe) i BOM (5 komponentów we wszystkich 4 pojemnikach) oraz walidacja brakujących kolumn i błędów wierszy.

## Zakres implementacji
1. **Gotowe szablony importu XLSX i CSV (`src/core/export/excelImporter.ts`):**
   - Wyeksportowano wzorcowe dane wielogałęziowe `TEMPLATE_PROCESS_STEPS` (OP10 → OP20, OP25 → OP30) demonstrujące podział i złączenie gałęzi, czasy VA/NVA oraz poprzedników i następników.
   - Wyeksportowano wzorcowe komponenty `TEMPLATE_BOM_COMPONENTS` (5 pozycji) demonstrujące powiązania z krokami procesu, formaty ilości i kosztu oraz wszystkie dopuszczalne typy pojemników (`BoxKLT`, `Tray`, `Carton`, `Pallet`).
   - Przygotowano funkcję `createTemplateWorkbook(kind)`, która generuje dwuarkuszowy skoroszyt XLSX:
     - Arkusz 0 (`Dane`) — dane gotowe do bezpośredniego zaimportowania przez aplikację bez modyfikacji pliku,
     - Arkusz 1 (`Opis kolumn`) — pełna specyfikacja techniczna wymagań, formatów, typów i jednostek.
   - Dodano funkcje `templateWorkbookBytes` oraz `exportTemplate`, obsługujące pobieranie szablonów w XLSX i CSV.
2. **Czytelne raportowanie brakujących kolumn i walidacja wierszy:**
   - Poprawiono `importProcess` oraz `importBOM`, aby w przypadku braku wymaganych kolumn w arkuszu generować precyzyjny komunikat błędu z wymienieniem dokładnych nazw brakujących nagłówków oraz wskazaniem pobrania szablonu.
   - Zachowano zasadę atomowości importu: niepoprawny plik jest odrzucany w całości, a projekt i historia Cofnij/Ponów pozostają nienaruszone.
3. **Interfejs użytkownika i dokumentacja kolumn (`src/components/studio/DataEditors.tsx` i `src/studio.css`):**
   - W toolbarze kart „2 Proces” i „3 BOM” udostępniono dedykowane przyciski `Szablon XLSX` i `Szablon CSV`.
   - W sekcji rozwijanej `Format importu i specyfikacja kolumn` zaimplementowano tabelę specyfikacji kolumn z informacją o statusie (odznaka `Wymagana` / `Opcjonalna`), typie danych, jednostce i opisie reguł.
   - Pobranie szablonu wyświetla czytelne powiadomienie sesyjne.

## Testy automatyczne i build
- `node scripts/test.mjs --run`: **73/73 testy jednostkowe poprawnie zakończone** (w tym 3 nowe testy punktu 5.12):
  - `5.12: szablony XLSX procesu i BOM importują się bezbłędnie z dwoma arkuszami`,
  - `5.12: brakujące kolumny i niepoprawne wiersze raportują czytelne komunikaty`,
  - `5.12: dokumentacja kolumn procesu i BOM zawiera wymagane atrybuty i statusy`.
- `npm.cmd run build`: **kompilacja TypeScript i budowanie Vite z zerem błędów**.

## Odbiór w interfejsie użytkownika (UI)
Zautomatyzowany test przeglądarki Edge sterowanej protokołem CDP (`tests/qa/verify_5_12.mjs`) na odizolowanym porcie HTTP 5196:
1. **Karta „2 Proces”:**
   - Zweryfikowano obecność przycisków `Szablon XLSX` i `Szablon CSV`.
   - Rozwinięto specyfikację kolumn i sprawdzono kompletność 7 kolumn procesu (`ID Kroku`, `Nazwa Operacji`, `Czas Standardowy [s]`, `Wartość Dodana VA [s]`, `Strata NVA [s]`, `Poprzednicy`, `Następnicy`).
   - Przetestowano kliknięcie `Szablon XLSX` i `Szablon CSV`: potwierdzono sesyjne powiadomienia o przekazaniu pliku.
   - Przetestowano załadowanie wygenerowanego pliku szablonu XLSX procesu: zaakceptowano modal potwierdzenia i zweryfikowano, że w tabeli pojawiły się operacje `OP10`, `OP20`, `OP25`, `OP30`.
   - Zapisano zrzut ekranu: `outputs/qa/verify_5_12_process.png`.
2. **Karta „3 BOM”:**
   - Przełączono do karty BOM i zweryfikowano specyfikację 7 kolumn BOM (`Nr Części (Part No)`, `Nazwa Komponentu`, `Ilość na Wyrób`, `Typ Pojemnika`, `Ilość w Opakowaniu`, `Przypisany Krok`, `Koszt Jednostkowy`).
   - Przetestowano pobranie `Szablon XLSX`: potwierdzono powiadomienie `Przekazano Szablon_bom.xlsx do pobrania.`.
   - Przetestowano przesłanie niepoprawnego pliku (brakujące kolumny): zweryfikowano, że aplikacja wyświetliła czytelny komunikat `Brak wymaganych kolumn BOM: Nr Części (Part No), Nazwa Komponentu... Pobierz szablon z przycisku nad tabelą.` oraz powiadomienie `Import odrzucony. Popraw błędy w raporcie; dane projektu zachowane.`.
   - Zapisano zrzut ekranu: `outputs/qa/verify_5_12_bom.png`.

## Ograniczenia i wnioski
- Szablony XLSX zawierają jako arkusz 0 tabelę danych, co umożliwia natychmiastowe wczytanie pliku szablonu do aplikacji bez usuwania arkusza z opisem.
- Jeśli użytkownik otworzy szablon w Excelu i doda własne formuły rozpoczynające się od `=`, `-`, `+`, `@`, eksporter i importer chronią dane przed wstrzyknięciem formuł i normalizują wartości tekstowe.
