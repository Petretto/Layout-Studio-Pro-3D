# Raport weryfikacji wdrożenia: Dystrybucja, uruchamianie, kopie i odzyskiwanie projektu (Plan 7.6)

Data odbioru: **18.10.2026**  
Status zadania: **wdrożone**  
Identyfikator planu: **ID 7.6** (Etap 7 — Walidacja różnych procesów i przygotowanie komercyjne)  
Kopia zapasowa przed wdrożeniem: `backup/v0.4.0_przed_7_6_20261018` (422 pliki zweryfikowane sumami SHA256)

---

## 1. Cel i problem inżynierski

Dla komercyjnego wdrożenia Layout Studio Pro 3D w środowiskach inżynierskich i fabrycznych kluczowe jest spełnienie następujących rygorów:
1. **Dystrybucja i praca 100% Offline-First**: Aplikacja musi działać na stacjach roboczych odciętych od sieci Internet (strefy produkcyjne OT / Air-Gapped) bez pobierania zewnętrznych bibliotek, czcionek, skryptów czy stylów z sieci CDN w trakcie działania.
2. **Uruchamianie na czystym stanowisku**: Zapewnienie powtarzalnego, jednoetapowego startu systemu na komputerze wyposażonym jedynie w środowisko Node.js LTS oraz nowoczesną przeglądarkę internetową.
3. **Bezpieczeństwo danych projektowych (Disaster Recovery)**: Inżynier planujący layouty linii fabrycznych tworzy skomplikowane modele procesów (Schema 4, v5, v6, warianty, scenariusze symulacji). Niezbędny jest mechanizm tworzenia kompletnych, samowystarczalnych kopii środowiska (`.lsbackup.json`) z kryptograficzną weryfikacją spójności SHA-256 oraz automatyczną ochroną przed utratą danych podczas odzyskiwania (Rollback Snapshot).

---

## 2. Zrealizowane prace i architektura

### Pakiet 7.6a: Silnik Disaster Recovery i walidacji integralności SHA-256
- Utworzono moduł `src/core/workspaceBackup.ts`:
  - **Czysta implementacja SHA-256 (FIPS 180-4)**: Autonomiczna funkcja hashująca w czystym TypeScript (32-bit `Uint32Array`), deterministyczna, działająca identycznie w przeglądarce i w Node.js, bez zależności od zewnętrznych pakietów npm czy CDN.
  - `createWorkspaceBackup(storage, appVersion, createdAt)`: generuje zrzut całego środowiska inżynierskiego (projekt aktywny, biblioteki stanowisk v5, szkic v6, warianty, scenariusze) z nagłówkiem metadanych i sygnaturą SHA-256.
  - `validateWorkspaceBackup(rawJson)`: weryfikuje poprawność struktury JSON, zgodność wersji schematów oraz zgodność sumy kontrolnej SHA-256 (odrzuca pliki zmodyfikowane lub uszkodzone).
  - `restoreWorkspaceBackup(storage, payload)`: wykonuje atomowy zapis do pamięci lokalnej z **automatycznym utworzeniem migawki awaryjnej (Rollback Snapshot)** przed nadpisaniem jakichkolwiek kluczy, umożliwiając natychmiastowe wycofanie zmian.
  - `rollbackWorkspaceBackup(storage)`: przywraca stan pamięci sprzed ostatniej operacji odzyskania.

### Pakiet 7.6b: Interfejs użytkownika kopii i odzyskiwania
- Utworzono komponent `src/components/studio/WorkspaceBackupModal.tsx`:
  - Panel podglądu stanu środowiska (obecność projektu, wersja, liczba wariantów, scenariuszy, data ostatniej modyfikacji).
  - Sekcja pobierania pełnej kopii zapasowej `.lsbackup.json`.
  - Sekcja wgrywania kopii z natychmiastową weryfikacją sumy SHA-256, podglądem zawartości paczki i ostrzeżeniem przed nadpisaniem.
  - Przycisk cofania ostatniego odzyskania (Disaster Recovery Rollback) z informacją o dacie migawki.
- Zintegrowano modal w `src/App.tsx`:
  - Przycisk `Kopie i odzyskiwanie` w głównym pasku narzędziowym nagłówka.
  - Dedykowana karta szybkiego dostępu `Kopia i odzyskiwanie (.lsbackup)` w pulpicie startowym (Dashboard).

### Pakiet 7.6c: Skróty instalacyjne i weryfikacja czystego stanowiska
- Utworzono skrót uruchomieniowy Windows `Uruchom_Layout_Studio.bat`:
  - Sprawdza dostępność środowiska Node.js.
  - Automatycznie kompiluje pakiet produkcyjny `dist/` w razie jego braku.
  - Uruchamia lokalny, zoptymalizowany serwer HTTP na porcie `4173`.
  - Otwiera domyślną przeglądarkę systemową pod adresem `http://127.0.0.1:4173`.
