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
  function add(code,dict){DICT[code]=Object.assign(DICT[code]||{},dict);if(choice===code||(!choice&&phone()===code))lang=code;apply();}
  function t(key,vars){let s=(DICT[lang]&&DICT[lang][key])??DICT.fr[key]??key;
    if(vars)s=s.replace(/\{(\w+)\}/g,(m,k)=>vars[k]!=null?vars[k]:m);return s;}
  /* nom d'une langue, dans la langue de l'app (ou dans la sienne propre) */
  function name(code,inLang){try{const n=new Intl.DisplayNames([inLang||lang],{type:'language'}).of(code);return n?n.charAt(0).toLocaleUpperCase(inLang||lang)+n.slice(1):code;}catch(e){return code;}}
  const fold=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
  /* recherche pendant la frappe : nom dans la langue de l'app, nom d'origine, nom anglais, code */
  function search(q,exclude=[]){q=fold(q).trim();if(!q)return [];
    return LANGS.filter(c=>!exclude.includes(c)).map(c=>({c,names:[name(c),name(c,c),name(c,'en'),c]})).filter(x=>x.names.some(n=>fold(n).startsWith(q)||fold(n).includes(' '+q)))
      .slice(0,8).map(x=>({code:x.c,label:x.names[0],native:x.names[1]}));}
  apply();
  return {t,add,set,apply,search,name,phone,available,RTL,LANGS,get lang(){return lang;},get choice(){return choice;}};
})();
window.t=window.I18N.t;
