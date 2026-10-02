# v0.3.1 — interaktywne balansowanie i przepływ procesu

Data: 27.09.2026. Inspiracja: projekt użytkownika `C:/AI/GoogleStudio/lean-factory-designer-pro_v2.5`, w szczególności `BalancingTab.tsx`, `FlowTab.tsx` i `ProcessEditor.tsx`. Projekt źródłowy pozostał niezmieniony. Interakcje zaadaptowano do modelu i walidacji Layout Studio, bez kopiowania drugiego modelu danych, kluczy API czy integracji chmurowych.

## Kopia przed zmianami

`backup/v0.3_przed_integracja_20260927_165133`

Kopia zawiera źródła, konfigurację, lockfile, poprzedni build, dokumentację i pliki procesu oraz BOM Eko. Pominięto `node_modules` (odtwarzalne), wcześniejsze backupy, `.git` oraz katalog pomocniczy `outputs` z generatorami i podglądami dokumentów. Pliki użytkowe z `tests` i `Instrukcja` są w kopii.

Aby uruchomić starą wersję bez nadpisywania nowej, otwórz terminal w katalogu tej kopii, wykonaj `npm ci`, a następnie `npm run dev -- --host 127.0.0.1 --port 5190`. Kopia nie obejmuje localStorage przeglądarki. Przed powrotem do starej wersji wyeksportuj aktualny projekt JSON.

## Wdrożone funkcje

### Dynamiczny Yamazumi — etap 4 Bilans

- Wykres słupkowy z oddzielnym, proporcjonalnym czasowo segmentem każdej operacji.
- Linia docelowego cyklu, czas sumaryczny, obciążenie procentowe, suma VA i oznaczenie przekroczenia dla każdego stanowiska.
- Przeciąganie operacji między słupkami oraz na pole „Nowe stanowisko na końcu”.
- Alternatywna obsługa bez przeciągania: listy operacji i stanowiska, przycisk „Przenieś operację”. Lista pozwala wybrać także bardzo krótki segment.
- Przeniesienie przełącza bilans na Manual. Operacje i przypisania materiałów pozostają w projekcie. Puste stanowiska są usuwane, a numery porządkowane.
- Ruch, który umieszcza poprzednika na późniejszej stacji, jest odrzucany przed zmianą danych. Przeciążenie stacji jest dozwolone, lecz jawnie oznaczone.
- Wybór segmentu otwiera formularz nazwy, czasu i VA. „Zapisz operację” zatwierdza formularz i przelicza zależne wyniki. NVA jest różnicą czasu i VA.
- Przybliżanie i oddalanie wykresu oraz powrót do skali 100%.
- Dotychczasowe numeryczne przypisania ręczne są dostępne w zwijanej sekcji „Zaawansowane przypisania ręczne”.

### Dynamiczny przepływ — etap 2a Przepływ

- Osobny etap na pasku nawigacji. Ten sam edytor otwiera przycisk „Diagram” w etapie 2 Proces.
- Kafelki z ID, nazwą, czasem, VA i liczbą pozycji BOM, połączone strzałkami następstwa.
- Przesuwanie kafelków z opcjonalną siatką 20 px. Jedno zakończone przeciągnięcie to jedna zmiana historii, nie dziesiątki wpisów.
- Przesuwanie tła, przybliżanie, oddalanie i dopasowanie całości.
- „Ułóż według zależności” odtwarza kolumny grafu po potwierdzeniu. Nie zmienia zależności technologicznych.
- Dodawanie niezależnej operacji lub następnika wybranej operacji, z unikalnym ID.
- Łączenie portem „+” i wyborem celu albo dwiema listami oraz przyciskiem „Połącz operacje”.
- Usuwanie połączeń z panelu wybranej operacji. Blokada cykli, samopowiązań, duplikatów i nieistniejących ID.
- W ręcznym bilansie nowa krawędź musi respektować kolejność stanowisk. W razie konfliktu najpierw zmień przypisanie lub wybierz metodę automatyczną.
- Edycja nazwy, czasu i VA oraz usuwanie operacji po potwierdzeniu. Materiały usuwanej operacji są zachowywane do ponownego przypisania w BOM, a brak referencji pozostaje widoczny jako błąd.
- Trwałe współrzędne diagramu w opcjonalnym `ProcessStep.flowPosition`. Są zachowywane w zapisie lokalnym, wariantach i JSON. CSV/XLSX procesu nadal służy danym technologicznym i nie przechowuje pozycji kafelków.

