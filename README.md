# FeelShareLove — lot 47 (à envoyer APRÈS le lot 46)

Version 1.19.0 (11/11/2026)
- Messages : après l'envoi, l'écran reste en bas sur le dernier message et le champ d'écriture garde le curseur (plus de remontée en haut, ni sur téléphone ni sur ordinateur)
- Messages : la conversation n'est plus redessinée toutes les 8 secondes ; seuls les nouveaux messages et réactions s'ajoutent, sans bouger si on est remonté lire plus haut
- Messages : un message qui parle d'un goût du portrait porte une pastille jaune « Sur ton portrait · titre » (ou « Sur son portrait ») et un cadre jaune
- Messages : un toucher sur une bulle ouvre ses outils — six réactions (❤️ 😂 😮 😢 🙏 👍) et « Répondre »
- Messages : répondre à un message précis ; le message cité s'affiche dans la réponse, un toucher dessus y ramène
- Les réactions des deux personnes s'affichent sous la bulle ; retoucher la même réaction l'enlève
- Serveur : réactions limitées aux six prévues, réservées aux deux personnes de la conversation
- Textes traduits dans les 5 langues

Fichiers : server/server.js, app/js/app.js, app/js/pages/messages.js, app/css/feelsharelove.css, app/js/lang/*.js
