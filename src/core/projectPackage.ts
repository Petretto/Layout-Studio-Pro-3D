import {parseProject} from './validation';
import {parseStationProjectV5} from './stationProject';
import {DOMAIN_DRAFT_STORAGE_KEY,readDomainDraft} from './domainDraftStorage';
import {DOMAIN_VARIANTS_STORAGE_KEY,parseDomainVariantLibrary} from './domainVariantComparison';
import {encodeImport} from './importArchive';
import {APP_VERSION,STORAGE_KEYS,createWorkspaceBackup,restoreWorkspaceBackup,sha256Hex,type StoragePort} from './workspaceBackup';

export const PROJECT_PACKAGE_FORMAT='layout-studio-project-package';
export const MAX_PROJECT_PACKAGE_BYTES=25*1024*1024;
export type PackageOrigin='synthetic'|'user'|'mixed'|'unspecified';
export interface ProjectPackageData {
  dataOrigin:PackageOrigin;
  source4Json:string;
  source5Json:string|null;
  draftRaw:string;
  variantsRaw:string|null;
}
export interface ProjectPackage {
  format:typeof PROJECT_PACKAGE_FORMAT;
  formatVersion:1;
  appVersion:string;
  createdAt:string;
  checksumSha256:string;
  data:ProjectPackageData;
}
const fields=['dataOrigin','source4Json','source5Json','draftRaw','variantsRaw'] as const;
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const stableProjectId=(value:unknown)=>{
  if(!record(value)||typeof value.id!=='string'||!value.id.trim())throw new Error('Pakiet wymaga trwałego ID projektu.');
  return value.id;
};
const byteLength=(text:string)=>new TextEncoder().encode(text).byteLength;

/** This wrapper never changes the project schemas or repairs IDs/measurements. */
export function parseProjectPackage(text:string):ProjectPackage {
  if(byteLength(text)>MAX_PROJECT_PACKAGE_BYTES)throw new Error('Pakiet przekracza 25 MB.');
  const raw:unknown=JSON.parse(text);
  if(!record(raw)||raw.format!==PROJECT_PACKAGE_FORMAT||raw.formatVersion!==1)throw new Error('Nieobsługiwany format lub wersja pakietu projektu.');
  if(Object.keys(raw).some(key=>!['format','formatVersion','appVersion','createdAt','checksumSha256','data'].includes(key))||
    typeof raw.appVersion!=='string'||!raw.appVersion.trim()||typeof raw.createdAt!=='string'||!Number.isFinite(Date.parse(raw.createdAt)))throw new Error('Niepoprawny nagłówek pakietu.');
  const supplied=raw.data;
  if(!record(supplied)||Object.keys(supplied).some(key=>!(fields as readonly string[]).includes(key))||
    !['synthetic','user','mixed','unspecified'].includes(String(supplied.dataOrigin))||
    typeof supplied.source4Json!=='string'||typeof supplied.draftRaw!=='string'||
    !(supplied.source5Json===null||typeof supplied.source5Json==='string')||
    !(supplied.variantsRaw===null||typeof supplied.variantsRaw==='string'))throw new Error('Niekompletne dane pakietu.');
  const data:ProjectPackageData={dataOrigin:supplied.dataOrigin as PackageOrigin,source4Json:supplied.source4Json,
    source5Json:supplied.source5Json,draftRaw:supplied.draftRaw,variantsRaw:supplied.variantsRaw};
  if(raw.checksumSha256!==sha256Hex(JSON.stringify(data)))throw new Error('Niezgodna suma SHA-256 pakietu.');
  const projectId=stableProjectId(JSON.parse(data.source4Json));
  parseProject(data.source4Json);
  const draft=readDomainDraft({getItem:()=>data.draftRaw});
  if(draft.status!=='valid')throw new Error(draft.status==='corrupt'?draft.error:'Niepoprawny szkic w pakiecie.');
  if(stableProjectId(draft.saved.project)!==projectId)throw new Error('Szkic i źródło nie mają tego samego ID projektu.');
  if(draft.saved.sourceSchemaVersion===4){
    if(data.source5Json!==null||draft.saved.originalJson!==data.source4Json)throw new Error('Niezgodny dokładny oryginał 4 w pakiecie.');
  }else{
    if(data.source5Json===null||draft.saved.originalJson!==data.source5Json)throw new Error('Brak zgodnego dokładnego oryginału 5.');
    const source5=parseStationProjectV5(data.source5Json);
    if(stableProjectId(source5)!==projectId)throw new Error('Źródła 4 i 5 należą do różnych projektów.');
  }
  if(data.variantsRaw!==null){
    const library=parseDomainVariantLibrary(data.variantsRaw);
    if(library.variants.some(v=>v.originalJson!==draft.saved.originalJson||stableProjectId(v.project)!==projectId))throw new Error('Biblioteka wariantów ma inne źródło lub ID projektu.');
  }
  return {format:PROJECT_PACKAGE_FORMAT,formatVersion:1,appVersion:raw.appVersion,createdAt:raw.createdAt,
    checksumSha256:raw.checksumSha256 as string,data};
}

