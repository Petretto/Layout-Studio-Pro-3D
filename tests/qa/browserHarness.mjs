import {spawn} from 'node:child_process';
import {existsSync,mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
export const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export async function withBrowser(run,{port=5301,cdp=9401}={}) {
  const edge=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
  if(!edge)throw new Error('Edge unavailable');
  const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:String(port)},stdio:'ignore',windowsHide:true});
  const browser=spawn(edge,[`--remote-debugging-port=${cdp}`,`--user-data-dir=${mkdtempSync(join(tmpdir(),'edge-remediation-'))}`,'--headless=new','--no-first-run','--disable-gpu','--window-size=1440,1000','--force-device-scale-factor=1','about:blank'],{stdio:'ignore',windowsHide:true});
  let ws;
  try {
    let target;
    for(let i=0;i<80;i++){try{target=(await(await fetch(`http://127.0.0.1:${cdp}/json/list`)).json()).find(t=>t.type==='page');if(target)break;}catch{}await sleep(100);}
    if(!target)throw new Error('CDP unavailable');
    ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
    let sequence=0;const pending=new Map(),errors=[],dialogs=[];
    ws.onmessage=event=>{const m=JSON.parse(event.data);
      if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);
      if(m.method==='Page.javascriptDialogOpening'){dialogs.push(m.params);ws.send(JSON.stringify({id:++sequence,method:'Page.handleJavaScriptDialog',params:{accept:true}}));}
      if(pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);}
    };
    const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout '+method));},15000);pending.set(id,{resolve:x=>{clearTimeout(timer);resolve(x)},reject:e=>{clearTimeout(timer);reject(e)}});ws.send(JSON.stringify({id,method,params}));});
    const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value;};
    const until=async expression=>{for(let i=0;i<120;i++){if(await evaluate(expression))return;await sleep(100);}throw new Error('Timeout '+expression);};
    const click=async selector=>{const point=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e||e.disabled)throw new Error('Missing/disabled '+${JSON.stringify(selector)});e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});await sleep(60);};
    const navigate=async()=>{await send('Page.navigate',{url:`http://127.0.0.1:${port}/`});await until(`!!document.querySelector('.studio')`);};
    const screenshot=async path=>writeFileSync(resolve(path),Buffer.from((await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));
    await send('Page.enable');await send('Runtime.enable');await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
    await navigate();await run({send,evaluate,until,click,navigate,screenshot,errors,dialogs});await send('Browser.close');
  } finally {ws?.close();if(browser.exitCode===null)browser.kill();if(server.exitCode===null)server.kill();}
}