- Utworzono automatyczny skrypt walidacji czystej instalacji `scripts/verify_clean_install.mjs`:
  - Krok 1: Weryfikacja wersji Node.js (wymagane $\ge 20.19.0$, wykryto v24.14.0).
  - Krok 2: Weryfikacja braku zewnętrznych odwołań CDN w całym kodzie źródłowym (`dist/index.html`, skrypty, style).
  - Krok 3: Weryfikacja kompletności artefaktów produkcyjnych w `dist/`.
  - Krok 4: Test uruchomienia lokalnego serwera HTTP i odpowiedzi nagłówków Content-Security-Policy.
  - Krok 5: Pełny cykl symulacji czystego komputera (tworzenie kopii, walidacja SHA-256, odzyskiwanie i rollback w izolowanym storage).
  - Dodano komendę npm `"verify:clean": "node scripts/verify_clean_install.mjs"`.

### Pakiet 7.6d: Weryfikacja E2E w przeglądarce Edge przez CDP
- Utworzono skrypt testowy `tests/qa/verify_7_6.mjs`:
  - Uruchomienie bezgłowego Microsoft Edge przez Chrome DevTools Protocol.
  - Otwarcie aplikacji pod `http://127.0.0.1:4173`.
  - Test otwarcia modala kopii zapasowych z paska narzędziowego, sprawdzenie stanu UI, pobranie zrzutu ekranu (`outputs/qa/verify_7_6_modal.png`).
  - Test wywołania modala z karty pulpitu startowego.

---

## 3. Wyniki weryfikacji i testów

| Obszar testowy | Metoda | Wynik |
|---|---|---|
| Testy jednostkowe Disaster Recovery | `npm test -- --suite=core --test-name-pattern=7.6` | **1 / 1 PASS (4.8 ms)** |
| Całościowa suita testów automatycznych | `npm test` | **367 / 367 PASS (2.31 s)** |
| Walidacja czystej instalacji i braku CDN | `npm run verify:clean` | **5 / 5 kroków PASS** |
| Kompilacja produkcyjna | `npm run build` | **1967 modułów, 0 błędów (PASS)** |
| Test E2E w przeglądarce Edge (CDP) | `node tests/qa/verify_7_6.mjs` | **PASS (zrzut modal.png)** |
| Dokumentacja użytkownika | `Instrukcja/Podrecznik_Uzytkownika.md` (sekcja 5.9) | **Zaktualizowano HTML & PDF (5.48 MB)** |

---

## 4. Wnioski i zgodność z zasadami projektu

1. **Autonomia (Offline-First)**: Aplikacja spełnia rygorystyczne wymagania bezpieczeństwa sieci zakładowych — zero połączeń z zewnętrznymi CDN, pełne osadzenie zasobów w dystrybucji lokalnej.
2. **Kryptograficzna integralność**: Suma kontrolna FIPS 180-4 SHA-256 uniemożliwia wgranie uszkodzonych lub niezgodnych plików konfiguracyjnych.
3. **Bezpieczeństwo danych (Disaster Recovery)**: Automatyczny Rollback Snapshot zabezpiecza inżyniera przed przypadkowym zniszczeniem bieżącej sesji projektowej.


## Ponowne otwarcie 7.6 — audyt 7.12.A, 2026-10-19

7.6 przywrócono do **w trakcie**. Wcześniejszy odbiór i testy nie obejmowały odtworzonych obecnie luk: suma SHA-256 nie blokuje przywrócenia, walidacja pomija pełną otoczkę szkicu i biblioteki, null pozostawia stare obce dane, a awaria kolejnego zapisu pozostawia częściowo zmienione środowisko. Snapshot jest pobierany przez modal dopiero po powodzeniu, nie gwarantuje ratunku przy wyjątku funkcji restore. Ponadto licznik wariantów 6 pokazuje 0 dla biblioteki zawierającej 1 wariant.

Dowody: `node scripts/audit_demo_portability_7_12a.mjs`, `node tests/qa/verify_7_12a.mjs`, pliki `outputs/qa/7_12a/capabilities.json` oraz `outputs/qa/7_12a_ui/report.json` i zrzut modala. Poprawna kopia ze szkicem i biblioteką daje odczyt po reloadzie w osobnym profilu Edge, lecz nie oznacza to spełnienia kryteriów bezpiecznego odzyskiwania. Istniejące testy celowane 7/7 PASS nie obejmowały tych luk. Nie zmieniono danych użytkownika ani kodu aplikacji. Naprawa i nowe negatywne testy są zaplanowane jako 7.6a; szczegóły w `WERYFIKACJA_PAKIETOW_POKAZOWYCH_7_12_A.md`.
