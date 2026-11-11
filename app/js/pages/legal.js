/* FeelShareLove — « Mentions légales » et « Politique de confidentialité » (version française, qui fait foi).
   Texte de travail rédigé par Claude, à faire relire par un juriste avant l'ouverture au public. */
Pages.legal=async function(S){
  const EDITEUR='TitanCorp, Inc.';
  const ADRESSE='société enregistrée au Delaware (États-Unis), 2810 N Church St STE 89496, Wilmington, DE 19802, États-Unis';
  const MAJ='9 novembre 2026';
  const sec=(t,h)=>`<div class="sec"><h3>${t}</h3>${h}</div>`, p=t=>`<p class="exp">${t}</p>`;
  S.innerHTML=`<a class="back" href="#now" data-back>← Retour</a><p class="eyebrow">Informations légales</p><h1>Mentions légales et <em>confidentialité</em></h1>
  <p class="muted small" style="margin:8px 0 14px">Dernière mise à jour : ${MAJ}. En cas de différence entre les langues, la version française fait foi.</p>

  <h2>Mentions <em>légales</em></h2>
  ${sec('Éditeur du site',p(`FeelShareLove (feelsharelove.com) est édité par ${EDITEUR}${ADRESSE?', '+ADRESSE:''}.<br>Contact : <a href="mailto:contact@feelsharelove.com" style="color:var(--saffron)">contact@feelsharelove.com</a>`))}
  ${sec('Hébergement',p('OVH SAS, 2 rue Kellermann, 59100 Roubaix, France. Les serveurs de FeelShareLove sont situés dans l\'Union européenne.'))}
  ${sec('Propriété intellectuelle',p('Le nom FeelShareLove, le logo, les textes et le code du site appartiennent à leur éditeur. Les textes, photos et enregistrements publiés par les membres restent leur propriété ; ils accordent à FeelShareLove le droit de les afficher aux autres membres, dans le seul but de faire fonctionner le service.'))}

  <h2>Politique de <em>confidentialité</em></h2>
  ${sec('Qui est responsable de tes données',p(`Le responsable du traitement est ${EDITEUR} (contact@feelsharelove.com). Nous appliquons le règlement général sur la protection des données (RGPD) et les lois applicables en matière de protection des données.`))}
  ${sec('Les données que nous traitons',`<ul class="exp legal-ul">
    <li><b>Ton compte</b> : adresse e-mail et mot de passe (enregistré sous forme chiffrée, que personne ne peut relire).</li>
    <li><b>Ton identité privée</b> : prénom, nom, ville et code postal, numéro de mobile, date de naissance. Ils ne sont pas montrés aux autres, sauf ce que tu choisis d'afficher.</li>
    <li><b>Ton portrait</b> : pseudo, photo prise en direct, ce que tu écris, tes choix (passions, histoires préférées, fonctionnement…), ta voix si tu l'enregistres.</li>
    <li><b>Tes échanges</b> : messages, photos éphémères, invitations, cercles, signalements et propositions de correction (avec la capture d'écran si tu la joins).</li>
    <li><b>La vérification d'identité</b>, si tu la demandes : la photo de ta pièce d'identité est supprimée dès le contrôle fait ; nous gardons seulement « vérifié le … ».</li>
    <li><b>Des données techniques</b> : date de ta dernière visite, adresse IP dans les journaux de sécurité, abonnement aux notifications si tu les actives.</li></ul>
    ${p('Certaines informations peuvent toucher à des sujets sensibles (spiritualité, ce que tu traverses, ce que tu recherches). Tu les donnes librement, tu peux les cacher ou les effacer à tout moment, et elles servent uniquement aux résonances.')}`)}
  ${sec('Pourquoi',`<ul class="exp legal-ul">
    <li>Faire fonctionner le service : ton portrait, les résonances, les conversations (exécution du contrat).</li>
    <li>Protéger les membres : modération, signalements, lutte contre les faux profils et les arnaques (intérêt légitime).</li>
    <li>T'écrire : confirmation d'adresse, mot de passe oublié, avis de nouveau message, informations importantes. Chaque e-mail permet de se désabonner.</li>
    <li>Les données sensibles que tu choisis de remplir : sur la base de ton consentement, que tu retires en les effaçant.</li></ul>`)}
  ${sec('Ce que nous ne faisons jamais',p('Nous ne vendons aucune donnée, nous n\'affichons pas de publicité et nous ne faisons pas de profilage publicitaire.'))}
  ${sec('Qui y a accès',`<ul class="exp legal-ul">
    <li>Les autres membres voient seulement ce que ton portrait affiche, selon tes réglages.</li>
    <li>L'équipe de FeelShareLove, pour la modération : elle ne lit pas tes conversations ; elle reçoit seulement la copie d'un élément signalé.</li>
    <li>OVH (France) héberge le serveur, la base de données et la messagerie qui envoie les e-mails.</li>
    <li>Quand tu tapes un titre d'œuvre, ta recherche est envoyée à Wikipédia pour proposer le bon titre. Quand tu indiques ta ville, son nom est envoyé à Open-Meteo pour calculer les distances.</li></ul>`)}
  ${sec('Combien de temps',`<ul class="exp legal-ul">
    <li>Tant que ton compte existe. Quand tu le supprimes (Réglages › Supprimer mon compte), tout est effacé aussitôt de la base de données.</li>
    <li>Photos éphémères : quelques jours au plus, pour traiter un éventuel signalement.</li>
    <li>Liens envoyés par e-mail (confirmation, mot de passe, suppression) : valables 1 à 24 heures.</li></ul>`)}
  ${sec('Tes droits',p('Tu peux accéder à tes données, les corriger, les télécharger (Réglages › Mes données), t\'opposer à un traitement, retirer ton consentement et supprimer ton compte à tout moment. Pour toute demande : contact@feelsharelove.com. Tu peux aussi déposer une plainte auprès de l\'autorité de protection des données de ton pays (en France : la CNIL).'))}
  ${sec('Ton navigateur',p('FeelShareLove n\'utilise pas de cookies publicitaires ni de mesure d\'audience. Ton navigateur garde seulement ce qui est nécessaire : ta connexion, ta langue et quelques réglages d\'affichage.'))}
  ${sec('Âge',p('FeelShareLove est réservé aux personnes de 18 ans et plus.'))}
  ${sec('Changements',p('Si cette politique change de façon importante, nous te préviendrons dans l\'app ou par e-mail.'))}`;
};
