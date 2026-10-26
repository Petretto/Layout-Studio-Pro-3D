import {readFileSync,existsSync,readdirSync,statSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const moved=JSON.parse(readFileSync(join(root,'docs/relocations.json'),'utf8'));
const errors=[];
for(const [old,destination] of Object.entries(moved)){
  if(existsSync(join(root,old)))errors.push(`Plik wrócił do katalogu głównego: ${old}`);
  if(!existsSync(join(root,destination)))errors.push(`Brak przeniesionego pliku: ${destination}`);
}
for(const name of readdirSync(root))if(statSync(join(root,name)).isFile()&&(
  name.endsWith('.md')&&!['README.md','AGENTS.md','PLAN_ROZWOJU.md'].includes(name)||
  /^(MODEL_|WERYFIKACJA_|RAPORT_|ZMIANY_|DANE_|SCENARIUSZE_|STANDARD_|PARAMETRYCZNE_)/.test(name)
))errors.push(`Dokument poza docs/: ${name}`);
const files=['README.md','AGENTS.md','PLAN_ROZWOJU.md',...readdirSync(join(root,'docs'),{recursive:true}).filter(name=>name.endsWith('.md')).map(name=>'docs/'+name)];
let links=0;
for(const file of files){
  const text=readFileSync(join(root,file),'utf8');
  for(const match of text.matchAll(/!?\[[^\]\n]*\]\((<[^>\n]+>|[^)\n]+)\)/g)){
    const target=match[1].replace(/^<|>$/g,'');
    if(!target||/^(#|https?:|mailto:|data:|codex:|plugin:)/.test(target))continue;
    const path=decodeURIComponent(target.split('#')[0]);
    if(!path)continue;
    links++;
    if(!existsSync(resolve(root,dirname(file),path)))errors.push(`${file}: brak celu ${target}`);
  }
}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
else console.log(`PASS: ${Object.keys(moved).length} przeniesionych plików, ${files.length} dokumentów, ${links} lokalnych odnośników; katalog główny bez modeli i raportów.`);
