# FeelShareLove — lot 20

Version 1.9.0 (03/11/2026)
- Présent : suppression des choix « Disponibles », « Qui résonne avec moi », « Même intention », « Vérifiés seulement »
- Présent : seulement les personnes disponibles, de la plus forte résonance à la plus faible ; 3 d'abord, puis « Voir plus » par 20
- « Vérifiés seulement » se règle dans Résonances et s'applique aussi à Présent (petite ligne de rappel sur Présent)
- Résonances : « À moins de 100 km » avec une vraie distance (coordonnées des villes via Open-Meteo, arrondies à 5 km, jamais montrées aux autres)
- Résonances : choix « Résonance d'au moins » 100 % à 10 %
- Résonances : « Cacher pour le moment » (un mois) et « Montre-moi ceux que j'ai cachés »
- Résonances : 20 personnes d'abord, puis « Voir plus »
- Résonances : suppression des « échos » (un simple mot en commun dans deux titres)
- Mon portrait : « La couleur de ma tribu », 12 couleurs au choix (Rubis par défaut), privée
- Les membres de ma tribu m'apparaissent sur ma couleur : dans les listes et en fond de leur portrait, de nos résonances et de la conversation
- Résonances avec un membre de ma tribu : ma vraie photo s'affiche si j'ai coché « Montrer ma vraie photo à ma tribu »
- Profils de test : SophieAube et JeanJacquesSol vérifiés ; Brad, Sandra et Sophie cherchent l'amour (cliquer « Remplir les profils de test » dans l'admin)
- Photo : trois nouveaux styles calculés sur le téléphone, Pointillisme, Art déco et Mosaïque (en plus de Crayon, Affiche, Aquarelle, Peinture de points)
- Mon portrait : nouvelle rubrique « Mes langues » en haut : la langue de l'app, la langue de mon portrait (celle de mes textes), les portraits que je veux voir
- Le choix de la langue de l'app quitte Réglages (un renvoi vers Mon portrait y reste)
- Présent et Résonances : on ne voit que les portraits écrits dans les langues qu'on a cochées
- Exception : un portrait d'une autre langue est montré s'il résonne à 90 % ou plus, avec l'étiquette « Portrait en espagnol · parle français »
- L'étiquette apparaît aussi sur le portrait de la personne et dans le détail des résonances
- Anciens portraits : considérés comme écrits en français ; langues à voir = langue de l'app + langues parlées
- Admin, fiche de compte : langue du portrait
- L'app parle 6 langues : français, allemand, anglais, italien, espagnol, portugais (langue du téléphone par défaut, changeable dans Mon portrait)
- Nouveau dossier app/js/lang (un fichier par langue) et nouveau fichier index.html qui les charge
- Traduits : menus, tous les écrans, création du compte, page d'accueil, conditions, test de fonctionnement, catalogue (cœur, métiers/rôles/tendances), ressentis, envies, mots de pseudo
- Restent en français : ce que les gens écrivent, les profils de démonstration, les notifications et e-mails du serveur, l'admin
- Dates et heures dans le format de la langue choisie
- Création du compte : le choix « Écris-moi » (masculin / féminin / neutre) ne s'empile plus lettre par lettre
- Le texte source des traductions est dans le dossier traductions/traductions.txt (une ligne par phrase, 6 colonnes)
