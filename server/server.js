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
const STORES = new Set(['profiles','entries','questions','threads','messages','voices','lists','reports','circles','circlePosts','settings','nods','invites','notices','proposals']);
const PRIVATE = new Set(['lists','reports','settings','proposals']);

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
    ALTER TABLE users ADD COLUMN IF NOT EXISTS redlisted boolean NOT NULL DEFAULT false;
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
  if (String(url || '').startsWith('/app#messages/')) mailIfAway(userId, url.split('/').pop()).catch(e => logErr('mail', 'avis de message : ' + e.message, { to: userId }));
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
/* ---------- liste rouge de l'administration : adresses, numéros de mobile et noms qui n'entrent pas (sans que la personne le sache) ---------- */
const rlPhone = p => { let d = String(p || '').replace(/\D/g, ''); if (d.startsWith('00')) d = d.slice(2); return d.length > 9 ? d.slice(-9) : d; };
const rlName = (first, last) => norm(first) + '|' + norm(last);
async function redlist() { const c = await config(); return Object.assign({ emails: [], phones: [], names: [] }, c.redlist || {}); }
async function redHits(email, phone, first, last) { const r = await redlist(); const h = [];
  if (email && r.emails.includes(norm(email))) h.push('email');
  if (phone && rlPhone(phone).length >= 7 && r.phones.includes(rlPhone(phone))) h.push('phone');
  if (first && last && r.names.includes(rlName(first, last))) h.push('name');
  return h; }
