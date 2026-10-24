# 7.13.X/UI2a — narzędzia hali 2D i tryb skupienia

## Aktualizacja UI2c — 2026-10-24

**UI2c odebrany w zakresie poniższych poprawek; całe UI2 nadal w trakcie.** Zamknięty opis założeń znajduje się w jednym wierszu z tytułem na desktopie, otwarty opis zajmuje pełny wiersz; na telefonie oznaczenia pozostają w osobnym wierszu. Rzut bez skupienia jest w całości widoczny: **1242,4×432 przy 1280×720** (góra 285,1, dół 717,1 px) i **1402,4×540 przy 1440×900**. Próg 70% szerokości / 60% wysokości PASS dla zamkniętych paneli/opisów. To zastępuje ograniczenie 55,1% z wcześniejszego UI2a. Mobilne skupienie: 368,8×574 przy 390×844, bez globalnego overflow.

Odbiór ujawnił pusty formularz 2D po powrocie z 3D przy zachowanym zaznaczeniu. Efekt historii/importu resetował formularz także po inicjalnym odczycie zaznaczenia. Teraz odczytuje istniejący zaznaczony obiekt z aktualnego projektu; niezapisane zmiany nie są ponownie nakładane na model. Usunięty obiekt/wielokrotne zaznaczenie nie tworzą formularza pojedynczego obiektu. Poprawiono też filtr kontrolek w zamkniętych sekcjach przy zawijaniu Tab w 2D, analogicznie do odebranego 3D. Kontener PopoutWindow otrzymał klasę `.studio`, aby skopiowane arkusze ze scoped selektorami obejmowały jego zawartość. Sam ten przegląd kodu nie zastępuje odbioru zewnętrznego okna.

Backup `backup/v0.4.0_przed_ui2c_20261024`: **565 plików**, niezależny odczyt SHA-256 skopiowanych bajtów PASS. Bez zmiany schematów, tożsamości, geometrii algorytmicznej ani reguł symulacji.

- Końcowy TypeScript/Vite build PASS, znane ostrzeżenie dużych chunków. Następnie **pełna okresowa regresja 417/417 PASS**, sekwencyjnie 108 core i 309 network, po trzech pakietach od UI1a. Logi w `outputs/qa/ui2c/`. Liczba network obejmuje również niezwiązane lokalne zmiany `tests/network.test.ts`; nie włączono ich ani zmian `przyklady/README.md` do commitu UI2c. Zapisano hashe źródeł testów przy sporządzaniu raportu; bazowy commit UI1a miał 402 testy. Nie zmieniano progów wydajności.
- Rzeczywisty UI produkcyjny localhost:5305 przez cua_repl: wybór SVG `TBL-WS-1`, zmiana X 12650→12750 i szerokości 1800→1810, zapis/Cofnij/Ponów, zapis lokalny i odświeżenie; wartości potwierdzone także w formularzu 3D. Testowe przyrosty są wyłącznie danymi tej próby na nowym lokalnym originie, nie pomiarami hali.
- Edycja formularza 3D: wysokość 850→860, Cofnij 850, Ponów 860. Przesunięcie klawiaturą przy siatce projektu daje X 13750, odczyt 2D zgodny. Po odświeżeniu odczyt X 13750, szerokość 1810, wysokość 860. Po końcowej poprawce powrót 3D→2D udostępnia formularz tego samego zaznaczonego obiektu bez ponownego klikania na SVG.
- Tab/Shift+Tab w skupieniu 2D zawijają między nagłówkiem założeń a ostatnią widoczną sekcją wyników, pomijając zamknięte formularze. Mobilny układ i pomiary desktop PASS. Jedna próba CUA zgłosiła timeout po wykonaniu Cofnij; stan pokazał już cofnięcie. Nie powtórzono kliknięcia w ciemno, kontynuowano od jawnego Ponów. Inny timeout ujawnił opisany pusty formularz; poprawiono i ponownie sprawdzono tę ścieżkę.
- Instrukcja MD/HTML/PDF z nowym zrzutem zwykłego widoku i opisem zachowania zaznaczenia; 61 stron, 50 ilustracji, 6 771 144 bajty PDF. Kontrola zgodności/renderu w `outputs/qa/manual_ui2c/`.

**Pozostały odbiór UI2:** rzeczywiste przeciąganie wskaźnikiem w 2D/3D, zawartość/sterowanie osobnych okien i wymuszony brak WebGL. Dostępne powierzchnie CUA to IAB i MCP Apps; brak zewnętrznej przeglądarki/native apps. IAB nie udostępnił utworzonego popout jako kontrolowanej karty, a dostępna powierzchnia nie oferuje wyłączenia WebGL. Nie omijano tych ograniczeń CDP lub uruchamianiem innego sterowania UI. Wcześniejsze przekazanie/powrót głównego widoku i istniejący catch błędu nie są dowodem tych prób. Lista do wykonania w obsługiwanej przeglądarce: `outputs/qa/ui2c/ODBIOR_ZEWNETRZNY.md`. Vercel niezweryfikowany. UI3 nie rozpoczęto w tym pakiecie.

