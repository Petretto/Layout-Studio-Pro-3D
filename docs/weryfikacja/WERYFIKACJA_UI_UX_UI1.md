# 7.13.X / UI1a — kompaktowa rama aplikacji

Rozpoczęcie: 2026-10-23. Odbiór: 2026-10-24. Status: **UI1a odebrany**, cały UI1 oraz 7.13.X/U nadal w trakcie. Zakres: rzeczywisty nagłówek, menu i nawigacja istniejącej aplikacji; nie makieta ani nowy model procesu. UI2–UI4 pozostają do wykonania.

## Implementacja

- Nowe `src/components/shell/AppShell.tsx` i `.css`: nagłówek 56 px desktop / 104 px telefon; ikony Cofnij/Ponów/Zapisz z nazwami i podpowiedziami na hover/focus; menu projektu, eksportu i ustawień/pomocy. Menu obsługują Escape, strzałki, Home/End, focus po zamknięciu i zamknięcie przez wyjście poza menu.
- Nowy `src/core/uiNavigation.ts`: sześć obszarów zachowuje wszystkie dziesięć istniejących widoków. Podwidoki są oddzielne, więc same formularze nie zostały jeszcze połączone w nowe wielopanelowe ekrany. Ostatni podwidok jest pamiętany w sesji komponentu, nie dopisywany do dokumentu projektu. Powtórny wybór aktywnego obszaru nie resetuje widoku. Na telefonie obszar i podwidok wybiera się z list, bez długiego paska zakładek.
- `App.tsx` przekazuje istniejące funkcje Zapisz/Cofnij/Ponów/Eksport/Import/Nowy/Pakiet/Kopie do nowej ramy. Nazwę i jednostki przeniesiono do modalnego okna „Dane projektu głównego”. Zmiany stosowane na bieżąco, z istniejącą historią. Nie ma osobnego przycisku Anuluj sugerującego rollback całego formularza.
- Krótki stan zapisu i źródło widoku pozostają widoczne. Zwykłe metadane zapisu/eksportów są w disclosure; błędy zapisu oraz ostrzeżenia o nieaktualności plików/druku poza nim. Nazwa w nagłówku dotyczy projektu głównego; obszar stanowisk jawnie wskazuje osobne dokumenty. Nie dodano wyboru aktywnego wariantu domenowego w tym nagłówku i nie scalono źródeł 4/5/6.
- `tests/qa/verify_6_6.mjs` otrzymał wejście do symulacji przez nową grupę/podwidok, z zachowaniem obsługi dawnego buildu. Pozostałe historyczne skrypty UI używające numerowanych etykiet wymagają adaptacji przy kolejnych pakietach. Nie raportujemy ich zbiorczego odbioru.

Bez zmian schematów, localStorage, importerów, reguł migracji, workerów, rezerwacji, obliczeń lub geometrii. Przyciski przykładów nadal na Pulpicie; ich usunięcie i pusty start dopiero w odpowiednim pakiecie 7.13/UI4 po zastąpieniu plikami. Treści starych ekranów i część nazw technicznych wewnątrz pozostają; ten pakiet nie stanowi pełnego redesignu.

Backup `backup/v0.4.0_przed_ui1_20261023`: **554 pliki**, osobny odczyt skopiowanych bajtów względem `SHA256.txt` **PASS**. Zachowano niezwiązany zmieniony plik `outputs/data_audit/eko_7_1.json` i wszystkie lokalne materiały użytkownika.

## Pomiary przed/po

Ten sam Pulpit Eko, zamknięte menu/metadane, brak komunikatu sesyjnego; wymiary CSS w rzeczywistym UI. To pomiar kontenera treści, nie samego viewportu CAD (jego przebudowa w UI2).

| Okno | Nagłówek przed → po | Wysokość treści przed → po |
| --- | --- | --- |
| 1440×900 | 171 → **56 px** | 638,1 → **776 px** |
| 1280×720 | 171 → **56 px** | 458,1 → **596 px** |
| 390×844 | 421,9 → **104 px** | 329,6 → **648 px** |

Bez poziomego overflow całej strony lub nagłówka w tych trzech ustawieniach. Stany błędów mogą nadal zajmować dodatkową wysokość, bo nie są ukrywane. Źródła pomiaru i zrzuty `outputs/qa/ui1/before.json`, `after.json`, `before_*.png`, `after_*.png`, `mobile_menu.png`.

