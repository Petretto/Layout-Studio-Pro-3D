# 7.12.B — podstawowy zewnętrzny projekt pokazowy

Data: **2026-10-21**. Katalog `przyklady/01_zestaw_montazowy/`, wersja **1.0.0**, pochodzenie **synthetic**. Zakres B: liniowy, manualny projekt w jawnym trybie procesowym JIT z buforami. Główne 7.12 pozostaje w trakcie; średni i zaawansowany proces fizyczny oraz wspólny odbiór D nie są tutaj odebrane.

## Zawartość i źródło danych

Katalog ma **12 plików**: otoczkę projektu A1, manifest, README, arkusze procesu i BOM, projekcje źródła 4/szkicu 6/biblioteki, warunki eksperymentu, słownik oraz dwa pliki niezależnych referencji. Wszystkie 11 pozostałych plików są w manifeście z liczbą bajtów i SHA-256; manifest nie hashuje samego siebie. Względne ścieżki, brak zewnętrznych assetów i zależności od Eko/baterii/silników. Proste stoły są geometrią dostarczaną z aplikacją, z koncepcyjnymi wymiarami; hala niepotwierdzona.

Generator `scripts/generate_demo_basic_7_12b.mjs` zawiera jawną definicję syntetyczną i odtwarza projekcje oraz manifest. `--check` porównuje bajty wszystkich wygenerowanych plików. Generator **nie wywołuje harmonogramu do tworzenia referencji**. Ręcznie napisane obliczenia i oczekiwane liczby nie są wyprowadzane z raportu aplikacji.

Dodano scoped `.gitattributes`: tekst tego katalogu ma LF, a XLSX nie podlega konwersji tekstowej. Generator normalizuje także autorskie dokumenty do LF przed wyliczeniem manifestu. Wstępna kontrola indeksu wykryła CRLF dwóch dokumentów; normalizację poprawiono i ponownie sprawdzono indeks. Dzięki temu `core.autocrlf=true` na Windows nie zmienia po pobraniu liczby bajtów/SHA manifestu. Końcowo porównano bajty wszystkich plików w indeksie Git z manifestem.

Trzy operacje: 20/30/40 s, VA 16/25/34 s, NVA 4/5/6 s, jedna osoba przez całą operację, bez pracy maszyn. Jawne kompetencje, dopuszczenia wyposażenia i kopii, składy przebiegów, kalendarze [0,28800) s bez przerw. 120000 szt./rok, 250 dni, jedna zmiana 8 h, OEE 100% jako założenie dydaktyczne. Materiały i ceny w BOM są syntetyczne; cena materiału 25 PLN/szt. Nie modeluje się dostaw/zapasu ani stawek pracy.

## Rachunek kontrolny i doprecyzowanie buforów

Takt klienta i cel = **60 s**, pracochłonność **90 s/szt.** Baza ma trzy aktywne stanowiska i trzy osoby. Konsolidacja przenosi OP20 do istniejącej S1/W1; S2/W2 pozostają rezerwą. Przydział, skład i położenie stołu rezerwowego są jawnie zmienione. To nie jest porównanie jednego izolowanego czynnika.

Referencyjne liczby zapisano przed pierwszym wywołaniem badanego silnika. Pierwsza próba **bez buforów** ujawniła nieuprawnione założenie o ciągłej realizacji OP10→OP20 na wspólnej kopii: gotowe wcześniej pierwsze operacje następnych sztuk mogą wyprzedzać drugą operację pierwszej sztuki. Nie poprawiano silnika i nie zastępowano wzorca jego wynikiem. Przed testem końcowej konfiguracji jawnie dodano bufory do obu wariantów: wejścia po 3, pośrednie wyjścia po 3, końcowe wyjście null (bez limitu w modelu), polityka `bbas-worker-released`. Działa istniejąca reguła lokalnej kontynuacji na tej samej kopii. Tę historię i warunki zapisano w referencjach; model nie ma ukrytego wymuszenia priorytetu.

| Wielkość | Baza | Konsolidacja |
| --- | --- | --- |
| Aktywne stanowiska / skład przebiegu | 3 / 3 | 2 / 2 |
| Obciążenia kopii [s/szt.] | 20 / 30 / 40 | 50 / 0 / 40 |
| Statyczna nominalna zdolność [szt./h] | 90 | 72 |
| Koniec kolejnych sztuk [s], partia 3, odstęp 1 s, JIT | 90 / 130 / 170 | 90 / 140 / 190 |
| Koniec partii [s] | 170 | 190 |
| Praca na sztukę [s] | 90 | 90 |

