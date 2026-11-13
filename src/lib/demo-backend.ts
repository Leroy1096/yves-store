/**
 * Mode DÉMO HORS LIGNE — utilisé uniquement dans le fichier d’aperçu unique (VITE_SINGLE).
 * Imite les tables et fonctions Supabase dans le navigateur (localStorage) pour que
 * l’espace client et l’espace gérant soient utilisables sans Internet.
 * Les données sont fictives et n’ont aucun lien avec la vraie boutique.
 */
import { categories, products } from '../data/products'

type Row = Record<string, any>
interface DemoUser { id: string; email: string; password: string; blocked: boolean; created_at: string; last_sign_in_at: string | null }
interface DB {
  v: number
  users: DemoUser[]
  profiles: Row[]
  admins: string[]
  orders: Row[]
  catalog_products: Row[]
  catalog_categories: Row[]
  stock_movements: Row[]
  whatsapp_requests: Row[]
  seq: number
}

export const DEMO_GERANT = { email: 'yvesstore1@gmail.com' }

const KEY = 'yves-demo-db'
const SKEY = 'yves-demo-session'
const DB_VERSION = 8
const BASE_CATS = categories.map((c) => ({ id: c.id, name: c.name, tagline: c.tagline }))
// Instantané du catalogue AVANT toute modification (stock et prix d’origine)
const SEED = products.map((p) => ({ id: p.id, name: p.name, category: p.category, price: p.price, compare_at: p.compareAt ?? null, stock: p.stock, image: p.images[0], sizes: p.sizes, colors: p.colors }))

const iso = (msAgo = 0) => new Date(Date.now() - msAgo).toISOString()
const H = 3600_000, D = 24 * H
const uuid = () => 'demo-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

function seed(): DB {
  const db: DB = { v: DB_VERSION, users: [], profiles: [], admins: [], orders: [], catalog_products: [], catalog_categories: [], stock_movements: [], whatsapp_requests: [], seq: 1 }
  db.catalog_categories = BASE_CATS.map((c) => ({ ...c, custom: false, created_at: iso(30 * D) }))
  db.catalog_products = SEED.map((p) => ({ id: p.id, name: p.name, category: p.category, price: p.price, compare_at: p.compare_at, active: true, stock: p.stock, low_stock_threshold: 5, updated_at: iso(10 * D) }))

  const addUser = (email: string, first: string, last: string, opt: { phone?: string; city?: string; commune?: string; method?: 'email' | 'phone'; daysAgo: number; admin?: boolean; password?: string }) => {
    const id = uuid()
    db.users.push({ id, email, password: opt.password ?? '', blocked: false, created_at: iso(opt.daysAgo * D), last_sign_in_at: iso(Math.min(opt.daysAgo * D * 0.9, Math.random() * 3 * D)) })
    db.profiles.push({ id, first_name: first, last_name: last, email: opt.method === 'phone' ? null : email, phone: opt.phone ?? null, signup_method: opt.method ?? 'email', city: opt.city ?? null, commune: opt.commune ?? null, address: null, birth_year: null, birth_date: null, contact_phone: opt.phone ?? null, newsletter: false, created_at: iso(opt.daysAgo * D) })
    if (opt.admin) db.admins.push(id)
    return id
  }
  // Compte gérant (mot de passe fixé à la première connexion dans l’aperçu)
  addUser(DEMO_GERANT.email, 'Yves', 'Store', { daysAgo: 60, admin: true, password: '', phone: '+2250140810415' })
  simulateShop(db, addUser)
  return db
}


