# Rejestr zmian Layout Studio Pro 3D v0.3

Data: 27 września 2026. Punktem wyjścia jest lista `to_upgrade.md` i kod wersji v0.2.

## Kopia i powrót do starej wersji

Pełna kopia plików projektu sprzed zmian: `backup/v0.2_20260927_100357`. Zawiera źródła, konfigurację, lockfile, stary build `dist`, przykładowe importy i dokumentację. Pominięto tylko odtwarzalny katalog `node_modules` i sam katalog backupów.

Aby wrócić: zatrzymaj serwer bieżącej aplikacji, otwórz terminal w katalogu kopii, wykonaj `npm ci`, następnie `npm run dev -- --host 127.0.0.1 --port 5190`. To uruchamia kopię niezależnie od nowej wersji. Nie kopiuj starego `node_modules` do nowego projektu. Stara wersja nie ma automatycznego zapisu i zawiera błędy opisane poniżej. Wersja v0.3 używa odrębnego formatu zapisu z numerem schematu 3.

## Realizacja to_upgrade.md

| Obszar | Wdrożone zmiany |
|---|---|
| Zapis | Automatyczny lokalny zapis poprawnych danych po krótkim opóźnieniu; ręczny zapis; stan niezapisanych zmian; czas zapisu; ochrona poprzedniego poprawnego zapisu przed błędnym szkicem; odzyskiwanie uszkodzonego zapisu; ostrzeżenie przy zamykaniu niezapisanej sesji |
| Eksport | Komunikaty z nazwą JSON, DXF i raportów; informacja o folderze pobierania; ostatni eksport JSON w bieżącej sesji |
| Import | Szablony XLSX i CSV procesu oraz BOM; opis kolumn i przykłady; raport odczytanych/pominiętych wierszy; odrzucenie całego importu przy błędach; potwierdzenie zastąpienia danych |
| Walidacja | Dodatnie i skończone czasy, poprawne OEE i kalendarz pracy, unikalne ID, brakujące poprzedniki, cykle, VA+NVA, referencje BOM, ilości i opakowania, wymiary hali i obiektów |
| Prowadzenie | Siedem etapów ze wskaźnikami gotowości; poprzedni/następny etap; osobny start od zera i dwa przykłady; słownik Lean; kontrola błędów dostępna w każdym etapie |
| Edycja | Potwierdzenia usuwania i zastępowania, Cofnij/Ponów do 40 zmian, sortowanie topologiczne, edycja BOM, zachowanie proporcji VA/NVA przy zmianie czasu oraz ręczna zmiana VA |
| Bilans | RPW, LCR, tryb ręczny, jawne statusy stacji, lista przekroczeń, porównanie metod, CSV bilansu, docelowy cykl i zdolność dzienna |
| Hala | Edycja wymiarów i siatki, parametrów stołów i odstępów; przeszkody; ręczne pozycje, wymiary i obrót obiektów; dodatkowe wyposażenie; kontrola kolizji i wyjścia poza halę |
| Symulacja | Nowy model oparty na cyklach stacji, partia, kolejki, WIP, wydajność, oś czasu, pauza/reset, pełne obliczenie partii i CSV harmonogramu |
| Ergonomia | Responsywny nagłówek, przewijane tabele/nawigacja, etykiety kontrolek, czytelne komunikaty, legenda rzutu, dopasowanie 2D/3D, działające przesuwanie prawym przyciskiem w 3D |

## Błędy merytoryczne naprawione poza pierwotną listą

