import * as XLSX from 'xlsx';
import { ProcessStep, BOMComponent } from '../models/types';
import { processErrors } from '../validation';
export interface ImportResult<T>{items:T[];read:number;skipped:number;errors:string[]}
const norm=(s:unknown)=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ł/g,'l').toLowerCase().trim();
const num=(v:unknown)=>typeof v==='number'?v:Number(String(v??'').replace(',','.'));
function rows(data:ArrayBuffer){
  if(data.byteLength>10*1024*1024)throw new Error('Limit pliku: 10 MB.');
  const w=XLSX.read(data,{type:'array',raw:true});if(!w.SheetNames.length)throw new Error('Brak arkusza.');
  const r=XLSX.utils.sheet_to_json<unknown[]>(w.Sheets[w.SheetNames[0]],{header:1,defval:'',raw:true});
  if(r.length>5001)throw new Error('Limit importu: 5000 wierszy.');return r;
}
export function importProcess(data:ArrayBuffer):ImportResult<ProcessStep>{
  const all=rows(data),headers=(all.shift()??[]).map(norm),errors:string[]=[],items:ProcessStep[]=[];let skipped=0;const outgoing=new Map<string,string[]>();
  const find=(...names:string[])=>headers.findIndex(h=>names.includes(h));
  const id=find('id','id kroku','stepid'),name=find('nazwa','nazwa operacji','name'),time=find('czas','czas standardowy [s]','time','standardtimeseconds','czas [s]'),va=find('va','wartosc dodana va [s]','va [s]'),nva=find('nva','strata nva [s]','nva [s]'),pred=find('poprzednicy','predecessors','predecessorids'),succ=find('nastepnicy','successors','successorids');
  const missingCols:string[]=[];
  if(id<0)missingCols.push('ID Kroku');
  if(name<0)missingCols.push('Nazwa Operacji');
  if(time<0)missingCols.push('Czas Standardowy [s]');
  if(missingCols.length>0)return {items:[],read:all.length,skipped:all.length,errors:[`Brak wymaganych kolumn procesu: ${missingCols.join(', ')}. Wymagane: ID Kroku, Nazwa Operacji, Czas Standardowy [s].`]};
  all.forEach((r,i)=>{if(r.every(c=>String(c).trim()==='')){skipped++;return;}const t=num(r[time]),v=va>=0&&r[va]!==''?num(r[va]):Number((t*.85).toFixed(4));
    const item:ProcessStep={id:String(r[id]).trim(),name:String(r[name]).trim(),standardTimeSeconds:t,vaTimeSeconds:v,nvaTimeSeconds:nva>=0&&r[nva]!==''?num(r[nva]):Number((t-v).toFixed(4)),sequenceNumber:items.length+1,predecessorIds:pred>=0?String(r[pred]).split(/[,;]/).map(v=>v.trim()).filter(Boolean):[]};
    if(succ>=0)outgoing.set(item.id,String(r[succ]??'').split(/[,;]/).map(v=>v.trim()).filter(Boolean));
    if(!item.id||!item.name||!Number.isFinite(t)||t<=0){errors.push(`Wiersz ${i+2}: wymagane ID, nazwa i dodatni czas.`);skipped++;}else items.push(item);
  });
  for(const [from,targets] of outgoing) for(const to of targets){const target=items.find(s=>s.id===to);if(!target)errors.push(from+': nie istnieje następnik '+to+'.');else if(!target.predecessorIds.includes(from))target.predecessorIds.push(from);}
  if(items.length>500)errors.push('Limit: 500 operacji.');errors.push(...processErrors(items));
  if(!items.length)errors.push('Brak poprawnych operacji.');return {items,read:all.length,skipped,errors};
}
export function importBOM(data:ArrayBuffer,stepIds?:Set<string>):ImportResult<BOMComponent>{
  const all=rows(data),headers=(all.shift()??[]).map(norm),errors:string[]=[],items:BOMComponent[]=[];let skipped=0;
  const find=(...names:string[])=>headers.findIndex(h=>names.includes(h));
  const part=find('nr czesci (part no)','partnumber','nr czesci','part no'),name=find('nazwa komponentu','nazwa','name'),qty=find('ilosc na wyrob','quantityperunit','qty','qty per unit'),cont=find('typ pojemnika','container'),pkg=find('ilosc w opakowaniu','packagequantity','package quantity'),step=find('przypisany krok','krok','associatedprocessstepid','process step'),cost=find('koszt jednostkowy','koszt jednostkowy [$]','unitcost','unit cost');
  const missingCols:string[]=[];
  if(part<0)missingCols.push('Nr Części (Part No)');
  if(name<0)missingCols.push('Nazwa Komponentu');
  if(qty<0)missingCols.push('Ilość na Wyrób');
  if(cont<0)missingCols.push('Typ Pojemnika');
  if(pkg<0)missingCols.push('Ilość w Opakowaniu');
  if(step<0)missingCols.push('Przypisany Krok');
  if(cost<0)missingCols.push('Koszt Jednostkowy');
  if(missingCols.length>0)return {items:[],read:all.length,skipped:all.length,errors:[`Brak wymaganych kolumn BOM: ${missingCols.join(', ')}. Pobierz szablon z przycisku nad tabelą.`]};
  const seen=new Set<string>();
  all.forEach((r,i)=>{if(r.every(c=>String(c).trim()==='')){skipped++;return;}
    const item:BOMComponent={id:`BOM-${i+1}`,partNumber:String(r[part]).trim(),name:String(r[name]).trim(),quantityPerUnit:num(r[qty]),container:String(r[cont]) as BOMComponent['container'],packageQuantity:num(r[pkg]),associatedProcessStepId:String(r[step]).trim(),unitCost:num(r[cost])};
    const key=`${item.partNumber}/${item.associatedProcessStepId}`;
    if(!item.partNumber||!item.name||!Number.isFinite(item.quantityPerUnit)||item.quantityPerUnit<=0||!Number.isInteger(item.packageQuantity)||item.packageQuantity<1||!Number.isFinite(item.unitCost)||item.unitCost<0||!['BoxKLT','Pallet','Tray','Carton'].includes(item.container)){errors.push(`Wiersz ${i+2}: błędna nazwa, ilość, koszt lub pojemnik.`);skipped++;return;}
    if(seen.has(key))errors.push(`Wiersz ${i+2}: powtórzona część i operacja ${key}.`);seen.add(key);
    if(stepIds&&!stepIds.has(item.associatedProcessStepId))errors.push(`Wiersz ${i+2}: brak operacji ${item.associatedProcessStepId}.`);items.push(item);
  });if(!items.length)errors.push('Brak poprawnych pozycji BOM.');return {items,read:all.length,skipped,errors};
}
// Compatibility with the archived views. New UI uses reports and atomic imports.
export function parseProcessStepsFile(d:ArrayBuffer){const r=importProcess(d);if(r.errors.length)throw new Error(r.errors.join('\n'));return r.items;}
export function parseBOMFile(d:ArrayBuffer){const r=importBOM(d);if(r.errors.length)throw new Error(r.errors.join('\n'));return r.items;}
export const processRows=(steps:ProcessStep[])=>steps.map(s=>({'ID Kroku':s.id,'Nazwa Operacji':s.name,'Czas Standardowy [s]':s.standardTimeSeconds,'Wartość Dodana VA [s]':s.vaTimeSeconds,'Strata NVA [s]':s.nvaTimeSeconds,'Poprzednicy':s.predecessorIds.join(', '),'Następnicy':steps.filter(x=>x.predecessorIds.includes(s.id)).map(x=>x.id).join(', ')}));
export const bomRows=(bom:BOMComponent[])=>bom.map(b=>({'Nr Części (Part No)':b.partNumber,'Nazwa Komponentu':b.name,'Ilość na Wyrób':b.quantityPerUnit,'Typ Pojemnika':b.container,'Ilość w Opakowaniu':b.packageQuantity,'Przypisany Krok':b.associatedProcessStepId,'Koszt Jednostkowy':b.unitCost}));

