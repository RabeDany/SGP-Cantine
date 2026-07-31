// ============================================================
// BASE DE CONNAISSANCES BILINGUE — Cuisine Malagasy
// SGP-Cantine · CGCS Madagascar
// ============================================================

export type FoodCategory =
  | 'céréales'
  | 'légumes'
  | 'légumineuses'
  | 'viandes'
  | 'poissons'
  | 'produits_laitiers'
  | 'fruits'
  | 'épices_condiments'
  | 'huiles_graisses'
  | 'boissons'
  | 'plats_traditionnels'
  | 'accompagnements'
  | 'sucreries'

export interface FoodEntry {
  fr: string           // nom français
  mlg: string          // nom malagasy
  category: FoodCategory
  aliases_fr?: string[]   // variantes françaises
  aliases_mlg?: string[]  // variantes malagasy
  notes?: string
}

// ============================================================
// CÉRÉALES & FÉCULENTS
// ============================================================
export const CÉRÉALES: FoodEntry[] = [
  { fr: 'riz', mlg: 'vary', category: 'céréales', aliases_fr: ['riz blanc', 'riz cuit'], aliases_mlg: ['vary fotsy', 'vary masaka'] },
  { fr: 'riz cru', mlg: 'vary maina', category: 'céréales' },
  { fr: 'riz rouge', mlg: 'vary mena', category: 'céréales', notes: 'Riz traditionnel des Hautes Terres' },
  { fr: 'riz gluant', mlg: 'vary sosoa', category: 'céréales' },
  { fr: 'maïs', mlg: 'katsaka', category: 'céréales', aliases_fr: ['mais'] },
  { fr: 'farine de maïs', mlg: 'harina katsaka', category: 'céréales' },
  { fr: 'manioc', mlg: 'mangahazo', category: 'céréales', aliases_fr: ['cassava'] },
  { fr: 'farine de manioc', mlg: 'harina mangahazo', category: 'céréales' },
  { fr: 'patate douce', mlg: 'batata', category: 'céréales', aliases_fr: ['patate'] },
  { fr: 'igname', mlg: 'ovy', category: 'céréales', aliases_fr: ['taro'] },
  { fr: 'taro', mlg: 'saonjo', category: 'céréales' },
  { fr: 'pain', mlg: 'mofo', category: 'céréales' },
  { fr: 'farine de blé', mlg: 'harina fromazaha', category: 'céréales', aliases_fr: ['farine'] },
  { fr: 'pâtes', mlg: 'macarona', category: 'céréales', aliases_fr: ['macaroni', 'spaghetti'] },
  { fr: 'semoule', mlg: 'semolina', category: 'céréales' },
]

