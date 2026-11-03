# Zakres wydania V1.0.0

Data: 2026-11-01. Status: **docelowy zakres zatwierdzony biznesowo, realizacja i odbiór otwarte**. Dokument zastępuje sprzeczne deklaracje zakresu jako bieżąca specyfikacja; nie zmienia treści historycznego raportu 7.9. Bazowy kod: `6aa84d8129b7f7cc4d92c3c00b4d8a99a255d3eb`, aplikacja 0.4.0. V1.0.0 to planowane wydanie, nie obecny stan.

Powiązania: [plan remediacji](PLAN_REMEDIACJI_PO_AUDYCIE_RC1.md), [architektura](ARCHITEKTURA_INTEGRACJI_MODELI_V1.md), [testy](PLAN_TESTOW_RC2.md), [macierz audytu](MACIERZ_AUDYT_REMEDIACJA.md).

**Aktualizacja 2026-11-02:** zakres oceniono względem pobranego `origin/main`, SHA `6aa84d8129b7f7cc4d92c3c00b4d8a99a255d3eb`, identycznego z RC1 i podstawą utworzenia `codex/v1-audit-remediation`. Opis „stan w kodzie RC1” w tabelach pozostaje także stanem aktualnego main, potwierdzonym pustym diffem; nie stanowi nowego odbioru runtime/UI. A-01 nadal wymaga UI3/UI4/X3, A-02 integracji i wspólnego raportu, A-03 ustaleń web/telemetrii, a A-04 wyłączenia Eko z publicznych assetów. Nie znaleziono w main poprawek zamykających te obowiązki.

Przy następnej zmianie main należy ponownie ocenić zgodność zakresu z jego kodem według procedury planu remediacji. Zachować cele biznesowe właściciela; nie uznawać nowej implementacji za odebraną bez odpowiedniego dowodu. Poniższe źródła internetowe i wyniki baseline mają daty pierwszej analizy — nie wykonano ich nowego skanu w reweryfikacji wersji.

## 1. Produkt i główny przepływ

Pierwsze wydanie komercyjne jest aplikacją **webową** do projektowania i analizy linii, lokalnie przechowującą projekty w przeglądarce. Podstawowy przebieg: nowy/importowany projekt → proces i BOM → popyt/takt → bilans → layout 2D/3D → wybrany rodzaj symulacji → warianty i porównanie → wspólny raport → zapis, przenośny eksport i ponowne otwarcie. Wszędzie użytkownik widzi aktywny projekt, wariant i aktualność wyników.

Nie wymaga się usunięcia modeli 4/5/6. Ich dotychczasowe formaty muszą pozostać czytelne przez adaptery/migrację. Dane wspólne mają jednego właściciela, a rozbudowana technologia pozostaje jawna. Wspólny raport zawiera wszystkie sekcje A-02; wynik niedostępny jest nazwanym brakiem, nie zerem.

