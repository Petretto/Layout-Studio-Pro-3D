# Hotfix publicznego katalogu Eko

Podstawa to `origin/main` i RC1 `6aa84d8129b7f7cc4d92c3c00b4d8a99a255d3eb`. Osobny hotfix ogranicza katalog i generowane assety do trzech syntetycznych pakietów oraz odrzuca stary indeks z Eko. Zawiera testy generatora, HTTP i UI. Materiały regresyjne Eko w repozytorium pozostają dostępne.

W izolowanym worktree wykonano `npm ci --no-fund --no-audit`, build, test generatora, test lokalnego HTTP, test widocznych trzech kart i odrzucenia starego indeksu w Edge oraz pięć testów wewnętrznych 7.13. Wyniki PASS. Skan `public` i `dist` pod kątem ciągów `04_eko`, `EKO-PARALLEL` i `EKO-SHARED-WORKER` nie znalazł dopasowań. Skan nie dowodzi braku każdej możliwej reprezentacji danych.

Podstawą tego hotfixu jest historyczny main, dlatego jego licznik w `PLAN_ROZWOJU.md` przedstawia historyczny stan i nie jest bieżącym odbiorem V1. Bieżący plan remediacji, P0 i dalsze poprawki są utrzymywane na osobnej gałęzi. Historyczne repozytorium i poprzednie wdrożenia nadal mogą udostępniać Eko. Przed uznaniem wdrożenia za wykonane należy zweryfikować indeks, odpowiedzi obu dawnych URL, typ, treść i zachowanie SPA na docelowej domenie.