// ───────────── Clients de test (simulation d’activité réelle) ─────────────
function rng(seedN: number) { let a = seedN; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
type AddUser = (email: string, first: string, last: string, opt: { phone?: string; city?: string; commune?: string; method?: 'email' | 'phone'; daysAgo: number; admin?: boolean; password?: string }) => string
const PAY = ['Paiement à la livraison', 'Paiement à la livraison', 'Orange Money', 'Wave', 'MTN Mobile Money', 'Moov Money']
const fmtPhone = (e164: string) => e164.replace(/^\+225(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/, '+225 $1 $2 $3 $4 $5')

function simulateShop(db: DB, addUser: AddUser) {
  const r = rng(2026)
  const pick = <T>(a: T[]) => a[Math.floor(r() * a.length)]
  // Prénom, nom, ville, commune, mode d’inscription, inscrit il y a N jours, profil d’achat (catégories préférées), nb de commandes
  const CLIENTS: [string, string, string, string, 'email' | 'phone', number, string[], number][] = [
    ['Aya', 'Koné', 'Abidjan', 'Cocody', 'email', 44, ['bijoux', 'cheveux', 'vetements'], 4],
    ['Serge', 'Kouadio', 'Abidjan', 'Yopougon', 'phone', 41, ['accessoires', 'chaussures'], 3],
    ['Fatou', 'Traoré', 'Abidjan', 'Marcory', 'phone', 38, ['vetements', 'cheveux'], 3],
    ['Jean-Marc', 'N’Guessan', 'Agboville', '', 'phone', 35, ['chaussures', 'vetements'], 2],
    ['Mariam', 'Ouattara', 'Bouaké', '', 'email', 33, ['cheveux', 'bijoux'], 2],
    ['Ange', 'Kouamé', 'Abidjan', 'Plateau', 'email', 30, ['accessoires', 'vetements'], 2],
    ['Christelle', 'Bamba', 'Abidjan', 'Abobo', 'phone', 26, ['vetements', 'bijoux'], 2],
    ['Ibrahim', 'Diabaté', 'Korhogo', '', 'phone', 22, ['accessoires'], 1],
    ['Grâce', 'Aka', 'Yamoussoukro', '', 'email', 19, ['bijoux', 'vetements'], 2],
    ['Désiré', 'Brou', 'San-Pédro', '', 'phone', 15, ['chaussures'], 1],
    ['Nadia', 'Coulibaly', 'Abidjan', 'Treichville', 'email', 12, ['cheveux', 'vetements'], 2],
    ['Paul', 'Ehui', 'Agboville', '', 'phone', 9, ['accessoires', 'chaussures'], 1],
    ['Salimata', 'Sanogo', 'Daloa', '', 'phone', 6, ['cheveux'], 1],
    ['Rachelle', 'Yapi', 'Abidjan', 'Cocody', 'email', 3, ['bijoux'], 0],
    ['Kevin', 'Assi', 'Abidjan', 'Port-Bouët', 'phone', 1, ['accessoires'], 0],
    ['Hervé', 'Zadi', 'Abidjan', 'Adjamé', 'phone', 17, ['accessoires'], 0],
  ]
  const slug = (x: string) => x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f’']/g, '').replace(/[^a-z]+/g, '.')
  type Ev = { t: number; run: () => void }
  const events: Ev[] = []
  const users: { id: string; first: string; last: string; phone: string; email: string | null; city: string; commune: string; cats: string[] }[] = []

  CLIENTS.forEach(([first, last, city, commune, method, days, cats, n], k) => {
    const phone = `+22507${String(10 + k).padStart(2, '0')}${String(Math.floor(r() * 900000) + 100000)}`
    const email = method === 'phone' ? `${phone.slice(1)}@tel.yvesstore.ci` : `${slug(first)}.${slug(last)}@exemple.ci`
    const id = addUser(email, first, last, { phone, city, commune: commune || undefined, method, daysAgo: days, password: 'Client2026' })
    const u = { id, first, last, phone, email: method === 'phone' ? null : email, city, commune, cats }
    users.push(u)
    if (first === 'Hervé') db.users.find((x) => x.id === id)!.blocked = true
    // commandes réparties entre l’inscription et aujourd’hui
    for (let o = 0; o < n; o++) {
      const ago = Math.max(0.05, days * D * (1 - (o + 0.4 + r() * 0.5) / Math.max(n, 1)))
      events.push({ t: ago, run: () => order(u.id, u, ago) })
    }
  })
  // Quelques commandes supplémentaires de clients inscrits (toutes les commandes exigent un compte)
  ;([['Christelle', 8 * D + 3 * H], ['Grâce', 4 * D + 5 * H], ['Paul', 0.45 * D]] as [string, number][])
    .forEach(([name, ago]) => events.push({ t: ago, run: () => { const u = users.find((x) => x.first === name)!; order(u.id, u, ago) } }))
  // Réceptions fournisseur et ventes en boutique
  events.push({ t: 20 * D, run: () => [['p07', 6], ['p01', 12], ['p04', 8]].forEach(([id, q]) => move(id as string, +q, 'entree', 'Réception fournisseur — arrivage Adjamé', 20 * D)) })
  events.push({ t: 7 * D, run: () => [['p19', 30], ['p20', 40], ['p16', 10]].forEach(([id, q]) => move(id as string, +q, 'entree', 'Réception fournisseur — cosmétiques & bijoux', 7 * D)) })
  events.push({ t: 11 * D, run: () => move('p05', -3, 'sortie', 'Vente en boutique Agboville', 11 * D) })
  events.push({ t: 2 * D, run: () => move('p24', -2, 'sortie', 'Vente en boutique', 2 * D) })
  events.push({ t: 5 * D, run: () => move('p18', -1, 'sortie', 'Article abîmé (casse)', 5 * D) })
  events.push({ t: 3 * D, run: () => move('p13', -3, 'sortie', 'Vente en boutique Agboville', 3 * D) })
  events.push({ t: 4 * D, run: () => move('p32', -6, 'sortie', 'Vente en boutique — commande salon de coiffure', 4 * D) })
  events.push({ t: 1.5 * D, run: () => move('p10', -6, 'sortie', 'Vente en boutique', 1.5 * D) })
  // Commandes du jour (nouvelles, à traiter)
  const today: [string, number][] = [['Rachelle', 2.5 * H], ['Kevin', 1.2 * H], ['Nadia', 4 * H], ['Aya', 0.3 * H]]
  for (const [name, ago] of today) events.push({ t: ago, run: () => { const u = users.find((x) => x.first === name)!; order(u.id, u, ago) } })

  history(db, addUser, events)
  events.sort((a, b) => b.t - a.t).forEach((e) => e.run())

  function move(id: string, delta: number, kind: string, note: string, ago: number, orderId: string | null = null) {
    const c = db.catalog_products.find((x) => x.id === id)!
    c.stock = Math.max(0, c.stock + delta)
    db.stock_movements.push({ id: db.seq++, product_id: id, kind, qty: delta, stock_after: c.stock, note, order_id: orderId, created_by: null, created_at: iso(ago) })
  }
  function order(uid: string | null, u: (typeof users)[number], ago: number) {
    const hour = 8 + Math.floor(r() * 13)
    const d = new Date(Date.now() - ago); if (ago > 6 * H) d.setHours(hour, Math.floor(r() * 60))
    const at = Date.now() - d.getTime()
    const pool = SEED.filter((p) => u.cats.includes(p.category))
    const nb = 1 + Math.floor(r() * (r() < 0.3 ? 3 : 2))
    const lines: Row[] = []
    for (let i = 0; i < nb; i++) {
      const s = pick(pool); const c = db.catalog_products.find((x) => x.id === s.id)!
      if (c.stock < 1 || lines.some((l) => l.id === s.id)) continue
      lines.push({ id: s.id, name: s.name, qty: r() < 0.15 && c.stock > 3 ? 2 : 1, price: c.price, image: s.image, size: s.sizes ? pick(s.sizes) : undefined, color: s.colors ? pick(s.colors).name : undefined })
    }
    if (!lines.length) return
    const subtotal = lines.reduce((a, l) => a + l.qty * l.price, 0)
    const shipping = r() < 0.12 ? 'retrait' : u.city === 'Abidjan' ? 'abidjan' : 'interieur'
    const shipping_cost = shipping === 'retrait' || subtotal >= 50000 ? 0 : shipping === 'abidjan' ? 2000 : 3500
    const first = uid ? !db.orders.some((o) => o.user_id === uid) : false
    const discount = first && subtotal >= 30000 && r() < 0.6 ? 5000 : 0
    const days = at / D
    const cancelled = r() < 0.13 && days > 1
    const status = cancelled ? 'annulee' : days > 5 ? 'livree' : days > 2.5 ? (r() < 0.6 ? 'livree' : 'expediee') : days > 1 ? (r() < 0.5 ? 'expediee' : 'preparation') : days > 0.3 ? 'preparation' : 'confirmee'
    const id = 'YS-' + Math.floor(d.getTime() / 1000).toString(36).toUpperCase().slice(-5) + Math.floor(r() * 1296).toString(36).toUpperCase().padStart(2, '0')
    const o: Row = {
      id, user_id: uid, status,
      customer: { firstName: u.first, lastName: u.last, phone: fmtPhone(u.phone), email: u.email ?? '' },
      address: { city: u.city, commune: u.commune, details: shipping === 'retrait' ? '' : pick(['Près de la pharmacie', 'Face au marché', 'Derrière l’église', 'Carrefour principal', 'Immeuble bleu, 2e étage', 'Non loin de la station']) },
      shipping, payment: pick(PAY), lines, subtotal, discount, shipping_cost, total: subtotal - discount + shipping_cost,
      created_at: d.toISOString(), cancelled_at: null, cancel_reason: null,
    }
    db.orders.push(o)
    for (const l of lines) move(l.id, -l.qty, 'vente', `Commande ${id}`, at, id)
    if (cancelled) {
      const ca = at - 3 * H
      o.status = 'annulee'; o.cancelled_at = iso(ca); o.cancel_reason = pick(['J’ai changé d’avis', 'Erreur dans ma commande (taille, couleur, quantité)', 'Délai de livraison trop long', 'Trouvé moins cher ailleurs'])
      for (const l of lines) move(l.id, l.qty, 'retour', `Annulation ${id}`, ca, id)
    }
  }

  // Messages WhatsApp en attente
  const recent = [...db.orders].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  const req = (kind: string, o: Row | null, u: (typeof users)[number], ago: number, motif?: string, status = 'en_attente') =>
    db.whatsapp_requests.push({ id: uuid(), kind, user_id: u.id || null, phone: u.phone, customer_name: `${u.first} ${u.last}`, order_id: o?.id ?? null,
      payload: o ? { name: `${u.first} ${u.last}`, status: o.status, total: o.total, lines: o.lines.map((l: Row) => ({ name: l.name, qty: l.qty, price: l.price, size: l.size, color: l.color })), shipping: o.shipping, address: o.address, payment: o.payment, created_at: o.created_at, source: o.user_id ? 'compte' : 'invite', motif } : {},
      status, code_expires_at: null, created_at: iso(ago), sent_at: status === 'envoye' ? iso(ago - H) : null })
  const byUser = (o: Row) => users.find((u) => u.id === o.user_id) ?? null
  const track = recent.find((o) => o.status === 'expediee' && byUser(o)); if (track) req('order_tracking', track, byUser(track)!, 2 * H, 'suivi')
  const conf = recent.find((o) => o.status === 'confirmee' && byUser(o)); if (conf) req('order_cancel', conf, byUser(conf)!, 0.5 * H, 'aide')
  const old = recent.find((o) => o.status === 'livree' && byUser(o)); if (old) req('order_tracking', old, byUser(old)!, 3 * D, 'suivi', 'traite')
  const forgot = users.find((u) => u.first === 'Mariam'); if (forgot) req('password_reset', null, forgot, 50 * 60_000)
}

// ───────────── Historique (≈ 18 mois) pour les graphiques semaines / mois / années ─────────────
// Clients plus anciens, commandes livrées ou annulées, arrivages fournisseurs mensuels qui
// compensent les ventes (le stock actuel reste celui du catalogue).
function history(db: DB, addUser: AddUser, events: { t: number; run: () => void }[]) {
  const r = rng(1990)
  const pick = <T>(a: T[]) => a[Math.floor(r() * a.length)]
  const OLD: [string, string, string, string, number, string[]][] = [
    ['Adjoua', 'Kassi', 'Abidjan', 'Cocody', 545, ['bijoux', 'vetements']],
    ['Yao', 'Konan', 'Abidjan', 'Yopougon', 530, ['chaussures', 'accessoires']],
    ['Mireille', 'Gnagne', 'Agboville', '', 500, ['cheveux', 'bijoux']],
    ['Lassina', 'Fofana', 'Abidjan', 'Abobo', 470, ['accessoires']],
    ['Prisca', 'Djè', 'Abidjan', 'Marcory', 430, ['vetements', 'cheveux']],
    ['Arnaud', 'Gbagbo', 'Bouaké', '', 380, ['chaussures', 'vetements']],
    ['Edwige', 'Amani', 'Abidjan', 'Riviera', 340, ['bijoux', 'cheveux']],
    ['Moussa', 'Cissé', 'Abidjan', 'Treichville', 300, ['accessoires', 'chaussures']],
    ['Laetitia', 'Koffi', 'Yamoussoukro', '', 250, ['vetements', 'bijoux']],
    ['Habib', 'Touré', 'Abidjan', 'Plateau', 200, ['accessoires', 'vetements']],
    ['Sandrine', 'Aké', 'Agboville', '', 150, ['cheveux', 'vetements']],
    ['Wilfried', 'Dago', 'Abidjan', 'Koumassi', 100, ['chaussures']],
  ]
  const clients = OLD.map(([first, last, city, commune, days, cats], k) => {
    const phone = `+22505${String(20 + k).padStart(2, '0')}${String(Math.floor(r() * 900000) + 100000)}`
    const email = `${first.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}.${last.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}@exemple.ci`
    const id = addUser(email, first, last, { phone, city, commune: commune || undefined, method: 'email', daysAgo: days, password: 'Client2026' })
    return { id, first, last, phone, email, city, commune, cats, days }
  })
  const now = new Date()
  type HOrder = { at: number; o: Row }
  const list: HOrder[] = []
  const sold = new Map<string, Map<string, number>>() // mois → produit → quantité nette vendue
  // 17 mois complets avant le mois précédent
  for (let m = 18; m >= 2; m--) {
    const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - m, 1)
    const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - m + 1, 1)
    const month = new Date(start).getUTCMonth()
    const growth = 0.45 + (18 - m) / 17 * 0.75 // la boutique grandit
    const season = month === 11 ? 1.7 : month === 8 ? 1.25 : month === 7 || month === 0 ? 0.8 : 1 // fêtes, rentrée, vacances
    const n = Math.round(14 * growth * season + r() * 4)
    const key = new Date(start).toISOString().slice(0, 7)
    for (let i = 0; i < n; i++) {
      const at = start + r() * (end - start - 3600_000)
      const ago = now.getTime() - at
      const eligible = clients.filter((c) => c.days * D > ago)
      if (!eligible.length) continue
      const u = pick(eligible)
      const pool = SEED.filter((p) => u.cats.includes(p.category))
      const lines: Row[] = []
      const nb = 1 + Math.floor(r() * (r() < 0.3 ? 3 : 2))
      for (let k = 0; k < nb; k++) {
        const s = pick(pool); if (lines.some((l) => l.id === s.id)) continue
        lines.push({ id: s.id, name: s.name, qty: r() < 0.15 ? 2 : 1, price: s.price, image: s.image, size: s.sizes ? pick(s.sizes) : undefined, color: s.colors ? pick(s.colors).name : undefined })
      }
      const subtotal = lines.reduce((a, l) => a + l.qty * l.price, 0)
      const shipping = r() < 0.12 ? 'retrait' : u.city === 'Abidjan' ? 'abidjan' : 'interieur'
      const shipping_cost = shipping === 'retrait' || subtotal >= 50000 ? 0 : shipping === 'abidjan' ? 2000 : 3500
      const cancelled = r() < 0.1
      const d = new Date(at)
      const id = 'YS-' + Math.floor(at / 1000).toString(36).toUpperCase().slice(-5) + Math.floor(r() * 1296).toString(36).toUpperCase().padStart(2, '0')
      const o: Row = {
        id, user_id: u.id, status: cancelled ? 'annulee' : 'livree',
        customer: { firstName: u.first, lastName: u.last, phone: fmtPhone(u.phone), email: u.email },
        address: { city: u.city, commune: u.commune, details: shipping === 'retrait' ? '' : pick(['Près de la pharmacie', 'Face au marché', 'Carrefour principal', 'Immeuble bleu, 2e étage']) },
        shipping, payment: pick(PAY), lines, subtotal, discount: 0, shipping_cost, total: subtotal + shipping_cost,
        created_at: d.toISOString(), cancelled_at: cancelled ? new Date(at + 3 * H).toISOString() : null,
        cancel_reason: cancelled ? pick(['J’ai changé d’avis', 'Délai de livraison trop long', 'Erreur dans ma commande (taille, couleur, quantité)']) : null,
      }
      list.push({ at, o })
      if (!cancelled) { const mm = sold.get(key) ?? new Map(); lines.forEach((l) => mm.set(l.id, (mm.get(l.id) ?? 0) + l.qty)); sold.set(key, mm) }
    }
    // Arrivage du mois (au 1er), égal à ce qui sera vendu dans le mois
    events.push({ t: now.getTime() - start - 6 * H, run: () => {
      const mm = sold.get(key); if (!mm) return
      for (const [pid, q] of mm) {
        const c = db.catalog_products.find((x) => x.id === pid); if (!c) continue
        c.stock += q
        db.stock_movements.push({ id: db.seq++, product_id: pid, kind: 'entree', qty: q, stock_after: c.stock, note: 'Réception fournisseur — arrivage du mois', order_id: null, created_by: null, created_at: new Date(start + 6 * H).toISOString() })
      }
    } })
  }
  for (const { at, o } of list) events.push({ t: now.getTime() - at, run: () => {
    db.orders.push(o)
    for (const l of o.lines) {
      const c = db.catalog_products.find((x) => x.id === l.id)!; c.stock -= l.qty
      db.stock_movements.push({ id: db.seq++, product_id: l.id, kind: 'vente', qty: -l.qty, stock_after: c.stock, note: `Commande ${o.id}`, order_id: o.id, created_by: null, created_at: o.created_at })
    }
    if (o.status === 'annulee') for (const l of o.lines) {
      const c = db.catalog_products.find((x) => x.id === l.id)!; c.stock += l.qty
      db.stock_movements.push({ id: db.seq++, product_id: l.id, kind: 'retour', qty: l.qty, stock_after: c.stock, note: `Annulation ${o.id}`, order_id: o.id, created_by: null, created_at: o.cancelled_at })
    }
  } })
}

