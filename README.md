# FeelShareLove — lot 51 (à envoyer APRÈS les lots 48, 49 et 50)

Version 1.21.0 (11/11/2026)
- Veille des contenus publics : une fois par jour, le serveur relit portraits, « en ce moment », pourquoi des entrées, questions ouvertes et cercles, et repère des mots de violence, d'agression, de violence sexuelle, d'arnaque, de contact extérieur et de détresse, dans les six langues
- Les messages privés ne sont pas analysés ; les titres d'œuvres non plus (un film peut s'appeler « Kill Bill »)
- Admin : nouvel onglet « Alertes » (extrait avec le mot surligné, compte, endroit), boutons Classer, Avertir, Suspendre, « Analyser maintenant », « Tout classer »
- Aucune sanction automatique ; une alerte classée ne revient pas tant que le texte ne change pas ; les profils de démonstration sont ignorés
- Conditions et mentions légales : la relecture automatique des contenus publics est annoncée
- Menu, portrait en pause : l'encadré des propositions est remplacé par un encadré jaune « Ton portrait est en pause » avec « Annuler ma pause » ; pas de boutons de proposition pendant la pause
- Écran de pause : il renvoie à « Annuler ma pause » dans le menu
- Menu : l'entrée « Mon portrait » est retirée (déjà dans la barre du bas)
- Textes traduits dans les 5 langues

Fichiers : server/server.js, app/js/app.js, app/js/router.js, app/js/propose.js, app/js/pages/conditions.js, app/js/pages/legal.js, app/css/feelsharelove.css, app/js/lang/*.js