// ============================================================
// LÉGUMES
// ============================================================
export const LÉGUMES: FoodEntry[] = [
  { fr: 'tomate', mlg: 'voatabia', category: 'légumes', aliases_fr: ['tomates'] },
  { fr: 'oignon', mlg: 'tongolo', category: 'légumes', aliases_fr: ['oignons'] },
  { fr: 'ail', mlg: 'tongolo mena', category: 'légumes', notes: 'Littéralement "oignon rouge"' },
  { fr: 'pomme de terre', mlg: 'patata fotsy', category: 'légumes', aliases_fr: ['pommes de terre', 'PdT'] },
  { fr: 'carotte', mlg: 'karoty', category: 'légumes', aliases_fr: ['carottes'] },
  { fr: 'haricot vert', mlg: 'tsaramaso maintso', category: 'légumes', aliases_fr: ['haricots verts'] },
  { fr: 'chou', mlg: 'laisoa', category: 'légumes', aliases_fr: ['choux'] },
  { fr: 'chou-fleur', mlg: 'laisoa fotsy', category: 'légumes' },
  { fr: 'épinard', mlg: 'anana', category: 'légumes', aliases_fr: ['épinards'], aliases_mlg: ['anana maintso'] },
  { fr: 'brèdes', mlg: 'anana', category: 'légumes', notes: 'Terme générique pour les feuilles comestibles cuites' },
  { fr: 'brèdes mafane', mlg: 'anamalaho', category: 'légumes', notes: 'Plante à saveur piquante-anesthésiante' },
  { fr: 'brèdes morelle', mlg: 'anana mainty', category: 'légumes' },
  { fr: 'concombre', mlg: 'lojy', category: 'légumes', aliases_fr: ['concombres'] },
  { fr: 'courgette', mlg: 'courgette', category: 'légumes' },
  { fr: 'aubergine', mlg: 'voankazo mainty', category: 'légumes', aliases_fr: ['aubergines'] },
  { fr: 'poivron', mlg: 'pilipitsy', category: 'légumes', aliases_fr: ['poivrons'] },
  { fr: 'piment', mlg: 'sakay', category: 'légumes', aliases_fr: ['piments'], notes: 'Ingrédient incontournable de la cuisine malagasy' },
  { fr: 'piment vert', mlg: 'sakay maintso', category: 'légumes' },
  { fr: 'piment rouge', mlg: 'sakay mena', category: 'légumes' },
  { fr: 'citrouille', mlg: 'jojoby', category: 'légumes', aliases_fr: ['potiron', 'courge'] },
  { fr: 'christophine', mlg: 'chouchou', category: 'légumes', aliases_fr: ['chayotte', 'chouchou'] },
  { fr: 'navet', mlg: 'navet', category: 'légumes' },
  { fr: 'céleri', mlg: 'seler', category: 'légumes' },
  { fr: 'laitue', mlg: 'salady', category: 'légumes', aliases_fr: ['salade verte'] },
  { fr: 'persil', mlg: 'peresy', category: 'légumes' },
  { fr: 'ciboulette', mlg: 'tongolo maintso', category: 'légumes', aliases_fr: ['ciboule'] },
  { fr: 'gingembre', mlg: 'sakamalao', category: 'légumes', aliases_mlg: ['zihary'] },
  { fr: 'pousse de bambou', mlg: 'fehy voloafo', category: 'légumes' },
  { fr: 'feuilles de manioc', mlg: 'ravintoto', category: 'légumes', notes: 'Utilisées dans le plat traditionnel ravitoto' },
]

// ============================================================
// LÉGUMINEUSES & PROTÉINES VÉGÉTALES
// ============================================================
export const LÉGUMINEUSES: FoodEntry[] = [
  { fr: 'haricot', mlg: 'tsaramaso', category: 'légumineuses', aliases_fr: ['haricots'] },
  { fr: 'haricots rouges', mlg: 'tsaramaso mena', category: 'légumineuses' },
  { fr: 'haricot blanc', mlg: 'tsaramaso fotsy', category: 'légumineuses' },
  { fr: 'lentille', mlg: 'antsoroka', category: 'légumineuses', aliases_fr: ['lentilles'] },
  { fr: 'pois du cap', mlg: 'kapily', category: 'légumineuses', notes: 'Très consommé à Madagascar' },
  { fr: 'pois', mlg: 'tsaramaso', category: 'légumineuses' },
  { fr: 'soja', mlg: 'soja', category: 'légumineuses' },
  { fr: 'arachide', mlg: 'voanjo', category: 'légumineuses', aliases_fr: ['cacahuète', 'cacahuètes', 'arachides'] },
  { fr: 'beurre de cacahuète', mlg: 'beurre voanjo', category: 'légumineuses' },
]

// ============================================================
// VIANDES & VOLAILLES
// ============================================================
export const VIANDES: FoodEntry[] = [
  { fr: 'bœuf', mlg: 'henan omby', category: 'viandes', aliases_fr: ['viande de bœuf', 'boeuf', 'bovin'] },
  { fr: 'zébu', mlg: 'omby', category: 'viandes', notes: 'Animal emblématique de Madagascar' },
  { fr: 'porc', mlg: 'henan kisoa', category: 'viandes', aliases_fr: ['viande de porc', 'cochon'] },
  { fr: 'poulet', mlg: 'akoho', category: 'viandes', aliases_fr: ['volaille', 'poulet de chair'] },
  { fr: 'poulet entier', mlg: 'akoho iray', category: 'viandes' },
  { fr: 'cuisse de poulet', mlg: 'andilany akoho', category: 'viandes', aliases_fr: ['cuisse'] },
  { fr: 'blanc de poulet', mlg: 'tratrany akoho', category: 'viandes', aliases_fr: ['filet de poulet', 'escalope'] },
  { fr: 'canard', mlg: 'gana', category: 'viandes' },
  { fr: 'dinde', mlg: 'tadigny', category: 'viandes' },
  { fr: 'mouton', mlg: 'ondry', category: 'viandes', aliases_fr: ['agneau'] },
  { fr: 'cabri', mlg: 'osy', category: 'viandes', aliases_fr: ['chèvre', 'chevreau'] },
  { fr: 'saucisse', mlg: 'sositsy', category: 'viandes' },
  { fr: 'jambon', mlg: 'jamba', category: 'viandes' },
  { fr: 'foie', mlg: 'aty', category: 'viandes', aliases_fr: ['abats'] },
]

