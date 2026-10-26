# Model wykrywania zatrzymań i zakleszczeń procesu (Punkt 3.7)

## Cel i zakres (PLAN 3.7)
Zgodnie z punktem 3.7 `PLAN_ROZWOJU.md`, silnik symulacji oraz interfejs użytkownika Layout Studio Pro nie mogą zgłaszać pozornego sukcesu (ani kończyć symulacji bez ostrzeżenia), gdy proces uległ zatrzymaniu lub zakleszczeniu. Zamiast ogólnego, niejasnego komunikatu o błędzie, system analizuje stan symulacji w chwili zatrzymania, wyznacza dokładną przyczynę źródłową, listę wstrzymanych operacji oraz zablokowanych stanowisk i zasobów, a także formułuje konkretne zalecenie rozwiązania problemu.

## Typologia zatrzymań (`ProcessStallType`)

1. **`worker-deadlock` (Zakleszczenie operatora)**:
   - Występuje, gdy stacja blokuje swoje wyjście po zakończeniu obróbki (np. z powodu zapełnienia bufora wyjściowego lub braku miejsca u odbiorcy) i zgodnie z polityką `bbas` przetrzymuje operatora.
   - Gdy odbiorca na kolejnej stacji (lub inna oczekująca operacja) wymaga tego samego operatora do rozpoczęcia pracy, dochodzi do zakleszczenia wzajemnego (deadlock).
   - *Zalecenie*: zmiana polityki bufora na `bbas-worker-released` (zwolnienie operatora natychmiast po obróbce) lub przypisanie niezależnego pracownika.

2. **`buffer-deadlock` (Zablokowanie przepływu przez bufor)**:
   - Występuje, gdy zadeklarowana pojemność bufora wyjściowego stacji źródłowej lub wejściowego stacji docelowej została wysycona, a odbiorca nie może przyjąć kolejnej sztuki.
   - *Zalecenie*: zwiększenie zadeklarowanej pojemności bufora lub skrócenie cyklu na stacji odbiorczej.

3. **`material-starvation` (Zatrzymanie procesu z braku materiału)**:
   - Występuje, gdy zadeklarowane zaopatrzenie materiałowe (zapas początkowy + harmonogram dostaw) uległo wyczerpaniu przed zaspokojeniem zapotrzebowania partii.
   - *Zalecenie*: dodanie kolejnych dostaw w harmonogramie zaopatrzenia lub zwiększenie zapasu początkowego.

4. **`calendar-exhaustion` (Wygaśnięcie okien kalendarza roboczego)**:
   - Występuje, gdy kalendarz roboczy stanowiska lub przypisanego zespołu pracowników nie przewiduje dalszych zmian lub okien pracy w horyzoncie symulacji.
   - *Zalecenie*: rozszerzenie godzin zmian lub dodanie kolejnych okien pracy w kalendarzu zasobów.

5. **`transport-deadlock` (Zatrzymanie transportu montażu)**:
   - Występuje przy braku wolnych wózków, braku trasy dojazdu bez ładunku lub braku personelu transportu.
   - *Zalecenie*: sprawdzenie floty wózków, tras powrotnych i dostępności osób transportu.

6. **`subassembly-starvation` (Nieukończone pobranie podzespołu)**:
   - Występuje, gdy wyprodukowana partia podzespołu nie została w całości pobrana przez odbiorcę.
   - *Zalecenie*: weryfikacja zależności technologicznych i przypisań partii podzespołów.

7. **`process-stall` (Ogólne zatrzymanie symulacji)**:
   - Sytuacja awaryjna, gdy kolejka zdarzeń została wyczerpana, a żadna oczekująca operacja nie może wystartować.

## Struktura kontraktu diagnostycznego

```typescript
export interface ProcessStallDiagnostic {
  type: ProcessStallType;
  atSeconds: number;
  title: string;
  summary: string;
  stalledOperations: StalledOperationDetail[];
  blockedStations: BlockedStationDetail[];
  recommendation: string;
}

export interface StalledOperationDetail {
  job: number;
  operationId: string;
  operationName: string;
  stationId: string;
  copy: number;
  status: 'waiting' | 'blocked' | 'local-wait' | 'transport-wait';
  waitCauses: string[];
  missingResourceExplanation: string;
}

export interface BlockedStationDetail {
  stationId: string;
  stationName: string;
  copy: number;
  heldBodyId?: string;
  blockedByJob?: number;
  blockedByOperationId?: string;
  holdingWorkerIds?: string[];
  waitingForStationId?: string;
  blockingPolicy?: 'bbas' | 'bbas-worker-released';
}
```

## Serializacja przez granicę Web Workera
Komunikacja z Web Workerem symulacji (`schedule.worker.ts`) przekazuje błędy w postaci łańcuchów tekstowych (`error: string`). Aby zachować pełną ustrukturyzowaną tożsamość diagnozy bez modyfikacji protokołów niskopoziomowych, `ProcessStallError` dołącza znacznik `<!--DIAGNOSTIC:${JSON.stringify(diagnostic)}-->`. Funkcja `parseProcessStallDiagnostic` odtwarza obiekt diagnozy w wątku głównym UI, a widok tekstowy usuwa znacznik techniczny.

## Prezentacja w Studio UI (`DomainWorkerSchedulePanel.tsx`)
1. **Nagłówek i chwila zatrzymania**: etykieta błędu z ikoną `⛔`, tytułem i czasem zatrzymania w sekundach.
2. **Podsumowanie przyczyny**: czytelny opis w języku polskim wskazujący konkretne stanowisko, sztukę i brakujący zasób.
3. **Baner zalecenia**: wyróżniony blok z ikoną `💡` podający gotowe rozwiązanie w konfiguracji procesu.
4. **Tabela zablokowanych stanowisk**: lista stacji ze statusem blokady, numerem kopii, przetrzymywanymi pracownikami `bbas` oraz stacją docelową.
5. **Tabela wstrzymanych operacji**: lista wszystkich operacji partii, które nie mogły kontynuować pracy, z etykietami statusu (`Zablokowane wyjście`, `Oczekiwanie lokalne`, `Oczekiwanie na zasoby`), kodami przyczyn i szczegółowym wyjaśnieniem brakującego zasobu.
