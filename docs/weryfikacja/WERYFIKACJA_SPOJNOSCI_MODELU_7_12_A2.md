# 7.12.A2 — spójność widoków i wyników modelu

Aktualizacja: 2026-10-25. **A2a, A2b1, rdzeń A2b2a i integracja A2b2b odebrane w opisanym zakresie**, całe **A2 w trakcie**. A2b2b pokazuje historię instancji i symboliczne punkty stanowisk; brak geometrycznego przebiegu tras pozostaje jawny, bez płynnej interpolacji ruchu. Główne 7.12 nadal w trakcie. Wcześniejsze wpisy pozostają historycznymi dowodami; bieżący odbiór opisano na końcu.

## Kontrakt A2a

Problem: przywrócenie wariantu do szkicu 6 nie zmienia projektu źródłowego 4; korzystanie z głównego bilansu/layoutu/raportu dla wariantu 6 może przedstawiać inne dane. Nie przeliczamy 6 jako 4 i nie zastępujemy jego przydziałów nowym RPW/LCR.

Dodano projekcję `src/core/domainModelView.ts` i panel `DomainModelOverview.tsx` pod informacją o zapisanym szkicu 6. Panel otrzymuje **dokładnie ten sam `draft.saved.project`**, co edytory i harmonogram. Przy przywróceniu wariantu/Cofnij/Ponów aktualizują się przydziały rejestru, czasy jawnie wybranych wariantów obsady, skład, dopuszczenia kopii, rzut istniejącej geometrii i raport Markdown. SHA-256 pełnego modelu identyfikuje stan panelu i raportu; nie jest podpisem ani dowodem poprawności.

Odczyt waliduje kopię modelu i niczego nie zapisuje. Brak czasu obsady nie jest uzupełniany standardowym czasem operacji; brak kopii nie jest zamieniany na jedną. Przy alternatywnych dopuszczeniach statyczny pułap pozostaje nieokreślony — nie wybiera się pierwszej kopii ani nie dzieli pracy arbitralnie. Suma czasów operacji nie jest nazywana osobosekundami bez uwzględnienia obsady. Pułap statyczny nie potwierdza dostępności zasobów, kalendarzy i dynamicznej przepustowości.

Rzut tylko do odczytu zachowuje współrzędne, wymiary, obrót i ID istniejących obiektów oraz przeszkody. Bez podkładu, tras, tworzenia brakujących stołów, edycji i animacji. Nie jest zatwierdzeniem geometrii ani BHP. Raport A2a jest statyczny; nie pobiera starych wyników symulacji ani danych projektu 4. Dynamiczne warunki i wyniki nadal pochodzą z paneli harmonogramu/porównania 6.

Backup przed zmianą struktury widoku: `backup/v0.4.0_przed_7_12a2a_20261021`, **470 plików**. Osobno sprawdzono SHA-256 skopiowanych bajtów każdego pliku: **PASS**. Schematy, klucze zapisu, format pakietu i tożsamości bez zmian; migracja nie jest potrzebna. Istniejące pliki szkiców pozostają obsługiwane.

## Weryfikacja

| Sprawdzenie | Wynik |
| --- | --- |
| Testy celowane A2a/B/4.5/4.6 | **12/12 PASS**, w tym 3 nowe testy A2a: zgodny odczyt konsolidacji i źródła, brak domyślnego czasu/kopii/zdolności, wiele dopuszczeń, brak geometrii, obroty/ID, raport i escapowanie tekstu, niezmienność danych oraz skrótu po symulacji. |
| Projekt podstawowy | Baza: 20/30/40 s, pułap 90 szt./h, S2 Y=2000 mm. Konsolidacja: 50/0/40 s, W1/W3, pułap 72 szt./h, S2 Y=4000 mm. Źródłowy 4 nadal ma bazowe WS-1/2/3. |
| TypeScript + produkcyjny Vite | **PASS**, istniejące ostrzeżenie o dużych chunkach. |
| `node tests/qa/verify_7_12a2a.mjs` | **PASS**, izolowany Edge: rzeczywisty import przykładu, panel bazowy i pobrany raport, przywrócenie konsolidacji, zmiana SHA/przydziałów/geometrii/pułapu, raport z aktualnym SHA i współrzędnymi, Cofnij/Ponów, źródło 4 bez mutacji, harmonogram JIT=190 s, eksport/import/reload z identycznym widokiem i treścią raportu. **0 wyjątków JS**. |
| Aktualizacja README przykładu | Generator i `--check` PASS; po zmianie dokumentu ponowny test manifestu **1/1 PASS**. Dane modelu i niezależne wzorce B bez zmian. |