// ============================================================
// POISSONS & FRUITS DE MER
// ============================================================
export const POISSONS: FoodEntry[] = [
  { fr: 'poisson', mlg: 'trondro', category: 'poissons', notes: 'Terme générique' },
  { fr: 'tilapia', mlg: 'trondro gasy', category: 'poissons', notes: 'Poisson d\'eau douce très populaire' },
  { fr: 'carpe', mlg: 'karpa', category: 'poissons' },
  { fr: 'thon', mlg: 'tonosina', category: 'poissons', aliases_fr: ['thon en boîte', 'conserve de thon'] },
  { fr: 'sardine', mlg: 'sardiny', category: 'poissons', aliases_fr: ['sardines'] },
  { fr: 'crevette', mlg: 'orana', category: 'poissons', aliases_fr: ['crevettes'] },
  { fr: 'crabe', mlg: 'patsa', category: 'poissons' },
  { fr: 'calamar', mlg: 'biby ranomasina', category: 'poissons', aliases_fr: ['encornet'] },
  { fr: 'poisson séché', mlg: 'trondro maina', category: 'poissons', notes: 'Méthode de conservation traditionnelle' },
  { fr: 'poisson salé', mlg: 'trondro sira', category: 'poissons' },
]

// ============================================================
// PRODUITS LAITIERS & ŒUFS
// ============================================================
export const PRODUITS_LAITIERS: FoodEntry[] = [
  { fr: 'lait', mlg: 'ronono', category: 'produits_laitiers' },
  { fr: 'lait en poudre', mlg: 'ronono vovoka', category: 'produits_laitiers' },
  { fr: 'yaourt', mlg: 'yaourt', category: 'produits_laitiers', aliases_fr: ['yogourt'] },
  { fr: 'fromage', mlg: 'fromazy', category: 'produits_laitiers' },
  { fr: 'beurre', mlg: 'beurra', category: 'produits_laitiers' },
  { fr: 'crème fraîche', mlg: 'crème', category: 'produits_laitiers' },
  { fr: 'œuf', mlg: 'atody', category: 'produits_laitiers', aliases_fr: ['œufs', 'oeufs', 'oeuf'] },
  { fr: 'œuf de poule', mlg: 'atody akoho', category: 'produits_laitiers' },
]

// ============================================================
// FRUITS
// ============================================================
export const FRUITS: FoodEntry[] = [
  { fr: 'banane', mlg: 'akondro', category: 'fruits', aliases_fr: ['bananes'] },
  { fr: 'mangue', mlg: 'manga', category: 'fruits', aliases_fr: ['mangues'] },
  { fr: 'ananas', mlg: 'mananasy', category: 'fruits' },
  { fr: 'litchi', mlg: 'letchis', category: 'fruits', aliases_fr: ['letchis', 'lychee'], notes: 'Fruit emblématique de Madagascar' },
  { fr: 'avocat', mlg: 'avoka', category: 'fruits', aliases_fr: ['avocats'] },
  { fr: 'papaye', mlg: 'papay', category: 'fruits', aliases_fr: ['papayes'] },
  { fr: 'orange', mlg: 'voasary', category: 'fruits', aliases_fr: ['oranges'] },
  { fr: 'citron', mlg: 'voasary maitso', category: 'fruits', aliases_fr: ['citrons'] },
  { fr: 'mandarine', mlg: 'voasary kely', category: 'fruits' },
  { fr: 'pastèque', mlg: 'farihy', category: 'fruits' },
  { fr: 'noix de coco', mlg: 'voanio', category: 'fruits', aliases_fr: ['coco', 'cocotier'] },
  { fr: 'lait de coco', mlg: 'ronono voanio', category: 'fruits' },
  { fr: 'goyave', mlg: 'goavy', category: 'fruits' },
  { fr: 'tamarin', mlg: 'madiro', category: 'fruits' },
  { fr: 'jacquier', mlg: 'voanjakaka', category: 'fruits', aliases_fr: ['fruit du jacquier'] },
  { fr: 'fruit de la passion', mlg: 'paraky', category: 'fruits', aliases_fr: ['maracuja'] },
]

