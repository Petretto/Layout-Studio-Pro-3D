# Dokumentacja projektu

Główny rejestr statusu pozostaje w [PLAN_ROZWOJU.md](../PLAN_ROZWOJU.md). Zasady pracy: [AGENTS.md](../AGENTS.md). Ścieżki w tekście zapisane w backtickach są ścieżkami względem katalogu projektu; klikalne odnośniki są względne do dokumentu.

| Katalog | Zawartość i miejsce nowych plików |
| --- | --- |
| [modele/](modele/) | Kontrakty i modele domenowe `MODEL_*`, standardy i parametry wyposażenia. |
| [weryfikacja/](weryfikacja/) | Raporty `WERYFIKACJA_*`, `RAPORT_*`, odbiory i ograniczenia. |
| [plany/](plany/) | Plany szczegółowe, propozycje rozwoju i notatki do kolejnych prac. |
| [produkt/](produkt/) | [Funkcje programu](produkt/FUNKCJE_PROGRAMU.md), specyfikacja i opisy produktu. |
| [dane/](dane/) | Opisy pochodzenia danych i scenariuszy; właściwe dane pozostają w `dane/`, `przyklady/` i `tests/fixtures/` w katalogu projektu. |
| [historia/](historia/) | Rejestry zmian wydań `ZMIANY_*`. |
| [projekty/](projekty/) | Projekty i propozycje interfejsu, historyczne materiały projektowe. |

Pozostałe materiały:

- [Weryfikacja remediacji P0 — bezpieczeństwo danych](weryfikacja/WERYFIKACJA_REMEDIACJI_P0_BEZPIECZENSTWO_DANYCH.md) — reprodukcja S-03, trwała kopia/odzyskanie, formularze/autosave, BL-01 i S-15, wykonane testy i otwarty niezależny odbiór.

- [Plan remediacji po audycie RC1](plany/PLAN_REMEDIACJI_PO_AUDYCIE_RC1.md) — decyzje A-01–A-04, pakiety, zależności, modele i bramki; po pobraniu i ponownej weryfikacji aktualnego main 2026-11-02, z metryką RC1/main/bazy gałęzi. G0 zatwierdzona; P0 wdrożone lokalnie 2026-11-03, pozostałe bramki otwarte.
- [Architektura integracji modeli V1](plany/ARCHITEKTURA_INTEGRACJI_MODELI_V1.md) — trzy opcje, rekomendowani właściciele danych, migracje i wspólny raport; projekt do zatwierdzenia.
- [Zakres wydania V1.0.0](plany/ZAKRES_WYDANIA_V1_0_0.md) — docelowy zakres, UI3/UI4/X3, web, prywatność, Eko i ograniczenia.
- [Macierz audyt → remediacja](plany/MACIERZ_AUDYT_REMEDIACJA.md) — BL-01–03, S-01–18, luki dowodowe i warunki zamknięcia.
- [Plan testów RC2](plany/PLAN_TESTOW_RC2.md) — scenariusze referencyjne, migracje, ochrona danych, UI/web i warunki utworzenia przyszłego RC.
- [Osobny pulpit postępu](../progress-dashboard/README.md) — monitor planu i remediacji, lokalny LIVE lub snapshot; [odbiór aktualizacji RC1](weryfikacja/WERYFIKACJA_PULPITU_POSTEPU_RC1.md).

- [Plan audytu przedwydaniowego V1](plany/audit_plan.md) — zakres, kolejność i zasady niezależnego audytu.

