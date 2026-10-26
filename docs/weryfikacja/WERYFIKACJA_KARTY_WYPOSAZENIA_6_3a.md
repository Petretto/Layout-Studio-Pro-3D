# 6.3a — pomocnicza karta wyposażenia i szablon JSON

2026-10-18. Użytkownik nie ma jeszcze referencji modeli Eko/maszyn; zamówił prosty edytor z eksportem danych do późniejszego modelowania. Pakiet pomocniczy gotowy. Główne 6.3 pozostaje **w trakcie**: nie wykonano modeli charakterystycznych w Blenderze ani pomiaru ich skali/budżetu.

## Rezultat i kontrakt

`tools/equipment-editor/index.html` działa samodzielnie przez `file://` w Edge/Chrome. Zapisuje nazwę/ID, typ, producenta/model, wymiary X/Y/Z i poziom podstawy w mm z osobnym pochodzeniem/źródłem, punkt bazowy, opis charakterystycznego wyglądu, opcjonalny kolor/budżet, referencje i uprawnienia. Pokazuje prostokątny obrys X/Y i listę braków. Eksport/import JSON, pusty szablon i podgląd danych; brak automatycznego zapisu i połączeń sieciowych. Ostrzega przed opuszczeniem niezapisanej karty i wymaga potwierdzenia jej zastąpienia przy poprawnym imporcie.

Nieznane liczby pozostają `null`; zero podstawy jest jawne. Niekompletny szkic można zapisać, błędne liczby są odrzucane. Pochodzenie rozróżnia brak danych, pomiar, potwierdzenie, katalog i założenie. Kompletność nie potwierdza geometrii/licencji/BHP. Referencje są lokalizacjami, bez zawartości zdjęć/CAD — materiały przekazuje się osobno.

`equipmentStandard.ts` dostarcza terminologii, jednostek i typów. Generator katalogu tworzy snapshot 15 standardowych typów/nazw, bez przykładowych wymiarów. `parametricEquipmentModels.ts` generuje wygląd z gabarytów/koloru i własnych stałych/proporcji; nie jest źródłem pomiarów konkretnej maszyny ani pełnym modelem edycji detali. Karta pomoże ocenić, czy generator wystarczy, czy potrzebny jest Blender; nie wywołuje go i nie obiecuje wiernego podglądu 3D.

Osobny format `layout-equipment-modeling-brief` v1, bez zmian ProjectData, zapisów 4/5/6, stanowisk, zdolności, czasów, tras i rezerwacji. Brak migracji aplikacji. Mapowanie do modelu jest osobną pracą po uzyskaniu danych. Import odrzuca obce wersje, nieznane pola i błędną strukturę zamiast gubić dane; błąd pozostawia bieżący formularz. Limity: 1 MB pliku, 100 referencji. Opis części jest tekstowy, bez edycji siatki.

Backup `backup/v0.4.0_przed_6_3a_edytor_20261018`: 351 plików, SHA256 PASS. Odtwarzanie: zachować obecne źródła/dane i przywrócić potrzebne pliki według manifestu backupu. Narzędzie ma osobny katalog i nie zmienia zapisu aplikacji.

## Wykonane sprawdzenia

- Generacja katalogu i pustego szablonu PASS.
- `node --test tests/equipmentBrief.test.mjs`: **3/3 PASS** — brak wymyślonych wartości, roundtrip źródeł/założeń/referencji, potwierdzone zero, odmowy błędnych typów/wersji/jednostek/liczb i nieznanych pól, brak mutacji po odmowie.
- `node tests/qa/verify_6_3a.mjs`: **Edge CDP PASS**, rzeczywisty lokalny `file://` — formularz, typ bez domyślnych wymiarów, lista braków, pobranie JSON i porównanie rzeczywistego pliku z formularzem, pusty szablon bez utraty karty, import roundtrip, odmowa złej wersji, anulowanie i potwierdzenie zastąpienia niezapisanej karty, odrzucenie ujemnego wymiaru, 1440/600 px bez poziomego przepełnienia i wyjątków JS. Zrzuty wizualnie sprawdzone; dane wyłącznie syntetyczne.
- Głównego builda/regresji aplikacji nie uruchamiano: zmiany są samodzielnym narzędziem HTML/JS poza aplikacją. Kontrakt i rzeczywiste ścieżki UI sprawdzono powyżej.
- README narzędzia i podręcznik Markdown (rozdział 5) z pochodnymi HTML/PDF uzupełnione. HTML/PDF Edge PASS (31 obrazów). Python `scripts/verify_manual.py outputs/qa/manual_6_3a`: 33 strony/31 obrazów, brak brakujących obrazów/rozdziałów, pustych stron i tekstu poza stroną. Wizualny odbiór dodanej strony 33 PASS; pozostałe sekcje źródła bez edycji. Raport i kontaktówka strony 33 w `outputs/qa/manual_6_3a`.

Modeli Blender i publikacji Vercel nie wykonano. Postęp głównych ID bez zwiększenia: 49/67 = 73,1%, pierwsze wydanie 49/65 = 75,4%. Następny krok: uzupełniona karta i materiały referencyjne.
