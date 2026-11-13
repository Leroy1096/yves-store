export type CategoryId = 'accessoires' | 'vetements' | 'chaussures' | 'bijoux' | 'cheveux' | (string & {})
export type Gender = 'Homme' | 'Femme' | 'Unisexe'
export type AgeGroup = '15-25' | '25-50' | '50-80'

export interface Category {
  id: CategoryId
  name: string
  tagline: string
  image: string
}

export interface Product {
  id: string
  slug: string
  name: string
  category: CategoryId
  price: number
  compareAt?: number
  images: string[]
  rating: number
  reviewCount: number
  gender: Gender
  ages: AgeGroup[]
  colors?: { name: string; hex: string }[]
  sizes?: string[]
  sizeLabel?: string
  badge?: 'Nouveau' | 'Best-seller' | 'Édition limitée'
  short: string
  description: string
  details: string[]
  stock: number
  addedDaysAgo: number
  featured?: boolean
  sub?: string
  sold?: number
  flash?: boolean
  hashtag?: string
}

export interface Review {
  id: string
  productId: string
  author: string
  city: string
  age: number
  rating: number
  date: string
  title: string
  body: string
  verified: boolean
}

export const categories: Category[] = [
  { id: 'accessoires', name: 'Accessoires de téléphone', tagline: 'Écouteurs, coques, chargeurs, montres', image: '/img/cat-accessoires.webp' },
  { id: 'vetements', name: 'Vêtements', tagline: 'Lin, wax, tailoring & streetwear', image: '/img/cat-vetements.webp' },
  { id: 'chaussures', name: 'Chaussures', tagline: 'Baskets, mocassins, sneakers', image: '/img/cat-chaussures.webp' },
  { id: 'bijoux', name: 'Chaînes, bracelets & bagues', tagline: 'Plaqué or 18K, zircon, acier', image: '/img/cat-bijoux.webp' },
  { id: 'cheveux', name: 'Produits pour cheveux', tagline: 'Huiles, karité, soins naturels', image: '/img/cat-cheveux.webp' },
]

export const ageGroups: { id: AgeGroup; label: string }[] = [
  { id: '15-25', label: '15 – 25 ans' },
  { id: '25-50', label: '25 – 50 ans' },
  { id: '50-80', label: '50 – 80 ans' },
]

const g = (n: string) => [`/img/prod/${n}-1.webp`, `/img/prod/${n}-2.webp`]
const ALL: AgeGroup[] = ['15-25', '25-50', '50-80']

