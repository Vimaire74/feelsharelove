/* FeelShareLove — langues.
   - Langue de l'app : celle du téléphone, sauf si la personne en choisit une autre dans Réglages.
   - Textes : un dictionnaire par langue (I18N.add('en',{clé:'texte'})). Une clé absente retombe sur le français.
   - Langues parlées (portrait) : codes ISO, affichés dans la langue de celui qui regarde. */
window.I18N=(function(){
  const DICT={fr:{}};
  const RTL=new Set(['ar','he','fa','ur','ps','yi']);
  /* langues proposées dans « Langues » : les plus parlées au monde, plus les langues de Suisse et d'Europe */
  const LANGS=['fr','en','de','it','rm','es','pt','nl','sv','no','da','fi','is','pl','cs','sk','hu','ro','bg','hr','sr','sl','el','sq','mk','bs','lt','lv','et','uk','ru','be','tr','ka','hy','az','kk','uz','ar','he','fa','ur','ps','ku','hi','bn','pa','gu','mr','ta','te','kn','ml','si','ne','zh','yue','ja','ko','vi','th','lo','km','my','id','ms','tl','mn','sw','am','yo','ha','ig','zu','xh','af','so','mg','ca','eu','gl','cy','ga','gd','br','co','lb','eo','la','yi','qu','gn','ht','mi','haw','sgn'];
  const store={get:k=>{try{return localStorage.getItem(k);}catch(e){return null;}},set:(k,v)=>{try{v?localStorage.setItem(k,v):localStorage.removeItem(k);}catch(e){}}};
  const available=()=>Object.keys(DICT);
  function phone(){const l=(navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||'fr']).map(x=>String(x).toLowerCase().split('-')[0]);
    return l.find(x=>DICT[x])||'fr';}
  let choice=store.get('fsl_lang')||'';      // '' = langue du téléphone
  let lang=choice&&DICT[choice]?choice:phone();
  function apply(){const h=document.documentElement;h.lang=lang;h.dir=RTL.has(lang)?'rtl':'ltr';}
  function set(code){choice=code||'';store.set('fsl_lang',choice);lang=choice&&DICT[choice]?choice:phone();apply();}
  function add(code,dict){DICT[code]=Object.assign(DICT[code]||{},dict);if(choice===code||(!choice&&phone()===code))lang=code;pats=null;apply();if(lang!=='fr'&&document.body)watch();}
  function t(key,vars){let s=(DICT[lang]&&DICT[lang][key])??DICT.fr[key]??key;
    if(vars)s=s.replace(/\{(\w+)\}/g,(m,k)=>vars[k]!=null?vars[k]:m);return s;}
  /* nom d'une langue, dans la langue de l'app (ou dans la sienne propre) */
  function name(code,inLang){try{const n=new Intl.DisplayNames([inLang||lang],{type:'language'}).of(code);return n?n.charAt(0).toLocaleUpperCase(inLang||lang)+n.slice(1):code;}catch(e){return code;}}
  const fold=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
  /* recherche pendant la frappe : nom dans la langue de l'app, nom d'origine, nom anglais, code */
  function search(q,exclude=[]){q=fold(q).trim();if(!q)return [];
    return LANGS.filter(c=>!exclude.includes(c)).map(c=>({c,names:[name(c),name(c,c),name(c,'en'),c]})).filter(x=>x.names.some(n=>fold(n).startsWith(q)||fold(n).includes(' '+q)))
      .slice(0,8).map(x=>({code:x.c,label:x.names[0],native:x.names[1]}));}
  /* ---------- traduction de l'écran ----------
     Les textes de l'app sont écrits en français dans le code. Un dictionnaire par langue (js/lang/xx.js) donne, pour chaque
     phrase française, sa traduction. Après chaque affichage, les textes de la page sont remplacés. Une phrase absente du
     dictionnaire reste en français. Les clés peuvent contenir des trous : « Étape {n} sur {m} ». */
  const LOCALE={fr:'fr-CH',de:'de-CH',it:'it-CH',en:'en-GB',es:'es-ES',pt:'pt-PT'};
  const locale=()=>LOCALE[lang]||lang;
  const norm=s=>String(s).replace(/\s+/g,' ').trim();
  const INLINE=new Set(['B','I','EM','STRONG','SMALL','SPAN','A','SUP','SUB']);
  const SKIP=new Set(['SCRIPT','STYLE','TEXTAREA','INPUT','SELECT','OPTION','SVG','CODE','PRE']);
  /* ce que les gens ont écrit eux-mêmes n'est jamais traduit */
  const USER='.txt,.chat,.why,.pc-why,.pc-n,.fact .v,.res .who p,.post,.q .a,.a-txt,[data-notranslate]';
  const isUser=el=>!!(el&&el.closest&&el.closest(USER));
  let pats=null,patLang='';
  function patterns(){if(patLang===lang&&pats)return pats;pats=[];patLang=lang;const D=DICT[lang]||{};
    for(const k in D){if(!/\{\w+\}/.test(k))continue;const names=[];const re=new RegExp('^'+k.replace(/[.*+?^${}()|[\]\\]/g,m=>m==='{'||m==='}'?m:'\\'+m).replace(/\{(\w+)\}/g,(m,n)=>{names.push(n);return '(.+?)';})+'$');pats.push({re,names,v:D[k]});}
    return pats;}
  function lookup(text,depth=0){if(lang==='fr')return null;const D=DICT[lang];if(!D)return null;const k=norm(text);if(!k)return null;
    if(D[k]!=null)return D[k];
    /* même phrase écrite avec une minuscule au début (ex. « tango » sous « Danse ») */
    const cap=k.charAt(0).toUpperCase()+k.slice(1);if(cap!==k&&D[cap]!=null)return D[cap].charAt(0).toLowerCase()+D[cap].slice(1);
    if(depth>2)return null;
    for(const p of patterns()){const m=k.match(p.re);if(m){let v=p.v;p.names.forEach((n,i)=>{const g=m[i+1];const tg=lookup(g,depth+1);v=v.split('{'+n+'}').join(tg!=null?tg:g);});return v;}}
    return null;}
  const ATTRS=['placeholder','title','aria-label'];
  function translateNode(root){if(lang==='fr'||!DICT[lang])return;
    const els=root.nodeType===1?[root,...root.querySelectorAll('*')]:[];
    for(const el of els){if(el.closest&&el.closest('svg'))continue;
      ATTRS.forEach(a=>{const v=el.getAttribute&&el.getAttribute(a);if(v){const tr=lookup(v);if(tr!=null&&tr!==v)el.setAttribute(a,tr);}});
      if(SKIP.has(el.tagName)||isUser(el))continue;
      /* élément « simple » (texte + mise en forme) : on traduit la phrase entière, balises comprises */
      const kids=[...el.children];if(kids.length&&kids.every(c=>INLINE.has(c.tagName)&&!c.children.length&&!c.id)){const tr=lookup(el.textContent);
        if(tr!=null&&norm(el.textContent)!==norm(tr.replace(/<[^>]+>/g,''))){if(/<[a-z]/i.test(tr))el.innerHTML=tr;else el.textContent=tr;}}}
    const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const list=[];let n;while(n=w.nextNode())list.push(n);
    for(const tn of list){const par=tn.parentNode;if(!par||SKIP.has(par.tagName)||(par.closest&&par.closest('svg')))continue;const v=tn.nodeValue;if(!v||!v.trim())continue;
      /* dans ce que les gens ont écrit, seule une phrase entière de l'app (longue, exacte) est traduite */
      let tr=isUser(par)?(norm(v).length>=15&&DICT[lang]&&DICT[lang][norm(v)]!=null?DICT[lang][norm(v)]:null):lookup(v);if(tr!=null){tr=tr.replace(/<[^>]+>/g,'');if(norm(tr)!==norm(v)){const lead=v.match(/^\s*/)[0],trail=v.match(/\s*$/)[0];tn.nodeValue=lead+tr+trail;}}}
    if(window.__fitTabs)try{window.__fitTabs();}catch(e){}}
  let observing=false;
  function watch(){if(observing||lang==='fr')return;observing=true;
    const mo=new MutationObserver(ms=>{ms.forEach(m=>{if(m.type==='characterData'){translateNode(m.target.parentNode||document.body);return;}m.addedNodes.forEach(nd=>{if(nd.nodeType===1)translateNode(nd);else if(nd.nodeType===3&&nd.parentNode)translateNode(nd.parentNode);});});});
    mo.observe(document.body,{childList:true,subtree:true,characterData:true});translateNode(document.body);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch);else watch();
  apply();
  return {t,add,set,apply,search,name,phone,available,locale,translateNode,RTL,LANGS,get lang(){return lang;},get choice(){return choice;}};
})();
window.t=window.I18N.t;
