# Plan wdrożenia nowego UI/UX Layout Studio Pro 3D

Data: 2026-10-23. Powiązanie: **PLAN_ROZWOJU.md — 7.13.X oraz 7.13.U**. Status: **UI1 w trakcie — wdrożony UI1a, kompaktowa rama i nawigacja**; UI2 w trakcie (UI2a/UI2b odebrane w opisanym zakresie, odbiór całości przed nami); UI3–UI4 nierozpoczęte. Raport `docs/weryfikacja/WERYFIKACJA_UI_UX_UI1.md`. To uszczegółowienie bieżącego wydania, bez dodawania głównego ID do licznika i bez zmiany historycznego odbioru Etapu 5.

## 1. Materiały i wynik przeglądu

Przeczytano specyfikację `Stitch/Projekt_graficzny/layout_studio_pro_3d_architektura_ux_ui_specyfikacja_techniczna_design.md`, system wizualny `precision_industrial_cad/DESIGN.md`, kod HTML czterech ekranów oraz obejrzano wszystkie cztery `screen.png`:

| Podkatalog w `Stitch/Projekt_graficzny` | Ekran i obraz | Zastosowanie |
| --- | --- | --- |
| `popyt_takt_i_bom_layout_studio_pro_3d` | Popyt/BOM, 1600×1383 | Parametry i rezultaty obok tabeli materiałów; filtry i krótkie podsumowanie. |
| `proces_przep_yw_i_stanowiska_v5_layout_studio_pro_3d` | Proces/stanowiska, 1600×1457 | Lista operacji, powiązana selekcja, inspektor i wykres obciążenia. Główny wzorzec stylistyczny zgodnie ze specyfikacją. |
| `hala_i_uk_ad_3d_layout_studio_pro_3d` | Hala/3D, 1600×1280 | Centralna scena, narzędzia kontekstowe, biblioteka, właściwości i odtwarzanie. |
| `raport_ko_cowy_i_eksport_layout_studio_pro_3d` | Raport/eksport, 1600×1397 | Podsumowanie wyników i uporządkowane formaty eksportu; bez kopiowania przykładowych certyfikatów. |

SHA-256 źródeł przy przeglądzie: specyfikacja `7350333910a57be6dc9ec3f6397b4f65946f2eed210b4b1b4ab5f123fe425675`; `DESIGN.md` `a6ee5078e82867bfb7bc32e446636a2082fe4b2d285d959d85fca61d9c34ca97`. Materiały źródłowe pozostawiono bez zmian. Są lokalnymi materiałami użytkownika; przed implementacją należy zapewnić wersjonowany, przenośny zestaw referencji i ustalić pochodzenie używanych assetów. Nie zakładać, że same odnośniki do lokalnych plików udostępniają makiety w GitHub.

Przegląd kodu ograniczono do struktury `src/App.tsx`, `studio.css`, `StationWorkspace.tsx`, `DomainDraftPanel.tsx`, istniejących edytorów/widoków i zależności projektu. Potwierdzono rozbudowany, zawijany nagłówek, 10 pozycji nawigacji i wiele osobnych edytorów/wyników w obszarze stanowisk. To przegląd architektury i referencji, **nie pełny nowy audyt interakcji każdego ekranu**. Pomiar i screenshoty obecnego UI pozostają częścią X1/UI1.

**Kierunek:** wykorzystać ciemne powierzchnie, kontrastowe stany, kompaktowe narzędzia, hierarchię informacji i powiązany inspektor. Zmniejszyć liczbę decyzji widocznych równocześnie, nie tylko rozmiar tekstu. Wysoka gęstość danych ma pomagać doświadczonemu inżynierowi; podstawowa ścieżka musi być zrozumiała bez znajomości wersji schematów.

## 2. Rozstrzygnięcia i korekty wobec makiet

