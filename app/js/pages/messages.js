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
      const d=App.personEl(p,null,`<div class="st two" style="font-style:normal;font-family:var(--body);color:var(--muted)">${sub(t,m)}</div>`);d.addEventListener('click',()=>location.hash='#messages/'+p.id);el.appendChild(d);});};
    /* dernier message : qui l'a écrit, puis le texte sur deux lignes */
    const txt=(m,p)=>!m?'':`<b>${m.from==='me'?'Toi':esc(App.dn(p))} :</b> `+(m.kind==='ephemeral'?'Photo éphémère':m.kind==='voice'?'Message vocal':m.kind==='decline'?'a répondu non, gentiment':esc(String(m.text||'').slice(0,180)));
        sect($('t-open'),'Ouvertes',threads.filter(t=>t.status==='open'),(t,m)=>txt(m,byId[t.id]));
    sect($('t-end'),'Terminées',threads.filter(t=>t.status==='declined-by-them'||t.status==='declined'),(t,m)=>txt(m,byId[t.id]));
    sect($('t-out'),'En <em>attente</em>',threads.filter(t=>t.status==='pending-out'),(t,m)=>'Ta réponse'+(m&&m.aboutTitle?' sur « '+esc(m.aboutTitle)+' »':'')+' attend d\'être lue');
    if(!threads.length)S.insertAdjacentHTML('beforeend','<div class="empty" style="margin-top:14px">Pas encore de conversation. Va dans Résonances et réponds à une entrée qui te touche.</div>');
    return;}

  const p=await App.loadPerson(id);if(p)S.classList.toggle('tribe-bg',!!p.intimate);
  if(!p||await App.isBlocked(p)){S.innerHTML='<a class="back" href="#messages">← Conversations</a><div class="empty">Conversation indisponible.</div>';return;}
  const waiting=await App.pendingIn();
  if(waiting.length&&!waiting.some(t=>t.id===p.id)){location.hash='#messages/'+waiting[0].id;return;}
  const f=fem(p);const il=f?'elle':'il';
  S.innerHTML=`<a class="back" href="#messages">← Conversations</a>
  <div class="chat-head">${App.avatarHtml(p)}<div><a class="nm" href="#personne/${p.id}">${esc(dn(p))}</a>${App.badge(p)}<div class="muted small">${esc(p.city)} · ${App.isAvail(p)?'disponible':'pas disponible, '+localTime(p)+' chez '+(f?'elle':'lui')}</div></div></div>
  <div class="tb" id="tribe"></div><div class="chat" id="chat"></div><div id="bottom"></div>`;
  const C=$('chat'),Bo=$('bottom');App.tribeBox(p,$('tribe'));
  /* messages affichés (par identifiant), message auquel on répond, état de la conversation */
  const shown=new Map();let replyTo=null,curStatus=null;const T=k=>esc(I18N.t(k));
  const RX=['❤️','😂','😮','😢','🙏','👍'];
  const toEnd=()=>{if(!S.isConnected)return;S.scrollTop=S.scrollHeight;};
  const nearEnd=()=>S.scrollHeight-S.scrollTop-S.clientHeight<160;
  const snip=m=>m.kind==='voice'?I18N.t('Message vocal'):m.kind==='ephemeral'?I18N.t('Photo éphémère'):String(m.kind==='decline'?App.declineText(m):m.text||'').slice(0,110);
  /* réactions : la mienne et celle de l'autre, sous la bulle */
  function paintRx(d,m){const r=m.rx||{},el=d.querySelector('.rx');if(!el)return;
    el.hidden=!(r.them||r.me);el.innerHTML=(r.them?`<span>${esc(r.them)}</span>`:'')+(r.me?`<span class="mine">${esc(r.me)}</span>`:'');}
  async function react(m,d,e){const cur=(m.rx||{}).me||'';const v=cur===e?'':e;
    m.react=v;if(!DB.remote)m.rx={...(m.rx||{}),me:v};try{await DB.put('messages',m);m.rx={...(m.rx||{}),me:v};}catch(x){}delete m.react;paintRx(d,m);}
  function setReply(m){replyTo=m;const B=$('reply-bar');if(!B)return;B.hidden=!m;
    if(m){B.querySelector('b').textContent=m.from==='me'?I18N.t('Toi'):dn(p);B.querySelector('span').textContent=(m.aboutTitle?m.aboutTitle+' · ':'')+snip(m);const i=$('chat-in');if(i)i.focus();toEnd();}}
  /* un toucher sur une bulle ouvre ses outils : réagir ou répondre à ce message */
  function tools(m,d){const open=d.querySelector('.tools');C.querySelectorAll('.tools').forEach(x=>x.remove());if(open||curStatus!=='open'||m.kind==='decline')return;
    const t=document.createElement('div');t.className='tools';
    t.innerHTML=RX.map(e=>`<button type="button" class="rxb${(m.rx||{}).me===e?' on':''}" data-e="${e}">${e}</button>`).join('')+`<button type="button" class="tool-reply" data-reply>${T('Répondre')}</button>`;
    t.addEventListener('click',ev=>{ev.stopPropagation();const b=ev.target.closest('button');if(!b)return;if(b.dataset.e)react(m,d,b.dataset.e);else setReply(m);t.remove();});
    d.appendChild(t);if(d===C.lastElementChild)toEnd();}
  function addMsg(m){shown.set(m.id,{m});
    if(m.kind==='ephemeral'&&m.from!=='me'){const d=document.createElement('div');d.className='eph'+(m.seen?' gone':'');
      d.innerHTML=`<div class="lbl">Photo éphémère · ${+m.seconds||10} secondes · vue une fois</div><div class="pic">${m.seen?'Photo vue. Elle n\'est plus sur ton téléphone.':esc(m.text)}</div><div class="timer"></div><div class="actions"><button class="btn" type="button" ${m.seen?'disabled':''}>Voir</button><button class="btn ghost" type="button">Signaler</button></div>
      <div class="report"><div class="k">Pourquoi tu signales cette photo ? Elle sera transmise à l'équipe FeelShareLove même si elle a disparu de ton écran.</div><div class="opts"><button class="chip" type="button">Nudité</button><button class="chip" type="button">Violence</button><button class="chip" type="button">Pas la bonne personne</button><button class="chip" type="button">Autre</button></div><div class="ok">Transmis. On regarde dans les 24 h et ${esc(dn(p))} ne saura pas que ça vient de toi.</div></div>`;
      const [see,flag]=d.querySelectorAll('.actions button');const t=d.querySelector('.timer');
      see.addEventListener('click',async()=>{if(m.seen)return;m.seen=true;await DB.put('messages',m);d.classList.add('seen');see.disabled=true;let n=m.seconds;t.style.display='block';
        const tick=()=>{t.textContent='Disparaît dans '+n+' s';if(n--<=0){d.classList.remove('seen');d.classList.add('gone');d.querySelector('.pic').textContent='Photo vue. Elle n\'est plus sur ton téléphone.';t.style.display='none';return;}setTimeout(tick,1000);};tick();});
      flag.addEventListener('click',()=>d.querySelector('.report').classList.toggle('on'));
      d.querySelectorAll('.report .chip').forEach(c=>c.addEventListener('click',async()=>{d.querySelectorAll('.report .chip').forEach(x=>x.classList.toggle('on',x===c));await DB.put('reports',{by:'me',target:p.id,kind:'photo',messageId:m.id,reason:c.textContent,status:'open',ts:Date.now()});d.querySelector('.ok').style.display='block';}));
      shown.get(m.id).el=d;C.appendChild(d);return;}
    const d=document.createElement('div');d.className='msg '+(m.from==='me'?'me':'them')+(m.kind==='decline'?' decline':'')+(m.aboutTitle?' about':'');d.dataset.id=m.id;shown.get(m.id).el=d;
    const q=m.re&&shown.get(m.re)&&shown.get(m.re).m;
    d.innerHTML=(m.aboutTitle?`<div class="about-pill"><span>${T(m.from==='me'?'Sur son portrait':'Sur ton portrait')}</span><b>${esc(m.aboutTitle)}</b></div>`:'')+(m.kind==='decline'?`<div class="ctx">${T('Réponse')}</div>`:'')
      +(q?`<button type="button" class="quote" data-go="${esc(q.id)}"><b>${q.from==='me'?T('Toi'):esc(dn(p))}</b><span>${esc((q.aboutTitle?q.aboutTitle+' · ':'')+snip(q))}</span></button>`:'')+(m.kind==='ephemeral'?'<span class="muted">Photo éphémère envoyée · '+(+m.seconds||10)+' s</span>':m.kind==='voice'?'':esc(m.kind==='decline'?App.declineText(m):m.text))+`<div class="rx" hidden></div><div class="time">${hhmm(m.ts)}</div>`;
    paintRx(d,m);
    d.addEventListener('click',ev=>{const g=ev.target.closest('.quote');
      if(g){const o=shown.get(g.dataset.go);if(o&&o.el){o.el.scrollIntoView({block:'center',behavior:'smooth'});o.el.classList.add('flash');setTimeout(()=>o.el.classList.remove('flash'),1400);}return;}
      if(ev.target.closest('a,button,audio,.vdel,.tools'))return;tools(m,d);});
    if(m.kind==='voice'){DB.get('voices',m.voiceId).then(v=>{if(v)d.insertBefore(App.audioEl(v.blob),d.lastChild);});
      /* mes vocaux : je peux les effacer plus tard (ils disparaissent aussi chez l'autre) */
      if(m.from==='me'){const x=document.createElement('div');x.className='vdel';x.innerHTML='<button class="linkbtn" type="button" data-x="ask">Effacer</button>';d.appendChild(x);
        x.addEventListener('click',async e=>{const a=e.target.dataset&&e.target.dataset.x;
          if(a==='ask')x.innerHTML='<span class="muted small">Effacer ce vocal, aussi chez '+esc(dn(p))+' ?</span> <button class="linkbtn" type="button" data-x="yes">Oui</button> <button class="linkbtn" type="button" data-x="no">Non</button>';
          if(a==='no')x.innerHTML='<button class="linkbtn" type="button" data-x="ask">Effacer</button>';
          if(a==='yes'){try{await DB.del('messages',m.id);if(m.voiceId)await DB.del('voices',m.voiceId);}catch(err){}shown.delete(m.id);d.remove();}});}}
    C.appendChild(d);}
  /* un seul affichage de la conversation à la fois (la mise à jour automatique peut tomber pendant un affichage) */
  let drawing=null;const render=()=>drawing||(drawing=draw().finally(()=>{drawing=null;}));
  async function draw(){if(!Bo.isConnected)return;
    const th=await DB.get('threads',p.id);const ms=(await DB.where('messages','thread',p.id)).sort((a,b)=>a.ts-b.ts);if(!Bo.isConnected)return;
    const keep=C.childElementCount&&!nearEnd()?S.scrollTop:null; // on redessine sans faire sauter l'écran : même position, ou tout en bas
    C.innerHTML='';Bo.innerHTML='';shown.clear();curStatus=th?th.status:null;ms.forEach(addMsg);
    setTimeout(()=>{if(keep!=null)S.scrollTop=keep;else toEnd();},0);
    if(th&&(th.status==='declined-by-them'||th.status==='declined')){Bo.innerHTML=`<div class="empty">${th.status==='declined'?'Tu as répondu non à '+esc(dn(p))+'.':esc(dn(p))+' a répondu, gentiment, ne pas souhaiter commencer de conversation.'} La conversation s'arrête ici.</div>`;return;}
    if(!th){
      Bo.innerHTML=`<div class="empty">Pour écrire à ${esc(dn(p))}, réponds à une de ses entrées. ${f?'Elle':'Il'} choisira ensuite d'ouvrir la conversation.</div><div class="list" id="ent" style="margin-top:10px"></div>`;
      p.entries.forEach(e=>$('ent').appendChild(App.entryEl(e,{reply:async txt=>{const r=await App.sendTo(p,txt,e);if(r.ok)setTimeout(render,50);return App.sendResultText(p,r);}})));return;}
    if(th.status==='pending-out'){Bo.innerHTML=`<div class="empty">En attente : ${esc(dn(p))} va lire ta réponse et choisir d'ouvrir la conversation.</div>`;
      const wait=Math.max(500,th.acceptAt-Date.now()+300);setTimeout(async()=>{if(location.hash!=='#messages/'+p.id)return;if(await App.tickThreads())render();},wait);return;}
    if(th.status==='pending-in'){const opts=App.declineChoices(p,await DB.get('profiles','me'));if(!Bo.isConnected)return;
      Bo.innerHTML=`<div class="gate"><p>${esc(dn(p))} t'a écrit. Sur FeelShareLove, on répond toujours : tu ouvres la conversation, ou tu dis non gentiment.</p>
        <div class="row" style="justify-content:flex-start"><button class="btn" type="button" id="acc">Ouvrir la conversation</button><button class="btn ghost" type="button" id="no">Répondre non, gentiment</button></div>
        <div id="dec" hidden><p class="muted small" style="margin:12px 0 8px">Choisis une phrase. Elle sera envoyée telle quelle.</p>${opts.map((o,i)=>`<label class="dopt"><input type="radio" name="dch" value="${i}"><span>${esc(o.t)}</span></label>`).join('')}
          <div class="row" style="margin-top:10px"><button class="btn" type="button" id="dsend" disabled>Envoyer cette réponse</button></div></div>
        <p class="muted small" style="margin-top:12px">Message déplacé ou insultant ? <button class="linkbtn" type="button" id="rep">Signaler et bloquer</button>, sans avoir à répondre.</p></div>`;
      $('acc').addEventListener('click',async()=>{th.status='open';await DB.put('threads',th);render();});
      $('no').addEventListener('click',()=>{$('dec').hidden=false;});
      Bo.querySelectorAll('input[name=dch]').forEach(r=>r.addEventListener('change',()=>{$('dsend').disabled=false;}));
      $('dsend').addEventListener('click',async()=>{const i=+Bo.querySelector('input[name=dch]:checked').value;
        const me0=await DB.get('profiles','me');await DB.put('messages',{thread:p.id,from:'me',to:p.id,kind:'decline',dk:opts[i].k,di:opts[i].i,acc:(me0&&me0.accord)||'n',text:'',ts:Date.now()});th.status='declined';await DB.put('threads',th);location.hash='#messages';});
      $('rep').addEventListener('click',async()=>{await DB.put('lists',{owner:'me',type:'black',target:p.id,name:p.name||p.pseudo});await DB.put('reports',{by:'me',target:p.id,kind:'block',status:'open',ts:Date.now()});th.status='declined';await DB.put('threads',th);location.hash='#messages';});
      return;}
    /* conversation ouverte */
    Bo.innerHTML=`<div class="reply-bar" id="reply-bar" hidden><div><b></b><span></span></div><button type="button" id="reply-x" aria-label="Annuler la réponse">×</button></div><div class="bar"><label class="ico" title="Photo éphémère">10 s<input type="file" id="eph-in" accept="image/*" hidden></label><input placeholder="Écrire à ${esc(dn(p))}…" id="chat-in"><button class="ico send" type="button" id="chat-send">OK</button></div><div id="mic" style="margin-top:8px"></div>
      <p class="muted small" style="margin-top:12px"><button class="linkbtn" type="button" id="block">Bloquer ${esc(dn(p))} (liste noire)</button></p>`;
    const fake=()=>setTimeout(async()=>{const r=await DB.put('messages',{thread:p.id,from:p.id,to:'me',kind:'text',text:App.REPLY_FOR?App.REPLY_FOR(p):'Merci pour ton message.',ts:Date.now()});if(location.hash==='#messages/'+p.id){addMsg(r);toEnd();}},1600);
    let sending=false;
    const send=async()=>{const I=$('chat-in');const v=I.value.trim();if(!v||sending)return;sending=true;I.value='';const re=replyTo&&replyTo.id;setReply(null);I.focus();
      try{const r=await App.sendTo(p,v,null,{re});if(r.ok){addMsg(r.msg);toEnd();setTimeout(toEnd,150);if(!DB.remote)fake();}else{I.value=v;}}finally{sending=false;}};
    $('reply-x').addEventListener('click',()=>setReply(null));if(replyTo)setReply(shown.has(replyTo.id)?replyTo:null);
    $('chat-in').addEventListener('focus',()=>{if(nearEnd())setTimeout(toEnd,350);}); // le clavier du téléphone s'ouvre : on reste sur le dernier message
    $('chat-send').addEventListener('click',send);$('chat-in').addEventListener('keydown',k=>{if(k.key==='Enter')send();});
    $('eph-in').addEventListener('change',async e=>{if(!e.target.files[0])return;const m=await DB.put('messages',{thread:p.id,from:'me',to:p.id,kind:'ephemeral',text:'',seconds:10,ts:Date.now()});addMsg(m);toEnd();e.target.value='';});
    $('mic').appendChild(App.voiceRecorder('Message vocal',60,async(blob,secs)=>{const v=await DB.put('voices',{owner:'me',kind:'message',blob,secs});const m=await DB.put('messages',{thread:p.id,from:'me',to:p.id,kind:'voice',voiceId:v.id,secs,ts:Date.now()});addMsg(m);toEnd();if(!DB.remote)fake();}));
    $('block').addEventListener('click',async()=>{await DB.put('lists',{owner:'me',type:'black',target:p.id,name:p.name||p.pseudo});await DB.put('reports',{by:'me',target:p.id,kind:'block',status:'open',ts:Date.now()});location.hash='#reglages';});
  }
  await render();
  /* on arrive directement sur le dernier message (après que le routeur a remis la page en haut) */
  setTimeout(toEnd,0);setTimeout(toEnd,120);setTimeout(toEnd,500);
  /* version en ligne : toutes les 8 secondes, on ajoute seulement ce qui est nouveau (messages, réactions) sans redessiner la conversation ;
     elle n'est redessinée que si son état change (ouverte, refusée…) */
  if(DB.remote){clearInterval(window.__fslPoll);const here=location.hash;
    window.__fslPoll=setInterval(async()=>{if(location.hash!==here){clearInterval(window.__fslPoll);return;}if(document.hidden||drawing)return;
      try{const ms=(await DB.where('messages','thread',p.id)).sort((a,b)=>a.ts-b.ts);const st=((await DB.get('threads',p.id))||{}).status||null;
        if(st!==curStatus){await render();return;}
        const near=nearEnd();let added=false;const ids=new Set(ms.map(m=>m.id));
        for(const m of ms){const o=shown.get(m.id);
          if(!o){addMsg(m);added=true;}
          else if(JSON.stringify(m.rx||{})!==JSON.stringify(o.m.rx||{})){o.m.rx=m.rx;if(o.el)paintRx(o.el,o.m);}}
        for(const [k,o] of shown)if(!ids.has(k)){if(o.el)o.el.remove();shown.delete(k);} // message effacé par l'autre
        if(added&&near)toEnd();}catch(e){}},8000);}
};
