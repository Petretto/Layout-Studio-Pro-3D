# 7.12.A1 — pojedynczy pakiet projektu

Odbiór: **2026-10-21**, po implementacji i próbach 19–20 października. Zakres A1 zakończony; główne 7.12 pozostaje w trakcie. Nie jest to odbiór trzech kompletnych projektów pokazowych ani integracji widoków A2.

## Zmiana i bezpieczeństwo danych

Dodano `src/core/projectPackage.ts`, okno `ProjectPackageModal.tsx` i przycisk **Pakiet projektu**. Format `layout-studio-project-package` v1 ma limit 25 MiB UTF-8 i SHA-256 kanonicznego obiektu `data`. Zachowuje dokładne teksty źródła 4, opcjonalnego źródła 5, pełnej otoczki szkicu 6 i biblioteki wariantów tego samego źródła. Nie zmienia schematów projektów 4/5/6 ani formatu kopii środowiska v1. Zwykłe importery/eksportery pozostają dostępne.

Eksport wybiera rodzinę zapisanego szkicu 6, nawet gdy główny projekt 4 jest inny. Brak oryginału 4 przy źródle 5 wymaga jawnego wskazania właściwego pliku. Zgodne ID nie dowodzi historycznego pochodzenia; wybór jest deklaracją użytkownika. Obca lub uszkodzona biblioteka 6 blokuje eksport, bez cichego odrzucania wariantów. Pochodzenie wybierane jawnie; domyślnie `unspecified`, próby `synthetic`.

Import ma podgląd, pobranie pełnej kopii ratunkowej i potwierdzenie. Zastępuje cztery obszary: aktywny 4, warsztat 5, szkic 6 i warianty 6. Brakujące 5/warianty 6 usuwają stary zapis. Niezależna biblioteka scenariuszy 4, nawet uszkodzona, oraz obce klucze są zachowane. Wspólny mechanizm odzyskiwania rozszerzono tylko o jawne zachowanie biblioteki 4; domyślne pełne odtworzenie nadal obejmuje wszystkie pięć obszarów.

Autozapis, skróty i tło są blokowane na czas okna. Nieaktualna kopia ratunkowa blokuje zapis. Błąd uruchamia wycofanie z weryfikacją i snapshotem sprzed zmian; niepotwierdzone wycofanie blokuje zamknięcie/edycję. Dostępne pełne odzyskiwanie bez opuszczania ochrony okna. Sukces przeładowuje aplikację; Cofnij nie odwraca importu.

Backup przed zmianą: `backup/v0.4.0_przed_7_12a1_20261019`, **449 plików, SHA-256 PASS**. Poprzednie lokalne dane i historia pozostały zachowane.

## Wykonana weryfikacja

| Sprawdzenie | Wynik i zakres |
| --- | --- |
| `node scripts/test.mjs --suite=core --test-name-pattern=7\.12\.A1\|7\.6` | **12/12 PASS**: 6 nowych testów A1 i 6 testów odzyskiwania. Dokładne źródła, niezależny aktywny 4, źródło 5 i jawny oryginał, null, integralność/wersje/ID/obce źródło/limit, ochrona przed zmianą snapshotu, awaria każdego z czterech obszarów i wycofanie. |
| `node scripts/probe_project_package_7_12a1.mjs` | **PASS**, źródła 4 i 5 → import → eksport z identycznymi `data`, zachowanie niezależnej biblioteki. Raport `outputs/qa/7_12a1/report.json`. |
| `npm.cmd run test -- --run` | **382/382 PASS**, jedna pełna regresja integracyjna. Uzasadnienie: nowa ścieżka obejmuje zapis i odtworzenie czterech obszarów schematów 4/5/6 oraz wspólny mechanizm odzyskiwania. |
| `npm.cmd run build` | **PASS**, TypeScript i produkcyjny Vite. Pozostaje istniejące ostrzeżenie o dużych chunkach. Końcowa kompilacja uwzględnia także blokadę komunikatów tła. |
| `node tests/qa/verify_7_12a1.mjs` | **PASS**, izolowany Edge, prawdziwe pola plikowe i pobrane pliki; czysty profil → pakiet → przeładowanie, odmowa eksportu bez szkicu, podgląd/anulowanie, błędne SHA, wymagane kopia i potwierdzenie, blokada tła/Ctrl+S, nieaktualny snapshot, quota i trwała awaria z blokadą, pełne odzyskanie, oba źródła → eksport dokładnych danych, brak oryginału 4 i jawne dołączenie, usunięcie starego 5, scenariusze 4 zachowane, szkic/wariant widoczny po odświeżeniu; **0 wyjątków JS**. Raport `outputs/qa/7_12a1_ui/report.json`. |

Próby awarii pamięci i równoczesnej zmiany są celowo wstrzykiwane, nie przedstawiają błędów rzeczywistego profilu użytkownika. Skrypt UI izoluje katalog każdego pobrania, aby ponowne pobranie tej samej nazwy nie było mylone z brakiem pliku. Przerwane próby transportu CDP nie są zaliczane jako PASS; końcowy raport zawiera pełne przejście.

Pliki `outputs/qa/7_12a1/` są małymi syntetycznymi próbami formatu, **celowo niekompletnymi technologicznie**. Nie są projektem B/C. Nie użyto danych Eko jako nowego sztywnego projektu.

## Dokumentacja i pozostały zakres

Zaktualizowano kontrakt i README przykładów, rejestr zmian, funkcje programu oraz podręcznik MD/HTML/PDF (rozdział 5.13). Kontrola obejmuje zgodność HTML ze źródłem, obrazy, sekcje, treść wszystkich formatów, puste strony i granice tekstu. Wyniki końcowe w `outputs/qa/manual_7_12a1/report.json`; przegląd renderów zmienionego rozdziału i strony tytułowej wykonany osobno.

Wynik końcowy: **53 strony, 44 obrazy, 6 168 712 bajtów PDF; kontrola treści/granic/zgodności HTML PASS, przegląd zmienionych renderów PASS**. Po końcowym teście Edge ponownie wygenerowano HTML i PDF, aby obejmowały aktualny zrzut; końcowe `--check` PASS. Nie deklarowano wizualnego odbioru każdej niezmienionej strony.

- Ustawienia sesji (partia, odstęp przybyć, JIT, ustawienia eksperymentów/kosztów nieobecne w modelu) wymagają jawnego ustawienia według README. A1 nie zapisuje wymyślonych wartości.
- Poprawność pliku nie oznacza kompletności danych do symulacji. Źródłowy 4 i szkic 6 pozostają odrębnymi ścieżkami; wspólne widoki/raport/animacja są w A2.
- Manifest katalogu i ZIP nie mają importera. Dowolne modele STEP/GLB nie są dodane przez ten format.
- Nowe trzy przykłady, ich niezależne wzorce i tutorial są nadal w B/C/D, 7.13/7.14.

Następny pakiet: **7.12.B — podstawowy zewnętrzny projekt pokazowy** zgodnie z kontraktem, z kompletnymi plikami i niezależnie obliczonymi wynikami. Postęp głównych ID bez zmiany: **61/72 = 84,7%**, pierwsze wydanie **61/68 = 89,7%**. Wysłanie Git nie potwierdza wdrożenia Vercel; tego wdrożenia nie zweryfikowano w A1.
