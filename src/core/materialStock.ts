import {validateMaterialSupply, type MaterialSupplyItem} from './materialSupply';
import type {DomainProjectV6} from './domainProject';

export interface MaterialStock {
  supplyId: string; componentId: string; stationId: string; unit: string;
  initialStock: number; delivered: number; consumed: number; stock: number;
}
export interface MaterialStockEvent {
  kind: 'delivery' | 'consumption'; supplyId: string; atSeconds: number; quantity: number;
  job?: number; operationId?: string; deliveryCount?: number; firstDeliverySeconds?: number;
}
interface Reservation {key: string; operationId: string; job: number; at: number; consumed: boolean}
function finite(value: number): number {
  if (!Number.isFinite(value)) throw new Error('Zaopatrzenie: ilość lub czas przekroczyły skończony zakres.');
  return value;
}

// Use the decimal values supplied in the JSON, rather than accumulating binary rounding in stock.
function decimal(value:number):[bigint,number]{
  const [coefficient,exponent='0']=String(value).split('e');
  const [whole,fraction='']=coefficient.split('.');
  let scale=fraction.length-Number(exponent),digits=BigInt(whole+fraction);
  if(scale<0){digits*=10n**BigInt(-scale);scale=0;}
  return [digits,scale];
}
function aligned(a:number,b:number):[bigint,bigint,number]{
  const [x,p]=decimal(a),[y,q]=decimal(b),scale=Math.max(p,q);
  return [x*10n**BigInt(scale-p),y*10n**BigInt(scale-q),scale];
}
function numeric(value:bigint,scale:number){
  const result=finite(Number(`${value}e-${scale}`));
  if(value!==0n&&result===0)throw new Error('Zaopatrzenie: ilość poza reprezentowalnym zakresem.');
  return result;
}
function add(a:number,b:number){const [x,y,scale]=aligned(a,b);return numeric(x+y,scale);}
function subtract(a:number,b:number){const [x,y,scale]=aligned(a,b);return numeric(x-y,scale);}
function multiply(value:number,count:number){const [digits,scale]=decimal(value);return numeric(digits*BigInt(count),scale);}
function ratio(a:number,b:number,ceil=false){const [x,y]=aligned(a,b);return Number(x/y+(ceil&&x%y>0n?1n:0n));}

