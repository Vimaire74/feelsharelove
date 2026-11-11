# FeelShareLove — lot 56

Version 1.25.0 (11/11/2026)
- Mentions légales et politique de confidentialité : toute la page est traduite en allemand, anglais, italien, espagnol et portugais
- Correction du texte français : « les télécharger (menu › Mes données) »
- Nouveau : vérification automatique du site, chaque jour et cinq minutes après chaque redéploiement
- Elle contrôle : fichiers illisibles ou vides, fichiers appelés mais absents, liens internes vers un écran inexistant, liens vers d'autres sites qui ne répondent pas, dictionnaires de traduction incomplets
- Les navigateurs des membres signalent au serveur les erreurs de script et les textes restés en français dans une autre langue (aucune donnée personnelle)
- Admin : nouvel onglet « Vérification » (rapport, « Vérifier maintenant », téléchargement .txt, envoi par e-mail, vidage des signalements)
- Le rapport part par e-mail une fois par jour, en pièce jointe .txt
- Politique de confidentialité : nouvelle ligne « Des signalements techniques », dans les 6 langues ; date de mise à jour au 11 novembre 2026
- Page d'accueil de l'app : suppression du texte de prototype « application locale »

Fichiers : server/server.js, app/index.html, app/js/i18n.js, app/js/diag.js (nouveau), app/js/pages/legal.js, app/js/lang/*.js
