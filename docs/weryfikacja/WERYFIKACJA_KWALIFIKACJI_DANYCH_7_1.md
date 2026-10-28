# 7.1 — Uporządkowanie pochodzenia i kwalifikacji danych walidacyjnych

Data odbioru: **2026-10-28**  
Punkt planu: **7.1** (`PLAN_ROZWOJU.md`)  
Status: **wdrożone**  
Decyzja nadrzędna: decyzja użytkownika z 2026-10-19 wyłączająca Eko jako warunek wydania; docelowy wzorzec stanowią trzy zewnętrzne pakiety demonstracyjne 7.12 oraz zautomatyzowany audyt pochodzenia danych.

---

## 1. Cel i rozstrzygnięcie domenowe

Celem punktu 7.1 jest trwałe uporządkowanie, oddzielenie i zautomatyzowany audyt trzech odrębnych klas danych w całym repozytorium:
1. **Rzeczywiste pomiary fabryczne (`measured`)**:
   * Zbiór Eko (lipiec 2026, wariant ramy 1.4, obsada 13 osób, manualny proces bez pracy maszynowej).
   * 12 czasów mierzonych (OP10–OP21 jako średnie z kilku prób) oraz 4 czasy przykładowe (OP22–OP25), 60 pozycji BOM.
   * Rejestr 14 luk i braków danych produkcyjnych w [docs/dane/DANE_EKO_7_1.md](../dane/DANE_EKO_7_1.md) (brak kalendarzy, tożsamości pracowników, geometrii transportu, rejestru rzeczywistej produkcji).
   * Zgodnie z decyzją użytkownika z 2026-10-19: uzupełnienie braków Eko **nie jest warunkiem pierwszego komercyjnego wydania aplikacji**; Eko pozostaje cennym materiałem testowo-regresyjnym.
2. **Dane syntetyczne / demonstracyjne (`synthetic`)**:
   * Trzy zewnętrzne, wersjonowane pakiety demonstracyjne 7.12:
     * `przyklady/01_zestaw_montazowy/` (prefiks `ZM-`, linia podstawowa, 3 operacje, 3 stacje, 3 osoby).
     * `przyklady/02_wozek_warsztatowy/` (prefiks `WW-`, linia średnia, 4 operacje, zespoły monterów, transport i powroty wózków).
     * `przyklady/03_modul_urzadzenia/` (prefiks `MU-`, linia zaawansowana, 5 operacji, gałęzie podmontaży `SUB-PWR` i `SUB-DRV`, bufory C2).
   * 10 modeli wyposażenia i wyrobów wygenerowanych proceduralnie w Blenderze 5.2.1 LTS (punkt 6.3).
   * Wszędzie jawne oznaczenie metadanych: `dataOrigin: "synthetic"`, `basis: "assumed"`, `isCertifiedTechnologicalCapacity: false`.
   * Jawne referencje analityczne w `referencje/oczekiwane_wyniki.json` (zweryfikowane numerycznie w punkcie 7.2).
3. **Historyczne fixture testowe (`fixture`)**:
   * Dane w `tests/fixtures/`, `src/core/models/ekoProject.ts` oraz historyczne eksporty JSON/DXF.
   * Służą wyłącznie do regresji algorytmów (np. scheduler, kalkulacje OEE, migracje schematów) i nie są prezentowane użytkownikowi jako dane produkcyjne klienta.

---

## 2. Zasady kompletności i izolacji pakietów pokazowych 7.12

Dla wszystkich trzech pakietów demonstracyjnych obowiązują ścisłe reguły inżynierskie:
* **Kompletność:** każdy pakiet zawiera dokładnie 12 plików (manifest inwentaryzacyjny, projekt główny, źródła v4, szkic v6, warianty v6, warunki eksperymentu, arkusze Excela `dane/proces.xlsx` i `dane/bom.xlsx`, README, słownik pojęć, obliczenia Markdown oraz referencje JSON).
* **Kryptograficzna integralność:** manifest każdego pakietu zawiera sumy kontrolne SHA-256 wszystkich plików, weryfikowane automatycznie przed wczytaniem.
* **Separacja przestrzeni nazw:** rygorystyczne prefiksy ID (`ZM-`, `WW-`, `MU-`); zero wycieków identyfikatorów pomiędzy pakietami oraz całkowity brak powiązań z danymi testowymi (`EKO`, `BATTERY`, `MOTOR`).
* **Czysty start produktu:** aplikacja startuje z czystym projektem (`newProject()`); pakiety demonstracyjne są ładowane wyłącznie na żądanie użytkownika z katalogu zewnętrznego `public/demo-projects/` (wdrożone w 7.13).

---

## 3. Zautomatyzowane dowody weryfikacji

1. **Nowy skrypt audytu kwalifikacji danych (`scripts/audit_data_qualification_7_1.mjs`):**
   * Sprawdza integralność audytu Eko (16 operacji, 12 mierzonych, 4 syntetyczne, `productionDataAccepted: false`).
   * Sprawdza kwalifikację `dataOrigin: "synthetic"` dla pakietów 01, 02 i 03, kompletność plików i zgodność SHA-256.
   * Weryfikuje izolację prefiksów i brak wycieków danych testowych.
   * Sprawdza oznaczenie założeń (`basis: "assumed"`) oraz budżet $\le 5000$ trójkątów dla 10 modeli Blendera.
   * Sprawdza zewnętrzny katalog demonstracyjny.
   * Wynik: **ALL PASS** (0 błędów).
2. **Audyt danych Eko (`scripts/audit_eko_data_7_1.mjs`):**
   * Wynik: `eko_7_1d.json`, 16 operacji, 12 potwierdzonych, 4 testowe, 60 BOM, 7 skrótów źródeł PASS.
3. **Suita testów integracyjnych 7.12 i 7.2 (`tests/network.test.ts`):**
   * Uruchomienie: `node scripts/test.mjs --suite=network "--test-name-pattern=7\.12"` $\rightarrow$ **104/104 PASS**.
4. **Weryfikacja linków dokumentacji i czystości katalogu głównego:**
   * Uruchomienie: `node scripts/verify_documentation.mjs` $\rightarrow$ **PASS**.
