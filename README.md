# Agenda — rdv.guerir.ch

Agenda professionnel sur mesure (Node.js 22, base SQLite), même principe que cours.guerir.ch : dépôt GitHub privé → Coolify → bouton Deploy.

## Version 1.6.1 (lot 14 — 2 novembre 2026)
- Fiche rendez-vous : lien Google Meet cliquable et bouton « Lancer la visio » (ouvre un nouvel onglet)

## Version 1.6.0 (lot 13 — 31 octobre 2026)
- Agenda : journée affichée à partir de 9h
- Agenda : samedi et dimanche réduits à une bande étroite grisée « W-E », non cliquable
- Agenda : fond vert sauge doux à la place du blanc, couleurs des rendez-vous accordées
- Agenda : seulement l'heure et le nom du patient, plus la note interne s'il y en a une
- Référence Koalendar rangée à part : la note interne reste vide pour les rendez-vous importés

## Version 1.5.2 (lot 12 — 31 octobre 2026)
- Nouveau rendez-vous : recherche du patient en tapant les premières lettres du nom, du prénom ou de l'e-mail (accents ignorés)

## Version 1.5.1 (lot 11 — 30 octobre 2026)
- Import Koalendar : rendez-vous passés archivés sans demande de confirmation de réception
- Import Koalendar : adresse complète reprise pour une fiche incomplète qui n'avait qu'une adresse partielle

## Version 1.5.0 (lot 10 — 30 octobre 2026)
- Fuseau horaire sur la fiche patient ; e-mails et page de rendez-vous affichés à l'heure du patient (avec l'heure suisse si elle diffère)
- Fuseau proposé automatiquement au patient quand il remplit ses coordonnées
- Import des patients : colonne « fuseau » ; met à jour le fuseau des patients déjà présents
- Rendez-vous importés de Koalendar : bouton « Confirmer ce rendez-vous » dans l'e-mail, avec demande des coordonnées manquantes
- Liste des rendez-vous : filtre et étiquette « Réception à confirmer »
- Rendez-vous importés de Koalendar : rappel 24 h avant réactivé

## Version 1.4.1 (lot 09 — 30 octobre 2026, regroupe les lots 05 à 08 non envoyés)
- Fiche patient : bouton « Supprimer ce patient » (avec confirmation ; ses rendez-vous sont supprimés aussi, sans e-mail)

## Version 1.4.0
- Nouveau menu E-mails : message à tous les patients ou à ceux qui ont un rendez-vous à venir
- Message personnalisé par patient : {appel} et {rendez-vous} (ses rendez-vous à venir avec le lien de visioconférence ou le lien pour confirmer et régler)
- Aperçu avant envoi, envoi en arrière-plan, journal des e-mails
- Rendez-vous importés de Koalendar : lien Meet par défaut (Réglages) à la place des liens Koalendar
- Menu « Clients » renommé « Patients »

## Version 1.3.1 (lot 07 — 30 octobre 2026)
- Import Koalendar : séances comprises dans un forfait enregistrées comme payées (« forfait »)
- Import Koalendar : pays retiré du nom de la localité (« Valbonne France » → Valbonne, France)

## Version 1.3.0 (lot 06 — 30 octobre 2026)
- Rendez-vous : import d'un export « bookings » de Koalendar (CSV), sans aucun e-mail ni rappel
- Rendez-vous payés sur Koalendar enregistrés comme payés, lien Meet ou lieu d'origine conservé
- Coordonnées manquantes des patients complétées (adresse, date de naissance, mobile)
- Rendez-vous déjà importés ignorés

## Version 1.2.0 (lot 05 — 30 octobre 2026)
- Patients : import d'un fichier CSV (civilite, prenom, nom, email, mobile), sans envoi d'e-mail, adresses déjà présentes ignorées

## Version 1.1.0 (lot 04 — 29 octobre 2026)
- Paiement par Stripe (en euros), activé dès que STRIPE_SECRET_KEY est présent ; Mollie reste disponible pour plus tard
- Webhook Stripe : https://rdv.guerir.ch/stripe/webhook (événement checkout.session.completed)
- Remboursement Stripe possible à l'annulation
- Réglages → État technique : clé Stripe et webhook

