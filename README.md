# FeelShareLove — lot 49 (à envoyer APRÈS le lot 48)

Version 1.20.0 (11/11/2026)
- Propositions : capture automatique refaite avec un nouvel outil, fidèle à l'écran (polices, espaces, position dans la page) ; l'ancien outil reste en secours
- Propositions : les boutons roses « Proposer une correction » n'apparaissent plus dans la capture
- Propositions : bouton « Joindre ma propre image » (galerie ou fichiers) et collage d'une image sur ordinateur ; l'image jointe remplace la capture automatique
- Polices Fraunces et Figtree hébergées sur le serveur (nouveau dossier app/fonts) : plus aucun appel à Google Fonts sur le site, l'app et l'admin
- Les polices sont gardées un an par le navigateur au lieu d'être redemandées à chaque visite
- Mentions légales : la phrase sur Google Fonts est retirée
- Textes traduits dans les 5 langues

Fichiers : server/server.js, app/index.html, app/css/feelsharelove.css, app/js/propose.js, app/js/vendor/modern-screenshot.js (nouveau), app/js/pages/legal.js, app/site/fr.html, de.html, en.html, it.html, es.html, pt.html, app/fonts/ (nouveau dossier : fonts.css et 6 fichiers .woff2), app/js/lang/*.js
