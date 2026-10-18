import type {LayoutObject} from '../models/types';

export const EQUIPMENT_VISUAL_MODELS = [
  {id:'concept-assembly-bench',name:'Koncept: stanowisko z nadbudową'},
  {id:'concept-shelf-cart',name:'Koncept: wózek półkowy'},
  {id:'concept-parts-rack',name:'Koncept: regał na części'},
] as const;
export type EquipmentVisualModelId = typeof EQUIPMENT_VISUAL_MODELS[number]['id'];
export function isEquipmentVisualModelId(value:unknown):value is EquipmentVisualModelId{
  return typeof value==='string'&&EQUIPMENT_VISUAL_MODELS.some(model=>model.id===value);
}
export function validateEquipmentAppearance(object:{visualModelId?:unknown}){
  if(object.visualModelId!==undefined&&!isEquipmentVisualModelId(object.visualModelId))throw new Error('Nieobsługiwany model wizualny wyposażenia.');
}
/** Change appearance only: no role, dimensions, assignment, or resources are inferred. */
export function applyEquipmentAppearance(objects:LayoutObject[],id:string,modelId:EquipmentVisualModelId|undefined):LayoutObject[]{
  validateEquipmentAppearance({visualModelId:modelId});
  if(!objects.some(o=>o.id===id))throw new Error('Brak obiektu do zmiany wyglądu.');
  return objects.map(o=>{if(o.id!==id)return o;const {visualModelId:_,...base}=o;return modelId?{...base,visualModelId:modelId}:base;});
}
