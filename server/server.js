/* FeelShareLove — serveur (Node.js + PostgreSQL)
   Sert les pages d'accueil publiques (/, /de, /en…), l'application web (/app, dossier public/) et l'API (/api/...), plus la page d'administration (/admin?key=...).
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
const STORES = new Set(['profiles','entries','questions','threads','messages','voices','lists','reports','circles','circlePosts','settings','nods','invites','notices']);
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
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen bigint;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS no_mail boolean NOT NULL DEFAULT false;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason text;
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
  if (!r.rows[0] || r.rows[0].banned) return null;
  const id = r.rows[0].id, now = Date.now(); // dernière visite, notée au plus toutes les 10 minutes
  if (now - (seenAt.get(id) || 0) > 6e5) { seenAt.set(id, now); q('UPDATE users SET last_seen=$1 WHERE id=$2', [now, id]).catch(() => {}); }
  return id;
}
const seenAt = new Map();
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
  /* tribu : invitation acceptée des deux côtés */
  const intimate = new Set((await listDocs('invites', "AND data->>'state'='yes' AND (data->>'from'=$2 OR data->>'to'=$2)", [me])).map(i => i.from === me ? i.to : i.from));
  /* portrait complet : seulement avec les personnes avec qui la conversation est ouverte (ou le cercle intime) */
  const opened = new Set((await listDocs('threads', "AND (data->>'a'=$2 OR data->>'b'=$2)", [me])).filter(t => t.state === 'open').map(t => t.a === me ? t.b : t.a));
  intimate.forEach(id => opened.add(id));
  return { hidden, byId, intimate, opened };
}
/* ce que les autres voient d'un portrait : jamais le prénom, le nom ni le code postal ; les infos cachées restent cachées */
/* distance : coordonnées de la ville (service gratuit Open-Meteo), arrondies à environ 5 km ; jamais envoyées aux autres, seulement la distance */
const geoCache = new Map();
async function geocode(city, npa) {
  const name = String(city || '').replace(/\s+[A-Z]{2}$/, '').trim(); if (!name) return null;
  const cc = (String(city).match(/\s([A-Z]{2})$/) || [])[1] || (/^\d{4}$/.test(String(npa || '').trim()) ? 'CH' : '');
  const k = name.toLowerCase() + '|' + cc; if (geoCache.has(k)) return geoCache.get(k);
  try {
    const r = await fetch('https://geocoding-api.open-meteo.com/v1/search?count=10&language=fr&format=json&name=' + encodeURIComponent(name));
    const res = ((await r.json()).results || []); const x = (cc && res.find(y => y.country_code === cc)) || res[0];
    const v = x ? { lat: Math.round(x.latitude * 20) / 20, lon: Math.round(x.longitude * 20) / 20 } : null; geoCache.set(k, v); return v;
  } catch (e) { return null; }
}
async function withGeo(p) { if (p.city && (!p.geo || p.geoCity !== p.city)) { const g = await geocode(p.city, p.npa); if (g) { p.geo = g; p.geoCity = p.city; } } else if (!p.city) { delete p.geo; delete p.geoCity; } return p; }
function km(a, b) { if (!a || !b) return null; const R = 6371, r = x => x * Math.PI / 180, dLa = r(b.lat - a.lat), dLo = r(b.lon - a.lon);
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); }
async function backfillGeo() { for (const p of await listDocs('profiles')) { if (p.city && (!p.geo || p.geoCity !== p.city)) { await withGeo(p); if (p.geo) await putDoc('profiles', p.id, p.id, p); } } }
/* questions ouvertes : même question, réponses qui se ressemblent. Seul le nombre de concordances sort du serveur, jamais le texte. */
const QSTOP = new Set(['dans', 'avec', 'pour', 'sans', 'sous', 'chez', 'vers', 'mais', 'donc', 'puis', 'quand', 'comme', 'cette', 'cela', 'celui', 'celle', 'ceux', 'elle', 'elles', 'nous', 'vous', 'leur', 'leurs', 'mon', 'ma', 'mes', 'ton', 'tes', 'son', 'ses', 'notre', 'votre', 'tout', 'tous', 'toute', 'toutes', 'plus', 'moins', 'tres', 'bien', 'fois', 'etre', 'avoir', 'fait', 'faire', 'suis', 'etais', 'etait', 'quelque', 'chose', 'jamais', 'toujours', 'encore', 'aussi', 'meme', 'alors', 'parce', 'lorsque', 'that', 'this', 'with', 'from', 'when', 'what', 'have', 'been', 'were', 'they', 'them', 'their', 'your', 'there', 'where', 'which', 'about', 'nicht', 'aber', 'auch', 'dass', 'wenn', 'eine', 'einer', 'einem', 'einen', 'mein', 'meine', 'dein', 'deine', 'sein', 'seine', 'ihre', 'noch', 'immer', 'sehr', 'oder', 'como', 'pero', 'para', 'cuando', 'donde', 'esta', 'este', 'esto', 'esos', 'esas', 'todo', 'toda', 'todos', 'nunca', 'siempre', 'anche', 'come', 'quando', 'dove', 'questo', 'questa', 'sempre', 'tutto', 'tutti', 'della', 'delle', 'dello', 'degli', 'nella', 'nelle', 'sono', 'essere', 'mais', 'quando', 'onde', 'esse', 'essa', 'isso', 'tudo', 'todos', 'sempre', 'nunca']);
const qFold = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
function qWords(a) { return new Set(qFold(a).split(' ').filter(w => w.length >= 4 && !QSTOP.has(w)).map(w => w.replace(/(es|s|x)$/, ''))); }
function qSame(a, b) { const fa = qFold(a), fb = qFold(b); if (!fa || !fb || fa.length < 4 || fb.length < 4) return false;
  if (fa === fb || fa.includes(fb) || fb.includes(fa)) return true;
  const wa = qWords(a), wb = qWords(b); let n = 0; for (const w of wa) if (wb.has(w)) n++; return n >= 2; }
