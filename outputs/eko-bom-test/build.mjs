import fs from 'node:fs/promises';
import { FileBlob, SpreadsheetFile, Workbook } from '@oai/artifact-tool';

const root = 'C:/AI/Layout Generator Pro 3D/Layout Generator Pro 3D v0.2';
const source = await SpreadsheetFile.importXlsx(await FileBlob.load(`${root}/tests/Test Eko.xlsx`));
const processRows = source.worksheets.getItemAt(0).getRange('A2:F13').values;
// Synthetic consumption per finished unit, package counts and example unit prices.
const materials = [
  ['OP10', [
    ['Profil stelaża pionowy', 4, 'Pallet', 40, 42],
    ['Poprzeczka stelaża', 6, 'Pallet', 60, 28],
    ['Kątownik łączący stelaż', 8, 'BoxKLT', 100, 4.5],
    ['Śruba M8x20', 32, 'BoxKLT', 500, 0.65],
    ['Nakrętka kołnierzowa M8', 32, 'BoxKLT', 500, 0.48],
  ]],
  ['OP11', [
    ['Rama bazowa', 1, 'Pallet', 8, 320],
    ['Podkładka poziomująca', 4, 'BoxKLT', 100, 2.2],
    ['Wspornik mocowania stelaża', 4, 'BoxKLT', 40, 14],
    ['Śruba M10x30', 8, 'BoxKLT', 200, 1.2],
    ['Podkładka płaska M10', 8, 'BoxKLT', 500, 0.22],
  ]],
  ['OP12', [
    ['Płyta montażowa wewnętrzna', 1, 'Pallet', 20, 185],
    ['Szyna montażowa DIN', 2, 'Tray', 30, 18],
    ['Wiązka przewodów wewnętrzna', 1, 'BoxKLT', 10, 95],
    ['Przepust kablowy', 6, 'BoxKLT', 100, 3.8],
    ['Opaska kablowa', 12, 'BoxKLT', 1000, 0.18],
  ]],
  ['OP13', [
    ['Skrzydło drzwi lewe', 1, 'Pallet', 12, 210],
    ['Zawias drzwi lewych', 3, 'BoxKLT', 60, 9.5],
    ['Komplet uszczelki drzwi lewych', 1, 'Carton', 20, 24],
    ['Zamek drzwi lewych', 1, 'BoxKLT', 40, 32],
    ['Nit zrywalny 4x10', 12, 'BoxKLT', 1000, 0.25],
  ]],
  ['OP14', [
    ['Panel przedni', 1, 'Pallet', 15, 160],
    ['Ramka panelu sterowania', 1, 'Tray', 20, 38],
    ['Przycisk podświetlany', 2, 'BoxKLT', 50, 22],
    ['Tabliczka opisowa panelu', 1, 'Carton', 100, 4.8],
    ['Śruba panelu M4x12', 8, 'BoxKLT', 500, 0.16],
  ]],
  ['OP15', [
    ['Skrzydło drzwi prawe', 1, 'Pallet', 12, 210],
    ['Zawias drzwi prawych', 3, 'BoxKLT', 60, 9.5],
    ['Komplet uszczelki drzwi prawych', 1, 'Carton', 20, 24],
    ['Zamek drzwi prawych', 1, 'BoxKLT', 40, 32],
    ['Śruba zawiasu M5x16', 12, 'BoxKLT', 500, 0.28],
  ]],
  ['OP16', [
    ['Panel tylny', 1, 'Pallet', 15, 145],
    ['Kratka wentylacyjna', 2, 'Carton', 20, 18],
    ['Wkład filtra wentylacyjnego', 2, 'Carton', 40, 12],
    ['Uszczelka panelu tylnego', 1, 'Carton', 30, 19],
    ['Śruba panelu M5x12', 10, 'BoxKLT', 500, 0.24],
  ]],
  ['OP17', [
    ['Panel dachowy', 1, 'Pallet', 12, 190],
    ['Wspornik dachu', 4, 'BoxKLT', 40, 12],
    ['Komplet uszczelnienia dachu', 1, 'Carton', 20, 26],
    ['Śruba dachowa M6x20', 12, 'BoxKLT', 300, 0.42],
    ['Zaślepka otworu dachowego', 4, 'BoxKLT', 200, 1.1],
  ]],
  ['OP18', [
    ['Korpus zespołu górnego', 1, 'Pallet', 8, 280],
    ['Pokrywa zespołu górnego', 1, 'Pallet', 12, 120],
    ['Izolator mocowania zespołu', 4, 'BoxKLT', 100, 5.5],
    ['Złącze zespołu górnego', 2, 'Tray', 40, 16],
    ['Śruba zespołu M6x16', 8, 'BoxKLT', 500, 0.36],
  ]],
  ['OP19', [
    ['Etykieta wyniku testu', 1, 'Carton', 1000, 0.12],
    ['Plomba kontroli jakości', 2, 'BoxKLT', 500, 0.35],
    ['Chusteczka bezpyłowa', 2, 'Carton', 200, 0.45],
    ['Karta pomiarowa wyrobu', 1, 'Carton', 500, 0.08],
    ['Jednorazowa osłona złącza testowego', 2, 'BoxKLT', 100, 0.6],
  ]],
  ['OP20', [
    ['Wspornik zespołu do ramy', 4, 'BoxKLT', 40, 18],
    ['Poduszka wibroizolacyjna', 4, 'BoxKLT', 80, 8.5],
    ['Śruba mocująca M8x35', 8, 'BoxKLT', 200, 0.85],
    ['Podkładka sprężysta M8', 8, 'BoxKLT', 500, 0.19],
    ['Przewód wyrównawczy z końcówkami', 1, 'BoxKLT', 30, 7.8],
  ]],
  ['OP21', [
    ['Paleta transportowa', 1, 'Pallet', 15, 48],
    ['Karton ochronny wyrobu', 1, 'Pallet', 20, 32],
    ['Narożnik ochronny piankowy', 8, 'Carton', 120, 1.4],
    ['Odcinek taśmy spinającej 3 m', 4, 'Carton', 100, 1.65],
    ['Etykieta wysyłkowa', 2, 'Carton', 1000, 0.15],
  ]],
];
const operationIds = processRows.map(row => row[0]);
if (JSON.stringify(operationIds) !== JSON.stringify(materials.map(row => row[0]))) {
  throw new Error('Operacje w źródłowym procesie uległy zmianie.');
}
const rows = materials.flatMap(([operation, items]) => items.map((item, index) => [
  `EKO-${operation}-${String(index + 1).padStart(2, '0')}`,
  item[0], item[1], item[2], item[3], operation, item[4],
]));
const headers = ['Nr Części (Part No)', 'Nazwa Komponentu', 'Ilość na Wyrób', 'Typ Pojemnika', 'Ilość w Opakowaniu', 'Przypisany Krok', 'Koszt Jednostkowy'];
const workbook = Workbook.create();
const sheet = workbook.worksheets.add('BOM');
sheet.getRange('A1:G61').values = [headers, ...rows];
sheet.showGridLines = false;
sheet.freezePanes.freezeRows(1);
const table = sheet.tables.add('A1:G61', true, 'BOM_Eko_Test');
table.showFilterButton = true;
const all = sheet.getRange('A1:G61');
all.format.font = { name: 'Arial', size: 11, color: '#172B4D' };
all.format.rowHeight = 23;
all.format.verticalAlignment = 'center';
sheet.getRange('A1:G1').format.fill = '#17365D';
sheet.getRange('A1:G1').format.font = { name: 'Arial', size: 11, bold: true, color: '#FFFFFF' };
sheet.getRange('A1:G1').format.rowHeight = 34;
sheet.getRange('A1:G1').format.horizontalAlignment = 'center';
sheet.getRange('A1:G1').format.wrapText = true;
for (const [col, width] of [['A',24],['B',46],['C',17],['D',18],['E',21],['F',19],['G',21]]) {
  sheet.getRange(`${col}1:${col}61`).format.columnWidth = width;
}
for (const col of ['C','E']) sheet.getRange(`${col}2:${col}61`).setNumberFormat('0');
sheet.getRange('G2:G61').setNumberFormat('0.00');
for (const col of ['C','E','G']) sheet.getRange(`${col}2:${col}61`).format.horizontalAlignment = 'right';
workbook.recalculate();
console.log((await workbook.inspect({kind:'table',range:'BOM!A1:G7',include:'values,formulas',tableMaxRows:7,tableMaxCols:7,maxChars:2500})).ndjson);
const preview = await workbook.render({sheetName:'BOM',range:'A1:G11',scale:1.5,format:'png'});
await fs.writeFile(`${root}/outputs/eko-bom-test/preview.png`,new Uint8Array(await preview.arrayBuffer()));
await (await SpreadsheetFile.exportXlsx(workbook)).save(`${root}/tests/Test Eko BOM.xlsx`);
console.log(JSON.stringify({file:'tests/Test Eko BOM.xlsx',materials:rows.length,operations:operationIds.length,perOperation:5}));
