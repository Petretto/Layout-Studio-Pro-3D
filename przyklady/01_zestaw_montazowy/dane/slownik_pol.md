# Słownik danych — projekt podstawowy

Wszystkie pola liczbowe i nazwy pochodzą z syntetycznego projektu dydaktycznego. Czas w s, długość w mm, materiał w szt., waluta PLN. Puste/nieobecne modele nie są ukrytymi pomiarami ani zerami.

## Arkusze importowane

Pierwszy arkusz **Dane** ma nagłówki zgodne z aplikacją; **Opis kolumn** i **Pochodzenie** są dokumentacją. Pliki nie zawierają formuł ani zależności od zewnętrznych skoroszytów. Wymagane wartości VA i NVA w tym pakiecie wpisano jawnie, mimo że importer pozwala je pominąć. VA + NVA = czas standardowy.

| Pole | Typ / status | Znaczenie |
| --- | --- | --- |
| ID Kroku | tekst, wymagany | ZM-OP10, ZM-OP20, ZM-OP30; unikalne, stabilne ID. |
| Nazwa Operacji | tekst, wymagany | Nazwa czynności manualnej. |
| Czas Standardowy [s] | liczba >0, wymagany | Czas całej operacji dla jawnej obsady, nie czas podlegający automatycznemu dzieleniu przez liczbę osób. |
| Wartość Dodana VA [s], Strata NVA [s] | liczby ≥0; jawne w pakiecie | 16/4, 25/5, 34/6. Nie korzystać z domyślnego 85%. |
| Poprzednicy, Następnicy | tekst listy ID; pusty na końcach | Graf liniowy. Każde podane ID musi istnieć; obie kolumny opisują tę samą relację. |
| Nr Części (Part No), Nazwa Komponentu | tekst, wymagany | Unikalny indeks w tym przykładzie; ID pozycji BOM-1..4 są nadawane przez dotychczasowy importer. |
| Ilość na Wyrób | liczba >0, wymagany | Ilość sztuk komponentu na wyrób. Nie ustala zapasu ani zdarzeń zużycia. |
| Typ Pojemnika | enum, wymagany | BoxKLT lub Carton w tym przykładzie; importer wspiera też Tray/Pallet. |
| Ilość w Opakowaniu | dodatnia liczba całkowita, wymagany | Pojemność opakowania materiału; nie częstotliwość dostaw. |
| Przypisany Krok | tekst istniejącego ID, wymagany | Powiązanie BOM z operacją. |
| Koszt Jednostkowy | liczba ≥0, wymagany | Syntetyczna cena PLN/szt. komponentu, nie koszt pracy. |

## Pełny model w pakiecie

| Obszar | Pola / reguła |
| --- | --- |
| Tożsamość | Projekt DEMO-ZESTAW-MONTAZOWY-1, wyrób ZM-PRODUCT. ID nie zmieniają się przy imporcie. |
| Stanowiska | ST-ZM-1..3; `operationIds` jest źródłem przydziału w szkicu 6. Kopia 1 każdej stacji, operators=1, parallelStations=1. Puste S2 w konsolidacji jest rezerwą. |
| Osoby | ZM-W1..3. `teamWorkerIds` wybiera skład przebiegu; lista pracowników to rejestr, nie automatyczna obsada. `eligibleWorkerIds` wskazuje jawne dopuszczenie operacji. |
| Kompetencje | ZM-C-MONT: W1/W2, operacje 10/20; ZM-C-QC: W3, operacja 30. Zespół wspólnie pokrywa wymagane kompetencje; brak deklaracji nie daje uprawnień. Pula pracowników nie zastępuje dopuszczenia. |
| Profile czasu | `durationBasis: assumed`, wszystkie przedziały `basis: assumed`; manualWork i operatorPresence od 0 do pełnego czasu, machineRun puste. Jeden wariant staffing dla jednej osoby. |
| Kalendarze | Każda osoba i stanowisko: zmiana [0,28800), przerwy []; `basis: assumed`. Bez domyślnej dostępności poza tym oknem. |
| Wyposażenie | EQ1..3 to manualne stoły powiązane z TABLE-1..3, nie maszyny. EQ1 jawnie może obsłużyć OP10/OP20, EQ2 OP20, EQ3 OP30. |
| Dopuszczenia | `stationRouting.operations[].candidates` ma po jednej jawnej kopii i wymaganym ID stołu; `equipmentPlacements` ustala jego położenie. Brak tras jest zamierzony w JIT. |
| Geometria | Hala 8000×6000×3000, stoły 1200×800×900; współrzędne i kolory koncepcyjne. Zmiana geometrii nie jest zmianą czasu lub zdolności. Kopia geometryczna nie tworzy stanowiska. |
| Bufory | Jawne wejścia 3 szt. każdej kopii, wyjścia pośrednie 3 szt., końcowe null (bez limitu modelu); polityka bbas-worker-released. Ciągła kontynuacja na tej samej kopii. Przy 3 sztukach nie ma blokowania pojemnością. |
| Warianty | BASIC-BASE i BASIC-CONSOLIDATED, to samo dokładne `originalJson` źródła 4. Kategoria changed-layout obejmuje również jawną zmianę przydziału i obsady — zakres opisany w README. |
| Pochodzenie | Pakiet `dataOrigin: synthetic`. Żadna wartość nie jest oznaczona jako zmierzona. |

`source4Json`, `draftRaw`, `variantsRaw` są tekstami w otoczce v1. Projekcje JSON w katalogu są formatowane dla czytelnika i odpowiadają ich treści po parsowaniu. Nie importuj otoczki szkicu ani biblioteki zwykłym importerem 4. Główne widoki 4 nie odzwierciedlają automatycznie przywróconego wariantu 6 (osobny A2).

## Warunki sesji, których nie importuje się jako osobnego pliku

`batch=3`, `arrivalIntervalSeconds=1`, `transportMode=just-in-time`; pierwsze przybycie w 0 s, kolejne w 1 i 2 s. Wybieraj je jawnie osobno w panelu harmonogramu i porównania. Koszty pracy i Monte Carlo nie są włączone. Materiały założone jako dostępne, bez modelu zużycia/zapasu/dostaw; brak korpusów i fizycznego transportu w tym przykładzie nie oznacza ich nieskończonej dostępności w rzeczywistej produkcji.