// ───────────── Persistance ─────────────
let mem: DB | null = null
function load(): DB {
  if (mem) return mem
  try { const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null'); if (raw?.v === DB_VERSION) mem = raw } catch { /* */ }
  if (!mem) { mem = seed(); save() }
  return mem
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(mem)) } catch { /* quota */ } }
export function resetDemo() { mem = seed(); save(); try { localStorage.removeItem(SKEY); localStorage.removeItem('yves-catalog-v2') } catch { /* */ } }

// ───────────── Session ─────────────
let session: any = null
try { session = JSON.parse(localStorage.getItem(SKEY) ?? 'null') } catch { session = null }
const listeners = new Set<(e: string, s: any) => void>()
function makeSession(u: DemoUser) {
  const p = load().profiles.find((x) => x.id === u.id)
  return { access_token: 'demo', token_type: 'bearer', user: { id: u.id, email: u.email, identities: [{}], user_metadata: { first_name: p?.first_name, last_name: p?.last_name }, app_metadata: {}, aud: 'authenticated', created_at: u.created_at } }
}
function setSession(s: any, ev: string) {
  session = s
  try { s ? localStorage.setItem(SKEY, JSON.stringify(s)) : localStorage.removeItem(SKEY) } catch { /* */ }
  setTimeout(() => listeners.forEach((cb) => cb(ev, s)), 0)
}
const uid = () => session?.user?.id as string | undefined
const isAdmin = () => !!uid() && load().admins.includes(uid()!)
type Res = { data: any; error: { message: string } | null; count: number | null }
const ok = (data: unknown): Promise<Res> => Promise.resolve({ data, error: null, count: null })
const fail = (message: string): Promise<Res> => Promise.resolve({ data: null, error: { message }, count: null })
const delay = <T>(p: Promise<T>) => new Promise<T>((r) => setTimeout(() => r(p), 120))