Dowody: `outputs/qa/7_12a2a_ui/report.json`, `base_report.md`, `consolidated_report.md` i zrzuty panelu/rzutu. Testy korzystają z plików i UI; nie tworzą szkicu przez ręczne wpisanie pamięci przeglądarki.

Nie uruchamiano pełnej regresji: poprzednia pełna 382/382 w A1; od niej ukończono B, a A2a jest drugim pakietem. Zakres jest projekcją odczytu, bez zmiany algorytmów i zapisu. Celowane testy obejmują zależne porównanie i przykład. Pełny punkt integracyjny A2 pozostaje przed nami.

## Dokumentacja i dalszy zakres

Zaktualizowano instrukcję MD/HTML/PDF (rozdział 5.15), opis funkcji, rejestr zmian, README przykładu i plan. Kontrolę treści/granic/zgodności HTML i renderów zmienionych stron dokumentuje `outputs/qa/manual_7_12a2a/report.json`.

Podręcznik końcowy: **56 stron, 46 obrazów, PDF 6 409 494 bajtów**. Zgodność HTML, treści/sekcji/obrazów wszystkich formatów, brak pustych stron i tekstu poza granicami — PASS. Przejrzano render zmienionego rozdziału i tytuł; nie wykonywano ponownego wizualnego odbioru całej niezmienionej instrukcji.

**Pozostaje A2b:** prezentacja 3D tego samego modelu oraz animacja korzystająca z harmonogramu 6 i jego semantyki zasobów/lokalizacji, bez uruchamiania drugiej symulacji lub traktowania animacji jako źródła prawdy. Zmiana danych/warunków musi unieważniać stary wynik. Trzeba odebrać pauzę/prędkość/wybór, zmianę wariantu i wznowienie po odświeżeniu zgodnie z jawnym zakresem danych.

Główne widoki i raport A4 4 pozostają oddzielne. A2a dostarcza własny spójny odczyt 6, **nie kończy A2 ani integracji całej aplikacji**. Przykłady fizyczne C/D nadal oczekują na dalszy odbiór.

Postęp głównych ID bez zmiany: **61/72 = 84,7%**, pierwsze wydanie **61/68 = 89,7%**. Po zweryfikowaniu pakietu commit/push; Vercel nie jest uznany za zweryfikowany na podstawie samego Git push.

## A2b1 — geometria 3D i odtwarzanie operacji, 2026-10-22

Dodano `domainPlayback.ts`, `DomainSchedulePlayback.tsx` i dynamicznie ładowany `DomainPlayback3D.tsx`. Panel harmonogramu przekazuje wynik tego samego workera i jawne warunki do projekcji odtwarzania. Nie wywołuje się drugiego silnika i nie konwertuje projektu do 4. Model i wynik/warunki mają oddzielne skróty SHA-256. Zmiana danych, warunków lub wariantu usuwa stary wynik; identyfikator żądania odrzuca spóźnione odpowiedzi. Po odświeżeniu projekt pozostaje zapisany, ale wynik sesji wymaga nowego obliczenia.

Widok 3D korzysta z zapisanych obiektów, przeszkód i istniejących generatorów parametrycznych w skali 1 m = 1000 mm. Jest tylko do odczytu. Kamera i prędkość nie sterują procesem. Przy ponad 200 obiektach używa uproszczonego wyglądu. Konteksty WebGL, geometrie, materiały lokalne, sterowanie kamerą i pętle renderowania są zwalniane po wyłączeniu lub zmianie widoku. Brak WebGL ma jawny komunikat i nie usuwa wyniku/tabeli.

Odtwarzanie odczytuje półotwarte okna pracy, przerwy kalendarza i zajęcie stanowiska po obróbce. Oczekiwanie na start pozostaje w tabeli, bez znacznika sugerującego obecność na stanowisku. Znacznik wiąże operację z jawnym wyposażeniem i jego geometrią; tylko dla jednej kopii dopuszcza również jednoznaczny pojedynczy stół. Przy braku geometrii lub niejednoznaczności nie tworzy pozycji domyślnej. **Znacznik nie jest lokalizacją wyrobu; nie animowano fizycznego transportu ani wózków.** To odrębny A2b2, a JIT w ogóle nie liczy takich lokalizacji.

