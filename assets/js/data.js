/* ------------------------------------------------------------------
   Calixir Paris — données du site
   Source : « CARTE CALIXIR LIVRAISON - A-H.pdf » (offre livrée sans service).
   Tous les prix sont en euros HT. Pour modifier un prix ou un produit,
   il suffit d'éditer ce fichier : le site se reconstruit tout seul.
------------------------------------------------------------------- */
window.CAL = {};

CAL.config = {
  /* Destinataire des demandes de devis (contact commande indiqué sur la carte). */
  toEmail: 'carole@calixir.com',
  phone: '01 69 75 14 02',
  phoneHref: '+33169751402',
  hours: '8h30 – 18h30',
  /* Envoi automatique : coller ici l'URL d'un service de formulaire (Formspree,
     Make, Basin…) qui reçoit un POST JSON. Laissé vide, la demande est transmise
     par l'e-mail du visiteur (lien mailto pré-rempli). */
  endpoint: '',
  storageKey: 'calixir-demande-v1'
};

CAL.tabs = [
  { id: 'repas',     label: 'Repas' },
  { id: 'pause',     label: 'Pause & accueil' },
  { id: 'cocktail',  label: 'Cocktail salé' },
  { id: 'terroir',   label: 'Terroir' },
  { id: 'fraicheur', label: 'Fraîcheur' },
  { id: 'douceurs',  label: 'Douceurs' },
  { id: 'boissons',  label: 'Boissons & matériel' }
];

CAL.groups = [
  { id: 'plateaux', tab: 'repas', layout: 'cards', title: 'Les plateaux repas',
    intro: 'Un menu de saison par jour, préparé par nos chefs : bocaux individuels, verre et couverts en inox, boule de pain de notre boulanger de Wissous. Emballage en papier recyclé et recyclable. Conçus pour être consommés froids.' },
  { id: 'lunchbox', tab: 'repas', layout: 'cards', title: 'Les lunch box',
    intro: 'Pour un repas sur le pouce, une courte pause gourmande, fraîche et équilibrée.' },
  { id: 'lunchbag', tab: 'repas', layout: 'rows', title: 'Les lunch bag', img: 'lunchbag',
    intro: 'Une barquette repas et un dessert au choix. Fourchette, cuillère en bois, serviette et eau de source Cristaline 50 cl incluses.' },

  { id: 'pausebox', tab: 'pause', layout: 'cards', title: 'Petit-déjeuner, pause & accueil café',
    intro: 'Tout pour accueillir vos équipes : un coffret gourmand, le kit matériel et le kit boissons, pour 10 personnes.' },

  { id: 'cocktail', tab: 'cocktail', layout: 'cards', title: 'Sélection de coffrets cocktail salé',
    intro: 'Des bouchées salées prêtes à servir, pour un apéritif ou un cocktail réussi.' },

  { id: 'terroir', tab: 'terroir', layout: 'cards', title: 'Sélection Terroir à la carte',
    intro: 'Tapas, charcuterie, fromages AOP, viandes froides et pains : des plateaux à partager.' },

  { id: 'fraicheur', tab: 'fraicheur', layout: 'cards', title: 'Sélection Fraîcheur à la carte',
    intro: 'Salades, légumes de saison et sandwichs lunch, pour des déjeuners légers.' },

  { id: 'douceurs', tab: 'douceurs', layout: 'cards', title: 'Douceurs à la carte',
    intro: 'Viennoiseries, petits fours, moelleux, tartelettes et fruits frais pour finir sur une note sucrée.' },

  { id: 'softs',  tab: 'boissons', layout: 'rows', title: 'Softs', eyebrow: 'La cave' },
  { id: 'eaux',   tab: 'boissons', layout: 'rows', title: 'Eaux' },
  { id: 'vins',   tab: 'boissons', layout: 'rows', title: 'Vins & champagne',
    note: 'L’abus d’alcool est dangereux pour la santé. À consommer avec modération.' },
  { id: 'autres', tab: 'boissons', layout: 'rows', title: 'Bière & cidre' },
  { id: 'indispensables', tab: 'boissons', layout: 'rows', title: 'Les indispensables',
    intro: 'Matériel jetable et accessoires.' }
];

