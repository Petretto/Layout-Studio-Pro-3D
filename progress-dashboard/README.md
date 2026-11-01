# Pulpit postępu Layout Studio Pro

Osobny lokalny monitor rejestru projektu. Nie edytuje aplikacji głównej, projektów użytkownika ani dokumentów źródłowych. Serwer i generator zapisują wyłącznie własny snapshot `data.js`. Statusy aktualizuje się w dokumentach, a pulpit je odczytuje.

## Uruchomienie

Kliknij `Uruchom_Dashboard.bat` w tym folderze lub istniejący `Uruchom_Pulpit_Postepu.bat` w katalogu projektu. Wymagany jest Node.js zgodny z projektem. Serwer otwiera `http://127.0.0.1:5180`; zamknięcie konsoli kończy monitor. Ręcznie: `node progress-dashboard/server.mjs` z katalogu projektu.

## Co pokazuje monitor

- Główne ID planu, etapy i osobny licznik pierwszego wydania. Pakiety, podzadania i kryteria UI nie zwiększają tych liczników.
- Zakładkę „Remediacja RC1 i odbiór V1”: kolejność i status 12 pakietów, zależności, modele do analizy/implementacji/weryfikacji, cztery decyzje A-01–A-04 i sześć bramek G0–G5.
- Wszystkie 21 ustaleń BL/S z wyszukiwaniem, dowodem/luką, pakietem, testem i kryterium zamknięcia.
- Zakres 28 scenariuszy T i 12 kryteriów U, oznaczony jako planowane kontrole. Ich liczba nie oznacza wykonania testów ani wyniku PASS.
- Linki do planu głównego i pięciu dokumentów remediacji. Historia dawnych odbiorów jest oddzielona od bieżącego pakietu.

Stan po analizie RC1: 61/72 główne ID (84,7%), pierwsze wydanie 61/68 (89,7%), etap 7: 7/14 (50,0%). Wszystkie pakiety remediacji pozostają nierozpoczęte, bramki otwarte. Te wartości nie są zakodowane w widoku — pochodzą z dokumentów. Wdrożenie pakietów nie zastępuje jawnego odbioru bramek i osobnej zgody na deployment.

## Źródła i aktualizacja

Tryb LIVE odczytuje `PLAN_ROZWOJU.md` oraz:

- `docs/plany/PLAN_REMEDIACJI_PO_AUDYCIE_RC1.md`
- `docs/plany/ARCHITEKTURA_INTEGRACJI_MODELI_V1.md`
- `docs/plany/ZAKRES_WYDANIA_V1_0_0.md`
- `docs/plany/MACIERZ_AUDYT_REMEDIACJA.md`
- `docs/plany/PLAN_TESTOW_RC2.md`

Po zapisaniu dowolnego źródła strona wykrywa zmianę przy następnym odpytywaniu (co 2 sekundy). Statusy pakietów i zależności edytuje się w tabeli „Kolejność”, bramki w „Rejestrze bramek do monitorowania”, modele w zbiorczej macierzy LLM. Nie zmieniać statusu bez wymaganego dowodu. Brak/uszkodzenie źródła powoduje ostrzeżenie, nigdy automatyczny odbiór V1.

Bez serwera można otworzyć `index.html` wprost z dysku. Odczyta ostatni pełny snapshot. Odśwież go poleceniem `node progress-dashboard/update-data.mjs`. Samo F5 przy `file://` nie regeneruje snapshotu.

Wczytanie/przeciągnięcie/wklejenie samego `PLAN_ROZWOJU.md` albo „Połącz na stałe” aktualizuje główne liczniki. Ponieważ nie obejmuje pięciu dokumentów dodatkowych, remediacja i gotowość V1 są wtedy jawnie niezweryfikowane. Pulpit nie miesza takiego pliku ze starszymi źródłami wbudowanymi. Dla pełnego monitorowania używaj trybu LIVE.

## Weryfikacja

`node --test progress-dashboard/dashboard.test.mjs` — focused testy parsera, liczników, brakujących źródeł, zależności i lokalnego HTTP na tymczasowych kopiach. UI: `node outputs/qa/progress_dashboard_rc1/verify_ui.mjs` — oddzielny bezgłowy Edge i profil; screenshoty/logi w `outputs/qa/progress_dashboard_rc1/`. Testy nie zmieniają dokumentów projektu ani pamięci aplikacji klienta.
