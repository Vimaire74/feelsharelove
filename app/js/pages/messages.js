/* FeelShareLove — écran « Messages » : demandes reçues, conversations ouvertes, messages en attente ; puis une conversation */
Pages.messages=async function(S,id){
  const {$,esc,fem,dn,localTime,hhmm}=App;
  /* version en ligne : la liste des conversations se met à jour toute seule (toutes les 10 secondes) */
  clearInterval(window.__fslList);
  if(!id&&DB.remote){const here=location.hash;const mk=async()=>(await DB.all('threads')).map(t=>t.id+t.status).join()+'|'+(await DB.all('messages')).length;let sig=await mk();
    window.__fslList=setInterval(async()=>{if(location.hash!==here){clearInterval(window.__fslList);return;}if(document.hidden)return;try{const s=await mk();if(s!==sig){sig=s;Router.route();}}catch(e){}},10000);}
  if(!id){
    const people=await App.others();const byId=Object.fromEntries(people.map(p=>[p.id,p]));const threads=(await DB.all('threads')).filter(t=>byId[t.id]);const all=await DB.all('messages');
    const last=tid=>all.filter(m=>m.thread===tid).sort((a,b)=>b.ts-a.ts)[0];
    const left=await App.firstLeft();
    const waiting=threads.filter(t=>t.status==='pending-in');
    if(waiting.length){S.innerHTML=`<p class="eyebrow">Messages</p><h1>Quelqu'un attend ta réponse</h1><p class="muted small" style="margin:8px 0 4px">Sur FeelShareLove, personne ne reste sans réponse. Ouvre la conversation ou réponds non gentiment : tes autres messages s'affichent ensuite.</p><div id="t-in"></div>`;
      waiting.forEach(t=>{const p=byId[t.id];const m=last(t.id);const d=App.personEl(p,null,`<div class="st" style="font-style:normal;font-family:var(--body);color:var(--muted)">Te répond${m&&m.aboutTitle?' sur « '+esc(m.aboutTitle)+' »':''} · à toi de répondre</div>`);d.addEventListener('click',()=>location.hash='#messages/'+p.id);$('t-in').appendChild(d);});return;}
    S.innerHTML=`<p class="eyebrow">Messages</p><h1>Conversations</h1><p class="muted small" style="margin:8px 0 4px">Il te reste ${left} premier${left>1?'s':''} message${left>1?'s':''} aujourd'hui. On écrit à quelqu'un en répondant à une entrée de son portrait.</p><div id="t-in"></div><div id="t-open"></div><div id="t-out"></div><div id="t-end"></div>`;
    const sect=(el,title,list,sub)=>{if(!list.length)return;el.innerHTML=`<h2>${title}</h2>`;list.sort((a,b)=>((last(b.id)||{}).ts||0)-((last(a.id)||{}).ts||0)).forEach(t=>{const p=byId[t.id];const m=last(t.id);
      const d=App.personEl(p,null,`<div class="st" style="font-style:normal;font-family:var(--body);color:var(--muted)">${sub(t,m)}</div>`);d.addEventListener('click',()=>location.hash='#messages/'+p.id);el.appendChild(d);});};
    const txt=m=>!m?'':m.kind==='ephemeral'?'Photo éphémère':m.kind==='voice'?'Message vocal':m.kind==='decline'?'A répondu non, gentiment':esc(m.text.slice(0,60));
        sect($('t-open'),'Ouvertes',threads.filter(t=>t.status==='open'),(t,m)=>txt(m));
    sect($('t-end'),'Terminées',threads.filter(t=>t.status==='declined-by-them'||t.status==='declined'),(t,m)=>txt(m));
    sect($('t-out'),'En <em>attente</em>',threads.filter(t=>t.status==='pending-out'),(t,m)=>'Ta réponse'+(m&&m.aboutTitle?' sur « '+esc(m.aboutTitle)+' »':'')+' attend d\'être lue');
    if(!threads.length)S.insertAdjacentHTML('beforeend','<div class="empty" style="margin-top:14px">Pas encore de conversation. Va dans Résonances et réponds à une entrée qui te touche.</div>');
    return;}

  const p=await App.loadPerson(id);
  if(!p||await App.isBlocked(p)){S.innerHTML='<a class="back" href="#messages">← Conversations</a><div class="empty">Conversation indisponible.</div>';return;}
  const waiting=await App.pendingIn();
  if(waiting.length&&!waiting.some(t=>t.id===p.id)){location.hash='#messages/'+waiting[0].id;return;}
  const f=fem(p);const il=f?'elle':'il';
  S.innerHTML=`<a class="back" href="#messages">← Conversations</a>
  <div class="chat-head">${App.avatarHtml(p)}<div><a class="nm" href="#personne/${p.id}">${esc(dn(p))}</a>${App.badge(p)}<div class="muted small">${esc(p.city)} · ${App.isAvail(p)?'disponible':'pas disponible, '+localTime(p)+' chez '+(f?'elle':'lui')}</div></div></div>
  <div class="chat" id="chat"></div><div id="bottom"></div>`;
  const C=$('chat'),Bo=$('bottom');
  function addMsg(m){
    if(m.kind==='ephemeral'&&m.from!=='me'){const d=document.createElement('div');d.className='eph'+(m.seen?' gone':'');
      d.innerHTML=`<div class="lbl">Photo éphémère · ${m.seconds} secondes · vue une fois</div><div class="pic">${m.seen?'Photo vue. Elle n\'est plus sur ton téléphone.':esc(m.text)}</div><div class="timer"></div><div class="actions"><button class="btn" type="button" ${m.seen?'disabled':''}>Voir</button><button class="btn ghost" type="button">Signaler</button></div>
      <div class="report"><div class="k">Pourquoi tu signales cette photo ? Elle sera transmise à l'équipe FeelShareLove même si elle a disparu de ton écran.</div><div class="opts"><button class="chip" type="button">Nudité</button><button class="chip" type="button">Violence</button><button class="chip" type="button">Pas la bonne personne</button><button class="chip" type="button">Autre</button></div><div class="ok">Transmis. On regarde dans les 24 h et ${esc(dn(p))} ne saura pas que ça vient de toi.</div></div>`;
      const [see,flag]=d.querySelectorAll('.actions button');const t=d.querySelector('.timer');
      see.addEventListener('click',async()=>{if(m.seen)return;m.seen=true;await DB.put('messages',m);d.classList.add('seen');see.disabled=true;let n=m.seconds;t.style.display='block';
        const tick=()=>{t.textContent='Disparaît dans '+n+' s';if(n--<=0){d.classList.remove('seen');d.classList.add('gone');d.querySelector('.pic').textContent='Photo vue. Elle n\'est plus sur ton téléphone.';t.style.display='none';return;}setTimeout(tick,1000);};tick();});
      flag.addEventListener('click',()=>d.querySelector('.report').classList.toggle('on'));
      d.querySelectorAll('.report .chip').forEach(c=>c.addEventListener('click',async()=>{d.querySelectorAll('.report .chip').forEach(x=>x.classList.toggle('on',x===c));await DB.put('reports',{by:'me',target:p.id,kind:'photo',messageId:m.id,reason:c.textContent,status:'open',ts:Date.now()});d.querySelector('.ok').style.display='block';}));
      C.appendChild(d);return;}
    const d=document.createElement('div');d.className='msg '+(m.from==='me'?'me':'them')+(m.kind==='decline'?' decline':'');
    d.innerHTML=(m.aboutTitle?`<div class="ctx">À propos de ${esc(m.aboutTitle)}</div>`:'')+(m.kind==='decline'?'<div class="ctx">Réponse</div>':'')+(m.kind==='ephemeral'?'<span class="muted">Photo éphémère envoyée · '+m.seconds+' s</span>':m.kind==='voice'?'':esc(m.text))+`<div class="time">${hhmm(m.ts)}</div>`;
    if(m.kind==='voice'){DB.get('voices',m.voiceId).then(v=>{if(v)d.insertBefore(App.audioEl(v.blob),d.lastChild);});}
    C.appendChild(d);}
  async function render(){C.innerHTML='';Bo.innerHTML='';
    const th=await DB.get('threads',p.id);const ms=(await DB.where('messages','thread',p.id)).sort((a,b)=>a.ts-b.ts);ms.forEach(addMsg);
    if(th&&(th.status==='declined-by-them'||th.status==='declined')){Bo.innerHTML=`<div class="empty">${th.status==='declined'?'Tu as répondu non à '+esc(dn(p))+'.':esc(dn(p))+' a répondu, gentiment, ne pas souhaiter commencer de conversation.'} La conversation s'arrête ici.</div>`;return;}
    if(!th){
      Bo.innerHTML=`<div class="empty">Pour écrire à ${esc(dn(p))}, réponds à une de ses entrées. ${f?'Elle':'Il'} choisira ensuite d'ouvrir la conversation.</div><div class="list" id="ent" style="margin-top:10px"></div>`;
      p.entries.forEach(e=>$('ent').appendChild(App.entryEl(e,{reply:async txt=>{const r=await App.sendTo(p,txt,e);if(r.ok)setTimeout(render,50);return App.sendResultText(p,r);}})));return;}
    if(th.status==='pending-out'){Bo.innerHTML=`<div class="empty">En attente : ${esc(dn(p))} va lire ta réponse et choisir d'ouvrir la conversation.</div>`;
      const wait=Math.max(500,th.acceptAt-Date.now()+300);setTimeout(async()=>{if(location.hash!=='#messages/'+p.id)return;if(await App.tickThreads())render();},wait);return;}
    if(th.status==='pending-in'){const opts=App.declineChoices(p,await DB.get('profiles','me'));
      Bo.innerHTML=`<div class="gate"><p>${esc(dn(p))} t'a écrit. Sur FeelShareLove, on répond toujours : tu ouvres la conversation, ou tu dis non gentiment.</p>
        <div class="row" style="justify-content:flex-start"><button class="btn" type="button" id="acc">Ouvrir la conversation</button><button class="btn ghost" type="button" id="no">Répondre non, gentiment</button></div>
        <div id="dec" hidden><p class="muted small" style="margin:12px 0 8px">Choisis une phrase. Elle sera envoyée telle quelle.</p>${opts.map((o,i)=>`<label class="dopt"><input type="radio" name="dch" value="${i}"><span>${esc(o.t)}</span></label>`).join('')}
          <div class="row" style="margin-top:10px"><button class="btn" type="button" id="dsend" disabled>Envoyer cette réponse</button></div></div>
        <p class="muted small" style="margin-top:12px">Message déplacé ou insultant ? <button class="linkbtn" type="button" id="rep">Signaler et bloquer</button>, sans avoir à répondre.</p></div>`;
      $('acc').addEventListener('click',async()=>{th.status='open';await DB.put('threads',th);render();});
      $('no').addEventListener('click',()=>{$('dec').hidden=false;});
      Bo.querySelectorAll('input[name=dch]').forEach(r=>r.addEventListener('change',()=>{$('dsend').disabled=false;}));
      $('dsend').addEventListener('click',async()=>{const i=+Bo.querySelector('input[name=dch]:checked').value;
        await DB.put('messages',{thread:p.id,from:'me',to:p.id,kind:'decline',text:opts[i].t,ts:Date.now()});th.status='declined';await DB.put('threads',th);location.hash='#messages';});
      $('rep').addEventListener('click',async()=>{await DB.put('lists',{owner:'me',type:'black',target:p.id,name:p.name||p.pseudo});await DB.put('reports',{by:'me',target:p.id,kind:'block',status:'open',ts:Date.now()});th.status='declined';await DB.put('threads',th);location.hash='#messages';});
      return;}
    /* conversation ouverte */
    Bo.innerHTML=`<div class="bar"><label class="ico" title="Photo éphémère">10 s<input type="file" id="eph-in" accept="image/*" hidden></label><input placeholder="Écrire à ${esc(dn(p))}…" id="chat-in"><button class="ico send" type="button" id="chat-send">OK</button></div><div id="mic" style="margin-top:8px"></div>
      <p class="muted small" style="margin-top:12px"><button class="linkbtn" type="button" id="block">Bloquer ${esc(dn(p))} (liste noire)</button></p>`;
    const fake=()=>setTimeout(async()=>{const r=await DB.put('messages',{thread:p.id,from:p.id,to:'me',kind:'text',text:App.REPLY_FOR?App.REPLY_FOR(p):'Merci pour ton message.',ts:Date.now()});if(location.hash==='#messages/'+p.id){addMsg(r);C.lastElementChild.scrollIntoView({block:'nearest'});}},1600);
    const send=async()=>{const v=$('chat-in').value.trim();if(!v)return;$('chat-in').value='';const r=await App.sendTo(p,v,null);if(r.ok){addMsg(r.msg);C.lastElementChild.scrollIntoView({block:'nearest'});if(!DB.remote)fake();}};
    $('chat-send').addEventListener('click',send);$('chat-in').addEventListener('keydown',k=>{if(k.key==='Enter')send();});
    $('eph-in').addEventListener('change',async e=>{if(!e.target.files[0])return;const m=await DB.put('messages',{thread:p.id,from:'me',to:p.id,kind:'ephemeral',text:'',seconds:10,ts:Date.now()});addMsg(m);e.target.value='';});
    $('mic').appendChild(App.recorder('Message vocal',60,async(blob,secs)=>{const v=await DB.put('voices',{owner:'me',kind:'message',blob,secs});const m=await DB.put('messages',{thread:p.id,from:'me',to:p.id,kind:'voice',voiceId:v.id,secs,ts:Date.now()});addMsg(m);C.lastElementChild.scrollIntoView({block:'nearest'});fake();}));
    $('block').addEventListener('click',async()=>{await DB.put('lists',{owner:'me',type:'black',target:p.id,name:p.name||p.pseudo});await DB.put('reports',{by:'me',target:p.id,kind:'block',status:'open',ts:Date.now()});location.hash='#reglages';});
  }
  await render();
  /* version en ligne : on regarde toutes les 8 secondes s'il y a du nouveau dans la conversation */
  if(DB.remote){clearInterval(window.__fslPoll);let last=null;const here=location.hash;
    window.__fslPoll=setInterval(async()=>{if(location.hash!==here){clearInterval(window.__fslPoll);return;}if(document.hidden)return;
      try{const k=(await DB.where('messages','thread',p.id)).length+':'+(((await DB.get('threads',p.id))||{}).status);if(last!==null&&k!==last)render();last=k;}catch(e){}},8000);}
};