function qMatches(mine, theirs) { let n = 0; for (const q of mine || []) { if (!q.a) continue; const t = (theirs || []).find(x => x.a && qFold(x.k) === qFold(q.k)); if (t && qSame(q.a, t.a)) n++; } return n; }
function publicProfile(p, intimate, opened, myGeo, qmatch) {
  const { name, lastName, npa, email, photoReal, photoSrc, photoCrop, geo, geoCity, tribeColor, readLangs, ...rest } = p; // couleur de tribu et langues de lecture restent privées
  if (!rest.textLang) rest.textLang = 'fr'; // anciens portraits : écrits en français
  const d = km(myGeo, geo); if (d != null) rest.km = Math.max(5, Math.round(d / 5) * 5);
  rest.intimate = !!(intimate && intimate.has(p.id));
  if (qmatch) rest.qmatch = qmatch; // nombre de questions ouvertes où nos réponses se ressemblent
  /* pays seulement, au début : code à deux lettres de la ville, sinon Suisse si le code postal est suisse */
  rest.country = ((p.city || '').match(/\s([A-Z]{2})$/) || [])[1] || (/^\d{4}$/.test(String(npa || '').trim()) ? 'CH' : '');
  /* avant que la conversation soit ouverte : pas de « Qui il est » (âge, langues, métier…) */
  if (opened && !opened.has(p.id)) { rest.limited = true; delete rest.now;
    const f = {}; if (rest.facts) { if (rest.facts.sign) f.sign = rest.facts.sign; if (rest.facts.langs) f.langs = rest.facts.langs; } rest.facts = f; } // signe et langues seulement
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
    notify(other, (await pseudoOf(me)) + ' a répondu à ton portrait', '/app#messages/' + me);
    return threadView(n, me);
  }
  if (!t) throw err(404, 'conversation');
  if (s === 'open') { if (t.state === 'pending' && t.b !== me) throw err(403, 'Seule la personne qui reçoit peut ouvrir.'); if (t.state === 'declined') throw err(409, 'Conversation close.'); t.state = 'open'; }
  else if (s === 'declined') { t.state = 'declined'; t.decliner = me; }
  else throw err(400, 'statut');
  if (s === 'open' && t.a !== me) notify(t.a, (await pseudoOf(me)) + ' a ouvert la conversation', '/app#messages/' + me);
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
  if (!(t.state === 'pending' && t.a === me)) notify(other, (body.kind === 'decline' ? 'Réponse de ' : 'Nouveau message de ') + (await pseudoOf(me)), '/app#messages/' + me);
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
  if (store === 'notices') return listDocs('notices', "AND data->>'to'=$2", [me]);
  if (store === 'invites') { const { hidden } = await hiddenFor(me); return (await listDocs('invites', "AND (data->>'from'=$2 OR data->>'to'=$2)", [me])).filter(i => !hidden.has(i.from === me ? i.to : i.from)); }
  /* « moi aussi » : visibles seulement par celui qui l'a écrit et par la personne concernée */
  if (store === 'nods') { const { hidden } = await hiddenFor(me); return (await listDocs('nods', "AND (owner=$2 OR data->>'target'=$2)", [me])).filter(n => !hidden.has(n.owner) && !hidden.has(n.target)); }
  if (PRIVATE.has(store)) { let rows = await listDocs(store, 'AND owner=$2', [me]); for (const [k, v] of Object.entries(query)) rows = rows.filter(r => String(r[k]) === v); return rows; }
  let rows = await listDocs(store);
  for (const [k, v] of Object.entries(query)) rows = rows.filter(r => String(r[k]) === v);
  if (store === 'circles') { const profs = await listDocs('profiles'); rows = rows.map(c => ({ ...c, members: profs.filter(p => (p.circles || []).includes(c.id)).length })); }
  if (['profiles', 'entries', 'questions', 'circlePosts', 'voices'].includes(store)) {
    const { hidden, intimate, opened } = await hiddenFor(me);
    const ownerOf = r => store === 'profiles' ? r.id : store === 'circlePosts' ? r.author : r.profileId || r.owner;
    rows = rows.filter(r => !hidden.has(ownerOf(r)));
    if (store === 'profiles') rows = rows.filter(p => p.id === me || p.pseudo);
    if (store === 'voices') rows = rows.filter(v => v.owner === me || (v.kind === 'presentation' && opened.has(v.owner)));
    if (store === 'questions') rows = rows.filter(r => r.profileId === me || opened.has(r.profileId));
    if (store === 'profiles') { const mg = (rows.find(p => p.id === me) || {}).geo; const qs = await listDocs('questions'); const byP = {}; for (const x of qs) (byP[x.profileId] = byP[x.profileId] || []).push(x);
      rows = rows.map(p => p.id === me ? p : publicProfile(p, intimate, opened, mg, qMatches(byP[me], byP[p.id]))); }
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
  if (store === 'invites') return d.from === me || d.to === me ? d : null;
  if (store === 'notices') return d.to === me ? d : null;
  if (store === 'profiles' && d.id !== me) { const { hidden, intimate, opened, byId } = await hiddenFor(me); if (hidden.has(d.id)) return null; const qs = await listDocs('questions'); return publicProfile(d, intimate, opened, (byId[me] || {}).geo, qMatches(qs.filter(x => x.profileId === me), qs.filter(x => x.profileId === d.id))); }
  if (store === 'questions' && d.profileId !== me) { const { opened } = await hiddenFor(me); return opened.has(d.profileId) ? d : null; }
  if (store === 'voices' && d.owner !== me && d.kind === 'presentation') { const { opened } = await hiddenFor(me); return opened.has(d.owner) ? d : null; }
  return d;
}
async function writeOne(store, me, id, body) {
  if (store === 'threads') return putThread(me, id, body);
  if (store === 'settings') { const v = { key: id, value: body.value }; await putDoc('settings', me + ':' + id, me, v); return v; }
  if (store === 'invites') return putInvite(me, body);
  if (store === 'notices') { const n = await getDoc('notices', id); if (!n || n.to !== me) throw err(403, 'message'); n.read = true; return putDoc('notices', id, 'admin', n); }
  const old = await getDoc(store, id);
  if (store === 'messages') return putMessage(me, id, body, old);
  const data = { ...body, id };
  if (store === 'profiles') {
    if (id !== me) throw err(403, 'portrait');
    if (data.pseudo) { const r = await q("SELECT 1 FROM docs WHERE store='profiles' AND id<>$1 AND lower(data->>'pseudo')=lower($2)", [me, data.pseudo]); if (r.rowCount) throw err(409, 'Ce pseudo est déjà pris.'); }
    if (old && old.geo && old.geoCity === data.city && !data.geo) { data.geo = old.geo; data.geoCity = old.geoCity; }
    await withGeo(data);
    if (old && old.verified && old.verified.status === 'verified') data.verified = old.verified; // seul l'admin valide
    else if (data.verified && data.verified.status === 'verified') data.verified = old && old.verified || null;
    return putDoc(store, id, me, data);
  }
  const ownerField = { entries: 'profileId', questions: 'profileId', circlePosts: 'author', reports: 'by', circles: 'createdBy' }[store] || 'owner';
  if (old && old.__owner && old.__owner !== me) throw err(403, 'écriture');
  if (data[ownerField] !== me) throw err(403, 'propriétaire');
  if (store === 'reports') data.status = old ? old.status : 'open';
  if (store === 'reports' && !old) await attachCopy(me, data);
  data.__owner = me;
  const saved = await putDoc(store, id, me, data);
  if (store === 'reports' && !old && data.target) autoPause(data.target).catch(() => {});
  /* cercle intime : quand l'autre m'avait déjà mis dans sa tribu, on le dit à tous les deux */
  if (store === 'nods' && data.target && !old) { try { notify(data.target, (await pseudoOf(me)) + ' aime aussi « ' + String(data.title || '').slice(0, 60) + ' »', '/app#portrait'); } catch (e) {} }
  if (store === 'lists' && data.type === 'tribe' && data.target && !old) {
    try { const back = (await listDocs('lists')).some(l => l.type === 'tribe' && l.owner === data.target && l.target === me);
      if (back) { notify(data.target, (await pseudoOf(me)) + ' et toi êtes dans le cercle intime l\'un de l\'autre', '/app#tribu'); notify(me, (await pseudoOf(data.target)) + ' et toi êtes dans le cercle intime l\'un de l\'autre', '/app#tribu'); } } catch (e) {}
  }
  return saved;
}
/* tribu : on s'invite, l'autre répond toujours (oui, ou non avec une des trois phrases), rappel chaque jour tant qu'il n'a pas répondu */
const DAY = 864e5;
async function putInvite(me, body) {
  const other = String(body.from === me ? body.to : body.from || '');
  if (!other || other === me || !(await getDoc('profiles', other))) throw err(400, 'Personne introuvable.');
  const id = 'inv-' + pair(me, other), old = await getDoc('invites', id), now = Date.now();
  if (body.state === 'pending' && body.from === me) {
    if (old && (old.state === 'pending' || old.state === 'yes')) return old;
    if (old && old.state === 'no' && old.from === me && now - (old.answeredAt || 0) < 30 * DAY) throw err(429, 'Tu pourras proposer à nouveau dans un mois.');
    const inv = { id, from: me, to: other, state: 'pending', ts: now };
    await putDoc('invites', id, me, inv);
    notify(other, (await pseudoOf(me)) + ' t\'invite dans sa tribu', '/app#tribu');
    return inv;
  }
  if (old && old.to === me && old.state === 'pending' && (body.state === 'yes' || body.state === 'no')) {
    const reason = Number(body.reason);
    if (body.state === 'no' && ![1, 2, 3].includes(reason)) throw err(400, 'Choisis une des trois réponses.');
    const inv = { ...old, state: body.state, answeredAt: now, ...(body.state === 'no' ? { reason } : {}) };
    await putDoc('invites', id, old.from, inv);
    notify(old.from, (await pseudoOf(me)) + (body.state === 'yes' ? ' a accepté : vous êtes dans la même tribu' : ' a répondu à ton invitation'), '/app#tribu');
    return inv;
  }
  throw err(400, 'Action impossible.');
}
async function remindInvites() {
  try { const now = Date.now();
    for (const i of await listDocs('invites', "AND data->>'state'='pending'")) {
      if (now - (i.lastRemind || i.ts) < DAY - 36e5) continue;
      i.lastRemind = now; await putDoc('invites', i.id, i.from, i);
      notify(i.to, (await pseudoOf(i.from)) + ' attend ta réponse pour entrer dans ta tribu', '/app#tribu');
    } } catch (e) {}
}
/* une fois : l'ancienne tribu à sens unique devient « personnes préférées », les choix réciproques deviennent la tribu */
async function migrateTribes() {
  const all = (await listDocs('lists')).filter(l => l.type === 'tribe'); if (!all.length) return;
  for (const l of all) {
    const back = all.find(x => x.owner === l.target && x.target === l.owner);
    if (back) { const id = 'inv-' + pair(l.owner, l.target); if (!(await getDoc('invites', id))) await putDoc('invites', id, l.owner, { id, from: l.owner, to: l.target, state: 'yes', ts: Date.now(), answeredAt: Date.now() }); }
    l.type = 'fav'; await putDoc('lists', l.id, l.owner, l);
  }
}
/* signalement : copie de l'élément signalé, pour que l'équipe le voie sans lire le reste de la conversation */
async function attachCopy(me, r) {
  try {
    if (r.messageId) { const m = await getDoc('messages', r.messageId); if (m && m.from === r.target && m.to === me) r.copy = [{ kind: m.kind, text: m.text || '', ts: m.ts, url: m.url || '' }]; }
    else if (r.kind === 'block' || r.kind === 'message') { // les 5 derniers messages de la personne signalée à celle qui signale
      const ms = (await listDocs('messages', "AND data->>'from'=$2 AND data->>'to'=$3", [r.target, me])).sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 5);
      r.copy = ms.map(m => ({ kind: m.kind, text: m.text || '', ts: m.ts }));
    } else if (r.target) { const p = await getDoc('profiles', r.target); if (p) r.copy = [{ kind: 'profil', text: [p.pseudo, p.now].filter(Boolean).join(' · '), photo: p.photo || '' }]; }
  } catch (e) {}
}
/* pause automatique : signalé par 3 personnes différentes (signalements ouverts) */
async function autoPause(target) {
  const by = new Set((await listDocs('reports', "AND data->>'target'=$2 AND data->>'status'='open'", [target])).map(r => r.by));
  if (by.size < 3) return;
  const p = await getDoc('profiles', target); if (!p || p.paused) return;
  p.paused = Date.now(); p.autoPaused = true; await putDoc('profiles', target, target, p);
  await alog('Pause automatique', target, by.size + ' personnes ont signalé ce compte');
}
async function alog(action, target, detail) { const id = uid(); await putDoc('adminlog', id, 'admin', { id, action, target: target || '', detail: detail || '', ts: Date.now() }); }
async function config() { return (await getDoc('admin', 'config')) || {}; }
async function deleteOne(store, me, id) {
  if (store === 'invites') { const d = await getDoc('invites', id); if (!d || (d.from !== me && d.to !== me)) return; if (d.state === 'pending' && d.from !== me) throw err(403, 'Réponds d\'abord à l\'invitation.'); return q("DELETE FROM docs WHERE store='invites' AND id=$1", [id]); }
  if (store === 'settings') return q('DELETE FROM docs WHERE store=$1 AND id=$2', ['settings', me + ':' + id]);
  return q('DELETE FROM docs WHERE store=$1 AND id=$2 AND owner=$3', [store, id, me]);
}
async function wipeUser(me) {
  await q('DELETE FROM docs WHERE owner=$1', [me]);
  await q("DELETE FROM docs WHERE store='invites' AND (data->>'to'=$1 OR data->>'from'=$1)", [me]);
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
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.ttf': 'font/ttf', '.webp': 'image/webp' };
const SITE_LANGS = ['fr', 'de', 'en', 'it', 'es', 'pt']; // pages d'accueil publiques : / (fr), /de, /en…
function serveStatic(req, res, p) {
  if (p === '/app/' || p === '/index.html') { res.writeHead(301, { Location: '/app' }); return res.end(); }
  if (p === '/app') p = '/index.html';                                   // l'application elle-même
  else if (p === '/') p = '/site/fr.html';                               // page d'accueil publique
  else if (/^\/[a-z]{2}$/.test(p) && SITE_LANGS.includes(p.slice(1))) p = '/site/' + p.slice(1) + '.html';
  const file = path.normalize(path.join(PUBLIC, decodeURIComponent(p)));
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
      if ((await config()).closed && !invite) throw err(403, 'Les inscriptions sont fermées pour le moment. Tu peux entrer avec le lien d\'invitation d\'un membre.');
      id = uid();
      const inviter = invite ? (await q('SELECT id FROM users WHERE id=$1', [String(invite)])).rows[0] : null;
      await q('INSERT INTO users (id,email,pass,created,invited_by) VALUES ($1,$2,$3,$4,$5)', [id, e, hashPass(password), Date.now(), inviter ? inviter.id : null]);
      if (inviter) { // la personne qui invite entre directement dans la tribu de la nouvelle, et elle est prévenue
        const iid = 'inv-' + pair(id, inviter.id); await putDoc('invites', iid, inviter.id, { id: iid, from: inviter.id, to: id, state: 'yes', ts: Date.now(), answeredAt: Date.now() });
        notify(inviter.id, 'Un ami a rejoint FeelShareLove grâce à toi', '/app#tribu');
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
/* ---------- e-mails à tous les inscrits (adresse d'envoi à régler dans Coolify : SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM) ---------- */
const SMTP = { host: process.env.SMTP_HOST || '', port: +(process.env.SMTP_PORT || 465), user: process.env.SMTP_USER || '', pass: process.env.SMTP_PASS || '', from: process.env.MAIL_FROM || process.env.SMTP_USER || '' };
const MAIL_PER_HOUR = +(process.env.MAIL_PER_HOUR || 100); // envoi par petits paquets : les comptes e-mail gratuits limitent le nombre d'envois par heure
const SITE = process.env.SITE_URL || 'https://feelsharelove.com';
let mailer = null;
function mailReady() { return !!(SMTP.host && SMTP.user && SMTP.pass); }
function getMailer() { if (!mailer && mailReady()) { const nm = require('nodemailer'); mailer = nm.createTransport({ host: SMTP.host, port: SMTP.port, secure: SMTP.port === 465, auth: { user: SMTP.user, pass: SMTP.pass } }); } return mailer; }
const unsubToken = id => crypto.createHmac('sha256', (ADMIN_KEY || 'fsl') + ':unsub').update(id).digest('hex').slice(0, 24);
async function sendMail(to, subject, text, uidFor) {
  const link = uidFor ? `${SITE}/unsub?u=${encodeURIComponent(uidFor)}&t=${unsubToken(uidFor)}` : '';
  const foot = link ? `\n\n—\nFeelShareLove · ${SITE}\nNe plus recevoir ces e-mails : ${link}` : `\n\n—\nFeelShareLove · ${SITE}`;
  await getMailer().sendMail({ from: `FeelShareLove <${SMTP.from}>`, to, subject, text: text + foot, ...(link ? { headers: { 'List-Unsubscribe': `<${link}>` } } : {}) });
}
async function unsub(res, url) {
  const u = url.searchParams.get('u') || '', t = url.searchParams.get('t') || '';
  const ok = u && t.length === 24 && crypto.timingSafeEqual(Buffer.from(t), Buffer.from(unsubToken(u)));
  if (ok) await q('UPDATE users SET no_mail=true WHERE id=$1', [u]);
  send(res, 200, `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font:16px system-ui;background:#1c0f12;color:#fbeadb;padding:24px"><h1>FeelShareLove</h1><p>${ok ? 'C\'est noté : tu ne recevras plus nos e-mails d\'information.' : 'Lien invalide.'}</p></body>`, 'text/html; charset=utf-8');
}
/* file d'envoi : gardée en base, reprise après un redémarrage */
async function mailTick() {
  try {
    const job = await getDoc('admin', 'mailjob'); if (!job || job.done || !mailReady()) return;
    const id = job.ids[job.pos]; if (id === undefined) { job.done = Date.now(); await putDoc('admin', 'mailjob', 'admin', job); await alog('E-mail à tous terminé', '', job.subject + ' · ' + job.sent + ' envoyés, ' + job.failed + ' échecs'); return; }
    const u = (await q('SELECT email, no_mail, banned FROM users WHERE id=$1', [id])).rows[0];
    if (u && !u.no_mail && !u.banned) { try { await sendMail(u.email, job.subject, job.body, id); job.sent++; } catch (e) { job.failed++; job.lastError = e.message; } }
    job.pos++; await putDoc('admin', 'mailjob', 'admin', job);
  } catch (e) {}
}
setInterval(mailTick, Math.max(2000, Math.round(3600e3 / MAIL_PER_HOUR)));

/* ---------- administration ---------- */
const TYPE_NAME = { sens: 'Sensible', emo: 'Émotionnel', mental: 'Mental', phys: 'Physique' };
const INTENT_NAME = { parler: 'Quelqu\'un à qui parler', amis: 'Des amis', amour: 'L\'amour' };
const REASONS = { injures: 'injures ou harcèlement', commercial: 'usage commercial', faux: 'faux profil', inapproprie: 'comportement inapproprié', autre: 'non-respect des règles' };
let CAT = null; // libellés du portrait (domaines du cœur, métiers/rôles/tendances), lus dans le catalogue de l'app
function catalogue() {
  if (CAT) return CAT;
  try { const ctx = { window: {} }; require('vm').runInNewContext(fs.readFileSync(path.join(PUBLIC, 'js', 'catalogue-portrait.js'), 'utf8'), ctx); CAT = ctx.window.CATALOGUE; } catch (e) { CAT = { INV: {}, REPK: {} }; }
  return CAT;
}
const fmtD = t => t ? new Date(+t).toLocaleDateString('fr-CH', { timeZone: 'Europe/Zurich' }) : '—';
const fmtDT = t => t ? new Date(+t).toLocaleString('fr-CH', { timeZone: 'Europe/Zurich', dateStyle: 'short', timeStyle: 'short' }) : '—';
const ADMIN_CSS = `
:root{--bg:#1c0f12;--card:#2a161a;--card2:#351c20;--line:#4a262b;--fg:#fbeadb;--muted:#c9a493;--flame:#ff6a2a;--saffron:#f7b733;--rose:#e8456e;--ok:#5fbf8f}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 Figtree,system-ui,sans-serif}
header{position:sticky;top:0;z-index:5;background:linear-gradient(#2a161a,#1c0f12);border-bottom:1px solid var(--line);padding:12px 16px 0}
header h1{font:600 20px Fraunces,Georgia,serif;margin:0 0 10px}header h1 em{color:var(--flame)}
nav{display:flex;gap:4px;overflow-x:auto}nav a{padding:8px 12px;border-radius:10px 10px 0 0;color:var(--muted);text-decoration:none;white-space:nowrap}nav a.on{background:var(--bg);color:var(--saffron);box-shadow:0 -2px 0 var(--saffron) inset}
nav a .n{background:var(--rose);color:#fff;border-radius:9px;padding:0 6px;font-size:12px;margin-left:4px}
main{max-width:1100px;margin:0 auto;padding:16px}
h2{font:600 18px Fraunces,Georgia,serif;color:var(--saffron);margin:22px 0 10px}h3{margin:14px 0 6px;font-size:15px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px}
.kpi{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px}.kpi b{display:block;font:600 28px Fraunces,Georgia,serif}.kpi span{color:var(--muted);font-size:13px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px;margin-bottom:12px}
table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid var(--line);padding:7px 6px;text-align:left;font-size:14px;vertical-align:top}th{color:var(--muted);font-weight:600}
a{color:var(--saffron)}small,.muted{color:var(--muted)}
.tag{display:inline-block;font-size:12px;padding:1px 8px;border-radius:9px;border:1px solid var(--line);margin:0 4px 4px 0}.tag.red{border-color:var(--rose);color:#ffc0cf}.tag.ok{border-color:var(--ok);color:#bfeed5}.tag.y{border-color:var(--saffron);color:var(--saffron)}
button,.btn{font:600 14px Figtree,system-ui;border-radius:999px;border:1px solid var(--line);background:var(--card2);color:var(--fg);padding:7px 14px;cursor:pointer}
button.flame{background:var(--flame);border-color:var(--flame);color:#1c0f12}button.danger{border-color:var(--rose);color:#ffc0cf}
input,select,textarea{font:15px Figtree,system-ui;background:#140a0c;color:var(--fg);border:1px solid var(--line);border-radius:10px;padding:8px 10px}textarea{width:100%;min-height:180px}
form.inline{display:inline-flex;gap:6px;align-items:center;margin:0 6px 6px 0;flex-wrap:wrap}
.pics{display:flex;gap:10px;flex-wrap:wrap}.pics img{width:150px;height:150px;object-fit:cover;border-radius:12px;background:#000}figure{margin:0}figcaption{font-size:12px;color:var(--muted)}
.ph{width:44px;height:44px;border-radius:50%;object-fit:cover;background:#000;vertical-align:middle}
.copy{background:#140a0c;border-left:3px solid var(--rose);padding:8px 10px;border-radius:8px;margin:6px 0;white-space:pre-wrap}
.flash{background:rgba(95,191,143,.15);border:1px solid var(--ok);border-radius:12px;padding:8px 12px;margin-bottom:12px}`;

async function admin(req, res, url) {
  const key = url.searchParams.get('key') || '';
  if (!ADMIN_KEY || key.length !== ADMIN_KEY.length || !crypto.timingSafeEqual(Buffer.from(key), Buffer.from(ADMIN_KEY))) return send(res, 404, 'Introuvable', 'text/plain; charset=utf-8');
  const K = encodeURIComponent(key), tab = url.searchParams.get('tab') || 'dash';
  const go = (t, extra = '', flash = '') => { res.writeHead(303, { Location: `/admin?key=${K}&tab=${t}${extra}${flash ? '&ok=' + encodeURIComponent(flash) : ''}` }); res.end(); };
  /* ---------- actions ---------- */
  if (req.method === 'POST') {
    const f = new URLSearchParams((await readBody(req)).toString());
    const a = f.get('a'), id = f.get('id') || '', back = f.get('back') || 'dash', backId = f.get('backId') ? '&id=' + encodeURIComponent(f.get('backId')) : '';
    const reason = REASONS[f.get('reason')] || REASONS.autre;
    if (a === 'verify' || a === 'refuse') {
      const p = await getDoc('profiles', id);
      if (p) { p.verified = a === 'verify' ? { status: 'verified', at: Date.now() } : { status: 'refused', at: Date.now() }; await putDoc('profiles', id, id, p); }
      await q('DELETE FROM docs WHERE store=$1 AND id=$2', ['settings', id + ':idcheck']); // la photo de la carte est supprimée dans les deux cas
      await alog(a === 'verify' ? 'Identité vérifiée' : 'Vérification refusée', id); return go(back, backId, 'C\'est fait.');
    }
    if (a === 'report-done') { const r = await getDoc('reports', id); if (r) { r.status = 'done'; r.doneAt = Date.now(); await putDoc('reports', id, r.by, r); await alog('Signalement traité', r.target, r.kind); } return go(back, backId, 'Signalement classé.'); }
    if (a === 'warn') {
      const nid = uid(); await putDoc('notices', nid, 'admin', { id: nid, to: id, ts: Date.now(), read: false,
        text: `Nous avons reçu des signalements te concernant (${reason}). Merci de respecter les règles de FeelShareLove : en cas de récidive, ton compte sera fermé.` });
      notify(id, 'Un message de l\'équipe FeelShareLove', '/app#now');
      await alog('Avertissement', id, reason); return go(back, backId, 'Avertissement envoyé.');
    }
    if (a === 'ban') {
      await q('UPDATE users SET banned=true, ban_reason=$2 WHERE id=$1', [id, reason]); await q('DELETE FROM sessions WHERE user_id=$1', [id]);
      const p = await getDoc('profiles', id); if (p) { p.paused = Date.now(); await putDoc('profiles', id, id, p); }
      await alog('Compte suspendu', id, reason); return go(back, backId, 'Compte suspendu.');
    }
    if (a === 'unban') { await q('UPDATE users SET banned=false, ban_reason=null WHERE id=$1', [id]); const p = await getDoc('profiles', id); if (p) { delete p.paused; delete p.autoPaused; await putDoc('profiles', id, id, p); } await alog('Compte réactivé', id); return go(back, backId, 'Compte réactivé.'); }
    if (a === 'unpause') { const p = await getDoc('profiles', id); if (p) { delete p.paused; delete p.autoPaused; await putDoc('profiles', id, id, p); } await alog('Pause levée', id); return go(back, backId, 'Pause levée.'); }
    if (a === 'delete') {
      if (f.get('sure') !== 'oui') return go(back, backId, 'Suppression annulée : coche la case de confirmation.');
      const p = await getDoc('profiles', id); const u = (await q('SELECT email FROM users WHERE id=$1', [id])).rows[0];
      await wipeUser(id); await alog('Compte supprimé', id, [(p && p.pseudo) || '', u ? u.email : '', reason].filter(Boolean).join(' · ')); return go('accounts', '', 'Compte supprimé définitivement.');
    }
    if (a === 'fakes') { // profils de test : réécrit seulement les comptes marqués fake:true (photo et vérification gardées)
      const FK = require('./fakes.js');
      for (const old of await listDocs('profiles')) {
        if (old.fake !== true) continue;
        const fk = FK.find(x => x.from.includes(old.pseudo)); if (!fk) continue;
        const p = { ...old, ...fk.p, id: old.id, fake: true }; if (!fk.p.travel) delete p.travel;
        await withGeo(p); await putDoc('profiles', old.id, old.id, p);
        await q("DELETE FROM docs WHERE store='entries' AND data->>'profileId'=$1", [old.id]);
        let i = 0; for (const e of fk.entries) { const eid = 'fk-' + old.id + '-' + (++i); await putDoc('entries', eid, old.id, { ...e, id: eid, profileId: old.id, __owner: old.id, ts: Date.now() - i * 864e5 }); }
      }
      await alog('Profils de test remplis'); return go('settings', '', 'Profils de test remplis.');
    }
    if (a === 'fakes-delete') {
      if (f.get('sure') !== 'oui') return go('settings', '', 'Suppression annulée : coche la case de confirmation.');
      let n = 0; for (const p of await listDocs('profiles')) if (p.fake === true) { await wipeUser(p.id); n++; }
      await alog('Profils de test supprimés', '', n + ' comptes'); return go('settings', '', n + ' profils de test supprimés.');
    }
    if (a === 'closed') { const c = await config(); c.closed = f.get('v') === '1'; await putDoc('admin', 'config', 'admin', c); await alog(c.closed ? 'Inscriptions fermées' : 'Inscriptions ouvertes'); return go('settings', '', c.closed ? 'Inscriptions fermées (sauf lien d\'invitation).' : 'Inscriptions ouvertes.'); }
    if (a === 'mail-test' || a === 'mail-all') {
      const subject = (f.get('subject') || '').trim(), body = (f.get('body') || '').trim();
      if (!mailReady()) return go('mail', '', 'L\'adresse d\'envoi n\'est pas encore configurée.');
      if (!subject || !body) return go('mail', '', 'Objet et texte sont nécessaires.');
      if (a === 'mail-test') { try { await sendMail(f.get('to'), '[Essai] ' + subject, body, null); return go('mail', '', 'E-mail d\'essai envoyé à ' + f.get('to') + '.'); } catch (e) { return go('mail', '', 'Échec de l\'envoi : ' + e.message); } }
      const old = await getDoc('admin', 'mailjob'); if (old && !old.done) return go('mail', '', 'Un envoi est déjà en cours.');
      if (f.get('sure') !== 'oui') return go('mail', '', 'Envoi annulé : coche la case de confirmation.');
      const ids = (await q('SELECT id FROM users WHERE NOT banned AND NOT no_mail ORDER BY created')).rows.map(r => r.id);
      await putDoc('admin', 'mailjob', 'admin', { subject, body, ids, pos: 0, sent: 0, failed: 0, started: Date.now() });
      await alog('E-mail à tous lancé', '', subject + ' · ' + ids.length + ' destinataires'); return go('mail', '', 'Envoi lancé à ' + ids.length + ' personnes.');
    }
    return go(back, backId);
  }

  /* ---------- données ---------- */
  const now = Date.now(), D7 = now - 7 * 864e5, D1 = now - 864e5;
  const users = (await q('SELECT id, email, created, banned, ban_reason, last_seen, invited_by, no_mail FROM users ORDER BY created DESC')).rows;
  const profiles = Object.fromEntries((await listDocs('profiles')).map(p => [p.id, p]));
  const reportsAll = await listDocs('reports');
  const reports = reportsAll.filter(r => r.status === 'open' && r.kind !== 'suggestion').sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const suggestions = reportsAll.filter(r => r.status === 'open' && r.kind === 'suggestion');
  const pend = Object.values(profiles).filter(p => p.verified && p.verified.status === 'pending');
  const flash = url.searchParams.get('ok');
  const who = id => { const p = profiles[id]; return `<a href="/admin?key=${K}&tab=account&id=${encodeURIComponent(id)}">${H(p && p.pseudo || '(sans pseudo)')}</a>${p && p.fake ? ' <span class="tag y">test</span>' : ''}`; };
  const btn = (a, id, label, extra = '', cls = '') => `<form method="post" class="inline"><input type="hidden" name="a" value="${a}"><input type="hidden" name="id" value="${H(id)}"><input type="hidden" name="back" value="${H(tab)}"><input type="hidden" name="backId" value="${H(url.searchParams.get('id') || '')}">${extra}<button class="${cls}">${label}</button></form>`;
  const reasonSel = `<select name="reason">${Object.entries(REASONS).map(([k, l]) => `<option value="${k}">${H(l.charAt(0).toUpperCase() + l.slice(1))}</option>`).join('')}</select>`;
  const sure = label => `<label class="muted" style="font-size:13px"><input type="checkbox" name="sure" value="oui"> ${label}</label>`;
  const photoOf = p => p && p.photo ? `<img class="ph" src="${H(p.photo)}" alt="">` : '<span class="ph" style="display:inline-block"></span>';
  const status = u => { const p = profiles[u.id] || {}; return (u.banned ? `<span class="tag red">suspendu</span>` : '') + (p.paused && !u.banned ? `<span class="tag red">en pause${p.autoPaused ? ' (auto)' : ''}</span>` : '') + (p.fake ? '<span class="tag y">test</span>' : '') + (p.verified && p.verified.status === 'verified' ? '<span class="tag ok">vérifié</span>' : '') + (!p.pseudo ? '<span class="tag">inscription pas finie</span>' : ''); };
  const copyHtml = r => (r.copy || []).map(c => `<div class="copy">${c.photo ? `<img class="ph" src="${H(c.photo)}" alt=""> ` : ''}<small>${H(c.kind)}${c.ts ? ' · ' + fmtDT(c.ts) : ''}</small>\n${H(c.text || (c.kind === 'voice' ? '(message vocal)' : c.kind === 'ephemeral' ? '(photo éphémère)' : ''))}</div>`).join('');
  const reportCard = r => `<div class="card"><b>${H({ photo: 'Photo éphémère', block: 'Blocage dans une conversation', profile: 'Portrait', message: 'Message' }[r.kind] || r.kind)}</b> · <small>${fmtDT(r.ts)}</small>
    <p>Signalé par ${who(r.by)} · visé : ${who(r.target)}${r.reason ? ' · raison : ' + H(r.reason) : ''}</p>${copyHtml(r) || '<p class="muted">Pas de copie de l\'élément signalé (signalement antérieur à la nouvelle version).</p>'}
    <div>${btn('report-done', r.id, 'Classer')} ${btn('warn', r.target, 'Avertir', reasonSel)} ${btn('ban', r.target, 'Suspendre', reasonSel, 'danger')}</div></div>`;
  let body = '';

  if (tab === 'dash') {
    const msgs = (await q("SELECT count(*) FILTER (WHERE updated > $1)::int d1, count(*) FILTER (WHERE updated > $2)::int d7 FROM docs WHERE store='messages'", [D1, D7])).rows[0];
    const inv = await listDocs('invites'); const threads = await listDocs('threads');
    const real = users.filter(u => !(profiles[u.id] || {}).fake);
    const kpi = (n, l) => `<div class="kpi"><b>${n}</b><span>${l}</span></div>`;
    body = `<h2>Tableau de bord</h2><div class="grid">
      ${kpi(real.length, 'inscrits (hors profils de test)')}${kpi(real.filter(u => +u.created > D7).length, 'nouveaux sur 7 jours')}${kpi(real.filter(u => +u.last_seen > D7).length, 'actifs sur 7 jours')}${kpi(real.filter(u => +u.last_seen > D1).length, 'actifs aujourd\'hui')}
      ${kpi(msgs.d1, 'messages sur 24 h')}${kpi(msgs.d7, 'messages sur 7 jours')}${kpi(threads.filter(t => t.state === 'open').length, 'conversations ouvertes')}
      ${kpi(inv.filter(i => i.state === 'yes').length, 'liens de tribu')}${kpi(inv.filter(i => i.state === 'pending').length, 'invitations en attente')}
      ${kpi(reports.length, 'signalements à traiter')}${kpi(pend.length, 'vérifications en attente')}${kpi(users.filter(u => u.banned).length, 'comptes suspendus')}</div>
      ${(await config()).closed ? '<p class="card">Les inscriptions sont <b>fermées</b> (sauf lien d\'invitation). <a href="/admin?key=' + K + '&tab=settings">Réglages</a></p>' : ''}`;
  }
  if (tab === 'reports') body = `<h2>Signalements à traiter (${reports.length})</h2>${reports.map(reportCard).join('') || '<p class="muted">Aucun.</p>'}
    <h2>Suggestions (${suggestions.length})</h2>${suggestions.map(r => `<div class="card">${H(r.reason)} <small>· ${who(r.by)} · ${fmtDT(r.ts)}</small> ${btn('report-done', r.id, 'Classer')}</div>`).join('') || '<p class="muted">Aucune.</p>'}`;
  if (tab === 'verif') {
    const card = async p => { const st = await getDoc('settings', p.id + ':idcheck'); return `<div class="card"><b>${who(p.id)}</b> <small>${H([p.name, p.lastName].filter(Boolean).join(' '))}</small><div class="pics" style="margin:10px 0"><figure><img src="${H(p.photo)}"><figcaption>Portrait</figcaption></figure><figure>${st ? `<img src="${H(st.value && st.value.shot)}">` : '<p>(pas de photo)</p>'}<figcaption>Pièce d'identité</figcaption></figure></div>${btn('verify', p.id, 'Valider', '', 'flame')} ${btn('refuse', p.id, 'Refuser', '', 'danger')}</div>`; };
    body = `<h2>Vérifications en attente (${pend.length})</h2>${(await Promise.all(pend.map(card))).join('') || '<p class="muted">Aucune.</p>'}`;
  }
  if (tab === 'accounts') {
    const s = (url.searchParams.get('q') || '').trim().toLowerCase();
    const recv = {}; reportsAll.forEach(r => { if (r.target && r.kind !== 'suggestion') recv[r.target] = (recv[r.target] || 0) + 1; });
    const list = users.filter(u => { if (!s) return true; const p = profiles[u.id] || {}; return [u.email, p.pseudo, p.name, p.lastName, p.city].some(x => String(x || '').toLowerCase().includes(s)); });
    body = `<h2>Comptes (${list.length})</h2><form method="get" class="inline"><input type="hidden" name="key" value="${H(key)}"><input type="hidden" name="tab" value="accounts"><input name="q" value="${H(s)}" placeholder="Pseudo, nom, e-mail, ville"><button>Chercher</button></form>
      <table><tr><th></th><th>Pseudo / nom</th><th>E-mail</th><th>Inscription</th><th>Dernière visite</th><th>Signalé</th><th>Statut</th></tr>
      ${list.map(u => { const p = profiles[u.id] || {}; return `<tr><td>${photoOf(p)}</td><td>${who(u.id)}<br><small>${H([p.name, p.lastName].filter(Boolean).join(' '))}</small></td><td>${H(u.email)}</td><td>${fmtD(u.created)}</td><td>${fmtD(u.last_seen)}</td><td>${recv[u.id] ? `<span class="tag red">${recv[u.id]}</span>` : ''}</td><td>${status(u)}</td></tr>`; }).join('')}</table>`;
  }
  if (tab === 'account') {
    const id = url.searchParams.get('id') || ''; const u = users.find(x => x.id === id); const p = profiles[id] || {};
    if (!u) body = '<p>Compte introuvable.</p>';
    else {
      const C = catalogue(); const entries = await listDocs('entries', "AND data->>'profileId'=$2", [id]);
      const inv = await listDocs('invites', "AND (data->>'from'=$2 OR data->>'to'=$2)", [id]);
      const threads = await listDocs('threads', "AND (data->>'a'=$2 OR data->>'b'=$2)", [id]);
      const favs = (await listDocs('lists', "AND owner=$2", [id])).filter(l => l.type === 'fav');
      const rin = reportsAll.filter(r => r.target === id && r.kind !== 'suggestion'), rout = reportsAll.filter(r => r.by === id && r.kind !== 'suggestion');
      const logs = (await listDocs('adminlog', "AND data->>'target'=$2", [id])).sort((a, b) => b.ts - a.ts);
      const row = (k, v) => v ? `<tr><th style="width:190px">${k}</th><td>${v}</td></tr>` : '';
      const F = p.facts || {};
      body = `<p><a href="/admin?key=${K}&tab=accounts">← Comptes</a></p>
      <div class="card" style="display:flex;gap:16px;flex-wrap:wrap;align-items:center">${p.photo ? `<img src="${H(p.photo)}" style="width:110px;height:110px;border-radius:50%;object-fit:cover">` : ''}<div><h2 style="margin:0">${H(p.pseudo || '(sans pseudo)')}</h2><div>${status(u)}${u.ban_reason ? ` <small>raison : ${H(u.ban_reason)}</small>` : ''}</div></div></div>
      <div class="card"><b>Actions</b><div style="margin-top:8px">${btn('warn', id, 'Avertir', reasonSel)}
        ${u.banned ? btn('unban', id, 'Réactiver') : btn('ban', id, 'Suspendre', reasonSel, 'danger')}${p.paused && !u.banned ? btn('unpause', id, 'Lever la pause') : ''}
        ${btn('delete', id, 'Supprimer définitivement', reasonSel + sure('Je confirme : tout sera effacé'), 'danger')}</div></div>
      <h2>Identité</h2><table>${row('Prénom et nom', H([p.name, p.lastName].filter(Boolean).join(' ')))}${row('E-mail', H(u.email) + (u.no_mail ? ' <span class="tag">ne veut pas d\'e-mails</span>' : ''))}${row('Accord', H({ m: 'masculin', f: 'féminin', n: 'neutre' }[p.accord] || ''))}
        ${row('Ville', H([p.npa, p.city].filter(Boolean).join(' ')) + (p.travel ? ' <small>(en voyage)</small>' : ''))}${row('Inscription', fmtDT(u.created))}${row('Dernière visite', fmtDT(u.last_seen))}${row('Invité par', u.invited_by ? who(u.invited_by) : '')}
        ${row('Vérification', H(p.verified ? p.verified.status : 'non demandée'))}</table>
      <h2>Portrait</h2><table>${row('Langue du portrait', H(p.textLang || 'fr'))}${row('Intention', H((p.intent || []).map(k => INTENT_NAME[k] || k).join(', ')))}${row('En ce moment', H(p.now))}
        ${row('Fonctionnement', H((p.types && p.types.list || []).map(k => TYPE_NAME[k] || k).join(', ')))}
        ${Object.entries(F).filter(([, v]) => typeof v === 'string' && v).map(([k, v]) => row(H(k), H(v))).join('')}
        ${row('Personnages', (p.chinois || []).map(x => H(x.n) + (x.w ? ' <small>(' + H(x.w) + ')</small>' : '') + (x.why ? ' : <i>' + H(x.why) + '</i>' : '')).join('<br>'))}
        ${row('Là où je mets mon cœur', H((p.invest || []).map(k => (C.INV[k] && C.INV[k].l) || k).join(', ')))}
        ${row('Métiers, rôles, tendances', H((p.rep || []).map(k => (C.REPK[k] && C.REPK[k][p.accord === 'f' ? 2 : 1]) || k).join(', ')))}</table>
      <h2>Ce qui le fait vibrer (${entries.length})</h2><table>${entries.map(e => `<tr><td style="width:110px"><small>${H(e.kind)}</small></td><td><b>${H(e.title)}</b><br><small>${H(e.why)}</small></td></tr>`).join('') || '<tr><td class="muted">Rien.</td></tr>'}</table>
      <h2>Activité (sans les messages)</h2><table>${row('Conversations', threads.length + ' dont ' + threads.filter(t => t.state === 'open').length + ' ouvertes')}${row('Tribu', String(inv.filter(i => i.state === 'yes').length))}${row('Invitations en attente', String(inv.filter(i => i.state === 'pending').length))}${row('Personnes préférées', String(favs.length))}
        ${row('Signalements reçus', String(rin.length))}${row('Signalements faits', String(rout.length))}</table>
      ${rin.length ? `<h2>Signalements reçus</h2>${rin.sort((a, b) => b.ts - a.ts).map(reportCard).join('')}` : ''}
      ${logs.length ? `<h2>Journal de ce compte</h2><table>${logs.map(l => `<tr><td>${fmtDT(l.ts)}</td><td>${H(l.action)}</td><td><small>${H(l.detail)}</small></td></tr>`).join('')}</table>` : ''}`;
    }
  }
  if (tab === 'mail') {
    const job = await getDoc('admin', 'mailjob'); const n = users.filter(u => !u.banned && !u.no_mail).length;
    body = `<h2>E-mail à tous les inscrits</h2>
      ${mailReady() ? `<p class="muted">Envoi depuis ${H(SMTP.from)}, par petits paquets (${MAIL_PER_HOUR} par heure au plus). Chaque e-mail contient un lien pour ne plus en recevoir.</p>` : `<div class="card"><b>L'adresse d'envoi n'est pas encore configurée.</b><p class="muted">Il faudra régler SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS et MAIL_FROM dans Coolify. Tu peux déjà préparer le texte.</p></div>`}
      ${job ? `<div class="card"><b>${job.done ? 'Dernier envoi' : 'Envoi en cours'}</b> : « ${H(job.subject)} » · ${job.sent} envoyés, ${job.failed} échecs, ${job.ids.length - job.pos} restants${job.lastError ? `<br><small>Dernière erreur : ${H(job.lastError)}</small>` : ''}</div>` : ''}
      <form method="post" class="card"><input type="hidden" name="back" value="mail"><p><input name="subject" placeholder="Objet" style="width:100%"></p><p><textarea name="body" placeholder="Bonjour,&#10;&#10;…"></textarea></p>
        <p style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><input name="to" type="email" placeholder="Ton adresse pour l'essai"><button name="a" value="mail-test">Envoyer un essai</button></p>
        <p style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">${sure('Je confirme l\'envoi à ' + n + ' personnes')}<button name="a" value="mail-all" class="flame">Envoyer à tous</button></p></form>`;
  }
  if (tab === 'log') { const logs = (await listDocs('adminlog')).sort((a, b) => b.ts - a.ts).slice(0, 300);
    body = `<h2>Journal</h2><table><tr><th>Date</th><th>Action</th><th>Compte</th><th>Détail</th></tr>${logs.map(l => `<tr><td>${fmtDT(l.ts)}</td><td>${H(l.action)}</td><td>${l.target ? (profiles[l.target] ? who(l.target) : '<small>' + H(l.target) + '</small>') : ''}</td><td><small>${H(l.detail)}</small></td></tr>`).join('') || '<tr><td class="muted">Vide.</td></tr>'}</table>`; }
  if (tab === 'settings') { const c = await config(); const nf = Object.values(profiles).filter(p => p.fake === true).length;
    body = `<h2>Inscriptions</h2><div class="card">Les inscriptions sont <b>${c.closed ? 'fermées' : 'ouvertes'}</b>.${c.closed ? ' Seules les personnes avec un lien d\'invitation d\'un membre peuvent entrer.' : ''}<div style="margin-top:8px">${btn('closed', '', c.closed ? 'Ouvrir les inscriptions' : 'Fermer les inscriptions', `<input type="hidden" name="v" value="${c.closed ? '0' : '1'}">`)}</div></div>
      <h2>Profils de test (${nf})</h2><div class="card"><p class="muted">Brad, Sandra, Tom, Sophie et Jean-Jacques. Ils portent l'étiquette « profil de démonstration » dans l'app. À garder au début pour que les premiers inscrits comprennent comment ça marche.</p>
        ${btn('fakes', '', 'Remplir les profils de test')} ${btn('fakes-delete', '', 'Supprimer les profils de test', sure('Je confirme'), 'danger')}</div>`; }

  const tabs = [['dash', 'Tableau de bord'], ['reports', 'Signalements', reports.length], ['verif', 'Vérifications', pend.length], ['accounts', 'Comptes'], ['mail', 'E-mails'], ['log', 'Journal'], ['settings', 'Réglages']];
  const html = `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FeelShareLove · admin</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,600;1,600&family=Figtree:wght@400;600&display=swap"><style>${ADMIN_CSS}</style>
<header><h1>FeelShareLove · <em>administration</em></h1><nav>${tabs.map(([t, l, n]) => `<a href="/admin?key=${K}&tab=${t}" class="${t === tab || (tab === 'account' && t === 'accounts') ? 'on' : ''}">${l}${n ? `<span class="n">${n}</span>` : ''}</a>`).join('')}</nav></header>
<main>${flash ? `<div class="flash">${H(flash)}</div>` : ''}${body}</main></html>`;
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
    return send(res, 200, `<!doctype html><meta charset="utf-8"><script>localStorage.setItem('fsl_token',${JSON.stringify(token)});localStorage.setItem('fsl_uid',${JSON.stringify(r.rows[0].id)});location.href='/app#now';</script>`, 'text/html; charset=utf-8');
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
    if (url.pathname === '/unsub') return await unsub(res, url);
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
  try { await migrateTribes(); } catch (e) { console.error('migration tribu', e.message); }
  backfillGeo().catch(e => console.error('distances', e.message));
  setInterval(remindInvites, 36e5); setTimeout(remindInvites, 6e4);
  console.log('FeelShareLove sur le port ' + PORT);
});