// ============================================================
// ÉPICES, CONDIMENTS & AROMATES
// ============================================================
export const ÉPICES: FoodEntry[] = [
  { fr: 'sel', mlg: 'sira', category: 'épices_condiments' },
  { fr: 'poivre', mlg: 'dipoavatra', category: 'épices_condiments' },
  { fr: 'poivre noir', mlg: 'dipoavatra mainty', category: 'épices_condiments', notes: 'Madagascar est un grand producteur' },
  { fr: 'sucre', mlg: 'siramamy', category: 'épices_condiments' },
  { fr: 'sucre roux', mlg: 'siramamy mena', category: 'épices_condiments' },
  { fr: 'curcuma', mlg: 'tamotamo', category: 'épices_condiments', aliases_fr: ['curcuma en poudre'] },
  { fr: 'gingembre', mlg: 'sakamalao', category: 'épices_condiments' },
  { fr: 'cannelle', mlg: 'kanela', category: 'épices_condiments', notes: 'Produit d\'exportation de Madagascar' },
  { fr: 'girofle', mlg: 'jirofo', category: 'épices_condiments', notes: 'Clou de girofle, major export' },
  { fr: 'vanille', mlg: 'vanila', category: 'épices_condiments', notes: 'Madagascar = 1er producteur mondial' },
  { fr: 'basilic', mlg: 'fatsikahitra', category: 'épices_condiments', aliases_fr: ['basilique'] },
  { fr: 'thym', mlg: 'tim', category: 'épices_condiments' },
  { fr: 'laurier', mlg: 'fohy', category: 'épices_condiments', aliases_fr: ['feuille de laurier'] },
  { fr: 'piment en poudre', mlg: 'sakay vovoka', category: 'épices_condiments' },
  { fr: 'curry', mlg: 'cari', category: 'épices_condiments', aliases_fr: ['cari', 'massalé'] },
  { fr: 'vinaigre', mlg: 'vinaigra', category: 'épices_condiments' },
  { fr: 'sauce soja', mlg: 'laoka soja', category: 'épices_condiments', aliases_fr: ['soja', 'soya'] },
  { fr: 'moutarde', mlg: 'moutarda', category: 'épices_condiments' },
  { fr: 'mayonnaise', mlg: 'mayoneza', category: 'épices_condiments' },
  { fr: 'ketchup', mlg: 'ketchup', category: 'épices_condiments' },
]

// ============================================================
// HUILES & GRAISSES
// ============================================================
export const HUILES: FoodEntry[] = [
  { fr: 'huile', mlg: 'menaka', category: 'huiles_graisses', notes: 'Terme générique' },
  { fr: 'huile végétale', mlg: 'menaka anana', category: 'huiles_graisses', aliases_fr: ['huile de cuisine'] },
  { fr: 'huile de palme', mlg: 'menaka rofia', category: 'huiles_graisses' },
  { fr: 'huile d\'arachide', mlg: 'menaka voanjo', category: 'huiles_graisses' },
  { fr: 'graisse', mlg: 'tavy', category: 'huiles_graisses' },
  { fr: 'margarine', mlg: 'margarina', category: 'huiles_graisses' },
  { fr: 'huile de coco', mlg: 'menaka voanio', category: 'huiles_graisses' },
]

