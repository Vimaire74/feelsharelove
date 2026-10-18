/* FeelShareLove — serveur (Node.js + PostgreSQL)
   Sert l'application web (dossier public/) et l'API (/api/...), plus la page d'administration (/admin?key=...).
   Variables d'environnement : DATABASE_URL (obligatoire), ADMIN_KEY (obligatoire pour /admin), PORT (8080 par défaut).
   Les données sont rangées par « table » (store) comme dans la version locale : profiles, entries, questions,
   threads, messages, voices, lists, reports, circles, circlePosts, settings. */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

const PORT = +process.env.PORT || 8080;
const ADMIN_KEY = process.env.ADMIN_KEY || '';
const PUBLIC = process.env.PUBLIC_DIR || path.join(__dirname, 'public');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
const FIRST_PER_DAY = 3;
const STORES = new Set(['profiles','entries','questions','threads','messages','voices','lists','reports','circles','circlePosts','settings']);
const PRIVATE = new Set(['lists','reports','settings']);

/* ---------- base ---------- */
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (id text PRIMARY KEY, email text UNIQUE NOT NULL, pass text NOT NULL, created bigint NOT NULL, banned boolean NOT NULL DEFAULT false);
    CREATE TABLE IF NOT EXISTS sessions (token text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE, created bigint NOT NULL);
    CREATE TABLE IF NOT EXISTS docs (store text NOT NULL, id text NOT NULL, owner text, data jsonb NOT NULL, updated bigint NOT NULL, PRIMARY KEY (store, id));
    CREATE INDEX IF NOT EXISTS docs_owner ON docs (store, owner);
    CREATE TABLE IF NOT EXISTS files (id text PRIMARY KEY, owner text NOT NULL, mime text NOT NULL, data bytea NOT NULL, created bigint NOT NULL);
  `);
}
const q = (sql, args) => pool.query(sql, args);
const uid = () => crypto.randomBytes(9).toString('base64url');
async function getDoc(store, id) { const r = await q('SELECT data FROM docs WHERE store=$1 AND id=$2', [store, id]); return r.rows[0] ? r.rows[0].data : null; }
async function putDoc(store, id, owner, data) {
  data.updatedAt = Date.now();
  await q(`INSERT INTO docs (store,id,owner,data,updated) VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (store,id) DO UPDATE SET owner=EXCLUDED.owner, data=EXCLUDED.data, updated=EXCLUDED.updated`, [store, id, owner, data, data.updatedAt]);
  return data;
}
async function listDocs(store, where = '', args = []) { const r = await q(`SELECT data FROM docs WHERE store=$1 ${where}`, [store, ...args]); return r.rows.map(x => x.data); }

/* ---------- mots de passe et sessions ---------- */
function hashPass(p) { const salt = crypto.randomBytes(16); const h = crypto.scryptSync(p, salt, 64); return salt.toString('hex') + ':' + h.toString('hex'); }
function checkPass(p, stored) { const [s, h] = stored.split(':'); const x = crypto.scryptSync(p, Buffer.from(s, 'hex'), 64); return crypto.timingSafeEqual(x, Buffer.from(h, 'hex')); }
async function userFromReq(req) {
  const t = (req.headers.authorization || '').replace(/^Bearer /, '');
  if (!t) return null;
  const r = await q('SELECT u.id, u.banned FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=$1', [t]);
  return r.rows[0] && !r.rows[0].banned ? r.rows[0].id : null;
}
const tries = new Map(); // limite simple contre les essais de mots de passe
function tooMany(ip) { const now = Date.now(); const a = (tries.get(ip) || []).filter(t => now - t < 15 * 60e3); a.push(now); tries.set(ip, a); return a.length > 20; }

/* ---------- visibilité entre personnes ---------- */
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
function listHits(l, p) {
  if (!p) return false;
  if (l.target && l.target === p.id) return true;
  const ln = norm(l.name); if (!ln) return false;
  if (ln === norm(p.pseudo)) return true;
  if (l.type === 'red') { const full = norm((p.name || '') + ' ' + (p.lastName || '')); return ln === full || (!ln.includes(' ') && ln === norm(p.name)); }
  return false;
}
/* qui ne doit pas voir qui : listes rouge et noire, dans les deux sens ; portraits en pause */
async function hiddenFor(me) {
  const profiles = await listDocs('profiles');
  const byId = Object.fromEntries(profiles.map(p => [p.id, p]));
  const lists = await listDocs('lists');
  const hidden = new Set();
  const mine = byId[me];
  for (const l of lists) {
    if (l.owner === me) { for (const p of profiles) if (p.id !== me && listHits(l, p)) hidden.add(p.id); }
    else if (mine && listHits(l, mine)) hidden.add(l.owner);
  }
  for (const p of profiles) if (p.paused && p.id !== me) hidden.add(p.id);
  return { hidden, byId };
}
/* ce que les autres voient d'un portrait : jamais le prénom, le nom ni le code postal ; les infos cachées restent cachées */
function publicProfile(p) {
  const { name, lastName, npa, email, accord, ...rest } = p;
  if (rest.facts) { const f = {}; for (const [k, v] of Object.entries(rest.facts)) if (v && v.show !== false) f[k] = v; rest.facts = f; }
  if (rest.verified) rest.verified = { status: rest.verified.status, at: rest.verified.status === 'verified' ? rest.verified.at : undefined };
  return rest;
}

/* ---------- conversations : une par paire de personnes, vue différemment par chacune ---------- */
const pair = (a, b) => [a, b].sort().join('|');
function threadView(t, me) {
  const other = t.a === me ? t.b : t.a;
  let status = t.state;
  if (t.state === 'pending') status = t.a === me ? 'pending-out' : 'pending-in';
  if (t.state === 'declined') status = t.decliner === me ? 'declined' : 'declined-by-them';
  return { id: other, status, startedBy: t.a, firstAt: t.firstAt };
}
async function putThread(me, other, body) {
  if (!other || other === me) throw err(400, 'conversation');
  const id = pair(me, other); const t = await getDoc('threads', id);
  const s = body.status;
  if (s === 'pending-out') {
    if (t && !(t.state === 'declined' && t.decliner === me)) throw err(409, 'Une conversation existe déjà.');
    const { hidden } = await hiddenFor(me); if (hidden.has(other)) throw err(403, 'Cette personne n\'est pas joignable.');
    const day = new Date().toISOString().slice(0, 10);
    const mineToday = (await listDocs('threads', 'AND data->>\'a\'=$2', [me])).filter(x => new Date(x.firstAt).toISOString().slice(0, 10) === day).length;
    if (mineToday >= FIRST_PER_DAY) throw err(429, 'Limite de trois premiers messages par jour atteinte.');
    const n = { a: me, b: other, state: 'pending', firstAt: Date.now() };
    await putDoc('threads', id, null, n); return threadView(n, me);
  }
  if (!t) throw err(404, 'conversation');
  if (s === 'open') { if (t.state === 'pending' && t.b !== me) throw err(403, 'Seule la personne qui reçoit peut ouvrir.'); if (t.state === 'declined') throw err(409, 'Conversation close.'); t.state = 'open'; }
  else if (s === 'declined') { t.state = 'declined'; t.decliner = me; }
  else throw err(400, 'statut');
  await putDoc('threads', id, null, t); return threadView(t, me);
}
async function myThreads(me) { return (await listDocs('threads', "AND (data->>'a'=$2 OR data->>'b'=$2)", [me])).map(t => threadView(t, me)); }

/* messages : rangés par paire ; chacun voit le champ thread = l'autre personne */
function msgView(m, me) { const other = m.from === me ? m.to : m.from; const { pairId, ...rest } = m; return { ...rest, thread: other }; }
async function putMessage(me, id, body, old) {
  if (old) { // seule modification permise : la personne qui reçoit marque une photo éphémère comme vue
    if (old.to !== me) throw err(403, 'message'); old.seen = !!body.seen; await putDoc('messages', id, old.from, old); return msgView(old, me);
  }
  const other = body.to; if (body.from !== me || !other) throw err(403, 'message');
  const t = await getDoc('threads', pair(me, other)); if (!t) throw err(403, 'Pas de conversation.');
  const ok = t.state === 'open' || (t.state === 'pending' && t.a === me) || (body.kind === 'decline' && (t.decliner === me || (t.state === 'pending' && t.b === me)));
  if (!ok) throw err(403, 'Conversation fermée.');
  const m = { ...body, id, pairId: pair(me, other), ts: Date.now() };
  delete m.thread; await putDoc('messages', id, me, m); return msgView(m, me);
}

/* ---------- API générique ---------- */
function err(code, msg) { const e = new Error(msg); e.code = code; return e; }
async function readList(store, me, query) {
  if (store === 'threads') return myThreads(me);
  if (store === 'messages') {
    let rows = (await listDocs('messages', "AND (data->>'from'=$2 OR data->>'to'=$2)", [me])).map(m => msgView(m, me));
    if (query.thread) rows = rows.filter(m => m.thread === query.thread); return rows;
  }
  if (store === 'settings') return (await listDocs('settings', 'AND owner=$2', [me])).map(s => ({ key: s.key, value: s.value }));
  if (PRIVATE.has(store)) { let rows = await listDocs(store, 'AND owner=$2', [me]); for (const [k, v] of Object.entries(query)) rows = rows.filter(r => String(r[k]) === v); return rows; }
  let rows = await listDocs(store);
  for (const [k, v] of Object.entries(query)) rows = rows.filter(r => String(r[k]) === v);
  if (['profiles', 'entries', 'questions', 'circlePosts', 'voices'].includes(store)) {
    const { hidden } = await hiddenFor(me);
    const ownerOf = r => store === 'profiles' ? r.id : store === 'circlePosts' ? r.author : r.profileId || r.owner;
    rows = rows.filter(r => !hidden.has(ownerOf(r)));
    if (store === 'profiles') rows = rows.filter(p => p.id === me || p.pseudo);
    if (store === 'voices') rows = rows.filter(v => v.owner === me || v.kind === 'presentation');
    if (store === 'profiles') rows = rows.map(p => p.id === me ? p : publicProfile(p));
  }
  return rows;
}
async function readOne(store, me, id) {
  if (store === 'threads') { const t = await getDoc('threads', pair(me, id)); return t ? threadView(t, me) : null; }
  if (store === 'settings') { const s = await getDoc('settings', me + ':' + id); return s ? { key: s.key, value: s.value } : null; }
  const d = await getDoc(store, id); if (!d) return null;
  if (store === 'messages') return d.from === me || d.to === me ? msgView(d, me) : null;
  if (PRIVATE.has(store)) return d.owner === me ? d : null;
  if (store === 'profiles' && d.id !== me) { const { hidden } = await hiddenFor(me); return hidden.has(d.id) ? null : publicProfile(d); }
  return d;
}
async function writeOne(store, me, id, body) {
  if (store === 'threads') return putThread(me, id, body);
  if (store === 'settings') { const v = { key: id, value: body.value }; await putDoc('settings', me + ':' + id, me, v); return v; }
  const old = await getDoc(store, id);
  if (store === 'messages') return putMessage(me, id, body, old);
  const data = { ...body, id };
  if (store === 'profiles') {
    if (id !== me) throw err(403, 'portrait');
    if (data.pseudo) { const r = await q("SELECT 1 FROM docs WHERE store='profiles' AND id<>$1 AND lower(data->>'pseudo')=lower($2)", [me, data.pseudo]); if (r.rowCount) throw err(409, 'Ce pseudo est déjà pris.'); }
    if (old && old.verified && old.verified.status === 'verified') data.verified = old.verified; // seul l'admin valide
    else if (data.verified && data.verified.status === 'verified') data.verified = old && old.verified || null;
    return putDoc(store, id, me, data);
  }
  const ownerField = { entries: 'profileId', questions: 'profileId', circlePosts: 'author', reports: 'by', circles: 'createdBy' }[store] || 'owner';
  if (old && old.__owner && old.__owner !== me) throw err(403, 'écriture');
  if (data[ownerField] !== me) throw err(403, 'propriétaire');
  if (store === 'reports') data.status = old ? old.status : 'open';
  data.__owner = me;
  return putDoc(store, id, me, data);
}
async function deleteOne(store, me, id) {
  if (store === 'settings') return q('DELETE FROM docs WHERE store=$1 AND id=$2', ['settings', me + ':' + id]);
  return q('DELETE FROM docs WHERE store=$1 AND id=$2 AND owner=$3', [store, id, me]);
}
async function wipeUser(me) {
  await q('DELETE FROM docs WHERE owner=$1', [me]);
  await q("DELETE FROM docs WHERE store='profiles' AND id=$1", [me]);
  await q('DELETE FROM files WHERE owner=$1', [me]);
  await q('DELETE FROM users WHERE id=$1', [me]);
}

/* ---------- HTTP ---------- */
function send(res, code, body, type = 'application/json; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(type.startsWith('application/json') ? JSON.stringify(body) : body);
}
function readBody(req, max = 8e6) {
  return new Promise((ok, ko) => { const parts = []; let n = 0;
    req.on('data', c => { n += c.length; if (n > max) { ko(err(413, 'Trop gros.')); req.destroy(); } else parts.push(c); });
    req.on('end', () => ok(Buffer.concat(parts))); req.on('error', ko); });
}
const json = async req => { const b = await readBody(req); return b.length ? JSON.parse(b.toString('utf8')) : {}; };
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
function serveStatic(req, res, p) {
  const file = path.normalize(path.join(PUBLIC, p === '/' ? 'index.html' : decodeURIComponent(p)));
  if (!file.startsWith(PUBLIC)) return send(res, 403, { error: 'interdit' });
  fs.readFile(file, (e, data) => {
    if (e) return send(res, 404, 'Introuvable', 'text/plain; charset=utf-8');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); res.end(data);
  });
}

async function api(req, res, url) {
  const parts = url.pathname.split('/').filter(Boolean).slice(1).map(decodeURIComponent); // après "api"
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  /* comptes */
  if (parts[0] === 'auth') {
    if (req.method !== 'POST') throw err(405, 'méthode');
    if (parts[1] === 'logout') { const t = (req.headers.authorization || '').replace(/^Bearer /, ''); await q('DELETE FROM sessions WHERE token=$1', [t]); return send(res, 200, { ok: true }); }
    if (tooMany(ip)) throw err(429, 'Trop d\'essais. Réessaie dans un quart d\'heure.');
    const { email, password } = await json(req); const e = norm(email);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw err(400, 'Adresse e-mail invalide.');
    if (!password || password.length < 8) throw err(400, 'Le mot de passe doit avoir au moins 8 caractères.');
    let id;
    if (parts[1] === 'register') {
      const r = await q('SELECT 1 FROM users WHERE email=$1', [e]); if (r.rowCount) throw err(409, 'Un compte existe déjà avec cette adresse.');
      id = uid(); await q('INSERT INTO users (id,email,pass,created) VALUES ($1,$2,$3,$4)', [id, e, hashPass(password), Date.now()]);
    } else if (parts[1] === 'login') {
      const r = await q('SELECT id, pass, banned FROM users WHERE email=$1', [e]);
      if (!r.rowCount || !checkPass(password, r.rows[0].pass)) throw err(401, 'Adresse ou mot de passe incorrect.');
      if (r.rows[0].banned) throw err(403, 'Ce compte a été suspendu.');
      id = r.rows[0].id;
    } else throw err(404, 'auth');
    const token = crypto.randomBytes(32).toString('hex');
    await q('INSERT INTO sessions (token,user_id,created) VALUES ($1,$2,$3)', [token, id, Date.now()]);
    return send(res, 200, { token, id });
  }
  const me = await userFromReq(req);
  if (!me) throw err(401, 'Connexion nécessaire.');
  if (parts[0] === 'me' && req.method === 'DELETE') { await wipeUser(me); return send(res, 200, { ok: true }); }
  /* fichiers (voix, photos) */
  if (parts[0] === 'files') {
    if (req.method === 'POST') { const b = await readBody(req); const id = uid(); await q('INSERT INTO files (id,owner,mime,data,created) VALUES ($1,$2,$3,$4,$5)', [id, me, req.headers['content-type'] || 'application/octet-stream', b, Date.now()]); return send(res, 200, { id, url: '/api/files/' + id }); }
    const r = await q('SELECT mime, data FROM files WHERE id=$1', [parts[1]]); if (!r.rowCount) throw err(404, 'fichier');
    res.writeHead(200, { 'Content-Type': r.rows[0].mime, 'Cache-Control': 'private, max-age=86400' }); return res.end(r.rows[0].data);
  }
  const store = parts[0]; if (!STORES.has(store)) throw err(404, 'table');
  const id = parts[1];
  const query = Object.fromEntries(url.searchParams);
  if (req.method === 'GET') return send(res, 200, id ? await readOne(store, me, id) : await readList(store, me, query));
  if (req.method === 'PUT' && id) return send(res, 200, await writeOne(store, me, id, await json(req)));
  if (req.method === 'DELETE' && id) { await deleteOne(store, me, id); return send(res, 200, { ok: true }); }
  throw err(405, 'méthode');
}

/* ---------- administration : /admin?key=ADMIN_KEY ---------- */
const H = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
async function admin(req, res, url) {
  const key = url.searchParams.get('key') || '';
  if (!ADMIN_KEY || key.length !== ADMIN_KEY.length || !crypto.timingSafeEqual(Buffer.from(key), Buffer.from(ADMIN_KEY))) return send(res, 404, 'Introuvable', 'text/plain; charset=utf-8');
  if (req.method === 'POST') {
    const f = new URLSearchParams((await readBody(req)).toString());
    const a = f.get('a'), id = f.get('id');
    if (a === 'verify' || a === 'refuse') {
      const p = await getDoc('profiles', id);
      if (p) { p.verified = a === 'verify' ? { status: 'verified', at: Date.now() } : { status: 'refused', at: Date.now() }; await putDoc('profiles', id, id, p); }
      await q('DELETE FROM docs WHERE store=$1 AND id=$2', ['settings', id + ':idcheck']); // la photo de la carte est supprimée dans les deux cas
    }
    if (a === 'report-done') { const r = await getDoc('reports', id); if (r) { r.status = 'done'; await putDoc('reports', id, r.by, r); } }
    if (a === 'ban') { await q('UPDATE users SET banned=true WHERE id=$1', [id]); await q('DELETE FROM sessions WHERE user_id=$1', [id]); const p = await getDoc('profiles', id); if (p) { p.paused = Date.now(); await putDoc('profiles', id, id, p); } }
    if (a === 'unban') await q('UPDATE users SET banned=false WHERE id=$1', [id]);
    res.writeHead(303, { Location: '/admin?key=' + encodeURIComponent(key) }); return res.end();
  }
  const users = (await q('SELECT id, email, created, banned FROM users ORDER BY created DESC')).rows;
  const profiles = Object.fromEntries((await listDocs('profiles')).map(p => [p.id, p]));
  const pend = Object.values(profiles).filter(p => p.verified && p.verified.status === 'pending');
  const reports = (await listDocs('reports')).filter(r => r.status === 'open').sort((a, b) => b.ts - a.ts);
  const counts = (await q('SELECT store, count(*)::int n FROM docs GROUP BY store')).rows;
  const who = id => { const p = profiles[id]; return p ? H(p.pseudo || '(sans pseudo)') + ' <small>' + H([p.name, p.lastName].filter(Boolean).join(' ')) + '</small>' : H(id); };
  const btn = (a, id, label) => `<form method="post" style="display:inline"><input type="hidden" name="a" value="${a}"><input type="hidden" name="id" value="${H(id)}"><button>${label}</button></form>`;
  const card = async p => { const s = await getDoc('settings', p.id + ':idcheck'); return `<div class="card"><b>${who(p.id)}</b><div class="pics"><figure><img src="${H(p.photo)}"><figcaption>Portrait</figcaption></figure><figure>${s ? `<img src="${H(s.value && s.value.shot)}">` : '<p>(pas de photo)</p>'}<figcaption>Carte + visage</figcaption></figure></div>${btn('verify', p.id, 'Valider')} ${btn('refuse', p.id, 'Refuser')}</div>`; };
  const html = `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FeelShareLove · admin</title>