1. Stary algorytm mógł bez końca tworzyć puste stacje dla cyklu zależności lub brakującego poprzednika. Nowy algorytm sprawdza graf przed obliczeniami i kończy się komunikatem błędu.
2. Pusty proces zwracał jedną stację i 100% sprawności. Teraz zwraca zero stacji i 0%.
3. Wybrana metoda bilansowania mogła być zastępowana przez automatyczne przeliczenie RPW. Metoda jest teraz częścią projektu i wszystkich obliczeń.
4. Takt klienta był mieszany z efektywnym cyklem po OEE. Oba wyniki są teraz osobnymi wartościami z opisanym wzorem; usunięto zaokrąglanie popytu przed obliczeniami.
5. Układ L używał tego samego algorytmu co liniowy. Nowy generator ma odrębne geometrie U, L i liniową oraz wejście i wyjście w każdym układzie.
6. Automatyczny układ jest ponownie liczony także po zmianie hali i ustawień generatora. Ręczny layout pozostaje zachowany; niezgodność liczby stołów ze stanowiskami jest zgłaszana.
7. Poprzednia symulacja poruszała wyroby z arbitralnymi opóźnieniami, niezależnie od czasów operacji. Nowa symulacja liczy terminy rozpoczęcia i zakończenia każdej sztuki na każdym stanowisku. Prędkość odtwarzania nie zmienia wyniku inżynierskiego.
8. DXF pomijał obrót i przeszkody. Teraz eksportuje obrócone kontury, warstwę OBSTACLES, jednostki mm i układ osi zgodny z rzutem.
9. Importer mógł rozpoznawać NVA jako VA, zamieniać zerowy koszt na wartość domyślną oraz nie rozpoznawać pojemnika Pallet w swoim własnym eksporcie. Testy obejmują pełny eksport/import tych pól.
10. Spaghetti używało nieopisanego mnożnika 1,4 i stałych 250 dni. Odległość jest teraz geometryczna, między środkami obiektów, a rok wynika z kalendarza projektu.
11. Widok 3D zwalnia geometrię, materiały, sterowanie i renderer przy zamknięciu; rozmiar jest obserwowany przez ResizeObserver.

## Rozszerzenia

- Warianty projektów w lokalnej bibliotece (do 20), porównanie celu, liczby stacji i sprawności, eksport każdego wariantu do JSON.
- Ręczne przypisanie operacji do stanowisk z kontrolą następstwa i ciągłości numeracji.
- Zapotrzebowanie materiałowe na dzień i liczba pełnych opakowań na zmianę.
- Wybór waluty PLN/EUR/USD; zmiana oznaczenia nie wykonuje przewalutowania cen.
- Raport inżynierski Markdown i widok do druku/PDF przeglądarki.
- Produkcyjny lokalny serwer statyczny `npm start`, serwujący wyłącznie `dist`, oraz launcher `Uruchom_Layout_Studio_v0.3.bat`.
- Aktualizacja bibliotek, ograniczenie serwera do 127.0.0.1, brak zewnętrznych fontów i ochrona pobierania arkuszy przed interpretacją tekstów jako formuł.
- Testy regresji uruchamiane przez `npm test`.

## Zmiana zachowania i zgodność

- Układ ekranów został przebudowany. Edytor hali i CAD to etap 5, 3D i symulacja to etap 6, raport to etap 7. Stara instrukcja DOCX dotyczy v0.2; aktualny opis zawiera `FUNKCJE_PROGRAMU.md`.
- Stare projekty JSON z poprawnymi danymi są migrowane przy imporcie. Błędne dane nie są automatycznie „naprawiane” przez podstawienie przypadkowych liczb.
- Stare widoki pozostawiono w źródłach jako materiał odniesienia; działający interfejs używa `src/components/studio` i nowego `src/App.tsx`. Kopia w backupie jest kompletną, spójną starą wersją.
- Pozorowany tryb nieskończonej animacji zastąpiono sprawdzalnymi partiami od 1 do 10000 sztuk, z możliwością natychmiastowego obliczenia całej partii.
- Animacja kart stanowisk pokazuje obróbkę i kolejki; 3D przedstawia geometrię i ścieżkę. Produkty nie przemieszczają się w 3D według fikcyjnej prędkości.
- Automatyczny layout jest propozycją przestrzenną. Raport kolizji nie oznacza automatycznej optymalizacji przejść lub zgodności z normami.

## Zakres komercyjnego zastosowania

Ta wersja jest lokalnym narzędziem do projektowania i analiz deterministycznych. Nie ma serwera kont, płatności, zarządzania licencjami ani współdzielenia zespołowego. Nie została oznaczona jako gotowy SaaS. Sprzedaż i wdrożenie wymagają ustalenia modelu dystrybucji, warunków licencji własnego produktu, odbioru na rzeczywistych danych i utrzymania wybranego środowiska. Szczegółowe ograniczenia modelu i procedura weryfikacji są w `FUNKCJE_PROGRAMU.md` i `WERYFIKACJA_v0.3.md`.

Źródła aktualizacji zależności: [oficjalna instalacja SheetJS](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/), [polityka wydań Vite](https://vite.dev/releases). Wersje faktycznie zainstalowane zapisane są w `package-lock.json`.
