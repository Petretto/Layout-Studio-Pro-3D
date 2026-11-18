# Dane w aplikacji webowej — projekt informacji dla V1

Stan dla gałęzi remediacyjnej P4a. Przed publikacją informację trzeba dopasować do ustawień hostingu i rzeczywistego wydania.

| Czynność | Co robi aplikacja | Dowód lub granica |
|---|---|---|
| Otwarcie aplikacji | Przeglądarka pobiera HTML, skrypty, style i potrzebne zasoby z adresu aplikacji. Hosting obsługuje żądania HTTP. | W lokalnym teście zasoby pochodziły z tego samego adresu co aplikacja. Dane techniczne i retencja logów na docelowym hostingu wymagają potwierdzenia. |
| Otwieranie przykładu lub licencji | Przeglądarka pobiera opublikowane pliki katalogu i licencji z adresu aplikacji. | Sprawdzono lokalnie rzeczywiste odpowiedzi HTTP i zawartość. |
| Praca nad projektem | Edycja, import plików i obliczenia działają w przeglądarce. Zapisy są związane z adresem aplikacji i profilem przeglądarki. Eksport i kopia zapisują plik na urządzeniu użytkownika. | W Edge przetestowano syntetyczną nazwę projektu, import i eksport XLSX, dwie karty i oddzielny adres. Pełna macierz transmisji i test docelowego wdrożenia pozostają otwarte. |
| Statystyki użycia | Build P4a nie uruchamia biblioteki Vercel Analytics. | Kontrola modułów i lokalny pomiar żądań. Ponowne włączenie wymaga osobnej decyzji, sprawdzenia danych i informacji dla użytkownika. |

Przed wyczyszczeniem danych witryny, zmianą przeglądarki lub zmianą adresu aplikacji pobierz pełną kopię i upewnij się, że jest dostępna na dysku. Jeśli przeglądarka blokuje pamięć, sprawdź jej ustawienia przed przywracaniem. Jeśli podczas zmiany wersji nie otwiera się widok 3D, zapisz projekt lub pobierz JSON przed odświeżeniem. Pełna kopia środowiska zawiera także obszary, których nie obejmuje pojedynczy eksport JSON projektu.

Przed publikacją właściciel powinien potwierdzić podmiot odpowiedzialny, dane kontaktowe, ustawienia dostawcy, cele i okres retencji logów. Właściwa osoba ocenia role stron, podstawę, obowiązki informacyjne, transfery oraz ewentualne zgody na podstawie faktycznej konfiguracji.

[Raport techniczny P4a](../weryfikacja/WERYFIKACJA_P4A_WEB_VITE.md)
