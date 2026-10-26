# 6.4 — wygląd wyposażenia i niezależność technologii

`LayoutObject.visualModelId?` wybiera jeden z trzech wbudowanych autorskich konceptów 6.3b. Brak pola oznacza dotychczasowy generator według `LayoutObject.type`. Zapisuje się wyłącznie ID, bez adresów URL, geometrii Three.js i zewnętrznych plików. Nie jest to import STEP/GLB (8.4) ani konfigurator części (8.3).

## Kontrakt

- `type`, `workstationId`, ID obiektu, geometria w mm, strefy i parametry technologiczne pozostają niezależne od `visualModelId`. Wybór wyglądu wózka dla obiektu stołu **nie zmienia jego roli technologicznej** ani liczby kopii stanowiska. UI wyświetla dotychczasowy typ obiektu i wyjaśnia tę zasadę.
- Akcja `applyEquipmentAppearance` modyfikuje wyłącznie opcjonalne ID wyglądu. Nie przełącza automatycznego layoutu na ręczny, nie nadaje kompetencji, zdolności, czasów, zasobów, prędkości, pojemności lub rezerwacji.
- W automatycznym layoucie wybory są przenoszone na wygenerowane obiekty o tych samych ID, bez przenoszenia starych gabarytów lub przypisań. Obiekt o usuniętym ID nie otrzymuje domyślnego zastępcy. W innych ścieżkach jawne ponowne wygenerowanie geometrii może zastąpić metadane razem z obiektami; nie zgadujemy tożsamości nowych obiektów.
- Parser 4 odrzuca nieznane wartości `visualModelId`; walidacja jest współdzielona przez parsery 5/6. Pole jest opcjonalnym rozszerzeniem kompatybilnego zapisu, bez migracji danych starych projektów. Starsze projekty zachowują dotychczasowy renderer; starszy kod bez obsługi pola nie odtwarza konceptu, ale ma geometrię i technologiczny typ obiektu. Oryginalne dane migracji pozostają chronione istniejącym mechanizmem.

## Renderowanie

`scripts/generate_concept_render_assets.mjs` odczytuje zweryfikowane GLB 6.3b i generuje trzy wbudowane definicje ObjectLoader w `src/core/equipment/visualAssets`. To dane kompilowane z własnych assetów, nigdy JSON importowany z projektu użytkownika. Wspólny `createParametricEquipmentGroup` renderuje wybrany koncept w obu konsumentach (`Scene`, `Factory3DView`) lub dotychczasowy model przy braku wyboru. Nakładki stref/portów/kolizji nadal korzystają z istniejącego typu i standardu, a nie z kształtu nowej siatki.

Koncept ma jednolitą skalę we wszystkich osiach: mieści się w zapisanych gabarytach X/Y/Z, zachowuje proporcje, środek podstawy i poziom podparcia. Front Blender +Y po eksporcie glTF jest -Z; w rendererze obrócono go do kierunku +Z (hall Y). Może pozostawać wolne miejsce w obrysie — zapisany obrys fizyczny nie jest zmniejszany do siatki. Wybór wysokiego stanowiska z nadbudową dla obiektu o wysokości 850 mm zmniejsza całą wizualizację; **nie podnosi samowolnie fizycznej wysokości do 1850 mm**. Aby zmienić dane geometryczne, trzeba jawnie użyć dotychczasowej edycji geometrii; to odrębna czynność z możliwym wpływem na modelowane trasy.

Każda instancja renderera ma osobne geometrie/materiały; usunięcie sceny nie zwalnia zasobów innej instancji lub szablonu w pamięci. Modele są w pakiecie aplikacji, bez osobnego pobierania ze stron dostawców. Dodają około 62 kB gzip do obecnego pakietu sceny; nadal istnieje ostrzeżenie Vite o dużych chunkach. Nie deklarujemy odbioru wydajności większych scen (6.7).

## Obsługa i granice

W aktywnym edytorze projektu 4 wybierz zapisane wyposażenie w 2D lub 3D, wskaż model w sekcji **Wygląd wyposażenia**, zatwierdź **Zastosuj wygląd**. Sam wybór w polu nie zapisuje projektu. Działa wspólna historia oraz zapis/ponowny odczyt. Opcja **Generowany według typu obiektu** usuwa wybór konceptu. Nowe, jeszcze niezapisane wyposażenie trzeba najpierw dodać do projektu.

Formularz zmienia wygląd zapisanego obiektu i odświeża formularze z historii projektu; nie zatwierdza równocześnie niezapisanych zmian jego wymiarów. Przy niezapisanych zmianach obiektu przycisk zmiany wyglądu jest zablokowany z instrukcją zapisania/anulowania, chroniąc formularz przed utratą. Warsztat v5 zachowuje metadane i wspólny renderer je odczytuje, ale jego dotychczasowy podgląd 3D pozostaje tylko do odczytu. Nie dodano edytora wizualizacji do paneli domenowych szkicu 6.

Koncepty są wizualnymi założeniami, nie potwierdzeniem wyglądu rzeczywistej maszyny. 6.3 w zakresie referencyjnych maszyn/Eko pozostaje otwarte. Parametryczna zmiana blatu, półek i konstrukcji jest osobnym 8.3; import CAD osobnym 8.4.
