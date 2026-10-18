# 6.3b — autorskie koncepty wyposażenia z inspiracji katalogowej

2026-10-18. Użytkownik wskazał materiały Jabama jako inspirację kilku kategorii, z wyraźnym zakazem kopiowania całości. Przygotowano trzy własne modele: stanowisko z nadbudową, wózek półkowy i regał na części. Źródła kategorii i granice interpretacji: `tools/equipment-editor/concepts/README.md`. Nie pobrano ani nie osadzono zdjęć, tekstur, oznaczeń, modeli producenta lub opisów marketingowych.

## Rezultat i założenia

Każdy model ma `.blend`, `.glb`, własny render PNG i kartę JSON v1. Receptury i skrypty pozwalają odtworzyć je w Blenderze. Galeria i przyciski w edytorze 6.3a wczytują karty do dalszego dopasowania, z ochroną niezapisanych zmian. Gabaryty, liczba elementów, proporcje, kolory i detale są **autorskimi założeniami demonstracyjnymi**, nie wymiarami z katalogu ani stanowisk klienta. Każdy wymiar w JSON ma `basis: assumed` i opis pochodzenia. Licencja produktów, nośność, ESD, zdolność i obsada nie są przenoszone do modeli.

Blender: metry, Z pionowo, +Y przód, początek w środku podstawy. GLB: metry, Y pionowo (konwersja glTF). Karty: mm. Wysokość stanowiska obejmuje nadbudowę; poziom blatu 850 mm jest osobnym założeniem w recepturze i opisie karty. Nie podstawiono wysokości blatu jako wysokości całego modelu.

## Weryfikacja

Backup `backup/v0.4.0_przed_6_3b_inspiracje_20261018`: 363 pliki, SHA256. Odtwarzanie: zachować aktualne dane, odtworzyć potrzebne źródła według manifestu; narzędzie i modele są osobne od projektów użytkownika. Nie nadpisano lokalnej karty `tools/equipment-editor/wyposazenie_karta.json`.

- Blender **5.2.1 LTS**: generacja/export/render 3 modeli PASS. Asercje rzeczywistych obrysów, podłoża i budżetu. Pierwszy przebieg wykazał poszerzenie obrysu regału przez stopy o 20 mm; poprawiono stopy i końcowy przebieg PASS. Skrypt należy uruchamiać z `--python-exit-code 1`, ponieważ Blender może zwrócić 0 przy błędzie Python. Pomocnicze zapisy miniatur poza katalogiem pracy wyłączono.
- `scripts/verify_equipment_concept_blends.py`: niezależne otwarcie zapisanych **3/3 `.blend` PASS** — geometria, wymiary, układ jednostek, Z=0 i metadane założeń.
- `node --test tests/equipmentConcepts.test.mjs tests/equipmentBrief.test.mjs`: **6/6 PASS**. Rzeczywisty GLB odczytany przez `GLTFLoader` Three.js: gabaryty z tolerancją 0,1 mm, konwersja osi, środek podstawy, brak kamery/świateł studia, liczba trójkątów zgodna z raportem; karty poprawne i oznaczone jako założenia. Regresja kontraktu 6.3a również PASS.
- `node tests/qa/verify_6_3a.mjs --concepts`: **Edge CDP PASS** — pełny wcześniejszy odbiór eksportu/importu karty, 3 lokalne rendery, wybór każdego konceptu, brak producenta i zachowane `assumed`, anulowanie zastąpienia, rzeczywiste pobranie JSON konceptu, galeria 1440/600 px bez przepełnienia i wyjątków JS. Test uwzględnia obrazy wczytywane leniwie; pierwsza próba `decode()` przed ich żądaniem została poprawiona. Zrzuty i rendery wizualnie sprawdzone.
- README i podręcznik Markdown/HTML/PDF uzupełniono. Generacja PDF Edge PASS: **34 strony/32 obrazy**. Kontrola Python PASS: brak brakujących obrazów/rozdziałów, pustych stron i tekstu poza stroną. Wizualny odbiór dodanej sekcji na stronach 33–34 PASS; raport/kontaktówka w `outputs/qa/manual_6_3b`.
- Głównego builda/regresji aplikacji nie uruchamiano: źródła głównej aplikacji, model procesu i schematy zapisów nie są zmienione. Testy rzeczywistych GLB przez Three.js i samodzielnego UI obejmują ten pakiet.

| Koncept | Założone X × Y × Z [mm] | Trójkąty | Limit techniczny |
| --- | --- | --- | --- |
| Stanowisko z nadbudową | 1500 × 800 × 1850 | 576 | 5000 |
| Wózek półkowy | 1000 × 600 × 1050 | 508 | 5000 |
| Regał na części | 950 × 450 × 1650 | 1068 | 5000 |

Limit 5000 jest decyzją rozwojową dla tych konceptów, nie obietnicą FPS dużej sceny. Szczegółowe pomiary: `tools/equipment-editor/concepts/verification.json`.

Pakiet koncepcyjny 6.3b odebrany. Główne 6.3 pozostaje w trakcie: nie są to zweryfikowane modele charakterystycznych maszyn/Eko ani integracja ich wyglądu z projektem. Powiązanie wymiennej wizualizacji należy do 6.4. Postęp głównych ID bez zwiększenia: 49/67 = 73,1%, pierwsze wydanie 49/65 = 75,4%. Vercel nie zweryfikowano; narzędzie działa lokalnie.