export const TEMPLATE_PROCESS_STEPS:ProcessStep[]=[
  {id:'OP10',name:'Przygotowanie korpusu',standardTimeSeconds:40,vaTimeSeconds:34,nvaTimeSeconds:6,sequenceNumber:1,predecessorIds:[]},
  {id:'OP20',name:'Podmontaż modułu sterowania',standardTimeSeconds:60,vaTimeSeconds:50,nvaTimeSeconds:10,sequenceNumber:2,predecessorIds:['OP10']},
  {id:'OP25',name:'Montaż wiązki elektrycznej',standardTimeSeconds:45,vaTimeSeconds:38,nvaTimeSeconds:7,sequenceNumber:3,predecessorIds:['OP10']},
  {id:'OP30',name:'Montaż końcowy i kontrola',standardTimeSeconds:80,vaTimeSeconds:68,nvaTimeSeconds:12,sequenceNumber:4,predecessorIds:['OP20','OP25']}
];

export const TEMPLATE_BOM_COMPONENTS:BOMComponent[]=[
  {id:'BOM-1',partNumber:'K-001',name:'Korpus główny aluminiowy',quantityPerUnit:1,container:'BoxKLT',packageQuantity:10,associatedProcessStepId:'OP10',unitCost:120},
  {id:'BOM-2',partNumber:'EL-012',name:'Moduł sterownika PCB',quantityPerUnit:1,container:'Tray',packageQuantity:25,associatedProcessStepId:'OP20',unitCost:85.5},
  {id:'BOM-3',partNumber:'W-104',name:'Wiązka przewodów sygnałowych',quantityPerUnit:1,container:'Carton',packageQuantity:50,associatedProcessStepId:'OP25',unitCost:32},
  {id:'BOM-4',partNumber:'S-008',name:'Śruba mocująca M5x16',quantityPerUnit:4,container:'BoxKLT',packageQuantity:200,associatedProcessStepId:'OP30',unitCost:0.45},
  {id:'BOM-5',partNumber:'P-002',name:'Płyta osłonowa dolna',quantityPerUnit:1,container:'Pallet',packageQuantity:40,associatedProcessStepId:'OP30',unitCost:45}
];

