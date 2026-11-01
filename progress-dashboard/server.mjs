import {createServer} from 'node:http';
import {readFileSync,watch} from 'node:fs';
import {exec} from 'node:child_process';
import {sources,readSources,readDashboard} from './sources.mjs';
import {updateSnapshot} from './update-data.mjs';
const port=Number(process.env.PORT||5180);
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const staticFiles=new Map([
  ['/', ['index.html','text/html; charset=utf-8']],
  ['/index.html',['index.html','text/html; charset=utf-8']],
  ['/plan-parser.js',['plan-parser.js','text/javascript; charset=utf-8']],
  ['/remediation-ui.js',['remediation-ui.js','text/javascript; charset=utf-8']],
  ['/data.js',['data.js','text/javascript; charset=utf-8']]
]);
function refreshSnapshot() {
  try {updateSnapshot();}catch(error){console.error('Nie odświeżono snapshotu:',error.message);}
}
refreshSnapshot();
let pending;
for(const directory of new Set(sources.map(source=>new URL('./',source.url).href))) {
  watch(new URL(directory),()=>{clearTimeout(pending);pending=setTimeout(refreshSnapshot,150);});
}
const server=createServer((req,res)=>{
  const send=(status,type,body)=>{res.writeHead(status,{...headers,'Content-Type':type});res.end(req.method==='HEAD'?undefined:body);};
  try {
    if(!['GET','HEAD'].includes(req.method))return send(405,'text/plain','Method not allowed');
    const path=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
    if(path==='/api/dashboard')return send(200,'application/json; charset=utf-8',JSON.stringify(readDashboard()));
    if(path==='/api/status')return send(200,'application/json; charset=utf-8',JSON.stringify({signature:readSources().signature}));
    if(path==='/api/plan') {
      const input=readSources();
      return send(200,'application/json; charset=utf-8',JSON.stringify({text:input.text.main,signature:input.signature}));
    }
    const document=sources.find(source=>path==='/documents/'+source.path.split('/').pop()||path==='/'+source.path);
    if(document)return send(200,'text/plain; charset=utf-8',readFileSync(document.url));
    const asset=staticFiles.get(path);
    if(asset)return send(200,asset[1],readFileSync(new URL(asset[0],import.meta.url)));
    return send(404,'text/plain; charset=utf-8','Nie znaleziono pliku.');
  } catch(error) {send(500,'application/json; charset=utf-8',JSON.stringify({error:error.message}));}
});
server.listen(port,'127.0.0.1',()=>{
  const url=`http://127.0.0.1:${server.address().port}`;
  console.log(`Pulpit postępu: ${url}\nLIVE: plan główny i pięć dokumentów remediacji. Ctrl+C kończy serwer.`);
  if(process.env.DASHBOARD_NO_OPEN!=='1') {
    const command=process.platform==='win32'?`start ${url}`:process.platform==='darwin'?`open ${url}`:`xdg-open ${url}`;
    exec(command,()=>{});
  }
});
