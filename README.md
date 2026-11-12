# FeelShareLove — lot 57

Version 1.26.0 (11/11/2026)
- Mot de passe : lien « Afficher le mot de passe » / « Masquer le mot de passe » sous chaque champ (connexion, création du compte, mot de passe oublié, Réglages)
- Réglages › Compte : l'adresse e-mail et le numéro de mobile du compte sont affichés, visibles seulement par la personne elle-même
- Réglages › Compte : nouveau bouton « Changer mon mot de passe » (mot de passe actuel + nouveau) ; les autres appareils sont déconnectés
- Accès perdu : sur l'écran « Mot de passe oublié » et dans Aide et conditions (« Mot de passe perdu »), texte expliquant que le lien par e-mail est à essayer en premier, et qu'en secours on écrit à contact@feelsharelove.com avec le numéro de mobile du compte
- Admin, fiche d'un compte : ligne « Mobile » et carte « Accès perdu » pour remplacer l'adresse e-mail après vérification du mobile (toutes les sessions du compte sont fermées)
- Mon portrait : prénom et nom sur une ligne, code postal et ville sur la suivante, dans un bloc plus discret
- Profils de démonstration : 15 nouveaux personnages (25 en tout), quatre par langue au moins, un par type de fonctionnement (mental, émotionnel, sensible, physique), chacun parlant au moins deux langues
- Les 10 profils existants n'ont plus qu'un seul type de fonctionnement ; tous reçoivent des genres d'histoires préférés
- Les profils de démonstration répondent à tout message, invitation ou « moi aussi » par le même message (dans la langue de la personne) et acceptent toujours d'entrer dans la tribu
- Aide et conditions : texte sur les profils de démonstration mis à jour
- APRÈS LE DÉPLOIEMENT : admin › Réglages › « Remplir les profils de démonstration » pour créer les nouveaux personnages
- Vérification du site : les phrases, descriptions, titres et pseudos écrits par les membres ne sont plus signalés comme « textes restés en français »
- Textes traduits dans les 5 langues

Fichiers : server/server.js, server/fakes.js, app/js/db-remote.js, app/js/i18n.js, app/js/pages/connexion.js, app/js/pages/reglages.js, app/js/pages/portrait.js, app/js/pages/conditions.js, app/css/feelsharelove.css, app/js/lang/*.js
