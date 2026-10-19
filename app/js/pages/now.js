/* FeelShareLove — écran « Maintenant » : ma disponibilité, la question du jour, qui est là et pour quoi */
Pages.now=async function(S){
  const {$,esc,norm,WANTS,WANT,isAvail,hhmm,dn}=App;
  const SHORT={parler:'Parler',rire:'Rire',decouvrir:'Découvrir quelqu\'un',proposer:'Une proposition',soiree:'Une soirée',ecoute:'Être écouté'};
  let {me,entries}=await App.loadMe();
  const people=await App.others();for(const p of people)p.entries=await DB.where('entries','profileId',p.id);
  S.innerHTML=`<p class="eyebrow">Maintenant</p><h1 id="now-title"></h1>
    <div class="avail-card" id="my-avail"></div>
    <div class="qdj" id="qdj"></div>
    <div class="search"><input id="q-search" placeholder="Un film, un livre, une passion, un pseudo…"></div>
    <div class="filter" id="f-wants">${WANTS.map(w=>`<button class="chip" type="button" data-w="${w.k}">${SHORT[w.k]}</button>`).join('')}</div>
    <div class="filter" id="f-more" style="margin-top:0"><button class="chip on" type="button" data-f="avail">Disponibles</button><button class="chip" type="button" data-f="reso">Qui résonne avec moi</button><button class="chip" type="button" data-f="intent">Même intention</button><button class="chip" type="button" data-f="verif">Vérifiés seulement</button></div>
    <div id="people"></div>
    <h2>Cercles <em>ouverts</em></h2><div class="list" id="circles"></div><a class="more" href="#cercles">Tous les cercles</a>`;
  const h=new Date().toLocaleTimeString('fr-CH',{hour:'2-digit',minute:'2-digit'});
  /* phrase du titre selon le moment de la journée ; elle change chaque jour, pas à chaque visite */
  const f=App.fem(me),seul=f?'seule':'seul',hr=new Date().getHours(),day=Math.floor(Date.now()/864e5);
  const T=hr<5?['La nuit est longue. Ailleurs dans le monde, d\'autres sont éveillés.','Tu ne dors pas ? D\'autres non plus.','Au cœur de la nuit, quelqu\'un a peut-être envie de parler.']
    :hr<9?['Bonjour. La journée commence, pour d\'autres aussi.','Le café fume. Qui est déjà debout ?','Un nouveau jour. Quelqu\'un pense peut-être à la même chose que toi.']
    :hr<12?['Belle matinée. Qui a envie d\'échanger ?','La matinée avance. Un mot peut changer une journée.','Ce matin, quelqu\'un aimerait te lire.']
    :hr<14?['C\'est l\'heure de la pause. Pas besoin de la passer '+seul+'.','Midi. Le bon moment pour un mot gentil.','À table ou en pause : qui est là ?']
    :hr<18?['L\'après-midi file. Quelqu\'un a envie de parler.','Un creux dans l\'après-midi ? D\'autres aussi.','Cet après-midi, une rencontre est peut-être à un message.']
    :hr<22?['Le soir tombe. C\'est souvent là qu\'on a envie de parler.','La journée se termine. Raconte-la à quelqu\'un.','Ce soir, tu n\'es pas '+seul+'.']
    :['Il est tard. Tu n\'es pas '+seul+' à veiller.','La nuit commence. Quelqu\'un est encore là.','Avant de dormir, un dernier mot à quelqu\'un ?'];
  $('now-title').textContent=T[day%T.length];
  const nAv=people.filter(isAvail).length;
  $('now-title').insertAdjacentHTML('afterend',`<p class="muted small" style="margin:6px 0 4px">${esc(h)}${me.city?' à '+esc(me.city.replace(/\s+CH$/,'')):''}${nAv?' · '+nAv+' personne'+(nAv>1?'s':'')+' disponible'+(nAv>1?'s':'')+' maintenant':''}</p>`);

  /* --- ma disponibilité --- */
  let draft={wants:[],note:'',dur:1};
  function renderAvail(){const A=$('my-avail');
    if(me.paused){A.innerHTML=`<div class="k">Ton portrait est en pause</div><p class="txt" style="font-style:normal;font-family:var(--body);font-size:14px">Personne ne te voit et personne ne peut t'écrire. <a href="#reglages" style="color:var(--saffron)">Revenir sur FeelShareLove</a></p>`;return;}
    if(isAvail(me)){A.innerHTML=`<div class="k">Tu es disponible jusqu'à ${hhmm(me.avail.until)}</div><div class="wants big">${me.avail.wants.map(k=>WANT[k].l).join(' · ')}</div>${me.avail.note?`<p class="txt">${esc(me.avail.note)}</p>`:''}<div class="row" style="justify-content:flex-start;margin-top:10px"><button class="btn ghost" type="button" id="av-stop">Ne plus être disponible</button></div>`;
      $('av-stop').addEventListener('click',async()=>{me.avail=null;await DB.put('profiles',me);renderAvail();});return;}
    A.innerHTML=`<div class="k">Tu n'es pas affiché comme disponible</div><button class="btn flame" type="button" id="av-open" style="margin-top:8px">Me rendre disponible</button>
      <div id="av-form" hidden><p class="muted small" style="margin:10px 0 6px">Ce dont j'ai envie</p><div class="intent" id="av-wants" style="margin-top:0">${WANTS.map(w=>`<button class="chip" type="button" data-k="${w.k}">${w.l}</button>`).join('')}</div>
      <input class="in" id="av-note" placeholder="Préciser (facultatif) : un film en même temps, un café en visio…" style="margin-top:10px">
      <p class="muted small" style="margin:10px 0 6px">Pendant</p><div class="intent" id="av-dur" style="margin-top:0"><button class="chip on" type="button" data-d="1">1 heure</button><button class="chip" type="button" data-d="3">3 heures</button><button class="chip" type="button" data-d="soir">Jusqu'à ce soir</button></div>
      <div class="row" style="margin-top:12px"><button class="btn" type="button" id="av-go">Je suis disponible</button></div><p class="muted small" id="av-err"></p></div>`;
    $('av-open').addEventListener('click',()=>{$('av-form').hidden=false;$('av-open').hidden=true;});
    $('av-wants').querySelectorAll('.chip').forEach(c=>c.addEventListener('click',()=>{c.classList.toggle('on');draft.wants=[...$('av-wants').querySelectorAll('.chip.on')].map(x=>x.dataset.k);}));
    $('av-dur').querySelectorAll('.chip').forEach(c=>c.addEventListener('click',()=>{$('av-dur').querySelectorAll('.chip').forEach(x=>x.classList.toggle('on',x===c));draft.dur=c.dataset.d;}));
    $('av-go').addEventListener('click',async()=>{if(!draft.wants.length){$('av-err').textContent='Choisis au moins une envie.';return;}
      let until;if(draft.dur==='soir'){const d=new Date();d.setHours(23,59,0,0);until=d.getTime();if(until<Date.now()+3600e3)until=Date.now()+3600e3;}else until=Date.now()+(+draft.dur)*3600e3;
      me.avail={wants:draft.wants,note:$('av-note').value.trim(),until};await DB.put('profiles',me);renderAvail();});}
  renderAvail();

  /* --- question du jour --- */
  const q=App.qdjToday();let posts=await DB.where('circlePosts','circleId',q.id);
  if(!posts.length&&!DB.remote){for(const [i,[a,t]] of q.a.entries())await DB.put('circlePosts',{id:q.id+'-'+i,circleId:q.id,author:a,text:t,ts:Date.now()-(3-i)*3600e3});posts=await DB.where('circlePosts','circleId',q.id);}
  const profs=Object.fromEntries((await DB.all('profiles')).map(p=>[p.id,p]));
  posts.sort((a,b)=>b.ts-a.ts);
  $('qdj').innerHTML=`<p class="eyebrow">Question du jour</p><p class="qq">${esc(q.q)}</p>${posts.slice(0,2).map(p=>`<p class="qa"><b>${esc(dn(profs[p.author]))}</b> ${esc(p.text)}</p>`).join('')}<a class="more" href="#cercle/${q.id}">Lire les ${posts.length} réponses et répondre</a>`;

  /* --- personnes --- */
  /* filtres gardés en mémoire sur cet appareil : on les retrouve en revenant sur la page */
  const KEY='fsl_now_filters';let saved={};try{saved=JSON.parse(localStorage.getItem(KEY)||'{}');}catch(e){}
  const fw=new Set(saved.fw||[]),ff={avail:true,reso:false,intent:false,verif:false,...(saved.ff||{})};
  const keep=()=>{try{localStorage.setItem(KEY,JSON.stringify({fw:[...fw],ff}));}catch(e){}};
  $('f-wants').querySelectorAll('.chip').forEach(c=>c.classList.toggle('on',fw.has(c.dataset.w)));
  $('f-more').querySelectorAll('.chip').forEach(c=>c.classList.toggle('on',!!ff[c.dataset.f]));
  function render(){const P=$('people');P.innerHTML='';const qs=norm($('q-search').value);
    let list=people.map(p=>{const r=App.resonance(entries,p.entries);r.n=r.common.length+r.feels.length+commonTypes(me,p).length+Plus.extraCommon(me,p).length;r.pct=Plus.similarity(me,p,entries,p.entries);return {p,r};});
    if(qs){list=list.map(x=>({...x,hits:x.p.entries.filter(e=>norm(e.title).includes(qs)||norm(e.why).includes(qs)||norm(e.desc).includes(qs)),nameHit:norm(dn(x.p)).includes(qs)||norm(x.p.city).includes(qs)})).filter(x=>x.hits.length||x.nameHit);}
    else{if(ff.avail)list=list.filter(x=>App.isAvail(x.p));if(fw.size)list=list.filter(x=>App.isAvail(x.p)&&x.p.avail.wants.some(w=>fw.has(w)));
      if(ff.reso)list=list.filter(x=>x.r.common.length||x.r.feels.length);if(ff.intent)list=list.filter(x=>x.p.intent.some(i=>(me.intent||[]).includes(i)));if(ff.verif)list=list.filter(x=>App.isVerified(x.p));}
    list.sort((a,b)=>(App.isAvail(b.p)-App.isAvail(a.p))||(b.r.score-a.r.score));
    if(!list.length){P.innerHTML='<div class="empty">'+(qs?'Personne n\'a encore mis ça dans son portrait. Ajoute-le au tien : la prochaine personne qui l\'écrira te verra.':'Personne avec ces filtres pour l\'instant. Élargis les filtres, ou rends-toi disponible : d\'autres te trouveront.')+'</div>';return;}
    list.forEach(({p,r,hits})=>{const sub=hits&&hits.length?`<div class="why-hit">${esc(hits[0].title)} : « ${esc(hits[0].why.slice(0,70))}… »</div>`:(App.isAvail(p)&&p.avail.note?`<div class="st">${esc(p.avail.note)}</div>`:`<div class="st">${esc(p.now)}</div>`);
      const d=App.personEl(p,r,sub);d.addEventListener('click',()=>location.hash='#personne/'+p.id);P.appendChild(d);});}
  render();
  $('q-search').addEventListener('input',render);
  $('f-wants').querySelectorAll('.chip').forEach(c=>c.addEventListener('click',()=>{c.classList.toggle('on');c.classList.contains('on')?fw.add(c.dataset.w):fw.delete(c.dataset.w);keep();render();}));
  $('f-more').querySelectorAll('.chip').forEach(c=>c.addEventListener('click',()=>{c.classList.toggle('on');ff[c.dataset.f]=c.classList.contains('on');keep();render();}));

  /* --- cercles --- */
  const circles=(await DB.all('circles')).sort((a,b)=>((me.circles||[]).includes(b.id))-((me.circles||[]).includes(a.id))).slice(0,3);
  $('circles').innerHTML=circles.map(c=>`<a class="entry circle-link" href="#cercle/${c.id}"><div class="t"><span class="title">${esc(c.title)}</span><span class="kind">${(me.circles||[]).includes(c.id)?'tu en fais partie':c.members+' ici'}</span></div></a>`).join('');
};