<style>body{font:15px system-ui;margin:0;padding:16px;background:#14100e;color:#f3e9df}h1{font-size:22px}h2{margin-top:28px;font-size:17px;color:#f0a35e}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #3a2f29;padding:6px;text-align:left;font-size:14px}small{color:#a8978a}.card{background:#221a16;border-radius:10px;padding:12px;margin:10px 0}.pics{display:flex;gap:10px;margin:8px 0}.pics img{width:160px;border-radius:8px}figure{margin:0}figcaption{font-size:12px;color:#a8978a}button{background:#e8613c;color:#fff;border:0;border-radius:6px;padding:6px 10px;cursor:pointer}</style>
<h1>FeelShareLove · administration</h1>
<p>${users.length} comptes · ${counts.map(c => H(c.store) + ' ' + c.n).join(' · ')}</p>
<h2>Vérifications en attente (${pend.length})</h2>${(await Promise.all(pend.map(card))).join('') || '<p>Aucune.</p>'}
<h2>Signalements ouverts (${reports.length})</h2>${reports.length ? `<table><tr><th>Date</th><th>Type</th><th>Par</th><th>Visé</th><th>Raison</th><th></th></tr>${reports.map(r => `<tr><td>${new Date(r.ts || r.updatedAt).toLocaleString('fr-CH')}</td><td>${H(r.kind)}</td><td>${who(r.by)}</td><td>${who(r.target)}</td><td>${H(r.reason)}</td><td>${btn('report-done', r.id, 'Traité')} ${btn('ban', r.target, 'Suspendre la personne visée')}</td></tr>`).join('')}</table>` : '<p>Aucun.</p>'}
<h2>Comptes</h2><table><tr><th>Inscription</th><th>Pseudo / nom</th><th>E-mail</th><th></th></tr>${users.map(u => `<tr><td>${new Date(+u.created).toLocaleDateString('fr-CH')}</td><td>${who(u.id)}</td><td>${H(u.email)}</td><td>${u.banned ? 'suspendu ' + btn('unban', u.id, 'Réactiver') : btn('ban', u.id, 'Suspendre')}</td></tr>`).join('')}</table>`;
  send(res, 200, html, 'text/html; charset=utf-8');
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname === '/health') return send(res, 200, { ok: true });
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    if (url.pathname === '/admin') return await admin(req, res, url);
    if (req.method !== 'GET') return send(res, 405, { error: 'méthode' });
    serveStatic(req, res, url.pathname);
  } catch (e) {
    if (!e.code || typeof e.code !== 'number') console.error(e);
    send(res, typeof e.code === 'number' ? e.code : 500, { error: typeof e.code === 'number' ? e.message : 'Erreur du serveur.' });
  }
}).listen(PORT, async () => {
  for (let i = 0; i < 30; i++) { try { await initDb(); break; } catch (e) { console.error('Base pas encore prête…', e.message); await new Promise(r => setTimeout(r, 2000)); } }
  console.log('FeelShareLove sur le port ' + PORT);
});
