"""Verify distributable ZIPs with Python's independent ZIP reader (CRC included)."""
import hashlib
import json
import unittest
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / 'public/demo-projects'

class DemoDistribution(unittest.TestCase):
    def test_catalog_covers_external_projects(self):
        source = json.loads((ROOT / 'przyklady/katalog.json').read_text(encoding='utf-8'))
        catalog = json.loads((DIST / 'index.json').read_text(encoding='utf-8'))
        self.assertEqual(catalog['formatVersion'], 1)
        self.assertEqual([p['id'] for p in catalog['projects']], [p['directory'] for p in source['projects']])

    def test_archives_are_complete_and_unmodified(self):
        catalog = json.loads((DIST / 'index.json').read_text(encoding='utf-8'))
        for project in catalog['projects']:
            with self.subTest(project=project['id']):
                directory = ROOT / 'przyklady' / project['id']
                originals = {f"{project['id']}/{p.relative_to(directory).as_posix()}": p.read_bytes() for p in directory.rglob('*') if p.is_file()}
                with zipfile.ZipFile(DIST / project['archivePath']) as archive:
                    self.assertIsNone(archive.testzip())
                    self.assertEqual(set(archive.namelist()), set(originals))
                    self.assertEqual(len(archive.namelist()), len(originals))
                    for name, original in originals.items():
                        self.assertEqual(archive.read(name), original)
                self.assertEqual(project['fileCount'], len(originals))
                manifest = json.loads((directory / 'manifest.json').read_text(encoding='utf-8'))
                standalone = (DIST / project['packagePath']).read_bytes()
                self.assertEqual(standalone, (directory / manifest['entryFile']).read_bytes())
                self.assertEqual(hashlib.sha256(standalone).hexdigest(), project['packageSha256'])
                self.assertEqual(hashlib.sha256((DIST / project['archivePath']).read_bytes()).hexdigest(), project['archiveSha256'])
                for entry in manifest['files']:
                    data = (directory / entry['path']).read_bytes()
                    self.assertEqual(hashlib.sha256(data).hexdigest(), entry['sha256'].lower())
                    self.assertEqual(len(data), entry['bytes'])

    def test_entrypoints_are_project_packages_not_archives(self):
        catalog = json.loads((DIST / 'index.json').read_text(encoding='utf-8'))
        for project in catalog['projects']:
            package = json.loads((DIST / project['packagePath']).read_text(encoding='utf-8'))
            self.assertEqual(package['format'], 'layout-studio-project-package')
            self.assertEqual(package['formatVersion'], 1)

if __name__ == '__main__':
    unittest.main()
