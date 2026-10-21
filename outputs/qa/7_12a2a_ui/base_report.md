# Widok aktywnego szkicu 6 — Zestaw uchwytu montażowego — DEMO syntetyczne

Projekt: DEMO-ZESTAW-MONTAZOWY-1 · Schemat: 6
SHA-256 modelu: b5c7800330b63748a27e658f1e5062c949db510ad391e0255fb7b8538c78b05d

To raport statycznego stanu tego modelu, bez uruchamiania symulacji ani konwersji do projektu 4. Nie potwierdza przepustowości dynamicznej, kompletności kalendarzy/transportu ani wykonalności obsady. Wyniki harmonogramu i porównania pobieraj z ich paneli dla tych samych danych i jawnych warunków.

Takt klienta: 60 s/szt.; cel po OEE: 60 s/szt.
Wybrana suma czasów operacji: 90 s/szt. To suma czasów trwania operacji, nie automatycznie suma osobosekund.
Skład przebiegu: ZM-W1, ZM-W2, ZM-W3.
Statyczny pułap jawnych kopii: 90 szt./h; maksymalna suma na kopię: 40 s/szt. Alternatywne dopuszczenia nie są arbitralnie rozdzielane.

| Stanowisko | ID | Operacje wg rejestru | Suma wybranych czasów [s/szt.] | Zadeklarowane kopie |
| --- | --- | --- | --- | --- |
| S1 — Przygotowanie podstawy | ST-ZM-1 | ZM-OP10 | 20 | 1 |
| S2 — Montaż uchwytu i pokręteł | ST-ZM-2 | ZM-OP20 | 30 | 1 |
| S3 — Kontrola i opakowanie zestawu | ST-ZM-3 | ZM-OP30 | 40 | 1 |

| Operacja | Stanowisko wg rejestru | Wybrany czas [s] | Pochodzenie | Obsada | Dopuszczone kopie |
| --- | --- | --- | --- | --- | --- |
| ZM-OP10 — Przygotowanie podstawy | ST-ZM-1 | 20 | założenie | 1 | ST-ZM-1#1 |
| ZM-OP20 — Montaż uchwytu i pokręteł | ST-ZM-2 | 30 | założenie | 1 | ST-ZM-2#1 |
| ZM-OP30 — Kontrola i opakowanie zestawu | ST-ZM-3 | 40 | założenie | 1 | ST-ZM-3#1 |

## Geometria tego samego modelu

Hala [mm]: 8000 × 6000 × 3000. Potwierdzona: nie.

| Obiekt | Stanowisko | X/Y/Z [mm] | Wymiary [mm] | Obrót [°] |
| --- | --- | --- | --- | --- |
| ZM-TABLE-1 | ST-ZM-1 | 1000/2000/0 | 1200×800×900 | 0 |
| ZM-TABLE-2 | ST-ZM-2 | 3000/2000/0 | 1200×800×900 | 0 |
| ZM-TABLE-3 | ST-ZM-3 | 5000/2000/0 | 1200×800×900 | 0 |

- Wymiary hali są niepotwierdzone.

Rzut jest odczytem istniejącej geometrii; brak stołu nie tworzy go automatycznie. Obrys nie jest certyfikacją BHP ani kształtem dokładnego modelu CAD. Widok 3D i animacja szkicu 6 pozostają do odrębnej integracji; główna animacja/raport 4 nie przedstawiają automatycznie tego modelu.
