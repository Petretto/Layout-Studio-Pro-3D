# Eko — rejestr danych, źródeł i braków (7.1)

Data: 2026-10-18. Zakres: **rama 1.4, pomiary z lipca 2026**, zgodnie z potwierdzeniem użytkownika. **7.1 w trakcie**; ukończony pakiet 7.1a obejmuje audyt źródeł i przygotowanie zbierania dalszych danych. Nie jest to jeszcze odbiór całego modelu produkcyjnego ani porównanie z produkcją z 7.2.

## Potwierdzenia i granice ich zakresu

- **EKO-U1:** użytkownik potwierdził, że `tests/Test Eko.xlsx` i `tests/Test Eko BOM.xlsx` zawierają rzeczywiste dane, pomiary czasu wykonano w lipcu 2026 i dotyczą wariantu ramy 1.4. Nie podano metody pomiaru, liczby prób, szczegółowych dni ani obsady.
- **EKO-U2:** OP22–OP25 mają czasy „przykładowe, ale prawdopodobne”. Wartości **600, 600, 480 i 480 s pozostają założeniami**, zgodnie z adnotacjami arkusza. Wyjaśnienie zamyka sprzeczność z ogólnym potwierdzeniem rzeczywistego pochodzenia danych; nie podnosi tych czterech wartości do rangi pomiaru.
- Potwierdzenie czasu całej operacji nie potwierdza oddzielnie profilu pracy ręcznej, automatu lub obecności operatora. Podział VA/NVA nie zastępuje tych profili. Nie nadano automatycznie statusu pomiaru każdej kolumnie arkusza.
- Potwierdzenie plików procesu i BOM nie obejmuje demonstracyjnego popytu, wymiarów hali, OEE, obsady, grup równoległości ani początkowej ramy z fixture 2.9. Dane testowych scenariuszy pozostają testowe.

Treść odpowiedzi, ich zakres i rozstrzygnięcie EKO-C1 zapisano w [rejestrze potwierdzeń](dane/eko/7_1/potwierdzenia_zrodel.json). Lipiec oznacza dokładność do miesiąca; nie dopisano fikcyjnej daty dziennej. BOM nie otrzymał daty pomiaru czasu.

## Źródła

Pełne SHA-256 i rozmiary źródeł są w [raporcie maszynowym](outputs/data_audit/eko_7_1.json). Skrót identyfikuje zawartość pliku w dniu audytu; nie dowodzi jakości pomiaru.

| ID | Lokalizacja | Zakres i kwalifikacja |
| --- | --- | --- |
| EKO-S1 | `tests/Test Eko.xlsx`, arkusz `Dane`, A1:I17 | 16 operacji. 12 czasów z rzeczywistych danych potwierdzonych przez użytkownika; 4 czasy testowe. Komórki C2:C17 wskazane osobno przy każdej operacji w raporcie. |
| EKO-S2 | `tests/Test Eko BOM.xlsx`, arkusz `BOM`, A1:G61 | 60 pozycji. Rzeczywiste pochodzenie potwierdzone przez użytkownika; brak osobnego potwierdzenia rewizji zestawienia, cen, dat obowiązywania oraz stanu i rytmu dostaw. |
| EKO-S3 | `src/core/models/ekoProject.ts` | Wbudowany przykład. ID i czasy operacji są zgodne z EKO-S1. Liczba pozycji BOM zgodna z EKO-S2. Wymiary/popyt to nadal demonstracyjne założenia. |
| EKO-S4 | `tests/qa/Eko_D5_actual_export_v5.json` | Historyczny eksport służący testom/migracji. Nazwa pliku nie oznacza odbioru produkcyjnego ani nowszego pomiaru. |
| EKO-S5 | `tests/fixtures/ekoDomainScenarios.ts` | Wyłącznie test: obsada, role, grupy, wspólna kopia, rama obecna na wejściu. Nie wykorzystano ich jako danych zakładu. |
| EKO-S6 | `WERYFIKACJA_EKO_2_9.md` | Historyczny raport testów algorytmu. Opisane końce partii nie są obserwowanymi wynikami produkcji. |
| EKO-S7 | `dane/eko/7_1/potwierdzenia_zrodel.json` | Rejestr wypowiedzi użytkownika z 2026-10-18; źródło potwierdzenia okresu, wariantu i rozdzielenia czasów rzeczywistych/testowych. |

