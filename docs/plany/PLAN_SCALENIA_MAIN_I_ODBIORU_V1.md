# Scalenie do main i odbiór V1

Stan referencji po scaleniu hotfixu 18 listopada 2026.

| Stan | SHA | Rola |
|---|---|---|
| Zamrożony RC1 | `6aa84d8129b7f7cc4d92c3c00b4d8a99a255d3eb` | Punkt odniesienia audytu |
| `origin/main` i `origin/codex/hotfix-eko-public` | `1805f257fa71c12cc516d0b614a8be0d8e1afd9a` | Hotfix katalogu aktywny na produkcji |
| Historyczna migawka robocza | `766210c3de2d423fba40657a48dae4772c84a5f9` | Źródło dowodów z pełnego przebiegu PT przed scaleniem |

## Osobne decyzje o scaleniu

**Hotfix Eko został scalony z main.** Po zgodzie właściciela potwierdzono śledzenie `main` przez Production w Vercel i przesunięto zdalną gałąź fast-forward o jeden commit. Nowe wdrożenie wskazuje `1805f25` i ma oznaczenia Ready oraz Current. Domena zwróciła HTTP 200 dla aplikacji, indeksu i sześciu plików przykładowych o sumach SHA-256 zgodnych z indeksem. Historyczne ścieżki `04_eko.project.json` i `04_eko.zip` zwróciły HTTP 404 (text/plain). [Wdrożenie D4EfJZrTv2CrcBExrBfHHU1KD6cs](https://vercel.com/petrettos-projects/layout-studio-pro-3d/D4EfJZrTv2CrcBExrBfHHU1KD6cs).

**Pełna remediacja może trafić do main jako wydanie po G5.** Najpierw wymagane są niezależny odbiór P0/PT, zatwierdzenie projektu technicznego G2, integracja 4/6 i UI3/UI4/X3, domknięcie zakresu web i Eko, pilot z uczestnikiem oraz weryfikacja dokładnego SHA przed RC2. Następnie ponowny audyt RC2, akceptacja właściciela i decyzja o promocji. Gałąź z 18 listopada zmieniała 185 plików względem main. Jako źródło testów pozwala zweryfikować dotychczasową remediację, a jej wynik nie zamyka całego zakresu V1.

## Procedura zastosowana przy scalaniu hotfixu

1. Pobrać referencje, sprawdzić zakres diff i potwierdzić, że hotfix nadal zawiera wyłącznie zmianę katalogu oraz jej testy i dokumentację. Preferowany jest przegląd dokładnego commita `1805f25`. Jeżeli sposób scalenia tworzy nowy SHA, porównać drzewo wyniku z drzewem sprawdzonego hotfixu.
2. W Vercel sprawdzić gałąź produkcyjną, aktywny alias, build SHA i automatyczne wdrażanie. Zgoda na wcześniejszą promocję dotyczyła wdrożonego hotfixu. Aktualizacja `main` może wywołać nowy build, zależnie od konfiguracji. [Integracja Git i Vercel](https://vercel.com/docs/git).
3. Po zgodzie wykonać zwykłe scalenie przez mechanizm wymagany przez repozytorium i sprawdzić `origin/main`. Jeśli Vercel utworzy wdrożenie, potwierdzić jego SHA i domenę oraz powtórzyć test indeksu 01–03 i dawnych adresów Eko.
4. Zachować jako punkt powrotu wdrożenie ze sprawdzoną blokadą Eko. RC1 zawierał publiczne pliki Eko i nie spełnia tego warunku. Scalenie hotfixu nie rozstrzyga publicznej historii Git ani starych kopii.

Na gałęzi roboczej `codex/v1-p4a-web` rozwiązano cztery konflikty. Zachowano dotychczasowy kod katalogu, jego listę 01–03, ochronę zastępowania projektu P0 i harness z remediacji. Test katalogu sprawdza obecność trzech przykładów i odrzucenie starego indeksu z Eko. Build, osiem testów katalogu i PT, lokalny HTTP, test katalogu w Edge oraz 17 scenariuszy P0 w Edge zakończyły się pomyślnie. Porównanie z pierwszym rodzicem scalenia potwierdziło identyczny kod produktu, konfigurację Vercel i publiczne pliki. Pełny baseline pozostaje zaplanowany na przyszłym kandydacie.

## Materiał do niezależnego odbioru G1

[Protokół odbioru G1](../weryfikacja/PROTOKOL_ODBIORU_G1_P0_PT.md) zawiera wskazany SHA, polecenia, oczekiwania dla T02–T08 i format niezależnego wyniku.

Odbiór ma dotyczyć wskazanego SHA. Audytor przegląda własności ochrony projektów w [raporcie P0](../weryfikacja/WERYFIKACJA_REMEDIACJI_P0_BEZPIECZENSTWO_DANYCH.md) i dobiera niezależne próby T02–T06. Minimalne przypadki to odmowa przy braku kopii lub potwierdzenia, dokładne porównanie wcześniejszych zapisów 4/5/6 i wariantów po błędzie, blokada po niepotwierdzonym wycofaniu oraz odtworzenie z poprawnej kopii po ponownym otwarciu. Potrzebny jest osobny wynik dotyczący adekwatności asercji PT T07/T08. Każda próba powinna zapisać SHA, środowisko, oczekiwanie, rzeczywisty wynik i powód ewentualnego FAIL lub NOT_VERIFIED.

- Punkt wejścia do P0 to `src/core/workspaceReplacement.ts` i `node tests/qa/verify_remediation_data_safety.mjs` po buildzie. Audytor porównuje surowe wartości slotów przed i po odmowie oraz po odtworzeniu, również dla zapisów w drugiej karcie. Własna próba audytora powinna sprawdzić zachowanie po przerwaniu wycofania przy użyciu wyłącznie syntetycznego zapisu.
- Dla T07 audytor weryfikuje mapę w `tests/qa/ptCoverage.test.mjs` i logi wszystkich 16 skryptów. Dla T08 sprawdza, czy `node tests/qa/verify_pt_pilot_faults.mjs` odrzuca cztery błędne stany z właściwą przyczyną i czy zwykły pilot potwierdza wynik, porównanie, edycję i odtworzenie. Wzorce R01–R05 odtwarza z wejść domenowych opisanych w [raporcie PT](../weryfikacja/WERYFIKACJA_PT_TESTY_E2E.md).
- Logi pełnego przebiegu dla `766210c` są lokalnie w `outputs/qa/pt_candidate_0fc7f053/` i obejmują także `result.json`, `additional-results.json` oraz `verify-clean.log`. Miarodajny wynik audytora ma wskazywać badany SHA, a dowody z każdego SHA wymagają własnej metryki. G1 czeka na niezależny wynik.

Pilota z uczestnikiem prowadzi się na czystym profilu i danych syntetycznych. Uczestnik samodzielnie otwiera R01, oblicza i porównuje warianty, pobiera raport oraz zapisuje i ponownie otwiera pracę. Następnie wykonuje R04 jako odrębny przykład fizyczny. Protokół T28 zapisuje SHA, czynności, trudności, momenty interwencji, pliki wynikowe i końcową decyzję o odbiorze. [Plan testów RC2](PLAN_TESTOW_RC2.md).
