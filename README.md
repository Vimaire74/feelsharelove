# FeelShareLove — lot 45, sécurité 1

Version 1.17.0 (10/11/2026)
- Admin : une capture de proposition n'est acceptée et affichée que si c'est une vraie image envoyée par la personne ; elle ne peut plus s'ouvrir comme une page
- Suppression de compte : la suppression immédiate est retirée du serveur ; seule reste la voie avec e-mail de confirmation
- Mes données (en ligne) : le bouton « Tout effacer » est remplacé par un renvoi vers Réglages ; texte de sauvegarde corrigé
- En-têtes de sécurité sur toutes les pages (anti-incrustation, HTTPS forcé, type de fichier strict, adresse de l'admin jamais transmise)
- Politique de contenu (CSP) en mode « rapport seulement » : elle ne bloque rien pour l'instant
- Le serveur ne s'arrête plus sur une erreur oubliée : elle est notée dans le journal
- Textes traduits dans les 5 langues

Fichiers : server/server.js, app/js/db-remote.js, app/js/pages/donnees.js, app/js/lang/*.js
