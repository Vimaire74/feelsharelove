# FeelShareLove — lot 31 (à envoyer APRÈS le lot 30)

Version 1.13.0 (08/11/2026)
- Portrait, nouvelle rubrique « Mes histoires préférées » (films, livres, séries) : 19 genres dont « Littérature » et « Drame » séparés, 5 au choix au plus
- Dans chaque genre choisi, des œuvres très connues proposées selon l'âge (moins de 30 ans, 30-50, 50-70, plus de 70, d'après la date de naissance), « Plus de choix » pour les autres tranches, et un champ pour ajouter sa propre œuvre
- Création du compte : nouvelle étape « Tes histoires préférées » juste avant « Trois choses que tu aimes vraiment »
- « Ce qui me fait vibrer » reste ouvert à tout (activités, lieux, souvenirs…) ; les œuvres cochées dans « Mes histoires préférées » y sont proposées en premier, sans retaper le titre
- Présent : bandeau « Nouveau · Tes histoires préférées » pour les inscrits qui n'ont encore choisi aucun genre ; il mène à la rubrique et disparaît une fois un genre choisi
- Résonance : par genre commun +1 ; si les deux ont choisi des œuvres, +1 par œuvre commune ; sinon +2 ; 10 au plus ; une œuvre déjà commune dans « Ce qui me fait vibrer » n'est pas recomptée
- Résonance, « Ce qui me fait vibrer » : une œuvre très connue (présente dans les listes des histoires préférées) ne vaut plus que 1 point au lieu de 6, sauf si les deux personnes ont écrit un vrai paragraphe (300 caractères ou plus) sur ce qu'elle leur fait ; les œuvres moins connues gardent leurs 6 points
- Les genres et œuvres en commun apparaissent dans les étiquettes des résonances (nouvelle couleur « Nos histoires préférées ») et sur le portrait des autres
- « Ce qui t'amène » : cinq choix, avec une explication sous certains : « Des échanges » (discuter, partager, au fil des envies), « Partager sa passion pour quelque chose », « Se faire des amis » (des liens qui durent, se voir en vrai), « Trouver quelqu'un à aimer », « Rompre ma solitude »
- « Rompre ma solitude » est privé : jamais visible, ni sur le portrait, ni dans la tribu, et jamais transmis aux autres ; c'est le serveur qui compte +5 quand deux personnes l'ont choisi
- Résonance : « Partager sa passion » choisi par les deux +2
- Création du compte : mentions « visible » ou « privé » sous les champs (ville visible sans adresse, la grande ville la plus proche suffit ; code postal privé ; « En ce moment » visible seulement une fois une conversation ouverte), « Tu pourras tout modifier ensuite dans ton portrait », pseudo modifiable une fois pendant le premier mois
- Textes traduits dans les 5 langues ; les listes d'œuvres sont pour l'instant les listes françaises

Fichiers : server/server.js, app/index.html, app/js/genres.js (nouveau), app/js/app.js, app/js/plus.js, app/js/pages/portrait.js, app/js/pages/accueil.js, app/js/pages/now.js, app/js/pages/personne.js, app/js/pages/resonances.js, app/css/feelsharelove.css, app/js/lang/*.js
