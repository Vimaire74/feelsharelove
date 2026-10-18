/* Connect — couche base de données locale (IndexedDB, dans le navigateur)
   Tables : voir docs/schema.md. Même structure que la future base serveur (docs/schema.sql).
   Version 2 : ajoute threads (porte des premiers messages), voices (enregistrements), circlePosts (messages des cercles). */
(function(){
  const NAME='connect', VERSION=2;
  const STORES={
    profiles:{keyPath:'id',indexes:[]},
    entries:{keyPath:'id',indexes:[['profileId','profileId']]},
    questions:{keyPath:'id',indexes:[['profileId','profileId']]},
    messages:{keyPath:'id',indexes:[['thread','thread']]},
    threads:{keyPath:'id',indexes:[]},                    // une conversation par personne : pending-out | pending-in | open | declined
    voices:{keyPath:'id',indexes:[]},                     // fichiers audio (présentation vocale, messages vocaux)
    lists:{keyPath:'id',indexes:[['owner','owner']]},     // liste rouge / liste noire
    reports:{keyPath:'id',indexes:[]},                    // signalements
    circles:{keyPath:'id',indexes:[]},
    circlePosts:{keyPath:'id',indexes:[['circleId','circleId']]},
    settings:{keyPath:'key',indexes:[]}
  };
  let dbp=null;
  function open(){
    if(dbp)return dbp;
    dbp=new Promise((res,rej)=>{
      const r=indexedDB.open(NAME,VERSION);
      r.onupgradeneeded=e=>{const d=e.target.result;
        Object.entries(STORES).forEach(([n,s])=>{if(!d.objectStoreNames.contains(n)){const st=d.createObjectStore(n,{keyPath:s.keyPath});s.indexes.forEach(([ix,kp])=>st.createIndex(ix,kp));}});};
      r.onsuccess=e=>res(e.target.result);
      r.onerror=e=>rej(e.target.error);
    });
    return dbp;
  }
  function req(store,mode,fn){return open().then(d=>new Promise((res,rej)=>{const t=d.transaction(store,mode);const r=fn(t.objectStore(store));r.onsuccess=()=>res(r.result);r.onerror=e=>rej(e.target.error);}));}
  const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  function blobToDataUrl(b){return new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.readAsDataURL(b);});}
  function dataUrlToBlob(u){const [h,d]=u.split(',');const mime=(h.match(/data:([^;]+)/)||[])[1]||'application/octet-stream';const bin=atob(d);const a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return new Blob([a],{type:mime});}
  const DB={
    uid,
    get:(store,id)=>req(store,'readonly',s=>s.get(id)),
    all:(store)=>req(store,'readonly',s=>s.getAll()),
    where:(store,index,value)=>req(store,'readonly',s=>s.index(index).getAll(value)),
    put:(store,obj)=>{if(!obj.id&&STORES[store].keyPath==='id')obj.id=uid();obj.updatedAt=Date.now();return req(store,'readwrite',s=>s.put(obj)).then(()=>obj);},
    del:(store,id)=>req(store,'readwrite',s=>s.delete(id)),
    clear:(store)=>req(store,'readwrite',s=>s.clear()),
    setting:(key,value)=>value===undefined?req('settings','readonly',s=>s.get(key)).then(r=>r&&r.value):req('settings','readwrite',s=>s.put({key,value})),
    /* sauvegarde complète en JSON (les sons sont convertis en texte pour tenir dans le fichier) */
    exportAll:async()=>{const out={format:'connect-db',version:VERSION,exportedAt:new Date().toISOString(),data:{}};
      for(const n of Object.keys(STORES)){let rows=await DB.all(n);if(n==='voices')rows=await Promise.all(rows.map(async v=>{const {blob,...r}=v;return {...r,dataUrl:blob?await blobToDataUrl(blob):null};}));out.data[n]=rows;}return out;},
    importAll:async(json)=>{if(!json||json.format!=='connect-db')throw new Error('format');
      for(const n of Object.keys(STORES)){if(!json.data[n])continue;await DB.clear(n);
        for(let row of json.data[n]){if(n==='voices'&&row.dataUrl){const {dataUrl,...r}=row;row={...r,blob:dataUrlToBlob(dataUrl)};}await req(n,'readwrite',s=>s.put(row));}}
      await DB.ensureSeed();},
    wipe:async()=>{for(const n of Object.keys(STORES))await DB.clear(n);},
    /* données de départ, versionnées : une sauvegarde ancienne est complétée sans toucher au portrait « me » */
    ensureSeed:async()=>{
      let me=await DB.get('profiles','me');
      if(!me)me=await DB.put('profiles',{id:'me',name:'',pseudo:'',city:'',intent:[],now:'',photo:'',facts:{},avail:null,circles:[],online:true,isMe:true});
      const v=(await DB.setting('seedVersion'))||((await DB.setting('seeded'))?1:0);
      if(v>=4||!window.CONNECT_SEED)return;
      const S=CONNECT_SEED;
      if(v>=2){/* mises à jour légères des personnes fictives, sans toucher à « me » */
        for(const sp of S.profiles){const p=await DB.get('profiles',sp.id);if(!p)continue;
          if(v<3&&sp.verified)p.verified=sp.verified;
          if(v<4&&sp.types)p.types=sp.types;
          await DB.put('profiles',p);}
        await DB.setting('seedVersion',4);return;}
      for(const p of S.profiles){const {entries,questions,...prof}=p;await DB.put('profiles',prof);
        for(const old of await DB.where('entries','profileId',p.id))await DB.del('entries',old.id);
        for(const old of await DB.where('questions','profileId',p.id))await DB.del('questions',old.id);
        for(const e of entries)await DB.put('entries',{...e,profileId:p.id});
        for(const q of questions)await DB.put('questions',{...q,profileId:p.id});}
      for(const c of S.circles)await DB.put('circles',c);
      for(const c of S.circlePosts)if(!(await DB.get('circlePosts',c.id)))await DB.put('circlePosts',c);
      for(const m of S.messages)if(!(await DB.get('messages',m.id)))await DB.put('messages',m);
      for(const t of S.threads)if(!(await DB.get('threads',t.id)))await DB.put('threads',t);
      /* conversations déjà commencées dans une version précédente : elles restent ouvertes */
      const msgs=await DB.all('messages');
      for(const id of new Set(msgs.map(m=>m.thread)))if(!(await DB.get('threads',id)))await DB.put('threads',{id,status:'open',startedBy:'me',firstAt:Date.now()});
      if(me.circles===undefined){me.circles=[];me.avail=null;await DB.put('profiles',me);}
      await DB.setting('seedVersion',4);await DB.setting('seeded',true);
    }
  };
  window.DB=DB;
})();