/* marque un compte : invisible pour les autres, et il ne voit plus personne ; une concordance de nom seule est signalée à l'admin pour confirmation */
async function redMark(uid, hits, note) { if (!hits.length) return;
  await q('UPDATE users SET redlisted=true, no_mail=true WHERE id=$1', [uid]);
  const p = await getDoc('profiles', uid); if (p) { p.redlisted = true; if (hits.includes('name') && hits.length === 1) p.redlistCheck = p.redlistCheck || Date.now(); await putDoc('profiles', uid, uid, p); }
  await alog('Liste rouge', uid, (note || '') + hits.join(', ')); }
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
  for (const p of profiles) if ((p.paused || p.redlisted) && p.id !== me) hidden.add(p.id);
  if (mine && mine.redlisted) for (const p of profiles) if (p.id !== me && !p.fake) hidden.add(p.id);
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
const selfView = p => { const { redlisted, redlistCheck, ...rest } = p; return rest; }; // la marque de la liste rouge ne sort jamais du serveur
/* portrait complet : il n'apparaît dans les Résonances des autres qu'à ce moment-là (mêmes critères que App.portraitTodo dans l'app) */
function portraitDone(p, nEntries) { return !!(p.fake || (p.photo && p.types && p.types.list && p.types.list.length && p.facts && p.facts.birth && p.facts.birth.v && (p.langs || []).length && (p.rep || []).length && (p.invest || []).length && (p.genres || []).length && nEntries >= 3)); }
function publicProfile(p, intimate, opened, myGeo, qmatch, myIntent, nEntries) {
  const done = portraitDone(p, nEntries || 0);
  const { name, lastName, npa, email, phone, photoReal, photoSrc, photoCrop, geo, geoCity, tribeColor, readLangs, redlisted, redlistCheck, ...rest } = p; // couleur de tribu et langues de lecture restent privées
  if (!rest.textLang) rest.textLang = 'fr'; // anciens portraits : écrits en français
  const d = km(myGeo, geo); if (d != null) rest.km = Math.max(5, Math.round(d / 5) * 5);
  rest.intimate = !!(intimate && intimate.has(p.id));
  rest.done = done;
  /* points calculés ici sans rien dévoiler : questions ouvertes concordantes (6 chacune, 12 au plus) et « Rompre ma solitude » choisi par les deux (5).
     « Rompre ma solitude » n'est jamais transmis aux autres, même dans la tribu. */
  const lonely = (p.intent || []).includes('seul') && (myIntent || []).includes('seul');
  const hp = Math.min(12, 6 * (qmatch || 0)) + (lonely ? 5 : 0); if (hp) rest.hp = hp;
  if (Array.isArray(rest.intent)) rest.intent = rest.intent.filter(k => k !== 'seul');
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

/* ---------- profils de démonstration : ils répondent toujours la même chose et acceptent d'entrer dans la tribu ---------- */
const DEMO_MSG = {
  fr: 'Bonjour ! Je suis un profil de démonstration : un personnage inventé pour que tu puisses essayer FeelShareLove. Je ne peux pas vraiment te répondre, mais si tu m\'invites dans ta tribu, j\'accepte tout de suite. Tu verras alors tout mon portrait et tu comprendras mieux ce que les autres voient, ou pas.',
  de: 'Hallo! Ich bin ein Demo-Profil: eine erfundene Figur, damit du FeelShareLove ausprobieren kannst. Ich kann dir nicht wirklich antworten, aber wenn du mich in deine Tribe einlädst, nehme ich sofort an. Dann siehst du mein ganzes Porträt und verstehst besser, was die anderen sehen und was nicht.',
  en: 'Hello! I\'m a demo profile: an invented character so you can try FeelShareLove. I can\'t really answer you, but if you invite me into your tribe, I\'ll accept straight away. You\'ll then see my whole portrait and understand better what others can see, and what they can\'t.',
  it: 'Ciao! Sono un profilo dimostrativo: un personaggio inventato per farti provare FeelShareLove. Non posso risponderti davvero, ma se mi inviti nella tua tribù accetto subito. Vedrai allora tutto il mio ritratto e capirai meglio che cosa vedono gli altri, e che cosa no.',
  es: '¡Hola! Soy un perfil de demostración: un personaje inventado para que puedas probar FeelShareLove. No puedo responderte de verdad, pero si me invitas a tu tribu, acepto enseguida. Verás entonces todo mi retrato y entenderás mejor lo que ven los demás, y lo que no.',
  pt: 'Olá! Sou um perfil de demonstração: uma personagem inventada para poderes experimentar o FeelShareLove. Não te posso responder a sério, mas se me convidares para a tua tribo, aceito logo. Verás então todo o meu retrato e perceberás melhor o que os outros veem, e o que não veem.' };
async function isDemo(id) { const p = await getDoc('profiles', id); return !!(p && p.fake); }
/* toute approche d'un profil de démonstration (message, invitation, « moi aussi ») reçoit le même message, au plus une fois par minute */
async function demoReply(user, demo) {
  const id = pair(user, demo); let t = await getDoc('threads', id);
  if (!t) { t = { a: demo, b: user, state: 'open', firstAt: Date.now(), free: true }; await putDoc('threads', id, null, t); }
  else if (t.state !== 'open') { t.state = 'open'; delete t.decliner; await putDoc('threads', id, null, t); }
  const last = (await listDocs('messages', "AND data->>'pairId'=$2 AND data->>'from'=$3", [id, demo])).reduce((m, x) => Math.max(m, x.ts || 0), 0);
  if (Date.now() - last < 6e4) return;
  const mid = 'dm-' + uid(); const lang = mailLang(await getDoc('profiles', user));
  await putDoc('messages', mid, demo, { id: mid, from: demo, to: user, kind: 'text', text: DEMO_MSG[lang], pairId: id, ts: Date.now() + 1 });
  notify(user, 'Nouveau message de ' + (await pseudoOf(demo)), '/app#messages/' + demo);
}
/* messages : rangés par paire ; chacun voit le champ thread = l'autre personne */
function msgView(m, me) { const other = m.from === me ? m.to : m.from; const { pairId, reactions, ...rest } = m;
  const r = reactions || {}; if (r[me] || r[other]) rest.rx = { me: r[me] || '', them: r[other] || '' }; // réactions : la mienne et celle de l'autre
  return { ...rest, thread: other }; }
const REACTIONS = new Set(['❤️', '😂', '😮', '😢', '🙏', '👍']);
async function putMessage(me, id, body, old) {
  if (old) { // modifications permises : réagir à un message de la conversation, ou marquer comme vue une photo éphémère reçue
    if (old.from !== me && old.to !== me) throw err(403, 'message');
    if ('react' in body) { const e = String(body.react || ''); if (e && !REACTIONS.has(e)) throw err(400, 'réaction'); limit(me, 'react', 60, 6e4);
      const r = { ...(old.reactions || {}) }; if (e) r[me] = e; else delete r[me]; old.reactions = r; await putDoc('messages', id, old.from, old); return msgView(old, me); }
    if (old.to !== me) throw err(403, 'message'); old.seen = !!body.seen; await putDoc('messages', id, old.from, old); return msgView(old, me);
  }
  const other = body.to; if (body.from !== me || !other) throw err(403, 'message');
  body = cleanDoc('messages', body);
  if (!['text', 'voice', 'ephemeral', 'decline'].includes(body.kind)) throw err(400, 'message');
  if (body.kind === 'decline') { // un refus est une des phrases prévues (famille + numéro), jamais un texte libre
    if (!(DECLINE_N[body.dk] > +body.di && +body.di >= 0 && Number.isInteger(+body.di))) throw err(400, 'Choisis une des réponses proposées.');
    body.di = +body.di; body.acc = ['m', 'f', 'n'].includes(body.acc) ? body.acc : 'n'; body.text = ''; delete body.aboutTitle; delete body.about;
  } else body.text = String(body.text || '').slice(0, 5000);
  if (body.kind === 'ephemeral') body.seconds = Math.min(60, Math.max(1, Math.round(+body.seconds) || 10)); else delete body.seconds;
  if ('secs' in body) body.secs = Math.min(600, Math.max(0, Math.round(+body.secs) || 0));
  if (body.re && !DOC_ID.test(String(body.re))) delete body.re; // message auquel on répond
  delete body.reactions; delete body.react; delete body.rx;
  limit(me, 'msg', 40, 6e4);
  const t = await getDoc('threads', pair(me, other)); if (!t) throw err(403, 'Pas de conversation.');
  const ok = t.state === 'open' || (t.state === 'pending' && t.a === me) || (body.kind === 'decline' && (t.decliner === me || (t.state === 'pending' && t.b === me)));
  if (!ok) throw err(403, 'Conversation fermée.');
  /* tant que l'autre n'a pas ouvert la conversation : un seul message */
  if (t.state === 'pending' && t.a === me && body.kind !== 'decline' && (await listDocs('messages', "AND data->>'pairId'=$2 AND data->>'from'=$3", [pair(me, other), me])).length) throw err(403, 'Attends que la personne ouvre la conversation.');
  const m = { ...body, id, pairId: pair(me, other), ts: Date.now() };
  delete m.thread; await putDoc('messages', id, me, m);
  if (!(t.state === 'pending' && t.a === me)) notify(other, (body.kind === 'decline' ? 'Réponse de ' : 'Nouveau message de ') + (await pseudoOf(me)), '/app#messages/' + me);
  if (body.kind !== 'decline' && await isDemo(other)) await demoReply(me, other);
  return msgView(m, me);
}

/* ---------- contrôle de tout ce que l'app envoie (audit du 10/11/2026, points A1 et A4) ----------
   Le serveur ne fait plus confiance au contenu reçu :
   - les champs techniques (identifiants, clés, codes) perdent les caractères qui servent à écrire du code dans une page (" < > `) ;
   - les textes libres gardent tout mais ont une longueur maximale (l'app les échappe à l'affichage) ;
   - une photo est une image (data:image/…) ou un fichier du serveur, rien d'autre ;
   - chaque document a une taille maximale. */
const DOC_ID = /^[\w.:|-]{1,80}$/;
const TEXT_KEYS = new Set(['why', 'now', 'text', 'title', 'about', 'desc', 'note', 'v', 'a', 'reason', 'aboutTitle', 'hint', 'free', 'page', 'section', 'hash', 'q', 'label']);
const LABEL_KEYS = new Set(['pseudo', 'city', 'geoCity', 'name', 'lastName', 'n', 'w', 'g', 'phone', 'npa', 'kind', 'workId']); // courts, affichés tels quels : sans < > " `
const PHOTO_KEYS = new Set(['photo', 'photoReal', 'photoSrc']);
const PHOTO_OK = /^(data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+|\/api\/files\/[\w-]{6,32})$/;
const strip = v => v.replace(/["<>`]/g, '');
function clean(v, key, store, depth = 0) {
  if (typeof v === 'string') {
    if (PHOTO_KEYS.has(key)) return PHOTO_OK.test(v) ? v : '';
    if (TEXT_KEYS.has(key) || (key === 'k' && store === 'questions')) return v.slice(0, 10000);
    if (LABEL_KEYS.has(key) && !(key === 'g' && store === 'profiles' && depth === 1)) return strip(v).slice(0, key === 'pseudo' ? 40 : 160);
    return strip(v).slice(0, 300);
  }
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (v === null || typeof v === 'boolean') return v;
  if (depth > 8) return null;
  if (Array.isArray(v)) return v.slice(0, 500).map(x => clean(x, key, store, depth + 1));
  if (typeof v === 'object') { const o = {}; for (const [k, x] of Object.entries(v).slice(0, 200)) { const kk = strip(String(k)).slice(0, 60); if (kk && kk !== '__proto__' && kk !== 'constructor') o[kk] = clean(x, kk, store, depth + 1); } return o; }
  return null;
}
function cleanDoc(store, data) {
  const out = clean(data, '', store);
  const max = store === 'profiles' ? 2e6 : 2e5;
  if (JSON.stringify(out).length > max) throw err(413, 'Trop gros.');
  return out;
}
/* limite de fréquence par personne (en mémoire) : écritures, messages, fichiers */
const hits = new Map();
function limit(me, what, max, ms) { const k = me + ':' + what, now = Date.now(); const a = (hits.get(k) || []).filter(t => now - t < ms); a.push(now); hits.set(k, a); if (a.length > max) throw err(429, 'Trop de demandes en peu de temps. Réessaie dans un moment.'); }
setInterval(() => { const now = Date.now(); for (const [k, a] of hits) if (!a.length || now - a[a.length - 1] > 36e5) hits.delete(k); }, 6e5);
const FILE_MIME = /^(image\/(jpeg|png|webp)|(audio|video)\/(webm|mp4|ogg|mpeg|wav|x-m4a|aac|x-wav)(;.*)?)$/;
const DECLINE_N = { parler: 2, amis: 1, amour: 2, toutes: 1 }; // nombre de phrases de refus par famille (les textes sont dans l'app : DECLINE)
const IMG_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']); // seuls types servis comme image dans l'admin
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
      const mi = (rows.find(p => p.id === me) || {}).intent;
      const nE = {}; for (const e of await listDocs('entries')) nE[e.profileId] = (nE[e.profileId] || 0) + 1;
      rows = rows.map(p => p.id === me ? selfView(p) : publicProfile(p, intimate, opened, mg, qMatches(byP[me], byP[p.id]), mi, nE[p.id])); }
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
  if (store === 'profiles' && d.id !== me) { const { hidden, intimate, opened, byId } = await hiddenFor(me); if (hidden.has(d.id)) return null; const qs = await listDocs('questions'); return publicProfile(d, intimate, opened, (byId[me] || {}).geo, qMatches(qs.filter(x => x.profileId === me), qs.filter(x => x.profileId === d.id)), (byId[me] || {}).intent, (await listDocs('entries', "AND data->>'profileId'=$2", [d.id])).length); }
  if (store === 'profiles' && d.id === me) return selfView(d);
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
  limit(me, 'write', 300, 6e4);
  if (store === 'circles' && !old) limit(me, 'circle', 5, 864e5);
  if ((store === 'reports' || store === 'proposals') && !old) limit(me, store, 30, 36e5);
  const data = cleanDoc(store, { ...body, id });
  if (store === 'profiles') {
    if (id !== me) throw err(403, 'portrait');
    /* champs que seul le serveur ou l'équipe décide */
    for (const k of ['km', 'hp', 'intimate', 'limited', 'country', 'fake', 'autoPaused']) delete data[k];
    if (old && old.fake) data.fake = true;
    if (old && old.autoPaused) { data.paused = old.paused; data.autoPaused = true; } // pause après signalements : seule l'équipe la lève
    if (data.pseudo) { const r = await q("SELECT 1 FROM docs WHERE store='profiles' AND id<>$1 AND lower(data->>'pseudo')=lower($2)", [me, data.pseudo]); if (r.rowCount) throw err(409, 'Ce pseudo est déjà pris.'); }
    if (old && old.geo && old.geoCity === data.city && !data.geo) { data.geo = old.geo; data.geoCity = old.geoCity; }
    await withGeo(data);
    /* liste rouge : numéro de mobile ou prénom + nom ; la pause ne peut pas être levée par la personne */
    const ru = (await q('SELECT redlisted FROM users WHERE id=$1', [me])).rows[0];
    if (ru && ru.redlisted) { data.redlisted = true; if (old && old.redlistCheck) data.redlistCheck = old.redlistCheck; }
    else { const hits = await redHits(null, data.phone, data.name, data.lastName); if (hits.length) { data.redlisted = true; if (hits.includes('name') && !hits.includes('phone')) data.redlistCheck = Date.now(); await q('UPDATE users SET redlisted=true, no_mail=true WHERE id=$1', [me]); await alog('Liste rouge', me, 'portrait : ' + hits.join(', ')); } }
    if (old && old.verified && old.verified.status === 'verified') data.verified = old.verified; // seul l'admin valide
    else if (data.verified && data.verified.status === 'verified') data.verified = old && old.verified || null;
    return selfView(await putDoc(store, id, me, data));
  }
  const ownerField = { entries: 'profileId', questions: 'profileId', circlePosts: 'author', reports: 'by', proposals: 'by', circles: 'createdBy' }[store] || 'owner';
  if (old && old.__owner && old.__owner !== me) throw err(403, 'écriture');
  if (data[ownerField] !== me) throw err(403, 'propriétaire');
  if (store === 'reports' || store === 'proposals') data.status = old ? old.status : 'open';
  if (store === 'proposals') { data.text = String(data.text || '').slice(0, 3000);
    /* la capture jointe doit être une image envoyée par la personne elle-même, sinon elle est ignorée */
    const f = /^[\w-]{6,32}$/.test(String(data.img || '')) ? (await q('SELECT owner, mime FROM files WHERE id=$1', [data.img])).rows[0] : null;
    if (!f || f.owner !== me || !IMG_MIME.has(f.mime)) data.img = null; }
  if (store === 'reports' && !old) await attachCopy(me, data);
  data.__owner = me;
  const saved = await putDoc(store, id, me, data);
  if (store === 'reports' && !old && data.target) autoPause(data.target).catch(() => {});
  /* cercle intime : quand l'autre m'avait déjà mis dans sa tribu, on le dit à tous les deux */
  if (store === 'nods' && data.target && !old && await isDemo(data.target)) await demoReply(me, data.target);
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
    if (await isDemo(other)) { inv.state = 'yes'; inv.answeredAt = now; await putDoc('invites', id, me, inv); await demoReply(me, other); notify(me, (await pseudoOf(other)) + ' a accepté : vous êtes dans la même tribu', '/app#tribu'); return inv; }
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
/* suppression du compte, étape 2 : la page ouverte depuis l'e-mail, avec un dernier bouton */
const DEL_MAIL = {
  fr: { subject: 'Confirme la suppression de ton compte FeelShareLove', body: 'Bonjour,\n\nTu as demandé la suppression de ton compte FeelShareLove. Pour la confirmer, ouvre ce lien (valable 1 heure) :\n{link}\n\nSi tu n\'as rien demandé, ignore cet e-mail : ton compte reste intact.' },
  de: { subject: 'Bestätige die Löschung deines FeelShareLove-Kontos', body: 'Hallo,\n\nDu hast die Löschung deines FeelShareLove-Kontos beantragt. Öffne diesen Link zur Bestätigung (1 Stunde gültig):\n{link}\n\nWenn du nichts beantragt hast, ignoriere diese E-Mail: Dein Konto bleibt erhalten.' },
  en: { subject: 'Confirm the deletion of your FeelShareLove account', body: 'Hello,\n\nYou asked to delete your FeelShareLove account. To confirm, open this link (valid for 1 hour):\n{link}\n\nIf you did not ask for this, ignore this e-mail: your account stays as it is.' },
  it: { subject: 'Conferma l\'eliminazione del tuo account FeelShareLove', body: 'Ciao,\n\nHai chiesto di eliminare il tuo account FeelShareLove. Per confermare, apri questo link (valido 1 ora):\n{link}\n\nSe non hai chiesto nulla, ignora questa e-mail: il tuo account resta intatto.' },
  es: { subject: 'Confirma la eliminación de tu cuenta de FeelShareLove', body: 'Hola,\n\nHas pedido eliminar tu cuenta de FeelShareLove. Para confirmarlo, abre este enlace (válido 1 hora):\n{link}\n\nSi no has pedido nada, ignora este e-mail: tu cuenta sigue intacta.' },
  pt: { subject: 'Confirma a eliminação da tua conta FeelShareLove', body: 'Olá,\n\nPediste para eliminar a tua conta FeelShareLove. Para confirmar, abre este link (válido 1 hora):\n{link}\n\nSe não pediste nada, ignora este e-mail: a tua conta fica intacta.' } };
const DEL_PAGE = {
  fr: ['Supprimer ton compte', 'Ton portrait, tes conversations, tes photos et toutes tes données seront effacés définitivement. Ce n\'est pas réversible.', 'Supprimer définitivement mon compte', 'Ton compte est supprimé. Merci d\'être passé·e par FeelShareLove.', 'Ce lien n\'est plus valable (1 heure). Refais la demande depuis Réglages.'],
  de: ['Konto löschen', 'Dein Porträt, deine Gespräche, deine Fotos und alle deine Daten werden endgültig gelöscht. Das lässt sich nicht rückgängig machen.', 'Mein Konto endgültig löschen', 'Dein Konto ist gelöscht. Danke, dass du bei FeelShareLove warst.', 'Dieser Link ist nicht mehr gültig (1 Stunde). Stelle die Anfrage erneut in den Einstellungen.'],
  en: ['Delete your account', 'Your portrait, conversations, photos and all your data will be permanently deleted. This cannot be undone.', 'Permanently delete my account', 'Your account has been deleted. Thank you for being part of FeelShareLove.', 'This link is no longer valid (1 hour). Make the request again from Settings.'],
  it: ['Elimina il tuo account', 'Il tuo ritratto, le conversazioni, le foto e tutti i tuoi dati saranno eliminati definitivamente. Non si può tornare indietro.', 'Elimina definitivamente il mio account', 'Il tuo account è stato eliminato. Grazie di essere passato/a da FeelShareLove.', 'Questo link non è più valido (1 ora). Rifai la richiesta dalle Impostazioni.'],
  es: ['Eliminar tu cuenta', 'Tu retrato, tus conversaciones, tus fotos y todos tus datos se borrarán definitivamente. No se puede deshacer.', 'Eliminar definitivamente mi cuenta', 'Tu cuenta ha sido eliminada. Gracias por haber pasado por FeelShareLove.', 'Este enlace ya no es válido (1 hora). Vuelve a pedirlo desde Ajustes.'],
  pt: ['Eliminar a tua conta', 'O teu retrato, as tuas conversas, as tuas fotos e todos os teus dados serão apagados definitivamente. Não é reversível.', 'Eliminar definitivamente a minha conta', 'A tua conta foi eliminada. Obrigado por teres passado pelo FeelShareLove.', 'Este link já não é válido (1 hora). Faz o pedido de novo nas Definições.'] };
async function delPage(req, res, url) {
  const t = String(url.searchParams.get('t') || ''); const d = /^[0-9a-f]{48}$/.test(t) ? await getDoc('deltoken', t) : null;
  const L = DEL_PAGE[d ? mailLang(await getDoc('profiles', d.user)) : 'fr'];
  const page = (body) => send(res, 200, `<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FeelShareLove</title><style>body{background:#14100e;color:#f5ece6;font:16px system-ui;max-width:520px;margin:40px auto;padding:0 18px}h1{font-size:24px}p{line-height:1.5}button{background:#c0392b;color:#fff;border:0;border-radius:999px;padding:14px 20px;font:600 16px system-ui;cursor:pointer;width:100%}a{color:#f0b429}</style><h1>FeelShareLove</h1>${body}</html>`, 'text/html; charset=utf-8');
  if (!d || Date.now() - d.created > 36e5) { if (d) await q("DELETE FROM docs WHERE store='deltoken' AND id=$1", [t]); return page(`<p>${H(L[4])}</p><p><a href="/app#reglages">FeelShareLove</a></p>`); }
  if (req.method === 'POST') { await wipeUser(d.user); await q("DELETE FROM docs WHERE store='deltoken' AND data->>'user'=$1", [d.user]); await alog('Compte supprimé par la personne', d.user, 'confirmé par e-mail'); return page(`<p>${H(L[3])}</p>`); }
  return page(`<h2>${H(L[0])}</h2><p>${H(L[1])}</p><form method="post"><button type="submit">${H(L[2])}</button></form>`);
}

async function wipeUser(me) {
  await q('DELETE FROM docs WHERE owner=$1', [me]);
  await q("DELETE FROM docs WHERE store='alerts' AND data->>'user'=$1", [me]);
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
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.webp': 'image/webp' };
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
    /* les polices ne changent jamais : le navigateur les garde un an au lieu de les redemander à chaque visite */
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': p.startsWith('/fonts/') && p.endsWith('.woff2') ? 'public, max-age=31536000, immutable' : 'no-cache' }); res.end(data);
  });
}

