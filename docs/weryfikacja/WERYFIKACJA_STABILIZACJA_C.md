# Stabilizacja C — edycja 3D (zakończona)

Data: 2026-09-30. Wersja 0.4.0; schema 4 bez zmian.

## C3 — końcowy odbiór: wdrożone

Sekcje C2/C2a poniżej zachowano jako historię. Etap 1.4 zakończono po następującym odbiorze.

Tymczasowa diagnostyka wykazała pointerType=mouse, button=0, editing=true, hits=0: gest (330,649) docierał jako client=(330,601). Zrzut był dodatkowo skalowany względem CSS. Po uwzględnieniu mapowania gest (355,697) dał client=(355,649), hits=1 i przesunął stół. Algorytm przeciągania nie wymagał zmiany. Logi usunięto przed końcowym buildem.

- Z siatką 100 mm: WS-1 (10350,16750) → (8100,16000).
- Cofnij → X=10350; Ponów → X=8100, formularz aktualny.
- CAD 2D: TBL-WS-1 ma 8100 / 16000; tryb ręczny.
- Edycja X=8200 w CAD jest widoczna w formularzu 3D jako 8200.
- Bez siatki: (8393,16074). Zapis i przeładowanie zachowują obie wartości. Bez siatki nadal obowiązuje rozdzielczość 1 mm.
- Po usunięciu diagnostyki, buildzie i odtworzeniu bazowego eksportu powtórzono gest: (8100,16000). Cofnięto do (10350,16750) i zapisano bazowy projekt QA. Testowe przesunięcia nie pozostały w projekcie.

Backup przed diagnostyką: `backup/v0.4.0_przed_pointer_C3_20260930/Scene.tsx` (wersja po C2a). Build poprawny i 40/40 testów. Zrzut faktycznego przesunięcia w końcowym buildzie: `Instrukcja/stabilizacja_C3_przesuniecie.png`. Odbiór obejmuje mysz i stół na projekcie Eko, nie multitouch ani wielokrotne zaznaczanie. Następny pakiet: 1.5.

## C1 — synchronizacja formularza: wdrożone

Odtworzono przez UI błąd: zmiana X stołu WS-1 z 10350 na 10800 mm, zapis i Cofnij przywracały model, lecz pole pozostawało 10800. Zamknięcie i ponowne otwarcie formularza pokazywało już poprawne 10350. Nieaktualny szkic mógł ponownie nadpisać cofniętą geometrię.

W `src/components/studio/Scene.tsx` dodano synchronizację szkicu po zmianie listy obiektów projektu. Cofnięcie/ponowienie odświeża pola, a brak obiektu zamyka szkic. Zmiana modelu zastępuje niezapisany szkic aktualną geometrią. Sama edycja pól nie zmienia listy i nie resetuje formularza.

Odbiór UI po buildzie: zapis X=10800, Cofnij=10350, Ponów=10800, ostatecznie Cofnij=10350. Projekt Eko przywrócony. `npm test`: 40/40. `npm run build`: sukces. Nie dodano testu automatycznego komponentu; regresję sprawdzono w rzeczywistym UI.

Backup modułów sprzed poprawki: `backup/v0.4.0_przed_synchronizacja_3D_20260930`. Zawiera Scene.tsx i LayoutEditor.tsx (drugi niezmieniony). SHA256 starego Scene.tsx: `3DC6FC5A0BCD8EE0F4C253A0EBC49357D48756098D156111BF5D0553CEB0FC3D`. Powrót: zabezpieczyć bieżący plik, skopiować Scene.tsx z tej kopii do src/components/studio/Scene.tsx i wykonać npm run build. Pełna kopia bazowa nadal w backup/v0.4.0_przed_stabilizacja_20260929_225906.

## C2 — gest myszy: w trakcie

Próba przeciągnięcia nie potwierdziła zmiany współrzędnych. Po kolejnym geście w zbliżeniu widok 3D stał się czarny; odczyt konsoli nie wykazał błędów/ostrzeżeń. Nie ustalono, czy jest to problem kamery, renderowania czy obsługi gestu w środowisku testowym. Nie uznano przeciągania za działające ani nie przypisano przyczyny bez dowodu.

Następny krok: odtworzyć gest w świeżym widoku, zweryfikować wybór obiektu i pozycję kamery, zdiagnozować czarny widok. Następnie sprawdzić przesuwanie z siatką i bez niej oraz zgodność CAD 2D, historię i zapis. Nie przebudowano modułu renderowania w ramach C1.

### C2a — ograniczenia kamery (2026-09-30)

Odtworzono czarny widok po geście. „Dopasuj halę 3D” przywróciło scenę bez przeładowania. To wskazuje na ustawienie kamery, ale nie dowodzi dokładnego przebiegu zdarzeń wejściowych.

W Scene.tsx ograniczono orbitę do półprzestrzeni nad podłogą (maxPolarAngle = π/2 − 0.01), odległość kamery do 0.5–1500 m oraz wyłączono obrót lewym przyciskiem i tłumienie ruchu w trybie edycji. Prawy przycisk nadal przesuwa kamerę, kółko przybliża. Po wyłączeniu edycji obrót jest dostępny ponownie.

Backup przed tą poprawką: `backup/v0.4.0_przed_kamera_C2_20260930/Scene.tsx`; SHA256 `1DA403184C5030728EFF3143311E3517DD48A87AB00652C7CA02F84E6659F32B`. Odtworzenie analogicznie do C1; kopia obejmuje wcześniejszą poprawkę synchronizacji formularza. Build poprawny. Po przeładowaniu i powtórzeniu gestu w trybie edycji widok nie stał się czarny i kamera pozostała stabilna.

**Granica odbioru:** współrzędne wyposażenia nadal nie zmieniły się w próbie sterowanej narzędziem. Nie oznaczamy przeciągania ani całego 1.4 jako wdrożone. Kolejna diagnoza musi rozdzielić trafienie raycastera, rodzaj zdarzenia wskaźnika i mapowanie współrzędnych narzędzia. Zmiana kamery jest zabezpieczeniem UX, nie dowodem naprawy przeciągania.
