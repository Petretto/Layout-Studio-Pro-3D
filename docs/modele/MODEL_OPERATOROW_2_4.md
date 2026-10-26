# Współdzieleni operatorzy — punkt 2.4

Status 2026-10-05: pakiety 2.4a–2.4f (2.4.1–2.4.4) wdrożone w zakresie logicznego harmonogramu niekompletnego szkicu 6. Rejestr, plan, edytor wyborów i odrębny podgląd harmonogramu używają szkicu 6; nowy harmonogram nie steruje aktywną symulacją. Produkcyjna walidacja Eko należy do 7.1/7.2, a fizyczna równoległość podzespołów do 2.8.

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

W pakiecie 2.4b plan był wyłącznie obiektem w pamięci, bez UI i trwałego zapisu wyborów. Te funkcje dodano w 2.4c; planowanie startów i fizyczne rezerwacje należą do 2.4.3. Przed dodaniem modułu wykonano kopię `backup/v0.4.0_przed_2_4b_20261005`; localStorage nie należy do kopii.

## Pakiet 2.4c — wybór i trwały zapis w szkicu 6

Opcjonalne pole `workerRunSelection` w istniejącym projekcie schematu 6 przechowuje jedną kompletną konfigurację przebiegu: stałą listę ID zespołu oraz dla każdej operacji wybrany wariant liczebności i listę osób dopuszczonych. Brak pola w dawnym szkicu nadal oznacza brak wyboru. Parser odrzuca obce i powtórzone ID, brak operacji lub wariantu, za małą liczbę dopuszczonych osób oraz wariant bez jawnego okresu obecności. Gdy wybór jest zapisany, edycja nie może usunąć wskazanej osoby ani wariantu bez wcześniejszego wyczyszczenia wyboru. Nie powstają domyślne czasy, umiejętności ani przydziały.

Edytor pokazuje osoby, warianty i dopuszczenie dla każdej operacji. Zapis następuje atomowo dopiero po walidacji kompletnej konfiguracji. Korzysta z odrębnego localStorage szkicu 6, dotychczasowego sprawdzania poprzedniej wartości i wspólnej historii Cofnij/Ponów. Usunięcie wyboru jest odwracalne w tej historii. Aktywne projekty 4/5 pozostają osobne, a ich oryginalny JSON w szkicu jest zachowany. Sam zapis wyboru nie uruchamia jeszcze harmonogramu ani rezerwacji; to zakres 2.4.3. Kopia przed zmianą: `backup/v0.4.0_przed_2_4c_20261005`; localStorage nie należy do kopii.

## Pakiet 2.4d — odrębny rdzeń harmonogramu

`scheduleWorkerRun` korzysta wyłącznie z zapisanego wyboru szkicu 6, jawnego odstępu przybywania sztuk oraz liczby sztuk. Wymaga przypisania każdej operacji do trwałego ID stanowiska i jawnego `stationSettings[stationId].parallelStations`; brak ustawienia nie oznacza rzeczywistej jednej kopii i blokuje przebieg. Nie korzysta z dawnej liczby `operators` ani starego czasu standardowego. Czas operacji i okno obecności pochodzą z wybranego wariantu.

Harmonogram przetwarza przybycia, zakończenia operacji i zwolnienia rezerwacji jako zdarzenia. Gotowe operacje są rozpatrywane według czasu gotowości, numeru sztuki i kolejności topologicznej. Dla pierwszej możliwej operacji wybiera pierwszą wolną kopię stanowiska oraz pierwsze pasujące ID z zapisanej listy dopuszczonych osób. Operacja może rozpocząć się przed pierwszym przedziałem obecności, lecz przy starcie rezerwuje dokładnie te same osoby na całe przyszłe okno od pierwszej do ostatniej obecności. Brak wolnego zespołu w tym oknie powoduje oczekiwanie; wynik zapisuje czas i przyczyny (`workers`, `station`, `same-job`). Po ostatniej obecności rezerwacja zostaje zwolniona, nawet gdy praca maszyny kończy operację później. Przedziały i kopie nie mogą się nakładać.

Do czasu zdefiniowania fizycznych reguł wspólnego korpusu i podzespołów w 2.8 rdzeń dopuszcza tylko jedną trwającą operację na jedną sztukę, także przy rozgałęzieniu grafu. To ostrożne ograniczenie może wydłużyć wynik względem rzeczywistej równoległej pracy nad odrębnymi podzespołami. Wynik jest **logicznym harmonogramem zasobów**, bez transportu, kalendarza, wyposażenia technologicznego, buforów ani stanu fizycznego wyrobu. Nie zapisuje wyniku i nie zastępuje symulacji 4/5. Podgląd UI dodano w 2.4.3.2, a pełny odbiór należy do 2.4.4. Kopia przed modułem: `backup/v0.4.0_przed_2_4d_20261005`.

## Pakiet 2.4e — podgląd UI i granica odbioru 2.4.4

Podgląd szkicu 6 oblicza harmonogram wyłącznie na żądanie. Wymaga jawnej partii i dodatniego odstępu przybycia, pokazuje konkretne osoby, kopie stanowisk oraz czas i przyczyny oczekiwania. Wynik nie jest utrwalany i znika po zmianie wejścia, szkicu lub przeładowaniu; ponowne obliczenie na tych samych danych daje ten sam harmonogram. Aktywne wyniki 4/5 nie są zastępowane. Test Eko używa syntetycznych osób, kopii i profili czasu, nie rzeczywistych pomiarów. Bez danych z 7.1 i reguł fizycznych 2.8 nie należy uznawać go za potwierdzony harmonogram produkcji Eko.