Sterowanie: odtwarzanie/pauza, krok +1 s, początek/koniec, suwak i wpisanie czasu, prędkości 1×–5000×, wybór konkretnego wykonania z listy lub tabeli. Kolory wskazują pracę, przerwę, zajęcie po obróbce i wybór użytkownika. Zmiana czasu zatrzymuje odtwarzanie. Wybór operacji nie opiera się na kolejności wierszy harmonogramu.

Backup `backup/v0.4.0_przed_7_12a2b1_20261021`: **474 pliki**, osobne sprawdzenie skopiowanych bajtów według SHA-256 **PASS**. Bez zmian schematów i zapisu projektów. Lokalne niezwiązane zmiany użytkownika zachowano.

### Wykonane sprawdzenia A2b1

- **11/11 celowanych PASS**: 4 nowe testy odtwarzania oraz A2a/B. Wiązanie modelu i wyniku, rzeczywiste przypisania, brak geometrii/niejednoznaczna kopia, błędne warunki/referencje, granice pracy/przerw/zajęcia, czas/prędkość bez zmiany harmonogramu i skrótu.
- **Build TypeScript/Vite PASS**; pozostaje istniejące ostrzeżenie o dużych chunkach. Three.js i generatory są współdzielone z dotychczasową sceną, nowy widok jest ładowany na żądanie.
- **Pełna regresja sekwencyjna: 393/393 PASS** — core 106/106, następnie network 287/287. Jest to okresowy pełny przebieg po trzech pakietach od A1 oraz checkpoint cyklu wynik/odtwarzanie. Wcześniejsze równoległe przebiegi zgłosiły przekroczenia progów czasu istniejących testów 3.9 (m.in. 508,14 ms przy limicie 500 i 207,89/217,08 ms przy limicie 200). Pierwszy uruchomiono przy aktywnym buildzie; powtórka równoległa także była niestabilna. Osobny podzbiór wydajności 2/2 PASS i oba pełne zestawy wykonane kolejno PASS. **Progów ani algorytmów nie zmieniono**; nie raportujemy domyślnego przebiegu równoległego jako PASS.
- **Edge UI PASS**, `tests/qa/verify_7_12a2b1.mjs`: izolowany profil i programowy WebGL/SwiftShader. Import rzeczywistego pakietu, geometria przed obliczeniem, worker i wynik 170/190 s, czas 25 s i wybór konkretnej operacji, krok, stabilna pauza, prędkość 5000× ze stałym skrótem wyniku, unieważnienie po warunkach/wariancie, wyłączenie/włączenie WebGL, źródło 4 bez mutacji, odświeżenie zachowujące projekt bez odtwarzania starego wyniku; **0 wyjątków JS**. Raport i zrzuty w `outputs/qa/7_12a2b1_ui/`. Odbiór nie jest benchmarkiem sprzętowego GPU.
- README przykładu i manifest odtworzone generatorem; `--check` i dodatkowy test manifestu **1/1 PASS**. Model i wzorce 170/190 s bez zmian.

Instrukcja otrzymała rozdział 5.16 (MD/HTML/PDF); kontrola końcowa w `outputs/qa/manual_7_12a2b1/report.json`. Przejrzano scenę z zaznaczoną operacją; przegląd zmienionych renderów podręcznika zapisano po generacji.

Końcowy PDF: **58 stron, 47 obrazów, 6 513 389 bajtów**. Zgodność HTML ze źródłem, wymagane sekcje/obrazy/treść formatów, brak pustych stron i tekstu poza granicami — PASS. Przegląd zmienionych renderów i tytułu PASS; nie powtarzano wizualnego odbioru wszystkich niezmienionych stron.

### Decyzja o języku interfejsu

Na prośbę użytkownika dodano **7.13.U**, po integracji A2: zastąpić techniczne nazwy „szkic”, „schemat 4/5/6” i „Stanowiska v5” językiem projektu, stanowisk i wariantów, przy zachowaniu wersji formatów w diagnostyce i dokumentacji. Nie zmieniano jeszcze globalnie etykiet ani formatów, aby nie sugerować zakończonej integracji. Ten podpunkt jest zaplanowany, nie wdrożony.

**Dalszy krok po A2b1 — A2b2**: pozycje i ruch korpusów/wózków z rzeczywistych zdarzeń harmonogramu, z zachowaniem jego reguł buforów, lokalnej kontynuacji i transportu. A2 nadal w trakcie, główne źródłowe widoki 4 pozostają oddzielne. Postęp głównych ID 84,7% / 89,7%, bez nowego licznika za podpakiety. Vercel nie zweryfikowano.