// ============================================================
// BOISSONS
// ============================================================
export const BOISSONS: FoodEntry[] = [
  { fr: 'eau', mlg: 'rano', category: 'boissons' },
  { fr: 'eau potable', mlg: 'rano fisotroana', category: 'boissons' },
  { fr: 'jus de fruit', mlg: 'ranon-aina', category: 'boissons', aliases_fr: ['jus'] },
  { fr: 'thé', mlg: 'dite', category: 'boissons' },
  { fr: 'café', mlg: 'kafe', category: 'boissons', notes: 'Madagascar produit du café arabica et robusta' },
  { fr: 'lait fermenté', mlg: 'ranon\'apango', category: 'boissons', notes: 'Eau de riz fermentée, boisson traditionnelle' },
  { fr: 'eau de riz', mlg: 'ranon\'apango', category: 'boissons', notes: 'Boisson quotidienne dans les ménages malagasy' },
  { fr: 'rhum', mlg: 'toaka gasy', category: 'boissons', notes: 'Alcool traditionnel artisanal' },
  { fr: 'bière', mlg: 'biera', category: 'boissons' },
  { fr: 'soda', mlg: 'soda', category: 'boissons', aliases_fr: ['boisson gazeuse'] },
  { fr: 'sirop', mlg: 'siropy', category: 'boissons' },
]

// ============================================================
// PLATS TRADITIONNELS MALAGASY
// ============================================================
export const PLATS_TRADITIONNELS: FoodEntry[] = [
  {
    fr: 'riz au bouillon',
    mlg: 'vary amin\'anana',
    category: 'plats_traditionnels',
    aliases_fr: ['soupe de riz', 'riz soupe'],
    notes: 'Plat du quotidien : riz avec légumes-feuilles'
  },
  {
    fr: 'riz avec accompagnement',
    mlg: 'vary sy laoka',
    category: 'plats_traditionnels',
    notes: 'Structure de base du repas malagasy'
  },
  {
    fr: 'feuilles de manioc sautées au porc',
    mlg: 'ravitoto sy henan-kisoa',
    category: 'plats_traditionnels',
    aliases_fr: ['ravitoto'],
    aliases_mlg: ['ravitoto'],
    notes: 'Plat national de Madagascar'
  },
  {
    fr: 'poulet à la sauce tomate',
    mlg: 'akoho sy voanemba',
    category: 'plats_traditionnels',
    aliases_fr: ['poulet sauce tomate']
  },
  {
    fr: 'poulet braisé aux épices',
    mlg: 'akoho misy anana',
    category: 'plats_traditionnels',
    notes: 'Poulet mijoté aux feuilles vertes et épices'
  },
  {
    fr: 'bœuf aux haricots rouges',
    mlg: 'henakisoa sy tsaramaso',
    category: 'plats_traditionnels',
    aliases_fr: ['henan-kisoa sy tsaramaso'],
  },
  {
    fr: 'zébu grillé',
    mlg: 'hen\'omby ritra',
    category: 'plats_traditionnels',
    aliases_fr: ['barbecue de zébu', 'viande de zébu grillée']
  },
  {
    fr: 'soupe de légumes',
    mlg: 'hena sy anana',
    category: 'plats_traditionnels',
    aliases_fr: ['soupe légumes']
  },
  {
    fr: 'brèdes au lait de coco',
    mlg: 'anana sy ronono voanio',
    category: 'plats_traditionnels',
    notes: 'Spécialité côtière'
  },
  {
    fr: 'riz sauté aux légumes',
    mlg: 'vary voatia sy anana',
    category: 'plats_traditionnels',
    aliases_fr: ['riz sauté']
  },
  {
    fr: 'viande séchée',
    mlg: 'kitoza',
    category: 'plats_traditionnels',
    notes: 'Lamelles de viande (zébu/porc) séchées et fumées'
  },
  {
    fr: 'brochette de zébu',
    mlg: 'masikita',
    category: 'plats_traditionnels',
    notes: 'Brochettes de rue très populaires'
  },
  {
    fr: 'galette de riz',
    mlg: 'mofo gasy',
    category: 'plats_traditionnels',
    notes: 'Petit déjeuner traditionnel, galette épaisse'
  },
  {
    fr: 'beignet',
    mlg: 'mofo baolina',
    category: 'plats_traditionnels',
    aliases_fr: ['beignets', 'mofo baolina']
  },
  {
    fr: 'galette de maïs',
    mlg: 'mofo katsaka',
    category: 'plats_traditionnels'
  },
  {
    fr: 'soupe de zebu',
    mlg: 'laoka hen\'omby',
    category: 'plats_traditionnels',
    aliases_fr: ['soupe de bœuf']
  },
  {
    fr: 'crevettes sautées',
    mlg: 'orana voatia',
    category: 'plats_traditionnels',
    aliases_fr: ['sauté de crevettes']
  },
  {
    fr: 'poisson grillé',
    mlg: 'trondro voatao',
    category: 'plats_traditionnels',
    aliases_fr: ['poisson au grill']
  },
  {
    fr: 'riz au lait de coco',
    mlg: 'vary amin\'ny ronono voanio',
    category: 'plats_traditionnels',
    notes: 'Plat côtier (Sainte-Marie, côte Est)'
  },
  {
    fr: 'achards de légumes',
    mlg: 'lasary legioma',
    category: 'plats_traditionnels',
    aliases_fr: ['achard', 'achards', 'lasary'],
    notes: 'Condiment de légumes fermentés/marinés'
  },
  {
    fr: 'salade de tomates et oignons',
    mlg: 'lasary voatabia sy tongolo',
    category: 'plats_traditionnels',
    aliases_fr: ['lasary', 'salade malagasy']
  },
]

