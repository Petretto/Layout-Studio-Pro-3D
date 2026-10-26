# 5.3 — zaznaczanie, grupy, kopie i wyrównywanie

Odbiór 2026-10-18. Zakres: wyposażenie aktywnego edytora CAD 2D projektu 4 (`layoutObjects`). Przeszkody pozostają w osobnym edytorze. Nie tworzymy automatycznie grup stanowiska/FIFO/operatora (5.4), ani wspólnego zaznaczenia i gestów z widokiem 3D (5.10).

## Decyzja i kontrakt

Użytkownik zatwierdził: **kopie geometrii bez przypisania do stanowiska**. Kopia ma nowe ID, usunięte `workstationId`, jawne przesunięcie X/Y i nową grupę, jeśli kopiowano grupę. Nie zmienia procesu, obsady ani liczby kopii stanowisk technologicznych. Zero przesunięcia jest dozwolone; kolizje sprawdza istniejąca kontrola geometrii. Nie wyznaczamy automatycznie wolnego miejsca.

Wielokrotny wybór: Shift/Ctrl/Meta na rzucie lub przycisku drzewa, a także pola wyboru drzewa. Wybranie członka wizualnej grupy wybiera wszystkich jej członków. Wspólny gest stosuje jeden wektor przesunięcia, z siatką dla punktu zaczepienia; odstępy pozostają zachowane. Wyrównywanie lewego/prawego/górnego/dolnego obrysu uwzględnia obrót; punkt odniesienia to pierwszy wybrany obiekt lub grupa. Grupa jest jednostką wyrównania i nie traci wewnętrznych odstępów. Każda akcja zatwierdza jeden stan do historii.

## Zapis i zgodność

Backup przed pracami: `backup/v0.4.0_przed_5_3_20261018`, 325 plików z SHA256. Odtwarzanie: zachować obecny stan, odtworzyć źródła zgodnie z manifestem backupu i odbudować aplikację; nie zastępować zapisów użytkownika bez ich zachowania.

Dodano opcjonalne `LayoutObject.visualGroupId`: wyłącznie metadane wizualne, bez nowych referencji do procesu/zasobów. Wersja schematu pozostaje dotychczasowa. Stare dane bez pola są czytane bez migracji; nowe pole zachowuje parser i zapis JSON. Parser odrzuca niepoprawny typ, puste ID i ID dłuższe niż 100 znaków. Nie ma oddzielnego rejestru grup ani osieroconej referencji; pojedynczy pozostały członek jest poprawną grupą. Regeneracja po potwierdzeniu zastępuje ręczną geometrię i grupy. Cofnij przywraca cały poprzedni stan. Dotychczasowy kod czytał dodatkowe pola obiektów bez ich usuwania, a geometria pozostaje czytelna także bez narzędzi grupowania.

## Weryfikacja

- Celowane testy `node scripts/test.mjs --suite=core '--test-name-pattern=5.3:'`: 2/2 PASS. Obroty/obrysy, sztywność grup podczas wyrównania, brak mutacji źródła, zachowanie przypisań oryginałów, nowe ID/grupy kopii, usunięcie przypisań kopii, brakujące przesunięcie i kolizja ID, stary zapis i roundtrip nowego pola, odmowa błędnego pola grupy.
- Okresowa pełna regresja `npm.cmd run test -- --run`: **309/309 PASS**. Trzeci pakiet implementacyjny od pełnego 4.6 (4.7, 5.2, 5.3) i rozszerzenie metadanych zapisu. Po drobnych doprecyzowaniach kontroli ID/wyboru ponownie 2/2 testy celowane PASS.
- Finalny `npm.cmd run build`: TypeScript/Vite PASS. Pozostało dotychczasowe ostrzeżenie o dużych chunkach.
- `node tests/qa/verify_5_3.mjs`: Edge CDP PASS — wybór Shift i pola wyboru, wyrównanie, grupowanie, ponowny wybór całej grupy, rzeczywisty wspólny gest przesunięcia, kopie bez technologii, nowe grupy, rozgrupowanie, Cofnij/Ponów, zapis i odczyt grup/kopii, brak zmiany procesu/ustawień stanowisk, 1440/600 px bez poziomego przepełnienia i wyjątków JS. Zrzuty `outputs/qa/verify_5_3_*.png` są syntetyczne.
- Regresja `node tests/qa/verify_5_2.mjs`: Edge CDP PASS na końcowym buildzie. Nowa sekcja grup wymagała zastąpienia ogólnego selektora dolnego panelu selektorem listy obiektów; pierwsza próba trafiła w sekcję grup, po korekcie pełny odbiór PASS. Zrzuty 5.2 odświeżono dla bieżącego UI.
- Instrukcja Markdown/HTML/PDF zaktualizowana (Krok 7). Generacja HTML i PDF Edge PASS, 22 obrazy; kontrola Python `scripts/verify_manual.py outputs/qa/manual_5_3`: 22 strony/22 obrazy, brak braków, pustych stron i tekstu poza stroną. Wizualny przegląd kontaktówek wszystkich stron PASS. Raport i kontaktówki zapisane w `outputs/qa/manual_5_3`.

5.3 wdrożone w powyższym zakresie. `node scripts/plan_progress.mjs`: cały plan 39/67 = 58,2%, pierwsze wydanie 39/65 = 60,0%, Etap 5: 5/13 = 38,5%. Następny punkt: 5.4. Vercel nie zweryfikowano; push GitHub nie jest dowodem wdrożenia Vercel.
