# Eko — szybki test nowych funkcji v0.4.0

## Bez importu

1. Uruchom aplikację aktualnym launcherem i odśwież kartę.
2. Wyeksportuj swój bieżący projekt jako JSON.
3. Na pulpicie wybierz „Przykład — Eko, rybia ość” i potwierdź.
4. W „2 Proces” znajdziesz 16 operacji. OP22–OP25 mają czasy testowe.
5. W „2a Przepływ” obejrzyj gałęzie. OP13/14/15/16 zasilają odpowiednio montaż drzwi i paneli. OP22 i OP23 mogą zaczynać równolegle po ukończeniu ramy i swoich podzespołów.
6. Aby wymusić kolejność drzwi, wybierz OP22 i dodaj OP23 do następników, zachowując dotychczasowe OP24/OP25. Zapisz. Cofnij przywróci wariant równoległy.
7. W „4 Bilans” wybierz operację lub przeciągnij segment do innego stanowiska. Przy zmianie grupowania sprawdź ustawienia zasobów.
8. W sekcji zasobów zmień liczbę operatorów na kopię i liczbę kopii. Kliknij „Zastosuj zasoby”. Jeśli dodajesz pracownika do pomocy, wpisz zmierzony lub założony czas zespołu — liczba osób sama nie skraca czasu.
9. Zapisz osobne warianty przed i po zmianie. Porównaj wąskie gardło, obsadę, liczbę fizycznych kopii oraz symulację.
10. W „5 Hala i CAD” wybierz układ „Z procesu”. Przykład już go używa. Wpisz rzeczywiste wymiary hali i przeszkody. Generacja jest punktem wyjścia do ręcznego dopracowania, nie projektem dróg i ergonomii.
11. W „6 3D i symulacja” użyj widoku z góry lub listy wyposażenia. Zbliż się na wybrany obiekt, włącz edycję, przesuń go lub wpisz współrzędne/wymiary/obrót. Zapis jest wspólny z CAD; możesz go cofnąć.
12. Ustaw partię 3 i odstęp 4050 s. W bazowym przykładzie „Oblicz całą partię” daje 21170 s. Pierwsza sztuka kończy się po 13070 s. To wynik przykładowych założeń, nie obietnica wydajności zakładu.
13. Użyj osi czasu lub Start/Pauza. Zielone znaczniki 3D pokazują aktywne kopie stanowisk; karty pod symulacją identyfikują operacje i sztuki.
14. W „7 Raport” wyeksportuj JSON, bilans CSV, raport i DXF. Harmonogram CSV pobierzesz z symulacji.

## Własny import

1. Zacznij od pustego projektu.
2. W „2 Proces” zaimportuj plik tests/Test Eko.xlsx.
3. W „3 BOM” zaimportuj tests/Test Eko BOM.xlsx.
4. Ustaw własny popyt. W „4 Bilans” użyj „Każda operacja osobno”, jeśli chcesz zachować osobne gałęzie stanowisk przed ręczną optymalizacją.
5. W „5 Hala i CAD” wybierz „Z procesu”.

W pliku procesu Poprzednicy i Następnicy są dwiema reprezentacjami tych samych połączeń. Import łączy ich zawartość. Przy usuwaniu zależności z arkusza zawierającego obie kolumny usuń ją po obu stronach.

Nie dodano ponownie podzespołów do BOM nowych operacji, aby nie podwajać kosztów. Dodatkowe śruby, kleje lub materiały zużywane dopiero podczas końcowego montażu wpisz po potwierdzeniu technologii.

## Ważne granice

Pozycja stołu nie zmienia wyniku czasowego: w tej wersji czas transportu wynosi zero. Obsada nie jest współdzielona między stanowiskami. Równoległy montaż po dwóch stronach jednego korpusu wymaga potwierdzenia dostępu i bezpieczeństwa; model grafowy nie sprawdza fizyki wspólnego korpusu.