export const PROCESS_COLUMN_DOCS:Record<string,string>[]=[
  {'Kolumna':'ID Kroku','Status':'Wymagana','Typ':'Tekst','Jednostka':'—','Opis':'Unikalny identyfikator operacji (np. OP10). Format tekstowy zapobiega ucinaniu zer w arkuszach.'},
  {'Kolumna':'Nazwa Operacji','Status':'Wymagana','Typ':'Tekst','Jednostka':'—','Opis':'Nazwa czynności technologicznej wykonywanej na stanowisku.'},
  {'Kolumna':'Czas Standardowy [s]','Status':'Wymagana','Typ':'Liczba > 0','Jednostka':'sekundy [s]','Opis':'Całkowity czas wykonania operacji przez jedną osobę/stanowisko.'},
  {'Kolumna':'Wartość Dodana VA [s]','Status':'Opcjonalna','Typ':'Liczba >= 0','Jednostka':'sekundy [s]','Opis':'Czas pracy tworzącej wartość. Gdy puste, domyślnie 85% czasu standardowego.'},
  {'Kolumna':'Strata NVA [s]','Status':'Opcjonalna','Typ':'Liczba >= 0','Jednostka':'sekundy [s]','Opis':'Czas bez wartości dodanej. Gdy puste, domyślnie Czas Standardowy − VA.'},
  {'Kolumna':'Poprzednicy','Status':'Opcjonalna','Typ':'Tekst (lista ID)','Jednostka':'—','Opis':'Identyfikatory operacji poprzedzających, oddzielone przecinkiem lub średnikiem (np. OP10 lub OP20, OP25).'},
  {'Kolumna':'Następnicy','Status':'Opcjonalna','Typ':'Tekst (lista ID)','Jednostka':'—','Opis':'Identyfikatory operacji następujących (np. OP30). Relacje z obu kolumn są sumowane w graf procesu.'}
];