Materiałów Jabama i konceptów Blender 6.3b nie uznano za geometrię Eko. Nie używano plików lokalnych użytkownika `tools/equipment-editor/wyposazenie_karta.json` ani arkuszy/symulacji o niepotwierdzonym pochodzeniu jako zastępstwa pomiarów. Oryginalne źródła pozostały bez zmian.

## Czasy operacji

| Operacje | Liczba | Kwalifikacja |
| --- | ---: | --- |
| OP10–OP21 | 12 | Rzeczywiste dane według EKO-U1, lipiec 2026, rama 1.4. Dane surowych prób i szczegóły metody do uzupełnienia. |
| OP22, OP23 | 2 | Po 600 s, przykład według arkusza i EKO-U2. |
| OP24, OP25 | 2 | Po 480 s, przykład według arkusza i EKO-U2. |

Raport JSON zachowuje wartości z arkusza jako `declaredStandardTimeSeconds`. Pola surowej obserwacji, profili i obsady pozostają `null`; nie przepisano do nich standardu jako nowego pomiaru. Wbudowanego przykładu, testów ani zapisanych projektów nie zmieniano. Przyszła aktualizacja modelu wymaga jawnego mapowania właściwego wariantu obsady i metody, z zachowaniem źródła/historycznych przykładów.

## Rejestr braków do dalszego zbierania

| ID | Obszar | Dostępne / brakujące dane | Warunek zamknięcia |
| --- | --- | --- | --- |
| EKO-B01 | Wariant i okres | Rama 1.4 i miesiąc 2026-07 potwierdzone. Brak szczegółowej rewizji dokumentacji i warunków prób. | Powiązać wariant i rewizję z każdym źródłem, określić warunki próby. |
| EKO-B02 | Metoda i próby czasu | Standardy 12 operacji z potwierdzonych danych; brak surowych prób, metody agregacji i liczby obserwacji. | Uzupełnić metrykę pomiaru i dostępne obserwacje; wskazać, czy wartość jest pojedynczą próbą, średnią czy normą po obróbce pomiarów. |
| EKO-B03 | OP22–OP25 | Czasy przykładowe, wyjaśnienie zamknięte; pomiarów brak. | Dostarczyć pomiary dla ramy 1.4 i wskazanej obsady albo wyłączyć je z uzgodnionego zakresu odbioru 7.2. |
| EKO-B04 | Praca ręczna/automat/obecność | Podział VA/NVA nie określa wymaganych przedziałów. | Jawne odcinki pracy ręcznej, pracy maszyny i obecności każdej osoby dla właściwej obsady. |
| EKO-B05 | Obsada i kompetencje | Osoby z fixture są założone. Brak rzeczywistej listy zespołów, dopuszczeń i wymagań kompetencji. | Rzeczywiste ID osób, kompetencje, wymagania operacji i zespoły oraz ich czasy. Kompetencje całej obsady mogą się uzupełniać. |
| EKO-B06 | Równoległość i rama | Graf i testy nie potwierdzają fizycznego dostępu. | Potwierdzić dopuszczone grupy, wykluczenia i warunki pracy na wspólnej ramie. |
| EKO-B07 | Kopie i wyposażenie | Przykładowy layout nie potwierdza rzeczywistych zasobów. | ID rzeczywistych kopii, wyposażenie i dopuszczenia operacji; nie tworzyć zdolności przez kopię geometrii. |
| EKO-B08 | Geometria | Hala 40000×40000×6000 mm i generowane stoły są demonstracyjne. | Pomierzone gabaryty, pozycje, jednostki i źródło CAD/pomiaru. |
| EKO-B09 | Transport montażowy | Test 2.9 rozpoczyna po dostarczeniu ramy; nie ustala rzeczywistych tras ani czasów. | Skierowane trasy między konkretnymi kopiami, jawne czasy/długości, zestawy wózków i obsada; puste podejścia w kolejności equipmentIds. |
| EKO-B10 | Bufory | Brak rzeczywistych pojemności i stanu początkowego. | Pojemność dla każdej kopii/wejścia/wyjścia i zasada zajęcia operatora podczas blokady. |
| EKO-B11 | Kalendarz i stan początkowy | Demonstracyjna zmiana/popyt nie potwierdza kalendarzy zasobów. Rama na wejściu jest założeniem testu. | Jawne okna i przerwy osób/kopii, punkt zerowy oraz rzeczywiste początkowe lokalizacje i WIP. |
| EKO-B12 | Materiał i podzespoły | 60 pozycji BOM; brak potwierdzonych stanów, ilości zużycia na operację i dostaw. | Jawne ilości, jednostki, momenty/okresy dostaw, pierwsza dostawa, partie podzespołów i przypisania wykonań. Nie wyprowadzać z BOM ani czasu przejazdu; bez rozliczania operatorów magazynu. |
| EKO-B13 | Wyniki produkcji | Dostępne wyniki testów, brak uzgodnionego rejestru obserwowanej produkcji. | Rzeczywiste starty/końce sztuk, dobre sztuki/braki, WIP i przestoje w określonym okresie. |
| EKO-B14 | Straty/OEE i odbiór 7.2 | OEE w przykładzie jest założeniem. Brak tolerancji porównania. | Określić straty już ujęte w czasach, źródło OEE i zakres porównania; tolerancje uzgodnić przed odbiorem, bez podwójnego naliczania strat (7.5). |