// ───────────── Requêtes table ─────────────
class Query {
  private filters: ((r: Row) => boolean)[] = []
  private ord: { col: string; asc: boolean } | null = null
  private lim = 0
  private card: '' | 'maybe' | 'one' = ''
  private head = false
  private wantCount = false
  private op: 'select' | 'insert' | 'update' | 'delete' = 'select'
  private payload: Row | null = null
  constructor(private table: keyof DB) {}
  select(_cols?: string, opts?: { count?: string; head?: boolean }) { if (this.op === 'select') { this.head = !!opts?.head; this.wantCount = !!opts?.count } return this }
  eq(col: string, v: unknown) { this.filters.push((r) => r[col] === v); return this }
  neq(col: string, v: unknown) { this.filters.push((r) => r[col] !== v); return this }
  in(col: string, v: unknown[]) { this.filters.push((r) => v.includes(r[col])); return this }
  gte(col: string, v: any) { this.filters.push((r) => r[col] >= v); return this }
  order(col: string, o?: { ascending?: boolean }) { this.ord = { col, asc: o?.ascending !== false }; return this }
  limit(n: number) { this.lim = n; return this }
  maybeSingle() { this.card = 'maybe'; return this }
  single() { this.card = 'one'; return this }
  insert(p: Row) { this.op = 'insert'; this.payload = p; return this }
  update(p: Row) { this.op = 'update'; this.payload = p; return this }
  delete() { this.op = 'delete'; return this }
  then<A, B>(res: (v: any) => A, rej?: (e: any) => B) { return delay(this.exec()).then(res, rej) }

