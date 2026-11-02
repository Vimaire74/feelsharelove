/* FeelShareLove — contenu des profils de test (à supprimer avant l'ouverture au public).
   Fil rouge : chaque profil s'inspire des goûts publics d'une personnalité connue. Les « pourquoi » sont inventés.
   Le bouton « Remplir les profils de test » de l'admin réécrit seulement les comptes marqués fake:true,
   reconnus par leur ancien ou leur nouveau pseudo. La photo et la vérification sont gardées. */
const slug = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const norm = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const H = (n, g, why = '') => ({ id: 'h:' + slug(n), n, src: 'h', g, w: null, wid: null, why });
const F = (w, n, g, why = '') => ({ id: 'f:' + slug(w) + ':' + slug(n), n, src: 'f', g, w, wid: 'f:' + slug(w), why });
const E = (kind, title, feel, why, desc = '') => ({ kind, title, workId: ['Activité', 'Souvenir', 'Objet', 'Autre'].includes(kind) ? '' : 'wp:' + norm(title), desc, feel, why });
const LATER = () => Date.now() + 864e5 * 30;

module.exports = [
  { from: ['ThéoLoup', 'BradOcre'],
    p: { name: 'Brad', lastName: 'Test', pseudo: 'BradOcre', g: 'm', accord: 'm', city: 'Genève', npa: '1204', intent: ['amis', 'amour'],
      types: { list: ['phys', 'sens'], show: true },
      facts: { age: '62 ans', langs: 'anglais, un peu de français', sign: 'Sagittaire', work: 'Acteur et producteur', roots: 'Le Missouri, les Ozarks', pets: 'Des chiens, toujours' },
      now: 'Je retape une vieille maison en pierre. Les mains dans le plâtre, la tête tranquille.',
      avail: { wants: ['parler', 'decouvrir'], note: 'Parler architecture ou motos.', until: LATER() },
      chinois: [F('Mythologie grecque', 'Achille', 'Mythologie et contes', 'Fort dehors, fragile au talon.'), H('Michel-Ange', 'Arts et lettres', 'Tailler la pierre jusqu\'à ce qu\'elle respire.'), H('Gustave Eiffel', 'Inventeurs et bâtisseurs')],
      invest: ['maison', 'maison:renovation', 'maison:decoration', 'arts', 'arts:sculpture', 'arts:ceramique', 'mecanique', 'mecanique:motos', 'cuisine', 'cuisine:vin', 'famille', 'famille:mes-enfants', 'pleinair', 'pleinair:road-trip'],
      rep: ['batisseur', 'artisan', 'bricoleur', 'aventurier', 'perfectionniste', 'protecteur', 'solitaire'] },
    entries: [
      E('Film', 'Le Parrain', ['scotche', 'reflechir'], 'La famille comme une forteresse et comme une prison. Je le revois tous les deux ans.'),
      E('Film', 'Apocalypse Now', ['hallucine', 'perturbe'], 'On en sort sans savoir où on est. C\'est ce que le cinéma devrait faire.'),
      E('Musique', 'Bob Dylan', ['nostalgie', 'reflechir'], 'Une voix cassée qui dit plus que les belles voix.'),
      E('Personne', 'Frank Gehry', ['epate', 'passion'], 'Il plie le métal comme du papier. Il m\'a donné envie de dessiner des maisons.', 'architecte'),
      E('Activité', 'Façonner de l\'argile', ['calme', 'vital'], 'Le tour tourne, je ne pense plus à rien. Le seul endroit où personne ne me regarde.'),
      E('Activité', 'Rouler à moto au petit matin', ['vital', 'force'], 'Le froid, la route vide, le moteur. Je reviens lavé.'),
      E('Activité', 'Cuisiner pour mes amis', ['adore', 'partager'], 'Une grande table, du vin de chez nous, et personne ne regarde l\'heure.'),
      E('Lieu', 'Provence', ['calme', 'mavie'], 'Les vignes, la lumière de septembre. Un endroit où j\'ai cru pouvoir rester.')] },

  { from: ['NadSafran', 'SandraLys'],
    p: { name: 'Sandra', lastName: 'Test', pseudo: 'SandraLys', g: 'f', accord: 'f', city: 'Fribourg', npa: '1700', intent: ['amis', 'amour'],
      types: { list: ['emo', 'phys'], show: true },
      facts: { age: '62 ans', langs: 'anglais, allemand', sign: 'Lion', work: 'Actrice', roots: 'Entre la Virginie et l\'Allemagne, une mère chanteuse d\'opéra', pets: 'Des chiens recueillis' },
      now: 'Les enfants grandissent trop vite. J\'apprends à leur laisser de la place.',
      avail: { wants: ['rire', 'film', 'parler'], note: 'Une comédie romantique et des fous rires.', until: LATER() },
      chinois: [F('Orgueil et Préjugés', 'Elizabeth Bennet', 'Littérature', 'La répartie avant la révérence.'), F('Thelma et Louise', 'Thelma', 'Films', 'Partir sur un coup de tête, avec sa meilleure amie.'), H('Florence Nightingale', 'Humanistes et engagés', 'Soigner sans faire de bruit.')],
      invest: ['famille', 'famille:mes-enfants', 'famille:parentalite', 'cuisine', 'cuisine:cuisiner', 'cuisine:patisserie', 'benevolat', 'benevolat:aide-aux-enfants', 'animaux', 'animaux:chiens', 'amitie', 'sorties', 'sorties:cinema', 'pleinair', 'pleinair:camping-et-bivouac'],
      rep: ['protecteur', 'facile', 'bonvivant', 'joyeux', 'pilier', 'soignant', 'competitif'] },
    entries: [
      E('Film', 'Forrest Gump', ['bouleverse', 'console'], 'La bonté sans calcul. Je pleure toujours au même endroit, sur le banc.'),
      E('Film', 'Quand Harry rencontre Sally', ['rire', 'adore'], 'Le film que je mets quand la semaine a été trop longue.'),
      E('Musique', 'The Beatles', ['nostalgie', 'rire'], 'Les voyages en voiture avec ma mère, toutes les fenêtres ouvertes.'),
      E('Livre', 'Ne tirez pas sur l\'oiseau moqueur', ['courage', 'reflechir'], 'Atticus. Le genre de parent que j\'essaie d\'être.'),
      E('Activité', 'Faire des gâteaux avec mes enfants', ['adore', 'mavie'], 'De la farine partout, et les meilleures conversations de la semaine.'),
      E('Activité', 'Randonnée', ['calme', 'vital'], 'Marcher jusqu\'à ce que les soucis tombent un à un.'),
      E('Souvenir', 'Les coulisses de l\'opéra quand j\'étais petite', ['nostalgie', 'vecu'], 'Je m\'endormais dans les costumes pendant que ma mère chantait.')] },

  { from: ['KofiCèdre', 'TomPlume'],
    p: { name: 'Tom', lastName: 'Test', pseudo: 'TomPlume', g: 'm', accord: 'm', city: 'Neuchâtel', npa: '2000', intent: ['parler', 'amis'], travel: null,
      types: { list: ['emo', 'mental'], show: true },
      facts: { age: '70 ans', langs: 'anglais, quelques mots de grec', sign: 'Cancer', work: 'Acteur, réalisateur, écrivain', roots: 'La Californie, beaucoup de déménagements enfant', pets: 'Un chien, Barney' },
      now: 'J\'écris des nouvelles sur une machine à écrire de 1950. Le bruit des touches me tient compagnie.',
      avail: { wants: ['parler', 'texter', 'ecoute'], note: 'Raconter des histoires, en écouter.', until: LATER() },
      chinois: [F('Forrest Gump', 'Forrest Gump', 'Films', 'Courir sans savoir pourquoi, et finir par comprendre.'), H('Abraham Lincoln', 'Grandes figures de l\'histoire'), F('Là-haut', 'Carl', 'Dessins animés', 'Un vieux grincheux qui a gardé son cœur d\'enfant.')],
      invest: ['histoire', 'collections', 'collections:objets-vintage', 'lecture', 'lecture:romans', 'famille', 'famille:mes-enfants', 'famille:mes-petits-enfants', 'ciel', 'ciel:astronomie', 'benevolat', 'benevolat:personnes-agees', 'sorties', 'sorties:theatre'],
      rep: ['conteur', 'collectionneur', 'pilier', 'facile', 'principes', 'integre', 'reveur'] },
    entries: [
      E('Livre', 'Le Petit Prince', ['console', 'reflechir'], 'Je le lis à mes petits-enfants et c\'est moi qui apprends quelque chose.'),
      E('Film', 'Le Parrain', ['scotche', 'epate'], 'Chaque plan est une leçon. Je l\'ai vu à quinze ans et j\'ai su ce que je voulais faire.'),
      E('Film', 'Il faut sauver le soldat Ryan', ['bouleverse', 'perturbe'], 'Pour ceux qui ne sont pas rentrés. On leur doit de se souvenir.'),
      E('Musique', 'The Beatles', ['rire', 'nostalgie'], 'Mon adolescence entière tient dans un album.'),
      E('Objet', 'Ma collection de machines à écrire', ['passion', 'calme'], 'Chacune a eu une vie avant moi. J\'aime imaginer les lettres qu\'elles ont tapées.'),
      E('Activité', 'Regarder les fusées et les étoiles', ['epate', 'vital'], 'Apollo 13 m\'a laissé ça : on lève les yeux et on se sent petit, en bien.'),
      E('Livre', 'Les Misérables', ['bouleverse', 'courage'], 'Jean Valjean prouve qu\'on peut changer. J\'ai besoin d\'y croire.'),
      E('Souvenir', 'Les déménagements de mon enfance', ['vecu', 'mavie'], 'Une nouvelle école chaque année. J\'ai appris à faire rire pour qu\'on m\'adopte.')] },

  { from: ['MaëlleJasmin', 'SophieAube'],
    p: { name: 'Sophie', lastName: 'Test', pseudo: 'SophieAube', g: 'f', accord: 'f', city: 'Lausanne', npa: '1003', intent: ['amour', 'parler'], verified: { status: 'verified', at: Date.now() },
      types: { list: ['sens', 'emo'], show: true },
      facts: { age: '59 ans', langs: 'français, anglais, un peu de polonais', sign: 'Scorpion', work: 'Actrice, réalisatrice, écrivaine', roots: 'Paris, la banlieue sud', pets: 'Aucun pour l\'instant' },
      now: 'Je termine un livre. Je n\'arrive à écrire que la nuit.',
      avail: { wants: ['parler', 'ecoute'], note: 'Une vraie conversation, pas de bavardage.', until: LATER() },
      chinois: [F('Cyrano de Bergerac', 'Roxane', 'Littérature', 'Tomber amoureuse d\'une âme avant un visage.'), H('Agnès Varda', 'Arts et lettres', 'Filmer avec curiosité et tendresse.'), H('Colette', 'Arts et lettres')],
      invest: ['lecture', 'lecture:romans', 'lecture:poesie', 'lecture:journal-intime', 'arts', 'arts:ecriture-et-poesie', 'arts:photo', 'image', 'image:cinema', 'famille', 'famille:mes-enfants', 'danse', 'danse:classique', 'voyages'],
      rep: ['artiste', 'reveur', 'solitaire', 'conteur', 'rebelle', 'philosophe', 'perfectionniste'] },
    entries: [
      E('Livre', 'Le Petit Prince', ['console', 'nostalgie'], 'On croit le connaître par cœur et une phrase nous attend toujours au détour.'),
      E('Livre', 'Les Misérables', ['bouleverse', 'reflechir'], 'Fantine m\'a appris ce que coûte l\'injustice faite aux femmes.'),
      E('Musique', 'Jacques Brel', ['bouleverse', 'passion'], 'Ne me quitte pas. On entend un homme se défaire en direct.'),
      E('Musique', 'Barbara', ['nostalgie', 'console'], 'Sa voix dans la cuisine de ma mère, le dimanche.'),
      E('Film', 'La Boum', ['nostalgie', 'vecu'], 'Je n\'avais que treize ans. Je le regarde rarement, mais il fait partie de moi.'),
      E('Personne', 'Andrzej Żuławski', ['perturbe', 'force'], 'Il m\'a obligée à aller plus loin que ce que je croyais pouvoir.', 'réalisateur'),
      E('Activité', 'Écrire la nuit', ['calme', 'vital'], 'Le monde dort, les phrases arrivent.'),
      E('Lieu', 'La Bretagne', ['calme', 'console'], 'Le vent qui nettoie tout. Je marche sur la plage jusqu\'à ne plus penser.')] },

  { from: ['AlexOpale', 'JeanJacquesSol'],
    p: { name: 'Jean-Jacques', lastName: 'Test', pseudo: 'JeanJacquesSol', g: 'm', accord: 'm', city: 'Lausanne', npa: '1006', intent: ['amis', 'parler'], verified: { status: 'verified', at: Date.now() },
      types: { list: ['sens', 'mental'], show: true },
      facts: { age: '75 ans', langs: 'français, anglais', sign: 'Balance', work: 'Auteur, compositeur, interprète (retiré)', roots: 'Paris, parents venus de Pologne et d\'Allemagne', pets: 'Un chat' },
      now: 'Une vie loin de la scène. Je joue de la guitare pour moi, le soir, et ça me suffit.',
      avail: { wants: ['parler', 'ecoute'], note: 'Parler musique, ou de rien.', until: LATER() },
      chinois: [H('Coluche', 'Humanistes et engagés', 'Rire et donner à manger, le même geste.'), F('Les Misérables', 'Jean Valjean', 'Littérature', 'Une vie à réparer, en silence.'), H('Jacques Brel', 'Musique')],
      invest: ['musique', 'musique:jouer-d-un-instrument', 'musique:composer', 'musique:chanter', 'benevolat', 'benevolat:refugies', 'famille', 'famille:mes-enfants', 'famille:famille-recomposee', 'pleinair', 'pleinair:voile', 'lecture', 'lecture:romans', 'histoire'],
      rep: ['artisan', 'engage', 'principes', 'integre', 'solitaire', 'mediateur', 'perfectionniste'] },
    entries: [
      E('Musique', 'Jacques Brel', ['bouleverse', 'force'], 'Il chantait comme on se bat. Je lui dois d\'avoir osé.'),
      E('Musique', 'Bob Dylan', ['reflechir', 'passion'], 'Il a montré qu\'une chanson pouvait dire le monde.'),
      E('Musique', 'The Beatles', ['epate', 'nostalgie'], 'J\'ai appris la guitare sur leurs accords.'),
      E('Livre', 'Les Misérables', ['courage', 'reflechir'], 'Tout y est : la misère, la justice, le pardon.'),
      E('Livre', 'Le Petit Prince', ['console'], 'L\'essentiel est invisible pour les yeux. Je n\'ai jamais trouvé mieux.'),
      E('Activité', 'Les Restos du cœur', ['vital', 'partager'], 'Une chanson pour un ami, devenue une promesse tenue chaque hiver.'),
      E('Activité', 'Naviguer', ['calme', 'force'], 'En mer personne ne te reconnaît. Il n\'y a que le vent.'),
      E('Souvenir', 'L\'histoire de ma famille', ['vecu', 'reflechir'], 'Mes parents ont traversé la guerre. Je leur dois de rester discret et juste.')] }
];
