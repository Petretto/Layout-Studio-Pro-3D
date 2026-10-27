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

- [Przekazanie C2-B3-UI dla Terra](plany/PRZEKAZANIE_C2_B3_UI_TERRA.md) — formularz istniejących buforów podmontaży i kryteria odbioru; integracja harmonogramu pozostaje osobnym pakietem Sol.
- [Weryfikacja C2-B3-UI](weryfikacja/WERYFIKACJA_C2_B3_UI.md) — wyniki testów formularza, zapisu i historii.
- [Weryfikacja C2-B3a](weryfikacja/WERYFIKACJA_BUFOROW_PODMONTOW_C2_B3A.md) — wspólny odbiór jednej partii bezpośredniej i partii buforowanych.

- [Instrukcja użytkownika](../Instrukcja/Podrecznik_Uzytkownika.md) — źródło MD oraz wersje HTML/PDF w `Instrukcja/`.
- [Projekty graficzne](../design/) — pliki `.pen`.
- `outputs/qa/` — logi, zrzuty i pozostałe dowody testów.
- `backup/` — lokalne kopie, bez przenoszenia lub przepisywania historii ich zawartości.
- [Mapa przeniesionych plików](relocations.json) — stare i nowe ścieżki przy porządkowaniu 2026-10-26.

Po dodaniu dokumentacji lub zmianie jej ścieżek uruchom `node scripts/verify_documentation.mjs`. Nie twórz raportów, kontraktów i luźnych notatek w katalogu głównym.
