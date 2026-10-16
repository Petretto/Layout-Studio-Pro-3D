import type {WorkerScheduleResult, WorkerScheduleRun} from './workerSchedule';

export type ConstraintCategory = 'processing' | 'workers' | 'transport' | 'blocking' | 'material' | 'calendar' | 'other';
export interface ConstraintEvidence {
  job: number; operationId: string; stationId: string; copy: number;
  seconds: number; mixed: boolean; detail: string;
}
export interface ConstraintSignal {
  category: ConstraintCategory; label: string; explanation: string; nextStep: string;
  workSeconds: number; singleCauseWaitSeconds: number; mixedWaitCount: number;
  evidence: ConstraintEvidence[];
}
export interface ThroughputExplanation {
  signals: ConstraintSignal[];
  mixedWaitSeconds: number; unclassifiedWaitSeconds: number;
  processingByCopy: {stationId: string; copy: number; seconds: number; share: number}[];
  horizonSeconds: number; transportSeconds: number; transportCount: number;
}
const round = (value: number) => Math.round(value * 1000) / 1000;
const categories: {category: ConstraintCategory; label: string; explanation: string; nextStep: string}[] = [
  {category:'processing',label:'Obróbka / praca technologiczna',explanation:'Praca operacji zajmuje kopie stanowisk. Najdłużej pracująca kopia jest kandydatem do analizy obciążenia; sama zajętość nie dowodzi wpływu na przepustowość.',nextStep:'Porównaj czasy technologiczne i jawne warianty obsady, a następnie sprawdź zmianę w harmonogramie.'},
  {category:'workers',label:'Obsada',explanation:'Oczekiwanie z kodem workers wskazuje brak dostępnych dopuszczonych osób w rozważanym przydziale.',nextStep:'Sprawdź osoby i ich rezerwacje na Gantcie, kompetencje oraz wybrany wariant czasu. Nie zakładaj skrócenia czasu po dodaniu osoby.'},
  {category:'transport',label:'Transport',explanation:'Ruchy mają własny czas; oczekiwanie na transport jest osobnym sygnałem. Sumy czasów ruchów nie są opóźnieniem całej partii.',nextStep:'Sprawdź trasy, dojazdy, powroty i wspólną dostępność załogi/urządzeń. Zweryfikuj zmianę na tych samych warunkach przebiegu.'},
  {category:'blocking',label:'Blokady wyjścia i bufory',explanation:'Blokada po pracy utrzymuje zajętość stanowiska. Kod buffer oznacza oczekiwanie powiązane z pojemnością bufora.',nextStep:'Sprawdź moment zwolnienia odbiorcy i rezerwację miejsca przed wyjazdem oraz jawną politykę zatrzymania operatora.'},
  {category:'material',label:'Materiał i podzespoły',explanation:'Kody material i subassembly wskazują oczekiwanie na zapas lub jawnie zadeklarowaną partię.',nextStep:'Sprawdź stan początkowy, ilości i terminy dostaw oraz zakończenie/transport podzespołu. Nie wyprowadzaj zapasu z BOM.'},
  {category:'calendar',label:'Kalendarze i przerwy',explanation:'Kod calendar dotyczy braku wspólnego okna. Przerwy w realizacji są pokazane osobno od pracy netto.',nextStep:'Sprawdź kalendarze kopii i osób oraz przerwy. Zachowaj rozróżnienie dostępności kalendarzowej i zajętości zasobu.'},
  {category:'other',label:'Pozostałe ograniczenia przydziału',explanation:'Stanowisko, wyposażenie, korpus lub zależności mogą zatrzymać start. Oczekiwanie lokalne na tej samej kopii jest odrębne od blokady wyjścia.',nextStep:'Przejdź do wykonania na Gantcie i sprawdź poprzedników, lokalizację korpusu, wyposażenie oraz zwolnienie kopii.'},
];
function categoryFor(cause: string): ConstraintCategory {
  if(cause==='workers'||cause==='transport'||cause==='calendar')return cause;
  if(cause==='material'||cause==='subassembly')return 'material';
  if(cause==='buffer')return 'blocking';
  return 'other';
}
function causeText(cause: string): string {
  const labels: Record<string,string>={workers:'dostępność obsady',material:'dostępność materiału',subassembly:'dostępność podzespołu',transport:'dostępność transportu',buffer:'miejsce w buforze',calendar:'wspólne okno kalendarzy',station:'dostępność kopii stanowiska',equipment:'dostępność wyposażenia',body:'stan lub lokalizacja korpusu','same-job':'inna operacja tej samej sztuki'};
  return labels[cause]??`nierozpoznana przyczyna (${cause})`;
}
function unionSeconds(windows: {startSeconds: number; endSeconds: number}[]): number {
  const sorted=windows.filter(w=>w.endSeconds>w.startSeconds).sort((a,b)=>a.startSeconds-b.startSeconds);
  let end=-Infinity,total=0;
  for(const w of sorted){total+=Math.max(0,w.endSeconds-Math.max(end,w.startSeconds));end=Math.max(end,w.endSeconds);}
  return total;
}

