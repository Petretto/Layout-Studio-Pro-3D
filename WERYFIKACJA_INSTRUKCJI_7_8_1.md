# Odbiór aktualizacji podręcznika — 7.8.1

Data: 2026-10-18. Pakiet 7.8.1: **wdrożone**. Główny punkt 7.8: **w trakcie**, finalna aktualizacja 7.8.2 pozostaje do wykonania po dalszych etapach.

## Zakres

Zaktualizowano istniejący `Instrukcja/Podrecznik_Uzytkownika.md` jako edytowalne źródło oraz jego pochodne HTML i PDF. Nie zastępowano historycznego Worda v0.2 nową wersją o mylącej nazwie. Źródło instrukcji, wersję i datę aktualizacji wskazano w podręczniku.

Nowy rozdział 3 zawiera dziewięć części: rozdział zapisów projektów 4/5/szkicu 6 i kopie odzyskiwania, osoby/czasy/kompetencje/wyposażenie, kalendarze i fizyczny transport, bufory/zaopatrzenie, harmonogram/Gantt/diagnostykę, bilans z ograniczeniami, bibliotekę wariantów, metryki i jawne koszty oraz propozycje usprawnień sprawdzane w symulacji. Nazwy głównych przycisków i pól sprawdzono w aktualnych komponentach oraz raportach 4.5–4.7. Nie dodawano nieistniejącego importu wariantów ani deklaracji synchronizacji online.

Opis zachowuje decyzje AGENTS.md: brak automatycznego dzielenia czasu przez obsadę, kompetencje uzupełniające się w wybranej obsadzie, istniejące dopuszczone kopie, osobne zapisy 4/5/6, kalendarze, kolejne dojazdy wózków, jawne ilości i terminy materiałów, pobranie przy starcie, dostawy przed pobraniem w równym czasie, bufory 0, polityki operatora, pozostanie korpusu na tej samej kopii i JIT domyślnie wyłączony. Wyjaśniono ograniczenia statycznego bilansu, wieloprzyczynowych oczekiwań i propozycji bez gwarancji optimum.

Zrzuty nowych funkcji pochodzą z zapisanych lokalnych odbiorów i są opisane jako syntetyczne. Dla Gantta utworzono `Instrukcja/21_gantt_etap3.png` z zatwierdzonego pliku Git `HEAD:outputs/qa/verify_3_8.png`, ponieważ plik roboczy miał niezwiązaną lokalną zmianę. Nie nadpisano ani nie dodano do commita cudzych zmian QA, `.gitignore`, dashboardu i danych testowych.

Generator HTML ogranicza wysokość ilustracji do 150 mm z zachowaniem proporcji. Eksporter PDF sprawdza wczytanie obrazów przed drukiem, ma timeout prób połączenia i weryfikuje lokalizację swojego katalogu tymczasowego przed rekurencyjnym sprzątaniem. HTML osadza obrazy; PDF i HTML mogą być czytane bez osobnego kopiowania obrazów. Markdown korzysta z jawnych ścieżek do obrazów w repozytorium i jest źródłem do dalszej edycji.

## Weryfikacja wykonana

Backup: `backup/v0.4.0_przed_7_8_1_20261018` — 316 plików i manifest SHA256.

- `node scripts/generate_pdf_html.mjs`: **PASS**, HTML wygenerowany bez ostrzeżeń o brakujących obrazach.
- `node scripts/print_manual_cdp.mjs`: **PASS**, lokalny Edge CDP zweryfikował 21 wczytanych obrazów; PDF 2 618 179 bajtów.
- Bundled Python `scripts/verify_manual.py`: **PASS**. PDF ma 21 stron, wszystkie dziewięć nowych części i rozdział ograniczeń; 21 ścieżek obrazów istnieje, brak pustych stron i słów poza stroną. Wynik: `outputs/qa/manual_7_8_1/report.json`.
- Wszystkie strony wyrenderowano do dwóch arkuszy kontaktowych i obejrzano: `outputs/qa/manual_7_8_1/contact_1.png`, `contact_2.png`; dodatkowo sprawdzono szczegółowy render ostatniej strony. Brak nakładania, uciętych ilustracji, pustych stron i uszkodzonych polskich znaków. Pełne obrazy pozostają osadzone w plikach czytelnika; szczegóły małych tabel można powiększyć w HTML/PDF.
- Nie uruchamiano testów regresyjnych aplikacji ani jej builda: to pakiet dokumentacyjny, bez zmian produktu, danych lub schematu. Wyniki wcześniejszych testów aplikacji są historycznym materiałem odbiorowym, nie testami wykonanymi w tym pakiecie.

Punkt 7.8.1 jest podpunktem, dlatego nie zwiększa licznika głównych ID. Pełne 7.8 pozostaje otwarte na aktualizację po Etapach 5–7. Nie potwierdzono aktualnego wdrożenia Vercel. Następny pakiet implementacyjny: 5.1 — propozycje organizacji edytora hali do wyboru i decyzja projektowa.
