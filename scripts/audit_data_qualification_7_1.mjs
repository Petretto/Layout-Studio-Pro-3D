/**
 * Data Qualification & Portability Audit for Milestone 7.1
 * Verifies the clear separation between:
 * 1. Real measured production data (Eko benchmark with explicit gap registry)
 * 2. Synthetic demonstration packages (01_zestaw_montazowy, 02_wozek_warsztatowy, 03_modul_urzadzenia)
 * 3. Test fixtures and benchmarks (fixtures/ regression data)
 *
 * Checks dataOrigin, basis, manifests, checksums, and prefix isolation.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = resolve(process.cwd());

function sha256(filePath) {
  const buf = readFileSync(filePath);
  return createHash('sha256').update(buf).digest('hex');
}

const audit = {
  timestamp: new Date().toISOString(),
  milestone: '7.1',
  summary: {
    measuredDatasets: 1, // Eko
    syntheticDemoPackages: 3, // 01, 02, 03
    syntheticVisualConcepts: 10, // Blender concepts
    fixtureCategories: 3, // core, network, qa
  },
  checks: [],
};

function recordCheck(name, pass, details = {}) {
  audit.checks.push({ name, pass, details });
  if (!pass) {
    console.error(`FAIL: ${name}`, details);
    process.exitCode = 1;
  } else {
    console.log(`PASS: ${name}`);
  }
}

// 1. Audit Eko Measured Dataset & Gap Registry
const ekoAuditPath = join(ROOT, 'outputs/data_audit/eko_7_1d.json');
if (existsSync(ekoAuditPath)) {
  const ekoData = JSON.parse(readFileSync(ekoAuditPath, 'utf8'));
  const pass = (
    ekoData.process?.operations === 16 &&
    ekoData.process?.userConfirmedSourceValues === 12 &&
    ekoData.process?.syntheticTestValues === 4 &&
    ekoData.productionDataAccepted === false
  );
  recordCheck('Eko measured dataset & gap registry integrity (7.1d audit)', pass, {
    operations: ekoData.process?.operations,
    confirmedMeasured: ekoData.process?.userConfirmedSourceValues,
    assumedSynthetic: ekoData.process?.syntheticTestValues,
    productionDataAccepted: ekoData.productionDataAccepted,
  });
} else {
  recordCheck('Eko measured dataset & gap registry integrity', false, { error: 'Missing eko_7_1d.json' });
}

// 2. Audit Synthetic Demonstration Packages (01, 02, 03)
const DEMO_PACKAGES = [
  { id: '01_zestaw_montazowy', prefix: 'ZM-', expectedManifestFiles: 11, expectedOps: 3 },
  { id: '02_wozek_warsztatowy', prefix: 'WW-', expectedManifestFiles: 11, expectedOps: 4 },
  { id: '03_modul_urzadzenia', prefix: 'MU-', expectedManifestFiles: 11, expectedOps: 5 },
];

for (const pkg of DEMO_PACKAGES) {
  const dir = join(ROOT, 'przyklady', pkg.id);
  const manifestPath = join(dir, 'manifest.json');
  if (!existsSync(manifestPath)) {
    recordCheck(`Demo package ${pkg.id} manifest exists`, false);
    continue;
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const hasSyntheticOrigin = manifest.dataOrigin === 'synthetic';
  const fileCountPass = manifest.files && manifest.files.length === pkg.expectedManifestFiles;
  
  // Verify SHA-256 hashes of all manifest files
  let hashesPass = true;
  for (const f of manifest.files) {
    const fPath = join(dir, f.path);
    if (!existsSync(fPath) || sha256(fPath) !== f.sha256) {
      hashesPass = false;
      break;
    }
  }

  // Verify ID isolation in demo project
  const projectPath = join(dir, 'projekt-pokazowy.json');
  const projectJson = JSON.parse(readFileSync(projectPath, 'utf8'));
  const projectStr = JSON.stringify(projectJson);
  const otherPrefixes = DEMO_PACKAGES.filter(p => p.id !== pkg.id).map(p => p.prefix);
  const hasCrossPrefix = otherPrefixes.some(p => projectStr.includes(p));
  const hasEkoReference = /EKO|AUDIT-7|MOTOR|BATTERY/.test(projectStr);

  const draft = JSON.parse(projectJson.data?.draftRaw ?? '{}').project;
  const opsMatchPrefix = draft?.operations ? draft.operations.every(o => o.id.startsWith(pkg.prefix)) : true;
  const isVisualAssumption = draft?.layoutObjects ? draft.layoutObjects.every(o => o.isVisualAssumption) : true;

  const isolationPass = !hasCrossPrefix && !hasEkoReference && opsMatchPrefix && isVisualAssumption;

  recordCheck(`Demo package ${pkg.id} qualification and isolation`, hasSyntheticOrigin && fileCountPass && hashesPass && isolationPass, {
    dataOrigin: manifest.dataOrigin,
    filesCount: manifest.files?.length,
    hashesVerified: hashesPass,
    prefixIsolation: isolationPass,
  });
}

// 3. Audit Blender Visual Concepts (6.3)
const recipesPath = join(ROOT, 'tools/equipment-editor/concepts/recipes.json');
const verificationPath = join(ROOT, 'tools/equipment-editor/concepts/verification.json');
if (existsSync(recipesPath) && existsSync(verificationPath)) {
  const recipes = JSON.parse(readFileSync(recipesPath, 'utf8'));
  const verification = JSON.parse(readFileSync(verificationPath, 'utf8'));
  const allAssumed = recipes.basis === 'assumed' && verification.models.every(m => m.basis === 'assumed');
  const budgetPass = verification.models.every(m => m.triangles <= m.triangleBudget);
  const countPass = verification.models.length === 10;
  recordCheck('Equipment visual concepts qualification (10 models, assumed basis, budget <= 5000)', allAssumed && budgetPass && countPass, {
    modelsCount: verification.models.length,
    allAssumed,
    budgetPass,
  });
} else {
  recordCheck('Equipment visual concepts qualification', false);
}

// 4. Audit Clean Application Start (No hardcoded client project)
const demoCatalogPath = join(ROOT, 'public/demo-projects/index.json');
if (existsSync(demoCatalogPath)) {
  const catalog = JSON.parse(readFileSync(demoCatalogPath, 'utf8'));
  const catalogCountPass = Array.isArray(catalog.projects) && catalog.projects.length === 4;
  recordCheck('Demo catalog externalization and clean start separation', catalogCountPass, {
    catalogProjects: catalog.projects?.map(p => p.id),
  });
} else {
  recordCheck('Demo catalog externalization and clean start separation', false);
}

const allPassed = audit.checks.every(c => c.pass);
console.log(`\n--- DATA QUALIFICATION AUDIT 7.1: ${allPassed ? 'ALL PASS' : 'FAIL'} ---`);
