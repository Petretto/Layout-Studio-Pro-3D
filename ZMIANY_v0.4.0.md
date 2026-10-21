# Zmiany v0.4.0 — 29.09.2026

## Wspólny widok aktywnego modelu 6 — 21.10.2026 (7.12.A2a)

- Nowy panel odczytu szkicu 6: przydziały rejestru, czasy wybranej obsady, dopuszczenia, rzut zapisanej geometrii i raport statyczny Markdown ze wspólnym SHA-256 modelu.
- Aktualizacja po przywróceniu wariantu, Cofnij/Ponów i ponownym otwarciu. Bez konwersji do 4, ponownego bilansu, tworzenia geometrii i zgadywania brakujących czasów/kopii. Przy wielu dopuszczeniach zdolność pozostaje nieokreślona.
- Backup 470 plików SHA-256 PASS; celowane 12/12 i manifest 1/1, TypeScript/Vite oraz Edge PASS, źródło 4 bez mutacji, JIT 190 s zachowane. Instrukcja 56 stron/46 obrazów.
- A2 pozostaje w trakcie. 3D i animacja właściwego harmonogramu 6 są w A2b; główne widoki/A4 4 nadal oddzielne. Vercel nie zweryfikowano.

## Podstawowy zewnętrzny projekt pokazowy — 21.10.2026 (7.12.B)

- Katalog `przyklady/01_zestaw_montazowy/`: 12 plików, pełny pakiet projektu, dwa warianty, arkusze procesu/BOM, manifest i niezależne referencje. Wszystkie dane syntetyczne; bez wbudowania projektu w aplikację.
- Manualna linia 20/30/40 s, takt 60 s, jawne bufory i JIT. Baza na 3 aktywnych stanowiskach/3 osoby: partia 170 s; konsolidacja na 2/2: 190 s. Czasy i popyt niezmienne, mniejsza obsada nadal spełnia takt, bez deklaracji wzrostu przepustowości.
- Celowane 14/14, generator --check i Edge od pustego projektu przez import XLSX/pakietu do symulacji/raportu, undo/redo, własnego wariantu i eksportu/importu/reload PASS. Bez zmiany modułów aplikacji, nowego builda i pełnej regresji.
- Instrukcja MD/HTML/PDF: 55 stron/45 obrazów. A2 i fizyczne przykłady C/D pozostają otwarte; główny raport 4 nie jest raportem konsolidacji 6. Vercel nie zweryfikowano.

## Pakiet pojedynczego projektu — odbiór 21.10.2026 (7.12.A1)

- Nowy przycisk **Pakiet projektu**: import i eksport rodziny źródła 4/5, zapisanego szkicu 6 i wariantów zgodnego źródła, w jednym JSON v1 z SHA-256 (do 25 MiB).
- Podgląd i jawne pochodzenie danych; oryginał 4 przy źródle 5 może wymagać dołączenia pliku. Nie zgaduje się źródła ani nie pomija obcych wariantów.
- Cztery obszary zastępowane po kopii ratunkowej i potwierdzeniu; brakujące 5/warianty 6 usuwają stary zapis, scenariusze 4 pozostają. Ochrona autozapisu i tła, kontrola snapshotu, wycofanie i odzyskanie po awarii. Bez migracji istniejących schematów.
- Celowane 12/12, pełna integracyjna 382/382, build, API i Edge (czysty profil, źródła 4/5, rzeczywiste pobrania, anulowanie i awarie) PASS. Instrukcja MD/HTML/PDF: 53 strony/44 obrazy.
- Ustawienia sesji pozostają jawne. A2 (integracja widoków) oraz kompletne przykłady B/C są nadal do wykonania. Vercel nie zweryfikowano.

## Naprawa odzyskiwania 19.10.2026 — 7.6a

- Kopie środowiska v1: pełna walidacja pięciu obszarów i sumy, poprawny licznik wariantów; API odrzuca niepoprawną kopię przed zapisem.
- Pełne odtworzenie usuwa stary obszar dla null. Kopia ratunkowa powstaje przed zmianami; zapis jest sprawdzany, błędy uruchamiają wycofanie, a jego trwała awaria jest jawna i blokuje edycję.
- UI wymaga pobrania kopii ratunkowej i potwierdzenia zakresu; autozapis i skróty w tle są wstrzymane. Poprawne starsze kopie pozostają obsługiwane, bez migracji schematów.
- Testy celowane 9/9, pełna regresja integracyjna 376/376, build i Edge UI PASS. Instrukcja MD/HTML/PDF: 52 strony, 43 obrazy. 7.6 ponownie odebrane; następne A1 — importer pojedynczego pakietu. Vercel nie zweryfikowano.


