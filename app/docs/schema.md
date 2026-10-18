# FeelShareLove — structure de la base de données

La même structure sert en local (IndexedDB dans le navigateur, fichier js/db.js) et servira plus tard sur le serveur (schema.sql, Supabase/PostgreSQL). Une table = un « store » local.

## profiles — les portraits
- id : identifiant (« me » = l'utilisateur de cet appareil)
- name (vrai prénom, privé), pseudo (affiché), adultAt (confirmation 18 ans), onboardedAt
- avail : { wants: [parler, rire, decouvrir, proposer, soiree, ecoute], note, until } ; circles : cercles rejoints
- city, tz (décalage horaire en heures), online (vrai/faux)
- intent : liste parmi parler / amis / amour
- now : texte « En ce moment »
- photo : image (petite, carrée)
- facts : { birth, sign, langs, roots, pets, work, study } chacun { v: valeur, show: visible oui/non, year: montrer l'année (naissance) }
- av : couleur d'avatar de démonstration (personnes fictives seulement)
- updatedAt

## entries — « ce qui me fait vibrer »
- id, profileId → profiles.id
- kind : Film, Livre, Musique, Série, Lieu, Activité, Objet, Souvenir, Personne, Autre
- title : le titre ; workId : identifiant catalogue (« wp:… », Wikipédia) quand l'œuvre a été choisie dans les propositions ; desc : description du catalogue
- feel : ce que ça me fait, deux au plus parmi bouleverse, console, rire, courage, nostalgie, calme
- why : le pourquoi
- updatedAt

## questions — questions ouvertes
- id, profileId → profiles.id
- k : la question, a : la réponse

## messages
- id, thread (= id de l'autre personne, côté local), from, to
- kind : text | ephemeral
- text ; about / aboutTitle : l'entrée du portrait dont part le message
- seconds, seen : pour les photos éphémères
- ts : date-heure

## threads — porte des premiers messages (version 2)
- id (= id de l'autre personne), status : pending-out (j'ai écrit, j'attends) | pending-in (on m'a écrit, à moi d'ouvrir) | open | declined
- startedBy, firstAt (sert à la limite de 3 premiers messages par jour), acceptAt (simulation locale)

## voices — enregistrements audio (version 2)
- id (« pres-me » = ma présentation), owner, kind : presentation | message, blob (le son), secs
- dans la sauvegarde JSON, le son est converti en texte (dataUrl)

## circlePosts — messages des cercles et réponses à la question du jour (version 2)
- id, circleId (ou « qdj-AAAA-MM-JJ » pour la question du jour), author, text, ts

## lists — liste rouge et liste noire
- id, owner (→ profiles.id), type : red | black
- name, hint (téléphone ou e-mail pour la liste rouge)

## reports — signalements
- id, by, target (profil visé), kind : profile | photo | block
- messageId (si photo), reason, status : open | done

## circles — cercles ouverts
- id, title, members

## settings
- key, value (ex. seeded = vrai une fois les données de départ chargées)

## Règles déjà appliquées dans les pages
- Les personnes de la liste rouge ou noire disparaissent de Maintenant, Résonances et Messages.
- Résonance niveau 1 : même œuvre (workId, sinon titre sans accents) + même émotion (deux entrées différentes qui font la même chose) + échos (mot de 5 lettres ou plus commun aux titres).
- Premier message : uniquement en réponse à une entrée ; l'autre ouvre ou ignore ; 3 par jour.
- Un signalement de photo conserve la référence du message même si la photo a disparu de l'écran.
