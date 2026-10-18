import {useEffect,useState} from 'react';
import type {LayoutObject} from '../../core/models/types';
import {EQUIPMENT_VISUAL_MODELS,type EquipmentVisualModelId} from '../../core/equipment/equipmentAppearance';

export function EquipmentAppearanceEditor({object,onApply,blockedByDraft=false}:{object:LayoutObject;onApply:(id:EquipmentVisualModelId|undefined)=>void;blockedByDraft?:boolean}){
  const [choice,setChoice]=useState<EquipmentVisualModelId|''>(object.visualModelId??'');
  useEffect(()=>setChoice(object.visualModelId??''),[object.id,object.visualModelId]);
  return <section className="panel" aria-label="Wygląd wyposażenia 6.4"><h3>Wygląd wyposażenia</h3><label className="field">Model wizualny<select aria-label="Model wizualny wyposażenia" value={choice} onChange={e=>setChoice(e.target.value as EquipmentVisualModelId|'')}><option value="">Generowany według typu obiektu</option>{EQUIPMENT_VISUAL_MODELS.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label><button type="button" disabled={blockedByDraft||choice===(object.visualModelId??'')} onClick={()=>onApply(choice||undefined)}>Zastosuj wygląd</button>{blockedByDraft&&<p role="status">Najpierw zapisz lub anuluj niezapisane zmiany obiektu, aby ich nie utracić.</p>}<p className="muted">Zmienia tylko wygląd. Typ {object.type}, przypisanie do stanowiska i zapisane gabaryty pozostają bez zmiany. Koncept zachowuje proporcje i mieści się w tych gabarytach; może nie wypełniać całego obrysu. Nie jest konfiguracją części ani potwierdzeniem możliwości maszyny.</p></section>;
}
