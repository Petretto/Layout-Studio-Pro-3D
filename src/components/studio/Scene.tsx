import React,{useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ProjectData, LayoutObject } from '../../core/models/types';
import { OperationRun } from '../../core/algorithms/networkSimulation';
import { layoutRoutes } from '../../core/algorithms/routing';
import { NumberField } from './Fields';
export function Scene({project:p,change,activeRuns,readOnly=false}:{project:ProjectData;change:(p:ProjectData)=>void;activeRuns:OperationRun[];readOnly?:boolean}){
  const host=useRef<HTMLDivElement>(null),fit=useRef<()=>void>(()=>{}),[error,setError]=useState(''),[spaghetti,setSpaghetti]=useState(true);
  const [editing,setEditing]=useState(false),[snap,setSnap]=useState(true),[draft,setDraft]=useState<LayoutObject|null>(null);
  const activity=useRef(activeRuns);activity.current=activeRuns;
  const topView=useRef<()=>void>(()=>{}),focusObject=useRef<(id:string)=>void>(()=>{});
  const pose=useRef<{position:THREE.Vector3;target:THREE.Vector3}|null>(null),commit=useRef(change);commit.current=change;
  // Project history is authoritative. Never let an open form reapply geometry
  // that was undone, or keep editing an object removed from the layout.
  useEffect(()=>{
    setDraft(current=>{
      if(!current)return null;
      const saved=p.layoutObjects.find(o=>o.id===current.id);
      return saved?{...saved}:null;
    });
  },[p.layoutObjects]);
  useEffect(()=>{
    const dom=host.current!;let renderer:THREE.WebGLRenderer;
    try{renderer=new THREE.WebGLRenderer({antialias:true});}catch{setError('WebGL jest niedostępny. Użyj rzutu CAD 2D lub włącz akcelerację sprzętową w przeglądarce.');return;}
    setError('');renderer.setPixelRatio(Math.min(devicePixelRatio,2));dom.appendChild(renderer.domElement);
    const scene=new THREE.Scene();scene.background=new THREE.Color('#0b1220');
    const camera=new THREE.PerspectiveCamera(45,1,.05,5000),controls=new OrbitControls(camera,renderer.domElement);
    // Editing reserves the left button for equipment, including empty-space clicks.
    // Keep the camera above the floor and away from a zero-distance orbit.
    controls.enableDamping=readOnly||!editing;controls.enableRotate=readOnly||!editing;
    controls.minDistance=.5;controls.maxDistance=1500;controls.maxPolarAngle=Math.PI/2-.01;
    scene.add(new THREE.HemisphereLight(0xffffff,0x334155,2));const sun=new THREE.DirectionalLight(0xffffff,2);sun.position.set(15,30,10);scene.add(sun);
    const width=p.facility.widthMm/1000,length=p.facility.lengthMm/1000;
    const floor=new THREE.Mesh(new THREE.BoxGeometry(width,.05,length),new THREE.MeshStandardMaterial({color:'#172033'}));floor.position.set(width/2,-.04,length/2);scene.add(floor);
    const grid=new THREE.GridHelper(Math.max(width,length),Math.min(500,Math.max(1,Math.round(Math.max(width,length)/(p.facility.gridSizeMm/1000)))));grid.position.set(width/2,0,length/2);scene.add(grid);
    const groups:THREE.Group[]=[];
    p.layoutObjects.forEach(o=>{const group=new THREE.Group();group.userData.id=o.id;groups.push(group);group.position.set((o.xMm+o.widthMm/2)/1000,o.zMm/1000,(o.yMm+o.lengthMm/2)/1000);group.rotation.y=-o.rotationDeg*Math.PI/180;
      const w=o.widthMm/1000,l=o.lengthMm/1000,h=o.heightMm/1000;
      const box=(ww:number,hh:number,ll:number,x:number,y:number,z:number,color:string)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(ww,hh,ll),new THREE.MeshStandardMaterial({color}));m.position.set(x,y,z);group.add(m);};
      if(o.type.includes('Table')){box(w,.08,l,0,h,0,o.colorHex);for(const x of [-1,1])for(const z of [-1,1])box(.07,h,.07,x*(w/2-.08),h/2,z*(l/2-.08),'#94a3b8');}
      else if(o.type.includes('FIFO')){for(const y of [.25,.6,.95])box(w,.05,l,0,h*y,0,o.colorHex);for(const x of [-1,1])for(const z of [-1,1])box(.06,h,.06,x*(w/2-.05),h/2,z*(l/2-.05),'#94a3b8');}
      else box(w,h,l,0,h/2,0,o.colorHex);scene.add(group);
    });
    const markers=p.layoutObjects.filter(o=>o.type.includes('Table')).map(o=>{const marker=new THREE.Mesh(new THREE.SphereGeometry(.25,12,8),new THREE.MeshStandardMaterial({color:'#22c55e',emissive:'#16a34a',emissiveIntensity:1}));marker.position.set((o.xMm+o.widthMm/2)/1000,(o.zMm+o.heightMm)/1000+.4,(o.yMm+o.lengthMm/2)/1000);marker.visible=false;scene.add(marker);const peers=p.layoutObjects.filter(x=>x.type.includes('Table')&&x.workstationId===o.workstationId);return {marker,station:o.workstationId,copy:peers.indexOf(o)+1};});
    p.obstacles.forEach(o=>{const m=new THREE.Mesh(new THREE.BoxGeometry(o.widthMm/1000,o.heightMm/1000,o.lengthMm/1000),new THREE.MeshStandardMaterial({color:'#ef4444',transparent:true,opacity:.7}));m.position.set((o.xMm+o.widthMm/2)/1000,o.heightMm/2000,(o.yMm+o.lengthMm/2)/1000);scene.add(m);});
    if(spaghetti)for(const {a,b} of layoutRoutes(p)){const points=[a,b].map(o=>new THREE.Vector3((o.xMm+o.widthMm/2)/1000,1.1,(o.yMm+o.lengthMm/2)/1000));scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:'#c084fc'})));}
    fit.current=()=>{const bounds=new THREE.Box3().setFromObject(scene),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());const r=Math.max(size.x,size.z)*1.25/Math.min(1,camera.aspect);camera.position.set(center.x+r*.65,center.y+r,center.z+r*.7);controls.target.copy(center);controls.update();};
    topView.current=()=>{controls.target.set(width/2,0,length/2);camera.position.set(width/2,Math.max(width,length)*1.4,length/2+.001);controls.update();};
    focusObject.current=(id:string)=>{const group=groups.find(g=>g.userData.id===id);if(!group)return;const size=new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3()),r=Math.max(size.x,size.z,size.y,1)*4;controls.target.copy(group.position);camera.position.copy(group.position).add(new THREE.Vector3(r*.6,r,r*.8));controls.update();};
    const resize=()=>{const w=dom.clientWidth,h=dom.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();};const observer=new ResizeObserver(resize);observer.observe(dom);resize();if(pose.current){camera.position.copy(pose.current.position);controls.target.copy(pose.current.target);}else fit.current();
    const ray=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
    let drag:{group:THREE.Group;start:THREE.Vector3;origin:THREE.Vector3}|null=null;
    const cast=(e:PointerEvent)=>{const r=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);};
    const down=(e:PointerEvent)=>{if(readOnly||!editing||e.button!==0)return;cast(e);let picked:THREE.Object3D|undefined=ray.intersectObjects(groups,true)[0]?.object;while(picked&&!picked.userData.id)picked=picked.parent??undefined;if(!picked)return;const group=picked as THREE.Group,point=ray.ray.intersectPlane(plane,new THREE.Vector3());if(!point)return;e.stopImmediatePropagation();controls.enabled=false;setDraft({...p.layoutObjects.find(o=>o.id===group.userData.id)!});drag={group,start:point,origin:group.position.clone()};renderer.domElement.setPointerCapture(e.pointerId);};
    const move=(e:PointerEvent)=>{if(!drag)return;cast(e);const point=ray.ray.intersectPlane(plane,new THREE.Vector3());if(!point)return;const next=drag.origin.clone().add(point.sub(drag.start));const o=p.layoutObjects.find(o=>o.id===drag!.group.userData.id)!;const grid=snap?p.facility.gridSizeMm:1;next.x=(Math.round((next.x*1000-o.widthMm/2)/grid)*grid+o.widthMm/2)/1000;next.z=(Math.round((next.z*1000-o.lengthMm/2)/grid)*grid+o.lengthMm/2)/1000;drag.group.position.copy(next);};
    const up=(e:PointerEvent)=>{if(!drag)return;const d=drag;drag=null;controls.enabled=true;const old=p.layoutObjects.find(o=>o.id===d.group.userData.id)!;const changed={...old,xMm:d.group.position.x*1000-old.widthMm/2,yMm:d.group.position.z*1000-old.lengthMm/2};setDraft(changed);if(Math.abs(changed.xMm-old.xMm)>.001||Math.abs(changed.yMm-old.yMm)>.001)commit.current({...p,layoutMode:'manual',layoutObjects:p.layoutObjects.map(o=>o.id===changed.id?changed:o)});if(renderer.domElement.hasPointerCapture(e.pointerId))renderer.domElement.releasePointerCapture(e.pointerId);};
    const cancel=()=>{if(drag)drag.group.position.copy(drag.origin);drag=null;controls.enabled=true;};
    renderer.domElement.addEventListener('pointerdown',down,true);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',cancel);
    let frame=0;const loop=()=>{frame=requestAnimationFrame(loop);controls.update();for(const m of markers)m.marker.visible=activity.current.some(r=>r.stationId===m.station&&r.copy===m.copy);renderer.render(scene,camera);};loop();
    return ()=>{pose.current={position:camera.position.clone(),target:controls.target.clone()};renderer.domElement.removeEventListener('pointerdown',down,true);renderer.domElement.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('pointerup',up);renderer.domElement.removeEventListener('pointercancel',cancel);cancelAnimationFrame(frame);observer.disconnect();controls.dispose();scene.traverse(o=>{const m=o as THREE.Mesh;m.geometry?.dispose();const mats=m.material?Array.isArray(m.material)?m.material:[m.material]:[];mats.forEach(x=>x.dispose());});renderer.dispose();renderer.domElement.remove();};
  },[p,spaghetti,editing,snap,readOnly]);
  return <><div className="toolbar">{!readOnly&&<><button aria-pressed={editing} onClick={()=>setEditing(!editing)}>{editing?'Edycja 3D włączona':'Włącz edycję 3D'}</button><label><input type="checkbox" checked={snap} onChange={e=>setSnap(e.target.checked)}/>Siatka 3D</label></>}<button onClick={()=>fit.current()}>Dopasuj halę 3D</button><button onClick={()=>topView.current()}>Widok z góry</button>{!readOnly&&draft&&<button onClick={()=>focusObject.current(draft.id)}>Zbliż na wybrany obiekt</button>}<button onClick={()=>setSpaghetti(!spaghetti)} aria-pressed={spaghetti}>Połączenia procesu {spaghetti?'włączone':'wyłączone'}</button></div>{error&&<p role="alert" className="error">{error}</p>}<div className="scene" ref={host} aria-label="Widok hali 3D"/><p className="muted">Lewy przycisk: obrót · Prawy: przesuwanie · Kółko: zoom. {readOnly?'Podgląd czyta zapisane obiekty warsztatu v5.': 'W trybie edycji: wybierz i przeciągnij wyposażenie po podłodze. Zielony znacznik oznacza operację aktywną w symulacji poniżej.'} Fioletowe linie pokazują zależności między stanowiskami, nie drogi transportowe.</p>{!readOnly&&draft&&<form className="panel" onSubmit={e=>{e.preventDefault();change({...p,layoutMode:"manual",layoutObjects:p.layoutObjects.map(o=>o.id===draft.id?draft:o)});}}><h3>Edycja 3D: {draft.name}</h3><label className="field">Wybierz wyposażenie<select value={draft.id} onChange={e=>setDraft({...p.layoutObjects.find(o=>o.id===e.target.value)!})}>{p.layoutObjects.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label><div className="form-grid">{(["xMm","yMm","zMm","widthMm","lengthMm","heightMm","rotationDeg"] as const).map(key=><NumberField key={key} label={({xMm:"X [mm]",yMm:"Y [mm]",zMm:"Poziom Z [mm]",widthMm:"Szerokość [mm]",lengthMm:"Głębokość [mm]",heightMm:"Wysokość [mm]",rotationDeg:"Obrót [°]"})[key]} value={draft[key]} min={["widthMm","lengthMm","heightMm"].includes(key)?1:-500000} max={500000} onChange={v=>setDraft({...draft,[key]:v})}/>)}</div><button>Zapisz geometrię 3D</button><button type="button" onClick={()=>setDraft(null)}>Zamknij edycję obiektu</button></form>}{!readOnly&&!draft&&<button onClick={()=>setDraft({...p.layoutObjects[0]})} disabled={!p.layoutObjects.length}>Wybierz wyposażenie z listy</button>}</>;
}