async function api(req, res, url) {
  const parts = url.pathname.split('/').filter(Boolean).slice(1).map(decodeURIComponent); // après "api"
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (parts[0] === 'diag' && req.method === 'POST') { const b = JSON.parse((await readBody(req, 4e4)).toString('utf8') || '{}'); await diagIn(b.items, String(ip).split(',')[0].trim()); return send(res, 200, { ok: true }); }
  /* comptes */
  if (parts[0] === 'auth') {
    if (req.method !== 'POST') throw err(405, 'méthode');
    if (parts[1] === 'logout') { const t = (req.headers.authorization || '').replace(/^Bearer /, ''); await q('DELETE FROM sessions WHERE token=$1', [t]); return send(res, 200, { ok: true }); }
    if (tooMany(ip)) throw err(429, 'Trop d\'essais. Réessaie dans un quart d\'heure.');
    const body = await json(req); const { password } = body; let { email, invite } = body; let e = norm(email);
    const STRONG = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z]).{10,}$/; // 10 caractères, une majuscule, une minuscule, un caractère non alphabétique
    const create = async (pass, inv) => { // crée le compte et, s'il y a un parrain, le met dans la tribu de la nouvelle personne
      const id = uid(); const inviter = inv ? (await q('SELECT id FROM users WHERE id=$1', [String(inv)])).rows[0] : null;
      await q('INSERT INTO users (id,email,pass,created,invited_by) VALUES ($1,$2,$3,$4,$5)', [id, e, hashPass(pass), Date.now(), inviter ? inviter.id : null]);
      if (inviter) { const iid = 'inv-' + pair(id, inviter.id); await putDoc('invites', iid, inviter.id, { id: iid, from: inviter.id, to: id, state: 'yes', ts: Date.now(), answeredAt: Date.now() }); notify(inviter.id, 'Un ami a rejoint FeelShareLove grâce à toi', '/app#tribu'); }
      return id; };
    /* étape 1 de l'inscription : l'adresse seule ; on envoie un lien, le mot de passe vient après */
    if (parts[1] === 'start') {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw err(400, 'Adresse e-mail invalide.');
      const r = await q('SELECT 1 FROM users WHERE email=$1', [e]); if (r.rowCount) throw err(409, 'Un compte existe déjà avec cette adresse. Connecte-toi.');
      if ((await config()).closed && !invite) throw err(403, 'Les inscriptions sont fermées pour le moment. Tu peux entrer avec le lien d\'invitation d\'un membre.');
      if (!mailReady()) return send(res, 200, { direct: true }); // pas d'envoi possible : l'app demande le mot de passe tout de suite (ancien parcours)
      if ((await redHits(e)).length) { await alog('Liste rouge', '', 'inscription refusée en silence : ' + e); return send(res, 200, { sent: true }); } // rien ne part, et la personne ne le sait pas
      const token = crypto.randomBytes(24).toString('hex'); const lang = ['fr', 'de', 'en', 'it', 'es', 'pt'].includes(body.lang) ? body.lang : 'fr';
      await q("DELETE FROM docs WHERE store='pending' AND data->>'email'=$1", [e]);
      await putDoc('pending', token, 'system', { id: token, email: e, invite: invite || null, lang, created: Date.now() });
      const link = `${SITE}/app?verify=${token}`; const M = VERIFY_MAIL[lang];
      try { await sendMail(e, M.subject, M.body.replace('{link}', link), null); } catch (x) { logErr('mail', 'vérification : ' + x.message, { to: e }); throw err(500, 'L\'e-mail n\'a pas pu partir. Réessaie dans un moment.'); }
      return send(res, 200, { sent: true });
    }
    /* étape 2 : le lien a été cliqué, la personne choisit son mot de passe */
    if (parts[1] === 'finish') {
      const t = String(body.token || ''); const pend = /^[0-9a-f]{48}$/.test(t) ? await getDoc('pending', t) : null;
      if (!pend) throw err(410, 'Ce lien n\'est plus valable. Demande un nouvel e-mail.');
      if (Date.now() - pend.created > 24 * 36e5) { await q("DELETE FROM docs WHERE store='pending' AND id=$1", [t]); throw err(410, 'Ce lien a expiré (24 heures). Demande un nouvel e-mail.'); }
      e = pend.email;
      if (!STRONG.test(password || '')) throw err(400, 'Mot de passe : 10 caractères au moins, une majuscule, une minuscule et un chiffre ou un signe.');
      if ((await q('SELECT 1 FROM users WHERE email=$1', [e])).rowCount) throw err(409, 'Un compte existe déjà avec cette adresse. Connecte-toi.');
      const id = await create(password, pend.invite || invite); await q("DELETE FROM docs WHERE store='pending' AND id=$1", [t]);
      const token = crypto.randomBytes(32).toString('hex'); await q('INSERT INTO sessions (token,user_id,created) VALUES ($1,$2,$3)', [token, id, Date.now()]);
      return send(res, 200, { token, id });
    }
    /* mot de passe oublié : un lien par e-mail (valable 1 heure). La réponse est la même que le compte existe ou non. */
    if (parts[1] === 'forgot') {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw err(400, 'Adresse e-mail invalide.');
      if (!mailReady()) throw err(503, 'L\'envoi d\'e-mails n\'est pas disponible pour le moment. Écris à ' + (SMTP.from || 'contact@feelsharelove.com') + '.');
      const u = (await q('SELECT id, banned, redlisted FROM users WHERE email=$1', [e])).rows[0];
      if (u && !u.banned && !u.redlisted) {
        const token = crypto.randomBytes(24).toString('hex');
        await q("DELETE FROM docs WHERE store='pwreset' AND data->>'user'=$1", [u.id]);
        await putDoc('pwreset', token, 'system', { id: token, user: u.id, created: Date.now() });
        const lang = ['fr', 'de', 'en', 'it', 'es', 'pt'].includes(body.lang) ? body.lang : mailLang(await getDoc('profiles', u.id)); const M = RESET_MAIL[lang];
        try { await sendMail(e, M.subject, M.body.replace('{link}', `${SITE}/app?reset=${token}`), null); } catch (x) { logErr('mail', 'mot de passe oublié : ' + x.message, { to: e }); throw err(500, 'L\'e-mail n\'a pas pu partir. Réessaie dans un moment.'); }
        await alog('Mot de passe oublié', u.id, 'lien envoyé');
      }
      return send(res, 200, { sent: true });
    }
    if (parts[1] === 'reset') {
      const t = String(body.token || ''); const r = /^[0-9a-f]{48}$/.test(t) ? await getDoc('pwreset', t) : null;
      if (!r || Date.now() - r.created > 36e5) { if (r) await q("DELETE FROM docs WHERE store='pwreset' AND id=$1", [t]); throw err(410, 'Ce lien n\'est plus valable (1 heure). Demande un nouvel e-mail.'); }
      if (!STRONG.test(password || '')) throw err(400, 'Mot de passe : 10 caractères au moins, une majuscule, une minuscule et un chiffre ou un signe.');
      const u = (await q('SELECT id, banned FROM users WHERE id=$1', [r.user])).rows[0]; if (!u || u.banned) throw err(403, 'Ce compte n\'est pas disponible.');
      await q('UPDATE users SET pass=$2 WHERE id=$1', [u.id, hashPass(password)]);
      await q('DELETE FROM sessions WHERE user_id=$1', [u.id]); // les autres appareils sont déconnectés
      await q("DELETE FROM docs WHERE store='pwreset' AND id=$1", [t]); await alog('Mot de passe changé', u.id, 'par le lien e-mail');
      const token = crypto.randomBytes(32).toString('hex'); await q('INSERT INTO sessions (token,user_id,created) VALUES ($1,$2,$3)', [token, u.id, Date.now()]);
      return send(res, 200, { token, id: u.id });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw err(400, 'Adresse e-mail invalide.');
    if (!password || password.length < 8) throw err(400, 'Le mot de passe doit avoir au moins 8 caractères.');
    let id;
    if (parts[1] === 'register') { // ancien parcours, seulement quand le serveur ne peut pas envoyer d'e-mails
      if (mailReady()) throw err(403, 'Passe par la vérification de l\'adresse e-mail.');
      const r = await q('SELECT 1 FROM users WHERE email=$1', [e]); if (r.rowCount) throw err(409, 'Un compte existe déjà avec cette adresse.');
      if ((await config()).closed && !invite) throw err(403, 'Les inscriptions sont fermées pour le moment. Tu peux entrer avec le lien d\'invitation d\'un membre.');
      if (!STRONG.test(password)) throw err(400, 'Mot de passe : 10 caractères au moins, une majuscule, une minuscule et un chiffre ou un signe.');
      id = await create(password, invite);
      const hits = await redHits(e); if (hits.length) await redMark(id, hits, 'inscription : ');
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
  /* la suppression du compte passe uniquement par l'e-mail de confirmation (account/delete-request, puis /compte/supprimer) */
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
  /* mon compte : l'adresse e-mail (visible seulement par moi), et le changement de mot de passe */
  if (parts[0] === 'account' && !parts[1] && req.method === 'GET') { const u = (await q('SELECT email FROM users WHERE id=$1', [me])).rows[0]; if (!u) throw err(404, 'compte'); return send(res, 200, { email: u.email }); }
  if (parts[0] === 'account' && parts[1] === 'password' && req.method === 'POST') {
    limit(me, 'password', 6, 36e5); const b = await json(req);
    const u = (await q('SELECT pass FROM users WHERE id=$1', [me])).rows[0]; if (!u) throw err(404, 'compte');
    if (typeof b.old !== 'string' || !checkPass(b.old, u.pass)) throw err(403, 'Le mot de passe actuel n\'est pas le bon.');
    if (typeof b.new !== 'string' || b.new.length > 200 || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z]).{10,}$/.test(b.new)) throw err(400, 'Mot de passe : 10 caractères au moins, une majuscule, une minuscule et un chiffre ou un signe.');
    await q('UPDATE users SET pass=$2 WHERE id=$1', [me, hashPass(b.new)]);
    await q('DELETE FROM sessions WHERE user_id=$1 AND token<>$2', [me, (req.headers.authorization || '').replace(/^Bearer /, '')]); // les autres appareils sont déconnectés
    await alog('Mot de passe changé', me, 'depuis Réglages'); return send(res, 200, { ok: true });
  }
  /* suppression du compte, étape 1 : un lien de confirmation part par e-mail (valable 1 heure) */
  if (parts[0] === 'account' && parts[1] === 'delete-request' && req.method === 'POST') {
    if (!mailReady()) throw err(503, 'L\'e-mail de confirmation ne peut pas partir pour le moment. Écris à contact@feelsharelove.com.');
    const u = (await q('SELECT email FROM users WHERE id=$1', [me])).rows[0]; if (!u) throw err(404, 'compte');
    const token = crypto.randomBytes(24).toString('hex');
    await q("DELETE FROM docs WHERE store='deltoken' AND data->>'user'=$1", [me]);
    await putDoc('deltoken', token, 'system', { id: token, user: me, created: Date.now() });
    const M = DEL_MAIL[mailLang(await getDoc('profiles', me))];
    try { await sendMail(u.email, M.subject, M.body.replace('{link}', `${SITE}/compte/supprimer?t=${token}`), null); } catch (x) { logErr('mail', 'suppression : ' + x.message, { to: me }); throw err(500, 'L\'e-mail n\'a pas pu partir. Réessaie dans un moment.'); }
    return send(res, 200, { ok: true });
  }
  /* fichiers (voix, photos) */
  if (parts[0] === 'files') {
    if (req.method === 'POST') { limit(me, 'file', 40, 36e5); const b = await readBody(req); const id = uid();
      const ct = String(req.headers['content-type'] || '').toLowerCase().trim(); // types connus seulement ; tout le reste devient un fichier neutre
      await q('INSERT INTO files (id,owner,mime,data,created) VALUES ($1,$2,$3,$4,$5)', [id, me, FILE_MIME.test(ct) ? ct : 'application/octet-stream', b, Date.now()]); return send(res, 200, { id, url: '/api/files/' + id }); }
    const r = await q('SELECT mime, data FROM files WHERE id=$1', [parts[1]]); if (!r.rowCount) throw err(404, 'fichier');
    res.writeHead(200, { 'Content-Type': r.rows[0].mime, 'Cache-Control': 'private, max-age=86400' }); return res.end(r.rows[0].data);
  }
  const store = parts[0]; if (!STORES.has(store)) throw err(404, 'table');
  const id = parts[1];
  if (id && !DOC_ID.test(id)) throw err(400, 'identifiant');
  const query = Object.fromEntries(url.searchParams);
  if (req.method === 'GET') return send(res, 200, id ? await readOne(store, me, id) : await readList(store, me, query));
  if (req.method === 'PUT' && id) return send(res, 200, await writeOne(store, me, id, await json(req)));
  if (req.method === 'DELETE' && id) { await deleteOne(store, me, id); return send(res, 200, { ok: true }); }
  throw err(405, 'méthode');
}

