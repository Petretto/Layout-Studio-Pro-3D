# Raport z weryfikacji zadania 1.7: Zapis, odzyskiwanie i migracja starszych projektów oraz ochrona oryginału

Data weryfikacji: 2026-10-02  
Status: **wdrożone**  
Zalecany i użyty model: **Sol** (architektura zapisu, tożsamość i spójność danych) / **Terra** (weryfikacja UI)

---

## 1. Cel i kryteria odbioru (Zadanie 1.7)

Zgodnie z `PLAN_ROZWOJU.md`:
> Dopracować zapis, odzyskiwanie i migrację starych projektów; chronić oryginał przy nieudanej migracji i przetestować ponowne otwarcie.

### Szczegółowe kryteria odbioru:
1. **Odzyskiwanie i ochrona uszkodzonego zapisu**: Przy uszkodzonym (niepoprawny JSON lub niespełniający reguł) stanie `localStorage` aplikacja nie ulega awarii, blokuje automatyczny zapis niszczący dane, udostępnia pobranie surowej kopii odzyskiwania i wymaga jawnej zgody na odblokowanie zapisu.
2. **Bezpieczna migracja starszych projektów**: Wykrycie starszego zapisu lokalnego (bez numeru `schemaVersion` lub z wersji starszej niż 4) nie nadpisuje automatycznie danych; aplikacja wstrzymuje autosave, wymaga pobrania surowej kopii starszego projektu i jawnego zatwierdzenia migracji do schematu 4.
3. **Ochrona oryginału przy nieudanej migracji**: Gdy przygotowanie lub migracja projektu (np. do schematu 5 z trwałymi ID) natrafi na niespójności (np. osierocone klucze zasobów), proces zostaje bezpiecznie przerwany z czytelnym komunikatem błędu, a istniejący projekt docelowy, jego obiekty layoutu oraz surowy `originalJson` pozostają w 100% nienaruszone.
4. **Przenośność i zachowanie bajtowego źródła**: Wersjonowane przenośne archiwa v4 i v5 (`layout-studio-portable-archive`) zachowują dokładne, pierwotne bajty importowanego pliku, a ich odczyt i eksport są w pełni atomowe i zabezpieczone przed limitami pamięci przeglądarki.
5. **Ponowne otwarcie (reopen)**: Zmiany w projektach (schemat 4 i schemat 5) po odświeżeniu strony lub ponownym uruchomieniu przeglądarki są wiernie odtwarzane z pamięci trwałej.

---

## 2. Kopia bezpieczeństwa przed realizacją pakietu

Zgodnie z procedurą przed uruchomieniem weryfikacji utworzono pełną kopię bezpieczeństwa:
- **Ścieżka backupu**: `backup/v0.4.0_przed_1_7_20261002_220500`
- **Liczba zabezpieczonych plików**: 128 plików
- **Weryfikacja spójności**: kompletny plik sum kontrolnych `SHA256.txt` (bez `node_modules`, `dist`, `backup`, `outputs`, `.git`).

---

## 3. Podsumowanie pakietów stabilizacyjnych D5c–D5k składających się na 1.7

- **D5c**: Zabezpieczenie i odczyt oryginalnego JSON projektu 4 po migracji do v5 (weryfikacja na procesie Eko 16 operacji i 60 materiałów).
- **D5d**: Dialog i mechanizm odzyskiwania uszkodzonego localStorage w warsztacie stanowisk v5.
- **D5e**: Ochrona projektu v5 i zachowanie identycznego SHA256 oryginału przy przerwaniu migracji z osieroconym zasobem.
- **D5f**: Normalizacja i zachowanie danych starszego projektu silników EV bez wersji (`D5f_legacy_motor_untagged.json`).
- **D5g**: Archiwizacja dokładnych bajtów importu w localStorage v4 i v5 (`archivedImportBlob`).
- **D5h**: Wersjonowane przenośne archiwa JSON v4 i v5 z weryfikacją wersji, schematu i limitów rozmiaru.
- **D5i**: Atomowy import projektu 4 przy braku miejsca w localStorage (zapis przed podmianą stanu pamięci podręcznej i historii).
- **D5j**: Blokada samoczynnego nadpisywania starszego zapisu localStorage bez numeru schematu — wymagane pobranie kopii i potwierdzenie migracji.
- **D5k**: Bezpieczna walidacja dużych archiwów (eliminacja przepełnienia stosu wyrażeń regularnych base64).