export const products: Product[] = [
  // ——— ACCESSOIRES ———
  {
    id: 'p01', flash: true, sub: 'ecouteurs', hashtag: '#SonPremium', slug: 'ecouteurs-sans-fil-pro-anc', name: 'Écouteurs sans fil Pro ANC', category: 'accessoires',
    price: 24900, compareAt: 32000, images: [...g('ecouteurs'), '/img/cat-accessoires.webp'], rating: 4.8, reviewCount: 214,
    gender: 'Unisexe', ages: ['15-25', '25-50'], colors: [{ name: 'Blanc nacré', hex: '#F4F2EE' }], badge: 'Best-seller',
    short: 'Réduction de bruit active, 30 h d’autonomie, son spatial.',
    description: 'Plongez dans votre musique, même au cœur d’Adjamé. Nos écouteurs Pro ANC combinent une réduction active du bruit, un mode transparence naturel et un son riche aux basses profondes. Le boîtier compact recharge vos écouteurs jusqu’à 6 fois.',
    details: ['Réduction de bruit active (ANC) + mode transparence', 'Bluetooth 5.3 — connexion instantanée iPhone & Android', '6 h d’écoute + 24 h avec le boîtier', 'Résistants à la sueur et aux éclaboussures (IPX4)', 'Garantie 6 mois YVES STORE'],
    stock: 34, addedDaysAgo: 40, featured: true,
  },
  {
    id: 'p02', sub: 'coques', slug: 'coque-cuir-premium', name: 'Coque Cuir Premium Anneau Doré', category: 'accessoires',
    price: 9500, images: [...g('coque'), '/img/cat-accessoires.webp'], rating: 4.7, reviewCount: 96,
    gender: 'Unisexe', ages: ALL, colors: [{ name: 'Cognac', hex: '#8B4A2B' }, { name: 'Noir', hex: '#1B1A18' }],
    sizes: ['iPhone 13', 'iPhone 14', 'iPhone 15', 'iPhone 16', 'Galaxy S24'], sizeLabel: 'Modèle',
    short: 'Cuir grainé, contour caméra doré, compatible MagSafe.',
    description: 'Une coque qui vieillit avec élégance. Cuir grainé doux au toucher, intérieur microfibre qui protège votre écran et contour caméra finition or pour une touche de luxe discrète.',
    details: ['Cuir véritable grainé', 'Contour caméra en métal finition or', 'Compatible charge sans fil & MagSafe', 'Bords surélevés anti-chute (1,2 m)'],
    stock: 58, addedDaysAgo: 22,
  },
  {
    id: 'p03', flash: true, sub: 'chargeurs', slug: 'batterie-externe-20000mah', name: 'Batterie Externe 20 000 mAh', category: 'accessoires',
    price: 15000, compareAt: 18500, images: [...g('powerbank'), '/img/cat-accessoires.webp'], rating: 4.6, reviewCount: 143,
    gender: 'Unisexe', ages: ALL, colors: [{ name: 'Noir mat', hex: '#232323' }],
    short: 'Charge rapide 22,5 W, écran LED, câble tressé inclus.',
    description: 'Fini les coupures d’électricité qui vous laissent sans batterie. 20 000 mAh pour recharger votre téléphone jusqu’à 5 fois, avec affichage précis du niveau restant.',
    details: ['Capacité 20 000 mAh', 'Charge rapide PD 22,5 W', '2 ports USB-A + 1 USB-C', 'Écran LED de niveau de batterie', 'Câble USB-C tressé offert'],
    stock: 41, addedDaysAgo: 60, featured: true,
  },
  {
    id: 'p04', flash: true, sub: 'montres', hashtag: '#SantéConnectée', slug: 'montre-connectee-sport-plus', name: 'Montre Connectée Sport+', category: 'accessoires',
    price: 29900, compareAt: 39000, images: [...g('montre'), '/img/cat-accessoires.webp'], rating: 4.5, reviewCount: 77,
    gender: 'Unisexe', ages: ALL, colors: [{ name: 'Noir', hex: '#121212' }], badge: 'Nouveau',
    short: 'Cardio, sommeil, notifications WhatsApp, 7 jours d’autonomie.',
    description: 'Suivez votre santé et restez connecté sans sortir votre téléphone. Grand écran AMOLED lisible au soleil, suivi du rythme cardiaque, du sommeil et plus de 100 modes sportifs. Idéale aussi pour les parents et grands-parents : gros chiffres et alerte de chute.',
    details: ['Écran AMOLED 1,9"', 'Fréquence cardiaque, SpO2, sommeil', 'Notifications appels, SMS & WhatsApp', 'Autonomie jusqu’à 7 jours', 'Étanche 5 ATM'],
    stock: 19, addedDaysAgo: 5, featured: true,
  },
  {
    id: 'p05', sub: 'chargeurs', slug: 'cable-usb-c-tresse-2m', name: 'Câble USB-C Tressé 2 m', category: 'accessoires',
    price: 4500, images: [...g('cable'), '/img/cat-accessoires.webp'], rating: 4.7, reviewCount: 188,
    gender: 'Unisexe', ages: ALL, colors: [{ name: 'Noir', hex: '#1A1A1A' }],
    short: 'Nylon tressé ultra-résistant, charge rapide 60 W.',
    description: 'Le câble qui ne vous lâche pas. Gaine en nylon tressé testée à 20 000 pliages, embouts renforcés en aluminium et attache cuir pour le rangement.',
    details: ['Longueur 2 m', 'Charge rapide jusqu’à 60 W', 'Transfert de données 480 Mb/s', 'Testé 20 000 pliages'],
    stock: 120, addedDaysAgo: 90,
  },

  // ——— VÊTEMENTS ———
  {
    id: 'p06', sub: 'chemises', slug: 'chemise-lin-naturel', name: 'Chemise en Lin Naturel', category: 'vetements',
    price: 16900, images: [...g('chemise-lin'), '/img/cat-vetements.webp'], rating: 4.8, reviewCount: 64,
    gender: 'Homme', ages: ALL, colors: [{ name: 'Écru', hex: '#E8DFCF' }], sizes: ['S', 'M', 'L', 'XL', 'XXL'], sizeLabel: 'Taille',
    short: '100 % lin respirant, parfaite pour la chaleur d’Abidjan.',
    description: 'La pièce indispensable sous nos climats. Un lin lavé, léger et respirant, coupé droit pour se porter aussi bien au bureau qu’en week-end à Assinie.',
    details: ['100 % lin lavé', 'Coupe droite, col classique', 'Boutons en nacre végétale', 'Lavage machine 30 °C'],
    stock: 27, addedDaysAgo: 30,
  },
  {
    id: 'p07', flash: true, sub: 'vestes', slug: 'blazer-noir-ajuste', name: 'Blazer Noir Ajusté', category: 'vetements',
    price: 39900, compareAt: 52000, images: [...g('blazer'), '/img/cat-vetements.webp'], rating: 4.9, reviewCount: 41,
    gender: 'Homme', ages: ['25-50', '50-80'], colors: [{ name: 'Noir', hex: '#121212' }], sizes: ['46', '48', '50', '52', '54', '56'], sizeLabel: 'Taille',
    short: 'Tailoring italien, tissu infroissable, doublure satin.',
    description: 'Mariages, entretiens, cérémonies : le blazer qui fait la différence. Épaules structurées, taille légèrement cintrée et tissu infroissable pour rester impeccable toute la journée.',
    details: ['Polyester-viscose premium infroissable', 'Doublure satinée respirante', '2 boutons, revers cran', 'Retouches offertes en boutique'],
    stock: 12, addedDaysAgo: 18, featured: true,
  },
  {
    id: 'p08', sub: 'chemises', hashtag: '#FiertéWax', slug: 'chemise-wax-soleil-abidjan', name: 'Chemise Wax « Soleil d’Abidjan »', category: 'vetements',
    price: 16000, images: [...g('chemise-wax'), '/img/cat-vetements.webp'], rating: 4.9, reviewCount: 87,
    gender: 'Unisexe', ages: ALL, colors: [{ name: 'Bleu & Or', hex: '#2A3E6B' }], sizes: ['S', 'M', 'L', 'XL', 'XXL'], sizeLabel: 'Taille',
    short: 'Wax 100 % coton, cousu main à Abidjan.', badge: 'Nouveau',
    description: 'Un hommage à notre héritage. Tissu wax premium aux motifs soleil, coupé et cousu à la main par nos tailleurs partenaires de Treichville. Chaque pièce est unique.',
    details: ['Wax 100 % coton certifié', 'Confection artisanale à Abidjan', 'Coupe regular, manches longues', 'Lavage à l’envers, 30 °C'],
    stock: 22, addedDaysAgo: 3, featured: true,
  },
  {
    id: 'p09', sub: 'sweats', slug: 'sweat-noir-lisere-or', name: 'Sweat Noir Liseré Or', category: 'vetements',
    price: 14900, images: [...g('sweat'), '/img/hero.webp'], rating: 4.6, reviewCount: 58,
    gender: 'Unisexe', ages: ['15-25', '25-50'], colors: [{ name: 'Noir', hex: '#141414' }], sizes: ['S', 'M', 'L', 'XL'], sizeLabel: 'Taille',
    short: 'Molleton épais, finitions dorées, coupe oversize.',
    description: 'Le confort streetwear avec une touche de luxe. Molleton brossé 380 g/m², liserés dorés et coupe légèrement oversize pour un tombé parfait.',
    details: ['Coton brossé 380 g/m²', 'Liserés finition or', 'Coupe oversize', 'Bord-côtes renforcés'],
    stock: 30, addedDaysAgo: 12,
  },
  {
    id: 'p10', sub: 'ensembles', slug: 'ensemble-survetement-femme', name: 'Ensemble Survêtement Femme', category: 'vetements',
    price: 19900, images: [...g('veste-femme'), '/img/hero.webp'], rating: 4.7, reviewCount: 39,
    gender: 'Femme', ages: ['15-25', '25-50'], colors: [{ name: 'Noir & Or', hex: '#1C1A17' }], sizes: ['XS', 'S', 'M', 'L', 'XL'], sizeLabel: 'Taille',
    short: 'Veste zippée + short, matière fluide, détails dorés.', badge: 'Édition limitée',
    description: 'Chic et décontracté. Un ensemble deux pièces à la matière fluide et légèrement satinée, pensé pour bouger librement tout en restant élégante.',
    details: ['Veste zippée + short assorti', 'Polyester recyclé fluide', 'Bandes latérales dorées', 'Poches zippées'],
    stock: 9, addedDaysAgo: 7,
  },

  // ——— CHAUSSURES ———
  {
    id: 'p11', sub: 'baskets', slug: 'baskets-cuir-blanc-essentielles', name: 'Baskets Cuir Blanc Essentielles', category: 'chaussures',
    price: 29000, images: [...g('sneakers-blanches'), '/img/cat-chaussures.webp'], rating: 4.8, reviewCount: 152,
    gender: 'Unisexe', ages: ALL, colors: [{ name: 'Blanc', hex: '#F5F5F2' }], sizes: ['38', '39', '40', '41', '42', '43', '44', '45', '46'], sizeLabel: 'Pointure',
    short: 'Cuir pleine fleur, semelle cousue, confort toute la journée.', badge: 'Best-seller',
    description: 'La basket minimaliste qui va avec tout. Cuir pleine fleur, semelle gomme cousue et semelle intérieure à mémoire de forme pour marcher des heures sans fatigue.',
    details: ['Cuir pleine fleur', 'Semelle extérieure gomme cousue', 'Semelle intérieure mémoire de forme', 'Doublure cuir respirante'],
    stock: 44, addedDaysAgo: 50, featured: true,
  },
  {
    id: 'p12', sub: 'mocassins', slug: 'mocassins-cuir-cognac', name: 'Mocassins Cuir Cognac', category: 'chaussures',
    price: 32500, images: [...g('mocassins'), '/img/cat-chaussures.webp'], rating: 4.9, reviewCount: 68,
    gender: 'Homme', ages: ['25-50', '50-80'], colors: [{ name: 'Cognac', hex: '#7A4024' }], sizes: ['39', '40', '41', '42', '43', '44', '45'], sizeLabel: 'Pointure',
    short: 'Cuir patiné à la main, semelle souple et légère.',
    description: 'L’élégance intemporelle. Un mocassin penny en cuir patiné à la main, semelle flexible et talon amorti. Aussi beau avec un costume qu’avec un pantalon en lin.',
    details: ['Cuir de veau patiné main', 'Semelle cuir & gomme', 'Talon amorti', 'Fabrication artisanale'],
    stock: 16, addedDaysAgo: 26,
  },
  {
    id: 'p13', flash: true, sub: 'baskets', hashtag: '#SneakerGame', slug: 'sneakers-montantes-noir-or', name: 'Sneakers Montantes Noir & Or', category: 'chaussures',
    price: 34900, compareAt: 45000, images: [...g('sneakers-or'), '/img/hero.webp'], rating: 4.7, reviewCount: 93,
    gender: 'Unisexe', ages: ['15-25', '25-50'], colors: [{ name: 'Noir & Or', hex: '#1A1612' }], sizes: ['39', '40', '41', '42', '43', '44', '45'], sizeLabel: 'Pointure',
    short: 'Cuir verni or métallisé, tige montante, édition collector.', badge: 'Édition limitée',
    description: 'La paire qui attire tous les regards. Tige montante en cuir noir avec empiècements or métallisé, semelle blanche iconique et maintien parfait de la cheville.',
    details: ['Cuir & empiècements or métallisé', 'Tige montante rembourrée', 'Semelle caoutchouc antidérapante', 'Édition limitée — stock restreint'],
    stock: 7, addedDaysAgo: 9, featured: true,
  },
  {
    id: 'p14', sub: 'baskets', slug: 'baskets-running-femme-noir-or', name: 'Baskets Running Femme Noir & Or', category: 'chaussures',
    price: 22900, images: [...g('baskets-femme'), '/img/hero.webp'], rating: 4.6, reviewCount: 47,
    gender: 'Femme', ages: ['15-25', '25-50', '50-80'], colors: [{ name: 'Noir & Or', hex: '#1A1612' }], sizes: ['36', '37', '38', '39', '40', '41'], sizeLabel: 'Pointure',
    short: 'Amorti réactif, ultra-légères, look sport-chic.',
    description: 'Du footing matinal au brunch du dimanche. Mesh respirant, renforts dorés et semelle à amorti réactif pour un confort exceptionnel.',
    details: ['Tige mesh respirante', 'Amorti mousse réactive', 'Poids : 240 g (pointure 38)', 'Semelle antidérapante'],
    stock: 21, addedDaysAgo: 14,
  },

  // ——— BIJOUX ———
  {
    id: 'p15', flash: true, sub: 'chaines', hashtag: '#OrQuiBrille', slug: 'chaine-maille-cubaine-or-18k', name: 'Chaîne Maille Cubaine Plaqué Or 18K', category: 'bijoux',
    price: 18900, compareAt: 25000, images: [...g('chaine'), '/img/cat-bijoux.webp'], rating: 4.8, reviewCount: 176,
    gender: 'Unisexe', ages: ALL, colors: [{ name: 'Or jaune', hex: '#C9A24A' }], sizes: ['45 cm', '50 cm', '55 cm', '60 cm'], sizeLabel: 'Longueur',
    short: 'Acier inoxydable plaqué or 18K, ne noircit pas.', badge: 'Best-seller',
    description: 'L’iconique maille cubaine, sertie de zircons scintillants. Acier inoxydable 316L plaqué or 18K : résiste à l’eau, à la transpiration et ne noircit pas la peau.',
    details: ['Acier 316L plaqué or 18K (3 microns)', 'Pavage zircon cubique', 'Largeur 12 mm', 'Fermoir sécurisé à double clip', 'Écrin cadeau offert'],
    stock: 25, addedDaysAgo: 35, featured: true,
  },
  {
    id: 'p16', sub: 'bracelets', slug: 'bracelet-maille-cubaine', name: 'Bracelet Maille Cubaine Or', category: 'bijoux',
    price: 9900, images: [...g('bracelets'), '/img/cat-bijoux.webp'], rating: 4.7, reviewCount: 102,
    gender: 'Unisexe', ages: ALL, colors: [{ name: 'Or jaune', hex: '#C9A24A' }], sizes: ['18 cm', '20 cm', '22 cm'], sizeLabel: 'Tour de poignet',
    short: 'Assorti à la chaîne, finition miroir ou pavée.',
    description: 'Le compagnon parfait de votre chaîne. Un bracelet maille cubaine au poids rassurant, plaqué or 18K, qui se porte seul ou en accumulation.',
    details: ['Acier 316L plaqué or 18K', 'Hypoallergénique', 'Fermoir boîte sécurisé', 'Résistant à l’eau'],
    stock: 33, addedDaysAgo: 28,
  },
  {
    id: 'p17', sub: 'bagues', slug: 'bague-pavee-zircon', name: 'Bague Pavée Zircon Plaqué Or', category: 'bijoux',
    price: 8900, images: [...g('bagues'), '/img/cat-bijoux.webp'], rating: 4.6, reviewCount: 59,
    gender: 'Unisexe', ages: ALL, colors: [{ name: 'Or jaune', hex: '#C9A24A' }], sizes: ['52', '54', '56', '58', '60', '62', '64'], sizeLabel: 'Taille de doigt',
    short: 'Anneau large serti de zircons, éclat diamant.', badge: 'Nouveau',
    description: 'Un éclat qui ne passe pas inaperçu. Anneau large entièrement pavé de zircons taillés, monté sur acier plaqué or 18K.',
    details: ['Acier 316L plaqué or 18K', 'Zircons cubiques taille brillant', 'Largeur 9 mm', 'Guide des tailles disponible'],
    stock: 18, addedDaysAgo: 4,
  },
  {
    id: 'p18', sub: 'bagues', slug: 'chevaliere-solitaire-or', name: 'Chevalière Solitaire Or', category: 'bijoux',
    price: 10900, images: [...g('chevaliere'), '/img/cat-bijoux.webp'], rating: 4.8, reviewCount: 44,
    gender: 'Homme', ages: ['25-50', '50-80'], colors: [{ name: 'Or jaune', hex: '#C9A24A' }], sizes: ['56', '58', '60', '62', '64', '66'], sizeLabel: 'Taille de doigt',
    short: 'Pierre solitaire centrale, symbole de distinction.',
    description: 'La chevalière revisitée : une pierre solitaire centrale sertie griffes sur un anneau massif plaqué or. Un bijou de caractère, transmis de génération en génération.',
    details: ['Acier 316L plaqué or 18K', 'Zircon solitaire 8 mm', 'Gravure personnalisée possible', 'Écrin cadeau offert'],
    stock: 14, addedDaysAgo: 45,
  },

  // ——— CHEVEUX ———
  {
    id: 'p19', sub: 'huiles', hashtag: '#PousseNaturelle', slug: 'huile-croissance-ricin-romarin', name: 'Huile Croissance Ricin & Romarin', category: 'cheveux',
    price: 7500, images: [...g('huile'), '/img/cat-cheveux.webp'], rating: 4.8, reviewCount: 231,
    gender: 'Unisexe', ages: ALL, sizes: ['60 ml', '120 ml'], sizeLabel: 'Format',
    short: 'Stimule la pousse, fortifie les racines, 100 % naturelle.', badge: 'Best-seller',
    description: 'Notre formule signature : huile de ricin noir pressée à froid, romarin, biotine et vitamine E. Massez le cuir chevelu 3 fois par semaine pour des cheveux plus denses et des tempes regarnies.',
    details: ['Ricin noir, romarin, biotine, vitamine E', 'Sans silicone ni huile minérale', 'Convient aux cheveux crépus, frisés, défrisés & barbes', 'Résultats visibles dès 6 semaines'],
    stock: 75, addedDaysAgo: 55, featured: true,
  },
  {
    id: 'p20', sub: 'soins', slug: 'beurre-karite-pur', name: 'Beurre de Karité Pur 226 g', category: 'cheveux',
    price: 5500, images: [...g('karite'), '/img/cat-cheveux.webp'], rating: 4.9, reviewCount: 312,
    gender: 'Unisexe', ages: ALL,
    short: 'Karité brut du nord ivoirien, nourrit cheveux & peau.',
    description: 'Récolté et transformé par une coopérative de femmes à Korhogo. Un karité brut, non raffiné, riche en vitamines A et E, qui scelle l’hydratation des cheveux et adoucit la peau.',
    details: ['100 % karité brut non raffiné', 'Coopérative féminine de Korhogo', 'Cheveux, peau, lèvres, bébé', 'Pot de 226 g'],
    stock: 140, addedDaysAgo: 70,
  },
  {
    id: 'p21', sub: 'accessoires-cheveux', slug: 'peigne-afro-bois-santal', name: 'Peigne Afro en Bois de Santal', category: 'cheveux',
    price: 2900, images: [...g('peigne'), '/img/cat-cheveux.webp'], rating: 4.7, reviewCount: 85,
    gender: 'Unisexe', ages: ALL,
    short: 'Dents larges anti-casse, antistatique, parfum boisé.',
    description: 'Démêlez sans casser. Ce peigne en bois de santal aux dents larges glisse dans les cheveux crépus et frisés, réduit l’électricité statique et diffuse un léger parfum boisé.',
    details: ['Bois de santal massif poli main', 'Dents larges anti-casse', 'Antistatique', 'Longueur 18 cm'],
    stock: 90, addedDaysAgo: 80,
  },
  {
    id: 'p22', flash: true, sub: 'coffrets', slug: 'coffret-rituel-cheveux', name: 'Coffret Rituel Cheveux', category: 'cheveux',
    price: 14000, compareAt: 15900, images: [...g('coffret-cheveux'), '/img/cat-cheveux.webp'], rating: 4.9, reviewCount: 66,
    gender: 'Unisexe', ages: ALL,
    short: 'Huile croissance + karité + peigne santal. Idée cadeau.', badge: 'Nouveau',
    description: 'Tout le rituel YVES dans un coffret élégant : huile croissance ricin & romarin, beurre de karité pur et peigne en santal. Le cadeau idéal pour maman, papa, ou vous-même.',
    details: ['Huile croissance 60 ml', 'Beurre de karité 226 g', 'Peigne afro santal', 'Coffret cadeau avec carte'],
    stock: 20, addedDaysAgo: 2, featured: true,
  },
  // ——— NOUVEAUX PRODUITS ———
  {
    id: 'p23', flash: true, sub: 'supports', slug: 'support-magnetique-360', name: 'Support Magnétique Téléphone 360°', category: 'accessoires',
    price: 5900, compareAt: 8500, images: g('support-voiture').concat('/img/cat-accessoires.webp'), rating: 4.6, reviewCount: 121,
    gender: 'Unisexe', ages: ['25-50', '50-80'], colors: [{ name: 'Noir', hex: '#1A1A1A' }],
    short: 'Aimants N52 ultra-puissants, rotation 360°, pose en 10 secondes.',
    description: 'Votre téléphone toujours à hauteur des yeux : au bureau, en cuisine ou en voiture. Aimants N52 qui tiennent fermement tous les téléphones, rotule 360° et base adhésive gel réutilisable.',
    details: ['Aimants N52 haute puissance', 'Rotation 360°, bras réglable', 'Compatible MagSafe + plaque métal offerte', 'Base gel adhésive lavable'],
    stock: 60, addedDaysAgo: 6,
  },
  {
    id: 'p24', sub: 'chargeurs', slug: 'chargeur-rapide-20w-usb-c', name: 'Chargeur Rapide 20 W USB-C', category: 'accessoires',
    price: 5500, images: g('chargeur').concat('/img/cat-accessoires.webp'), rating: 4.7, reviewCount: 264,
    gender: 'Unisexe', ages: ['15-25', '25-50', '50-80'], colors: [{ name: 'Blanc', hex: '#F4F4F2' }], badge: 'Best-seller',
    short: '0 à 50 % en 30 minutes, câble USB-C 1 m inclus.',
    description: 'Le chargeur compact qui recharge votre téléphone deux fois plus vite. Protection contre la surchauffe et les surtensions, idéal pour les variations de courant.',
    details: ['Puissance 20 W Power Delivery', 'Câble USB-C vers USB-C 1 m inclus', 'Protection surtension & surchauffe', 'Compatible iPhone, Samsung, Tecno, Infinix'],
    stock: 150, addedDaysAgo: 40,
  },
  {
    id: 'p25', sub: 'supports', slug: 'perche-selfie-trepied-bluetooth', name: 'Perche Selfie Trépied Bluetooth', category: 'accessoires',
    price: 6900, images: g('trepied').concat('/img/cat-accessoires.webp'), rating: 4.5, reviewCount: 88,
    gender: 'Unisexe', ages: ['15-25', '25-50'], colors: [{ name: 'Noir', hex: '#1A1A1A' }], badge: 'Nouveau', hashtag: '#ContenuTikTok',
    short: 'Trépied stable + télécommande, parfait pour TikTok et lives.',
    description: 'Filmez vos vidéos TikTok, vos lives et photos de groupe sans aide. Se déplie de 20 cm à 1,10 m, pieds antidérapants et télécommande Bluetooth détachable.',
    details: ['Hauteur 20 cm à 110 cm', 'Télécommande Bluetooth (portée 10 m)', 'Rotation 360° du support', 'Pieds antidérapants'],
    stock: 45, addedDaysAgo: 4,
  },
  {
    id: 'p26', flash: true, sub: 'tshirts', slug: 't-shirt-oversize-blanc-premium', name: 'T-shirt Oversize Blanc Premium', category: 'vetements',
    price: 7500, compareAt: 9500, images: g('tshirt').concat('/img/cat-vetements.webp'), rating: 4.7, reviewCount: 176,
    gender: 'Unisexe', ages: ['15-25', '25-50'], colors: [{ name: 'Blanc', hex: '#FAFAFA' }, { name: 'Noir', hex: '#141414' }], sizes: ['S', 'M', 'L', 'XL', 'XXL'], sizeLabel: 'Taille',
    short: 'Coton épais 240 g/m², ne se déforme pas au lavage.',
    description: 'Le basique parfait : coton peigné épais, col côtelé renforcé et coupe oversize moderne. Reste blanc et garde sa forme lavage après lavage.',
    details: ['100 % coton peigné 240 g/m²', 'Coupe oversize, épaules tombantes', 'Col côtelé renforcé', 'Pré-rétréci'],
    stock: 90, addedDaysAgo: 15,
  },
  {
    id: 'p27', sub: 'robes', slug: 'robe-longue-wax-soleil', name: 'Robe Longue Wax « Soleil »', category: 'vetements',
    price: 19900, images: g('robe-wax').concat('/img/cat-vetements.webp'), rating: 4.9, reviewCount: 73,
    gender: 'Femme', ages: ['25-50', '50-80'], colors: [{ name: 'Orange & Vert', hex: '#D9741E' }], sizes: ['S', 'M', 'L', 'XL', 'XXL'], sizeLabel: 'Taille', badge: 'Nouveau',
    short: 'Robe chemise longue en wax, ceinture assortie, cousue à Abidjan.',
    description: 'Élégante pour les cérémonies comme pour le dimanche : une robe chemise longue en wax premium, manches longues, ceinture à nouer et jupe ample qui virevolte.',
    details: ['Wax 100 % coton premium', 'Ceinture assortie amovible', 'Boutonnage devant', 'Confection artisanale à Abidjan'],
    stock: 14, addedDaysAgo: 2, featured: true,
  },
  {
    id: 'p28', sub: 'pantalons', slug: 'pantalon-cargo-beige', name: 'Pantalon Cargo Beige', category: 'vetements',
    price: 11900, images: g('cargo').concat('/img/cat-vetements.webp'), rating: 4.6, reviewCount: 64,
    gender: 'Homme', ages: ['15-25', '25-50'], colors: [{ name: 'Beige', hex: '#CDBB98' }], sizes: ['38', '40', '42', '44', '46'], sizeLabel: 'Taille',
    short: 'Twill de coton résistant, 6 poches, coupe droite décontractée.',
    description: 'Pratique et tendance : un cargo en twill de coton doux, poches latérales à rabat et taille ajustable. Se porte avec des baskets comme avec des sandales.',
    details: ['Twill 98 % coton, 2 % élasthanne', '6 poches dont 2 cargo', 'Coupe droite', 'Lavage machine 30 °C'],
    stock: 38, addedDaysAgo: 11,
  },
  {
    id: 'p29', sub: 'sandales', slug: 'sandales-cuir-tresse', name: 'Sandales Cuir Tressé', category: 'chaussures',
    price: 14900, images: g('sandales').concat('/img/cat-chaussures.webp'), rating: 4.8, reviewCount: 57,
    gender: 'Homme', ages: ['25-50', '50-80'], colors: [{ name: 'Marron', hex: '#7B4325' }], sizes: ['40', '41', '42', '43', '44', '45'], sizeLabel: 'Pointure',
    short: 'Cuir tressé main, semelle gomme souple, ultra-respirantes.',
    description: 'Le confort pour nos journées chaudes. Cuir pleine fleur tressé à la main, semelle intérieure en cuir et semelle gomme qui amortit chaque pas.',
    details: ['Cuir pleine fleur tressé main', 'Semelle intérieure cuir', 'Semelle gomme flexible', 'Boucle réglable'],
    stock: 26, addedDaysAgo: 20,
  },
  {
    id: 'p30', flash: true, sub: 'escarpins', slug: 'escarpins-nude-classiques', name: 'Escarpins Nude Classiques', category: 'chaussures',
    price: 18500, compareAt: 24000, images: g('escarpins').concat('/img/cat-chaussures.webp'), rating: 4.6, reviewCount: 49,
    gender: 'Femme', ages: ['25-50', '50-80'], colors: [{ name: 'Nude', hex: '#D9B79A' }], sizes: ['36', '37', '38', '39', '40', '41'], sizeLabel: 'Pointure',
    short: 'Bout pointu, talon 9 cm, semelle intérieure rembourrée.',
    description: 'L’escarpin qui allonge la silhouette et s’accorde à toutes les tenues. Cuir synthétique doux, talon aiguille stable de 9 cm et semelle de propreté rembourrée.',
    details: ['Talon 9 cm', 'Semelle intérieure rembourrée', 'Bout pointu', 'Couleur nude universelle'],
    stock: 18, addedDaysAgo: 8,
  },
  {
    id: 'p31', sub: 'chaines', slug: 'collier-pendentif-coeur-or', name: 'Collier Pendentif Cœur Plaqué Or', category: 'bijoux',
    price: 8500, images: g('pendentif').concat('/img/cat-bijoux.webp'), rating: 4.8, reviewCount: 138,
    gender: 'Femme', ages: ['15-25', '25-50', '50-80'], colors: [{ name: 'Or jaune', hex: '#C9A24A' }], sizes: ['40 cm', '45 cm'], sizeLabel: 'Longueur', badge: 'Best-seller',
    short: 'Chaîne fine et cœur serti, idéal en cadeau.',
    description: 'Un bijou délicat qui se porte tous les jours : chaîne forçat fine et pendentif cœur serti d’un zircon. Livré dans son écrin, prêt à offrir.',
    details: ['Acier 316L plaqué or 18K', 'Pendentif cœur 8 mm serti zircon', 'Chaîne réglable', 'Écrin cadeau offert'],
    stock: 52, addedDaysAgo: 18,
  },
  {
    id: 'p32', flash: true, sub: 'perruques', slug: 'perruque-lace-front-body-wave', name: 'Perruque Lace Front Body Wave', category: 'cheveux',
    price: 54900, compareAt: 75000, images: g('perruque').concat('/img/cat-cheveux.webp'), rating: 4.7, reviewCount: 92,
    gender: 'Femme', ages: ['15-25', '25-50', '50-80'], colors: [{ name: 'Noir naturel', hex: '#141210' }], sizes: ['18 pouces', '22 pouces', '26 pouces'], sizeLabel: 'Longueur',
    short: '100 % cheveux humains, lace HD transparente, densité 180 %.',
    description: 'Un rendu naturel bluffant : cheveux humains vierges ondulés, lace HD invisible sur toutes les carnations et densité 180 %. Peut être lissée, bouclée ou colorée.',
    details: ['100 % cheveux humains vierges', 'Lace frontal HD 13x4', 'Densité 180 %', 'Bonnet ajustable avec élastique'],
    stock: 11, addedDaysAgo: 3, featured: true,
  },
]