## A2b2a — rdzeń odczytu historii fizycznej, 2026-10-23

Pakiet ograniczony do kontraktu odczytu i jego weryfikacji. Nowy `src/core/domainPhysicalPlayback.ts` przyjmuje ten sam model, warunki, wynik i jawne wejście korpusów, które otrzymał worker. Domyślnie wejściem są zapisane `bodyRunInput`; dla wywołań z innym jawnym wejściem trzeba przekazać je osobno. Korzysta z istniejącego powiązania SHA modelu oraz wyniku/warunków z A2b1. Nie wywołuje harmonogramowania, nie zmienia zapisów i nie jest jeszcze podłączony do interfejsu.

Historia korpusów zachowuje kolejność zdarzeń, także zwolnienie i ponowną rezerwację w tej samej sekundzie. Odtworzenie musi dać dokładnie końcowy rejestr workera; błędna tożsamość lub niepełna historia są odrzucane. Korpus w transporcie ma nieznaną lokalizację stacjonarną oraz jawne końce/czasy przejazdu. Rezerwacje równoległych operacji pozostają na jednej instancji. Blokada bufora i lokalne oczekiwanie nie przenoszą korpusu z kopii. Ten pakiet odtwarza rejestr korpusów, nie odtwarza osobno rejestru tokenów/pojemności buforów i nie nadaje im współrzędnych.

Historia wózków korzysta z zadeklarowanych lokalizacji początkowych, wykonanych ruchów oraz wskazanych tras. Przyjazd poprzedza wyjazd w tej samej sekundzie. Koniec ruchu musi odpowiadać czasowi trasy; nakładające się ruchy lub niezgodność rejestru końcowego powodują odmowę. Sekwencja dojazdów nie jest przeliczana ani zrównoleglana. Czas odtwarzania obejmuje również rzeczywisty powrót wózka po ukończeniu wyrobu. Przenośnik pozostaje urządzeniem stałym, nie otrzymuje historii ruchomego wózka. Lokalizacji podzespołów nie dodawano w tym pakiecie.

Dowolny odczyt czasu, również cofnięcie, wyszukuje ostatni stan danej instancji binarnie. Granica uwzględnia wszystkie zdarzenia o czasie równym wybranemu. Wynik klatki jest kopią i nie modyfikuje przygotowanej historii ani danych wejściowych. JIT zwraca puste listy fizycznych instancji i odmawia wyniku zawierającego fizyczne rejestry. Brak śledzenia pozostaje jawny; geometria nie tworzy domyślnych pozycji.

### Weryfikacja A2b2a

- Backup `backup/v0.4.0_przed_7_12a2b2a_20261023`: **478 plików**, osobny odczyt skopiowanych bajtów i porównanie SHA-256 **PASS**.
- `node scripts/test.mjs --suite=network '--test-name-pattern=7\.12\.A2b2a|7\.12\.A2b1|3\.4k:|3\.5b2c4:'`: **20/20 PASS**. Siedem nowych testów: przejazd/powrót i cofanie, dojazd bez przesuwania korpusu, bufory/lokalna kontynuacja, zestaw wielu wózków w obu kolejnościach, JIT, równoległe rezerwacje jednego korpusu oraz uszkodzona/niepełna historia. Pozostałe testy to regresja odtwarzania operacji, sekwencji dojazdów i lokalnej kontynuacji. W początkowej próbie poprawiono dwa błędy nowych testów (brak wymuszonego oczekiwania w fixture oraz niepoprawna ścieżka do przykładu); istniejących testów, progów i algorytmów nie zmieniono.
- `npm.cmd run build`: **PASS**, TypeScript i Vite; pozostaje wcześniejsze ostrzeżenie o chunkach >500 kB.
- Bez pełnej regresji: ostatnia pełna sekwencyjna 393/393 w poprzednim A2b1; obecny pakiet jest niezależną projekcją odczytu, jeszcze bez integracji. Bez nowych prób UI, zapisu/odczytu lub PDF: interfejs i formaty nie zmieniają się, instrukcja 58 stron/47 obrazów nadal opisuje rzeczywistą aplikację.

