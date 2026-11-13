/**
 * Assistant IA du gérant — moteur d’analyse intégré.
 * Comprend des questions en français (avec ou sans accents) et répond à partir des vraies
 * données de la boutique : ventes, stock, clients, commandes, annulations, prévisions…
 * Sert aussi à préparer le « contexte chiffré » envoyé à l’IA générative (si elle est activée).
 */
import { fcfa } from '../../lib/format'
import { CATEGORY_FR, type AdminOrder, type CatalogRow, type Client, type Movement } from './shared'

export interface AssistantData { orders: AdminOrder[]; catalog: CatalogRow[]; moves: Movement[]; clients: Client[] }
export interface Action { label: string; to: string }
export interface Reply { text: string; actions?: Action[]; chips?: string[] }

// ───────────── Outils ─────────────
const DAY = 86400000
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’']/g, ' ').replace(/[^a-z0-9\- ]+/g, ' ').replace(/\s+/g, ' ').trim()
const has = (q: string, ...words: string[]) => words.some((w) => new RegExp(`(^|\\s)${w}`).test(q))
const t = (iso: string) => new Date(iso).getTime()
const dayStart = (ms: number) => { const d = new Date(ms); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) }
const pct = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : null)
const evol = (a: number, b: number, what = '') => { const p = pct(a, b); return p === null ? (a ? '(rien sur la période précédente)' : '') : `${p >= 0 ? '▲ +' : '▼ '}${p} %${what ? ' ' + what : ''}` }
const plural = (n: number, s: string, p = s + 's') => `${n} ${n > 1 ? p : s}`
const MONTHS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre']
const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const valid = (o: AdminOrder) => o.status !== 'annulee'
const who = (o: AdminOrder) => `${o.customer?.firstName ?? ''} ${o.customer?.lastName ?? ''}`.trim() || 'Client'
const ago = (iso: string) => { const h = (Date.now() - t(iso)) / 3600000; return h < 1 ? `il y a ${Math.max(1, Math.round(h * 60))} min` : h < 24 ? `il y a ${Math.round(h)} h` : `il y a ${plural(Math.round(h / 24), 'jour')}` }
const STATUS: Record<string, string> = { confirmee: 'Nouvelle', preparation: 'En préparation', expediee: 'Expédiée', livree: 'Livrée', annulee: 'Annulée' }
const SHIP: Record<string, string> = { abidjan: 'Livraison Abidjan', interieur: 'Livraison intérieur', retrait: 'Retrait en boutique' }

// ───────────── Périodes ─────────────
export interface Period { from: number; to: number; label: string; prev: { from: number; to: number; label: string } }
function period(q: string, fallback: 'jour' | 'semaine' | 'mois' | '30j' | 'annee' | 'tout' = 'mois'): Period {
  const now = Date.now(); const today = dayStart(now); const d = new Date(today)
  const y = d.getUTCFullYear(), m = d.getUTCMonth(), wd = (d.getUTCDay() + 6) % 7
  const mk = (from: number, to: number, label: string, pf: number, pt: number, pl: string): Period => ({ from, to, label, prev: { from: pf, to: pt, label: pl } })
  // Mois nommé (« en mars », « décembre 2025 »)
  const mi = MONTHS.findIndex((x) => has(q, x))
  if (mi >= 0) {
    const yr = Number(q.match(/20\d\d/)?.[0] ?? (mi > m ? y - 1 : y))
    const f = Date.UTC(yr, mi, 1), e = Date.UTC(yr, mi + 1, 1)
    return mk(f, e, `en ${MONTHS_FR[mi]} ${yr}`, Date.UTC(yr, mi - 1, 1), f, `${MONTHS_FR[(mi + 11) % 12]}`)
  }
  const yr = q.match(/(^|\s)(20\d\d)(\s|$)/)?.[2]
  if (yr) { const Y = Number(yr); return mk(Date.UTC(Y, 0, 1), Date.UTC(Y + 1, 0, 1), `en ${Y}`, Date.UTC(Y - 1, 0, 1), Date.UTC(Y, 0, 1), `${Y - 1}`) }
  if (has(q, 'avant hier', 'avant-hier')) return mk(today - 2 * DAY, today - DAY, 'avant-hier', today - 3 * DAY, today - 2 * DAY, 'la veille')
  if (has(q, 'hier')) return mk(today - DAY, today, 'hier', today - 2 * DAY, today - DAY, 'avant-hier')
  if (has(q, '7 jours', '7 derniers', 'sept jours')) return mk(today - 6 * DAY, now + 1, 'sur les 7 derniers jours', today - 13 * DAY, today - 6 * DAY, 'les 7 jours précédents')
  if (has(q, '30 jours', '30 derniers', 'trente')) return mk(today - 29 * DAY, now + 1, 'sur les 30 derniers jours', today - 59 * DAY, today - 29 * DAY, 'les 30 jours précédents')
  if (has(q, '3 mois', 'trimestre', '90 jours')) return mk(today - 89 * DAY, now + 1, 'sur les 3 derniers mois', today - 179 * DAY, today - 89 * DAY, 'les 3 mois précédents')
  if (has(q, 'aujourd', 'ce jour', 'du jour', 'ce matin', 'ce soir') || /(^|\s)(jour|auj)(\s|$)/.test(q)) return mk(today, now + 1, 'aujourd’hui', today - DAY, now - DAY + 1, 'hier à la même heure')
  if (has(q, 'semaine derniere', 'semaine passee', 'la semaine d avant')) { const f = today - (wd + 7) * DAY; return mk(f, f + 7 * DAY, 'la semaine dernière', f - 7 * DAY, f, 'la semaine d’avant') }
  if (has(q, '7 jours', '7 derniers', 'sept jours')) return mk(today - 6 * DAY, now + 1, 'sur les 7 derniers jours', today - 13 * DAY, today - 6 * DAY, 'les 7 jours précédents')
  if (has(q, 'semaine')) { const f = today - wd * DAY; return mk(f, now + 1, 'cette semaine', f - 7 * DAY, now - 7 * DAY + 1, 'la semaine dernière à la même date') }
  if (has(q, 'mois dernier', 'mois passe', 'mois precedent')) { const f = Date.UTC(y, m - 1, 1); return mk(f, Date.UTC(y, m, 1), `en ${MONTHS_FR[(m + 11) % 12]}`, Date.UTC(y, m - 2, 1), f, MONTHS_FR[(m + 10) % 12]) }
  if (has(q, '30 jours', '30 derniers', 'trente')) return mk(today - 29 * DAY, now + 1, 'sur les 30 derniers jours', today - 59 * DAY, today - 29 * DAY, 'les 30 jours précédents')
  if (has(q, '3 mois', 'trimestre', '90 jours')) return mk(today - 89 * DAY, now + 1, 'sur les 3 derniers mois', today - 179 * DAY, today - 89 * DAY, 'les 3 mois précédents')
  if (has(q, 'annee derniere', 'an dernier', 'annee passee', 'l an passe')) return mk(Date.UTC(y - 1, 0, 1), Date.UTC(y, 0, 1), `en ${y - 1}`, Date.UTC(y - 2, 0, 1), Date.UTC(y - 1, 0, 1), `${y - 2}`)
  if (has(q, 'annee', 'cette annee', 'an ')) return mk(Date.UTC(y, 0, 1), now + 1, `depuis le 1er janvier ${y}`, Date.UTC(y - 1, 0, 1), Date.UTC(y - 1, m, d.getUTCDate() + 1), `${y - 1} à la même date`)
  if (has(q, 'toujours', 'depuis le debut', 'depuis l ouverture', 'total', 'tout')) return mk(0, now + 1, 'depuis l’ouverture', 0, 0, '')
  if (has(q, 'mois')) { const f = Date.UTC(y, m, 1); return mk(f, now + 1, `ce mois-ci (${MONTHS_FR[m]})`, Date.UTC(y, m - 1, 1), Date.UTC(y, m - 1, d.getUTCDate() + 1), `${MONTHS_FR[(m + 11) % 12]} à la même date`) }
  return period(fallback === 'jour' ? 'aujourd' : fallback === 'semaine' ? 'semaine' : fallback === '30j' ? '30 derniers' : fallback === 'annee' ? 'annee' : fallback === 'tout' ? 'tout' : 'mois')
}
const inP = (iso: string, from: number, to: number) => { const x = t(iso); return x >= from && x < to }

