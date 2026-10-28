# 7.12.C2-B3f — bezpośrednie wejście 0 podmontażu ze skończonymi/zerowymi buforami korpusów, odbiorca z `bbas` i lokalne przekazanie `0 → 0`

Data: 2026-10-28. Status: **wdrożone bezpośrednie wejście 0 podmontażu w grafie ze skończonymi/zerowymi buforami korpusów, bezpośredni odbiorca z zatrzymaniem własnej obsady (`bbas`) oraz lokalne przekazanie `0 → 0` na tej samej kopii**. Całe B3/C2/7.12 w trakcie.

## Zmiana i zgodność

`graphBodyBuffers.ts` dopuszcza `subassemblyBuffers.inputCapacity = 0` w harmonogramie grafowym ze skończonymi lub zerowymi buforami korpusów. `workerSchedule.ts` synchronizuje bezpośredni przyjazd pojedynczej partii podmontażu (`inputCapacity = 0`) z wcześniejszym dostarczeniem korpusu do dodatniego bufora wejściowego odbiorcy (albo lokalną kontynuacją `B3c` na tej samej kopii) oraz ewentualnymi towarzyszami w dodatnich buforach podmontaży, chroniąc niepewne zwolnienia zasobów (`blockedBodies`, `localBodies`, `hasLocalNext`, `outputIsFinite`, `hasFiniteOutput`) i dołączając `bufferedDelivery` do wykonania odbiorcy. Obsługiwany jest odbiorca bezpośredni posiadający własne skończone lub zerowe wyjście z zatrzymaniem obsady (`mayHoldExecution`, `releaseProducer(owner, now)`), jak również lokalne przekazanie `outputCapacity = 0` → `inputCapacity = 0` na tej samej kopii stanowiska (`localDirectProducer`, `consume-local-direct`) bez pośredniego depozytu i ruchu. Jednoczesne zdalne wejście 0 korpusu i podmontażu na tej samej operacji jest jawnie odrzucane (`C2-B3f: jednoczesne bezpośrednie wejście 0 korpusu i podmontażu na tej samej operacji wymaga bufora wejściowego po jednej ze stron.`). `DomainSubassemblyBuffersEditor.tsx` aktualizuje opis zakresu formularza. Nie zmieniono schematu modelu 6, migracji ani rozprowadzanych przykładów.

Backup: `backup/v0.4.0_przed_c2_b3f_20261028`, 6 plików rdzenia/testów/UI/instrukcji, niezależne SHA-256 źródła i kopii PASS (`manifestSHA256.txt`). Niezależny `outputs/data_audit/eko_7_1.json` pozostaje poza pakietem.

## Dowody

5 nowych testów B3f PASS (oraz zaktualizowane asercje zakresu w B3b i B2b):

