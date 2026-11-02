// Agenda professionnel de Marc Isenschmid — rdv.guerir.ch
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { db, get, set, tarifs, types, addHist } = require('./lib/db');
const U = require('./lib/util');
const R = require('./lib/rdv');
const { esc, eur, longDate, shortDate, hfmt, endH } = U;

const PORT = Number(process.env.PORT || 8092);
if (!get('mig_ref_ext')) { db.prepare("UPDATE rdvs SET ref_ext=note, note='' WHERE note LIKE 'Koalendar %'").run(); set('mig_ref_ext', '1'); }
if (!get('mig_koalendar_ack')) {
  db.prepare("UPDATE rdvs SET a_confirmer=1 WHERE ref_ext LIKE 'Koalendar %' AND ack_at IS NULL AND statut<>'off'").run();
  db.prepare("UPDATE rdvs SET rappel_seance_sent=0 WHERE ref_ext LIKE 'Koalendar %' AND date>=?").run(U.today());
  set('mig_koalendar_ack', '1');
}
if (!get('mig_koalendar_meet')) { db.prepare("UPDATE rdvs SET meet='' WHERE ref_ext LIKE 'Koalendar %'").run(); set('mig_koalendar_meet', '1'); }
const ADMIN_USER = process.env.ADMIN_USER || 'marc';
const ADMIN_PASS = process.env.ADMIN_PASS || '';
const VERSION = require('./package.json').version;
const CSS = fs.readFileSync(path.join(__dirname, 'public', 'style.css'));
const DEV = U.SITE_URL.startsWith('http://localhost');

