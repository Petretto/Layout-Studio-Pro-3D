# 7.12.C2-B3a — wspólny odbiór mieszany

Data: 2026-10-27. Status: **wdrożony zakres jednej partii bezpośredniej i partii buforowanych**. Całe B3/C2/7.12 w trakcie.

## Zmiana i zgodność

`workerSchedule.ts` odróżnia liczbę partii bezpośrednich od liczby wszystkich wejść. Najpierw dostarcza partie do dodatnich buforów i sprawdza ich dostępność; później zabezpiecza przyjazd/start jednej partii bezpośredniej. Istniejące atomowe pobranie obejmuje wszystkie przypisania. Zostają rezerwacje przed odjazdem, zabezpieczenia przyszłych prac i powrotów, zachowanie reszt oraz jawne odmowy pozostałych nieobsługiwanych kombinacji.

Bez zmian schematu, migracji, zapisanych przykładów lub reguł transportu magazynowego. Backup `backup/v0.4.0_przed_c2_b3a_20261027`: 4 pliki, niezależne SHA-256 źródło/kopia PASS. Kontrakt: `docs/modele/MODEL_BUFOROW_PODMONTOW_C2.md`.

## Niezależne referencje i testy

8 testów B3a PASS (7 nowych i 1 zaktualizowany test poprzedniej odmowy mieszanych polityk). Próby są syntetyczne, z jawnymi ilościami/czasami:

- Producent 0–10; składowana partia 3 szt. przewożona 10–12, powrót 12–17; bezpośrednia 2 szt. przewożona 48–50. Odbiorca 50–60, pobranie obu przy 50. Ze składowanej pobiera 1, pozostają 2; na wejściu 0 zajętość 0. Zatrzymany producent zwolniony przy 48. Identyczny wynik dla obu kolejności deklaracji.
- Kalendarz osoby transportującej od 60: przewozy 60–62 i 67–69 po powrocie 62–67. Odbiorca 69–79; pobrania przy 69.
- Materiał dostępny przy 80: druga partia jedzie 78–80; oba podmontaże i materiał pobierane przy 80 po dostawie; koniec 90.
- Pojemność towarzysząca 2 przy partii 3 powoduje jawną odmowę/martwy punkt; brak mutacji projektu i pominięcia ograniczenia.
- Dwie gałęzie z C2: producenci 0–50 i 0–60, jawna grupa równoległości. SUB-DRV 5/3: przewóz 60–70, powrót 70–80, zapas 2. SUB-PWR 5/5: przewóz 90–100, źródło/osoba zatrzymane do 90. Wspólne pobranie przy 100, integracja 100–170, powrót 170–180. Korpus od początku w kopii odbiorcy; zaopatrzenie poza tą zredukowaną próbą.

- Mieszane polityki, zgodnie z decyzją użytkownika: dla obu przypisań `bbas`/`bbas-worker-released` wspólna obsada pozostaje zajęta do 48, również gdy partia z `bbas` jest odłożona już przy 10. Dla obu polityk zwalniających osoby kończą przy 10. Bez blokady wyjścia mieszana obsada też zwalnia się przy 10. Wariant z własną osobą transportującą dopuszcza jej wyjazd dopiero z ostatnią partią przy 48; wcześniejszą partię wiezie inna jawnie wskazana osoba.

`node scripts/test.mjs --suite=network '--test-name-pattern=7.12.C2|3.4m|3.5b2a|3.5b2c'`: **99/99 PASS**, w tym wszystkie 8 B3a, B2b, B2a, rejestr partii i bezpośrednio powiązane bufory korpusów; wynik w `outputs/qa/7_12c2_b3a/scoped.txt`. Pełnej regresji nie uruchamiano; podzbiór obejmuje zmienioną ścieżkę i jej zależności.

Build/typecheck PASS. Rzeczywisty Edge: `node tests/qa/verify_7_12c2_b3a.mjs` — chroniony import, wynik 170, blokada 40, rezerwacja osoby do 90, oba przewozy i powroty, odrębne limity i reszta 2, odświeżenie i eksport PASS; błędy runtime 0. Dowody `outputs/qa/7_12c2_b3a/ui.json` i `mixed_receipt.png`. Zgodność źródła i konfiguracji potwierdzona porównaniem. Instrukcja MD/HTML/PDF aktualizowana dla odbioru mieszanego; kontrola w `outputs/qa/manual_7_12c2_b3a/`.

Końcowa kontrola instrukcji: 65 stron, 53 ilustracje, zgodność HTML/MD i treść PDF PASS; brak pustych stron i tekstu poza stroną. Oględziny strony 29 z nowym opisem PASS. Druk PDF wymagał osobnego portu CDP po odmowie „Printing is not available” przy domyślnym porcie; `scripts/print_manual_cdp.mjs` przyjmuje teraz opcjonalny, walidowany `LAYOUT_MANUAL_CDP`. Wydruk na porcie 9490 PASS. Kopię tego skryptu również dodano do backupu i sprawdzono SHA (łącznie 5 plików).

## Granice i dalsze prace

Nie odebrano skończonych buforów korpusów z gałęziami, wielu partii bezpośrednich, jednoczesnej dostawy korpusu ani obciążonego pełnego C2. Nadal obowiązują pozostałe ograniczenia B2b opisane w kontrakcie. Decyzję użytkownika o mieszanych politykach wdrożono i sprawdzono. Kolejny zakres wymaga Sol do oceny, implementacji i weryfikacji zasobów.

Postęp głównych ID bez zmiany: **61/72 = 84,7%**, pierwsze wydanie **61/68 = 89,7%**.