// ============================================================
// ACCOMPAGNEMENTS & CONDIMENTS DE TABLE
// ============================================================
export const ACCOMPAGNEMENTS: FoodEntry[] = [
  { fr: 'sauce pimentée', mlg: 'lasary sakay', category: 'accompagnements', aliases_fr: ['piment sauce', 'sauce piment'] },
  { fr: 'sauce tomate', mlg: 'lasary voatabia', category: 'accompagnements' },
  { fr: 'achard de fruits', mlg: 'lasary voankazo', category: 'accompagnements' },
  { fr: 'crudités', mlg: 'legioma manta', category: 'accompagnements' },
  { fr: 'frites', mlg: 'patata gorodona', category: 'accompagnements', aliases_fr: ['pommes de terre frites'] },
]

// ============================================================
// SUCRERIES & DESSERTS
// ============================================================
export const SUCRERIES: FoodEntry[] = [
  { fr: 'gâteau', mlg: 'mofomamy', category: 'sucreries', aliases_fr: ['gateau', 'gateaux', 'gâteaux'] },
  { fr: 'biscuit', mlg: 'gâteau sec', category: 'sucreries', aliases_fr: ['biscuits', 'gâteau sec'] },
  { fr: 'sucre glace', mlg: 'siramamy vovoka', category: 'sucreries' },
  { fr: 'confiture', mlg: 'konfitira', category: 'sucreries' },
  { fr: 'miel', mlg: 'tantely', category: 'sucreries', notes: 'Miel sauvage de Madagascar' },
  { fr: 'chocolat', mlg: 'shokolaty', category: 'sucreries', notes: 'Madagascar produit du cacao de qualité' },
  { fr: 'riz au lait', mlg: 'vary amin\'ny ronono', category: 'sucreries' },
  { fr: 'bonbon', mlg: 'siramamy kely', category: 'sucreries', aliases_fr: ['bonbons', 'confiserie'] },
]

// ============================================================
// BASE CONSOLIDÉE — export principal
// ============================================================
export const FOOD_KNOWLEDGE_BASE: FoodEntry[] = [
  ...CÉRÉALES,
  ...LÉGUMES,
  ...LÉGUMINEUSES,
  ...VIANDES,
  ...POISSONS,
  ...PRODUITS_LAITIERS,
  ...FRUITS,
  ...ÉPICES,
  ...HUILES,
  ...BOISSONS,
  ...PLATS_TRADITIONNELS,
  ...ACCOMPAGNEMENTS,
  ...SUCRERIES,
]

// ============================================================
// MOTEUR DE TRADUCTION
// ============================================================

type TranslationDirection = 'fr->mlg' | 'mlg->fr' | 'auto'

