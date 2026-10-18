import {readFileSync,writeFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const context={};
runInNewContext(readFileSync('tools/equipment-editor/brief.js','utf8'),context);
writeFileSync('tools/equipment-editor/szablon_wyposazenia.json',JSON.stringify(context.EquipmentBrief.blank(),null,2)+'\n');
console.log('Empty equipment brief written; unknown values remain null.');