**Status:** rdzeń A2b2a odebrany; całe A2b2 i A2 nadal w trakcie. Następny **A2b2b** ma podłączyć historię do aktualnego wyniku sesji i sceny, z jawnie zgłoszonym brakiem geometrycznej drogi. Nie interpolować rzeczywistej trasy na podstawie samej odległości/czasu. Odbiór wymaga UI, granic czasu, zmiany wariantu/warunków, braku podwójnej wizualizacji statycznego i ruchomego wózka, aktualizacji instrukcji i kontroli niezmienności harmonogramu.

### Plan UI/UX na zgłoszenie użytkownika

Dodano 7.13.X1–X3 w bieżącym wydaniu: audyt i przeglądalny projekt, wspólny system ikon z dostępnymi nazwami/podpowiedziami, listy wyboru, menu dodatkowych działań, pomoc i szczegóły na żądanie oraz zwijane panele. Obowiązuje wcześniejsza decyzja B — większy rzut i panele na żądanie. Ustalono odbiór dla 1440×900, 1280×720, 390×844, klawiatury i 200% powiększenia; na desktopie po zamknięciu paneli scena ma mieć minimum 70% szerokości i 60% wysokości okna aplikacji. Widoczne pozostają błędy, źródło wyniku i istotne założenia. X1 po A2, wdrożenie wspólnie z językiem U/startem 7.13, przed tutorialem. To plan zmian UI, jeszcze bez wdrożenia. Postęp: **61/72 = 84,7%, pierwsze wydanie 61/68 = 89,7%**. Vercel nie zweryfikowano.

## A2b2b — historia fizyczna w UI i 3D, 2026-10-25

**Wdrożone w zakresie integracji istniejącego rejestru i symbolicznej wizualizacji stanowisk.** Nie dodano geometrii tras ani pozornego ruchu po prostej. Całe A2/7.12 pozostają w trakcie.

- Panel workera przygotowuje historię z dokładnie tego samego modelu, wyniku i warunków co odtwarzanie operacji. Skróty modelu i wyniku blokują stare powiązania. Zmiana danych, wariantu, warunków, anulowanie lub nowe obliczenie usuwa poprzednią historię. Błąd fizycznej historii jest jawny i nie usuwa samego wyniku technologicznego.
- Wspólna oś czasu obejmuje powrót wózka po zakończeniu wyrobu. W jawnym teście produkcja kończy się w 22 s, odtwarzanie w 27 s; nie przedłużono wyniku produkcji do czasu powrotu. Czas/prędkość/kamera nie wywołują harmonogramowania.
- `domainPhysicalScene.ts` wiąże kopię z jednym jednoznacznym obiektem wyposażenia; dla pojedynczej kopii dopuszcza unikalny stół stanowiska. Wiele punktów, brak geometrii lub nieznane miejsce nie tworzą pozycji domyślnej. Klatki nie współdzielą mutowalnych punktów geometrii. Istniejące algorytmy rezerwacji, bufory i zdarzenia nie zmieniają się.
- Fioletowy romb oznacza jeden korpus, błękitny sześcian jeden wózek. Są to symboliczne punkty odniesienia stanowiska z umownym przesunięciem pionowym dla czytelności, nie gabaryty, dokowanie ani fizycznie zmierzone pozycje. Statyczny obiekt śledzonego wózka jest ukryty, również podczas przejazdu, aby nie pozostał drugi egzemplarz w pozycji edytora.
- Trasy zawierają długość/czas i końce, lecz nie geometryczny przebieg. W czasie przejazdu znacznik znika; tabela podaje instancję, końce, przedział, pusty/załadowany i procent **czasu**, nie drogi. Przyjazd przywraca znacznik przy docelowej kopii, jeśli ma geometrię. Brak instancji i JIT są rozróżnione; JIT nie generuje pozycji i pozostawia geometrię statycznego projektu.
- Bez zmian schematów 4/5/6, migracji, tożsamości, pomiarów i zasad symulacji. Powrót do poprzedniej wersji: przywrócić zmienione źródła z backupu, zbudować aplikację; nie kasować localStorage ani plików projektów.

### Dowody A2b2b

