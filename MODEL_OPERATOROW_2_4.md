# Współdzieleni operatorzy — punkt 2.4

Status 2026-10-05: pakiet 2.4a / 2.4.1 wdrożony jako niezależny rejestr rezerwacji. Punkt 2.4 pozostaje w trakcie; rejestr nie jest jeszcze wejściem aktywnej symulacji ani edytora szkicu 6.

## Potwierdzona reguła procesu

Użytkownik określił, że gdy profil operacji ma kilka przedziałów wymaganej obecności operatora, **te same osoby pozostają zarezerwowane od początku pierwszego do końca ostatniego przedziału**, również między przedziałami podczas pracy maszyny. Reguła dotyczy późniejszego powiązania wybranego wariantu czasu z konkretnymi pracownikami. Dla jednej realizacji operacji nie wolno zwolnić tych osób w przerwie między przedziałami ani zastąpić ich innymi bez osobnej jawnej reguły.

Żadna obsada operacji, grupa osób ani liczebność zespołu nie są wyprowadzane ze starego `stationSettings.operators`, geometrii, puli lub nazwy operacji. Do harmonogramowania według tej reguły potrzebny będzie jawny wariant czasu, jego okres obecności i jawnie dopuszczone osoby albo pula. Brak tych danych nie może uruchomić symulacji współdzielonych operatorów jako pozornie poprawnej.

## Pakiet 2.4a — rejestr rezerwacji

`src/core/workerReservations.ts` przechowuje osobne, trwałe ID pracowników i rezerwacje zespołu z jawnym ID oraz przedziałem w sekundach. Przedziały mają postać `[startSeconds, endSeconds)`: dwa przydziały tej samej osoby mogą stykać się na granicy czasu, ale nie mogą się nakładać. Jedna rezerwacja może obejmować kilka wskazanych osób. Rejestr odrzuca nieznane lub powtórzone ID, puste zespoły, powtórzone ID rezerwacji, błędne czasy i kolizje także między różnymi stanowiskami. Nie przydziela automatycznie członków puli.

`releaseWorkerTeam` kończy rezerwację wcześniej albo dokładnie w planowanym końcu; skrócony przedział pozostaje w rejestrze jako ślad. Od chwili zwolnienia osoba może być zarezerwowana ponownie. Ponowne zwolnienie tej samej rezerwacji jest błędem. Operacje są niemutujące: odmowa nie zmienia wcześniejszego rejestru, a zapis aktywnych projektów 4/5 i szkicu 6 pozostaje nietknięty.

To jest fundament do późniejszego powiązania z operacjami i harmonogramem. Nie potwierdza jeszcze wyboru wariantu, doboru osób z puli, oczekiwania na zasób ani poprawności całej symulacji. Te elementy należą do pakietów 2.4.2–2.4.4. Przed dodaniem modułu wykonano kopię `backup/v0.4.0_przed_2_4a_20261005`; dane localStorage nie należą do kopii.
