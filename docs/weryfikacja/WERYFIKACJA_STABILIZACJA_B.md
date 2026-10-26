# Stabilizacja — pakiet B: odbiór ścieżki użytkownika

Rozpoczęcie: 2026-09-29. Kontynuacja: 2026-09-30. Wersja: 0.4.0 po pakiecie A; schemat JSON 4.

## Środowisko i zakres

Wbudowana przeglądarka, adres `http://127.0.0.1:4193/`, projekt `QA pakiet B — Eko`. Zaczęto od pustego projektu. Dane na portach 4173 i 4192 oraz źródłowe pliki XLSX pozostają poza zakresem zmian.

Pakiet odbiorowy kroków 1.2.2, 1.3.1 i 1.3.4. Do sprawdzania rzeczywistego interfejsu używana jest umiejętność computer-use. Wyniki obliczeń odczytywane są z interfejsu, bez modyfikowania ukrytego stanu aplikacji.

W tym podetapie nie zmieniono kodu aplikacji ani danych XLSX. Zaktualizowano dokumentację postępu i wykonano ponowny build. Zachowana kopia bazowa: `backup/v0.4.0_przed_stabilizacja_20260929_225906`.

## Scenariusze i postęp odbioru

| ID | Scenariusz | Wynik |
| --- | --- | --- |
| B01 | Pusty projekt, nazwa QA, popyt 1500 szt./rok, 250 dni, jedna zmiana 8 h, przerwa 30 min, OEE 90% | Poprawnie; cel cyklu 4050 s |
| B02 | Szkic niezapisanej operacji, import `tests/Test Eko.xlsx`, potwierdzenie | 16 operacji, 0 błędów; ID i nazwa w formularzu po imporcie puste |
| B03 | Szkic niezapisanego materiału, import `tests/Test Eko BOM.xlsx`, potwierdzenie | 60 materiałów, 0 błędów; numer części i nazwa w formularzu po imporcie puste |
| B04 | Bilans RPW po imporcie | 7 stanowisk, 90,12% sprawności, odstęp wąskiego gardła 3960 s; 0 błędów i ostrzeżeń |
| B05 | Każda operacja na osobnym stanowisku | Ręczny bilans: 16 stanowisk, 39,43% sprawności, odstęp 3590 s; przypisania WS-1–WS-16 |
| B06 | Usunięcie OP11, ciągłość stanowisk, zachowanie BOM, Cofnij/Ponów i przywrócenie | Poprawnie: 16 → 15 stanowisk bez luk, formularz wyczyszczony, 60 materiałów zachowane i 5 oczekiwanych błędów referencji EKO-OP11-01–05; Cofnij → 16, Ponów → 15, ostateczne Cofnij → 16 i 0 błędów. Projekt zapisany z przywróconą OP11 |
| B07 | Layout z procesu, hala, edycja i kontrola geometrii | Poprawnie: hala 40000 × 40000 × 6000 mm, siatka 100 mm, ProcessFlow; zmiana X pierwszego stołu 10350 → 10800 i obrotu 0 → 15°, zapis przełącza tryb na ręczny i daje 1 ostrzeżenie; Cofnij przywraca pozycję i 0 ostrzeżeń |
| B08 | Symulacja testowej partii | Poprawnie: 3 sztuki, odstęp 4050 s, koniec 21170 s, ukończone 3/3, WIP 0, średnio 0,51 szt./h; wynik powtórzony po przeładowaniu projektu |
| B09 | Raport i eksport kompletnego projektu JSON | Poprawnie: raport zawiera 16 stanowisk, 39,43%, BOM 3168,66 PLN, halę 40 × 40 m. Rzeczywisty eksport JSON z 30.09 o 18:38:58 zapisany na dysku: 42836 bajtów, schemat 4, 50 obiektów layoutu |
| B10 | Zapis lokalny, przeładowanie i odtworzenie projektu z JSON | Poprawnie: po zmianie nazwy projektu import rzeczywistego eksportu przywrócił nazwę QA, 16 operacji, 60 materiałów, 16 stacji i pracochłonność 25550 s/szt.; 0 błędów/ostrzeżeń. Ponowna symulacja: 3/3, WIP 0, 21170 s |
| B11 | Wczytanie arkusza procesu jako BOM | Import odrzucony: brak wymaganych kolumn BOM; 16 wierszy nieprzyjętych, dotychczasowe 60 materiałów zachowane |
| B12 | Próba dodania OP21 jako poprzednika OP10 oraz próba nieistniejącego poprzednika | Oba zapisy odrzucone czytelnym błędem. Wiersz OP10 pozostaje bez poprzednika; po anulowaniu formularza proces jest nadal poprawny |

