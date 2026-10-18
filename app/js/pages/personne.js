/* Connect — écran « Portrait d'une personne », et « Ce que les autres voient » (mon portrait vu de l'extérieur) */
Pages._view=async function(S,p,preview){
  const {$,esc,localTime,INTENT_LABEL,FACT_LABEL,FACTS,WANT,fem,dn,isAvail,hhmm,zodiac,chinese}=App;
  const {entries}=await App.loadMe();const r=preview?{common:[],feels:[]}:App.resonance(entries,p.entries);
  const commons=new Set(r.common.map(c=>c.theirs.id));const f=fem(p);const il=f?'elle':'il';
  /* faits visibles : pour moi, uniquement ceux que j'ai laissés visibles */
  let facts=[];
  if(preview){const F=p.facts||{};FACTS.forEach(x=>{const s=F[x.id];if(x.id==='sign'){const b=F.birth;if(b&&b.v&&s&&s.show)facts.push([x.k,zodiac(b.v)+' · '+chinese(b.v)]);return;}
      if(!s||!s.show||!s.v)return;if(x.id==='birth'){const [y,m,d]=s.v.split('-');facts.push(['Anniversaire',new Date(+y,+m-1,+d).toLocaleDateString('fr-CH',s.year?{day:'numeric',month:'long',year:'numeric'}:{day:'numeric',month:'long'})]);return;}facts.push([x.k,s.v]);});}
  else facts=Object.entries(p.facts||{}).map(([k,v])=>[FACT_LABEL[k]||k,v]);
  S.innerHTML=(preview?`<a class="back" href="#portrait">← Modifier mon portrait</a><p class="eyebrow">Ce que les autres voient</p>`:`<a class="back" href="#now">← Maintenant</a><p class="eyebrow">Portrait</p>`)+`
  <div class="hero">${App.avatarHtml(p)}<div><h1>${esc(dn(p))}</h1>${App.badge(p)}<p class="muted">${esc(p.city||'')}${preview?'':' · '+localTime(p)+' chez '+(f?'elle':'lui')}</p></div></div>
  ${isAvail(p)?`<div class="avail-card"><div class="k">Disponible${preview?' jusqu\'à '+hhmm(p.avail.until):' maintenant'}</div><div class="wants big">${p.avail.wants.map(k=>WANT[k]?WANT[k].l:'').join(' · ')}</div>${p.avail.note?`<p class="txt">${esc(p.avail.note)}</p>`:''}</div>`:''}
  <div class="intent">${(p.intent||[]).map(i=>`<span class="chip on ro">${INTENT_LABEL[i]}</span>`).join('')}</div>
  ${p.now?`<div class="now"><p class="eyebrow">En ce moment</p><p class="txt">${esc(p.now)}</p></div>`:''}
  <div class="voice-box"><p class="eyebrow" style="margin:0">${preview?'Ma voix':'Sa voix'}</p><div id="voice"></div></div>
  ${preview?'':`<div class="actions2"><a class="btn flame" href="#resonances/${p.id}">Nos résonances · ${r.common.length+r.feels.length}</a><a class="btn ghost" href="#messages/${p.id}">Conversation</a></div>`}
  ${p.types&&p.types.list&&p.types.list.length&&p.types.show!==false?`<h2>${preview?'Mon':'Son'} <em>fonctionnement</em></h2><div class="types-show">${p.types.list.map(k=>`<span class="ttag t-${k}">${TYPES.name(k)}</span>`).join('')}</div>`:''}
  ${facts.length?`<h2>Qui ${preview?'je':il} <em>${preview?'suis':'est'}</em></h2><div class="facts">${facts.map(([k,v])=>`<div class="fact"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>`).join('')}</div>`:''}
  <h2>Ce qui ${preview?'me':(f?'la':'le')} fait <em>vibrer</em></h2>${preview?'':`<p class="muted small" style="margin-bottom:10px">Ouvre une entrée et réponds-y : c'est comme ça qu'on écrit à quelqu'un sur Connect.</p>`}<div class="list" id="v-list"></div>
  ${p.qs.filter(q=>q.a).length?`<h2>Questions <em>ouvertes</em></h2>${p.qs.filter(q=>q.a).map(q=>`<div class="q ro"><div class="k">${esc(q.k)}</div><div class="a">${esc(q.a)}</div></div>`).join('')}`:''}
  ${preview?'':`<div class="actions2"><button class="btn ghost" type="button" id="red">Ajouter à ma liste rouge</button><button class="btn ghost" type="button" id="rep">Signaler ce portrait</button></div><p class="muted small" id="done" style="margin-top:8px"></p>`}`;
  const L=$('v-list');if(!p.entries.length)L.innerHTML='<p class="muted small">Rien pour l\'instant.</p>';
  p.entries.forEach(e=>L.appendChild(App.entryEl(e,{hit:commons.has(e.id),reply:preview?null:async txt=>App.sendResultText(p,await App.sendTo(p,txt,e))})));
  /* voix */
  const V=$('voice');const v=await DB.get('voices',preview?'pres-me':'pres-'+p.id);
  if(v)V.appendChild(App.audioEl(v.blob));
  else if(!preview&&window.speechSynthesis){const b=document.createElement('button');b.className='btn ghost';b.type='button';b.textContent='Écouter (voix de synthèse pour la démo)';b.addEventListener('click',()=>App.speak(`Bonjour, je suis ${dn(p)}. ${p.now}`));V.appendChild(b);}
  else V.innerHTML=`<p class="muted small">${preview?'Pas encore enregistrée. Tu peux le faire dans ton portrait.':'Pas encore enregistrée.'}</p>`;
  if(preview)return;
  $('red').addEventListener('click',async()=>{await DB.put('lists',{owner:'me',type:'red',target:p.id,name:p.name||p.pseudo,hint:p.city});$('done').textContent=dn(p)+' est sur ta liste rouge : '+il+' ne te verra plus. Tu peux l\'enlever dans Réglages.';});
  $('rep').addEventListener('click',async()=>{await DB.put('reports',{by:'me',target:p.id,kind:'profile',reason:'autre',status:'open',ts:Date.now()});$('done').textContent='Signalement transmis à l\'équipe Connect.';});
};
Pages.personne=async function(S,id){
  const p=await App.loadPerson(id);
  if(!p||p.isMe||await App.isBlocked(p)){S.innerHTML='<a class="back" href="#now">← Maintenant</a><div class="empty">Ce portrait n\'est pas disponible.</div>';return;}
  await Pages._view(S,p,false);
};
Pages.apercu=async function(S){const p=await App.loadPerson('me');await Pages._view(S,p,true);};
