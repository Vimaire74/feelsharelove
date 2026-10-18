/* FeelShareLove — écran « Ma tribu » : les gens qui comptent pour moi ici (liste privée), et inviter mes amis */
Pages.tribu=async function(S){
  const {$,esc,dn}=App;
  const {me}=await App.loadMe();
  const lists=(await DB.where('lists','owner','me')).filter(l=>l.type==='tribe');
  const inTribe=new Set(lists.map(l=>l.target));
  const people=await App.others();const byId=Object.fromEntries(people.map(p=>[p.id,p]));
  const threads=await DB.all('threads');
  /* amis découverts : conversations ouvertes, pas encore dans la tribu */
  const met=threads.filter(t=>t.status==='open'&&byId[t.id]&&!inTribe.has(t.id)).map(t=>byId[t.id]);
  let invited=[];if(DB.remote&&DB.invited){try{invited=(await DB.invited()).filter(x=>!inTribe.has(x.id));}catch(e){}}
  const link=DB.remote&&DB.inviteLink?DB.inviteLink():'https://feelsharelove.com';
  const msg=`Je t'invite sur FeelShareLove : on s'y rencontre par ce qui nous fait vibrer, sans publicité. ${link}`;
  S.innerHTML=`<p class="eyebrow">Ma tribu</p><h1>Les gens qui <span style="color:var(--flame)">comptent</span></h1>
  <p class="muted small" style="margin:8px 0 14px">Ta tribu est privée : personne ne voit qui y est, ni que tu l'y as mis.</p>
  <div id="t-list"></div>
  <div id="t-inv"></div>
  <div id="t-met"></div>
  <h2>Inviter <em>mes amis</em></h2>
  <div class="sec" style="margin-top:6px"><p class="exp">Invite les personnes que tu aimes. Quand elles s'inscrivent avec ton lien, tu entres dans leur tribu et elles apparaissent ici.</p>
    <div class="row" style="justify-content:flex-start;flex-wrap:wrap;gap:10px">
      <button class="btn flame" type="button" id="i-contacts" hidden>Choisir dans mon carnet d'adresses</button>
      <button class="btn" type="button" id="i-share">Envoyer mon invitation</button>
      <button class="btn ghost" type="button" id="i-copy">Copier le lien</button></div>
    <div id="i-picked" style="margin-top:12px"></div>
    <p class="muted small" id="i-msg" style="margin-top:8px"></p>
    <p class="muted small" style="margin-top:8px">Sur iPhone, « Envoyer mon invitation » ouvre Messages, WhatsApp ou Mail : tu choisis la personne dans tes contacts à ce moment-là.</p></div>`;
  /* ma tribu */
  const T=$('t-list');
  if(!lists.length)T.innerHTML='<div class="empty">Personne pour l\'instant. Ajoute quelqu\'un depuis son portrait (« Ajouter à ma tribu ») ou depuis les suggestions plus bas.</div>';
  for(const l of lists){const p=byId[l.target]||null;
    const d=p?App.personEl(p,null,''):Object.assign(document.createElement('div'),{className:'person',innerHTML:`<div class="i"><div class="nm">${esc(l.name||'Ancien membre')}</div><div class="st muted">n'est plus visible</div></div>`});
    const b=document.createElement('button');b.className='linkbtn';b.type='button';b.textContent='Retirer';b.style.marginLeft='auto';
    b.addEventListener('click',async ev=>{ev.stopPropagation();await DB.del('lists',l.id);Router.route();});d.appendChild(b);
    if(p)d.addEventListener('click',()=>location.hash='#personne/'+p.id);T.appendChild(d);}
  const addRow=(el,p,label)=>{const d=App.personEl(p,null,label?`<div class="st" style="font-style:normal;font-family:var(--body);color:var(--muted)">${label}</div>`:'');
    const b=document.createElement('button');b.className='btn small-btn';b.type='button';b.textContent='Ajouter';b.style.marginLeft='auto';
    b.addEventListener('click',async ev=>{ev.stopPropagation();await App.tribeAdd(p);Router.route();});d.appendChild(b);
    d.addEventListener('click',()=>location.hash='#personne/'+p.id);el.appendChild(d);};
  if(invited.length){const I=$('t-inv');I.innerHTML='<h2>Ont rejoint <em>grâce à toi</em></h2>';invited.forEach(x=>addRow(I,byId[x.id]||{id:x.id,pseudo:x.pseudo},'Inscrit avec ton invitation'));}
  if(met.length){const M=$('t-met');M.innerHTML='<h2>Rencontrés <em>ici</em></h2>';met.forEach(p=>addRow(M,p,'Vous avez une conversation ouverte'));}
  /* inviter */
  const say=t=>{$('i-msg').textContent=t;};
  $('i-copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(msg);say('Invitation copiée : colle-la dans un message.');}catch(e){prompt('Copie ce texte :',msg);}});
  $('i-share').addEventListener('click',async()=>{if(navigator.share){try{await navigator.share({title:'FeelShareLove',text:msg});}catch(e){}}else{try{await navigator.clipboard.writeText(msg);say('Ton appareil ne propose pas l\'envoi direct : l\'invitation est copiée, colle-la dans un message.');}catch(e){prompt('Copie ce texte :',msg);}}});
  /* carnet d'adresses : disponible sur Android (Chrome) ; ailleurs le bouton reste caché */
  if('contacts' in navigator&&'ContactsManager' in window){const c=$('i-contacts');c.hidden=false;
    c.addEventListener('click',async()=>{let picked=[];try{picked=await navigator.contacts.select(['name','tel','email'],{multiple:true});}catch(e){return;}
      const P=$('i-picked');P.innerHTML='';
      picked.forEach(k=>{const name=(k.name&&k.name[0])||'Contact';const tel=k.tel&&k.tel[0];const mail=k.email&&k.email[0];
        const r=document.createElement('div');r.className='nm-row';
        r.innerHTML=`<span>${esc(name)}</span><span>${tel?`<a class="btn small-btn" href="sms:${encodeURIComponent(tel)}?body=${encodeURIComponent(msg)}">SMS</a>`:''} ${mail?`<a class="btn ghost small-btn" href="mailto:${encodeURIComponent(mail)}?subject=${encodeURIComponent('Je t\'invite sur FeelShareLove')}&body=${encodeURIComponent(msg)}">E-mail</a>`:''}</span>`;
        P.appendChild(r);});});}
};
