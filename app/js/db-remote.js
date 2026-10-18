/* FeelShareLove — base de données en ligne.
   Remplace la base locale (db.js) quand l'application est ouverte depuis le site (http/https).
   Ouverte depuis le dossier (file://), l'application reste 100 % locale comme avant.
   Les écrans continuent d'appeler mon portrait « me » : la traduction vers mon vrai identifiant se fait ici. */
(function(){
  if(location.protocol==='file:')return;
  const LOCAL=window.DB;
  const T='fsl_token',U='fsl_uid';
  const store={get:k=>{try{return localStorage.getItem(k);}catch(e){return null;}},set:(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v);}catch(e){}}};
  let token=store.get(T),myId=store.get(U);
  const ME_FIELDS=['profileId','owner','by','author','from','to','startedBy','createdBy','target'];
  function toServer(name,o){if(!o||typeof o!=='object')return o;const r={...o};
    if(name==='profiles'&&r.id==='me')r.id=myId;
    if(name==='voices'&&r.id==='pres-me')r.id='pres-'+myId;
    if(name==='messages'&&r.thread==='me')delete r.thread;
    for(const f of ME_FIELDS)if(r[f]==='me')r[f]=myId;
    delete r.isMe;return r;}
  function fromServer(name,o){if(!o||typeof o!=='object')return o;const r={...o};delete r.__owner;
    if(name==='profiles'&&r.id===myId){r.id='me';r.isMe=true;}
    if(name==='voices'&&r.id==='pres-'+myId)r.id='pres-me';
    for(const f of ME_FIELDS)if(r[f]===myId)r[f]='me';
    return r;}
  const sid=(name,id)=>name==='profiles'&&id==='me'?myId:name==='voices'&&id==='pres-me'?'pres-'+myId:(ME_FIELDS.length&&id==='me'?myId:id);
  async function call(method,url,body,raw){
    const h={};if(token)h.Authorization='Bearer '+token;
    if(body!==undefined&&!raw)h['Content-Type']='application/json';
    if(raw)h['Content-Type']=body.type||'application/octet-stream';
    const r=await fetch(url,{method,headers:h,body:body===undefined?undefined:raw?body:JSON.stringify(body)});
    if(r.status===401&&token){logoutLocal();location.reload();throw new Error('Session expirée.');}
    const data=await r.json().catch(()=>null);
    if(!r.ok)throw new Error((data&&data.error)||('Erreur '+r.status));
    return data;}
  function logoutLocal(){token=null;myId=null;store.set(T,null);store.set(U,null);}
  const blobCache=new Map();
  async function withBlob(v){if(!v||!v.url)return v;if(!blobCache.has(v.url)){const r=await fetch(v.url,{headers:{Authorization:'Bearer '+token}});blobCache.set(v.url,await r.blob());}return {...v,blob:blobCache.get(v.url)};}
  const enc=s=>encodeURIComponent(s);
  const b64=s=>{const p='='.repeat((4-s.length%4)%4);const r=atob((s+p).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from([...r].map(c=>c.charCodeAt(0)));};
  const DB={
    remote:true,uid:LOCAL.uid,
    get token(){return token;},
    get:async(name,id)=>{const r=await call('GET','/api/'+name+'/'+enc(sid(name,id)));
      if(name==='settings')return r;const o=fromServer(name,r);return name==='voices'?withBlob(o):o;},
    all:async name=>(await call('GET','/api/'+name)).map(o=>fromServer(name,o)),
    where:async(name,index,value)=>(await call('GET','/api/'+name+'?'+enc(index)+'='+enc(value==='me'?myId:value))).map(o=>fromServer(name,o)),
    put:async(name,obj)=>{
      if(name==='settings')return call('PUT','/api/settings/'+enc(obj.key),{value:obj.value});
      if(!obj.id)obj.id=LOCAL.uid();obj.updatedAt=Date.now();
      let body=toServer(name,obj);
      if(name==='voices'&&obj.blob){const f=await call('POST','/api/files',obj.blob,true);const {blob,...rest}=body;body={...rest,url:f.url};}
      const id=name==='threads'?body.id:body.id;
      const saved=await call('PUT','/api/'+name+'/'+enc(id),body);
      if(name==='threads'||name==='messages')Object.assign(obj,fromServer(name,saved));
      return obj;},
    del:(name,id)=>call('DELETE','/api/'+name+'/'+enc(sid(name,id))),
    clear:async()=>{},
    setting:async(key,value)=>{if(value===undefined){const r=await call('GET','/api/settings/'+enc(key));return r&&r.value;}return call('PUT','/api/settings/'+enc(key),{value});},
    /* comptes */
    register:async(email,password)=>{const r=await call('POST','/api/auth/register',{email,password});token=r.token;myId=r.id;store.set(T,token);store.set(U,myId);},
    login:async(email,password)=>{const r=await call('POST','/api/auth/login',{email,password});token=r.token;myId=r.id;store.set(T,token);store.set(U,myId);},
    logout:async()=>{try{await DB.pushOff();}catch(e){}try{await call('POST','/api/auth/logout',{});}catch(e){}logoutLocal();},
    /* notifications sur ce téléphone (sur iPhone : seulement depuis l'icône ajoutée à l'écran d'accueil) */
    pushState:async()=>{if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window))return 'unsupported';
      const reg=await navigator.serviceWorker.ready;const s=await reg.pushManager.getSubscription();return s?'on':(Notification.permission==='denied'?'denied':'off');},
    pushOn:async()=>{const perm=await Notification.requestPermission();if(perm!=='granted')throw new Error('Notifications refusées. On peut les autoriser dans les réglages du navigateur ou du téléphone.');
      const reg=await navigator.serviceWorker.ready;const {key}=await call('GET','/api/push/key');
      const sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64(key)});await call('POST','/api/push/subscribe',sub.toJSON());},
    pushOff:async()=>{if(!('serviceWorker' in navigator))return;const reg=await navigator.serviceWorker.ready;const s=await reg.pushManager.getSubscription();
      if(s){try{await call('POST','/api/push/unsubscribe',{endpoint:s.endpoint});}catch(e){}await s.unsubscribe();}},
    /* mes données : tout ce qui m'appartient */
    exportAll:async()=>{const out={format:'connect-db',version:2,exportedAt:new Date().toISOString(),data:{}};
      const me=await DB.get('profiles','me');out.data.profiles=me?[me]:[];
      out.data.entries=await DB.where('entries','profileId','me');out.data.questions=await DB.where('questions','profileId','me');
      for(const n of ['threads','messages','lists','reports'])out.data[n]=await DB.all(n);
      out.data.circlePosts=(await DB.all('circlePosts')).filter(p=>p.author==='me');return out;},
    /* recharge une sauvegarde de la version locale dans mon compte : mon portrait, mes entrées, mes questions, mes listes, ma voix */
    importAll:async json=>{if(!json||json.format!=='connect-db')throw new Error('format');const d=json.data||{};
      const meL=(d.profiles||[]).find(p=>p.id==='me');if(meL){const cur=await DB.get('profiles','me');const {verified,...rest}=meL;await DB.put('profiles',{...rest,pseudo:cur&&cur.pseudo||rest.pseudo,id:'me'});}
      for(const n of ['entries','questions'])for(const r of (d[n]||[]).filter(x=>x.profileId==='me'))await DB.put(n,{...r});
      for(const r of (d.lists||[]).filter(x=>x.owner==='me'))await DB.put('lists',{...r});
      const v=(d.voices||[]).find(x=>x.id==='pres-me'&&x.dataUrl);if(v){const b=await (await fetch(v.dataUrl)).blob();await DB.put('voices',{id:'pres-me',owner:'me',kind:'presentation',blob:b,secs:v.secs});}},
    wipe:async()=>{await call('DELETE','/api/me');logoutLocal();},
    ensureSeed:async()=>{if(!token)throw Object.assign(new Error('auth'),{auth:true});
      let me=null;try{me=await call('GET','/api/profiles/'+enc(myId));}catch(e){}
      if(!me)await call('PUT','/api/profiles/'+enc(myId),{id:myId,name:'',pseudo:'',city:'',intent:[],now:'',photo:'',facts:{},avail:null,circles:[],online:true});}
  };
  window.DB=DB;
  if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
})();
