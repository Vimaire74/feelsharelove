/* FeelShareLove — diagnostic : signale au serveur les erreurs du navigateur et les textes restés en français dans une autre langue.
   Rien de personnel n'est envoyé : le message d'erreur ou la phrase de l'app, le nom de l'écran et la langue. 40 envois au plus par visite. */
(function(){
  if(!/^https?:$/.test(location.protocol))return;
  const seen=new Set();let q=[],timer=null,sent=0;
  const page=()=>(location.hash||'').replace(/^#/,'').split('/')[0].replace(/[^\w-]/g,'').slice(0,30);
  function push(k,t,x){t=String(t||'').replace(/\s+/g,' ').trim().slice(0,300);if(!t||sent+q.length>=40)return;const key=k+'|'+t;if(seen.has(key))return;seen.add(key);
    q.push({k:k,t:t,p:page(),l:document.documentElement.lang||'',x:String(x||'').slice(0,200)});clearTimeout(timer);timer=setTimeout(flush,4000);}
  function flush(){if(!q.length)return;const items=q;q=[];sent+=items.length;
    try{fetch('/api/diag',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:items}),keepalive:true}).catch(function(){});}catch(e){}}
  window.addEventListener('error',function(e){if(!e.message||/^Script error/.test(e.message))return;push('js',e.message,String(e.filename||'').replace(location.origin,'')+':'+(e.lineno||0));});
  window.addEventListener('unhandledrejection',function(e){const r=e.reason;const m=String(r&&r.message||r||'');
    if(!m||(r&&(r.auth||r.status||typeof r.code==='number'))||/fetch|network|load failed|abort/i.test(m))return; /* coupure de réseau ou refus du serveur : pas une erreur du site */
    push('js','Promesse rejetée : '+m,r&&r.stack?String(r.stack).split('\n')[1]||'':'');});
  window.addEventListener('pagehide',flush);
  window.Diag={miss:function(t){push('i18n',t);}};
})();
