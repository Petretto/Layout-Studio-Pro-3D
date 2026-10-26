# 7.12.C2-B3-UI — przekazanie formularza dla Terra

Data: 2026-10-26. Status: **zakres przygotowany; implementacja oczekuje na Terra**. To nie jest odbiór B3 ani rozszerzenie obsługi symulacji.

## Routing

Ocena granic B3: Sol — wspólny odbiór partii i korpusu dotyczy rezerwacji, pojemności i gotowości operacji. Formularz można wykonać niezależnie na istniejącym kontrakcie B2a/B2b. Implementacja oraz weryfikacja formularza, historii i zapisu: Terra. Zmiana semantyki danych, walidacji domenowej lub harmonogramu wymaga ponownej oceny na Sol.

Kolejność: B3-UI na Terra → kontrakt i integracja wspólnego odbioru/ograniczonych buforów korpusów na Sol → odbiór obciążonego C2 i niezmienników zasobów na Sol. Ten dokument definiuje tylko pierwszy pakiet; nie ustala jeszcze algorytmu dalszej integracji.

## Kontrakt i pliki

- `src/core/subassemblyBuffers.ts`: istniejące typy i `validateSubassemblyBuffers` są źródłem kontraktu. Wpis ma własny podzespół, jednostkę, stanowisko, kopię, pojemności i jawną politykę operatora. `null` to brak limitu; 0 to przekazanie bez magazynowania; `copy=null` to osobny limit każdej kopii.
- `src/core/domainBuffersEditing.ts`: użyć `editDomainSubassemblyBuffers`; usunięcie przekazuje `undefined`. Nie modyfikować buforów korpusów ani partii.
- Nowy `src/components/studio/DomainSubassemblyBuffersEditor.tsx`: props analogiczne do `DomainBuffersEditor`; `onApply(SubassemblyBuffers | undefined)` zwraca powodzenie zapisu.
- `src/components/studio/DomainDraftPanel.tsx`: podłączyć obok edytorów partii i buforów korpusów, przez `applyDraftChange`, `navigateDraftHistory` i klucz zależny od `draft.raw`. Zachować ochronę oryginału i historię szkicu.
- `tests/network.test.ts`: testy `7.12.C2-B2a` obejmują walidację, zapis i ochronę źródła. Rozszerzać tylko o brakujące przypadki zmienianego zachowania.

Bez zmiany schematu/modelu 6 lub migracji. Przed zmianą podłączenia wykonać kopię zmienianych istniejących plików i niezależnie porównać SHA-256 zgodnie z planem.

## Formularz

- Osobna sekcja „Bufory podmontaży”: jawny wybór podzespołu, jednostki, stanowiska, kopii, pojemności i polityki. Pojemności są nieujemnymi bezpiecznymi liczbami całkowitymi albo jawnym „Bez limitu”. Nie wyprowadzać ich z BOM, czasów ani geometrii.
- Odczytywać istniejące wartości bez automatycznych korekt. Jednostkę można podpowiedzieć z jawnych partii, ale nie zgadywać z nazwy lub domyślnego `szt.`. Nowy wiersz nie może zostać zapisany bez wymaganych wyborów; domyślna kontrolka nie może udawać podanej pojemności lub polityki.
- Dodanie/usunięcie wpisu, zapis, odrzucenie lokalnych zmian, usunięcie całej konfiguracji. Robocza edycja nie zmienia projektu przed zapisem. Błąd walidacji lub nieudany `onApply` zachowuje edycję oraz ostatni poprawny zapis.
- Po zmianie podzespołu/stanowiska nie ukrywać niezgodnych wyborów: pola wymagające korekty pozostają widoczne albo są czyszczone do jawnego ponownego wyboru. Nie dobierać zastępczych danych procesu.
- Przed `onApply` użyć `validateSubassemblyBuffers`; ostateczny zapis przez istniejący helper. Odrzucać puste/ujemne/ułamkowe liczby, konflikty zakresów kopii i jednostek, błędne referencje. Limit 1000 wpisów zgodny z walidatorem.
- Wyjaśnić odrębność pojemności podzespołów i korpusów, liczenie sztuk zamiast partii i reszty zajmujące miejsce. Przy wejściu 0 wskazać wymóg gotowego odbiorcy i pełnego pobrania bez reszty.
- Krótko podać granice wykonania B2b: zapis deklaracji nie rozszerza obsługi wielu partii przy wejściu 0 ani skończonych buforów korpusów z gałęziami. Zachować odmowy schedulera. Nie obiecywać pełnego B3.

## Kryteria odbioru Terra

1. Najmniejszy podzbiór: `node scripts/test.mjs --suite=network --test-name-pattern=7.12.C2-B2a` i nowe celowane testy, jeśli powstają. Sama zmiana formularza nie uzasadnia pełnej regresji ani powtórnego odbioru algorytmu B2b. Build/typecheck na końcu pakietu.
2. Rzeczywisty UI: dwa różne podzespoły w jednej kopii z odrębnymi limitami, edycja/usunięcie, odrzucenie zmian, niepoprawna liczba i nakładanie `copy=null`/konkretnej kopii. Odmowa zachowuje ostatni poprawny zapis.
3. UI: zapis → cofnij → ponów → odśwież → eksport/import pakietu. Porównać `subassemblyBuffers`, niezmienione `stationBuffers`, konfigurację partii i chroniony oryginał. Usunięcie konfiguracji i cofnięcie odtwarzają właściwy stan. Samo otwarcie formularza nie dodaje pola do projektu.
4. Dowody w nowym `outputs/qa/7_12c2_b3_ui/`; nie nadpisywać B2a/B2b. Zaktualizować instrukcję, raport w `docs/weryfikacja/`, indeks i plan według rzeczywistego zakresu. Zweryfikować pochodne instrukcji, jeśli są zmieniane.
5. Uruchomić `node scripts/verify_documentation.mjs` i `node scripts/plan_progress.mjs`, commit/push tylko plików pakietu. B/C2/7.12 pozostaje w trakcie do odbioru integracji; formularz sam nie zamyka głównego ID.

## Stan przekazania

Punkt wyjścia kodu: `6a60c70` (B2b). Niezależna zmiana `outputs/data_audit/eko_7_1.json` pozostaje poza pakietem. B3-UI nie został jeszcze zaimplementowany ani przetestowany. Cały plan: **61/72 = 84,7%**; pierwsze wydanie: **61/68 = 89,7%**.