| Temat | Decyzja wdrożeniowa |
| --- | --- |
| Liczba ekranów | Specyfikacja mówi o pięciu hubach, ale wymienia 0–5: **Pulpit + pięć obszarów roboczych = sześć pozycji**. Mockup hali pokazuje inną, siedmioczęściową nawigację. Wdrożyć jeden układ sześciu pozycji opisany poniżej. |
| Podwójna nawigacja | Nie powielać wszystkich modułów w górnym menu i lewym pasku ikon. Górny pasek służy do przechodzenia między obszarami; lewy pasek wewnątrz edytora zawiera narzędzia danego widoku. |
| Panele boczne | Zachować decyzję użytkownika B: **większy rzut i panele na żądanie**. Stała biblioteka i inspektor z mockupu nie są domyślnym układem. Na szerokim ekranie użytkownik może przypiąć panel; dostępne pozostaje „Skup się na widoku” zamykające panele. |
| Typografia | Inter dla UI, JetBrains Mono dla odczytów technicznych oraz cyfry tabelaryczne. W kilku PNG tekst wygląda szeryfowo; nie kopiować tego jako wzorca. Źródłem typografii jest specyfikacja, z działającymi systemowymi fallbackami. Nie uzależniać czytelności od Google Fonts. |
| Tokeny | Dokumenty zawierają kilka odcieni `primary` i powierzchni. Ustalić jedną warstwę tokenów semantycznych: tło `#051424`, panele `#0d1c2d`, elementy wewnętrzne `#132338`, akcent `#3b82f6`, sukces `#10b981`, ostrzeżenie `#f59e0b`, błąd `#ef4444`. Pozostałe odcienie są wariantami, nie niezależnymi systemami. Ostateczny dobór po kontroli czytelności. |
| Stałe liczby/statusy | 60 FPS, 48 s, 91,7%, WIP, media, gabaryty, operatorzy i 32 strony raportu są treścią demonstracyjną. UI bierze wartości wyłącznie z aktywnego modelu/wyniku; brak danych pokazuje jako brak, nie zero lub sukces. |
| Modele i API z design.md | Interfejsy `OperationStep`, `TaktConfiguration` itp. są opisem potrzeb prezentacji, **nie zamiennikiem obecnego modelu danych**. Nie przepisywać na nie zapisu ani silników. Nie gubić źródeł czasów, profili obecności, kopii, kompetencji i reguł buforów. |
| Stan aplikacji | Pozostać przy React/TypeScript/Vite i istniejących mechanizmach historii/zapisu. Zustand jest sugestią z makiety, nie wymaganiem; nowy store tylko po odrębnym uzasadnieniu. Nie zmieniać frameworka przy przebudowie UI. |
| Gotowy HTML | Używać jako referencji układu, nie wklejać całych stron. Zewnętrzny Tailwind CDN, fonty ikon, obrazki i demonstracyjne skrypty zastąpić komponentami repozytorium. Istniejący `lucide-react` służy do ikon. Style izolować; nie dokładać drugiego globalnego resetu. |
| Dane i logika | Wyświetlanie ilości BOM na zmianę nie konfiguruje dostaw/zużycia ani magazynowych zasobów. Nie tworzyć pomiarów, norm, dostępności, dróg operatora, automatyzacji lub reguł Chaku-Chaku na podstawie wyglądu. |

## 3. Docelowa nawigacja i dostęp do funkcji

