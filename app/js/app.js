/* FeelShareLove — logique commune : constantes, coque (étoile, barre du bas), résonances, catalogue, pseudo, voix, porte des messages */
window.App=(function(){
  const $=id=>document.getElementById(id);

  /* ---------- constantes ---------- */
  const INTENT_LABEL={parler:'Des échanges',passion:'Partager sa passion pour quelque chose',amis:'Se faire des amis',amour:'Trouver quelqu\'un à aimer',seul:'Rompre ma solitude'};
  const INTENT_DESC={parler:'Discuter, partager, au fil des envies',amis:'Des liens qui durent, se voir en vrai',seul:'Jamais visible, même dans ta tribu. Sert seulement à te relier à d\'autres qui le vivent aussi.'};
  const INTENT_PRIVATE=new Set(['seul']);                       // jamais affiché, ni sur le portrait, ni dans la tribu
  const shownIntent=l=>(l||[]).filter(k=>INTENT_LABEL[k]&&!INTENT_PRIVATE.has(k));
  /* les choix de « Ce qui t'amène », avec une courte explication sous certains */
  const intentHtml=sel=>`<div class="int-list">${Object.entries(INTENT_LABEL).map(([k,l])=>{const pv=INTENT_PRIVATE.has(k);
    return `<button class="chip int-tile${(sel||[]).includes(k)?' on':''}${pv?' priv':''}" type="button" data-k="${k}"><span class="int-t">${l}</span>${pv?'<span class="int-badge">Privé</span>':''}${INTENT_DESC[k]?`<span class="int-d">${INTENT_DESC[k]}</span>`:''}</button>`;}).join('')}</div>`;
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
    {k:'vital',l:'Je ne peux pas vivre sans',both:'ce dont on ne peut pas se passer'},
    {k:'reflechir',l:'Ça me fait réfléchir',both:'ce qui fait réfléchir'},
    {k:'perturbe',l:'Ça me perturbe',both:'ce qui perturbe'},
    {k:'force',l:'Ça me donne de la force',both:'ce qui donne de la force'},
    {k:'passe',l:'J\'ai aimé ça dans le passé',both:'ce qu\'on a aimé autrefois'},
    {k:'mavie',l:'Ça ressemble à ma vie',both:'ce qui ressemble à sa vie'},
    {k:'vecu',l:'C\'est quelque chose que j\'ai vécu',both:'ce qu\'on a vécu'},
    {k:'partager',l:'J\'aimerais partager ça avec quelqu\'un',both:'ce qu\'on aimerait partager'},
    {k:'adore',l:'J\'adore ça',both:'ce qu\'on adore'}];
  /* ressentis dominants : ceux qu'une personne a mis sous au moins 5 de ses passions. Seuls eux comptent dans les résonances. */
  const FEEL_MIN=5;
  function dominantFeels(entries){const n={};(entries||[]).forEach(e=>(e.feel||[]).forEach(k=>{n[k]=(n[k]||0)+1;}));return Object.keys(n).filter(k=>n[k]>=FEEL_MIN);}
  const FEEL=Object.fromEntries(FEELS.map(f=>[f.k,f]));
  /* envies du moment (disponibilité) */
  const WANTS=[
    /* s = libellé court (choix), l = affiché sur les fiches */
    {k:'parler',s:'Parler',l:'Envie de parler'},
    {k:'texter',s:'Texter',l:'Envie de texter'},
    {k:'rire',s:'Rire',l:'Envie de rire'},
    {k:'ecoute',s:'Écouter et être écouté',l:'Envie d\'écouter et d\'être écouté'},
    {k:'decouvrir',s:'Découvrir quelqu\'un',l:'Envie de découvrir quelqu\'un'},
    {k:'proposer',s:'Proposer une activité',l:'Envie de proposer une activité'},
    {k:'soiree',s:'Organiser une soirée',l:'Envie d\'organiser une soirée'},
    {k:'film',s:'Regarder un film ensemble',l:'Envie de regarder un film ensemble',hint:'à distance, avec un outil de partage comme Teleparty'}];
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
  function localTime(p){const d=new Date(Date.now()+(p.tz||0)*3600e3);return d.toLocaleTimeString(I18N.locale(),{hour:'2-digit',minute:'2-digit'});}
  const hhmm=ts=>new Date(ts).toLocaleTimeString(I18N.locale(),{hour:'2-digit',minute:'2-digit'});
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
    menu.innerHTML=Propose.switchHtml()+`<a href="#aide" class="menu-help">Besoin d'aide maintenant</a><hr><a href="#messages">Messages <small id="msg-count"></small></a><a href="#tribu">Ma tribu <small>les gens qui comptent</small></a><a href="#cercles">Cercles <small>thèmes partagés</small></a><a href="#reglages">Réglages <small>listes, visibilité</small></a><hr><a href="#portrait">Mon portrait</a><a href="#apercu">Ce que les autres voient</a><a href="#donnees">Mes données <small>sauvegarde</small></a><a href="#conditions">Aide et conditions</a>`;
    const tabs=document.createElement('nav');tabs.className='tabs';tabs.setAttribute('aria-label','Menu principal');
    tabs.innerHTML='<svg class="tabwave" viewBox="0 0 390 22" preserveAspectRatio="none" aria-hidden="true"><path d="M0 14 C40 4 70 20 110 12 S180 2 220 11 S300 22 340 9 S380 6 390 10 L390 22 L0 22 Z" style="fill:var(--bar)"/><path d="M0 14 C40 4 70 20 110 12 S180 2 220 11 S300 22 340 9 S380 6 390 10" fill="none" stroke="#e8456e" stroke-width="1.6" stroke-dasharray="14 4 3 4"/></svg>'+
      [['now','now','Présent'],['resonances','res','Résonances'],['messages','msg','Messages'],['tribu','tribu','Ma tribu'],['portrait','port','Portrait']].map(([h,i,l])=>`<a href="#${h}" data-tab="${h}">${Plus.icon(i)}${h==='messages'?'<span class="tbadge" id="tab-badge" hidden></span>':h==='tribu'?'<span class="tbadge" id="tab-badge-t" hidden></span>':''}<span>${l}</span></a>`).join('');
    phone.prepend(menu);phone.prepend(star);phone.append(tabs);
    /* noms du menu : toujours en entier sur une ligne ; la taille baisse jusqu'à ce qu'ils tiennent (même si le téléphone grossit le texte) */
    const fit=()=>{const L=[...tabs.querySelectorAll('a span:not(.tbadge)')];let m=99;
      L.forEach(s=>{s.style.fontSize='';let f=parseFloat(getComputedStyle(s).fontSize),i=0;while(s.scrollWidth>s.clientWidth+1&&i++<30&&f>7){f-=.5;s.style.fontSize=f+'px';}m=Math.min(m,f);});
      L.forEach(s=>{s.style.fontSize=m+'px';});};  // même taille pour les cinq noms
    window.__fitTabs=fit;fit();window.addEventListener('resize',fit);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fit);
    star.addEventListener('click',()=>{menu.classList.toggle('on');star.classList.toggle('on');});
    document.querySelector('.screen').addEventListener('click',closeMenu);
  }
  function closeMenu(){const m=$('menu'),s=$('star');if(m){m.classList.remove('on');s.classList.remove('on');}}
  async function refreshMsgCount(){const th=await DB.all('threads');const n=th.filter(t=>t.status==='pending-in').length;const el=$('msg-count');if(el)el.textContent=n?n+' demande'+(n>1?'s':''):th.filter(t=>t.status==='open').length+' ouvertes';const tb=$('tab-badge');if(tb){tb.textContent=n;tb.hidden=!n;}
    /* invitations dans une tribu en attente de ma réponse : pastille sur « Ma tribu » et fenêtre mise en avant */
    const ask=(await invites()).filter(i=>i.state==='pending'&&i.to==='me');const tt=$('tab-badge-t');if(tt){tt.textContent=ask.length;tt.hidden=!ask.length;}
    invitePopup(ask).catch(()=>{});noticePopup().catch(()=>{});}
  /* message de l'équipe (avertissement) : affiché une fois, jusqu'à ce qu'on le confirme */
  async function noticePopup(){if(!DB.remote||document.querySelector('.tb-pop'))return;let ns=[];try{ns=(await DB.all('notices')).filter(n=>!n.read);}catch(e){return;}
    const n=ns[0];if(!n)return;const o=document.createElement('div');o.className='tb-pop';
    o.innerHTML=`<div class="tb-pop-in"><p class="eyebrow">Message de l'équipe FeelShareLove</p><p style="margin:8px 0 14px">${esc(n.text)}</p><div class="row" style="justify-content:space-between"><a class="linkbtn" href="#conditions">Lire les règles</a><button class="btn flame small-btn" type="button">J'ai compris</button></div></div>`;
    (document.querySelector('.phone')||document.body).appendChild(o);
    o.querySelector('a').addEventListener('click',()=>o.remove());
    o.querySelector('button').addEventListener('click',async()=>{try{await DB.put('notices',{...n,read:true});}catch(e){}o.remove();});}
  const popShown=new Set();
  async function invitePopup(ask){if(document.querySelector('.tb-pop')||location.hash.startsWith('#tribu'))return;
    const i=ask.find(x=>!popShown.has(x.id));if(!i)return;popShown.add(i.id);
    const p=await DB.get('profiles',i.from);if(!p)return;
    const o=document.createElement('div');o.className='tb-pop';
    o.innerHTML=`<div class="tb-pop-in"><p class="eyebrow">Invitation</p><div class="tb-pop-who">${avatarHtml(p)}<h2 style="margin:0">${esc(dn(p))} <em>t'invite dans sa tribu</em></h2></div>
      <p class="muted small">${fem(p)?'Elle':'Il'} attend ta réponse. Sur FeelShareLove, on répond toujours : oui, ou non avec une phrase gentille.</p><div class="tb" id="tb-pop-box"></div>
      <div class="row" style="justify-content:space-between;margin-top:8px"><a class="linkbtn" href="#personne/${esc(p.id)}" id="tb-pop-see">Voir son portrait</a><button class="linkbtn" type="button" id="tb-pop-later">Plus tard</button></div></div>`;
    (document.querySelector('.phone')||document.body).appendChild(o);
    const close=()=>{o.remove();refreshMsgCount().catch(()=>{});};
    o.querySelector('#tb-pop-later').addEventListener('click',close);o.querySelector('#tb-pop-see').addEventListener('click',()=>o.remove());
    await tribeBox(p,o.querySelector('#tb-pop-box'),async()=>{const inv=await inviteWith(p);if(inv&&inv.state!=='pending')setTimeout(close,1200);});}

  /* ---------- données ---------- */
  /* couleur de ma tribu : je la choisis dans mon portrait ; les membres de ma tribu m'apparaissent sur ce fond, et personne d'autre ne la voit */
  const TRIBE_COLORS=[['rubis','Rubis','#6e1630'],['bordeaux','Bordeaux','#4f1424'],['prune','Prune','#55163f'],['rose','Rose ancien','#7a2450'],['braise','Braise','#7a2a12'],['terre','Terre cuite','#7a3b1e'],
    ['ocre','Ocre','#6e4a12'],['olive','Olive','#3f4a1a'],['foret','Forêt','#1f4030'],['lagon','Lagon','#164a4a'],['nuit','Nuit','#1e2a4f'],['amethyste','Améthyste','#3e1f55']];
  const tribeColor=me=>(TRIBE_COLORS.find(c=>c[0]===(me&&me.tribeColor))||TRIBE_COLORS[0])[2];
  const applyTribeColor=me=>{try{document.documentElement.style.setProperty('--tribe',tribeColor(me));}catch(e){}};
  async function loadMe(){const me=await DB.get('profiles','me');applyTribeColor(me);const entries=await DB.where('entries','profileId','me');const qs=await DB.where('questions','profileId','me');return {me,entries,qs};}
  async function loadPerson(id){const p=await DB.get('profiles',id);if(!p)return null;p.entries=await DB.where('entries','profileId',id);p.qs=await DB.where('questions','profileId',id);return p;}
  async function blockedNames(){const lists=await DB.where('lists','owner','me');return lists;}
  function isListed(p,lists){return lists.some(l=>{if(l.type!=='red'&&l.type!=='black')return false;if(l.target&&l.target===p.id)return true;const ln=norm(l.name);return l.type==='red'?(norm(p.name).split(' ').includes(ln.split(' ')[0])||ln===norm(p.pseudo)):(ln===norm(p.name)||ln===norm(p.pseudo));});}
  /* langues : la langue de mon portrait (celle de mes textes) et les portraits que je veux voir */
  const textLangOf=p=>(p&&p.textLang)||'fr';
  const readLangsOf=me=>{const l=me&&me.readLangs&&me.readLangs.length?me.readLangs:[I18N.lang,...(me&&me.langs||[])];return [...new Set(l)];};
  /* true si je peux lire ce portrait ; sinon, s'il résonne à 90 % ou plus, on le montre quand même avec une étiquette */
  const canRead=(me,p)=>readLangsOf(me).includes(textLangOf(p));
  function langTag(me,p){if(canRead(me,p))return '';const mine=readLangsOf(me);const spoken=(p.langs||[]).find(c=>mine.includes(c));
    return `<span class="rtag t-lang">Portrait en ${esc(I18N.name(textLangOf(p)).toLowerCase())}${spoken?' · parle '+esc(I18N.name(spoken).toLowerCase()):''}</span>`;}
  const langOk=(me,p,pct)=>canRead(me,p)||(pct||0)>=90;
  /* « Vérifiés seulement » : réglé dans Résonances, appliqué partout (sur cet appareil) */
  const verifOnly=v=>{try{if(v!==undefined)localStorage.setItem('fsl_verif',v?'1':'');return localStorage.getItem('fsl_verif')==='1';}catch(e){return false;}};
  /* personnes cachées pour le moment (un mois), pour voir d'autres profils */
  async function hiddenList(){const now=Date.now();return (await DB.where('lists','owner','me')).filter(l=>l.type==='hide'&&(!l.until||l.until>now));}
  async function hideAdd(p){await DB.put('lists',{owner:'me',type:'hide',target:p.id,name:p.pseudo||p.name,until:Date.now()+30*864e5});}
  /* mes personnes préférées : liste privée, personne ne sait qu'il y est */
  async function favOf(){return (await DB.where('lists','owner','me')).filter(l=>l.type==='fav');}
  async function isFav(p){return (await favOf()).find(l=>l.target===p.id)||null;}
  async function favToggle(p){const f=await isFav(p);if(f)await DB.del('lists',f.id);else await DB.put('lists',{owner:'me',type:'fav',target:p.id,name:p.pseudo||p.name});return !f;}
  /* tribu : on invite, l'autre répond toujours (oui, ou non avec une des trois phrases) */
  async function invites(){try{return await DB.all('invites');}catch(e){return [];}}
  async function inviteWith(p){return (await invites()).find(i=>i.from===p.id||i.to===p.id)||null;}
  async function tribeInvite(p){const inv=await DB.put('invites',{from:'me',to:p.id,state:'pending',ts:Date.now()});
    if(!DB.remote){inv.state='yes';inv.answeredAt=Date.now();await DB.put('invites',inv);}return inv;} // version locale : les personnes fictives acceptent
  const REFUS=p=>{const e=fem(p)?'e':'';return ['Je suis désolé'+e+', mais je ne suis pas sûr'+e+' que nous soyons suffisamment sur la même longueur d\'onde pour faire partie de la même tribu.',
    'Je suis désolé'+e+', mais j\'ai déjà une tribu nombreuse et pas assez de temps pour honorer tous mes messages et activités.',
    'Je suis désolé'+e+', mais ma vie de famille est très remplie et je n\'ai pas assez de temps en ce moment pour ajouter des gens à ma tribu.'];};
  /* boutons « Personne préférée » et « Inviter dans ma tribu », et réponse à une invitation reçue ; sur le portrait, la conversation et les résonances */
  async function tribeBox(p,el,onChange){const me=(await loadMe()).me;
    async function draw(){const inv=await inviteWith(p),fav=await isFav(p),Il=fem(p)?'Elle':'Il';let h='<div class="tb-row">',note='';
      /* dans la tribu, plus besoin d'être une personne préférée : la liste est purgée */
      if(inv&&inv.state==='yes'){if(fav)await DB.del('lists',fav.id);}
      else h+=`<button class="btn ghost small-btn tb-fav${fav?' on':''}" type="button" data-a="fav">${fav?'★':'☆'} Personne préférée</button>`;
      if(!inv||(inv.state==='no'&&inv.to==='me'))h+=`<button class="btn small-btn" type="button" data-a="inv">Inviter dans ma tribu</button>`;
      else if(inv.state==='yes')h+=`<span class="rtag t-int">Dans ta tribu</span>`;
      else if(inv.state==='pending'&&inv.from==='me'){h+=`<span class="muted small">Invitation envoyée</span>`;note=`${esc(dn(p))} reçoit un rappel chaque jour jusqu'à sa réponse.`;}
      else if(inv.state==='no'&&inv.from==='me')note=`${esc(dn(p))} a répondu à ton invitation : « ${esc(REFUS(p)[inv.reason-1]||'')} »`;
      h+='</div>';
      if(inv&&inv.state==='pending'&&inv.to==='me')h+=`<div class="tb-ask"><p><b>${esc(dn(p))}</b> t'invite dans sa tribu. ${Il} attend ta réponse.</p><div class="tb-row"><button class="btn flame small-btn" type="button" data-a="yes">Accepter</button><button class="btn ghost small-btn" type="button" data-a="no">Répondre non</button></div>
        <div class="tb-no" hidden><p class="muted small">Choisis ta réponse :</p>${REFUS(me).map((t,i)=>`<button class="tb-reason" type="button" data-r="${i+1}">${esc(t)}</button>`).join('')}</div></div>`;
      if(note)h+=`<p class="muted small tb-note">${note}</p>`;
      el.innerHTML=h;}
    el.onclick=async e=>{const b=e.target.closest('button');if(!b)return;const a=b.dataset.a,r=b.dataset.r;
      try{if(a==='fav')await favToggle(p);
        else if(a==='inv')await tribeInvite(p);
        else if(a==='yes')await DB.put('invites',{...(await inviteWith(p)),state:'yes'});
        else if(a==='no'){el.querySelector('.tb-no').hidden=false;return;}
        else if(r)await DB.put('invites',{...(await inviteWith(p)),state:'no',reason:+r});
        else return;}
      catch(x){el.insertAdjacentHTML('beforeend',`<p class="small" style="color:var(--flame)">${esc(x.message)}</p>`);return;}
      await draw();if(onChange)onChange();};
    await draw();}
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
      });/* « échos » (un mot en commun dans les titres) supprimés : ça ne voulait rien dire */
    /* ressentis communs (ça me passionne, ça m'hallucine…) : plus montrés comme points communs, trop banals (décision de l’équipe).
       Seuls les ressentis dominants comptent encore, discrètement, dans le pourcentage. */
    return {common,echo,feels,score:common.length*3+feels.length*2+echo.length};}

  /* ---------- éléments d'affichage ---------- */
  function feelTags(e){return (e.feel||[]).map(k=>FEEL[k]?`<span class="feel">${FEEL[k].l}</span>`:'').join('');}
  function entryEl(e,opts={}){const d=document.createElement('div');d.className='entry'+(opts.hit?' hit':'');d.tabIndex=0;
    d.innerHTML=`<div class="t"><span class="title">${esc(e.title)}</span><span class="kind">${esc(e.kind)}</span></div>`+(e.desc?`<div class="desc">${esc(e.desc)}</div>`:'')+(e.feel&&e.feel.length?`<div class="feels">${feelTags(e)}</div>`:'')+
      `<div class="hint">Touche pour lire pourquoi</div><div class="why">${esc(e.why)||'<span class="muted">(pas de pourquoi)</span>'}</div>`+(opts.hit?'<div class="tag">En commun avec toi</div>':'')+
      `<div class="ent-act">`+(opts.reply?'<button class="btn flame small-btn" type="button" data-a="reply">Répondre à cette entrée</button>':'')+(opts.metoo?'<button class="btn ghost small-btn" type="button" data-a="metoo">Moi aussi</button>':'')+(opts.mine?'<span class="tag" style="margin:0">Aussi dans ton portrait</span>':'')+(opts.edit?'<button class="btn ghost small-btn" type="button" data-a="edit">Modifier</button>':'')+(opts.del?'<button class="del" type="button" data-a="del">Retirer</button>':'')+`</div>`+
      (opts.reply?`<div class="compose"><label>Ton message part de cette entrée</label><textarea placeholder="Réagis à ce qui est écrit…"></textarea><button class="btn" type="button" data-a="send" style="margin-top:8px">Envoyer</button><div class="sent"></div></div>`:'');
    d.addEventListener('click',async ev=>{const a=ev.target.dataset&&ev.target.dataset.a;
      if((ev.target.closest('.compose')||ev.target.closest('.metoo-f')||ev.target.closest('.nods'))&&a!=='send')return;
      if(a==='metoo'){opts.metoo(d);return;}
      if(a==='del'){opts.del();return;} if(a==='edit'){opts.edit();return;}
      if(a==='reply'){d.querySelector('.compose').classList.toggle('on');d.querySelector('textarea').focus();return;}
      if(a==='send'){const txt=d.querySelector('textarea').value.trim();if(!txt)return;const r=await opts.reply(txt);const s=d.querySelector('.sent');s.style.display='block';s.innerHTML=r;if(!/^Il te reste|^Ta limite|^Attends/.test(r))d.querySelector('textarea').value='';return;}
      d.classList.toggle('open');});
    d.addEventListener('keydown',k=>{if(k.target.tagName==='TEXTAREA')return;if(k.key==='Enter'||k.key===' '){k.preventDefault();d.classList.toggle('open');}});return d;}
  function avatarHtml(p,cls=''){return `<div class="avatar ${p.av||''} ${cls}" aria-hidden="true">${p.photo?`<img src="${p.photo}" alt="">`:''}</div>`;}
  /* lieu affiché : le pays seulement tant que la conversation n'est pas ouverte */
  function place(p){if(!p)return '';if(p.limited&&!p.travel){try{return p.country?new Intl.DisplayNames([I18N.lang],{type:'region'}).of(p.country):'';}catch(e){return p.country||'';}}return p.city||'';}
  function personEl(p,r,sub){const d=document.createElement('div');d.className='person'+(p&&p.intimate?' in-tribe':'');
    const wants=isAvail(p)?`<div class="wants">${p.avail.wants.map(k=>WANT[k]?WANT[k].l:'').filter(Boolean).join(' · ')}</div>`:'';
    d.innerHTML=`${avatarHtml(p)}<div class="i"><div class="nm">${esc(dn(p))}${badge(p)} <small>${esc(place(p))}${p.travel?' · en voyage':''} · ${localTime(p)}</small></div>${wants}${sub||''}</div>`+(r?(r.pct!=null?`<div class="r"><b>${r.pct}%</b><span>similitude</span></div>`:'pct' in r&&!r.n?`<div class="r"><b>—</b><span>nouveau</span></div>`:`<div class="r"><b>${r.n!=null?r.n:r.common.length+r.feels.length}</b><span>résonne</span></div>`):'')+`<div class="dot ${isAvail(p)?'':'off'}" aria-hidden="true"></div>`;
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
  /* enregistrement vocal avec écoute avant envoi : on réécoute, puis on envoie, on recommence ou on annule */
  function voiceRecorder(label,max,onSend,sendLabel='Envoyer'){const w=document.createElement('div');w.className='vrec';
    const start=()=>{w.innerHTML='';w.appendChild(recorder(label,max,(blob,secs)=>review(blob,secs)));};
    const review=(blob,secs)=>{w.innerHTML='';const a=audioEl(blob);w.appendChild(a);
      const row=document.createElement('div');row.className='vrec-act';
      row.innerHTML=`<button class="btn flame small-btn" type="button" data-v="send">${esc(sendLabel)}</button><button class="btn ghost small-btn" type="button" data-v="again">Recommencer</button><button class="linkbtn" type="button" data-v="cancel">Annuler</button>`;
      w.appendChild(row);
      row.addEventListener('click',async e=>{const v=e.target.dataset&&e.target.dataset.v;if(!v)return;
        if(v==='send'){e.target.disabled=true;try{await onSend(blob,secs);start();}catch(x){e.target.disabled=false;}}
        if(v==='again'){start();w.querySelector('button').click();}
        if(v==='cancel')start();});};
    start();return w;}
  function audioEl(blob){const a=document.createElement('audio');a.controls=true;a.src=URL.createObjectURL(blob);a.className='aud';return a;}
  function speak(text){if(!window.speechSynthesis)return false;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='fr-FR';u.rate=.95;speechSynthesis.speak(u);return true;}

  /* ---------- porte des messages ----------
     - le premier message répond toujours à une entrée du portrait de l'autre
     - l'autre choisit d'ouvrir la conversation ou non
     - trois premiers messages par jour */
  const FIRST_PER_DAY=3;
  async function firstLeft(){const th=await DB.all('threads');const n=th.filter(t=>t.startedBy==='me'&&!t.free&&t.firstAt&&new Date(t.firstAt).toISOString().slice(0,10)===today()).length;return Math.max(0,FIRST_PER_DAY-n);}
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
    return {ok:true,msg:'Tu peux changer ton pseudo une seule fois, jusqu\'au '+new Date(end).toLocaleDateString(I18N.locale(),{day:'numeric',month:'long'})+'.'};}
  function photoRule(me){const first=startOf(me)+MONTH;if(!me.photo||Date.now()<first)return {ok:true,msg:me.photo?'Tu peux changer ta photo librement jusqu\'au '+new Date(first).toLocaleDateString(I18N.locale(),{day:'numeric',month:'long'})+', ensuite une fois par an.':''};
    const next=(me.photoChangedAt&&me.photoChangedAt>first-MONTH?me.photoChangedAt:first)+YEAR;
    if(me.photoChangedAt&&me.photoChangedAt>=first&&Date.now()<next)return {ok:false,msg:'Ta photo pourra être changée le '+new Date(next).toLocaleDateString(I18N.locale(),{day:'numeric',month:'long',year:'numeric'})+'.'};
    return {ok:true,msg:'Tu peux changer ta photo maintenant. Ensuite, la prochaine fois sera dans un an.'};}
  const badge=p=>(p&&p.verified&&p.verified.status==='verified'?'<span class="vbadge" title="Identité vérifiée">vérifié</span>':'')+(p&&p.fake?' <span class="vbadge demo" title="Profil fictif pour découvrir FeelShareLove">profil de démonstration</span>':'');
  const isVerified=p=>!!(p&&p.verified&&p.verified.status==='verified');
  /* caméra en direct : pas d'import depuis la galerie. Retardateur pour une photo en pied. */
  /* dessins de la photo, calculés sur le téléphone (rien n'est envoyé ailleurs) */
  const STYLES=[['real','Ma vraie photo'],['crayon','Crayon'],['affiche','Affiche'],['aquarelle','Aquarelle'],['points','Peinture de points'],['pointillisme','Pointillisme'],['artdeco','Art déco'],['mosaique','Mosaïque']];
  function blur1(a,W,H,r){const t=new Float32Array(a.length),o=new Float32Array(a.length),n=2*r+1;
    for(let y=0;y<H;y++){let s=0;const R=y*W;for(let x=-r;x<=r;x++)s+=a[R+Math.min(W-1,Math.max(0,x))];
      for(let x=0;x<W;x++){t[R+x]=s/n;s+=a[R+Math.min(W-1,x+r+1)]-a[R+Math.max(0,x-r)];}}
    for(let x=0;x<W;x++){let s=0;for(let y=-r;y<=r;y++)s+=t[Math.min(H-1,Math.max(0,y))*W+x];
      for(let y=0;y<H;y++){o[y*W+x]=s/n;s+=t[Math.min(H-1,y+r+1)*W+x]-t[Math.max(0,y-r)*W+x];}}
    return o;}
  /* ---- trois styles de plus : pointillisme, art déco, mosaïque (calculés sur le téléphone, comme les autres) ---- */
  const rgb2hsl=(r,g,b)=>{r/=255;g/=255;b/=255;const M=Math.max(r,g,b),m=Math.min(r,g,b);let h=0,s=0;const l=(M+m)/2;if(M!==m){const d=M-m;s=l>.5?d/(2-M-m):d/(M+m);h=M===r?((g-b)/d+(g<b?6:0)):M===g?(b-r)/d+2:(r-g)/d+4;h/=6;}return [h,s,l];};
  const hslStr=(h,s,l)=>`hsl(${Math.round(((h%1)+1)%1*360)},${Math.round(Math.max(0,Math.min(1,s))*100)}%,${Math.round(Math.max(0,Math.min(1,l))*100)}%)`;
  function gradOf(g,W,H){const N=W*H,gs=blur1(g,W,H,2),mag=new Float32Array(N);
    for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){const i=y*W+x;const a=gs[i-W-1],b=gs[i-W],c=gs[i-W+1],d=gs[i-1],f=gs[i+1],gg=gs[i+W-1],h=gs[i+W],k=gs[i+W+1];mag[i]=Math.hypot((c+2*f+k)-(a+2*d+gg),(gg+2*h+k)-(a+2*b+c));}return mag;}
  function moreStyles(style,c,x,W,H,p,g){const N=W*H;let seed=7;const rnd=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646;};
    if(style==='pointillisme'){x.filter='blur(6px) saturate(1.3) brightness(1.08)';x.drawImage(c,0,0);x.filter='none';const st=Math.max(2,Math.round(W/200));
      for(let y=0;y<H;y+=st)for(let xx=0;xx<W;xx+=st){const px=Math.min(W-1,Math.round(xx+(rnd()-.5)*st*1.4)),py=Math.min(H-1,Math.round(y+(rnd()-.5)*st*1.4));const i=4*(py*W+px);
        let [h,s,l]=rgb2hsl(p[i],p[i+1],p[i+2]);s=Math.min(1,s*1.5+.1);const comp=l<.45&&rnd()<.18;
        x.fillStyle=hslStr(comp?h+.5:h+(rnd()-.5)*.04,s,comp?l*.9+.15:l*.96+.04);x.globalAlpha=comp?.35:.9;x.beginPath();x.arc(px,py,st*(.6+rnd()*.45),0,7);x.fill();}
      x.globalAlpha=1;return;}
    if(style==='artdeco'){const mag=gradOf(g,W,H),s=blur1(blur1(g,W,H,3),W,H,3);let lo=255,hi=0;for(let i=0;i<N;i+=7){lo=Math.min(lo,s[i]);hi=Math.max(hi,s[i]);}
      const pal=[[27,20,16],[122,38,28],[196,142,54],[232,203,140],[245,232,204]];const out=x.createImageData(W,H),o=out.data;
      for(let i=0;i<N;i++){const t=Math.max(0,Math.min(.999,(s[i]-lo)/Math.max(1,hi-lo)));const q=pal[Math.floor(Math.pow(t,1.1)*pal.length)];o[4*i]=q[0];o[4*i+1]=q[1];o[4*i+2]=q[2];o[4*i+3]=255;}
      const edge=blur1(mag,W,H,2);for(let i=0;i<N;i++)if(edge[i]>95){o[4*i]=27;o[4*i+1]=20;o[4*i+2]=16;}
      x.putImageData(out,0,0);x.save();x.globalAlpha=.3;x.fillStyle='#c48e36';const cx=W/2,cy=-H*.1;
      for(let k=0;k<18;k++){const a0=Math.PI*(k/18),a1=a0+Math.PI/36;x.beginPath();x.moveTo(cx,cy);x.lineTo(cx+Math.cos(a0)*W*2,cy+Math.sin(a0)*W*2);x.lineTo(cx+Math.cos(a1)*W*2,cy+Math.sin(a1)*W*2);x.closePath();x.fill();}
      x.restore();x.strokeStyle='#c48e36';x.lineWidth=Math.max(6,W/60);x.strokeRect(x.lineWidth/2,x.lineWidth/2,W-x.lineWidth,H-x.lineWidth);x.lineWidth=2;x.strokeRect(12,12,W-24,H-24);return;}
    if(style==='mosaique'){seed=5;const mag=gradOf(g,W,H),em=blur1(mag,W,H,5);let mx=0;for(let i=0;i<N;i+=3)mx=Math.max(mx,em[i]);const pts=[];let tries=0;
      while(pts.length<1700&&tries++<300000){const px=rnd()*W,py=rnd()*H;const i=Math.round(py)*W+Math.round(px);const dc=Math.hypot(px-W/2,py-H*.42)/(W*.6),cw=Math.max(.15,1-dc*dc);
        if(rnd()<cw*(.15+.85*Math.sqrt(em[Math.min(N-1,i)]/mx)))pts.push([px,py,(rnd()-.5)*.06]);}
      const G=24,gw=Math.ceil(W/G),gh=Math.ceil(H/G),bins=Array.from({length:gw*gh},()=>[]);pts.forEach((q,k)=>bins[Math.floor(q[1]/G)*gw+Math.floor(q[0]/G)].push(k));
      const cell=new Int16Array(N),sum=pts.map(()=>[0,0,0,0]);
      for(let y=0;y<H;y++)for(let xx=0;xx<W;xx++){let best=-1,bd=1e12;const bx=Math.floor(xx/G),by=Math.floor(y/G);
        for(let r=1;best<0||r<=1;r++){for(let yy=by-r;yy<=by+r;yy++)for(let xb=bx-r;xb<=bx+r;xb++){if(xb<0||yy<0||xb>=gw||yy>=gh)continue;for(const k of bins[yy*gw+xb]){const dx=pts[k][0]-xx,dy=pts[k][1]-y,dd=dx*dx+dy*dy;if(dd<bd){bd=dd;best=k;}}}if(r>6)break;}
        const i=y*W+xx;cell[i]=best;const sm=sum[best];sm[0]+=p[4*i];sm[1]+=p[4*i+1];sm[2]+=p[4*i+2];sm[3]++;}
      const col=sum.map((sm,k)=>{if(!sm[3])return [40,30,28];const f=1+pts[k][2];return [Math.min(255,sm[0]/sm[3]*f),Math.min(255,sm[1]/sm[3]*f),Math.min(255,sm[2]/sm[3]*f)];});
      const out=x.createImageData(W,H),o=out.data;for(let i=0;i<N;i++){const r=col[cell[i]];o[4*i]=r[0];o[4*i+1]=r[1];o[4*i+2]=r[2];o[4*i+3]=255;}
      for(let y=1;y<H-1;y++)for(let xx=1;xx<W-1;xx++){const i=y*W+xx;if(cell[i]!==cell[i+1]||cell[i]!==cell[i+W]){o[4*i]=58;o[4*i+1]=46;o[4*i+2]=40;}}
      x.putImageData(out,0,0);}}
  function stylize(url,style){return new Promise(res=>{const im=new Image();im.onload=()=>{
    const W=im.naturalWidth,H=im.naturalHeight,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');x.drawImage(im,0,0);
    const d=x.getImageData(0,0,W,H),p=d.data,N=W*H,g=new Float32Array(N),R=new Float32Array(N),G=new Float32Array(N),B=new Float32Array(N);
    for(let i=0;i<N;i++){R[i]=p[4*i];G[i]=p[4*i+1];B[i]=p[4*i+2];g[i]=.3*R[i]+.59*G[i]+.11*B[i];}
    if(style==='pointillisme'||style==='artdeco'||style==='mosaique'){moreStyles(style,c,x,W,H,p,g);res(c.toDataURL('image/jpeg',.88));return;}
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
  async function sendTo(p,text,about,o={}){
    if(await isBlocked(p))return {error:'Cette personne est sur une de tes listes.'};
    let th=await DB.get('threads',p.id);
    if(th&&th.status==='declined-by-them')return {error:dn(p)+' a répondu ne pas souhaiter commencer de conversation.'};
    if(!th||th.status==='declined'){
      if(!about)return {error:'Le premier message part d\'une entrée de son portrait.'};
      const left=o.free?1:await firstLeft();if(left<=0)return {error:'Ta limite de trois premiers messages pour aujourd\'hui est atteinte. Elle revient demain.'};
      th={id:p.id,status:'pending-out',startedBy:'me',firstAt:o.free?null:Date.now(),acceptAt:Date.now()+6000,viaNod:o.nod||undefined};await DB.put('threads',th);
    }else if(th.status==='pending-out'){return {error:'Attends que '+dn(p)+' ouvre la conversation.'};}
    else if(th.status==='pending-in'){th.status='open';await DB.put('threads',th);}
    const msg=await DB.put('messages',{thread:p.id,from:'me',to:p.id,kind:'text',text,about:about&&about.id,aboutTitle:about&&about.title,ts:Date.now()});
    return {ok:true,msg,thread:th,left:await firstLeft()};}
  function sendResultText(p,r){if(r.error)return r.error;
    if(r.thread.status==='pending-out')return `Envoyé. ${esc(dn(p))} lira ta réponse à côté de son entrée et choisira d'ouvrir la conversation. Il te reste ${r.left} premier${r.left>1?'s':''} message${r.left>1?'s':''} aujourd'hui. <a href="#messages/${p.id}">Voir</a>`;
    return `Envoyé. <a href="#messages/${p.id}">Ouvrir la conversation</a>`;}

  return {$,INTENT_LABEL,INTENT_DESC,shownIntent,intentHtml,FACT_LABEL,FACTS,FEELS,FEEL,WANTS,WANT,FAMILIES,qdjToday,esc,norm,words,grow,zodiac,chinese,chineseAnimal,localTime,hhmm,fem,dn,isAvail,today,
    shell,closeMenu,refreshMsgCount,textLangOf,readLangsOf,canRead,langTag,langOk,TRIBE_COLORS,applyTribeColor,verifOnly,hiddenList,hideAdd,favOf,isFav,favToggle,invites,inviteWith,tribeInvite,tribeBox,REFUS,loadMe,loadPerson,others,isBlocked,resonance,workKey,feelTags,entryEl,avatarHtml,personEl,
    catalogSearch,catalogField,entryForm,stylize,STYLES,dominantFeels,prefixes,pseudoProposals,recorder,voiceRecorder,audioEl,speak,place,firstLeft,tickThreads,sendTo,sendResultText,
    REPLY_FOR:p=>REPLY[p.id]||'Merci pour ton message.',accord,declineChoices,pendingIn,pseudoRule,photoRule,badge,isVerified,camera};
})();
window.Pages={};
