/* FeelShareLove — logique commune : constantes, coque (étoile, barre du bas), résonances, catalogue, pseudo, voix, porte des messages */
window.App=(function(){
  const $=id=>document.getElementById(id);

  /* ---------- constantes ---------- */
  const INTENT_LABEL={parler:'Quelqu\'un à qui parler',amis:'Des amis',amour:'L\'amour'};
  const FACT_LABEL={age:'Âge',langs:'Langues',roots:'Racines',pets:'Animaux',work:'Ce que je fais',study:'Études',sign:'Signes'};
  const FACTS=[
    {id:'birth',k:'Date de naissance',type:'date',sub:'year'},
    {id:'sign',k:'Signe astrologique',type:'auto',ph:'Calculé depuis ta date de naissance'},
    {id:'langs',k:'Langues',ph:'français, anglais…'},
    {id:'roots',k:'Mes racines',ph:'Où j\'ai grandi, d\'où je viens',hiddenDefault:true},
    {id:'pets',k:'Animaux',ph:'Un chat qui s\'appelle…'},
    {id:'work',k:'Ce que je fais',ph:'Mon métier, raconté'},
    {id:'study',k:'Études',ph:'Niveau ou domaine'}];
  /* ce que ça me fait : la résonance émotionnelle */
  const FEELS=[
    {k:'bouleverse',l:'Ça me bouleverse',both:'ce qui bouleverse'},
    {k:'console',l:'Ça me console',both:'ce qui console'},
    {k:'rire',l:'Ça me fait rire',both:'ce qui fait rire'},
    {k:'courage',l:'Ça me donne du courage',both:'ce qui donne du courage'},
    {k:'nostalgie',l:'Ça me rend nostalgique',both:'ce qui rend nostalgique'},
    {k:'calme',l:'Ça m\'apaise',both:'ce qui apaise'},
    {k:'passion',l:'Ça me passionne',both:'ce qui passionne'},
    {k:'epate',l:'Ça m\'épate',both:'ce qui épate'},
    {k:'hallucine',l:'Ça m\'hallucine',both:'ce qui fait halluciner'},
    {k:'scotche',l:'Ça m\'a scotché',both:'ce qui scotche'},
    {k:'vital',l:'Je ne peux pas vivre sans',both:'ce dont on ne peut pas se passer'}];
  const FEEL=Object.fromEntries(FEELS.map(f=>[f.k,f]));
  /* envies du moment (disponibilité) */
  const WANTS=[
    {k:'parler',l:'Envie de parler maintenant'},
    {k:'rire',l:'Envie de rire'},
    {k:'decouvrir',l:'Envie de découvrir quelqu\'un'},
    {k:'proposer',l:'Envie de proposer un truc'},
    {k:'soiree',l:'Envie d\'organiser une soirée'},
    {k:'ecoute',l:'Envie d\'être écouté'}];
  const WANT=Object.fromEntries(WANTS.map(w=>[w.k,w]));
  /* pseudo composé : début du prénom + un mot d'une famille */
  const FAMILIES={
    fantastique:{l:'Animal fantastique',w:['Licorne','Phénix','Dragon','Griffon','Pégase','Sirène','Chimère','Salamandre','Hippogriffe','Kraken','Basilic','Centaure','Faune','Elfe','Sphinx','Hydre','Yéti','Lutin','Fée','Kitsune','Wyvern','Simorgh','Naga','Minotaure','Farfadet']},
    animal:{l:'Animal',w:['Loup','Renard','Lynx','Ours','Aigle','Faucon','Hibou','Panthère','Jaguar','Puma','Cerf','Lièvre','Dauphin','Baleine','Tigre','Lion','Corbeau','Héron','Colibri','Gazelle','Mustang','Écureuil','Loutre','Flamant','Panda']},
    signe:{l:'Signe astrologique',w:['Bélier','Taureau','Gémeaux','Cancer','Lion','Vierge','Balance','Scorpion','Sagittaire','Capricorne','Verseau','Poissons','Rat','Buffle','Tigre','Lapin','Dragon','Serpent','Cheval','Chèvre','Singe','Coq','Chien','Cochon']},
    couleur:{l:'Couleur',w:['Ambre','Carmin','Indigo','Safran','Céladon','Pourpre','Ocre','Turquoise','Vermillon','Opaline','Corail','Azur','Jade','Grenat','Cobalt','Émeraude','Lavande','Garance','Cyan','Sépia','Bordeaux','Cerise','Olive','Ivoire','Écarlate']},
    matiere:{l:'Matière',w:['Velours','Soie','Cuivre','Lin','Ébène','Cristal','Bronze','Cachemire','Opale','Nacre','Satin','Ambre','Argent','Or','Jaspe','Onyx','Perle','Rubis','Saphir','Quartz','Topaze','Granit','Marbre','Laine','Tweed']},
    element:{l:'Élément et ciel',w:['Feu','Orage','Brume','Aurore','Comète','Volcan','Marée','Zéphyr','Givre','Étoile','Lune','Soleil','Nuage','Éclair','Pluie','Neige','Tempête','Vent','Océan','Galaxie','Éclipse','Nova','Crépuscule','Mistral','Sirocco']},
    nature:{l:'Plante et fleur',w:['Lys','Rose','Iris','Lotus','Jasmin','Orchidée','Coquelicot','Tournesol','Cèdre','Olivier','Saule','Bambou','Lierre','Mimosa','Pivoine','Magnolia','Sauge','Menthe','Fougère','Érable','Chêne','Glycine','Camélia','Dahlia','Cerisier']},
    musique:{l:'Musique et danse',w:['Tango','Blues','Jazz','Salsa','Soul','Rumba','Valse','Flamenco','Bossa','Swing','Fado','Samba','Gospel','Funk','Opéra','Boléro','Mambo','Reggae','Calypso','Zouk','Rock','Ballade','Sonate','Tempo','Groove']}};
  /* question du jour : une par jour, en boucle */
  const QDJ=[
    {q:'Quelle musique ce soir ?',a:[['tomas','Goyeneche, « Garúa ». Il pleut ici aussi.'],['kenji','Bill Evans, « Peace Piece ». Pour finir la journée doucement.']]},
    {q:'Qu\'est-ce qui t\'a fait sourire aujourd\'hui ?',a:[['aicha','Un patient de 90 ans qui m\'a demandée en mariage à 4 h du matin.'],['lucia','Nube qui a volé une orange au marché.']]},
    {q:'Un film à revoir cette semaine ?',a:[['lucia','Volver. Pour les mères.'],['tomas','Les Enfants du paradis. Il est long, j\'ai le temps.']]},
    {q:'Le plat qui te console ?',a:[['aicha','La chorba de ma mère. Je n\'arrive pas à la refaire pareil.'],['kenji','Un riz au thé vert, à minuit.']]},
    {q:'Un endroit où tu te sens chez toi, même loin ?',a:[['kenji','Les gares. Toutes les gares.'],['aicha','Les laveries automatiques, bizarrement.']]},
    {q:'Ce que tu n\'as dit à personne cette semaine ?',a:[['tomas','Que la retraite me fait peur.'],['lucia','Que j\'ai envie de repartir à zéro quelque part.']]},
    {q:'La dernière fois que tu as ri aux larmes ?',a:[['aicha','Avec ma sœur au téléphone, sur rien. Les meilleurs fous rires sont sur rien.'],['tomas','Mon petit-fils qui imite mon accent italien.']]}];
  function qdjToday(){const d=new Date();const day=Math.floor((d-new Date(d.getFullYear(),0,0))/864e5);const k=d.toISOString().slice(0,10);return {...QDJ[day%QDJ.length],id:'qdj-'+k};}

  /* ---------- utilitaires ---------- */
  function esc(s){return String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
  function norm(s){return String(s??'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();}
  const STOP=new Set(['dans','avec','pour','sans','sous','tout','tous','toute','mais','comme','cette','leur','elle','elles','nous','vous','mon','ma','mes','ton','les','des','une','the','and','seul','seule']);
  function words(s){return norm(s).split(' ').filter(w=>w.length>=5&&!STOP.has(w));}
  function grow(t){t.style.height='auto';t.style.height=t.scrollHeight+'px';}
  function zodiac(d){if(!d)return'';const [y,m,day]=d.split('-').map(Number);const z=[[1,20,'Capricorne'],[2,19,'Verseau'],[3,21,'Poissons'],[4,20,'Bélier'],[5,21,'Taureau'],[6,21,'Gémeaux'],[7,23,'Cancer'],[8,23,'Lion'],[9,23,'Vierge'],[10,23,'Balance'],[11,22,'Scorpion'],[12,22,'Sagittaire'],[13,1,'Capricorne']];
    for(let i=0;i<z.length-1;i++){if(m===z[i][0]&&day<z[i][1])return z[i][2];if(m===z[i][0]&&day>=z[i][1])return z[i+1][2];}return'';}
  function chineseAnimal(d){if(!d)return'';let [y,m,day]=d.split('-').map(Number);if(m<2||(m===2&&day<5))y--;return ['Rat','Buffle','Tigre','Lapin','Dragon','Serpent','Cheval','Chèvre','Singe','Coq','Chien','Cochon'][((y-4)%12+12)%12];}
  function chinese(d){if(!d)return'';let [y,m,day]=d.split('-').map(Number);if(m<2||(m===2&&day<5))y--;const el=['Bois','Feu','Terre','Métal','Eau'];return chineseAnimal(d)+' de '+el[Math.floor((((y-4)%10+10)%10)/2)];}
  function localTime(p){const d=new Date(Date.now()+(p.tz||0)*3600e3);return d.toLocaleTimeString('fr-CH',{hour:'2-digit',minute:'2-digit'});}
  const hhmm=ts=>new Date(ts).toLocaleTimeString('fr-CH',{hour:'2-digit',minute:'2-digit'});
  const fem=p=>p.g?p.g==='f':(p.accord==='f'||p.accord==='m')?p.accord==='f':/a$/i.test(norm(p.name)); // accord choisi par la personne, sinon son prénom (version locale)
  const dn=p=>p?(p.pseudo||p.name||'Toi'):'';                 // nom affiché : toujours le pseudo
  const isAvail=p=>!!(p&&p.avail&&p.avail.until>Date.now());
  const today=()=>new Date().toISOString().slice(0,10);

  /* ---------- coque commune ---------- */
  function shell(){
    const phone=document.querySelector('.phone');
    const star=document.createElement('button');star.className='star';star.type='button';star.id='star';star.setAttribute('aria-label','Menu');
    star.innerHTML='<svg viewBox="0 0 24 24"><path d="M12 2c-.4 3.8-1.6 6.6-3.2 7.4C7.2 10.2 4.6 9.8 1.5 9c3.1 1.6 4.9 3 5.2 4.7.3 1.7-1 4-3 7 2.8-2.3 5.2-3.2 7-2.7 1.8.5 3.6 2.3 5.6 4.9-1.3-3.3-1.6-5.6-.7-7.1.9-1.5 3.2-2.4 6.9-3-3.9-.3-6.3-1.1-7.2-2.5C14.4 8.9 13.4 6.3 12 2z"/></svg>';
    const menu=document.createElement('div');menu.className='menu';menu.id='menu';
    menu.innerHTML=`<a href="#messages">Messages <small id="msg-count"></small></a><a href="#tribu">Ma tribu <small>les gens qui comptent</small></a><a href="#cercles">Cercles <small>thèmes partagés</small></a><a href="#reglages">Réglages <small>listes, visibilité</small></a><hr><a href="#portrait">Mon portrait</a><a href="#apercu">Ce que les autres voient</a><a href="#donnees">Mes données <small>sauvegarde</small></a><a href="#conditions">Aide et conditions</a>`;
    const tabs=document.createElement('nav');tabs.className='tabs';tabs.setAttribute('aria-label','Menu principal');
    tabs.innerHTML='<svg class="tabwave" viewBox="0 0 390 22" preserveAspectRatio="none" aria-hidden="true"><path d="M0 14 C40 4 70 20 110 12 S180 2 220 11 S300 22 340 9 S380 6 390 10 L390 22 L0 22 Z" style="fill:var(--bar)"/><path d="M0 14 C40 4 70 20 110 12 S180 2 220 11 S300 22 340 9 S380 6 390 10" fill="none" stroke="#e8456e" stroke-width="1.6" stroke-dasharray="14 4 3 4"/></svg>'+
      [['now','now','Maintenant'],['resonances','res','Résonances'],['messages','msg','Messages'],['tribu','tribu','Ma tribu'],['portrait','port','Portrait']].map(([h,i,l])=>`<a href="#${h}" data-tab="${h}">${Plus.icon(i)}${h==='messages'?'<span class="tbadge" id="tab-badge" hidden></span>':''}<span>${l}</span></a>`).join('');
    phone.prepend(menu);phone.prepend(star);phone.append(tabs);
    star.addEventListener('click',()=>{menu.classList.toggle('on');star.classList.toggle('on');});
    document.querySelector('.screen').addEventListener('click',closeMenu);
  }
  function closeMenu(){const m=$('menu'),s=$('star');if(m){m.classList.remove('on');s.classList.remove('on');}}
  async function refreshMsgCount(){const th=await DB.all('threads');const n=th.filter(t=>t.status==='pending-in').length;const el=$('msg-count');if(el)el.textContent=n?n+' demande'+(n>1?'s':''):th.filter(t=>t.status==='open').length+' ouvertes';const tb=$('tab-badge');if(tb){tb.textContent=n;tb.hidden=!n;}}

  /* ---------- données ---------- */
  async function loadMe(){const me=await DB.get('profiles','me');const entries=await DB.where('entries','profileId','me');const qs=await DB.where('questions','profileId','me');return {me,entries,qs};}
  async function loadPerson(id){const p=await DB.get('profiles',id);if(!p)return null;p.entries=await DB.where('entries','profileId',id);p.qs=await DB.where('questions','profileId',id);return p;}
  async function blockedNames(){const lists=await DB.where('lists','owner','me');return lists;}
  function isListed(p,lists){return lists.some(l=>{if(l.type!=='red'&&l.type!=='black')return false;if(l.target&&l.target===p.id)return true;const ln=norm(l.name);return l.type==='red'?(norm(p.name).split(' ').includes(ln.split(' ')[0])||ln===norm(p.pseudo)):(ln===norm(p.name)||ln===norm(p.pseudo));});}
  /* ma tribu : liste privée des gens qui comptent */
  async function tribeOf(){return (await DB.where('lists','owner','me')).filter(l=>l.type==='tribe');}
  async function inTribe(p){return (await tribeOf()).find(l=>l.target===p.id)||null;}
  async function tribeAdd(p){if(await inTribe(p))return;await DB.put('lists',{owner:'me',type:'tribe',target:p.id,name:p.pseudo||p.name});}
  async function others(){const all=await DB.all('profiles');const lists=await blockedNames();return all.filter(p=>!p.isMe&&!isListed(p,lists));}
  async function isBlocked(p){return isListed(p,await blockedNames());}

  /* ---------- résonances (niveau 1, sans IA) ----------
     1. même œuvre (identifiant du catalogue, sinon titre sans accents)
     2. écho : un mot fort commun aux titres
     3. émotion : chacun a une entrée qui lui fait la même chose (console, fait rire…) */
  const workKey=e=>e.workId||('t:'+norm(e.title));
  function sameWork(a,b){if(a.workId&&b.workId)return a.workId===b.workId;const na=norm(a.title),nb=norm(b.title);return !!na&&!!nb&&(na===nb||na.includes(nb)||nb.includes(na));}
  function resonance(mine,theirs){const common=[],echo=[],feels=[];const used=new Set();
    theirs.forEach(t=>{const m=mine.find(x=>sameWork(x,t));if(m){common.push({mine:m,theirs:t});used.add(t.id);used.add(m.id);return;}
      const tw=words(t.title);const near=mine.find(x=>words(x.title).some(w=>tw.includes(w)));if(near){echo.push({mine:near,theirs:t});}});
    FEELS.forEach(f=>{const m=mine.find(x=>(x.feel||[]).includes(f.k)&&!used.has(x.id));const t=theirs.find(x=>(x.feel||[]).includes(f.k)&&!used.has(x.id));if(m&&t)feels.push({feel:f,mine:m,theirs:t});});
    return {common,echo,feels,score:common.length*3+feels.length*2+echo.length};}

  /* ---------- éléments d'affichage ---------- */
  function feelTags(e){return (e.feel||[]).map(k=>FEEL[k]?`<span class="feel">${FEEL[k].l}</span>`:'').join('');}
  function entryEl(e,opts={}){const d=document.createElement('div');d.className='entry'+(opts.hit?' hit':'');d.tabIndex=0;
    d.innerHTML=`<div class="t"><span class="title">${esc(e.title)}</span><span class="kind">${esc(e.kind)}</span></div>`+(e.desc?`<div class="desc">${esc(e.desc)}</div>`:'')+(e.feel&&e.feel.length?`<div class="feels">${feelTags(e)}</div>`:'')+
      `<div class="hint">Touche pour lire pourquoi</div><div class="why">${esc(e.why)||'<span class="muted">(pas de pourquoi)</span>'}</div>`+(opts.hit?'<div class="tag">En commun avec toi</div>':'')+
      `<div class="ent-act">`+(opts.reply?'<button class="btn flame small-btn" type="button" data-a="reply">Répondre à cette entrée</button>':'')+(opts.edit?'<button class="btn ghost small-btn" type="button" data-a="edit">Modifier</button>':'')+(opts.del?'<button class="del" type="button" data-a="del">Retirer</button>':'')+`</div>`+
      (opts.reply?`<div class="compose"><label>Ton message part de cette entrée</label><textarea placeholder="Réagis à ce qui est écrit…"></textarea><button class="btn" type="button" data-a="send" style="margin-top:8px">Envoyer</button><div class="sent"></div></div>`:'');
    d.addEventListener('click',async ev=>{const a=ev.target.dataset&&ev.target.dataset.a;
      if(ev.target.closest('.compose')&&a!=='send')return;
      if(a==='del'){opts.del();return;} if(a==='edit'){opts.edit();return;}
      if(a==='reply'){d.querySelector('.compose').classList.toggle('on');d.querySelector('textarea').focus();return;}
      if(a==='send'){const txt=d.querySelector('textarea').value.trim();if(!txt)return;const r=await opts.reply(txt);const s=d.querySelector('.sent');s.style.display='block';s.innerHTML=r;if(!/^Il te reste|^Ta limite|^Attends/.test(r))d.querySelector('textarea').value='';return;}
      d.classList.toggle('open');});
    d.addEventListener('keydown',k=>{if(k.target.tagName==='TEXTAREA')return;if(k.key==='Enter'||k.key===' '){k.preventDefault();d.classList.toggle('open');}});return d;}
  function avatarHtml(p,cls=''){return `<div class="avatar ${p.av||''} ${cls}" aria-hidden="true">${p.photo?`<img src="${p.photo}" alt="">`:''}</div>`;}
  function personEl(p,r,sub){const d=document.createElement('div');d.className='person';
    const wants=isAvail(p)?`<div class="wants">${p.avail.wants.map(k=>WANT[k]?WANT[k].l:'').filter(Boolean).join(' · ')}</div>`:'';
    d.innerHTML=`${avatarHtml(p)}<div class="i"><div class="nm">${esc(dn(p))}${badge(p)} <small>${esc(p.city)}${p.travel?' · en voyage':''} · ${localTime(p)}</small></div>${wants}${sub||''}</div>`+(r?(r.pct!=null?`<div class="r"><b>${r.pct}%</b><span>similitude</span></div>`:`<div class="r"><b>${r.n!=null?r.n:r.common.length+r.feels.length}</b><span>résonne</span></div>`):'')+`<div class="dot ${isAvail(p)?'':'off'}" aria-hidden="true"></div>`;
    return d;}

  /* ---------- catalogue (Wikipédia, gratuit, sans inscription) ---------- */
  const catCache=new Map();
  async function catalogSearch(q){q=q.trim();if(q.length<2)return [];if(catCache.has(q))return catCache.get(q);
    let out=[];
    try{const r=await fetch('https://fr.wikipedia.org/w/rest.php/v1/search/title?q='+encodeURIComponent(q)+'&limit=7');if(!r.ok)throw 0;const j=await r.json();
      out=(j.pages||[]).map(p=>({title:p.title,desc:p.description||'',thumb:p.thumbnail&&p.thumbnail.url?(p.thumbnail.url.startsWith('//')?'https:'+p.thumbnail.url:p.thumbnail.url):'',workId:'wp:'+norm(p.title)}));}
    catch(e){try{const r=await fetch('https://fr.wikipedia.org/w/api.php?action=opensearch&format=json&origin=*&limit=7&search='+encodeURIComponent(q));const j=await r.json();out=(j[1]||[]).map((t,i)=>({title:t,desc:(j[2]||[])[i]||'',thumb:'',workId:'wp:'+norm(t)}));}catch(e2){throw new Error('offline');}}
    catCache.set(q,out);return out;}
  /* champ titre avec propositions dès les premières lettres ; on peut toujours garder son propre texte */
  function catalogField(initial,onChange){
    const w=document.createElement('div');w.className='catalog';
    w.innerHTML=`<input class="in title-in" placeholder="Tape les premiers mots : légendes d'aut…" autocomplete="off"><div class="picked"></div><div class="suggest" hidden></div>`;
    const inp=w.querySelector('input'),sug=w.querySelector('.suggest'),picked=w.querySelector('.picked');
    let state={title:initial.title||'',workId:initial.workId||'',desc:initial.desc||''};inp.value=state.title;
    const showPicked=()=>{picked.innerHTML=state.workId?`<span class="ok">Dans le catalogue</span>${state.desc?' · '+esc(state.desc):''}`:(state.title?'<span class="muted">Texte libre (hors catalogue)</span>':'');};showPicked();
    let t=null,seq=0;
    inp.addEventListener('input',()=>{state={title:inp.value,workId:'',desc:''};showPicked();onChange(state);clearTimeout(t);const q=inp.value;
      if(q.trim().length<2){sug.hidden=true;return;}
      t=setTimeout(async()=>{const my=++seq;sug.hidden=false;sug.innerHTML='<div class="s-info">Recherche…</div>';
        try{const res=await catalogSearch(q);if(my!==seq)return;
          sug.innerHTML=res.map((r,i)=>`<button type="button" class="s-item" data-i="${i}">${r.thumb?`<img src="${esc(r.thumb)}" alt="">`:'<span class="s-ph"></span>'}<span><b>${esc(r.title)}</b>${r.desc?`<small>${esc(r.desc)}</small>`:''}</span></button>`).join('')+`<button type="button" class="s-item s-free"><span><b>Garder « ${esc(q)} »</b><small>tel que je l'ai écrit</small></span></button>`;
          sug.querySelectorAll('.s-item').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.i!==undefined){const r=res[+b.dataset.i];state={title:r.title,workId:r.workId,desc:r.desc};inp.value=r.title;}sug.hidden=true;showPicked();onChange(state);}));}
        catch(e){if(my!==seq)return;sug.innerHTML='<div class="s-info">Catalogue injoignable (pas de connexion ?). Tu peux écrire librement.</div>';}},280);});
    inp.addEventListener('keydown',k=>{if(k.key==='Escape')sug.hidden=true;});
    return {el:w,focus:()=>inp.focus()};}
  /* formulaire d'entrée « ce qui me fait vibrer » (ajout ou modification) */
  function entryForm(entry,onSave,onCancel){
    const e={kind:'Film',title:'',why:'',feel:[],...entry};
    const f=document.createElement('div');f.className='form on';
    f.innerHTML=`<label>Type</label><select>${['Film','Livre','Musique','Série','Lieu','Activité','Objet','Souvenir','Personne','Autre'].map(k=>`<option ${k===e.kind?'selected':''}>${k}</option>`).join('')}</select>
      <label>Titre</label><div class="cat-slot"></div>
      <label>Ce que ça me fait <span class="muted" style="text-transform:none;letter-spacing:0">(deux au plus)</span></label><div class="intent feel-pick">${FEELS.map(x=>`<button class="chip ${e.feel.includes(x.k)?'on':''}" type="button" data-k="${x.k}">${x.l}</button>`).join('')}</div>
      <label>Pourquoi</label><textarea class="ta" rows="3" placeholder="Ce que ça me fait, ce que ça dit de moi…"></textarea>
      <div class="row">${onCancel?'<button class="btn ghost" type="button" data-a="cancel">Annuler</button>':''}<button class="btn" type="button" data-a="save">${entry&&entry.id?'Enregistrer':'Ajouter'}</button></div>`;
    const cat=catalogField(e,s=>{e.title=s.title;e.workId=s.workId;e.desc=s.desc;});f.querySelector('.cat-slot').appendChild(cat.el);
    const ta=f.querySelector('textarea');ta.value=e.why||'';setTimeout(()=>grow(ta),0);ta.addEventListener('input',()=>grow(ta));
    f.querySelectorAll('.feel-pick .chip').forEach(c=>c.addEventListener('click',()=>{const k=c.dataset.k;if(e.feel.includes(k))e.feel=e.feel.filter(x=>x!==k);else{e.feel.push(k);if(e.feel.length>2)e.feel.shift();}f.querySelectorAll('.feel-pick .chip').forEach(x=>x.classList.toggle('on',e.feel.includes(x.dataset.k)));}));
    f.querySelector('[data-a=save]').addEventListener('click',async()=>{e.kind=f.querySelector('select').value;e.why=ta.value.trim();e.title=(e.title||'').trim();if(!e.title){cat.focus();return;}if(!e.workId)delete e.workId;await onSave(e);});
    const c=f.querySelector('[data-a=cancel]');if(c)c.addEventListener('click',onCancel);
    setTimeout(()=>cat.focus(),0);return f;}

  /* ---------- pseudo ---------- */
  function prefixes(name){const n=(name||'').trim().split(/[\s-]+/)[0];if(!n)return [];const cap=s=>s.charAt(0).toUpperCase()+s.slice(1).toLowerCase();const out=new Set();
    if(n.length<=5)out.add(cap(n));const p4=cap(n.slice(0,4));out.add(p4);
    if(!/[aeiouyàâéèêëïîíóôúù]$/i.test(p4))out.add(p4+'o');else out.add(cap(n.slice(0,3)));
    return [...out].slice(0,3);}
  function pseudoProposals(name,family,birth,n=6){const pre=prefixes(name);if(!pre.length)return [];
    let w=FAMILIES[family].w.slice();if(family==='signe'&&birth){const z=zodiac(birth),c=chineseAnimal(birth);w=[z,c,...w.filter(x=>x!==z)];}
    const out=new Set();let guard=0;while(out.size<n&&guard++<100){const p=pre[Math.floor(Math.random()*pre.length)];const x=(family==='signe'&&birth&&out.size<2)?w[out.size]:w[Math.floor(Math.random()*w.length)];out.add(p+x.replace(/\s/g,''));}
    return [...out];}

  /* ---------- voix ---------- */
  function recorder(label,max,onDone){const b=document.createElement('button');b.type='button';b.className='btn ghost';b.textContent=label;let rec=null,t0=0,timer=null;
    b.addEventListener('click',async()=>{if(rec){rec.stop();return;}
      if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia||!window.MediaRecorder){b.textContent='Micro indisponible dans ce navigateur';return;}
      let stream;try{stream=await navigator.mediaDevices.getUserMedia({audio:true});}catch(e){b.textContent='Micro refusé (autorise-le dans Firefox)';return;}
      const chunks=[];rec=new MediaRecorder(stream);rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      rec.onstop=()=>{stream.getTracks().forEach(t=>t.stop());clearInterval(timer);const secs=Math.max(1,Math.round((Date.now()-t0)/1000));const blob=new Blob(chunks,{type:rec.mimeType||'audio/ogg'});rec=null;b.classList.remove('rec');b.textContent=label;onDone(blob,secs);};
      rec.start();t0=Date.now();b.classList.add('rec');const tick=()=>{const s=Math.round((Date.now()-t0)/1000);b.textContent='● '+s+' s / '+max+' · arrêter';if(s>=max&&rec)rec.stop();};tick();timer=setInterval(tick,250);});
    return b;}
  function audioEl(blob){const a=document.createElement('audio');a.controls=true;a.src=URL.createObjectURL(blob);a.className='aud';return a;}
  function speak(text){if(!window.speechSynthesis)return false;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='fr-FR';u.rate=.95;speechSynthesis.speak(u);return true;}

  /* ---------- porte des messages ----------
     - le premier message répond toujours à une entrée du portrait de l'autre
     - l'autre choisit d'ouvrir la conversation ou non
     - trois premiers messages par jour */
  const FIRST_PER_DAY=3;
  async function firstLeft(){const th=await DB.all('threads');const n=th.filter(t=>t.startedBy==='me'&&t.firstAt&&new Date(t.firstAt).toISOString().slice(0,10)===today()).length;return Math.max(0,FIRST_PER_DAY-n);}
  const REPLY={tomas:'Ah, celui-là. Je pleure à la fin, et au milieu aussi.',kenji:'Merci d\'avoir écrit. Il est tôt ici, je marche, je vous réponds en marchant.',aicha:'Ça me fait plaisir. Je rentre de garde, je lis ça au chaud.',lucia:'Je lis ça et je souris. Raconte-moi la suite.'};
  const ACCEPT={tomas:'J\'ouvre volontiers. Racontez-moi.',kenji:'Bonne idée de commencer par là. J\'accepte avec plaisir.',aicha:'Oui ! Ça fait du bien de lire ça.',lucia:'J\'ai ouvert. Tu as visé juste avec ce que tu as écrit.'};
  /* simulation : les personnes fictives acceptent quelques secondes après */
  /* vérification d'identité : contrôle à la main côté FeelShareLove ; en local, simulé après quelques secondes. La photo de la carte est supprimée ensuite. */
  async function tickVerify(){const me=await DB.get('profiles','me');if(!me||!me.verified||me.verified.status!=='pending'||Date.now()<me.verified.at+8000)return false;
    me.verified={status:'verified',at:Date.now()};await DB.put('profiles',me);await DB.del('settings','idcheck');return true;}
  async function tickThreads(){if(DB.remote)return false;let changed=await tickVerify();for(const t of await DB.all('threads')){if(t.status==='pending-out'&&t.acceptAt&&t.acceptAt<Date.now()){
    if(t.id==='aicha'){t.status='declined-by-them';await DB.put('threads',t);await DB.put('messages',{thread:t.id,from:t.id,to:'me',kind:'decline',text:DECLINE.amis[0],ts:Date.now()});changed=true;continue;}
    t.status='open';await DB.put('threads',t);
    await DB.put('messages',{thread:t.id,from:t.id,to:'me',kind:'text',text:ACCEPT[t.id]||'J\'ai ouvert la conversation.',ts:Date.now()});changed=true;}}return changed;}
  /* refus obligatoire, gentil, non modifiable : on choisit une phrase selon le contexte */
  const DECLINE={
    parler:['Salut, merci pour ton message. Je ne suis pas disponible pour échanger en ce moment, j\'espère que tu trouveras quelqu\'un avec qui parler ce soir. Bises.',
      'Merci d\'avoir répondu à ce que j\'ai écrit, ça m\'a touché(e). Je préfère ne pas commencer de conversation pour l\'instant, bonne soirée à toi.'],
    amis:['Salut, merci pour ton message. Je ne pense pas qu\'on soit sur la même longueur d\'onde, j\'espère que tu comprends. Belle continuation, bises.'],
    amour:['Salut, désolé(e) mais je ne suis pas intéressé(e), j\'espère que tu comprends. Bises.',
      'Merci pour ta gentillesse. Je ne ressens pas ce petit quelque chose qui me donnerait envie d\'aller plus loin, je te souhaite de belles rencontres.'],
    toutes:['Merci de m\'avoir écrit, ça m\'a fait plaisir. Ce n\'est pas le bon moment pour moi, prends soin de toi.']};
  /* accords : masculin / féminin / neutre, choisis par la personne */
  function accord(me,text){const a=(me&&me.accord)||'n';return String(text).replace(/\((e|se|ve|trice)\)/g,(m0,suf)=>a==='m'?'':a==='f'?(suf==='se'?'se':suf==='ve'?'ve':suf==='trice'?'trice':'e'):'·'+suf);}
  function declineChoices(p,me){const keys=[...new Set([...(p.intent||[]),'toutes'])];return keys.flatMap(k=>(DECLINE[k]||[]).map(t=>({k,t:accord(me,t)})));}
  async function pendingIn(){const people=await others();const ids=new Set(people.map(p=>p.id));return (await DB.all('threads')).filter(t=>t.status==='pending-in'&&ids.has(t.id));}
  /* règles du portrait : pseudo une fois pendant le premier mois ; photo libre le premier mois puis une fois par an */
  const MONTH=30*864e5,YEAR=365*864e5;
  const startOf=me=>me.onboardedAt||me.adultAt||Date.now();
  function pseudoRule(me){const end=startOf(me)+MONTH;if(me.pseudoChangedAt)return {ok:false,msg:'Tu as déjà utilisé ton changement de pseudo.'};
    if(Date.now()>end)return {ok:false,msg:'Le pseudo ne peut plus être changé : c\'était possible une fois pendant le premier mois.'};
    return {ok:true,msg:'Tu peux changer ton pseudo une seule fois, jusqu\'au '+new Date(end).toLocaleDateString('fr-CH',{day:'numeric',month:'long'})+'.'};}
  function photoRule(me){const first=startOf(me)+MONTH;if(!me.photo||Date.now()<first)return {ok:true,msg:me.photo?'Tu peux changer ta photo librement jusqu\'au '+new Date(first).toLocaleDateString('fr-CH',{day:'numeric',month:'long'})+', ensuite une fois par an.':''};
    const next=(me.photoChangedAt&&me.photoChangedAt>first-MONTH?me.photoChangedAt:first)+YEAR;
    if(me.photoChangedAt&&me.photoChangedAt>=first&&Date.now()<next)return {ok:false,msg:'Ta photo pourra être changée le '+new Date(next).toLocaleDateString('fr-CH',{day:'numeric',month:'long',year:'numeric'})+'.'};
    return {ok:true,msg:'Tu peux changer ta photo maintenant. Ensuite, la prochaine fois sera dans un an.'};}
  const badge=p=>p&&p.verified&&p.verified.status==='verified'?'<span class="vbadge" title="Identité vérifiée">vérifié</span>':'';
  const isVerified=p=>!!(p&&p.verified&&p.verified.status==='verified');
  /* caméra en direct : pas d'import depuis la galerie. Retardateur pour une photo en pied. */
  /* dessins de la photo, calculés sur le téléphone (rien n'est envoyé ailleurs) */
  const STYLES=[['real','Ma vraie photo'],['crayon','Crayon'],['affiche','Affiche'],['aquarelle','Aquarelle'],['points','Peinture de points']];
  function blur1(a,W,H,r){const t=new Float32Array(a.length),o=new Float32Array(a.length),n=2*r+1;
    for(let y=0;y<H;y++){let s=0;const R=y*W;for(let x=-r;x<=r;x++)s+=a[R+Math.min(W-1,Math.max(0,x))];
      for(let x=0;x<W;x++){t[R+x]=s/n;s+=a[R+Math.min(W-1,x+r+1)]-a[R+Math.max(0,x-r)];}}
    for(let x=0;x<W;x++){let s=0;for(let y=-r;y<=r;y++)s+=t[Math.min(H-1,Math.max(0,y))*W+x];
      for(let y=0;y<H;y++){o[y*W+x]=s/n;s+=t[Math.min(H-1,y+r+1)*W+x]-t[Math.max(0,y-r)*W+x];}}
    return o;}
  function stylize(url,style){return new Promise(res=>{const im=new Image();im.onload=()=>{
    const W=im.naturalWidth,H=im.naturalHeight,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');x.drawImage(im,0,0);
    const d=x.getImageData(0,0,W,H),p=d.data,N=W*H,g=new Float32Array(N),R=new Float32Array(N),G=new Float32Array(N),B=new Float32Array(N);
    for(let i=0;i<N;i++){R[i]=p[4*i];G[i]=p[4*i+1];B[i]=p[4*i+2];g[i]=.3*R[i]+.59*G[i]+.11*B[i];}
    const sketch=()=>{const inv=new Float32Array(N);for(let i=0;i<N;i++)inv[i]=255-g[i];const b=blur1(inv,W,H,8),k=new Float32Array(N);
      for(let i=0;i<N;i++)k[i]=Math.min(255,g[i]*255/(256-b[i]));return k;};
    if(style==='crayon'){const k=sketch();for(let i=0;i<N;i++){const v=Math.pow(k[i]/255,2.2)*255;p[4*i]=Math.min(255,v*1.02+4);p[4*i+1]=v;p[4*i+2]=Math.max(0,v*.94);}}
    else if(style==='affiche'){const pal=[[28,15,18],[122,31,58],[232,69,110],[255,106,42],[247,183,51],[251,234,219]];
      const s=blur1(g,W,H,2);let lo=255,hi=0;for(let i=0;i<N;i+=7){lo=Math.min(lo,s[i]);hi=Math.max(hi,s[i]);}
      for(let i=0;i<N;i++){const t=Math.max(0,Math.min(.999,(s[i]-lo)/Math.max(1,hi-lo)));const q=pal[Math.floor(t*pal.length)];p[4*i]=q[0];p[4*i+1]=q[1];p[4*i+2]=q[2];}}
    else if(style==='aquarelle'){const k=sketch(),r=blur1(R,W,H,4),gg=blur1(G,W,H,4),b=blur1(B,W,H,4),L=42;
      for(let i=0;i<N;i++){const m=.55+.45*Math.pow(k[i]/255,1.5),q=v=>Math.min(255,(Math.round(v/L)*L*.85+38)*m);p[4*i]=q(r[i]);p[4*i+1]=q(gg[i]);p[4*i+2]=q(b[i]);}}
    else if(style==='flou'){let r=R,gg=G,b=B;for(let n=0;n<3;n++){r=blur1(r,W,H,14);gg=blur1(gg,W,H,14);b=blur1(b,W,H,14);}
      for(let i=0;i<N;i++){p[4*i]=r[i]*.9+20;p[4*i+1]=gg[i]*.75;p[4*i+2]=b[i]*.7;}}
    if(style==='points'){/* peinture de points, comme le menu : des points ronds aux couleurs de l'app, plus gros dans la lumière */
      const sm=blur1(g,W,H,3),st=Math.max(6,Math.round(W/64));let lo=255,hi=0;for(let i=0;i<N;i+=5){lo=Math.min(lo,sm[i]);hi=Math.max(hi,sm[i]);}
      const pal=['#7a1f3a','#b8324f','#e8456e','#ff6a2a','#f7b733','#fbeadb'];x.fillStyle='#1c0f12';x.fillRect(0,0,W,H);
      for(let row=0,y=st/2;y<H;row++,y+=st*.87)for(let xx=(row%2?st:st/2);xx<W;xx+=st){const i=Math.min(N-1,Math.round(y)*W+Math.round(xx));const t=Math.max(0,Math.min(.999,(sm[i]-lo)/Math.max(1,hi-lo)));
        x.fillStyle=pal[Math.floor(t*pal.length)];x.beginPath();x.arc(xx,y,st*(.22+.26*t),0,7);x.fill();}
      res(c.toDataURL('image/jpeg',.88));return;}
    x.putImageData(d,0,0);res(c.toDataURL('image/jpeg',.85));};im.onerror=()=>res(url);im.src=url;});}
  function camera(opts={}){return new Promise(async resolve=>{
    const phone=document.querySelector('.phone');const o=document.createElement('div');o.className='cam';
    o.innerHTML=`<div class="cam-top"><b>${esc(opts.title||'Photo en direct')}</b><p>${esc(opts.hint||'')}</p></div><div class="cam-view"><video playsinline autoplay muted></video><div class="cam-count" hidden></div></div><canvas hidden></canvas>
      <div class="cam-bar"><button class="btn ghost" type="button" data-a="cancel">Annuler</button><button class="btn ghost" type="button" data-a="flip">Changer de caméra</button><button class="btn ghost" type="button" data-a="timer">Retardateur 10 s</button><button class="btn flame" type="button" data-a="shot">Prendre la photo</button></div>
      <div class="cam-review" hidden><img alt="">${opts.styles?`<div class="cam-styles" role="group" aria-label="Style de la photo">${STYLES.map((x,i)=>`<button class="chip${i?'':' on'}" type="button" data-s="${x[0]}">${x[1]}</button>`).join('')}</div><p class="cam-hint">Si tu choisis un dessin, seul le dessin est montré aux autres. Ta vraie photo reste privée (elle sert seulement à la vérification).</p>`:''}<div class="cam-bar"><button class="btn ghost" type="button" data-a="again">Reprendre</button><button class="btn" type="button" data-a="use">Utiliser cette photo</button></div></div><p class="cam-err"></p>`;
    phone.appendChild(o);const v=o.querySelector('video'),c=o.querySelector('canvas'),err=o.querySelector('.cam-err');let stream=null,facing='user',shot=null,styled=null;
    async function start(){if(stream)stream.getTracks().forEach(t=>t.stop());
      try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:facing,width:{ideal:1280},height:{ideal:1280}},audio:false});v.srcObject=stream;err.textContent='';}
      catch(e){err.textContent='Caméra inaccessible. Autorise-la dans Firefox (icône à gauche de l\'adresse), puis réessaie.';}}
    const done=r=>{if(stream)stream.getTracks().forEach(t=>t.stop());o.remove();resolve(r);};
    function take(){const w=v.videoWidth,h=v.videoHeight;if(!w)return;const W=600,H=800;const ratio=W/H;let sw=w,sh=w/ratio;if(sh>h){sh=h;sw=h*ratio;}
      c.width=W;c.height=H;const ctx=c.getContext('2d');if(facing==='user'){ctx.translate(W,0);ctx.scale(-1,1);}ctx.drawImage(v,(w-sw)/2,(h-sh)/2,sw,sh,0,0,W,H);
      shot=c.toDataURL('image/jpeg',.82);styled=shot;o.querySelector('.cam-review img').src=shot;o.querySelectorAll('.cam-styles .chip').forEach((b,i)=>b.classList.toggle('on',!i));o.querySelector('.cam-review').hidden=false;}
    o.addEventListener('click',async e=>{const st=e.target.dataset&&e.target.dataset.s;
      if(st&&shot){o.querySelectorAll('.cam-styles .chip').forEach(b=>b.classList.toggle('on',b===e.target));styled=st==='real'?shot:await stylize(shot,st);if(e.target.classList.contains('on'))o.querySelector('.cam-review img').src=styled;return;}
      const a=e.target.dataset&&e.target.dataset.a;if(!a)return;
      if(a==='cancel')done(null);if(a==='flip'){facing=facing==='user'?'environment':'user';start();}
      if(a==='shot')take();if(a==='again'){o.querySelector('.cam-review').hidden=true;}if(a==='use'){if(opts.out)opts.out.real=styled!==shot?shot:null;done(styled||shot);}
      if(a==='timer'){const cd=o.querySelector('.cam-count');let n=10;cd.hidden=false;cd.textContent=n;const iv=setInterval(()=>{n--;cd.textContent=n;if(n<=0){clearInterval(iv);cd.hidden=true;take();}},1000);}});
    start();});}
  async function sendTo(p,text,about){
    if(await isBlocked(p))return {error:'Cette personne est sur une de tes listes.'};
    let th=await DB.get('threads',p.id);
    if(th&&th.status==='declined-by-them')return {error:dn(p)+' a répondu ne pas souhaiter commencer de conversation.'};
    if(!th||th.status==='declined'){
      if(!about)return {error:'Le premier message part d\'une entrée de son portrait.'};
      const left=await firstLeft();if(left<=0)return {error:'Ta limite de trois premiers messages pour aujourd\'hui est atteinte. Elle revient demain.'};
      th={id:p.id,status:'pending-out',startedBy:'me',firstAt:Date.now(),acceptAt:Date.now()+6000};await DB.put('threads',th);
    }else if(th.status==='pending-out'){return {error:'Attends que '+dn(p)+' ouvre la conversation.'};}
    else if(th.status==='pending-in'){th.status='open';await DB.put('threads',th);}
    const msg=await DB.put('messages',{thread:p.id,from:'me',to:p.id,kind:'text',text,about:about&&about.id,aboutTitle:about&&about.title,ts:Date.now()});
    return {ok:true,msg,thread:th,left:await firstLeft()};}
  function sendResultText(p,r){if(r.error)return r.error;
    if(r.thread.status==='pending-out')return `Envoyé. ${esc(dn(p))} lira ta réponse à côté de son entrée et choisira d'ouvrir la conversation. Il te reste ${r.left} premier${r.left>1?'s':''} message${r.left>1?'s':''} aujourd'hui. <a href="#messages/${p.id}">Voir</a>`;
    return `Envoyé. <a href="#messages/${p.id}">Ouvrir la conversation</a>`;}

  return {$,INTENT_LABEL,FACT_LABEL,FACTS,FEELS,FEEL,WANTS,WANT,FAMILIES,qdjToday,esc,norm,words,grow,zodiac,chinese,chineseAnimal,localTime,hhmm,fem,dn,isAvail,today,
    shell,closeMenu,refreshMsgCount,tribeOf,inTribe,tribeAdd,loadMe,loadPerson,others,isBlocked,resonance,workKey,feelTags,entryEl,avatarHtml,personEl,
    catalogSearch,catalogField,entryForm,stylize,STYLES,prefixes,pseudoProposals,recorder,audioEl,speak,firstLeft,tickThreads,sendTo,sendResultText,
    REPLY_FOR:p=>REPLY[p.id]||'Merci pour ton message.',accord,declineChoices,pendingIn,pseudoRule,photoRule,badge,isVerified,camera};
})();
window.Pages={};
