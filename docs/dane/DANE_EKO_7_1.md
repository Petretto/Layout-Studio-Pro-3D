# Eko — rejestr danych, źródeł i braków (7.1)

Aktualizacja: 2026-10-19. Zakres: **rama 1.4, pomiary z lipca 2026**, zgodnie z potwierdzeniem użytkownika. **7.1 w trakcie**; ukończony pakiet 7.1a obejmuje audyt źródeł i przygotowanie zbierania dalszych danych. Nie jest to jeszcze odbiór całego modelu produkcyjnego ani porównanie z produkcją z 7.2.

## Potwierdzenia i granice ich zakresu

- **EKO-U1:** użytkownik potwierdził, że `tests/Test Eko.xlsx` i `tests/Test Eko BOM.xlsx` zawierają rzeczywiste dane, pomiary czasu wykonano w lipcu 2026 i dotyczą wariantu ramy 1.4. Nie podano metody pomiaru, liczby prób, szczegółowych dni ani obsady.
- **EKO-U2:** OP22–OP25 mają czasy „przykładowe, ale prawdopodobne”. Wartości **600, 600, 480 i 480 s pozostają założeniami**, zgodnie z adnotacjami arkusza. Wyjaśnienie zamyka sprzeczność z ogólnym potwierdzeniem rzeczywistego pochodzenia danych; nie podnosi tych czterech wartości do rangi pomiaru.
- **EKO-U3:** użytkownik podał „Pomiar dla 13 osób”. Historyczny wpis zachowano; zakres rozstrzygnięto w EKO-U4.
- **EKO-U4:** 13 osób łącznie w procesie. Tylko pakowanie OP21 wykonywały 2 osoby, pozostałe mierzone OP10–OP20 po jednej. Czas OP21 **1320 s (22 min)** pozostaje czasem dla dwóch osób; nie zastosowano skalowania. EKO-C2 zamknięte. Tożsamości, współdzielenie, kalendarze i profile obecności pozostają nieokreślone; deklaracji nie rozszerzono na testowe OP22–OP25.
- **EKO-U5 (zapis 7.1c):** cały proces jest manualny, bez maszyn i automatyzacji. Obie osoby wykonujące OP21 są obecne przez całe pakowanie. Brak pracy maszynowej jest teraz potwierdzony, nie oznacza braku informacji. Czas OP21 pozostaje 1320 s dla zespołu; nie dzielimy go przez dwa ani nie zastępujemy roboczosekundami.
- **EKO-U6 (7.1d):** czasy OP10–OP21 są średnimi z kilku pomiarów. Liczba prób, wyniki surowe, rozrzut i szczegółowa metoda pomiaru pozostają nieznane. OP22–OP25 nadal przykładowe.
- Całkowicie manualny charakter procesu nie wyznacza szczegółowych odcinków pracy, oczekiwania i blokad ani tożsamości osób. Pełna obecność zespołu OP21 jest potwierdzona; profili pozostałych operacji nie uzupełniono automatycznie. Podział VA/NVA nie zastępuje profili. Nie nadano automatycznie statusu pomiaru każdej kolumnie arkusza.
- Potwierdzenie plików procesu i BOM nie obejmuje demonstracyjnego popytu, wymiarów hali, OEE, obsady, grup równoległości ani początkowej ramy z fixture 2.9. Dane testowych scenariuszy pozostają testowe.

Treść odpowiedzi, ich zakres i rozstrzygnięcie EKO-C1 zapisano w [rejestrze potwierdzeń](../../dane/eko/7_1/potwierdzenia_zrodel.json). Lipiec oznacza dokładność do miesiąca; nie dopisano fikcyjnej daty dziennej. BOM nie otrzymał daty pomiaru czasu.

## Źródła

Pełne SHA-256 i rozmiary źródeł są w [aktualnym raporcie maszynowym 7.1d](../../outputs/data_audit/eko_7_1d.json). Skrót identyfikuje zawartość pliku w dniu audytu; nie dowodzi jakości pomiaru.