| Funkcja V1 | Stan w kodzie RC1 | Co jest jeszcze warunkiem wydania |
|---|---|---|
| Proces DAG, BOM, import XLSX/CSV/JSON, popyt i takt | Istnieją w projekcie głównym | Podłączenie wspólnych komend, kwalifikacja danych i ochrona przed nadpisaniem |
| Bilans ręczny/RPW/LCR, Yamazumi, zasoby/kompetencje | Dwa różne kontrakty bilansu | Jawna podstawa czasu; nie utożsamiać statycznego bilansu z przepustowością |
| CAD 2D, edycja geometryczna 3D, DXF, podkład z kalibracją | Istnieją; model 6 ma oddzielny odczyt layoutu/playback | Edycja właściwego wariantu i właściciela, zachowanie ID, undo/reopen, brak zmiany technologii przez wygląd |
| Symulacja uproszczona sieci | Istnieje | Wyraźna nazwa i ograniczenia, właściwe źródło i aktualność |
| Harmonogram domenowy fizyczny oraz JIT | Istnieją w modelu 6 | Zintegrowane uruchomienie, jawne kompletność/tryb, zachowanie guardów i referencji |
| Bufory, materiały, korpusy, podmontaże, Gantt i diagnostyka | C2 B1–B3f wdrożone w określonym kontrakcie | Aktualne komunikaty i macierz kombinacji; brak obietnicy dowolnej konfiguracji |
| Warianty/porównanie, koszty, przezbrojenia, MC i OEE | Istnieją w odrębnych ścieżkach | Snapshot całego wariantu, spójne warunki, źródła i ograniczenia, bez podwójnego naliczania strat |
| A4/druk do PDF, MD, eksporty danych | Istnieją rozdzielne raporty, A4 statyczny | Jeden model raportu z wynikami i kwalifikacją tej samej rewizji |
| Kopie/odzyskiwanie/migracje | P0 lokalnie sprawdzone 2026-11-03: kopia/confirm/dirty/restore po reload i BL-01 PASS; niezależny odbiór otwarty | P0 oraz rozszerzenie backupów o nowy magazyn; testy obu formatów |
| Pusty start, katalog i tutorial | Istnieją; katalog czterech pakietów, tutorial 8 kroków | Katalog tylko trzech dozwolonych pakietów, bezpieczny import, aktualny tutorial i pilot z człowiekiem |

## 2. UI3, UI4 i X3 — odtworzony zakres

Źródła: `PLAN_ROZWOJU.md` 7.13.U/X1–X3, `docs/plany/PLAN_WDROZENIA_UI_UX.md` sekcje 3–7, raporty UI1/UI2. Obecne komponenty są bazą funkcji; ich istnienie nie dowodzi odbioru nowego układu. W dokumentacji UI3/UI4 pozostają nierozpoczęte, X3 nierozpoczęte; UI1/UI2 mają odbiory częściowe. Późniejsze zakończenie fizycznego A2 i C2 usuwa dawne zależności w tekście UI, ale nie zamyka odbioru UI.

| Zakres | Co już istnieje | Brak/niepotwierdzone | Odbiór i zależność |
|---|---|---|---|
| UI3: Popyt i materiały | Formularze w App/DataEditors, BOM i kalkulator | Docelowy układ, filtry/sekcje i utrzymanie edycji; wspólne źródło dla 4/6 | U01; po P2b. Parametry i BOM z jednej rewizji, import/cancel/błędy bez utraty danych |
| UI3: Proces i stanowiska | ProcessFlow, diagram, DomainDraftPanel i edytory | Powiązana selekcja lista/diagram/inspektor, uporządkowane podwidoki i jeden właściciel operacji | U02–U03; P2a/b. ID, zależności gałęzi, profile/obsada/kalendarze/kompetencje zachowane |
| UI3: Bilansowanie | BalancingBoard, ResourceEditor, DomainBalancingPanel | Jednoznaczna podstawa i aktywne dane, powiązanie z wariantem/raportem | U04–U05; P2b/c. Blokady/kopie, ręczny/RPW/LCR, ograniczenia metod i zgodne wyniki |
| UI4: Pulpit | Pusty start i katalog w App | Bezpieczne wczytywanie, czytelny stan projektu/wariantu/zapisu; Eko poza publicznym produktem | U06; P0/P4b/P2a. Otwórz/Nowy/przykład nie porzuca pracy |
| UI4: Raporty i eksport | EngineeringReportView i raporty MD | Wyniki symulacji/porównania i pochodzenie w jednym raporcie; poprawna aktualność formatów | U07; P2c/d. Ten sam fingerprint i dane A4/MD/eksport |
| UI4: pełna ścieżka i tutorial | Tutorial, wiele historycznych QA | Pilot na aktualnym SHA z rzeczywistymi asercjami, wznowienie/wyjście i beginner acceptance | U08; PT, P2/P3/P5. Save/reload/export/import/recovery i alternatywa tekstowa |
| X3: kompletny odbiór | Rama sześciu obszarów, część viewport i klawiatury | Gesty wskaźnikiem, osobne okna, brak WebGL, trzy szerokości, 200%, klawiatura i brak utraty pracy w całym przepływie | U09–U12. Wszystkie akcje mają miejsce; realny viewport ≥70% szerokości i ≥60% wysokości przy 1280×720 oraz 1440×900 |
| 7.13.U: język i stany | `uiNavigation.ts` ma nazwy użytkowe | Stare „szkic 6”, „Stanowiska v5”, sprzeczne „bufory poza zakresem” i „dalsza integracja” | U10/U12; nazwy odpowiadają rzeczywistym możliwościom i źródłom, techniczne wersje w diagnostyce |

