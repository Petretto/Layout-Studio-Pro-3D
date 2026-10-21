# 7.12.A2 — spójność widoków i wyników modelu

Data: 2026-10-21. **A2a odebrane**, całe **A2 w trakcie**. Kolejny A2b: 3D i animacja powiązana z rzeczywistym harmonogramem 6. Główne 7.12 nadal w trakcie.

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