| ID | Lokalizacja | Zakres i kwalifikacja |
| --- | --- | --- |
| EKO-S1 | `tests/Test Eko.xlsx`, arkusz `Dane`, A1:I17 | 16 operacji. 12 czasów z rzeczywistych danych potwierdzonych przez użytkownika; 4 czasy testowe. Komórki C2:C17 wskazane osobno przy każdej operacji w raporcie. |
| EKO-S2 | `tests/Test Eko BOM.xlsx`, arkusz `BOM`, A1:G61 | 60 pozycji. Rzeczywiste pochodzenie potwierdzone przez użytkownika; brak osobnego potwierdzenia rewizji zestawienia, cen, dat obowiązywania oraz stanu i rytmu dostaw. |
| EKO-S3 | `src/core/models/ekoProject.ts` | Wbudowany przykład. ID i czasy operacji są zgodne z EKO-S1. Liczba pozycji BOM zgodna z EKO-S2. Wymiary/popyt to nadal demonstracyjne założenia. |
| EKO-S4 | `tests/qa/Eko_D5_actual_export_v5.json` | Historyczny eksport służący testom/migracji. Nazwa pliku nie oznacza odbioru produkcyjnego ani nowszego pomiaru. |
| EKO-S5 | `tests/fixtures/ekoDomainScenarios.ts` | Wyłącznie test: obsada, role, grupy, wspólna kopia, rama obecna na wejściu. Nie wykorzystano ich jako danych zakładu. |
| EKO-S6 | `docs/weryfikacja/WERYFIKACJA_EKO_2_9.md` | Historyczny raport testów algorytmu. Opisane końce partii nie są obserwowanymi wynikami produkcji. |
| EKO-S7 | `dane/eko/7_1/potwierdzenia_zrodel.json` | Rejestr wypowiedzi użytkownika zapisanych 2026-10-18 i 2026-10-19; źródło potwierdzenia okresu, wariantu, obsady, manualnego charakteru procesu i rozdzielenia czasów rzeczywistych/testowych. |

Materiałów Jabama i konceptów Blender 6.3b nie uznano za geometrię Eko. Nie używano plików lokalnych użytkownika `tools/equipment-editor/wyposazenie_karta.json` ani arkuszy/symulacji o niepotwierdzonym pochodzeniu jako zastępstwa pomiarów. Oryginalne źródła pozostały bez zmian.

## Czasy operacji

| Operacje | Liczba | Kwalifikacja |
| --- | ---: | --- |
| OP10–OP21 | 12 | Rzeczywiste dane według EKO-U1, lipiec 2026, rama 1.4. Średnie z kilku pomiarów (EKO-U6); liczba prób, dane surowe i szczegóły metody do uzupełnienia. |
| OP22, OP23 | 2 | Po 600 s, przykład według arkusza i EKO-U2. |
| OP24, OP25 | 2 | Po 480 s, przykład według arkusza i EKO-U2. |

Raport JSON zachowuje wartości z arkusza jako `declaredStandardTimeSeconds`. Pola surowej obserwacji, szczegółowych faz ręcznych, przedziałów obecności i ID osób pozostają `null`; nie przepisano do nich standardu jako nowego pomiaru. Liczebności OP10–OP21 są potwierdzone. W 7.1c `machineIntervalsSeconds: []` oznacza potwierdzony brak pracy maszynowej, a `crewPresenceRequirement` OP21 zawiera wymóg dwóch osób przez całą operację, bez wymyślonych ID osób lub dat rozpoczęcia. Wbudowanego przykładu, testów ani zapisanych projektów nie zmieniano. Przyszła aktualizacja modelu wymaga jawnego mapowania właściwego wariantu obsady i metody, z zachowaniem źródła/historycznych przykładów.

## Rejestr braków do dalszego zbierania

