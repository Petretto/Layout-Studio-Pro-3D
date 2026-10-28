# 7.12.C2-B3e — pojemności 0 korpusów w grafie

Data: 2026-10-28. Status: **wdrożone zerowe pojemności wejścia i wyjścia korpusów w grafie z gałęziami podmontaży**. Całe B3/C2/7.12 w trakcie.

## Zmiana i zgodność

`graphBodyBuffers.ts` obsługuje `inputCapacity = 0` (`inputIsDirect`, `start-direct`, `arriveDirect`) oraz `outputCapacity = 0` (`outputIsDirect`, `depart`, `outputIsFinite`) na uporządkowanej ścieżce korpusu w grafie, przekazując znaczniki `handoff` do rejestru zdarzeń. `subassemblyBufferRun.ts` udostępnia `hasFiniteOutput`, a `workerSchedule.ts` synchronizuje bezpośredni przewóz korpusu (`body-direct-arrive`) z wcześniejszym dostarczeniem wymaganych partii podmontaży do dodatnich buforów odbiorcy, rezerwacją stanowiska, wyposażenia, obsady, kalendarza i materiałów przed odjazdem oraz ochroną zasobów o niepewnym czasie zwolnienia. Przy `outputCapacity = 0` i `bbas` zatrzymany monter może wykonać załadowany przewóz własnego korpusu zwalniający źródło, natomiast pusty dojazd wymaga innej jawnej osoby. Lokalna kontynuacja zachowuje kontrakt B3c. Nie zmieniono schematu modelu 6, migracji ani rozprowadzanych przykładów.

Backup: `backup/v0.4.0_przed_c2_b3e_20261028`, 6 plików rdzenia/testów/UI/instrukcji, niezależne SHA-256 źródła i kopii PASS (`manifestSHA256.txt`). Niezależny `outputs/data_audit/eko_7_1.json` pozostaje poza pakietem.

## Dowody

5 nowych testów B3e PASS (oraz zaktualizowana asercja zakresu w B3b i 3.5a1):

- Wyjście 0 na źródle korpusu z `bbas-worker-released` i dodatnim wejściem odbiorcy: pierwszy korpus odjeżdża natychmiast (10–20 s), drugi czeka na wyjściu 0 źródła do zwolnienia wejścia odbiorcy przy 50 s (`stationReleaseSeconds = 50`, `blockedSeconds = 20`, `handoff = true`), a osoba kończy zgodnie z profilem obróbki przy 30 s.
- Wyjście 0 z `bbas`: zatrzymany monter `W1` nie może opuścić czekającego korpusu na pusty dojazd (jawna odmowa martwego punktu), natomiast gdy wózek jest na miejscu lub pusty dojazd wykonuje `W2`, zatrzymany `W1` wykonuje załadowany przewóz własnego korpusu w chwili zwolnienia źródła (`50–60 s`), z pełną rezerwacją `0–50 s` na operacji i `50–60 s` na przewozie, bez nakładania rezerwacji.
- Wejście 0 na odbiorcy integracji z gałęzią podmontażu: partia podmontażu jest najpierw przewożona i składana w dodatnim buforze wejściowym odbiorcy (`20–30 s`), a bezpośredni przewóz korpusu czeka z wyjazdem do chwili, gdy przyjazd oznacza natychmiastowy start odbiorcy (`40–50 s`, start odbiorcy dokładnie przy `50 s`, dostawa materiału przy `50 s` przed pobraniem, `occupied = 0` i `reserved = 0` na wejściu 0 korpusu).
- Podwójne zero (`outputCapacity = 0` z `bbas` → `inputCapacity = 0` → `outputCapacity = 0` → `inputCapacity = 0`) w syntetycznym 3-zleceniowym C2 (`buildC2B3eUiFixture`): 3 wyroby ukończone przy `630 / 720 / 810 s`, zlecenie 1 na `MU-OP10` zatrzymuje `MU-W3` od `0` do `490 s` (`blockedSeconds = 450`), wyjazd korpusu `490–500 s` następuje po dostarczeniu podmontaży `SUB-PWR` i `SUB-DRV` do dodatnich buforów `ST-MU-MAIN2`, a przyjazdy na wejścia 0 pokrywają się ze startami operacji (`500 / 580 / 670 s` na `MU-OP20-M` oraz `580 / 670 / 760 s` na `MU-OP30`). Reszty `6 + 6 szt.` pozostają w buforach podmontaży, a buforom 0 korpusów odpowiada `occupied = 0, reserved = 0`.
- Ochrona nieobsługiwanych kombinacji: wejście 0 podmontażu jednocześnie ze skończonymi/zerowymi buforami korpusu, częściowa obecność przy `bbas` na wyjściu 0 oraz równoległa grupa na bezpośrednim odbiorcy korpusu są jawnie odrzucane bez mutacji projektu.

Testy automatyczne:
- Podzbiór celowany `node scripts/test.mjs --suite=network "--test-name-pattern=7.12.C2|3.4m|3.5"`: **156/156 PASS**, log `outputs/qa/7_12c2_b3e/scoped.txt`.
- Pełny okresowy checkpoint regresji (trzeci ukończony pakiet od B3b: B3c → B3d → B3e) `node scripts/test.mjs`: **488/488 PASS** (`109` w `core` + `379` w `network`).

Build/typecheck (`npm.cmd run build`): **PASS**.

Rzeczywisty UI w Edge CDP (`node tests/qa/verify_7_12c2_b3e.mjs`): **PASS** — chroniony import pakietu, wynik `810 s`, blokada wyjścia 0 korpusu `40–490 s`, obsada `MU-W3` zarezerwowana `0–490 s`, bezpośrednie przekazania bez oczekiwania (`500 / 580 / 670 s`), zapasy reszt `6 + 6 szt.`, przeładowanie strony oraz eksport pakietu z porównaniem obu konfiguracji buforów i dokładnego źródła. Błędy runtime/konsoli: `0`. Dowody: `outputs/qa/7_12c2_b3e/ui.json`, `body_buffers.png`, `component_stock.png`.

Instrukcja użytkownika (`Instrukcja/Podrecznik_Uzytkownika.md`, `.html`, `.pdf`) zaktualizowana i zweryfikowana (`scripts/verify_manual.py`): **66 stron, 53 ilustracje**, zgodność HTML/MD, kompletność sekcji, brak pustych stron i tekstu poza stroną. Oględziny strony 30 (`outputs/qa/manual_7_12c2_b3e/changed_30.png`) oraz `outputs/qa/manual_7_12c2_b3e/report.json` PASS.

## Pozostałe ograniczenia

Jednoczesne wejście 0 podmontażu (`subassemblyBuffers.inputCapacity = 0`) ze skończonymi lub zerowymi buforami korpusu w grafie, wiele bezpośrednich partii podmontaży, częściowa obecność obsady przy zatrzymywanym wyjściu `bbas`, alternatywne kopie na ścieżce korpusu, przezbrojenia oraz pełny odbiór fizycznego C2 pozostają w trakcie. Następny zakres wymaga Sol do oceny/implementacji/weryfikacji.

Postęp głównych ID: **61/72 = 84,7%**; pierwsze wydanie **61/68 = 89,7%**.