// ───────────── Calculs ─────────────
function sales(d: AssistantData, from: number, to: number) {
  const os = d.orders.filter((o) => inP(o.created_at, from, to))
  const ok = os.filter(valid)
  const revenue = ok.reduce((a, o) => a + o.total, 0)
  return { all: os, ok, revenue, n: ok.length, cancelled: os.length - ok.length, avg: ok.length ? Math.round(revenue / ok.length) : 0 }
}
function topProducts(d: AssistantData, from: number, to: number) {
  const m = new Map<string, { id?: string; name: string; qty: number; amount: number }>()
  d.orders.filter((o) => valid(o) && inP(o.created_at, from, to)).forEach((o) => o.lines.forEach((l) => {
    const k = l.id ?? l.name; const x = m.get(k) ?? { id: l.id, name: l.name, qty: 0, amount: 0 }
    x.qty += l.qty; x.amount += l.qty * l.price; m.set(k, x)
  }))
  return [...m.values()].sort((a, b) => b.qty - a.qty || b.amount - a.amount)
}
/** Rythme de vente (net) par produit sur N jours */
function velocity(d: AssistantData, days = 30) {
  const from = Date.now() - days * DAY; const m = new Map<string, number>()
  for (const mv of d.moves) if (t(mv.created_at) >= from && (mv.kind === 'vente' || mv.kind === 'retour' || (mv.kind === 'sortie'))) m.set(mv.product_id, (m.get(mv.product_id) ?? 0) - mv.qty)
  return m
}
export function restockPlan(d: AssistantData) {
  const v = velocity(d, 30)
  return d.catalog.filter((c) => c.active).map((c) => {
    const sold = Math.max(0, v.get(c.id) ?? 0); const perDay = sold / 30
    const cover = perDay > 0 ? Math.floor(c.stock / perDay) : c.stock > 0 ? Infinity : 0
    const target = Math.ceil(perDay * 30 * 1.2) // un mois de ventes + 20 % de sécurité
    const order = Math.max(0, target - c.stock, c.stock <= c.low_stock_threshold ? c.low_stock_threshold * 2 - c.stock : 0)
    return { c, sold, perWeek: String(Math.round(perDay * 7 * 10) / 10).replace('.', ','), cover, order }
  }).filter((x) => x.c.stock === 0 || x.c.stock <= x.c.low_stock_threshold || x.cover < 14)
    .sort((a, b) => a.cover - b.cover || a.c.stock - b.c.stock)
}
function dormant(d: AssistantData, days = 45) {
  const v = velocity(d, days)
  return d.catalog.filter((c) => c.active && c.stock > 0 && (v.get(c.id) ?? 0) <= 0).sort((a, b) => b.stock * b.price - a.stock * a.price)
}
const bestDay = (os: AdminOrder[]) => {
  const m = new Map<number, number>(); os.filter(valid).forEach((o) => { const k = dayStart(t(o.created_at)); m.set(k, (m.get(k) ?? 0) + o.total) })
  const best = [...m.entries()].sort((a, b) => b[1] - a[1])[0]
  return best ? { label: new Date(best[0]).toLocaleDateString('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }), amount: best[1] } : null
}
function rhythm(d: AssistantData) {
  const from = Date.now() - 90 * DAY; const wd = Array(7).fill(0), hr = Array(24).fill(0)
  d.orders.filter((o) => valid(o) && t(o.created_at) >= from).forEach((o) => { const x = new Date(o.created_at); wd[x.getUTCDay()] += o.total; hr[x.getUTCHours()]++ })
  const bw = wd.indexOf(Math.max(...wd)); const ww = wd.indexOf(Math.min(...wd))
  let bh = 0, best = -1; for (let h = 0; h < 22; h++) { const s = hr[h] + hr[h + 1] + hr[h + 2]; if (s > best) { best = s; bh = h } }
  return { bestDay: WEEKDAYS[bw], worstDay: WEEKDAYS[ww], hours: `${bh}h – ${bh + 3}h`, total: hr.reduce((a, b) => a + b, 0) }
}
function findProduct(q: string, d: AssistantData) {
  const words = q.split(' ').filter((w) => w.length > 2)
  let best: { c: CatalogRow; score: number } | null = null
  for (const c of d.catalog) {
    const n = norm(c.name).split(' ').filter((w) => w.length > 2)
    const score = n.filter((w) => words.some((x) => x === w || (x.length > 4 && w.startsWith(x.slice(0, -1))))).length
    if (score && (!best || score > best.score)) best = { c, score }
  }
  return best && (best.score >= 2 || norm(best.c.name).split(' ').length <= 2) ? best.c : null
}

// ───────────── Réponses ─────────────
const CHIPS = {
  base: ['Résumé du jour', 'Que dois-je réapprovisionner ?', 'Meilleures ventes du mois', 'Prévision fin de mois'],
  sales: ['Comparer avec le mois dernier', 'Meilleurs clients', 'Quel est le meilleur jour pour vendre ?'],
  stock: ['Produits qui ne se vendent pas', 'Idée de promotion', 'Valeur de mon stock'],
}
const go = { orders: { label: 'Ouvrir les commandes', to: '/gerant/commandes' }, stock: { label: 'Ouvrir le stock', to: '/gerant/stock' }, prices: { label: 'Produits & prix', to: '/gerant/produits' }, clients: { label: 'Clients inscrits', to: '/gerant/clients' }, msgs: { label: 'Messages WhatsApp', to: '/gerant/messages' } }

export function welcome(d: AssistantData, name: string): Reply {
  const r = brief(d)
  return { ...r, text: `Bonjour ${name} 👋 Je suis votre **assistant IA**. J’analyse vos ventes, votre stock et vos clients en temps réel.\n\n${r.text}` }
}

function brief(d: AssistantData): Reply {
  const p = period('aujourd')
  const s = sales(d, p.from, p.to), y = sales(d, p.prev.from, p.prev.to)
  const todo = d.orders.filter((o) => o.status === 'confirmee' || o.status === 'preparation')
  const plan = restockPlan(d)
  const out = d.catalog.filter((c) => c.active && c.stock === 0)
  const top = topProducts(d, Date.now() - 7 * DAY, Date.now() + 1)[0]
  const lines = [
    `**Aujourd’hui** : ${fcfa(s.revenue)} · ${plural(s.n, 'commande')} ${evol(s.revenue, y.revenue, 'vs hier à la même heure')}`,
    `**À traiter** : ${todo.length ? plural(todo.length, 'commande') + ` (la plus ancienne ${ago(todo[todo.length - 1].created_at)})` : 'aucune commande en attente ✅'}`,
    `**Stock** : ${out.length ? `${plural(out.length, 'article')} en rupture, ` : ''}${plural(plan.length, 'article')} à réapprovisionner bientôt`,
    top ? `**Star de la semaine** : ${top.name} (${top.qty} vendus)` : '',
  ].filter(Boolean)
  const tips: string[] = []
  if (todo.length) tips.push(`Commencez par confirmer ou préparer les ${plural(todo.length, 'commande')} en attente : les clients reçoivent plus vite et annulent moins.`)
  if (plan[0]) tips.push(`Recommandez **${plan[0].c.name}** : ${plan[0].c.stock === 0 ? 'il est en rupture' : `il reste ${plural(plan[0].c.stock, 'pièce')} (environ ${isFinite(plan[0].cover) ? plural(plan[0].cover, 'jour') : '—'} de vente)`}.`)
  const dm = dormant(d)[0]; if (dm && tips.length < 2) tips.push(`**${dm.name}** ne s’est pas vendu depuis 45 jours (${dm.stock} en stock) : pensez à une petite promotion.`)
  return {
    text: `${lines.map((l) => '- ' + l).join('\n')}${tips.length ? `\n\n💡 **Mes conseils**\n${tips.map((x) => '- ' + x).join('\n')}` : ''}`,
    actions: [todo.length ? go.orders : null, plan.length ? go.stock : null].filter(Boolean) as Action[],
    chips: CHIPS.base.slice(1),
  }
}

function revenue(q: string, d: AssistantData): Reply {
  const p = period(q, 'mois'); const s = sales(d, p.from, p.to); const pr = p.prev.label ? sales(d, p.prev.from, p.prev.to) : null
  const b = bestDay(s.ok)
  const lines = [
    `**Chiffre d’affaires ${p.label}** : ${fcfa(s.revenue)}${pr ? ` ${evol(s.revenue, pr.revenue, `vs ${p.prev.label}`)}` : ''}`,
    `- ${plural(s.n, 'commande valide', 'commandes valides')}${s.cancelled ? ` (+ ${plural(s.cancelled, 'annulée')})` : ''}`,
    `- Panier moyen : ${fcfa(s.avg)}${pr && pr.avg ? ` (${evol(s.avg, pr.avg)})` : ''}`,
    b && s.n > 1 && p.to - p.from > 1.5 * DAY ? `- Meilleure journée : ${b.label} avec ${fcfa(b.amount)}` : '',
    pr ? `- ${cap(p.prev.label)} : ${fcfa(pr.revenue)} · ${plural(pr.n, 'commande')}` : '',
  ].filter(Boolean)
  return { text: lines.join('\n'), chips: CHIPS.sales }
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function top(q: string, d: AssistantData): Reply {
  const p = period(q, 'mois'); const list = topProducts(d, p.from, p.to).slice(0, 5)
  if (!list.length) return { text: `Aucune vente ${p.label} pour le moment.`, chips: CHIPS.base }
  const total = topProducts(d, p.from, p.to).reduce((a, x) => a + x.amount, 0)
  return {
    text: `🏆 **Meilleures ventes ${p.label}**\n${list.map((x, i) => `${i + 1}. **${x.name}** — ${x.qty} vendus · ${fcfa(x.amount)}`).join('\n')}\n\nCes ${list.length} articles représentent **${Math.round((list.reduce((a, x) => a + x.amount, 0) / Math.max(1, total)) * 100)} %** des ventes. Gardez-les toujours en stock.`,
    actions: [go.stock], chips: ['Que dois-je réapprovisionner ?', 'Produits qui ne se vendent pas', 'Meilleurs clients'],
  }
}

function restock(d: AssistantData): Reply {
  const plan = restockPlan(d).slice(0, 8)
  if (!plan.length) return { text: 'Tout est bien approvisionné ✅ Aucun article ne risque la rupture dans les 2 prochaines semaines.', chips: CHIPS.stock }
  const total = plan.reduce((a, x) => a + x.order, 0)
  return {
    text: `📦 **À réapprovisionner** (calculé sur le rythme des 30 derniers jours)\n${plan.map((x) => `- **${x.c.name}** : ${x.c.stock === 0 ? '🔴 rupture' : `${x.c.stock} en stock`} · ~${x.perWeek}/semaine${isFinite(x.cover) && x.c.stock ? ` · tient ${plural(x.cover, 'jour')}` : ''} → **commander ${x.order || x.c.low_stock_threshold}**`).join('\n')}\n\nTotal conseillé : **${total} pièces** pour couvrir environ un mois de ventes (+ 20 % de marge).`,
    actions: [go.stock], chips: ['Produits qui ne se vendent pas', 'Valeur de mon stock', 'Meilleures ventes du mois'],
  }
}

function sleeping(d: AssistantData): Reply {
  const list = dormant(d).slice(0, 6)
  if (!list.length) return { text: 'Bonne nouvelle : tous vos articles en stock se sont vendus au moins une fois ces 45 derniers jours 👏', chips: CHIPS.base }
  const value = list.reduce((a, c) => a + c.stock * c.price, 0)
  return {
    text: `😴 **Articles sans vente depuis 45 jours**\n${list.map((c) => `- **${c.name}** — ${c.stock} en stock · ${fcfa(c.price)} (${fcfa(c.stock * c.price)} immobilisés)`).join('\n')}\n\nCela représente **${fcfa(value)}** de marchandise qui dort. Idées : remise de 15 à 20 %, mise en avant sur WhatsApp / Facebook, ou lot avec un best-seller.`,
    actions: [go.prices], chips: ['Idée de promotion', 'Rédige un post pour la promo', 'Valeur de mon stock'],
  }
}

function promo(d: AssistantData): Reply {
  const dm = dormant(d).slice(0, 3); const r = rhythm(d)
  const best = topProducts(d, Date.now() - 30 * DAY, Date.now() + 1)[0]
  const items = dm.length ? dm : d.catalog.filter((c) => c.active).sort((a, b) => b.stock - a.stock).slice(0, 3)
  const promoLines = items.map((c, i) => { const off = i === 0 ? 20 : 15; return `- **${c.name}** : ${fcfa(c.price)} → **${fcfa(Math.round((c.price * (100 - off)) / 100 / 100) * 100)}** (−${off} %)` })
  return {
    text: `🎯 **Proposition de promotion**\n${promoLines.join('\n')}\n\n- Lancez-la un **${r.bestDay}**, votre meilleur jour, et publiez entre **${r.hours}** (heures où vos clients commandent le plus).\n${best ? `- Astuce : proposez un lot avec **${best.name}** (votre best-seller) pour faire découvrir les autres articles.\n` : ''}- Rappelez les codes existants : **YVES10** et **BIENVENUE** (nouveaux clients).\n\nPour appliquer les prix, allez dans « Produits & prix » et mettez l’ancien prix en prix barré.`,
    actions: [go.prices], chips: ['Rédige un post pour la promo', 'Quel est le meilleur jour pour vendre ?', 'Produits qui ne se vendent pas'],
  }
}

function socialPost(d: AssistantData, q: string): Reply {
  const c = findProduct(q, d) ?? dormant(d)[0] ?? d.catalog.filter((x) => x.active).sort((a, b) => b.stock - a.stock)[0]
  if (!c) return { text: 'Ajoutez d’abord des produits pour que je puisse rédiger une publication.' }
  const promoPrice = Math.round((c.price * 0.8) / 100) * 100
  return {
    text: `✍️ **Publication prête à copier** (WhatsApp, Facebook, Instagram)\n\n✨ OFFRE SPÉCIALE YVES STORE ✨\n\n${c.name} à **${fcfa(promoPrice)}** au lieu de ~~${fcfa(c.price)}~~ (−20 %) 🔥\n\n✅ Qualité garantie\n🚚 Livraison partout en Côte d’Ivoire (offerte dès 50 000 FCFA)\n💳 Paiement à la livraison, Wave, Orange Money, MTN, Moov\n\n⏳ Stock limité : seulement ${plural(c.stock, 'pièce')} !\n👉 Commandez sur notre site ou écrivez-nous au +225 01 40 81 04 15\n\n#YvesStore #Abidjan #Agboville #ModeCI`,
    chips: ['Rédige une description produit', 'Idée de promotion'],
  }
}

function description(d: AssistantData, q: string): Reply {
  const c = findProduct(q, d) ?? [...d.catalog].sort((a, b) => (b.id > a.id ? 1 : -1))[0]
  if (!c) return { text: 'Indiquez le nom du produit, par exemple : « Rédige une description pour Sac à main cuir camel ».' }
  const cat = c.category
  const benefits: Record<string, string[]> = {
    accessoires: ['Compatible avec la plupart des smartphones', 'Robuste et pensé pour un usage quotidien', 'Idéal à offrir'],
    vetements: ['Coupe flatteuse et confortable toute la journée', 'Tissu agréable, adapté au climat ivoirien', 'Facile à associer, du bureau aux sorties'],
    chaussures: ['Semelle confortable pour marcher longtemps', 'Finitions soignées', 'Style élégant qui va avec tout'],
    bijoux: ['Finition brillante qui ne ternit pas vite', 'Hypoallergénique, agréable à porter', 'Livré dans un joli écrin, parfait en cadeau'],
    cheveux: ['Formule douce, adaptée aux cheveux crépus, frisés et défrisés', 'Nourrit et fait briller', 'Résultat visible dès les premières utilisations'],
  }
  const b = benefits[cat] ?? ['Qualité sélectionnée par YVES STORE', 'Pratique au quotidien', 'Excellent rapport qualité-prix']
  return {
    text: `📝 **Description proposée pour « ${c.name} »**\n\n${c.name} : l’alliance du style et de la qualité, une sélection YVES STORE choisie avec soin.\n\n${b.map((x) => '- ' + x).join('\n')}\n\nPrix : **${fcfa(c.price)}**. Livraison rapide à Abidjan et dans toute la Côte d’Ivoire, paiement à la livraison ou Mobile Money.\n\nVous pouvez copier ce texte et l’adapter (matière, dimensions, couleurs).`,
    chips: ['Rédige un post pour la promo', 'Statistiques de ce produit'],
  }
}

function pending(d: AssistantData): Reply {
  const by = (s: string) => d.orders.filter((o) => o.status === s)
  const nw = by('confirmee'), prep = by('preparation'), sh = by('expediee')
  const list = [...nw, ...prep].sort((a, b) => t(a.created_at) - t(b.created_at)).slice(0, 6)
  if (!list.length && !sh.length) return { text: 'Aucune commande en attente ✅ Tout est traité.', chips: CHIPS.base }
  return {
    text: `🧾 **Commandes en cours**\n- Nouvelles : **${nw.length}** · En préparation : **${prep.length}** · Expédiées (en route) : **${sh.length}**\n${list.length ? `\n**À traiter en priorité** (les plus anciennes d’abord)\n${list.map((o) => `- **${o.id}** — ${who(o)}, ${o.address?.city ?? ''} · ${fcfa(o.total)} · ${STATUS[o.status]} · ${ago(o.created_at)}`).join('\n')}` : ''}`,
    actions: [go.orders], chips: ['Résumé du jour', 'Taux d’annulation'],
  }
}

function cancellations(q: string, d: AssistantData): Reply {
  const p = period(q, '30j'); const s = sales(d, p.from, p.to)
  const reasons = new Map<string, number>(); s.all.filter((o) => !valid(o)).forEach((o) => { const r = o.cancel_reason || 'Sans motif'; reasons.set(r, (reasons.get(r) ?? 0) + 1) })
  const rate = s.all.length ? Math.round((s.cancelled / s.all.length) * 100) : 0
  const sorted = [...reasons.entries()].sort((a, b) => b[1] - a[1])
  const advice = sorted[0]?.[0].includes('Délai') ? 'Le délai de livraison est la 1re cause : prévenez le client dès l’expédition sur WhatsApp.' : sorted[0]?.[0].includes('Erreur') ? 'Beaucoup d’erreurs de taille / couleur : ajoutez un guide des tailles et des photos de chaque couleur.' : sorted[0]?.[0].includes('moins cher') ? 'Certains trouvent moins cher ailleurs : mettez en avant la livraison et la qualité, ou ajustez vos prix.' : 'Appelez ou écrivez au client juste après la commande : cela réduit fortement les annulations.'
  return {
    text: `❌ **Annulations ${p.label}** : ${plural(s.cancelled, 'commande')} sur ${s.all.length} (**${rate} %**)${rate <= 10 ? ' — c’est un bon niveau 👍' : rate <= 20 ? ' — à surveiller' : ' — c’est élevé ⚠️'}\n${sorted.length ? `\n**Motifs**\n${sorted.map(([r, n]) => `- ${r} : ${n}`).join('\n')}\n\n💡 ${advice}` : ''}`,
    actions: [go.orders], chips: ['Commandes à traiter', 'Résumé du jour'],
  }
}

function forecast(q: string, d: AssistantData): Reply {
  const now = new Date(); const y = now.getUTCFullYear(), m = now.getUTCMonth()
  const f = Date.UTC(y, m, 1), daysIn = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(), elapsed = (Date.now() - f) / DAY
  const s = sales(d, f, Date.now() + 1), last = sales(d, Date.UTC(y, m - 1, 1), f)
  const perDay = s.revenue / Math.max(1, elapsed); const proj = Math.round(perDay * daysIn / 1000) * 1000
  const goal = Number((q.match(/(\d[\d\s.]{3,})/)?.[1] ?? '').replace(/[\s.]/g, ''))
  const left = daysIn - Math.floor(elapsed)
  return {
    text: `🔮 **Prévision pour ${MONTHS_FR[m]}**\n- Déjà réalisé : **${fcfa(s.revenue)}** en ${plural(Math.floor(elapsed), 'jour')} (${fcfa(Math.round(perDay))} / jour)\n- Projection fin de mois : **≈ ${fcfa(proj)}** ${evol(proj, last.revenue, `vs ${MONTHS_FR[(m + 11) % 12]} (${fcfa(last.revenue)})`)}\n${goal > 0 ? `- Objectif ${fcfa(goal)} : il faut **${fcfa(Math.max(0, Math.round((goal - s.revenue) / Math.max(1, left))))} par jour** pendant les ${plural(left, 'jour')} restants ${s.revenue >= goal ? '— objectif déjà atteint 🎉' : proj >= goal ? '— vous êtes sur la bonne voie 👍' : '— il faudra accélérer (promo, relance clients)'}` : `- Astuce : demandez « objectif 1 000 000 » pour savoir combien vendre par jour.`}\n\n_Estimation basée sur le rythme actuel ; elle s’affine au fil du mois._`,
    chips: ['Idée de promotion', 'Comparer avec le mois dernier', 'Meilleurs clients'],
  }
}

function clientsTop(q: string, d: AssistantData): Reply {
  const p = period(q, 'tout')
  const m = new Map<string, { name: string; city?: string; n: number; amount: number; last: string }>()
  d.orders.filter((o) => valid(o) && inP(o.created_at, p.from, p.to)).forEach((o) => {
    const k = o.user_id ?? who(o); const x = m.get(k) ?? { name: who(o), city: o.address?.city, n: 0, amount: 0, last: o.created_at }
    x.n++; x.amount += o.total; if (o.created_at > x.last) x.last = o.created_at; m.set(k, x)
  })
  const list = [...m.values()].sort((a, b) => b.amount - a.amount).slice(0, 5)
  if (!list.length) return { text: `Aucun achat ${p.label}.`, chips: CHIPS.base }
  const sleepy = [...m.values()].filter((x) => x.n >= 2 && Date.now() - t(x.last) > 45 * DAY).slice(0, 3)
  return {
    text: `💎 **Meilleurs clients ${p.label}**\n${list.map((x, i) => `${i + 1}. **${x.name}**${x.city ? ` (${x.city})` : ''} — ${fcfa(x.amount)} · ${plural(x.n, 'commande')}`).join('\n')}${sleepy.length ? `\n\n📣 **À relancer** (fidèles mais sans achat depuis 45 jours) : ${sleepy.map((x) => x.name).join(', ')}. Un petit message WhatsApp avec le code YVES10 peut les faire revenir.` : ''}`,
    actions: [go.clients], chips: ['Nouveaux inscrits ce mois', 'Villes qui achètent le plus'],
  }
}

function newClients(q: string, d: AssistantData): Reply {
  const p = period(q, 'mois')
  const list = d.clients.filter((c) => !c.is_admin && inP(c.created_at, p.from, p.to))
  const buyers = list.filter((c) => c.orders_count > 0).length
  const all = d.clients.filter((c) => !c.is_admin)
  if (has(q, 'combien', 'nombre', 'total') && !has(q, 'nouveau', 'nouveaux', 'aujourd', 'hier', 'semaine', 'mois', 'annee', '20')) {
    const month = period('mois'); const fresh = all.filter((c) => inP(c.created_at, month.from, month.to)).length
    const ordered = all.filter((c) => c.orders_count > 0).length
    return {
      text: `👥 **Clients inscrits : ${all.length}** au total\n- Ont déjà commandé : ${ordered} (${all.length ? Math.round((ordered / all.length) * 100) : 0} %)\n- Nouveaux ${month.label} : ${fresh}\n- Comptes bloqués : ${all.filter((c) => c.blocked).length}`,
      actions: [go.clients], chips: ['Meilleurs clients', 'Nouveaux inscrits ce mois'],
    }
  }
  return {
    text: `👥 **Nouveaux inscrits ${p.label}** : **${list.length}** (sur ${d.clients.filter((c) => !c.is_admin).length} clients au total)\n${list.length ? `- Ont déjà commandé : ${buyers} (${Math.round((buyers / list.length) * 100)} %)\n- Derniers inscrits : ${list.sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, 5).map((c) => `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim()).join(', ')}` : ''}${list.length - buyers > 0 ? `\n\n💡 ${plural(list.length - buyers, 'inscrit')} n’${list.length - buyers > 1 ? 'ont' : 'a'} pas encore commandé : le code **BIENVENUE** est fait pour eux.` : ''}`,
    actions: [go.clients], chips: ['Meilleurs clients', 'Résumé du jour'],
  }
}

function geo(q: string, d: AssistantData): Reply {
  const p = period(q, '30j'); const os = sales(d, p.from, p.to).ok
  const cities = new Map<string, number>(), pay = new Map<string, number>(), ship = new Map<string, number>()
  os.forEach((o) => { const c = o.address?.city || '—'; cities.set(c, (cities.get(c) ?? 0) + o.total); pay.set(o.payment, (pay.get(o.payment) ?? 0) + 1); ship.set(o.shipping, (ship.get(o.shipping) ?? 0) + 1) })
  const fmt = (m: Map<string, number>, money = false) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${SHIP[k] ?? k} : ${money ? fcfa(v) : `${v} (${Math.round((v / Math.max(1, os.length)) * 100)} %)`}`).join(' · ')
  return { text: `📍 **Où et comment vos clients achètent ${p.label}**\n- **Villes** : ${fmt(cities, true) || '—'}\n- **Paiement** : ${fmt(pay) || '—'}\n- **Livraison** : ${fmt(ship) || '—'}`, chips: ['Meilleurs clients', 'Quel est le meilleur jour pour vendre ?'] }
}

function timing(d: AssistantData): Reply {
  const r = rhythm(d)
  if (!r.total) return { text: 'Pas encore assez de commandes pour repérer vos meilleurs moments.', chips: CHIPS.base }
  return { text: `⏰ **Vos meilleurs moments** (90 derniers jours)\n- Meilleur jour : **${r.bestDay}**\n- Jour le plus calme : ${r.worstDay}\n- Heures où l’on commande le plus : **${r.hours}**\n\n💡 Publiez vos nouveautés et promos juste avant ce créneau, et prévoyez de répondre vite sur WhatsApp à ce moment-là.`, chips: ['Idée de promotion', 'Rédige un post pour la promo'] }
}

function stockValue(d: AssistantData): Reply {
  const act = d.catalog.filter((c) => c.active)
  const units = act.reduce((a, c) => a + c.stock, 0), value = act.reduce((a, c) => a + c.stock * c.price, 0)
  const byCat = new Map<string, number>(); act.forEach((c) => byCat.set(c.category, (byCat.get(c.category) ?? 0) + c.stock * c.price))
  return { text: `💰 **Valeur du stock** (au prix de vente) : **${fcfa(value)}** pour ${units} articles\n${[...byCat.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `- ${CATEGORY_FR[k] ?? cap(k)} : ${fcfa(v)}`).join('\n')}`, actions: [go.stock], chips: ['Produits qui ne se vendent pas', 'Que dois-je réapprovisionner ?'] }
}

function orderInfo(id: string, d: AssistantData): Reply {
  const o = d.orders.find((x) => x.id.toLowerCase() === id.toLowerCase())
  if (!o) return { text: `Je ne trouve pas la commande **${id.toUpperCase()}**. Vérifiez le numéro.`, actions: [go.orders] }
  const msg = o.status === 'expediee' ? `Bonjour ${o.customer?.firstName ?? ''}, votre commande ${o.id} est en route 🚚 Vous serez livré(e) très bientôt. Merci pour votre confiance ! — YVES STORE` : o.status === 'livree' ? `Bonjour ${o.customer?.firstName ?? ''}, merci pour votre achat ${o.id} 🙏 Êtes-vous satisfait(e) ? Votre avis nous aide beaucoup. — YVES STORE` : `Bonjour ${o.customer?.firstName ?? ''}, nous avons bien reçu votre commande ${o.id} (${fcfa(o.total)}). Elle est en cours de préparation, nous vous prévenons dès l’expédition. — YVES STORE`
  return {
    text: `🧾 **Commande ${o.id}** — ${STATUS[o.status] ?? o.status}\n- Client : ${who(o)} · ${o.customer?.phone ?? ''}\n- ${o.address?.city ?? ''}${o.address?.commune ? ', ' + o.address.commune : ''} · ${SHIP[o.shipping] ?? o.shipping} · ${o.payment}\n- Articles : ${o.lines.map((l) => `${l.qty} × ${l.name}`).join(', ')}\n- Total : **${fcfa(o.total)}** · passée ${ago(o.created_at)}${o.cancel_reason ? `\n- Motif d’annulation : ${o.cancel_reason}` : ''}\n\n💬 **Message WhatsApp suggéré**\n${msg}`,
    actions: [go.orders],
  }
}

function productInfo(c: CatalogRow, d: AssistantData): Reply {
  const v30 = Math.max(0, velocity(d, 30).get(c.id) ?? 0)
  const rev = topProducts(d, Date.now() - 30 * DAY, Date.now() + 1).find((x) => x.id === c.id)
  const cover = v30 ? Math.floor(c.stock / (v30 / 30)) : null
  return {
    text: `🔎 **${c.name}**\n- Prix : ${fcfa(c.price)}${c.compare_at ? ` (barré ${fcfa(c.compare_at)})` : ''} · ${c.active ? 'en vente' : 'retiré de la boutique'}\n- Stock : **${c.stock}**${c.stock <= c.low_stock_threshold ? ' ⚠️ stock faible' : ''}\n- Vendus sur 30 jours : **${v30}**${rev ? ` · ${fcfa(rev.amount)}` : ''}\n${cover !== null ? `- Au rythme actuel, le stock tient **${plural(cover, 'jour')}**` : '- Aucune vente ces 30 derniers jours'}`,
    actions: [go.stock, go.prices], chips: [`Rédige une description pour ${c.name}`, 'Que dois-je réapprovisionner ?'],
  }
}

const short = (c: Client) => `${c.first_name ?? ''} ${(c.last_name ?? '').slice(0, 1)}${c.last_name ? '.' : ''}`.trim() || 'Client'

/** Vue d’ensemble des clients inscrits (sans téléphone ni e-mail) */
function clientsOverview(d: AssistantData): Reply {
  const all = d.clients.filter((c) => !c.is_admin)
  if (!all.length) return { text: '👥 Aucun client inscrit pour le moment.', actions: [go.clients], chips: CHIPS.base }
  const buyers = all.filter((c) => c.orders_count > 0), never = all.length - buyers.length
  const repeat = buyers.filter((c) => c.orders_count >= 2).length
  const month = period('mois'); const fresh = all.filter((c) => inP(c.created_at, month.from, month.to)).length
  const spent = buyers.reduce((a, c) => a + c.total_spent, 0)
  const cities = new Map<string, number>(); all.forEach((c) => { const k = c.city || 'Non renseignée'; cities.set(k, (cities.get(k) ?? 0) + 1) })
  const topC = [...buyers].sort((a, b) => b.total_spent - a.total_spent).slice(0, 5)
  const sleepy = buyers.filter((c) => c.orders_count >= 2 && c.last_order_at && Date.now() - t(c.last_order_at) > 45 * DAY).length
  return {
    text: `👥 **Vos clients : ${all.length} inscrits**\n- Ont déjà commandé : **${buyers.length}** (${Math.round((buyers.length / all.length) * 100)} %) · jamais commandé : ${never}\n- Clients fidèles (2 commandes ou plus) : **${repeat}**\n- Nouveaux ${month.label} : ${fresh}${all.some((c) => c.blocked) ? ` · bloqués : ${all.filter((c) => c.blocked).length}` : ''}\n- Dépense moyenne par acheteur : **${fcfa(buyers.length ? Math.round(spent / buyers.length) : 0)}**\n- Villes : ${[...cities.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k} (${v})`).join(' · ')}\n\n💎 **Top 5 clients**\n${topC.map((c, i) => `${i + 1}. **${short(c)}**${c.city ? ` (${c.city})` : ''} — ${fcfa(c.total_spent)} · ${plural(c.orders_count, 'commande')}`).join('\n')}${sleepy || never ? `\n\n💡 ${sleepy ? `${plural(sleepy, 'client fidèle', 'clients fidèles')} sans achat depuis 45 jours : relancez-les sur WhatsApp. ` : ''}${never ? `${plural(never, 'inscrit')} n’${never > 1 ? 'ont' : 'a'} jamais commandé : un code BIENVENUE peut ${never > 1 ? 'les' : 'le'} décider.` : ''}` : ''}`,
    actions: [go.clients], chips: ['Meilleurs clients', 'Villes qui achètent le plus', 'Nouveaux inscrits ce mois'],
  }
}

/** Audit complet de la boutique à partir des données réelles */
function audit(d: AssistantData): Reply {
  const now = Date.now(), today = dayStart(now)
  const m = period('mois'), s = sales(d, m.from, m.to), sp = sales(d, m.prev.from, m.prev.to)
  const s30 = sales(d, today - 29 * DAY, now + 1)
  const cancelRate = s30.all.length ? Math.round((s30.cancelled / s30.all.length) * 100) : 0
  const todo = d.orders.filter((o) => o.status === 'confirmee' || o.status === 'preparation')
  const late = todo.filter((o) => now - t(o.created_at) > 2 * DAY).length
  const act = d.catalog.filter((c) => c.active), out = act.filter((c) => c.stock === 0), low = act.filter((c) => c.stock > 0 && c.stock <= c.low_stock_threshold)
  const plan = restockPlan(d), dm = dormant(d), top = topProducts(d, today - 29 * DAY, now + 1)
  const all = d.clients.filter((c) => !c.is_admin), buyers = all.filter((c) => c.orders_count > 0), repeat = buyers.filter((c) => c.orders_count >= 2).length
  const stockVal = act.reduce((a, c) => a + c.price * c.stock, 0)
  const good: string[] = [], warn: string[] = [], todoList: string[] = []
  if (sp.revenue && s.revenue >= sp.revenue) good.push(`Ventes du mois en hausse (${evol(s.revenue, sp.revenue)} vs ${m.prev.label})`)
  else if (sp.revenue) warn.push(`Ventes du mois en baisse (${evol(s.revenue, sp.revenue)} vs ${m.prev.label})`)
  if (cancelRate >= 10) warn.push(`Taux d’annulation élevé : **${cancelRate} %** sur 30 jours`); else if (s30.all.length) good.push(`Taux d’annulation maîtrisé : ${cancelRate} % sur 30 jours`)
  if (out.length) warn.push(`${plural(out.length, 'produit')} en rupture : ${out.slice(0, 3).map((c) => c.name).join(', ')}`)
  if (low.length) warn.push(`${plural(low.length, 'produit')} sous le seuil d’alerte`)
  if (late) warn.push(`${plural(late, 'commande')} en attente depuis plus de 2 jours`)
  if (dm.length) warn.push(`${plural(dm.length, 'produit')} sans vente depuis 45 jours (stock immobilisé)`)
  if (buyers.length && repeat / buyers.length >= 0.3) good.push(`Bonne fidélité : ${Math.round((repeat / buyers.length) * 100)} % des acheteurs ont commandé 2 fois ou plus`)
  if (all.length && buyers.length / all.length < 0.6) warn.push(`${plural(all.length - buyers.length, 'inscrit')} sans aucune commande`)
  if (todo.length) todoList.push(`Traiter les **${plural(todo.length, 'commande')} en attente**${late ? ` (dont ${late} en retard)` : ''}`)
  if (plan[0]) todoList.push(`Réapprovisionner : ${plan.slice(0, 3).map((x) => `${x.c.name} (+${x.order})`).join(', ')}`)
  if (dm[0]) todoList.push(`Promotion sur les produits dormants (ex. **${dm[0].name}**, ${dm[0].stock} en stock)`)
  if (all.length - buyers.length > 0) todoList.push(`Relancer les inscrits sans commande avec le code **BIENVENUE**`)
  return {
    text: `🩺 **Audit de la boutique** — ${new Date(now).toISOString().slice(0, 10).split('-').reverse().join('/')}\n\n**📊 Ventes**\n- ${m.label} : **${fcfa(s.revenue)}** · ${plural(s.n, 'commande')} · panier moyen ${fcfa(s.avg)}\n- 30 derniers jours : ${fcfa(s30.revenue)} · ${plural(s30.n, 'commande')} · ${s30.cancelled} annulée(s) (${cancelRate} %)\n- Meilleure vente (30 j) : ${top[0] ? `**${top[0].name}** (${top[0].qty} vendus)` : '—'}\n\n**🧾 Commandes** : ${todo.length} à traiter${late ? `, dont **${late} en retard**` : ''}\n\n**📦 Stock** : ${act.length} produits en vente · ${out.length} en rupture · ${low.length} sous le seuil · valeur ${fcfa(stockVal)}\n\n**👥 Clients** : ${all.length} inscrits · ${buyers.length} acheteurs · ${repeat} fidèles\n${good.length ? `\n✅ **Points forts**\n${good.map((x) => '- ' + x).join('\n')}\n` : ''}${warn.length ? `\n⚠️ **Points à surveiller**\n${warn.map((x) => '- ' + x).join('\n')}\n` : ''}${todoList.length ? `\n🎯 **Plan d’action**\n${todoList.map((x, i) => `${i + 1}. ${x}`).join('\n')}` : ''}\n\nℹ️ Limites : paiements non vérifiés automatiquement, pas de prix d’achat (marge inconnue), pas de statistiques de visites.`,
    actions: [go.orders, go.stock, go.clients], chips: ['Que dois-je réapprovisionner ?', 'Vos clients', 'Prévision fin de mois'],
  }
}

/** Marge : impossible sans prix d’achat — on le dit clairement, sans inventer */
function margin(q: string, d: AssistantData): Reply {
  const p = period(q, 'mois'); const s = sales(d, p.from, p.to)
  return {
    text: `⚠️ **Je ne peux pas calculer votre marge** : la boutique n’enregistre pas encore le **prix d’achat** de vos produits.\n- Ce que je sais : chiffre d’affaires ${p.label} = **${fcfa(s.revenue)}** (${plural(s.n, 'commande')}).\n- Ce chiffre comprend les frais de livraison payés par les clients et **n’est pas un bénéfice**.\n💡 Ajouter un « prix d’achat » à chaque produit me permettrait de calculer marge et bénéfice exacts.`,
    chips: ['Ventes ce mois', 'Meilleures ventes du mois'],
  }
}

/** Paiements : aucun paiement n’est vérifié automatiquement — on distingue « déclaré » et « confirmé » */
function payments(q: string, d: AssistantData): Reply {
  const p = period(q, '30j'); const os = sales(d, p.from, p.to).ok
  const pay = new Map<string, { n: number; amount: number }>()
  os.forEach((o) => { const x = pay.get(o.payment) ?? { n: 0, amount: 0 }; x.n++; x.amount += o.total; pay.set(o.payment, x) })
  const lines = [...pay.entries()].sort((a, b) => b[1].n - a[1].n).map(([k, v]) => `- ${k} : ${plural(v.n, 'commande')} · ${fcfa(v.amount)}`).join('\n')
  const cod = d.orders.filter((o) => valid(o) && o.status !== 'livree' && /livraison/i.test(o.payment))
  return {
    text: `⚠️ **Aucun paiement n’est confirmé automatiquement** : la boutique enregistre seulement le moyen de paiement **choisi** par le client, sans vérification auprès d’Orange, MTN, Wave ou Moov.\n**Moyens choisis ${p.label}** (commandes non annulées) :\n${lines || '- aucune commande'}\n- À encaisser à la livraison (commandes pas encore livrées) : **${fcfa(cod.reduce((a, o) => a + o.total, 0))}** (${plural(cod.length, 'commande')})\n💡 Vérifiez chaque paiement Mobile Money sur votre téléphone marchand avant d’expédier.`,
    actions: [go.orders], chips: ['Commandes à traiter', 'Ventes ce mois'],
  }
}

const HELP: Reply = {
  text: 'Voici ce que je sais faire :\n- 📊 **Ventes** : « Chiffre d’affaires de la semaine dernière », « Ventes en mars », « Comparer avec le mois dernier »\n- 📦 **Stock** : « Que dois-je réapprovisionner ? », « Produits qui ne se vendent pas », « Valeur de mon stock »\n- 🧾 **Commandes** : « Commandes à traiter », « Taux d’annulation », ou un numéro « YS-… »\n- 👥 **Clients** : « Meilleurs clients », « Nouveaux inscrits ce mois », « Villes qui achètent le plus »\n- 🔮 **Prévisions** : « Prévision fin de mois », « Objectif 1 500 000 »\n- ✍️ **Rédaction** : « Rédige un post pour la promo », « Description pour Sac à main cuir camel »',
  chips: CHIPS.base,
}

/** Point d’entrée : répond à une question du gérant */
export function answer(question: string, d: AssistantData): Reply {
  const q = norm(question)
  if (!q) return HELP
  const oid = q.match(/ys-[a-z0-9]{4,9}/)?.[0]; if (oid) return orderInfo(oid, d)
  if (has(q, 'aide', 'que sais', 'que peux', 'quoi faire', 'comment ca marche', 'help', 'fonctionnalit')) return HELP
  if (/^(bonjour|bonsoir|salut|hello|coucou|merci)/.test(q) && q.split(' ').length <= 3) return q.startsWith('merci') ? { text: 'Avec plaisir 😊 Autre chose ?', chips: CHIPS.base } : welcome(d, '')
  if (has(q, 'audit', 'diagnostic', 'etat des lieux', 'analyse complete', 'analyse globale', 'rapport', 'bilan complet', 'analyse ma boutique', 'analyse la boutique', 'point complet')) return audit(d)
  if (has(q, 'marge', 'benefice', 'profit', 'rentab', 'gagne net', 'net ')) return margin(q, d)
  if (has(q, 'confirm', 'verifi', 'encaiss', 'recu', 'valide') && has(q, 'paiement', 'paye', 'orange', 'wave', 'mtn', 'moov', 'mobile money', 'cinetpay')) return payments(q, d)
  if (has(q, 'client') && has(q, 'combien', 'nombre', 'total')) return newClients(q, d)
  if (has(q, 'post', 'publication', 'publie', 'facebook', 'instagram', 'tiktok', 'statut', 'pub ', 'publicite', 'annonce')) return socialPost(d, q)
  if (has(q, 'description', 'decri', 'fiche produit', 'redige', 'ecris', 'texte')) return description(d, q)
  if (has(q, 'reappro', 'rupture', 'stock faible', 'manque', 'racheter', 'fournisseur', 'commander quoi', 'recommander', 'acheter quoi', 'faut il commander')) return restock(d)
  if (has(q, 'valeur', 'immobilis')) return stockValue(d)
  if (has(q, 'ne se vend', 'dormant', 'invendu', 'pas vendu', 'vend pas', 'lent', 'stagn', 'dort')) return sleeping(d)
  if (has(q, 'promo', 'solde', 'reduction', 'remise', 'offre', 'idee', 'booster', 'augmenter', 'vendre plus', 'attirer')) return promo(d)
  if (has(q, 'annul')) return cancellations(q, d)
  if (has(q, 'prevision', 'prevoir', 'projection', 'fin du mois', 'fin de mois', 'estim', 'objectif')) return forecast(q, d)
  if (has(q, 'nouveaux', 'inscrit', 'inscription')) return newClients(q, d)
  if (has(q, 'client') && has(q, 'meilleur', 'fidele', 'top', 'plus', 'gros', 'relancer')) return clientsTop(q, d)
  if (has(q, 'client', 'acheteur', 'clientele')) return clientsOverview(d)
  if (has(q, 'ville', 'region', 'commune', 'paiement', 'wave', 'orange money', 'livraison', 'retrait', 'ou ')) return geo(q, d)
  if (has(q, 'meilleur jour', 'quel jour', 'quelle heure', 'heure', 'moment', 'quand')) return timing(d)
  if (has(q, 'meilleur', 'top', 'plus vendu', 'best', 'populaire', 'star')) return top(q, d)
  if (has(q, 'a traiter', 'en attente', 'attente', 'preparer', 'nouvelles commandes', 'en cours', 'expedi', 'livrer', 'commandes')) return pending(d)
  if (has(q, 'resume', 'bilan', 'point', 'synthese', 'situation', 'comment va', 'ca va', 'tableau')) return brief(d)
  if (has(q, 'chiffre', 'ca ', 'vente', 'vendu', 'gagne', 'revenu', 'recette', 'argent', 'combien', 'compar', 'panier moyen', 'encaiss')) return revenue(q, d)
  if (has(q, 'stock')) return restock(d)
  const p = findProduct(q, d); if (p) return productInfo(p, d)
  if (q === 'ca' || q.endsWith(' ca')) return revenue(q, d)
  return { text: 'Je n’ai pas cette information 🤔 Je réponds uniquement à partir des données de votre boutique : ventes, commandes, stock, clients, annulations, promotions. Essayez par exemple :', chips: [...CHIPS.base, 'Aide'] }
}

/** Contexte chiffré compact transmis à l’IA générative (aucune donnée personnelle sensible) */
export function buildFacts(d: AssistantData) {
  const now = Date.now(); const today = dayStart(now); const y = new Date(today).getUTCFullYear(), m = new Date(today).getUTCMonth()
  const S = (f: number, to: number) => { const s = sales(d, f, to); return { ca: s.revenue, commandes: s.n, annulees: s.cancelled, panier_moyen: s.avg } }
  return {
    date: new Date(now).toISOString().slice(0, 16).replace('T', ' ') + ' (heure d’Abidjan)',
    ventes: {
      aujourdhui: S(today, now + 1), hier: S(today - DAY, today), sept_jours: S(today - 6 * DAY, now + 1), trente_jours: S(today - 29 * DAY, now + 1),
      mois_en_cours: S(Date.UTC(y, m, 1), now + 1), mois_precedent: S(Date.UTC(y, m - 1, 1), Date.UTC(y, m, 1)),
      annee_en_cours: S(Date.UTC(y, 0, 1), now + 1), annee_precedente: S(Date.UTC(y - 1, 0, 1), Date.UTC(y, 0, 1)),
      par_mois_12: Array.from({ length: 12 }, (_, i) => { const f = Date.UTC(y, m - 11 + i, 1); return { mois: new Date(f).toISOString().slice(0, 7), ...S(f, Date.UTC(y, m - 10 + i, 1)) } }),
    },
    commandes_en_attente: d.orders.filter((o) => o.status === 'confirmee' || o.status === 'preparation').slice(0, 15).map((o) => ({ id: o.id, client: `${o.customer?.firstName ?? ''} ${(o.customer?.lastName ?? '').slice(0, 1)}${o.customer?.lastName ? '.' : ''}`.trim() || 'Client', ville: o.address?.city, total: o.total, statut: o.status, passee: ago(o.created_at) })),
    meilleures_ventes_30j: topProducts(d, today - 29 * DAY, now + 1).slice(0, 10).map((x) => ({ produit: x.name, qte: x.qty, montant: x.amount })),
    a_reapprovisionner: restockPlan(d).slice(0, 12).map((x) => ({ produit: x.c.name, stock: x.c.stock, ventes_semaine: x.perWeek, jours_restants: isFinite(x.cover) ? x.cover : null, conseil_commande: x.order })),
    sans_vente_45j: dormant(d).slice(0, 10).map((c) => ({ produit: c.name, stock: c.stock, prix: c.price })),
    catalogue: d.catalog.filter((c) => c.active).map((c) => ({ produit: c.name, categorie: c.category, prix: c.price, prix_barre: c.compare_at, stock: c.stock })),
    clients: (() => {
      const all = d.clients.filter((c) => !c.is_admin), buyers = all.filter((c) => c.orders_count > 0)
      const cities = new Map<string, number>(); all.forEach((c) => { const k = c.city || 'Non renseignée'; cities.set(k, (cities.get(k) ?? 0) + 1) })
      return {
        inscrits: all.length, acheteurs: buyers.length, jamais_commande: all.length - buyers.length,
        fideles_2_commandes_ou_plus: buyers.filter((c) => c.orders_count >= 2).length,
        nouveaux_30j: all.filter((c) => t(c.created_at) >= today - 29 * DAY).length, bloques: all.filter((c) => c.blocked).length,
        depense_moyenne_par_acheteur: buyers.length ? Math.round(buyers.reduce((a, c) => a + c.total_spent, 0) / buyers.length) : 0,
        par_ville: Object.fromEntries([...cities.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)),
        // Prénom + initiale uniquement : jamais de téléphone, d’e-mail ni d’adresse
        liste: [...all].sort((a, b) => b.total_spent - a.total_spent).slice(0, 40).map((c) => ({
          client: short(c), ville: c.city, commandes: c.orders_count, total_depense: c.total_spent,
          derniere_commande: c.last_order_at ? ago(c.last_order_at) : 'jamais', inscrit: ago(c.created_at), bloque: c.blocked || undefined,
        })),
      }
    })(),
    commandes_par_statut: Object.fromEntries(['confirmee', 'preparation', 'expediee', 'livree', 'annulee'].map((st) => [STATUS[st], d.orders.filter((o) => o.status === st).length])),
    annulations_30j_motifs: (() => { const m = new Map<string, number>(); d.orders.filter((o) => o.status === 'annulee' && t(o.created_at) >= today - 29 * DAY).forEach((o) => { const k = o.cancel_reason || 'Sans motif'; m.set(k, (m.get(k) ?? 0) + 1) }); return Object.fromEntries(m) })(),
    stock_resume: { produits_en_vente: d.catalog.filter((c) => c.active).length, en_rupture: d.catalog.filter((c) => c.active && c.stock === 0).map((c) => c.name), sous_seuil: d.catalog.filter((c) => c.active && c.stock > 0 && c.stock <= c.low_stock_threshold).map((c) => c.name), valeur_prix_vente: d.catalog.filter((c) => c.active).reduce((a, c) => a + c.price * c.stock, 0) },
    paiements_choisis_30j: (() => { const m = new Map<string, number>(); d.orders.filter((o) => valid(o) && t(o.created_at) >= today - 29 * DAY).forEach((o) => m.set(o.payment, (m.get(o.payment) ?? 0) + 1)); return Object.fromEntries(m) })(),
    rythme_90j: rhythm(d),
    codes_promo: ['YVES10 (−10 %)', 'BIENVENUE (nouveaux clients)'],
    livraison: 'Abidjan 2 000 FCFA, intérieur 3 500 FCFA, offerte dès 50 000 FCFA',
    limites_des_donnees: [
      'Paiements : seul le moyen CHOISI par le client est enregistré ; aucun paiement n’est vérifié ou confirmé automatiquement, et le back-office n’a pas de statut de paiement (le gérant vérifie sur son téléphone marchand).',
      'Aucun prix d’achat enregistré : marge et bénéfice impossibles à calculer.',
      'Le chiffre d’affaires inclut les frais de livraison et exclut les commandes annulées.',
      'Pas de données de visites du site, de paniers abandonnés ni d’avis clients.',
    ],
  }
}
