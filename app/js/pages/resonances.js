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
      {k:'intent',l:'Ce que je cherche',o:[['parler','Quelqu\'un à qui parler'],['amis','Des amis'],['amour','L\'amour']]},
      {k:'near',l:'Où',o:[['ville','À moins de 100 km'],['pays','Dans mon pays']]},
      {k:'min',l:'Résonance d\'au moins',one:true,o:[100,90,80,70,60,50,40,30,20,10].map(n=>[String(n),n+' %'])},
      {k:'more',l:'Et aussi',o:[['verif','Vérifiés seulement (partout)'],['reso','Au moins un point commun']]}];
    const KEY='fsl_res_filters';let sel={};try{sel=JSON.parse(localStorage.getItem(KEY)||'{}');}catch(e){}
    GROUPS.forEach(g=>{sel[g.k]=new Set(sel[g.k]||[]);});
    /* « Vérifiés seulement » est commun à toute l'app */
    if(App.verifOnly())sel.more.add('verif');else sel.more.delete('verif');
    let hid=await App.hiddenList(),shown=20,showHidden=false;
    const keep=()=>{App.verifOnly(sel.more.has('verif'));try{localStorage.setItem(KEY,JSON.stringify(Object.fromEntries(GROUPS.map(g=>[g.k,[...sel[g.k]]]))));}catch(e){}};
    const cityOf=s=>norm(String(s||'').replace(/\s+[A-Z]{2}$/,'')),countryOf=s=>(String(s||'').match(/\s([A-Z]{2})$/)||[])[1]||'';
    const myCity=cityOf(me.city),myCountry=countryOf(me.city);
    /* force de la résonance : chaque point commun a son poids */
    const all=people.map(p=>{const r=App.resonance(entries,p.entries);const ct=commonTypes(me,p);const ex=Plus.extraCommon(me,p);
      r.n=r.common.length+r.feels.length+ct.length+ex.length;r.pct=Plus.similarity(me,p,entries,p.entries);
      const near=p.km!=null?p.km<=100:(myCity&&cityOf(p.city)===myCity),samec=myCountry&&countryOf(p.city)===myCountry;
      const w=r.score+ct.length+ex.reduce((s,x)=>s+(x.k==='pc'?3:x.k==='pcw'?1:x.k==='inv'?(x.sub?1:.4):1),0)+(near?2:samec?.5:0);
      const text=norm([dn(p),p.city,p.now,...p.entries.flatMap(e=>[e.title,e.why,e.desc,e.kind]),...(p.chinois||[]).flatMap(x=>[x.n,x.w]),...C.fixInv(p.invest).map(k=>C.INV[k]&&C.INV[k].l),...(p.rep||[]).map(k=>Plus.repLabel(k,p))].filter(Boolean).join(' | '));
      return {p,r,ct,ex,w,near,samec,text};});
    function panel(){const P=$('r-panel');P.innerHTML=GROUPS.map(g=>`<p class="crit-g">${g.l}</p><div class="crit-o">${g.o.map(([k,l])=>`<button class="chip${sel[g.k].has(k)?' on':''}" type="button" data-g="${g.k}" data-k="${k}">${esc(l)}</button>`).join('')}</div>`).join('')+
      `<div class="row" style="justify-content:space-between;margin-top:12px"><button class="linkbtn" type="button" id="r-clear">Tout enlever</button><button class="btn" type="button" id="r-ok">Voir les résonances</button></div>`;
      P.querySelectorAll('[data-g]').forEach(b=>b.addEventListener('click',()=>{const g=b.dataset.g,s=sel[g],one=GROUPS.find(x=>x.k===g).one,had=s.has(b.dataset.k);
        if(one){s.clear();P.querySelectorAll(`[data-g="${g}"]`).forEach(x=>x.classList.remove('on'));}
        if(had)s.delete(b.dataset.k);else{s.add(b.dataset.k);b.classList.add('on');}if(had&&!one)b.classList.remove('on');keep();label();shown=20;draw();}));
      $('r-clear').addEventListener('click',()=>{GROUPS.forEach(g=>sel[g.k].clear());keep();panel();label();draw();});
      $('r-ok').addEventListener('click',()=>toggle(false));}
    function label(){const ls=GROUPS.flatMap(g=>g.o.filter(([k])=>sel[g.k].has(k)).map(([,l])=>g.k==='min'?'au moins '+l:l));$('r-crit-l').textContent=ls.length?ls.join(' · '):'Choisir ce que je cherche';$('r-crit').classList.toggle('on',!!ls.length);}
    function toggle(open){$('r-panel').hidden=!open;$('r-crit').setAttribute('aria-expanded',open);if(open)panel();}
    $('r-crit').addEventListener('click',()=>toggle($('r-panel').hidden));
    function draw(){L.innerHTML='';const q=norm($('r-q').value);
      const hidSet=new Set(hid.map(l=>l.target)),minP=sel.min.size?+[...sel.min][0]:0;
      let list=all.filter(x=>{const p=x.p,a=App.isAvail(p);
        if(hidSet.has(p.id))return false;if(minP&&(x.r.pct||0)<minP)return false;if(!App.langOk(me,p,x.r.pct))return false;
        if(q&&!q.split(' ').every(w=>x.text.includes(w)))return false;
        if(sel.intent.size&&!(p.intent||[]).some(k=>sel.intent.has(k)))return false;
        if(sel.near.size&&!((sel.near.has('ville')&&x.near)||(sel.near.has('pays')&&(x.samec||x.near))))return false;
        if(sel.more.has('verif')&&!App.isVerified(p))return false;if(sel.more.has('reso')&&!x.r.n)return false;
        return true;}).sort((a,b)=>((b.r.pct||0)-(a.r.pct||0))||(b.w-a.w));
      const n=GROUPS.reduce((s,g)=>s+sel[g.k].size,0);
      $('r-info').textContent=list.length?(list.length+' personne'+(list.length>1?'s':'')+(q||n?' trouvée'+(list.length>1?'s':''):'')+', de la plus forte à la plus faible'):'';
      if(!entries.length&&!q&&!n)L.insertAdjacentHTML('beforeend','<div class="empty">Ton portrait n\'a pas encore de passions. Ajoute par exemple un film, ce qu\'il te fait et pourquoi : les résonances partent de là.</div>');
      if(!list.length){L.insertAdjacentHTML('beforeend','<div class="empty">Personne ne correspond pour l\'instant. Enlève un critère, ou essaie un autre mot.</div>');hiddenBlock();return;}
      const total=list.length;list=list.slice(0,shown);
      list.forEach(({p,r,ct,ex})=>{let sub=Plus.tagsHtml(r,ct,ex);const lt=App.langTag(me,p);if(lt)sub=`<div class="rtags">${lt}</div>`+sub;
        if(q){const e=p.entries.find(e=>norm(e.title+' '+e.why+' '+e.desc).includes(q));if(e)sub=`<div class="rtags"><span class="rtag t-oeuvre">${esc(e.title)}</span></div>`;}
        sub+=`<button class="linkbtn r-hide" type="button" style="font-size:13px;margin-top:4px">Cacher pour le moment</button>`;
        const d=App.personEl(p,r,sub);d.addEventListener('click',ev=>{if(ev.target.closest('.r-hide'))return;location.hash='#resonances/'+p.id;});
        d.querySelector('.r-hide').addEventListener('click',async ev=>{ev.stopPropagation();await App.hideAdd(p);hid=await App.hiddenList();draw();});L.appendChild(d);});
      if(total>list.length){const b=document.createElement('button');b.className='btn ghost';b.type='button';b.style.cssText='width:100%;margin-top:10px';b.textContent='Voir plus ('+(total-list.length)+')';b.addEventListener('click',()=>{shown+=20;draw();});L.appendChild(b);}
      hiddenBlock();}
    /* personnes cachées pour le moment : on peut les faire revenir */
    function hiddenBlock(){if(!hid.length)return;const w=document.createElement('div');w.style.marginTop='18px';
      w.innerHTML=`<button class="linkbtn" type="button">${showHidden?'Ne plus montrer':'Montre-moi'} ceux que j'ai cachés (${hid.length})</button><div></div>`;
      w.querySelector('button').addEventListener('click',()=>{showHidden=!showHidden;draw();});
      if(showHidden){const box=w.querySelector('div');hid.forEach(l=>{const x=all.find(a=>a.p.id===l.target);if(!x)return;
        const d=App.personEl(x.p,x.r,`<p class="muted small" style="margin:2px 0 0">Caché jusqu'au ${new Date(l.until).toLocaleDateString(I18N.locale(),{day:'numeric',month:'long'})}</p><button class="linkbtn r-show" type="button" style="font-size:13px">Ne plus cacher</button>`);
        d.addEventListener('click',ev=>{if(ev.target.closest('.r-show'))return;location.hash='#resonances/'+x.p.id;});
        d.querySelector('.r-show').addEventListener('click',async ev=>{ev.stopPropagation();await DB.del('lists',l.id);hid=await App.hiddenList();draw();});box.appendChild(d);});}
      L.appendChild(w);}
    $('r-q').addEventListener('input',()=>{shown=20;draw();});label();draw();
    return;}
  const p=await App.loadPerson(id);if(p)S.classList.toggle('tribe-bg',!!p.intimate);if(!p||await App.isBlocked(p)){S.innerHTML='<a class="back" href="#resonances">← Toutes les résonances</a><div class="empty">Personne introuvable.</div>';return;}
  const r=App.resonance(entries,p.entries);const f=fem(p);const il=f?'elle':'il';const ex=Plus.extraCommon(me,p);const n=r.common.length+r.feels.length+commonTypes(me,p).length+ex.length;const pct=Plus.similarity(me,p,entries,p.entries);
  S.innerHTML=`<a class="back" href="#resonances">← Toutes les résonances</a><p class="eyebrow">Résonances</p>
  <h1>${esc(meName)} <span style="color:var(--flame)">&amp;</span> ${esc(dn(p))}</h1>${App.badge(p)}
  <p class="muted" style="margin-top:6px">${esc(App.place(p))} · ${App.shownIntent(p.intent).map(i=>INTENT_LABEL[i].toLowerCase()).join(', ')}</p>
  <div class="pair">${App.avatarHtml(p.intimate&&me.photoIntimate===true&&me.photoReal?{...me,photo:me.photoReal}:me)}${App.avatarHtml(p)}<div class="count"><b>${pct!=null?pct+'%':n}</b><span>${pct!=null?'similitude · '+n+' point'+(n>1?'s':'')+' commun'+(n>1?'s':''):'résonance'+(n>1?'s':'')}</span></div></div>${App.langTag(me,p)?`<div class="rtags">${App.langTag(me,p)}</div>`:''}${Plus.tagsHtml(r,commonTypes(me,p),ex,99)}<div class="tb" id="tribe"></div><div id="body" style="margin-top:10px"></div>`;
  const B=$('body');App.tribeBox(p,$('tribe'));
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
  if(!n)B.insertAdjacentHTML('beforeend',`<div class="empty">Rien en commun pour l'instant. ${f?'Elle':'Il'} aime : ${esc(p.entries.map(e=>e.title).join(', '))}. Si l'une de ces choses te parle, ajoute-la à ton portrait avec ce qu'elle te fait.</div>`);
  if(r.common.length){const h=document.createElement('h2');h.innerHTML='Vous aimez <em>la même chose</em>';B.appendChild(h);r.common.forEach(c=>B.appendChild(pairBlock(esc(c.theirs.title),c)));}
  if(r.feels.length){const h=document.createElement('h2');h.innerHTML='Vous cherchez <em>la même chose</em>';B.appendChild(h);r.feels.forEach(c=>B.appendChild(pairBlock('Vous aimez tous les deux '+c.feel.both,c,'Pas la même œuvre, le même effet.')));}
  const used=new Set([...r.common,...r.feels].map(c=>c.theirs.id));const rest=p.entries.filter(e=>!used.has(e.id));
  if(rest.length){const h=document.createElement('h2');h.innerHTML=`Ce qu'${il} a et <em>pas toi</em>`;B.appendChild(h);const L=document.createElement('div');L.className='list';rest.forEach(e=>L.appendChild(App.entryEl(e,{reply:reply(e),metoo:d=>Plus.meToo(d,e,p)})));B.appendChild(L);}
  const act=document.createElement('div');act.className='actions2';act.innerHTML=`<a class="btn ghost" href="#personne/${p.id}">Voir le portrait</a><a class="btn ghost" href="#messages/${p.id}">Conversation</a>`;B.appendChild(act);
};