Kwota BOM pokazana w UI: 3168,66 PLN/szt. Dotyczy 60 materiałów testowych, nie kosztorysu zatwierdzonego technologicznie. Import zachował zależności, w tym OP24/OP25 → OP19, niezależnie od numeracji ID. Cztery nowe etapy montażu nadal mają jawnie przykładowe czasy.

## Testy automatyczne

2026-09-30: `npm test` — 40/40; `npm run build` — TypeScript i Vite zakończone poprawnie. Odczyt konsoli przeglądarki po testach: brak zarejestrowanych błędów i ostrzeżeń.

## Weryfikacja eksportu JSON — zamknięta 2026-09-30

Kliknięto „Kompletny projekt JSON” na stronie raportu. Aplikacja pokazała komunikat przekazania `QA pakiet B — Eko.json` do pobrania i czas eksportu w sesji. Oczekiwanie na zdarzenie pobrania w narzędziu przeglądarkowym zakończyło się timeoutem po 10 s. Nie znaleziono pliku o tej nazwie w standardowym katalogu Downloads. W dostępnej automatyzacji jest wyłącznie wbudowana przeglądarka; brak podłączonej drugiej przeglądarki do porównania.

Powyższy opis dotyczy pierwszej próby. W diagnostyce syntetyczny Blob zapisał się na dysku mimo timeoutu zdarzenia narzędzia. Po ponownym uruchomieniu środowiska pobranie rzeczywistego projektu zakończyło się poprawnie. Nie ustalono przyczyny wcześniejszego braku pliku; nie ma podstaw do przypisania go kodowi eksportu, którego nie zmieniono.

Zachowano dokładną kopię pobranego pliku: `tests/qa/Eko_B_export_20260930_183858.json`. SHA256: `898AA6AF1C5A3B4478C916492C2D93F265399042DEEF81D5DB9FA90E30E7F2E4`. Przed importem zmieniono nazwę na „QA nazwa przed odtworzeniem”; import przywrócił „QA pakiet B — Eko”. UI potwierdził walidację i poprawne liczniki. Obliczenie partii po imporcie odtworzyło wynik 21170 s. Plik nie był konstruowany ręcznie ani pozyskiwany z ukrytego stanu przeglądarki.

Narzędzia diagnostyczne `scripts/download-probe.mjs` i `tests/download-probe.html` operują wyłącznie syntetycznym JSON-em; nie należą do produkcyjnego buildu i nie czytają projektu.

## Dowód i stan sesji

- Zrzut wyniku: `Instrukcja/stabilizacja_B_symulacja.png`.
- Projekt testowy pozostał na porcie 4193, z pełnymi 16 operacjami i 60 materiałami; OP11 została po teście przywrócona.
- Zrzut po pełnym eksporcie/importowaniu: `Instrukcja/stabilizacja_B_odtworzenie.png`.
- Edycja geometrii cofnięta; layout jest automatyczny. Błędne próby importu i zależności nie zmieniły danych.
- Końcowy ekran: pulpit odtworzonego i zapisanego projektu. Przed powrotem na pulpit ukończono partię 3 sztuk. Parametry odtwarzania symulacji są stanem sesji widoku, nie wynikiem zapisanym w projekcie. Końcowy odczyt konsoli: brak błędów i ostrzeżeń.

## Kolejny mały podetap

1. Rozpocząć osobny pakiet 1.4: wybór i przeciąganie wyposażenia myszą w 3D, synchronizacja 2D–3D oraz Cofnij/Ponów.
2. Przed ewentualną przebudową modułu wykonać nowy backup; zachować eksport QA jako punkt odniesienia.

## Warunki zamknięcia

Pakiet B zakończony: B01–B12 sprawdzone; kroki 1.2, 1.2.2, 1.3 i 1.3.1 otrzymują status wdrożone. Nie oznacza to ukończenia całego etapu 1. Przeciąganie myszą w 3D należy do następnego, osobnego pakietu 1.4. Wynik eksportu potwierdzono w dostępnej wbudowanej przeglądarce, nie we wszystkich przeglądarkach docelowego wydania.
