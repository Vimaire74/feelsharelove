/* FeelShareLove — données de départ (version 2) : quatre personnes fictives, cercles et leurs messages, premières conversations.
   workId = identifiant de l'œuvre dans le catalogue (Wikipédia), écrit sans accents ni majuscules. */
(function(){
const LATER=Date.now()+864e5*30; // personnes fictives : disponibles en permanence pour la démo
window.FSL_SEED={
 profiles:[
  {id:'lucia',name:'Lucía',pseudo:'LuciAmbre',g:'f',types:{list:['emo','sens'],show:true},verified:{status:'verified',at:Date.now()-864e5*20},av:'b',city:'Séville',tz:0,online:true,intent:['amis','amour'],
   avail:{wants:['parler','decouvrir'],note:'Un film en même temps, chacun chez soi ?',until:LATER},
   facts:{age:'41 ans',langs:'espagnol, français, un peu d\'italien',roots:'Andalousie, une enfance entre la ville et les oliviers',pets:'Une chienne, Nube',work:'Restauratrice de fresques dans les églises',study:'Beaux-arts',sign:'Scorpion · Cheval de Bois'},
   now:'Insomnie. Un film ou une voix, peu importe.',
   entries:[
    {id:'e-lucia-1',kind:'Film',title:'Légendes d\'automne',workId:'wp:legendes d automne',desc:'film de Edward Zwick (1994)',feel:['bouleverse','nostalgie'],why:'Tristan ne sait pas aimer à moitié. Je lui en veux et je l\'envie. Mon père me l\'a montré à quinze ans et il pleurait tellement que je n\'osais pas pleurer moi.'},
    {id:'e-lucia-2',kind:'Activité',title:'Marcher seule en montagne',feel:['calme','console'],why:'La Sierra de Grazalema au lever du jour. Je monte pour pleurer tranquille et je redescends légère.'},
    {id:'e-lucia-3',kind:'Musique',title:'Buena Vista Social Club',workId:'wp:buena vista social club',feel:['nostalgie','rire'],why:'Ma grand-mère dansait dessus dans la cuisine. Je danse encore dessus quand je cuisine.'},
    {id:'e-lucia-4',kind:'Personne',title:'Pedro Almodóvar',workId:'wp:pedro almodovar',desc:'réalisateur espagnol',feel:['bouleverse'],why:'Les couleurs, les mères, les cris. Chez lui personne n\'a honte de ressentir.'},
    {id:'e-lucia-5',kind:'Livre',title:'L\'Alchimiste',workId:'wp:l alchimiste',desc:'roman de Paulo Coelho',feel:['courage'],why:'Je l\'ai lu trop jeune et trop vite. Je le relis chaque fois que je dois décider quelque chose.'}],
   questions:[{id:'q-lucia-1',k:'Un moment où j\'ai pleuré devant un écran',a:'La scène de la plage dans Légendes d\'automne, quand il revient. Je sais exactement où c\'est.'},{id:'q-lucia-2',k:'L\'odeur de mon enfance',a:'La chaux fraîche sur les murs en été, et l\'huile d\'olive de mon grand-père.'}]},
  {id:'tomas',name:'Tomás',pseudo:'TomVelours',g:'m',types:{list:['mental','emo'],show:true},av:'c',city:'Buenos Aires',tz:-5,online:true,intent:['parler','amis'],
   avail:{wants:['parler','rire'],note:'Parler cinéma, lentement.',until:LATER},
   facts:{age:'57 ans',langs:'espagnol, français (appris pour lire Camus), anglais',roots:'Buenos Aires, grands-parents venus des Pouilles',pets:'Aucun, mais le chat du voisin dort chez moi',work:'Professeur de lettres, à la retraite depuis peu',study:'Lettres',sign:'Cancer · Chèvre de Terre'},
   now:'Fin de journée. Envie de parler de cinéma avec un inconnu, lentement.',
   entries:[
    {id:'e-tomas-1',kind:'Film',title:'Cinema Paradiso',workId:'wp:cinema paradiso',desc:'film de Giuseppe Tornatore (1988)',feel:['bouleverse','nostalgie'],why:'Les baisers coupés à la fin. Un homme découvre que quelqu\'un lui a gardé tout ce qu\'on lui avait interdit. Je ne m\'en remets pas.'},
    {id:'e-tomas-2',kind:'Musique',title:'Tango',workId:'wp:tango',feel:['nostalgie','console'],why:'Pas pour danser, je danse mal. Pour la voix de Goyeneche à trois heures du matin, quand la ville est vide.'},
    {id:'e-tomas-3',kind:'Livre',title:'Fictions',workId:'wp:fictions',desc:'recueil de Jorge Luis Borges',feel:['calme'],why:'Il m\'a appris qu\'une bibliothèque peut être un univers et qu\'on peut se perdre dans une page.'},
    {id:'e-tomas-4',kind:'Activité',title:'Cuisiner pour des amis',feel:['rire'],why:'Un asado le dimanche. Je suis le plus heureux pendant les deux heures où la viande cuit et où personne n\'a encore faim.'},
    {id:'e-tomas-5',kind:'Objet',title:'Le vieux vélo de mon père',feel:['nostalgie'],why:'Un Legnano. Il ne roule plus, il est dans l\'entrée. Je le regarde tous les jours.'}],
   questions:[{id:'q-tomas-1',k:'Un moment où j\'ai pleuré devant un écran',a:'Cinema Paradiso, évidemment. Et chaque fois que je le montre à quelqu\'un, je pleure avant lui.'},{id:'q-tomas-2',k:'La chose que je referais mille fois',a:'Le premier cours d\'une année, quand les visages sont encore inconnus.'}]},
  {id:'aicha',name:'Aïcha',pseudo:'AïchaPhénix',g:'f',types:{list:['sens','phys'],show:true},av:'d',city:'Montréal',tz:-6,online:false,intent:['amis'],avail:null,
   facts:{age:'34 ans',langs:'français, arabe, anglais',roots:'Grandi à Lyon, famille de Tunis',pets:'Un chat, Zouzou, qui parle beaucoup',work:'Infirmière de nuit',study:'Soins infirmiers',sign:'Verseau · Singe de Métal'},
   now:'Nouvelle ici depuis deux mois. Je ne connais personne et l\'hiver arrive.',
   entries:[
    {id:'e-aicha-1',kind:'Film',title:'Intouchables',workId:'wp:intouchables',desc:'film de Nakache et Toledano (2011)',feel:['rire','courage'],why:'Parce qu\'on peut rire de tout quand on s\'aime vraiment. Et parce que je soigne des gens toute la nuit et que ce film me rappelle pourquoi.'},
    {id:'e-aicha-2',kind:'Livre',title:'L\'Alchimiste',workId:'wp:l alchimiste',desc:'roman de Paulo Coelho',feel:['courage'],why:'Je l\'ai lu dans l\'avion en venant ici. Je me suis dit : si le berger peut, moi aussi.'},
    {id:'e-aicha-3',kind:'Musique',title:'Nina Simone',workId:'wp:nina simone',desc:'chanteuse américaine',feel:['console','courage'],why:'Feeling Good, le matin après une garde. La seule qui comprend ce que c\'est de rentrer quand les autres partent.'},
    {id:'e-aicha-4',kind:'Activité',title:'Le vélo l\'hiver',feel:['calme'],why:'Tout le monde me dit que c\'est fou. C\'est le seul moment où la ville m\'appartient.'},
    {id:'e-aicha-5',kind:'Souvenir',title:'Les mariages de Tunis',feel:['nostalgie','rire'],why:'Trois jours, deux cents personnes, personne ne dort. Ici personne ne crie et ça me manque.'}],
   questions:[{id:'q-aicha-1',k:'L\'odeur de mon enfance',a:'Le jasmin de ma grand-mère et le pain qui sort du four, à Tunis, en août.'},{id:'q-aicha-2',k:'Ce que je n\'ose dire à personne ici',a:'Que je suis venue pour fuir une histoire et que ça ne marche pas tout à fait.'}]},
  {id:'kenji',name:'Kenji',pseudo:'KenjiDragon',g:'m',types:{list:['mental','sens'],show:true},verified:{status:'verified',at:Date.now()-864e5*20},av:'e',city:'Tokyo',tz:7,online:true,intent:['parler','amour'],
   avail:{wants:['proposer'],note:'Marcher ensemble à distance, au téléphone, chacun dans sa ville.',until:LATER},
   facts:{age:'46 ans',langs:'japonais, anglais, français appris avec les films',roots:'Kanazawa, la neige, la mer du Japon',pets:'Un shiba, Mochi',work:'Architecte, surtout des petites maisons',study:'Architecture',sign:'Balance · Dragon de Bois'},
   now:'Je marche avant le travail. Quelqu\'un pour marcher avec moi, à distance ?',
   entries:[
    {id:'e-kenji-1',kind:'Film',title:'Lost in Translation',workId:'wp:lost in translation',desc:'film de Sofia Coppola (2003)',feel:['console'],why:'Deux personnes seules dans ma ville, et moi qui me sens exactement comme elles, dans ma propre ville.'},
    {id:'e-kenji-2',kind:'Activité',title:'Marcher avant le travail',feel:['calme'],why:'Une heure dans Yanaka avant que la ville se réveille. Je pense mieux debout.'},
    {id:'e-kenji-3',kind:'Livre',title:'Kafka sur le rivage',workId:'wp:kafka sur le rivage',desc:'roman de Haruki Murakami',feel:['console','calme'],why:'Les chats qui parlent et la solitude qui ne fait pas peur. C\'est mon livre de chevet depuis dix ans.'},
    {id:'e-kenji-4',kind:'Musique',title:'Merry Christmas Mr. Lawrence',workId:'wp:merry christmas mr lawrence',desc:'musique de Ryuichi Sakamoto',feel:['bouleverse','calme'],why:'Au piano, un soir de neige. Je l\'apprends depuis trois ans, je n\'y arrive pas, ça ne me dérange pas.'},
    {id:'e-kenji-5',kind:'Souvenir',title:'La neige d\'avril à Kanazawa',feel:['nostalgie'],why:'Les cerisiers en fleurs et la neige en même temps, une seule fois dans ma vie. J\'attends que ça revienne.'}],
   questions:[{id:'q-kenji-1',k:'La chose que je referais mille fois',a:'Le premier café dans une maison que j\'ai dessinée, avec les gens qui vont y vivre.'},{id:'q-kenji-2',k:'Ce qui me manque',a:'Quelqu\'un pour qui cuisiner. Je cuisine très bien pour une personne, c\'est triste.'}]}
 ],
 circles:[
  {id:'c1',title:'Ceux qui vivent loin de chez eux',about:'Pour ceux qui ont changé de pays, de ville, de vie, et qui cherchent encore leurs repères.',members:214},
  {id:'c2',title:'Légendes d\'automne',about:'Le film, Tristan, le Montana, et ce que ça remue.',members:87},
  {id:'c3',title:'Marcher seul',about:'Montagne, ville, bord de lac. Ceux pour qui marcher est une manière de penser.',members:152},
  {id:'c4',title:'Les gens de la nuit',about:'Infirmiers, insomniaques, travailleurs de nuit : ceux qui sont réveillés quand les autres dorment.',members:41},
  {id:'c5',title:'Cinema Paradiso',about:'Ceux qui pleurent à la fin, et ceux qui pleurent avant.',members:63}],
 circlePosts:[
  {id:'cp1',circleId:'c1',author:'aicha',text:'Deux mois à Montréal. Ce qui me manque le plus, ce n\'est pas ma famille, c\'est le bruit. Ici tout est poli.',ts:Date.now()-5*3600e3},
  {id:'cp2',circleId:'c1',author:'kenji',text:'J\'ai vécu quatre ans à Lyon. Le premier hiver, je parlais à la boulangère pour entendre ma propre voix. Ça passe, je vous promets.',ts:Date.now()-4*3600e3},
  {id:'cp3',circleId:'c2',author:'lucia',text:'Quelqu\'un d\'autre trouve que c\'est Alfred le vrai héros du film ? Celui qui reste.',ts:Date.now()-26*3600e3},
  {id:'cp4',circleId:'c3',author:'kenji',text:'Ce matin, Yanaka, 5 h 40. Un chat m\'a suivi pendant dix minutes. Je n\'ai parlé à personne mais je ne me suis pas senti seul.',ts:Date.now()-9*3600e3},
  {id:'cp5',circleId:'c3',author:'lucia',text:'Grazalema sous la brume aujourd\'hui. On ne voyait rien, c\'était parfait.',ts:Date.now()-7*3600e3},
  {id:'cp6',circleId:'c4',author:'aicha',text:'Garde de nuit terminée. Le café de 7 h est le meilleur de la journée.',ts:Date.now()-2*3600e3},
  {id:'cp7',circleId:'c5',author:'tomas',text:'Je l\'ai montré à mon petit-fils hier. Il n\'a pas pleuré. Moi si, deux fois.',ts:Date.now()-30*3600e3}],
 messages:[
  {id:'m1',thread:'lucia',from:'lucia',to:'me',kind:'text',text:'Regarde, c\'est la Sierra ce matin.',ts:Date.now()-3600e3},
  {id:'m2',thread:'lucia',from:'lucia',to:'me',kind:'ephemeral',text:'Lever du jour, Grazalema',seconds:10,seen:false,ts:Date.now()-3500e3},
  {id:'m3',thread:'tomas',from:'tomas',to:'me',kind:'text',text:'Bonsoir. Je réponds à votre portrait : j\'ai lu ce que vous aimez au cinéma. Dites-moi un film, je vous dis où je pleure.',ts:Date.now()-7200e3}],
 threads:[
  {id:'lucia',status:'open',startedBy:'lucia',firstAt:Date.now()-3600e3},
  {id:'tomas',status:'pending-in',startedBy:'tomas',firstAt:Date.now()-7200e3}]
};
})();
