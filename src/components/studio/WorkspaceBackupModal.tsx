import React, { useState, useRef, useEffect } from 'react';
import {
  createWorkspaceBackup,
  validateWorkspaceBackup,
  restoreWorkspaceBackup,
  inspectWorkspaceStorage,
  APP_VERSION,
  WorkspaceRestoreError,
  type WorkspaceBackupPayload,
  type WorkspaceBackupSummary,
  type BackupValidationResult,
} from '../../core/workspaceBackup';
import { download } from '../../core/project';
import {
  ShieldCheck,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  FileArchive,
  RefreshCw,
  HardDrive,
  Info,
  X,
} from 'lucide-react';

interface WorkspaceBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestored: () => void;
  unsavedChanges?: boolean;
}

export const WorkspaceBackupModal: React.FC<WorkspaceBackupModalProps> = ({
  isOpen,
  onClose,
  onRestored,
  unsavedChanges = false,
}) => {
  const [summary, setSummary] = useState<WorkspaceBackupSummary | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<BackupValidationResult | null>(null);
  const [restoreInProgress, setRestoreInProgress] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const readId = useRef(0);
  const [rollbackSnapshot, setRollbackSnapshot] = useState<string | null>(null);
  const [confirmedBackup, setConfirmedBackup] = useState(false);
  const [recoverySnapshot, setRecoverySnapshot] = useState<string | null>(null);
  const [unrecovered, setUnrecovered] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Refresh summary upon opening
  useEffect(() => {
    if (isOpen) {
      refreshSummary();
      setSelectedFile(null);
      setValidationResult(null);
      setRestoreMessage(null);
      setRollbackSnapshot(null); setConfirmedBackup(false); setRecoverySnapshot(null);
      setRestoreInProgress(false);
      setUnrecovered(false);
      modalRef.current?.focus();
    }
    readId.current++;
    return () => { readId.current++; };
  }, [isOpen]);

  const refreshSummary = () => {
    try {
      const res = inspectWorkspaceStorage(window.localStorage);
      setSummary(res);
    } catch {
      setSummary(null);
    }
  };

  if (!isOpen) return null;

  const handleDownloadBackup = () => {
    try {
      const backup = createWorkspaceBackup(window.localStorage, APP_VERSION);
      const json = JSON.stringify(backup, null, 2);
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
      const filename = `Layout_Studio_Backup_${stamp}.lsbackup.json`;
      download(json, filename, 'application/json');
      setRestoreMessage({
        text: `Utworzono i pobrano kompletną kopię środowiska (${filename}). Suma SHA-256: ${backup.checksumSha256.substring(0, 16)}...`,
        type: 'success',
      });
      refreshSummary();
    } catch (e) {
      setRestoreMessage({
        text: `Błąd podczas tworzenia kopii zapasowej: ${(e as Error).message}`,
        type: 'error',
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const requestId = ++readId.current;
    setValidationResult(null); setConfirmedBackup(false); setRollbackSnapshot(null);
    setSelectedFile(file ?? null); setRestoreMessage(null);
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      if (requestId !== readId.current) return;
      const content = event.target?.result;
      if (typeof content === 'string') setValidationResult(validateWorkspaceBackup(content));
    };
    reader.onerror = () => {
      if (requestId !== readId.current) return;
      setValidationResult({valid: false, error: 'Nie można odczytać pliku.', checksumMatches: false, validatedProjectsCount: 0});
    };
    reader.readAsText(file);
  };

  const downloadRollback = () => {
    try {
      const snapshot = JSON.stringify(createWorkspaceBackup(window.localStorage, APP_VERSION), null, 2);
      download(snapshot, `Rollback_Przed_Odzyskaniem_${Date.now()}.lsbackup.json`, 'application/json');
      setRollbackSnapshot(snapshot); setConfirmedBackup(false);
      setRestoreMessage({text: 'Przekazano kopię ratunkową do pobrania. Sprawdź zapisany plik przed potwierdzeniem.', type: 'success'});
    } catch (error) {
      setRollbackSnapshot(null); setConfirmedBackup(false);
      setRestoreMessage({text: `Nie przygotowano kopii ratunkowej: ${(error as Error).message}`, type: 'error'});
    }
  };

  const handleRestore = () => {
    if (!validationResult?.valid || !validationResult.checksumMatches || !validationResult.payload ||
        !rollbackSnapshot || !confirmedBackup || unsavedChanges || restoreInProgress) return;
    setRestoreInProgress(true);
    try {
      const res = restoreWorkspaceBackup(window.localStorage, validationResult.payload, {expectedCurrentSnapshot: rollbackSnapshot});
      setRestoreMessage({text: `Przywrócono stan środowiska (${res.restoredKeys.length} zmienionych obszarów). Przeładowywanie aplikacji...`, type: 'success'});
      onRestored();
      window.location.reload();
    } catch (error) {
      if (error instanceof WorkspaceRestoreError) {
        setRecoverySnapshot(error.rollbackSnapshot);
        if (error.rollbackErrors.length) setUnrecovered(true);
      }
      setRestoreMessage({text: (error as Error).message, type: 'error'});
      setRestoreInProgress(false); setConfirmedBackup(false); setRollbackSnapshot(null);
    }
  };

  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.protocol === 'file:');

  return (
    <div ref={modalRef} role="dialog" aria-modal="true" aria-label="Kopie i odzyskiwanie środowiska" tabIndex={-1} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-8 text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-800/40">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Kopie i Odzyskiwanie Środowiska (Plan 7.6)
              </h2>
              <p className="text-xs text-slate-400">
                Wersja {APP_VERSION} · Pełny backup wszystkich projektów, wariantów i szkiców
              </p>
            </div>
          </div>
          <button
            disabled={restoreInProgress || unrecovered}
            onClick={onClose}
            aria-label="Zamknij okno kopii i odzyskiwania"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-sm">
          <p className="text-xs text-amber-300">Pełne przywrócenie zastępuje pięć obszarów: projekt 4, warianty 4, warsztat 5, szkic 6 i warianty 6. Brak obszaru (null) w kopii usuwa poprzednie dane tego obszaru. Pozostałe klucze przeglądarki nie są zmieniane.</p>
          {unsavedChanges && <p role="alert" className="text-amber-300">Masz niezapisane zmiany. Zamknij okno i zachowaj je przez zapis lub eksport JSON przed przywróceniem. Kopia środowiska obejmuje zapisane dane przeglądarki.</p>}
          {recoverySnapshot && <button onClick={() => download(recoverySnapshot, 'Ratunkowy_stan_przed_bledem.lsbackup.json', 'application/json')}>Pobierz stan sprzed błędu</button>}
          {unrecovered && <p role="alert" className="text-red-300">Wycofanie nie zostało potwierdzone. Edycja pozostaje zablokowana. Zachowaj stan sprzed błędu i przywróć sprawdzoną kopię przed powrotem do pracy.</p>}
          {/* Notifications */}
          {restoreMessage && (
            <div
              className={`p-3.5 rounded-xl border flex items-start space-x-3 text-xs leading-relaxed ${
                restoreMessage.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                  : 'bg-red-950/40 border-red-500/40 text-red-200'
              }`}
            >
              {restoreMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              )}
              <span>{restoreMessage.text}</span>
            </div>
          )}

          {/* Section 1: Current Storage Overview & Export Backup */}
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-indigo-300 font-semibold text-xs tracking-wider uppercase">
                <HardDrive className="w-4 h-4" />
                <span>Bieżący Stan Pamięci Przeglądarki</span>
              </div>
              <span className="text-[11px] text-slate-400">
                Rozmiar: {((summary?.totalStorageBytes ?? 0) / 1024).toFixed(1)} KB
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Aktywny Projekt (v4):</span>
                <span className="font-medium text-slate-200 truncate block">
                  {summary?.hasActiveProjectV4
                    ? summary.activeProjectV4Name || 'Projekt bez nazwy'
                    : 'Brak'}
                </span>
                <span className="text-[10px] text-slate-500">
                  Warianty scenariuszy: {summary?.scenariosV4Count ?? 0}
                </span>
              </div>

              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Szkic i Warianty (v5 / v6):</span>
                <span className="font-medium text-slate-200 truncate block">
                  {summary?.hasDomainDraftV6
                    ? 'Szkic domenowy v6 aktywny'
                    : summary?.hasStationsProjectV5
                    ? 'Projekt stanowisk v5'
                    : 'Brak szkicu'}
                </span>
                <span className="text-[10px] text-slate-500">
                  Warianty domeny v6: {summary?.variantsV6Count ?? 0}
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-700/40">
              <span className="text-xs text-slate-400">
                Eksport kompletnego archiwum roboczego z sumą kontrolną SHA-256.
              </span>
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl shadow transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Pobierz Pełną Kopię (.lsbackup.json)</span>
              </button>
            </div>
          </div>

          {/* Section 2: Restore from Backup (Disaster Recovery) */}
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/60 space-y-3">
            <div className="flex items-center space-x-2 text-amber-300 font-semibold text-xs tracking-wider uppercase">
              <Upload className="w-4 h-4" />
              <span>Przywróć Środowisko z Kopii (Disaster Recovery)</span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Wybierz plik kopii zapasowej (<code>.lsbackup.json</code>). Przed nadpisaniem pobierz kopię
              ratunkową obecnego stanu i potwierdź zapisanie pliku. Przy błędzie aplikacja spróbuje wycofać zmiany.
            </p>

            <div className="flex items-center space-x-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.lsbackup.json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-medium rounded-xl transition flex items-center space-x-2"
              >
                <FileArchive className="w-4 h-4 text-amber-400" />
                <span>{selectedFile ? selectedFile.name : 'Wybierz plik kopii (.lsbackup.json)...'}</span>
              </button>
            </div>

            {/* Validation Feedback */}
            {validationResult && (
              <div
                className={`p-3 rounded-xl border text-xs space-y-2 ${
                  validationResult.valid
                    ? 'bg-slate-900/80 border-slate-700'
                    : 'bg-red-950/40 border-red-500/40 text-red-200'
                }`}
              >
                {validationResult.valid && validationResult.payload ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {validationResult.checksumMatches ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                            ✓ Integralność SHA-256 potwierdzona
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950 text-amber-300 border border-amber-500/40">
                            ⚠ Suma kontrolna różni się od nagłówka
                          </span>
                        )}
                        <span className="text-slate-400 text-[11px]">
                          Data kopii: {new Date(validationResult.payload.createdAt).toLocaleString('pl-PL')}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Aplikacja v{validationResult.payload.appVersion}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-300 space-y-0.5 border-t border-slate-800 pt-1.5">
                      <div>
                        • Projekt aktywny v4:{' '}
                        <strong>
                          {validationResult.payload.summary.hasActiveProjectV4
                            ? validationResult.payload.summary.activeProjectV4Name || 'Obecny'
                            : 'Brak'}
                        </strong>
                      </div>
                      <div>
                        • Warianty scenariuszy: {validationResult.payload.summary.scenariosV4Count}
                      </div>
                      <div>
                        • Szkic domeny v6:{' '}
                        {validationResult.payload.summary.hasDomainDraftV6 ? 'Obecny' : 'Brak'} (warianty:{' '}
                        {validationResult.payload.summary.variantsV6Count})
                      </div>
                    </div>

                    <div className="pt-2 space-y-2">
                      <button disabled={restoreInProgress} onClick={downloadRollback}>Pobierz kopię ratunkową przed przywróceniem</button>
                      <label className="flex items-center gap-2"><input type="checkbox" disabled={!rollbackSnapshot || restoreInProgress}
                        checked={confirmedBackup} onChange={event => setConfirmedBackup(event.target.checked)} />
                        Potwierdzam zapisanie kopii ratunkowej i zastąpienie pięciu obszarów danych.</label>
                    </div>
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        disabled={restoreInProgress || !rollbackSnapshot || !confirmedBackup || unsavedChanges}
                        onClick={handleRestore}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow transition flex items-center space-x-1.5"
                      >
                        {restoreInProgress ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Przywracanie...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5" />
                            <span>Przywróć stan z kopii i zrestartuj</span>
                          </>
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-start space-x-2 text-red-300">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{validationResult.error}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 3: Distribution & Offline Standalone Details */}
          <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs text-slate-400 space-y-1.5">
            <div className="flex items-center space-x-1.5 text-slate-300 font-semibold">
              <Info className="w-3.5 h-3.5 text-indigo-400" />
              <span>Dystrybucja i Praca Offline (Zero Zależności Zewnętrznych)</span>
            </div>
            <p className="leading-relaxed">
              Layout Studio Pro działa całkowicie w przeglądarce klienta (lokalny runtime). Wszystkie obliczenia
              balansu, symulacje stochastyczne Monte Carlo, silnik Three.js 3D i edytor CAD 2D wykonują się bez
              wysyłania danych na serwery zewnętrzne.
            </p>
            <p className="leading-relaxed">
              <strong>Środowisko lokalne / produkcyjne:</strong>{' '}
              {isLocalhost ? (
                <span className="text-emerald-400 font-medium">Uruchomiono lokalnie (Offline Ready)</span>
              ) : (
                <span className="text-cyan-400 font-medium">Wersja webowa hosted (Vercel)</span>
              )}
              . Na komputerze bez dostępu do Internetu aplikację uruchamia się poleceniem <code>npm start</code> lub
              skryptem <code>Uruchom_Layout_Studio.bat</code> na porcie 4173.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-800/30 flex justify-end">
          <button
            type="button"
            disabled={restoreInProgress || unrecovered}
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
