/* FeelShareLove — pages d'accueil publiques : garde la langue choisie et envoie vers l'app les personnes déjà connectées ou invitées */
try{var L=document.documentElement.lang||'fr';
  document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href^="/app"]');if(a)localStorage.setItem('fsl_lang',L);});
  if(localStorage.getItem('fsl_token')||/[?&]invite=/.test(location.search)||location.hash)location.replace('/app'+location.search+location.hash);}catch(e){}