| Obszar | Widok domyślny | Podwidoki / szczegóły na żądanie | Obecne źródła implementacji |
| --- | --- | --- | --- |
| **Pulpit** | Aktywny projekt, wariant, stan zapisu, ostatnia praca, następny zalecany krok | Nowy/Otwórz/Pobierz przykłady/Tutorial; warianty i odzyskiwanie | Pulpit w `App.tsx`, biblioteki wariantów, `ProjectPackageModal`, `WorkspaceBackupModal`; pusty start 7.13 |
| **Popyt i materiały** | Wynik taktu + parametry popytu i tabela BOM | Kalendarz popytu, OEE i założenia, import/eksport BOM, filtry; przy mniejszej szerokości zakładki Parametry/Materiały | `DemandWizardView`, `BOMManagerView`, `DataTable`, istniejące kalkulatory/importery; bez drugiej kalkulacji w UI |
| **Proces i stanowiska** | Lista/diagram procesu i inspektor wybranej operacji lub stanowiska | Operacje / Przepływ / Stanowiska / Zasoby; czasy, obsada, kompetencje, kalendarze, produkt, wyposażenie, role korpusu i równoległość | `ProcessFlow`, `StationWorkspace`, `DomainDraftPanel` i odpowiednie `Domain*Editor`; powiązanie selekcji przez ID |
| **Bilansowanie** | Yamazumi, bieżący takt/cel, przydziały i wąskie gardła | Metoda RPW/LCR/ręczna, blokady, macierz obsady, propozycje usprawnień, porównanie wariantów i jawne koszty | `BalancingBoard`, `ResourceEditor`, `DomainBalancingPanel`, `DomainVariantComparisonPanel`, istniejące propozycje i raporty porównań |
| **Hala i symulacja** | Duży rzut 2D albo scena 3D z jednym paskiem odtwarzania | Biblioteka / Drzewo / Właściwości / Logistyka / Wyniki; trasy, transport, podzespoły, bufory, zaopatrzenie; Gantt i analizy w dolnym panelu | `LayoutEditor`, `Scene`, `Simulation`, `DomainModelOverview`, `DomainSchedulePlayback`, `DomainWorkerSchedulePanel`, routing/transport/subassembly/buffers/supply, `ScheduleGanttChart`, `ThroughputExplanationPanel` |
| **Raporty i eksport** | Raport aktualnego projektu/wariantu z pochodzeniem wyniku i ograniczeniami | Dokument A4 / dane / dostępne eksporty; odzyskiwanie przez globalne menu projektu, nie mylone z eksportem pojedynczego projektu | `EngineeringReportView`, raporty Markdown i istniejące eksportery; A2 określa granice zgodności źródeł |

Funkcje przezbrojeń, Monte Carlo i dekompozycji OEE pozostają osiągalne z zaawansowanych ustawień/analiz symulacji, nie jako dodatkowe główne ekrany. Nie usuwać edytorów, importów i eksportów tylko dlatego, że nie występują na obrazach. UI1 musi sporządzić listę wszystkich obecnych akcji i ich docelowego miejsca.

„Proces i stanowiska” nie oznacza fizycznie jednego ciągu. Diagram zachowuje gałęzie, przedmontaże, zależności i jawnie zatwierdzoną równoległość. Liniowa lista OP10–OP60 z makiety jest tylko jednym przypadkiem; projekt demonstracyjny z gałęziami pozostaje wymagany w 7.12.C.

## 4. Wspólny układ i zachowanie

