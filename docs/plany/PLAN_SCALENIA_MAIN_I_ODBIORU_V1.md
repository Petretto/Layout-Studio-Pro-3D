# Scalenie do main i odbiór V1

Pobrane referencje 18 listopada 2026 wskazują trzy różne stany.

| Stan | SHA | Rola |
|---|---|---|
| `origin/main` i zamrożony RC1 | `6aa84d8129b7f7cc4d92c3c00b4d8a99a255d3eb` | Punkt odniesienia audytu |
| `origin/codex/hotfix-eko-public` | `1805f257fa71c12cc516d0b614a8be0d8e1afd9a` | Osobny hotfix katalogu, wdrożony wcześniej na produkcji |
| `origin/codex/v1-p4a-web` | `766210c3de2d423fba40657a48dae4772c84a5f9` | Gałąź remediacji i źródło lokalnego kandydata do testów PT |

## Osobne decyzje o scaleniu

**Sam hotfix Eko można zsynchronizować z main już na tym etapie**, po zgodzie właściciela na tę operację i ustaleniu, czy aktualizacja gałęzi uruchomi kolejne wdrożenie. Hotfix jest jednym commitem bezpośrednio nad zweryfikowanym `origin/main`. Ponowione testy katalogu i lokalnych odpowiedzi HTTP przeszły. Publiczna domena zwróciła indeks z pakietami 01–03 i dwa HTTP 404 dla dawnych adresów Eko. Sam odczyt HTTP potwierdza zachowanie domeny w chwili pomiaru. SHA aktualnego aliasu należy odczytać z panelu Vercel przed zmianą.

**Pełna remediacja może trafić do main jako wydanie po G5.** Najpierw wymagane są niezależny odbiór P0/PT, zatwierdzenie projektu technicznego G2, integracja 4/6 i UI3/UI4/X3, domknięcie zakresu web i Eko, pilot z uczestnikiem oraz weryfikacja dokładnego SHA przed RC2. Następnie ponowny audyt RC2, akceptacja właściciela i decyzja o promocji. Gałąź z 18 listopada zmieniała 185 plików względem main. Jako źródło testów pozwala zweryfikować dotychczasową remediację, a jej wynik nie zamyka całego zakresu V1.

## Przygotowanie okna scalenia hotfixu

1. Pobrać referencje, sprawdzić zakres diff i potwierdzić, że hotfix nadal zawiera wyłącznie zmianę katalogu oraz jej testy i dokumentację. Preferowany jest przegląd dokładnego commita `1805f25`. Jeżeli sposób scalenia tworzy nowy SHA, porównać drzewo wyniku z drzewem sprawdzonego hotfixu.
2. W Vercel sprawdzić gałąź produkcyjną, aktywny alias, build SHA i automatyczne wdrażanie. Zgoda na wcześniejszą promocję dotyczyła wdrożonego hotfixu. Aktualizacja `main` może wywołać nowy build, zależnie od konfiguracji. [Integracja Git i Vercel](https://vercel.com/docs/git).
3. Po zgodzie wykonać zwykłe scalenie przez mechanizm wymagany przez repozytorium i sprawdzić `origin/main`. Jeśli Vercel utworzy wdrożenie, potwierdzić jego SHA i domenę oraz powtórzyć test indeksu 01–03 i dawnych adresów Eko.
4. Zachować jako punkt powrotu wdrożenie ze sprawdzoną blokadą Eko. RC1 zawierał publiczne pliki Eko i nie spełnia tego warunku. Scalenie hotfixu nie rozstrzyga publicznej historii Git ani starych kopii.

Próba `git merge-tree` wykazała konflikty przy późniejszym połączeniu hotfixu z gałęzią remediacji. Dotyczą katalogu `DemoCatalog.tsx`, indeksu dokumentacji i dwóch plików testów przeglądarkowych (`browserHarness.mjs` i `verify_p4b_cached_catalog.mjs`). Rozwiązać je w gałęzi integracyjnej. Zachować listę 01–03, ochronę zastępowania projektu P0 i aktualne asercje PT. Przed RC2 potwierdzić wynik od nowa na scalonym SHA.

## Materiał do niezależnego odbioru G1

Odbiór ma dotyczyć wskazanego SHA. Audytor przegląda własności ochrony projektów w [raporcie P0](../weryfikacja/WERYFIKACJA_REMEDIACJI_P0_BEZPIECZENSTWO_DANYCH.md) i dobiera niezależne próby T02–T06. Minimalne przypadki to odmowa przy braku kopii lub potwierdzenia, dokładne porównanie wcześniejszych zapisów 4/5/6 i wariantów po błędzie, blokada po niepotwierdzonym wycofaniu oraz odtworzenie z poprawnej kopii po ponownym otwarciu. Potrzebny jest osobny wynik dotyczący adekwatności asercji PT T07/T08. Każda próba powinna zapisać SHA, środowisko, oczekiwanie, rzeczywisty wynik i powód ewentualnego FAIL lub NOT_VERIFIED.

Pilota z uczestnikiem prowadzi się na czystym profilu i danych syntetycznych. Uczestnik samodzielnie otwiera R01, oblicza i porównuje warianty, pobiera raport oraz zapisuje i ponownie otwiera pracę. Następnie wykonuje R04 jako odrębny przykład fizyczny. Protokół T28 zapisuje SHA, czynności, trudności, momenty interwencji, pliki wynikowe i końcową decyzję o odbiorze. [Plan testów RC2](PLAN_TESTOW_RC2.md).
