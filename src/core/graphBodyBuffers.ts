import type {DomainProjectV6} from './domainProject';
import {applyBodyEvent,type BodyBook,type BodyEvent,type BodyTimeBasis} from './bodyState';
import {applyBufferedBodyEvent} from './bufferedBodyState';
import {applyBufferEvent,bufferHasSpace,createBufferBook,type BufferBook,type BufferRef} from './bufferState';
import type {StationCandidate} from './stationRouting';

/** Capacity overlay for a fixed body spine inside a graph of explicitly assigned subassembly lots.
 * Body, worker, cart and operation admission remain owned by the shared scheduler. */
export class GraphBodyBuffers {
  buffers:BufferBook;
  readonly firstOperationId:string;
  private readonly terminal:string;
  private readonly targets=new Map<string,StationCandidate>();
  private readonly localPrevious=new Map<string,string>();
  constructor(project:DomainProjectV6,orderedIds:readonly string[],candidates:ReadonlyMap<string,readonly StationCandidate[]>) {
    const spine=orderedIds.filter(id=>project.operations.find(operation=>operation.id===id)!.physicalRole?.kind==='body-work');
    if(!spine.length)throw new Error('C2-B3b: bufory korpusów wymagają jawnej ścieżki operacji na korpusie.');
    if(project.operations.some(operation=>!operation.physicalRole))throw new Error('C2-B3b: wymagane jawne role fizyczne wszystkich operacji.');
    if(project.changeoverMatrix)throw new Error('C2-B3b: bufory korpusów z gałęziami i przezbrojeniem wymagają dalszej integracji.');
    for(const id of spine){
      const options=candidates.get(id)!;
      if(options.length!==1)throw new Error('C2-B3b: ścieżka korpusu wymaga jednej jawnej kopii na operację.');
      this.targets.set(id,options[0]);
    }
    const ancestors=(id:string):Set<string>=>{
      const found=new Set<string>(),pending=[...project.operations.find(operation=>operation.id===id)!.predecessorIds];
      while(pending.length){const next=pending.pop()!;if(found.has(next))continue;found.add(next);pending.push(...project.operations.find(operation=>operation.id===next)!.predecessorIds);}
      return found;
    };
    for(let i=1;i<spine.length;i++){
      if(!ancestors(spine[i]).has(spine[i-1]))throw new Error('C2-B3b: operacje korpusu muszą tworzyć jeden uporządkowany ciąg.');
      const a=this.targets.get(spine[i-1])!,b=this.targets.get(spine[i])!;
      if(a.stationId===b.stationId&&a.copy===b.copy)this.localPrevious.set(spine[i],spine[i-1]);
    }
    this.firstOperationId=spine[0];this.terminal=spine[spine.length-1];
    let buffers=createBufferBook(project);
    const places=[...buffers.places];
    for(const place of places){
      if(place.capacity!==null&&!spine.some(id=>{const target=this.targets.get(id)!;return target.stationId===place.stationId&&target.copy===place.copy;}))throw new Error('C2-B3b: skończony bufor poza jawną ścieżką korpusu.');
    }
    for(const target of this.targets.values())for(const side of ['input','output'] as const){
      if(!places.some(place=>place.stationId===target.stationId&&place.copy===target.copy&&place.side===side))places.push({stationId:target.stationId,copy:target.copy,side,capacity:null});
    }
    buffers={...buffers,places};this.buffers=buffers;
    if(this.place(this.terminal,'output').capacity!==null)throw new Error('C2-B3b: ograniczony bufor końcowy wymaga jawnego odbioru gotowych wyrobów.');
    if(project.subassemblyBuffers?.buffers.some(buffer=>buffer.inputCapacity===0))throw new Error('C2-B3b: skończone bufory korpusów z bezpośrednim wejściem podmontażu wymagają dalszej integracji.');
  }
  target(operationId:string){return this.targets.get(operationId)!;}
  localPredecessor(operationId:string){return this.localPrevious.get(operationId);}
  hasLocalNext(operationId:string){return [...this.localPrevious.values()].includes(operationId);}
  inputIsDirect(operationId:string){return this.place(operationId,'input').capacity===0;}
  outputIsDirect(operationId:string){return !this.hasLocalNext(operationId)&&this.place(operationId,'output').capacity===0;}
  outputIsFinite(operationId:string){return this.targets.has(operationId)&&!this.hasLocalNext(operationId)&&this.place(operationId,'output').capacity!==null;}
  holdsWorkers(operationId:string){
    if(!this.targets.has(operationId)||this.hasLocalNext(operationId))return false;
    const place=this.place(operationId,'output');return place.capacity!==null&&place.blockingPolicy==='bbas';
  }
  private place(operationId:string,side:'input'|'output'){const target=this.target(operationId);return this.buffers.places.find(place=>place.stationId===target.stationId&&place.copy===target.copy&&place.side===side)!;}
  hasToken(bodyId:string){return this.buffers.tokens.some(token=>token.id===bodyId);}
  hasInputSpace(operationId:string){return bufferHasSpace(this.buffers,this.place(operationId,'input'));}
  input(bodyId:string,operationId:string,at:number){
    let next=applyBufferEvent(this.buffers,{kind:'reserve',id:bodyId,to:this.place(operationId,'input'),atSeconds:at});
    next=applyBufferEvent(next,{kind:'arrive',id:bodyId,atSeconds:at});this.buffers=next;
  }
  depart(bodies:BodyBook,event:{bodyId:string;fromOperationId?:string;toOperationId:string;atSeconds:number;endSeconds:number;basis:BodyTimeBasis}):BodyBook{
    const to:BufferRef={...this.target(event.toOperationId),side:'input'};
    if(this.inputIsDirect(event.toOperationId)){
      const next=applyBufferedBodyEvent({bodies,buffers:this.buffers},{kind:'depart-direct',bodyId:event.bodyId,atSeconds:event.atSeconds,to,endSeconds:event.endSeconds,basis:event.basis,...(event.fromOperationId?{releaseOperationId:event.fromOperationId}:{})});
      this.buffers=next.buffers;return next.bodies;
    }
    if(event.fromOperationId){
      const next=applyBufferedBodyEvent({bodies,buffers:this.buffers},{kind:'depart-from-operation',bodyId:event.bodyId,atSeconds:event.atSeconds,operationId:event.fromOperationId,to,endSeconds:event.endSeconds,basis:event.basis});
      this.buffers=next.buffers;return next.bodies;
    }
    const reserved=applyBufferedBodyEvent({bodies,buffers:this.buffers},{kind:'reserve-input',bodyId:event.bodyId,atSeconds:event.atSeconds,to});
    const next=applyBufferedBodyEvent(reserved,{kind:'depart',bodyId:event.bodyId,atSeconds:event.atSeconds,endSeconds:event.endSeconds,basis:event.basis});
    this.buffers=next.buffers;return next.bodies;
  }
  arriveDirect(bodies:BodyBook,event:{bodyId:string;operationId:string;atSeconds:number;endSeconds:number;basis:BodyTimeBasis}):BodyBook{
    const next=applyBufferedBodyEvent({bodies,buffers:this.buffers},{kind:'arrive-direct',...event});
    this.buffers=next.buffers;return next.bodies;
  }
  /** Undefined means full or zero-capacity output: keep both the body reservation and station/equipment ownership. */
  event(bodies:BodyBook,event:BodyEvent):BodyBook|undefined{
    if(event.kind==='release'&&this.hasLocalNext(event.operationId))throw new Error('Lokalna kontynuacja wymaga przekazania korpusu dopiero przy starcie następnej operacji.');
    if(event.kind==='reserve'){
      const previousOperationId=this.localPredecessor(event.operationId);
      const body=bodies.bodies.find(body=>body.id===event.bodyId);
      if(previousOperationId&&body?.status==='reserved'&&body.reservation.operationId===previousOperationId){
        const next=applyBufferedBodyEvent({bodies,buffers:this.buffers},{...event,kind:'continue-operation',previousOperationId,location:this.target(event.operationId)});
        this.buffers=next.buffers;return next.bodies;
      }
      if(this.inputIsDirect(event.operationId)){
        const next=applyBufferedBodyEvent({bodies,buffers:this.buffers},{...event,kind:'start-direct'});
        this.buffers=next.buffers;return next.bodies;
      }
    }
    if(event.kind==='release'&&event.operationId===this.terminal)return applyBodyEvent(bodies,event);
    if(event.kind==='release'&&(this.outputIsDirect(event.operationId)||!bufferHasSpace(this.buffers,this.place(event.operationId,'output'))))return undefined;
    const atSeconds=event.atSeconds,bodyId=event.bodyId;
    const transition=event.kind==='release'?{kind:'complete-to-output' as const,bodyId,atSeconds,operationId:event.operationId,to:this.place(event.operationId,'output')}
      :event.kind==='reserve'?{...event,kind:'start-operation' as const}
      :event.kind==='finish-transfer'?{kind:'arrive' as const,bodyId,atSeconds}:undefined;
    if(transition){const next=applyBufferedBodyEvent({bodies,buffers:this.buffers},transition);this.buffers=next.buffers;return next.bodies;}
    if(event.kind==='start-transfer'){
      const to:BufferRef={...event.to,side:'input'};
      const reserved=applyBufferedBodyEvent({bodies,buffers:this.buffers},{kind:'reserve-input',bodyId,atSeconds,to});
      const next=applyBufferedBodyEvent(reserved,{kind:'depart',bodyId,atSeconds,endSeconds:event.endSeconds,basis:event.basis});
      this.buffers=next.buffers;return next.bodies;
    }
    return applyBodyEvent(bodies,event);
  }
}