- **Nagłówek desktopowy:** cel 48–56 px przy 1440×900; nazwa projektu skrócona wizualnie, pełna w podpowiedzi, wybór projektu/wariantu, stan zapisu, Cofnij/Ponów/Zapisz oraz menu Projekt/Eksport/Pomoc. Zmiana nazwy w szczegółach, nie szerokie pole stale w nagłówku. Jednostki dostępne w ustawieniach kontekstu; jednostka przy każdej wartości technicznej.
- **Nawigacja:** jeden zwarty wiersz lub menu obszarów na mniejszym ekranie. Bez trzech jednoczesnych pasków: modułów, etapów i wersji schematu. Checkmark oznacza konkretny sprawdzony stan danych, nie dekorację ani certyfikat.
- **CAD:** pasek narzędzi 48–64 px, centralny viewport i opcjonalny inspektor 280–320 px. Biblioteka/właściwości otwierane jawnie, na małych ekranach jeden panel naraz. Narzędzia nie nakładają się na aktywne kontrolki sceny i nie zasłaniają środka hali. Tryb skupienia dostępny jednym przyciskiem.
- **Formularze i tabele:** podstawowe pola najpierw, reszta w nazwanych sekcjach. Walidacja przy polu i podsumowanie prowadzące do błędu. Długie tabele mają własne przewijanie, wyszukiwanie, filtry i zachowany wybór w aktywnym projekcie; żadnego obcinania treści bez możliwości odczytu.
- **Inspektor:** otwierany przez wybór w tabeli, diagramie lub scenie; pokazuje typ wybranego elementu. Zmiana wyboru nie może porzucać niezapisanej edycji bez jawnej obsługi. Tożsamość jest oparta na stabilnym ID, nie numerze wiersza.
- **Symulacja:** jeden zestaw poleceń Start/Pauza/Reset, czas/suwak i prędkość dla aktywnego odtwarzania. Obliczanie, gotowy wynik, odtwarzanie, anulowanie i błąd to różne stany. Gantt, szczegółowe tabele, SHA oraz diagnostyka w panelach na żądanie; istotne założenie JIT, źródło i nieaktualność wyniku nadal widoczne. Polecenia są zdarzeniami jednorazowymi; zachować regresję Start z 6.6-fix.
- **Ikony:** znane działania mogą być ikonami z dostępną nazwą i podpowiedzią na hover oraz focus. `title` samo nie zastępuje obsługi klawiatury i czytnika. Nieoczywiste i ryzykowne operacje mają krótką etykietę w menu. Minimum celu: 32×32 px desktop, 44×44 px dotyk; tekst danych zwykle 13–14 px, 10–11 px wyłącznie pomocnicze metadane.
- **Pomoc i ochrona danych:** długie instrukcje do rozwijanej pomocy; błędu migracji lub blokady zapisu nie chować. Komunikat ma wskazać nazwę projektu, rodzaj zapisu i kolejno „Pobierz kopię zabezpieczającą” → „Dostosuj zapis do aktualnej wersji”. „Schemat 4/5/6” pozostaje w szczegółach technicznych. Nie sugerować edycji XLSX, gdy problem dotyczy pamięci przeglądarki.
- **Wiele ekranów:** zachować osobne okna CAD/przepływu/symulacji i bezpieczny powrót do głównego okna. Panel/menu we właściwym dokumencie, klawiatura i odtwarzanie nie mogą działać podwójnie po przeniesieniu.
- **Responsywność:** brak kopiowania stałych szerokości 1600 px; na 1280×720 zwijać narzędzia, na 390×844 menu i pojedynczy panel/arkusz. Na telefonie priorytet przeglądu danych i inspekcji; edycja CAD dostępna w rzeczywiście obsługiwanym zakresie, bez obietnicy wygody desktopowego CAD na telefonie.

## 5. Zgodność modeli i funkcje poza zakresem redesignu

Obecne dane główne, warsztat stanowisk i model domenowy mają odrębne źródła oraz historię. Sam wspólny nagłówek nie może ich scalić pozornie. Warstwa kontekstu widoku powinna przekazywać projekt/wariant, źródło dokumentu, stan zapisu, aktualność wyniku i faktyczne możliwości edycji. Jest odczytem istniejącego stanu, nie kolejną kopią technologii ani nową bazą danych.

Do zakończenia integracji A2 widok głównego projektu i wariantu domenowego musi być rozróżniony zrozumiałą nazwą źródła; wersję formatu można schować do diagnostyki. Gdy dla wybranego modelu dostępny jest tylko odczyt 3D lub raport Markdown, pokazać tę możliwość wprost. Nie udostępniać edycji innego modelu jako edycji aktywnego wariantu i nie pokazywać raportu A4 innego źródła. Pełny wspólny edytor/raport wymaga osobnego odbioru danych; redesign nie zamyka A2 automatycznie.

| Element widoczny w referencji | Zakres bieżącego wdrożenia UI |
| --- | --- |
| Import STEP / GLB, model stacji CAD | STEP pozostaje planem 8.4; pełna konfiguracja wyposażenia 8.3. Udostępnić wyłącznie istniejące i odebrane formaty. Import STEP nie oznacza eksportu STEP — eksport wymaga osobnego zakresu. |
| DWG, AML/XML, PLC, MTM/UAS, edycja SOP | Nie należą automatycznie do redesignu; nie tworzyć pozornych przycisków pobierania. Nowe funkcje wymagają osobnego planu. |
| EAWS, BHP, kurtyny PL e, ISO, CE, podpis audytora | Bez udokumentowanego modelu/metody i rzeczywistych danych nie wyświetlać ocen, deklaracji zgodności, „certyfikowany” ani nazwisk/podpisów. Wynik kontroli geometrycznej nie jest certyfikatem bezpieczeństwa. |
| ERP LIVE, AGV/AMR, 60 FPS, gotowość CAD | Nie deklarować integracji ERP ani floty magazynowej. FPS tylko jako rzeczywiście zmierzona diagnostyka; nie stały badge. Dostępność WebGL sprawdzać, nie obiecywać stałej wydajności. |
| „Zoptymalizuj AI”, Chaku-Chaku | Zachować rzeczywistą metodę i ograniczenia istniejącego bilansowania; nie zmieniać heurystyk w gwarantowane optimum lub algorytm AI przez nazwę przycisku. Nowe reguły procesu poza tym planem. |
| „Gotowa do wdrożenia”, komplet walidacji | Raport ma status danych, założeń i faktycznie wykonanych kontroli. Puste/nieznane pole nie może dawać zielonego wyniku. |