export interface TranslationResult {
  input: string
  output: string
  direction: 'fr->mlg' | 'mlg->fr'
  confidence: 'exact' | 'alias' | 'partial'
  entry: FoodEntry
}

/**
 * Normalise une chaîne pour la comparaison (minuscules, sans accents, trimmed)
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // retire les accents
    .replace(/['']/g, "'")
}

/**
 * Traduit un terme alimentaire FR ↔ MLG
 * @param input     Le terme à traduire
 * @param direction 'fr->mlg' | 'mlg->fr' | 'auto' (détection automatique)
 */
export function translate(
  input: string,
  direction: TranslationDirection = 'auto'
): TranslationResult | null {
  const query = normalize(input)

  for (const entry of FOOD_KNOWLEDGE_BASE) {
    const frNorm = normalize(entry.fr)
    const mlgNorm = normalize(entry.mlg)
    const frAliases = (entry.aliases_fr ?? []).map(normalize)
    const mlgAliases = (entry.aliases_mlg ?? []).map(normalize)

    // --- FR → MLG ---
    if (direction === 'fr->mlg' || direction === 'auto') {
      if (query === frNorm) {
        return { input, output: entry.mlg, direction: 'fr->mlg', confidence: 'exact', entry }
      }
      if (frAliases.includes(query)) {
        return { input, output: entry.mlg, direction: 'fr->mlg', confidence: 'alias', entry }
      }
    }

    // --- MLG → FR ---
    if (direction === 'mlg->fr' || direction === 'auto') {
      if (query === mlgNorm) {
        return { input, output: entry.fr, direction: 'mlg->fr', confidence: 'exact', entry }
      }
      if (mlgAliases.includes(query)) {
        return { input, output: entry.fr, direction: 'mlg->fr', confidence: 'alias', entry }
      }
    }
  }

  // --- Recherche partielle (contient) ---
  for (const entry of FOOD_KNOWLEDGE_BASE) {
    const frNorm = normalize(entry.fr)
    const mlgNorm = normalize(entry.mlg)

    if (direction !== 'mlg->fr' && frNorm.includes(query) && query.length >= 3) {
      return { input, output: entry.mlg, direction: 'fr->mlg', confidence: 'partial', entry }
    }
    if (direction !== 'fr->mlg' && mlgNorm.includes(query) && query.length >= 3) {
      return { input, output: entry.fr, direction: 'mlg->fr', confidence: 'partial', entry }
    }
  }

  return null
}

/**
 * Traduit une liste de termes en une seule passe
 */
export function translateBatch(
  terms: string[],
  direction: TranslationDirection = 'auto'
): Array<TranslationResult | null> {
  return terms.map(t => translate(t, direction))
}

/**
 * Recherche full-text dans la base (retourne plusieurs résultats)
 */
export function search(query: string, limit = 5): FoodEntry[] {
  const q = normalize(query)
  const results: Array<{ entry: FoodEntry; score: number }> = []

  for (const entry of FOOD_KNOWLEDGE_BASE) {
    let score = 0
    const frNorm = normalize(entry.fr)
    const mlgNorm = normalize(entry.mlg)

    if (frNorm === q || mlgNorm === q) score = 100
    else if (frNorm.startsWith(q) || mlgNorm.startsWith(q)) score = 80
    else if (frNorm.includes(q) || mlgNorm.includes(q)) score = 60
    else if ((entry.aliases_fr ?? []).some(a => normalize(a).includes(q))) score = 50
    else if ((entry.aliases_mlg ?? []).some(a => normalize(a).includes(q))) score = 50

    if (score > 0) results.push({ entry, score })
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(r => r.entry)
}

/**
 * Retourne tous les termes d'une catégorie
 */
export function getByCategory(category: FoodCategory): FoodEntry[] {
  return FOOD_KNOWLEDGE_BASE.filter(e => e.category === category)
}

/**
 * Stats de la base
 */
export function getStats() {
  const byCategory: Partial<Record<FoodCategory, number>> = {}
  for (const entry of FOOD_KNOWLEDGE_BASE) {
    byCategory[entry.category] = (byCategory[entry.category] ?? 0) + 1
  }
  return {
    total: FOOD_KNOWLEDGE_BASE.length,
    byCategory,
  }
}
