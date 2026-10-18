# Autorskie koncepty wyposażenia — 6.3b

Trzy modele demonstracyjne zaprojektowane dla Layout Studio w Blenderze 5.2.1 LTS. Inspiracja ogólnymi kategoriami wyposażenia dostępnymi w ofercie Jabama, zgodnie z decyzją użytkownika z 2026-10-18. Nie są to modele produktów producenta, skany ani wyposażenie zinwentaryzowane u klienta. Nie użyto jego zdjęć, tekstur, geometrii, oznaczeń ani materiałów CAD.

## Źródła inspiracji (sprawdzono 2026-10-18)

- [Stanowisko montażowe](https://jabama.pl/stol-montazowy-z-centralnym-oswietleniem-polka-tylna-scianka-i-szafka-z-trzema-szufladami-smpk1c): ogólna idea stołu z nadbudową i miejscem na narzędzia. Koncept ma własną kompozycję elementów i proporcje.
- [Wózek półkowy](https://jabama.pl/wozek-z-regulowanym-blatem-wer-01-02-dwie-polki): kategoria mobilnych powierzchni odkładania. Nasz koncept ma trzy poziomy, własną ramę i uchwyt; nie przypisano mu parametrów produktu źródłowego.
- [Regał na części](https://jabama.pl/pl/p/-Regal-z-pojemnikami-RP1800-jednostronny-1800x1000x400/792): idea organizacji drobnych części w otwartych pojemnikach. Własny układ czterech rzędów, bez deklarowania pojemności/nośności. Na stronie sprzedawcy ten produkt jest oznaczony jako „Inny producent”; nie przedstawiamy go jako konstrukcji Jabama.

Strony traktujemy wyłącznie jako inspirację kategorii. Gabaryty, liczby części i ich proporcje w `recipes.json` są **autorskimi założeniami demonstracyjnymi**, nie pomiarami ani wymiarami zaczerpniętymi z kart katalogowych. Nie deklarujemy ESD, certyfikacji, nośności, regulacji, obsady lub możliwości technologicznych. W przyszłym projekcie trzeba je zastąpić jawnymi danymi użytkownika. Źródłowe strony nie udzielają przez samo wskazanie prawa do kopiowania ich materiałów; żaden taki materiał nie jest osadzony w pakiecie.

## Pliki

Każdy `concept-*.blend` to edytowalna scena źródłowa z autorską geometrią i studiem do renderu. `concept-*.glb` zawiera wyłącznie wyposażenie, bez kamery i oświetlenia studia. `concept-*.png` to własny render. `concept-*.json` jest kartą zgodną z edytorem 6.3a; wszystkie wymiary zachowują `basis: assumed`. Możesz otworzyć galerię w nadrzędnym `index.html`, wczytać kartę i wyeksportować własną wersję.

Układ źródłowy Blender: metry, Z pionowo, +Y jako przód, punkt bazowy w środku podstawy na Z=0. GLB ma zgodny ze standardem glTF układ Y do góry i jednostkę metr. Karty podają wymiary w mm; wysokość stanowiska obejmuje całą nadbudowę, a blat demonstracyjny jest na poziomie 850 mm. Nie skaluj ich jak plików zapisanych w milimetrach.

Budżet rozwojowy wynosi 5000 trójkątów na koncept (wybrany limit techniczny, nie pomiar wydajności). `verification.json` zawiera rzeczywiste gabaryty, kontakt z podłożem, liczbę trójkątów i rozmiary plików. Niezależny test odczytuje GLB przez Three.js i weryfikuje skale, osie, budżet oraz metadane karty.

Odtwarzanie dla programisty:

```
blender --background --factory-startup --python-exit-code 1 --python scripts/build_equipment_concepts.py
node scripts/generate_equipment_concept_cards.mjs
node --test tests/equipmentConcepts.test.mjs tests/equipmentBrief.test.mjs
node tests/qa/verify_6_3a.mjs --concepts
```

`--python-exit-code 1` jest konieczne: Blender domyślnie może zakończyć proces kodem 0 mimo błędu skryptu Python. Generatory nadpisują wyłącznie pliki konceptów o stałych nazwach w tym katalogu. Zmiany ręcznie edytowane w `.blend` zachowaj pod inną nazwą przed ponowną generacją.

Koncepty są udostępnione w pomocniczym edytorze. Nie są automatycznie wstawiane do projektów 4/5/6. W 6.4 dodano ręczny wybór ich wyglądu dla zapisanego wyposażenia w aktywnym edytorze, bez zmiany typu/roli/gabarytów; renderer mieści model w obrysie z zachowaniem proporcji. Kontrakt: `MODEL_WYGLADU_WYPOSAZENIA_6_4.md` w katalogu projektu. Kompilacja assetów aplikacji po zmianie GLB: `node scripts/generate_concept_render_assets.mjs`. Główne 6.3 pozostaje w trakcie w zakresie charakterystycznych maszyn/Eko i docelowego odbioru.
