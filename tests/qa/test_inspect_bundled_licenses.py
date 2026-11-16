import base64
import hashlib
import io
import json
import tarfile
import unittest
from scripts.inspect_bundled_licenses import inspect_archive


def fixture(license_file=True, duplicate=False):
    out = io.BytesIO()
    with tarfile.open(fileobj=out, mode='w:gz') as tar:
        def add(name, content):
            data = content.encode(); info = tarfile.TarInfo(name); info.size = len(data); tar.addfile(info, io.BytesIO(data))
        path = 'package/node_modules/@scope/test/'
        meta = json.dumps({'name':'@scope/test','version':'1.0.0','license':'MIT'})
        add(path + 'package.json', meta)
        if duplicate: add(path + 'package.json', meta)
        if license_file: add(path + 'LICENSE', 'license text')
    data = out.getvalue()
    entry = {'bundleDependencies':['@scope/test'], 'integrity':'sha512-'+base64.b64encode(hashlib.sha512(data).digest()).decode()}
    return data, entry


class TestArchive(unittest.TestCase):
    def test_detects_license_and_scoped_identity(self):
        data, entry = fixture()
        result = inspect_archive(data, entry)
        self.assertEqual(result['bundledPackages'][0]['name'], '@scope/test')
        self.assertTrue(result['bundledPackages'][0]['licenseFilePresent'])

    def test_absence_is_explicit_and_checksum_mismatch_rejected(self):
        data, entry = fixture(False)
        self.assertFalse(inspect_archive(data, entry)['bundledPackages'][0]['licenseFilePresent'])
        entry['integrity'] = 'sha512-wrong'
        with self.assertRaises(ValueError): inspect_archive(data, entry)

    def test_duplicate_and_invalid_package_rejected(self):
        data, entry = fixture(duplicate=True)
        with self.assertRaises(ValueError): inspect_archive(data, entry)
        data, entry = fixture(); entry['bundleDependencies'] = ['../escape']
        with self.assertRaises(ValueError): inspect_archive(data, entry)


if __name__ == '__main__': unittest.main()
