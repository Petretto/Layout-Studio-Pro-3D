# 7.12.A — wykonalność i kontrakt kompletnych projektów pokazowych

Data: 2026-10-19. **Audyt i kontrakt odebrane; 7.12 pozostaje w trakcie.** Nie utworzono trzech projektów, nie wdrożono nowego importera i nie zmieniono schematów/zapisu aplikacji. Poniższe luki są odtworzonymi ograniczeniami, nie pozytywnym odbiorem ich zachowania. Rejestr Eko i zastane lokalne pliki pozostały bez zmian.

## Wynik

Obecne XLSX procesu/BOM oraz JSON/archiwa 4 i 5 nadają się do części danych wejściowych. Cały model zasobów, fizycznych podmontaży, transportu i buforów znajduje się w szkicu 6, który ma eksport i lokalny odczyt, ale **nie ma odrębnego importera pliku w UI**. Biblioteka wariantów 6 również nie ma importera pliku. Wczytanie aktywnego projektu 4 nie wczytuje szkicu ani biblioteki 6.

Pełna kopia środowiska potrafi przenieść poprawny szkic i warianty przez UI, lecz nie jest bezpiecznym docelowym formatem pojedynczego przykładu. Obejmuje kilka niezależnych obszarów, ma słabszą walidację od odczytu szkicu/biblioteki i może pozostawić mieszany lub częściowo zapisany stan. Nie obchodzić braków przez instrukcję wklejania danych do localStorage.

Kontrakt zawartości i docelowe pliki: [przyklady/KONTRAKT_PAKIETU.md](przyklady/KONTRAKT_PAKIETU.md). Indeks: [przyklady/README.md](przyklady/README.md). Docelowa nowa otoczka pojedynczego projektu jest propozycją A1; obecnie nieobsługiwana, bez deklaracji migracji danych.

## Macierz dane → plik → importer → odtworzenie

Legenda: **TAK** = istniejąca ścieżka; **CZĘŚĆ** = nie przenosi pełnego kontekstu; **LUKA** = brak ścieżki plikowej albo niewystarczający odbiór. Przegląd kodu nie jest równoznaczny z testem UI każdej funkcji. UI w tym pakiecie sprawdza wyłącznie ścieżki opisane w dowodach poniżej.

