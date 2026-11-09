# P4b — ograniczenie dystrybucji Eko

Stan na 9 listopada 2026. Gałąź `codex/v1-p4b-eko` oparto na `c2b2d0467c55065a4b176e04477ede1a12931828`. Pobrany `origin/main` oraz historyczny RC1 wskazują `6aa84d8129b7f7cc4d92c3c00b4d8a99a255d3eb`. Pakiet pozostaje w trakcie do niezależnego odbioru, sprawdzenia historycznych powierzchni i testów kandydata.

## Powierzchnie

| Powierzchnia | Stan i działanie |
|---|---|
| Katalog produktu | Źródłowy indeks, generator i walidator UI dopuszczają wyłącznie syntetyczne pakiety 01–03. Stary indeks z Eko jest odrzucany. |
| `public/demo-projects` i `dist/demo-projects` | Wcześniej zawierały `04_eko.project.json` i `04_eko.zip`. Po wygenerowaniu i buildzie dostępne są tylko trzy pakiety. Poprzedni wygenerowany katalog zachowano poza public w `outputs/qa/p4b_catalog_backups/run-YLeEKC/`. |
| Wewnętrzna regresja | `przyklady/04_eko`, arkusze, fixture i źródła testowe pozostały na swoich miejscach. Kopia 12 plików pakietu i poprzednich assetów public/dist wraz z sumami znajduje się w `outputs/qa/p4b_internal_backup/`. |
| Runtime bundle | W `stationDerivation.ts` i bundlu pozostał identyfikator `eko-demo-v04` jako warunek kompatybilności. Skan markerów `04_eko`, `EKO-PARALLEL`, `EKO-SHARED-WORKER` i sum plików fixture nie wykrył danych Eko w `public`, `dist` ani rozpakowanych ZIP-ach. Skan nie rozstrzyga wszystkich możliwych reprezentacji danych. |
| Instrukcja | Tekst źródłowy, HTML i PDF opisują trzy przykłady. Pozostałe materiały i dokumenty repozytorium mogą zawierać informacje historyczne Eko. |
| Git, historia, release assets i stare wdrożenia | Dane Eko są w śledzonych plikach i historii Git. Sam nowy build nie cofa wcześniejszego udostępnienia. Uprawnienia do publikacji i postępowanie z historią, repozytorium, release assets, kopiami, CDN i starymi deploymentami wymagają decyzji właściciela i ewentualnej oceny prawnej. Nie zmieniono historii ani danych testowych. |

## Weryfikacja lokalna

- Generator przygotowuje katalog w lokalnym stagingu, odmawia nieznanych plików i zachowuje poprzedni katalog przed wymianą. `p4b_catalog.test.mjs` sprawdza starą syntetyczną pozostałość Eko, zachowaną kopię, nadmiarowy plik, `--check` oraz odmowę dodatkowego projektu.
- Build PASS. Skan objął 97 plików i wpisów archiwów bez dopasowania podanych markerów lub sum pełnych plików fixture.
- `verify_p4b_distribution.mjs` PASS na lokalnym serwerze. Trzy JSON i ZIP mają sumy z indeksu. Dwa stare adresy zwracają 404 bez danych Eko. Reguła SPA i faktyczne odpowiedzi Vercel nie zostały zweryfikowane.
- `scripts/audit_data_qualification_7_1.mjs` zaktualizowano do jawnej listy 01–03, zgodnie z A-04. Audyt zakończył się ALL PASS, w tym kontrolą wewnętrznego rejestru Eko oraz trzech syntetycznych pakietów.
- Edge 7.13 PASS z trzema kartami, `outputs/qa/p4b/7_13_closure/run_KDoTK0/`. Odrzucenie zasymulowanego starego indeksu z Eko PASS. Wewnętrzny Eko R09 w Edge oraz pięć celowanych testów Eko PASS. Automatyczny pilot po zmianie walidatora UI PASS, `outputs/qa/pt_e2e/pilot_runs/run_5U675d/` i `outputs/qa/pt_e2e/sol_reference/7_12d/run_EgYcNX/`.
- Instrukcję HTML/PDF wygenerowano ponownie. Weryfikator potwierdził 67 stron, 53 dostępne obrazy, zgodność HTML/MD, brak pustych stron i tekstu poza stroną. Zestawienie stron zapisano w `outputs/qa/p4b/manual/`. Ekstrakcja tekstu PDF nie wykazała słowa Eko. Obrazy i wszystkie pozostałe dokumenty repozytorium wymagają osobnej oceny zawartości.

## Otwarte kryteria

Potrzebny jest zewnętrzny przegląd kompletności ekspozycji, inwentaryzacja aktualnego publicznego repozytorium i historycznych dystrybucji oraz decyzja co do praw i retencji. Na nowym kandydacie należy powtórzyć skan wynikowego artefaktu i test HTTP z kontrolą treści, typu oraz odpowiedzi SPA. Weryfikacja docelowego hostingu nastąpi po osobnej zgodzie na deployment.

## Sprawdzenie aktualnej ekspozycji — 9 listopada

Odczyt `https://layout-studio-pro-3d.vercel.app` o 21:40 UTC wykazał, że indeks produkcyjny nadal zawiera `04_eko`. Adresy `/demo-projects/04_eko.project.json` i `/demo-projects/04_eko.zip` zwróciły HTTP 200, odpowiednio typ JSON i ZIP. Sumy SHA-256 obu odpowiedzi są identyczne z kopiami poprzednich wygenerowanych assetów. Wynik metadanych, bez zapisania pobranych danych, znajduje się w `outputs/qa/p4b/host_exposure.json`. Lokalna gałąź P4b nie została wdrożona; ten wynik dotyczy zastanego wdrożenia, a nie lokalnego builda.

GitHub podaje widoczność repozytorium jako publiczną. Odczyt listy GitHub Releases zwrócił pustą listę, a `git ls-remote --tags origin` nie zwrócił tagów. Stan ten nie obejmuje innych kanałów dystrybucji, cache ani wcześniej pobranych kopii. W `origin/main` są śledzone pliki `przyklady/04_eko/`, `dane/eko/7_1/`, arkusze testowe, modele, fixtures i eksporty testowe. Wykryto również materiały instrukcji i zrzuty, dokumenty danych/weryfikacji, pliki w `outputs/` oraz przykładowy DXF i CSV z Eko w nazwie. Część innych plików może zawierać dane bez tego oznaczenia.

Historia pakietu `przyklady/04_eko/projekt-pokazowy.json` obejmuje commit `cf41b47`, osiągalny przez zdalne `main`, `release/v1-audit-rc1` i `codex/model-process-2-1`. Wykrycie nazw oraz dostępności repozytorium nie stanowi kompletnego audytu każdej treści i wszystkich zewnętrznych kopii. Zakres ewentualnych działań wobec bieżącego wdrożenia i publicznego Git wymaga decyzji właściciela. Zmiana widoczności repozytorium, przepisanie historii, usuwanie śledzonych plików i deployment pozostają osobnymi działaniami.
