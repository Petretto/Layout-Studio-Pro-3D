"""Inspect one lockfile-pinned npm tarball without extracting or executing it."""
import base64
import hashlib
import io
import json
import sys
import tarfile
from pathlib import Path


def inspect_archive(data, entry):
    digest = 'sha512-' + base64.b64encode(hashlib.sha512(data).digest()).decode('ascii')
    if digest != entry.get('integrity'):
        raise ValueError('Suma archiwum nie odpowiada lockfile')
    bundle = entry.get('bundleDependencies', entry.get('bundledDependencies'))
    if bundle is True:
        bundle = list(entry.get('dependencies', {}))
    if not isinstance(bundle, list) or not bundle or len(bundle) != len(set(bundle)):
        raise ValueError('Brak jednoznacznej listy pakietów dołączonych')
    results = []
    with tarfile.open(fileobj=io.BytesIO(data), mode='r:gz') as tar:
        members = tar.getmembers()
        if len(members) > 10000:
            raise ValueError('Zbyt wiele wpisów archiwum')
        names = [m.name for m in members]
        if len(names) != len(set(names)):
            raise ValueError('Powtórzona ścieżka w archiwum')
        by_name = {m.name: m for m in members}
        for name in sorted(bundle):
            if not isinstance(name, str) or not name or any(x in name.split('/') for x in ('', '.', '..')):
                raise ValueError('Niepoprawna nazwa pakietu')
            prefix = 'package/node_modules/' + name + '/'
            path = prefix + 'package.json'
            member = by_name.get(path)
            if not member or not member.isfile() or member.size > 1024 * 1024:
                raise ValueError('Brak poprawnych metadanych ' + name)
            meta = json.load(tar.extractfile(member))
            if meta.get('name') != name or not isinstance(meta.get('version'), str) or not isinstance(meta.get('license'), str):
                raise ValueError('Niepełne metadane pakietu ' + name)
            files = [m.name for m in members if m.isfile() and m.name.startswith(prefix)
                     and '/' not in m.name[len(prefix):]
                     and m.name[len(prefix):].lower().startswith(('license', 'licence', 'notice', 'copyright'))]
            results.append({'name': name, 'version': meta['version'], 'declaredLicense': meta['license'],
                            'licenseAndNoticeFiles': sorted(files),
                            'licenseFilePresent': any(Path(p).name.lower().startswith(('license', 'licence')) for p in files)})
    return {'archiveIntegrityMatches': True, 'bundledPackages': results,
            'limits': ['Metadata and file presence only; license contents, transitive embedded code and legal obligations require review.']}


def main():
    if len(sys.argv) != 4:
        raise SystemExit('Użycie: python scripts/inspect_bundled_licenses.py <lockfile> <klucz-pakietu> <archiwum.tgz>')
    lock = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
    entry = lock['packages'][sys.argv[2]]
    print(json.dumps(inspect_archive(Path(sys.argv[3]).read_bytes(), entry), ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
