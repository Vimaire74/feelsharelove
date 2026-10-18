/* Connect — écran « Résonances » : la liste des personnes qui résonnent, puis le détail avec une personne */
const commonTypes=(a,b)=>{const ta=a.types&&a.types.list||[],tb=b.types&&b.types.show!==false&&b.types.list||[];return ta.filter(k=>tb.includes(k));};
Pages.resonances=async function(S,id){
  const {$,esc,fem,dn,INTENT_LABEL}=App;
  const {me,entries}=await App.loadMe();const meName=dn(me);
  if(!id){
    S.innerHTML=`<p class="eyebrow">Résonances</p><h1>Qui résonne avec ${esc(meName)} ?</h1><p class="muted small" style="margin:8px 0 14px">Deux façons de résonner : aimer la même chose, ou chercher la même chose (ce qui console, ce qui fait rire…).</p><div class="filter" style="margin-top:0"><button class="chip" type="button" id="r-verif">Vérifiés seulement</button></div><div id="r-list"></div>`;
    const L=$('r-list');const people=await App.others();for(const p of people)p.entries=await DB.where('entries','profileId',p.id);
    if(!entries.length)L.innerHTML='<div class="empty">Ton portrait n\'a pas encore de passions. Ajoute par exemple un film, ce qu\'il te fait et pourquoi, puis reviens ici.</div>';
    let onlyV=false;const all=people.map(p=>({p,r:App.resonance(entries,p.entries)})).sort((a,b)=>b.r.score-a.r.score);
    const draw=()=>{L.querySelectorAll('.person').forEach(x=>x.remove());all.filter(x=>!onlyV||App.isVerified(x.p)).forEach(({p,r})=>{
      const ct=commonTypes(me,p);const parts=[];if(ct.length)parts.push('vous fonctionnez tous les deux '+ct.map(k=>TYPES.list.find(t=>t.k===k).both).join(' et '));if(r.common.length)parts.push(r.common.map(c=>c.theirs.title).join(', '));if(r.feels.length)parts.push('vous cherchez '+r.feels.map(f=>f.feel.both).join(' et '));
      const line=parts.length?parts.join(' · '):(r.echo.length?'Un écho : '+r.echo[0].theirs.title:'Rien en commun pour l\'instant');
      const d=App.personEl(p,r,`<div class="st" style="font-style:normal;font-family:var(--body);color:var(--muted)">${esc(line)}</div>`);d.addEventListener('click',()=>location.hash='#resonances/'+p.id);L.appendChild(d);});};
    draw();$('r-verif').addEventListener('click',e=>{onlyV=!onlyV;e.target.classList.toggle('on',onlyV);draw();});
    return;}
  const p=await App.loadPerson(id);if(!p||await App.isBlocked(p)){S.innerHTML='<a class="back" href="#resonances">← Toutes les résonances</a><div class="empty">Personne introuvable.</div>';return;}
  const r=App.resonance(entries,p.entries);const f=fem(p);const il=f?'elle':'il';const n=r.common.length+r.feels.length+commonTypes(me,p).length;
  S.innerHTML=`<a class="back" href="#resonances">← Toutes les résonances</a><p class="eyebrow">Résonances</p>
  <h1>${esc(meName)} <span style="color:var(--flame)">&amp;</span> ${esc(dn(p))}</h1>${App.badge(p)}
  <p class="muted" style="margin-top:6px">${esc(p.city)} · ${(p.intent||[]).map(i=>INTENT_LABEL[i].toLowerCase()).join(', ')}</p>
  <div class="pair">${App.avatarHtml(me)}${App.avatarHtml(p)}<div class="count"><b>${n}</b><span>résonance${n>1?'s':''}</span></div></div><div id="body"></div>`;
  const B=$('body');
  const ct=commonTypes(me,p);
  if(ct.length)B.insertAdjacentHTML('beforeend',`<div class="res"><div class="title">Vous fonctionnez tous les deux ${ct.map(k=>TYPES.list.find(t=>t.k===k).both).join(' et ')}</div><div class="types-show">${ct.map(k=>`<span class="ttag t-${k}">${TYPES.name(k)}</span>`).join('')}</div></div>`);
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
