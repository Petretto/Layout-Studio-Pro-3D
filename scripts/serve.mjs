import { createServer } from 'node:http';
import { readFile,stat } from 'node:fs/promises';
import { resolve,extname,sep } from 'node:path';
const root=resolve('dist'),port=Number(process.env.PORT??4173);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
try{await stat(resolve(root,'index.html'));}catch{console.error('Brak dist. Wykonaj npm run build.');process.exit(1);}
const server=createServer(async(req,res)=>{
  const headers={'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cache-Control':'no-cache','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"};
  if(!['GET','HEAD'].includes(req.method??'')){res.writeHead(405,headers);res.end();return;}
  try{const url=new URL(req.url??'/','http://localhost'),pathname=decodeURIComponent(url.pathname);const target=resolve(root,pathname==='/'?'index.html':'.'+pathname);if(!target.startsWith(root+sep)){res.writeHead(403,headers);res.end('Forbidden');return;}const data=await readFile(target);res.writeHead(200,{...headers,'Content-Type':mime[extname(target)]??'application/octet-stream'});res.end(req.method==='HEAD'?undefined:data);}catch{res.writeHead(404,headers);res.end('Not found');}
});
server.on('error',e=>{console.error(`Nie można uruchomić portu ${port}: ${e.message}`);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`Layout Studio: http://127.0.0.1:${port} (Ctrl+C kończy serwer)`));
