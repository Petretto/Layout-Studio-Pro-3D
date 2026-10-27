# 7.12.C2-B3-UI — odbiór formularza buforów podmontaży

Data: 2026-10-27. Status: **formularz wdrożony i zweryfikowany w zakresie istniejącego kontraktu B2a/B2b**. Całe B3/C2/7.12 pozostaje w trakcie.

Formularz w szkicu 6 edytuje niezależne pojemności podzespołów, jednostkę, stanowisko/kopię i politykę. Wykorzystuje istniejące `validateSubassemblyBuffers`, `editDomainSubassemblyBuffers` oraz historię i chroniony zapis szkicu. Nie zmienia schematu ani schedulera. Nieobsługiwane kombinacje symulacji pozostają odrzucane. Kopia poprzedniego panelu: `backup/v0.4.0_przed_c2_b3_ui_20261026`, niezależne SHA-256 źródła i kopii zgodne.

## Dowody

- `node scripts/test.mjs --suite=network --test-name-pattern=7.12.C2-B2a`: **11/11 PASS**, walidacja, zapis, zasoby i referencje B2a.
- `npm.cmd run build`: **PASS**, TypeScript i Vite; ostrzeżenie o dużych paczkach, bez błędu.
- `node tests/qa/verify_7_12c2_b3_ui.mjs`: **PASS**, rzeczywisty Edge: dwa podzespoły na jednej kopii, osobne pojemności; puste i ujemne dane, konflikt wszystkich kopii z pojedynczą; edycja, odrzucenie zmian, usunięcie konfiguracji, cofnięcie/ponowienie; odświeżenie i eksport/import. Porównano zapisane bufory, partie, bufory korpusów i oryginał. Błędy runtime: 0. Zrzut `outputs/qa/7_12c2_b3_ui/formularz.png`, wynik `outputs/qa/7_12c2_b3_ui/ui.json`.
- Instrukcję MD/HTML/PDF zaktualizowano: 65 stron, 53 obrazy, zgodność HTML i automatyczna kontrola treści/stron PASS; oględziny strony 27 z nowym opisem PASS. Wynik `outputs/qa/manual_7_12c2_b3_ui/report.json`.

Zakres nie obejmuje wspólnego odbioru kilku partii i korpusu, skończonych buforów korpusów w grafie ani obciążonego C2. Ich projekt, implementacja i weryfikacja wymagają Sol. Weryfikacja formularza nie jest dowodem działania tych przypadków.