Kontrolki mają dostępne nazwy, focus/Tab/Escape i powrót focusu. Zwykły tekst: cel kontrastu co najmniej 4,5:1; cele desktopowe co najmniej 32×32 px i dotykowe 44×44 px zgodnie z planem UI. Przy 390×844 podstawowe akcje i zamknięcie panelu pozostają osiągalne, bez poziomego scrolla całej strony poza lokalnym obszarem tabeli/sceny. Nie obiecywać pełnej wygody desktop CAD na telefonie. Filtr/zwinięcie/zmiana zakładki nie porzuca niezapisanej edycji.

Stany: pusty, brak danych, niekompletny, obliczanie, aktualny, nieaktualny, anulowany, błąd/odmowa i odzyskiwanie. „Brak błędów walidacji struktury” nie oznacza potwierdzonej technologii. Import, zastąpienie wariantu i regeneracja ręcznego layoutu są świadome i odwracalne w określonym kontrakcie. Nie zakładać, że sam reload można odwrócić Cofnij.

## 3. Granice symulacji i prawdziwe ograniczenia

| Tryb | Co oznacza | Czego wynik nie potwierdza |
|---|---|---|
| Uproszczona sieć | `simulateNetwork`, zerowy transport, nieograniczone kolejki i dedykowani operatorzy według istniejącego kontraktu | Fizycznej wykonalności transportu, finite buffers i współdzielonej załogi |
| Domena JIT/process-only | Jawny opt-in, domyślnie OFF; zależności, pracownicy/stanowiska/wyposażenie i kalendarze; materiały założone dostępne | Czasów/tras/rezerwacji transportu ani fizycznych lokalizacji korpusu; nie modyfikuje zapisanej logistyki |
| Domena fizyczna | Jawne zasoby, profile, trasy, korpusy, podmontaże, bufory i dostępność materiału w obsługiwanej konfiguracji | Rzeczywistej wydajności zakładu bez danych i walidacji; brakujące wejście daje odmowę, nie automatyczny JIT |

