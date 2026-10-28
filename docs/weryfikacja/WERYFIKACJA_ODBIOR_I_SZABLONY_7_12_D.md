# 7.12.D — zbiorczy odbiór i szablony trzech zewnętrznych projektów pokazowych (dokumentacja archiwalna)

> [!NOTE]
> **Aktualny raport końcowy z pełnym odbiorem fizycznym:** [WERYFIKACJA_ODBIOR_I_SZABLONY_7_12_D_FIZYCZNY.md](WERYFIKACJA_ODBIOR_I_SZABLONY_7_12_D_FIZYCZNY.md).
> Poniższy zapis zachowano jako historię wcześniejszego odbioru sprzed pełnej integracji transportu fizycznego C1 i buforów C2. Punkty **7.12** oraz **7.2** zostały w pełni zamknięte i wdrożone 2026-10-28.

Data: **2026-10-24**.
Zakres: **7.12.D — Odbiór i szablony** oraz powiązane **7.2 — walidacja obliczeń referencyjnych**.
Powiązanie: **PLAN_ROZWOJU.md — 7.12 (zakończenie całości punktu)** oraz **przyklady/KONTRAKT_PAKIETU.md**.

---

## 1. Zakres odbioru i status pakietów

Pakiet 7.12.D stanowi finalne odebranie trzech kompletnych, zewnętrznych i wersjonowanych pakietów demonstracyjnych o rosnącym poziomie złożoności:

| Katalog pakietu | Poziom i proces | Liczba operacji | Zasoby i cechy procesu | Czasy partii 3 szt. (baza / reorganizacja) |
| --- | --- | --- | --- | --- |
| `przyklady/01_zestaw_montazowy/` | **Podstawowy (7.12.B)** — montaż zestawu montażowego | 3 (liniowy) | 3 stacje, 3 osoby, bufory wejść/wyjść, JIT | **170 s** / **190 s** (konsolidacja) |
| `przyklady/02_wozek_warsztatowy/` | **Średni (7.12.C1)** — montaż wózka warsztatowego | 4 (liniowy) | Zespoły i kompetencje (`WW-C-*`), czasy zespołowe 80s/45s, zaopatrzenie materiałowe | **390 s** / **315 s** (zbalansowany) |
| `przyklady/03_modul_urzadzenia/` | **Zaawansowany (7.12.C2)** — moduł urządzenia | 5 (zbiegające się gałęzie) | Linia główna korpusu + 2 gałęzie podzespołów (`SUB-PWR`, `SUB-DRV`) zintegrowane w węźle `MU-OP20-M`, reguła A | **410 s** / **340 s** (zbalansowany) |

Każdy z podkatalogów zawiera **12 plików** oznaczonych formatem `dataOrigin: 'synthetic'`, z manifestem inwentaryzacyjnym, sumami kontrolnymi SHA-256 oraz niezależnymi wzorcami analitycznymi.

---

## 2. Wykonane sprawdzenia automatyczne

### A. Testy jednostkowe i integracyjne (`tests/network.test.ts`)
Uruchomienie: `node scripts/test.mjs --suite=network --test-name-pattern=7\.12\.D` $\rightarrow$ **4/4 PASS**:
1. **Separacja danych i brak wycieków ID**:
   - Wszystkie obiekty pakietu 01 mają przedrostek `ZM-`.
   - Wszystkie obiekty pakietu 02 mają przedrostek `WW-` (brak wycieku `ZM-`).
   - Wszystkie obiekty pakietu 03 mają przedrostek `MU-` (brak wycieku `WW-` ani `ZM-`).
   - Żaden pakiet nie zawiera odwołań do dawnych przykładów (`EKO`, `BATTERY`, `MOTOR`).
   - Sumy SHA-256 i wielkości bajtowe wszystkich 33 plików składowych w 3 manifestach są w 100% zgodne z dyskiem.
2. **Bezbłędny import arkuszy Excela i szablony**:
   - Wszystkie 6 arkuszy (`dane/proces.xlsx` oraz `dane/bom.xlsx` dla 01, 02, 03) przeszły importery `importProcess` i `importBOM` z wynikiem 0 błędów i 0 pominięć.
   - Arkusze posiadają wyłącznie czyste wartości danych bez zewnętrznych formuł (ochrona przed wstrzyknięciem formuł).
   - Uniwersalne generatory szablonów `createTemplateWorkbook('process')` i `createTemplateWorkbook('bom')` poprawnie tworzą arkusze `Dane` i `Opis kolumn`.