/** Observed evidence only. Mixed cause lists do not contain per-cause duration data. */
export function explainThroughput(result: WorkerScheduleResult): ThroughputExplanation {
  const signals: ConstraintSignal[]=categories.map(item=>({...item,workSeconds:0,singleCauseWaitSeconds:0,mixedWaitCount:0,evidence:[]}));
  const byCategory=new Map(signals.map(signal=>[signal.category,signal]));
  const byCopy=new Map<string,{stationId:string;copy:number;windows:{startSeconds:number;endSeconds:number}[]}>();
  let mixedWaitSeconds=0,unclassifiedWaitSeconds=0;
  const add=(category:ConstraintCategory,run:WorkerScheduleRun,seconds:number,detail:string,mixed=false)=>{
    if(seconds<=0)return;
    byCategory.get(category)!.evidence.push({job:run.job,operationId:run.operationId,stationId:run.stationId,copy:run.copy,seconds:round(seconds),mixed,detail});
  };
  for(const run of result.runs){
    const windows=run.workWindows?.length?run.workWindows:[];
    const net=unionSeconds([...windows]);
    byCategory.get('processing')!.workSeconds+=net;add('processing',run,net,'Praca technologiczna netto');
    const key=JSON.stringify([run.stationId,run.copy]),copy=byCopy.get(key)??{stationId:run.stationId,copy:run.copy,windows:[]};
    copy.windows.push(...windows);byCopy.set(key,copy);
    for(const [category,seconds,detail] of [
      ['blocking',run.blockedSeconds??0,'Blokada po zakończeniu pracy'],
      ['other',run.continuationWaitSeconds??0,'Oczekiwanie lokalne na tej samej kopii'],
      ['calendar',unionSeconds([...(run.pauses??[])]),'Przerwy podczas realizacji'],
    ] as [ConstraintCategory,number,string][]){byCategory.get(category)!.workSeconds+=seconds;add(category,run,seconds,detail);}
    if(run.waitSeconds>0){
      const causes=[...new Set(run.waitCauses)];
      if(!causes.length){unclassifiedWaitSeconds+=run.waitSeconds;add('other',run,run.waitSeconds,'Oczekiwanie bez zapisanej przyczyny');continue;}
      if(causes.length===1){const category=categoryFor(causes[0]);byCategory.get(category)!.singleCauseWaitSeconds+=run.waitSeconds;add(category,run,run.waitSeconds,`Jedyna zapisana przyczyna: ${causeText(causes[0])}`);}
      else {mixedWaitSeconds+=run.waitSeconds;for(const category of new Set(causes.map(categoryFor))){byCategory.get(category)!.mixedWaitCount++;add(category,run,run.waitSeconds,`Współwystąpienie: ${causes.map(causeText).join(', ')}; czas tej przyczyny nieznany`,true);}}
    }
  }
  // Prefer explicit movements. Do not count the same transport again from run metadata.
  const movements=result.transportMovements?.length?result.transportMovements:result.runs.flatMap(run=>run.transport?[run.transport]:[]);
  const transportSeconds=movements.reduce((sum,item)=>sum+Math.max(0,item.endSeconds-item.startSeconds),0);
  byCategory.get('transport')!.workSeconds=transportSeconds;
  const horizonSeconds=Math.max(0,...result.jobs.map(job=>job.finish));
  const processingByCopy=[...byCopy.values()].map(item=>{const seconds=unionSeconds(item.windows);return {stationId:item.stationId,copy:item.copy,seconds:round(seconds),share:horizonSeconds>0?seconds/horizonSeconds:0};})
    .sort((a,b)=>b.seconds-a.seconds||a.stationId.localeCompare(b.stationId)||a.copy-b.copy);
  for(const signal of signals){signal.workSeconds=round(signal.workSeconds);signal.singleCauseWaitSeconds=round(signal.singleCauseWaitSeconds);}
  return {signals,mixedWaitSeconds:round(mixedWaitSeconds),unclassifiedWaitSeconds:round(unclassifiedWaitSeconds),processingByCopy,horizonSeconds,transportSeconds:round(transportSeconds),transportCount:movements.length};
}
