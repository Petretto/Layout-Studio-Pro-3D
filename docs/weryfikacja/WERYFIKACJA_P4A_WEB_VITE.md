# P4a.1 — Vite i wstępna inwentaryzacja web

Stan 2026-11-10, gałąź `codex/v1-p4a-web`, baza `0b3a66acb1f0c249950c3c301f46a841b6f00ace`; pobrany `origin/main` i RC1: `6aa84d8129b7f7cc4d92c3c00b4d8a99a255d3eb`. P4a pozostaje **w trakcie**.

## Zależność Vite — BL-02

Przed zmianą `npm audit --json --ignore-scripts` zgłosił jeden HIGH dla Vite 7.3.6. Wersję przypięto do 7.3.8; diff lockfile obejmuje tylko tę zależność. Wtyczki React i Tailwind rozwiązują ją do tej samej wersji. [Ogłoszenie Vite GHSA-p4f5-76q4-ffq7](https://github.com/vitejs/vite/security/advisories/GHSA-p4f5-76q4-ffq7) z 10 listopada wskazuje 7.3.8 jako poprawioną wersję i opisuje RCE dla serwera developerskiego wystawionego do sieci. Konfiguracja repozytorium domyślnie wiąże serwer z `127.0.0.1`; parametry uruchomienia mogą to zmienić. Sama informacja o dev serverze nie dowodzi RCE w statycznym produkcyjnym dist. Nowe ogłoszenie nie pojawiło się w odczycie npm audit przed zmianą, dlatego nie traktować samego audytu jako kompletnej listy.

Na Windows Node 24.14.0 / npm 11.12.0: `npm ci --ignore-scripts --no-fund --no-audit` PASS, `npm run build` PASS z ostrzeżeniem o dużych chunkach; cztery pliki testów QA 8/8 PASS; lokalne HTTP katalogu PASS. `verify_7_12d.mjs` PASS w odizolowanym Edge: trzy pakiety, R01–R05, harmonogramy, porównanie i round-trip; dowody `outputs/qa/pt_e2e/sol_reference/7_12d/run_m2W7E5/`. `npm audit --json --ignore-scripts` po zmianie: 0 zgłoszeń. To nie dowód braku wszystkich podatności, pełna regresja ani weryfikacja produkcji po aktualizacji. Zależności i źródła advisory należy ponownie sprawdzić przy wydaniu.

## Pozostałe kwestie P4a

`src/main.tsx` montuje Analytics bezwarunkowo. Vercel opisuje przesyłanie odsłon i możliwość wystąpienia w nich URL, referrera i parametrów: [prywatność Analytics](https://vercel.com/docs/analytics/privacy-policy). Faktyczne żądania i konfiguracja projektu nie zostały tu sprawdzone; nie deklarować braku transmisji danych. Polityka, decyzja o ewentualnych zgodach, test z sentinelami i ocena prawna pozostają otwarte.

SheetJS 0.20.3 jest pobierany z oficjalnego CDN zgodnie z [instrukcją producenta](https://docs.sheetjs.com/docs/getting-started/installation/frameworks/); lockfile zawiera integrity, a `npm ci` powiódł się. Samo powodzenie instalacji i wynik npm audit nie stanowią pełnego niezależnego przeglądu advisory, licencji i pochodzenia. SRI, pełna ocena zagrożeń oraz import/eksport XLSX wymagają dalszej weryfikacji. `vercel.json` nie definiuje nagłówków bezpieczeństwa; nagłówki hostingu nie zostały sprawdzone w tej próbie.

Pozostałe zadania P4a: profil Analytics domyślnie OFF zgodnie z planem i akceptacją właściciela, sieć/sentinela, CSP i workery, privacy, SheetJS/licencje, A→B i odzyskiwanie danych pod kontrolą Sol, produkcyjny test dopiero na odpowiednim kandydacie. Oddzielny hotfix Eko na produkcji nie obejmuje tej aktualizacji.

## Uzupełnienie — 16 listopada 2026

Ponowny `npm audit --json --ignore-scripts`: 0 zgłoszeń; jest to wynik dla bieżącego lockfile, nie dowód braku wszystkich podatności. Monitor przy CRLF scalał część historii i kryteriów. Parser normalizuje teraz końce wierszy, a testy porównują dane LF i CRLF; 8/8 testów monitora oraz kontrola dokumentacji PASS. Próba HTTP w sandboxie zwróciła EACCES na localhost; ponowienie poza sandboxem przeszło.

W `vercel.json` wyłączono automatyczne deploymenty wyłącznie dla gałęzi `codex/v1-p4a-web` przy użyciu [git.deploymentEnabled](https://vercel.com/docs/project-configuration/git-configuration). Żadna inna gałąź nie została wyłączona tą regułą. Skutek po push wymaga weryfikacji konfiguracji usługi; nie jest to zezwolenie na wdrożenie tej gałęzi. Przed scaleniem trzeba świadomie przeglądnąć regułę i politykę deploymentu.

## P4a.2 — analityka i informacje o sieci

W tej gałęzi `src/main.tsx` nie montuje ani nie importuje Vercel Analytics. Zależność pozostawiono w lockfile; brak mechanizmu włączania do czasu zaprojektowania profilu, informacji dla użytkownika i weryfikacji prywatności. Aktualny publiczny deployment jest osobny i nie zawiera tej zmiany. Nie jest to deklaracja, że hosting nie otrzymuje danych technicznych.

Usunięto z okna odzyskiwania i instrukcji MD/HTML/PDF niepotwierdzone twierdzenia o zerowej komunikacji i gotowości offline. Wersja webowa pobiera pliki i katalog, a hosting może rejestrować informacje o żądaniach. Samo pozostawienie danych w pamięci przeglądarki nie stanowi pełnej oceny prywatności. Nie zakończono przeglądu licencji i bezpieczeństwa ani oceny prawnej. Starszy zrzut mobilnego UI w instrukcji pokazywał nazwę Eko — odwołanie usunięto z nowej instrukcji, historyczny plik dowodowy zachowano. Nie przeprowadzono pełnego przeglądu wszystkich ilustracji i publicznych powierzchni Eko.

Build PASS. `verify_p4a_network.mjs` uruchomiono na lokalnym buildzie w odizolowanym Edge z obserwacją sieci CDP od nawigacji: nazwa syntetycznego projektu jako sentinel, katalog z trzema kartami i okno odzyskiwania; sześć żądań, brak zewnętrznych żądań, brak sentinela w przechwyconych URL/nagłówkach/treści i brak żądań innych niż GET. Kontrola negatywna detektora sprawdza sentinel w sztucznym URL i treści. Ograniczenie: dotyczy tej jednej ścieżki, nie całego produktu, workerów, ustawień konta Vercel ani rzeczywistego hostingu; inne źródła sieci wymagają osobnych prób. `verify_7_13_closure.mjs` PASS, dowody `outputs/qa/p4b/7_13_closure/run_bnQkr7/`.

Instrukcję wygenerowano ponownie; kontrola MD/HTML/PDF: 65 stron, 51 dostępnych ilustracji, bez pustych stron i słów poza stroną. Przejrzano wizualnie zbiorcze strony obejmujące zmienione sekcje. Pierwsza próba ponownego wydruku zwróciła `Printing is not available`; na oddzielnym porcie powiodła się. Dowody kontroli `outputs/qa/p4a_manual_final_v2/`. P4a, testy T23–T26 i odbiór prawny pozostają otwarte.