## Version 1.0.2 (lot 03 — 29 octobre 2026)
- Abonnement iCal : adresse secrète dans Réglages, à ajouter dans Google Agenda (« Autres agendas » → « À partir de l'URL »)
- Bouton pour créer une nouvelle adresse iCal (l'ancienne cesse de fonctionner)

## Version 1.0.1 (lot 02 — 29 octobre 2026)
- Cases à cocher agrandies (20 px) et aux couleurs de l'agenda

## Version 1.0.0 (lot 01 — 29 octobre 2026)
- Admin vert forêt : agenda à la semaine, liste des rendez-vous par statut, fiches patients, réglages
- Nouveau rendez-vous : patient existant ou nouveau (civilité, prénom, nom, e-mail), type de séance, date, heure, prix 80 / 90 / 120 / 150 € ou montant avec rabais, lien Google Meet
- E-mail au patient avec son lien personnel ; premier rendez-vous : le patient remplit date de naissance, adresse, e-mail et mobile
- Le patient confirme (« Oui, ce rendez-vous me convient »), puis paie tout de suite ou demande un rappel de paiement 10 jours plus tard (au plus tard 5 jours avant le rendez-vous)
- Paiement en euros par Mollie ; confirmation automatique avec le lien Meet et une invitation .ics
- Alertes à info@guerir.ch : séance non payée à l'échéance, patient sans réponse après 48 h
- Rappel automatique de la séance 24 h avant
- Modifier un rendez-vous (le patient est prévenu), annuler (avec remboursement Mollie au choix), marquer payé à la main
- Google Agenda : chaque rendez-vous est envoyé dans l'agenda choisi, mis à jour et retiré en cas d'annulation
- Journal des e-mails et e-mail de test dans Réglages

## Mise en ligne (une fois)

1. **GitHub** : créer un dépôt **privé** `agenda-guerir` et y téléverser le contenu de `A_uploader/lot-01`.
2. **Coolify** (serveur guerir.ch) : Nouvelle ressource → dépôt GitHub privé (clé de déploiement, comme pour cours-guerir) → type **Dockerfile** → port **8092**.
   - Volume persistant : `/app/data` (base des rendez-vous et des patients ; sans ce volume, tout est perdu au redéploiement).
   - Domaine : `https://rdv.guerir.ch`.
3. **Variables d'environnement** (cocher « Is Literal » pour les valeurs avec caractères spéciaux) :

| Variable | Rôle |
|---|---|
| `SITE_URL` | `https://rdv.guerir.ch` |
| `SESSION_SECRET` | longue chaîne au hasard, à ne plus changer |
| `ADMIN_USER` / `ADMIN_PASS` | identifiant (`marc`) et mot de passe de l'admin |
| `MAIL_HOST` / `MAIL_PORT` / `MAIL_SECURE` | serveur SMTP, mêmes valeurs que pour cours-guerir |
| `MAIL_USER` / `MAIL_PASS` | compte d'envoi (info@guerir.ch) |
| `MAIL_FROM` | facultatif, par défaut `"Marc Isenschmid" <MAIL_USER>` |
| `STRIPE_SECRET_KEY` | clé secrète Stripe (`sk_test_…` pour essayer, puis `sk_live_…`) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` du webhook https://rdv.guerir.ch/stripe/webhook |
| `MOLLIE_API_KEY` | facultatif, si un jour on passe à Mollie (Stripe est prioritaire s'il est configuré) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | identifiants Google (voir ci-dessous) |
| `DATA_DIR` | `/app/data` |

4. **DNS** (OVH, zone guerir.ch) : enregistrement `A` pour `rdv` → IP du serveur (152.228.243.42).
5. **Mollie** : Développeurs → Clés API → copier la clé dans Coolify. Aucun webhook à configurer : l'agenda l'indique lui-même à chaque paiement. Activer les moyens de paiement voulus dans Mollie (cartes, Apple Pay, Google Pay…).
6. **Google Agenda** (console.cloud.google.com, compte Google qui possède l'agenda) :
   - créer un projet « Agenda guerir » ;
   - activer l'API **Google Calendar API** ;
   - écran de consentement : application externe, puis **la publier (« En production »)** — sinon Google coupe la connexion au bout de 7 jours ;
   - créer un identifiant **OAuth, application Web**, avec l'URI de redirection `https://rdv.guerir.ch/admin/google/retour` ;
   - copier l'ID client et le code secret dans Coolify ;
   - dans l'agenda : Réglages → « Connecter mon compte Google » → accepter (Google affiche un avertissement « application non validée » : c'est normal pour une application personnelle, continuer) → choisir l'agenda de destination → Enregistrer.
7. Deploy.

## Après la mise en ligne
1. Réglages → coller le lien Google Meet permanent → Enregistrer.
2. Réglages → « Envoyer un e-mail de test ».
3. Créer un rendez-vous test à votre propre adresse, le confirmer et le payer avec la clé `test_` de Mollie, puis passer à la clé `live_`.

## Sauvegardes
Tout est dans le volume `/app/data` (`agenda.db`).

## Structure du code
- `server.js` — pages admin, pages patient, routes
- `lib/rdv.js` — e-mails, paiement Mollie, Google Agenda, tâches automatiques (toutes les 10 minutes)
- `lib/db.js` — base et réglages
- `lib/util.js` — dates (heure de Zurich), sessions, envoi d'e-mails, appels Mollie et Google
- `public/style.css` — style (maquette validée le 29 octobre 2026)

Développement local : `ADMIN_PASS=test node server.js` puis http://localhost:8092/admin (sans Mollie, le paiement est simulé ; sans SMTP, les e-mails s'affichent dans la console).