| ID | Obszar | Dostępne / brakujące dane | Warunek zamknięcia |
| --- | --- | --- | --- |
| EKO-B01 | Wariant i okres | Rama 1.4 i miesiąc 2026-07 potwierdzone. Brak szczegółowej rewizji dokumentacji i warunków prób. | Powiązać wariant i rewizję z każdym źródłem, określić warunki próby. |
| EKO-B02 | Metoda i próby czasu | Częściowo wyjaśnione: 12 czasów OP10–OP21 to średnie z kilku pomiarów (EKO-U6). Brak liczby prób, wartości surowych, rozrzutu i szczegółowej metody pomiaru. | Uzupełnić dostępne metryki i obserwacje; nie rekonstruować liczby prób ani zmienności ze średniej. |
| EKO-B03 | OP22–OP25 | Czasy przykładowe, wyjaśnienie zamknięte; pomiarów brak. | Dostarczyć pomiary dla ramy 1.4 i wskazanej obsady albo wyłączyć je z uzgodnionego zakresu odbioru 7.2. |
| EKO-B04 | Praca ręczna i obecność | Częściowo zamknięte przez EKO-U5: cały proces manualny, brak maszyn/automatyzacji; OP21 stale 2 osoby. Brak szczegółowych faz i obecności przy pozostałych operacjach. | Uzupełnić potrzebne odcinki pracy ręcznej, oczekiwania i obecności; nie wymagać pomiarów nieistniejącej pracy maszyny. Dla OP21 zachować pełną obecność dwóch osób. |
| EKO-B05 | Obsada i kompetencje | Potwierdzono 13 osób w procesie: OP10–OP20 po 1, OP21 pakowanie 2. EKO-C2 zamknięte. Osoby z fixture nadal są założone; brak rzeczywistych tożsamości, współdzielenia i kompetencji. | Powiązać rzeczywiste ID osób, ich kompetencje, wymagania operacji i kalendarze z potwierdzoną obsadą. Kompetencje całej obsady mogą się uzupełniać; liczebność zespołu nie ustala pełnego profilu obecności pozostałych operacji; pełna obecność OP21 jest potwierdzona w EKO-U5. |
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

W [katalogu zbierania danych](../../dane/eko/7_1/README.md) znajdują się:

- `pomiary_operacji.csv` — 16 wierszy z istniejącymi ID i wariantem 1.4; wszystkie wartości pomiarów pozostają puste;
- `przedzialy_aktywnosci.csv` — osobne przedziały ręczne, maszyny, obecności, oczekiwań i blokad;
- `obsada_i_zasoby.csv` — osoby, kompetencje, wymagania, konkretne kopie i wyposażenie;
- `potwierdzenia_zrodel.json` — rejestr pochodzenia, potwierdzeń i wyjaśnień użytkownika.

CSV ma UTF-8 z BOM i separator średnik, aby można było wygodnie otworzyć go w Excelu. Puste pole oznacza brak danych. Karty nie są obsługiwane przez importer procesu/BOM aplikacji; po uzupełnieniu wymagają przeglądu i mapowania do istniejących pól.

## Dowody odbioru pakietu 7.1a

`node scripts/audit_eko_data_7_1.mjs`: **PASS** — 16 unikalnych ID, dodatnie czasy źródłowe, 12 wartości potwierdzonych co do rzeczywistego pochodzenia / 4 testowe, 60 BOM z poprawnymi odwołaniami do operacji, zgodność ID/czasów oraz liczby BOM z wbudowanym przykładem, 7 sum SHA-256. Nie porównywano całej zawartości BOM, nie wykonywano nowej walidacji importu ani symulacji produkcji.

Odczyt kart CSV przez SheetJS: sprawdzono kompletność 16 ID, puste wartości pomiarów, liczbę i szerokość kolumn. Sumy źródeł ponownie porównano z dyskiem. Rejestr potwierdzeń i wynik JSON odczytano poprawnie. Są to kontrole pakietu danych, nie testy regresji aplikacji.

Bez zmian aplikacji, schematu, importera lub zapisu projektu: nie uruchamiano builda, UI ani regresji. Brak potrzeby strukturalnego backupu — źródła czytane bez ich modyfikacji. Zaktualizowano instrukcję pomocniczego pakietu i rejestr funkcji/statusu. Podręcznik aplikacji i PDF nie wymagają regeneracji, ponieważ działanie programu i jego interakcje się nie zmieniły. Nie weryfikowano Vercel.

Status: **7.1a odebrane, główne 7.1 w trakcie**. Potwierdzone źródła nie wystarczają do rzetelnego odbioru 7.2. Następna praca 7.1b: uzupełnienie braków z rzeczywistych rejestrów, zaczynając od obsady i znaczenia zarejestrowanych czasów. Postęp głównych ID nie rośnie za sam pakiet przygotowawczy.

