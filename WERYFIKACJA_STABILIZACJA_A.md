# Stabilizacja — pakiet A

Data: 2026-09-29. Wersja bazowa: 0.4.0. Schemat danych pozostaje 4.

Mały pakiet w ramach kroków 1.1–1.3 z `PLAN_ROZWOJU.md`. Nie jest odbiorem całego etapu stabilizacji ani wydania komercyjnego.

## Backup i odtworzenie

Kopia przed zmianami kodu: `backup/v0.4.0_przed_stabilizacja_20260929_225906`.

Skopiowano 81 plików i porównano SHA256 każdego pliku źródłowego z kopią: wszystkie zgodne. Kopia obejmuje kod, konfigurację, dokumentację, dane testowe, pliki projektu interfejsu i ówczesny `dist`. Pominięto `node_modules`, `outputs`, starsze backupy, `.git`, `.agents` i `.codex`. Kopiowanie nie podążało za dowiązaniami. Weryfikacja dotyczy zgodności plików w chwili utworzenia kopii; nie wykonano osobnego uruchomienia aplikacji z backupu.

Bezpieczny powrót:

1. Przed powrotem wyeksportuj bieżący projekt do JSON; backup kodu nie zawiera danych z pamięci przeglądarki.
2. Skopiuj zawartość wskazanej kopii do nowego, osobnego katalogu. Nie nadpisuj jedynej bieżącej wersji.
3. W nowym katalogu uruchom `npm ci`, `npm test` i `npm run build`.
4. Uruchom serwer na wolnym porcie. W PowerShell ustaw np. `$env:PORT='4194'`, a następnie wykonaj `npm start`.
5. Wczytaj kopię JSON i sprawdź dane. Zmiana portu oznacza osobny zapis przeglądarkowy. Numer portu w przykładzie wymaga sprawdzenia dostępności.

## Wprowadzone zmiany

### Wspólne usuwanie operacji

Tabela procesu wcześniej usuwała wiersz własną ścieżką, omijając `removeOperation`. Usunięcie jedynej operacji środkowego stanowiska mogło pozostawić np. WS-1 i WS-3, podczas gdy ręczny bilans wymaga numeracji bez luk.

Tabela korzysta teraz ze wspólnej funkcji: usuwa odwołania do operacji i kompaktuje ręczne przydziały tak samo jak diagram. Nie dodaje automatycznie połączenia między dawnymi poprzednikami i następnikami. BOM pozostaje zachowany, a nieaktualne przypisania zgłasza walidacja. Błędy operacji są przechwytywane w formularzu, a powodzenie ma komunikat z informacją o możliwości cofnięcia.

### Ochrona nieaktualnych operacji

`setOperationLinks` i `removeOperation` odrzucają ID operacji, która już nie istnieje. Zapobiega to pozornemu powodzeniu edycji na nieaktualnych danych. Dane wejściowe nie są mutowane.

### Synchronizacja formularzy

Otwarty formularz procesu lub BOM aktualizuje się po zmianie modelu, w tym po Cofnij/Ponów. Gdy edytowany rekord przestaje istnieć, formularz wraca do dodawania. Po zaakceptowanym imporcie formularz jest czyszczony zamiast zachowywać wartości ze starego projektu.

Uwaga UX: niezapisany szkic otwartego rekordu jest zastępowany aktualnymi danymi po zmianie listy procesu/BOM. Nie dodano osobnego magazynu szkiców. To jawne ograniczenie do rozważenia przy dalszym dopracowaniu edytorów.

## Weryfikacja automatyczna

- Przed zmianami: `npm test` — 35/35; `npm run build` — poprawny.
- Dodano 5 testów: brak operacji przy edycji relacji, brak operacji przy usuwaniu, usunięcie środkowego stanowiska z zachowaniem BOM/zasobów, usunięcie operacji współdzielonego stanowiska, zapis i ponowny odczyt po usunięciu.
- Najpierw dwa nowe testy ochrony brakujących ID nie przeszły (38/40). Po dodaniu walidacji: 40/40.
- Po końcowej zmianie formularza importu: ponownie `npm test` — 40/40; `npm run build` — poprawny TypeScript i Vite.
- Istniejące testy importów, JSON, zasobów i Eko również przeszły. To testy funkcji, nie pełne testy interfejsu importu.

## Weryfikacja interfejsu

Wbudowana przeglądarka, osobny adres `http://127.0.0.1:4193/`, domyślny przykład silników. Nie zmieniano zapisów z portów 4173 ani 4192. Sterowanie przyciskami klawiaturą przez dostępne kontrolki; nie jest to test przeciągania myszą.

1. Operacja 1: zmiana nazwy na `TEST QA — korpus`, zapis i ponowne otwarcie edycji.
2. Cofnij: tabela i otwarty formularz wróciły do nazwy „Przygotowanie korpusu i wprasowanie magnesów”.
3. Ponów: tabela i formularz pokazały ponownie nazwę testową.
4. Zapis lokalny i przeładowanie: nazwa testowa zachowana w odtworzonym projekcie. Następnie przywrócono oryginalną nazwę.
5. BOM MOT-ST-01: zmiana nazwy na `TEST QA — stojan`, zapis i ponowne otwarcie edycji.
6. Cofnij/Ponów: formularz i tabela pokazywały odpowiednio nazwę oryginalną i testową. Na końcu cofnięto testową zmianę i zapisano lokalnie.
7. Odczyt konsoli: brak zarejestrowanych ostrzeżeń i błędów.

Zrzut końcowego formularza po cofnięciu testowej nazwy: `Instrukcja/stabilizacja_A_formularz.png`.

Obsługa przez przeglądarkę, zgodnie z umiejętnością computer-use, posłużyła do sprawdzenia rzeczywistego formularza; nie zastąpiono tego wywołaniem ukrytego stanu aplikacji.

## Pozostało do odbioru

- Kliknięcie Usuń i potwierdzenie na jawnie testowych danych, następnie Cofnij/Ponów: testy silnika przeszły, połączenie tabeli z funkcją sprawdzono w kodzie, ale scenariusza usunięcia nie wykonano w UI w tym pakiecie.
- Import pliku przez interfejs, zatwierdzenie zastąpienia i sprawdzenie czyszczenia formularza.
- Pełna ścieżka od pustego projektu przez import, CAD, symulację i raport do ponownego otwarcia.
- Obsługa myszy w 3D, trwałe ID stanowisk i migracje planowane w dalszych krokach.

Dlatego kroki 1.2 i 1.3 pozostają **w trakcie**. Krok 1.1 jest **wdrożony** w zakresie kopii, kontroli zgodności i opisanej procedury odtworzenia.

## Zmienione pliki

- `src/core/editing.ts`
- `src/components/studio/DataEditors.tsx`
- `tests/network.test.ts`
- `PLAN_ROZWOJU.md`
- `FUNKCJE_PROGRAMU.md`
- `WERYFIKACJA_STABILIZACJA_A.md`
- `Instrukcja/stabilizacja_A_formularz.png` — dowód UI.
- Przebudowany `dist`.

Nie zmieniono zależności, schematu JSON, XLSX procesu ani BOM. Nie wdrożono jeszcze nowych funkcji symulacyjnych ani modelu zasobów.
