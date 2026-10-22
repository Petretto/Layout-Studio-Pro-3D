# 7.12.A2 — spójność widoków i wyników modelu

Aktualizacja: 2026-10-22. **A2a oraz A2b1 odebrane**, całe **A2 w trakcie**. Kolejny A2b2: fizyczne lokalizacje i ruch korpusów/wózków na podstawie danych harmonogramu. Główne 7.12 nadal w trakcie. Poniższy odbiór A2a z 21 października pozostaje historycznym dowodem; dalszy zakres opisano na końcu.

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

**Dalszy krok A2b2**: pozycje i ruch korpusów/wózków z rzeczywistych zdarzeń harmonogramu, z zachowaniem jego reguł buforów, lokalnej kontynuacji i transportu. A2 nadal w trakcie, główne źródłowe widoki 4 pozostają oddzielne. Postęp głównych ID 84,7% / 89,7%, bez nowego licznika za podpakiety. Vercel nie zweryfikowano.
