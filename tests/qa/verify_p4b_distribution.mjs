import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';
import {setTimeout as delay} from 'node:timers/promises';

const port=5568;
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:String(port)},stdio:'ignore',windowsHide:true});
const base=`http://127.0.0.1:${port}`;
try{
  let response;
  for(let attempt=0;attempt<80;attempt++){
    try{response=await fetch(base+'/demo-projects/index.json');break;}catch{await delay(100);}
  }
  assert.ok(response,'Lokalny serwer wystartował');
  assert.equal(response.status,200);
  const index=await response.json();
  assert.deepEqual(index.projects.map(item=>item.id),['01_zestaw_montazowy','02_wozek_warsztatowy','03_modul_urzadzenia']);
  for(const item of index.projects){
    for(const [path,expected] of [[item.packagePath,item.packageSha256],[item.archivePath,item.archiveSha256]]){
      const file=await fetch(base+'/demo-projects/'+path);
      assert.equal(file.status,200,path);
      const hash=createHash('sha256').update(Buffer.from(await file.arrayBuffer())).digest('hex');
      assert.equal(hash,expected,path);
    }
  }
  const source=readFileSync('przyklady/04_eko/projekt-pokazowy.json');
  for(const path of ['/demo-projects/04_eko.project.json','/demo-projects/04_eko.zip']){
    const file=await fetch(base+path);
    const bytes=Buffer.from(await file.arrayBuffer());
    assert.equal(file.status,404,path);
    assert.notEqual(file.headers.get('content-type'),'application/json',path);
    assert.notDeepEqual(bytes,source,path);
  }
  console.log('PASS P4b local HTTP: three verified packages; old Eko URLs return 404');
}finally{server.kill();}