// ——— REVIEWS ———
const people = [
  ['Aya Koné', 'Cocody, Abidjan', 24], ['Kouassi Yao', 'Yopougon, Abidjan', 31], ['Mariam Touré', 'Bouaké', 19],
  ['Jean-Marc Kouadio', 'Plateau, Abidjan', 44], ['Adjoua N’Guessan', 'Agboville', 57], ['Ibrahim Ouattara', 'Korhogo', 27],
  ['Grâce Ahoua', 'Marcory, Abidjan', 35], ['Didier Zadi', 'Yamoussoukro', 63], ['Awa Coulibaly', 'San-Pédro', 22],
  ['Hervé Kacou', 'Bingerville', 49], ['Christelle Assi', 'Riviera, Abidjan', 29], ['Paul Ehui', 'Agboville', 71],
  ['Fatou Diabaté', 'Abobo, Abidjan', 17], ['Serge Bamba', 'Daloa', 38], ['Marie-Laure Gnagne', 'Grand-Bassam', 52],
  ['Yannick Brou', 'Treichville, Abidjan', 26],
] as const

const pool: Record<CategoryId, [number, string, string][]> = {
  accessoires: [
    [5, 'Excellent rapport qualité/prix', 'Reçu en 24 h à Cocody, emballage soigné. Le produit est exactement comme sur les photos, je recommande à 100 %.'],
    [5, 'Je ne m’en sépare plus', 'Je l’utilise tous les jours pour le travail. Solide, beau et la batterie tient vraiment longtemps.'],
    [4, 'Très bien', 'Bonne qualité. Livraison un peu plus longue que prévu à Bouaké, mais le service client m’a tenu informé sur WhatsApp.'],
    [5, 'Cadeau parfait', 'Offert à mon fils pour ses 18 ans, il est ravi. Le paiement à la livraison m’a mis en confiance.'],
    [5, 'Original et durable', 'J’avais acheté des copies au marché qui ne duraient pas. Ici c’est une autre qualité, ça se sent tout de suite.'],
    [4, 'Simple à utiliser', 'Même pour moi qui ne suis pas très technologie, mon petit-fils me l’a installé en 2 minutes. Très pratique.'],
  ],
  vetements: [
    [5, 'Coupe impeccable', 'La taille correspond parfaitement au guide. Le tissu est de grande qualité, j’ai reçu plein de compliments.'],
    [5, 'Superbe finition', 'Les coutures sont propres, rien à voir avec ce qu’on trouve d’habitude. Je vais commander d’autres couleurs.'],
    [4, 'Très satisfait', 'Belle pièce, agréable à porter même par forte chaleur. J’ai pris une taille au-dessus pour plus d’aisance.'],
    [5, 'Élégance garantie', 'Porté à un mariage à Yamoussoukro, tout le monde m’a demandé où je l’avais acheté !'],
    [5, 'Pour toute la famille', 'J’en ai pris pour moi et mon mari, nous avons 30 ans d’écart avec nos enfants et tout le monde aime.'],
    [4, 'Bonne qualité', 'Lavé plusieurs fois, les couleurs ne bougent pas. Livraison rapide à Abidjan.'],
  ],
  chaussures: [
    [5, 'Confort incroyable', 'Je marche toute la journée pour mon travail et zéro douleur. Le cuir est souple dès le premier jour.'],
    [5, 'Magnifiques', 'Encore plus belles en vrai. La pointure taille normalement, j’ai pris ma taille habituelle.'],
    [4, 'Très belles chaussures', 'Qualité au rendez-vous. Il faut un ou deux jours pour les faire à son pied mais ensuite c’est parfait.'],
    [5, 'Échange facile', 'J’ai dû changer de pointure, le livreur est revenu dès le lendemain avec la bonne taille. Service au top.'],
    [5, 'Je recommande', 'Elles vont avec tout, jean comme pantalon de costume. Mon fils m’a déjà demandé les mêmes.'],
    [4, 'Bon achat', 'Belle finition, semelle solide. Un peu étroites au début, sinon parfait.'],
  ],
  bijoux: [
    [5, 'Brille comme de l’or', 'Ça fait 4 mois que je la porte tous les jours, même à la douche, et elle n’a pas noirci. Bluffant.'],
    [5, 'Superbe écrin', 'Offert à ma femme pour notre anniversaire, l’écrin est très chic. Elle était émue.'],
    [5, 'Qualité premium', 'Le poids est rassurant, on sent que ce n’est pas du toc. Les zircons scintillent énormément au soleil.'],
    [4, 'Très joli', 'Conforme aux photos. J’aurais dû prendre une taille au-dessus, mais l’échange a été rapide.'],
    [5, 'Ne gratte pas', 'J’ai la peau sensible et aucune réaction. Enfin des bijoux que je peux porter sans souci.'],
    [5, 'Classe', 'À mon âge je voulais quelque chose de sobre mais élégant. Parfait, mes petits-enfants adorent.'],
  ],
  cheveux: [
    [5, 'Mes tempes repoussent !', 'Après 2 mois d’utilisation 3 fois par semaine, mes tempes sont nettement plus fournies. Je rachète.'],
    [5, 'Karité de qualité', 'Odeur naturelle, texture fondante. On sent que c’est du vrai karité de chez nous.'],
    [5, 'Toute la famille l’utilise', 'Mon mari pour sa barbe, moi pour mes vanilles et ma mère pour ses cheveux gris. Un vrai indispensable.'],
    [4, 'Très efficace', 'Mes cheveux sont plus doux et cassent beaucoup moins. Petite odeur de romarin au début mais on s’y fait.'],
    [5, 'Je recommande vivement', 'Produit naturel et efficace. Livré rapidement à Agboville, merci YVES STORE !'],
    [5, 'Idée cadeau top', 'Offert à ma maman pour la fête des mères, elle a adoré le coffret et la petite carte.'],
  ],
}

