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
const webpush = require('web-push');

const PORT = +process.env.PORT || 8080;
const ADMIN_KEY = process.env.ADMIN_KEY || '';
const DEBUG_KEY = process.env.DEBUG_KEY || ''; // outil de vérification pendant les tests ; à retirer de Coolify avant l'ouverture au public
const LOG = []; // dernières erreurs (serveur et téléphones), pour le débogage
function logErr(where, msg, extra) { LOG.push({ at: new Date().toISOString(), where, msg: String(msg).slice(0, 2000), extra }); if (LOG.length > 200) LOG.shift(); }
const PUBLIC = process.env.PUBLIC_DIR || path.join(__dirname, 'public');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
const FIRST_PER_DAY = 3;
const STORES = new Set(['profiles','entries','questions','threads','messages','voices','lists','reports','circles','circlePosts','settings','nods']);
const PRIVATE = new Set(['lists','reports','settings']);

/* ---------- base ---------- */
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (id text PRIMARY KEY, email text UNIQUE NOT NULL, pass text NOT NULL, created bigint NOT NULL, banned boolean NOT NULL DEFAULT false);
    CREATE TABLE IF NOT EXISTS sessions (token text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE, created bigint NOT NULL);
    CREATE TABLE IF NOT EXISTS docs (store text NOT NULL, id text NOT NULL, owner text, data jsonb NOT NULL, updated bigint NOT NULL, PRIMARY KEY (store, id));
    CREATE INDEX IF NOT EXISTS docs_owner ON docs (store, owner);
    CREATE TABLE IF NOT EXISTS files (id text PRIMARY KEY, owner text NOT NULL, mime text NOT NULL, data bytea NOT NULL, created bigint NOT NULL);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_by text;
    CREATE TABLE IF NOT EXISTS push_subs (endpoint text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE, data jsonb NOT NULL, created bigint NOT NULL);
  `);
  /* clés des notifications : créées une seule fois et gardées dans la base (rien à régler dans Coolify) */
  let v = await getDoc('system', 'vapid');
  if (!v) { const k = webpush.generateVAPIDKeys(); v = { publicKey: k.publicKey, privateKey: k.privateKey }; await putDoc('system', 'vapid', null, v); }
  webpush.setVapidDetails('mailto:contact@feelsharelove.com', v.publicKey, v.privateKey);
  VAPID_PUBLIC = v.publicKey;
  /* cercles de départ, la première fois seulement */
  for (const c of START_CIRCLES) if (!(await getDoc('circles', c.id))) await putDoc('circles', c.id, null, { ...c, __owner: 'system' });
}
let VAPID_PUBLIC = '';
const START_CIRCLES = [
  { id: 'c1', title: 'Ceux qui vivent loin de chez eux', about: 'Pour ceux qui ont changé de pays, de ville, de vie, et qui cherchent encore leurs repères.' },
  { id: 'c2', title: "Légendes d'automne", about: 'Le film, Tristan, le Montana, et ce que ça remue.' },
  { id: 'c3', title: 'Marcher seul', about: 'Montagne, ville, bord de lac. Ceux pour qui marcher est une manière de penser.' },
  { id: 'c4', title: 'Les gens de la nuit', about: 'Infirmiers, insomniaques, travailleurs de nuit : ceux qui sont réveillés quand les autres dorment.' },
  { id: 'c5', title: 'Cinema Paradiso', about: 'Ceux qui pleurent à la fin, et ceux qui pleurent avant.' }
];
/* notification sur le téléphone : jamais le contenu du message, seulement qui et quoi */
async function pseudoOf(id) { const p = await getDoc('profiles', id); return (p && p.pseudo) || 'Quelqu\'un'; }
async function notify(userId, title, url) {
  if (!VAPID_PUBLIC) return;
  const subs = (await q('SELECT endpoint, data FROM push_subs WHERE user_id=$1', [userId])).rows;
  for (const s of subs) {
    try { await webpush.sendNotification(s.data, JSON.stringify({ title, body: 'Ouvre FeelShareLove pour lire.', url })); }
    catch (e) { if (e.statusCode === 404 || e.statusCode === 410) await q('DELETE FROM push_subs WHERE endpoint=$1', [s.endpoint]); }
  }
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
    if (l.type !== 'red' && l.type !== 'black') continue;
    if (l.owner === me) { for (const p of profiles) if (p.id !== me && listHits(l, p)) hidden.add(p.id); }
    else if (mine && listHits(l, mine)) hidden.add(l.owner);
  }
  for (const p of profiles) if (p.paused && p.id !== me) hidden.add(p.id);
  /* cercle intime : les personnes qui m'ont mis dans leur tribu et que j'ai mises dans la mienne */
  const iChose = new Set(lists.filter(l => l.type === 'tribe' && l.owner === me).map(l => l.target));
  const intimate = new Set(lists.filter(l => l.type === 'tribe' && l.target === me && iChose.has(l.owner)).map(l => l.owner));
  return { hidden, byId, intimate };
}
/* ce que les autres voient d'un portrait : jamais le prénom, le nom ni le code postal ; les infos cachées restent cachées */
function publicProfile(p, intimate) {
  const { name, lastName, npa, email, photoReal, photoSrc, photoCrop, ...rest } = p;
  rest.intimate = !!(intimate && intimate.has(p.id));
  if (rest.intimate && photoReal && p.photoIntimate === true) rest.photo = photoReal; // vraie photo seulement pour le cercle intime // l'accord (masculin, féminin, neutre) reste visible : il sert à écrire « il » ou « elle »
  if (rest.facts) { const f = {}; for (const [k, v] of Object.entries(rest.facts)) if (v && v.show !== false) f[k] = v;
    if (f.birth && f.birth.v && !f.birth.year) f.birth = { ...f.birth, v: '2000' + String(f.birth.v).slice(4) }; // année cachée : elle ne quitte pas le serveur
    rest.facts = f; }
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
  return { id: other, status, startedBy: t.a, firstAt: t.firstAt, free: !!t.free };
}
async function putThread(me, other, body) {
  if (!other || other === me) throw err(400, 'conversation');
  const id = pair(me, other); const t = await getDoc('threads', id);
  const s = body.status;
  if (s === 'pending-out') {
    if (t && !(t.state === 'declined' && t.decliner === me)) throw err(409, 'Une conversation existe déjà.');
    const { hidden } = await hiddenFor(me); if (hidden.has(other)) throw err(403, 'Cette personne n\'est pas joignable.');
    const day = new Date().toISOString().slice(0, 10);
    const mineToday = (await listDocs('threads', 'AND data->>\'a\'=$2', [me])).filter(x => !x.free && new Date(x.firstAt).toISOString().slice(0, 10) === day).length;
    /* réponse à un « moi aussi » reçu : ne compte pas dans les trois premiers messages */
    let free = false; if (body.viaNod) { const nd = await getDoc('nods', body.viaNod); free = !!(nd && nd.owner === other && nd.target === me); }
    if (!free && mineToday >= FIRST_PER_DAY) throw err(429, 'Limite de trois premiers messages par jour atteinte.');
    const n = { a: me, b: other, state: 'pending', firstAt: Date.now(), free };
    await putDoc('threads', id, null, n);
    notify(other, (await pseudoOf(me)) + ' a répondu à ton portrait', '/#messages/' + me);
    return threadView(n, me);
  }
  if (!t) throw err(404, 'conversation');
  if (s === 'open') { if (t.state === 'pending' && t.b !== me) throw err(403, 'Seule la personne qui reçoit peut ouvrir.'); if (t.state === 'declined') throw err(409, 'Conversation close.'); t.state = 'open'; }
  else if (s === 'declined') { t.state = 'declined'; t.decliner = me; }
  else throw err(400, 'statut');
  if (s === 'open' && t.a !== me) notify(t.a, (await pseudoOf(me)) + ' a ouvert la conversation', '/#messages/' + me);
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
  delete m.thread; await putDoc('messages', id, me, m);
  if (!(t.state === 'pending' && t.a === me)) notify(other, (body.kind === 'decline' ? 'Réponse de ' : 'Nouveau message de ') + (await pseudoOf(me)), '/#messages/' + me);
  return msgView(m, me);
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
  /* « moi aussi » : visibles seulement par celui qui l'a écrit et par la personne concernée */
  if (store === 'nods') { const { hidden } = await hiddenFor(me); return (await listDocs('nods', "AND (owner=$2 OR data->>'target'=$2)", [me])).filter(n => !hidden.has(n.owner) && !hidden.has(n.target)); }
  if (PRIVATE.has(store)) { let rows = await listDocs(store, 'AND owner=$2', [me]); for (const [k, v] of Object.entries(query)) rows = rows.filter(r => String(r[k]) === v); return rows; }
  let rows = await listDocs(store);
  for (const [k, v] of Object.entries(query)) rows = rows.filter(r => String(r[k]) === v);
  if (store === 'circles') { const profs = await listDocs('profiles'); rows = rows.map(c => ({ ...c, members: profs.filter(p => (p.circles || []).includes(c.id)).length })); }
  if (['profiles', 'entries', 'questions', 'circlePosts', 'voices'].includes(store)) {
    const { hidden, intimate } = await hiddenFor(me);
    const ownerOf = r => store === 'profiles' ? r.id : store === 'circlePosts' ? r.author : r.profileId || r.owner;
    rows = rows.filter(r => !hidden.has(ownerOf(r)));
    if (store === 'profiles') rows = rows.filter(p => p.id === me || p.pseudo);
    if (store === 'voices') rows = rows.filter(v => v.owner === me || v.kind === 'presentation');
    if (store === 'profiles') rows = rows.map(p => p.id === me ? p : publicProfile(p, intimate));
  }
  return rows;
}
async function readOne(store, me, id) {
  if (store === 'threads') { const t = await getDoc('threads', pair(me, id)); return t ? threadView(t, me) : null; }
  if (store === 'settings') { const s = await getDoc('settings', me + ':' + id); return s ? { key: s.key, value: s.value } : null; }
  const d = await getDoc(store, id); if (!d) return null;
  if (store === 'messages') return d.from === me || d.to === me ? msgView(d, me) : null;
  if (PRIVATE.has(store)) return d.owner === me ? d : null;
  if (store === 'nods') return d.owner === me || d.target === me ? d : null;
  if (store === 'profiles' && d.id !== me) { const { hidden, intimate } = await hiddenFor(me); return hidden.has(d.id) ? null : publicProfile(d, intimate); }
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
  const saved = await putDoc(store, id, me, data);
  /* cercle intime : quand l'autre m'avait déjà mis dans sa tribu, on le dit à tous les deux */
  if (store === 'nods' && data.target && !old) { try { notify(data.target, (await pseudoOf(me)) + ' aime aussi « ' + String(data.title || '').slice(0, 60) + ' »', '/#portrait'); } catch (e) {} }
  if (store === 'lists' && data.type === 'tribe' && data.target && !old) {
    try { const back = (await listDocs('lists')).some(l => l.type === 'tribe' && l.owner === data.target && l.target === me);
      if (back) { notify(data.target, (await pseudoOf(me)) + ' et toi êtes dans le cercle intime l\'un de l\'autre', '/#tribu'); notify(me, (await pseudoOf(data.target)) + ' et toi êtes dans le cercle intime l\'un de l\'autre', '/#tribu'); } } catch (e) {}
  }
  return saved;
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
    const { email, password, invite } = await json(req); const e = norm(email);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw err(400, 'Adresse e-mail invalide.');
    if (!password || password.length < 8) throw err(400, 'Le mot de passe doit avoir au moins 8 caractères.');
    let id;
    if (parts[1] === 'register') {
      const r = await q('SELECT 1 FROM users WHERE email=$1', [e]); if (r.rowCount) throw err(409, 'Un compte existe déjà avec cette adresse.');
      id = uid();
      const inviter = invite ? (await q('SELECT id FROM users WHERE id=$1', [String(invite)])).rows[0] : null;
      await q('INSERT INTO users (id,email,pass,created,invited_by) VALUES ($1,$2,$3,$4,$5)', [id, e, hashPass(password), Date.now(), inviter ? inviter.id : null]);
      if (inviter) { // la personne qui invite entre directement dans la tribu de la nouvelle, et elle est prévenue
        const lid = uid(); await putDoc('lists', lid, id, { id: lid, owner: id, type: 'tribe', target: inviter.id, name: await pseudoOf(inviter.id), __owner: id });
        notify(inviter.id, 'Un ami a rejoint FeelShareLove grâce à toi', '/#tribu');
      }
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
  if (parts[0] === 'log' && req.method === 'POST') { const b = await json(req).catch(() => ({})); logErr('app', b.msg, { url: b.url, stack: String(b.stack || '').slice(0, 1500), ua: String(req.headers['user-agent'] || '').slice(0, 120), user: await userFromReq(req) }); return send(res, 200, { ok: true }); }
  const me = await userFromReq(req);
  if (!me) throw err(401, 'Connexion nécessaire.');
  if (parts[0] === 'me' && req.method === 'DELETE') { await wipeUser(me); return send(res, 200, { ok: true }); }
  /* ma tribu : les personnes qui ont rejoint grâce à mon invitation */
  if (parts[0] === 'invited') { const r = await q('SELECT id FROM users WHERE invited_by=$1 AND NOT banned', [me]); const out = []; for (const u of r.rows) { const p = await getDoc('profiles', u.id); if (p && p.pseudo) out.push({ id: u.id, pseudo: p.pseudo }); } return send(res, 200, out); }
  /* notifications : la clé publique, puis l'abonnement de ce téléphone */
  if (parts[0] === 'push') {
    if (parts[1] === 'key') return send(res, 200, { key: VAPID_PUBLIC });
    const sub = await json(req);
    if (parts[1] === 'subscribe' && sub && sub.endpoint) { await q('INSERT INTO push_subs (endpoint,user_id,data,created) VALUES ($1,$2,$3,$4) ON CONFLICT (endpoint) DO UPDATE SET user_id=$2, data=$3', [sub.endpoint, me, sub, Date.now()]); return send(res, 200, { ok: true }); }
    if (parts[1] === 'unsubscribe' && sub && sub.endpoint) { await q('DELETE FROM push_subs WHERE endpoint=$1 AND user_id=$2', [sub.endpoint, me]); return send(res, 200, { ok: true }); }
    throw err(400, 'push');
  }
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

/* ---------- outil de vérification (débogage) : /debug?key=DEBUG_KEY ----------
   Actif seulement si DEBUG_KEY est réglée dans Coolify. Donne une vue complète de la base et des erreurs,
   et permet d'ouvrir l'app « comme » un compte pour vérifier ce qu'il voit. À désactiver avant l'ouverture au public. */
async function debug(req, res, url) {
  const key = url.searchParams.get('key') || '';
  if (!DEBUG_KEY || key.length !== DEBUG_KEY.length || !crypto.timingSafeEqual(Buffer.from(key), Buffer.from(DEBUG_KEY))) return send(res, 404, 'Introuvable', 'text/plain; charset=utf-8');
  logErr('debug', 'accès ' + url.pathname, { ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress });
  if (url.pathname === '/debug/as') { // ouvrir l'app comme ce compte (id, e-mail ou pseudo)
    const w = url.searchParams.get('user') || '';
    const r = await q("SELECT u.id FROM users u LEFT JOIN docs d ON d.store='profiles' AND d.id=u.id WHERE u.id=$1 OR u.email=lower($1) OR lower(d.data->>'pseudo')=lower($1) LIMIT 1", [w]);
    if (!r.rowCount) return send(res, 404, { error: 'compte introuvable' });
    const token = crypto.randomBytes(32).toString('hex'); await q('INSERT INTO sessions (token,user_id,created) VALUES ($1,$2,$3)', [token, r.rows[0].id, Date.now()]);
    return send(res, 200, `<!doctype html><meta charset="utf-8"><script>localStorage.setItem('fsl_token',${JSON.stringify(token)});localStorage.setItem('fsl_uid',${JSON.stringify(r.rows[0].id)});location.href='/#now';</script>`, 'text/html; charset=utf-8');
  }
  const full = url.searchParams.get('full') === '1';
  const users = (await q('SELECT id, email, created, banned, invited_by FROM users ORDER BY created')).rows;
  const docs = (await q('SELECT store, id, owner, data, updated FROM docs ORDER BY store, updated')).rows;
  const by = {}; for (const d of docs) { (by[d.store] = by[d.store] || []).push(d.data); }
  if (by.profiles) by.profiles = by.profiles.map(p => full ? p : { ...p, photo: p.photo ? '(photo ' + Math.round(p.photo.length / 1024) + ' Ko)' : '' });
  if (by.settings) by.settings = by.settings.map(x => x.key === 'idcheck' ? { key: x.key, value: '(photo de carte)' } : x);
  delete by.system; // jamais les clés des notifications
  const subs = (await q('SELECT user_id, created FROM push_subs')).rows;
  const files = (await q('SELECT id, owner, mime, length(data) taille, created FROM files')).rows;
  send(res, 200, { now: new Date().toISOString(), version: require('./package.json').version, users, data: by, push_subs: subs, files, errors: LOG });
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname === '/health') return send(res, 200, { ok: true });
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    if (url.pathname === '/admin') return await admin(req, res, url);
    if (url.pathname === '/debug' || url.pathname === '/debug/as') return await debug(req, res, url);
    if (req.method !== 'GET') return send(res, 405, { error: 'méthode' });
    serveStatic(req, res, url.pathname);
  } catch (e) {
    if (!e.code || typeof e.code !== 'number') { console.error(e); logErr('serveur', e.message, { url: req.url, stack: String(e.stack || '').slice(0, 1500) }); }
    send(res, typeof e.code === 'number' ? e.code : 500, { error: typeof e.code === 'number' ? e.message : 'Erreur du serveur.' });
  }
}).listen(PORT, async () => {
  for (let i = 0; i < 30; i++) { try { await initDb(); break; } catch (e) { console.error('Base pas encore prête…', e.message); await new Promise(r => setTimeout(r, 2000)); } }
  console.log('FeelShareLove sur le port ' + PORT);
});