- [Przekazanie C2-B3-UI dla Terra](plany/PRZEKAZANIE_C2_B3_UI_TERRA.md) — formularz istniejących buforów podmontaży i kryteria odbioru; integracja harmonogramu pozostaje osobnym pakietem Sol.
- [Weryfikacja C2-B3-UI](weryfikacja/WERYFIKACJA_C2_B3_UI.md) — wyniki testów formularza, zapisu i historii.
- [Weryfikacja C2-B3a](weryfikacja/WERYFIKACJA_BUFOROW_PODMONTOW_C2_B3A.md) — wspólny odbiór jednej partii bezpośredniej i partii buforowanych.
- [Weryfikacja C2-B3b](weryfikacja/WERYFIKACJA_BUFOROW_PODMONTOW_C2_B3B.md) — dodatnie bufory korpusów z gałęziami i próba spiętrzenia.
- [Weryfikacja C2-B3c](weryfikacja/WERYFIKACJA_BUFOROW_PODMONTOW_C2_B3C.md) — lokalna kontynuacja korpusu w grafie gałęzi.
- [Weryfikacja C2-B3d](weryfikacja/WERYFIKACJA_BUFOROW_PODMONTOW_C2_B3D.md) — zatrzymanie obsady korpusu przy pełnym dodatnim wyjściu.
- [Weryfikacja C2-B3e](weryfikacja/WERYFIKACJA_BUFOROW_PODMONTOW_C2_B3E.md) — pojemności zerowe wejścia i wyjścia korpusów w grafie gałęzi.
- [Weryfikacja C2-B3f](weryfikacja/WERYFIKACJA_BUFOROW_PODMONTOW_C2_B3F.md) — bezpośrednie wejście 0 podmontażu z buforami korpusów, odbiorca bezpośredni z zatrzymaniem obsady i lokalne przekazanie 0/0.
- [Weryfikacja C2-final](weryfikacja/WERYFIKACJA_BUFOROW_PODMONTOW_C2_FINAL.md) — pełne zamknięcie podpakietu C2, reguła zakazu wiszenia detali w powietrzu, pakiet demonstracyjny v1.2.0.
- [Weryfikacja 7.12.D i 7.2](weryfikacja/WERYFIKACJA_ODBIOR_I_SZABLONY_7_12_D_FIZYCZNY.md) — zbiorczy odbiór fizyczny i szablony trzech zewnętrznych pakietów pokazowych oraz walidacja referencji analitycznych (zamknięcie punktów 7.12 i 7.2).
- [Weryfikacja 7.13](weryfikacja/WERYFIKACJA_PUSTEGO_STARTU_I_KATALOGU_7_13_FINAL.md) — pusty start bez wbudowanych projektów, rozwijany katalog 4 zewnętrznych pakietów pokazowych z SHA-256 i ochrona danych.
- [Weryfikacja 7.14](weryfikacja/WERYFIKACJA_TUTORIALU_7_14.md) — interaktywny tutorial krok po kroku oparty na pakiecie zestawu montażowego, 8 etapów Lean, persystencja i ochrona środowiska.
- [Weryfikacja 6.3](weryfikacja/WERYFIKACJA_MODELI_WYPOSAZENIA_6_3.md) — 10 autorskich modeli wyposażenia, regałów i wyrobów w Blenderze (5.2.1 LTS), weryfikacja GLB, budżet $\le 5000$ trójkątów i integracja wizualna.
- [Weryfikacja 7.1](weryfikacja/WERYFIKACJA_KWALIFIKACJI_DANYCH_7_1.md) — uporządkowanie pochodzenia i kwalifikacji danych walidacyjnych (pomiary rzeczywiste, pakiety syntetyczne, fixtures testowe) i zautomatyzowany audyt.
- [Historyczny raport 7.9](weryfikacja/WERYFIKACJA_PILOTAZU_I_ZAKRESU_WYDANIA_7_9.md) — deklarowany odbiór z 2026-10-28; zakres dowodów zakwestionowany w audycie RC1. Bieżące bramki i otwarte statusy określają plan remediacji oraz PLAN_ROZWOJU.md, bez zmiany treści raportu historycznego.

- [Instrukcja użytkownika](../Instrukcja/Podrecznik_Uzytkownika.md) — źródło MD oraz wersje HTML/PDF w `Instrukcja/`.
- [Projekty graficzne](../design/) — pliki `.pen`.
- `outputs/qa/` — logi, zrzuty i pozostałe dowody testów.
- `backup/` — lokalne kopie, bez przenoszenia lub przepisywania historii ich zawartości.
- [Mapa przeniesionych plików](relocations.json) — stare i nowe ścieżki przy porządkowaniu 2026-10-26.

Po dodaniu dokumentacji lub zmianie jej ścieżek uruchom `node scripts/verify_documentation.mjs`. Nie twórz raportów, kontraktów i luźnych notatek w katalogu głównym.
