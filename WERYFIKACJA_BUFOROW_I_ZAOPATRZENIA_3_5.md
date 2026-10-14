# Weryfikacja buforów i zaopatrzenia — PLAN 3.5

## 3.5a1 — 2026-10-14
Przegląd kontynuacji po Gemini (commit 6f18dca): kontrakty zapisane, brak integracji z harmonogramem, brak jawnego zużycia i domyślna pierwsza dostawa 0 s. Dodano zabezpieczenie przed cichym ignorowaniem zapisanych ograniczeń; schemat i zapis bez zmian. Backup `backup/v0.4.0_przed_3_5a1_20261014`: 270 plików, niezależna weryfikacja SHA256 PASS.

`npm.cmd run test -- --run`: 201/201 PASS. `npm.cmd run build`: typecheck/build PASS. Testy: konfiguracja dostaw jest odrzucana przez rdzeń i worker do integracji, świadomy JIT działa, wejście niezmienione; ograniczone bufory wejścia/wyjścia i zerowa pojemność są odrzucane także w JIT; puste kontrakty oraz null pojemności dają identyczny dawny wynik. Regresja poprzednich kontraktów i harmonogramów PASS.

Edge CDP: `verify_2_7e.mjs --cart-run --jit-run --supply-guard`, porty 5246/9386 PASS. Faktyczny worker pokazuje komunikat 3.5b zamiast fizycznego wyniku przy zapasie 0 i braku dostaw. JIT opt-in daje 20 s; OFF przywraca odmowę. Reload nie zmienia deklaracji ani dokładnego źródła; izolacja 4/5 i brak wyjątków PASS. Zrzut `outputs/qa/verify_3_5a1_configured.png`.

Decyzje użytkownika z 2026-10-14 zapisano w AGENTS.md/modelu: zużycie jawne przy starcie, dostawa przed pobraniem, jawny pierwszy termin; blokowanie po zakończeniu, dwie jawne polityki operatora. Nie wdrożono jeszcze ograniczonego zapasu ani blokowania stanowisk. Postęp 24/67 = 35,8%, pierwsze wydanie 24/65 = 36,9%. Vercel nie weryfikowano; push nie potwierdza wdrożenia.
