import React from 'react';
import { TUTORIAL_STEPS } from '../../core/tutorial';
import { BookOpen, X } from 'lucide-react';

export function TutorialModalText({
  isOpen,
  onClose,
  onJumpToStep
}: {
  isOpen: boolean;
  onClose: () => void;
  onJumpToStep: (index: number) => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Instrukcja tekstowa tutorialu">
      <div className="tutorial-text-modal">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #334155', paddingBottom: '0.75rem'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <BookOpen size={20} color="#38bdf8" />
            <h2 style={{margin: 0, fontSize: '1.25rem', color: '#f8fafc'}}>Kompletny przewodnik po aplikacji — wersja tekstowa</h2>
          </div>
          <button type="button" className="tutorial-btn tutorial-btn-subtle" onClick={onClose} aria-label="Zamknij instrukcję tekstową">
            <X size={18} />
          </button>
        </div>

        <p style={{color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.25rem'}}>
          Poniżej znajduje się pełny zestaw kroków, definicji i instrukcji tutorialu. Możesz przeczytać go w całości lub przeskoczyć bezpośrednio do wybranego etapu.
        </p>

        <div className="tutorial-text-steps">
          {TUTORIAL_STEPS.map((step, index) => (
            <article key={step.id} className="tutorial-text-step">
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.35rem'}}>
                <h3 style={{margin: 0, fontSize: '1.05rem', color: '#ffffff'}}>
                  {index + 1}. {step.title}
                </h3>
                <button
                  type="button"
                  className="tutorial-btn tutorial-btn-subtle"
                  style={{fontSize: '0.8rem', padding: '0.2rem 0.5rem'}}
                  onClick={() => {
                    onJumpToStep(index);
                    onClose();
                  }}
                >
                  Przejdź do tego kroku →
                </button>
              </div>

              {step.conceptTitle && (
                <div className="tutorial-concept-card" style={{margin: '0.4rem 0'}}>
                  <div className="tutorial-concept-title">{step.conceptTitle}</div>
                  <div>{step.conceptDescription}</div>
                </div>
              )}

              <p style={{margin: '0.4rem 0', color: '#e2e8f0', fontSize: '0.9rem'}}>
                <strong>Wskazówka:</strong> {step.instruction}
              </p>

              {step.hint && (
                <div style={{color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic'}}>
                  💡 {step.hint}
                </div>
              )}
            </article>
          ))}
        </div>

        <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '1px solid #334155', paddingTop: '1rem'}}>
          <button type="button" className="tutorial-btn tutorial-btn-primary" onClick={onClose}>
            Zamknij przewodnik
          </button>
        </div>
      </div>
    </div>
  );
}