## Korekty odbioru 19.10.2026 — 7.10a / 7.11a / 7.8.2a

- Naprawiono kartę zdolności produkcyjnej raportu PDF: nominalna zdolność z efektywnego odstępu stanowiska, osobno wymagane tempo popytu. Brak podwójnego OEE; jawne odróżnienie od wyniku symulacji.
- Rozszerzono odbiór dwóch procesów o import rzeczywistych plików XLSX przez UI, warianty przy niezmiennym popycie, porównanie, pobranie CSV/JSON, ponowny import i odświeżenie. Potwierdzono zachowanie migawek i odrzucenie obcego BOM. Dane syntetyczne, aktywny schemat 4.
- Przywrócono rozdział LOD/Popout. Instrukcja MD/HTML/PDF: 51 stron, 42 obrazy, poprawione nazwy przycisków i zakres weryfikacji. Nowa kontrola wykrywa brak sekcji i nieaktualny HTML.
- Celowane testy 3/3, pełna okresowa regresja 371/371, build, Edge UI i kontrola PDF PASS. Bez zmiany schematów i reguł symulacji. Wdrożenia Vercel nie zweryfikowano.


## Aktualizacja dokumentacji 18.10.2026 — 7.8.2 (Finalny odbiór Etapów 5–7)

Podręcznik użytkownika Markdown/HTML/PDF został całościowo zaktualizowany po zakończeniu Etapów 5–7 (nowy edytor hali CAD 2D/3D, automatyczna propozycja layoutu 5.13, manipulatory 3D przesuwania i obrotu 6.5, deterministyczna animacja 3D z kartą inspekcji 6.6, tryb uproszczony LOD i Popout Windows 6.7, symulacja stochastyczna Monte Carlo 7.4, dekompozycja strat OEE 7.5, dystrybucja offline-first z backupem SHA-256 7.6, audyt licencji i bezpieczeństwa 7.7, profesjonalny raport inżynierski PDF z wykresem Yamazumi 7.10 oraz uniwersalność procesowa na bateriach i silnikach EV 7.11).
Podręcznik liczy 45 stron PDF (5,56 MB) i 39 zweryfikowanych ilustracji; zaktualizowano pełny opis funkcji `FUNKCJE_PROGRAMU.md`, rejestr zmian oraz znane ograniczenia. Raport odbioru: `WERYFIKACJA_AKTUALIZACJI_DOKUMENTACJI_7_8_2.md`.

## Aktualizacja dokumentacji 18.10.2026 — 7.8.1

Podręcznik użytkownika Markdown/HTML/PDF uzupełniono po Etapach 1–4 o pełną ścieżkę szkicu 6 i porównywania wariantów. Zawiera 21 obrazów i 21 stron PDF; rozróżnia lokalne zapisy 4/5/6, pomiary/założenia, JIT, statyczny bilans i wyniki symulacji. Generacja i odbiór renderów PASS, raport `WERYFIKACJA_INSTRUKCJI_7_8_1.md`. Bez zmian kodu aplikacji, modeli i schematu; bez regresji automatycznej aplikacji w tym pakiecie. Starszy Word v0.2 pozostaje historyczny. Finalna instrukcja po Etapach 5–7 nadal w 7.8.2.

## Kopia przed zmianami

Kopia: backup/v0.3.1_przed_zasobami_20260927_221046.
Obejmuje kod, konfigurację, dokumentację, testowe XLSX i poprzedni build.
Pominięto node_modules, outputs, wcześniejsze backupy i .git. Outputs zawierał połączenie katalogowe do współdzielonego środowiska — nie kopiowano jego celu.

Powrót: skopiuj tę kopię do osobnego katalogu, wykonaj npm ci i npm run build, uruchom ją na wolnym porcie. Zachowaj aktualny katalog i JSON wersji 4. Starsza aplikacja nie obsługuje nowych zasobów/schematu; nie otwieraj w niej jedynej kopii nowego projektu.

## Wdrożone

