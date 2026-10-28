/**
 * 7.14: Interaktywny tutorial krok po kroku oparty na projekcie podstawowym (01_zestaw_montazowy).
 */

export interface TutorialStep {
  id: string;
  title: string;
  tab: string; // Identyfikator karty widoku (np. 'dashboard', 'demand', 'process', 'balance', 'layout', 'simulation', 'stations', 'report')
  targetSelector?: string; // Selektor CSS elementu wyróżnianego w UI
  conceptTitle?: string; // Tytuł pojęcia Lean / inżynierii
  conceptDescription?: string; // Wyjaśnienie pojęcia
  instruction: string; // Dokładna instrukcja dla użytkownika
  hint?: string; // Podpowiedź ułatwiająca wykonanie kroku
}

export interface TutorialProgress {
  version: 1;
  active: boolean;
  currentStepIndex: number;
  completedStepIds: string[];
  savedAt: string;
  previousWorkspaceSnapshot?: string | null; // Kopia zapasowa środowiska przed wejściem do tutorialu
}

export const TUTORIAL_STORAGE_KEY = 'layout-studio-tutorial-v1';
export const TUTORIAL_VERSION = 1;

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'step-01-welcome',
    title: 'Wprowadzenie i wybór projektu',
    tab: 'dashboard',
    targetSelector: '[aria-label="Przykłady do pobrania"], .demo-catalog, button[aria-label="Menu projektu"]',
    conceptTitle: 'Czym jest Layout Studio Pro 3D?',
    conceptDescription: 'Aplikacja łączy projektowanie technologiczne (popyt, czasy, bilansowanie) z fizycznym planowaniem hali produkcyjnej (CAD 2D, 3D, bufory i transport). W tym tutorialu przejdziesz całą ścieżkę na prostym przykładzie zestawu montażowego.',
    instruction: 'Otwórz sekcję „Przykłady do pobrania” poniżej lub skorzystaj z menu „Menu projektu → Pakiet projektu”, aby zapoznać się z podstawowym pakietem „Zestaw montażowy”. Możesz także kliknąć „Dalej”, by przejść do analizy popytu.',
    hint: 'Projekt podstawowy składa się z 3 kolejnych operacji montażowych i 3 pracowników.'
  },
  {
    id: 'step-02-demand',
    title: 'Popyt klienta i takt time',
    tab: 'demand',
    targetSelector: '.form-grid, [aria-label="Popyt roczny [szt.]"]',
    conceptTitle: 'Takt Time vs Cel cyklu (Cycle Time)',
    conceptDescription: 'Takt klienta to tempo, w jakim wyroby muszą opuszczać linię, aby zaspokoić popyt (dostępny czas netto / popyt). Cel cyklu po uwzględnieniu wskaźnika OEE to wymagany technologiczny czas cyklu z bezpieczną rezerwą na straty operacyjne.',
    instruction: 'Przejdź do widoku popytu. Zauważ roczny popyt 57 600 szt., pracę na 1 zmianę oraz takt klienta wynoszący 60 sekund. Wskaźniki przeliczają się natychmiast po zmianie parametrów.',
    hint: 'Dla popytu dziennego 240 szt. i 14 400 s czasu netto, takt wynosi dokładnie 14 400 / 240 = 60 s/szt.'
  },
  {
    id: 'step-03-process',
    title: 'Operacje i struktura procesu',
    tab: 'process',
    targetSelector: '.table-wrap, button[aria-label="Dodaj operację"], table',
    conceptTitle: 'Czasy operacji i praca dodająca wartość (VA / NVA)',
    conceptDescription: 'Proces produkcyjny to sekwencja operacji z określonymi czasami standardowymi. Wartość dodana (VA) to czynności bezpośrednio zmieniające wyrób (montaż); NVA to czynności pomocnicze (np. kontrola, przygotowanie).',
    instruction: 'Zapoznaj się z 3 operacjami montażowymi: ZM-OP10 (20 s), ZM-OP20 (30 s) oraz ZM-OP30 (40 s). Sumaryczny czas pracochłonności to 90 s.',
    hint: 'Zwróć uwagę na kolumny poprzedników (relacje technologiczne zapobiegają błędom kolejności).'
  },
  {
    id: 'step-04-balance',
    title: 'Bilansowanie linii i wykres Yamazumi',
    tab: 'balance',
    targetSelector: 'select[aria-label="Metoda bilansowania"], .metrics',
    conceptTitle: 'Wąskie gardło i sprawność linii',
    conceptDescription: 'Wąskim gardłem (bottleneck) jest stanowisko o najdłuższym czasie cyklu — to ono wyznacza maksymalną przepustowość całej linii. Równoważenie (Line Balancing) dąży do wyrównania obciążeń stanowisk poniżej zadanego taktu.',
    instruction: 'Sprawdź bilansowanie linii. Przy 3 stanowiskach najdłuższy cykl wynosi 40 s (stanowisko 3), co pozwala na osiągnięcie przepustowości do 90 szt./h.',
    hint: 'Możesz porównać metody heurystyczne RPW (Ranked Positional Weight) oraz LCR (Largest Candidate Rule).'
  },
  {
    id: 'step-05-layout',
    title: 'Rozmieszczenie hali i CAD 2D',
    tab: 'layout',
    targetSelector: 'select[aria-label="Typ układu"], svg, .cad-canvas',
    conceptTitle: 'Geometria a technologia',
    conceptDescription: 'Rzut hali 2D pozwala na rozmieszczenie stołów, regałów FIFO i dróg komunikacyjnych. W Layout Studio wizualny wygląd nie zmienia samowolnie czasów operacji — technologia i geometria pozostają rozdzielone.',
    instruction: 'Sprawdź rozkład stanowisk w układzie liniowym lub U-kształtnym. Zauważ automatycznie wyznaczone trasy przepływu między kolejnymi stacjami.',
    hint: 'Możesz wybrać typ układu (Liniowy, U-Shape, L-Shape) lub precyzyjnie przesuwać obiekty myszą.'
  },
  {
    id: 'step-06-simulation',
    title: 'Symulacja harmonogramu i czasu partii',
    tab: 'stations',
    targetSelector: '[aria-label="Harmonogram zespołu szkicu 6"], button[aria-label="Oblicz harmonogram"]',
    conceptTitle: 'Deterministyczna symulacja przepływu',
    conceptDescription: 'Symulacja weryfikuje faktyczny czas realizacji partii wyrobów (makespan), uwzględniając dostępność operatorów, kalendarze przerw oraz buforowanie między stanowiskami.',
    instruction: 'W obszarze Stanowiska przelicz harmonogram dla partii 3 sztuk. W trybie bazowym JIT cała partia kończy się po dokładnie 170 sekundach.',
    hint: 'Wykres Gantta pokazuje dokładne przedziały pracy każdego stanowiska i brak nakładających się rezerwacji osób.'
  },
  {
    id: 'step-07-variants',
    title: 'Porównanie wariantów reorganizacji',
    tab: 'stations',
    targetSelector: '[aria-label="Porównanie wariantów szkicu 6"], [aria-label="Wynik porównania wariantów szkicu 6"]',
    conceptTitle: 'Lean Reorganizacja: 3 stacje vs 2 stacje',
    conceptDescription: 'Inżynier produkcji porównuje warianty: baza z 3 pracownikami (170 s, 90 szt./h) vs konsolidacja do 2 pracowników (190 s, 72 szt./h). Mniejsza obsada oznacza oszczędność kosztów pracy przy zachowaniu wymaganego taktu 60 s.',
    instruction: 'Uruchom porównanie wariantów w sekcji „Porównanie wariantów”. Zobacz syntetyczne zestawienie wskaźników wydajności, kosztów i czasów partii.',
    hint: 'Wariant skonsolidowany nadal bez trudu spełnia popyt klienta (72 szt./h > 60 szt./h).'
  },
  {
    id: 'step-08-report',
    title: 'Raport inżynierski i eksport',
    tab: 'report',
    targetSelector: '.report-header-toolbar, .toolbar button',
    conceptTitle: 'Dokumentacja i przekazanie projektu',
    conceptDescription: 'Gotowy projekt można wyeksportować do formatu JSON, rysunku CAD (.DXF), tabel kalkulacyjnych (.XLSX) oraz pobrać kompletny, edytowalny raport inżynierski Markdown (.md) lub wydrukować PDF.',
    instruction: 'Obejrzyj wygenerowany raport inżynierski zawierający podsumowanie parametrów, bilansu i wyników symulacji. Gratulacje — znasz już pełny cykl pracy w Layout Studio Pro 3D!',
    hint: 'Możesz pobrać raport Markdown (.md) lub kliknąć „Zakończ tutorial”, aby wrócić do pracy na własnym projekcie.'
  }
];

