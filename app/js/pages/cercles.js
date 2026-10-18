/* FeelShareLove — écrans « Cercles » (la liste) et « Cercle » (un thème : on lit, on écrit à tous, sans viser quelqu'un) */
Pages.cercles=async function(S){
  const {$,esc}=App;const {me}=await App.loadMe();const mine=me.circles||[];
  const circles=await DB.all('circles');const posts=await DB.all('circlePosts');
  S.innerHTML=`<a class="back" href="#now">← Maintenant</a><p class="eyebrow">Cercles</p><h1>Des thèmes, des gens, <span style="color:var(--flame)">pas de pression</span></h1>
  <p class="muted small" style="margin:8px 0 14px">Dans un cercle, on écrit à tout le monde à la fois. On peut lire sans rien dire.</p><div class="list" id="cl"></div>
  <div class="form on" style="margin-top:16px"><label>Créer un cercle</label><input class="in" id="nc-t" placeholder="Ceux qui…"><input class="in" id="nc-a" placeholder="En une phrase, pour qui c'est"><div class="row"><button class="btn" type="button" id="nc">Créer</button></div></div>`;
  $('cl').innerHTML=circles.sort((a,b)=>mine.includes(b.id)-mine.includes(a.id)).map(c=>{const n=posts.filter(p=>p.circleId===c.id).length;
    return `<a class="entry circle-link" href="#cercle/${c.id}"><div class="t"><span class="title">${esc(c.title)}</span><span class="kind">${mine.includes(c.id)?'tu en fais partie':c.members+' ici'}</span></div><div class="desc">${esc(c.about||'')}</div><div class="hint">${n} message${n>1?'s':''}</div></a>`;}).join('');
  $('nc').addEventListener('click',async()=>{const t=$('nc-t').value.trim();if(!t)return;const c=await DB.put('circles',{title:t,about:$('nc-a').value.trim(),members:1,createdBy:'me'});me.circles=[...mine,c.id];await DB.put('profiles',me);location.hash='#cercle/'+c.id;});
};
Pages.cercle=async function(S,id){
  const {$,esc,dn,hhmm}=App;const {me}=await App.loadMe();me.circles=me.circles||[];
  let c=await DB.get('circles',id);const q=App.qdjToday();
  if(!c&&id&&id.startsWith('qdj-'))c={id,title:id===q.id?q.q:'Question du jour',about:'La question du jour. Une réponse courte suffit.',members:null,qdj:true};
  if(!c){S.innerHTML='<a class="back" href="#cercles">← Cercles</a><div class="empty">Ce cercle n\'existe pas.</div>';return;}
  const profs=Object.fromEntries((await DB.all('profiles')).map(p=>[p.id,p]));const hidden=new Set((await App.others()).map(p=>p.id));
  const member=me.circles.includes(c.id);
  S.innerHTML=`<a class="back" href="${c.qdj?'#now':'#cercles'}">← ${c.qdj?'Maintenant':'Cercles'}</a><p class="eyebrow">${c.qdj?'Question du jour':'Cercle'}</p><h1>${esc(c.title)}</h1><p class="muted" style="margin-top:6px">${esc(c.about||'')}</p>
  ${c.qdj?'':`<div class="row" style="justify-content:flex-start;margin-top:12px"><button class="btn ${member?'ghost':'flame'}" type="button" id="join">${member?'Quitter le cercle':'Rejoindre le cercle'}</button><span class="muted small" style="align-self:center">${c.members+(member&&!c.createdBy?1:0)} personnes</span></div>`}
  <div class="posts" id="posts"></div>
  <div class="form on" style="margin-top:14px"><label>${c.qdj?'Ma réponse':'Écrire au cercle'} <span class="muted" style="text-transform:none;letter-spacing:0">(sous ton pseudo ${esc(dn(me))})</span></label><textarea class="ta" id="pt" rows="2" placeholder="${c.qdj?'En une ou deux phrases…':'Ce que tu veux partager avec tout le cercle…'}"></textarea><div class="row"><button class="btn" type="button" id="pp">Publier</button></div></div>`;
  async function renderPosts(){const P=$('posts');const ps=(await DB.where('circlePosts','circleId',c.id)).filter(x=>x.author==='me'||hidden.has(x.author)).sort((a,b)=>a.ts-b.ts);
    P.innerHTML=ps.length?ps.map(x=>{const a=profs[x.author];return `<div class="post ${x.author==='me'?'mine':''}"><div class="ph">${a&&!a.isMe?`<a href="#personne/${a.id}">${esc(dn(a))}</a>`:esc(dn(me))} <small>${hhmm(x.ts)}</small></div><p>${esc(x.text)}</p></div>`;}).join(''):'<div class="empty">Personne n\'a encore écrit ici. Tu peux être le premier.</div>';}
  renderPosts();
  $('pt').addEventListener('input',e=>App.grow(e.target));
  $('pp').addEventListener('click',async()=>{const t=$('pt').value.trim();if(!t)return;await DB.put('circlePosts',{circleId:c.id,author:'me',text:t,ts:Date.now()});$('pt').value='';
    if(!c.qdj&&!member){me.circles.push(c.id);await DB.put('profiles',me);}renderPosts();});
  const j=$('join');if(j)j.addEventListener('click',async()=>{me.circles=member?me.circles.filter(x=>x!==c.id):[...me.circles,c.id];await DB.put('profiles',me);Router.route();});
};
