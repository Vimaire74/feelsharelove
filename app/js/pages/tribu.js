/* FeelShareLove — écran « Ma tribu » : invitations à répondre, ma tribu, invitations envoyées, personnes préférées, inviter mes amis */
Pages.tribu=async function(S){
  const {$,esc,dn}=App;
  const {me}=await App.loadMe();
  const people=await App.others();const byId=Object.fromEntries(people.map(p=>[p.id,p]));
  const inv=await App.invites();const other=i=>i.from==='me'?i.to:i.from;
  const ask=inv.filter(i=>i.state==='pending'&&i.to==='me'&&byId[i.from]);
  const tribe=inv.filter(i=>i.state==='yes'&&byId[other(i)]);
  const sent=inv.filter(i=>i.from==='me'&&(i.state==='pending'||i.state==='no')&&byId[i.to]);
  /* personnes préférées : celles qui sont dans la tribu en sortent */
  const inT=new Set(tribe.map(other));let favs=await App.favOf();
  for(const l of favs.filter(l=>inT.has(l.target)))await DB.del('lists',l.id);
  favs=favs.filter(l=>!inT.has(l.target));
  const known=new Set(inv.map(other));
  const threads=await DB.all('threads');
  /* rencontrés ici : conversation ouverte, pas encore d'invitation */
  const met=threads.filter(t=>t.status==='open'&&byId[t.id]&&!known.has(t.id)).map(t=>byId[t.id]);
  const link=DB.remote&&DB.inviteLink?DB.inviteLink():'https://feelsharelove.com';
  const msg=`Je t'invite sur FeelShareLove : on s'y rencontre par ce qui nous fait vibrer, sans publicité. ${link}`;
  S.innerHTML=`<p class="eyebrow">Ma tribu</p><h1>Les gens qui <span style="color:var(--flame)">comptent</span></h1>
  <p class="muted small" style="margin:8px 0 14px">Ta tribu, ce sont les personnes qui se sont choisies des deux côtés : l'un invite, l'autre répond toujours. Dans la tribu, vous voyez ce que vous réservez à la tribu. Tes personnes préférées, c'est une liste privée : personne ne sait qu'il y est.</p>
  <div id="t-ask"></div><div id="t-list"></div><div id="t-sent"></div><div id="t-fav"></div><div id="t-met"></div>
  <h2>Inviter <em>mes amis</em></h2>
  <div class="sec" style="margin-top:6px"><p class="exp">Invite les personnes que tu aimes. Quand elles s'inscrivent avec ton lien, vous êtes directement dans la même tribu.</p>
    <div class="row" style="justify-content:flex-start;flex-wrap:wrap;gap:10px">
      <button class="btn flame" type="button" id="i-contacts" hidden>Choisir dans mon carnet d'adresses</button>
      <button class="btn" type="button" id="i-share">Envoyer mon invitation</button>
      <button class="btn ghost" type="button" id="i-copy">Copier le lien</button></div>
    <div id="i-picked" style="margin-top:12px"></div>
    <p class="muted small" id="i-msg" style="margin-top:8px"></p>
    <p class="muted small" style="margin-top:8px">Sur iPhone, « Envoyer mon invitation » ouvre Messages, WhatsApp ou Mail : tu choisis la personne dans tes contacts à ce moment-là.</p></div>`;
  const card=(el,p,extra)=>{const d=App.personEl(p,null,'');d.addEventListener('click',ev=>{if(ev.target.closest('button,.tb'))return;location.hash='#personne/'+p.id;});if(extra)extra(d);el.appendChild(d);return d;};
  const btn=(d,label,fn)=>{const b=document.createElement('button');b.className='linkbtn';b.type='button';b.textContent=label;b.style.marginLeft='auto';b.addEventListener('click',async ev=>{ev.stopPropagation();await fn();Router.route();});d.appendChild(b);};
  /* à toi de répondre */
  if(ask.length){const A=$('t-ask');A.innerHTML=`<h2>À toi <em>de répondre</em></h2>`;
    for(const i of ask){const p=byId[i.from];card(A,p);const box=document.createElement('div');box.className='tb';A.appendChild(box);await App.tribeBox(p,box,()=>Router.route());}}
  /* ma tribu */
  const T=$('t-list');T.innerHTML=`<h2>Ma <em>tribu</em>${tribe.length?' · '+tribe.length:''}</h2>`;
  if(!tribe.length)T.insertAdjacentHTML('beforeend','<div class="empty">Personne pour l\'instant. Invite quelqu\'un depuis son portrait, votre conversation ou vos résonances (« Inviter dans ma tribu »).</div>');
  tribe.forEach(i=>card(T,byId[other(i)],d=>btn(d,'Retirer',()=>DB.del('invites',i.id))));
  /* invitations envoyées, et les réponses reçues */
  if(sent.length){const E=$('t-sent');E.innerHTML='<h2>Invitations <em>envoyées</em></h2>';
    sent.forEach(i=>{const p=byId[i.to];card(E,p,d=>{const st=document.createElement('div');st.className='st two';st.style.cssText='font-style:normal;font-family:var(--body);color:var(--muted)';
      st.innerHTML=i.state==='pending'?'En attente de sa réponse (rappel chaque jour)':'A répondu : « '+esc(App.REFUS(p)[i.reason-1]||'')+' »';d.querySelector('.i').appendChild(st);
      btn(d,i.state==='pending'?'Annuler':'Effacer',()=>DB.del('invites',i.id));});});}
  /* personnes préférées */
  const F=$('t-fav');F.innerHTML='<h2>Mes personnes <em>préférées</em></h2>';
  if(!favs.length)F.insertAdjacentHTML('beforeend','<div class="empty">Touche « ☆ Personne préférée » sur un portrait, une conversation ou vos résonances.</div>');
  favs.forEach(l=>{const p=byId[l.target];if(!p)return;card(F,p,d=>btn(d,'Retirer',()=>DB.del('lists',l.id)));});
  /* rencontrés ici */
  if(met.length){const M=$('t-met');M.innerHTML='<h2>Rencontrés <em>ici</em></h2><p class="muted small" style="margin:-4px 0 10px">Vous avez une conversation ouverte.</p>';
    met.forEach(p=>card(M,p,d=>{const b=document.createElement('button');b.className='btn small-btn';b.type='button';b.textContent='Inviter dans ma tribu';b.style.marginLeft='auto';
      b.addEventListener('click',async ev=>{ev.stopPropagation();try{await App.tribeInvite(p);}catch(e){}Router.route();});d.appendChild(b);}));}
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