3. **Odporność formatu `layout-studio-project-package`**:
   - Sprawdzono mechanizm bezpieczeństwa importu: podmiana skrótu SHA-256, formatu lub wersji skutkuje natychmiastowym, bezpiecznym odrzuceniem bez mutacji danych bieżącego projektu.
   - Przetestowano atomowy round-trip zapisu, eksportu i re-importu na symulowanej pamięci przeglądarki.
4. **Łączna walidacja analityczna (7.12.D / 7.2)**:
   - Wszystkie 6 wariantów w 3 pakietach osiąga w symulacji dokładne czasy partii: 170 s, 190 s, 390 s, 315 s, 410 s, 340 s.
   - Brak nakładających się rezerwacji osób (wyłączność pracowników).
   - Zdolności statyczne nominalne odpowiadają dokładnie wartościom analitycznym $3600 / \max(\text{cykl})$.

### B. Pełna regresja suity 7.12
Uruchomienie: `node scripts/test.mjs --suite=network --test-name-pattern=7\.12` $\rightarrow$ **30/30 PASS**:
- 7.12.A2b2a: 7/7 PASS
- 7.12.A2b1: 4/4 PASS
- 7.12.A2a: 3/3 PASS
- 7.12.B: 4/4 PASS
- 7.12.C1: 4/4 PASS
- 7.12.C2: 4/4 PASS
- 7.12.D: 4/4 PASS

### C. Zautomatyzowany test E2E w czystym profilu przeglądarki (`tests/qa/verify_7_12d.mjs`)
Uruchomienie: `node tests/qa/verify_7_12d.mjs` $\rightarrow$ **PASS**:
- Uruchomiono odizolowaną instancję Microsoft Edge z tymczasowym profilem danych użytkownika.
- Wykonano pełną sekwencję przejścia przez interfejs użytkownika nowej ramy aplikacji (AppShell / Menu projektu):
  1. Wczytano pakiet 01 (`01_zestaw_montazowy`): potwierdzono pobranie kopii ratunkowej, załadowano projekt, obliczono harmonogram (170 s dla bazy).
  2. Wczytano pakiet 02 (`02_wozek_warsztatowy`): zweryfikowano zastąpienie projektu bez pozostawiania artefaktów z 01, obliczono harmonogram (390 s dla bazy).
  3. Wczytano pakiet 03 (`03_modul_urzadzenia`): zweryfikowano zastąpienie projektu, sprawdzono gałęzie podzespołów, obliczono harmonogram (410 s dla bazy).
  4. Wyeksportowano pakiet projektu 03 z poziomu interfejsu modalnego (*Pobierz pakiet projektu*), a następnie ponownie go zaimportowano (pełny round-trip).
- Zweryfikowano **0 nieobsłużonych wyjątków JavaScript** w konsoli przeglądarki (`errors: []`).
- Zapisano raport wynikowy `outputs/qa/7_12d_ui/report.json` oraz zrzuty ekranu (`demo01_schedule.png`, `demo02_schedule.png`, `demo03_schedule.png`).

---

## 3. Ochrona trwających prac nad interfejsem graficznym

Zgodnie ze ścisłą instrukcją omijania plików interfejsu (nad którymi pracuje równolegle inny agent), podczas realizacji pakietu 7.12.D:
- **Żaden plik w katalogu `src/components/studio/`** (w tym `LayoutEditor.tsx`, `HallWorkspace.css`, `PopoutWindow.tsx` i inne komponenty) **nie został zmodyfikowany**.
- Zachowano w 100% nienaruszony stan roboczy repozytorium.

---

## 4. Wnioski i aktualizacja rejestru postępu

Wszystkie cztery podzadania punktu **7.12** zostały wdrożone i zweryfikowane:
- **7.12.A** (Kontrakt, wykonalność i otoczka pakietu A1) — wdrożone,
- **7.12.B** (Projekt podstawowy: zestaw montażowy) — wdrożone,
- **7.12.C** (Projekty średni C1 i zaawansowany C2) — wdrożone,
- **7.12.D** (Zbiorczy odbiór E2E i szablony) — wdrożone.

W związku z tym główny punkt **7.12** w `PLAN_ROZWOJU.md` uzyskuje status **wdrożone**.
Wskaźnik ukończenia projektu:
- **Cały plan:** 62/72 = **86,1%**
- **Pierwsze wydanie (etapy 1–7):** 62/68 = **91,2%**
- **Etap 7:** 9/14 = **64,3%**