/* Options réutilisées ----------------------------------------------------- */
const DESSERTS = [
  { v: 'Brownie tout chocolat' },
  { v: 'Muffin myrtille' },
  { v: 'Moelleux chocolat Grand Maman' }
];
const INCLUS_LUNCH = 'Fourchette, cuillère en bois, serviette et eau de source Cristaline 50 cl incluses.';
const SG = 'sans gluten', VEG = 'veggie', VGN = 'végan';

/* Produits ---------------------------------------------------------------- */
CAL.products = [

  /* ===== PLATEAUX REPAS ===== */
  { id: 'plateau-agape', group: 'plateaux', name: 'Plateau Agapé', img: 'plateau-agape',
    items: ['1 entrée', '1 plat', '1 fromage', '1 dessert', '1 boule de pain'],
    price: 29.25, from: true, unit: 'plateau',
    note: 'Conçu pour être consommé froid. Menu composé par nos chefs selon la saison.',
    options: [{ key: 'menu', label: 'Menu souhaité', required: true, type: 'radio', choices: [
      { v: 'Menu du jour (au choix du chef)' },
      { v: 'Poulet au citron, haricots verts et pomme de terre Charlotte', sub: 'Exemple de menu · sans gluten' },
      { v: 'Falafel mix de tartare de légumes', sub: 'Exemple de menu · veggie' }
    ]}] },

  { id: 'plateau-essentiel', group: 'plateaux', name: 'Plateau Essentiel', img: 'plateau-essentiel',
    items: ['1 entrée', '1 plat', '1 dessert', '1 boule de pain'],
    price: 22.55, from: true, unit: 'plateau',
    note: 'Conçu pour être consommé froid. Menu composé par nos chefs selon la saison.',
    options: [{ key: 'menu', label: 'Menu souhaité', required: true, type: 'radio', choices: [
      { v: 'Menu du jour (au choix du chef)' },
      { v: 'Crevette sautée au Saté, riz thaï parfumé et légumes', sub: 'Exemple de menu' },
      { v: 'Frégola aux légumes façon tagine', sub: 'Exemple de menu · végan' }
    ]}] },

  /* ===== LUNCH BOX ===== */
  { id: 'lunchbox', group: 'lunchbox', name: 'Lunch box', sub: '1 sandwich · 1 salade · 1 dessert', img: 'lunchbox',
    items: ['1 sandwich au choix', '1 salade au choix', '1 dessert au choix'],
    price: 16.28, unit: 'lunch box', note: INCLUS_LUNCH,
    options: [
      { key: 'sandwich', label: 'Sandwich (pain au lait)', required: true, type: 'radio', choices: [
        { v: 'Thon crudités', sub: 'Thon et crudités' },
        { v: 'Aubergine-Poivron', sub: 'Aubergine, poivron et tomate' },
        { v: 'Émincé de poulet', sub: 'Émincé de poulet et salade' },
        { v: 'Tomate parmesan', sub: 'Tomate confite, parmesan et roquette' }
      ]},
      { key: 'salade', label: 'Salade', required: true, type: 'radio', choices: [
        { v: 'Salade de quinoa rouge', sub: 'Légumes croquants et vinaigrette xérès' },
        { v: 'Salade de pomme de terre rattes', sub: 'Aux échalotes' },
        { v: 'Salade de haricots coco', sub: 'Tomate confite, trompette de la mort, vinaigrette huile de noix' }
      ]},
      { key: 'dessert', label: 'Dessert', required: true, type: 'radio', choices: DESSERTS }
    ] },

  /* ===== LUNCH BAG ===== */
  { id: 'bag-poulet', group: 'lunchbag', name: 'Filet de poulet sauce acaï et citron vert',
    sub: 'Carottes et patates douces rôties', price: 18.17, note: INCLUS_LUNCH,
    options: [{ key: 'dessert', label: 'Dessert', required: true, type: 'radio', choices: DESSERTS }] },
  { id: 'bag-quinoa', group: 'lunchbag', name: 'Quinoa bowl',
    sub: 'Feta, betterave, quinoa', tags: [SG, VEG], price: 15.77, note: INCLUS_LUNCH,
    options: [{ key: 'dessert', label: 'Dessert', required: true, type: 'radio', choices: DESSERTS }] },
  { id: 'bag-epeautre', group: 'lunchbag', name: 'Salade de petit épeautre au chou-fleur rôti',
    tags: [VEG], price: 15.77, note: INCLUS_LUNCH,
    options: [{ key: 'dessert', label: 'Dessert', required: true, type: 'radio', choices: DESSERTS }] },
  { id: 'bag-saumon', group: 'lunchbag', name: 'Saumon sauce fruits de la passion',
    sub: 'Riz long aux petits pois', tags: [SG], price: 17.77, note: INCLUS_LUNCH,
    options: [{ key: 'dessert', label: 'Dessert', required: true, type: 'radio', choices: DESSERTS }] },
  { id: 'bag-limande', group: 'lunchbag', name: 'Salade de pomme de terre et limande façon nordique',
    tags: [SG], price: 17.77, note: INCLUS_LUNCH,
    options: [{ key: 'dessert', label: 'Dessert', required: true, type: 'radio', choices: DESSERTS }] },
  { id: 'bag-merlu', group: 'lunchbag', name: 'Filet de merlu sauce vierge',
    sub: 'Légumes grillés', tags: [SG], price: 17.77, note: INCLUS_LUNCH,
    options: [{ key: 'dessert', label: 'Dessert', required: true, type: 'radio', choices: DESSERTS }] },
  { id: 'bag-taboule', group: 'lunchbag', name: 'Taboulé aux fruits secs et crevettes',
    price: 17.77, note: INCLUS_LUNCH,
    options: [{ key: 'dessert', label: 'Dessert', required: true, type: 'radio', choices: DESSERTS }] },

  /* ===== PAUSE & ACCUEIL ===== */
  { id: 'pause-box', group: 'pausebox', name: 'Box petit-déjeuner & pause', sub: 'Pour 10 personnes', img: 'pause-box',
    items: ['1 coffret au choix', '1 kit matériel accueil café', '1 kit boissons petit-déjeuner'],
    price: 106.50, from: true, unit: 'box de 10 personnes',
    details: [
      { title: 'Kit matériel accueil café · 10 personnes',
        items: ['10 gobelets en carton recyclé', '10 gobelets à eau et à jus de fruits', '10 mélangeurs en bois'] },
      { title: 'Kit boissons petit-déjeuner · 10 personnes',
        items: ['1 thermos 1 L de café Richard Carazo, Max Havelaar, 70 % arabica',
                '1 thermos 1 L d’eau chaude et ses 3 sachets de thé bio maison Richard (locavore)',
                '1 jus d’orange Alain Milliat 1 L', '1 Evian verre 75 cl VP',
                '10 sucres blancs bio Calixir', '4 dosettes de lait'] }
    ],
    options: [
      { key: 'coffret', label: 'Votre coffret', required: true, type: 'radio', choices: [
        { v: 'Coffret viennoiseries · 20 pièces', sub: 'Mini pain au chocolat, mini croissant' },
        { v: 'Coffret chocolat addict · 25 pièces', sub: 'Fondant chocolat noir, moelleux chocolat banane, brownies aux noix de pécan', lead72: true },
        { v: 'Coffret so Moelleux · 46 pièces', sub: 'Moelleux pomme, moelleux poire Bourdaloue, moelleux fondant chocolat orange, madeleine pur beurre au thé vert', lead72: true }
      ]},
      { key: 'pain', label: 'En complément (prix sur devis)', type: 'check', choices: [
        { v: 'Pain individuel' }, { v: 'Pain individuel sans gluten' }
      ]}
    ] },

  /* ===== COCKTAIL SALÉ ===== */
  { id: 'cocktail-gm', group: 'cocktail', name: 'Pour recevoir un peu plus salé', sub: 'Coffret GM · 60 pièces', img: 'cocktail-gm',
    items: ['Mini club sandwich poulet / crudités', 'Pic’up de filet de bœuf et oignon confit façon pickles', 'Wrap au saumon fumé et sa pointe de moutarde bio aux algues'],
    price: 116.00, lead72: true },
  { id: 'cocktail-imprevus', group: 'cocktail', name: 'Les imprévus salés', sub: 'Coffret dernière minute · 28 pièces', img: 'cocktail-imprevus',
    items: ['Tataki de saumon, crème raifort et wasabi', 'Pic de volaille au curry, à la pomme Granny Smith, sauce cocktail'],
    price: 54.50, lead72: true },
  { id: 'cocktail-imprevus-veggie', group: 'cocktail', name: 'Les imprévus salés veggie', sub: 'Coffret dernière minute · 28 pièces', img: 'cocktail-veggie',
    items: ['P’tit chou à la crème de brie, shiitaké et graines de courge', 'Pic de tomate confite à la mozzarella fondante'],
    tags: [VEG], price: 47.55, lead72: true },
  { id: 'cocktail-sg', group: 'cocktail', name: 'Coffret salé sans gluten', sub: '28 pièces', img: 'cocktail-sans-gluten',
    items: ['Dés de saumon tandoori, légèrement crémé', 'Joue de bœuf, moutarde de raisin et pickles'],
    tags: [SG], price: 54.70, lead72: true },
  { id: 'cocktail-opportun', group: 'cocktail', name: 'L’opportun', sub: 'Coffret GM · 60 pièces', img: 'cocktail-opportun',
    items: ['P’tit cake façon cannelé aux champignons de Paris, noisettes torréfiées et parmesan', 'Tataki de saumon, crème raifort et wasabi', 'Palet de potiron, bœuf béarnaise en gelée d’Espelette'],
    price: 101.00, lead72: true },
  { id: 'cocktail-med', group: 'cocktail', name: 'Le Méditerranéen', sub: 'Coffret · 360 g', img: 'cocktail-mediterraneen',
    items: ['Houmous', 'Tapenade noire', 'Caviar d’aubergine', 'Pita', 'Croûtons'],
    price: 52.00, lead72: true },

  /* ===== TERROIR ===== */
  { id: 'terroir-tapas', group: 'terroir', name: 'Tapas ibériques', sub: '800 g · pics pour gambas', img: 'terroir-tapas',
    items: ['Cocas Barcelona au thon et à la tomate', 'Poivrons farcis au thon', 'Gambas marinées à l’ail', 'Chorizo ibérico Pata Negra', 'Épaule de porc ibérico Pata Negra', 'Quartiers de tortilla (omelette, pomme de terre, oignons et poivrons)', 'Fleurs de câpres'],
    price: 66.00, lead72: true },
  { id: 'terroir-charcutier', group: 'terroir', name: 'Sélection du charcutier', sub: '950 g · 10 pinces bambou', img: 'terroir-charcutier',
    items: ['Saucisson grelot chorizo', 'Rond d’Auvergne', 'Terrine de lapin', 'Dentelle de jambon de Bayonne', 'Cornichons et oignons au vinaigre'],
    price: 59.50, lead72: true },
  { id: 'terroir-fromager', group: 'terroir', name: 'Sélection du fromager AOP', sub: '510 g · par Éric Lefebvre, MOF, La Fromagerie de Paris', img: 'terroir-fromager',
    items: ['Fromages de saison AOP'], price: 48.20, lead72: true },
  { id: 'terroir-boucher', group: 'terroir', name: 'Sélection du boucher', sub: '1,2 kg', img: 'terroir-boucher',
    items: ['Émincés de poulet fermier label rouge', 'Noix de veau', 'Moutarde de Dijon'],
    price: 86.00, lead72: true },
  { id: 'terroir-boulanger', group: 'terroir', name: 'Sélection du boulanger', sub: '20 pièces', img: 'terroir-boulanger',
    items: ['Boules et pointes de pain : pointes aux graines et à la figue, pain nature', 'Beurre Échiré 30 g'],
    price: 30.90 },

  /* ===== FRAÎCHEUR ===== */
  { id: 'fraicheur-bodegas', group: 'fraicheur', name: 'Bodegas de salades', sub: '600 g · 12 pièces + fourchettes', img: 'fraicheur-bodegas',
    items: ['Salade de quinoa rouge aux légumes croquants et vinaigrette au xérès', 'Saladine de lentilles d’Île-de-France, chou blanc et raisin de Corinthe, sauce bergamote', 'Salade de pommes de terre rattes aux échalotes'],
    price: 47.30, lead72: true },
  { id: 'fraicheur-maraicher', group: 'fraicheur', name: 'Sélection du maraîcher', sub: '750 g', img: 'fraicheur-maraicher',
    items: ['Assortiment de légumes de saison selon arrivage', 'Sauce verdurette aux herbes fraîches'],
    tags: [VEG], price: 51.00, lead72: true },
  { id: 'fraicheur-oceane', group: 'fraicheur', name: 'Sandwichs-club lunch Océane', sub: '14 pièces', img: 'fraicheur-oceane',
    items: ['Mauricette en pain bretzel avec légumes de saison et moutarde douce', 'Pain bagnat : thon, anchois, olives et tomates'],
    price: 49.50, lead72: true },
  { id: 'fraicheur-terroir', group: 'fraicheur', name: 'Sandwichs lunch Terroir', sub: '14 pièces', img: 'fraicheur-terroir',
    items: ['Club sandwich XL à la volaille et aux légumes du jour', 'Sandwich moelleux grand Sud : bresaola, roquette, parmesan, pignons'],
    price: 46.35, lead72: true },
  { id: 'fraicheur-vegetarien', group: 'fraicheur', name: 'Sandwichs lunch Végétarien', sub: '14 pièces', img: 'fraicheur-vegetarien',
    items: ['Mini pain bretzel à la crème de brie truffée et salade croquante', 'Mini pita Sainte-Maure et crudités'],
    tags: [VEG], price: 43.50, lead72: true },

  /* ===== DOUCEURS ===== */
  { id: 'douceur-viennoiseries', group: 'douceurs', name: 'Petit-déjeuner viennoiseries', sub: '20 pièces', img: 'douceur-viennoiseries',
    items: ['Mini croissant', 'Mini pain au chocolat'], price: 34.15 },
  { id: 'douceur-madeleines', group: 'douceurs', name: 'Coffret de madeleines', sub: '48 pièces', img: 'douceur-madeleines',
    items: ['Madeleine lunch pur beurre au thé vert', 'Madeleine lunch pur beurre au citron'], price: 33.55, lead72: true },
  { id: 'douceur-petits-plus', group: 'douceurs', name: 'Les Petits plus', sub: '30 pièces', img: 'douceur-petits-plus',
    items: ['Assortiment de fours frais en 3 variétés', 'Charlotte poire-chocolat', 'Neige coco', 'Coque chocolat'], price: 66.65, lead72: true },
  { id: 'douceur-toujours-plus', group: 'douceurs', name: 'Les Toujours plus', sub: '60 pièces', img: 'douceur-toujours-plus',
    items: ['Assortiment de fours frais en 3 variétés', 'Cake l’instant noisette', 'Éveil d’agrumes', 'Chou passion caramel'], price: 102.00, lead72: true },
  { id: 'douceur-sg', group: 'douceurs', name: 'Le sucré sans gluten', sub: '14 pièces · taille lunch', img: 'douceur-sans-gluten',
    items: ['Financier pomme sarrasin'], tags: [SG], price: 30.50, lead72: true },
  { id: 'douceur-tartelettes', group: 'douceurs', name: 'Les tartelettes de saison', sub: '16 pièces', img: 'douceur-tartelettes',
    items: ['Tartelette oreillon abricot, crème à l’amande-pistache', 'Tartelette chocolat noir intense aux fruits de la passion', 'Tartelette pomme au four à la cannelle'], price: 64.60, lead72: true },
  { id: 'douceur-so-moelleux', group: 'douceurs', name: 'So Moelleux', sub: '46 pièces', img: 'douceur-so-moelleux',
    items: ['Moelleux pomme', 'Moelleux poire Bourdaloue', 'Fondant chocolat à l’orange', 'Madeleine beurre et thé vert'], price: 57.55, lead72: true },
  { id: 'douceur-chocolat-addict', group: 'douceurs', name: 'Chocolat addict', sub: '25 pièces', img: 'douceur-chocolat-addict',
    items: ['Poires amandines', 'Pommes au four à la cannelle', 'Chocolat noir intense à l’orange'], price: 40.10, lead72: true },
  { id: 'douceur-chouchous', group: 'douceurs', name: 'Nos p’tits chouchous', sub: '14 pièces', img: 'douceur-chouchous',
    items: ['Choux XL à la vanille de Madagascar', 'Caroline XL chocolat à la fève de Tonka'], price: 35.15, lead72: true },
  { id: 'douceur-fruits', group: 'douceurs', name: 'Coffret fruits So fresh', sub: '10 personnes · pinces bambou', img: 'douceur-fruits',
    items: ['Assortiment de fruits frais taillés en cubes, de saison selon arrivage (900 g)'], tags: [SG], price: 52.50, lead72: true },
  { id: 'douceur-bordelais', group: 'douceurs', name: 'Le Bordelais', img: 'douceur-bordelais',
    items: ['Cannelés bordelais lunch bio'], price: 34.00, lead72: true },

  /* ===== LA CAVE ===== */
  { id: 'soft-orange', group: 'softs', name: 'Jus d’orange Alain Milliat', sub: '1 L', price: 8.22 },
  { id: 'soft-pomme', group: 'softs', name: 'Jus de pomme Alain Milliat', sub: '1 L', price: 6.56 },
  { id: 'soft-coca', group: 'softs', name: 'Coca-Cola', sub: '1,25 L', price: 7.87 },
  { id: 'soft-coca-zero', group: 'softs', name: 'Coca-Cola zéro', sub: '1,25 L', price: 6.90 },
  { id: 'soft-poire', group: 'softs', name: 'Nectar de poire Williams Alain Milliat', sub: '1 L', price: 9.75 },
  { id: 'soft-raisin', group: 'softs', name: 'Jus de raisin rouge Alain Milliat', sub: '1 L', price: 11.00 },

  { id: 'eau-vittel', group: 'eaux', name: 'Vittel (eau plate)', sub: '1,5 L', price: 3.66 },
  { id: 'eau-evian', group: 'eaux', name: 'Evian (eau plate)', sub: '75 cl', price: 7.15 },
  { id: 'eau-cristaline', group: 'eaux', name: 'Cristaline (eau plate)', sub: '50 cl', price: 0.84 },
  { id: 'eau-perrier', group: 'eaux', name: 'Perrier (eau gazeuse)', sub: '1 L', price: 3.36 },
  { id: 'eau-badoit', group: 'eaux', name: 'Badoit (eau gazeuse)', sub: '75 cl', price: 6.60 },
  { id: 'eau-pellegrino', group: 'eaux', name: 'San Pellegrino (eau gazeuse)', sub: '1 L', price: 4.92 },

  { id: 'vin-luberon-blanc', group: 'vins', name: 'Private Gallery IGP Lubéron blanc', sub: 'Vin blanc · Chardonnay-Viognier', price: 11.96 },
  { id: 'vin-macon', group: 'vins', name: 'Mâcon blanc AOC · Village de Fayères', sub: 'Vin blanc', price: 17.87 },
  { id: 'vin-petula', group: 'vins', name: 'Pétula AOP Lubéron rosé', sub: 'Vin rosé', price: 16.00 },
  { id: 'vin-syrah', group: 'vins', name: 'Syrah IGP Les grains rouges', sub: 'Vin rouge', price: 11.00 },
  { id: 'vin-bourgueil', group: 'vins', name: 'Saint-Nicolas de Bourgueil AOC · Bio', sub: 'Vin rouge', price: 20.20 },
  { id: 'vin-crozes', group: 'vins', name: 'Crozes-Hermitage AOP Vallée du Rhône', sub: 'Vin rouge', price: 20.50 },
  { id: 'champagne-epc', group: 'vins', name: 'Champagne EPC blanc de blancs brut réserve', sub: '75 cl', price: 35.00 },

  { id: 'biere-ox', group: 'autres', name: 'Bière locale artisanale OX et bio de Marcoussis', price: 4.71 },
  { id: 'cidre-brut', group: 'autres', name: 'Cidre artisanal brut bio', sub: '75 cl', price: 9.95 },

  /* ===== LES INDISPENSABLES ===== */
  { id: 'ind-nappe', group: 'indispensables', name: 'Nappe papier intissé', sub: '10 × 1,2 m', price: 33.21 },
  { id: 'ind-flutes', group: 'indispensables', name: 'Flûtes jetables', price: 10.81 },
  { id: 'ind-gobelet-cafe', group: 'indispensables', name: 'Gobelets à café 10 cl jetables', sub: 'Lot de 10', price: 2.40 },
  { id: 'ind-gobelet-the', group: 'indispensables', name: 'Gobelets à thé 20 cl jetables', sub: 'Lot de 10', price: 2.45 },
  { id: 'ind-assiette', group: 'indispensables', name: 'Assiette entremets', sub: 'Ø 18 cm', price: 2.45 },
  { id: 'ind-tirebouchon', group: 'indispensables', name: 'Tire-bouchon', price: 6.03 },
  { id: 'ind-couverts', group: 'indispensables', name: 'Couverts en bois', sub: 'Prix sur devis', price: null }
];
