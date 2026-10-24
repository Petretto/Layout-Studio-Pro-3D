# 7.13.X/UI2a — narzędzia hali 2D i tryb skupienia

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
