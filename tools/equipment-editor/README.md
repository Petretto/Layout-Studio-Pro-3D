# Pomocniczy edytor karty wyposażenia — 6.3a

Otwórz `index.html` w Edge/Chrome, także bez serwera i internetu. Nie wymaga npm ani uruchomienia głównej aplikacji. Uzupełnij znane pola i wybierz **Pobierz JSON**. Aby wrócić do pracy, użyj **Wczytaj kartę JSON**. Nie ma automatycznego zapisu; niezapisana karta wyświetla ostrzeżenie przy opuszczaniu strony. Pusty plik do ręcznego wypełnienia: `szablon_wyposazenia.json` (dostępny również przez przycisk).

W sekcji **Trzy autorskie koncepty wyposażenia — inspiracje Jabama** dostępne są własne modele stanowiska montażowego, wózka półkowego i regału na części. Przycisk **Użyj karty koncepcyjnej** ładuje edytowalny przykład z jawnymi założeniami demonstracyjnymi. Są też pliki Blender, GLB i JSON oraz odnośnik do strony inspiracji. To nie są produkty producenta ani parametry Twojej linii. Szczegóły: `concepts/README.md`. Wczytanie konceptu chroni niezapisane zmiany potwierdzeniem; po dopasowaniu pobierz własny JSON.

## Niezbędne dane

- ID i nazwa, opcjonalnie producent i model; najbliższy typ aplikacji albo model indywidualny.
- Szerokość X, głębokość Y i wysokość Z w mm. Każda wartość ma osobne pochodzenie i źródło/opis założenia.
- Punkt bazowy i poziom podstawy nad posadzką. Wpisanie potwierdzonego 0 jest czymś innym niż pusty wymiar. Konwencja karty: mm, Z pionowo, przód +Y; opisz, która strona maszyny jest przodem. Punkt bazowy ma te same nazwy co standard 6.1.
- Opis charakterystycznych elementów, ich znanych wymiarów i lokalizacji oraz odnośniki do zdjęć/rysunków/CAD.
- Informacja o licencji lub uprawnieniach do wykorzystania materiałów; można pozostawić nieustalone i wrócić później.

Kolor, budżet trójkątów i notatki o dostępie/porcie są opcjonalne. Dodatkowe części maszyny opisuj w polu charakterystycznego wyglądu lub na rysunku. Edytor nie jest programem CAD i nie zastępuje referencji potrzebnych do wiernego odwzorowania.

Puste liczby są zapisywane jako `null`, a nie zero. Dane przykładowe nie są wstawiane automatycznie. Można wyeksportować niekompletny szkic, ale nie ujemne gabaryty, błędne liczby czy nieobsługiwaną strukturę. Lista braków pomaga uzupełniać kartę; jej wyzerowanie nie potwierdza pomiarów ani praw do materiałów. Opis założenia jest wymagany także wtedy, gdy wymiar jest przybliżony.

JSON zawiera **lokalizacje referencji, bez ich zawartości**. Gdy przekazujesz kartę do wykonania modelu, przekaż osobno wskazane zdjęcia/rysunki. Lokalna ścieżka na Twoim komputerze nie daje innemu odbiorcy dostępu do pliku. Edytor nie pobiera adresów i nie wysyła danych.

## Relacja z istniejącym kodem

`equipmentStandard.ts` jest źródłem typów, terminologii, jednostek, punktu bazowego i metadanych. `catalog.js` zawiera wyłącznie nazwy/typy z rejestru, bez wymiarów katalogowych. Regeneracja dla programisty: `node scripts/generate_equipment_editor_catalog.mjs`.

`parametricEquipmentModels.ts` to generator wizualizacji: przyjmuje gabaryty i kolor obiektu, ale wiele szczegółów generuje ze stałych/proporcji. Nie jest źródłem pomiarów Eko ani konfiguratorem wszystkich części maszyny. Wybór typu w karcie pomaga później ocenić, czy generator wystarczy, czy potrzebny będzie model charakterystyczny w Blenderze. Narzędzie nie wywołuje generatora i nie obiecuje wiernego podglądu 3D. Pokazuje jedynie prostokątny obrys X/Y.

Karta ma osobny format `kind: layout-equipment-modeling-brief`, `version: 1`. Nie jest `ProjectData`, `LayoutObject` ani gotowym `EquipmentStandardSpec`. Nie importuj jej jako projektu aplikacji. Nie tworzy stanowisk, zdolności, czasów, rezerwacji, stref ani portów symulacji. Późniejsze mapowanie do modelu/standardu wymaga sprawdzenia referencji i jawnych wartości; brakujące parametry nie zostaną odgadnięte.

Importer sprawdza wersję, strukturę, jednostki i wartości, odrzuca nieznane pola zamiast je po cichu zgubić; błędny import pozostawia obecną kartę. Limit pliku 1 MB, 100 referencji; obrazy nie są osadzane w JSON. Wersja 1 przyjmuje jeden wspólny kolor i tekstowy opis części, bez edycji siatki 3D.

Pliki dla programisty: `brief.js` — kontrakt i walidacja, `editor.js` — UI, `index.html` — lokalna strona. Szablon odtwarza `node scripts/generate_equipment_brief_template.mjs`. Test kontraktu: `node --test tests/equipmentBrief.test.mjs`.
