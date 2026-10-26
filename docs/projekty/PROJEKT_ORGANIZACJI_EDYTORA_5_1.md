# Organizacja edytora hali — przegląd 5.1

Data: 2026-10-18. Status: **wdrożone — użytkownik wybrał wariant B**. Dotyczy to odbioru projektu UI, nie wdrożenia edytora w aplikacji.

## Punkt wyjścia i zakres

Obecny `LayoutEditor.tsx` w aktywnej zakładce hali łączy parametry hali, narzędzia, rzut, formularz wybranego obiektu oraz listy przeszkód i wyposażenia w pionowym przepływie. Edycja właściwości wymaga poruszania się między rzutem i formularzem poniżej. Plan 5.2 przewiduje drzewo/bibliotekę po lewej, widok w środku, właściwości po prawej i wyniki/oś czasu na dole.

Przygotowano `docs/projekty/PROPOZYCJE_UI_5_1.html`: dwa przełączalne szkice z tymi samymi obiektami poglądowymi. Działa wybór z rzutu/drzewa, zaznaczenie klawiaturą, wspólny kontekst właściwości i dolnej inspekcji oraz zwijanie paneli. Geometria nie ma skali ani danych produkcyjnych. Przyciski edycji/zapisu są wyłączone. Podgląd nie importuje aplikacji, nie korzysta z jej pamięci i nie wdraża grupowania, CAD ani synchronizacji 2D/3D.

## Dwie propozycje

**A — stały warsztat.** Na desktopie drzewo obiektów po lewej, rzut w środku, właściwości po prawej. Dolny panel kontroli domyślnie rozwinięty. Inspektor można zwinąć, odzyskując przestrzeń rzutu. Na mniejszym ekranie boczne panele otwierają się na żądanie, a długie właściwości przewijają wewnątrz panelu.

**B — rzut z panelami na żądanie.** Rzut zajmuje szerokość warsztatu. Drzewo otwiera się jako panel, właściwości zaznaczonego obiektu jako nakładka. Dolna kontrola jest domyślnie zwinięta. Rozwiązanie daje więcej miejsca na geometrię, ale wymaga otwierania drzewa i może zasłonić obiekt inspektorem.

| Zadanie / kryterium | A | B |
| --- | --- | --- |
| Częste przechodzenie między obiektami z drzewa | Drzewo stale dostępne na desktopie | Dodatkowe otwarcie drzewa |
| Właściwości i rzut widoczne równocześnie | Sąsiadujące panele | Właściwości nakładają się na rzut |
| Przestrzeń geometrii | Mniejsza, rozszerzalna po zwinięciu inspektora | Większa, ograniczana przez otwartą nakładkę |
| Kontrola i inspekcja | Widoczne domyślnie | Otwierane na żądanie |
| Ekran 960/600 px | Panele na żądanie, bez zmiany modelu danych | Ten sam sposób otwierania paneli |
| Stały kontekst modelu, jednostek i zapisu | Zachowany | Zachowany |
| Nowy schemat danych lub nowe reguły procesu | Niepotrzebne do samej reorganizacji UI | Niepotrzebne do samej reorganizacji UI |

Nie przeprowadzano badania użytkowników ani pomiaru czasu wykonania zadań; porównanie wynika z dostępności elementów i zachowania szkiców.

## Rekomendacja i granice przyszłego 5.2

Rekomendacja: **A z adaptacją do szerokości ekranu**. Odpowiada układowi przewidzianemu w 5.2 i wspiera pracę konsultanta przy wielu korektach geometrii. B pozostaje alternatywą, gdy najważniejszy jest duży rzut i rzadsza edycja właściwości. Nie wdrażamy rekomendacji bez decyzji.

Po zatwierdzeniu należy zachować obecny model aktywnego edytora, walidację i historię. Nie mapować poglądowych `ST-*` na tożsamości projektu 4: w implementacji drzewo korzysta z rzeczywistych ID aktywnego modelu. Nie łączyć automatycznie warsztatu 5/szkicu 6 z aktywnym projektem 4. Gdy dostępna jest oś czasu/wynik z innego modelu, jego kontekst musi być jednoznaczny; dolny panel nie może sugerować aktualnego wyniku bez prawidłowego powiązania.

5.2 powinno przenieść istniejące kontrolki i formularze do nowego układu, zachowując potwierdzenie ponownej generacji, usuwania oraz tryb ręczny/automatyczny. Funkcje wielokrotnego zaznaczania, wspólnego przesuwania wyposażenia, warstw, pomiarów i synchronizacji 2D–3D należą do kolejnych ID 5.3–5.10. Drzewo poglądowe nie potwierdza ich wdrożenia. Po rzeczywistej zmianie obsługi aktualizacja instrukcji będzie obowiązkowa zgodnie z procedurą planu; obecne szkice nie są dokumentowane jako funkcje produktu.

## Weryfikacja propozycji

`node tests/qa/verify_5_1.mjs`: **Edge CDP PASS** — A/B, zaznaczenie myszą/klawiaturą, zgodność drzewa/rzutu/inspektora/dolnej inspekcji, rozszerzenie rzutu po zwinięciu inspektora, ponowne otwarcie, szerokości 1440/960/600 px bez poziomego przepełnienia, wewnętrzne przewijanie długich właściwości i brak wyjątków JS. Wstępna próba ujawniła błąd cudzysłowów selektora w runnerze; poprawiono test. Po wizualnym przeglądzie ograniczono przewijanie właściwości do panelu; końcowy przebieg PASS.

Zrzuty `outputs/qa/verify_5_1_a.png`, `verify_5_1_b.png`, `verify_5_1_a_600.png`, `verify_5_1_b_600.png`. Przegląd wariantów desktopowych i mniejszego ekranu wykonano na renderach. Nie uruchamiano regresji/builda aplikacji: jej kod i schemat nie zostały zmienione. Nie używano Figmy/Pencil, ponieważ lokalny szkic HTML/SVG umożliwia porównanie organizacji i zachowania paneli.

## Decyzja projektowa

**Decyzja użytkownika 2026-10-18: B — większy rzut, panele na żądanie.** Wariant ten jest podstawą implementacji 5.2. Drzewo otwiera się po lewej nad rzutem, właściwości po prawej, a dolna kontrola/inspekcja jest zwijana. Na mniejszych ekranach panele otwierają się na żądanie z wewnętrznym przewijaniem. Rekomendację A zachowano powyżej jako historię porównania; nie nadpisuje ona wyboru użytkownika.

Podgląd otwiera się teraz w wybranym B i nadal pozwala przełączyć A do porównania. Aktualna aplikacja pozostaje bez zmian do wdrożenia 5.2. Instrukcja produktu zostanie wtedy zaktualizowana zgodnie z obowiązującą zasadą. Wybór zapisano po przeglądzie obu propozycji; 5.1 spełnia kryterium decyzji projektowej.