## 6. Cztery pakiety wdrożenia

Przed każdym pakietem aktualizacja statusu w PLAN_ROZWOJU.md. Przed zmianą struktury modułów/kontekstów/historii wykonać backup z osobnym sprawdzeniem skopiowanych SHA-256. Nie wprowadzać nowego schematu zapisu w pakiecie graficznym. Gdy okaże się konieczny, wydzielić kontrakt/migrację z ochroną oryginału i odbiorem przed dalszą implementacją.

### UI1 — ujednolicenie projektu, wspólne kontrolki i nagłówek (X1 + początek X2)

**Najbliższy zalecany krok.** Sporządzić rejestr obecnych akcji i bazowe zrzuty/pomiary; uzupełnić brakujące makiety Pulpitu i Bilansowania oraz stany pusty/brak danych/błąd/migracja. Przygotować przeglądalną propozycję sześciu obszarów, menu i inspektora na trzech szerokościach. Sprawdzić style, czytelność i mapowanie każdej akcji. Ten konkretny projekt jest punktem przeglądu przed przebudową wszystkich ekranów.

Następnie wprowadzić lokalne tokeny oraz wspólne `IconButton`, `Menu`, `Inspector`, `CollapsibleSection`, `Status`, pola z jednostką i kontener tabel. Wydzielić z `App.tsx` wspólną ramę aplikacji (nagłówek, wybór projektu/wariantu, nawigacja), przenosząc istniejące działania bez zmiany ich skutków. Można rozpocząć tę pracę przed zakończeniem A2; nowe etykiety nie mogą ukrywać odrębności dokumentów. Docelowo wykorzystać istniejące komponenty, nie budować drugiej aplikacji obok.

**Odbiór UI1:** wszystkie dawne działania mają nowe miejsce; Zapisz/Eksport/Kopie, Cofnij/Ponów, skróty i blokady migracji działają jak wcześniej. Na 1440×900 nagłówek nie zawija się do kilku rzędów, a brak miejsca otwiera menu zamiast przycinać przyciski. Klawiatura, Escape i powrót focusu działają. Bez utraty danych/projektu po zmianie obszaru. Zakres X1 pozostaje otwarty do przeglądu nowych propozycji i rzeczywistego baseline'u — niniejszy dokument nie jest takim odbiorem.

### UI2 — duży obszar Hala i symulacja (X2, priorytet użytkowy)

Stan 2026-10-24: UI2a wdrożony — kompaktowe narzędzia i skupienie 2D. UI2b: 3D/sterowanie odebrane 2026-10-24 w zakresie ramy, parametrów i odtwarzania (14/14 celowanych, build, UI). UI2c odebrany 2026-10-24: zwykły CAD 2D spełnia 70%/60% przy 1280×720 i 1440×900; edycja formularzy 2D/3D, historia, zapis/odświeżenie i przesunięcie klawiaturą PASS. Pozostały przeciąganie wskaźnikiem, zawartość osobnych okien i wymuszony brak WebGL. Pełna regresja bieżącego workspace 417/417 PASS; całe UI2 nadal w trakcie. Raport `docs/weryfikacja/WERYFIKACJA_UI_UX_UI2.md`.

