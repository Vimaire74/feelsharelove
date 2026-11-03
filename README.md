# FeelShareLove — lot 22 (à envoyer APRÈS les lots 20 et 21)

Version 1.9.2 (03/11/2026)
- Page d'accueil publique en 6 langues : feelsharelove.com (français), /de, /en, /it, /es, /pt — référencement Google/Bing/IA (titres, descriptions, hreflang, Open Graph, JSON-LD, FAQ)
- L'application elle-même est maintenant à feelsharelove.com/app (l'ancien / redirige tout seul vers /app pour les gens déjà connectés, pour les liens d'invitation et pour l'icône déjà installée sur l'écran d'accueil)
- Choisir une langue sur la page d'accueil, puis « Commencer », ouvre l'app dans cette langue
- robots.txt et sitemap.xml à la racine du site
- Notifications, service worker et manifeste pointent vers /app
- Captures d'écran et images de partage (Open Graph) dans app/site/

Fichiers : app/site/*, app/robots.txt, app/sitemap.xml, app/sw.js, app/manifest.webmanifest, server/server.js

Après la mise en ligne (à faire par Marc, gratuit) :
1. Google Search Console (search.google.com/search-console) : ajouter la propriété « feelsharelove.com », vérifier par DNS (OVH), puis « Sitemaps » → envoyer sitemap.xml
2. Bing Webmaster Tools (bing.com/webmasters) : importer depuis Search Console
