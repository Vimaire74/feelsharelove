# FeelShareLove — version 1.1

Version 1.1 (12/11/2026)
- CORRECTION URGENTE : depuis la version 1.0, la recherche des villes ne répondait plus (distances et pays non calculés pour une ville nouvelle ou modifiée)
- Ville : la personne écrit sa ville exacte, qui reste privée ; les autres voient la ville de 20 000 habitants ou plus la plus proche (ex. Pully → Lausanne, Savièse → Sion)
- Mon portrait : sous la ville, « Affiché aux autres : … »
- Textes d'explication de la ville mis à jour (portrait et création du compte)
- Les portraits existants sont convertis automatiquement au démarrage du serveur
- Admin, fiche d'un compte : la ville affichée est indiquée à côté de la ville exacte
- Mentions légales : nouvelle rubrique « Données » (liste des villes GeoNames, licence CC BY 4.0)
- Nouveau fichier app/data/villes.json : 18 877 villes de 20 000 habitants ou plus
- Textes traduits dans les 5 langues

Fichiers : server/server.js, app/data/villes.json (nouveau), app/js/version.js, app/js/db-remote.js, app/js/pages/portrait.js, app/js/pages/accueil.js, app/js/pages/legal.js, app/css/feelsharelove.css, app/js/lang/*.js
