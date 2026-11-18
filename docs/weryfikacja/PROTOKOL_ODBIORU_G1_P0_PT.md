# Protokół niezależnego odbioru G1, P0 i PT

**G1 otwarta.** Odbiór dotyczy wersji `23d239776dfd39ad30b355008d488ae113ce2d5a` z gałęzi `codex/v1-p4a-web`. W trakcie przygotowania protokołu `origin/main` wskazywał hotfix `1805f257fa71c12cc516d0b614a8be0d8e1afd9a`, a historyczny RC1 `6aa84d8129b7f7cc4d92c3c00b4d8a99a255d3eb`. [Kod do audytu](https://github.com/Petretto/Layout-Studio-Pro-3D/tree/23d239776dfd39ad30b355008d488ae113ce2d5a).

## Przygotowanie próby

Pracować w osobnym katalogu na dokładnym SHA. Użyć świeżego profilu Edge i syntetycznych projektów 01–03. R09 Eko wykonywać w środowisku wewnętrznym. Do zwracanego raportu dołączyć wyniki asercji i sumy, bez treści kopii projektów, zrzutów Eko i danych użytkowników.

```powershell
git rev-parse HEAD
node --version
npm --version
npm ci --ignore-scripts --no-audit --no-fund
npm run build
npm run test -- --suite=core --test-name-pattern='P0:|Disaster Recovery|7\.12\.A1'
npm run verify:clean
node tests/qa/verify_remediation_data_safety.mjs
node --test tests/qa/ptCoverage.test.mjs tests/qa/packageImport.test.mjs tests/qa/scheduleAssertions.test.mjs
node tests/qa/verify_7_9_pilot.mjs
node tests/qa/verify_pt_pilot_faults.mjs
```

Przed kolejnym krokiem sprawdzić wynik poprzedniego polecenia. Lista 16 skryptów jest w `tests/qa/ptCoverage.test.mjs`. Do T07 uruchamiać skrypty z tej listy kolejno i zachować osobny kod wyjścia oraz log dla każdej nazwy. Do T08 obliczyć oczekiwane wyniki z danych i reguł przed porównaniem z UI. Można skorzystać z plików wejściowych `przyklady/01_zestaw_montazowy/`, `przyklady/02_wozek_warsztatowy/` i `przyklady/03_modul_urzadzenia/`. [Mapa scenariuszy i wcześniejsze wzorce](WERYFIKACJA_PT_TESTY_E2E.md).

## Próby do niezależnej oceny

| Próba | Sprawdzenie | Warunek PASS |
|---|---|---|
| T02 — zgoda i kopia | Anulowanie podglądu z katalogu i z pliku, odmowa bez kopii lub potwierdzenia, niezapisany formularz i poprawne wczytanie. Odczytać faktycznie pobraną kopię. | Przed akceptacją pięć wartości raw i formularz są identyczne. Po akceptacji poprzednia migawka ma zgodną sumę SHA-256. Import pakietu zachowuje niezależną bibliotekę wariantów v4. |
| T03 — integralność i konflikt | Niezgodność sumy z katalogiem, niespójna rodzina wejściowa i konflikt dwóch kart po pobraniu kopii. Druga karta zapisuje nowszy stan, pierwsza próbuje użyć wcześniejszej zgody. | Wczytanie kończy się odmową przed zapisem. Pięć slotów odpowiada nowszemu stanowi, UI wskazuje potrzebę nowej kopii. |
| T04 — pełny DR | Odtworzyć w pustej pamięci oraz nad istniejącym zapisem. W jednym obszarze celowo użyć `null`. Osobno usunąć możliwość `removeItem` z portu pamięci. | Tożsamość, wszystkie raw i suma odpowiadają zaakceptowanemu źródłu. Obszar `null` jest usunięty. Niekompletny port odmawia przed zmianą. |
| T05 — awarie zapisu i cofania | Wybrać niezależną konfigurację awarii zapisu, usunięcia lub odczytu po zapisie. Co najmniej jedna próba ma przerwać rollback. | Stan jest odtworzony bajt w bajt albo aplikacja zachowuje poprawną kopię i blokadę po przeładowaniu. W zablokowanym stanie autosave nie zmienia żadnego slotu. Po jawnym odtworzeniu kontrola raw i sumy przechodzi. |
| T06 — odtworzenie w UI | Eksport z danymi 4/5/6 i obiema bibliotekami, nowy profil, wczytanie kopii, ponowne otwarcie i eksport. Sprawdzić osobno start i wyjście tutorialu z oczekującą pracą. | Pięć raw oraz trwałe ID i referencje są zachowane. Tutorial używa jawnego zatwierdzenia, także przy przywróceniu wcześniejszego środowiska. |
| T07 — wejścia E2E | Porównać mapę 16 skryptów z rzeczywistymi wejściami UI i wynikami. Potwierdzić, że skrypty wykonują akcje oraz że działają kontrole wyniku, a rekord R09 jest wewnętrzny. | Wykonywalny log dla każdego skryptu i uzasadnienie przypisanych asercji. |
| T08 — asercje obliczeń i pilota | Sprawdzić normalny pilot z symulacją, porównaniem, zmianą CAD/Cofnij i ponownym otwarciem. Uruchomić cztery negatywne scenariusze. Ocenić źródło wzorców R01–R05 oraz przypisanie wyników do wariantów. | Zwykły scenariusz przechodzi z poprawnymi danymi. Brak wyniku, zła liczba, ukryte porównanie i brak odtworzonego szkicu kończą się rozpoznanym błędem. |

Pięć obszarów to aktywny projekt v4, biblioteka wariantów v4, stanowiska v5, szkic v6 i warianty v6. Przy porównaniu odtwarzania rozróżnić raw każdego obszaru od czasu utworzenia pliku kopii.

## Dodatkowe dowody wewnętrzne z 18 listopada 2026

Na czystym drzewie produktu `81e51f5` osobna kontrola portu pamięci wykonała 35 prób T05, po siedem na każdy z pięciu obszarów. Dla `setItem` i `removeItem` sprawdzono błędy przed i po zmianie oraz błąd odczytu potwierdzającego. Siódma próba sprawdzała niepotwierdzone wycofanie, blokadę po ponownym otwarciu portu oraz jawne odzyskanie. Wszystkie próby zachowały poprzednią kopię. Porównano dokładne dane i niezależnie obliczoną sumę SHA-256. To kontrolowana próba pamięci syntetycznej.

Próba T03 w dwóch kartach Edge 157.0.4341.60 potwierdziła odmowę wczytania projektu po tym, jak druga karta zapisała nowszy stan. Suma pięciu slotów po odmowie była identyczna z sumą po zapisie z drugiej karty. Wcześniejsza próba P0 oznaczona jako konflikt kart wstrzykiwała zmianę pamięci w ramach jednej karty.

W próbie T06 wyeksportowano kopię ze wszystkimi pięcioma obszarami, przywrócono ją w drugim świeżym profilu Edge i ponownie otwarto aplikację. Surowe wartości oraz suma kontrolna ponownego eksportu odpowiadały pierwotnemu plikowi. Przed zatwierdzeniem odtworzenia stan drugiego profilu pozostał identyczny z jego automatycznie zapisanym pustym projektem. Jest to dowód na ścieżkę kopii i odtworzenia. Zachowanie tutorialu ma oddzielny dowód w próbach P0.

Źródła prób oraz wyniki są lokalnie w `outputs/qa/g1_13c6c617/`. Wykonania są opisane w `five-slots.json`, `two-tabs.json` i `fresh-profile.json`. Na `81e51f5` przeszły też czysta instalacja, build, `verify:clean`, 19 testów core, 17 prób P0 w Edge oraz 7 testów pomocniczych PT. Kod i zasoby produktu, zależności oraz skrypty budowania są identyczne w `81e51f5` i `23d2397`.

Po poprawce harnessu `23d2397` test 7.12.D przeszedł osobno, pilot przeszedł dwukrotnie, a wszystkie cztery kontrolowane przypadki błędne zostały odrzucone ze spodziewanym komunikatem. Pełna mapa 16 wykonanych skryptów pochodzi z `766210c`. Odbiór na wskazanym SHA ma zweryfikować tę mapę i adekwatność asercji.

## Wynik do zwrócenia

Dla każdej próby podać status `PASS`, `FAIL` albo `NOT_VERIFIED`, sprawdzony SHA, środowisko, dane wejściowe, oczekiwanie, wynik i źródło dowodu. Osobno podać decyzję dla kontraktu P0 i adekwatności PT oraz nierozstrzygnięte ryzyka. Odbiór G1 wymaga niezależnej oceny obu części. Próba z uczestnikiem T28 i zatwierdzenie integracji 4/6 mają własne warunki odbioru. [Plan testów RC2](../plany/PLAN_TESTOW_RC2.md).