- Backup `backup/v0.4.0_przed_7_12a2b2b_20261025`: **628 plików**, osobny odczyt skopiowanych SHA-256 PASS.
- `node scripts/test.mjs --suite=network '--test-name-pattern=7\.12\.A2b2|7\.12\.A2b1|3\.4k:|3\.5b2c4:'`: **23/23 PASS** (3 nowe testy sceny, 20 regresji odtwarzania, zestawów wózków i lokalnej kontynuacji). Granice 0/10/11/12/22/27, cofanie, brak interpolacji i mutacji, ukrycie statycznej bryły, brak geometrii/JIT oraz odmowa obcego modelu. Po drobnej poprawce izolacji punktu wykonano ponownie cały ten zakres. Log `outputs/qa/7_12a2b2b_ui/tests.txt`.
- Nowy jawny fixture `tests/fixtures/physicalPlaybackUi.ts`: 2 operacje po 10 s, przewóz 2 s, pusty powrót 5 s, 1 korpus, 1 wózek, 2 osoby, dwa warianty geometrii. Wszystko syntetyczne. Generator `node scripts/prepare_physical_playback_qa.mjs` daje plik importu, bez sterowania przeglądarką. Pierwsze próby nowych testów wykryły błędy fixture (prefiks ST-, pominięty argument jawnych korpusów w bezpośrednim wywołaniu testu, powielone powiązanie obiektu, brak stanowiska wyposażenia i odziedziczone przeszkody poza zmniejszoną halą) oraz brak importu parsera w teście. Poprawiono tylko nowe testy/fixture, bez zmiany progów lub istniejących reguł silnika.
- Końcowy `npm run build`: **TypeScript/Vite PASS**, 1984 moduły; dotychczasowe ostrzeżenie dużych chunków. Nie wykonywano pełnej regresji: ostatnia 420/420 w przeglądzie 7.12/7.13, od tego czasu jeden pakiet katalogu. Obecna integracja odczytu jest objęta celowanym zakresem; scheduler, formaty i zapis bez zmian.
- **Rzeczywisty UI przez cua_repl**, osobny adres produkcyjnego builda `127.0.0.1:5308` (projekt na 5307 nie był zastępowany): importer pliku z podglądem, pobraniem kopii i potwierdzeniem; WebGL oraz trzy różne znaczniki operacji/korpusu/wózka widoczne na zrzutach. Statyczna bryła wózka nie jest równocześnie widoczna.
- UI: w 0 s obie instancje przy A; 10–12 s obie w przejeździe bez pozycji; 11 s pokazuje 50% czasu; 12 s obie przy C; 22 s korpus przy C, pusty wózek wraca; 27 s wózek przy A, korpus przy C. Powrót czasu do 0 odtwarza A. Ten sam SHA wyniku po cofaniu i po 5000×; koniec 27 s/produkcja 22 s zachowany. Start 1× zwiększa czas; Pauza zmieniła pole na 0,28 s. Nie deklarujemy osobnej długiej próby stabilności pauzy: kolejna wiadomość użytkownika zamknęła tymczasową kartę i wyczyściła uchwyty narzędzia.
- UI: zmiana warunków usuwa pola czasu i fizyczne wiersze; JIT po obliczeniu ma widoczny komunikat braku lokalizacji. Wczytanie wariantu bez stołu C usuwa stary wynik, a ponowny wynik w 12 s wskazuje brak jednoznacznej geometrii. Odświeżenie zachowuje wariant bez geometrii, ale nie wynik sesji. Przywrócenie bazy i ponowne obliczenie przywraca 27 s. Ponowne wyłączenie/włączenie 3D działa. Zresetowano testowy viewport. Nie wykonywano nowej próby wymuszonego braku WebGL ani pomiaru Eko.
- Instrukcja MD/HTML/PDF opisuje symboliczne punkty, brak drogi, JIT, powrót po produkcji i brak starego wyniku. **62 strony, 51 ilustracji**; zgodność HTML/MD, brak brakujących obrazów/sekcji, pustych stron i słów poza granicami PASS. Wizualny przegląd arkusza stron 49–62, w tym zmienionych stron 57–59 PASS. Zrzut `outputs/qa/7_12a2b2b_ui/final_3d.png`; pozostałe granice czasu w tym samym katalogu. Wynik kontroli PDF w `outputs/qa/manual_7_12a2b2b/`.

**Następny pakiet:** fizyczny odbiór projektu średniego 7.12.C1 (transport, bufory i zaopatrzenie), następnie C2/D. Płynne odtwarzanie geometrycznych tras wymaga osobnego jawnego kontraktu przebiegu drogi; nie jest potwierdzone samą długością i czasem. Postęp głównych ID nadal **61/72 = 84,7%**, pierwsze wydanie **61/68 = 89,7%**. Nie potwierdzono Vercel.
