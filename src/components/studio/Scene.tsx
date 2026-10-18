import {EquipmentAppearanceEditor} from './EquipmentAppearanceEditor';
import {applyEquipmentAppearance} from '../../core/equipment/equipmentAppearance';
import React,{useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { ProjectData, LayoutObject } from '../../core/models/types';
import { OperationRun } from '../../core/algorithms/networkSimulation';
import { layoutRoutes } from '../../core/algorithms/routing';
import { NumberField } from './Fields';
import {
  lockLayoutObjects,
  nudgeLayoutObjects,
  LAYOUT_SHORTCUTS,
  VISUAL_ASSUMPTION_DISCLAIMER,
  FACILITY_UNCONFIRMED_NOTE,
  DEFAULT_3D_LAYERS,
  type Layout3DLayersState,
  type TransformGizmoMode,
  isLayoutObjectVisible3D,
  hideObjectIds,
  worldToLayoutCoordinates,
  worldRotationToDegrees,
} from '../../core/algorithms/layoutSelection';
import { createParametricEquipmentGroup, disposeEquipmentGroup } from '../../core/equipment/parametricEquipmentModels';
import type { SimulationPlaybackState, SimulationControlCommand } from './Simulation';
import {
  computeSimulationAnimationSnapshot,
  getJobInspectionDetails,
  type SimulationAnimationSnapshot,
  type JobInspectionDetails,
  type AnimatedJobItem,
} from '../../core/algorithms/simulationAnimation';

export function Scene({
  project: p,
  change,
  activeRuns,
  readOnly = false,
  selectedIds,
  onSelect,
  simulationPlayback,
  onSimulationCommand,
}: {
  project: ProjectData;
  change: (p: ProjectData) => void;
  activeRuns: OperationRun[];
  readOnly?: boolean;
  selectedIds?: string[];
  onSelect?: (ids: string[]) => void;
  simulationPlayback?: SimulationPlaybackState | null;
  onSimulationCommand?: (cmd: SimulationControlCommand) => void;
}) {
  const host=useRef<HTMLDivElement>(null),fit=useRef<()=>void>(()=>{}),[error,setError]=useState('');
  const [editing,setEditing]=useState(false),[snap,setSnap]=useState(true),[draft,setDraft]=useState<LayoutObject|null>(null);
  const [showZones,setShowZones]=useState(false),[showEnvelopes,setShowEnvelopes]=useState(false);
  const [gizmoMode,setGizmoMode]=useState<TransformGizmoMode>('translate');
  const [layers3D,setLayers3D]=useState<Layout3DLayersState>(DEFAULT_3D_LAYERS);
  const [hiddenIds,setHiddenIds]=useState<string[]>([]);
  const [inspectedJobId,setInspectedJobId]=useState<number|null>(null);
  const [showInspector,setShowInspector]=useState(true);
  const activity=useRef(activeRuns);activity.current=activeRuns;
  const simPlaybackRef=useRef(simulationPlayback);simPlaybackRef.current=simulationPlayback;
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
    if(selectedIds&&selectedIds.length===1){
      const obj=p.layoutObjects.find(o=>o.id===selectedIds[0]);
      if(obj)setDraft({...obj});
    }else if(selectedIds&&selectedIds.length===0){
      setDraft(null);
    }
  },[selectedIds,p.layoutObjects]);

  const lockSelected=(locked:boolean)=>{
    const ids=selectedIds?.length?selectedIds:draft?[draft.id]:[];
    if(!ids.length)return;
    const updated=lockLayoutObjects(p.layoutObjects,ids,locked);
    change({...p,layoutMode:'manual',layoutObjects:updated});
    if(draft&&ids.includes(draft.id)){
      const next=updated.find(o=>o.id===draft.id);
      setDraft(next?{...next}:null);
    }
  };

  useEffect(()=>{
    const handleKeyDown=(e:KeyboardEvent)=>{
      const active=document.activeElement;
      const isInput=active&&(active.tagName==='INPUT'||active.tagName==='TEXTAREA'||active.tagName==='SELECT'||(active as HTMLElement).isContentEditable);
      if(e.key==='Escape'){
        if(selectedIds&&selectedIds.length>0){
          onSelect?.([]);
          setDraft(null);
          return;
        }
        if(draft){
          setDraft(null);
          return;
        }
      }
      if(isInput||readOnly)return;
      const key=e.key.toLowerCase();
      if(!e.ctrlKey&&!e.metaKey&&!e.altKey){
        if(key==='f'){
          e.preventDefault();
          fit.current();
        }else if(key==='t'){
          e.preventDefault();
          topView.current();
        }else if(key==='w'){
          e.preventDefault();
          setGizmoMode(m=>m==='translate'?'off':'translate');
        }else if(key==='e'||key==='r'){
          e.preventDefault();
          setGizmoMode(m=>m==='rotate'?'off':'rotate');
        }else if(key==='q'){
          e.preventDefault();
          setGizmoMode('off');
        }else if(key==='h'){
          e.preventDefault();
          if(e.shiftKey){
            setHiddenIds([]);
          }else if(selectedIds&&selectedIds.length>0){
            setHiddenIds(prev=>hideObjectIds(prev,selectedIds));
            setDraft(null);
          }
        }else if(key==='g'){
          e.preventDefault();
          setSnap(prev=>!prev);
        }else if(key==='m'){
          e.preventDefault();
          setEditing(prev=>!prev);
        }else if(key==='s'){
          e.preventDefault();
          setLayers3D(prev=>({...prev,routes:!prev.routes}));
        }else if(key==='l'){
          if(selectedIds&&selectedIds.length>0){
            e.preventDefault();
            const allLocked=selectedIds.every(id=>p.layoutObjects.find(o=>o.id===id)?.locked);
            lockSelected(!allLocked);
          }
        }
      }
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)&&selectedIds&&selectedIds.length>0){
        e.preventDefault();
        const dir=e.key==='ArrowLeft'?'left':e.key==='ArrowRight'?'right':e.key==='ArrowUp'?'up':'down';
        const step=(e.shiftKey?5:1)*Math.max(10,p.facility.gridSizeMm||100);
        const next=nudgeLayoutObjects(p.layoutObjects,selectedIds,dir,step,true);
        change({...p,layoutMode:'manual',layoutObjects:next});
      }
    };
    window.addEventListener('keydown',handleKeyDown);
    return ()=>window.removeEventListener('keydown',handleKeyDown);
  },[selectedIds,draft,readOnly,p,gizmoMode]);

  useEffect(()=>{
    const dom=host.current!;let renderer:THREE.WebGLRenderer;
    try{renderer=new THREE.WebGLRenderer({antialias:true});}catch{setError('WebGL jest niedostępny. Użyj rzutu CAD 2D lub włącz akcelerację sprzętową w przeglądarce.');return;}
    setError('');renderer.setPixelRatio(Math.min(devicePixelRatio,2));dom.appendChild(renderer.domElement);
    const scene=new THREE.Scene();scene.background=new THREE.Color('#0b1220');
    const camera=new THREE.PerspectiveCamera(45,1,.05,5000),controls=new OrbitControls(camera,renderer.domElement);
    controls.enableDamping=readOnly||!editing;controls.enableRotate=readOnly||!editing;
    controls.minDistance=.5;controls.maxDistance=1500;controls.maxPolarAngle=Math.PI/2-.01;
    scene.add(new THREE.HemisphereLight(0xffffff,0x334155,2));const sun=new THREE.DirectionalLight(0xffffff,2);sun.position.set(15,30,10);scene.add(sun);
    const width=p.facility.widthMm/1000,length=p.facility.lengthMm/1000;
    const floor=new THREE.Mesh(new THREE.BoxGeometry(width,.05,length),new THREE.MeshStandardMaterial({color:'#172033'}));floor.position.set(width/2,-.04,length/2);scene.add(floor);
    const grid=new THREE.GridHelper(Math.max(width,length),Math.min(500,Math.max(1,Math.round(Math.max(width,length)/(p.facility.gridSizeMm/1000)))));grid.position.set(width/2,0,length/2);scene.add(grid);

    // TransformControls gizmo
    const transform=new TransformControls(camera,renderer.domElement);
    transform.size=0.75;
    transform.space='world';
    scene.add(transform);

    const groups:THREE.Group[]=[];
    const highlights:THREE.BoxHelper[]=[];
    p.layoutObjects.forEach(o=>{
      const isVisible=isLayoutObjectVisible3D(o,layers3D,hiddenIds);
      const group=createParametricEquipmentGroup(o,{
        showServiceZone:showZones&&isVisible,
        showCollisionEnvelope:showEnvelopes&&isVisible,
        showTransportPorts:showZones&&isVisible,
      });
      group.visible=isVisible;
      groups.push(group);
      scene.add(group);
      if(selectedIds?.includes(o.id)&&isVisible){
        const highlight=new THREE.BoxHelper(group,o.locked?0xfacc15:0x38bdf8);
        (highlight.material as THREE.Material).depthTest=false;
        highlight.renderOrder=999;
        scene.add(highlight);
        highlights.push(highlight);
      }
    });

    // Attach gizmo to active selected object if not locked, visible, and enabled
    const activeId=draft?.id||(selectedIds&&selectedIds.length===1?selectedIds[0]:null);
    const activeObj=activeId?p.layoutObjects.find(o=>o.id===activeId):null;
    const isObjVisible=activeObj?isLayoutObjectVisible3D(activeObj,layers3D,hiddenIds):false;
    const canManipulate=activeObj&&!activeObj.locked&&isObjVisible&&!readOnly;

    if(canManipulate&&gizmoMode!=='off'){
      const targetGroup=groups.find(g=>g.userData.id===activeObj.id);
      if(targetGroup){
        transform.attach(targetGroup);
        if(gizmoMode==='translate'){
          transform.setMode('translate');
          transform.showX=true;
          transform.showY=false;
          transform.showZ=true;
          transform.setTranslationSnap(snap?(p.facility.gridSizeMm||100)/1000:null);
        }else if(gizmoMode==='rotate'){
          transform.setMode('rotate');
          transform.showX=false;
          transform.showY=true;
          transform.showZ=false;
          transform.setRotationSnap(snap?(15*Math.PI/180):null);
        }
      }else{
        transform.detach();
      }
    }else{
      transform.detach();
    }

    transform.addEventListener('dragging-changed',(event:any)=>{
      const isDragging=!!event.value;
      controls.enabled=!isDragging;
      if(!isDragging){
        if(transform.object&&transform.object.userData.id){
          const objId=transform.object.userData.id as string;
          const original=p.layoutObjects.find(o=>o.id===objId);
          if(original&&!original.locked){
            const {xMm,yMm}=worldToLayoutCoordinates(
              transform.object.position.x,
              transform.object.position.z,
              original.widthMm,
              original.lengthMm,
              snap?p.facility.gridSizeMm:1
            );
            const rotDeg=worldRotationToDegrees(
              transform.object.rotation.y,
              snap?15:undefined
            );
            const hasMoved=Math.abs(xMm-original.xMm)>0.5||Math.abs(yMm-original.yMm)>0.5;
            const hasRotated=rotDeg!==original.rotationDeg;
            if(hasMoved||hasRotated){
              const updated:LayoutObject={
                ...original,
                xMm,
                yMm,
                rotationDeg:rotDeg,
              };
              setDraft(updated);
              commit.current({
                ...p,
                layoutMode:'manual',
                layoutObjects:p.layoutObjects.map(o=>o.id===updated.id?updated:o),
              });
            }
          }
        }
      }
    });

    transform.addEventListener('change',()=>{
      if(transform.object&&transform.object.userData.id){
        const objId=transform.object.userData.id as string;
        const original=p.layoutObjects.find(o=>o.id===objId);
        if(original&&!original.locked){
          transform.object.position.y=(original.zMm||0)/1000;
          const {xMm,yMm}=worldToLayoutCoordinates(
            transform.object.position.x,
            transform.object.position.z,
            original.widthMm,
            original.lengthMm,
            snap?p.facility.gridSizeMm:1
          );
          const rotDeg=worldRotationToDegrees(
            transform.object.rotation.y,
            snap?15:undefined
          );
          setDraft(prev=>prev&&prev.id===objId?{...prev,xMm,yMm,rotationDeg:rotDeg}:prev);
        }
      }
    });

    const markers=p.layoutObjects.filter(o=>o.type.includes('Table')).map(o=>{
      const marker=new THREE.Mesh(new THREE.SphereGeometry(.25,12,8),new THREE.MeshStandardMaterial({color:'#22c55e',emissive:'#16a34a',emissiveIntensity:1}));
      marker.position.set((o.xMm+o.widthMm/2)/1000,(o.zMm+o.heightMm)/1000+.4,(o.yMm+o.lengthMm/2)/1000);
      marker.visible=false;
      scene.add(marker);
      const peers=p.layoutObjects.filter(x=>x.type.includes('Table')&&x.workstationId===o.workstationId);
      return {marker,objectId:o.id,station:o.workstationId,copy:peers.indexOf(o)+1};
    });

    p.obstacles.forEach(o=>{
      const m=new THREE.Mesh(new THREE.BoxGeometry(o.widthMm/1000,o.heightMm/1000,o.lengthMm/1000),new THREE.MeshStandardMaterial({color:'#ef4444',transparent:true,opacity:.7}));
      m.position.set((o.xMm+o.widthMm/2)/1000,o.heightMm/2000,(o.yMm+o.lengthMm/2)/1000);
      m.visible=layers3D.obstacles;
      scene.add(m);
    });

    if(layers3D.routes){
      for(const {a,b} of layoutRoutes(p)){
        const isAVisible=isLayoutObjectVisible3D(a,layers3D,hiddenIds);
        const isBVisible=isLayoutObjectVisible3D(b,layers3D,hiddenIds);
        if(!isAVisible&&!isBVisible)continue;
        const points=[a,b].map(o=>new THREE.Vector3((o.xMm+o.widthMm/2)/1000,1.1,(o.yMm+o.lengthMm/2)/1000));
        scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:'#c084fc'})));
      }
    }

    fit.current=()=>{const bounds=new THREE.Box3().setFromObject(scene),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());const r=Math.max(size.x,size.z)*1.25/Math.min(1,camera.aspect);camera.position.set(center.x+r*.65,center.y+r,center.z+r*.7);controls.target.copy(center);controls.update();};
    topView.current=()=>{controls.target.set(width/2,0,length/2);camera.position.set(width/2,Math.max(width,length)*1.4,length/2+.001);controls.update();};
    focusObject.current=(id:string)=>{const group=groups.find(g=>g.userData.id===id);if(!group)return;const size=new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3()),r=Math.max(size.x,size.z,size.y,1)*4;controls.target.copy(group.position);camera.position.copy(group.position).add(new THREE.Vector3(r*.6,r,r*.8));controls.update();};

    const resize=()=>{const w=dom.clientWidth,h=dom.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();};
    const observer=new ResizeObserver(resize);observer.observe(dom);resize();
    if(pose.current){camera.position.copy(pose.current.position);controls.target.copy(pose.current.target);}else fit.current();

    const ray=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
    let drag:{group:THREE.Group;start:THREE.Vector3;origin:THREE.Vector3}|null=null;
    let pointerDownPos={x:0,y:0};
    // Products & Vehicle 3D meshes for simulation animation
    const productsGroup=new THREE.Group();
    scene.add(productsGroup);
    const vehiclesGroup=new THREE.Group();
    scene.add(vehiclesGroup);

    // Reusable geometry and materials for products
    const productGeom=new THREE.BoxGeometry(0.35,0.18,0.25);
    const productMatDefault=new THREE.MeshStandardMaterial({color:'#38bdf8',metalness:0.3,roughness:0.4});
    const productMatActive=new THREE.MeshStandardMaterial({color:'#22c55e',emissive:'#15803d',emissiveIntensity:0.6,metalness:0.3,roughness:0.3});
    const productMatTransit=new THREE.MeshStandardMaterial({color:'#f59e0b',emissive:'#b45309',emissiveIntensity:0.4,metalness:0.3,roughness:0.3});
    const productMatQueue=new THREE.MeshStandardMaterial({color:'#a855f7',metalness:0.3,roughness:0.5});
    const productMatFinished=new THREE.MeshStandardMaterial({color:'#64748b',metalness:0.2,roughness:0.8});
    const productMatSelected=new THREE.MeshStandardMaterial({color:'#f43f5e',emissive:'#e11d48',emissiveIntensity:0.8,metalness:0.4,roughness:0.2});

    // Ring indicator for inspected job
    const inspectRingGeom=new THREE.RingGeometry(0.24,0.30,24);
    inspectRingGeom.rotateX(-Math.PI/2);
    const inspectRingMat=new THREE.MeshBasicMaterial({color:'#f43f5e',side:THREE.DoubleSide});
    const inspectRingMesh=new THREE.Mesh(inspectRingGeom,inspectRingMat);
    inspectRingMesh.visible=false;
    scene.add(inspectRingMesh);

    // Vehicle mesh templates (platform cart)
    const vehicleGeom=new THREE.BoxGeometry(0.7,0.18,0.5);
    const vehicleMat=new THREE.MeshStandardMaterial({color:'#f97316',metalness:0.4,roughness:0.5});

    const productMeshPool:Map<number,THREE.Mesh>=new Map();
    const vehicleMeshPool:Map<string,THREE.Mesh>=new Map();

    const cast=(e:PointerEvent)=>{const r=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);};
    const down=(e:PointerEvent)=>{
      if(readOnly||e.button!==0)return;
      pointerDownPos={x:e.clientX,y:e.clientY};
      if(!editing)return;
      cast(e);
      let picked:THREE.Object3D|undefined=ray.intersectObjects(groups.filter(g=>g.visible),true)[0]?.object;
      while(picked&&!picked.userData.id)picked=picked.parent??undefined;
      if(!picked)return;
      const group=picked as THREE.Group;
      const clickedId=group.userData.id as string;
      const clickedObj=p.layoutObjects.find(o=>o.id===clickedId);
      if(!clickedObj)return;
      const isMulti=e.shiftKey||e.ctrlKey||e.metaKey;
      const current=selectedIds??[];
      const nextIds=isMulti?(current.includes(clickedId)?current.filter(id=>id!==clickedId):[...current,clickedId]):[clickedId];
      onSelect?.(nextIds);
      setDraft({...clickedObj});
      if(clickedObj.locked)return;
      if(gizmoMode!=='off')return;
      const point=ray.ray.intersectPlane(plane,new THREE.Vector3());
      if(!point)return;
      e.stopImmediatePropagation();
      controls.enabled=false;
      drag={group,start:point,origin:group.position.clone()};
      renderer.domElement.setPointerCapture(e.pointerId);
    };
    const move=(e:PointerEvent)=>{if(!drag)return;cast(e);const point=ray.ray.intersectPlane(plane,new THREE.Vector3());if(!point)return;const next=drag.origin.clone().add(point.sub(drag.start));const o=p.layoutObjects.find(o=>o.id===drag!.group.userData.id)!;const grid=snap?p.facility.gridSizeMm:1;next.x=(Math.round((next.x*1000-o.widthMm/2)/grid)*grid+o.widthMm/2)/1000;next.z=(Math.round((next.z*1000-o.lengthMm/2)/grid)*grid+o.lengthMm/2)/1000;drag.group.position.copy(next);};
    const up=(e:PointerEvent)=>{
      if(drag){
        const d=drag;drag=null;controls.enabled=true;
        const old=p.layoutObjects.find(o=>o.id===d.group.userData.id)!;
        const changed={...old,xMm:d.group.position.x*1000-old.widthMm/2,yMm:d.group.position.z*1000-old.lengthMm/2};
        setDraft(changed);
        if(Math.abs(changed.xMm-old.xMm)>.001||Math.abs(changed.yMm-old.yMm)>.001)commit.current({...p,layoutMode:'manual',layoutObjects:p.layoutObjects.map(o=>o.id===changed.id?changed:o)});
        if(renderer.domElement.hasPointerCapture(e.pointerId))renderer.domElement.releasePointerCapture(e.pointerId);
        return;
      }
      const dist=Math.hypot(e.clientX-pointerDownPos.x,e.clientY-pointerDownPos.y);
      if(dist<5&&e.button===0){
        cast(e);
        // Check for product pickup first (simulation inspection)
        const hitProducts=ray.intersectObjects(productsGroup.children.filter(c=>c.visible),true);
        if(hitProducts.length>0){
          let prodObj:THREE.Object3D|undefined=hitProducts[0].object;
          while(prodObj&&typeof prodObj.userData.jobId!=='number')prodObj=prodObj.parent??undefined;
          if(prodObj&&typeof prodObj.userData.jobId==='number'){
            const clickedJobId=prodObj.userData.jobId as number;
            setInspectedJobId(prev=>prev===clickedJobId?null:clickedJobId);
            return;
          }
        }

        if(!readOnly){
          let picked:THREE.Object3D|undefined=ray.intersectObjects(groups.filter(g=>g.visible),true)[0]?.object;
          while(picked&&!picked.userData.id)picked=picked.parent??undefined;
          if(picked){
            const clickedId=picked.userData.id as string;
            const isMulti=e.shiftKey||e.ctrlKey||e.metaKey;
            const current=selectedIds??[];
            const nextIds=isMulti?(current.includes(clickedId)?current.filter(id=>id!==clickedId):[...current,clickedId]):[clickedId];
            onSelect?.(nextIds);
            const clickedObj=p.layoutObjects.find(o=>o.id===clickedId);
            if(clickedObj)setDraft({...clickedObj});
          }
        }
      }
    };
    const cancel=()=>{if(drag)drag.group.position.copy(drag.origin);drag=null;controls.enabled=true;};
    renderer.domElement.addEventListener('pointerdown',down,true);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',cancel);

    let frame=0;
    const loop=()=>{
      frame=requestAnimationFrame(loop);
      controls.update();
      for(const h of highlights)h.update();
      for(const m of markers){
        const obj=p.layoutObjects.find(o=>o.id===m.objectId);
        const isVisible=obj?isLayoutObjectVisible3D(obj,layers3D,hiddenIds):true;
        m.marker.visible=isVisible&&activity.current.some(r=>r.stationId===m.station&&r.copy===m.copy);
      }

      // Animate products and vehicles based on deterministic simulation snapshot
      const currentPlayback=simPlaybackRef.current;
      if(currentPlayback&&currentPlayback.result&&currentPlayback.result.jobs.length>0){
        const snapshot=computeSimulationAnimationSnapshot(p,currentPlayback.result,currentPlayback.time);
        
        // Hide all existing product meshes initially
        productMeshPool.forEach(mesh=>{mesh.visible=false;});
        
        // Update/create meshes for active jobs in snapshot
        let activeInspectedPos:THREE.Vector3|null=null;
        for(const job of snapshot.jobs){
          let mesh=productMeshPool.get(job.jobId);
          if(!mesh){
            mesh=new THREE.Mesh(productGeom,productMatDefault);
            mesh.userData.jobId=job.jobId;
            productsGroup.add(mesh);
            productMeshPool.set(job.jobId,mesh);
          }
          // Coordinate mapping: X=xMm/1000, Y=zMm/1000 (elevation), Z=yMm/1000 (floor depth)
          mesh.position.set(job.positionMm.xMm/1000,job.positionMm.zMm/1000,job.positionMm.yMm/1000);
          mesh.visible=true;

          // Material selection by phase
          const isInspected=job.jobId===inspectedJobId;
          if(isInspected){
            mesh.material=productMatSelected;
            activeInspectedPos=mesh.position.clone();
          }else if(job.phase==='processing'){
            mesh.material=productMatActive;
          }else if(job.phase==='in_transit'||job.phase==='entering'){
            mesh.material=productMatTransit;
          }else if(job.phase==='waiting_queue'||job.phase==='waiting_local'){
            mesh.material=productMatQueue;
          }else if(job.phase==='finished'){
            mesh.material=productMatFinished;
          }else{
            mesh.material=productMatDefault;
          }
        }

        // Update inspection ring
        if(activeInspectedPos){
          inspectRingMesh.position.copy(activeInspectedPos);
          inspectRingMesh.position.y+=0.12;
          inspectRingMesh.visible=true;
        }else{
          inspectRingMesh.visible=false;
        }

        // Update vehicle positions
        vehicleMeshPool.forEach(vm=>{vm.visible=false;});
        for(const v of snapshot.vehicles){
          let vm=vehicleMeshPool.get(v.id);
          if(!vm){
            vm=new THREE.Mesh(vehicleGeom,vehicleMat);
            vehiclesGroup.add(vm);
            vehicleMeshPool.set(v.id,vm);
          }
          vm.position.set(v.positionMm.xMm/1000,0.1,v.positionMm.yMm/1000);
          vm.rotation.y=-v.rotationDeg*Math.PI/180;
          vm.visible=true;
        }
      }else{
        productMeshPool.forEach(mesh=>{mesh.visible=false;});
        vehicleMeshPool.forEach(vm=>{vm.visible=false;});
        inspectRingMesh.visible=false;
      }

      renderer.render(scene,camera);
    };
    loop();

    return ()=>{
      pose.current={position:camera.position.clone(),target:controls.target.clone()};
      renderer.domElement.removeEventListener('pointerdown',down,true);
      renderer.domElement.removeEventListener('pointermove',move);
      renderer.domElement.removeEventListener('pointerup',up);
      renderer.domElement.removeEventListener('pointercancel',cancel);
      cancelAnimationFrame(frame);
      observer.disconnect();
      transform.dispose();
      scene.remove(transform);
      controls.dispose();
      groups.forEach(g=>disposeEquipmentGroup(g));
      scene.traverse(o=>{
        const m=o as THREE.Mesh;
        m.geometry?.dispose();
        const mats=m.material?Array.isArray(m.material)?m.material:[m.material]:[];
        mats.forEach(x=>x.dispose());
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  },[p,editing,snap,readOnly,selectedIds,showZones,showEnvelopes,gizmoMode,layers3D,hiddenIds]);

  const hasVisualAssumptions=p.layoutObjects.some(o=>o.isVisualAssumption);
  const isFacilityConfirmed=!!(p.facility.underlay?.calibratedDistanceMm||p.facility.isConfirmed);

  return (
    <>
      <div className="toolbar" aria-label="Narzędzia 3D, manipulatory i warstwy">
        {!readOnly&& (
          <>
            <button aria-pressed={editing} onClick={()=>setEditing(!editing)} title="Włącz lub wyłącz edycję i przeciąganie 3D (M)">
              {editing?'Edycja 3D włączona':'Włącz edycję 3D'}
            </button>
            <label title="Przyciąganie do siatki 3D i kątów 15° (G)">
              <input type="checkbox" checked={snap} onChange={e=>setSnap(e.target.checked)}/>
              Siatka 3D
            </label>
            <button
              aria-pressed={gizmoMode==='translate'}
              onClick={()=>setGizmoMode(m=>m==='translate'?'off':'translate')}
              title="Manipulator przesuwania w osiach posadzki X/Z (W)"
            >
              Przesuwanie 3D (W)
            </button>
            <button
              aria-pressed={gizmoMode==='rotate'}
              onClick={()=>setGizmoMode(m=>m==='rotate'?'off':'rotate')}
              title="Manipulator obrotu wokół osi pionowej (E/R)"
            >
              Obrót 3D (E)
            </button>
            <button
              aria-pressed={gizmoMode==='off'}
              onClick={()=>setGizmoMode('off')}
              title="Wyłącz manipulator 3D (Q)"
            >
              Wyłącz manipulator (Q)
            </button>
          </>
        )}
        <button onClick={()=>fit.current()} title="Dopasuj widok do hali 3D (F)">Dopasuj halę 3D</button>
        <button onClick={()=>topView.current()} title="Widok hali prostopadle z góry (T)">Widok z góry</button>
        {!readOnly&&draft&&<button onClick={()=>focusObject.current(draft.id)} title="Zbliż kamerę 3D na aktywny obiekt">Zbliż na wybrany obiekt</button>}
        
        <details className="layer-controls-dropdown" title="Widoczność warstw 3D">
          <summary>Warstwy 3D</summary>
          <div className="layer-checkboxes">
            <label><input type="checkbox" checked={layers3D.stations} onChange={e=>setLayers3D(l=>({...l,stations:e.target.checked}))}/> Stanowiska</label>
            <label><input type="checkbox" checked={layers3D.buffers} onChange={e=>setLayers3D(l=>({...l,buffers:e.target.checked}))}/> Bufory</label>
            <label><input type="checkbox" checked={layers3D.operators} onChange={e=>setLayers3D(l=>({...l,operators:e.target.checked}))}/> Strefy operatorów</label>
            <label><input type="checkbox" checked={layers3D.obstacles} onChange={e=>setLayers3D(l=>({...l,obstacles:e.target.checked}))}/> Przeszkody</label>
            <label><input type="checkbox" checked={layers3D.routes} onChange={e=>setLayers3D(l=>({...l,routes:e.target.checked}))}/> Połączenia procesu</label>
          </div>
        </details>

        <button onClick={()=>setShowZones(prev=>!prev)} aria-pressed={showZones} title="Pokaż lub ukryj strefy obsługi i odkładania w 3D (6.1/6.2)">
          Strefy 3D {showZones?'włączone':'wyłączone'}
        </button>
        <button onClick={()=>setShowEnvelopes(prev=>!prev)} aria-pressed={showEnvelopes} title="Pokaż lub ukryj obrysy kolizji w 3D (6.1/6.2)">
          Obrysy kolizji 3D {showEnvelopes?'włączone':'wyłączone'}
        </button>

        {!readOnly&&((selectedIds&&selectedIds.length>0)||draft)&& (
          <>
            <span role="status">Zaznaczono: {selectedIds?.length||1}</span>
            <button onClick={()=>lockSelected(true)} title="Zablokuj zaznaczone obiekty (L)">Zablokuj (L)</button>
            <button onClick={()=>lockSelected(false)} title="Odblokuj zaznaczone obiekty">Odblokuj</button>
            <button onClick={()=>{
              const toHide = selectedIds&&selectedIds.length>0 ? selectedIds : draft ? [draft.id] : [];
              setHiddenIds(prev=>hideObjectIds(prev,toHide));
              setDraft(null);
              onSelect?.([]);
            }} title="Ukryj zaznaczone obiekty w 3D (H)">Ukryj w 3D (H)</button>
            <button onClick={()=>{onSelect?.([]);setDraft(null);}} title="Wyczyść zaznaczenie (Esc)">Wyczyść zaznaczenie</button>
          </>
        )}
        {hiddenIds.length>0&& (
          <button onClick={()=>setHiddenIds([])} title="Przywróć widoczność wszystkich ukrytych obiektów w 3D (Shift+H)">
            Pokaż ukryte w 3D ({hiddenIds.length})
          </button>
        )}
        {!readOnly&&draft&&draft.locked&& (
          <span role="status" className="badge-locked-3d" title="Obiekt zablokowany — odblokuj (L), aby manipulować">
            🔒 Zablokowany (brak manipulacji)
          </span>
        )}
      </div>

      {hasVisualAssumptions&&<p className="notice visual-assumption-note" role="note"><strong>Założenie wizualne (5.13):</strong> {VISUAL_ASSUMPTION_DISCLAIMER}</p>}
      {!isFacilityConfirmed&&<p className="notice facility-unconfirmed-note" role="note"><strong>Wymiary hali (5.13):</strong> {FACILITY_UNCONFIRMED_NOTE}</p>}
      {error&&<p role="alert" className="error">{error}</p>}

      <div className="scene-container" style={{position:'relative'}}>
        <div className="scene" ref={host} aria-label="Widok hali 3D"/>

        {/* 6.6: Simulation Inspector Card */}
        {showInspector&&inspectedJobId!==null&&simulationPlayback?.result&&(
          (() => {
            const details = getJobInspectionDetails(p, simulationPlayback.result, inspectedJobId, simulationPlayback.time);
            if (!details) return null;
            return (
              <div className="simulation-inspector-card" role="region" aria-label={`Inspekcja sztuki Job #${details.jobId}`}>
                <div className="sim-inspector-header">
                  <strong>Sztuka #{details.jobId}</strong>
                  <span className={`sim-phase-badge sim-phase-${details.phase}`}>{details.statusLabel}</span>
                  <button className="sim-inspector-close" onClick={()=>setInspectedJobId(null)} aria-label="Zamknij kartę inspekcji">×</button>
                </div>
                <div className="sim-inspector-body">
                  <div className="sim-inspector-row">
                    <span className="sim-prop-label">Stanowisko:</span>
                    <span className="sim-prop-val">{details.workstationName || details.stationId || '—'} {details.copy ? `(kopia ${details.copy})` : ''}</span>
                  </div>
                  <div className="sim-inspector-row">
                    <span className="sim-prop-label">Operacja:</span>
                    <span className="sim-prop-val">{details.stepName ? `${details.stepId} · ${details.stepName}` : details.stepId || '—'}</span>
                  </div>
                  <div className="sim-inspector-row">
                    <span className="sim-prop-label">Postęp etapu:</span>
                    <span className="sim-prop-val">{Math.round(details.progressPercent)}%</span>
                  </div>
                  <div className="sim-progress-track">
                    <div className="sim-progress-fill" style={{width: `${Math.max(0, Math.min(100, details.progressPercent))}%`}}/>
                  </div>
                  {details.runDuration !== undefined && (
                    <div className="sim-inspector-row">
                      <span className="sim-prop-label">Pozostało w operacji:</span>
                      <span className="sim-prop-val">{details.timeRemaining?.toFixed(1)} s / {details.runDuration.toFixed(1)} s</span>
                    </div>
                  )}
                  <div className="sim-inspector-row">
                    <span className="sim-prop-label">Czas w linii:</span>
                    <span className="sim-prop-val">{details.totalCycleTimeSoFar.toFixed(1)} s</span>
                  </div>
                  {details.bomComponents.length > 0 && (
                    <div className="sim-inspector-bom">
                      <span className="sim-prop-label">Części z BOM:</span>
                      <div className="sim-bom-tags">
                        {details.bomComponents.map((b, idx) => (
                          <span key={idx} className="sim-bom-tag">{b}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()
        )}

        {/* 6.6: Simulation Mini Playback Controls in 3D View */}
        {simulationPlayback && simulationPlayback.endTime > 0 && (
          <div className="sim-mini-playback-bar" role="toolbar" aria-label="Sterowanie animacją symulacji 3D">
            <button
              className="primary"
              onClick={() => onSimulationCommand?.({ type: 'toggle_run', epoch: Date.now() })}
              title={simulationPlayback.isRunning ? 'Zatrzymaj animację (Pauza)' : 'Uruchom animację 3D'}
            >
              {simulationPlayback.isRunning ? '⏸ Pauza' : '▶ Start'}
            </button>
            <button
              onClick={() => onSimulationCommand?.({ type: 'reset', epoch: Date.now() })}
              title="Resetuj czas symulacji do 0s"
            >
              ⏮ Reset
            </button>
            <div className="sim-playback-time">
              <span>{simulationPlayback.time.toFixed(1)} s</span>
              <span className="muted"> / {simulationPlayback.endTime.toFixed(1)} s</span>
            </div>
            <input
              type="range"
              aria-label="Suwak czasu animacji symulacji 3D"
              min={0}
              max={simulationPlayback.endTime}
              step={0.1}
              value={simulationPlayback.time}
              onChange={(e) => {
                onSimulationCommand?.({
                  type: 'set_time',
                  time: Number(e.target.value),
                  epoch: Date.now()
                });
              }}
            />
            {inspectedJobId !== null ? (
              <button
                className="sim-inspector-toggle active"
                onClick={() => setInspectedJobId(null)}
                title="Odznacz podgląd detalu"
              >
                Detal #{inspectedJobId} ✓
              </button>
            ) : (
              <button
                className="sim-inspector-toggle"
                onClick={() => setInspectedJobId(1)}
                title="Włącz inspekcję detalu (wybierz detal #1)"
              >
                🔍 Inspekcja 3D
              </button>
            )}
          </div>
        )}
      </div>

      <p className="muted">
        Lewy przycisk: obrót kamery · Prawy: przesuwanie kamery · Kółko: zoom.
        {readOnly
          ? ' Podgląd czyta zapisane obiekty warsztatu v5.'
          : ' Manipulatory 3D: Przesuwanie (W) i Obrót (E) pozwalają precyzyjnie modyfikować wyposażenie bezpośrednio w przestrzeni 3D z przyciąganiem do siatki (G). Ukrywanie obiektów (H) i warstw 3D ułatwia pracę w gęstym układzie hali. Żółty kontur: zablokowany (🔒), błękitny: zaznaczony.'}
      </p>

      {!readOnly&&draft&&p.layoutObjects.some(o=>o.id===draft.id)&& (
        <EquipmentAppearanceEditor
          blockedByDraft={JSON.stringify(draft)!==JSON.stringify(p.layoutObjects.find(o=>o.id===draft.id))}
          object={p.layoutObjects.find(o=>o.id===draft.id)!}
          onApply={id=>change({...p,layoutObjects:applyEquipmentAppearance(p.layoutObjects,draft.id,id)})}
        />
      )}

      {!readOnly&&draft&& (
        <form
          className="panel"
          onSubmit={e=>{
            e.preventDefault();
            change({...p,layoutMode:"manual",layoutObjects:p.layoutObjects.map(o=>o.id===draft.id?draft:o)});
          }}
        >
          <h3>Edycja 3D: {draft.name}</h3>
          {draft.isVisualAssumption&& (
            <p className="muted">
              <span className="badge-visual-assumption">Założenie wizualne</span> Domyślne wymiary i wyposażenie stanowią założenie wizualne (koncepcyjne) i nie definiują zdolności technologicznej.
            </p>
          )}
          <label>
            <input type="checkbox" checked={!!draft.locked} onChange={e=>setDraft({...draft,locked:e.target.checked})}/>
            Zablokuj położenie i wymiary obiektu (ochrona przed edycją)
          </label>
          <label className="field">
            Wybierz wyposażenie
            <select
              value={draft.id}
              onChange={e=>{
                const obj=p.layoutObjects.find(o=>o.id===e.target.value);
                if(obj){
                  setDraft({...obj});
                  onSelect?.([obj.id]);
                }
              }}
            >
              {p.layoutObjects.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </label>
          <div className="form-grid">
            {(["xMm","yMm","zMm","widthMm","lengthMm","heightMm","rotationDeg"] as const).map(key=>(
              <NumberField
                key={key}
                disabled={!!draft.locked}
                label={({xMm:"X [mm]",yMm:"Y [mm]",zMm:"Poziom Z [mm]",widthMm:"Szerokość [mm]",lengthMm:"Głębokość [mm]",heightMm:"Wysokość [mm]",rotationDeg:"Obrót [°]"})[key]}
                value={draft[key]}
                min={["widthMm","lengthMm","heightMm"].includes(key)?1:-500000}
                max={500000}
                onChange={v=>setDraft({...draft,[key]:v})}
              />
            ))}
          </div>
          <button>Zapisz geometrię 3D</button>
          <button type="button" onClick={()=>setDraft(null)}>Zamknij edycję obiektu</button>
        </form>
      )}

      {!readOnly&&!draft&& (
        <button
          onClick={()=>{
            const first=p.layoutObjects[0];
            if(first){
              setDraft({...first});
              onSelect?.([first.id]);
            }
          }}
          disabled={!p.layoutObjects.length}
        >
          Wybierz wyposażenie z listy
        </button>
      )}

      <details className="cad-shortcuts-cheatsheet">
        <summary>Skróty klawiszowe 3D i CAD</summary>
        <p className="muted">Wspólne skróty dla widoku symulacji 3D i edytora 2D. Skróty literowe działają, gdy fokus nie znajduje się w polu formularza.</p>
        <div className="shortcuts-grid">
          {LAYOUT_SHORTCUTS.map(s=>(
            <div key={s.key} className="shortcut-card">
              <span className="shortcut-key"><kbd>{s.key}</kbd></span>
              <span className="shortcut-label"><strong>{s.label}</strong></span>
              <span className="shortcut-desc">{s.description}</span>
            </div>
          ))}
        </div>
      </details>
    </>
  );
}


