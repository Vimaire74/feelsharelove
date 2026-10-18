/* Connect — les quatre types de fonctionnement (textes de Marc) et le questionnaire.
   Les textes s'affichent à la fin du test ; Marc les retouchera. */
window.TYPES={
 list:[
  {k:'mental',name:'Mental',both:'par la tête',
   text:`Les mentaux sont des gens qui vivent leur vie essentiellement au travers de leur mental : ils réfléchissent beaucoup, analysent, pensent, aiment être organisés. Ils ont tendance à réprimer leurs sensations, leur corps et leurs émotions avec leur mental, et peuvent donc manquer de sensibilité et de perception d'eux-mêmes. Face à un problème, ils essaient d'abord de le résoudre, de trouver des solutions, mais ils ont de la peine à simplement accueillir l'émotion. Le courant mental est dominant dans les sociétés occidentales : on y valorise l'esprit de décision, l'organisation, la rationalité, mais pas tellement le reste. Le mental a souvent assez d'énergie pour tout faire ; il est peu contraint par l'extérieur, par les atmosphères, par les autres ; il fait des choix facilement, mais il peut être obtus et n'est parfois pas très enclin à comprendre autrui.`},
  {k:'emo',name:'Émotionnel',both:'par l\'émotion',
   text:`Les émotionnels sont centrés sur leurs émotions. Ils valorisent beaucoup le monde émotionnel et, de ce fait, cèdent souvent à leurs émotions. Ils ne peuvent pas se passer des émotions qui, bonnes ou mauvaises, sont le sel de la vie. Ce sont des gens passionnés, vivants, intenses et communicatifs. Ils adorent partager, rencontrer, découvrir, mais ils ne sont pas très bons pour se retenir, pour être stables et constants. Ils ont besoin de variation dans la vie, d'événements, et n'aiment pas tellement l'ennui. Certains sont émotifs et constamment perturbés par leurs émotions, ou parfois trop empathiques et perturbés par les émotions des autres. Un peu poreux, ils éprouvent des choses étonnantes à cause du temps, de la lune, des ambiances lourdes. Ce sont de très bons artistes, car ils savent propager ce qu'ils ressentent et faire ressentir des choses aux autres. Souvent très communicatifs, même si un peu dispersés, ils peuvent être très convaincants. Certains sont solaires et utilisent cette capacité à leur avantage ; d'autres, plus reclus, souffrent et se sentent incompris. Ils ont tendance à monter certaines choses en épingle, et les mentaux ne les comprennent pas bien.`},
  {k:'sens',name:'Sensible',both:'par l\'intuition',
   text:`Les sensibles ou intuitifs ont beaucoup de sensations, corporelles ou mystérieuses. Ils sentent des choses, à tort ou à raison pour les autres. Ils sont souvent hypersensibles et plus fragiles ; ils vibrent avec passion, comme un instrument trop bien accordé. Si leur talent n'est pas maîtrisé, ils souffrent, sont victimes des autres ou des circonstances, se sentent incompris et seuls. Mais s'ils travaillent leurs capacités intuitives, ils deviennent plus conscients, plus intuitifs, et comprennent des choses que d'autres ne comprennent pas. Ils peuvent alors être des découvreurs. Les premiers herboristes, qui ont dû comprendre le pouvoir des plantes par sensibilité et par déductions successives, les dresseurs d'animaux, les chamans, les éclaireurs, les pisteurs, les artistes, les inventeurs ont été des sensibles, des sensitifs, des intuitifs.`},
  {k:'phys',name:'Physique',both:'par le corps',
   text:`Les physiques sont très proches de leur corps. En général, ils aiment leur corps et s'en occupent beaucoup ; sportifs ou esthètes, ils peuvent choisir la voie de la maîtrise physique ou celle de la beauté. Ils cherchent souvent un certain type de perfection physique. Certains sont souffrants : ils ont des maladies et ne parlent que de leur corps, qui est à la fois leur prison et leur souci constant. Ils parlent régimes, remèdes, biorythmes, phases de la lune… Ceux qui vont bien exploitent leur corps au maximum et en parlent aussi beaucoup, mais surtout pour raconter ce qu'ils ont réussi à faire avec. Fans de sports extrêmes, de dépassement de soi, ils admirent la formidable mécanique de leur corps. Parfois gourmands, hédonistes, ils préfèrent accumuler tous les conforts possibles, les plaisirs de la table et de leur maison. Certains aiment accumuler les biens matériels, d'autres les expériences.`}],
 /* 12 questions : une réponse par type (textes de Marc, réécriture validée le 17/10/2026). Jusqu'à deux réponses par question. */
 questions:[
  {
  "q": "Face à un problème, d'abord je…",
  "a": {
  "mental": "je prends le temps de réfléchir, je pèse toutes les solutions possibles, je me renseigne, puis je tranche",
  "emo": "j'en parle à mes proches, je leur confie mes doutes, je stresse un peu, puis je choisis ce qui me motive le plus",
  "sens": "j'essaie de sentir ce que ça me fait, je laisse la chose faire son chemin en moi, mon intuition me guide, et ma spontanéité tombe souvent juste",
  "phys": "j'ai besoin de bouger pour y voir plus clair, ou au contraire de rester tranquille, peut-être sans personne autour, à faire des choses pour moi chez moi ; ensuite je me décide"
  }
  },
  {
  "q": "Mes activités idéales…",
  "a": {
  "mental": "échanger des idées, discuter de sujets qui me plaisent avec des gens qui me font réfléchir, ou rester chez moi et occuper mon esprit avec une activité qui m'absorbe",
  "emo": "faire des rencontres, partager nos émotions, vibrer sur la même longueur d'onde ; ou être chez moi avec quelqu'un que j'aime, partager des choses simples, mais vibrer",
  "sens": "vivre des choses agréables où je me sens bien, en phase avec quelqu'un, dans un partage et une connexion profonde, en harmonie, sans agression ; chez moi sans personne, ou avec d'autres, pourvu qu'ils soient alignés avec moi",
  "phys": "des activités physiques, du sport, de la danse, un bon repas, des aventures ; ou rester dans le confort de chez moi, avec ou sans compagnie"
  }
  },
  {
  "q": "Quand j'entre dans une pièce pleine de gens…",
  "a": {
  "mental": "j'analyse la situation, j'observe les gens et les groupes, puis je vais discuter et je me mêle aux autres sans complexe",
  "emo": "je vais vite vers les autres, je souris, je me dirige vers ceux qui ont l'air les plus ouverts ; je me fais parfois des idées pas forcément justes, et je me le reproche un peu intérieurement",
  "sens": "j'essaie de ne pas trop ressentir, j'ai un peu d'appréhension, le premier contact me fait peur ; je me fais des idées, je peux imaginer un rejet qui n'existe pas, et je cherche vers qui aller pour que ce soit bon pour moi",
  "phys": "je me sens à l'aise, j'aborde les personnes qui me plaisent, j'écoute les conversations, mais les gens qui parlent trop ou sont trop mentaux me fatiguent ; je vais plutôt vers les beaux corps, les conversations sur le sport ou l'aventure"
  }
  },
  {
  "q": "On me reproche parfois…",
  "a": {
  "mental": "ma froideur, mon manque d'écoute, mon côté insistant, écrasant, jugeant ou égotique",
  "emo": "mon côté expansif, dispersé, stressé, séducteur, ou d'abandonner mes opinions au profit de celles des autres",
  "sens": "d'être trop sensible, à fleur de peau, mon côté compliqué, déroutant, jugeant ou exclusif",
  "phys": "de trop m'occuper de mon corps ou de mon confort, mon côté hédoniste, égocentrique, peu impliqué, de faire mes activités dans mon coin en ignorant l'autre"
  }
  },
  {
  "q": "Pour me changer les idées ou me ressourcer…",
  "a": {
  "mental": "je lis, je regarde un film, je m'absorbe dans une activité de l'esprit, ou je parle avec quelqu'un qui a des idées, qui me passionne intellectuellement",
  "emo": "je suis mes élans, je papillonne, j'appelle quelqu'un que j'aime, je propose des activités aux autres, je fais quelque chose qui me procure des émotions",
  "sens": "je m'isole un peu, je fais des choses pour moi, je passe du temps avec quelqu'un qui me comprend, je trouve un moyen d'être en paix à l'intérieur, je fais quelque chose qui me fait vibrer",
  "phys": "je sors marcher ou faire du sport, ou je m'installe dans mon canapé et je m'écoute ; je fais du yoga, de la méditation, ou une activité avec quelqu'un qui aime les mêmes choses que moi"
  }
  },
  {
  "q": "L'ennui, pour moi, c'est…",
  "a": {
  "mental": "ne pas avoir d'activité pour mon esprit, devoir rester sans rien faire",
  "emo": "ne pas pouvoir échanger avec quelqu'un, attendre",
  "sens": "quand rien de ce que je fais ou vis ne m'éloigne de mes sensations permanentes, et que je n'ai plus que moi à ressentir",
  "phys": "perdre le contact avec mon corps, ne pas pouvoir vivre avec lui ce que j'ai envie de vivre"
  }
  },
  {
  "q": "Ce qui me plaît…",
  "a": {
  "mental": "comprendre, apprendre, mettre de l'ordre, résoudre, échanger des idées, avoir des activités",
  "emo": "partager, aimer, rire, le contact et la tendresse, ressentir des émotions, vivre des passions",
  "sens": "me sentir bien, être en harmonie avec quelqu'un, vivre ma vie comme je l'entends, suivre mon intuition",
  "phys": "le sport, un bon lit, un bon plat, le confort, le luxe ; ou des expériences plus dynamiques, l'aventure, le dépassement de soi"
  }
  },
  {
  "q": "Un film me marque surtout par…",
  "a": {
  "mental": "son scénario, son intelligence, son intrigue",
  "emo": "l'émotion qu'il me donne, la passion, la vie qui suinte du film",
  "sens": "son atmosphère, la justesse des réactions des personnages, un personnage dont les intuitions tombent toujours juste, son authenticité",
  "phys": "l'action, les cascades, la beauté des images, les sensations qu'il me procure dans le corps, l'effet « waouh »"
  }
  },
  {
  "q": "Avec les autres, je suis plutôt…",
  "a": {
  "mental": "la personne qui explique, qui conseille, qui organise, qui a les réponses",
  "emo": "la personne qui anime, qui met de la vie, qui propose des activités passionnantes, qui crée du lien",
  "sens": "la personne qui devine, qui a des idées, qui comprend les autres, qui a des fulgurances, qui ressent",
  "phys": "la personne qui fait bouger le groupe, qui motive, qui a des idées d'aventure ; ou celle qui apporte du calme, qui reçoit chez elle, qui offre au groupe une qualité physique ou matérielle"
  }
  },
  {
  "q": "Ce qui me déprime…",
  "a": {
  "mental": "l'inactivité, l'impossibilité d'agir, devoir attendre les autres, ne pas pouvoir trancher, qu'il n'existe aucune bonne solution",
  "emo": "le manque de lien, les conflits, les gens qui refusent de me comprendre, les moments mornes et sans passion, la solitude",
  "sens": "trop de monde, ce qui n'a pas de sens, les discours vains, les personnes qui ne sont pas authentiques, les ambiances lourdes, la méchanceté, le manque de conscience",
  "phys": "un corps entravé, ne pas pouvoir bouger ni faire ce que je veux, le manque de confort, l'immobilité, partager ma vie avec des gens qui ne comprennent pas le sens du mouvement ou du confort"
  }
  },
  {
  "q": "Ma fierté…",
  "a": {
  "mental": "mon travail, la qualité de ma pensée, mon intelligence, ce que j'ai compris, l'organisation de ma vie, mes accomplissements",
  "emo": "mes liens, mes relations, la justesse de mes émotions, mon ouverture, ma gentillesse, ma profondeur émotionnelle",
  "sens": "ce que j'ai senti juste, mes intuitions, mes bons choix, mon authenticité, la façon dont j'ai mené ma vie, avoir persévéré pour être vraiment ce que je veux être",
  "phys": "ce que j'ai fait de mon corps, la façon dont il m'obéit au doigt et à l'œil, la beauté ou la perfection que je lui ai données ; ou la vie agréable que j'ai su me créer, un intérieur idéal, des activités idéales (opulence, richesse, confort, beauté)"
  }
  },
  {
  "q": "Mon défaut principal…",
  "a": {
  "mental": "je réfléchis trop, je calcule trop, je n'arrive pas vraiment à sentir mon corps, je peux m'ignorer trop longtemps, je n'aime pas écouter l'avis des autres, je veux trop avoir raison",
  "emo": "je ne tiens pas en place, je m'emporte trop, je ne supporte pas la solitude, je peux me renier pour plaire aux autres, je m'oublie souvent au profit de ceux que j'aime",
  "sens": "je me laisse envahir, je ressens trop de choses, je ne suis jamais en paix, je cherche sans cesse à ne pas être moi parce qu'en moi je souffre, je me disperse dans trop d'activités",
  "phys": "je ne m'arrête pas, j'ignore trop mon corps ou je l'écoute trop, j'accorde trop de valeur au monde matériel, je peux être trop égocentrique"
  }
  }
  ],
 /* dominant : au moins 70 % du meilleur score */
 dominants(scores){const max=Math.max(...Object.values(scores));if(!max)return [];return Object.keys(scores).filter(k=>scores[k]>=Math.ceil(max*.7));},
 name(k){const t=this.list.find(x=>x.k===k);return t?t.name:k;},
 label(list){return (list||[]).map(k=>this.name(k)).join(' · ');}
};