1. Edycja poprzedników i następników w tabeli oraz inspektorach przepływu/Yamazumi. Jedno źródło grafu, atomowa synchronizacja połączeń, walidacja cykli i duplikatów.
2. Kolumna Następnicy w imporcie, eksporcie i szablonach XLSX/CSV. Import łączy zależności obu kolumn, z dokumentacją tej zasady.
3. Zasoby stanowisk: 1–20 operatorów na kopię, 1–20 kopii, opcjonalny jawny czas zespołu. Bez automatycznego dzielenia czasu przez liczbę osób.
4. Wykres zdolności, obsada, liczba fizycznych stanowisk, wąskie gardło i raport CSV korzystają z zasobów.
5. Bezpieczne powiązanie ustawień zasobów z zestawem operacji, a nie przejściowym numerem WS.
6. Przycisk „Każda operacja osobno” jako punkt wyjścia dla procesu rozgałęzionego.
7. Generator layoutu z grafu: główna nitka i gałęzie, geometria dodatkowych kopii, rzeczywiste zależności w CAD/3D.
8. Nowy harmonogram zdarzeniowy grafu z rozgałęzieniami, złączeniami AND, dedykowanymi kopiami zasobów i kolejkami według gotowości. Stary silnik szeregowy pozostaje wyłącznie do zgodności i testów.
9. Symulacja pokazuje wykonywaną operację i kopię; CSV ma kolumny rzeczywistych ID operacji. Zielone znaczniki w 3D wskazują aktywne kopie.
10. Edycja 3D: wybór, przesuwanie na podłodze, siatka, formularz X/Y/Z, wymiarów i obrotu. Wspólna geometria z CAD i historia zmian.
11. Widok z góry, zachowanie kamery i zbliżenie na wybrany obiekt. CAD 2D otrzymał podgląd podczas przeciągania.
12. Schemat JSON 4 z odczytem starszych projektów; wersja pakietu, tytułu i UI 0.4.0.
13. Eko: zachowane czasy OP10–OP21, nowy graf i cztery jawnie testowe operacje OP22–OP25. Następniki mogą mieć niższe ID. Gotowy przykład na pulpicie zawiera 16 operacji, 60 materiałów i testowe parametry hali/popytu.
14. Skorygowane odstępy ramion U/L przy wielu kopiach stanowisk; dodany test regresji dla wszystkich czterech generatorów.
15. Import procesu resetuje nieaktualne przydziały i zasoby do RPW (po potwierdzeniu), zachowując BOM i ręczną geometrię. Dodawanie operacji w ręcznym bilansie i edycja zależności w tabeli respektują walidację przydziałów.
16. Zaktualizowany pełny opis funkcji i instrukcja testowania Eko.

## Weryfikacja

- npm test: 35/35 (importy, migracja JSON, zależności, zasoby, brak nakładania zasobów w czasie, fork/join, układ Eko, zgodność BOM).
- npm run build: TypeScript i produkcyjny Vite zakończone poprawnie.
- XLSX odczytany, zrenderowany i sprawdzony importerem aplikacji: 16 operacji, bez błędów. Zachowano natywną tabelę, rozszerzając zakres.
- UI na osobnym porcie 4192, bez nadpisania lokalnych danych portu 4173: wpisanie 2 operatorów, 2 kopii i cyklu 100 s dało odstęp zdolności 50 s oraz obsadę 4 dla grupy.
- UI: zapis X=10800 i obrotu 15° w 3D był widoczny w CAD; kontrola zgłosiła kolizję; Cofnij przywróciło poprawny wariant.
- UI: Eko, partia 3, odstęp 4050 s: ukończenie 21170 s, WIP 0. Wynik pierwszej sztuki 13070 s potwierdzony testem.
- W przeprowadzonym odczycie konsoli przeglądarki nie było ostrzeżeń ani błędów.
- Próby automatycznego wyboru/przeciągania myszą w 3D nie dały jednoznacznego potwierdzenia. Edycja przez formularz została zweryfikowana; obsługę myszy należy potwierdzić ręcznie na docelowej przeglądarce.

## Założenia i ograniczenia

To model koncepcyjny, nie pełna platforma Visual Components. Nie wdrożono importu CAD 3D, kinematyki robotów, ruchu ludzi, animowanego transportu, losowych awarii, ograniczonych buforów ani zasobów współdzielonych między stanowiskami. Model logiczny nie blokuje wspólnego korpusu na czas montażu w kilku miejscach. Ruch wyposażenia nie zmienia czasu transportu (zero).

Cykl zespołu skaluje operacje proporcjonalnie; wymaga pomiaru lub świadomego założenia. Zdolność z bilansu jest oszacowaniem pojemności; symulacja pokazuje harmonogram w określonych założeniach.

Testowy BOM pozostawiono bez zmian. Cztery nowe operacje nie otrzymały automatycznie kosztów podzespołów już ujętych w podmontażu. Nowe materiały montażowe trzeba uzupełnić po ustaleniu technologii.

Nie wykonano odbioru na rzeczywistej hali ani certyfikacji komercyjnej. Starsza instrukcja DOCX nie została przebudowana; aktualne funkcje i procedura są opisane w FUNKCJE_PROGRAMU.md oraz Instrukcja/Eko_v0.4.md.
