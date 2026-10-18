/* Standalone, versioned modeling brief. No production project or simulation data. */
(function(root){
  'use strict';
  const measurement=()=>({value:null,basis:'unknown',source:''});
  function blank(){return {
    kind:'layout-equipment-modeling-brief',version:1,
    equipment:{id:'',name:'',objectType:null,manufacturer:'',model:''},
    coordinates:{units:'mm',verticalAxis:'z',frontAxis:'+y',anchor:'',groundContactZMm:measurement()},
    dimensionsMm:{width:measurement(),length:measurement(),height:measurement()},
    appearance:{colorHex:null,distinctiveFeatures:''},
    references:[],rights:{author:'',license:'',permissionNotes:''},
    modeling:{triangleBudget:null,serviceAndTransportNotes:''}
  };}
  function validate(input,catalog=[]){
    const template=blank();
    const fail=path=>{throw new Error(`Niepoprawne dane: ${path}`);};
    function visit(value,expected,path){
      if(path==='references'){
        if(!Array.isArray(value)||value.length>100)fail(path);
        value.forEach((r,i)=>{visit(r,{kind:'',location:'',description:''},`${path}[${i}]`);if(!['photo','drawing','cad','url','other'].includes(r.kind))fail(`${path}[${i}].kind`);});return;
      }
      if(expected===null){
        if(value===null)return;
        if(path==='equipment.objectType'){if(typeof value!=='string'||!catalog.some(t=>t.objectType===value))fail(path);return;}
        if(path==='appearance.colorHex'){if(typeof value!=='string'||!/^#[0-9a-f]{6}$/i.test(value))fail(path);return;}
        if(typeof value!=='number'||!Number.isFinite(value))fail(path);
        if(path==='modeling.triangleBudget'){if(!Number.isInteger(value)||value<=0)fail(path);}
        else if(path==='coordinates.groundContactZMm.value'){if(value<0)fail(path);}
        else if(value<=0)fail(path);
        return;
      }
      if(expected&&typeof expected==='object'){
        if(!value||typeof value!=='object'||Array.isArray(value))fail(path);
        const keys=Object.keys(expected);
        if(Object.keys(value).some(k=>!keys.includes(k))||keys.some(k=>!Object.hasOwn(value,k)))fail(path||'struktura pliku');
        for(const key of keys)visit(value[key],expected[key],path?`${path}.${key}`:key);
      }else if(typeof value!==typeof expected||(typeof value==='string'&&value.length>20000))fail(path);
      if(path.endsWith('.basis')&&!['unknown','measured','confirmed','catalog','assumed'].includes(value))fail(path);
    }
    visit(input,template,'');
    if(input.kind!==template.kind||input.version!==1)throw new Error('Nieobsługiwany format lub wersja. To nie jest import projektu Layout Studio.');
    for(const key of ['units','verticalAxis','frontAxis'])if(input.coordinates[key]!==template.coordinates[key])fail(`coordinates.${key}`);
    if(!['','footprint-center','bottom-left','top-left'].includes(input.coordinates.anchor))fail('coordinates.anchor');
    return JSON.parse(JSON.stringify(input));
  }
  function missing(b){
    const result=[];
    if(!b.equipment.id.trim())result.push('Identyfikator wyposażenia');
    if(!b.equipment.name.trim())result.push('Nazwa wyposażenia');
    for(const [label,m] of [['Szerokość',b.dimensionsMm.width],['Głębokość',b.dimensionsMm.length],['Wysokość',b.dimensionsMm.height],['Poziom podstawy',b.coordinates.groundContactZMm]]){
      if(m.value===null)result.push(`${label}: wartość w mm`);
      if(m.basis==='unknown')result.push(`${label}: pochodzenie wartości`);
      if(m.value!==null&&!m.source.trim())result.push(`${label}: źródło lub opis założenia`);
    }
    if(!b.coordinates.anchor)result.push('Punkt bazowy');
    if(!b.appearance.distinctiveFeatures.trim())result.push('Opis charakterystycznego wyglądu');
    if(!b.references.some(r=>r.location.trim()))result.push('Materiał referencyjny (zdjęcie/rysunek/CAD lub lokalizacja)');
    if(!b.rights.license.trim()&&!b.rights.permissionNotes.trim())result.push('Licencja lub opis uprawnień do materiałów');
    return result;
  }
  root.EquipmentBrief={blank,validate,missing};
})(globalThis);
