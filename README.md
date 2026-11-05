# FeelShareLove — lot 27 (à envoyer APRÈS le lot 26)

Version 1.11.0 (05/11/2026)
- Inscription en deux temps : l'adresse e-mail d'abord, un e-mail avec un lien (valable 24 h, dans la langue de l'app), puis le mot de passe une fois le lien cliqué ; écran « Regarde tes e-mails » avec « Renvoyer » et « Changer d'adresse »
- Mot de passe des nouveaux comptes : 10 caractères au moins, une majuscule, une minuscule, un chiffre ou un signe (règles affichées et cochées en direct) ; les mots de passe existants restent valables
- Première étape du portrait : numéro de mobile obligatoire, privé, jamais affiché (pour retrouver son compte si un problème survient avec l'e-mail)
- Admin, nouvel onglet « Liste rouge » : adresses e-mail, numéros de mobile, prénoms et noms. Adresse de la liste à l'inscription : l'écran « Regarde tes e-mails » s'affiche mais rien ne part ; numéro ou nom de la liste au portrait : compte invisible pour tous, qui ne voit personne, sans aucun message ; un nom seul est à confirmer dans l'admin (homonymes). Les comptes déjà inscrits qui correspondent sont marqués dès l'enregistrement de la liste
- Secours : si le serveur ne peut pas envoyer d'e-mails, l'inscription demande le mot de passe tout de suite comme avant
- Nécessite dans Coolify : SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM, SITE_URL (faits le 05/11/2026)

Fichiers : server/server.js, app/js/db-remote.js, app/js/pages/connexion.js, app/js/pages/accueil.js, app/css/feelsharelove.css, app/js/lang/*.js