Sprawdzono wszystkie 9 okien operacji każdego wariantu z bezwzględną tolerancją 1e-9 s, brak nakładania pracy tej samej osoby, jedną sztukę = 90 s i niezmienność wyników po przesunięciu geometrii. Oba warianty mieszczą się w takcie; mniejsza obsada nie zwiększa przepustowości. Brak stawek nie pozwala twierdzić, że wyliczono oszczędności pieniężne. Bufory nie blokują tej małej partii, ale ich jawna konfiguracja ustala lokalną kontynuację.

## Wykonane sprawdzenia

- **4/4 testów B PASS** (`node scripts/test.mjs --suite=network --test-name-pattern=7\.12\.B`): kompletny manifest/SHA/projekcje, arkusze przez istniejące importery i brak formuł, takt/BOM/bilans, harmonogramy i niezmienniki.
- **14/14 celowanych PASS**: B oraz bezpośrednio używane porównanie 4.5/4.6 i lokalna kontynuacja 3.5b2c4. Po końcowym doprecyzowaniu opisu referencji ponownie 4/4 i odtwarzalność plików PASS. Bez pełnej regresji; poprzednia pełna 382/382 w A1. Ten pakiet nie zmienia kodu aplikacji ani reguł silnika.
- **Generator `--check` PASS**: te same 12 plików, w tym XLSX, oraz zgodne hashe. Dane XLSX odpowiadają modelowi w projekcie, pierwszym arkuszem jest Dane; osobne Opis kolumn i Pochodzenie.
- **Edge UI PASS**, skrypt `tests/qa/verify_7_12b.mjs`, izolowany profil. Od pustego projektu przez import pakietu z kopią ratunkową, import obu XLSX, ponowne wczytanie pełnego pakietu, kontrolę taktu/bilansu i rzutu z trzema stołami, jawne wybranie JIT (domyślnie OFF), bazowe 170 s, porównanie 170/190 s oraz pobranie raportu Markdown. Przywrócenie konsolidacji, Cofnij/Ponów z dokładnym odczytem szkicu, 190 s, zapis własnej migawki, eksport/import pakietu i odświeżenie z zachowaniem danych. **0 wyjątków JS**, bez przygotowywania localStorage przez dewelopera. Raport `outputs/qa/7_12b_ui/report.json`, rzeczywiście pobrany raport porównania obok.
- Nie wykonywano nowego builda: źródła aplikacji i zależności pozostają bez zmian względem zbudowanego A1. UI sprawdzono na tej kompilacji. Nowy kod TypeScript ogranicza się do testów, kompilowanych przez runner testowy.

Nie było strukturalnej zmiany modułów, schematu ani zapisu, więc nie wykonywano nowej kopii całej aplikacji; istniejące kopie i lokalne dane użytkownika zachowano. UI importu nadal wymaga rzeczywistej kopii ratunkowej.

## Dokumentacja, granice odbioru i dalszy krok

Zaktualizowano README i kontrakt przykładów, funkcje programu, rejestr zmian oraz podręcznik MD/HTML/PDF (nowy rozdział 5.14). Kontrola renderów i zgodności formatu jest rejestrowana w `outputs/qa/manual_7_12b/report.json`.

Końcowy podręcznik: **55 stron, 45 obrazów, PDF 6 308 807 bajtów**. Zgodność HTML ze źródłem, obecność sekcji/obrazów/terminów w formatach, brak pustych stron i tekstu poza obszarem — PASS. Przejrzano render zmienionych stron 53–55 i tytuł; nie deklarowano ponownego wizualnego odbioru całego niezmienionego podręcznika.

Podstawowy projekt jest kompletny **dla jawnie opisanego JIT i buforów**, nie dla fizycznego transportu, materiałowych stanów początkowych lub podmontaży. Ustawienia sesji 3 szt./1 s/JIT wybiera się jawnie osobno w harmonogramie i porównaniu; plik warunków nie ma osobnego importera. `modelStatus: incomplete` pozostaje nazwą bieżącego szkicu 6, a nie odbiorem technologicznym procesu.

Główne źródłowe widoki 4, ich layout/animacja/raport A4 nie przedstawiają automatycznie konsolidacji 6. Odbiór B wykorzystuje właściwy raport porównania 6 i jawnie oddziela go od źródłowej bazy 4. To ograniczenie jest opisane w README i instrukcji; **A2 pozostaje do realizacji przed C/D**. Nie odebrano A2, fizycznych przykładów C, pełnego punktu 7.2, pustego startu 7.13 ani tutorialu 7.14.

Następny krok: **7.12.A2 — analiza i ograniczona integracja widoków/wyników właściwego modelu**. Postęp głównych ID: **61/72 = 84,7%**, pierwsze wydanie **61/68 = 89,7%**; B jest podpakietem. Git push nie jest potwierdzeniem wdrożenia Vercel.
