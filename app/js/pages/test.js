/* FeelShareLove — test « Mon fonctionnement » : 12 questions, résultat, textes de Marc, validation et choix d'affichage */
Pages.test=async function(S){
  const {$,esc}=App;const T=TYPES;let me=await DB.get('profiles','me');
  const shuffle=a=>{a=a.slice();for(let j=a.length-1;j>0;j--){const r=Math.floor(Math.random()*(j+1));[a[j],a[r]]=[a[r],a[j]];}return a;};
  /* questions et réponses dans un ordre différent à chaque test */
  let qorder,orders,answers,i;
  function reset(){qorder=shuffle(T.questions.map((_,k)=>k));orders=T.questions.map(()=>shuffle(['mental','emo','sens','phys']));answers=T.questions.map(()=>[]);i=0;}
  reset();
  function question(){const qi=qorder[i];const q=T.questions[qi];const sel=answers[qi];
    S.innerHTML=`<a class="back" href="#portrait">← Mon portrait</a><div class="steps"><span>Question ${i+1} sur ${T.questions.length}</span><div class="bar-p"><i style="width:${(i)/T.questions.length*100}%"></i></div></div>
      <p class="eyebrow">Mon fonctionnement</p><h1 style="font-size:28px">${esc(q.q)}</h1><p class="muted small" style="margin:8px 0 14px">Choisis la réponse la plus proche de toi, ou deux si les deux te ressemblent autant.</p>
      <div class="list" id="ans">${orders[qi].map(k=>`<button type="button" class="tans ${sel.includes(k)?'on':''}" data-k="${k}">${esc(q.a[k])}</button>`).join('')}</div>
      <p class="muted small" id="hint" style="margin-top:8px"></p>
      <div class="row" style="justify-content:space-between;margin-top:14px">${i?'<button class="linkbtn" type="button" id="prev">← Question précédente</button>':'<span></span>'}<button class="btn" type="button" id="next" ${sel.length?'':'disabled'}>${i<T.questions.length-1?'Question suivante':'Voir mon résultat'}</button></div>`;
    S.querySelectorAll('.tans').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.k;
      if(sel.includes(k))sel.splice(sel.indexOf(k),1);else{if(sel.length>=2){$('hint').textContent='Deux réponses au plus. Retire-en une pour en choisir une autre.';return;}sel.push(k);}
      $('hint').textContent='';S.querySelectorAll('.tans').forEach(x=>x.classList.toggle('on',sel.includes(x.dataset.k)));$('next').disabled=!sel.length;}));
    $('next').addEventListener('click',()=>{if(!sel.length)return;if(i<T.questions.length-1){i++;question();}else result();});
    const p=$('prev');if(p)p.addEventListener('click',()=>{i--;question();});S.scrollTop=0;}
  function result(){const scores={mental:0,emo:0,sens:0,phys:0};answers.forEach(a=>a.forEach(k=>scores[k]++));
    const dom=T.dominants(scores);let chosen=new Set(dom);let show=me.types?me.types.show!==false:true;
    const max=Math.max(...Object.values(scores));
    S.innerHTML=`<p class="eyebrow">Ton résultat</p><h1>${esc(T.label(dom))}</h1>
      <p class="muted" style="margin:8px 0 14px">${dom.length===1?'Un type domine nettement chez toi.':dom.length===2?'Deux types dominent chez toi.':dom.length===3?'Trois types sont presque équilibrés chez toi.':'Les quatre types sont équilibrés chez toi, ce qui est rare.'}</p>
      <div class="scores">${T.list.map(t=>`<div class="sc ${dom.includes(t.k)?'dom':''}"><span>${t.name}</span><div class="sbar"><i style="width:${max?scores[t.k]/max*100:0}%"></i></div><b>${scores[t.k]}</b></div>`).join('')}</div>
      <div id="texts"></div>
      <h2>Tu te <em>reconnais ?</em></h2><p class="muted small" style="margin-bottom:10px">Tu peux corriger le résultat : coche les types qui te correspondent vraiment (un à quatre).</p>
      <div class="intent" id="pick" style="margin-top:0">${T.list.map(t=>`<button class="chip ${chosen.has(t.k)?'on':''}" type="button" data-k="${t.k}">${t.name}</button>`).join('')}</div>
      <label class="check"><input type="checkbox" id="show" ${show?'checked':''}> Afficher mon fonctionnement sur mon portrait</label>
      <div class="row" style="justify-content:space-between"><button class="linkbtn" type="button" id="redo">Refaire le test</button><button class="btn flame" type="button" id="ok">Valider</button></div><p class="muted small" id="err"></p>`;
    const texts=()=>{$('texts').innerHTML=[...chosen].map(k=>{const t=T.list.find(x=>x.k===k);return `<div class="sec ttext"><h3>${t.name}</h3><p class="exp">${esc(t.text)}</p></div>`;}).join('')+
      `<details class="others"><summary>Lire les autres types</summary>${T.list.filter(t=>!chosen.has(t.k)).map(t=>`<div class="sec ttext"><h3>${t.name}</h3><p class="exp">${esc(t.text)}</p></div>`).join('')}</details>`;};
    texts();
    S.querySelectorAll('#pick .chip').forEach(c=>c.addEventListener('click',()=>{const k=c.dataset.k;if(chosen.has(k)){if(chosen.size>1)chosen.delete(k);}else chosen.add(k);S.querySelectorAll('#pick .chip').forEach(x=>x.classList.toggle('on',chosen.has(x.dataset.k)));texts();}));
    $('redo').addEventListener('click',()=>{reset();question();});
    $('ok').addEventListener('click',async()=>{me=await DB.get('profiles','me');me.types={list:T.list.map(t=>t.k).filter(k=>chosen.has(k)),scores,show:$('show').checked,at:Date.now(),fromTest:true};await DB.put('profiles',me);location.hash='#portrait';});
    S.scrollTop=0;}
  question();
};
