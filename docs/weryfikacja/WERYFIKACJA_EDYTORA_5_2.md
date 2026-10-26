# 5.2 — organizacja edytora hali, wariant B

Odbiór 2026-10-18. Wdrożono wybrany przez użytkownika B w aktywnym edytorze projektu 4: większy rzut, drzewo po lewej, właściwości i parametry hali po prawej jako panele na żądanie. Jeden panel otwarty naraz, zamykanie ×/Escape, długie formularze przewijane wewnętrznie. Dolne listy oraz wyniki i oś czasu są zwijane.

Dolny panel uruchamia istniejący komponent `Simulation` dopiero po pierwszym otwarciu. Zachowuje wynik podczas zwijania, stosuje istniejącą walidację i model grafowy projektu 4: zerowy transport, dedykowani operatorzy, kolejki bez limitu. Wyniki szkicu 6 nie są prezentowane jako wyniki aktywnego projektu 4. Przejście do innej zakładki zamyka ten widok i uruchamia osobną instancję symulacji. Zmiana projektu unieważnia niezatwierdzone formularze geometrii, chroniąc przed zapisaniem starego stanu po Cofnij/Ponów.

## Backup i kompatybilność

`backup/v0.4.0_przed_5_2_20261018`: 322 pliki z weryfikacją SHA256 przed zmianami strukturalnymi. Odtwarzanie: zachować kopię obecnego stanu, użyć źródeł z backupu zgodnie z jego manifestem, odbudować aplikację; nie nadpisywać zapisów użytkownika. Schematy, ID, referencje i reguły symulacji pozostają dotychczasowe; migracja danych nie jest wymagana.

## Wykonane sprawdzenia

- `node scripts/test.mjs --suite=core '--test-name-pattern=symulac|układy|obrócone'`: 5/5 PASS — symulacja kolejki, mnożniki odtwarzania i niezmienność wyników, geometria generatora, obrócone obrysy/kolizje/DXF.
- `node scripts/test.mjs --suite=network '--test-name-pattern=3.1b:'`: 1/1 PASS — pełny wynik, wejście i postęp istniejącej symulacji w tle 4/5.
- `npm.cmd run build`: TypeScript/Vite PASS; istniejące ostrzeżenie o dużych chunkach. Bez pełnej regresji: lokalna reorganizacja UI i ponowne użycie istniejącej symulacji; ostatni zapisany pełny przebieg w 4.6: 305/305, od tego czasu implementacje 4.7 i 5.2 (dokumentacja/projekt 5.1 nie są pakietami implementacyjnymi).
- `node tests/qa/verify_5_2.mjs`: Edge CDP PASS na finalnym buildzie — 1440/960/600 px, brak poziomego przepełnienia, panele, wybór w drzewie, formularze i walidacja, dodanie wyposażenia/przeszkody, rzeczywisty gest przesuwania z siatką i cofnięcie, Cofnij/Ponów, usunięcie starego formularza po cofnięciu, zapis/odczyt projektu, anulowanie i potwierdzenie generatora, usunięcie przeszkody z potwierdzeniem, Escape, dolne listy, ukończenie partii i zachowanie wyniku przy zwijaniu. Brak wyjątków JS. Pierwsza próba w ograniczonym środowisku zakończyła się timeoutem CDP; po udzieleniu uprawnienia Edge końcowy odbiór PASS.
- Wizualny przegląd zrzutów desktopowych i 600 px oraz renderów 21 stron instrukcji PASS. Materiał odbiorowy jest syntetyczny, nie jest pomiarem produkcyjnym.
- Podręcznik Markdown (Krok 7) + HTML/PDF zaktualizowane. Generator HTML PASS, Edge wydruk PDF PASS (21 obrazów). `scripts/verify_manual.py outputs/qa/manual_5_2`: 21 stron, 21 odwołań do obrazów; brak brakujących obrazów/rozdziałów, pustych stron i tekstu poza stroną. Kontaktówki i raport w `outputs/qa/manual_5_2`.

## Granice i dostarczenie

5.2 nie wdraża wielokrotnego zaznaczania, grup, warstw, pomiarów ani nowych reguł synchronizacji 2D/3D; to kolejne punkty planu. Lista biblioteki korzysta z istniejących obiektów i obecnych akcji dodawania, nie z nowego katalogu zasobów. Oś czasu jest istniejącą osią odtwarzania symulacji projektu 4; szczegółowy Gantt szkicu 6 pozostaje w jego warsztacie.

5.2 spełnia kryteria odbioru w tym zakresie. `node scripts/plan_progress.mjs`: cały plan 38/67 = 56,7%, pierwsze wydanie 38/65 = 58,5%, Etap 5: 4/13 = 30,8%. Następny punkt: 5.3. Git push nie potwierdza wdrożenia Vercel; wdrożenia Vercel nie weryfikowano.