export function describeProjectPackage(pkg:ProjectPackage){
  const checked=parseProjectPackage(JSON.stringify(pkg));
  const draft=readDomainDraft({getItem:()=>checked.data.draftRaw});
  if(draft.status!=='valid')throw new Error('Niepoprawny szkic.');
  const project=draft.saved.project;
  return {id:project.id,name:project.name,sourceSchemaVersion:draft.saved.sourceSchemaVersion,
    operations:project.operations.length,stations:project.stations.length,workers:project.workers.length,
    variants:checked.data.variantsRaw===null?0:parseDomainVariantLibrary(checked.data.variantsRaw).variants.length,
    dataOrigin:checked.data.dataOrigin};
}

/** Export only the selected draft family, never the unrelated active project/library. */
export function makeProjectPackage(storage:Pick<StoragePort,'getItem'>,
  options:{dataOrigin?:PackageOrigin;source4Json?:string;at?:string}={}):ProjectPackage {
  const draft=readDomainDraft(storage);
  if(draft.status!=='valid')throw new Error('Najpierw zapisz poprawny szkic 6.');
  let source4Json=draft.saved.originalJson,source5Json:string|null=null;
  if(draft.saved.sourceSchemaVersion===5){
    source5Json=draft.saved.originalJson;
    source4Json=options.source4Json??'';
    if(!source4Json){
      const raw=storage.getItem(STORAGE_KEYS.v5Stations);
      if(raw){
        const saved:unknown=JSON.parse(raw);
        if(record(saved)&&typeof saved.originalJson==='string'&&saved.originalJson&&
          JSON.stringify(parseStationProjectV5(JSON.stringify(saved.project)))===JSON.stringify(parseStationProjectV5(source5Json)))source4Json=saved.originalJson;
      }
    }
    if(!source4Json)throw new Error('Źródło 5 nie ma dostępnego oryginału 4. Wskaż oryginalny plik 4 jawnie; nie zostanie odgadnięty.');
  }
  const data:ProjectPackageData={dataOrigin:options.dataOrigin??'unspecified',source4Json,source5Json,
    draftRaw:draft.raw,variantsRaw:storage.getItem(DOMAIN_VARIANTS_STORAGE_KEY)};
  return parseProjectPackage(JSON.stringify({format:PROJECT_PACKAGE_FORMAT,formatVersion:1,appVersion:APP_VERSION,
    createdAt:options.at??new Date().toISOString(),checksumSha256:sha256Hex(JSON.stringify(data)),data}));
}

/** Four family slots replace; the independent v4 scenario library is preserved byte-for-byte. */
export function importProjectPackage(storage:StoragePort,pkg:ProjectPackage,expectedCurrentSnapshot:string){
  const checked=parseProjectPackage(JSON.stringify(pkg)),{data}=checked;
  const at=new Date().toISOString();
  const target=new Map<string,string>([[STORAGE_KEYS.v4Project,JSON.stringify({project:parseProject(data.source4Json),at,
    importSourceBase64:encodeImport(new TextEncoder().encode(data.source4Json))})],
    [DOMAIN_DRAFT_STORAGE_KEY,data.draftRaw]]);
  if(data.source5Json!==null)target.set(STORAGE_KEYS.v5Stations,JSON.stringify({project:parseStationProjectV5(data.source5Json),originalJson:data.source4Json,at,importSourceBase64:''}));
  if(data.variantsRaw!==null)target.set(DOMAIN_VARIANTS_STORAGE_KEY,data.variantsRaw);
  const payload=createWorkspaceBackup({getItem:key=>target.get(key)??null});
  return restoreWorkspaceBackup(storage,payload,{expectedCurrentSnapshot,preserveV4ScenarioLibrary:true});
}
