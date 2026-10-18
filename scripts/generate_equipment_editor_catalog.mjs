import {build} from 'esbuild';
import {writeFileSync} from 'node:fs';
// Build-time snapshot only: never seed the form with built-in/example dimensions.
const result=await build({entryPoints:['src/core/equipment/equipmentStandard.ts'],bundle:true,write:false,platform:'node',format:'cjs'});
const module={exports:{}};
new Function('module','exports',result.outputFiles[0].text)(module,module.exports);
const types=Object.entries(module.exports.DEFAULT_EQUIPMENT_SPECS).map(([objectType,spec])=>({objectType,name:spec.name}));
writeFileSync('tools/equipment-editor/catalog.js',`// Generated from equipmentStandard.ts; regenerate with node scripts/generate_equipment_editor_catalog.mjs\nglobalThis.EquipmentCatalog = ${JSON.stringify(types,null,2)};\n`);
console.log(`Catalog: ${types.length} types; no dimensions copied.`);
