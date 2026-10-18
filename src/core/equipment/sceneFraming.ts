import {Box3,type Object3D} from 'three';

/** Bounds of visible scene roots, excluding interaction helpers and their descendants. */
export function sceneContentBounds(scene:Object3D,excluded:readonly Object3D[]):Box3{
  const bounds=new Box3();
  scene.updateMatrixWorld(true);
  for(const child of scene.children){
    if(child.visible&&!excluded.includes(child))bounds.expandByObject(child);
  }
  return bounds;
}