const months = ['oct. 2026', 'sept. 2026', 'août 2026', 'nov. 2026', 'juil. 2026', 'oct. 2026']

export const seedReviews: Review[] = products.flatMap((p, pi) => {
  const n = 4 + (pi % 3)
  return Array.from({ length: n }, (_, k) => {
    const [rating, title, body] = pool[p.category][(pi + k * 2) % 6]
    const [author, city, age] = people[(pi * 3 + k * 5) % people.length]
    return {
      id: `${p.id}-r${k}`, productId: p.id, author, city, age, rating, title, body,
      date: `${((pi * 7 + k * 11) % 27) + 1} ${months[(pi + k) % months.length]}`,
      verified: (pi + k) % 5 !== 0,
    }
  })
})

export interface SubCategory { id: string; name: string; category: CategoryId; image: string }
export const subcategories: SubCategory[] = [
  { id: 'ecouteurs', name: 'Écouteurs', category: 'accessoires', image: '/img/prod/ecouteurs-1.webp' },
  { id: 'coques', name: 'Coques', category: 'accessoires', image: '/img/prod/coque-1.webp' },
  { id: 'chargeurs', name: 'Chargeurs & câbles', category: 'accessoires', image: '/img/prod/chargeur-1.webp' },
  { id: 'montres', name: 'Montres connectées', category: 'accessoires', image: '/img/prod/montre-1.webp' },
  { id: 'supports', name: 'Supports & trépieds', category: 'accessoires', image: '/img/prod/trepied-1.webp' },
  { id: 'chemises', name: 'Chemises', category: 'vetements', image: '/img/prod/chemise-wax-1.webp' },
  { id: 'tshirts', name: 'T-shirts', category: 'vetements', image: '/img/prod/tshirt-1.webp' },
  { id: 'robes', name: 'Robes', category: 'vetements', image: '/img/prod/robe-wax-1.webp' },
  { id: 'vestes', name: 'Vestes & blazers', category: 'vetements', image: '/img/prod/blazer-1.webp' },
  { id: 'sweats', name: 'Sweats', category: 'vetements', image: '/img/prod/sweat-1.webp' },
  { id: 'pantalons', name: 'Pantalons', category: 'vetements', image: '/img/prod/cargo-1.webp' },
  { id: 'ensembles', name: 'Ensembles', category: 'vetements', image: '/img/prod/veste-femme-1.webp' },
  { id: 'baskets', name: 'Baskets', category: 'chaussures', image: '/img/prod/sneakers-blanches-1.webp' },
  { id: 'mocassins', name: 'Mocassins', category: 'chaussures', image: '/img/prod/mocassins-1.webp' },
  { id: 'sandales', name: 'Sandales', category: 'chaussures', image: '/img/prod/sandales-1.webp' },
  { id: 'escarpins', name: 'Escarpins', category: 'chaussures', image: '/img/prod/escarpins-1.webp' },
  { id: 'chaines', name: 'Chaînes & colliers', category: 'bijoux', image: '/img/prod/chaine-1.webp' },
  { id: 'bracelets', name: 'Bracelets', category: 'bijoux', image: '/img/prod/bracelets-1.webp' },
  { id: 'bagues', name: 'Bagues', category: 'bijoux', image: '/img/prod/bagues-1.webp' },
  { id: 'huiles', name: 'Huiles', category: 'cheveux', image: '/img/prod/huile-1.webp' },
  { id: 'soins', name: 'Beurres & soins', category: 'cheveux', image: '/img/prod/karite-1.webp' },
  { id: 'perruques', name: 'Perruques', category: 'cheveux', image: '/img/prod/perruque-1.webp' },
  { id: 'accessoires-cheveux', name: 'Peignes & accessoires', category: 'cheveux', image: '/img/prod/peigne-1.webp' },
  { id: 'coffrets', name: 'Coffrets cadeaux', category: 'cheveux', image: '/img/prod/coffret-cheveux-1.webp' },
]

// Quantités vendues (affichage type marketplace) — dérivées des avis
for (const p of products) p.sold = p.sold ?? Math.round(p.reviewCount * 6.3 + (p.id.charCodeAt(2) % 7) * 11)

export const getProduct = (slug: string) => products.find((p) => p.slug === slug)
export const getCategory = (id: CategoryId): Category => categories.find((c) => c.id === id) ?? { id, name: id, tagline: '', image: '' }

export function ratingDistribution(p: Product): number[] {
  // Synthetic but consistent [5★,4★,3★,2★,1★] distribution matching rating
  const five = Math.round((p.rating - 4) * 100 * 0.92)
  const four = Math.max(0, 100 - five - 6)
  return [five, four, 4, 1, 1].map((v) => Math.max(0, v))
}