export const BOM_COLUMN_DOCS:Record<string,string>[]=[
  {'Kolumna':'Nr Części (Part No)','Status':'Wymagana','Typ':'Tekst','Jednostka':'—','Opis':'Indeks materiałowy części/podzespołu (np. K-001).'},
  {'Kolumna':'Nazwa Komponentu','Status':'Wymagana','Typ':'Tekst','Jednostka':'—','Opis':'Opis słowny materiału lub komponentu.'},
  {'Kolumna':'Ilość na Wyrób','Status':'Wymagana','Typ':'Liczba > 0','Jednostka':'szt. / wyrób','Opis':'Zużycie materiału na jeden gotowy wyrób (może być ułamkowa).'},
  {'Kolumna':'Typ Pojemnika','Status':'Wymagana','Typ':'Wybór','Jednostka':'—','Opis':'Dopuszczalne wartości: BoxKLT (pojemnik KLT), Pallet (paleta), Tray (tacka), Carton (karton).'},
  {'Kolumna':'Ilość w Opakowaniu','Status':'Wymagana','Typ':'Liczba całk. >= 1','Jednostka':'szt. / opak.','Opis':'Liczba sztuk materiału w jednym opakowaniu magazynowo-transportowym.'},
  {'Kolumna':'Przypisany Krok','Status':'Wymagana','Typ':'Tekst (ID operacji)','Jednostka':'—','Opis':'Identyfikator operacji w procesie, na której komponent jest montowany (np. OP10). Musi istnieć w procesie.'},
  {'Kolumna':'Koszt Jednostkowy','Status':'Wymagana','Typ':'Liczba >= 0','Jednostka':'waluta projektu','Opis':'Cena jednostkowa materiału w walucie ustawionej w projekcie (PLN/EUR/USD).'}
];

export function createTemplateWorkbook(kind:'process'|'bom'):XLSX.WorkBook{
  const isProcess=kind==='process';
  const dataRows=isProcess?processRows(TEMPLATE_PROCESS_STEPS):bomRows(TEMPLATE_BOM_COMPONENTS);
  const docRows=isProcess?PROCESS_COLUMN_DOCS:BOM_COLUMN_DOCS;
  const safeData=dataRows.map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k,typeof v==='string'&&/^[=+@\-\t\r]/.test(v)?`'${v}`:v])));
  const safeDocs=docRows.map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k,typeof v==='string'&&/^[=+@\-\t\r]/.test(v)?`'${v}`:v])));
  const book=XLSX.utils.book_new();
  const dataSheet=XLSX.utils.json_to_sheet(safeData);
  const docSheet=XLSX.utils.json_to_sheet(safeDocs);
  XLSX.utils.book_append_sheet(book,dataSheet,'Dane');
  XLSX.utils.book_append_sheet(book,docSheet,'Opis kolumn');
  return book;
}

export function templateWorkbookBytes(kind:'process'|'bom'):ArrayBuffer{
  const book=createTemplateWorkbook(kind);
  return XLSX.write(book,{type:'array',bookType:'xlsx'}) as ArrayBuffer;
}

export function exportTemplate(kind:'process'|'bom',format:'xlsx'|'csv'='xlsx'){
  const isProcess=kind==='process';
  const dataRows=isProcess?processRows(TEMPLATE_PROCESS_STEPS):bomRows(TEMPLATE_BOM_COMPONENTS);
  const filename=`Szablon_${kind}`;
  if(format==='csv'){
    spreadsheet(dataRows,filename,'csv');
    return;
  }
  const book=createTemplateWorkbook(kind);
  XLSX.writeFile(book,`${filename}.xlsx`,{bookType:'xlsx'});
}

export function spreadsheet(data:Record<string,unknown>[],filename:string,format:'xlsx'|'csv'='xlsx'){
  const safe=data.map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k,typeof v==='string'&&/^[=+@\-\t\r]/.test(v)?`'${v}`:v])));
  const sheet=XLSX.utils.json_to_sheet(safe),book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,sheet,'Dane');
  XLSX.writeFile(book,`${filename}.${format}`,{bookType:format});
}
export function exportProcessStepsToExcel(s:ProcessStep[],name:string){spreadsheet(processRows(s),`${name}_Proces`);}
export function exportBOMToExcel(b:BOMComponent[],name:string){spreadsheet(bomRows(b),`${name}_BOM`);}

