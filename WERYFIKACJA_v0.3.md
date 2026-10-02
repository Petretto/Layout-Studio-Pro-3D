# Weryfikacja Layout Studio Pro 3D v0.3

Data: 27.09.2026. Status: wdrożona lokalna wersja v0.3; poniższy zakres sprawdzony. Nie jest to certyfikat gotowości do sprzedaży ani odbiór rzeczywistej linii produkcyjnej.

## Kontrole automatyczne

- `npm test`: 16 testów zaliczonych, 0 błędów.
- `npm run build`: TypeScript i build Vite zakończone poprawnie.
- `npm audit --omit=optional`: 0 zgłoszonych podatności. Jest to wynik bazy audytu w dniu sprawdzenia, nie pełny audyt bezpieczeństwa.
- Testy obejmują takt/OEE, błędne grafy, RPW/LCR i ręczny przydział, przekroczenia cyklu, pusty proces, sortowanie, kolejki i harmonogram symulacji, trzy geometrie układu, obrócone kolizje i DXF, migrację JSON, eksport/import arkuszy oraz dołączone CSV.

## Kontrola interfejsu na buildzie produkcyjnym

Adres: `http://127.0.0.1:4173`. Projekt kontrolny: „Test odbiorczy 0.3”. Dane są syntetyczne.

1. Utworzono projekt od zera i potwierdzono zastąpienie przykładu.
2. Ustawiono 405000 szt./rok, 250 dni, 2 zmiany po 8 godzin, 30 minut przerw i OEE 90%. Cel cyklu: 30 s.
3. Dodano OP10 Przygotowanie 20 s, OP20 Montaż 25 s oraz OP30 Kontrola 10 s, z zależnościami OP10 → OP20 → OP30.
4. Próba zapisania OP20 z poprzednikiem BRAK została odrzucona z jednoznacznym komunikatem; istniejące operacje pozostały w tabeli. Zmiana czasu OP10 zachowała proporcję VA/NVA: 17/3 s.
5. Dodano materiał P01 Obudowa, 1 szt./wyrób, opakowanie 20 szt., koszt 12 PLN, przypisanie OP10.
6. Bilans RPW pokazał 3 stanowiska 20/25/10 s, sprawność 61,11% i zdolność efektywną 1944 szt./dzień. Zmieniono metodę na LCR.
7. Wybrano układ L i dodano słup 800 × 800 × 3000 mm w punkcie 15000/15000 mm. Kontrola projektu: 0 błędów i 0 ostrzeżeń.
8. Moduł 3D został załadowany bez zgłoszonych błędów konsoli. Symulacja 3 sztuk przy odstępie wejścia 30 s zakończyła się po 115 s: 3/3 sztuki, WIP 0, średnia wydajność 93,91 szt./h. Wynik zgodny z obliczeniem kontrolnym: wyjścia w 55, 85 i 115 s.
9. Po zapisie lokalnym i przeładowaniu strony zachowano nazwę, 3 operacje, 1 materiał i parametry projektu. Historia Cofnij/Ponów po przeładowaniu jest celowo pusta.
10. Wywołano eksport JSON: interfejs potwierdził przekazanie pliku „Test odbiorczy 0.3.json” do przeglądarki. Narzędzie przeglądarkowe nie zwróciło ścieżki pobrania, więc fizycznego zapisu tego pliku nie potwierdzono w tym teście.
11. Raport inżynierski wyświetlił poprawne założenia, LCR, 3 stacje, koszt 12 PLN/szt. oraz brak kolizji.

Zrzut wyniku symulacji: `Instrukcja/weryfikacja_v0.3.png`.

## Granice weryfikacji i warunki odbioru komercyjnego

- Nie wykonano pełnej macierzy przeglądarek, systemów, kart graficznych, rozdzielczości ani testów długotrwałego obciążenia.
- Nie potwierdzono fizycznego pobrania wszystkich formatów przez interfejs ani otwarcia DXF w docelowym zewnętrznym CAD. Struktury eksportów objęte są testami kodu, ale przed przekazaniem klientowi należy sprawdzić również pliki końcowe i jednostki CAD.
- Nie testowano każdej kombinacji ręcznej geometrii, przeciągania, wariantów i historii. Test przekrojowy nie zastępuje pełnego zestawu automatycznych testów E2E.
- Nie przeprowadzono walidacji na rzeczywistych pomiarach zakładu, audytu ergonomii/BHP ani oceny zgodności normatywnej.
- Symulacja jest deterministyczna, z nieograniczonymi kolejkami i bez czasu transportu, awarii oraz przezbrojeń. Te ograniczenia są widoczne w aplikacji i opisie funkcji.
- Brak kont, płatności, licencjonowania online, usług chmurowych i integracji ERP/MES. Do komercjalizacji potrzebny jest wybór modelu dystrybucji i osobny odbiór produktu.
- Stara instrukcja DOCX opisuje interfejs v0.2. Aktualne funkcje i kolejność pracy opisuje `FUNKCJE_PROGRAMU.md`.

## Dostarczone pliki

- `ZMIANY_v0.3.md`: rejestr wdrożonych zmian, odwzorowanie listy usprawnień i sposób powrotu do kopii.
- `FUNKCJE_PROGRAMU.md`: opis funkcji, wzorów, założeń i ograniczeń.
- `Uruchom_Layout_Studio_v0.3.bat`: uruchamianie nowej wersji.
- `backup/v0.2_20260927_100357`: kopia starej wersji bez odtwarzalnego node_modules.
