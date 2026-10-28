import * as THREE from 'three';
import bench from './visualAssets/concept-assembly-bench.json';
import cart from './visualAssets/concept-shelf-cart.json';
import rack from './visualAssets/concept-parts-rack.json';
import shelvingRack from './visualAssets/concept-shelving-rack.json';
import palletRackSingle from './visualAssets/concept-pallet-rack-single.json';
import palletRackDouble from './visualAssets/concept-pallet-rack-double.json';
import industrialModule from './visualAssets/concept-industrial-module.json';
import powerSubassembly from './visualAssets/concept-power-subassembly.json';
import driveSubassembly from './visualAssets/concept-drive-subassembly.json';
import assemblyFixture from './visualAssets/concept-assembly-fixture.json';
import type {EquipmentVisualModelId} from './equipmentAppearance';

const assets: Record<EquipmentVisualModelId, any> = {
  'concept-assembly-bench': bench,
  'concept-shelf-cart': cart,
  'concept-parts-rack': rack,
  'concept-shelving-rack': shelvingRack,
  'concept-pallet-rack-single': palletRackSingle,
  'concept-pallet-rack-double': palletRackDouble,
  'concept-industrial-module': industrialModule,
  'concept-power-subassembly': powerSubassembly,
  'concept-drive-subassembly': driveSubassembly,
  'concept-assembly-fixture': assemblyFixture,
};
const templates = new Map<EquipmentVisualModelId, THREE.Object3D>();

/** Bundled source meshes only. Preserve proportions inside the existing physical envelope. */
export function createConceptVisual(id:EquipmentVisualModelId,width:number,length:number,height:number,wireframe=false):THREE.Group{
  if(!assets[id])throw new Error('Nieobsługiwany model wizualny wyposażenia.');
  if(![width,length,height].every(n=>Number.isFinite(n)&&n>0))throw new Error('Niepoprawne gabaryty obiektu.');
  let template=templates.get(id);
  if(!template){template=new THREE.ObjectLoader().parse(assets[id]);templates.set(id,template);}
  const model=template.clone(true);
  // Instances own GPU resources: disposing one scene cannot invalidate another.
  model.traverse(o=>{const mesh=o as THREE.Mesh;if(!mesh.isMesh)return;mesh.geometry=mesh.geometry.clone();const clone=(m:THREE.Material)=>{const result=m.clone();if('wireframe' in result)(result as THREE.MeshStandardMaterial).wireframe=wireframe;return result;};mesh.material=Array.isArray(mesh.material)?mesh.material.map(clone):clone(mesh.material);});
  model.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
  model.position.sub(new THREE.Vector3(center.x,bounds.min.y,center.z));
  const visual=new THREE.Group();visual.name=`equipment-visual:${id}`;visual.userData.visualModelId=id;visual.userData.fitMode='uniform-inside-envelope';
  visual.add(model);
  // Blender front +Y becomes glTF -Z; orient the visual front towards hall +Y / Three +Z.
  visual.rotation.y=Math.PI;
  visual.scale.setScalar(Math.min(width/size.x,length/size.z,height/size.y));
  return visual;
}