## Wykonane sprawdzenia

1. **Testy celowane UI1: 2/2 PASS** — kompletność i unikatowość tras, pamięć podwidoku, aktywny obszar, odrzucenie obcego zapamiętanego podwidoku i fallback. Nie testują wyglądu przez porównywanie implementacji CSS.
2. **Pełna regresja sekwencyjna 402/402 PASS**: `node scripts/test.mjs --suite=core` **108/108**, następnie `--suite=network` **294/294**. Okresowy pełny przebieg uzasadniony trzecim pakietem od A2b1 oraz zmianą ramy aplikacji. Nie uruchamiano równolegle z buildem. Progów wydajności i algorytmów nie zmieniono.
3. **Końcowy TypeScript/Vite build PASS**, z istniejącym ostrzeżeniem o dużych chunkach. Po pełnych testach dodano wyłącznie wizualną podpowiedź ikon na focus i korektę listy w instrukcji; wykonano końcowy build. Żaden kod domeny/badanych testami obliczeń nie uległ zmianie.
4. **Interaktywny UI przez cua_repl**: Vite 5173 oraz finalny produkcyjny build 5303. Sprawdzono 1440/1280/390 px, menu projektu i eksportu, Escape/powrót focusu, Home/End, ustawienia nazwy i Cofnij/Ponów, pamięć podwidoku Materiały po przejściu przez Bilansowanie, mobilne listy i diagram Przepływ, okna Kopie/Pakiet, rzeczywiste pobranie JSON (schemat 4, 16 operacji, prawidłowa nazwa), wejście do importera z tego pliku oraz anulowanie potwierdzenia bez nadpisania. Zapis/odświeżenie zachowały nazwę i projekt. Nie wykonywano destrukcyjnego odtworzenia backupu ani nowej migracji — te mechanizmy nie zostały zmienione i są objęte testami core.
5. **Symulacja**: wejście przez Hala i symulacja → 3D i symulacja oraz Start z paska 3D sprawdzono w końcowym buildzie; odczyt rosnącego czasu i stabilna pauza zapisane w `outputs/qa/ui1/report.json`. Vite mógł przeładować kartę po regeneracji HTML instrukcji, dlatego końcowy odbiór czasu wykonano na statycznym buildzie, bez HMR. Całego skryptu CDP 6.6 w tym pakiecie nie uruchamiano; sprawdzono składnię i odpowiadające mu działania interaktywnie. Nie wykonywano ponownie pełnego odbioru scen/gestów niezmienionego CAD.
6. **Instrukcja MD/HTML/PDF**: nowe dojścia do funkcji, okno danych, menu, screenshoty desktop/mobilny i sekcja 5.17. **59 stron, 48 obrazów, 6 592 034 bajty**. `verify_manual.py` PASS: zgodność HTML, wymagane sekcje/treści/obrazy wszystkich formatów, brak pustych stron i tekstu poza stroną. Przejrzano contact sheet początku i ostatnią stronę; po zauważeniu surowej składni tabeli zamieniono nową tabelę na listę i ponownie wygenerowano/zweryfikowano PDF. Starsze screenshoty funkcji szczegółowych zachowano z objaśnieniem mapowania nowej nawigacji.

## Pozostały zakres

UI1a kończy ramę i dostęp do obecnych działań, nie cały UI1/X1. Pozostają pełny rejestr wszystkich akcji ekranów, docelowe projekty Pulpitu/Bilansu, całościowe ujednolicenie kontrolek/komunikatów, warianty w nagłówku oraz zbiorczy odbiór 200% i testy całej klawiaturowej ścieżki wszystkich formularzy. Nie deklarujemy ich PASS na podstawie pomiaru trzech rozdzielczości. UI2 odzyska rzeczywisty viewport i panele CAD/symulacji; UI3 przebuduje dane/proces/bilans, UI4 pulpit/raporty/pusty start i domknie odbiór. A2b2b pozostaje niezależnym otwartym zadaniem integracji fizycznej.

Postęp głównych ID: **61/72 = 84,7%**, pierwsze wydanie **61/68 = 89,7%**. Commit/push pakietu nie jest dowodem wdrożenia/odbioru Vercel.
