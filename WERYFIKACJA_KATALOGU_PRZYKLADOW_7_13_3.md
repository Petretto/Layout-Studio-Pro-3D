# 7.13.3 — katalog zewnętrznych przykładów

Data: 2026-10-25. Zakres: pobieranie przykładów z Pulpitu i ich jawne wczytanie. Główne 7.13 pozostaje w trakcie do dalszego U/X i odbioru; 7.12 nadal wymaga fizycznych prób.

## Zmiana

- Rozwijany katalog ładuje metadane na żądanie, bez automatycznego otwierania projektu. Cztery karty zawierają pochodzenie, wersję, warunki i ograniczenia, JSON oraz ZIP z kompletem 12 plików. Import otwiera istniejący importer; jego kopia ratunkowa, potwierdzenie i ochrona zapisu pozostają bez zmian.
- `przyklady/katalog.json` jest opisem kart. `scripts/prepare_demo_catalog.mjs` sprawdza manifesty źródłowe i przygotowuje dziewięć zewnętrznych plików w `public/demo-projects/`: indeks, cztery JSON i cztery ZIP. Deterministyczny ZIP bez kompresji, UTF-8, CRC-32, bez nowej zależności. Dane przykładów nie są importowane do komponentu ani pakowane jako obiekty JS. `predev/prebuild` przygotowują dystrybucję; wygenerowane pliki są ignorowane w Git, kopiowane przez Vite do dist.
- Pobieranie sprawdza HTTP i SHA-256 pliku względem indeksu przed utworzeniem pliku do zapisania. Błąd katalogu ma ponowienie; uszkodzony plik nie jest przekazywany do pobrania. Żadna z tych akcji nie zapisuje projektu.
- Lokalny serwer udostępnia komplet bez internetu. Hosting wymaga połączenia do pobrania; nie dodawano service workera ani obietnicy automatycznego cache offline. Własne pobrane pakiety można wczytać bez katalogu.
- Schematy 4/5/6, migracje, tożsamości, czasy i algorytmy symulacji bez zmian. Nowy moduł nie wymaga migracji zapisów. Powrót: przywrócić zmienione źródła i konfigurację z backupu, zbudować ponownie; nie kasować danych przeglądarki.

## Dowody

- Backup `backup/v0.4.0_przed_7_13_3_20261025`: **612 plików**, niezależny odczyt skopiowanych bajtów SHA-256 PASS.
- `python tests/verify_demo_catalog.py`: **3/3 PASS**. Niezależny czytnik ZIP Pythona sprawdza CRC, komplet wszystkich plików, zgodność każdego bajtu ze źródłem, manifesty i SHA indeksu oraz format samodzielnych JSON.
- `node scripts/prepare_demo_catalog.mjs --check`: **PASS**, 4 projekty / 9 assetów.
- `node scripts/test.mjs --suite=network --test-name-pattern=7\.(12|13)`: **35/35 PASS**. Obejmuje importery arkuszy, sumy, warianty i referencje harmonogramów. Pierwsza próba przez npm na Windows źle przekazała znak `|`; poprawne uruchomienie bezpośrednio przez node przeszło. Nie zmieniano testów ani progów.
- `npm run build`: **TypeScript/Vite PASS**, 1982 moduły. Pierwszy build wykrył brak typów ImportMeta.env; dodano standardowe `vite/client`. Pozostało dotychczasowe ostrzeżenie dużych chunków. Nie wykonywano pełnej regresji: ostatnia 420/420 w poprzednim pakiecie, bieżąca zmiana nie dotyka symulacji ani trwałości.
- **Rzeczywisty UI przez cua_repl**, produkcyjny build `http://127.0.0.1:5307/`: cztery karty; osiem faktycznie pobranych plików, wszystkie **8/8 SHA-256** zgodne z assetami produkcyjnymi. Każdy pobrany JSON wczytany z podglądem, pobraniem kopii ratunkowej i potwierdzeniem. Nagłówki po importach: zestaw, wózek, moduł, Eko. Anulowanie zachowało pusty projekt; odświeżenie zachowało zaimportowane Eko. Pobieranie pozostawia aktywny projekt. Brak błędów konsoli w poprawnej ścieżce.
- Próby błędów na wygenerowanych plikach dist: brak indeksu → komunikat i możliwość ponowienia, przywrócenie indeksu → poprawny katalog; podmieniony Eko JSON → odmowa przez SHA, projekt nadal Eko. Oryginalne assety przywrócono; końcowy build i ponowne pobranie Eko ZIP PASS. Nie modyfikowano źródłowych przykładów w tych próbach.
- Klawiatura zamyka/otwiera katalog Enter. Przy 1280×720 i 390×844 dokument ma szerokość przewijania równą viewportowi, bez poziomego przepełnienia. Przywrócono domyślny viewport. Dowody: `outputs/qa/catalog_7_13_3/ui.json` i zrzuty. Wczesna próba zwykłych linków nie dostarczyła zdarzenia pobrania w IAB (timeout); zastąpiono ją kontrolowanym pobieraniem z SHA i sprawdzono rzeczywiście zapisane bajty.
- Instrukcja MD/HTML/PDF zaktualizowana: **61 stron, 50 ilustracji**, brak brakujących obrazów/sekcji, pustych stron i słów poza granicami, zgodność HTML/MD PASS. Wizualny przegląd renderu stron 1–16 (nowy opis na stronie 3) PASS; osobna kontrola w `outputs/qa/manual_catalog_7_13_3/`. Bez nowej ilustracji; istniejący Pulpit pozostaje ilustracją pustego startu.

## Dalsza praca

7.13.3 wdrożone w powyższym zakresie. Kolejny pakiet powinien wrócić do A2b2b (fizyczne pozycje/ruch w odtwarzaniu) i odbioru C/D, aby przygotowane przykłady dało się odebrać także z transportem i zaopatrzeniem. Pozostałe UI U/X i tutorial 7.14 pozostają osobnymi etapami. Nie potwierdzono nowego wdrożenia Vercel.

Postęp: **61/72 = 84,7%**, pierwsze wydanie **61/68 = 89,7%**; podpakiet nie zwiększa głównego licznika.
