import { FacilityConfig, LayoutObject, Obstacle } from '../models/types';
import { corners } from '../algorithms/layoutEngine';
export function exportToDxf(f:FacilityConfig,objects:LayoutObject[],name:string,obstacles:Obstacle[]=[]){
  const lines=['0','SECTION','2','HEADER','9','$ACADVER','1','AC1021','9','$INSUNITS','70','4','0','ENDSEC','0','SECTION','2','ENTITIES'];
  const rectangle=(o:Parameters<typeof corners>[0],layer:string,label:string)=>{
    lines.push('0','LWPOLYLINE','100','AcDbEntity','8',layer,'100','AcDbPolyline','90','4','70','1');
    corners(o).forEach(p=>lines.push('10',String(p.x),'20',String(-p.y)));
    lines.push('0','TEXT','100','AcDbEntity','8',layer,'100','AcDbText','10',String(o.xMm),'20',String(-o.yMm),'30','0','40','120','1',label.replace(/[\r\n]/g,' '));
  };
  rectangle({xMm:0,yMm:0,widthMm:f.widthMm,lengthMm:f.lengthMm},'FACILITY',name);
  objects.forEach(o=>rectangle(o,o.type.includes('FIFO')?'LOGISTICS':o.type==='OperatorErgoMat'?'OPERATORS':'EQUIPMENT',`${o.name} ${o.widthMm}x${o.lengthMm} mm`));
  obstacles.forEach(o=>rectangle(o,'OBSTACLES',o.name));
  lines.push('0','ENDSEC','0','EOF');return lines.join('\n');
}
