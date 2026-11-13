/**
 * Villes de Côte d’Ivoire — chefs-lieux des 111 départements (découpage en vigueur depuis 2020,
 * source : Wikipédia « Departments of Ivory Coast »), plus Anyama, Bingerville et Songon
 * (district autonome d’Abidjan). Triées par ordre alphabétique français.
 */
const RAW = [
  'Abengourou', 'Abidjan', 'Aboisso', 'Adiaké', 'Adzopé', 'Agboville', 'Agnibilékrou', 'Akoupé', 'Alépé', 'Anyama',
  'Arrah', 'Attiégouakro', 'Bangolo', 'Béoumi', 'Bettié', 'Biankouma', 'Bingerville', 'Bloléquin', 'Bocanda', 'Bondoukou',
  'Bongouanou', 'Bonon', 'Botro', 'Bouaflé', 'Bouaké', 'Bouna', 'Boundiali', 'Buyo', 'Dabakala', 'Dabou',
  'Daloa', 'Danané', 'Daoukro', 'Dianra', 'Didiévi', 'Dikodougou', 'Dimbokro', 'Divo', 'Djékanou', 'Doropo',
  'Duékoué', 'Facobly', 'Ferkessédougou', 'Fresco', 'Gagnoa', 'Gbéléban', 'Gohitafla', 'Grand-Bassam', 'Grand-Lahou', 'Guéyo',
  'Guiglo', 'Guitry', 'Issia', 'Jacqueville', 'Kani', 'Kaniasso', 'Katiola', 'Kong', 'Korhogo', 'Koro',
  'Kouassi-Kouassikro', 'Kouibly', 'Koun-Fao', 'Kounahiri', 'Kouto', 'Lakota', 'Madinani', 'Man', 'Mankono', 'M’Bahiakro',
  'M’Batto', 'M’Bengué', 'Méagui', 'Minignan', 'Nassian', 'Niakaramadougou', 'Odienné', 'Ouangolodougou', 'Ouaninou', 'Ouellé',
  'Oumé', 'Prikro', 'Sakassou', 'Samatiguila', 'San-Pédro', 'Sandégué', 'Sassandra', 'Séguéla', 'Séguélon', 'Sikensi',
  'Sinématiali', 'Sinfra', 'Sipilou', 'Songon', 'Soubré', 'Taabo', 'Tabou', 'Taï', 'Tanda', 'Téhini',
  'Tengréla', 'Tiapoum', 'Tiassalé', 'Tiébissou', 'Touba', 'Toulépleu', 'Toumodi', 'Transua', 'Vavoua', 'Yakassé-Attobrou',
  'Yamoussoukro', 'Zouan-Hounien', 'Zoukougbeu', 'Zuénoula',
]

const collator = new Intl.Collator('fr', { sensitivity: 'base', ignorePunctuation: true })
export const CITIES: string[] = [...new Set(RAW)].sort(collator.compare)

/** Les 10 communes de la ville d’Abidjan */
export const ABIDJAN_COMMUNES: string[] = ['Abobo', 'Adjamé', 'Attécoubé', 'Cocody', 'Koumassi', 'Marcory', 'Plateau', 'Port-Bouët', 'Treichville', 'Yopougon'].sort(collator.compare)

/** Villes livrées en express (district d’Abidjan) */
export const EXPRESS_CITIES = ['Abidjan', 'Anyama', 'Bingerville', 'Songon']
export const isExpressCity = (c: string) => EXPRESS_CITIES.includes(c)

/** Villes mises en avant en haut de la liste */
export const POPULAR_CITIES = ['Abidjan', 'Agboville', 'Bouaké', 'Yamoussoukro', 'San-Pédro', 'Daloa', 'Korhogo']