  private visible(db: DB): Row[] {
    const t = this.table
    if (t === 'catalog_products') return db.catalog_products
    if (t === 'catalog_categories') return db.catalog_categories
    if (t === 'profiles') return db.profiles.filter((p) => p.id === uid() || isAdmin())
    if (t === 'orders') return db.orders.filter((o) => isAdmin() || (uid() && o.user_id === uid()))
    if (t === 'stock_movements' || t === 'whatsapp_requests') return isAdmin() ? (db[t] as Row[]) : []
    return []
  }
  private exec(): Promise<Res> {
    const db = load()
    if (this.op === 'insert') {
      if (this.table !== 'orders') return fail('permission denied')
      const o = { status: 'confirmee', cancelled_at: null, cancel_reason: null, created_at: iso(), ...this.payload } as Row
      // Commande réservée aux clients inscrits et connectés
      if (!uid() || o.user_id !== uid()) return fail('new row violates row-level security policy')
      // Comme le serveur : prix, remise, livraison et total recalculés, stock vérifié
      if (!['abidjan', 'interieur', 'retrait'].includes(o.shipping)) return fail('INVALID_SHIPPING')
      const lines: Row[] = []; let sub = 0; const need = new Map<string, number>()
      for (const l of (o.lines ?? []) as Row[]) {
        const q = Number(l.qty); if (!Number.isInteger(q) || q < 1 || q > 99) return fail('INVALID_QTY')
        const c = db.catalog_products.find((x) => x.id === l.id); if (!c || !c.active) return fail(`PRODUCT_UNAVAILABLE|${c?.name ?? l.name ?? l.id}`)
        lines.push({ ...l, name: c.name, price: c.price, qty: q }); sub += c.price * q; need.set(c.id, (need.get(c.id) ?? 0) + q)
      }
      if (!lines.length) return fail('EMPTY_CART')
      for (const [id, q] of need) { const c = db.catalog_products.find((x) => x.id === id)!; if (c.stock < q) return fail(`OUT_OF_STOCK|${c.name}|${c.stock}`) }
      const code = String(o.promo_code ?? '').trim().toUpperCase()
      const disc = code === 'YVES10' ? Math.round(sub * 0.1) : code === 'BIENVENUE' && sub >= 30000 ? 5000 : 0
      const ship = o.shipping === 'retrait' || sub - disc >= 50000 ? 0 : o.shipping === 'abidjan' ? 2000 : 3500
      Object.assign(o, { lines, subtotal: sub, discount: disc, shipping_cost: ship, total: Math.max(0, sub - disc + ship), promo_code: disc ? code : null })
      db.orders.push(o)
      for (const l of o.lines ?? []) {
        const c = db.catalog_products.find((x) => x.id === l.id); if (!c) continue
        c.stock = Math.max(0, c.stock - l.qty)
        db.stock_movements.push({ id: db.seq++, product_id: c.id, kind: 'vente', qty: -l.qty, stock_after: c.stock, note: `Commande ${o.id}`, order_id: o.id, created_by: null, created_at: iso() })
      }
      save(); return ok(this.card ? o : null)
    }
    let rows = this.visible(db).filter((r) => this.filters.every((f) => f(r)))
    if (this.op === 'update') {
      if (this.table !== 'profiles') return fail('permission denied')
      rows.filter((r) => r.id === uid()).forEach((r) => Object.assign(r, this.payload)); save(); return ok(null)
    }
    if (this.op === 'delete') return fail('permission denied')
    if (this.ord) { const { col, asc } = this.ord; rows = [...rows].sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (asc ? 1 : -1)) }
    if (this.lim) rows = rows.slice(0, this.lim)
    const out = JSON.parse(JSON.stringify(rows))
    if (this.head) return Promise.resolve({ data: null, error: null, count: out.length })
    if (this.card) return ok(out[0] ?? null)
    return Promise.resolve({ data: out, error: null, count: this.wantCount ? out.length : null })
  }
}