| Dane | Obecny plik / zapis | Obecny importer / odczyt | Odtworzenie i ograniczenie |
| --- | --- | --- | --- |
| Operacje, standardy, VA/NVA, graf | XLSX/CSV przez `processRows` | `importProcess`, zakładka Proces | TAK dla marszruty; CZĘŚĆ całego projektu. Arkusz nie zawiera zasobów 6, przypisań do trwałych stanowisk i profili obecności. Puste VA daje domyślne 85%, dlatego w przykładach wpisywać oba VA/NVA jawnie. |
| BOM | XLSX/CSV przez `bomRows` | `importBOM`, zakładka BOM | TAK dla BOM z odwołaniami; importer nadaje ID wierszy `BOM-n`. Nie przenosi zapasów/dostaw/zużycia technologicznego. Nie zakładać zachowania dowolnych oryginalnych ID BOM. |
| Popyt, waluta, metoda bilansu, layout i geometria 4 | JSON 4 / archiwum 4 | Główny import: `parseProject`, `readPortableArchive(...,4)` | TAK; plik 4 nie zawiera szkicu i wariantów 6. Maks. zwykły JSON 10 MB, archiwum 25 MB, pierwotny import 10 MB. |
| Trwałe stanowiska, przypisania i zasoby 5 | JSON 5 / archiwum 5 | Warsztat: `parseStationProjectV5`, `readPortableArchive(...,5)` | TAK; odrębny od aktywnego 4. Archiwum zachowuje migawkę źródłową i pierwotny import, zwykły JSON 5 nie musi ich zawierać. |
| Operacje i modele czasu/obsady 6 | `DomainDraftSave`, eksport szkicu z oryginałem | `readDomainDraft` lokalnie; brak file input w panelu szkicu | LUKA plikowa. Parser projektu 6 nie zastępuje walidatora całej otoczki zapisu szkicu. Główny importer 4 odrzuca plik szkicu. |
| Osoby, pule, kompetencje i wyposażenie 6 | `workers`, `workerPools`, `equipment`, `competencyRequirements`, `workerRunSelection` w projekcie 6 | Walidatory 6 + lokalny zapis szkicu | LUKA plikowa; brak osobnych importerów XLSX/CSV tych zasobów. Nie zakładać ich obecności po imporcie marszruty/BOM. |
| Kalendarze i dopuszczenia kopii | `resourceCalendars`, `stationRouting`, `stationSettings` | Parser 6 i edytory szkicu | Zachowane lokalnie; LUKA importu szkicu. Każde ID kopii/zasobu i dopuszczenie jawne. |
| Wyrób, korpusy i stan początkowy | `product`, `bodyRunInput`, role fizyczne operacji | Parser 6 i edytory szkicu | Zachowane lokalnie; nie są pochodną wyglądu lub BOM. LUKA importu pełnego projektu. |
| Podmontaże i równoległość | `subassemblies`, `subassemblyFlow`, `physicalConcurrency` | Parser 6, edytory i harmonogram szkicu | LUKA plikowa. Sam graf XLSX nie przenosi ilości partii, przypisań wykonań i fizycznych warunków łączenia. |
| Transport, bufory i zasilanie | `assemblyTransport`, `stationBuffers`, `materialNetwork`, `materialSupply` | Parser 6, edytory i harmonogram | LUKA plikowa; kompletność musi objąć stan początkowy, czasy/ilości i polityki. JIT jest jawnym osobnym trybem, nie rozwiązaniem brakującej konfiguracji. |
| Przezbrojenia, zlecenia i Monte Carlo | `changeoverMatrix`, `productionOrders`, `stochasticConfig` | Parser 6 i edytory | W projekcie 6; import pojedynczego szkicu nadal brakujący. Parametry i ziarno losowe muszą być jawne, jeśli włączone. |
| Warianty 4 | Osobne projekty JSON lub wpisy biblioteki przeglądarki | Import główny otwiera projekt, nie bibliotekę | CZĘŚĆ: JSON pojedynczego wariantu nie odtwarza całej biblioteki. |
| Warianty 6 | `domain-variant-library`, v1, eksport JSON | `readDomainVariants` lokalnie; brak importera pliku w panelu | LUKA. Każda migawka zawiera projekt 6 i identyczne dokładne źródło 4/5; obcego źródła nie wolno dopasować po samej nazwie. |
| Warunki porównania | Batch/odstęp przybyć/JIT/koszty w stanie komponentu UI | Użytkownik ustawia w panelu; raport zawiera przyjęte warunki | CZĘŚĆ: eksport biblioteki nie zapisuje pełnych ustawień eksperymentu; pakiet musi je dokumentować i odtwarzać jawnie. |
| Wygląd i assety | `layoutObjects`, wspierane `visualModelId`, podkład `dataUrl` | Parsowanie 4/5/6 we wspieranym zakresie | Tylko obsługiwane modele. Manifest nie uruchomi importu dowolnego GLB/STEP; nie umieszczać wymaganych lokalnych ścieżek użytkownika. |
| Całe środowisko | `.lsbackup.json`: 4, biblioteka 4, 5, szkic 6, warianty 6 | Modal Kopie i odzyskiwanie | TAK w poprawnej próbie odtworzenia; LUKI bezpieczeństwa/izolacji wymienione niżej. To odtworzenie obszarów środowiska, nie importer pojedynczego projektu. |
| Raport/animacja/layout a stan 6 | Raport A4 i główna hala 2D/3D korzystają z aktywnego 4; warsztat 5 ma osobny podgląd; szkic 6 ma harmonogram/Gantt/porównania | Oddzielne komponenty/panele | LUKA integracji do weryfikacji A2. Nie oznaczać raportu 4 jako raportu wyników dynamicznych szkicu 6. Ten audyt nie potwierdza pełnej ścieżki fizycznego przykładu 6 do głównej animacji/raportu. |

## Odtworzone luki i pakiety następcze

