/** Presentation routes only: no project selection, migration or data mutation. */
export const APP_AREAS = [
  {id:'home',label:'Pulpit',views:[{id:'dashboard',label:'Pulpit'}]},
  {id:'demand',label:'Popyt i materiały',views:[{id:'demand',label:'Popyt i takt'},{id:'bom',label:'Materiały (BOM)'}]},
  {id:'process',label:'Proces i stanowiska',views:[{id:'process',label:'Operacje'},{id:'flow',label:'Przepływ'},{id:'stations',label:'Stanowiska i zasoby'}]},
  {id:'balance',label:'Bilansowanie',views:[{id:'balance',label:'Bilans i Yamazumi'}]},
  {id:'hall',label:'Hala i symulacja',views:[{id:'layout',label:'Hala i CAD 2D'},{id:'simulation',label:'3D i symulacja'}]},
  {id:'report',label:'Raporty i eksport',views:[{id:'report',label:'Raport projektu'}]},
] as const;
export type AreaId = typeof APP_AREAS[number]['id'];
export function areaForView(view:string){return APP_AREAS.find(area=>area.views.some(v=>v.id===view))??APP_AREAS[0];}
export function areaDestination(areaId:AreaId,currentView:string,remembered:Partial<Record<AreaId,string>>){
  const area=APP_AREAS.find(item=>item.id===areaId)!;
  if(area.views.some(v=>v.id===currentView))return currentView;
  const previous=remembered[areaId];
  return previous&&area.views.some(v=>v.id===previous)?previous:area.views[0].id;
}