/* ---------- veille des contenus publics : une fois par jour ----------
   Le serveur relit ce que les autres membres peuvent voir (portrait, « en ce moment », pourquoi des entrées, questions ouvertes, cercles)
   et cherche des mots qui peuvent signaler une menace, une violence, une arnaque ou une détresse, dans les six langues du site.
   Les messages privés ne sont PAS analysés. Rien n'est sanctionné automatiquement : chaque alerte attend dans l'admin (onglet Alertes).
   Les mots sont écrits sans accents ni majuscules ; un espace dans une expression accepte plusieurs espaces. */
const WATCH = {
  violence: ['attentats?', 'bombes?', 'explosifs?', 'meurtres?', 'meurtrier(e|s|es)?', 'assassin(s|er|e|es|at|ats)?', 'tuer', 'tu(e|es|ent|ons|ez|erai|eras|era|erais|erait)', 'massacr(e|es|er)', 'tueries?', 'fusillades?', 'egorg(er|e|es|ent)', 'poignard(er|e|es|ent)', 'decapit(er|e|ation)', 'terroris(te|tes|me)', 'djihad(iste|istes)?', 'kamikazes?', 'armes? a feu', 'kalachnikov', 'menaces? de mort', 'faire sauter', 'lyncher',
    'anschlag', 'anschlage', 'sprengstoff', 'bomben?', 'mord', 'morde', 'morden', 'morder(in)?', 'ermord(en|e|et|ung)', 'tot(en|e|et|ung)', 'umbringen', 'massaker', 'amok(lauf)?', 'erschiess(en|e|t)', 'erstech(en|e)', 'terror(ist|isten|ismus|anschlag)?', 'dschihad', 'schusswaffen?', 'morddrohung(en)?', 'enthaupt(en|ung)',
    'bomb(s|ing|ings)?', 'explosives?', 'murder(s|er|ers|ed|ing)?', 'kill(s|ing|ed|er|ers)?', 'assassinat(e|ed|ion)', 'mass shooting', 'shootings?', 'stab(bing|bed)', 'behead(ing|ed)?', 'terroris(t|ts|m)', 'terror attack', 'jihad(ist|ists)?', 'death threats?', 'slaughter',
    'attentat(o|i)', 'bomba', 'esplosiv(o|i)', 'omicid(io|i|a)', 'assassin(o|i|are|io)', 'uccid(ere|o|i|e|ero|era|erti)', 'ammazz(are|o|i|a|arti)', 'strag(e|i)', 'massacr(o|are)', 'sparatoria', 'accoltell(are|o|ato)', 'decapit(are|azione)', 'terroris(ta|ti|mo)', 'minacc(ia|e) di morte', 'arm(a|i) da fuoco',
    'atentados?', 'bombas?', 'explosivos?', 'asesin(o|a|os|ar|ato|atos)', 'homicidios?', 'matar(te|lo|la|los)?', 'masacre', 'tiroteos?', 'apunal(ar|o|ado)', 'degoll(ar|ado)', 'decapit(ar|acion)', 'terroristas?', 'terrorismo', 'yihad(ista)?', 'amenazas? de muerte', 'armas? de fuego',
    'assassin(a|os|ato|io)', 'chacina', 'tiroteios?', 'esfaque(ar|ado|ou)', 'degol(ar|ado)', 'decapit(ar|acao)', 'ameacas? de morte', 'armas? de fogo'],
  sexuel: ['viols?', 'viol(er|e|es|ent|ee|ees|erai|eur|eurs)', 'agressions? sexuelles?', 'abus sexuels?', 'pedophil(e|es|ie)', 'pedocriminel(s|le)?', 'inceste',
    'vergewaltig(en|e|t|ung|er)', 'sexuelle(r|n)? (ubergriff|gewalt|missbrauch)', 'padophil(e|er|ie)?', 'kindesmissbrauch', 'missbrauch(en|t)?', 'inzest',
    'rape(s|d)?', 'raping', 'rapists?', 'sexual (assault|abuse|violence)', 'molest(ed|ing|er)?', 'pa?edophil(e|es|ia)', 'incest', 'child abuse',
    'stupr(o|i|are|atore|ata)', 'violentar(e|ti|la)', 'violentat(o|a)', 'violenza sessuale', 'abus(o|i) sessual(e|i)', 'pedofil(o|i|ia)', 'incesto',
    'violacion(es)?', 'violar(te|la)?', 'viol(ada|ado|ador|adores)', 'agresion(es)? sexual(es)?', 'abusos? sexual(es)?', 'pedofil(os|a)', 'pederast(a|ia)',
    'violacao', 'violacoes', 'estupr(o|ar|ador|ada)', 'agressao sexual', 'abusos? sexua(l|is)'],
  agression: ['agressions?', 'agress(er|e|es|ent|eur|eurs)', 'tabass(er|e)', 'casser la gueule', 'tortur(e|es|er)', 'sequestr(er|ation)', 'kidnapp(er|ing)',
    'angriffe?', 'angreifen', 'verprugel(n|t)', 'zusammenschlagen', 'folter(n|ung)?', 'entfuhr(en|ung)', 'uberfall(en)?', 'korperverletzung',
    'assault(s|ed)?', 'beat (you|him|her|them) up', 'tortur(ed|ing)', 'kidnap(ped|ping)?', 'abduct(ion|ed)?',
    'aggression(e|i)', 'aggredi(re|sco|to)', 'picchi(are|o|ato)', 'tortur(a|are)', 'rapi(re|mento)', 'sequestr(o|are)',
    'agresion(es)?', 'agredir', 'agred(io|ido)', 'golpear', 'dar una paliza', 'torturar', 'secuestr(o|ar)', 'raptar',
    'agressao', 'agressoes', 'agred(iu|ido)', 'espanc(ar|ado|ou)', 'rapt(o|ar)'],
  arnaque: ['virements?', 'western union', 'moneygram', 'bitcoins?', 'crypto(s|monnaie|monnaies)?', 'iban', 'cartes? cadeaux?', 'investissements?', 'gagner de l argent', 'paypal', 'frais de douane',
    'uberweisung(en)?', 'krypto(wahrung|wahrungen)?', 'geschenkkarten?', 'gutscheinkarten?', 'investition(en)?', 'investieren', 'geld verdienen',
    'wire transfer', 'bank transfer', 'crypto(currency|currencies)?', 'gift cards?', 'invest(ment|ments|ing)', 'make money', 'cash app',
    'bonific(o|i)', 'cripto(valuta|valute)?', 'carta regalo', 'buono regalo', 'investiment(o|i)', 'investire', 'guadagnare soldi',
    'transferencias? bancarias?', 'cripto(moneda|monedas)?', 'tarjetas? (de )?regalo', 'inversion(es)?', 'invertir', 'ganar dinero',
    'cripto(moeda|moedas)', 'cart(ao|oes) presente', 'vale presente', 'investimentos?', 'ganhar dinheiro'],
  contact: ['https?:', 'www\\.', 'whatsapp', 'telegram', 'snapchat', 'instagram', 'tiktok', 'onlyfans', '[a-z0-9.]+@[a-z0-9-]+\\.[a-z]{2,}', '\\+?[0-9][0-9 ]{8,}[0-9]'],
  detresse: ['suicid(e|es|er|aire|aires)', 'me tuer', 'en finir', 'envie de mourir', 'plus envie de vivre', 'me foutre en l air', 'mettre fin a mes jours',
    'selbstmord', 'suizid', 'mich umbringen', 'nicht mehr leben', 'leben beenden',
    'suicidal', 'kill myself', 'end my life', 'want to die', 'don t want to live',
    'suicid(io|a|armi|arsi)', 'uccidermi', 'ammazzarmi', 'farla finita', 'voglia di morire', 'non voglio piu vivere', 'togliermi la vita',
    'suicidarme', 'suicidarse', 'matarme', 'quitarme la vida', 'ganas de morir', 'no quiero vivir', 'acabar con todo',
    'me matar', 'tirar a minha vida', 'vontade de morrer', 'nao quero viver', 'acabar com tudo']
};
const WATCH_LABEL = { violence: 'Violence, attentat, meurtre', sexuel: 'Violence sexuelle', agression: 'Agression', arnaque: 'Argent : arnaque possible', contact: 'Lien, numéro ou réseau extérieur', detresse: 'Détresse' };
const WATCH_RE = Object.fromEntries(Object.entries(WATCH).map(([k, l]) => [k, new RegExp('(?<![a-z0-9])(?:' + [...new Set(l)].map(t => t.replace(/ /g, ' +')).join('|') + ')(?![a-z0-9])', 'g')]));
/* texte simplifié caractère par caractère (même longueur que l'original), pour retrouver l'extrait exact */
function watchFold(chars) { return chars.map(ch => { const f = ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()[0] || ' '; return /[a-z0-9@+.:\/]/.test(f) ? f : ' '; }).join(''); }
function watchFind(text) { const chars = [...String(text || '')]; if (chars.length < 3) return []; const folded = watchFold(chars); const out = [];
  for (const [cat, re] of Object.entries(WATCH_RE)) { re.lastIndex = 0; let m, n = 0; const seen = new Set();
    while ((m = re.exec(folded)) && n < 3) { const term = m[0].replace(/ +/g, ' '); if (seen.has(term)) continue; seen.add(term); n++;
      const a = Math.max(0, m.index - 70), b = Math.min(chars.length, m.index + m[0].length + 70);
      out.push({ cat, term, before: (a ? '…' : '') + chars.slice(a, m.index).join(''), hit: chars.slice(m.index, m.index + m[0].length).join(''), after: chars.slice(m.index + m[0].length, b).join('') + (b < chars.length ? '…' : '') }); } }
  return out; }
