(function(root) {
  const el=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
  const line=(label,value)=>el('p',`${label}: ${value||'—'}`,'remediation-note');
  root.renderRemediation=function(data) {
    const r=data.remediation;
    const banner=document.getElementById('releaseStatus');
    const content=document.getElementById('remediationContent');content.replaceChildren();
    const countNote=document.getElementById('kpiActiveTaskNote');
    countNote.textContent='Licznik głównych ID nie mierzy nakładu ani gotowości wydania. Pakiety remediacji liczone osobno.';
    if(!r?.available) {
      banner.textContent='Gotowość V1: niezweryfikowana. '+(r?.reason||'Wczytano sam plan główny. Pełne dane remediacji dostępne w trybie LIVE lub z aktualnego snapshotu.');
      content.append(el('p','Brak kompletu dokumentów remediacji dla tego źródła. Nie łączymy wczytanego planu ze starszymi danymi wbudowanymi.'));
      document.getElementById('kpiCurrentPackage').textContent='Brak danych remediacji';
      document.getElementById('kpiPackageDesc').textContent='Otwórz tryb LIVE, aby odczytać wszystkie źródła.';
      return;
    }
    const open=r.gates.filter(g=>g.status!=='zamknięta');
    banner.textContent=r.accepted?'Bramki odbioru zamknięte według rejestru. Deployment wymaga osobnej zgody właściciela.':
      `V1 nie jest odebrane — otwarte bramki: ${open.map(g=>g.id).join(', ')||'brak; pozostają nieukończone pakiety'}. RC2 i wydanie wymagają ukończenia pakietów i niezależnego odbioru.`;
    document.getElementById('kpiCurrentPackage').textContent=r.next?.id??'Pakiety wykonane';
    document.getElementById('kpiPackageDesc').textContent=r.next?`${r.next.name} — ${r.next.status}`:'Sprawdź bramki odbioru wydania.';
    content.append(el('h3','Plan remediacji RC1 → V1.0.0'));
    content.append(el('p',`${r.stats.done}/${r.stats.total} pakietów wdrożonych · ${r.stats.inProgress} w trakcie · ${r.stats.pending} nierozpoczętych · ${open.length}/${r.gates.length} bramek otwartych.`));
    content.append(el('p',`Zakres do weryfikacji: ${r.findings.length} ustaleń audytu, ${r.testIds.length} scenariuszy testowych i ${r.uiIds.length} kryteriów UI. To planowane kontrole, nie liczba wykonanych testów.`,'remediation-note'));
    content.append(el('h3','Bramki wydania'));
    const gates=el('div',undefined,'remediation-grid');gates.id='releaseGates';
    for(const gate of r.gates) {
      const card=el('article',undefined,'package-card');
      card.append(el('strong',`${gate.id} · ${gate.status}`),el('p',gate.condition),line('Dowód / stan',gate.evidence));gates.append(card);
    }
    content.append(gates,el('h3','Zatwierdzone decyzje właściciela'));
    const decisions=el('div',undefined,'remediation-grid');decisions.id='ownerDecisions';
    for(const d of r.decisions){const card=el('article',undefined,'package-card');card.append(el('strong',d.id),el('p',d.requirement),line('Odbiór',d.acceptance));decisions.append(card);}
    content.append(decisions,el('h3','Pakiety w kolejności realizacji'));
    const packages=el('div',undefined,'remediation-grid');packages.id='remediationPackages';
    for(const pkg of r.packages) {
      const card=el('article',undefined,'package-card');card.dataset.packageId=pkg.id;
      card.append(el('h4',`${pkg.order}. ${pkg.id} — ${pkg.name}`),el('span',pkg.status,'status-badge '+pkg.status.replace(/ /g,'-')),
        line('Zależności',pkg.dependencies.join(', ')||'Brak zależności pakietowych'),el('p',pkg.condition,'remediation-note'));
      const details=el('details');details.append(el('summary','Modele LLM'),line('Analiza',pkg.analysis),line('Implementacja',pkg.implementation),line('Niezależna weryfikacja',pkg.verification));card.append(details);packages.append(card);
    }
    content.append(packages,el('h3','Ustalenia audytu i kryteria zamknięcia'));
    const search=el('input');search.type='search';search.className='search-input';search.setAttribute('aria-label','Szukaj ustalenia audytu');search.placeholder='Szukaj: S-03, BL-01, migracja, Eko…';
    const findings=el('div',undefined,'remediation-findings');findings.id='auditFindings';
    for(const f of r.findings) {
      const details=el('details',undefined,'package-card');details.dataset.search=Object.values(f).join(' ').toLocaleLowerCase('pl');
      details.append(el('summary',f.label+' · '+f.status),line('Dowód i luka',f.evidence),line('Pakiet',f.packages),line('Test',f.test),line('Kryterium zamknięcia',f.closure));findings.append(details);
    }
    search.addEventListener('input',()=>{const q=search.value.toLocaleLowerCase('pl').trim();for(const row of findings.children)row.hidden=!row.dataset.search.includes(q);});
    content.append(search,findings,el('h3','Dokumenty źródłowe'));
    const documents=el('ul');documents.id='remediationDocuments';
    for(const source of data.sources??[]) {
      const item=el('li');const link=el('a',source.path.split('/').pop());
      link.href=location.protocol.startsWith('http')?'/documents/'+source.path.split('/').pop():'../'+source.path;
      link.target='_blank';link.rel='noopener';item.append(link);documents.append(item);
    }
    content.append(documents);
  };
})(globalThis);
