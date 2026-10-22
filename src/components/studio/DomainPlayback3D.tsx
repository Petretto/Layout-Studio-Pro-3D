import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import type {DomainProjectV6} from '../../core/domainProject';
import type {DomainPlayback,domainPlaybackFrame} from '../../core/domainPlayback';
import {createParametricEquipmentGroup,disposeEquipmentGroup} from '../../core/equipment/parametricEquipmentModels';

type Frame=ReturnType<typeof domainPlaybackFrame>;
const colors={work:'#22c55e','calendar-pause':'#38bdf8',held:'#fb923c',waiting:'#64748b'};
export function DomainPlayback3D({project,playback,frame,selected}:{project:DomainProjectV6;playback:DomainPlayback|null;frame:Frame|null;selected:string}){
  const mount=useRef<HTMLDivElement>(null),markers=useRef<THREE.Mesh<THREE.SphereGeometry,THREE.MeshBasicMaterial>[]>([]);
  const [error,setError]=useState('');
  useEffect(()=>{
    const host=mount.current;if(!host)return;setError('');
    let renderer:THREE.WebGLRenderer;
    try{renderer=new THREE.WebGLRenderer({antialias:true});}catch{setError('Widok 3D wymaga dostępnego WebGL. Tabela i odtwarzanie harmonogramu pozostają dostępne.');return;}
    const scene=new THREE.Scene();scene.background=new THREE.Color('#0b1220');
    const camera=new THREE.PerspectiveCamera(45,1,.01,10000),controls=new OrbitControls(camera,renderer.domElement);
    controls.enableDamping=true;renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));host.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-label','Geometria 3D aktywnego projektu');
    const width=project.facility.widthMm/1000,length=project.facility.lengthMm/1000;
    const floor=new THREE.Mesh(new THREE.BoxGeometry(width,.03,length),new THREE.MeshStandardMaterial({color:'#172b40'}));floor.position.set(width/2,-.025,length/2);scene.add(floor);
    scene.add(new THREE.HemisphereLight(0xffffff,0x334155,2));const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(10,20,10);scene.add(light);
    const equipment=project.layoutObjects.map(o=>createParametricEquipmentGroup(o,{simplifiedBox:project.layoutObjects.length>200}));equipment.forEach(g=>scene.add(g));
    const obstacles=project.obstacles.map(o=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(o.widthMm/1000,o.heightMm/1000,o.lengthMm/1000),new THREE.MeshStandardMaterial({color:'#9a6b3c'}));mesh.position.set((o.xMm+o.widthMm/2)/1000,o.heightMm/2000,(o.yMm+o.lengthMm/2)/1000);scene.add(mesh);return mesh;});
    const sphere=new THREE.SphereGeometry(.12,12,8);
    const indicatorList=(playback?.entries??[]).flatMap(e=>e.anchors.map(a=>{const mesh=new THREE.Mesh(sphere,new THREE.MeshBasicMaterial({color:'#22c55e'}));mesh.position.set(a.xMm/1000,a.zMm/1000,a.yMm/1000);mesh.userData.entryId=e.id;mesh.visible=false;scene.add(mesh);return mesh;}));markers.current=indicatorList;
    const bounds=new THREE.Box3().setFromObject(scene),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
    const resize=()=>{const w=Math.max(1,host.clientWidth),h=420;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();const r=Math.max(size.x,size.z,size.y,1)*1.3/Math.min(1,camera.aspect);camera.position.set(center.x+r*.65,center.y+r,center.z+r*.7);controls.target.copy(center);controls.update();};
    const observer=new ResizeObserver(resize);observer.observe(host);resize();
    let raf=0;const render=()=>{controls.update();renderer.render(scene,camera);raf=requestAnimationFrame(render);};render();
    const onLost=(e:Event)=>{e.preventDefault();setError('Utracono kontekst WebGL. Wyłącz i ponownie włącz widok 3D; wynik harmonogramu pozostaje zachowany.');};renderer.domElement.addEventListener('webglcontextlost',onLost);
    return()=>{cancelAnimationFrame(raf);observer.disconnect();controls.dispose();renderer.domElement.removeEventListener('webglcontextlost',onLost);equipment.forEach(g=>{disposeEquipmentGroup(g);g.traverse(child=>{if((child as THREE.LineSegments).isLineSegments){const line=child as THREE.LineSegments;line.geometry.dispose();(Array.isArray(line.material)?line.material:[line.material]).forEach(m=>m.dispose());}});});[floor,...obstacles].forEach(m=>{m.geometry.dispose();m.material.dispose();});sphere.dispose();indicatorList.forEach(m=>m.material.dispose());markers.current=[];renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();};
  },[project,playback]);
  useEffect(()=>{
    const states=new Map(frame?.states.map(s=>[s.id,s])??[]);
    markers.current.forEach(m=>{const state=states.get(m.userData.entryId);m.visible=!!state&&state.state!=='waiting';if(state)m.material.color.set(m.userData.entryId===selected?'#facc15':colors[state.state]);});
  },[frame,selected,project,playback]);
  return <><div ref={mount} aria-label="Widok 3D projektu z harmonogramu" style={{height:420,minWidth:0}}/>{error&&<p role="alert">{error}</p>}</>;
}
