# 7.12.C2-B1 — rejestr ilości buforów podmontaży

Data: 2026-10-25. **Odebrany wewnętrzny moduł B1; całe C2-B/7.12 w trakcie.** Workflow: layout-task-router → layout-implementation → layout-verification, poziom Sol dla integralności ilości i lokalizacji.

## Rezultat

Nowy czysty moduł `src/core/subassemblyBufferState.ts` prowadzi rezerwacje w sztukach, osobną zajętość i ilość pozostałą. Partia 5 szt. wymaga 5 jednostek pojemności już przy rezerwacji celu. Odjazd zwalnia źródło; przyjazd zamienia rezerwację na zajętość. Konfiguracja miejsc jawnie określa kopię, stronę, podzespół i jednostkę. Nie sumujemy liczby partii jako pojemności i nie wyprowadzamy ilości z BOM.

Użytkownik w trakcie prac zatwierdził: po pobraniu 3 z 5 sztuk pozostałe 2 pozostają w buforze odbiorcy, zajmują pojemność i mają być widoczne jako zapas. Rejestr zachowuje pierwotne 5, pozostałe 2 oraz lokalizację i znacznik reszty. Jedno przypisanie odbiorcy pobiera tylko raz; ponowne zużycie i przewóz reszty bez nowego przypisania odmawiają. Wyświetlanie zapasu w aplikacji pozostaje częścią integracji B3. Zapisano decyzję w AGENTS.md i kontrakcie C2.

Nie podłączono modułu do schedulera. Nie zmieniono schematu modelu 6, dotychczasowych danych, serializacji, historii ani UI. Dotychczasowa odmowa ograniczonych buforów gałęzi pozostaje aktywna. Moduł jest przygotowaniem B2, nie potwierdzeniem obsługi skończonych buforów C2 w aplikacji.

Backup przed pracą: `backup/v0.4.0_przed_7_12c2_b1_20261025`. Siedem plików: bufferState, subassemblyState, subassemblyFlow, bufferedProcessSchedule, network.test, kontrakt C2 oraz plan. Każdą kopię niezależnie ponownie odczytano i porównano SHA-256 ze źródłem: **7/7 PASS**, manifest SHA256.txt. Backup nie obejmuje zależności ani wcześniejszych kopii.

## Weryfikacja

- Nowe testy: **6/6 PASS**. Ręcznie zadane referencje: 5/pojemność 5 → zajętość 5, pojemność 4 → odmowa, producenci 3+2 → 5, zużycie 3 → zwolnienie 3; 5−3 → zapas 2 bez utraty lokalizacji. Osobne kopie, źródło utrzymane do odjazdu, anulowanie, odmowa reszt bez nowego przypisania, błędnych jednostek/podzespołów, kolejności zdarzeń i przekroczenia bezpiecznego zakresu liczb. Sprawdzenie niezmienności wejścia przy udanej operacji i odmowie.
- Końcowa regresja: `node scripts/test.mjs --suite=network '--test-name-pattern=7.12.C2|3.5b2a|3.5b2c|3.4m'` — **66/66 PASS**, w tym nowe 6. Istniejące C2 configured/JIT, wspólne osoby i wózki, stare formaty/odmowy, liniowe bufory dodatnie/zero i lokalna kontynuacja pozostają zgodne. Wcześniejszy przebieg przed decyzją reszt: 5/5 nowych i 65/65 podzbioru PASS; końcowa weryfikacja uwzględnia przyjętą decyzję.
- `npm.cmd run build`: końcowy typecheck i build PASS; dotychczasowe ostrzeżenie fragmentów JS >500 kB. Nie zmieniono progów ani konfiguracji.
- Pierwsze wywołanie regresji przez npm.cmd nie przekazało poprawnie alternatyw filtra; wrapper shell zgłosił błąd. Poprawione wywołanie bezpośrednio przez node wykonało powyższy podzbiór; błąd wrappera nie jest zaliczony jako wynik testów.
- Pełnej regresji nie uruchamiano: moduł izolowany, bez zmiany istniejącego silnika; poprzedni okresowy baseline 425/425 z C1. B2 jako integracja harmonogramu będzie wymagał szerszego odbioru.
- Rzeczywistego UI, zapisu/odtworzenia i instrukcji użytkownika nie zmieniano ani nie odbierano ponownie: moduł nie jest jeszcze osiągalny z aplikacji. Nie zadeklarowano tych prób jako PASS. Aktualizacja instrukcji i obrazy wymagane przy udostępnieniu funkcji w B3.

## Pozostały zakres

B2: zdarzenia producentów i odbiorców we wspólnym harmonogramie, atomowe powiązanie rezerwacji ilości z ruchem, operatorami/wózkami i blokowaniem po obróbce; jawny martwy punkt oraz pojemność 0 jako bezpośrednie przekazanie. Rozwinięcie copy=null i ochrona przed nakładającymi się konfiguracjami należą do adaptera; B1 przyjmuje konkretne miejsca. B1 nie rozstrzyga współdzielenia pojemności przez różne podzespoły lub korpusy.

B3: obciążony C2, dwa zbieżne źródła, różne kopie, obie polityki operatora, inspekcja reszt jako zapasu, zapis/odtworzenie i rzeczywisty UI. Do tego czasu C2-B i główne 7.12 pozostają w trakcie. Brak migracji oraz brak automatycznego nowego przypisywania reszt.

Postęp głównych ID: cały plan **61/72 = 84,7%**, pierwsze wydanie **61/68 = 89,7%**. Licznik nie obejmuje ułamkowo ukończonych podpakietów. Push na GitHub nie stanowi potwierdzenia wdrożenia na Vercel; w tym pakiecie nie zweryfikowano zdalnego wdrożenia.
