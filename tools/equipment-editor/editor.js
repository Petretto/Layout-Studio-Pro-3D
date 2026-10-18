(function(){
  'use strict';
  const api=globalThis.EquipmentBrief,catalog=globalThis.EquipmentCatalog;
  let state=api.blank(),dirty=false;
  const $=s=>document.querySelector(s),get=(o,path)=>path.split('.').reduce((v,k)=>v[k],o);
  const set=(path,value)=>{const keys=path.split('.'),key=keys.pop();keys.reduce((v,k)=>v[k],state)[key]=value;};
  const message=text=>{$('#message').textContent=text;};
  const field=(tag,attributes={})=>{const el=document.createElement(tag);for(const [key,value] of Object.entries(attributes))el.setAttribute(key,value);return el;};
  const label=(text,control)=>{const el=document.createElement('label');el.append(document.createTextNode(text),control);return el;};
  const option=(select,value,text)=>{const el=document.createElement('option');el.value=value;el.textContent=text;select.append(el);};
  for(const item of catalog)option($('#object-type'),item.objectType,`${item.name} (${item.objectType})`);
  for(const [title,path,min] of [['Szerokość X','dimensionsMm.width',0.001],['Głębokość Y','dimensionsMm.length',0.001],['Wysokość Z','dimensionsMm.height',0.001],['Poziom podstawy nad posadzką','coordinates.groundContactZMm',0]]){
    const row=field('div',{class:'measure grid'}),number=field('input',{type:'number',min,step:'any','data-path':`${path}.value`});
    const basis=field('select',{'data-path':`${path}.basis`});
    for(const [value,text] of [['unknown','Nieustalone'],['measured','Pomiar'],['confirmed','Potwierdzone dane'],['catalog','Katalog / dokumentacja'],['assumed','Założenie do sprawdzenia']])option(basis,value,text);
    row.append(label(`${title} [mm]`,number),label('Pochodzenie wartości',basis),label('Źródło / opis założenia',field('input',{'data-path':`${path}.source`})));
    $('#measurements').append(row);
  }
  function readFields(){
    for(const el of document.querySelectorAll('[data-path]')){
      let value=el.value;const path=el.dataset.path;
      if(el.type==='number')value=value===''?null:Number(value);
      else if(path==='equipment.objectType'||path==='appearance.colorHex')value=value.trim()||null;
      set(path,value);
    }
  }
  function renderReferences(){
    $('#references').replaceChildren();
    state.references.forEach((r,i)=>{
      const row=field('div',{class:'reference'}),grid=field('div',{class:'grid'}),kind=field('select');
      kind.setAttribute('aria-label',`Rodzaj materiału ${i+1}`);
      for(const [value,text] of [['photo','Zdjęcie'],['drawing','Rysunek'],['cad','Plik CAD / 3D'],['url','Adres strony'],['other','Inne']])option(kind,value,text);
      kind.value=r.kind;kind.addEventListener('change',()=>{r.kind=kind.value;dirty=true;update();});
      grid.append(label('Rodzaj',kind));
      for(const [key,title] of [['location','Ścieżka / adres / nazwa pliku'],['description','Co przedstawia / uwagi']]){const input=field('input');input.value=r[key];input.addEventListener('input',()=>{r[key]=input.value;dirty=true;update();});grid.append(label(title,input));}
      const remove=field('button',{type:'button'});remove.textContent=`Usuń materiał ${i+1}`;remove.addEventListener('click',()=>{state.references.splice(i,1);dirty=true;renderReferences();update();});
      row.append(grid,remove);$('#references').append(row);
    });
  }
  function preview(){
    const svg=$('#preview');svg.replaceChildren();svg.setAttribute('viewBox','0 0 600 220');
    const w=state.dimensionsMm.width.value,l=state.dimensionsMm.length.value;
    const text=document.createElementNS(svg.namespaceURI,'text');text.setAttribute('x','20');text.setAttribute('y','28');text.textContent=w>0&&l>0?`X ${w} mm × Y ${l} mm`:'Wpisz szerokość i głębokość, aby zobaczyć obrys.';svg.append(text);
    if(!(w>0&&l>0))return;
    const scale=Math.min(520/w,150/l),rect=document.createElementNS(svg.namespaceURI,'rect');
    for(const [k,v] of Object.entries({x:40,y:50,width:w*scale,height:l*scale,fill:'#bbdcef',stroke:'#215f88'}))rect.setAttribute(k,String(v));svg.append(rect);
  }
  function update(){
    const missing=api.missing(state);$('#status').textContent=missing.length?`Karta robocza — do uzupełnienia: ${missing.length}`:'Dane podstawowe uzupełnione — sprawdź źródła i referencje przed modelowaniem.';
    $('#missing').replaceChildren(...missing.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
    $('#json-preview').textContent=JSON.stringify(state,null,2);preview();
  }
  function fill(){for(const el of document.querySelectorAll('[data-path]'))el.value=get(state,el.dataset.path)??'';renderReferences();update();}
  for(const concept of globalThis.EquipmentConcepts??[]){
    const card=field('article'),image=field('img',{src:concept.image,alt:concept.name,loading:'lazy'});image.style.width='100%';
    const heading=field('h3');heading.textContent=concept.name;
    const load=field('button',{type:'button','data-concept':concept.id});load.textContent='Użyj karty koncepcyjnej';
    load.addEventListener('click',()=>{try{const next=api.validate(concept.brief,catalog);if(dirty&&!confirm('Wczytać koncept zamiast niezapisanej karty?'))return;state=next;dirty=true;fill();message('Wczytano koncept. Wymiary są założeniami — sprawdź je i pobierz własny JSON.');}catch(error){message(error.message);}});
    const links=field('p');
    for(const [text,path] of [['Blender',concept.blend],['GLB',concept.glb],['JSON',concept.card],['Inspiracja',concept.source]]){const a=field('a',{href:path});a.textContent=text;if(text==='Inspiracja'){a.target='_blank';a.rel='noopener noreferrer';}else a.setAttribute('download','');links.append(a,document.createTextNode(' · '));}
    card.append(image,heading,load,links);$('#concept-gallery').append(card);
  }
  function download(data,name){const blob=new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json;charset=utf-8'});if(blob.size>1024*1024)throw new Error('Karta przekracza limit 1 MB. Skróć opisy lub zmniejsz liczbę referencji przed eksportem.');const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function exportBrief(){
    readFields();
    if(!$('#brief-form').reportValidity()){message('Popraw wskazane pole. Puste wartości są dozwolone, błędne liczby nie.');return;}
    try{const data=api.validate(state,catalog);download(data,`${data.equipment.id.replace(/[^a-z0-9_-]/gi,'_').slice(0,80)||'wyposazenie'}_karta.json`);dirty=false;message('Przekazano JSON do pobrania. Sprawdź, czy przeglądarka zapisała plik.');}
    catch(error){message(error.message);}
  }
  $('#brief-form').addEventListener('submit',e=>e.preventDefault());
  $('#brief-form').addEventListener('input',()=>{message('');readFields();dirty=true;update();});
  $('#brief-form').addEventListener('change',()=>{message('');readFields();dirty=true;update();});
  $('#export').addEventListener('click',exportBrief);$('#export-bottom').addEventListener('click',exportBrief);
  $('#template').addEventListener('click',()=>download(api.blank(),'szablon_wyposazenia.json'));
  $('#add-reference').addEventListener('click',()=>{if(state.references.length>=100){message('Limit 100 materiałów.');return;}state.references.push({kind:'photo',location:'',description:''});dirty=true;renderReferences();update();});
  $('#import-file').addEventListener('change',async e=>{
    const file=e.target.files[0];if(!file)return;
    try{if(file.size>1024*1024)throw new Error('Limit pliku: 1 MB. Zdjęcia/CAD przekazujesz osobno.');const next=api.validate(JSON.parse((await file.text()).replace(/^\uFEFF/,'')),catalog);if(dirty&&!confirm('Wczytanie zastąpi niezapisane dane formularza. Kontynuować?'))return;state=next;dirty=false;fill();message('Wczytano kartę. Wymiary i założenia zachowano.');}catch(error){message(`Nie wczytano pliku: ${error.message}. Bieżąca karta pozostała bez zmian.`);}finally{e.target.value='';}
  });
  window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
  fill();
})();
