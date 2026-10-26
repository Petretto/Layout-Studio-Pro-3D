# Uporządkowanie katalogu projektu — 2026-10-26

Zadanie utrzymaniowe dokumentacji (7.8), zlecone bezpośrednio przez użytkownika. Nie zmienia statusu funkcji ani dalszego pakietu C2-B2b.

Przeniesiono **113 plików** z katalogu głównego: modele i standardy do `docs/modele/`, raporty do `docs/weryfikacja/`, plany/notatki do `docs/plany/`, opisy produktu do `docs/produkt/`, opisy danych do `docs/dane/`, historię do `docs/historia/`, projekty interfejsu do `docs/projekty/`, pliki Pencil do `design/`. Dokładna mapa: [relocations.json](../relocations.json).

W katalogu głównym pozostały główny plan, AGENTS.md, krótki README, konfiguracja/build i pliki uruchamiania. Instrukcja użytkownika pozostaje w dotychczasowym katalogu `Instrukcja/`. Nie zmieniano danych produkcyjnych, zapisanych przykładów, historycznych kopii ani niezwiązanych lokalnych zmian.

Poprawiono referencje w planie i dokumentach, względne odnośniki oraz ścieżki skryptów audytu Eko i podglądu UI 5.1. Trzy stare odnośniki `file:///C:/...` zastąpiono przenośnymi względnymi. README i `docs/README.md` opisują układ; AGENTS.md nakazuje używać właściwych katalogów również przy kolejnych pracach.

Backup oryginałów przed przeniesieniem/edycją: `backup/dokumentacja_przed_uporzadkowaniem_20261026`, **118 plików**, niezależny odczyt i porównanie SHA-256 kopii ze źródłami PASS. Manifest `SHA256.json` zachowuje pierwotne ścieżki.

Weryfikacja:

- `node scripts/verify_documentation.mjs`: PASS — 113 przeniesionych plików, 114 dokumentów, 36 lokalnych odnośników; kontrola katalogu głównego PASS.
- `node --check scripts/audit_eko_data_7_1.mjs` i `node --check tests/qa/verify_5_1.mjs`: PASS; skrypty wskazują istniejące nowe ścieżki. Audytu nie uruchamiano ponownie, aby nie nadpisywać dotychczasowych dowodów danych.
- `node scripts/generate_pdf_html.mjs --check`: PASS; instrukcja MD/HTML nie wymaga regeneracji, nie zmieniła treści.
- Bez regresji symulacji, builda aplikacji i ponownego odbioru UI: zmiany organizacyjne dokumentacji, bez zmian kodu aplikacji lub zapisów.
- `node scripts/plan_progress.mjs`: cały plan **61/72 = 84,7%**, pierwsze wydanie **61/68 = 89,7%**.

Nowy `scripts/verify_documentation.mjs` można uruchamiać po kolejnych pracach; wykryje powrót modeli/raportów do katalogu głównego i uszkodzone odnośniki. Git push nie potwierdza wdrożenia Vercel.
