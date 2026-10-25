# Pakiet pokazowy: Eko — montaż ramy 1.4 (04_eko)

Wersja pakietu: **1.0.0**.
Pochodzenie danych: **mixed** (rzeczywiste pomiary fabryczne z lipca 2026 r. dla operacji OP10–OP21; czasy przykładowe dla operacji OP22–OP25 per wyjaśnienia użytkownika).
Format wejściowy: **`projekt-pokazowy.json`** zgodny z otoczką `layout-studio-project-package` v1.

---

## 1. Zawartość pakietu

**Zakres demonstracyjny:** cały proces manualny, bez maszyn. OP10–OP21 są średnimi z kilku pomiarów ramy 1.4; liczba prób nieznana. OP22–OP25 pozostają przykładowe (600/600/480/480 s). Pakowanie OP21 wymaga dwóch osób przez całe 1320 s. Źródłowe 13 osób nie ma znanych przydziałów; demo używa 17 jawnie testowych ról, a nie odtworzonej obsady produkcji. Hala/popyt/konkurencja są założeniami, geometria domenowa nie jest gotową sceną fizyczną.

Pakiet zawiera 12 plików:
- `manifest.json` — inwentarz plików z sumami SHA-256.
- `projekt-pokazowy.json` — pojedynczy plik projektu do wczytania przez przycisk *Pakiet projektu*.
- `dane/proces.xlsx` — arkusz procesu z 12 czasami pomiarowymi i czterema przykładowymi.
- `dane/bom.xlsx` — arkusz zestawienia materiałowego z 60 komponentami.
- `dane/szkic6.json`, `dane/warianty6.json`, `dane/zrodlo4.json` — projekcje formatów JSON.
- `dane/warunki_eksperymentu.json` — warunki symulacji.
- `dane/slownik_pol.md` — słownik techniczny.
- `referencje/oczekiwane_wyniki.json`, `referencje/obliczenia.md` — niezależne wzorce analityczne.
- `README.md` — niniejsza instrukcja.

---

## 2. Jak załadować projekt do Layout Studio Pro

1. W menu głównym aplikacji rozwiń **Menu projektu** i wybierz **Pakiet projektu**.
2. W sekcji *Import z podglądem* wskaż plik `przyklady/04_eko/projekt-pokazowy.json`.
3. Kliknij **Pobierz kopię ratunkową przed importem**, zaznacz potwierdzenie i kliknij **Wczytaj pakiet i przeładuj**.
4. W harmonogramie ustaw **1 sztukę**, odstęp **1 s** i pozostaw opcję **Symulacja bez transportu — just in time WYŁĄCZONĄ**. To wzorzec logiczny korpusu z jawną równoległością, bez gotowego transportu fizycznego i bez geometrii domenowej. JIT jest innym eksperymentem i nie daje dla wariantu równoległego tego samego wyniku. W zakładce **Stanowiska i zasoby** (*Proces i stanowiska* $\rightarrow$ *Stanowiska i zasoby*) uruchom symulację:
   - Wariant bazowy (EKO-PARALLEL): **13 550 s**
   - Wariant sekwencyjny (EKO-SEQUENTIAL): **14 150 s**
   - Wariant współdzielony (EKO-SHARED-WORKER): **14 150 s**
