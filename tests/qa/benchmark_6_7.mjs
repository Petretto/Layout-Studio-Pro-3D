import {spawn} from 'node:child_process';
import {existsSync,mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ok} from 'node:assert';

// Production build, actual Scene, isolated browser storage. No production instrumentation.
const port=5267,cdp=9407,sleep=ms=>new Promise(r=>setTimeout(r,ms));
const uiOnly=process.argv.includes('--ui-only');
const edge=['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync);
if(!edge)throw new Error('Brak Edge');
const flags=['--headless=new','--no-first-run','--disable-background-timer-throttling','--disable-renderer-backgrounding'];
const server=spawn('node',['scripts/serve.mjs'],{env:{...process.env,PORT:String(port)},stdio:'ignore',windowsHide:true});
const browser=spawn(edge,[`--remote-debugging-port=${cdp}`,`--user-data-dir=${mkdtempSync(join(tmpdir(),'layout-benchmark-6-7-'))}`,...flags,'about:blank'],{stdio:'ignore',windowsHide:true});
let ws;
try{
  let target;
  for(let i=0;i<60;i++){
    try{target=(await(await fetch(`http://127.0.0.1:${cdp}/json/list`,{signal:AbortSignal.timeout(1000)})).json()).find(t=>t.type==='page');if(target)break;}catch{}
    await sleep(200);
  }
  if(!target)throw new Error('Brak CDP');
  ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  let id=0;const pending=new Map(),errors=[];
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);if(pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);}};
  const send=(method,params={})=>new Promise((resolve,reject)=>{
    const next=++id,timer=setTimeout(()=>{pending.delete(next);reject(new Error('Timeout '+method));},45000);
    pending.set(next,{resolve:r=>{clearTimeout(timer);resolve(r);},reject:e=>{clearTimeout(timer);reject(e);}});ws.send(JSON.stringify({id:next,method,params}));
  });
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value;};
  const until=async expression=>{for(let i=0;i<100;i++){if(await evaluate(expression))return;await sleep(150);}throw new Error('Timeout '+expression);};
  const click=async text=>{await evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)});if(!b||b.disabled)throw new Error('Missing '+${JSON.stringify(text)});b.click()})()`);};
  const navigate=async text=>{await evaluate(`[...document.querySelectorAll('.studio-nav button')].find(b=>b.textContent.includes(${JSON.stringify(text)})).click()`);};
  const saved=()=>evaluate(`JSON.parse(localStorage.getItem('layout-studio-v3')).project`);
  const out='outputs/qa/benchmark_6_7';mkdirSync(out,{recursive:true});
  const screenshot=async name=>writeFileSync(`${out}/${name}.png`,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));

  await send('Runtime.enable');await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1050,deviceScaleFactor:1,mobile:false});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`(()=>{
    const q=window.qaPerf={contexts:[],frames:[],record:false,lost:0};
    const original=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(...args){
      const gl=original.apply(this,args);
      if(gl&&String(args[0]).startsWith('webgl')&&!q.contexts.some(c=>c.gl===gl)){
        const info=gl.getExtension('WEBGL_debug_renderer_info');
        const context={gl,calls:0,triangles:0,renderer:info?gl.getParameter(info.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),version:gl.getParameter(gl.VERSION)};
        q.contexts.push(context);this.addEventListener('webglcontextlost',()=>q.lost++);
        for(const name of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced']){
          if(!gl[name])continue;
          const draw=gl[name].bind(gl);
          gl[name]=(...values)=>{
            if(gl.canvas.closest('.scene')){
              context.calls++;
              const n=values[name.startsWith('drawElements')?1:2],instances=name.endsWith('Instanced')?values[name==='drawElementsInstanced'?4:3]:1;
              if(values[0]===gl.TRIANGLES)context.triangles+=n/3*instances;
            }
            return draw(...values);
          };
        }
      }
      return gl;
    };
    const raf=window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame=callback=>raf(time=>{q.rafCount=(q.rafCount||0)+1;
      const calls=q.contexts.reduce((s,c)=>s+c.calls,0),triangles=q.contexts.reduce((s,c)=>s+c.triangles,0),start=performance.now();
      callback(time);
      const count=q.contexts.reduce((s,c)=>s+c.calls,0)-calls;
      if(q.record&&count>0)q.frames.push({time,cpuMs:performance.now()-start,calls:count,triangles:q.contexts.reduce((s,c)=>s+c.triangles,0)-triangles});
    });
  })()`});
  await send('Page.navigate',{url:`http://127.0.0.1:${port}/`});await until(`!!document.querySelector('.studio-nav')`);
  await navigate('5 Hala');await until(`!!document.querySelector('[data-object-id]')`);
  // Materialize the existing auto layout through a normal editor action.
  await evaluate(`(()=>{const e=document.querySelector('[data-object-id]');e.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));})()`);await sleep(150);
  await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}))`);await sleep(150);
  await click('Zapisz lokalnie');const baseline=await saved();ok(baseline.layoutObjects.length>0);
  const report={at:new Date().toISOString(),browser:await send('Browser.getVersion'),flags,viewport:{width:1440,height:1050,dpr:1},method:'Scene RAF callbacks with actual WebGL draw counters; 1s warmup + 2.5s sample; ABBA order, no animation; diagnostic instrumentation overhead included',synthetic:true,measurements:[],errors};
  for(const count of (uiOnly?[300]:[100,300])){
    const fixture=structuredClone(baseline);fixture.timeUnit??='s';fixture.name=`SYNTHETIC visual benchmark ${count}`;fixture.facility={...fixture.facility,widthMm:100000,lengthMm:100000};fixture.layoutMode='manual';
    fixture.layoutObjects=fixture.layoutObjects.map((o,i)=>({...o,xMm:(i%20)*3500+1000,yMm:1000+Math.floor(i/20)*3500}));
    const baseCount=fixture.layoutObjects.length;
    for(let i=baseCount;i<count;i++)fixture.layoutObjects.push({id:`qa-visual-${i}`,name:`SYNTHETIC geometry ${i}`,type:['FlowRackFIFO3Tier','RollerConveyorMotorized','PalletEuroFloorMark'][i%3],xMm:(i%20)*3500+1000,yMm:1000+Math.floor(i/20)*3500,zMm:0,widthMm:1200,lengthMm:1800,heightMm:1600,rotationDeg:0,colorHex:'#38bdf8',isVisualAssumption:true,...(i%8===0?{visualModelId:'concept-shelf-cart'}:{})});
    // No extra station/worker/resource assignments; fixture dimensions are load-test assumptions.
    await evaluate(`localStorage.setItem('layout-studio-v3',JSON.stringify({project:${JSON.stringify(fixture)},at:new Date().toISOString(),importSourceBase64:''}))`);
    await send('Page.reload');await until(`document.querySelector('[aria-label="Nazwa projektu"]')?.value===${JSON.stringify(fixture.name)}`);await navigate('6 3D');await until(`!!document.querySelector('.scene canvas')`);await sleep(900);
    for(const [run,mode] of (uiOnly?[]:['detailed','simplified','simplified','detailed']).entries()){
      const active=await evaluate(`!![...document.querySelectorAll('button')].find(b=>b.textContent.includes('Tryb uproszczony: WŁ'))`);
      if(active!==(mode==='simplified'))await click(active?'⚡ Tryb uproszczony: WŁ':'Tryb uproszczony (LOD)');
      await sleep(1000);
      await evaluate(`window.qaPerf.frames=[];window.qaPerf.record=true`);await sleep(2500);
      const sample=await evaluate(`(()=>{const q=window.qaPerf;q.record=false;const frames=q.frames;const latest=q.contexts.filter(c=>c.gl.canvas.isConnected).at(-1);return {frames,renderer:latest?.renderer,version:latest?.version,lost:q.lost,canvas:{width:latest?.gl.canvas.width,height:latest?.gl.canvas.height}}})()`);
      if(sample.frames.length<5){await screenshot('incomplete');console.log('Incomplete sample',JSON.stringify({...sample,errors,contexts:await evaluate('window.qaPerf.contexts.map(c=>({renderer:c.renderer,calls:c.calls,connected:c.gl.canvas.isConnected,html:c.gl.canvas.outerHTML,draw:String(c.gl.drawElements).slice(0,70),rafCount:window.qaPerf.rafCount}))')}));}
      ok(sample.frames.length>=5,`Insufficient frames ${count}/${mode}`);ok(sample.lost===0,'WebGL context lost');
      const stats=values=>{const a=values.toSorted((a,b)=>a-b);return {median:a[Math.floor(a.length*.5)],p95:a[Math.min(a.length-1,Math.floor(a.length*.95))]};};
      const intervals=sample.frames.slice(1).map((f,i)=>f.time-sample.frames[i].time);
      const measurement={objects:count,run,mode,renderer:sample.renderer,version:sample.version,canvas:sample.canvas,frames:sample.frames.length,intervalMs:stats(intervals),callbackCpuMs:stats(sample.frames.map(f=>f.cpuMs)),drawCalls:stats(sample.frames.map(f=>f.calls)),triangles:stats(sample.frames.map(f=>f.triangles)),observedFps:1000/(intervals.reduce((s,n)=>s+n,0)/intervals.length)};
      report.measurements.push(measurement);console.log(JSON.stringify(measurement));writeFileSync(`${out}/report.partial.json`,JSON.stringify(report,null,2));
      if(run<2)await screenshot(`${count}_${mode}`);
      // View-only actions must not mutate the complete saved fixture.
      ok(JSON.stringify(await saved())===JSON.stringify(fixture),'Complete saved fixture changed');
    }
    if(!uiOnly){
      const detailed=report.measurements.find(m=>m.objects===count&&m.mode==='detailed'),simple=report.measurements.find(m=>m.objects===count&&m.mode==='simplified');
      ok(simple.drawCalls.median<detailed.drawCalls.median*.5,'LOD should halve actual draw calls');
      ok(simple.triangles.median<detailed.triangles.median*.5,'LOD should halve actual triangles');
    }
    if(count===300){
      await click('Tryb uproszczony (LOD)');await sleep(400);
      await click('Wybierz wyposażenie z listy');await until(`!!document.querySelector('form select')`);
      await evaluate(`(()=>{const e=[...document.querySelectorAll('select')].find(e=>e.options.length===300);e.value='qa-visual-296';e.dispatchEvent(new Event('change',{bubbles:true}));})()`);await sleep(400);
      await click('Zbliż na wybrany obiekt');await sleep(300);
      await evaluate(`document.querySelector('.scene').scrollIntoView({block:'center'})`);await screenshot('300_focused_lod');
      await click('Ukryj w 3D (H)');await sleep(300);await click('Pokaż ukryte w 3D (1)');await sleep(300);
      await click('Dopasuj halę 3D');await sleep(300);await screenshot('300_refit_lod');
      ok(JSON.stringify(await saved())===JSON.stringify(fixture),'Selection, focus and visibility must not alter saved fixture');
      report.largeSceneUi='PASS: list selection, focus, hide/reveal, refit, unchanged project';
    }
  }
  ok(!errors.length,errors.join('; '));writeFileSync(`${out}/${uiOnly?'ui_report':'report'}.json`,JSON.stringify(report,null,2));
  console.log(uiOnly?'PASS 6.7b: 300-object UI selection/focus/hide/reveal/refit, unchanged project.':'PASS 6.7b: 100/300 objects, ABBA, real WebGL counters/frame timings, LOD reduction >50%, project unchanged, no runtime/context errors.');
}finally{ws?.close();browser.kill();server.kill();}