Poniższe pomiary UI2a/UI2b są historyczne; aktualny stan 2D opisano powyżej.

## Aktualizacja UI2b — 2026-10-24

**UI2b wdrożony w zakresie ramy 3D i parametrów na żądanie. Całe UI2 nadal w trakcie.** Nowy `SimulationWorkspace` utrzymuje te same dzieci Scene/Simulation podczas przełączania skupienia. W App zastosowany w głównym 3D i w osobnym oknie. `Scene` ma dwie grupy narzędzi, ikony kamery, opis na żądanie z widocznymi oznaczeniami założeń. Pasek odtwarzania pod sceną pozostaje dostępny bez rozwijania parametrów. `Simulation compact` zwija formularz/wyniki, zachowując instancję i stan; postęp, błędy, anulowanie i stan aktualności CSV są poza sekcją. Pozostali odbiorcy Simulation mają domyślnie otwarte szczegóły. Bez zmian efektów obliczeń, kluczy wyniku, reguł animacji, schematów i historii.

Backup `backup/v0.4.0_przed_ui2b_20261024`: **563 pliki**, odczyt skopiowanych bajtów względem SHA256.txt PASS. Weryfikacja:

- **14/14 celowanych PASS**: core `--test-name-pattern="3\.10|6\.[5-7]"` 13/13 oraz network `--test-name-pattern="3\.9: scenariusz 5"` 1/1. Zakres: czas/prędkości, współrzędne i blokady, warstwy/ukrywanie, niezmienniki technologii, inspekcja, deterministyczna animacja, dopasowanie kamery, LOD/popout. Pełnej regresji nie powtarzano: drugi pakiet prezentacyjny od bazowej 402/402 w UI1a. Nie zmieniano progów ani testów domenowych.
- **Końcowy TypeScript/Vite build PASS**, istniejące ostrzeżenie dużych chunków. Odbiór produkcyjnego buildu na localhost:5304 przez cua_repl. Po wykryciu ucieczki Tab przez kontrolki zwiniętych details poprawiono filtr przodków, ponowny build i próba Shift+Tab/Tab PASS: obie granice zawijają focus w widocznym edytorze. Escape zamyka sekcję albo opuszcza skupienie. Otwarta jedna grupa narzędzi naraz.
- Start: 1,919 → 60,944 s; rozwinięcie parametrów nie zeruje czasu. Pauza 61,731 s stabilna po zwinięciu i wyjściu ze skupienia. 1×: 0,2253 → 4,4674 s. 5000×: **30/30 przy 4936 s**. CSV po odtwarzaniu identyczny bajt w bajt z bazowym: 2419 bajtów, SHA-256 `14dc11ebd58763bffcc77ef3b11edffbf73be9eb0da90bc02512329d7710976d`. Suwak 0,1 s zatrzymuje odtwarzanie; reset i ponowne wejście dają 0, nowy Start ponownie zwiększa czas (72,775 s w odczycie po powrocie). To odrębne próby, nie jeden ciąg czasu.
- UI: warstwa stanowisk OFF/ON, LOD OFF/ON, obrót manipulatora, widok z góry/dopasowanie, inspekcja/jej zamknięcie, mobilny panel i brak globalnego overflow PASS. Nie testowano ponownie fizycznych gestów przeciągania obiektów ani zapisu nowej geometrii 3D. Przeniesiono dostęp do istniejących komend, nie mechanizm transformacji.
- Popout: główny widok pokazuje stan przekazania, Przywróć odtwarza canvas. Zewnętrzne okno nie było dostępne w inwentarzu IAB, więc jego zawartości i sterowania **nie uznajemy za odebrane**. Nie obiecujemy zachowania czasu przy opuszczeniu zakładki/przeniesieniu — dotychczasowe warunkowe montowanie może rozpoczynać sesję ponownie. Skupienie i same disclosures zachowują instancję.
- Instrukcja MD/HTML/PDF: 61 stron, 50 ilustracji, 6 770 423 bajty; kontrola zgodności i renderu w `outputs/qa/manual_ui2b/`. Aktualne pomiary, zrzuty, bazowy CSV i raport w `outputs/qa/ui2b/`.

Końcowy rzeczywisty canvas: normalny 1440×900 **1401×540**, 1280×720 **1241×432** — cały widoczny, bez poziomego overflow. Skupienie odpowiednio **1401×733** i **1241×553**. Zmierzono canvas WebGL, nie kartę. Przy 1280×720 zwykły pasek pod sceną może wymagać przewinięcia. Pozostaje końcowy odbiór UI2: zwykły CAD 2D 1280×720 (55,1% widocznej wysokości), gesty/edycja i zapis geometrii, osobne okna w obsługiwanej przeglądarce oraz faktyczna próba braku WebGL. Nie deklarujemy PASS tej ostatniej na podstawie samego zachowania istniejącego catch/komunikatu. Fizyczna integracja A2b2b i UI3/UI4 są odrębne. Vercel niezweryfikowany.

Poniżej zachowano odbiór UI2a bez zmiany jego historii.

