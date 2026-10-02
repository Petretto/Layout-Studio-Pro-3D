// Optional, loopback-only diagnostic fixture; not part of the production build.
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
const page=readFileSync(new URL('../tests/download-probe.html',import.meta.url));
const server=createServer((req,res)=>{
  if(req.url==='/probe.json'){
    res.writeHead(200,{'Content-Type':'application/json','Content-Disposition':'attachment; filename="probe-http.json"','Cache-Control':'no-store'});
    res.end(JSON.stringify({test:'download-probe',value:42}));
  }else if(req.url==='/'){
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
    res.end(page);
  }else{res.writeHead(404);res.end();}
});
server.listen(4194,'127.0.0.1',()=>console.log('Diagnostyka: http://127.0.0.1:4194/'));
