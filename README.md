# FeelShareLove — version 1.2

Version 1.2 (13/11/2026)
- Résonances : un mot tapé dans la recherche remplace les critères choisis (OU, plus ET) ; une phrase le signale
- Présent : « Regarder un film ensemble* » ; en bas du cadre, « * à distance, avec un outil de partage comme Teleparty » (lien qui s'ouvre dans un nouvel onglet)
- Présent : suppression du champ « Préciser (facultatif) »
- Villes : quand plusieurs villes portent le même nom, choix du pays indiqué, sinon d'un pays de la langue du portrait, sinon la plus peuplée (corrige Lisboa → Mozambique, Roma → Roumanie)
- Villes : nouvel essai dans la langue du portrait si le nom n'est pas trouvé (Ciudad de México)
- Pays du domicile : nouvelle liste déroulante à la création du compte (étape 3) et dans Mon portrait, déjà réglée d'après l'indicatif du mobile ; elle sert à trouver la bonne ville et à afficher le pays
- Résonances : le filtre « Dans mon pays » utilise ce pays
- Les villes déjà enregistrées sont recalculées au démarrage du serveur
- Textes traduits dans les 5 langues

Fichiers : server/server.js, app/js/version.js, app/js/app.js, app/js/pages/now.js, app/js/pages/accueil.js, app/js/pages/portrait.js, app/js/pages/resonances.js, app/css/feelsharelove.css, app/js/lang/*.js
