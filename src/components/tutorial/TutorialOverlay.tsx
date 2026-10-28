import React, { useEffect, useState } from 'react';
import {
  TUTORIAL_STEPS,
  type TutorialProgress,
  saveTutorialProgress,
  clearTutorialProgress
} from '../../core/tutorial';
import { TutorialModalText } from './TutorialModalText';
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  X,
  RotateCcw,
  GraduationCap
} from 'lucide-react';
import './Tutorial.css';

export function TutorialOverlay({
  progress,
  onChangeProgress,
  currentTab,
  onNavigateTab,
  onExitTutorial
}: {
  progress: TutorialProgress;
  onChangeProgress: (next: TutorialProgress) => void;
  currentTab: string;
  onNavigateTab: (tab: string) => void;
  onExitTutorial: () => void;
}) {
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);
  const stepIndex = progress.currentStepIndex;
  const currentStep = TUTORIAL_STEPS[stepIndex] || TUTORIAL_STEPS[0];
  const totalSteps = TUTORIAL_STEPS.length;
  const progressPercent = Math.round(((stepIndex + 1) / totalSteps) * 100);

  // Synchronizacja karty widoku z bieżącym krokiem tutorialu
  useEffect(() => {
    if (!progress.active) return;
    if (currentStep.tab && currentStep.tab !== currentTab) {
      onNavigateTab(currentStep.tab);
    }
  }, [progress.active, stepIndex]);

  // Podświetlanie elementu docelowego w DOM
  useEffect(() => {
    if (!progress.active) return;
    const selector = currentStep.targetSelector;
    if (!selector) return;

    let targetElement: Element | null = null;
    const selectors = selector.split(',').map(s => s.trim());
    for (const s of selectors) {
      const el = document.querySelector(s);
      if (el) {
        targetElement = el;
        break;
      }
    }

    if (targetElement) {
      targetElement.classList.add('tutorial-target-highlight');
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    return () => {
      if (targetElement) {
        targetElement.classList.remove('tutorial-target-highlight');
      }
    };
  }, [progress.active, stepIndex, currentStep.targetSelector, currentTab]);

  // Obsługa skrótów klawiaturowych (Escape, Strzałka w lewo/prawo)
  useEffect(() => {
    if (!progress.active) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onExitTutorial();
      } else if (e.key === 'ArrowRight' && (e.altKey || e.ctrlKey)) {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft' && (e.altKey || e.ctrlKey)) {
        e.preventDefault();
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [progress.active, stepIndex, progress]);

  const handleNext = () => {
    const nextCompleted = Array.from(new Set([...progress.completedStepIds, currentStep.id]));
    if (stepIndex < totalSteps - 1) {
      const next: TutorialProgress = {
        ...progress,
        currentStepIndex: stepIndex + 1,
        completedStepIds: nextCompleted
      };
      onChangeProgress(next);
      saveTutorialProgress(next);
    } else {
      // Ostatni krok - zakończenie
      const next: TutorialProgress = {
        ...progress,
        active: false,
        completedStepIds: nextCompleted
      };
      onChangeProgress(next);
      saveTutorialProgress(next);
      onExitTutorial();
    }
  };

  const handlePrev = () => {
    if (stepIndex > 0) {
      const next: TutorialProgress = {
        ...progress,
        currentStepIndex: stepIndex - 1
      };
      onChangeProgress(next);
      saveTutorialProgress(next);
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleReset = () => {
    const next: TutorialProgress = {
      ...progress,
      currentStepIndex: 0,
      completedStepIds: []
    };
    onChangeProgress(next);
    saveTutorialProgress(next);
  };

  const handleJumpToStep = (index: number) => {
    const next: TutorialProgress = {
      ...progress,
      currentStepIndex: index
    };
    onChangeProgress(next);
    saveTutorialProgress(next);
  };

  if (!progress.active) return null;

  return (
    <>
      <aside className="tutorial-dock" role="region" aria-label="Interaktywny przewodnik tutorialu">
        <div className="tutorial-dock-header">
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <span className="tutorial-badge">
              <GraduationCap size={14} /> Tutorial
            </span>
            <span className="tutorial-step-indicator" aria-live="polite">
              Krok {stepIndex + 1} z {totalSteps}
            </span>
          </div>

          <div style={{display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
            <button
              type="button"
              className="tutorial-btn tutorial-btn-subtle"
              style={{fontSize: '0.8rem', padding: '0.2rem 0.5rem'}}
              onClick={() => setIsTextModalOpen(true)}
              title="Otwórz pełny tekst instrukcji"
              aria-label="Otwórz przewodnik tekstowy"
            >
              <BookOpen size={14} /> Instrukcja
            </button>
            <button
              type="button"
              className="tutorial-btn tutorial-btn-subtle"
              style={{fontSize: '0.8rem', padding: '0.2rem 0.5rem'}}
              onClick={handleReset}
              title="Rozpocznij od pierwszego kroku"
              aria-label="Zresetuj postęp tutorialu"
            >
              <RotateCcw size={14} />
            </button>
            <button
              type="button"
              className="tutorial-btn tutorial-btn-subtle"
              style={{padding: '0.2rem 0.4rem'}}
              onClick={onExitTutorial}
              title="Zakończ tutorial i wróć (Escape)"
              aria-label="Zamknij tutorial"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="tutorial-progress-bar" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100} aria-label="Postęp tutorialu">
          <div className="tutorial-progress-fill" style={{width: `${progressPercent}%`}} />
        </div>

        <h3 className="tutorial-dock-title">{currentStep.title}</h3>

        {currentStep.conceptTitle && (
          <div className="tutorial-concept-card">
            <div className="tutorial-concept-title">💡 {currentStep.conceptTitle}</div>
            <div>{currentStep.conceptDescription}</div>
          </div>
        )}

        <div className="tutorial-instruction">
          👉 {currentStep.instruction}
        </div>

        {currentStep.hint && (
          <div className="tutorial-hint">
            Wskazówka: {currentStep.hint}
          </div>
        )}

        <div className="tutorial-dock-actions">
          <div className="tutorial-dock-actions-left">
            <button
              type="button"
              className="tutorial-btn"
              disabled={stepIndex === 0}
              onClick={handlePrev}
              aria-label="Poprzedni krok tutorialu"
            >
              <ChevronLeft size={16} /> Poprzedni
            </button>
            {stepIndex < totalSteps - 1 && (
              <button
                type="button"
                className="tutorial-btn tutorial-btn-subtle"
                onClick={handleSkip}
                aria-label="Pomiń krok tutorialu"
              >
                Pomiń
              </button>
            )}
          </div>

          <div className="tutorial-dock-actions-right">
            <button
              type="button"
              className="tutorial-btn tutorial-btn-primary"
              onClick={handleNext}
              aria-label={stepIndex === totalSteps - 1 ? 'Zakończ tutorial' : 'Następny krok tutorialu'}
            >
              {stepIndex === totalSteps - 1 ? (
                'Zakończ tutorial ✓'
              ) : (
                <>Następny krok <ChevronRight size={16} /></>
              )}
            </button>
          </div>
        </div>
      </aside>

      <TutorialModalText
        isOpen={isTextModalOpen}
        onClose={() => setIsTextModalOpen(false)}
        onJumpToStep={handleJumpToStep}
      />
    </>
  );
}