Przebudować kontener `LayoutEditor`/`Scene`: pasek narzędzi, tryb 2D/3D, biblioteka/drzewo/właściwości na żądanie, tryb skupienia i dolny panel wyników. Połączyć prezentację sterowania, zachowując jedną sesję odtwarzania dla wybranego źródła; nie uruchamiać drugiego workera przez otwarcie inspektora. Wykorzystać istniejącą logikę Cofnij/Ponów, selekcji, blokad, jednostek, siatki i manipulatorów. Nie przepisywać geometrii ani silnika Three.js dla samego wyglądu.

Powiązanie historii korpusów/wózków wymaga A2b2b; zmiana wyglądu sceny może być wykonywana wcześniej z obecną sprawdzoną symulacją, lecz fizyczny odbiór nowego modelu pozostaje zależnością A2. Nie pozorować edytowalnego 6 przez formularz projektu 4. Konfiguracja tras, zapasów i buforów trafia do panelu Logistyka z zachowaniem istniejących reguł.

**Odbiór UI2:** po zamknięciu paneli viewport na desktopie zajmuje minimum **70% szerokości i 60% wysokości okna aplikacji** przy 1440×900 i 1280×720; mierzyć rzeczywisty prostokąt widoku, nie otaczającą kartę. Selekcja/edycja/gesty, Cofnij/Ponów, kamera, warstwy, oba tryby i osobne okno działają. Start/Pauza/Reset/suwak/1× i 5000× pozostawiają ten sam wynik; czas rośnie przez wiele klatek, pauza jest stabilna, powrót do obszaru nie powtarza polecenia. Brak WebGL daje działający odczyt danych i komunikat.

### UI3 — ekrany danych, procesu i bilansowania (pozostałe X2 + U)

Wdrożyć układy Popyt i materiały, Proces i stanowiska oraz Bilansowanie. Korzystać z istniejących formularzy/komend i jednego źródła wyliczeń. Lista/diagram/inspektor/wykres współdzielą selekcję. Przenieść zaawansowane edytory ze stale rozciągniętej strony do konkretnych podwidoków. Filtry i zwijanie nie mogą kasować zmian formularza lub tworzyć nowej historii technologii.

**Odbiór UI3:** import XLSX/CSV/projektu, błędny import i anulowanie, zależności i gałęzie, edycja czasów/obsady/kalendarzy/kompetencji, blokady i dopuszczone kopie, bilans ręczny/heurystyki, porównanie wariantów. Te same dane przed/po zmianie UI dają identyczne wyniki i jawne braki. Scenariusze obejmują projekt podstawowy 7.12.B i przypadek gałęzi 7.12.C; zanim C zostanie odebrane można użyć istniejących syntetycznych fixture'ów do regresji, ale nie udawać finalnego odbioru C. Chronić oryginały, ID i niezależne źródła 4/5/6.

### UI4 — pulpit, raporty i pełny odbiór (dokończenie 7.13 + X3)

Wdrożyć Pulpit i Raporty i eksport w tym samym stylu, z aktualnością wyników, dostępnymi formatami i krótką informacją o ograniczeniach. Nowy profil startuje pusto zgodnie z 7.13; istniejący odczytuje zapis użytkownika. Przykłady ładowane z plików po odbiorze 7.12.D, bez usuwania fixture'ów i historii. Do tego czasu nie usuwać jedynej działającej ścieżki testów bez zastępstwa. Tutorial 7.14 korzysta z docelowych kontrolek i nie wymaga przebudowy po własnym wdrożeniu.

**Odbiór UI4:** pełna ścieżka Nowy/Otwórz → dane → proces → bilans → CAD/symulacja → wariant/porównanie → raport → zapis/ponowne otwarcie. Wszystkie formaty i ich aktualność potwierdzone, raport dotyczy tego samego źródła. Czysty profil, starszy zapis i migracja, uszkodzony import, anulowanie oraz odzyskanie bez utraty pracy. Nie chować błędów ani nie zmieniać deklaracji inżynierskich pod pozorem stylizacji. Zaktualizować podręcznik MD/HTML/PDF i screenshoty oraz punkty zaczepienia tutorialu; odebrać z początkującym w 7.9.

## 7. Strategia weryfikacji i bezpieczne wdrażanie

