# 7.9 — Pilotażowy odbiór z użytkownikiem, eliminacja błędów krytycznych i zakres gotowego pierwszego wydania

Data odbioru: **2026-10-28**  
Punkt planu: **7.9** (`PLAN_ROZWOJU.md`)  
Status: **wdrożone**  
Znaczenie kamienia milowego: **Pełne domknięcie Etapu 7 (14/14 = 100%) oraz ostateczne zamknięcie PIERWSZEGO WYDANIA aplikacji (Etapy 1–7: 68/68 = 100%)**.

---

## 1. Cel i podsumowanie odbioru

Punkt 7.9 stanowi formalne, zintegrowane zwieńczenie pierwszego wydania komercyjnego Layout Studio Pro 3D. Obejmuje:
1. Pilotażowe przejście pełnej ścieżki użytkownika (inżyniera procesu i konsultanta Lean) w odizolowanym profilu przeglądarki Edge CDP:
   * **Czysty start:** uruchomienie aplikacji bez wbudowanych na stałe projektów klienta (`newProject()`, 0 operacji, 0 stanowisk).
   * **Katalog demonstracyjny:** rozwijany katalog 4 zewnętrznych pakietów z weryfikacją sum SHA-256 w locie (`DemoCatalog.tsx`).
   * **Interaktywny tutorial Lean (7.14):** przejście 8 etapów edukacyjnych (Pulpit → Popyt/Takt → Operacje/Proces → Bilans/Yamazumi → Layout hali CAD 2D → Symulacja partii Gantt → Porównanie wariantów → Raport inżynierski) z automatycznym przełączaniem zakładek i podświetlaniem kontrolek.
   * **Scenariusz transportu monterów i kompetencji (Pakiet 02):** wczytanie wózka warsztatowego, przeliczenie harmonogramu transportu monterów i powrotu wózków (makespan 460 s / 385 s).
   * **Scenariusz zbiegania gałęzi i buforów C2 (Pakiet 03):** zbieganie podmontaży `SUB-PWR` i `SUB-DRV` na węźle montażu głównego, buforowanie z zatrzymaniem i zwolnieniem obsady (`bbas`), zachowanie reszt partii.
   * **Wizualizacja CAD 2D i 3D:** integracja 10 modeli proceduralnych wygenerowanych w Blenderze 5.2.1 LTS (w tym regałów magazynowych z materiałów użytkownika).
   * **Stabilność:** 0 wyjątków JavaScript w konsoli przeglądarki, 0 błędów blokujących.
2. Zdefiniowanie i udokumentowanie zakresu pierwszego wydania oraz granic stosowalności algorytmów.

---

## 2. Zakres funkcjonalny gotowego pierwszego wydania (v1.0.0 / Etapy 1–7)

Pierwsze wydanie aplikacji zapewnia kompletne, samodzielne środowisko inżynierskie:

### Moduł 1: Model procesu, operacji i BOM (Etap 1)
* Struktura operacji ze ścisłą kontrolą kolejności (DAG), czasem standardowym, typami pracy (VA/NVA), wymaganiami obsady i przypisaniem maszyn.
* Zestawienie materiałowe (BOM) z powiązaniem ze stacjami i operacjami oraz odpornością na pętle i nieznane referencje.
* Uniwersalne importery i eksportery XLSX/CSV z walidacją formatów i ochroną przed formułami.
* Izolowany draft i niezależna tożsamość obiektów w archiwum JSON.

### Moduł 2: Takt time, popyt i bilansowanie linii (Etap 2)
* Obliczanie Takt Time na podstawie popytu klienta, czasu dostępnego i planowanego OEE.
* Automatyczne algorytmy balansowania linii: RPW (Ranked Positional Weight) oraz LCR (Largest Candidate Rule) z respektowaniem relacji poprzedników i blokad ręcznych.
* Interaktywny wykres słupkowy Yamazumi z przeciąganiem operacji między stacjami i natychmiastowym przeliczaniem wskaźników równomierności obciążenia.

### Moduł 3: Dyskretny symulator harmonogramu i logistyki (Etap 3)
* Deterministyczny silnik symulacji partii o architekturze Web Worker (nieblokujący UI).
* Model transportu monterów na linii: ruch załadowany, podejście puste w sekwencji wózków, powroty wyposażenia.
* Skończone i zerowe bufory wejściowe i wyjściowe korpusów oraz podmontaży z politykami zatrzymania (`bbas`) lub zwolnienia operatora.
* Lokalna kontynuacja operacji na tej samej kopii bez fikcyjnego ruchu i depozytu.
* Wykrywanie zakleszczeń (deadlocks), braku materiału zaopatrzenia lub wygaśnięcia kalendarza roboczego z jasną diagnozą inżynierską.
* Interaktywny wykres Gantta dla operacji, stanowisk i monterów.