// ───────────── Fonctions (RPC) ─────────────
function moveStock(db: DB, id: string, delta: number, kind: string, note: string | null, orderId: string | null) {
  const c = db.catalog_products.find((x) => x.id === id); if (!c) return
  c.stock = Math.max(0, c.stock + delta); c.updated_at = iso()
  db.stock_movements.push({ id: db.seq++, product_id: id, kind, qty: delta, stock_after: c.stock, note, order_id: orderId, created_by: uid() ?? null, created_at: iso() })
}
function cancelOrder(db: DB, o: Row, reason: string | null) {
  o.status = 'annulee'; o.cancelled_at = iso(); o.cancel_reason = reason
  for (const l of o.lines ?? []) if (l.id) moveStock(db, l.id, l.qty, 'retour', `Annulation ${o.id}`, o.id)
}
const digits = (s?: string | null) => (s ?? '').replace(/\D/g, '').slice(-10)

async function rpc(name: string, a: Row = {}): Promise<Res> {
  const db = load()
  const admin = isAdmin()
  const need = () => (admin ? null : fail('FORBIDDEN'))
  const out = (data: unknown) => { save(); return delay(ok(JSON.parse(JSON.stringify(data ?? null)))) }
  switch (name) {
    case 'is_admin': return delay(ok(admin))
    case 'phone_exists': return ok(db.profiles.some((p) => p.phone === a.p))
    case 'admin_list_clients': {
      if (!admin) return need()!
      return out(db.users.map((u) => {
        const p = db.profiles.find((x) => x.id === u.id) ?? {}
        const os = db.orders.filter((o) => o.user_id === u.id)
        const valid = os.filter((o) => o.status !== 'annulee')
        return { id: u.id, first_name: p.first_name ?? null, last_name: p.last_name ?? null, email: u.email.endsWith('@tel.yvesstore.ci') ? null : u.email, phone: p.phone ?? null, contact_phone: p.contact_phone ?? null, signup_method: p.signup_method ?? null, city: p.city ?? null, commune: p.commune ?? null, created_at: u.created_at, last_sign_in_at: u.last_sign_in_at, blocked: u.blocked, is_admin: db.admins.includes(u.id), orders_count: os.length, total_spent: valid.reduce((s, o) => s + o.total, 0), last_order_at: os.map((o) => o.created_at).sort().pop() ?? null }
      }).sort((x, y) => (x.created_at < y.created_at ? 1 : -1)))
    }
    case 'admin_update_order': case 'admin_set_order_status': {
      if (!admin) return need()!
      const o = db.orders.find((x) => x.id === a.p_order); if (!o) return fail('ORDER_NOT_FOUND')
      if (o.status === 'annulee') return fail('ALREADY_CANCELLED')
      if (a.p_status === 'annulee') cancelOrder(db, o, a.p_reason ?? null); else o.status = a.p_status
      return out(o)
    }
    case 'admin_update_product': {
      if (!admin) return need()!
      const c = db.catalog_products.find((x) => x.id === a.p_id); if (!c) return fail('NOT_FOUND')
      if (a.p_price != null) c.price = a.p_price
      c.compare_at = a.p_compare_at ?? null
      if (a.p_active != null) c.active = a.p_active
      if (a.p_low != null) c.low_stock_threshold = a.p_low
      c.updated_at = iso(); return out(c)
    }
    case 'admin_stats_series': {
      if (!admin) return ok([])
      const g = ['day', 'month', 'year'].includes(a.p_group) ? a.p_group : 'day'
      const key = (iso: string) => (g === 'day' ? iso.slice(0, 10) : g === 'month' ? iso.slice(0, 7) + '-01' : iso.slice(0, 4) + '-01-01')
      const inR = (iso: string) => iso.slice(0, 10) >= a.p_from && iso.slice(0, 10) <= a.p_to
      const m = new Map<string, Row>()
      const get = (b: string) => { let x = m.get(b); if (!x) { x = { bucket: b, revenue: 0, n_orders: 0, n_cancelled: 0, qty_in: 0, qty_out: 0 }; m.set(b, x) } return x }
      for (const o of db.orders) if (inR(o.created_at)) { const x = get(key(o.created_at)); if (o.status === 'annulee') x.n_cancelled++; else { x.n_orders++; x.revenue += o.total } }
      for (const mv of db.stock_movements) if (inR(mv.created_at)) { const x = get(key(mv.created_at)); if (mv.qty > 0) x.qty_in += mv.qty; else x.qty_out -= mv.qty }
      return delay(ok([...m.values()].sort((x, y) => (x.bucket < y.bucket ? -1 : 1))))
    }
    case 'admin_stats_hours': {
      if (!admin) return ok([])
      const day = String(a.p_day)
      const m = new Map<number, Row>()
      const get = (h: number) => { let x = m.get(h); if (!x) { x = { hour: h, revenue: 0, n_orders: 0, n_cancelled: 0, qty_in: 0, qty_out: 0 }; m.set(h, x) } return x }
      for (const o of db.orders) if (o.created_at.slice(0, 10) === day) { const x = get(Number(o.created_at.slice(11, 13))); if (o.status === 'annulee') x.n_cancelled++; else { x.n_orders++; x.revenue += o.total } }
      for (const mv of db.stock_movements) if (mv.created_at.slice(0, 10) === day) { const x = get(Number(mv.created_at.slice(11, 13))); if (mv.qty > 0) x.qty_in += mv.qty; else x.qty_out -= mv.qty }
      return delay(ok([...m.values()].sort((x, y) => x.hour - y.hour)))
    }
    case 'admin_stats_first_date': {
      if (!admin) return ok(null)
      const all = [...db.orders.map((o) => o.created_at), ...db.stock_movements.map((m) => m.created_at)].sort()
      return ok(all[0]?.slice(0, 10) ?? null)
    }
    case 'admin_create_category': {
      if (!admin) return need()!
      const id = String(a.p_id ?? ''); const nm = String(a.p_name ?? '').trim()
      if (!/^[a-z0-9][a-z0-9-]{1,39}$/.test(id) || nm.length < 2 || nm.length > 60) return fail('INVALID_CATEGORY')
      if (db.catalog_categories.some((c) => c.id === id || String(c.name).toLowerCase() === nm.toLowerCase())) return fail('CATEGORY_EXISTS')
      const c = { id, name: nm, tagline: String(a.p_tagline ?? '').trim(), custom: true, created_at: iso() }
      db.catalog_categories.push(c); return out(c)
    }
    case 'admin_create_product': {
      if (!admin) return need()!
      const nm = String(a.p_name ?? '').trim(); const imgs: string[] = a.p_images ?? []
      if (nm.length < 2 || nm.length > 90) return fail('INVALID_NAME')
      if (!db.catalog_categories.some((c) => c.id === a.p_category)) return fail('INVALID_CATEGORY')
      if (!(a.p_price >= 100 && a.p_price <= 10000000)) return fail('INVALID_PRICE')
      if (a.p_compare_at != null && a.p_compare_at <= a.p_price) return fail('INVALID_COMPARE_AT')
      if (!(a.p_stock >= 0 && a.p_stock <= 100000)) return fail('INVALID_STOCK')
      if (imgs.length < 1 || imgs.length > 6) return fail('INVALID_IMAGES')
      const n = db.catalog_products.filter((x) => x.custom).length + 1
      const id = 'n' + String(n).padStart(3, '0')
      const slug = (String(a.p_slug ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 70).replace(/^-+|-+$/g, '') || 'produit') + '-' + id
      const c: Row = { id, name: nm, category: a.p_category, price: a.p_price, compare_at: a.p_compare_at ?? null, active: true, stock: 0, low_stock_threshold: a.p_low ?? 5, updated_at: iso(),
        custom: true, slug, description: String(a.p_description ?? '').trim(), images: imgs, sizes: a.p_sizes?.length ? a.p_sizes : null, colors: a.p_colors?.length ? a.p_colors : null, gender: a.p_gender ?? 'Unisexe', created_at: iso() }
      db.catalog_products.push(c)
      if (a.p_stock > 0) moveStock(db, id, a.p_stock, 'entree', 'Nouveau produit ajouté à la boutique', null)
      return out(c)
    }
    case 'admin_stock_move': {
      if (!admin) return need()!
      const c = db.catalog_products.find((x) => x.id === a.p_id); if (!c) return fail('NOT_FOUND')
      const delta = a.p_kind === 'entree' ? a.p_qty : a.p_kind === 'sortie' ? -a.p_qty : a.p_qty - c.stock
      if (a.p_kind === 'sortie' && a.p_qty > c.stock) return fail('INSUFFICIENT_STOCK')
      moveStock(db, c.id, delta, a.p_kind, a.p_note ?? null, null); return out(c)
    }
    case 'admin_set_client_blocked': {
      if (!admin) return need()!
      const u = db.users.find((x) => x.id === a.p_user); if (!u || u.id === uid() || db.admins.includes(u.id)) return fail('NOT_ALLOWED')
      u.blocked = !!a.p_blocked; return out(null)
    }
    case 'admin_set_admin': {
      if (!admin) return need()!
      if (a.p_user === uid()) return fail('NOT_ALLOWED')
      db.admins = db.admins.filter((x) => x !== a.p_user); if (a.p_admin) db.admins.push(a.p_user); return out(null)
    }
    case 'admin_delete_client': {
      if (!admin) return need()!
      if (a.p_user === uid() || db.admins.includes(a.p_user)) return fail('NOT_ALLOWED')
      db.users = db.users.filter((x) => x.id !== a.p_user); db.profiles = db.profiles.filter((x) => x.id !== a.p_user)
      db.orders.forEach((o) => { if (o.user_id === a.p_user) o.user_id = null }); return out(null)
    }
    case 'admin_set_request_status': {
      if (!admin) return need()!
      const r = db.whatsapp_requests.find((x) => x.id === a.p_request); if (r) { r.status = a.p_status; if (a.p_status === 'envoye') r.sent_at = iso() }
      return out(null)
    }
    case 'admin_prepare_reset': {
      if (!admin) return need()!
      const r = db.whatsapp_requests.find((x) => x.id === a.p_request); if (!r || r.status !== 'en_attente') return fail('ALREADY')
      const code = String(Math.floor(100000 + Math.random() * 900000)); const exp = iso(-30 * 60_000)
      Object.assign(r, { status: 'envoye', sent_at: iso(), code_expires_at: exp, code }); return out({ code, expires_at: exp })
    }
    case 'cancel_order': {
      const o = db.orders.find((x) => x.id === a.p_order_id && x.user_id === uid()); if (!o) return fail('ORDER_NOT_FOUND')
      if (o.status === 'annulee') return fail('ALREADY_CANCELLED')
      if (['expediee', 'livree'].includes(o.status)) return fail('ALREADY_SHIPPED')
      if (Date.now() - new Date(o.created_at).getTime() > D) return fail('CANCEL_WINDOW_EXPIRED')
      cancelOrder(db, o, a.p_reason ?? null); return out({ id: o.id, status: o.status, cancelled_at: o.cancelled_at, cancel_reason: o.cancel_reason })
    }
    case 'cancel_guest_order': {
      const o = db.orders.find((x) => x.id === a.p_order_id && digits(x.customer?.phone) === digits(a.p_phone))
      if (!o) return out({ ok: false, error: 'ORDER_NOT_FOUND' })
      if (o.status === 'annulee') return out({ ok: false, error: 'ALREADY_CANCELLED' })
      if (['expediee', 'livree'].includes(o.status)) return out({ ok: false, error: 'ALREADY_SHIPPED' })
      if (Date.now() - new Date(o.created_at).getTime() > D) return out({ ok: false, error: 'CANCEL_WINDOW_EXPIRED' })
      cancelOrder(db, o, a.p_reason ?? null); return out({ ok: true, status: o.status, cancelled_at: o.cancelled_at, cancel_reason: o.cancel_reason })
    }
    case 'request_order_whatsapp': {
      const p = uid() ? db.profiles.find((x) => x.id === uid()) : null
      const phone = a.p_phone || p?.contact_phone || p?.phone
      if (!phone) return out({ ok: false, error: 'NO_PHONE' })
      db.whatsapp_requests.unshift({ id: uuid(), kind: a.p_kind, user_id: uid() ?? null, phone, customer_name: a.p_payload?.name ?? (p ? `${p.first_name} ${p.last_name}` : null), order_id: a.p_order_id, payload: { ...a.p_payload, source: uid() ? 'compte' : 'invite' }, status: 'en_attente', code_expires_at: null, created_at: iso(), sent_at: null })
      return out({ ok: true, phone })
    }
    case 'request_password_reset_whatsapp': {
      const id = String(a.p_identifier ?? '').trim().toLowerCase()
      const d = digits(id)
      const p = db.profiles.find((x) => (x.email && x.email === id) || (d.length === 10 && (digits(x.phone) === d || digits(x.contact_phone) === d)))
      if (p) {
        const u = db.users.find((x) => x.id === p.id)
        if (p.contact_phone || p.phone) db.whatsapp_requests.unshift({ id: uuid(), kind: 'password_reset', user_id: p.id, phone: p.contact_phone || p.phone, customer_name: `${p.first_name} ${p.last_name}`, order_id: null, payload: { email: u?.email }, status: 'en_attente', code_expires_at: null, created_at: iso(), sent_at: null })
        else return out({ ok: true, no_whatsapp: true })
      }
      return out({ ok: true })
    }
    default: return fail(`Fonction indisponible en démo : ${name}`)
  }
}

