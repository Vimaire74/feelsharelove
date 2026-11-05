/* FeelShareLove — profils de démonstration : des personnages entièrement inventés (aucune ressemblance voulue avec une personne réelle).
   Ils portent l'étiquette « profil de démonstration » dans l'app. À garder au début, tant qu'il y a peu d'inscrits.
   Le bouton « Remplir les profils de démonstration » de l'admin réécrit les comptes marqués fake:true, reconnus par un de leurs
   anciens pseudos (from), et crée ceux qui n'existent pas encore (create: true). La photo et la vérification déjà en place sont gardées.
   Un personnage par langue : son portrait est écrit dans sa langue (textLang). */
const slug = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const norm = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const H = (n, g, why = '') => ({ id: 'h:' + slug(n), n, src: 'h', g, w: null, wid: null, why });
const F = (w, n, g, why = '') => ({ id: 'f:' + slug(w) + ':' + slug(n), n, src: 'f', g, w, wid: 'f:' + slug(w), why });
const E = (kind, title, feel, why, desc = '') => ({ kind, title, workId: ['Activité', 'Souvenir', 'Objet', 'Autre'].includes(kind) ? '' : 'wp:' + norm(title), desc, feel, why });
const LATER = () => Date.now() + 864e5 * 30;

module.exports = [
  /* ---------- français ---------- */
  { from: ['ThéoLoup', 'BradOcre', 'ElioOcre'],
    p: { name: 'Elio', lastName: 'Demo', pseudo: 'ElioOcre', g: 'm', accord: 'm', city: 'Genève', npa: '1204', intent: ['amour', 'amis'], textLang: 'fr', langs: ['fr', 'it', 'en'],
      types: { list: ['phys', 'sens'], show: true },
      facts: { age: '54 ans', langs: 'français, italien, anglais', sign: 'Sagittaire', work: 'Paysagiste', roots: 'Un village du Tessin, une grand-mère qui cultivait des figues', pets: 'Un vieux chien, Pistache' },
      now: 'Je retape une petite maison en pierre au-dessus du lac. Les mains dans le mortier, la tête tranquille.',
      avail: { wants: ['parler', 'decouvrir'], note: 'Parler jardins, pierre, ou de la vie.', until: LATER() },
      chinois: [F('Mythologie grecque', 'Héphaïstos', 'Mythologie et contes', 'Il fabrique dans son coin, avec ses mains.'), H('Michel-Ange', 'Arts et lettres', 'Tailler la pierre jusqu\'à ce qu\'elle respire.'), H('Gustave Eiffel', 'Inventeurs et bâtisseurs')],
      invest: ['maison', 'maison:renovation', 'arts', 'arts:sculpture', 'arts:ceramique', 'cuisine', 'cuisine:vin', 'pleinair', 'pleinair:road-trip', 'animaux', 'animaux:chiens'],
      rep: ['batisseur', 'artisan', 'bricoleur', 'nature', 'perfectionniste', 'protecteur', 'solitaire'] },
    entries: [
      E('Film', 'Le Parrain', ['scotche', 'reflechir'], 'La famille comme une forteresse et comme une prison. Je le revois tous les deux ans.'),
      E('Film', 'Jean de Florette', ['bouleverse', 'mavie'], 'Un homme, une source, un village qui se tait. Je pense à mon grand-père à chaque fois.'),
      E('Musique', 'Paolo Conte', ['nostalgie', 'calme'], 'Une voix de fin de soirée. Elle sent le café et la route.'),
      E('Activité', 'Façonner de l\'argile', ['calme', 'vital'], 'Le tour tourne, je ne pense plus à rien.'),
      E('Activité', 'Cuisiner pour mes amis', ['adore', 'partager'], 'Une grande table, du vin de chez nous, et personne ne regarde l\'heure.'),
      E('Lieu', 'Le Tessin', ['calme', 'mavie'], 'Les murets de pierre sèche, la lumière de septembre. Je reviens toujours là.')] },

  { from: ['NadSafran', 'SandraLys', 'NoraLys'],
    p: { name: 'Nora', lastName: 'Demo', pseudo: 'NoraLys', g: 'f', accord: 'f', city: 'Fribourg', npa: '1700', intent: ['amis', 'amour'], textLang: 'fr', langs: ['fr', 'de'],
      types: { list: ['emo', 'phys'], show: true },
      facts: { age: '47 ans', langs: 'français, allemand', sign: 'Lion', work: 'Sage-femme', roots: 'Entre la Gruyère et la Singine, une famille qui parle deux langues à table', pets: 'Deux chats recueillis' },
      now: 'Mes enfants grandissent trop vite. J\'apprends à leur laisser de la place.',
      avail: { wants: ['rire', 'film', 'parler'], note: 'Une comédie et des fous rires.', until: LATER() },
      chinois: [F('Orgueil et Préjugés', 'Elizabeth Bennet', 'Littérature', 'La répartie avant la révérence.'), F('Thelma et Louise', 'Louise', 'Films', 'Partir sur un coup de tête, avec sa meilleure amie.'), H('Florence Nightingale', 'Humanistes et engagés')],
      invest: ['famille', 'famille:mes-enfants', 'famille:parentalite', 'cuisine', 'cuisine:patisserie', 'amitie', 'sorties', 'sorties:cinema', 'pleinair', 'sport', 'sport:randonnee-et-montagne'],
      rep: ['soignant', 'protecteur', 'facile', 'bonvivant', 'joyeux', 'pilier'] },
    entries: [
      E('Film', 'Le Fabuleux Destin d\'Amélie Poulain', ['rire', 'adore'], 'Le film que je mets quand la semaine a été trop longue.'),
      E('Film', 'Intouchables', ['rire', 'bouleverse'], 'On rit, et d\'un coup on a la gorge serrée. Comme dans mon métier.'),
      E('Livre', 'Ne tirez pas sur l\'oiseau moqueur', ['courage', 'reflechir'], 'Atticus. Le genre de parent que j\'essaie d\'être.'),
      E('Activité', 'Faire des gâteaux avec mes enfants', ['adore', 'mavie'], 'De la farine partout, et les meilleures conversations de la semaine.'),
      E('Activité', 'Randonnée', ['calme', 'vital'], 'Marcher jusqu\'à ce que les soucis tombent un à un.'),
      E('Souvenir', 'La première naissance que j\'ai accompagnée', ['vecu', 'bouleverse'], 'Une nuit de février, à trois heures. Je n\'ai jamais oublié ce silence juste avant le premier cri.')] },

  { from: ['KofiCèdre', 'TomPlume', 'PaulPlume'],
    p: { name: 'Paul', lastName: 'Demo', pseudo: 'PaulPlume', g: 'm', accord: 'm', city: 'Neuchâtel', npa: '2000', intent: ['parler', 'amis'], textLang: 'fr', langs: ['fr', 'en'], travel: null,
      types: { list: ['emo', 'mental'], show: true },
      facts: { age: '68 ans', langs: 'français, anglais', sign: 'Cancer', work: 'Horloger, à la retraite', roots: 'Le Jura, une enfance entre deux ateliers', pets: 'Un chien, Barnabé' },
      now: 'J\'écris des nouvelles sur une machine à écrire de 1950. Le bruit des touches me tient compagnie.',
      avail: { wants: ['parler', 'texter', 'ecoute'], note: 'Raconter des histoires, en écouter.', until: LATER() },
      chinois: [F('Là-haut', 'Carl', 'Dessins animés', 'Un vieux grincheux qui a gardé son cœur d\'enfant.'), H('Jules Verne', 'Arts et lettres', 'Voyager sans quitter son bureau.'), F('Le Petit Prince', 'L\'allumeur de réverbères', 'Littérature', 'Fidèle à sa consigne, même quand le monde tourne trop vite.')],
      invest: ['collections', 'collections:objets-vintage', 'lecture', 'lecture:romans', 'famille', 'famille:mes-petits-enfants', 'ciel', 'ciel:astronomie', 'sorties', 'sorties:theatre'],
      rep: ['conteur', 'collectionneur', 'artisan', 'facile', 'principes', 'integre', 'reveur'] },
    entries: [
      E('Livre', 'Le Petit Prince', ['console', 'reflechir'], 'Je le lis à mes petits-enfants et c\'est moi qui apprends quelque chose.'),
      E('Livre', 'Vingt mille lieues sous les mers', ['epate', 'nostalgie'], 'Lu sous les couvertures avec une lampe de poche, à dix ans.'),
      E('Musique', 'Georges Brassens', ['rire', 'reflechir'], 'Des chansons qui ont l\'air simples et qu\'on comprend à soixante ans.'),
      E('Objet', 'Ma collection de machines à écrire', ['passion', 'calme'], 'Chacune a eu une vie avant moi. J\'aime imaginer les lettres qu\'elles ont tapées.'),
      E('Activité', 'Regarder les étoiles', ['epate', 'vital'], 'On lève les yeux et on se sent petit, en bien.'),
      E('Souvenir', 'L\'atelier de mon père', ['vecu', 'nostalgie'], 'L\'odeur de l\'huile fine et le silence. J\'y ai appris la patience.')] },

  { from: ['MaëlleJasmin', 'SophieAube', 'ClaireAube'],
    p: { name: 'Claire', lastName: 'Demo', pseudo: 'ClaireAube', g: 'f', accord: 'f', city: 'Lausanne', npa: '1003', intent: ['amour', 'parler'], textLang: 'fr', langs: ['fr', 'en', 'es'],
      types: { list: ['sens', 'emo'], show: true },
      facts: { age: '51 ans', langs: 'français, anglais, un peu d\'espagnol', sign: 'Scorpion', work: 'Libraire', roots: 'Lyon, une mère institutrice et beaucoup de livres', pets: 'Aucun pour l\'instant' },
      now: 'J\'écris un premier roman. Je n\'arrive à écrire que la nuit.',
      avail: { wants: ['parler', 'ecoute'], note: 'Une vraie conversation, pas de bavardage.', until: LATER() },
      chinois: [F('Cyrano de Bergerac', 'Roxane', 'Littérature', 'Tomber amoureuse d\'une âme avant un visage.'), H('Agnès Varda', 'Arts et lettres', 'Filmer avec curiosité et tendresse.'), H('Colette', 'Arts et lettres')],
      invest: ['lecture', 'lecture:romans', 'lecture:poesie', 'lecture:journal-intime', 'arts', 'arts:ecriture-et-poesie', 'arts:photo', 'image', 'image:cinema', 'sorties', 'sorties:expositions'],
      rep: ['artiste', 'reveur', 'solitaire', 'conteur', 'philosophe', 'perfectionniste'] },
    entries: [
      E('Livre', 'Le Petit Prince', ['console', 'nostalgie'], 'On croit le connaître par cœur et une phrase nous attend toujours au détour.'),
      E('Livre', 'Les Misérables', ['bouleverse', 'reflechir'], 'Fantine m\'a appris ce que coûte l\'injustice faite aux femmes.'),
      E('Musique', 'Barbara', ['nostalgie', 'console'], 'Sa voix dans la cuisine de ma mère, le dimanche.'),
      E('Film', 'In the Mood for Love', ['bouleverse', 'perturbe'], 'Tout ce qui n\'est pas dit. Je le revois chaque hiver.'),
      E('Activité', 'Écrire la nuit', ['calme', 'vital'], 'Le monde dort, les phrases arrivent.'),
      E('Lieu', 'La Bretagne', ['calme', 'console'], 'Le vent qui nettoie tout. Je marche sur la plage jusqu\'à ne plus penser.')] },

  { from: ['AlexOpale', 'JeanJacquesSol', 'AndréSol'],
    p: { name: 'André', lastName: 'Demo', pseudo: 'AndréSol', g: 'm', accord: 'm', city: 'Lausanne', npa: '1006', intent: ['amis', 'parler'], textLang: 'fr', langs: ['fr', 'en'],
      types: { list: ['sens', 'mental'], show: true },
      facts: { age: '72 ans', langs: 'français, anglais', sign: 'Balance', work: 'Professeur de guitare, à la retraite', roots: 'Marseille, puis Lausanne depuis quarante ans', pets: 'Un chat qui ne m\'obéit pas' },
      now: 'Je joue de la guitare pour moi, le soir, et je donne un coup de main à la soupe populaire le jeudi.',
      avail: { wants: ['parler', 'ecoute'], note: 'Parler musique, ou de rien.', until: LATER() },
      chinois: [F('Les Misérables', 'Jean Valjean', 'Littérature', 'Une vie à réparer, en silence.'), H('Django Reinhardt', 'Arts et lettres', 'Deux doigts et tout un monde.'), H('Abbé Pierre', 'Humanistes et engagés')],
      invest: ['musique', 'musique:jouer-d-un-instrument', 'musique:composer', 'benevolat', 'benevolat:refugies', 'famille', 'famille:famille-recomposee', 'pleinair', 'pleinair:voile'],
      rep: ['artisan', 'engage', 'principes', 'integre', 'mentor', 'mediateur', 'facile'] },
    entries: [
      E('Musique', 'Django Reinhardt', ['epate', 'passion'], 'J\'ai passé ma jeunesse à essayer de jouer comme lui. J\'essaie encore.'),
      E('Musique', 'Bob Dylan', ['reflechir', 'passion'], 'Il a montré qu\'une chanson pouvait dire le monde.'),
      E('Livre', 'Les Misérables', ['courage', 'reflechir'], 'Tout y est : la misère, la justice, le pardon.'),
      E('Activité', 'La soupe populaire du jeudi', ['vital', 'partager'], 'On sert, on écoute, on rit. C\'est souvent moi qui repars le plus nourri.'),
      E('Activité', 'Naviguer sur le Léman', ['calme', 'force'], 'Sur l\'eau, il n\'y a que le vent et le bruit de la coque.'),
      E('Souvenir', 'Ma première guitare', ['vecu', 'nostalgie'], 'Achetée d\'occasion à quinze ans avec l\'argent des vendanges. Elle est encore là.')] },

  /* ---------- allemand ---------- */
  { from: ['LenaFirn'], create: true,
    p: { name: 'Lena', lastName: 'Demo', pseudo: 'LenaFirn', g: 'f', accord: 'f', city: 'Berlin', npa: '', intent: ['amis', 'parler'], textLang: 'de', langs: ['de', 'en', 'fr'], av: 'b',
      types: { list: ['emo', 'sens'], show: true },
      facts: { age: '38 Jahre', langs: 'Deutsch, Englisch, ein bisschen Französisch', sign: 'Fische', work: 'Theaterschauspielerin', roots: 'Ein Dorf an der Ostsee, der Wind im Haar', pets: 'Eine Katze namens Brecht' },
      now: 'Wir proben ein neues Stück. Abends bin ich müde und glücklich zugleich.',
      avail: { wants: ['parler', 'soiree'], note: 'Nach der Probe ein Glas Wein und ein gutes Gespräch.', until: LATER() },
      chinois: [F('Die Verwandlung', 'Grete Samsa', 'Littérature', 'Sie wächst, während alles um sie herum zerfällt.'), H('Pina Bausch', 'Arts et lettres', 'Tanzen, was man nicht sagen kann.'), F('Momo', 'Momo', 'Littérature', 'Zuhören als größte Kunst.')],
      invest: ['arts', 'arts:theatre', 'sorties', 'sorties:theatre', 'danse', 'danse:contemporaine', 'lecture', 'lecture:poesie', 'pleinair', 'sport', 'sport:velo'],
      rep: ['artiste', 'reveur', 'conteur', 'rebelle', 'joyeux'] },
    entries: [
      E('Film', 'Der Himmel über Berlin', ['bouleverse', 'calme'], 'Engel, die zuhören. Seitdem schaue ich in der U-Bahn anders auf die Menschen.'),
      E('Film', 'Lola rennt', ['vital', 'epate'], 'Mit sechzehn gesehen. Ich bin danach nach Hause gerannt, einfach so.'),
      E('Livre', 'Momo', ['console', 'reflechir'], 'Die grauen Herren stehlen die Zeit. Ich lese es jedes Jahr, damit sie mir meine nicht stehlen.'),
      E('Musique', 'Nina Simone', ['force', 'passion'], 'Vor jeder Premiere, in der Garderobe, laut.'),
      E('Activité', 'Mit dem Fahrrad an den Wannsee', ['calme', 'vital'], 'Im Sommer, früh am Morgen, wenn die Stadt noch schläft.'),
      E('Souvenir', 'Mein erster Applaus', ['vecu', 'bouleverse'], 'Ein Schultheater, ich war zwölf. Ich habe nichts gesehen, nur gehört, und wusste es.')] },

  /* ---------- anglais ---------- */
  { from: ['OwenTide'], create: true,
    p: { name: 'Owen', lastName: 'Demo', pseudo: 'OwenTide', g: 'm', accord: 'm', city: 'Manchester', npa: '', intent: ['amis', 'parler'], textLang: 'en', langs: ['en', 'fr'], av: 'c',
      types: { list: ['mental', 'emo'], show: true },
      facts: { age: '45', langs: 'English, school French', sign: 'Virgo', work: 'Actor, mostly small parts in TV dramas', roots: 'A terraced house in Salford, four brothers', pets: 'A greyhound called Biscuit' },
      now: 'Between two jobs, so I am finally reading all the books piled by my bed.',
      avail: { wants: ['parler', 'texter', 'film'], note: 'Films, football, or what keeps you up at night.', until: LATER() },
      chinois: [F('Great Expectations', 'Joe Gargery', 'Littérature', 'A big heart that never asks for anything back.'), H('Charlie Chaplin', 'Arts et lettres', 'Making people laugh about being poor.'), F('Paddington', 'Paddington', 'Films', 'Polite, hopeful, slightly sticky.')],
      invest: ['image', 'image:cinema', 'image:series', 'lecture', 'lecture:romans', 'sport', 'sport:football', 'animaux', 'animaux:chiens', 'amitie'],
      rep: ['conteur', 'facile', 'joyeux', 'philosophe', 'pilier'] },
    entries: [
      E('Film', 'Kes', ['bouleverse', 'mavie'], 'A boy and a bird in a grey town. That boy could have been me.'),
      E('Film', 'Paddington 2', ['rire', 'console'], 'I am not ashamed. It is a perfect film.'),
      E('Livre', 'A Christmas Carol', ['reflechir', 'console'], 'I read it every December. It is never too late to change.'),
      E('Musique', 'The Smiths', ['nostalgie', 'passe'], 'Rainy bus rides at seventeen, headphones on, feeling misunderstood.'),
      E('Activité', 'Walking Biscuit in the rain', ['calme', 'vital'], 'She does not care about the weather, so I stopped caring too.'),
      E('Lieu', 'The Peak District', ['calme', 'force'], 'Half an hour from the city and suddenly nothing but wind and sheep.')] },

  /* ---------- italien ---------- */
  { from: ['GiuliaAlba'], create: true,
    p: { name: 'Giulia', lastName: 'Demo', pseudo: 'GiuliaAlba', g: 'f', accord: 'f', city: 'Roma', npa: '', intent: ['amour', 'amis'], textLang: 'it', langs: ['it', 'fr', 'en'], av: 'd',
      types: { list: ['sens', 'emo'], show: true },
      facts: { age: '41 anni', langs: 'italiano, francese, inglese', sign: 'Gemelli', work: 'Doppiatrice', roots: 'Napoli, una nonna che cantava mentre cucinava', pets: 'Nessuno, ma i gatti del quartiere mi conoscono' },
      now: 'Do la voce a un\'attrice francese in una serie. Passo le giornate in una stanza buia a respirare come lei.',
      avail: { wants: ['parler', 'film', 'soiree'], note: 'Un aperitivo e un film in lingua originale.', until: LATER() },
      chinois: [F('La vita è bella', 'Dora', 'Films', 'Scegliere l\'amore anche quando costa tutto.'), H('Anna Magnani', 'Arts et lettres', 'Una risata e un pianto nella stessa scena.'), F('Il barone rampante', 'Viola', 'Littérature', 'Libera, capricciosa, indimenticabile.')],
      invest: ['image', 'image:cinema', 'image:series', 'musique', 'musique:chanter', 'cuisine', 'cuisine:cuisiner', 'sorties', 'sorties:concerts', 'amour'],
      rep: ['artiste', 'bonvivant', 'hedoniste', 'joyeux', 'conteur'] },
    entries: [
      E('Film', 'Nuovo Cinema Paradiso', ['bouleverse', 'nostalgie'], 'Il finale con i baci tagliati. Piango sempre, anche quando so che arriva.'),
      E('Film', 'La grande bellezza', ['epate', 'reflechir'], 'Roma di notte, come la vedo tornando dallo studio.'),
      E('Livre', 'L\'amica geniale', ['mavie', 'bouleverse'], 'Due ragazze di Napoli. Ho riconosciuto la mia strada e la mia migliore amica.'),
      E('Musique', 'Lucio Dalla', ['passion', 'nostalgie'], 'Caruso, a squarciagola, in macchina con mia madre.'),
      E('Activité', 'Cucinare la domenica', ['adore', 'partager'], 'Il ragù della nonna: tre ore, e nessuno ha fretta.'),
      E('Lieu', 'Procida', ['calme', 'console'], 'Le case colorate e il mare. Ci vado quando la città mi stanca.')] },

  /* ---------- espagnol ---------- */
  { from: ['MateoBrisa'], create: true,
    p: { name: 'Mateo', lastName: 'Demo', pseudo: 'MateoBrisa', g: 'm', accord: 'm', city: 'Sevilla', npa: '', intent: ['amis', 'amour'], textLang: 'es', langs: ['es', 'en', 'pt'], av: 'e',
      types: { list: ['phys', 'emo'], show: true },
      facts: { age: '36 años', langs: 'español, inglés, algo de portugués', sign: 'Aries', work: 'Actor de televisión', roots: 'Un pueblo blanco de Cádiz, una familia de pescadores', pets: 'Un perro mestizo, Canela' },
      now: 'Ruedo una serie de época. Paso más tiempo a caballo que en casa.',
      avail: { wants: ['rire', 'decouvrir', 'soiree'], note: 'Tapas, guitarra y conversación hasta tarde.', until: LATER() },
      chinois: [F('Don Quijote de la Mancha', 'Sancho Panza', 'Littérature', 'Los pies en el suelo y el corazón leal.'), H('Federico García Lorca', 'Arts et lettres', 'Poesía que huele a tierra mojada.'), F('Coco', 'Héctor', 'Dessins animés', 'Que no te olviden: eso es lo que importa.')],
      invest: ['sport', 'sport:equitation', 'sport:surf-et-kitesurf', 'danse', 'danse:salsa', 'musique', 'musique:jouer-d-un-instrument', 'fete', 'fete:bars', 'famille', 'famille:mes-parents'],
      rep: ['aventurier', 'bonvivant', 'joyeux', 'sportif', 'protecteur'] },
    entries: [
      E('Film', 'Volver', ['bouleverse', 'mavie'], 'Las mujeres de mi familia, tal cual. Mi abuela se reía y lloraba a la vez.'),
      E('Film', 'El laberinto del fauno', ['hallucine', 'perturbe'], 'Un cuento de hadas que no protege a nadie. Me dejó días pensando.'),
      E('Livre', 'Cien años de soledad', ['epate', 'reflechir'], 'Lo leí en un verano entero. Aún confundo a los Aurelianos.'),
      E('Musique', 'Camarón de la Isla', ['passion', 'force'], 'Mi padre lo ponía en el barco. Es la voz del mar para mí.'),
      E('Activité', 'Surfear al amanecer en Cádiz', ['vital', 'calme'], 'El agua fría, la playa vacía. Vuelvo a ser niño.'),
      E('Souvenir', 'Las noches de verano en el pueblo', ['nostalgie', 'vecu'], 'Sillas en la calle, los vecinos, una guitarra. Nadie miraba el móvil.')] },

  /* ---------- portugais ---------- */
  { from: ['InêsMaré'], create: true,
    p: { name: 'Inês', lastName: 'Demo', pseudo: 'InêsMaré', g: 'f', accord: 'f', city: 'Lisboa', npa: '', intent: ['amour', 'parler'], textLang: 'pt', langs: ['pt', 'es', 'fr'], av: 'b',
      types: { list: ['emo', 'sens'], show: true },
      facts: { age: '33 anos', langs: 'português, espanhol, francês', sign: 'Caranguejo', work: 'Atriz e fadista', roots: 'Alfama, a casa da minha avó com vista para o rio', pets: 'Um canário que canta melhor do que eu' },
      now: 'Canto três noites por semana numa casa de fados. De dia, ensaio uma peça.',
      avail: { wants: ['parler', 'ecoute', 'soiree'], note: 'Ouvir um fado comigo e falar de saudade.', until: LATER() },
      chinois: [F('Os Lusíadas', 'Inês de Castro', 'Littérature', 'Um amor mais forte do que a morte.'), H('Amália Rodrigues', 'Arts et lettres', 'Cantar a tristeza para que fique mais leve.'), F('O Principezinho', 'A rosa', 'Littérature', 'Orgulhosa e frágil ao mesmo tempo.')],
      invest: ['musique', 'musique:chanter', 'musique:concerts', 'arts', 'arts:theatre', 'sorties', 'sorties:theatre', 'lecture', 'lecture:poesie', 'amour'],
      rep: ['artiste', 'reveur', 'conteur', 'mystique'] },
    entries: [
      E('Musique', 'Amália Rodrigues', ['bouleverse', 'passion'], 'A primeira vez que a ouvi, na cozinha da minha avó, percebi o que queria fazer.'),
      E('Livre', 'Livro do Desassossego', ['reflechir', 'console'], 'Abro numa página qualquer e encontro sempre uma frase para o dia.'),
      E('Film', 'Cinema Paraíso', ['nostalgie', 'bouleverse'], 'Vi-o com o meu pai. Choramos os dois e fingimos que não.'),
      E('Lieu', 'O miradouro da Graça', ['calme', 'mavie'], 'Ao pôr do sol, Lisboa inteira fica cor de mel.'),
      E('Activité', 'Cantar fado à noite', ['vital', 'partager'], 'Quando a sala fica em silêncio, sei que estamos todos a sentir o mesmo.'),
      E('Souvenir', 'As marchas populares de junho', ['nostalgie', 'vecu'], 'Sardinhas, manjericos, a cidade inteira na rua. A melhor noite do ano.')] }
];
