# Współdzieleni operatorzy — punkt 2.4

Status 2026-10-05: pakiety 2.4a / 2.4.1 i 2.4b / 2.4.2.1 wdrożone jako niezależny rejestr i walidowany plan przebiegu. Punkt 2.4 pozostaje w trakcie; te moduły nie są jeszcze wejściem aktywnej symulacji ani edytora szkicu 6.

## Potwierdzona reguła procesu

Użytkownik doprecyzował, że **przed rozpoczęciem przebiegu produkcyjnego określa się stały skład zespołu**. W trakcie tego przebiegu harmonogram może przydzielać zadania wyłącznie osobom z tej listy; nie dobiera dodatkowych pracowników i nie podmienia członków zespołu automatycznie. Jeśli brakuje wystarczającej liczby wolnych osób z ustalonego składu, operacja czeka na ich zwolnienie. Pracownik może przechodzić między stanowiskami po zwolnieniu z poprzedniej rezerwacji. Inny skład wymaga jawnej zmiany danych scenariusza przed nowym przebiegiem, a nie uzupełnienia zasobów w trakcie symulacji.

Gdy profil jednej operacji ma kilka przedziałów wymaganej obecności operatora, **te same przydzielone osoby pozostają zarezerwowane od początku pierwszego do końca ostatniego przedziału**, również między przedziałami podczas pracy maszyny. Dla jednej realizacji operacji nie wolno zwolnić tych osób w przerwie między przedziałami ani zastąpić ich innymi. Stały skład całego przebiegu jest zbiorem osób, z którego przydziela się zespoły do operacji; nie oznacza, że każda osoba jest zajęta przez cały czas przebiegu.

Żadna obsada operacji, skład zespołu ani liczebność wariantu nie są wyprowadzane ze starego `stationSettings.operators`, geometrii, puli lub nazwy operacji. Do harmonogramowania według tej reguły potrzebna będzie jawna lista ID pracowników dla przebiegu, wybrany wariant czasu i jego okres obecności. Pula może pomóc zdefiniować skład przed przebiegiem, ale jej członkostwo trzeba zamrozić dla danego uruchomienia; nie jest źródłem osób dobieranych w trakcie. Brak wymaganych danych nie może uruchomić symulacji współdzielonych operatorów jako pozornie poprawnej.

## Pakiet 2.4a — rejestr rezerwacji

`src/core/workerReservations.ts` rozpoczyna pracę od zamkniętej listy trwałych ID pracowników i przechowuje rezerwacje zespołu z jawnym ID oraz przedziałem w sekundach. Nie ma operacji dodania osoby do tego rejestru w trakcie przebiegu. Przedziały mają postać `[startSeconds, endSeconds)`: dwa przydziały tej samej osoby mogą stykać się na granicy czasu, ale nie mogą się nakładać. Jedna rezerwacja może obejmować kilka wskazanych osób. Rejestr odrzuca nieznane lub powtórzone ID, puste zespoły, powtórzone ID rezerwacji, błędne czasy i kolizje także między różnymi stanowiskami. Nie przydziela automatycznie członków puli.

`releaseWorkerTeam` kończy rezerwację wcześniej albo dokładnie w planowanym końcu; skrócony przedział pozostaje w rejestrze jako ślad. Od chwili zwolnienia osoba może być zarezerwowana ponownie. Ponowne zwolnienie tej samej rezerwacji jest błędem. Operacje są niemutujące: odmowa nie zmienia wcześniejszego rejestru, a zapis aktywnych projektów 4/5 i szkicu 6 pozostaje nietknięty.

To jest fundament do późniejszego powiązania z operacjami i harmonogramem. Nie potwierdza jeszcze wyboru wariantu, doboru osób z puli, oczekiwania na zasób ani poprawności całej symulacji. Te elementy należą do pakietów 2.4.2–2.4.4. Przed dodaniem modułu wykonano kopię `backup/v0.4.0_przed_2_4a_20261005`; dane localStorage nie należą do kopii.

## Pakiet 2.4b — walidowany plan przebiegu

`src/core/workerRunPlan.ts` przyjmuje istniejący szkic 6, jawną listę ID stanowiącą stały skład przebiegu oraz dokładnie jeden wybór dla każdej operacji. Wybór wskazuje istniejący wariant czasu przez liczebność zespołu i listę osób dopuszczonych do tej operacji. Dopuszczeni pracownicy muszą należeć do składu przebiegu, być unikalni i wystarczyć liczbowo do wybranego wariantu. Lista nie przydziela jeszcze konkretnej podgrupy do realizacji operacji; ten wybór i ewentualne oczekiwanie należą do harmonogramu 2.4.3. Nie zakłada się, że każdy członek całego zespołu umie wykonać każdą operację.

Plan jest odrzucany, gdy brakuje osoby, operacji, wariantu, wymaganej obecności lub jawnej listy dopuszczonych osób. Z profilu wariantu wyznacza się czas operacji oraz jeden **okres rezerwacji od początku pierwszego do końca ostatniego przedziału obecności**; przerwy między przedziałami pozostają objęte rezerwacją tych samych osób. Wynik jest niemutowalną migawką danych wejściowych przebiegu. Nie modyfikuje szkicu, nie dodaje pracowników i nie wyprowadza ich z dawnej obsady stanowiska.

Plan jest obecnie obiektem w pamięci, bez UI i trwałego zapisu wyborów. Wprowadzenie oraz bezpieczne zachowanie wyborów należy do 2.4.2.2, a planowanie startów i fizyczne rezerwacje do 2.4.3. Przed dodaniem modułu wykonano kopię `backup/v0.4.0_przed_2_4b_20261005`; localStorage nie należy do kopii.
