# FeelShareLove — lot 46 (regroupe les lots 46, 47 et 48)

Version 1.18.2 (11/11/2026)
- Le serveur contrôle tout ce qu'il reçoit : champs techniques nettoyés, textes limités en longueur, photo = image uniquement, taille maximale par portrait (2 Mo) et par autre élément (200 Ko)
- Les scripts écrits dans une page ou venus d'ailleurs ne s'exécutent plus (politique de contenu obligatoire, y compris dans l'admin)
- L'app échappe la photo, l'avatar, les types et la durée des photos éphémères ; le traducteur ne peut plus transformer un pseudo ou un titre en code
- Liens « Retour » (aide, conditions, mentions légales) et pages d'accueil publiques adaptés à cette politique (nouveau fichier site/home.js)
- Pause après trois signalements : seule l'équipe peut la lever ; l'étiquette « profil de démonstration » ne peut plus être posée par un membre
- Un seul message tant que l'autre n'a pas ouvert la conversation, contrôlé par le serveur ; message limité à 5 000 caractères
- Limites de fréquence par personne : écritures, messages (40 par minute), fichiers (40 par heure), cercles (5 par jour), signalements et propositions (30 par heure)
- Fichiers envoyés : images et sons seulement, tout autre type est neutralisé
- Deux messages du serveur traduits dans les 5 langues
- Refus d'une conversation : l'app envoie le numéro de la phrase choisie, le serveur refuse tout autre texte
- Le refus s'affiche dans la langue de celui qui le lit, accordé comme l'a choisi la personne qui refuse
- Les anciens refus restent affichés tels qu'ils ont été envoyés
- Variantes accordées (masculin, féminin, neutre) traduites dans les 5 langues
- Propositions : le bouton « Envoyer » ne répondait plus quand l'app n'était pas en français (la roue d'attente était effacée par la traduction) ; corrigé
- Réglages : même correction pour « M'envoyer l'e-mail de confirmation » (suppression du compte)
- La roue d'attente est maintenant dessinée par le style du bouton

Fichiers : app/css/feelsharelove.css, app/js/app.js, app/js/i18n.js, app/js/lang/de.js, app/js/lang/en.js, app/js/lang/es.js, app/js/lang/it.js, app/js/lang/pt.js, app/js/pages/aide.js, app/js/pages/conditions.js, app/js/pages/legal.js, app/js/pages/messages.js, app/js/pages/personne.js, app/js/pages/reglages.js, app/js/propose.js, app/js/router.js, app/site/de.html, app/site/en.html, app/site/es.html, app/site/fr.html, app/site/home.js, app/site/it.html, app/site/pt.html, server/server.js
