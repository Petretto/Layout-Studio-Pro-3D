# 6.4 — wymienny wygląd niezależny od technologii

Odbiór 2026-10-18. Wdrożono opcjonalny wybór jednego z trzech wbudowanych konceptów 6.3b dla zapisanego wyposażenia oraz powrót do generatora według typu. Kontrakt i granice: `MODEL_WYGLADU_WYPOSAZENIA_6_4.md`.

## Zakres

`LayoutObject.visualModelId?` ma osobną rolę od `type`, geometrii, `workstationId` i danych procesu/zasobów. Akcja zmienia tylko to pole, pozostawiając gabaryty, ID, przypisania i tryb layoutu. Automatyczne generowanie przenosi wybór na te same ID bez kopiowania starej geometrii. Wbudowane modele są kompilowane z własnych GLB, renderowane synchronicznie przez wspólny generator; oba istniejące widoki 3D go używają. Instancje mają własne geometrie i materiały, a szablony pozostają niezależne od zwalniania scen.

Wygląd mieści się w zapisanym obrysie z jednolitą skalą i zachowaniem proporcji/podstawy. Nie zmienia fizycznej wysokości na podstawie nadbudowy modelu ani nie zmniejsza obrysu do wielkości siatki. Może być wizualnie mniejszy niż obrys. Strefy, porty, kolizje i znaczniki operacji nadal korzystają z dotychczasowych danych. Nie jest to konfigurator części 8.3 ani import CAD 8.4.

UI wyboru dostępne jest w aktywnym edytorze 2D i 3D projektu 4. Sam wybór jest podglądem pola; osobny przycisk zatwierdza akcję historii. Przycisk blokuje zatwierdzenie przy niezapisanych zmianach obiektu, chroniąc formularz. Dotychczasowy podgląd v5 pozostaje tylko do odczytu; parsery 5/6 i wspólny renderer obsługują metadane, ale nie dodano edytora wyglądu do paneli szkicu 6.

## Zapis, backup i kompatybilność

Backup `backup/v0.4.0_przed_6_4_20261018`: **384 pliki, SHA256 PASS**. Odtworzenie: zachować bieżące źródła/dane, przywrócić potrzebne pliki zgodnie z manifestem i odbudować aplikację; nie zastępować zapisów użytkownika bez zachowania oryginału.

Opcjonalne pole, bez zmiany numerów schematów 4/5/6. Stare projekty bez pola działają dotychczasowo. Parser odrzuca nieznane ID modelu i nie pobiera zewnętrznych URL. Sprawdzono odczyt projektu 4 i 5, migrację/odczyt 6 i zachowanie pola; mechanizm przechowania źródła nie został zmieniony. Nie przełączono zapisu na inny model domenowy.

## Wykonane sprawdzenia

- `node scripts/generate_concept_render_assets.mjs`: 3 wbudowane assety odczytane z rzeczywistych GLB 6.3b i skompilowane bez zewnętrznych zasobów.
- `node scripts/test.mjs '--test-name-pattern=6.4:|6.2:'`: **11/11 PASS**. Dwa nowe testy core: niezmienność danych i auto, odczyt/metadane, domyślny renderer i odmowa obcego ID, zachowanie proporcji/obrysu/podstawy oraz niezależne zasoby instancji. Dwa nowe testy network: identyczny pełny wynik symulacji 4/5 oraz pełny wynik harmonogramu 6 (w tym rezerwacje i stan korpusu), brak mutacji źródła, odczyt/migracja i odmowa nieznanego modelu. Siedem istniejących testów generatorów/nakładek 6.2 jako regresja wspólnego renderera.
- Finalny `npm.cmd run build`: **TypeScript/Vite PASS**, 153 moduły. Pozostało ostrzeżenie dużych chunków; pakiet sceny 1156,97 kB / 197,40 kB gzip (około 62 kB gzip więcej względem 6.2 z powodu 3 wbudowanych modeli). Nie deklarujemy odbioru dużej sceny z 6.7. Początkowy błąd typu stanu pola wyboru poprawiono przed końcowym buildem.
- `node tests/qa/verify_6_4.mjs`: **Edge CDP PASS** na finalnym buildzie. Podgląd pola bez zapisu, blokada przy niezapisanych wymiarach, zatwierdzenie, identyczne obrysy 2D i dane procesu, zachowany tryb auto, Cofnij/Ponów, wybór trzech modeli w rzeczywistym WebGL, wspólny wybór 2D/3D, zapis/ponowne otwarcie i powrót do generatora. Kontrolki widoczne i bez poziomego przepełnienia w 1440/600 px, brak wyjątków JS. Wizualny odbiór dwóch modeli w rzeczywistej scenie oraz kontrolek desktop/mobile PASS. Dane syntetyczne.
- Instrukcja Markdown + HTML/PDF oraz README modeli zaktualizowane. Generacja HTML i Edge PDF PASS: **36 stron, 34 obrazy**. Kontrola Python (`scripts/verify_manual.py outputs/qa/manual_6_4`) PASS: komplet obrazów/rozdziałów, brak pustych stron i tekstu poza stroną. Odbiór wizualny dodanej sekcji na stronach 34–36 PASS. Raport/kontaktówka w `outputs/qa/manual_6_4`.
- Bez pełnej regresji: po pełnym 6.2 (339/339 według raportu) 6.3a/b były narzędziem/assetami poza główną aplikacją; 6.4 jest pierwszym głównym pakietem implementacyjnym od tamtego przebiegu. Zakres rendererów i parserów 4/5/6 pokryto testami celowanymi oraz rzeczywistym UI.

6.4 wdrożone w opisanym zakresie. 6.3 dla charakterystycznych maszyn/Eko nadal w trakcie. Następny punkt bieżącego planu: 6.5. GitHub push nie jest weryfikacją wdrożenia Vercel; Vercel nie zweryfikowano.
