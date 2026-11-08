/* FeelShareLove — « Mes genres d'histoires » : films, livres, séries.
   Jusqu'à 5 genres préférés ; dans chaque genre, des œuvres très connues proposées selon l'âge de la personne
   (moins de 30 ans, 30-50, 50-70, plus de 70), « Plus de choix » pour les autres, et un champ pour ajouter la sienne.
   Points de résonance : par genre commun +1 ; si les deux ont détaillé, +1 par œuvre commune ; sinon +2 ; 10 au plus.
   Listes en français pour commencer (une liste par langue viendra ensuite). */
window.Genres=(function(){
  const MAX=5,CAP=10;
  /* a : moins de 30 ans · b : 30-50 · c : 50-70 · d : plus de 70 */
  const G=[
  {k:'sf',l:'Science-fiction',w:{
    a:['Marvel','Dune (Villeneuve)','Hunger Games','Black Mirror','Stranger Things','Le Problème à trois corps','Red Rising (Pierce Brown)','Interstellar'],
    b:['Star Wars','Alien','Matrix','Terminator','Retour vers le futur','Le Cinquième Élément','X-Files','La trilogie martienne (Kim Stanley Robinson)','Hypérion (Dan Simmons)'],
    c:['Star Wars','Alien','Blade Runner','E.T.','Rencontres du troisième type','Star Trek','Fondation (Asimov)','Les Robots (Asimov)','Dune (Herbert)'],
    d:['Jules Verne','2001, l\'Odyssée de l\'espace','La Planète des singes','La Guerre des mondes (H. G. Wells)','Fahrenheit 451']}},
  {k:'fantasy',l:'Fantasy',w:{
    a:['Harry Potter','The Witcher','Fourth Wing','Percy Jackson','Les Anneaux de pouvoir','Arcane','Mistborn (Sanderson)'],
    b:['Le Seigneur des anneaux','Harry Potter','Game of Thrones','La Roue du Temps (Robert Jordan)','L\'Assassin royal (Robin Hobb)','Le Disque-Monde (Pratchett)'],
    c:['Le Seigneur des anneaux','Conan','Excalibur','Willow','L\'Histoire sans fin','Elric (Michael Moorcock)','La Belgariade (Eddings)','Ladyhawke'],
    d:['Le Hobbit','Les Chroniques de Narnia','Les légendes arthuriennes','Les Mille et Une Nuits','Le Magicien d\'Oz']}},
  {k:'heros',l:'Super-héros',w:{
    a:['Avengers','Spider-Man (Tom Holland)','Black Panther','The Boys','Deadpool'],
    b:['Batman (Nolan)','Iron Man','X-Men','Spider-Man (Sam Raimi)','Les Indestructibles'],
    c:['Superman (Christopher Reeve)','Batman (Tim Burton)','L\'Homme qui valait trois milliards','Wonder Woman (Lynda Carter)'],
    d:['Zorro','Superman','Fantômas']}},
  {k:'histo',l:'Historique',w:{
    a:['Peaky Blinders','Vikings','The Crown','Oppenheimer','Napoléon (Ridley Scott)','Assassin\'s Creed'],
    b:['Gladiator','Braveheart','Titanic','Il faut sauver le soldat Ryan','Rome','Les Piliers de la Terre (Follett)','Band of Brothers'],
    c:['Les Rois maudits','Le Nom de la rose','Amadeus','La Liste de Schindler','Le Dernier des Mohicans','Danse avec les loups'],
    d:['Les Trois Mousquetaires','Le Comte de Monte-Cristo','Angélique, marquise des anges','Ben-Hur','Autant en emporte le vent','Les Rois maudits']}},
  {k:'horreur',l:'Horreur et épouvante',w:{
    a:['Conjuring','Get Out','Hérédité','Ça','The Walking Dead','Insidious'],
    b:['Scream','Saw','Le Projet Blair Witch','The Ring','Sixième Sens','Stephen King'],
    c:['L\'Exorciste','Shining','Les Dents de la mer','Halloween','Freddy','Carrie','Stephen King'],
    d:['Psychose','Les Oiseaux','Dracula','Frankenstein','Rosemary\'s Baby','Edgar Allan Poe']}},
  {k:'polar',l:'Thriller et policier',w:{
    a:['La Casa de papel','Lupin (Omar Sy)','Joël Dicker','Franck Thilliez','Mindhunter','Gone Girl'],
    b:['Seven','Le Silence des agneaux','Millénium','Maxime Chattam','Fred Vargas','Sherlock (BBC)','Les Experts'],
    c:['Columbo','Navarro','Agatha Christie','Mary Higgins Clark','Le Parrain','Maigret (Bruno Cremer)'],
    d:['Maigret (Simenon)','Hercule Poirot','Hitchcock','Arsène Lupin','Les Brigades du Tigre','Derrick']}},
  {k:'amour',l:'Histoires d\'amour',w:{
    a:['Nos étoiles contraires','Avant toi','Bridgerton','Normal People','Colleen Hoover','After','Twilight'],
    b:['Titanic','Love Actually','Coup de foudre à Notting Hill','Le Journal de Noa','Bridget Jones','Guillaume Musso','Marc Levy'],
    c:['Pretty Woman','Dirty Dancing','Ghost','Out of Africa','Sur la route de Madison','Quand Harry rencontre Sally'],
    d:['Autant en emporte le vent','Le Docteur Jivago','Casablanca','Orgueil et Préjugés','Belle du Seigneur','Les Feux de l\'amour']}},
  {k:'humour',l:'Humour et comédie',w:{
    a:['Qu\'est-ce qu\'on a fait au Bon Dieu ?','Brooklyn Nine-Nine','Lol : qui rit sort !','Bref','The Office'],
    b:['Kaamelott','Friends','Les Visiteurs','Le Dîner de cons','OSS 117','Bienvenue chez les Ch\'tis','Astérix : Mission Cléopâtre'],
    c:['Les Bronzés','Le Père Noël est une ordure','La Cité de la peur','Monty Python','Coluche','Astérix'],
    d:['Louis de Funès','La Grande Vadrouille','Jacques Tati','Fernandel','Bourvil','Pierre Desproges']}},
  {k:'saga',l:'Sagas familiales et grandes fresques',w:{
    a:['Succession','L\'Amie prodigieuse','La Saga des Cazalet','Yellowstone'],
    b:['Downton Abbey','Un village français','L\'Amie prodigieuse','Les Soprano'],
    c:['Dallas','Le Parrain','Cent ans de solitude','Les Gens de Mogador'],
    d:['Les Thibault','Les Hommes de bonne volonté','La Saga des Forsyte','Les Rougon-Macquart']}},
  {k:'bio',l:'Biographies et vies réelles',w:{
    a:['Elvis','Bohemian Rhapsody','Rocketman','Devenir (Michelle Obama)','The Social Network'],
    b:['La Môme','Le Discours d\'un roi','Churchill','Steve Jobs','Ray','Walk the Line'],
    c:['Gandhi','Amadeus','Out of Africa','Mandela','Le Journal d\'Anne Frank'],
    d:['Lawrence d\'Arabie','Mémoires d\'Hadrien','Mémoires de guerre (de Gaulle)','Une vie (Simone Veil)']}},
  {k:'quete',l:'Quête intérieure, coup de poing',w:{
    a:['Into the Wild','Wild (Cheryl Strayed)','La Vie rêvée de Walter Mitty','Soul','Lion','Le Petit Prince'],
    b:['Into the Wild','Mange, prie, aime','L\'Alchimiste','Le Scaphandre et le Papillon','Patients (Grand Corps Malade)','Lion','La Vie rêvée de Walter Mitty'],
    c:['Le Cercle des poètes disparus','Siddhartha','Sur la route (Kerouac)','Le Grand Bleu','Jonathan Livingston le goéland','Vol au-dessus d\'un nid de coucou','L\'Homme qui murmurait à l\'oreille des chevaux','Gandhi'],
    d:['Siddhartha','Le Vieil Homme et la Mer','Zorba le Grec','Les Nourritures terrestres (Gide)','Sur la route (Kerouac)']}},
  {k:'drame',l:'Drame',w:{
    a:['Joker','Parasite','Whiplash','The Whale','Lion'],
    b:['La Ligne verte','Les Évadés','Forrest Gump','La vie est belle (Benigni)','American Beauty','Million Dollar Baby'],
    c:['Jean de Florette','Manon des sources','Le Cercle des poètes disparus','Vol au-dessus d\'un nid de coucou','Cyrano de Bergerac','Kramer contre Kramer'],
    d:['Les Enfants du paradis','La Strada','Les Raisins de la colère','Le Voleur de bicyclette','Casque d\'or']}},
  {k:'litt',l:'Littérature',w:{
    a:['Valérie Perrin','Mélissa Da Costa','Virginie Grimaldi','La Tresse (Laetitia Colombani)','Sally Rooney'],
    b:['Amélie Nothomb','Anna Gavalda','L\'Élégance du hérisson','Delphine de Vigan','Éric-Emmanuel Schmitt','Le Parfum (Süskind)'],
    c:['Marguerite Duras','Patrick Modiano','J. M. G. Le Clézio','Christian Bobin','Philippe Claudel','Belle du Seigneur (Albert Cohen)'],
    d:['Victor Hugo','Émile Zola','Balzac','Flaubert','Albert Camus','Maupassant','Jean Giono','Marcel Proust','Le Petit Prince']}},
  {k:'aventure',l:'Aventure',w:{
    a:['Pirates des Caraïbes','Jumanji','Uncharted','Le Labyrinthe','Mission impossible'],
    b:['Indiana Jones','Jurassic Park','Pirates des Caraïbes','La Momie','Seul au monde','Le Grand Bleu'],
    c:['Indiana Jones','Tintin','Le Grand Bleu','À la poursuite du diamant vert','Bob Morane','Corto Maltese'],
    d:['Le Tour du monde en 80 jours','Tintin','Alexandre Dumas','Robinson Crusoé','Croc-Blanc (Jack London)','Le Pont de la rivière Kwaï']}},
  {k:'anim',l:'Animation et manga',w:{
    a:['La Reine des neiges','Vice-versa','One Piece','Naruto','L\'Attaque des Titans','Demon Slayer','Le Garçon et le Héron','Le Château ambulant','Ponyo'],
    b:['Le Roi lion','Toy Story','Shrek','Dragon Ball','Nicky Larson','Les Simpson','Pokémon','Le Voyage de Chihiro','Princesse Mononoké','Mon voisin Totoro','Kiki la petite sorcière'],
    c:['Le Livre de la jungle','Les 101 Dalmatiens','Astérix','Les Mystérieuses Cités d\'or','Il était une fois… la vie','Mon voisin Totoro','Le Tombeau des lucioles','Nausicaä'],
    d:['Blanche-Neige','Bambi','Fantasia','Le Roi et l\'Oiseau','Tex Avery']}},
  {k:'spi',l:'Spiritualité et développement personnel',w:{
    a:['Ikigaï','Atomic Habits','L\'Art subtil de s\'en foutre','Les Quatre Accords toltèques','Petit Bambou'],
    b:['L\'Alchimiste','Le Pouvoir du moment présent','Les Quatre Accords toltèques','Le Moine qui vendit sa Ferrari','Les 5 blessures (Lise Bourbeau)','Christophe André'],
    c:['Le Prophète (Khalil Gibran)','Siddhartha','Jonathan Livingston le goéland','Le Dalaï-Lama','Boris Cyrulnik','Christophe André'],
    d:['Le Prophète (Khalil Gibran)','Siddhartha','Teilhard de Chardin','Sœur Emmanuelle','Krishnamurti','Thich Nhat Hanh']}},
  {k:'docu',l:'Documentaires',w:{
    a:['Free Solo','Notre planète','Les documentaires « true crime »','Le Dessous des cartes'],
    b:['La Marche de l\'empereur','Home','Planète Terre','Apocalypse','Ushuaïa'],
    c:['Ushuaïa','Thalassa','Des racines et des ailes','Apocalypse','Strip-tease'],
    d:['Le Commandant Cousteau','Connaissance du monde','Les Dossiers de l\'écran']}},
  {k:'science',l:'Science et vulgarisation',w:{
    a:['Science étonnante','Dirty Biology','Sapiens (Harari)','Kurzgesagt'],
    b:['C\'est pas sorcier','E=M6','Sapiens (Harari)','Une brève histoire du temps'],
    c:['Cosmos (Carl Sagan)','Hubert Reeves','Une brève histoire du temps','Le Gène égoïste'],
    d:['Hubert Reeves','Théodore Monod','Haroun Tazieff','Albert Jacquard']}},
  {k:'tele',l:'Télévision, jeux et divertissement',w:{
    a:['Koh-Lanta','Top Chef','Pékin Express','Drag Race','Love Island'],
    b:['Koh-Lanta','Loft Story','Star Academy','Fort Boyard','Qui veut gagner des millions ?'],
    c:['Fort Boyard','Questions pour un champion','Des chiffres et des lettres','Les Grosses Têtes'],
    d:['Des chiffres et des lettres','Intervilles','La Piste aux étoiles','Le Jeu des 1000 euros']}}];
  const BANDS=['a','b','c','d'];
  const BAND_L={a:'moins de 30 ans',b:'30-50 ans',c:'50-70 ans',d:'plus de 70 ans'};
  const fold=s=>String(s??'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();
  const wid=t=>fold(t).replace(/ /g,'-');            // une œuvre = son titre simplifié : la même œuvre dans deux genres compte une fois
  const BY=Object.fromEntries(G.map(g=>[g.k,g]));
  /* tranche d'âge de la personne : date de naissance, sinon l'âge écrit, sinon 30-50 */
  function band(me){let y=null;const b=me&&me.facts&&me.facts.birth;const bv=b&&(b.v||b);if(bv&&/^\d{4}/.test(bv))y=new Date().getFullYear()-(+String(bv).slice(0,4));
    if(y==null){const a=me&&me.facts&&me.facts.age;const m=String(a&&(a.v||a)||'').match(/\d{2}/);if(m)y=+m[0];}
    if(y==null)return 'b';return y<30?'a':y<50?'b':y<70?'c':'d';}
  const list=p=>(Array.isArray(p&&p.genres)?p.genres:[]).filter(x=>x&&BY[x.k]).slice(0,MAX);
  const picks=x=>[...new Set([...(x.works||[]),...(x.free||[]).map(wid)])];
  /* ---------- points ---------- */
  /* mine, theirs : les entrées de « Ce qui me fait vibrer » ; une œuvre déjà commune là n'est pas recomptée ici */
  function common(me,p,mine,theirs){const A=list(me),B=list(p),out=[];let pts=0;
    const tm=new Set((mine||[]).map(e=>wid(e.title))),seen=new Set((theirs||[]).map(e=>wid(e.title)).filter(w=>tm.has(w)));
    for(const a of A){const b=B.find(x=>x.k===a.k);if(!b)continue;pts+=1;out.push({k:'genre',kw:BY[a.k].l,l:'Vous aimez tous les deux : '+BY[a.k].l.toLowerCase()});
      const wa=picks(a),wb=picks(b);
      if(wa.length&&wb.length){for(const w of wa)if(wb.includes(w)&&!seen.has(w)){seen.add(w);pts+=1;out.push({k:'genre',kw:title(w,a,b),l:'Vous aimez tous les deux '+title(w,a,b)});}}
      else pts+=2;}
    return {pts:Math.min(CAP,pts),items:out};}
  function title(w,a,b){for(const x of [a,b]){const f=(x.free||[]).find(t=>wid(t)===w);if(f)return f;}for(const g of G)for(const k of BANDS)for(const t of g.w[k])if(wid(t)===w)return t;return w;}
  const score=(me,p,mine,theirs)=>common(me,p,mine,theirs).pts;
  /* ---------- affichage sur un portrait ---------- */
  function viewHtml(p,me,preview){const L=list(p);if(!L.length)return '';const mine=preview?[]:list(me);const esc=App.esc;
    return `<h2>${preview?'Mes histoires <em>préférées</em>':'Ses histoires <em>préférées</em>'}</h2><div class="inv-show">${L.map(x=>{const m=mine.find(y=>y.k===x.k);const mw=m?picks(m):[];
      const ws=[...(x.works||[]).map(w=>title(w,x,x)),...(x.free||[])];
      return `<span class="chip on ro${m?' hit':''}"><span>${esc(BY[x.k].l)}</span>${ws.length?' · '+ws.map(t=>`<b class="${mw.includes(wid(t))?'hit':''}">${esc(t)}</b>`).join(', '):''}</span>`;}).join('')}</div>`;}
  /* ---------- édition dans « Mon portrait » ---------- */
  function editor(B,me,save){const esc=App.esc;me.genres=list(me);const my=band(me);let open={};
    function draw(){const n=me.genres.length;
      B.innerHTML=`<p class="muted small" style="margin:0 0 8px">Choisis tes 5 genres préférés (${n}/5), puis, si tu veux, les œuvres que tu aimes dans chacun.</p>
        <div class="intent" id="g-pick">${G.map(g=>`<button class="chip${me.genres.some(x=>x.k===g.k)?' on':''}" type="button" data-g="${g.k}"${n>=MAX&&!me.genres.some(x=>x.k===g.k)?' disabled':''}>${esc(g.l)}</button>`).join('')}</div>
        <div id="g-detail">${me.genres.map(x=>{const g=BY[x.k];const others=BANDS.filter(b=>b!==my);
          const chip=t=>`<button class="chip${(x.works||[]).includes(wid(t))?' on':''}" type="button" data-w="${esc(wid(t))}">${esc(t)}</button>`;
          const all=[...new Set(others.flatMap(b=>g.w[b]))].filter(t=>!g.w[my].includes(t));
          /* une œuvre choisie dans une autre tranche d'âge reste toujours visible, et cochée */
          const picked=all.filter(t=>(x.works||[]).includes(wid(t))),more=all.filter(t=>!picked.includes(t));
          return `<div class="g-box" data-k="${x.k}"><div class="k">${esc(g.l)}</div>
            <div class="intent">${g.w[my].map(chip).join('')}${picked.map(chip).join('')}${open[x.k]?more.map(chip).join(''):''}</div>
            ${more.length&&!open[x.k]?`<button class="linkbtn g-more" type="button">Plus de choix</button>`:''}
            ${(x.free||[]).length?`<div class="intent" style="margin-top:6px">${x.free.map((t,i)=>`<button class="chip on" type="button" data-f="${i}" title="Retirer">${esc(t)} ×</button>`).join('')}</div>`:''}
            <div class="row" style="justify-content:flex-start;gap:8px;margin-top:8px"><input class="in g-free" placeholder="Ajouter une œuvre (film, livre, série)" style="flex:1;min-width:0"><button class="btn small-btn g-add" type="button">Ajouter</button></div></div>`;}).join('')}</div>`;
      B.querySelectorAll('#g-pick .chip').forEach(c=>c.addEventListener('click',()=>{const k=c.dataset.g;const i=me.genres.findIndex(x=>x.k===k);
        if(i>=0)me.genres.splice(i,1);else if(me.genres.length<MAX)me.genres.push({k,works:[],free:[]});save();draw();}));
      B.querySelectorAll('.g-box').forEach(box=>{const x=me.genres.find(y=>y.k===box.dataset.k);x.works=x.works||[];x.free=x.free||[];
        box.querySelectorAll('[data-w]').forEach(c=>c.addEventListener('click',()=>{const w=c.dataset.w;x.works=x.works.includes(w)?x.works.filter(y=>y!==w):[...x.works,w];save();c.classList.toggle('on');}));
        box.querySelectorAll('[data-f]').forEach(c=>c.addEventListener('click',()=>{x.free.splice(+c.dataset.f,1);save();draw();}));
        const m=box.querySelector('.g-more');if(m)m.addEventListener('click',()=>{open[x.k]=true;draw();});
        const inp=box.querySelector('.g-free'),add=()=>{const t=inp.value.trim().slice(0,80);if(!t)return;if(!x.free.some(f=>wid(f)===wid(t)))x.free.push(t);save();draw();};
        box.querySelector('.g-add').addEventListener('click',add);inp.addEventListener('keydown',k=>{if(k.key==='Enter')add();});});}
    draw();}
  function suggest(me,entries,onPick){const have=new Set((entries||[]).map(e=>wid(e.title)));const out=[];
    for(const x of list(me)){for(const w of x.works||[]){const t=title(w,x,x);if(!have.has(wid(t))&&!out.includes(t))out.push(t);}for(const t of x.free||[])if(!have.has(wid(t))&&!out.includes(t))out.push(t);}
    if(!out.length)return null;const d=document.createElement('div');d.className='g-suggest';
    d.innerHTML=`<p class="muted small" style="margin:0 0 6px">Depuis tes histoires préférées : choisis-en une et dis ce qu'elle te fait.</p><div class="intent">${out.slice(0,12).map(t=>`<button class="chip" type="button">${App.esc(t)}</button>`).join('')}</div>`;
    d.querySelectorAll('.chip').forEach((c,i)=>c.addEventListener('click',()=>onPick(out[i])));return d;}
  /* œuvre très connue : son titre commence par un titre des listes (« Star Wars : Un nouvel espoir » → Star Wars) */
  const MAIN=[...new Set(G.flatMap(g=>BANDS.flatMap(b=>g.w[b])).map(wid))].filter(w=>w.length>=3);
  function isMainstream(t){const w=wid(t);return !!w&&MAIN.some(m=>w===m||w.startsWith(m+'-'));}
  return {G,BY,band,BAND_L,score,common,viewHtml,editor,suggest,isMainstream,MAX};
})();