| Kombinacja | Zasada V1 | Klasa |
|---|---|---|
| Bufory korpusów, dodatnie i zero; lokalna kontynuacja | Obsługiwane w odpowiedniej ścieżce linear/graph według B3c–f; jedna jawna kopia na operację uporządkowanego body spine przy gałęziach | Obsługiwane warunkowo |
| `bbas` na wyjściu | Pełna jawna obecność; zatrzymanie wspólnej załogi do rzeczywistego zwolnienia. Mieszane polityki producenta trzymają załogę do odejścia wszystkich oczekujących partii | Obsługiwane warunkowo |
| Zero output/direct input | Rezerwacja celu przed odjazdem; przyjazd równy startowi. Załadowany odjazd własnego korpusu może zwolnić trzymaną załogę, pusty dojazd jej nie zwalnia | Obsługiwane warunkowo |
| Bezpośredni podmontaż + pozostałe partie w dodatnich buforach | Jeden direct lot; korpus już w kopii odbiorcy; jednoczesne zużycie przy actual start; odbiorca może mieć held-worker output | Obsługiwane B3f |
| Reszta 5−3=2 | Pozostaje jako widoczny zapas, zajmuje 2 miejsca; bez nowego jawnego przypisania brak ponownego zużycia/przewozu | Niezmiennik |
| Korpus i podmontaż jednocześnie zdalnie direct 0+0 | Wymagany bufor wejściowy co najmniej po jednej stronie; odmowa | **Trwała reguła właściciela 2026-10-28**, bez ponownego otwierania |
| Wiele bezpośrednich incoming subassembly lots | Odmowa zgodnie z końcową decyzją właściciela/AGENTS; nie obiecywać „wkrótce integracji” | **Trwała reguła zakresu domenowego**; hipoteza Claude o innej interpretacji nie zmienia decyzji |
| Częściowa obecność przy held-worker `bbas` | Odmowa w tym zakresie | Ograniczenie implementacji V1 |
| Zmienne kopie/routing, przezbrojenia w graph finite buffers z gałęziami | Odmowa; brak generalizacji z obsługi innych ścieżek | Ograniczenie implementacji V1 |
| Grupy równoległe na direct recipients | Odmowa | Ograniczenie implementacji V1 |
| Finalny finite output bez jawnego odbioru wyrobu | Nie zakładać odbioru lub znikania korpusu; zachować guard odpowiedniej ścieżki i raportować brak | Ograniczenie konfiguracji |
| Pojemność copy=null | Osobny limit każdej kopii; podmontaże mają oddzielne limity od siebie i korpusów, w sztukach | Niezmiennik |

Powyższa macierz opisuje wymagany zakres wydania na podstawie kontraktów i guardów RC. W P2c/P5 każdy wiersz otrzyma test kodu i UI, a komunikat będzie odpowiadał wybranemu solverowi; nie jest to nowe potwierdzenie wykonania tych testów. Równoległość wyłącznie jawna, jedna lokalizacja korpusu, bez double-booking. Puste dojazdy wielu wózków kolejno w stored equipmentIds order. Monterzy transportują tylko między operacjami; magazyn to dostępność bez personelu/kalendarza. Zużycie jawne przy actual start, dostawy przed zużyciem przy równym czasie; pierwsza dostawa nie jest domyślnie w t=0.

## 4. Web — konfiguracja i transmisje danych

Stan kodu: React/Vite, statyczny `dist`; `vercel.json` ustawia build/output i rewrite wszystkich ścieżek do index.html, ale nie definiuje CSP/nagłówków ani polityki aktualizacji. `vite.config.ts` przypina dev-server do 127.0.0.1; dev-server nie jest kanałem komercyjnej dystrybucji web. Nagłówki z `scripts/serve.mjs` obowiązują lokalny serwer, nie dowodzą konfiguracji Vercel. Rzeczywiste dashboard settings, CSP, cache, domeny/preview i ostatni produkcyjny SHA wymagają odrębnego sprawdzenia.

| Strumień | Co stwierdzono w kodzie | Wymaganie P4a/P5 |
|---|---|---|
| Hosting aplikacji/assets | Przeglądarka pobiera HTML/JS i demo z origin aplikacji | Informacja o hostingu i żądaniach technicznych; analiza logów/retencji/odbiorców z konfiguracji dostawcy |
| Vercel Analytics | `main.tsx` bezwarunkowo renderuje Analytics; brak `beforeSend` i własnych wywołań track znalezionych w przeglądzie src | Rekomendowany domyślny OFF, konfiguracja niezależna od danych projektu; włączenie po zatwierdzeniu polityki i ewentualnych zgód |
| Projekt/BOM/pliki importu | Zbadane importery zapisują lokalnie; nie znaleziono celowego uploadu projektu w przeglądanych ścieżkach src | To dowód statyczny, nie gwarancja braku transmisji; test sieci z syntetycznym sentinel w nazwach, BOM, ścieżce i błędach, także przy analityce |
| Katalog/tutorial | fetch index/pakietów do tego samego origin | Żadne dane klienta w query/referrer/URL; katalog allowlist 01–03 |
| SheetJS | Tarball pobierany przy instalacji/buildzie; bundlowany chunk `spreadsheets` | Nie mylić zależności build-time z CDN runtime; sprawdzić brak zewnętrznego fetch podczas importu offline po załadowaniu aplikacji |
| Fonty/pozostałe biblioteki | Nie znaleziono użycia Google Fonts w badanym runtime src; vendor SDK może dodawać własne żądania | Pełny HAR i kontrola bundle/HTML/CSS w produkcyjnym buildzie; allowlist odbiorców, test blokady telemetrii |

