export interface CalculationProgress {completed: number; total: number}
export type CalculationReply<Result> = {kind: 'progress'; progress: CalculationProgress} |
  {kind: 'result'; result: Result} | {kind: 'error'; message: string};
export type WorkerPort = Pick<Worker, 'onmessage' | 'onerror' | 'postMessage' | 'terminate'>;

/** One worker per calculation. Termination and the active guard discard late replies. */
export function startBackgroundTask<Request, Result>(request: Request, callbacks: {
  progress: (progress: CalculationProgress) => void;
  result: (result: Result) => void;
  error: (message: string) => void;
}, createWorker: () => WorkerPort): () => void {
  let active = true;
  let worker: WorkerPort | undefined;
  const stop = () => {if (!active) return;active = false;if (worker) {worker.onmessage = null;worker.onerror = null;worker.terminate();}};
  try {
    worker = createWorker();
    worker.onmessage = event => {
      if (!active) return;
      const reply = event.data as CalculationReply<Result>;
      if (reply.kind === 'progress') callbacks.progress(reply.progress);
      else {stop();if (reply.kind === 'result') callbacks.result(reply.result);else callbacks.error(reply.message);}
    };
    worker.onerror = event => {if (!active) return;event.preventDefault();stop();callbacks.error(event.message || 'Błąd obliczeń w tle.');};
    worker.postMessage(request);
  } catch (failure) {stop();callbacks.error((failure as Error).message);}
  return stop;
}
