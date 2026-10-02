import { readdirSync, statSync, copyFileSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { createHash } from 'node:crypto';

const backupDir = process.argv[2];
if (!backupDir) {
  console.error('Usage: node scripts/make_backup.mjs <backupDir>');
  process.exit(1);
}

const root = process.cwd();
const targetDir = join(root, backupDir);
mkdirSync(targetDir, { recursive: true });

const excludeRegex = /[\\/](node_modules|dist|backup|outputs|\.git)[\\/]/;

function getAllFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (excludeRegex.test(full + '/')) continue;
    if (entry.isDirectory()) {
      files.push(...getAllFiles(full));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

const allFiles = getAllFiles(root);
const shaLines = [];

for (const file of allFiles) {
  const rel = relative(root, file);
  const dest = join(targetDir, rel);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(file, dest);
  const buf = statSync(file);
  const hash = createHash('sha256').update(readFileSync(file)).digest('hex').toUpperCase();
  shaLines.push(`${hash}  ${rel.replace(/\\/g, '/')}`);
}

writeFileSync(join(targetDir, 'SHA256.txt'), shaLines.join('\n') + '\n');
console.log(`Backed up ${allFiles.length} files to ${backupDir} with SHA256 verification.`);