- Bezpośrednie wejście 0 podmontażu z dodatnim buforem korpusu, lokalną kontynuacją i odrzuceniem `0 + 0`: korpus przejeżdża do dodatniego wejścia odbiorcy (`20–22 s`), a partia bezpośrednia odjeżdża z producenta dopiero przy `48–50 s`, uruchamiając odbiorcę dokładnie przy `50 s`; w wariancie lokalnej kontynuacji korpus czeka lokalnie na tej samej kopii (`10–20 s`, zwolnienie `50 s`, `continuationWaitSeconds = 30`), a partia bezpośrednia przyjeżdża przy `48–50 s`; jednoczesne zdalne `0 + 0` korpusu i podmontażu jest jawnie odrzucane bez mutacji projektu.
- Bezpośredni odbiorca podmontażu z własnym zatrzymaniem obsady (`bbas`): zarówno w łańcuchu podmontaży (`SUB-FLOW` `0` → `consumer` z wyjściem `NEXT` `0 / bbas` → `DIRECT-END` przy dostawie materiału w `80 s`), jak i na odbiorcy korpusu (`BODY-LOCAL` z wejściem podmontażu `0` i wyjściem korpusu `0 / bbas` przed `ST-C` otwieranym w `80 s`), obsada odbiorcy jest zatrzymana po obróbce (`50–80 s` / `50–78 s`) bez podwójnych rezerwacji.
- Lokalne wejście 0 i wyjście 0 na tej samej kopii (`ST-C / 1`): dla obu polityk (`bbas` i `bbas-worker-released`) partia pozostaje na producencie (`0–10 s`, zwolnienie stanowiska `50 s`, `blockedSeconds = 40`, rezerwacja osób `0–50 s` lub `0–10 s`) do dostawy materiału i startu odbiorcy przy `50 s`, bez ruchu transportowego (`transportMovements.length === 0`) i z pobraniem `consume-local-direct`.
- Towarzysz buforowany z resztą (`LOT-COMP` `3 → 1`, reszta `2 szt.`) i bezpośredni podmontaż (`LOT-1` `2 → 2` na wejście `0`) przy buforach korpusów: wspólny start odbiorcy przy `50 s`, zapas reszty `2 szt.` widoczny w buforze `SUB-COMP`.
- Syntetyczny 3-zleceniowy wzorzec C2 (`prepareC2B3fUiProject`): łączy `SUB-PWR` na wejściu `0` w `ST-MU-MAIN2 / 1` (`outputCapacity = 10, bbas` na `ST-MU-PWR / 1`, pełne zużycie `5/5`, `occupied = 0`), `SUB-DRV` w dodatnim buforze `20 szt.` (`5/3`, końcowy zapas reszt `6 szt.` = `3 × 2 szt.`) oraz bufory korpusów (`ST-MU-MAIN1` `1/1 bbas`, `ST-MU-MAIN2` `1/0 bbas`, `ST-MU-MAIN3` `0/null` z bezpośrednim przekazaniem `handoff`), z pełną ciągłością odtwarzania 3D i zamkniętymi rezerwacjami osób.

Testy automatyczne:
- Podzbiór celowany `node scripts/test.mjs --suite=network "--test-name-pattern=7.12.C2|3.4m|3.5"`: **161/161 PASS**, log `outputs/qa/7_12c2_b3f/scoped.txt`.

Build/typecheck (`npm.cmd run build`): **PASS**.

Rzeczywisty UI w Edge CDP (`node tests/qa/verify_7_12c2_b3f.mjs`): **PASS** — chroniony import pakietu, `SUB-PWR` na `ST-MU-MAIN2 / 1` z pojemnością `0` i zajętością `0`, `SUB-DRV` na `ST-MU-MAIN2 / 1` z pojemnością `20` i zapasem reszt `6 szt.` (`3` pozycje po `2 szt.`), bezpośrednie przekazania korpusu na `ST-MU-MAIN3 / 1`, przeładowanie strony oraz eksport pakietu z porównaniem obu konfiguracji buforów i dokładnego źródła. Błędy runtime/konsoli: `0`. Dowody: `outputs/qa/7_12c2_b3f/ui.json`, `body_buffers.png`, `component_stock.png`.

Instrukcja użytkownika (`Instrukcja/Podrecznik_Uzytkownika.md`, `.html`, `.pdf`) zaktualizowana i zweryfikowana (`scripts/verify_manual.py`): **66 stron, 53 ilustracje**, zgodność HTML/MD, kompletność sekcji, brak pustych stron i tekstu poza stroną (`outputs/qa/manual_7_12c2_b3f/report.json` PASS).

## Pozostałe ograniczenia

Jednoczesne zdalne wejście 0 korpusu i podmontażu na tej samej operacji (wymagany bufor po jednej ze stron), wiele bezpośrednich partii podmontaży naraz, częściowa obecność obsady przy zatrzymywanym wyjściu `bbas`, alternatywne kopie na ścieżce korpusu, przezbrojenia oraz pełny odbiór fizycznego C2 pozostają w trakcie. Następny zakres wymaga Sol do oceny/implementacji/weryfikacji.

Postęp głównych ID: **61/72 = 84,7%**; pierwsze wydanie **61/68 = 89,7%**.