| ID | Dowód / skutek | Wymagany rezultat |
| --- | --- | --- |
| L1 — import pełnego projektu 6 | Pobierany `domain-draft-save` jest poprawny lokalnie, ale odrzucony przez import główny. Brak file input szkicu i biblioteki. | **7.12.A1:** osobny importer/eksporter pojedynczego pakietu 4/5/6 i wariantów, korzystający z istniejących walidatorów całych otoczek, zgodności dokładnych źródeł i podglądu zastępowanych danych. Projekt nie wymaga migracji na nowy schemat tylko po to, by zmienić opakowanie. Zachować stare pliki. |
| L2 — integralność kopii | Zmieniona suma SHA daje `valid: true`, `checksumMatches: false`; w UI przycisk przywrócenia jest aktywny. | **7.6a:** odrzucać kopię przy niezgodnej sumie przed jakimkolwiek zapisem; blokada również w API, nie tylko przycisk. |
| L3 — walidacja otoczek i bibliotek | Kopia z samym projektem 6 zamiast `DomainDraftSave` i biblioteką `not-json` przechodzi walidację. Po odtworzeniu oba lokalne czytniki zwracają `corrupt`. | **7.6a:** walidacja wszystkich pięciu slotów, wersji, otoczek i bibliotek, źródeł oraz powiązań. Sam SHA nie potwierdza poprawności modelu. |
| L4 — mieszanie środowisk | Slot v5 równy null w kopii nie usuwa starego v5 u odbiorcy. | **7.6a:** jednoznaczna semantyka pełnego odtworzenia null/usunięcia; podgląd skutków. Import pojedynczego projektu A1 ma osobny jawny zakres, bez ukrytego pozostawienia niezgodnego szkicu lub biblioteki. |
| L5 — częściowy zapis | Symulowany błąd setItem dla szkicu pozostawia zmieniony v4 i stary szkic. Snapshot jest tworzony przed zapisem, ale funkcja rzuca wyjątek przed jego zwróceniem; modal pobiera go dopiero po powodzeniu. | **7.6a / A1:** dostępna kopia ratunkowa przed mutacją, wycofanie zapisów po błędzie i kontrola przywrócenia; osobna obsługa awarii rollbacku, bez deklaracji niemożliwej transakcyjności localStorage. Testy błędów każdego slotu. |
| L6 — podsumowanie wariantów | Biblioteka 6 jest obiektem z `variants`, a podsumowanie liczy tylko tablicę; 1 zapisany wariant pokazuje jako 0. | **7.6a:** licznik oparty na zwalidowanej bibliotece. |
| L7 — model widoczny i wynikowy | Szkic 6 nie steruje głównymi widokami aktywnego projektu 4; warunki eksperymentu w części są sesyjne. | **7.12.A2:** jednoznaczny wybór modelu/źródła w ścieżce dydaktycznej, właściwe wyniki/raporty i prezentacja layoutu/animacji dla zakresu przykładu. Najpierw przegląd integracji, potem ograniczone poprawki; nie deklarować gotowości po samym imporcie pliku. |

Najbliższa kolejność: **7.6a → 7.12.A1 → 7.12.B**, a przed odbiorem fizycznych przykładów 7.12.C/D także **7.12.A2**. Przy zmianach zapisu/identyfikacji wykonać backup i określić kompatybilność. W A nie naprawiano funkcji produkcyjnych. Plan 7.6 przywrócono do „w trakcie” na podstawie L2–L6; stary odbiór zachowano jako historyczny.

## Weryfikacja wykonana

1. `node scripts/audit_demo_portability_7_12a.mjs`: PASS obserwacji. Syntetyczna pojedyncza operacja, 60 s, 1 BOM; to próba formatów, nie nowy gotowy przykład. Sprawdzone: XLSX procesu/BOM, archiwa 4/5, lokalny zapis/odczyt szkicu i wariantów 6, pełne odtworzenie do pustej pamięci oraz reprodukcje L1–L6. Manifest źródeł SHA-256: `outputs/qa/7_12a/capabilities.json`. Próby nie modyfikują rzeczywistego localStorage użytkownika.
2. `node scripts/test.mjs --test-name-pattern="przenośne archiwum|2\.1d:|4\.5:|7\.6:"`: **7/7 PASS**, istniejące testy archiwów, zapisu szkicu/bibliotek i odzyskiwania. Nie zastępują reprodukcji luk — poprzednie testy nie zawierały tych warunków. Nie wykonywano pełnej regresji; brak zmian kodu aplikacji, zakres celowany.
3. `npm.cmd run build`: **PASS**, 1970 modułów. Wykonany dla świeżego artefaktu użytego w próbie UI. Pozostaje znane ostrzeżenie paczek >500 kB.
4. `node tests/qa/verify_7_12a.mjs`: **PASS audytu UI w osobnym profilu Edge**, 0 wyjątków JS. Wczytano rzeczywiste pliki prób 4/5 przez UI, utworzono szkic z podglądu migracji, pobrano jego JSON, główny import odrzucił ten plik bez zmiany zapisów. Przywrócono poprawną kopię przez modal i po przeładowaniu odczytano identyczny szkic oraz bibliotekę. Odtworzono aktywny przycisk przy niezgodnej sumie kontrolnej (nie wykonywano wadliwego przywrócenia w UI). Zrzuty i raport: `outputs/qa/7_12a_ui`.
5. Wizualnie sprawdzono zrzut panelu szkicu i modala z niezgodną sumą. Nie wykonywano fizycznej symulacji kompletnego procesu, oceny trzech projektów, integracji 6 z główną animacją, testu na danych klienta lub Vercel.

Nowe pliki w `przyklady` są instrukcją przygotowania pakietów, nie zmianą obsługi programu. Podręcznik aplikacji MD/HTML/PDF nie wymaga jeszcze regeneracji; po A1 i dalszych wdrożeniach aktualizacja jest obowiązkowa. Historia Eko, źródła XLSX i zastana lokalna zmiana `outputs/data_audit/eko_7_1.json` zachowane.
