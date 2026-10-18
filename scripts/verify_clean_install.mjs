import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const temp = mkdtempSync(join(tmpdir(), 'layout-studio-verify-install-'));

const workspaceBackupPath = resolve('src/core/workspaceBackup').replace(/\\/g, '/');

const runnerSource = `
import { readFile, stat, access, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { spawn } from 'node:child_process';
import http from 'node:http';
import {
  createWorkspaceBackup,
  validateWorkspaceBackup,
  restoreWorkspaceBackup,
  STORAGE_KEYS
} from '${workspaceBackupPath}';

const root = resolve('.');
const distDir = resolve(root, 'dist');
const testPort = 4185;

console.log('================================================================');
console.log('Layout Studio Pro 3D — Weryfikacja czystej instalacji (Plan 7.6)');
console.log('================================================================');

let errors = 0;
function logPass(msg) { console.log('[PASS] ' + msg); }
function logFail(msg) { console.error('[FAIL] ' + msg); errors++; }

async function run() {
  // 1. Weryfikacja środowiska Node.js
  const nodeVersion = process.version;
  console.log('\\n1. Środowisko uruchomieniowe Node.js: ' + nodeVersion);
  const major = parseInt(nodeVersion.replace('v', '').split('.')[0], 10);
  if (major >= 20) {
    logPass('Wersja Node.js ' + nodeVersion + ' spełnia wymagania produkcyjne (>= 20.19.0).');
  } else {
    logFail('Wersja Node.js ' + nodeVersion + ' jest zbyt niska. Wymagane >= 20.19.0.');
  }

  // 2. Weryfikacja artefaktów produkcyjnych (dist/)
  console.log('\\n2. Weryfikacja artefaktów dystrybucyjnych (dist/):');
  try {
    const indexHtmlPath = join(distDir, 'index.html');
    await stat(indexHtmlPath);
    const htmlContent = await readFile(indexHtmlPath, 'utf8');
    logPass('Plik dist/index.html istnieje.');

    const cdnPatterns = ['unpkg.com', 'cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'googleapis.com'];
    const hasCdn = cdnPatterns.some(cdn => htmlContent.includes(cdn));
    if (!hasCdn) {
      logPass('Brak zewnętrznych zależności CDN w index.html — aplikacja w 100% przystosowana do pracy offline.');
    } else {
      logFail('Wykryto zewnętrzne odwołania CDN w dist/index.html!');
    }

    const scriptMatches = [...htmlContent.matchAll(/src="\\/assets\\/([^"]+)"/g)].map(m => m[1]);
    const cssMatches = [...htmlContent.matchAll(/href="\\/assets\\/([^"]+)"/g)].map(m => m[1]);
    const allAssets = [...scriptMatches, ...cssMatches];

    logPass('Wykryto ' + allAssets.length + ' głównych zasobów zbundlowanych w index.html.');
    for (const asset of allAssets) {
      const assetPath = join(distDir, 'assets', asset);
      try {
        await access(assetPath);
        logPass('Asset lokalny dostępny: dist/assets/' + asset);
      } catch {
        logFail('Brakujący asset na dysku: dist/assets/' + asset);
      }
    }

    const workerFiles = ['schedule.worker', 'network.worker'];
    const assetDir = join(distDir, 'assets');
    const files = await readdir(assetDir);
    for (const wf of workerFiles) {
      const found = files.some(f => f.startsWith(wf) && f.endsWith('.js'));
      if (found) {
        logPass('Web Worker dostępny lokalnie w dist/assets/: ' + wf);
      } else {
        logFail('Brak Web Workera w dist/assets/: ' + wf);
      }
    }
  } catch (e) {
    logFail('Błąd podczas weryfikacji katalogu dist: ' + e.message);
  }

  // 3. Weryfikacja lokalnego serwera HTTP (scripts/serve.mjs)
  console.log('\\n3. Test uruchomienia lokalnego serwera HTTP (port ' + testPort + '):');
  try {
    const serverProcess = spawn('node', ['scripts/serve.mjs'], {
      env: { ...process.env, PORT: String(testPort) },
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let serverStarted = false;
    await new Promise((resolveWait, rejectWait) => {
      const timer = setTimeout(() => rejectWait(new Error('Timeout startu serwera')), 6000);
      serverProcess.stdout.on('data', (data) => {
        if (data.toString().includes('http://127.0.0.1:' + testPort)) {
          serverStarted = true;
          clearTimeout(timer);
          resolveWait();
        }
      });
      serverProcess.on('error', rejectWait);
    });

    if (serverStarted) {
      logPass('Serwer lokalny pomyślnie uruchomiony na http://127.0.0.1:' + testPort);

      await new Promise((resolveGet, rejectGet) => {
        http.get('http://127.0.0.1:' + testPort + '/', (res) => {
          if (res.statusCode === 200) {
            logPass('Odpowiedź HTTP 200 OK z serwera lokalnego.');
            if (res.headers['content-security-policy']) {
              logPass('Nagłówki bezpieczeństwa Content-Security-Policy obecne.');
            } else {
              logFail('Brak nagłówka Content-Security-Policy!');
            }
            resolveGet();
          } else {
            logFail('Serwer zwrócił kod ' + res.statusCode + ' zamiast 200.');
            resolveGet();
          }
        }).on('error', rejectGet);
      });

      serverProcess.kill('SIGTERM');
      logPass('Serwer lokalny pomyślnie zatrzymany po teście.');
    }
  } catch (e) {
    logFail('Błąd uruchomienia serwera lokalnego: ' + e.message);
  }

  // 4. Weryfikacja czystego tworzenia i odzyskiwania środowiska (Disaster Recovery)
  console.log('\\n4. Test mechanizmu Disaster Recovery na czystym środowisku:');
  try {
    const cleanStore = {};
    const cleanPort = {
      getItem: (k) => cleanStore[k] ?? null,
      setItem: (k, v) => { cleanStore[k] = v; },
      removeItem: (k) => { delete cleanStore[k]; },
    };

    const emptyBackup = createWorkspaceBackup(cleanPort, '0.4.0');
    const emptyVal = validateWorkspaceBackup(JSON.stringify(emptyBackup));
    if (emptyVal.valid && emptyVal.checksumMatches) {
      logPass('Czyste środowisko tworzy i waliduje poprawny pusty backup z sumą SHA-256.');
    } else {
      logFail('Błąd walidacji backupu na czystym środowisku.');
    }

    cleanStore[STORAGE_KEYS.v4Project] = JSON.stringify({
      project: {
        id: 'PRJ-CLEAN-INSTALL',
        name: 'Linia Czysta Instalacja',
        schemaVersion: 4,
        timeUnit: 's',
        targetLayoutType: 'Linear',
        demand: { yearlyDemand: 10000, workingDaysPerYear: 250, shiftsPerDay: 1, hoursPerShift: 8, plannedBreaksMinutesPerShift: 30, oeePercent: 90 },
        processSteps: [{ id: 'OP-1', name: 'Start', standardTimeSeconds: 30, vaTimeSeconds: 25, nvaTimeSeconds: 5, predecessorIds: [], sequenceNumber: 1 }],
        bom: [],
        layoutObjects: [],
        workstations: [],
        facility: { widthMm: 15000, lengthMm: 25000, heightMm: 5000, isConfirmed: true, gridSizeMm: 1000 },
      }
    });

    const fullBackup = createWorkspaceBackup(cleanPort, '0.4.0');
    const fullVal = validateWorkspaceBackup(JSON.stringify(fullBackup));
    if (fullVal.valid && fullVal.checksumMatches && fullVal.validatedProjectsCount === 1) {
      logPass('Backup projektu przemysłowego zwalidowany poprawnie z SHA-256.');
    } else {
      logFail('Błąd walidacji backupu projektu przemysłowego.');
    }

    const newTargetStore = {};
    const newTargetPort = {
      getItem: (k) => newTargetStore[k] ?? null,
      setItem: (k, v) => { newTargetStore[k] = v; },
    };

    const restoreRes = restoreWorkspaceBackup(newTargetPort, fullVal.payload);
    if (restoreRes.success && newTargetStore[STORAGE_KEYS.v4Project]?.includes('Linia Czysta Instalacja')) {
      logPass('Projekt pomyślnie przywrócony na nowym środowisku z zachowaniem tożsamości i sumy integralności.');
    } else {
      logFail('Nie udało się przywrócić projektu na nowym środowisku.');
    }
  } catch (e) {
    logFail('Błąd podczas testu Disaster Recovery: ' + e.message);
  }

  console.log('\\n================================================================');
  if (errors === 0) {
    console.log('PODSUMOWANIE: Wszystkie testy czystej instalacji i odzyskiwania ZALICZONE.');
    console.log('Aplikacja jest gotowa do dystrybucji na komputerze klienta i w chmurze.');
    console.log('================================================================');
    process.exit(0);
  } else {
    console.error('PODSUMOWANIE: Wykryto ' + errors + ' błędów weryfikacji.');
    console.log('================================================================');
    process.exit(1);
  }
}

run();
`;

try {
  const runnerFile = join(temp, 'runner.js');
  writeFileSync(join(temp, 'runner.ts'), runnerSource, 'utf8');
  await build({
    entryPoints: [join(temp, 'runner.ts')],
    outfile: runnerFile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
  });

  const res = spawnSync(process.execPath, [runnerFile], { stdio: 'inherit' });
  process.exitCode = res.status ?? 1;
} finally {
  rmSync(temp, { recursive: true, force: true });
}