Według [dokumentacji prywatności Vercel Analytics](https://vercel.com/docs/analytics/privacy-policy) zbierane mogą być m.in. URL, referrer, przefiltrowane query oraz dane urządzenia/przeglądarki; dostawca opisuje brak cookies w tym mechanizmie. Nie dowodzi to braku transmisji ani obowiązków informacyjnych konkretnego produktu. Dostawca wskazuje ryzyko wrażliwych URL i oferuje [`beforeSend`/redakcję](https://vercel.com/docs/analytics/redacting-sensitive-data). SDK v2 może używać dynamicznych adresów intake, więc test nie może blokować/sprawdzać wyłącznie jednej znanej ścieżki. Źródła sprawdzone 2026-11-01; faktyczny ruch tej aplikacji nie był tu mierzony.

Nie wkładać nazw klientów/projektów, BOM, czasów, kosztów, geometrii, źródłowych plików ani treści błędów zawierających te dane do zdarzeń analityki. Techniczna telemetria, jeśli zatwierdzona, ma minimalny, wersjonowany schemat i redakcję; odmowa/blokada SDK nie blokuje projektu. Nawet przy OFF hosting otrzymuje żądania i dane połączenia.

### Obszar do ewentualnej oceny prawnej

Do przekazania prawnikowi lub osobie odpowiedzialnej za prywatność: administrator/role dostawców, cele i podstawa przetwarzania technicznych danych i opcjonalnej analityki, obowiązki informacyjne, retencja i transfery, umowy/podwykonawcy, ocena potrzeby i sposobu zgody oraz jej wycofania w wybranych jurysdykcjach. Brak cookies nie rozstrzyga automatycznie tych kwestii. Odrębnie: prawa do Eko, materiałów UI/wyposażenia i publicznych materiałów marketingowych. Niniejsza analiza techniczna nie stwierdza zgodności prawnej ani obowiązku konkretnego bannera.

### Zależności

- **Vite 7.3.6:** raport BL-02 zawiera 1 podatny pakiet i 5 advisories (1 HIGH). Aktualne [GHSA-587h-7wmj-h5pm](https://github.com/advisories/GHSA-587h-7wmj-h5pm) obejmuje Vite do 7.3.6 i wskazuje poprawkę 7.3.7 dla tej linii. Ścieżka dotyczy narzędzi/launch-editor na Windows; statyczny dist nie uruchamia dev-servera, lecz narzędzia budowania i stare launchery nadal wymagają oceny. Nie dowiedziono exploita produkcji ani nie unieważniono problemu samym devDependency. P4a wykonuje nowy skan wszystkich advisories, dobiera wersję i sprawdza build/workery/CSS/importy.
- **SheetJS:** package.json wskazuje oficjalny tarball CE 0.20.3. [Advisory prototype pollution](https://cdn.sheetjs.com/advisories/CVE-2023-30533) wymienia wersje do 0.19.2, a [ReDoS](https://cdn.sheetjs.com/advisories/CVE-2024-22363) do 0.20.1. Zatem samo przywołanie tych dwóch CVE nie potwierdza podatności wskazanej 0.20.3. To nie pełna ocena bezpieczeństwa: trzeba sprawdzić resolved/integrity lockfile i zainstalowaną wersję, bieżące advisories, licencję i wejścia parsera. Audytor 01.4 dostał 403 przy npm ci; powtarzalność instalacji jest otwartą bramką, nie dowodem błędu algorytmu. Nie podmieniać tarballa na starą wersję z npm bez analizy.
- Licencje runtime i modele/assety wymagają osobnej inwentaryzacji/SBOM. Npm audit nie potwierdza praw do danych ani odporności na duże/uszkodzone arkusze. Testować limit rozmiaru, liczbę rekordów, anulowanie i zachowanie projektu przy błędzie; nie obiecywać pełnej odporności parsera na każdy plik.

### Aktualizacje i wersjonowanie

1. Jedna produkcyjna domena/origin jako główny kanał. Zmiana origin nie przenosi localStorage/IndexedDB; użytkownik musi mieć przenośny backup. Preview nie jest magazynem produkcyjnego klienta.
2. Rejestr metryki: appVersion, pełny build SHA, format koperty, format pakietu/backup i wersja silnika. To odrębne wartości. Aktualnie package/lock/index.html/APP_VERSION są 0.4.0; zmiana planowana w P4c. Biblioteki demo zachowują własne wersje, m.in. C2 1.2.0.
3. W rozwoju spójne `1.0.0-rc.N`; finalnie `1.0.0` dopiero po zatwierdzeniu. Nie przesuwać istniejącego tagu/RC. Zmiana `appVersion` nie wymusza reinterpretacji starego `schemaVersion`.
4. Weryfikować aktualizację stary→nowy build na tym samym origin: dirty/autosave, długie obliczenie i druga karta. Żadnego wymuszonego reload tracącego pracę. HTML ma politykę rewalidacji, hashowane assets odpowiedni cache, bez starego workera do nowego kodu. Nie dodawać service workera tylko dla etykiety offline.
5. Rollback hostingu wybiera zgodny build; po migracji nie cofa automatycznie danych. Kopia przed aktualizacją i nowy magazyn pozostają dostępne. Dowód Git push nie jest dowodem deploymentu; push może uruchamiać integrację Vercel, więc przed publikacją gałęzi zweryfikować blokadę auto-deploy.
6. Testy staging/produkcyjne T23–T26 na rzeczywistych ustawieniach po autoryzacji odpowiedniego deploymentu. Ta analiza nie jest zgodą na deploy ani zmianę ustawień hostingu.

## 5. Eko — publiczne powierzchnie i zachowanie regresji

| Powierzchnia | Dowód/stan lokalny | Działanie P4b |
|---|---|---|
| Indeks katalogu | `przyklady/katalog.json` zawiera 04_eko, UI renderuje wszystkie entries | Allowlist 01–03 i test liczby/identyfikatorów; nie filtrować jedynie karty |
| Generator build/dev | predev/prebuild wywołuje `prepare_demo_catalog.mjs`, który pakuje całe katalogi i nie usuwa starych plików | Staging + ścisły manifest oczekiwanych plików + bezpieczne usunięcie wyłącznie nadmiarowych wygenerowanych assetów |
| Bezpośrednie pliki serwera | Lokalnie istnieją `public/demo-projects/04_eko.project.json` i `.zip`; są ignorowane przez Git i mogą zostać skopiowane do dist | Test czystego i przyrostowego builda, brak plików/payloadów w dist; negatywne żądania HTTP |
| Źródłowy pakiet | Śledzone `przyklady/04_eko/` obejmuje JSON, warianty, XLSX, słownik i referencje; generator `generate_demo_eko_7_13.mjs` może je odtworzyć | Zachować wewnętrzny komplet regresji, odłączyć publikowanie. Nie kasować/przenosić śledzonych danych w tej analizie |
| Inne źródła i wyniki | `dane/eko/7_1`, `src/core/models/ekoProject.ts`, `tests/Test Eko*.xlsx`, `tests/fixtures/eko*`, `tests/qa/Eko_*`, `outputs/scenarios/eko_2_9`, `outputs/data_audit`, przykladowe_importy | Rozdział internal/public, manifest fixture i brak importu do produkcyjnego bundle. W odczytanych runtime entrypointach brak odwołania do DEFAULT_EKO_PROJECT; sprawdzić także wynik bundle |
| Dokumenty i obrazy | `Instrukcja/Eko_v0.4.md`, screenshoty Eko, historyczne opisy, DXF/CSV i inne materiały w śledzonym drzewie | Nie dystrybuować materiałów zawierających dane w nowym publicznym pakiecie pomocy; zachować historię. Ocenić każdy plik po treści, nie tylko nazwie |
| Publiczny Git/GitHub | Źródła i dane figurują w audytowanym publicznym repo; nie wykonano tu pełnego skanu historii/tags/LFS/releases | Odtworzyć listę osiągalnych plików, archiwów i release assets. Zabezpieczyć wewnętrzną kopię. Właściciel osobno decyduje o ograniczeniu dostępu, przeniesieniu lub usunięciu; brak force push/history rewrite |
| Stare deploymenty/CDN | Lista aliasów, preview, niezmiennych URL i cache nie jest dostępna w samym vercel.json | Inwentaryzacja u operatora; osobno zatwierdzony plan wyłączenia/ochrony starych deploymentów i unieważnienia cache; ponowny test URL |
| Kopie osób trzecich | Nie można potwierdzić ich braku z repo | Rejestr wcześniejszej ekspozycji; usunięcie z nowego dist nie cofa pobrań. Właściciel/prawnik ocenia dalsze działania |

Wyłączenie Eko z nowego katalogu i assetów jest obowiązkiem V1. Szerszej poufności nie można uznać za osiągniętą, dopóki właściciel nie rozstrzygnie wskazanych publicznych powierzchni. Zachowanie wewnętrznej regresji nie oznacza zgody na dalsze publiczne hostowanie źródłowych danych. Nie kasować plików automatycznie ani nie przepisywać raportów historycznych, by usunąć ślad ekspozycji.

Negatywny test URL musi sprawdzać treść/typ i status: rewrite SPA może zwrócić 200 HTML dla nieistniejącego JSON/ZIP. Warunek minimalny: payload nieosiągalny i indeks bez wpisu; docelowo 404/410 dla wycofanych adresów danych. Sam 200 index.html nie dowodzi dostępności danych, ale wymaga właściwego zachowania klienta.

## 6. Kryteria odbioru i odłożone funkcje

Wydanie wymaga zamknięcia wszystkich wierszy macierzy audytu lub udokumentowanego wykluczenia jako nieaktualnych/niepotwierdzonych, zgodnego z decyzjami A-01–A-04. Każda obligatoryjna luka dowodowa ma uzyskany wynik; historyczny PASS nie zastępuje testu nowego SHA. UI3/UI4/X3 odebrane w rzeczywistym UI, migracje i ochrona danych PASS, integracja i wspólny raport zaakceptowane, zależności i prywatność ocenione, Eko nieobecne w nowych publicznych assetach, pilot z początkującym i niezależny ponowny audyt. Nie ma automatycznego GO z licznika planu.

Poza V1: VSM (8.1), A3 (8.2), konfigurator części wyposażenia (8.3), import STEP i rozszerzonych formatów CAD/GLB/glTF/STL/OBJ użytkownika (8.4), współedycja online/logowanie/chmura projektów, płatności/licencjonowanie jako nowa funkcja, ERP/MES i flota magazynowa, automatyczne normowanie czasu, certyfikacja BHP/ISO/CE. Bundlowane autorskie modele przygotowane z GLB nie oznaczają dostępnego importera GLB dla użytkownika. Realna walidacja zakładowa wymaga odrębnych danych i odbioru; wyniki syntetyczne nie są pomiarami produkcji.

Ograniczenia kombinacji symulacji z sekcji 3 są jawnymi granicami produktu, nie obietnicą ich wdrożenia w V2. Trwałych reguł domenowych nie przenosi się do backlogu „do zniesienia”. Przyszłe rozszerzenie wymaga osobnego uzgodnienia.
