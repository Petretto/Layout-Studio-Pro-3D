import {readFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import './plan-parser.js';
export const sources = [
  ['main','PLAN_ROZWOJU.md'],
  ['plan','docs/plany/PLAN_REMEDIACJI_PO_AUDYCIE_RC1.md'],
  ['architecture','docs/plany/ARCHITEKTURA_INTEGRACJI_MODELI_V1.md'],
  ['scope','docs/plany/ZAKRES_WYDANIA_V1_0_0.md'],
  ['matrix','docs/plany/MACIERZ_AUDYT_REMEDIACJA.md'],
  ['tests','docs/plany/PLAN_TESTOW_RC2.md']
].map(([key,path])=>({key,path,url:new URL('../'+path,import.meta.url)}));
export function readSources() {
  const text={},files=[],signature=createHash('sha256');
  for(const source of sources) {
    try {
      const content=readFileSync(source.url,'utf8'),stat=statSync(source.url);
      text[source.key]=content;
      files.push({key:source.key,path:source.path,available:true,modified:stat.mtime.toISOString()});
      signature.update(source.path).update(content);
    } catch(error) {
      files.push({key:source.key,path:source.path,available:false});
      signature.update(source.path).update('missing');
      if(source.key==='main')throw new Error('Nie można odczytać PLAN_ROZWOJU.md.');
    }
  }
  return {text,files,signature:signature.digest('hex')};
}
export function readDashboard() {
  const input=readSources();
  return {...globalThis.ProgressDashboard.parsePlan(input.text.main),
    remediation:globalThis.ProgressDashboard.parseRemediation(input.text),sources:input.files,signature:input.signature};
}