async function watchScan() {
  const profiles = await listDocs('profiles'); const fake = new Set(profiles.filter(p => p.fake).map(p => p.id)); const found = [];
  const add = (user, where, text) => { if (!user || fake.has(user) || user === 'system') return;
    for (const h of watchFind(text)) found.push({ id: 'al-' + crypto.createHash('sha1').update([user, where, h.cat, h.term, String(text)].join('|')).digest('hex').slice(0, 24), user, where, ...h }); };
  for (const p of profiles) { add(p.id, 'Portrait › pseudo', p.pseudo); add(p.id, 'Portrait › En ce moment', p.now); add(p.id, 'Présent › phrase de disponibilité', p.avail && p.avail.note);
    for (const [k, f] of Object.entries(p.facts || {})) if (f && typeof f.v === 'string' && k !== 'birth' && k !== 'sign') add(p.id, 'Portrait › Qui je suis (' + k + ')', f.v);
    for (const c of p.chinois || []) add(p.id, 'Portrait › personnage ' + (c.n || ''), c.why); }
  for (const e of await listDocs('entries')) add(e.profileId, 'Ce qui me fait vibrer › ' + String(e.title || '').slice(0, 60), e.why);
  for (const x of await listDocs('questions')) { add(x.profileId, 'Questions ouvertes › question', x.k); add(x.profileId, 'Questions ouvertes › ' + String(x.k || '').slice(0, 60), x.a); }
  const circles = await listDocs('circles'); const cById = Object.fromEntries(circles.map(c => [c.id, c]));
  for (const c of circles) { add(c.createdBy, 'Cercle › titre', c.title); add(c.createdBy, 'Cercle « ' + String(c.title || '').slice(0, 50) + ' » › description', c.about); }
  for (const x of await listDocs('circlePosts')) add(x.author, 'Cercle « ' + String((cById[x.circleId] || {}).title || x.circleId || '').slice(0, 50) + ' »', x.text);
  let fresh = 0;
  for (const a of found) { if (await getDoc('alerts', a.id)) continue; await putDoc('alerts', a.id, 'system', { ...a, status: 'open', ts: Date.now() }); fresh++; }
  await putDoc('admin', 'watch', 'admin', { id: 'watch', at: Date.now(), found: found.length, fresh });
  return fresh;
}
const watchTick = () => watchScan().catch(e => logErr('veille', e.message, { stack: String(e.stack || '').slice(0, 800) }));

/* ---------- vérification quotidienne du site : fichiers, liens, traductions, erreurs vues par les navigateurs ---------- */
const vm = require('vm');
const walkFiles = (dir, out = []) => { for (const f of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, f.name); if (f.isDirectory()) walkFiles(p, out); else out.push(p); } return out; };
const CHECK_ROUTES = new Set(['', 'app', 'health', ...SITE_LANGS]); // adresses servies par le serveur lui-même
const DIAG_LANGS = new Set(['de', 'en', 'it', 'es', 'pt']);
async function linkAlive(u) { // un lien extérieur répond-il ? (401, 403, 405, 429 : le site existe mais refuse les robots)
  try { const c = new AbortController(); const t = setTimeout(() => c.abort(), 8000);
    const r = await fetch(u, { method: 'GET', redirect: 'follow', signal: c.signal, headers: { 'User-Agent': 'FeelShareLove-verification' } }); clearTimeout(t);
    return r.status < 400 || [401, 403, 405, 429].includes(r.status) ? '' : 'réponse ' + r.status; } catch (e) { return e.name === 'AbortError' ? 'pas de réponse en 8 secondes' : 'injoignable'; } }