1. **Przed implementacją:** zachować zrzuty 1440×900, 1280×720, 390×844 i listę akcji. Zapisać bazowe wyniki oraz eksporty tych samych projektów. Uzupełnić makiety brakujących ekranów i stanów. Referencja nie stanowi dowodu, że aplikacja dziś obsługuje każdą widoczną funkcję.
2. **Każdy pakiet:** najmniejsze odpowiednie testy, build/typecheck na końcu spójnej zmiany oraz rzeczywiste UI dla zmienionych akcji. Nie opierać odbioru na samym screenshotcie lub obecności przycisku. Używać semantycznych selektorów; zmiana etykiety nie może wyłączyć istotnego sprawdzenia.
3. **Dane i historia:** w zmienionych ścieżkach Cofnij/Ponów, zapis/reload, eksport/import oraz czytelność starych danych. Układ i otwarte panele to stan UI; nie dopisywać ich bez potrzeby do dokumentu technologicznego. Jeżeli zapisuje się preferencje UI, osobny wersjonowany klucz z bezpiecznym fallbackiem i bez wpływu na checksum projektu.
4. **Dostępność i małe ekrany:** dostępne nazwy, widoczny focus, naturalna kolejność Tab, Escape/powrót focusu, brak pułapki klawiaturowej i polegania wyłącznie na kolorze. Powiększenie 200%; brak poziomego przewijania całej strony (wyjątek: lokalny scroll tabeli/diagramu/sceny). Kontrast zwykłego tekstu jako cel co najmniej 4,5:1. Dotykowe cele 44×44 px. Sprawdzić m.in. otwarte menu eksportu, inspektor, walidację i komunikat migracji.
5. **Wydajność:** nie utrzymywać nieużywanych kontekstów WebGL i workerów; otwarcie menu nie restartuje obliczeń ani nie zeruje czasu. Lazy loading ciężkich widoków, zwalnianie zasobów po zamknięciu; test powtarzanego wejścia/wyjścia. Dane i kamera nie mogą wzajemnie powodować utraty tożsamości obiektów.
6. **Regresja całości:** zgodnie z polityką repo po trzech pakietach lub wcześniej przy istotnym punkcie integracyjnym. Osobno odnotować testy automatyczne, interaktywne UI, ograniczenia oraz Vercel. Stan deploya success nie zastępuje testu strony. Każdy zweryfikowany zakres commit/push, postęp przez `node scripts/plan_progress.mjs`; bez utożsamiania podpakietów z ukończeniem całego 7.13.

## 8. Kolejność i definicja ukończenia

**Teraz:** ten plan i analiza referencji. **Następna praca UI:** UI1 — bazowe pomiary + przeglądalny projekt wspólnego nagłówka/nawigacji i brakujących ekranów; następnie jego wdrożenie. UI2 przynosi największy zysk obszaru roboczego. UI3 porządkuje dane i proces. UI4 zamyka spójność, pusty start, raporty, dokumentację i odbiór.

A2b2b oraz przykłady C/D pozostają otwartymi zadaniami technologicznymi. Nie trzeba czekać z UI1 na ich zakończenie, ale nie można odebrać pełnej fizycznej symulacji ani gotowego zestawu przykładów bez tych punktów. W razie konfliktu priorytetów aktualizować bieżący pakiet w PLAN_ROZWOJU.md, nie wykonywać ukrytych równoległych przebudów.

Redesign jest ukończony dopiero, gdy sześć obszarów udostępnia rzeczywiste dotychczasowe możliwości, widoki mają wspólne zasady i język, sceny odzyskują wymagany obszar, podstawowa ścieżka nie wymaga znajomości schematów, zapis i wyniki są zachowane oraz instrukcja/tutorial odzwierciedlają nowy interfejs. Aktualizacja 2026-10-23: **odebrano UI1a — ramę/menu/nawigację; cały UI1 i redesign pozostają w trakcie**, nie odebrano docelowego wnętrza wszystkich obszarów. 402/402 pełnej regresji sekwencyjnej, build i interaktywny UI PASS; instrukcja 59 stron/48 obrazów. Szczegóły i ograniczenia w raporcie UI1.