### Moduł 4: Warianty, straty OEE i raporty inżynierskie (Etap 4)
* Statyczne i dynamiczne wskaźniki wykorzystania zasobów (mianowniki czasu aktywnego vs makespanu).
* Dekompozycja strat OEE z wykrywaniem podwójnego naliczenia strat.
* Moduł porównywania wariantów reorganizacji linii (baza vs warianty zbalansowane/zoptymalizowane) z kalkulacją oszczędności czasu i kosztów.
* Symulacja stochastyczna Monte Carlo z powtarzalnym ziarnem losowym i statystykami kwantylowymi (P10, P50, P90).
* Generowanie raportu PDF o czytelnej typografii z tabelami KPI i podsumowaniem.

### Moduł 5: Edytor hali, CAD 2D i ergonomia (Etap 5)
* Interaktywny rzut hali CAD 2D z siatką, przyciąganiem do krawędzi i portów technologicznych.
* Wyznaczanie stref obsługi operatora, odkładania i komunikacji zgodnie z wytycznymi PN-EN ISO 14738.
* Narzędzia pomiarowe (linijka, odległości między obiektami), blokowanie pozycji (locked) i zarządzanie warstwami.
* Import i eksport rysunków DXF ze skalowaniem `$INSUNITS` oraz podkład graficzny hali z dwupunktową kalibracją.

### Moduł 6: Przestrzeń 3D, animacja i modele wyposażenia (Etap 6)
* Trójwymiarowy podgląd hali Three.js z manipulatorami translacji i obrotu (skróty W/E/Q).
* Niezmiennik separacji wizualnej (Zasada 6 i Plan 6.4: zmiana wyglądu 3D nie zmienia technologii ani wyników symulacji).
* Zestaw 10 zoptymalizowanych proceduralnych modeli Blender 5.2.1 LTS ($\le 5000$ trójkątów na model, w tym regały magazynowe i paletowe PHR 1- i 2-gniazdowe).
* Tryb uproszczony LOD (Bounding Box) dla słabszych układów graficznych oraz otwieranie widoków w osobnym oknie (Popout Windows).

### Moduł 7: Dojrzałość komercyjna, katalog demonstracyjny i tutorial (Etap 7)
* Czysty start aplikacji bez zaszytych na stałe danych klientów.
* Trzy wersjonowane pakiety demonstracyjne o rosnącym stopniu złożoności (01, 02, 03) z sumami SHA-256.
* Interaktywny tutorial Lean (8 kroków) z fiszkami pojęciowymi i asystą nawigacji.
* Zautomatyzowany audyt kwalifikacji danych walidacyjnych (`measured` vs `synthetic` vs `fixture`).

---

## 3. Granice stosowalności i znane ograniczenia pierwszego wydania

Dla zachowania przejrzystości inżynierskiej, następujące obszary pozostają celowo poza zakresem pierwszego wydania (lub zostały zaplanowane na Etap 8 / wersję 2.0):
1. **Reguła zbiegania strumieni (C2):** Węzeł montażu łączący strumienie wymaga bufora wejściowego (`inputCapacity >= 1`) co najmniej po jednej stronie. Detale nie mogą „wisieć w powietrzu” ani być odkładane w niedozwolonych miejscach; jednoczesne zdalne wejścia 0 korpusu i podmontażu są trwale odrzucane przez scheduler.
2. **Logistyka magazynowa:** Aplikacja modeluje transport montażowy pomiędzy operacjami na linii. Zasilanie z magazynu centralnego stanowi zdarzenie dostępności materiałowej (dostawy cykliczne/partiowe), bez symulacji floty wózków widłowych w magazynie głównym.
3. **Formaty CAD:** Obsługiwane są formaty otwarte (DXF, glTF/GLB). Bezpośredni import binarnych plików parametrycznych z systemów SolidWorks/CATIA/STEP należy do wersji rozszerzonej (Etap 8.4).
4. **Value Stream Mapping (VSM):** Pełne mapowanie strumienia wartości w skali całego łańcucha dostaw przewidziano na wersję 2.0.

---

## 4. Dowody automatycznej weryfikacji pilotażu 7.9

| Obszar testu | Narzędzie weryfikacji | Rezultat |
| --- | --- | --- |
| Test E2E pilotażu użytkownika | Edge CDP (`tests/qa/verify_7_9_pilot.mjs`) | **PASS** (0 błędów w konsoli, 8 zrzutów ekranu w `outputs/qa/7_9_pilot/`) |
| Testy jednostkowe rdzenia (core) | `node scripts/test.mjs --suite=core` | **110/110 PASS** (100%) |
| Testy integracyjne sieci i symulacji | `node scripts/test.mjs --suite=network` | **385/385 PASS** (100%) |
| Łączna regresja automatyczna | Razem core + network | **495/495 PASS** (100%) |
| Audyt kwalifikacji danych 7.1 | `node scripts/audit_data_qualification_7_1.mjs` | **6/6 PASS** |
| Weryfikacja dokumentacji i linków | `node scripts/verify_documentation.mjs` | **PASS** (129 dokumentów, 0 błędnych odnośników) |
| Kompilacja produkcyjna Vite / TypeScript | `npm.cmd run build` | **PASS** (7,19 s, 2000 modułów) |

Zakończenie pilotażu z wynikiem 0 błędów krytycznych potwierdza gotowość pierwszego wydania do wdrożenia komercyjnego.