// ---------- outils HTTP ----------
function send(res, code, html, headers = {}) { res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8', ...headers }); res.end(html); }
function go(res, url) { res.writeHead(303, { Location: url }); res.end(); }
function readForm(req) {
  return new Promise((resolve, reject) => {
    let b = '';
    req.on('data', (c) => { b += c; if (b.length > 200000) { reject(new Error('trop gros')); req.destroy(); } });
    req.on('end', () => resolve(Object.fromEntries(new URLSearchParams(b))));
    req.on('error', reject);
  });
}
const flashOf = (q) => q.get('ok') ? `<div class="flash">${esc(q.get('ok'))}</div>` : q.get('err') ? `<div class="flash err">${esc(q.get('err'))}</div>` : '';
const withMsg = (url, ok, msg) => url + (url.includes('?') ? '&' : '?') + (ok ? 'ok=' : 'err=') + encodeURIComponent(msg);
const FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Karla:wght@400;500;700&display=swap">';
const head = (title) => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title>${FONTS}<link rel="stylesheet" href="/style.css?v=${VERSION}"></head><body>`;

// ---------- admin : session ----------
const isAdmin = (req) => { const p = U.verify(U.parseCookies(req).adm); return !!(p && p.u === ADMIN_USER); };
function layout(title, active, body, q) {
  const nav = [['/admin', 'agenda', 'Agenda'], ['/admin/rdv', 'rdv', 'Rendez-vous'], ['/admin/clients', 'clients', 'Patients'], ['/admin/emails', 'emails', 'E-mails'], ['/admin/reglages', 'reglages', 'Réglages']];
  return head(title + ' — Agenda') + `<div class="app"><nav class="side" aria-label="Menu"><div class="brand">Agenda<small>Marc Isenschmid</small></div>
${nav.map(([h, k, l]) => `<a href="${h}" class="${k === active ? 'on' : ''}">${l}</a>`).join('')}
<a class="bottom" href="/admin/deconnexion">Déconnexion</a></nav>
<main>${q ? flashOf(q) : ''}${body}</main></div></body></html>`;
}
const pill = (s) => `<span class="pill ${R.STATUTS[s].cls}">${R.STATUTS[s].label}</span>`;
const civAbr = (c) => (c.civ === 'Monsieur' ? 'M.' : 'Mme');

// ---------- admin : agenda (semaine) ----------
function pageAgenda(q) {
  const auj = U.today();
  const w = /^\d{4}-\d{2}-\d{2}$/.test(q.get('w') || '') ? U.mondayOf(q.get('w')) : U.mondayOf(auj);
  const days = [0, 1, 2, 3, 4, 5, 6].map((i) => U.addDays(w, i));
  const H0 = 9, H1 = 21, PX = 56;
  const rows = db.prepare('SELECT r.*, c.civ, c.nom, c.prenom FROM rdvs r JOIN clients c ON c.id=r.client_id WHERE r.date BETWEEN ? AND ? ORDER BY r.date, r.heure').all(days[0], days[6]);
  let hours = ''; for (let h = H0; h < H1; h++) hours += `<div>${h}h</div>`;
  const ev = (r, place, jour) => {
    const [a, b] = r.heure.split(':').map(Number);
    const top = Math.max(0, (a * 60 + b - H0 * 60) / 60 * PX), hgt = Math.max(24, r.duree / 60 * PX - 3);
    return `<a class="ev ${R.STATUTS[r.statut].cls}" style="top:${top}px;height:${hgt}px;${place}" href="/admin/rdv/${r.id}" title="${esc(R.STATUTS[r.statut].label)}"><b>${jour ? jour + ' ' : ''}${hfmt(r.heure)} · ${esc(`${r.prenom} ${r.nom}`.trim())}</b>${r.note ? `<span class="ev-note">${esc(r.note)}</span>` : ''}</a>`;
  };
  const semaine = days.slice(0, 5).map((d) => `<div class="day" data-day="${d}" style="height:${(H1 - H0) * PX}px">${rows.filter((r) => r.date === d).map((r) => ev(r, '')).join('')}</div>`).join('');
  const sam = rows.filter((r) => r.date === days[5]), dim = rows.filter((r) => r.date === days[6]);
  const we = `<div class="day we" style="height:${(H1 - H0) * PX}px">${sam.concat(dim).map((r) => { const [a, b] = r.heure.split(':').map(Number); return `<a class="ev ev-we ${R.STATUTS[r.statut].cls}" style="top:${Math.max(0, (a * 60 + b - H0 * 60) / 60 * PX)}px;height:24px" href="/admin/rdv/${r.id}" title="${esc(`${r.date === days[5] ? 'Samedi' : 'Dimanche'} ${hfmt(r.heure)} · ${r.prenom} ${r.nom}`)}">•</a>`; }).join('')}</div>`;
  const [, m6] = days[6].split('-').map(Number);
  const label = `${Number(days[0].slice(8))} – ${Number(days[6].slice(8))} ${U.MOIS[m6 - 1]} ${days[6].slice(0, 4)}`;
  return `<div class="head"><h1>Agenda</h1>
<a class="icon" href="/admin?w=${U.addDays(w, -7)}" aria-label="Semaine précédente">‹</a><span class="week-label">${label}</span><a class="icon" href="/admin?w=${U.addDays(w, 7)}" aria-label="Semaine suivante">›</a>
<a class="btn ghost small" href="/admin">Aujourd'hui</a><a class="btn" href="/admin/rdv/nouveau">Nouveau rendez-vous</a></div>
<div class="legend">${Object.values(R.STATUTS).map((st) => `<span><i class="dot ${st.cls}" style="background:currentColor"></i>${st.label}</span>`).join('')}</div>
<div class="cal-wrap"><div class="cal"><div class="dh"></div>
${days.slice(0, 5).map((d) => `<div class="dh ${d === auj ? 'today' : ''}">${U.JOURS[U.dow(d)].slice(0, 3)}<b>${Number(d.slice(8))}</b></div>`).join('')}
<div class="dh dh-we">W-E</div>
<div class="hours">${hours}</div>${semaine}${we}</div></div>
<p class="hint">Cliquez sur une plage vide pour créer un rendez-vous à cette heure , ou sur un rendez-vous pour le gérer.</p>
<script>document.querySelectorAll('[data-day]').forEach(function(col){col.addEventListener('click',function(e){if(e.target.closest('a'))return;var y=e.clientY-col.getBoundingClientRect().top;var m=Math.floor(y/${PX / 2})*30+${H0 * 60};var h=String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');location.href='/admin/rdv/nouveau?date='+col.dataset.day+'&heure='+h;});});</script>`;
}

// ---------- admin : liste ----------
function pageListe(q) {
  const f = q.get('f') || 'avenir';
  const auj = U.today();
  const where = { aconf: "r.a_confirmer=1 AND r.statut<>'off'", avenir: 'r.date>=?', wait: "r.statut='wait'", pay: "r.statut='pay'", ok: "r.statut='ok'", off: "r.statut='off'", passes: 'r.date<?' }[f] || 'r.date>=?';
  const params = (f === 'avenir' || f === 'passes' || !['wait', 'pay', 'ok', 'off', 'aconf'].includes(f)) ? [auj] : [];
  const order = f === 'passes' ? 'DESC' : 'ASC';
  const list = db.prepare(`SELECT r.*, c.civ, c.nom, c.prenom, c.email FROM rdvs r JOIN clients c ON c.id=r.client_id WHERE ${where} ORDER BY r.date ${order}, r.heure ${order} LIMIT 300`).all(...params);
  const n = (s) => db.prepare('SELECT COUNT(*) n FROM rdvs WHERE statut=?').get(s).n;
  const fl = [['avenir', 'À venir'], ['wait', `En attente du oui (${n('wait')})`], ['pay', `À payer (${n('pay')})`], ['ok', 'Payés'], ['off', 'Annulés'], ['passes', 'Passés'], ['aconf', `Réception à confirmer (${db.prepare("SELECT COUNT(*) n FROM rdvs WHERE a_confirmer=1 AND statut<>'off'").get().n})`]];
  return `<div class="head"><h1>Rendez-vous</h1><a class="btn" href="/admin/rdv/nouveau">Nouveau rendez-vous</a></div>
<div class="filters">${fl.map(([k, l]) => `<a class="chip ${f === k ? 'on' : ''}" href="/admin/rdv?f=${k}">${l}</a>`).join('')}</div>
<div class="tbl-wrap"><table><thead><tr><th>Date</th><th>Patient</th><th>Séance</th><th>Prix</th><th>Statut</th></tr></thead><tbody>
${list.map((r) => `<tr class="click" onclick="location.href='/admin/rdv/${r.id}'"><td class="num"><a href="/admin/rdv/${r.id}">${shortDate(r.date)} · ${hfmt(r.heure)}</a></td><td>${esc(r.civ)} ${esc(r.prenom)} ${esc(r.nom)}</td><td>${esc(r.type_nom)}</td><td class="num">${eur(r.prix)}</td><td>${pill(r.statut)}${r.a_confirmer ? ' <span class="pill s-wait">réception à confirmer</span>' : ''}</td></tr>`).join('') || '<tr><td colspan="5">Aucun rendez-vous.</td></tr>'}
</tbody></table></div>
<form class="box form" method="post" action="/admin/rdv/import" style="max-width:640px;margin-top:20px">
<h3 style="font-size:22px">Importer des rendez-vous Koalendar</h3>
<p class="hint" style="margin:0">Export « bookings » de Koalendar (CSV). Les rendez-vous payés sont enregistrés comme payés ; les coordonnées manquantes des patients sont complétées. Les rendez-vous déjà importés sont ignorés. <b>Aucun e-mail n'est envoyé</b>, ni maintenant ni en rappel (Koalendar s'en charge).</p>
<input type="file" id="csv-file" accept=".csv,text/csv">
<textarea name="csv" id="csv-text" hidden></textarea>
<div class="actions"><button class="btn" id="csv-go" disabled>Importer</button></div>
</form>
<script>document.getElementById('csv-file').addEventListener('change',function(e){var f=e.target.files[0];if(!f)return;var r=new FileReader();r.onload=function(){document.getElementById('csv-text').value=r.result;document.getElementById('csv-go').disabled=false;};r.readAsText(f,'utf-8');});</script>`;
}

// ---------- admin : formulaire rendez-vous (nouveau / modifier) ----------
function formRdv(r, q, client) {
  const isNew = !r;
  const tf = tarifs();
  const prix = r ? Number(r.prix) : tf[tf.length - 1];
  const autre = r ? !tf.includes(prix) : false;
  const ty = types();
  const clients = db.prepare('SELECT id, civ, prenom, nom, email FROM clients ORDER BY nom, prenom').all();
  const preClient = client ? client.id : Number(q.get('client') || 0);
  return `<div class="head"><h1>${isNew ? 'Nouveau rendez-vous' : 'Modifier le rendez-vous'}</h1><a class="btn ghost" href="${isNew ? '/admin' : '/admin/rdv/' + r.id}">Annuler</a></div>
<div class="box" style="max-width:640px"><form class="form" method="post">
${isNew ? `<div class="seg" role="group" aria-label="Patient">
  <input type="radio" name="mode" id="m-ex" value="ex" ${clients.length ? 'checked' : ''}><label for="m-ex">Patient existant</label>
  <input type="radio" name="mode" id="m-nw" value="nw" ${clients.length ? '' : 'checked'}><label for="m-nw">Nouveau patient</label></div>
<div id="bloc-ex" class="form"><label>Patient<input id="cl-q" type="search" placeholder="Tapez les premières lettres du nom ou du prénom" autocomplete="off"></label>
<select name="client_id" id="cl-sel" size="6" required aria-label="Patients trouvés">${clients.map((c) => `<option value="${c.id}" ${c.id === preClient ? 'selected' : ''}>${esc(c.nom)} ${esc(c.prenom)} — ${esc(c.email)}</option>`).join('')}</select>
<small class="hint" id="cl-n" style="margin:0"></small></div>
<script>(function(){var q=document.getElementById('cl-q'),sel=document.getElementById('cl-sel'),n=document.getElementById('cl-n');if(!q)return;
var all=[].map.call(sel.options,function(o){return{v:o.value,t:o.text,sel:o.selected}});
var norm=function(x){return x.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()};
function draw(){var k=norm(q.value.trim()),cur=sel.value,list=all.filter(function(o){if(!k)return true;var t=norm(o.t);return t.split(/[\s\-—@.]+/).some(function(w){return w.indexOf(k)===0})||t.indexOf(k)>=0});
sel.innerHTML='';list.forEach(function(o){var e=document.createElement('option');e.value=o.v;e.text=o.t;sel.appendChild(e)});
if(list.some(function(o){return o.v===cur}))sel.value=cur;else if(list.length)sel.selectedIndex=0;
n.textContent=k?(list.length+' patient'+(list.length>1?'s':'')+' trouvé'+(list.length>1?'s':'')):''}
q.addEventListener('input',draw);q.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();sel.focus()}});draw();})();</script>
<div id="bloc-nw" class="form">
  <div class="row"><label>Civilité<select name="civ"><option>Madame</option><option>Monsieur</option></select></label><label>Prénom<input name="prenom"></label></div>
  <div class="row"><label>Nom<input name="nom"></label><label>E-mail<input name="email" type="email" placeholder="adresse@exemple.fr"></label></div>
  <div class="note">Le reste des coordonnées (date de naissance, adresse, mobile) sera rempli par le patient en confirmant ce premier rendez-vous.</div>
</div>` : `<p style="margin:0"><b>${esc(client.civ)} ${esc(R.nomComplet(client))}</b> — ${esc(client.email)}</p>`}
<label>Type de séance<select name="type" id="f-type">${ty.map((t) => `<option value="${esc(t.nom)}" data-d="${t.duree}" ${r && r.type_nom === t.nom ? 'selected' : ''}>${esc(t.nom)} · ${t.duree} min</option>`).join('')}${r && !ty.some((t) => t.nom === r.type_nom) ? `<option selected>${esc(r.type_nom)}</option>` : ''}</select></label>
<div class="row"><label>Date<input name="date" type="date" required value="${esc(r ? r.date : (q.get('date') || U.today()))}"></label><label>Heure<input name="heure" type="time" step="900" required value="${esc(r ? r.heure : (q.get('heure') || '10:00'))}"></label></div>
<div><div class="flabel">Prix</div><div class="chips">
${tf.map((p) => `<input type="radio" name="prix_choix" id="p${p}" value="${p}" ${!autre && prix === p ? 'checked' : ''}><label for="p${p}">${eur(p)}</label>`).join('')}
<input type="radio" name="prix_choix" id="p-autre" value="autre" ${autre ? 'checked' : ''}><label for="p-autre">Rabais : autre montant</label></div>
<label id="bloc-autre" style="margin-top:10px">Montant avec rabais (€)<input name="prix_autre" type="number" min="0" step="1" value="${autre ? prix : ''}"></label></div>
<div class="row"><label>Durée (min)<input name="duree" id="f-dur" type="number" min="15" step="5" value="${r ? r.duree : (ty[0]?.duree || 60)}"></label><label>Lien Google Meet<input name="meet" value="${esc(r ? r.meet : get('meet'))}" placeholder="https://meet.google.com/..."></label></div>
<label>Note interne <small>(non visible du patient)</small><textarea name="note" rows="2">${esc(r ? r.note : '')}</textarea></label>
${isNew ? '<label class="check"><input type="checkbox" name="envoyer" value="1" checked> Envoyer tout de suite l\'e-mail de confirmation au patient</label>'
    : (r.statut !== 'off' ? '<label class="check"><input type="checkbox" name="prevenir" value="1" checked> Prévenir le patient par e-mail si la date, l\'heure ou le prix change</label>' : '')}
<div class="actions"><button class="btn">${isNew ? 'Créer le rendez-vous' : 'Enregistrer'}</button></div>
</form></div>
<script>
(function(){var t=document.getElementById('f-type'),d=document.getElementById('f-dur');t.addEventListener('change',function(){var o=t.options[t.selectedIndex];if(o.dataset.d)d.value=o.dataset.d;});
function sync(){var a=document.getElementById('p-autre');document.getElementById('bloc-autre').hidden=!a.checked;var ex=document.getElementById('m-ex');if(ex){document.getElementById('bloc-ex').hidden=!ex.checked;document.getElementById('bloc-nw').hidden=ex.checked;}}
document.querySelectorAll('input[type=radio]').forEach(function(i){i.addEventListener('change',sync);});sync();})();
</script>`;
}
function lirePrix(f) {
  const v = f.prix_choix === 'autre' ? Number(f.prix_autre) : Number(f.prix_choix);
  return Number.isFinite(v) && v >= 0 ? Math.round(v * 100) / 100 : null;
}
const okDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
const okHeure = (s) => /^\d{2}:\d{2}$/.test(s || '');

async function creerRdv(f) {
  let clientId;
  if (f.mode === 'nw') {
    const email = (f.email || '').trim().toLowerCase();
    if (!f.prenom?.trim() || !f.nom?.trim() || !/^\S+@\S+\.\S+$/.test(email)) throw new Error('Indiquez le prénom, le nom et une adresse e-mail valide du nouveau patient.');
    const ex = db.prepare('SELECT id FROM clients WHERE lower(email)=?').get(email);
    clientId = ex ? ex.id : Number(db.prepare('INSERT INTO clients(civ,prenom,nom,email) VALUES(?,?,?,?)').run(f.civ || 'Madame', f.prenom.trim(), f.nom.trim(), email).lastInsertRowid);
  } else {
    clientId = Number(f.client_id);
    if (!R.clientGet(clientId)) throw new Error('Choisissez un patient.');
  }
  const prix = lirePrix(f);
  if (prix === null) throw new Error('Choisissez un prix ou indiquez le montant avec rabais.');
  if (!okDate(f.date) || !okHeure(f.heure)) throw new Error('Date ou heure invalide.');
  const id = Number(db.prepare('INSERT INTO rdvs(client_id,type_nom,date,heure,duree,prix,meet,note,token) VALUES(?,?,?,?,?,?,?,?,?)')
    .run(clientId, f.type || '', f.date, f.heure, Number(f.duree) || 60, prix, (f.meet || '').trim(), f.note || '', U.randomToken()).lastInsertRowid);
  addHist(id, 'Rendez-vous créé');
  if (f.envoyer) await R.envoyerInvitation(R.rdvGet(id));
  await R.syncGoogle(id);
  return id;
}

// ---------- admin : fiche rendez-vous ----------
function pageRdv(r, q) {
  const c = R.clientGet(r.client_id);
  const hist = db.prepare('SELECT * FROM hist WHERE rdv_id=? ORDER BY id').all(r.id);
  const ann = q.get('annuler') === '1' && r.statut !== 'off';
  let info = '';
  if (r.a_confirmer && r.statut === 'ok') info = 'Le patient n\'a pas encore confirmé avoir reçu ce rendez-vous (bouton « Confirmer ce rendez-vous » dans l\'e-mail envoyé depuis le menu E-mails). ';
  if (r.statut === 'wait') info = `Sans réponse du patient ${get('delai')} h après l'envoi, une alerte part à ${esc(get('alerte'))}.`;
  if (r.statut === 'pay') info = `${r.rappel_pay ? `Rappel de paiement ${r.rappel_pay_sent ? 'envoyé' : 'prévu'} le ${shortDate(r.rappel_pay)}. ` : ''}Échéance de paiement : ${shortDate(R.echeance(r))}. Si la séance n'est pas payée à cette date, une alerte part à ${esc(get('alerte'))}.`;
  return `<div class="head"><h1>${esc(c.civ)} ${esc(R.nomComplet(c))}</h1><a class="btn ghost" href="/admin?w=${r.date}">Voir dans l'agenda</a></div>
<div class="cols"><div class="box">
${pill(r.statut)}
<dl class="kv"><dt>Date</dt><dd>${longDate(r.date)}</dd><dt>Heure</dt><dd>${hfmt(r.heure)} – ${hfmt(endH(r.heure, r.duree))}</dd>
<dt>Séance</dt><dd>${esc(r.type_nom)} · ${eur(r.prix)}</dd>${(() => { const hp = U.horaire(r.date, r.heure, r.duree, c.tz); return hp.pareil ? '' : `<dt>Chez le patient</dt><dd>${hp.jour}, ${hp.debut} – ${hp.fin} (${esc(hp.ville)})</dd>`; })()}<dt>Visio</dt><dd>${/^https?:\/\//.test(R.meetOf(r)) ? `<a href="${esc(R.meetOf(r))}" target="_blank" rel="noopener">${esc(R.meetOf(r))}</a><br><a class="btn small" style="margin-top:6px" href="${esc(R.meetOf(r))}" target="_blank" rel="noopener">Lancer la visio</a>` : esc(R.meetOf(r) || 'aucun lien — à indiquer dans Réglages')}</dd>
<dt>E-mail</dt><dd>${esc(c.email)}</dd><dt>Mobile</dt><dd>${esc(c.mobile || 'pas encore fourni')}</dd>
${r.paid_at ? `<dt>Payé</dt><dd>${U.stamp(r.paid_at)} (${esc(r.pay_method)})</dd>` : ''}
${r.note ? `<dt>Note</dt><dd>${esc(r.note)}</dd>` : ''}</dl>
${info ? `<div class="note">${info}</div>` : ''}
<div class="actions">
<a class="btn small" href="/admin/rdv/${r.id}/apercu">Voir l'e-mail du patient</a>
${r.statut !== 'off' ? `<a class="btn small ghost" href="/admin/rdv/${r.id}/modifier">Modifier</a>` : ''}
${r.statut === 'wait' || r.statut === 'pay' ? `<form method="post" action="/admin/rdv/${r.id}/renvoyer"><button class="btn small ghost">Renvoyer l'e-mail</button></form>` : ''}
${r.statut !== 'off' ? `<a class="btn small ghost" href="/admin/rdv/${r.id}?annuler=1">Annuler le rendez-vous</a>` : ''}
</div>
${ann ? `<form class="box form" style="margin-top:14px;background:var(--bg)" method="post" action="/admin/rdv/${r.id}/annuler">
<b>Annuler ce rendez-vous ?</b>
<label class="check"><input type="checkbox" name="prevenir" value="1" checked> Prévenir le patient par e-mail</label>
${r.statut === 'ok' && r.mollie_id ? `<label class="check"><input type="checkbox" name="rembourser" value="1"> Rembourser ${eur(r.prix)} au patient (${r.mollie_id.startsWith('cs_') ? 'Stripe' : 'Mollie'})</label>` : ''}
<div class="actions"><button class="btn small danger">Oui, annuler</button><a class="btn small ghost" href="/admin/rdv/${r.id}">Non</a></div></form>` : ''}
${r.statut === 'wait' || r.statut === 'pay' ? `<form class="actions" method="post" action="/admin/rdv/${r.id}/paye" style="margin-top:16px">
<select name="methode" style="width:auto"><option>virement</option><option>espèces</option><option>autre</option></select><button class="btn small ghost">Marquer payé à la main</button></form>
<p class="hint" style="margin-top:4px">Le patient reçoit alors la confirmation avec le lien Meet.</p>` : ''}
<div style="margin-top:16px"><div class="flabel">Lien personnel du patient</div><div class="copy"><input readonly value="${esc(R.lien(r))}" onclick="this.select()"></div></div>
</div>
<div class="box"><h3 style="font-size:22px">Historique</h3><ul class="timeline">${hist.map((h) => `<li>${U.stamp(h.at)} — ${esc(h.text)}</li>`).join('')}</ul>
<p style="margin-top:16px"><a href="/admin/clients/${c.id}">Fiche du patient</a></p></div></div>`;
}

// ---------- admin : patients ----------
function pageClients() {
  const list = db.prepare('SELECT c.*, (SELECT COUNT(*) FROM rdvs WHERE client_id=c.id) n FROM clients c ORDER BY c.nom, c.prenom').all();
  return `<div class="head"><h1>Patients</h1></div>
<div class="tbl-wrap"><table><thead><tr><th>Nom</th><th>E-mail</th><th>Mobile</th><th>Localité</th><th>Fiche</th><th>Rdv</th></tr></thead><tbody>
${list.map((c) => `<tr class="click" onclick="location.href='/admin/clients/${c.id}'"><td><a href="/admin/clients/${c.id}">${esc(c.nom)} ${esc(c.prenom)}</a></td><td>${esc(c.email)}</td><td class="num">${esc(c.mobile || '—')}</td><td>${esc(c.ville || '—')}</td><td>${c.complet ? '<span class="pill s-ok">Complète</span>' : '<span class="pill s-wait">À compléter par le patient</span>'}</td><td class="num">${c.n}</td></tr>`).join('') || '<tr><td colspan="6">Aucun patient pour l\'instant.</td></tr>'}
</tbody></table></div><p class="hint">Les coordonnées complètes sont saisies par le patient au moment de confirmer son premier rendez-vous.</p>
<form class="box form" method="post" action="/admin/clients/import" style="max-width:640px;margin-top:20px">
<h3 style="font-size:22px">Importer des patients</h3>
<p class="hint" style="margin:0">Fichier CSV avec une ligne d'en-tête : colonnes <b>civilite</b>, <b>prenom</b>, <b>nom</b>, <b>email</b> (et <b>mobile</b>, <b>fuseau</b> facultatifs). Les adresses déjà présentes ne sont pas recréées ; seul leur fuseau horaire est mis à jour s'il figure dans le fichier. <b>Aucun e-mail n'est envoyé.</b></p>
<input type="file" id="csv-file" accept=".csv,text/csv">
<textarea name="csv" id="csv-text" hidden></textarea>
<div class="actions"><button class="btn" id="csv-go" disabled>Importer</button></div>
</form>
<script>document.getElementById('csv-file').addEventListener('change',function(e){var f=e.target.files[0];if(!f)return;var r=new FileReader();r.onload=function(){document.getElementById('csv-text').value=r.result;document.getElementById('csv-go').disabled=false;};r.readAsText(f,'utf-8');});</script>`;
}
// lecture CSV simple (virgule ou point-virgule, guillemets)
function parseCsv(txt) {
  txt = txt.replace(/^\uFEFF/, '');
  const sep = (txt.split('\n')[0].match(/;/g) || []).length > (txt.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i];
    if (q) { if (ch === '"' && txt[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === sep) { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && txt[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}
function pageClient(c, q) {
  const list = db.prepare('SELECT * FROM rdvs WHERE client_id=? ORDER BY date DESC, heure DESC').all(c.id);
  const fld = (k, l, t = 'text') => `<label>${l}<input name="${k}" type="${t}" value="${esc(c[k])}"></label>`;
  return `<div class="head"><h1>${esc(c.civ)} ${esc(R.nomComplet(c))}</h1><a class="btn" href="/admin/rdv/nouveau?client=${c.id}">Nouveau rendez-vous</a></div>
<div class="cols"><form class="box form" method="post">
<div class="row"><label>Civilité<select name="civ"><option ${c.civ === 'Madame' ? 'selected' : ''}>Madame</option><option ${c.civ === 'Monsieur' ? 'selected' : ''}>Monsieur</option></select></label>${fld('naissance', 'Date de naissance', 'date')}</div>
<div class="row">${fld('prenom', 'Prénom')}${fld('nom', 'Nom')}</div>
${fld('adresse', 'Adresse')}<div class="row">${fld('npa', 'Code postal')}${fld('ville', 'Localité')}</div>${fld('pays', 'Pays')}
<div class="row">${fld('email', 'E-mail', 'email')}${fld('mobile', 'Mobile', 'tel')}</div>
<label>Fuseau horaire <small>(heures des e-mails et de la page de rendez-vous du patient)</small><select name="tz">${tzOptions(c.tz)}</select></label>
<label>Note interne<textarea name="note" rows="3">${esc(c.note)}</textarea></label>
<label class="check"><input type="checkbox" name="complet" value="1" ${c.complet ? 'checked' : ''}> Fiche complète (le patient n'aura pas à remplir ses coordonnées)</label>
<div class="actions"><button class="btn">Enregistrer</button></div></form>
<div class="box"><h3 style="font-size:22px">Rendez-vous</h3><ul class="timeline">${list.map((r) => `<li><a href="/admin/rdv/${r.id}">${shortDate(r.date)} ${hfmt(r.heure)}</a> · ${esc(r.type_nom)} · ${eur(r.prix)} · ${R.STATUTS[r.statut].label}</li>`).join('') || '<li>Aucun</li>'}</ul>
${q && q.get('supprimer') === '1' ? `<form class="box form" style="margin-top:16px;background:var(--bg)" method="post" action="/admin/clients/${c.id}/supprimer">
<b>Supprimer définitivement ${esc(c.civ)} ${esc(R.nomComplet(c))} ?</b>
<p class="hint" style="margin:0">${list.length ? `Ses ${list.length} rendez-vous seront supprimés aussi (et retirés de Google Agenda). ` : ''}Aucun e-mail n'est envoyé. Cette action ne peut pas être annulée.</p>
<div class="actions"><button class="btn small danger">Oui, supprimer</button><a class="btn small ghost" href="/admin/clients/${c.id}">Non</a></div></form>`
    : `<div class="actions" style="margin-top:16px"><a class="btn small ghost" href="/admin/clients/${c.id}?supprimer=1">Supprimer ce patient</a></div>`}</div></div>`;
}

// ---------- admin : réglages ----------
async function pageReglages() {
  const ty = types().map((t) => `${t.nom} | ${t.duree}`).join('\n');
  let google = '';
  if (!U.googleReady()) {
    if (!get('ical_token')) set('ical_token', U.randomToken() + U.randomToken());
    const url = `${U.SITE_URL}/cal/${get('ical_token')}.ics`;
    google = `<p style="margin:0 0 8px">Adresse d'abonnement de ton agenda <small>(secrète : ne la donne à personne)</small></p>
<div class="copy"><input readonly value="${esc(url)}" onclick="this.select()"></div>
<p class="hint">Dans Google Agenda : colonne de gauche, <b>Autres agendas</b> → <b>+</b> → <b>À partir de l'URL</b> → colle l'adresse → <b>Ajouter un agenda</b>. Google met à jour cet agenda de lui-même, en général toutes les quelques heures.</p>
<button class="btn small ghost" formaction="/admin/reglages/ical-nouveau">Créer une nouvelle adresse (l'ancienne cesse de fonctionner)</button>`;
  }
  else if (!get('google_refresh')) google = '<a class="btn small" href="/admin/google/connecter">Connecter mon compte Google</a>';
  else {
    let opts = '';
    try {
      const l = await U.google('GET', '/users/me/calendarList?minAccessRole=writer');
      opts = (l.items || []).map((k) => `<option value="${esc(k.id)}" ${k.id === get('google_calendar') ? 'selected' : ''}>${esc(k.summaryOverride || k.summary)}</option>`).join('');
    } catch (e) { opts = `<option value="${esc(get('google_calendar'))}">${esc(get('google_calendar_name') || 'Agenda enregistré')}</option>`; google += `<div class="flash err">Google : ${esc(e.message)}</div>`; }
    google += `<p style="margin:0 0 10px">Connecté${get('google_email') ? ` au compte <b>${esc(get('google_email'))}</b>` : ''}.</p>
<label>Agenda de destination<select name="google_calendar"><option value="">— choisir —</option>${opts}</select></label>
<label class="check" style="margin-top:10px"><input type="checkbox" name="google_actif" value="1" ${get('google_actif') === '1' ? 'checked' : ''}> Envoyer chaque rendez-vous dans cet agenda (mis à jour en cas de changement, retiré en cas d'annulation)</label>`;
  }
  const logs = db.prepare('SELECT * FROM mail_log ORDER BY id DESC LIMIT 25').all();
  return `<div class="head"><h1>Réglages</h1></div>
<div class="cols"><form class="box form" method="post">
<label>Lien Google Meet par défaut<input name="meet" value="${esc(get('meet'))}" placeholder="https://meet.google.com/..."><small>Créé une fois dans Google Meet avec « Créer une réunion pour plus tard ».</small></label>
<label>Tarifs proposés (€) <small>séparés par des virgules</small><input name="tarifs" value="${esc(get('tarifs'))}"></label>
<label>Types de séance <small>un par ligne : nom | durée en minutes</small><textarea name="types" rows="4">${esc(ty)}</textarea></label>
<div class="row"><label>Rappel de paiement proposé<input name="rappelPay" type="number" min="1" value="${esc(get('rappelPay'))}"><small>jours après la confirmation</small></label>
<label>Paiement au plus tard<input name="limitePay" type="number" min="0" value="${esc(get('limitePay'))}"><small>jours avant le rendez-vous</small></label></div>
<div class="row"><label>Délai pour répondre oui<input name="delai" type="number" min="1" value="${esc(get('delai'))}"><small>heures, puis alerte</small></label>
<label>Rappel de la séance<input name="rappel" type="number" min="0" value="${esc(get('rappel'))}"><small>heures avant (0 = aucun)</small></label></div>
<label>E-mail d'alerte<input name="alerte" type="email" value="${esc(get('alerte'))}"><small>non payé à l'échéance, patient sans réponse</small></label>
<label>Conditions affichées au patient<textarea name="conditions" rows="2">${esc(get('conditions'))}</textarea></label>
<div><div class="flabel">Google Agenda</div><div class="box" style="padding:14px;background:var(--bg)">${google}</div>
${get('google_refresh') ? '<p class="hint"><button class="btn small ghost" formaction="/admin/google/deconnecter">Déconnecter Google</button></p>' : ''}</div>
<div class="actions"><button class="btn">Enregistrer</button></div></form>
<div class="form">
<div class="box"><h3 style="font-size:22px">État technique</h3><p class="hint">
E-mails : ${U.mailReady() ? '<span class="pill s-ok">configurés</span>' : '<span class="pill s-wait">non configurés</span>'} ·
Paiement : ${U.PSP === 'stripe' ? `Stripe ${U.STRIPE_KEY.startsWith('sk_live') ? '<span class="pill s-ok">clé live</span>' : '<span class="pill s-pay">clé test</span>'} · webhook ${process.env.STRIPE_WEBHOOK_SECRET ? '<span class="pill s-ok">configuré</span>' : '<span class="pill s-wait">absent</span>'}` : U.PSP === 'mollie' ? `Mollie ${U.MOLLIE_KEY.startsWith('live_') ? '<span class="pill s-ok">clé live</span>' : '<span class="pill s-pay">clé test</span>'}` : '<span class="pill s-wait">non configuré</span>'} ·
Google : ${U.googleReady() ? (get('google_refresh') ? '<span class="pill s-ok">connecté</span>' : '<span class="pill s-pay">à connecter</span>') : '<span class="pill s-wait">non configuré</span>'} · Version ${VERSION}</p>
<form class="actions" method="post" action="/admin/reglages/test"><input name="to" type="email" value="${esc(get('alerte'))}" style="width:auto;flex:1"><button class="btn small ghost">Envoyer un e-mail de test</button></form></div>
<div class="box"><h3 style="font-size:22px">Derniers e-mails</h3><ul class="timeline">${logs.map((l) => `<li>${U.stamp(l.at)} — ${esc(l.to_email)} — ${esc(l.subject)} ${l.ok ? '' : `<span class="pill s-wait">non envoyé${l.error ? ' : ' + esc(l.error) : ''}</span>`}</li>`).join('') || '<li>Aucun</li>'}</ul></div>
</div></div>`;
}

// ---------- admin : e-mails à plusieurs patients ----------
const MSG_OBJET = 'Changement de mon agenda de rendez-vous';
const MSG_CORPS = `{appel}

Je change d'agenda pour un outil plus pratique, qui me permet d'inscrire moi-même vos rendez-vous.

{rendez-vous}

Les liens envoyés précédemment par Koalendar ne sont plus utilisés.

Pour vos prochaines séances, voici comment cela se passera :
– Nous convenons ensemble d'une date, par e-mail ou par téléphone, et je l'inscris dans mon agenda.
– Vous recevez un e-mail envoyé depuis info@guerir.ch, avec un lien pour confirmer le rendez-vous.
– Vous réglez la séance tout de suite, ou vous demandez un rappel pour la payer plus tard (au plus tard 5 jours avant la séance).
– Une fois le paiement effectué, vous recevez le lien de la visioconférence.

Lors de votre premier rendez-vous avec ce nouveau système, il vous sera demandé de compléter vos coordonnées (adresse, date de naissance et téléphone mobile).

Pour convenir d'une nouvelle séance, écrivez-moi simplement à info@guerir.ch. Pour être sûr de recevoir mes e-mails, je vous invite à ajouter cette adresse à vos contacts.`;
function destinataires(qui) {
  if (qui === 'avenir') return db.prepare("SELECT DISTINCT c.* FROM clients c JOIN rdvs r ON r.client_id=c.id WHERE r.statut<>'off' AND r.date>=? ORDER BY c.nom, c.prenom").all(U.today());
  return db.prepare('SELECT * FROM clients ORDER BY nom, prenom').all();
}
let envoiEnCours = null;
function pageEmails(q, f) {
  const qui = f?.qui || 'tous', objet = f?.objet ?? MSG_OBJET, corps = f?.corps ?? MSG_CORPS;
  const dest = destinataires(qui);
  let apercu = '';
  if (f && dest.length) {
    const ex = dest.find((c) => R.blocRdv(c).html) || dest[0];
    const mm = R.messageLibre(ex, objet, corps);
    apercu = `<div class="box" style="margin-top:20px"><h3 style="font-size:22px">Aperçu — exemple pour ${esc(ex.civ)} ${esc(R.nomComplet(ex))}</h3>
<p class="hint">Objet : <b>${esc(mm.subject)}</b> — chaque patient reçoit sa propre version, avec ses propres rendez-vous.</p>
<iframe style="width:100%;height:560px;border:1px solid var(--line);border-radius:4px;background:#fff" srcdoc="${esc(mm.html)}"></iframe>
<form method="post" action="/admin/emails/envoyer" class="actions" style="margin-top:12px">
<input type="hidden" name="qui" value="${esc(qui)}"><input type="hidden" name="objet" value="${esc(objet)}"><textarea name="corps" hidden>${esc(corps)}</textarea>
<button class="btn">Envoyer à ${dest.length} patient${dest.length > 1 ? 's' : ''}</button><span class="hint" style="margin:0">L'envoi se fait en arrière-plan ; le résultat apparaît dans le journal ci-dessous.</span></form></div>`;
  }
  const logs = db.prepare('SELECT * FROM mail_log ORDER BY id DESC LIMIT 60').all();
  return `<div class="head"><h1>E-mails</h1></div>
${envoiEnCours ? `<div class="flash">Envoi en cours : ${envoiEnCours.fait} / ${envoiEnCours.total}. Recharge la page pour suivre.</div>` : ''}
<form class="box form" method="post" action="/admin/emails/apercu" style="max-width:760px">
<h3 style="font-size:22px">Écrire à plusieurs patients</h3>
<label>Destinataires<select name="qui"><option value="tous" ${qui === 'tous' ? 'selected' : ''}>Tous les patients (${destinataires('tous').length})</option><option value="avenir" ${qui === 'avenir' ? 'selected' : ''}>Patients qui ont un rendez-vous à venir (${destinataires('avenir').length})</option></select></label>
<label>Objet<input name="objet" value="${esc(objet)}" required></label>
<label>Message<textarea name="corps" rows="22" required>${esc(corps)}</textarea>
<small><b>{appel}</b> devient « Bonjour Madame Dupont, ». <b>{rendez-vous}</b>, seul sur sa ligne, devient la liste des rendez-vous à venir du patient avec le lien de visioconférence (ou le lien pour confirmer et régler) ; pour un patient sans rendez-vous, ce passage disparaît. Laisse une ligne vide entre les paragraphes.</small></label>
<div class="actions"><button class="btn">Voir l'aperçu</button><a class="btn ghost" href="/admin/emails">Rétablir le texte proposé</a></div></form>
${apercu}
<div class="box" style="margin-top:20px"><h3 style="font-size:22px">Journal des e-mails</h3><ul class="timeline">${logs.map((l) => `<li>${U.stamp(l.at)} — ${esc(l.to_email)} — ${esc(l.subject)} ${l.ok ? '' : `<span class="pill s-wait">non envoyé${l.error ? ' : ' + esc(l.error) : ''}</span>`}</li>`).join('') || '<li>Aucun</li>'}</ul></div>`;
}

function tzOptions(sel) {
  sel = sel || 'Europe/Zurich';
  const prio = ['Europe/Zurich', 'Europe/Paris', 'Europe/Brussels', 'Europe/Luxembourg', 'America/Toronto', 'America/Montreal', 'America/New_York', 'America/Los_Angeles', 'Asia/Singapore', 'Asia/Bangkok', 'Indian/Reunion', 'America/Martinique', 'Pacific/Tahiti'];
  const all = prio.concat(U.ZONES.filter((z) => !prio.includes(z)));
  return all.map((z) => `<option value="${esc(z)}" ${z === sel ? 'selected' : ''}>${esc(z.replace(/_/g, ' '))}</option>`).join('');
}
// ---------- pages patient ----------
function pageClientRdv(r, q) {
  const c = R.clientGet(r.client_id);
  const auj = U.today();
  const hp = U.horaire(r.date, r.heure, r.duree, c.tz);
  const resume = `<dl class="summary"><dt>Séance</dt><dd>${esc(r.type_nom)}</dd><dt>Date</dt><dd>${hp.jour}</dd><dt>Heure</dt><dd>${hp.debut} – ${hp.fin}${hp.pareil ? '' : `<br><small style="font-weight:400">heure de ${esc(hp.ville)} — ${hfmt(r.heure)} en Suisse</small>`}</dd><dt>Lieu</dt><dd>En ligne (Google Meet)</dd><dt>Tarif</dt><dd>${eur(r.prix)}</dd></dl>`;
  const coords = !c.complet;
  let step, body;
  if (r.statut === 'off') { step = 0; body = `<h1>Rendez-vous annulé</h1><p class="lead">Ce rendez-vous a été annulé. Pour convenir d'une autre date, écrivez à info@guerir.ch.</p><div class="box">${resume}</div>`; }
  else if (r.statut !== 'ok' && r.date < auj) { step = 0; body = `<h1>Rendez-vous passé</h1><p class="lead">La date de ce rendez-vous est passée. Pour toute question, écrivez à info@guerir.ch.</p>`; }
  else if ((r.statut === 'wait' || (r.statut === 'ok' && r.a_confirmer)) && coords) {
    step = 1;
    const v = (k) => esc(c[k]);
    body = `<h1>Vos coordonnées</h1><p class="lead">Pour un premier rendez-vous, merci de compléter votre fiche. Ces informations restent confidentielles.</p>
<div class="box"><form class="form" method="post" action="/r/${r.token}/coordonnees">
<div class="row"><label>Civilité<select name="civ"><option ${c.civ === 'Madame' ? 'selected' : ''}>Madame</option><option ${c.civ === 'Monsieur' ? 'selected' : ''}>Monsieur</option></select></label><label>Date de naissance<input name="naissance" type="date" required value="${v('naissance')}"></label></div>
<div class="row"><label>Prénom<input name="prenom" required value="${v('prenom')}"></label><label>Nom<input name="nom" required value="${v('nom')}"></label></div>
<label>Adresse<input name="adresse" autocomplete="street-address" required value="${v('adresse')}"></label>
<div class="row"><label>Code postal<input name="npa" required value="${v('npa')}"></label><label>Localité<input name="ville" required value="${v('ville')}"></label></div>
<label>Pays<input name="pays" required value="${v('pays') || 'France'}" list="pays"></label><datalist id="pays"><option>France</option><option>Belgique</option><option>Suisse</option><option>Canada</option><option>Luxembourg</option></datalist>
<div class="row"><label>E-mail<input name="email" type="email" required value="${v('email')}"></label><label>Téléphone mobile<input name="mobile" type="tel" required placeholder="+33 6 12 34 56 78" value="${v('mobile')}"></label></div>
<label>Fuseau horaire <small>(les heures de vos rendez-vous vous seront indiquées dans ce fuseau)</small><select name="tz" id="tz">${tzOptions(c.tz)}</select></label>
<div><button class="btn">Continuer</button></div></form></div>
<script>(function(){try{var z=Intl.DateTimeFormat().resolvedOptions().timeZone,s=document.getElementById('tz');if(z&&${c.tz && c.tz !== 'Europe/Zurich' ? 'false' : 'true'})for(var i=0;i<s.options.length;i++)if(s.options[i].value===z){s.selectedIndex=i;break;}}catch(e){}})();</script>`;
  } else if (r.statut === 'wait') {
    step = 2;
    body = `<h1>Votre rendez-vous</h1><p class="lead">Ce rendez-vous vous convient-il ?</p>
<div class="box">${resume}<form method="post" action="/r/${r.token}/oui">
<label class="check" style="margin-top:16px"><input type="checkbox" name="acc" value="1" required> J'ai pris connaissance des conditions : la séance est à régler au plus tard ${get('limitePay')} jours avant le rendez-vous. ${esc(get('conditions'))}</label>
<input type="hidden" name="tzdet" id="tzdet"><script>try{document.getElementById('tzdet').value=Intl.DateTimeFormat().resolvedOptions().timeZone||''}catch(e){}</script>
<div class="actions" style="margin-top:16px"><button class="btn">Oui, ce rendez-vous me convient</button></div></form>
<p class="hint">Si la date ne vous convient pas, répondez simplement à l'e-mail reçu.</p></div>`;
  } else if (r.statut === 'pay') {
    step = 3;
    const rap = R.dateRappel(r);
    const report = rap > auj;
    if (r.rappel_pay && !r.rappel_pay_sent && q.get('etape') === 'note') {
      body = `<h1>C'est noté</h1><p class="lead">Votre rendez-vous est confirmé. Vous recevrez un e-mail le ${longDate(r.rappel_pay)} avec le lien de paiement.</p>
<div class="box">${resume}<div class="note" style="margin-top:16px;color:var(--ink)">Le paiement doit être effectué au plus tard le ${longDate(R.echeance(r))}. Le lien Google Meet vous sera envoyé avec la confirmation de paiement. Vous pouvez aussi régler dès maintenant depuis le lien reçu par e-mail.</div></div>`;
    } else {
      body = `<h1>Paiement de la séance</h1><p class="lead">Votre rendez-vous est confirmé. ${R.echeance(r) <= auj ? 'Merci de régler la séance dès maintenant.' : `Vous pouvez régler la séance maintenant${report && !r.rappel_pay ? ' ou plus tard' : ''}. Échéance : ${longDate(R.echeance(r))}.`}</p>
<div class="box">${resume}
<div class="pay"><div style="display:flex;justify-content:space-between;font-weight:700;margin-bottom:12px"><span>${esc(r.type_nom)}</span><span>${eur(r.prix)}</span></div>
${q.get('err') ? `<p class="err">${esc(q.get('err'))}</p>` : ''}
<form method="post" action="/r/${r.token}/payer"><button class="btn" style="width:100%">Payer ${eur(r.prix)} maintenant</button></form>
<p class="hint" style="text-align:center">Paiement sécurisé par carte bancaire, Apple Pay ou Google Pay.</p></div>
${report && !r.rappel_pay ? `<form class="actions" style="justify-content:center;margin-top:14px" method="post" action="/r/${r.token}/plus-tard"><button class="btn ghost">Me rappeler de payer le ${shortDate(rap)}</button></form>` : ''}
${r.rappel_pay ? `<p class="hint">Un rappel de paiement ${r.rappel_pay_sent ? 'vous a été envoyé' : 'vous sera envoyé'} le ${shortDate(r.rappel_pay)}.</p>` : ''}</div>`;
    }
  } else if (r.a_confirmer) {
    step = 4;
    body = `<h1>Votre rendez-vous</h1><p class="lead">Votre séance est réglée. Merci de confirmer que vous avez bien reçu ces informations.</p>
<div class="box">${resume}<div class="note" style="margin-top:16px;color:var(--ink)"><b>Lien de la visioconférence</b> (à utiliser exclusivement)<br><a href="${esc(R.meetOf(r))}" target="_blank" rel="noopener">${esc(R.meetOf(r))}</a></div>
<form method="post" action="/r/${r.token}/accuse" class="actions" style="margin-top:16px"><input type="hidden" name="tzdet" id="tzdet"><button class="btn">Je confirme ce rendez-vous</button></form>
<script>try{document.getElementById('tzdet').value=Intl.DateTimeFormat().resolvedOptions().timeZone||''}catch(e){}</script></div>`;
  } else {
    step = 4;
    body = `<h1>Rendez-vous confirmé</h1><p class="lead">Merci, votre paiement est reçu. Un e-mail de confirmation vous a été envoyé, avec une invitation à ajouter à votre agenda.</p>
<div class="box">${resume}<div class="note" style="margin-top:16px;color:var(--ink)"><b>Lien de la visio</b><br><a href="${esc(R.meetOf(r))}" target="_blank" rel="noopener">${esc(R.meetOf(r))}</a>${Number(get('rappel')) ? `<br>Vous recevrez un rappel ${get('rappel')} h avant la séance.` : ''}</div></div>`;
  }
  const steps = (coords || step === 1 ? [['Vos coordonnées', 1]] : []).concat([['Confirmation', 2], ['Paiement', 3], ['Confirmé', 4]]);
  return head('Votre rendez-vous — Marc Isenschmid') + `<header class="client-top"><div class="name"><small>Thérapeute</small>Marc Isenschmid</div></header>
<div class="client-main">${step ? `<div class="steps">${steps.map(([l, n]) => `<span class="${n === step ? 'on' : n < step ? 'done' : ''}">${l}</span>`).join('')}</div>` : ''}${body}</div></body></html>`;
}

// ---------- routeur ----------
async function handle(req, res) {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname, q = url.searchParams, m = req.method;
  let mm;

  if (p === '/style.css') { res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8', 'Cache-Control': 'public, max-age=86400' }); return res.end(CSS); }
  if ((mm = p.match(/^\/cal\/([\w-]{20,})\.ics$/))) {
    if (mm[1] !== get('ical_token')) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'no-cache' });
    return res.end(R.fluxIcal());
  }
  if (p === '/robots.txt') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('User-agent: *\nDisallow: /\n'); }
  if (p === '/') return go(res, '/admin');

  // --- Stripe ---
  if (p === '/stripe/webhook' && m === 'POST') {
    const raw = await new Promise((ok, ko) => { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => ok(b)); req.on('error', ko); });
    if (!U.stripeSignatureOk(raw, req.headers['stripe-signature'])) { res.writeHead(400); return res.end('signature'); }
    try {
      const ev = JSON.parse(raw);
      if (ev.type === 'checkout.session.completed' || ev.type === 'checkout.session.async_payment_succeeded') await R.verifierPaiement(ev.data.object.id);
    } catch (e) { console.error('[stripe webhook]', e.message); }
    res.writeHead(200); return res.end('ok');
  }
  // --- Mollie ---
  if (p === '/mollie/webhook' && m === 'POST') {
    const f = await readForm(req);
    if (f.id) await R.verifierPaiement(f.id).catch((e) => console.error('[mollie webhook]', e.message));
    res.writeHead(200); return res.end('ok');
  }

  // --- patient ---
  if ((mm = p.match(/^\/r\/([\w-]{10,})(\/[a-z-]+)?$/))) {
    const r = R.rdvByToken(mm[1]);
    if (!r) return send(res, 404, head('Lien inconnu') + '<div class="client-main"><h1>Lien inconnu</h1><p class="lead">Ce lien n\'est pas valable. Écrivez à info@guerir.ch.</p></div></body></html>');
    const base = `/r/${r.token}`, act = mm[2] || '';
    if (!act && m === 'GET') return send(res, 200, pageClientRdv(r, q));
    if (act === '/retour') {
      if (r.mollie_id && U.PSP && r.statut !== 'ok') await R.verifierPaiement(r.mollie_id).catch((e) => console.error('[mollie]', e.message));
      const r2 = R.rdvGet(r.id);
      return go(res, r2.statut === 'ok' ? base : withMsg(base, false, 'Le paiement n\'a pas abouti. Vous pouvez réessayer.'));
    }
    if (m !== 'POST') return go(res, base);
    const f = await readForm(req);
    if (r.statut === 'off') return go(res, base);
    if (act === '/coordonnees' && (r.statut === 'wait' || (r.statut === 'ok' && r.a_confirmer))) {
      const need = ['naissance', 'prenom', 'nom', 'adresse', 'npa', 'ville', 'pays', 'email', 'mobile'];
      if (need.some((k) => !String(f[k] || '').trim())) return go(res, base);
      db.prepare('UPDATE clients SET civ=?,naissance=?,prenom=?,nom=?,adresse=?,npa=?,ville=?,pays=?,email=?,mobile=?,complet=1 WHERE id=?')
        .run(f.civ === 'Monsieur' ? 'Monsieur' : 'Madame', ...need.map((k) => String(f[k]).trim().slice(0, 200)), r.client_id);
      if (U.okTz(f.tz || '')) db.prepare('UPDATE clients SET tz=? WHERE id=?').run(f.tz, r.client_id);
      addHist(r.id, 'Coordonnées complétées par le patient');
      return go(res, base);
    }
    const tzAuto = () => { const c0 = R.clientGet(r.client_id); if (U.okTz(f.tzdet || '') && (!c0.tz || c0.tz === 'Europe/Zurich') && f.tzdet !== c0.tz) db.prepare('UPDATE clients SET tz=? WHERE id=?').run(f.tzdet, r.client_id); };
    if (act === '/accuse' && r.statut === 'ok' && r.a_confirmer) {
      tzAuto();
      db.prepare("UPDATE rdvs SET a_confirmer=0, ack_at=datetime('now') WHERE id=?").run(r.id);
      addHist(r.id, 'Rendez-vous confirmé par le patient (bonne réception)');
      return go(res, base);
    }
    if (act === '/oui' && r.statut === 'wait' && f.acc) {
      tzAuto();
      db.prepare("UPDATE rdvs SET statut='pay', validated_at=datetime('now') WHERE id=?").run(r.id);
      addHist(r.id, 'Confirmé par le patient');
      await R.syncGoogle(r.id);
      return go(res, base);
    }
    if (act === '/plus-tard' && r.statut === 'pay' && !r.rappel_pay) {
      const d = R.dateRappel(r);
      if (d > U.today()) {
        db.prepare('UPDATE rdvs SET rappel_pay=? WHERE id=?').run(d, r.id);
        addHist(r.id, `Le patient a demandé un rappel de paiement : e-mail prévu le ${shortDate(d)}`);
      }
      return go(res, base + '?etape=note');
    }
    if (act === '/payer' && r.statut === 'pay') {
      if (!U.PSP) {
        if (DEV) { await R.marquerPaye(r, 'simulation'); return go(res, base); }
        return go(res, withMsg(base, false, 'Le paiement en ligne est momentanément indisponible. Merci d\'écrire à info@guerir.ch.'));
      }
      try { return go(res, await R.creerPaiement(r)); }
      catch (e) { console.error('[paiement]', e.message); return go(res, withMsg(base, false, 'Le paiement n\'a pas pu démarrer. Merci de réessayer dans un instant.')); }
    }
    return go(res, base);
  }

  // --- admin : connexion ---
  if (p === '/admin/connexion') {
    if (m === 'POST') {
      const f = await readForm(req);
      if (ADMIN_PASS && f.u === ADMIN_USER && f.p === ADMIN_PASS) { U.setCookie(res, 'adm', U.sign({ u: ADMIN_USER }, 30 * 86400), 30 * 86400); return go(res, '/admin'); }
      await new Promise((ok) => setTimeout(ok, 800));
      return go(res, '/admin/connexion?err=' + encodeURIComponent(ADMIN_PASS ? 'Identifiant ou mot de passe incorrect.' : 'ADMIN_PASS n\'est pas défini dans Coolify.'));
    }
    return send(res, 200, head('Connexion — Agenda') + `<div class="login"><h1>Agenda</h1>${flashOf(q)}<form class="box form" method="post"><label>Identifiant<input name="u" autocomplete="username" required></label><label>Mot de passe<input name="p" type="password" autocomplete="current-password" required></label><button class="btn">Se connecter</button></form></div></body></html>`);
  }
  if (p.startsWith('/admin')) {
    if (!isAdmin(req)) return go(res, '/admin/connexion');
    if (p === '/admin/deconnexion') { U.setCookie(res, 'adm', '', 0); return go(res, '/admin/connexion'); }
    if (p === '/admin') return send(res, 200, layout('Agenda', 'agenda', pageAgenda(q), q));
    if (p === '/admin/rdv/import' && m === 'POST') {
      const f = await readForm(req);
      const rows = parseCsv(f.csv || '');
      if (rows.length < 2) return go(res, withMsg('/admin/rdv', false, 'Fichier vide ou illisible.'));
      const h = rows[0].map((x) => x.trim().toLowerCase());
      const ix = (start) => h.findIndex((x) => x.startsWith(start));
      const c = { page: ix('booking page'), nom: ix('invitee name'), mail: ix('invitee email'), date: ix('meeting date'), deb: ix('meeting start'), fin: ix('meeting end'), lieu: ix('meeting location'), prix: ix('price'), paye: ix('paid'), id: ix('booking id'), adr: ix('adresse'), nai: ix('date de naissance'), mob: ix('numéro de mobile'), type: ix('appointment types') };
      if (c.mail < 0 || c.date < 0 || c.deb < 0) return go(res, withMsg('/admin/rdv', false, 'Ce fichier ne ressemble pas à un export de rendez-vous Koalendar.'));
      const cap = (w) => w.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (a, b, l) => b + l.toUpperCase());
      let ajout = 0, deja = 0, erreurs = 0;
      for (const r of rows.slice(1)) {
        const v = (k) => (c[k] >= 0 ? String(r[c[k]] || '') : '').trim();
        const email = v('mail').toLowerCase();
        const md = v('date').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (!/^\S+@\S+\.\S+$/.test(email) || !md || !okHeure(v('deb').padStart(5, '0'))) { erreurs++; continue; }
        const date = `${md[3]}-${md[1].padStart(2, '0')}-${md[2].padStart(2, '0')}`;
        const heure = v('deb').padStart(5, '0');
        const ref = v('id') || `${email}-${date}-${heure}`;
        if (db.prepare('SELECT id FROM rdvs WHERE ref_ext LIKE ? OR note LIKE ?').get(`%Koalendar ${ref}%`, `%Koalendar ${ref}%`)) { deja++; continue; }
        // patient : existant (par e-mail) ou nouveau
        let cl = db.prepare('SELECT * FROM clients WHERE lower(email)=?').get(email);
        if (!cl) {
          const t = v('nom').split(/\s+/).filter(Boolean);
          const up = (w) => w.length > 1 && w === w.toUpperCase() && /\p{L}/u.test(w);
          let prenom, nom;
          if (t.length > 1 && up(t[0])) { nom = t[0]; prenom = t.slice(1).join(' '); }
          else if (t.length > 1 && up(t[t.length - 1])) { nom = t[t.length - 1]; prenom = t.slice(0, -1).join(' '); }
          else { prenom = t[0] || ''; nom = t.slice(1).join(' '); }
          const id = Number(db.prepare('INSERT INTO clients(civ,prenom,nom,email) VALUES(?,?,?,?)').run('Madame', cap(prenom), cap(nom), email).lastInsertRowid);
          cl = R.clientGet(id);
        }
        // coordonnées : on complète seulement ce qui manque
        const maj = {};
        if (!cl.mobile && v('mob')) maj.mobile = v('mob');
        const dg = v('nai').replace(/\D/g, '');
        if (!cl.naissance && dg.length === 8) maj.naissance = `${dg.slice(4)}-${dg.slice(2, 4)}-${dg.slice(0, 2)}`;
        const adrLibre = !cl.adresse || (!cl.complet && !cl.npa);
        if (adrLibre && v('adr')) {
          const ls = v('adr').split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
          let rue = ls[0], npa = '', ville = '', pays = ls[2] || '';
          const l2 = (ls[1] || '').match(/^(\d{4,5})\s+(.+)$/);
          if (l2) { npa = l2[1]; ville = l2[2]; }
          else if (ls.length === 1) { const m1 = ls[0].match(/^(.*?)[,\s]+(\d{4,5})\s+(.+)$/); if (m1) { rue = m1[1]; npa = m1[2]; ville = m1[3]; } }
          const pm = ville.match(/^(.*?)[,\s]+(France|Belgique|Suisse|Canada|Luxembourg)$/i); if (pm) { ville = pm[1]; if (!pays) pays = pm[2]; }
          if (!pays && npa.length === 5) pays = 'France';
          if (!cl.adresse || npa) { maj.adresse = rue; if (npa) maj.npa = npa; if (ville) maj.ville = cap(ville); if (pays) maj.pays = pays; }
        }
        if (Object.keys(maj).length) db.prepare(`UPDATE clients SET ${Object.keys(maj).map((k) => k + '=?').join(',')} WHERE id=?`).run(...Object.values(maj), cl.id);
        cl = R.clientGet(cl.id);
        if (cl.mobile && cl.naissance && cl.adresse && cl.npa && cl.ville) db.prepare('UPDATE clients SET complet=1 WHERE id=?').run(cl.id);
        // rendez-vous
        const [h1, m1] = heure.split(':').map(Number), fin = v('fin').padStart(5, '0');
        const duree = okHeure(fin) ? Math.max(15, (Number(fin.slice(0, 2)) * 60 + Number(fin.slice(3))) - (h1 * 60 + m1)) : 60;
        const prix = Number((v('prix').match(/[\d.,]+/) || ['0'])[0].replace(',', '.')) || 0;
        const lieu = v('lieu');
        const meet = ''; // lien Meet par défaut (Réglages) à la place de celui de Koalendar
        const forfait = /forfait/i.test(v('page'));
        const proche = U.localToDate(date, heure).getTime() - Date.now() < 24 * 3600e3; // déjà passé ou dans moins de 24 h : pas de rappel de notre part
        const paye = forfait || /^(yes|oui|true)$/i.test(v('paye'));
        const id = Number(db.prepare(`INSERT INTO rdvs(client_id,type_nom,date,heure,duree,prix,meet,note,statut,token,validated_at,paid_at,pay_method,rappel_seance_sent,alert_wait_sent,alert_unpaid_sent,a_confirmer,ref_ext)
          VALUES(?,?,?,?,?,?,?,?,?,?,datetime('now'),?,?,?,1,1,?,?)`).run(cl.id, v('type') || 'Séance individuelle', date, heure, duree, prix, meet, '', paye ? 'ok' : 'pay', U.randomToken(), paye ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null, paye ? (forfait ? 'forfait (Koalendar)' : 'Koalendar') : '', proche ? 1 : 0, date > U.today() ? 1 : 0, `Koalendar ${ref}${lieu ? ' — lieu d\'origine : ' + lieu : ''}`).lastInsertRowid);
        addHist(id, `Importé de Koalendar${forfait ? ', compris dans un forfait' : paye ? ', déjà payé' : ', non payé'} — aucun e-mail envoyé${date > U.today() ? ' (confirmation de réception demandée au patient, rappel 24 h avant actif)' : ' (rendez-vous passé, archivé)'}`);
        ajout++;
      }
      return go(res, withMsg('/admin/rdv', true, `${ajout} rendez-vous importé(s), ${deja} déjà présent(s)${erreurs ? ', ' + erreurs + ' ligne(s) illisible(s)' : ''}. Aucun e-mail envoyé.`));
    }
    if (p === '/admin/rdv') return send(res, 200, layout('Rendez-vous', 'rdv', pageListe(q), q));
    if (p === '/admin/rdv/nouveau') {
      if (m === 'POST') {
        const f = await readForm(req);
        try { const id = await creerRdv(f); return go(res, withMsg(`/admin/rdv/${id}`, true, f.envoyer ? 'Rendez-vous créé, e-mail envoyé au patient.' : 'Rendez-vous créé.')); }
        catch (e) { return go(res, withMsg('/admin/rdv/nouveau?' + new URLSearchParams({ date: f.date || '', heure: f.heure || '' }), false, e.message)); }
      }
      return send(res, 200, layout('Nouveau rendez-vous', 'rdv', formRdv(null, q), q));
    }
    if ((mm = p.match(/^\/admin\/rdv\/(\d+)(\/[a-z]+)?$/))) {
      const r = R.rdvGet(Number(mm[1]));
      if (!r) return go(res, '/admin/rdv');
      const act = mm[2] || '', back = `/admin/rdv/${r.id}`;
      if (!act) return send(res, 200, layout('Rendez-vous', 'rdv', pageRdv(r, q), q));
      if (act === '/apercu') {
        const c = R.clientGet(r.client_id), mail = R.mailInvitation(r, c);
        return send(res, 200, `<div style="font:14px Arial;padding:10px 16px;background:#1F4A33;color:#fff">Aperçu de l'e-mail envoyé au patient — <b>Objet :</b> ${esc(mail.subject)} — <a style="color:#fff" href="${back}">Retour</a></div>` + mail.html);
      }
      if (act === '/modifier') {
        if (m === 'POST') {
          const f = await readForm(req);
          const prix = lirePrix(f);
          if (prix === null || !okDate(f.date) || !okHeure(f.heure)) return go(res, withMsg(back + '/modifier', false, 'Vérifiez la date, l\'heure et le prix.'));
          const change = f.date !== r.date || f.heure !== r.heure || prix !== Number(r.prix);
          db.prepare('UPDATE rdvs SET type_nom=?,date=?,heure=?,duree=?,prix=?,meet=?,note=?, rappel_seance_sent=0, alert_unpaid_sent=0 WHERE id=?')
            .run(f.type || r.type_nom, f.date, f.heure, Number(f.duree) || r.duree, prix, (f.meet || '').trim(), f.note || '', r.id);
          if (r.rappel_pay && f.date !== r.date) { const nr = R.rdvGet(r.id); const e = R.echeance(nr); if (r.rappel_pay > e) db.prepare('UPDATE rdvs SET rappel_pay=? WHERE id=?').run(e, r.id); }
          addHist(r.id, change ? `Modifié : ${shortDate(f.date)} à ${hfmt(f.heure)}, ${eur(prix)}` : 'Modifié');
          const nr = R.rdvGet(r.id);
          if (change && f.prevenir) {
            const c = R.clientGet(r.client_id);
            const ok = await U.sendMail({ to: c.email, ...R.mailModification(nr, c), kind: 'modification' });
            addHist(r.id, ok ? 'E-mail de modification envoyé au patient' : 'E-mail de modification NON envoyé');
          }
          await R.syncGoogle(r.id);
          return go(res, withMsg(back, true, 'Rendez-vous enregistré.'));
        }
        return send(res, 200, layout('Modifier', 'rdv', formRdv(r, q, R.clientGet(r.client_id)), q));
      }
      if (m !== 'POST') return go(res, back);
      const f = await readForm(req);
      if (act === '/renvoyer') { const ok = await R.envoyerInvitation(r); return go(res, withMsg(back, ok, ok ? 'E-mail renvoyé.' : 'L\'e-mail n\'est pas parti (voir Réglages).')); }
      if (act === '/paye' && r.statut !== 'ok' && r.statut !== 'off') { await R.marquerPaye(r, ['virement', 'espèces', 'autre'].includes(f.methode) ? f.methode : 'autre'); return go(res, withMsg(back, true, 'Marqué payé, confirmation envoyée au patient.')); }
      if (act === '/annuler' && r.statut !== 'off') { await R.annuler(r, !!f.rembourser, !!f.prevenir); return go(res, withMsg(back, true, 'Rendez-vous annulé.')); }
      return go(res, back);
    }
    if (p === '/admin/clients/import' && m === 'POST') {
      const f = await readForm(req);
      const rows = parseCsv(f.csv || '');
      if (rows.length < 2) return go(res, withMsg('/admin/clients', false, 'Fichier vide ou illisible.'));
      const h = rows[0].map((x) => x.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, ''));
      const col = (...names) => h.findIndex((x) => names.includes(x));
      const iCiv = col('civilite', 'civ'), iPre = col('prenom', 'firstname'), iNom = col('nom', 'lastname'), iMail = col('email', 'mail', 'courriel'), iMob = col('mobile', 'telephone', 'phone'), iName = col('name'), iTz = col('fuseau', 'timezone');
      if (iMail < 0) return go(res, withMsg('/admin/clients', false, 'Colonne « email » introuvable dans le fichier.'));
      let ajout = 0, deja = 0, invalide = 0, fus = 0;
      for (const r of rows.slice(1)) {
        const email = (r[iMail] || '').trim().toLowerCase();
        if (!/^\S+@\S+\.\S+$/.test(email)) { invalide++; continue; }
        const tz = iTz >= 0 && U.okTz((r[iTz] || '').trim()) ? r[iTz].trim() : '';
        const ex = db.prepare('SELECT id, tz FROM clients WHERE lower(email)=?').get(email);
        if (ex) { if (tz && tz !== ex.tz) { db.prepare('UPDATE clients SET tz=? WHERE id=?').run(tz, ex.id); fus++; } deja++; continue; }
        let prenom = iPre >= 0 ? (r[iPre] || '').trim() : '', nom = iNom >= 0 ? (r[iNom] || '').trim() : '';
        if (!prenom && !nom && iName >= 0) { const parts = (r[iName] || '').trim().split(/\s+/); prenom = parts.shift() || ''; nom = parts.join(' '); }
        const civ = /^m(\.|r|onsieur)?$/i.test((iCiv >= 0 ? r[iCiv] : '').trim()) ? 'Monsieur' : 'Madame';
        db.prepare('INSERT INTO clients(civ,prenom,nom,email,mobile,tz) VALUES(?,?,?,?,?,?)').run(civ, prenom, nom, email, iMob >= 0 ? (r[iMob] || '').trim() : '', tz || 'Europe/Zurich');
        ajout++;
      }
      return go(res, withMsg('/admin/clients', true, `${ajout} patient(s) ajouté(s), ${deja} déjà présent(s)${fus ? ' (fuseau horaire mis à jour pour ' + fus + ')' : ''}${invalide ? ', ' + invalide + ' ligne(s) sans e-mail valide' : ''}. Aucun e-mail envoyé.`));
    }
    if (p === '/admin/emails') return send(res, 200, layout('E-mails', 'emails', pageEmails(q), q));
    if (p === '/admin/emails/apercu' && m === 'POST') { const f = await readForm(req); return send(res, 200, layout('E-mails', 'emails', pageEmails(q, f), q)); }
    if (p === '/admin/emails/envoyer' && m === 'POST') {
      const f = await readForm(req);
      if (envoiEnCours) return go(res, withMsg('/admin/emails', false, 'Un envoi est déjà en cours.'));
      const dest = destinataires(f.qui);
      if (!dest.length || !f.objet || !f.corps) return go(res, withMsg('/admin/emails', false, 'Rien à envoyer.'));
      envoiEnCours = { fait: 0, total: dest.length };
      (async () => {
        for (const c of dest) {
          try { await U.sendMail({ to: c.email, ...R.messageLibre(c, f.objet, f.corps), kind: 'message' }); } catch (e) { console.error('[message]', e.message); }
          envoiEnCours.fait++;
          await new Promise((ok) => setTimeout(ok, 1500));
        }
        envoiEnCours = null;
      })();
      return go(res, withMsg('/admin/emails', true, `Envoi lancé à ${dest.length} patient(s).`));
    }
    if (p === '/admin/clients') return send(res, 200, layout('Patients', 'clients', pageClients(), q));
    if ((mm = p.match(/^\/admin\/clients\/(\d+)\/supprimer$/)) && m === 'POST') {
      const c = R.clientGet(Number(mm[1]));
      if (!c) return go(res, '/admin/clients');
      for (const r of db.prepare('SELECT id, gcal_id FROM rdvs WHERE client_id=?').all(c.id)) {
        if (r.gcal_id) { db.prepare("UPDATE rdvs SET statut='off' WHERE id=?").run(r.id); await R.syncGoogle(r.id); }
        db.prepare('DELETE FROM rdvs WHERE id=?').run(r.id);
      }
      db.prepare('DELETE FROM clients WHERE id=?').run(c.id);
      return go(res, withMsg('/admin/clients', true, `${c.prenom} ${c.nom} supprimé(e).`));
    }
    if ((mm = p.match(/^\/admin\/clients\/(\d+)$/))) {
      const c = R.clientGet(Number(mm[1]));
      if (!c) return go(res, '/admin/clients');
      if (m === 'POST') {
        const f = await readForm(req);
        const ks = ['prenom', 'nom', 'email', 'mobile', 'naissance', 'adresse', 'npa', 'ville', 'pays', 'note'];
        if (!/^\S+@\S+\.\S+$/.test(f.email || '')) return go(res, withMsg(p, false, 'Adresse e-mail invalide.'));
        db.prepare(`UPDATE clients SET civ=?, ${ks.map((k) => k + '=?').join(',')}, complet=?, tz=? WHERE id=?`).run(f.civ === 'Monsieur' ? 'Monsieur' : 'Madame', ...ks.map((k) => String(f[k] || '').trim()), f.complet ? 1 : 0, U.okTz(f.tz || '') ? f.tz : 'Europe/Zurich', c.id);
        return go(res, withMsg(p, true, 'Fiche enregistrée.'));
      }
      return send(res, 200, layout('Patient', 'clients', pageClient(c, q), q));
    }
    if (p === '/admin/reglages') {
      if (m === 'POST') {
        const f = await readForm(req);
        for (const k of ['meet', 'tarifs', 'rappelPay', 'limitePay', 'delai', 'rappel', 'alerte', 'conditions']) if (f[k] !== undefined) set(k, String(f[k]).trim());
        if (f.types !== undefined) {
          const t = f.types.split('\n').map((l) => l.split('|')).filter((x) => x[0].trim()).map(([n, d]) => ({ nom: n.trim(), duree: Number(d) || 60 }));
          if (t.length) set('types', JSON.stringify(t));
        }
        if (f.google_calendar !== undefined) {
          const old = get('google_calendar');
          set('google_calendar', f.google_calendar);
          set('google_actif', f.google_actif ? '1' : '0');
          if (f.google_calendar && f.google_calendar !== old) {
            try { const k = await U.google('GET', `/users/me/calendarList/${encodeURIComponent(f.google_calendar)}`); set('google_calendar_name', k.summaryOverride || k.summary || ''); } catch { /* sans importance */ }
            // les rendez-vous à venir seront recréés dans le nouvel agenda
            db.prepare("UPDATE rdvs SET gcal_id='' WHERE date>=?").run(U.today());
            for (const r of db.prepare("SELECT id FROM rdvs WHERE date>=? AND statut<>'off'").all(U.today())) await R.syncGoogle(r.id);
          }
        }
        return go(res, withMsg('/admin/reglages', true, 'Réglages enregistrés.'));
      }
      return send(res, 200, layout('Réglages', 'reglages', await pageReglages(), q));
    }
    if (p === '/admin/reglages/test' && m === 'POST') {
      const f = await readForm(req);
      const ok = await U.sendMail({ to: f.to, subject: 'Test — agenda', html: '<p>Si vous lisez ceci, l\'envoi d\'e-mails de l\'agenda fonctionne.</p>', text: 'Test OK', kind: 'test' });
      return go(res, withMsg('/admin/reglages', ok, ok ? 'E-mail de test envoyé.' : 'Échec de l\'envoi (voir « Derniers e-mails »).'));
    }
    if (p === '/admin/google/connecter') {
      if (!U.googleReady()) return go(res, withMsg('/admin/reglages', false, 'GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET manquent dans Coolify.'));
      res.writeHead(302, { Location: U.googleAuthUrl(U.sign({ g: 1 }, 900)) }); return res.end();
    }
    if (p === '/admin/google/retour') {
      if (!U.verify(q.get('state')) || !q.get('code')) return go(res, withMsg('/admin/reglages', false, 'Connexion Google interrompue.'));
      try { await U.googleExchange(q.get('code')); return go(res, withMsg('/admin/reglages', true, 'Google connecté. Choisissez maintenant l\'agenda de destination.')); }
      catch (e) { return go(res, withMsg('/admin/reglages', false, 'Google : ' + e.message)); }
    }
    if (p === '/admin/reglages/ical-nouveau' && m === 'POST') {
      set('ical_token', U.randomToken() + U.randomToken());
      return go(res, withMsg('/admin/reglages', true, 'Nouvelle adresse créée. Remplace l\'abonnement dans Google Agenda.'));
    }
    if (p === '/admin/google/deconnecter' && m === 'POST') {
      for (const k of ['google_refresh', 'google_email', 'google_calendar', 'google_calendar_name']) set(k, '');
      return go(res, withMsg('/admin/reglages', true, 'Google déconnecté.'));
    }
    return go(res, '/admin');
  }
  send(res, 404, head('Introuvable') + '<div class="client-main"><h1>Page introuvable</h1></div></body></html>');
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((e) => {
    console.error('[erreur]', e);
    if (!res.headersSent) send(res, 500, head('Erreur') + '<div class="client-main"><h1>Une erreur est survenue</h1><p class="lead">Merci de réessayer dans un instant.</p></div></body></html>');
  });
});
server.listen(PORT, () => console.log(`Agenda v${VERSION} sur le port ${PORT} — ${U.SITE_URL}`));

// tâches automatiques : au démarrage puis toutes les 10 minutes
let enCours = false;
async function tick() { if (enCours) return; enCours = true; try { await R.taches(); } catch (e) { console.error('[tâches]', e); } enCours = false; }
setTimeout(tick, 5000);
setInterval(tick, 10 * 60 * 1000);
