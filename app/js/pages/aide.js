/* FeelShareLove — « Besoin d'aide maintenant » : lignes d'écoute et numéros d'urgence par pays.
   Le pays de la personne vient en premier (indicatif de son mobile, sinon sa ville). Numéros vérifiés le 09/11/2026. */
Pages.aide=async function(S){const {esc}=App;
  const L=[
    ['CH','Suisse',[['La Main Tendue','143',1]],'144 · 112'],
    ['FR','France',[['Numéro national de prévention du suicide','3114',1],['SOS Amitié','09 72 39 40 50',1]],'15 · 112'],
    ['BE','Belgique',[['Centre de Prévention du Suicide','0800 32 123',1],['Télé-Accueil','107'],['Tele-Onthaal','106'],['Zelfmoordlijn','1813']],'112'],
    ['LU','Luxembourg',[['SOS Détresse','45 45 45']],'112'],
    ['DE','Allemagne',[['Telefonseelsorge','0800 111 0 111',1],['Telefonseelsorge','0800 111 0 222',1]],'112'],
    ['AT','Autriche',[['Telefonseelsorge','142',1]],'144 · 112'],
    ['IT','Italie',[['Telefono Amico Italia','02 2327 2327']],'112'],
    ['ES','Espagne',[['Línea de atención a la conducta suicida','024',1],['Teléfono de la Esperanza','717 003 717']],'112'],
    ['PT','Portugal',[['Linha de Prevenção do Suicídio','1411',1],['SOS Voz Amiga','213 544 545']],'112'],
    ['NL','Pays-Bas',[['113 Zelfmoordpreventie','0800 0113',1]],'112'],
    ['GB','Royaume-Uni',[['Samaritans','116 123',1]],'999 · 112'],
    ['IE','Irlande',[['Samaritans','116 123',1]],'112 · 999'],
    ['US','États-Unis',[['988 Suicide & Crisis Lifeline','988',1]],'911'],
    ['CA','Canada',[['988','988',1]],'911'],
    ['BR','Brésil',[['CVV','188',1]],'192']];
  const PREF={'41':'CH','33':'FR','32':'BE','352':'LU','49':'DE','43':'AT','39':'IT','34':'ES','351':'PT','31':'NL','44':'GB','353':'IE','55':'BR'};
  const me=await DB.get('profiles','me').catch(()=>null)||{};
  let cc='';const ph=String(me.phone||'').replace(/[\s.-]/g,'').replace(/^00/,'+');
  if(ph.startsWith('+')){for(const n of ['352','351','353','41','33','32','49','43','39','34','31','44','55'])if(ph.startsWith('+'+n)){cc=PREF[n];break;}}
  if(!cc){const m=String(me.city||'').match(/\s([A-Z]{2})$/);if(m)cc=m[1];else if(/^\d{4}$/.test(String(me.npa||'').trim()))cc='CH';}
  const rows=[...L.filter(x=>x[0]===cc),...L.filter(x=>x[0]!==cc)];
  const cname=(c,fr)=>{try{return new Intl.DisplayNames([I18N.lang],{type:'region'}).of(c)||fr;}catch(e){return fr;}};
  const tel=n=>`<a class="help-tel" href="tel:${n.replace(/\s/g,'')}">${esc(n)}</a>`;
  S.innerHTML=`<a class="back" href="javascript:history.back()">← Retour</a><p class="eyebrow">Besoin d'aide</p><h1>Tu n'es pas <em>seul·e</em></h1>
    <div class="sec help-top"><p class="exp"><b>Si ta vie ou celle de quelqu'un est en danger immédiat, appelle les urgences : 112</b> (valable dans toute l'Europe).</p>
      <p class="exp">Si tu traverses un moment difficile, des personnes formées t'écoutent, gratuitement et sans te juger. Tu peux appeler même pour parler simplement.</p></div>
    ${rows.map((x,i)=>`<div class="sec help-c${i===0&&x[0]===cc?' mine':''}"><h3>${esc(cname(x[0],x[1]))}</h3>${x[2].map(([n,t,h])=>`<div class="help-row"><span>${esc(n)}${h?' <small class="muted">· <span>jour et nuit</span></small>':''}</span>${tel(t)}</div>`).join('')}<div class="help-row muted"><span>Urgences</span>${x[3].split(' · ').map(tel).join(' ')}</div></div>`).join('')}
    <p class="muted small" style="margin-top:12px">Autre pays : <a href="https://findahelpline.com" target="_blank" rel="noopener" style="color:var(--saffron)">findahelpline.com</a> donne les lignes d'écoute du monde entier.</p>
    <p class="muted small">FeelShareLove n'est pas un service d'aide ni de soins. Si un message reçu ici t'inquiète pour quelqu'un, signale-le : l'équipe le lira.</p>`;
};