// ───────────── Auth ─────────────
const auth = {
  getSession: () => Promise.resolve({ data: { session }, error: null }),
  onAuthStateChange: (cb: (e: string, s: any) => void) => { listeners.add(cb); return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } } },
  signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
    await new Promise((r) => setTimeout(r, 250))
    const u = load().users.find((x) => x.email === email.toLowerCase())
    // Aperçu hors ligne : l’e-mail gérant est accepté avec le mot de passe saisi (rien n’est envoyé sur Internet)
    if (u && u.password === '' && password.length > 0) u.password = password
    if (!u || u.password !== password) return { data: { session: null, user: null }, error: { message: 'Invalid login credentials' } }
    if (u.blocked) return { data: { session: null, user: null }, error: { message: 'User is banned' } }
    u.last_sign_in_at = iso(); save()
    const s = makeSession(u); setSession(s, 'SIGNED_IN'); return { data: { session: s, user: s.user }, error: null }
  },
  signUp: async ({ email, password, options }: { email: string; password: string; options?: { data?: Row } }) => {
    await new Promise((r) => setTimeout(r, 250))
    const db = load(); const e = email.toLowerCase()
    if (db.users.some((x) => x.email === e)) return { data: { user: { identities: [] }, session: null }, error: null }
    const m = options?.data ?? {}
    const u: DemoUser = { id: uuid(), email: e, password, blocked: false, created_at: iso(), last_sign_in_at: iso() }
    db.users.push(u)
    db.profiles.push({ id: u.id, first_name: m.first_name ?? '', last_name: m.last_name ?? '', email: m.signup_method === 'phone' ? null : e, phone: m.phone ?? null, signup_method: m.signup_method ?? 'email', city: null, commune: null, address: null, birth_year: null, birth_date: null, contact_phone: m.phone ?? null, newsletter: !!m.newsletter, created_at: iso() })
    if (e === DEMO_GERANT.email) db.admins.push(u.id)
    save()
    const s = makeSession(u); setSession(s, 'SIGNED_IN'); return { data: { user: s.user, session: s }, error: null }
  },
  signOut: async () => { setSession(null, 'SIGNED_OUT'); return { error: null } },
  updateUser: async ({ password }: { password?: string }) => {
    const u = load().users.find((x) => x.id === uid()); if (!u) return { data: null, error: { message: 'not authenticated' } }
    if (password) { if (password === u.password) return { data: null, error: { message: 'same password' } }; u.password = password; save() }
    return { data: { user: session.user }, error: null }
  },
  resetPasswordForEmail: async () => ({ data: {}, error: null }),
}