/**
 * Odczytuje stan tutorialu z localStorage.
 */
export function loadTutorialProgress(storage: Storage = localStorage): TutorialProgress {
  try {
    const raw = storage.getItem(TUTORIAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === TUTORIAL_VERSION && typeof parsed.currentStepIndex === 'number') {
        return {
          version: TUTORIAL_VERSION,
          active: Boolean(parsed.active),
          currentStepIndex: Math.max(0, Math.min(parsed.currentStepIndex, TUTORIAL_STEPS.length - 1)),
          completedStepIds: Array.isArray(parsed.completedStepIds) ? parsed.completedStepIds : [],
          savedAt: parsed.savedAt || new Date().toISOString(),
          previousWorkspaceSnapshot: parsed.previousWorkspaceSnapshot ?? null
        };
      }
    }
  } catch {
    // Ignoruj błąd odczytu
  }
  return {
    version: TUTORIAL_VERSION,
    active: false,
    currentStepIndex: 0,
    completedStepIds: [],
    savedAt: new Date().toISOString(),
    previousWorkspaceSnapshot: null
  };
}

/**
 * Zapisuje stan tutorialu w localStorage.
 */
export function saveTutorialProgress(progress: TutorialProgress, storage: Storage = localStorage): void {
  try {
    storage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify({
      ...progress,
      savedAt: new Date().toISOString()
    }));
  } catch {
    // Brak miejsca lub odmowa dostępu do localStorage
  }
}

/**
 * Czyści zapisany stan tutorialu.
 */
export function clearTutorialProgress(storage: Storage = localStorage): void {
  try {
    storage.removeItem(TUTORIAL_STORAGE_KEY);
  } catch {
    // Ignoruj
  }
}
