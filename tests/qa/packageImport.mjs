import {strict as assert} from 'node:assert';
export function assertComparisonRows(rows,expected){
  assert.equal(rows.length,expected.length,'Porównanie musi zawierać wszystkie oczekiwane warianty');
  for(const item of expected){
    const matches=rows.filter(row=>row.name===item.name);
    assert.equal(matches.length,1,`Brak lub duplikat wariantu ${item.name}`);
    assert.equal(matches[0].visible,true,`Ukryty wynik ${item.name}`);
    assert.equal(matches[0].baseline,item.baseline,`Niewłaściwa baza ${item.name}`);
    assert.equal(matches[0].makespan,`${item.seconds} s`,`Niepoprawny makespan ${item.name}`);
  }
}
export async function prepareProjectImportUi(api){
  const backup=await api.downloaded(()=>api.click('Pobierz kopię ratunkową przed wczytaniem'));
  await api.evaluate(`(()=>{const box=document.querySelector('[aria-label="Pakiet projektu"] input[type=checkbox]');if(!box||box.disabled)throw Error('Brak potwierdzenia kopii');box.click()})()`);
  return backup;
}
export async function importProjectPackageUi(api,path){
  await api.open();await api.upload('[aria-label="Plik pakietu projektu"]',path);
  await api.until(`document.body.textContent.includes('Pakiet poprawny.')`);
  await prepareProjectImportUi(api);
  await api.click('Wczytaj projekt i zastosuj');await api.reload();
}
