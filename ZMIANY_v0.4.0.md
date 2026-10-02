# Zmiany v0.4.0 — 29.09.2026

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