const functions = {
  invoke: async (name: string, { body }: { body: Row }) => {
    if (name !== 'wa-reset-password') return { data: null, error: { message: 'unknown' } }
    const db = load(); const id = String(body.identifier ?? '').trim().toLowerCase(); const d = digits(id)
    const p = db.profiles.find((x) => (x.email && x.email === id) || (d.length === 10 && (digits(x.phone) === d || digits(x.contact_phone) === d)))
    const r = p && db.whatsapp_requests.find((x) => x.kind === 'password_reset' && x.user_id === p.id && x.code === body.code && x.status === 'envoye' && new Date(x.code_expires_at).getTime() > Date.now())
    if (!p || !r) return { data: { ok: false, error: 'Code incorrect ou expiré. Demandez un nouveau code.' }, error: null }
    const u = db.users.find((x) => x.id === p.id)!; u.password = body.password; r.status = 'traite'; r.code = null; save()
    return { data: { ok: true }, error: null }
  },
}

// Photos envoyées depuis le back-office : gardées en mémoire (data URL) dans l’aperçu
const files = new Map<string, string>()
const storage = {
  from: (_bucket: string) => ({
    upload: (path: string, blob: Blob) => new Promise<{ data: unknown; error: { message: string } | null }>((res) => {
      if (!isAdmin()) return res({ data: null, error: { message: 'new row violates row-level security policy' } })
      const fr = new FileReader(); fr.onload = () => { files.set(path, String(fr.result)); res({ data: { path }, error: null }) }; fr.onerror = () => res({ data: null, error: { message: 'Lecture impossible' } }); fr.readAsDataURL(blob)
    }),
    getPublicUrl: (path: string) => ({ data: { publicUrl: files.get(path) ?? '' } }),
  }),
}

export function createDemoClient() {
  return { from: (t: string) => new Query(t as keyof DB), rpc, auth, functions, storage }
}
