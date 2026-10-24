# Pozostały odbiór UI2 w Chrome/Edge

Status: niewykonany. To instrukcja testu, nie deklaracja PASS.

1. Otwórz bieżący lokalny build, wczytaj kopię własnego projektu lub projekt pokazowy. W hali 2D przeciągnij wyposażenie, sprawdź pozycję i powiązane elementy, Cofnij/Ponów, zapisz/odśwież. W 3D włącz edycję i wykonaj przesunięcie/obrót manipulatorem; porównaj formularz i rzut 2D. Używaj kopii danych testowych.
2. Otwórz CAD w osobnym oknie. Potwierdź czytelne style, dostępność pól, przewijanie, zmianę geometrii oraz przywrócenie widoku głównego. Powtórz dla 3D: kamera, Start/pauza/reset/suwak, parametry i eksport. Otwarcie okna nie może powodować duplikowania obliczeń. Obecny mechanizm może rozpocząć czas od nowa przy przeniesieniu; zachowanie sesji między montowaniami nie zostało dodane.
3. W osobnej sesji przeglądarki bez WebGL sprawdź wyświetlenie komunikatu niedostępności 3D, dostęp do CAD 2D i parametrów/wyników symulacji. Sam brak akceleracji sprzętowej nie dowodzi braku WebGL, jeżeli działa renderer programowy. Nie zmieniaj stale ustawień głównego profilu użytkownika do tej próby.
4. Zapisz wersję/commit buildu, przeglądarkę, wynik każdego kroku, rzeczywiste wymiary viewportów i zrzuty. Dopiero PASS brakujących prób pozwala zamknąć odbiór UI2; nie zamyka A2b2b ani UI3/UI4.