/** Stock at a declared station is shared by its copies. Queries never mutate observed stock. */
export class MaterialStockRun {
  private readonly items: MaterialSupplyItem[];
  private readonly requirements: NonNullable<ReturnType<typeof validateMaterialSupply>['consumptions']>;
  private readonly reservations: Reservation[] = [];
  private observedAt = -1;
  readonly stocks: MaterialStock[];
  readonly events: MaterialStockEvent[] = [];
  constructor(project: DomainProjectV6) {
    const supply = validateMaterialSupply(project, project.materialSupply);
    this.items = supply.items;this.requirements = supply.consumptions ?? [];
    for (const item of this.items) {
      if (!this.requirements.some(requirement => requirement.supplyId === item.id)) throw new Error(`3.5b: ${item.id} wymaga jawnego zużycia przez operację; nie wyprowadzamy go z BOM.`);
      if (item.schedule.kind === 'periodic' && item.schedule.firstDeliverySeconds === undefined) throw new Error(`3.5b: ${item.id} wymaga jawnego czasu pierwszej dostawy.`);
    }
    this.stocks = this.items.map(item=>({supplyId:item.id,componentId:item.componentId,stationId:item.targetStationId,unit:item.unit,
      initialStock:item.initialStock,delivered:0,consumed:0,stock:item.initialStock}));
  }
  private required(operationId: string, supplyId: string) {
    return this.requirements.find(requirement=>requirement.operationId===operationId&&requirement.supplyId===supplyId)?.quantity ?? 0;
  }
  applies(operationId: string) {return this.requirements.some(requirement=>requirement.operationId===operationId);}
  permits(operationId: string, stationId: string) {
    return this.requirements.filter(requirement=>requirement.operationId===operationId).every(requirement=>
      this.items.find(item=>item.id===requirement.supplyId)!.targetStationId===stationId);
  }
  private count(item: MaterialSupplyItem, at: number) {
    const schedule=item.schedule;
    if(schedule.kind!=='periodic')throw new Error('Zaopatrzenie: oczekiwano cyklicznej dostawy.');
    const count=at<schedule.firstDeliverySeconds!?0:ratio(subtract(at,schedule.firstDeliverySeconds!),schedule.intervalSeconds)+1;
    if(!Number.isSafeInteger(count))throw new Error('Zaopatrzenie: liczba dostaw przekroczyła bezpieczny zakres.');
    return count;
  }
  private delivered(item: MaterialSupplyItem, at: number) {
    const schedule = item.schedule;
    if (schedule.kind === 'explicit-deliveries') return finite(schedule.deliveries.filter(delivery=>delivery.deliveryTimeSeconds<=at).reduce((sum,delivery)=>add(sum,delivery.quantity),0));
    const count=this.count(item,at);
    return multiply(schedule.batchQuantity,count);
  }
  private committed(item: MaterialSupplyItem, at: number) {
    return finite(this.reservations.filter(reservation=>reservation.at<=at).reduce((sum,reservation)=>add(sum,this.required(reservation.operationId,item.id)),0));
  }
  private nextEnough(item: MaterialSupplyItem, needed: number, at: number) {
    const schedule = item.schedule;
    if (schedule.kind === 'periodic') {
      const count = ratio(subtract(needed,item.initialStock),schedule.batchQuantity,true);
      if (!Number.isSafeInteger(count)) throw new Error('Zaopatrzenie: liczba wymaganych dostaw przekroczyła bezpieczny zakres.');
      const next = add(schedule.firstDeliverySeconds!,multiply(schedule.intervalSeconds,count-1));
      if (next<=at) throw new Error('Zaopatrzenie: nie można wyznaczyć późniejszej dostawy w dokładności czasu.');
      return next;
    }
    let stock = add(item.initialStock,this.delivered(item,at));
    for (const delivery of [...schedule.deliveries].sort((a,b)=>a.deliveryTimeSeconds-b.deliveryTimeSeconds)) {
      if (delivery.deliveryTimeSeconds<=at) continue;
      stock = add(stock,delivery.quantity);
      if(stock>=needed)return delivery.deliveryTimeSeconds;
    }
    throw new Error(`Materiał ${item.componentId} (${item.id}): brak wystarczającego zapasu i dalszych dostaw.`);
  }
  /** Preserve already committed future consumptions; no other operation may steal their stock. */
  earliest(operationId: string, from: number): number {
    let at = from;
    for(let attempt=0;attempt<10000;attempt++) {
      let next = at;
      for(const item of this.items) {
        const quantity = this.required(operationId,item.id);if(!quantity)continue;
        const needed = add(this.committed(item,at),quantity);
        if(add(item.initialStock,this.delivered(item,at))<needed) next=Math.max(next,this.nextEnough(item,needed,at));
        for(const reservation of this.reservations.filter(reservation=>reservation.at>at)) {
          if(add(item.initialStock,this.delivered(item,reservation.at))<add(this.committed(item,reservation.at),quantity)) next=Math.max(next,reservation.at);
        }
      }
      if(next===at)return at;
      at=next;
    }
    throw new Error('Zaopatrzenie: przekroczono limit planowania pobrania.');
  }
  reserve(job: number, operationId: string, at: number) {
    if(!this.applies(operationId))return;
    const key=JSON.stringify([job,operationId]);
    if(this.reservations.some(reservation=>reservation.key===key)||this.earliest(operationId,at)!==at)throw new Error('Zaopatrzenie: niepoprawna lub powtórzona rezerwacja pobrania.');
    this.reservations.push({key,job,operationId,at,consumed:false});
  }
  /** Deliveries are advanced before consumption, including at exactly the same timestamp. */
  advance(at: number) {
    if(at<this.observedAt)throw new Error('Zaopatrzenie: cofnięcie czasu zapasu.');
    this.items.forEach((item,index)=>{
      const stock=this.stocks[index],schedule=item.schedule;
      if(schedule.kind==='explicit-deliveries') {
        for(const delivery of [...schedule.deliveries].sort((a,b)=>a.deliveryTimeSeconds-b.deliveryTimeSeconds))if(delivery.deliveryTimeSeconds>this.observedAt&&delivery.deliveryTimeSeconds<=at){
          stock.delivered=add(stock.delivered,delivery.quantity);stock.stock=add(stock.stock,delivery.quantity);
          this.events.push({kind:'delivery',supplyId:item.id,atSeconds:delivery.deliveryTimeSeconds,quantity:delivery.quantity,deliveryCount:1});
        }
      } else {
        const previous=this.count(item,this.observedAt),now=this.count(item,at);
        const count=now-previous;
        if(count>0){
          const quantity=multiply(schedule.batchQuantity,count);stock.delivered=add(stock.delivered,quantity);stock.stock=add(stock.stock,quantity);
          this.events.push({kind:'delivery',supplyId:item.id,atSeconds:add(schedule.firstDeliverySeconds!,multiply(schedule.intervalSeconds,now-1)),
            firstDeliverySeconds:add(schedule.firstDeliverySeconds!,multiply(schedule.intervalSeconds,previous)),quantity,deliveryCount:count});
        }
      }
    });
    this.observedAt=at;
  }
  consume(job: number, operationId: string, at: number) {
    if(!this.applies(operationId))return;
    const reservation=this.reservations.find(reservation=>reservation.job===job&&reservation.operationId===operationId);
    if(!reservation||reservation.at!==at||reservation.consumed)throw new Error('Zaopatrzenie: niezgodne lub powtórzone pobranie.');
    this.advance(at);
    const needed=this.stocks.map(stock=>this.required(operationId,stock.supplyId));
    if(this.stocks.some((stock,index)=>stock.stock<needed[index]))throw new Error('Zaopatrzenie: brak całego zestawu materiałów przy pobraniu.');
    this.stocks.forEach((stock,index)=>{const quantity=needed[index];if(!quantity)return;
      stock.stock=subtract(stock.stock,quantity);stock.consumed=add(stock.consumed,quantity);
      this.events.push({kind:'consumption',supplyId:stock.supplyId,atSeconds:at,quantity,job,operationId});
    });
    reservation.consumed=true;
  }
}
