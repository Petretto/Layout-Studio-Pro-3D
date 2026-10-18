import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
// Compile bundled, verified GLBs for synchronous scene construction/offline use.
// No imported project is allowed to provide arbitrary ObjectLoader JSON.
const base='tools/equipment-editor/concepts',out='src/core/equipment/visualAssets';
mkdirSync(out,{recursive:true});
const recipe=JSON.parse(readFileSync(`${base}/recipes.json`,'utf8'));
for(const model of recipe.models){
  const b=readFileSync(`${base}/${model.id}.glb`);
  const gltf=await new Promise((resolve,reject)=>new GLTFLoader().parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'',resolve,reject));
  writeFileSync(`${out}/${model.id}.json`,JSON.stringify(gltf.scene.toJSON())+'\n');
  console.log('Compiled visual:',model.id);
}