Uzupełnienie 7.1b: zapisano EKO-U3 (13 osób) i pytanie EKO-C2 o zakres liczby. Ponowiony audyt źródeł PASS; kontrola JSON potwierdziła 13 oraz puste przypisania osób do operacji. Zmiana dotyczy wyłącznie rejestru danych; bez regresji/builda/UI. Postęp nadal 53/69 = 76,8% i 53/65 = 81,5% pierwszego wydania.

Doprecyzowanie 7.1b: EKO-U4 zamyka EKO-C2. Audyt zawiera teraz liczby osób dla 12 mierzonych operacji (11×1 + 1×2), łącznie 13; identyfikatory osób pozostają puste, obsada czterech testowych operacji nie jest wyprowadzana. Ponowiony audyt i kontrola liczebności, zachowania 1320 s OP21 oraz SHA-256 źródeł PASS. Bez zmian aplikacji, czasów lub przydziałów istniejących projektów; bez builda/regresji/UI.

## Odbiór pakietu 7.1c — 2026-10-19

Zapisano wcześniej przekazane EKO-U5. Audyt oznacza wszystkie 16 operacji jako manualne bez maszyn; kwalifikacja 12 czasów rzeczywistych / 4 przykładowych pozostaje bez zmian. OP21 ma wymóg 2 osób przez całą operację; 1320 s pozostaje niezmienione. Nie nadano tożsamości osób, jednoczesności między operacjami ani brakujących kalendarzy. Obsada OP22–OP25 nadal nieznana.

Nowy wynik `outputs/data_audit/eko_7_1c.json` ma wersję audytu 2 i pozostaje dokumentem pochodzenia, nie formatem projektu aplikacji. Historyczny `eko_7_1.json`, w tym jego zastana lokalna zmiana, został zachowany. Skrypt `node scripts/audit_eko_data_7_1.mjs` zapisuje teraz nowy wynik. Oryginalne XLSX, wbudowany przykład i puste karty zbierania danych są niezmienione.

Weryfikacja: audyt PASS (16 operacji, 12 potwierdzonych źródłowo czasów, 4 testowe, 60 BOM, 7 SHA-256). Kontrola raportu PASS: brak odcinków maszyn, OP21 2 osoby przez całość/1320 s, pozostałe mierzone operacje po 1 osobie, 4 testowe bez przypisanej obsady, brak zmyślonych prób/ID, zgodne sumy źródeł, `productionDataAccepted: false`. Bez zmian działania aplikacji: nie uruchamiano regresji, builda, UI ani regeneracji podręcznika PDF. Zaktualizowano instrukcję zbierania danych.

**7.1 pozostaje w trakcie.** Najbliższy brak do wyjaśnienia: znaczenie wartości czasu w arkuszu (pojedynczy pomiar, średnia z prób czy norma). Dalej: identyfikatory i współdzielenie osób, kalendarze, stanowiska/geometria/transport/bufory, rzeczywiste wyniki oraz uzgodnione warunki i tolerancje 7.2. Nie zastępujemy tych braków wartościami domyślnymi.

## Odbiór pakietu 7.1d — 2026-10-19

EKO-U6 rozstrzyga wcześniejsze pytanie o znaczenie czasów: 12 wartości OP10–OP21 to średnie z kilku pomiarów. Nie zmieniono liczb ani nie utworzono sztucznych obserwacji. `timeAggregation` wskazuje średnią, `sampleCount` i szczegółowa metoda pozostają `null`. Cztery operacje OP22–OP25 nie otrzymują potwierdzenia średniej lub liczby prób. Sama średnia nie wyznacza parametrów do Monte Carlo.

Aktualny audyt: `outputs/data_audit/eko_7_1d.json`; wyniki 7.1 i 7.1c zachowano. Audyt i kontrola metadanych/SHA-256 PASS: 12 średnich, 4 przykładowe czasy bez agregacji, wszystkie wartości zgodne z wcześniejszym audytem, 60 BOM, 7 źródeł. Nadal potwierdzony brak maszyn i 2 osoby przez całe pakowanie przy niezmienionych 1320 s. Bez zmian aplikacji, schematów projektów lub kart surowych pomiarów; bez regresji/builda/UI i nowego PDF. 7.1 pozostaje w trakcie; następne braki obejmują liczby prób (o ile dostępne), przypisania i współdzielenie osób, kalendarze oraz dane przestrzenne i wyniki rzeczywistej produkcji.