---

## 4. Całościowa weryfikacja automatyczna UI (CDP)

Zrealizowano test całościowy `tests/qa/verify_1_7.mjs` w środowisku headless Edge CDP (port serwera 5194, port CDP 9334, izolowany profil przeglądarki):

### Scenariusz 1: Wykrycie starszego projektu bez wersji i jawna migracja
1. Wstrzyknięto do `localStorage['layout-studio-v3']` starszy projekt bez `schemaVersion` (`tests/qa/D5f_legacy_motor_untagged.json`).
2. Po przeładowaniu strony aplikacja wyświetliła baner:
   `Wykryto starszy zapis lokalny. Pobierz jego surową kopię, a następnie potwierdź migrację przed zapisaniem projektu w schemacie 4.`
3. Pasek zapisu zablokowany w stanie ostrzegawczym; przycisk potwierdzenia migracji zablokowany do momentu kliknięcia `Pobierz starszy zapis`.
4. Po pobraniu kopii i potwierdzeniu modalnym projekt zmigrowano do `schemaVersion: 4`, zachowując 6 operacji i 5 materiałów.
5. Zrzut ekranu: `outputs/qa/verify_1_7_legacy_migration.png`.

### Scenariusz 2: Odzyskiwanie uszkodzonego zapisu (corrupt string)
1. Wstrzyknięto niepoprawny string niebędący formatem JSON do klucza zapisu.
2. Po odświeżeniu aplikacja nie uległa awarii, wyświetlając baner odzyskiwania:
   `Błąd zapisu lokalnego: Unexpected token... Pobierz kopię odzyskiwania przed zastąpieniem.`
3. Pobrano kopię odzyskiwania i odblokowano zapis przyciskiem `Włącz zapis`.
4. Aplikacja bezpiecznie zainicjalizowała nowy projekt bazowy i przywróciła normalny cykl zapisu.
5. Zrzut ekranu: `outputs/qa/verify_1_7_recovery_banner.png`.

### Scenariusz 3: Ochrona oryginału przy przerwaniu migracji v5
1. W warsztacie v5 istniał poprawny projekt (`Stabilne Stanowiska V5 Przed Testem`) z zapisanym `originalJson`.
2. Do v4 wstrzyknięto projekt z osieroconymi ustawieniami zasobów `["QA-OLD"]` (`tests/qa/Eko_D5e_orphan_resource_v4.json`).
3. W warsztacie v5 kliknięto `Przygotuj z bieżącego projektu`.
4. Migracja została zablokowana z komunikatem: `Migracja zatrzymana: Osierocone ustawienia zasobów: ["QA-OLD"]. Rozstrzygnij je przed migracją.`
5. Sprawdzono `localStorage['layout-studio-stations-v5']`: istniejący projekt v5, `originalJson` (`ORIGINAL_V4_INTACT_CONTENT`) oraz `importSourceBase64` pozostały nienaruszone.

### Scenariusz 4: Ponowne otwarcie (reopen) i pełny roundtrip
1. Zmieniono nazwę projektu na `Projekt QA Roundtrip 1.7` i odczekano na automatyczny zapis (700 ms).
2. Przeładowano stronę w przeglądarce (`Page.reload`).
3. Odczytano z DOM nazwę projektu: `Projekt QA Roundtrip 1.7` — dane w 100% zachowane.
4. Zrzut ekranu: `outputs/qa/verify_1_7_reopen_success.png`.

---

## 5. Wyniki testów automatycznych i kompilacji

- **Testy jednostkowe i integracyjne**: `npm run test -- --run` — **75/75 testów zdanych** (0 błędów).
- **Kompilacja i bundling**: `npm run build` (`tsc && vite build`) — zakończone sukcesem bez błędów i ostrzeżeń.

---

## 6. Podsumowanie statusu zadania 1.7

Wszystkie wymagania punktu 1.7 zostały zrealizowane i poparte dowodami automatycznymi oraz weryfikacją UI. Punkt 1.7 otrzymuje status **`wdrożone`**.
