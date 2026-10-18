# FeelShareLove — lot 1

Version 1.0.0 (18/10/2026)
- Serveur Node.js : API, application web et page d'administration (server/)
- Base PostgreSQL : tables créées automatiquement au premier démarrage
- Comptes : inscription et connexion par e-mail et mot de passe
- Application web reliée au serveur quand elle est ouverte depuis le site ; reste locale quand elle est ouverte depuis le dossier
- Conversations réelles entre personnes, vérification rafraîchie toutes les 8 secondes
- Listes rouge et noire appliquées par le serveur, dans les deux sens
- Prénom, nom et code postal jamais envoyés aux autres
- Pseudos uniques vérifiés par le serveur
- Administration : vérifications d'identité (valider / refuser), signalements, suspension de comptes
- Mes données : recharger la sauvegarde locale dans le compte, supprimer le compte
