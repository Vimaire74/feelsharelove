/* FeelShareLove — écran « Résonances » : la liste des personnes qui résonnent, puis le détail avec une personne */
const commonTypes=(a,b)=>{const ta=a.types&&a.types.list||[],tb=b.types&&b.types.show!==false&&b.types.list||[];return ta.filter(k=>tb.includes(k));};
Pages.resonances=async function(S,id){
  const {$,esc,fem,dn,INTENT_LABEL}=App;
  const {me,entries}=await App.loadMe();const meName='Toi';
  if(!id){
    S.innerHTML=`<p class="eyebrow">Résonances</p><h1>Qui résonne avec moi ?</h1>
    <div class="finder"><div class="search" style="margin-top:12px"><input id="r-q" placeholder="Je cherche… un film, une passion" autocomplete="off"></div>
      <div class="or">ou</div>
      <button class="crit-btn" type="button" id="r-crit" aria-expanded="false"><span id="r-crit-l">Choisir ce que je cherche</span><span aria-hidden="true">▾</span></button>
      <div class="crit-panel" id="r-panel" hidden></div></div>
    <div id="r-info" class="muted small" style="margin:10px 0 4px"></div>${Plus.legendHtml()}<div id="r-list"></div>`;
    const L=$('r-list');const people=await App.others();for(const p of people)p.entries=await DB.where('entries','profileId',p.id);
    const C=window.CATALOGUE,norm=App.norm,WANT=App.WANT;
    /* critères : dans un même groupe, l'un OU l'autre ; entre les groupes, tous à la fois */
    const GROUPS=[
      {k:'want',l:'Envie du moment',o:[['ecoute','Être écouté'],['parler','Parler'],['rire','Rire'],['decouvrir','Découvrir quelqu\'un'],['proposer','Une proposition'],['soiree','Une soirée']]},
      {k:'intent',l:'Ce que je cherche',o:[['parler','Quelqu\'un à qui parler'],['amis','Des amis'],['amour','L\'amour']]},
      {k:'near',l:'Où',o:[['ville','Proche de chez moi'],['pays','Dans mon pays']]},
      {k:'more',l:'Et aussi',o:[['avail','Disponible maintenant'],['verif','Vérifiés seulement'],['reso','Au moins un point commun']]}];
    const KEY='fsl_res_filters';let sel={};try{sel=JSON.parse(localStorage.getItem(KEY)||'{}');}catch(e){}
    GROUPS.forEach(g=>{sel[g.k]=new Set(sel[g.k]||[]);});
    const keep=()=>{try{localStorage.setItem(KEY,JSON.stringify(Object.fromEntries(GROUPS.map(g=>[g.k,[...sel[g.k]]]))));}catch(e){}};
    const cityOf=s=>norm(String(s||'').replace(/\s+[A-Z]{2}$/,'')),countryOf=s=>(String(s||'').match(/\s([A-Z]{2})$/)||[])[1]||'';
    const myCity=cityOf(me.city),myCountry=countryOf(me.city);
    /* force de la résonance : chaque point commun a son poids */
    const all=people.map(p=>{const r=App.resonance(entries,p.entries);const ct=commonTypes(me,p);const ex=Plus.extraCommon(me,p);
      r.n=r.common.length+r.feels.length+ct.length+ex.length;r.pct=Plus.similarity(me,p,entries,p.entries);
      const near=myCity&&cityOf(p.city)===myCity,samec=myCountry&&countryOf(p.city)===myCountry;
      const w=r.score+ct.length+ex.reduce((s,x)=>s+(x.k==='pc'?3:x.k==='pcw'?1:x.k==='inv'?(x.l.includes(':')?1:1):1),0)+(near?2:samec?.5:0)+(App.isAvail(p)?1:0);
      const text=norm([dn(p),p.city,p.now,...p.entries.flatMap(e=>[e.title,e.why,e.desc,e.kind]),...(p.chinois||[]).flatMap(x=>[x.n,x.w]),...(p.invest||[]).map(k=>C.INV[k]&&C.INV[k].l),...(p.rep||[]).map(k=>Plus.repLabel(k,p))].filter(Boolean).join(' | '));
      return {p,r,ct,ex,w,near,samec,text};});
    function panel(){const P=$('r-panel');P.innerHTML=GROUPS.map(g=>`<p class="crit-g">${g.l}</p><div class="crit-o">${g.o.map(([k,l])=>`<button class="chip${sel[g.k].has(k)?' on':''}" type="button" data-g="${g.k}" data-k="${k}">${esc(l)}</button>`).join('')}</div>`).join('')+
      `<div class="row" style="justify-content:space-between;margin-top:12px"><button class="linkbtn" type="button" id="r-clear">Tout enlever</button><button class="btn" type="button" id="r-ok">Voir les résonances</button></div>`;
      P.querySelectorAll('[data-g]').forEach(b=>b.addEventListener('click',()=>{const s=sel[b.dataset.g];s.has(b.dataset.k)?s.delete(b.dataset.k):s.add(b.dataset.k);b.classList.toggle('on');keep();label();draw();}));
      $('r-clear').addEventListener('click',()=>{GROUPS.forEach(g=>sel[g.k].clear());keep();panel();label();draw();});
      $('r-ok').addEventListener('click',()=>toggle(false));}
    function label(){const ls=GROUPS.flatMap(g=>g.o.filter(([k])=>sel[g.k].has(k)).map(([,l])=>l));$('r-crit-l').textContent=ls.length?ls.join(' · '):'Choisir ce que je cherche';$('r-crit').classList.toggle('on',!!ls.length);}
    function toggle(open){$('r-panel').hidden=!open;$('r-crit').setAttribute('aria-expanded',open);if(open)panel();}
    $('r-crit').addEventListener('click',()=>toggle($('r-panel').hidden));
    function draw(){L.innerHTML='';const q=norm($('r-q').value);
      let list=all.filter(x=>{const p=x.p,a=App.isAvail(p);
        if(q&&!q.split(' ').every(w=>x.text.includes(w)))return false;
        if(sel.want.size&&!(a&&p.avail.wants.some(k=>sel.want.has(k))))return false;
        if(sel.intent.size&&!(p.intent||[]).some(k=>sel.intent.has(k)))return false;
        if(sel.near.size&&!((sel.near.has('ville')&&x.near)||(sel.near.has('pays')&&(x.samec||x.near))))return false;
        if(sel.more.has('avail')&&!a)return false;if(sel.more.has('verif')&&!App.isVerified(p))return false;if(sel.more.has('reso')&&!x.r.n)return false;
        return true;}).sort((a,b)=>((b.r.pct||0)-(a.r.pct||0))||(b.w-a.w));
      const n=GROUPS.reduce((s,g)=>s+sel[g.k].size,0);
      $('r-info').textContent=list.length?(list.length+' personne'+(list.length>1?'s':'')+(q||n?' trouvée'+(list.length>1?'s':''):'')+', de la plus forte à la plus faible'):'';
      if(!entries.length&&!q&&!n)L.insertAdjacentHTML('beforeend','<div class="empty">Ton portrait n\'a pas encore de passions. Ajoute par exemple un film, ce qu\'il te fait et pourquoi : les résonances partent de là.</div>');
      if(!list.length){L.insertAdjacentHTML('beforeend','<div class="empty">Personne ne correspond pour l\'instant. Enlève un critère, ou essaie un autre mot.</div>');return;}
      list.forEach(({p,r,ct,ex})=>{let sub=Plus.tagsHtml(r,ct,ex);
        if(q){const e=p.entries.find(e=>norm(e.title+' '+e.why+' '+e.desc).includes(q));if(e)sub=`<div class="rtags"><span class="rtag t-oeuvre">${esc(e.title)}</span></div>`;}
        const d=App.personEl(p,r,sub);d.addEventListener('click',()=>location.hash='#resonances/'+p.id);L.appendChild(d);});}
    $('r-q').addEventListener('input',draw);label();draw();
    return;}
  const p=await App.loadPerson(id);if(!p||await App.isBlocked(p)){S.innerHTML='<a class="back" href="#resonances">← Toutes les résonances</a><div class="empty">Personne introuvable.</div>';return;}
  const r=App.resonance(entries,p.entries);const f=fem(p);const il=f?'elle':'il';const ex=Plus.extraCommon(me,p);const n=r.common.length+r.feels.length+commonTypes(me,p).length+ex.length;const pct=Plus.similarity(me,p,entries,p.entries);
  S.innerHTML=`<a class="back" href="#resonances">← Toutes les résonances</a><p class="eyebrow">Résonances</p>
  <h1>${esc(meName)} <span style="color:var(--flame)">&amp;</span> ${esc(dn(p))}</h1>${App.badge(p)}
  <p class="muted" style="margin-top:6px">${esc(p.city)} · ${(p.intent||[]).map(i=>INTENT_LABEL[i].toLowerCase()).join(', ')}</p>
  <div class="pair">${App.avatarHtml(me)}${App.avatarHtml(p)}<div class="count"><b>${pct!=null?pct+'%':n}</b><span>${pct!=null?'similitude · '+n+' point'+(n>1?'s':'')+' commun'+(n>1?'s':''):'résonance'+(n>1?'s':'')}</span></div></div>${Plus.tagsHtml(r,commonTypes(me,p),ex,99)}<div id="body" style="margin-top:10px"></div>`;
  const B=$('body');
  const ct=commonTypes(me,p);
  if(ct.length)B.insertAdjacentHTML('beforeend',`<div class="res"><div class="title">Vous fonctionnez tous les deux ${ct.map(k=>TYPES.list.find(t=>t.k===k).both).join(' et ')}</div><div class="types-show">${ct.map(k=>`<span class="ttag t-${k}">${TYPES.name(k)}</span>`).join('')}</div></div>`);
  if(ex.length)B.insertAdjacentHTML('beforeend',`<div class="res"><div class="title">Dans vos portraits</div>${ex.map(x=>`<p style="margin:6px 0">${esc(x.l)}${x.mine&&x.mine.id!==x.theirs.id?` <span class="muted">(toi : ${esc(x.mine.n)} · ${esc(dn(p))} : ${esc(x.theirs.n)})</span>`:''}${x.theirs&&x.theirs.why?`<br><span class="muted small">« ${esc(x.theirs.why)} »</span>`:''}</p>`).join('')}</div>`);
  const reply=e=>async txt=>App.sendResultText(p,await App.sendTo(p,txt,e));
  function pairBlock(title,c,sub){const d=document.createElement('div');d.className='res';
    d.innerHTML=`<div class="title">${title}</div>${sub?`<p class="muted small" style="margin:-6px 0 10px">${sub}</p>`:''}<div class="who"><div><div class="n">${esc(meName)}</div>${c.mine!==c.theirs&&c.mine.title!==c.theirs.title&&sub?`<b>${esc(c.mine.title)}</b><br>`:''}${App.feelTags(c.mine)}<p>${esc(c.mine.why)||'<span class="muted">(tu n\'as pas écrit pourquoi)</span>'}</p></div><div><div class="n b">${esc(dn(p))}</div>${sub?`<b>${esc(c.theirs.title)}</b><br>`:''}${App.feelTags(c.theirs)}<p>${esc(c.theirs.why)}</p></div></div>
    <button class="reply" type="button">Répondre à ${esc(dn(p))} sur « ${esc(c.theirs.title)} »</button>
    <div class="compose"><label>Ton message part de son entrée</label><textarea placeholder="Réagis à ce qu'${il} a écrit…"></textarea><button class="btn" type="button" style="margin-top:8px">Envoyer</button><div class="sent"></div></div>`;
    d.querySelector('.reply').addEventListener('click',()=>{d.querySelector('.compose').classList.toggle('on');d.querySelector('textarea').focus();});
    d.querySelector('.compose .btn').addEventListener('click',async()=>{const v=d.querySelector('textarea').value.trim();if(!v)return;const s=d.querySelector('.sent');s.style.display='block';s.innerHTML=await reply(c.theirs)(v);});
    return d;}
  if(!n&&!r.echo.length)B.insertAdjacentHTML('beforeend',`<div class="empty">Rien en commun pour l'instant. ${f?'Elle':'Il'} aime : ${esc(p.entries.map(e=>e.title).join(', '))}. Si l'une de ces choses te parle, ajoute-la à ton portrait avec ce qu'elle te fait.</div>`);
  if(r.common.length){const h=document.createElement('h2');h.innerHTML='Vous aimez <em>la même chose</em>';B.appendChild(h);r.common.forEach(c=>B.appendChild(pairBlock(esc(c.theirs.title),c)));}
  if(r.feels.length){const h=document.createElement('h2');h.innerHTML='Vous cherchez <em>la même chose</em>';B.appendChild(h);r.feels.forEach(c=>B.appendChild(pairBlock('Vous aimez tous les deux '+c.feel.both,c,'Pas la même œuvre, le même effet.')));}
  if(r.echo.length){const h=document.createElement('h2');h.innerHTML='Des <em>échos</em>';B.appendChild(h);r.echo.forEach(c=>B.appendChild(pairBlock(`${esc(c.mine.title)} · ${esc(c.theirs.title)}`,c,'Un mot en commun dans vos titres.')));}
  const used=new Set([...r.common,...r.feels,...r.echo].map(c=>c.theirs.id));const rest=p.entries.filter(e=>!used.has(e.id));
  if(rest.length){const h=document.createElement('h2');h.innerHTML=`Ce qu'${il} a et <em>pas toi</em>`;B.appendChild(h);const L=document.createElement('div');L.className='list';rest.forEach(e=>L.appendChild(App.entryEl(e,{reply:reply(e)})));B.appendChild(L);}
  const act=document.createElement('div');act.className='actions2';act.innerHTML=`<a class="btn ghost" href="#personne/${p.id}">Voir le portrait</a><a class="btn ghost" href="#messages/${p.id}">Conversation</a>`;B.appendChild(act);
};