Nie wszystkie braki trzeba rozwiązać jednocześnie: ewentualny ograniczony zakres 7.2 wymaga jawnego uzgodnienia. Ten pakiet nie zatwierdza procesu bez transportu lub przy domyślnej dostępności materiału. JIT może być użyty wyłącznie jako oznaczone, świadomie wybrane założenie.

## Karty do uzupełnienia

W [katalogu zbierania danych](dane/eko/7_1/README.md) znajdują się:

- `pomiary_operacji.csv` — 16 wierszy z istniejącymi ID i wariantem 1.4; wszystkie wartości pomiarów pozostają puste;
- `przedzialy_aktywnosci.csv` — osobne przedziały ręczne, maszyny, obecności, oczekiwań i blokad;
- `obsada_i_zasoby.csv` — osoby, kompetencje, wymagania, konkretne kopie i wyposażenie;
- `potwierdzenia_zrodel.json` — rejestr pochodzenia i dwóch rozstrzygnięć użytkownika.

CSV ma UTF-8 z BOM i separator średnik, aby można było wygodnie otworzyć go w Excelu. Puste pole oznacza brak danych. Karty nie są obsługiwane przez importer procesu/BOM aplikacji; po uzupełnieniu wymagają przeglądu i mapowania do istniejących pól.

## Dowody odbioru pakietu 7.1a

`node scripts/audit_eko_data_7_1.mjs`: **PASS** — 16 unikalnych ID, dodatnie czasy źródłowe, 12 wartości potwierdzonych co do rzeczywistego pochodzenia / 4 testowe, 60 BOM z poprawnymi odwołaniami do operacji, zgodność ID/czasów oraz liczby BOM z wbudowanym przykładem, 7 sum SHA-256. Nie porównywano całej zawartości BOM, nie wykonywano nowej walidacji importu ani symulacji produkcji.

Odczyt kart CSV przez SheetJS: sprawdzono kompletność 16 ID, puste wartości pomiarów, liczbę i szerokość kolumn. Sumy źródeł ponownie porównano z dyskiem. Rejestr potwierdzeń i wynik JSON odczytano poprawnie. Są to kontrole pakietu danych, nie testy regresji aplikacji.

Bez zmian aplikacji, schematu, importera lub zapisu projektu: nie uruchamiano builda, UI ani regresji. Brak potrzeby strukturalnego backupu — źródła czytane bez ich modyfikacji. Zaktualizowano instrukcję pomocniczego pakietu i rejestr funkcji/statusu. Podręcznik aplikacji i PDF nie wymagają regeneracji, ponieważ działanie programu i jego interakcje się nie zmieniły. Nie weryfikowano Vercel.

Status: **7.1a odebrane, główne 7.1 w trakcie**. Potwierdzone źródła nie wystarczają do rzetelnego odbioru 7.2. Następna praca 7.1b: uzupełnienie braków z rzeczywistych rejestrów, zaczynając od obsady i znaczenia zarejestrowanych czasów. Postęp głównych ID nie rośnie za sam pakiet przygotowawczy.