async function siteCheck() {
  const t0 = Date.now(), sec = { files: [], links: [], routes: [], ext: [], lang: [], js: [], i18n: [] };
  const all = walkFiles(PUBLIC), rel = p => path.relative(PUBLIC, p).split(path.sep).join('/');
  const have = new Set(all.map(rel)), read = p => { try { return fs.readFileSync(p, 'utf8'); } catch (e) { return ''; } };
  const local = (ref, from) => { ref = ref.split('#')[0].split('?')[0]; if (!ref) return; const r = ref.replace(/^\.?\//, '');
    if (!have.has(r) && !have.has(decodeURIComponent(r)) && !CHECK_ROUTES.has(r)) sec.links.push(from + ' → ' + ref + ' (fichier absent)'); };
  const skip = r => !r || /^(https?:|\/\/|mailto:|tel:|data:|blob:|javascript:|#|%23)/i.test(r) || /[${}<>+ ]/.test(r);
  const pages = new Set(), routes = new Map(), ext = new Map();
  for (const p of all) { const r = rel(p), e = path.extname(p); if (!['.js', '.html', '.css', '.webmanifest'].includes(e)) continue; const src = read(p); const vendor = r.includes('/vendor/');
    /* 1. chaque fichier de code doit être lisible par un navigateur */
    if (e === '.js' && !vendor) { try { new vm.Script(src, { filename: r }); } catch (x) { const l = String(x.stack || '').split('\n')[0]; sec.files.push(r + ' : ' + x.message + (/:\d+$/.test(l) ? ' (ligne ' + l.split(':').pop() + ')' : '')); } }
    if (!src.trim()) sec.files.push(r + ' : fichier vide');
    /* 2. fichiers appelés par les pages, les feuilles de style et le manifeste */
    if (e === '.html') { for (const m of src.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)) if (!skip(m[1])) local(m[1], r); }
    if (e === '.css') { for (const m of src.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) if (!skip(m[1])) local(m[1].startsWith('/') ? m[1] : path.posix.join(path.posix.dirname(r), m[1]), r); }
    if (e === '.webmanifest') { try { const j = JSON.parse(src); for (const i of j.icons || []) if (i.src && !skip(i.src)) local(i.src, r); } catch (x) { sec.files.push(r + ' : ' + x.message); } }
    if (vendor) continue;
    /* 3. écrans de l'app et liens internes qui y mènent */
    if (e === '.js') { for (const m of src.matchAll(/\bPages\.([A-Za-z]\w*)\s*=/g)) pages.add(m[1]);
      for (const m of src.matchAll(/(?:href=\\?["']|location\.hash\s*=\s*[`'"])#([a-z][a-z0-9]*)(?![\w-])/g)) if (!routes.has(m[1])) routes.set(m[1], r); }
    /* 4. liens vers d'autres sites */
    if (e === '.js' || e === '.html') for (const m of src.matchAll(/href=\\?["'](https?:\/\/[^"'\\$ ]+)/g)) if (!ext.has(m[1]) && !m[1].startsWith(SITE)) ext.set(m[1], r);
  }
  for (const [n, r] of routes) if (!pages.has(n)) sec.routes.push(r + ' → #' + n + ' (aucun écran de ce nom)');
  if (typeof fetch === 'function') for (const [u, r] of [...ext].slice(0, 40)) { const bad = await linkAlive(u); if (bad) sec.ext.push(r + ' → ' + u + ' (' + bad + ')'); }
  /* 5. dictionnaires : une phrase traduite dans une langue doit l'être dans les autres */
  const dict = {};
  for (const l of DIAG_LANGS) { try { vm.runInNewContext(read(path.join(PUBLIC, 'js', 'lang', l + '.js')), { I18N: { add: (c, d) => { dict[c] = d; } } }, { timeout: 5000 }); } catch (x) { /* déjà signalé au point 1 */ } if (!dict[l]) sec.lang.push(l + ' : dictionnaire absent ou illisible'); }
  const keys = new Set(Object.values(dict).flatMap(d => Object.keys(d)));
  for (const l of Object.keys(dict)) { const miss = [...keys].filter(k => dict[l][k] == null || dict[l][k] === ''); if (miss.length) sec.lang.push(l + ' : ' + miss.length + ' phrase(s) sans traduction, par exemple « ' + miss.slice(0, 5).map(k => k.slice(0, 80)).join(' » · « ') + ' »'); }
  /* 6. ce que les navigateurs des membres ont signalé */
  const diag = (await listDocs('diag')).sort((a, b) => (b.n || 0) - (a.n || 0));
  /* ce que les membres ont écrit eux-mêmes (cercles) n'est pas un texte du site : on ne le compte pas */
  const own = new Set((await listDocs('circles')).flatMap(c => [c.title, c.about]).filter(Boolean).map(t => String(t).replace(/\s+/g, ' ').trim().slice(0, 300)));
  const byText = new Map();
  for (const d of diag) { const tail = ' — vu ' + (d.n || 1) + ' fois, écran « ' + (d.page || '?') + ' », dernière fois le ' + fmtDT(d.last);
    if (d.kind === 'js') sec.js.push(d.text + (d.src ? ' [' + d.src + ']' : '') + tail);
    else if (!own.has(d.text)) { const g = byText.get(d.text) || { langs: [], n: 0, page: d.page, last: 0 }; g.langs.push(d.lang); g.n += d.n || 1; g.last = Math.max(g.last, d.last || 0); byText.set(d.text, g); } }
  for (const [t, g] of byText) sec.i18n.push('[' + g.langs.sort().join(', ') + '] ' + t + ' — vu ' + g.n + ' fois, écran « ' + (g.page || '?') + ' », dernière fois le ' + fmtDT(g.last));
  const hard = sec.files.length + sec.links.length + sec.routes.length, total = hard + sec.ext.length + sec.lang.length + sec.js.length + sec.i18n.length;
  const rep = { id: 'check', at: Date.now(), ms: Date.now() - t0, nFiles: all.length, nExt: ext.size, nKeys: keys.size, hard, total, sec };
  const old = (await getDoc('admin', 'check')) || {}; rep.mailAt = old.mailAt || 0; rep.prevHard = old.hard || 0;
  await putDoc('admin', 'check', 'admin', rep); return rep;
}
const CHECK_TITLES = [['files', 'Fichiers illisibles ou vides'], ['links', 'Fichiers appelés mais absents'], ['routes', 'Liens internes vers un écran qui n\'existe pas'], ['ext', 'Liens vers d\'autres sites qui ne répondent pas'], ['lang', 'Dictionnaires de traduction incomplets'], ['js', 'Erreurs survenues dans le navigateur des membres'], ['i18n', 'Textes restés en français dans une autre langue (vus par les membres)']];
function checkText(r) {
  const out = ['FeelShareLove — vérification du site', 'Faite le ' + fmtDT(r.at) + ' en ' + r.ms + ' ms · ' + r.nFiles + ' fichiers, ' + r.nKeys + ' phrases par langue, ' + r.nExt + ' liens extérieurs', r.total ? r.total + ' point(s) à regarder' : 'Rien à signaler', ''];
  for (const [k, t] of CHECK_TITLES) { const L = r.sec[k] || []; out.push('== ' + t + ' : ' + (L.length || 'aucun') + ' =='); for (const x of L.slice(0, 200)) out.push('- ' + x); if (L.length > 200) out.push('… et ' + (L.length - 200) + ' autres'); out.push(''); }
  return out.join('\n'); }
async function checkMail(r, to) {
  const day = new Date(r.at).toISOString().slice(0, 10);
  await getMailer().sendMail({ from: `FeelShareLove <${SMTP.from}>`, to: to || SMTP.from, subject: 'FeelShareLove · vérification du ' + day + ' : ' + (r.total ? r.total + ' point(s) à regarder' : 'rien à signaler'),
    text: 'Le rapport complet est joint.\n\n' + CHECK_TITLES.map(([k, t]) => t + ' : ' + ((r.sec[k] || []).length || 'aucun')).join('\n'), attachments: [{ filename: 'verification-feelsharelove-' + day + '.txt', content: checkText(r) }] });
}
/* une fois par jour ; l'e-mail part au plus une fois par 20 heures, sauf si un redéploiement vient de casser un fichier ou un lien */
const checkTick = async () => { try { const r = await siteCheck();
  if (mailReady() && (Date.now() - (r.mailAt || 0) > 20 * 36e5 || (r.hard && r.hard !== r.prevHard))) { await checkMail(r); r.mailAt = Date.now(); await putDoc('admin', 'check', 'admin', r); }
} catch (e) { logErr('vérification', e.message, { stack: String(e.stack || '').slice(0, 800) }); } };
/* signalement envoyé par le navigateur d'un membre : erreur de script, ou texte resté en français */
async function diagIn(items, ip) {
  limit('ip:' + ip, 'diag', 30, 36e5);
  const n = (await q("SELECT count(*)::int AS n FROM docs WHERE store='diag'")).rows[0].n;
  for (const it of (Array.isArray(items) ? items : []).slice(0, 40)) { if (!it || typeof it.t !== 'string') continue;
    const kind = it.k === 'js' ? 'js' : 'i18n', lang = DIAG_LANGS.has(it.l) ? it.l : '', text = strip(it.t).replace(/\s+/g, ' ').trim().slice(0, 300);
    if (!text || (kind === 'i18n' && !lang)) continue;
    const id = 'dg-' + crypto.createHash('sha1').update([kind, lang, text].join('|')).digest('hex').slice(0, 24); const old = await getDoc('diag', id);
    if (!old && n >= 1000) continue; // plafond : la table ne peut pas grossir sans fin
    await putDoc('diag', id, 'system', { id, kind, lang, text, src: strip(String(it.x || '')).slice(0, 200), page: /^[\w-]{0,30}$/.test(it.p || '') ? it.p : '', n: (old && old.n || 0) + 1, first: old && old.first || Date.now(), last: Date.now() }); }
}

/* ---------- administration : /admin?key=ADMIN_KEY ---------- */
const H = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
/* ---------- e-mail de vérification de l'adresse, dans la langue de l'app ---------- */
const VERIFY_MAIL = {
  fr: { subject: 'FeelShareLove : confirme ton adresse e-mail', body: 'Bonjour,\n\nPour continuer ton inscription sur FeelShareLove, clique sur ce lien (valable 24 heures) :\n{link}\n\nTu choisiras ensuite ton mot de passe.\nSi tu n\'es pas à l\'origine de cette demande, ignore simplement cet e-mail.' },
  de: { subject: 'FeelShareLove: Bestätige deine E-Mail-Adresse', body: 'Hallo,\n\num deine Anmeldung bei FeelShareLove fortzusetzen, klicke auf diesen Link (24 Stunden gültig):\n{link}\n\nDanach wählst du dein Passwort.\nFalls du das nicht angefordert hast, ignoriere diese E-Mail einfach.' },
  en: { subject: 'FeelShareLove: confirm your e-mail address', body: 'Hello,\n\nTo continue signing up on FeelShareLove, click this link (valid for 24 hours):\n{link}\n\nYou will then choose your password.\nIf you did not request this, simply ignore this e-mail.' },
  it: { subject: 'FeelShareLove: conferma il tuo indirizzo e-mail', body: 'Ciao,\n\nper continuare la tua iscrizione a FeelShareLove, clicca su questo link (valido 24 ore):\n{link}\n\nSceglierai poi la tua password.\nSe non hai fatto tu questa richiesta, ignora semplicemente questa e-mail.' },
  es: { subject: 'FeelShareLove: confirma tu dirección de correo', body: 'Hola,\n\npara continuar tu inscripción en FeelShareLove, haz clic en este enlace (válido 24 horas):\n{link}\n\nDespués elegirás tu contraseña.\nSi no has hecho esta solicitud, simplemente ignora este correo.' },
  pt: { subject: 'FeelShareLove: confirma o teu endereço de e-mail', body: 'Olá,\n\npara continuares a tua inscrição no FeelShareLove, clica neste link (válido 24 horas):\n{link}\n\nDepois escolherás a tua palavra-passe.\nSe não fizeste este pedido, ignora simplesmente este e-mail.' } };
const RESET_MAIL = {
  fr: { subject: 'FeelShareLove : nouveau mot de passe', body: 'Bonjour,\n\nPour choisir un nouveau mot de passe sur FeelShareLove, clique sur ce lien (valable 1 heure) :\n{link}\n\nSi tu n\'as rien demandé, ignore cet e-mail : ton mot de passe actuel reste valable.' },
  de: { subject: 'FeelShareLove: neues Passwort', body: 'Hallo,\n\num ein neues Passwort für FeelShareLove zu wählen, klicke auf diesen Link (1 Stunde gültig):\n{link}\n\nFalls du nichts angefordert hast, ignoriere diese E-Mail: Dein aktuelles Passwort bleibt gültig.' },
  en: { subject: 'FeelShareLove: new password', body: 'Hello,\n\nTo choose a new password on FeelShareLove, click this link (valid for 1 hour):\n{link}\n\nIf you did not ask for this, ignore this e-mail: your current password stays valid.' },
  it: { subject: 'FeelShareLove: nuova password', body: 'Ciao,\n\nper scegliere una nuova password su FeelShareLove, clicca su questo link (valido 1 ora):\n{link}\n\nSe non hai chiesto nulla, ignora questa e-mail: la tua password attuale resta valida.' },
  es: { subject: 'FeelShareLove: nueva contraseña', body: 'Hola,\n\npara elegir una nueva contraseña en FeelShareLove, haz clic en este enlace (válido 1 hora):\n{link}\n\nSi no has pedido nada, ignora este correo: tu contraseña actual sigue siendo válida.' },
  pt: { subject: 'FeelShareLove: nova palavra-passe', body: 'Olá,\n\npara escolheres uma nova palavra-passe no FeelShareLove, clica neste link (válido 1 hora):\n{link}\n\nSe não pediste nada, ignora este e-mail: a tua palavra-passe atual continua válida.' } };
const MSG_MAIL = {
  fr: { subject: '{p} t\'a écrit sur FeelShareLove', body: 'Bonjour,\n\n{p} t\'a écrit sur FeelShareLove. Sur FeelShareLove, personne ne reste sans réponse : ouvre la conversation pour lire et répondre.\n{link}' },
  de: { subject: '{p} hat dir auf FeelShareLove geschrieben', body: 'Hallo,\n\n{p} hat dir auf FeelShareLove geschrieben. Auf FeelShareLove bleibt niemand ohne Antwort: Öffne das Gespräch, um zu lesen und zu antworten.\n{link}' },
  en: { subject: '{p} wrote to you on FeelShareLove', body: 'Hello,\n\n{p} wrote to you on FeelShareLove. On FeelShareLove, nobody is left without an answer: open the conversation to read and reply.\n{link}' },
  it: { subject: '{p} ti ha scritto su FeelShareLove', body: 'Ciao,\n\n{p} ti ha scritto su FeelShareLove. Su FeelShareLove nessuno resta senza risposta: apri la conversazione per leggere e rispondere.\n{link}' },
  es: { subject: '{p} te ha escrito en FeelShareLove', body: 'Hola,\n\n{p} te ha escrito en FeelShareLove. En FeelShareLove nadie se queda sin respuesta: abre la conversación para leer y responder.\n{link}' },
  pt: { subject: '{p} escreveu-te no FeelShareLove', body: 'Olá,\n\n{p} escreveu-te no FeelShareLove. No FeelShareLove ninguém fica sem resposta: abre a conversa para ler e responder.\n{link}' } };
const mailLang = p => { const l = p && (p.uiLang || p.textLang); return ['fr', 'de', 'en', 'it', 'es', 'pt'].includes(l) ? l : 'fr'; };
/* avis par e-mail d'un message : moyen principal (surtout sur iPhone, où les notifications demandent une installation).
   Envoyé si la personne n'est pas venue depuis 20 minutes, même si elle a les notifications du téléphone ; un seul e-mail par absence */
const AWAY = 20 * 6e4;
async function mailIfAway(userId, fromId) {
  if (!mailReady()) return;
  const u = (await q('SELECT email, last_seen, no_mail, redlisted, banned FROM users WHERE id=$1', [userId])).rows[0];
  if (!u || u.no_mail || u.redlisted || u.banned) return;
  const seen = +u.last_seen || 0; if (Date.now() - seen < AWAY) return;
  const note = await getDoc('mailnote', userId); if (note && note.at > seen) return; // déjà prévenue depuis sa dernière visite
  const p = await getDoc('profiles', userId); if (!p || p.fake) return;
  const M = MSG_MAIL[mailLang(p)], who = await pseudoOf(fromId);
  await putDoc('mailnote', userId, 'system', { id: userId, at: Date.now() });
  await sendMail(u.email, M.subject.replace('{p}', who), M.body.replace('{p}', who).replace('{link}', `${SITE}/app#messages/${fromId}`), userId);
}
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
mark{background:#f0b429;color:#2a1408;border-radius:3px;padding:0 2px}\n.flash{background:rgba(95,191,143,.15);border:1px solid var(--ok);border-radius:12px;padding:8px 12px;margin-bottom:12px}`;

/* fichier texte des propositions, à donner à Claude : une proposition par bloc, avec la page et la rubrique précises */
async function proposalsText(all) {
  const L = (await listDocs('proposals')).filter(r => all || r.status === 'open').sort((a, b) => (a.ts || 0) - (b.ts || 0));
  const out = ['FeelShareLove — propositions et corrections' + (all ? ' (toutes)' : ' (à lire)'), 'Exporté le ' + fmtDT(Date.now()) + ' · ' + L.length + ' proposition(s)', ''];
  for (const r of L) { const p = await getDoc('profiles', r.by);
    out.push('---', 'Date : ' + fmtDT(r.ts), 'Page : ' + (r.page || '') + (r.hash ? ' (' + r.hash + ')' : ''), 'Rubrique : ' + (r.section || '(la page entière)'), 'Langue de l\'app : ' + (r.lang || ''), 'Écran : ' + (r.width ? r.width + ' px' : ''), 'Capture : ' + (r.img ? 'oui (fichier .html ou admin)' : 'non'), 'De : ' + (p && p.pseudo || r.by) + (r.status === 'done' ? ' · classée' : ''), '', String(r.text || ''), ''); }
  return out.join('\n'); }

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
    if (a === 'alert-done') { const r = await getDoc('alerts', id); if (r) { r.status = 'done'; r.doneAt = Date.now(); await putDoc('alerts', id, 'system', r); } return go('alerts', '', 'Alerte classée.'); }
    if (a === 'alert-all') { if (f.get('sure') !== 'oui') return go('alerts', '', 'Coche la case pour tout classer.'); let n = 0; for (const r of await listDocs('alerts')) if (r.status === 'open') { r.status = 'done'; r.doneAt = Date.now(); await putDoc('alerts', r.id, 'system', r); n++; } await alog('Alertes toutes classées', '', n + ' alertes'); return go('alerts', '', n + ' alertes classées.'); }
    if (a === 'alert-scan') { const n = await watchScan(); await alog('Veille lancée à la main', '', n + ' nouvelles alertes'); return go('alerts', '', 'Analyse terminée : ' + n + ' nouvelle(s) alerte(s).'); }
    if (a === 'check-run') { const r = await siteCheck(); await alog('Vérification du site lancée à la main', '', r.total + ' point(s)'); return go('check', '', 'Vérification terminée : ' + (r.total ? r.total + ' point(s) à regarder.' : 'rien à signaler.')); }
    if (a === 'check-clear') { if (f.get('sure') !== 'oui') return go('check', '', 'Coche la case pour vider.'); await q("DELETE FROM docs WHERE store='diag'"); await siteCheck(); await alog('Signalements des navigateurs vidés'); return go('check', '', 'Signalements des navigateurs vidés.'); }
    if (a === 'check-mail') { if (!mailReady()) return go('check', '', 'L\'adresse d\'envoi n\'est pas encore configurée.'); const r = (await getDoc('admin', 'check')) || await siteCheck(); const to = (f.get('to') || SMTP.from).trim();
      try { await checkMail(r, to); return go('check', '', 'Rapport envoyé à ' + to + '.'); } catch (e) { return go('check', '', 'Échec de l\'envoi : ' + e.message); } }
    if (a === 'report-done') { const r = await getDoc('reports', id); if (r) { r.status = 'done'; r.doneAt = Date.now(); await putDoc('reports', id, r.by, r); await alog('Signalement traité', r.target, r.kind); } return go(back, backId, 'Signalement classé.'); }
    if (a === 'prop-done') { const r = await getDoc('proposals', id); if (r) { r.status = 'done'; r.doneAt = Date.now(); await putDoc('proposals', id, r.by, r); } return go('proposals', '', 'Proposition classée.'); }
    if (a === 'prop-mail') { if (!mailReady()) return go('proposals', '', 'L\'adresse d\'envoi n\'est pas encore configurée.');
      const to = (f.get('to') || SMTP.from).trim(); const all = f.get('all') === '1'; const txt = await proposalsText(all);
      try { await getMailer().sendMail({ from: `FeelShareLove <${SMTP.from}>`, to, subject: 'FeelShareLove · propositions et corrections (' + new Date().toISOString().slice(0, 10) + ')', text: 'Le fichier des propositions est joint.', attachments: [{ filename: 'propositions-feelsharelove.txt', content: txt }] });
        return go('proposals', '', 'Fichier envoyé à ' + to + '.'); } catch (e) { return go('proposals', '', 'Échec de l\'envoi : ' + e.message); } }
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
    /* accès perdu (plus de mot de passe ni d'accès à l'e-mail) : après vérification du mobile, l'équipe remplace l'adresse ; la personne fait ensuite « Mot de passe oublié » */
    if (a === 'set-mail') { const e = norm(f.get('mail')); if (f.get('sure') !== 'oui') return go(back, backId, 'Coche la case pour confirmer.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) || e.length > 200) return go(back, backId, 'Adresse e-mail invalide.');
      if ((await q('SELECT 1 FROM users WHERE email=$1', [e])).rowCount) return go(back, backId, 'Un autre compte utilise déjà cette adresse.');
      const old = (await q('SELECT email FROM users WHERE id=$1', [id])).rows[0]; if (!old) return go(back, backId, 'Compte introuvable.');
      await q('UPDATE users SET email=$2 WHERE id=$1', [id, e]); await q('DELETE FROM sessions WHERE user_id=$1', [id]);
      await alog('Adresse e-mail changée', id, old.email + ' → ' + e); return go(back, backId, 'Adresse changée. La personne peut maintenant faire « Mot de passe oublié ? » avec ' + e + '.'); }
    if (a === 'unpause') { const p = await getDoc('profiles', id); if (p) { delete p.paused; delete p.autoPaused; await putDoc('profiles', id, id, p); } await alog('Pause levée', id); return go(back, backId, 'Pause levée.'); }
    if (a === 'delete') {
      if (f.get('sure') !== 'oui') return go(back, backId, 'Suppression annulée : coche la case de confirmation.');
      const p = await getDoc('profiles', id); const u = (await q('SELECT email FROM users WHERE id=$1', [id])).rows[0];
      await wipeUser(id); await alog('Compte supprimé', id, [(p && p.pseudo) || '', u ? u.email : '', reason].filter(Boolean).join(' · ')); return go('accounts', '', 'Compte supprimé définitivement.');
    }
    if (a === 'fakes') { // profils de test : réécrit seulement les comptes marqués fake:true (photo et vérification gardées)
      const FK = require('./fakes.js'); const done = new Set(); let created = 0;
      const fill = async (old, fk) => {
        const p = { ...old, ...fk.p, id: old.id, fake: true }; if (!fk.p.travel) delete p.travel;
        await withGeo(p); await putDoc('profiles', old.id, old.id, p);
        await q("DELETE FROM docs WHERE store='entries' AND data->>'profileId'=$1", [old.id]);
        let i = 0; for (const e of fk.entries) { const eid = 'fk-' + old.id + '-' + (++i); await putDoc('entries', eid, old.id, { ...e, id: eid, profileId: old.id, __owner: old.id, ts: Date.now() - i * 864e5 }); } };
      for (const old of await listDocs('profiles')) {
        if (old.fake !== true) continue;
        const fk = FK.find(x => x.from.includes(old.pseudo)); if (!fk) continue;
        await fill(old, fk); done.add(fk);
      }
      /* personnages qui n'ont pas encore de compte : on le crée (adresse en .invalid, mot de passe aléatoire : personne ne peut s'y connecter) */
      for (const fk of FK) { if (done.has(fk) || !fk.create) continue;
        const id = uid(); const email = 'demo-' + norm(fk.p.pseudo).replace(/[^a-z0-9]/g, '') + '@demo.invalid';
        if ((await q('SELECT 1 FROM users WHERE email=$1', [email])).rowCount) continue;
        await q('INSERT INTO users (id,email,pass,created,no_mail) VALUES ($1,$2,$3,$4,true)', [id, email, hashPass(crypto.randomBytes(24).toString('hex')), Date.now()]);
        await fill({ id, onboardedAt: Date.now(), adultAt: Date.now() }, fk); created++; }
      await alog('Profils de démonstration remplis', '', created ? created + ' créés' : ''); return go('settings', '', 'Profils de démonstration remplis' + (created ? ` (${created} nouveaux)` : '') + '.');
    }
    if (a === 'fakes-delete') {
      if (f.get('sure') !== 'oui') return go('settings', '', 'Suppression annulée : coche la case de confirmation.');
      let n = 0; for (const p of await listDocs('profiles')) if (p.fake === true) { await wipeUser(p.id); n++; }
      await alog('Profils de test supprimés', '', n + ' comptes'); return go('settings', '', n + ' profils de test supprimés.');
    }
    if (a === 'redlist-save') { const c = await config();
      const lines = k => String(f.get(k) || '').split(/\r?\n/).map(x => x.trim()).filter(Boolean);
      c.redlist = { emails: [...new Set(lines('emails').map(norm))], phones: [...new Set(lines('phones').map(rlPhone).filter(x => x.length >= 7))],
        names: [...new Set(lines('names').map(x => { const w = x.split(/\s+/); return rlName(w[0], w.slice(1).join(' ')); }).filter(x => !x.endsWith('|')))] };
      await putDoc('admin', 'config', 'admin', c); await alog('Liste rouge modifiée', '', `${c.redlist.emails.length} adresses, ${c.redlist.phones.length} numéros, ${c.redlist.names.length} noms`);
      /* comptes déjà existants qui correspondent */
      let n = 0; for (const u of (await q('SELECT id, email FROM users WHERE NOT redlisted')).rows) { const p = (await getDoc('profiles', u.id)) || {}; const hits = await redHits(u.email, p.phone, p.name, p.lastName); if (hits.length) { await redMark(u.id, hits, 'déjà inscrit : '); n++; } }
      return go('redlist', '', 'Liste enregistrée' + (n ? ` · ${n} compte(s) existant(s) marqué(s)` : '')); }
    if (a === 'red-ok') { const p = await getDoc('profiles', id); if (p) { delete p.redlistCheck; await putDoc('profiles', id, id, p); } await alog('Liste rouge confirmée', id); return go('redlist'); }
    if (a === 'red-free') { await q('UPDATE users SET redlisted=false WHERE id=$1', [id]); const p = await getDoc('profiles', id); if (p) { delete p.redlisted; delete p.redlistCheck; await putDoc('profiles', id, id, p); } await alog('Liste rouge : compte libéré', id); return go('redlist'); }
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

  if (tab === 'propimg') { const fid = url.searchParams.get('id') || ''; const used = (await listDocs('proposals')).some(r => r.img === fid);
    const r = used ? await q('SELECT mime, data FROM files WHERE id=$1', [fid]) : { rowCount: 0 }; if (!r.rowCount || !IMG_MIME.has(r.rows[0].mime)) return send(res, 404, 'Introuvable', 'text/plain; charset=utf-8');
    /* servi uniquement comme image, jamais comme page : aucun script ne peut s'y exécuter */
    res.writeHead(200, { 'Content-Type': r.rows[0].mime, 'Cache-Control': 'private, max-age=86400', 'Content-Security-Policy': "default-src 'none'; sandbox", 'Content-Disposition': 'inline; filename="capture.jpg"' }); return res.end(r.rows[0].data); }
  if (tab === 'proposals' && url.searchParams.get('dl') === 'html') { const all = url.searchParams.get('all') === '1';
    const L = (await listDocs('proposals')).filter(r => all || r.status === 'open').sort((a, b) => (a.ts || 0) - (b.ts || 0)); const parts = [];
    for (const r of L) { const p = await getDoc('profiles', r.by); let img = '';
      if (r.img) { const f = await q('SELECT mime, data FROM files WHERE id=$1', [r.img]); if (f.rowCount && IMG_MIME.has(f.rows[0].mime)) img = `<img src="data:${f.rows[0].mime};base64,${f.rows[0].data.toString('base64')}" alt="">`; }
      parts.push(`<section><h2>${H(r.page || '')}${r.section ? ' › ' + H(r.section) : ''}</h2><p class="m">${fmtDT(r.ts)} · ${H(r.hash || '')} · langue ${H(r.lang || '')} · écran ${H(r.width || '')} px · ${H(p && p.pseudo || r.by)}${r.status === 'done' ? ' · classée' : ''}</p><p class="t">${H(r.text || '')}</p>${img}</section>`); }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Disposition': 'attachment; filename="propositions-feelsharelove-' + new Date().toISOString().slice(0, 10) + '.html"' });
    return res.end(`<!doctype html><html lang="fr"><meta charset="utf-8"><title>FeelShareLove · propositions</title><style>body{font:15px system-ui;max-width:1000px;margin:20px auto;padding:0 16px}section{border-top:1px solid #ccc;padding:12px 0}h2{font-size:17px;margin:0}.m{color:#666;font-size:13px}.t{white-space:pre-wrap}img{max-width:100%;border:1px solid #ccc}</style><h1>FeelShareLove — propositions et corrections</h1><p>${L.length} proposition(s) · exporté le ${fmtDT(Date.now())}</p>${parts.join('')}</html>`); }
  if (tab === 'proposals' && url.searchParams.get('dl')) { const txt = await proposalsText(url.searchParams.get('dl') === 'all');
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': 'attachment; filename="propositions-feelsharelove-' + new Date().toISOString().slice(0, 10) + '.txt"' }); return res.end(txt); }
  if (tab === 'check' && url.searchParams.get('dl')) { const r = (await getDoc('admin', 'check')) || await siteCheck();
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': 'attachment; filename="verification-feelsharelove-' + new Date(r.at).toISOString().slice(0, 10) + '.txt"' }); return res.end(checkText(r)); }
  /* ---------- données ---------- */
  const now = Date.now(), D7 = now - 7 * 864e5, D1 = now - 864e5;
  const users = (await q('SELECT id, email, created, banned, ban_reason, last_seen, invited_by, no_mail, redlisted FROM users ORDER BY created DESC')).rows;
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
  const alertsOpen = (await listDocs('alerts')).filter(r => r.status === 'open').sort((a, b) => (b.ts || 0) - (a.ts || 0));
  if (tab === 'alerts') { const w = (await getDoc('admin', 'watch')) || {}; const order = ['violence', 'sexuel', 'agression', 'detresse', 'arnaque', 'contact'];
    const card = r => `<div class="card"><b>${H(WATCH_LABEL[r.cat] || r.cat)}</b> · mot repéré : <b>${H(r.term)}</b> · <small>${fmtDT(r.ts)}</small>
      <p>${who(r.user)} · ${H(r.where)}</p><div class="copy">${H(r.before)}<mark>${H(r.hit)}</mark>${H(r.after)}</div>
      <div>${btn('alert-done', r.id, 'Classer')} ${btn('warn', r.user, 'Avertir', reasonSel)} ${btn('ban', r.user, 'Suspendre', reasonSel, 'danger')}</div></div>`;
    body = `<h2>Alertes à lire (${alertsOpen.length})</h2>
      <p class="muted">Une fois par jour, le serveur relit les contenus visibles par les autres membres (portraits, « en ce moment », pourquoi des entrées, questions ouvertes, cercles) et repère des mots liés à la violence, aux arnaques ou à la détresse, dans les six langues. Les messages privés ne sont pas analysés. Un mot repéré n'est pas une faute : lis l'extrait avant de décider. Une alerte classée ne revient pas tant que le texte ne change pas.</p>
      <div class="card">Dernière analyse : ${w.at ? fmtDT(w.at) + ' · ' + (w.found || 0) + ' passage(s) repéré(s), dont ' + (w.fresh || 0) + ' nouveau(x)' : 'pas encore faite'} ${btn('alert-scan', '', 'Analyser maintenant')} ${alertsOpen.length ? btn('alert-all', '', 'Tout classer', sure('Je confirme'), 'danger') : ''}</div>
      ${order.map(c => { const l = alertsOpen.filter(r => r.cat === c); return l.length ? `<h2>${H(WATCH_LABEL[c])} (${l.length})</h2>${l.map(card).join('')}` : ''; }).join('') || '<p class="muted">Aucune alerte.</p>'}`; }
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
      <div class="card"><b>Accès perdu</b><p class="muted" style="font-size:13px;margin:6px 0">Si la personne n'a plus son mot de passe ni accès à son adresse e-mail : vérifie que le numéro de mobile qu'elle t'écrit est bien celui de la ligne « Mobile » ci-dessous, puis remplace son adresse. Elle fera ensuite « Mot de passe oublié ? » avec la nouvelle adresse.</p>
        ${btn('set-mail', id, 'Changer l\'adresse e-mail', '<input name="mail" type="email" placeholder="nouvelle adresse e-mail" style="min-width:240px"> ' + sure('J\'ai vérifié le mobile'))}</div>
      <h2>Identité</h2><table>${row('Prénom et nom', H([p.name, p.lastName].filter(Boolean).join(' ')))}${row('E-mail', H(u.email) + (u.no_mail ? ' <span class="tag">ne veut pas d\'e-mails</span>' : ''))}${row('Mobile', H(p.phone || '') || '<span class="muted">non indiqué</span>')}${row('Accord', H({ m: 'masculin', f: 'féminin', n: 'neutre' }[p.accord] || ''))}
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
  if (tab === 'redlist') { const r = await redlist(); const flagged = users.filter(u => u.redlisted);
    const row = u => { const p = profiles[u.id] || {}; return `<tr><td>${who(u.id)}<br><small>${H(u.email)}</small></td><td>${H(p.name || '')} ${H(p.lastName || '')}<br><small>${H(p.phone || '')}</small></td><td>${p.redlistCheck ? '<span class="tag y">nom seulement : à confirmer</span>' : '<span class="tag red">bloqué</span>'}</td><td>${p.redlistCheck ? btn('red-ok', u.id, 'Confirmer le blocage') : ''}${btn('red-free', u.id, 'Libérer ce compte', sure('Je confirme'))}</td></tr>`; };
    body = `<h2>Liste rouge</h2><p class="muted">Les personnes de cette liste ne peuvent pas entrer, sans le savoir : à l'inscription, l'écran « Regarde tes e-mails » s'affiche mais rien ne part ; si elles entrent par une autre adresse, leur numéro de mobile ou leur prénom et nom les met en pause silencieuse (elles voient leur portrait, personne ne les voit, elles ne voient personne). Aucun e-mail, aucun message ne leur est jamais envoyé.</p>
      <form method="post" class="card"><input type="hidden" name="a" value="redlist-save">
        <div class="grid"><div><b>Adresses e-mail</b> <small>(une par ligne)</small><textarea name="emails">${H(r.emails.join('\n'))}</textarea></div>
        <div><b>Numéros de mobile</b> <small>(une par ligne, avec ou sans indicatif)</small><textarea name="phones">${H(r.phones.join('\n'))}</textarea></div>
        <div><b>Prénom et nom</b> <small>(une personne par ligne : prénom, puis nom)</small><textarea name="names">${H(r.names.map(x => x.replace('|', ' ')).join('\n'))}</textarea></div></div>
        <p><button class="flame" type="submit">Enregistrer la liste</button> <small class="muted">Les comptes déjà inscrits qui correspondent sont marqués aussitôt.</small></p></form>
      <h2>Comptes concernés (${flagged.length})</h2>${flagged.length ? `<table><tr><th>Compte</th><th>Prénom, nom, mobile</th><th>État</th><th></th></tr>${flagged.map(row).join('')}</table>` : '<p class="muted">Aucun.</p>'}`; }
  if (tab === 'proposals') { const all = (await listDocs('proposals')).sort((a, b) => (b.ts || 0) - (a.ts || 0)); const open = all.filter(r => r.status === 'open');
    body = `<h2>Propositions et corrections (${open.length} à lire)</h2>
      <div class="card"><a class="flame" style="text-decoration:none;padding:8px 12px;border-radius:10px;display:inline-block" href="/admin?key=${K}&tab=proposals&dl=open">Télécharger le fichier (à lire)</a> <a href="/admin?key=${K}&tab=proposals&dl=all">tout télécharger, classées comprises</a> · <a href="/admin?key=${K}&tab=proposals&dl=html">fichier avec les captures (.html)</a> · <a href="/admin?key=${K}&tab=proposals&dl=html&all=1">avec les captures, classées comprises</a>
        <form method="post" style="margin-top:10px"><input type="hidden" name="a" value="prop-mail"><input name="to" value="${H(SMTP.from)}" style="min-width:240px"> <label class="muted" style="font-size:13px"><input type="checkbox" name="all" value="1"> classées comprises</label> <button type="submit">Recevoir le fichier par e-mail</button></form></div>
      ${open.map(r => `<div class="card"><b>${H(r.page || '')}${r.section ? ' › ' + H(r.section) : ''}</b> · <small>${fmtDT(r.ts)} · langue ${H(r.lang || '')} · ${who(r.by)}</small><div class="copy">${H(r.text || '')}</div>${r.img ? `<a href="/admin?key=${K}&tab=propimg&id=${encodeURIComponent(r.img)}" target="_blank"><img src="/admin?key=${K}&tab=propimg&id=${encodeURIComponent(r.img)}" alt="capture" style="max-width:320px;border-radius:8px;border:1px solid #333;display:block;margin:6px 0"></a>` : ''}${btn('prop-done', r.id, 'Classer')}</div>`).join('') || '<p class="muted">Aucune proposition à lire.</p>'}`; }
  if (tab === 'check') { const r = await getDoc('admin', 'check');
    body = `<h2>Vérification du site</h2>
      <div class="card">${r ? 'Dernière vérification : ' + fmtDT(r.at) + ' · ' + (r.total ? '<b>' + r.total + ' point(s) à regarder</b>' : 'rien à signaler') + ' · ' + r.nFiles + ' fichiers, ' + r.nKeys + ' phrases par langue, ' + r.nExt + ' liens extérieurs' : 'Pas encore faite.'}
        <div style="margin-top:8px">${btn('check-run', '', 'Vérifier maintenant')} ${r ? `<a href="/admin?key=${K}&tab=check&dl=1">Télécharger le rapport (.txt)</a>` : ''}</div>
        <form method="post" style="margin-top:10px"><input type="hidden" name="a" value="check-mail"><input name="to" value="${H(SMTP.from)}" style="min-width:240px"> <button type="submit">Recevoir le rapport par e-mail</button></form>
        <p class="muted" style="font-size:13px">Faite chaque jour, et cinq minutes après chaque redéploiement. Le rapport part par e-mail une fois par jour à ${H(SMTP.from || '(adresse non configurée)')}.</p></div>
      ${r ? CHECK_TITLES.map(([k, t]) => { const L = r.sec[k] || []; return `<h2>${H(t)} (${L.length})</h2>` + (L.length ? `<div class="card"><div class="copy">${L.slice(0, 200).map(x => H('- ' + x)).join('\n')}${L.length > 200 ? '\n… et ' + (L.length - 200) + ' autres' : ''}</div></div>` : '<p class="muted">Aucun.</p>'); }).join('') : ''}
      ${r && (r.sec.js.length || r.sec.i18n.length) ? `<div class="card">Une fois les corrections déployées : ${btn('check-clear', '', 'Vider les signalements des navigateurs', sure('Je confirme'), 'danger')}</div>` : ''}`; }
  if (tab === 'settings') { const c = await config(); const nf = Object.values(profiles).filter(p => p.fake === true).length;
    body = `<h2>Inscriptions</h2><div class="card">Les inscriptions sont <b>${c.closed ? 'fermées' : 'ouvertes'}</b>.${c.closed ? ' Seules les personnes avec un lien d\'invitation d\'un membre peuvent entrer.' : ''}<div style="margin-top:8px">${btn('closed', '', c.closed ? 'Ouvrir les inscriptions' : 'Fermer les inscriptions', `<input type="hidden" name="v" value="${c.closed ? '0' : '1'}">`)}</div></div>
      <h2>Profils de démonstration (${nf})</h2><div class="card"><p class="muted">Dix personnages inventés : Elio, Nora, Paul, Claire et André (portraits en français), Lena (allemand), Owen (anglais), Giulia (italien), Mateo (espagnol) et Inês (portugais). Ils portent l'étiquette « profil de démonstration » dans l'app. Le bouton les met à jour et crée ceux qui manquent. À garder au début pour que les premiers inscrits comprennent comment ça marche.</p>
        ${btn('fakes', '', 'Remplir les profils de démonstration')} ${btn('fakes-delete', '', 'Supprimer les profils de démonstration', sure('Je confirme'), 'danger')}</div>`; }

  const tabs = [['dash', 'Tableau de bord'], ['reports', 'Signalements', reports.length], ['alerts', 'Alertes', alertsOpen.length], ['proposals', 'Propositions', (await listDocs('proposals')).filter(r => r.status === 'open').length], ['verif', 'Vérifications', pend.length], ['accounts', 'Comptes'], ['mail', 'E-mails'], ['redlist', 'Liste rouge', Object.values(profiles).filter(p => p.redlistCheck).length], ['check', 'Vérification', ((await getDoc('admin', 'check')) || {}).total || 0], ['log', 'Journal'], ['settings', 'Réglages']];
  const html = `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FeelShareLove · admin</title>
<link rel="stylesheet" href="/fonts/fonts.css"><style>${ADMIN_CSS}</style>
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

/* ---------- en-têtes de sécurité, sur toutes les réponses ---------- */
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; media-src 'self' data: blob:; connect-src 'self' https://*.wikipedia.org https://api.bigdatacloud.net; worker-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
function secure(res, pathname) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(self), microphone=(self)');
  const priv = pathname === '/admin' || pathname.startsWith('/debug') || pathname === '/compte/supprimer';
  res.setHeader('Referrer-Policy', priv ? 'no-referrer' : 'strict-origin-when-cross-origin'); // l'adresse de l'admin (avec sa clé) ne part jamais ailleurs
  /* obligatoire depuis la v1.18.0 : aucun script étranger ou écrit dans la page ne s'exécute */
  res.setHeader('Content-Security-Policy', priv ? "default-src 'none'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; form-action 'self'; base-uri 'none'; frame-ancestors 'none'" : CSP);
}
/* une erreur oubliée ne doit pas arrêter le serveur : elle est notée et il continue */
process.on('unhandledRejection', e => { console.error('promesse rejetée', e); logErr('serveur', 'promesse rejetée : ' + (e && e.message || e), { stack: String(e && e.stack || '').slice(0, 1500) }); });
process.on('uncaughtException', e => { console.error('exception', e); logErr('serveur', 'exception : ' + (e && e.message || e), { stack: String(e && e.stack || '').slice(0, 1500) }); });

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  secure(res, url.pathname);
  try {
    if (url.pathname === '/health') return send(res, 200, { ok: true });
    if (url.pathname === '/unsub') return await unsub(res, url);
    if (url.pathname === '/compte/supprimer') return await delPage(req, res, url);
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
  setInterval(checkTick, 864e5); setTimeout(checkTick, 3e5); // vérification du site : cinq minutes après le démarrage, puis une fois par jour
  setInterval(watchTick, 864e5); setTimeout(watchTick, 12e4); // veille des contenus publics : deux minutes après le démarrage, puis une fois par jour
  console.log('FeelShareLove sur le port ' + PORT);
});