Odbiór ograniczonego pakietu: 2026-10-24. **UI2a wdrożony; całe UI2 nadal w trakcie.** UI2b obejmie 3D i wspólne sterowanie/odbiór symulacji. Nie zamyka to X1/X3, prototypów pozostałych ekranów ani fizycznej integracji A2b2b.

## Zmiana

`LayoutEditor.tsx` i `HallWorkspace.css`: zwarty pasek, ikony zoom/dopasowania/przesuwania, trzy grupy narzędzi na żądanie, jedna grupa lub istniejący drawer naraz. Grupy mają przycisk zamknięcia, Escape i powrót focusu. Ich zawartość pozostaje zamontowana. Tryb skupienia powiększa edytor bez nowej instancji CAD, trzyma Tab w widocznym obszarze i pozwala wrócić przyciskiem/Escape. Stan skupienia/narzędzi nie trafia do zapisu. Na telefonie pasek przewija się poziomo, narzędzia otwierają się u dołu okna. Zachowano widoczne oznaczenia geometrii koncepcyjnej i niepotwierdzonych wymiarów; opis na żądanie. Aktywny pomiar/kalibracja pozostają oznaczone także po schowaniu narzędzi.

Istniejące komendy, formularze i gesty CAD zachowano; bez zmian geometrii, tożsamości, schematów, algorytmów i historii projektu. Backup `backup/v0.4.0_przed_ui2a_20261024`: **562 pliki**, niezależny odczyt skopiowanych bajtów względem SHA256.txt PASS.

## Weryfikacja

- **19/19 celowanych testów core PASS**: `node scripts/test.mjs --suite=core --test-name-pattern="5\.[2-9]|6\.4|layout|CAD"`. Zakres: kopiowanie/grupy, ruch zespołu, przyciąganie, blokady, pomiary, podkład, DXF, strefy, generator i oddzielenie wyglądu od technologii/symulacji. Nie pisano testów porównujących strukturę JSX lub CSS. Pełnej regresji nie powtarzano po czysto prezentacyjnym pakiecie; ostatnia bazowa 402/402 w UI1a.
- **Końcowy TypeScript/Vite build PASS**, istniejące ostrzeżenie dużych chunków. Pierwsza próba wykryła niedomknięcie JSX przy przenoszeniu toolbaru; poprawiono, kolejne buildy PASS.
- **Rzeczywisty UI przez cua_repl, Vite 5173**: drzewo → wybór stanowiska → nazwa → schowanie/otwarcie właściwości zachowuje niezapisany wpis → zapis → Cofnij/Ponów/Cofnij przywraca oryginał. Zapis lokalny i odświeżenie zachowują projekt i oryginalny obiekt, skupienie po odświeżeniu OFF. Testowa zmiana nazwy została cofnięta. Warstwa stanowisk schowana/przywrócona; zoom zmienia viewBox, dopasowanie go przywraca. Otwieranie kolejnej grupy zamyka poprzednią. Escape zamyka grupę i oddaje focus; Escape opuszcza skupienie. Mobilny panel mieści się w oknie, brak globalnego overflow. Pomiar pozostaje jawnie aktywny po zamknięciu grupy, następnie wyłączony przez istniejące polecenie. Przyciąganie po próbie przywrócono.
- **Instrukcja MD/HTML/PDF PASS**: 60 stron, 49 obrazów, 6 678 391 bajtów PDF; brak brakujących obrazów/sekcji, pustych stron i tekstu poza stroną, HTML zgodny z MD. Obejrzano stronę 60 z nowym opisem i rzutem. Dowody `outputs/qa/manual_ui2a/`.

## Rzeczywisty rozmiar SVG (nie karty)

Zamknięte grupy/panele, w części pomiarów zachowane zaznaczenie obiektu i przycisk usunięcia. Dane w `outputs/qa/ui2a/report.json`.

| Okno | Tryb | SVG szer. × wys. | Widoczna wysokość bez przewijania |
| --- | --- | --- | --- |
| 1440×900 | zwykły | 1402,4 × 540 | 540 px (60%) |
| 1280×720 | zwykły | 1242,4 × 432 | 396,8 px (55,1%) |
| 1440×900 | skupienie | 1402,4 × 722 | 722 px (80,2%) |
| 1280×720 | skupienie | 1242,4 × 542 | 542 px (75,3%) |

Przy 390×844 skupienie: SVG 368,8 × 574 px, całe widoczne; normalny widok pozostaje przewijany. Zrzuty desktop/mobilny obok raportu.

**Ograniczenia odbioru:** próg UI2 70% szerokości / 60% wysokości jest spełniony w skupieniu i na większym desktopie. Zwykły widok 1280×720 nadal wymaga przewinięcia końcówki rzutu; całego kryterium UI2 nie oznaczamy PASS. Nie przeprowadzano ponownie pełnego odbioru przeciągania, DXF przez UI, osobnych okien, WebGL ani prędkości odtwarzania; te części pełnego UI2 wymagają odbioru po UI2b. Kalibracja nie była wykonywana na nowym pliku; przeniesiono jedynie dostęp do istniejącego polecenia. Nie potwierdzono wdrożenia Vercel. Niezwiązany audyt Eko i materiały użytkownika pozostawiono bez zmian.
