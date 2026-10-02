import fs from 'node:fs/promises';
import {FileBlob,SpreadsheetFile} from '@oai/artifact-tool';
const root='C:/AI/Layout Generator Pro 3D/Layout Generator Pro 3D v0.2';
const folder=root+'/outputs/eko-process-v04';
const book=await SpreadsheetFile.importXlsx(await FileBlob.load(root+'/backup/v0.3.1_przed_zasobami_20260927_221046/tests/Test Eko.xlsx'));
const sheet=book.worksheets.getItemAt(0);
console.log((await book.inspect({kind:'workbook,sheet,table',maxChars:2500,tableMaxRows:3})).ndjson);
if(process.argv.includes('--preview')){
  const png=await book.render({sheetName:sheet.name,range:'A1:F13',scale:1.5,format:'png'});
  await fs.writeFile(folder+'/before.png',new Uint8Array(await png.arrayBuffer()));
  console.log(JSON.stringify(sheet.getRange('A1:F13').values));process.exit(0);
}
const old=sheet.getRange('A2:F13').values;
if(old.length!==12||old[0][0]!=='OP10')throw Error('Nieoczekiwany format źródła. Odtwórz plik z backupu przed ponownym uruchomieniem.');
const predecessors={
  OP10:[],OP11:['OP10'],OP12:['OP11'],
  OP13:[],OP14:[],OP15:[],OP16:[],OP17:[],OP18:['OP17'],
  OP22:['OP12','OP13'],OP23:['OP12','OP15'],
  OP24:['OP22','OP23','OP14'],OP25:['OP22','OP23','OP16'],
  OP19:['OP24','OP25','OP17'],OP20:['OP19','OP18'],OP21:['OP20']
};
const added=[
  ['OP22','Montaż drzwi lewych na ramie [CZAS TESTOWY]',600,510,90],
  ['OP23','Montaż drzwi prawych na ramie [CZAS TESTOWY]',600,510,90],
  ['OP24','Montaż panelu przedniego na ramie [CZAS TESTOWY]',480,408,72],
  ['OP25','Montaż panelu tylnego na ramie [CZAS TESTOWY]',480,408,72],
];
const rows=[...old.map(r=>r.slice(0,5)),...added].map(r=>[...r,predecessors[r[0]].join(', '),Object.keys(predecessors).filter(id=>predecessors[id].includes(r[0])).join(', ')]);
const tables=sheet.tables.items.map(t=>({name:t.name,style:t.style,showFilterButton:t.showFilterButton,showBandedColumns:t.showBandedColumns}));
for(const t of [...sheet.tables.items])t.delete();
sheet.getRange('G1').copyFrom(sheet.getRange('F1'),'all');
sheet.getRange('G2:G13').copyFrom(sheet.getRange('F2:F13'),'all');
sheet.getRange('A14:F17').copyFrom(sheet.getRange('A10:F13'),'all');
sheet.getRange('G14:G17').copyFrom(sheet.getRange('F10:F13'),'all');
sheet.getRange('G1').values=[['Następnicy']];
sheet.getRange('A2:G17').values=rows;
for(const saved of tables){const t=sheet.tables.add('A1:G17',true,saved.name);t.style=saved.style;t.showFilterButton=saved.showFilterButton;t.showBandedColumns=saved.showBandedColumns;}
sheet.getRange('F1:F17').format.columnWidth=30;
sheet.getRange('G1:G17').format.columnWidth=30;
sheet.getRange('B14:B17').format.wrapText=true;
sheet.getRange('A14:G17').format.rowHeight=44;
sheet.getRange('C14:E17').format.numberFormat='0';
sheet.getRange('I1').values=[['Założenia testu Eko']];
sheet.getRange('I2:I7').values=[
  ['Czasy OP10–OP21: zachowane z pliku użytkownika.'],
  ['OP22–OP25: syntetyczne czasy testowe, nie pomiary.'],
  ['Gałęzie podmontażu mogą ruszyć równolegle z ramą.'],
  ['OP22/OP23 oraz OP24/OP25 mogą pracować równolegle.'],
  ['Sekwencja: dodaj OP22 do poprzedników OP23 (analogicznie OP24 → OP25).'],
  ['Przy usuwaniu zależności usuń ją w obu kolumnach. ID nie wyznacza kolejności.']
];
sheet.getRange('I1:I7').format.columnWidth=100;
sheet.getRange('I1').format.font.bold=true;
book.recalculate();
console.log((await book.inspect({kind:'table',range:sheet.name+'!A1:G17',include:'values,formulas',tableMaxRows:17,tableMaxCols:7,maxChars:5500})).ndjson);
const png=await book.render({sheetName:sheet.name,range:'A1:G17',scale:1.5,format:'png'});
await fs.writeFile(folder+'/after.png',new Uint8Array(await png.arrayBuffer()));
await (await SpreadsheetFile.exportXlsx(book)).save(root+'/tests/Test Eko.xlsx');