### Dodatkowy element zaczerpnięty z projektu

Wspólny inspektor operacji w obu edytorach pokazuje przypisane części, ilość na wyrób, typ pojemnika i sumę kosztów materiałowych. Nie tworzy drugiej, rozbieżnej listy przypisań. Edycja i przypisywanie materiałów nadal odbywają się w etapie 3 BOM.

## Spójność danych

Oba edytory zapisują `processSteps` tego samego projektu. Korzystają z istniejącej historii Cofnij/Ponów, automatycznego zapisu, walidatora grafu i silnika bilansowania. Nie edytują tylko wykresu lub kopii wyniku. Zmiana technologii aktualizuje bilans i symulację oraz layout w trybie automatycznym. Ręczna geometria hali pozostaje zachowana, a niezgodność z nowymi stacjami jest sygnalizowana.

Numer schematu JSON pozostaje 3: nowa pozycja kafelka jest polem opcjonalnym. Starsze poprawne projekty nie wymagają konwersji. Zależności npm nie zostały dodane ani zmienione w tej aktualizacji. Wersję aplikacji oznaczono 0.3.1.

## Celowo nieprzeniesione uproszczenia

- Nie dodano dzielenia cyklu stacji przez dowolną liczbę operatorów. Wymagałoby to jawnego modelu zadań równoległych i odpowiedniej zmiany symulacji.
- Nie przeniesiono usuwania zajętej stacji wraz ze znikaniem jej operacji z bilansu.
- Nie dodano bramek decyzyjnych sugerujących probabilistyczny routing ani typów Start/End z pozornymi czasami. Obecny graf opisuje zależności operacji, a symulacja nadal szereg stanowisk.
- Nie przeniesiono integracji AI, zdalnego przesyłania danych ani losowego przypisywania materiałów.

## Weryfikacja

- `npm test`: 24/24 testy, w tym 8 nowych testów edycji, trwałości pozycji, walidacji zależności i rzeczywistych plików Eko.
- Test Eko obejmuje 12 operacji i 60 materiałów, po 5 na każdą operację; przenoszenie nie zmienia BOM.
- Build produkcyjny TypeScript/Vite przechodzi.
- W przeglądarce na osobnym porcie testowym 4191 sprawdzono: przenoszenie z listy, przeciążenie 165 s przy celu 162 s, blokadę niepoprawnego ruchu, Cofnij, edycję czasu z 38 do 50 s, blokadę cyklu, przeciągnięcie kafelka i zachowanie pozycji po przeładowaniu, przeciągnięcie segmentu na nowe stanowisko.
- Zmiany testowe dotyczą przykładu silnika na osobnym adresie. Nie nadpisano projektu użytkownika na porcie 4173/5173 ani źródłowych arkuszy Eko.

Nie jest to pełna macierz testów wszystkich przeglądarek i urządzeń dotykowych. Dotychczasowe ograniczenia modelu inżynierskiego pozostają opisane w `FUNKCJE_PROGRAMU.md`.

## Uruchomienie

Dotychczasowy `Uruchom_Layout_Studio_v0.3.bat` uruchamia także wersję 0.3.1 — buduje aktualne źródła. Po aktualizacji odśwież stronę; nagłówek powinien pokazać „Pro 3D · 0.3.1”. Nie zmieniono klucza zapisu lokalnego ani standardowego portu 4173.
