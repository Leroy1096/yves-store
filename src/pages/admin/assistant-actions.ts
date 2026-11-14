/**
 * Actions de l’Assistant IA (règles fixées par le gérant) :
 *  - AUTONOMES (sans demander) : valider une commande (Nouvelle → En préparation)
 *    et préparer le message de réinitialisation du mot de passe (code WhatsApp).
 *    → l’assistant fait l’action PUIS affiche un résumé de ce qu’il a fait.
 *  - TOUTES LES AUTRES (prix, stock, statut, retrait d’un article, avis…) : proposées
 *    avec un bouton « Confirmer » — rien n’est fait sans l’accord explicite du gérant.
 * Les actions passent par les mêmes fonctions sécurisées que le back-office
 * (session du gérant, vérification is_admin côté serveur) et sont journalisées.
 */
import { fcfa } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import { clientWaLink, resetMessage } from '../../lib/whatsapp'
import type { AssistantData } from './assistant-engine'
import type { AdminOrder, CatalogRow } from './shared'

export type ActionType =
  | 'valider_commande' | 'envoyer_reinitialisation'
  | 'changer_statut_commande' | 'modifier_prix' | 'mouvement_stock' | 'retirer_produit' | 'remettre_en_vente' | 'repondre_avis' | 'masquer_avis'

/** Seules actions autorisées sans accord préalable */
export const AUTO_ACTIONS: ActionType[] = ['valider_commande', 'envoyer_reinitialisation']

export interface AiAction {
  type: ActionType
  commande?: string; statut?: string; motif?: string
  produit?: string; prix?: number; prix_barre?: number | null
  mouvement?: 'entree' | 'sortie' | 'ajustement'; quantite?: number; note?: string
  demande?: string; client?: string
  avis?: number; texte?: string
}
export interface ResetRequest { id: string; customer_name: string | null; phone: string; created_at: string; status: string }
export interface AdminReviewLite { id: number; product_name: string; author: string; rating: number; comment: string; reply: string | null; status: string; seen: boolean; created_at: string }
export interface ActionCtx extends AssistantData { resetRequests?: ResetRequest[]; reviews?: AdminReviewLite[] }

export type OpStatus = 'pending' | 'running' | 'done' | 'error' | 'cancelled'
export interface Op {
  id: string
  type: ActionType
  auto: boolean
  /** Description lisible (« Valider la commande YS-123 de Aya K. — 34 500 FCFA ») */
  label: string
  status: OpStatus
  result?: string
  /** Lien WhatsApp prêt (message de réinitialisation) — un clic pour l’envoyer */
  wa?: { href: string; label: string }
  /** Action impossible (commande introuvable…) : affichée comme erreur, jamais exécutée */
  invalid?: boolean
  run?: () => Promise<{ ok: boolean; text: string; wa?: Op['wa'] }>
}

const STATUS_FR: Record<string, string> = { confirmee: 'Nouvelle', preparation: 'En préparation', expediee: 'Expédiée', livree: 'Livrée', annulee: 'Annulée' }
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’']/g, ' ').replace(/[^a-z0-9\- ]+/g, ' ').replace(/\s+/g, ' ').trim()
const who = (o: AdminOrder) => { const f = o.customer?.firstName ?? '', l = o.customer?.lastName ?? ''; return `${f} ${l ? l.slice(0, 1) + '.' : ''}`.trim() || 'Client' }
const shortName = (full?: string | null) => { const [f, ...r] = String(full ?? '').trim().split(/\s+/); return f ? `${f}${r.length ? ' ' + r.join(' ').slice(0, 1) + '.' : ''}` : 'Client' }
let seq = 1
const nid = () => `op${Date.now().toString(36)}${seq++}`

// ───────────── Lecture du bloc <actions> renvoyé par l’IA ─────────────
const BLOCK = /<actions>\s*([\s\S]*?)\s*<\/actions>|```actions\s*([\s\S]*?)```/i
export function extractActions(text: string): { text: string; actions: AiAction[] } {
  const m = text.match(BLOCK)
  if (!m) return { text, actions: [] }
  let actions: AiAction[] = []
  try {
    const raw = JSON.parse((m[1] ?? m[2] ?? '').trim())
    const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.actions) ? raw.actions : []
    actions = arr.filter((a: unknown): a is AiAction => !!a && typeof a === 'object' && typeof (a as AiAction).type === 'string').slice(0, 12)
  } catch { actions = [] }
  return { text: text.replace(BLOCK, '').replace(/\n{3,}/g, '\n\n').trim(), actions }
}

// ───────────── Recherche commande / article / demande ─────────────
function findOrder(ref: string | undefined, d: ActionCtx) {
  if (!ref) return null
  const k = norm(ref).replace(/\s/g, '')
  return d.orders.find((o) => norm(o.id).replace(/\s/g, '') === k) ?? d.orders.find((o) => norm(o.id).endsWith(k.replace(/^ys-?/, ''))) ?? null
}
export function findProductByName(name: string | undefined, catalog: CatalogRow[]): { c?: CatalogRow; error?: string } {
  if (!name) return { error: 'article non précisé' }
  const q = norm(name)
  const byRef = catalog.find((c) => c.id.toLowerCase() === q)
  if (byRef) return { c: byRef }
  const exact = catalog.filter((c) => norm(c.name) === q)
  if (exact.length === 1) return { c: exact[0] }
  const words = q.split(' ').filter((w) => w.length > 2)
  const scored = catalog.map((c) => {
    const n = norm(c.name)
    const score = words.filter((w) => n.split(' ').some((x) => x === w || (w.length > 4 && x.startsWith(w.slice(0, -1))))).length
    return { c, score: n.includes(q) ? 99 : score }
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score)
  if (!scored.length) return { error: `aucun article ne correspond à « ${name} »` }
  if (scored.length > 1 && scored[0].score === scored[1].score) return { error: `plusieurs articles correspondent à « ${name} » (${scored.slice(0, 3).map((x) => x.c.name).join(', ')}) : précisez le nom` }
  if (scored[0].score < Math.min(2, words.length) && scored[0].score !== 99) return { error: `je ne suis pas sûr de l’article « ${name} » : précisez le nom exact` }
  return { c: scored[0].c }
}
function findReset(a: AiAction, d: ActionCtx) {
  const list = (d.resetRequests ?? []).filter((r) => r.status === 'en_attente')
  const ref = (a.demande ?? '').trim().toUpperCase()
  const m = ref.match(/^R(\d+)$/)
  if (m) return list[Number(m[1]) - 1] ?? null
  const key = norm(a.client ?? a.demande ?? '')
  if (!key) return list.length === 1 ? list[0] : null
  const hits = list.filter((r) => norm(r.customer_name ?? '').includes(key) || key.includes(norm(shortName(r.customer_name)).replace(/\.$/, '')))
  return hits.length === 1 ? hits[0] : null
}

async function log(type: ActionType, summary: string, auto: boolean, ok: boolean) {
  try { await supabase.rpc('admin_log_ai_action', { p_action: type, p_summary: summary, p_auto: auto, p_ok: ok }) } catch { /* journal facultatif */ }
}
const errText = (m: string) => {
  if (/ALREADY_CANCELLED/.test(m)) return 'commande déjà annulée'
  if (/ALREADY/.test(m)) return 'déjà traitée'
  if (/INSUFFICIENT_STOCK/.test(m)) return 'stock insuffisant'
  if (/FORBIDDEN|permission/i.test(m)) return 'action refusée (session gérant expirée ?)'
  return m.slice(0, 120)
}

// ───────────── Transformation en opérations exécutables ─────────────
export function resolveActions(actions: AiAction[], d: ActionCtx): Op[] {
  const ops: Op[] = []
  const seen = new Set<string>()
  for (const a of actions) {
    const auto = AUTO_ACTIONS.includes(a.type)
    const bad = (label: string, why: string): Op => ({ id: nid(), type: a.type, auto, label, status: 'error', invalid: true, result: why })
    const sig = JSON.stringify(a); if (seen.has(sig)) continue; seen.add(sig)

    if (a.type === 'valider_commande') {
      const o = findOrder(a.commande, d)
      if (!o) { ops.push(bad(`Valider la commande ${a.commande ?? '?'}`, 'commande introuvable')); continue }
      if (o.status !== 'confirmee') { ops.push(bad(`Valider la commande ${o.id} (${who(o)})`, `déjà « ${STATUS_FR[o.status] ?? o.status} » — rien à faire`)); continue }
      ops.push({ id: nid(), type: a.type, auto, status: 'pending', label: `Valider la commande **${o.id}** de ${who(o)} — ${fcfa(o.total)}`,
        run: async () => {
          const { error } = await supabase.rpc('admin_set_order_status', { p_order: o.id, p_status: 'preparation' })
          return error ? { ok: false, text: errText(error.message) } : { ok: true, text: `Commande **${o.id}** (${who(o)}, ${fcfa(o.total)}) passée de « Nouvelle » à **« En préparation »**.` }
        } })
      continue
    }

    if (a.type === 'envoyer_reinitialisation') {
      const r = findReset(a, d)
      if (!r) { ops.push(bad(`Code mot de passe pour ${a.client ?? a.demande ?? '?'}`, (d.resetRequests ?? []).some((x) => x.status === 'en_attente') ? 'demande introuvable : précisez le client' : 'aucune demande de code en attente')); continue }
      const nm = shortName(r.customer_name)
      ops.push({ id: nid(), type: a.type, auto, status: 'pending', label: `Préparer le code de réinitialisation pour **${nm}** (WhatsApp)`,
        run: async () => {
          const { data, error } = await supabase.rpc('admin_prepare_reset', { p_request: r.id })
          if (error || !data?.code) return { ok: false, text: error?.message.includes('ALREADY') ? `la demande de ${nm} a déjà été traitée` : 'impossible de générer le code' }
          // Le code n’apparaît JAMAIS dans la conversation (elle est envoyée à l’IA) : seulement dans le lien WhatsApp
          return { ok: true, text: `Code à 6 chiffres généré pour **${nm}** (valable 30 min, enregistré chiffré). Message WhatsApp prêt : appuyez sur le bouton vert puis sur Envoyer.`,
            wa: { href: clientWaLink(r.phone, resetMessage(r.customer_name, data.code)), label: `Envoyer le code à ${nm} sur WhatsApp` } }
        } })
      continue
    }

    if (a.type === 'changer_statut_commande') {
      const o = findOrder(a.commande, d)
      const st = norm(a.statut ?? '').replace(/e$/, 'e')
      const target = ({ preparation: 'preparation', 'en preparation': 'preparation', expediee: 'expediee', expedie: 'expediee', livree: 'livree', livre: 'livree', annulee: 'annulee', annule: 'annulee' } as Record<string, string>)[st]
      if (!o) { ops.push(bad(`Changer le statut de ${a.commande ?? '?'}`, 'commande introuvable')); continue }
      if (!target) { ops.push(bad(`Changer le statut de ${o.id}`, `statut « ${a.statut} » inconnu`)); continue }
      if (o.status === 'annulee') { ops.push(bad(`Changer le statut de ${o.id}`, 'commande annulée : impossible de la modifier')); continue }
      if (o.status === target) { ops.push(bad(`Passer ${o.id} en « ${STATUS_FR[target]} »`, 'elle a déjà ce statut')); continue }
      const motif = String(a.motif ?? '').slice(0, 200) || null
      ops.push({ id: nid(), type: a.type, auto, status: 'pending', label: `Passer la commande **${o.id}** (${who(o)}) de « ${STATUS_FR[o.status]} » à **« ${STATUS_FR[target]} »**${target === 'annulee' ? ` — motif : ${motif ?? 'non précisé'} (le stock sera remis)` : ''}`,
        run: async () => {
          const { error } = target === 'annulee'
            ? await supabase.rpc('admin_update_order', { p_order: o.id, p_status: 'annulee', p_reason: motif })
            : await supabase.rpc('admin_set_order_status', { p_order: o.id, p_status: target })
          return error ? { ok: false, text: errText(error.message) } : { ok: true, text: `Commande **${o.id}** → **« ${STATUS_FR[target]} »**.` }
        } })
      continue
    }

    if (a.type === 'modifier_prix' || a.type === 'retirer_produit' || a.type === 'remettre_en_vente') {
      const { c, error } = findProductByName(a.produit, d.catalog)
      const what = a.type === 'modifier_prix' ? 'Modifier le prix' : a.type === 'retirer_produit' ? 'Retirer du site' : 'Remettre en vente'
      if (!c) { ops.push(bad(`${what} : ${a.produit ?? '?'}`, error!)); continue }
      if (a.type === 'modifier_prix') {
        const price = Math.round(Number(a.prix))
        if (!Number.isFinite(price) || price < 100 || price > 10_000_000) { ops.push(bad(`Modifier le prix de ${c.name}`, 'prix invalide')); continue }
        let compare: number | null = a.prix_barre === undefined ? c.compare_at : a.prix_barre === null ? null : Math.round(Number(a.prix_barre))
        let note = ''
        if (compare !== null && (!Number.isFinite(compare) || compare <= price)) { if (a.prix_barre !== undefined) { ops.push(bad(`Modifier le prix de ${c.name}`, 'le prix barré doit être supérieur au nouveau prix')); continue } compare = null; note = ' (ancien prix barré retiré car inférieur au nouveau prix)' }
        if (price === c.price && compare === c.compare_at) { ops.push(bad(`Modifier le prix de ${c.name}`, 'c’est déjà le prix actuel')); continue }
        const drop = price < c.price
        ops.push({ id: nid(), type: a.type, auto, status: 'pending', label: `Prix de **${c.name}** : ${fcfa(c.price)} → **${fcfa(price)}**${compare ? ` (prix barré ${fcfa(compare)})` : ''}${note}${drop ? ' — badge « Nouveau prix » 14 jours' : ''}`,
          run: async () => {
            const { error: e } = await supabase.rpc('admin_update_product', { p_id: c.id, p_price: price, p_compare_at: compare, p_active: c.active, p_low: null })
            return e ? { ok: false, text: errText(e.message) } : { ok: true, text: `Prix de **${c.name}** changé : ${fcfa(c.price)} → **${fcfa(price)}**${drop ? ' (badge « Nouveau prix » affiché)' : ''}.` }
          } })
      } else {
        const active = a.type === 'remettre_en_vente'
        if (c.active === active) { ops.push(bad(`${what} : ${c.name}`, active ? 'déjà en vente' : 'déjà retiré')); continue }
        ops.push({ id: nid(), type: a.type, auto, status: 'pending', label: `${what} : **${c.name}**`,
          run: async () => {
            const { error: e } = await supabase.rpc('admin_update_product', { p_id: c.id, p_price: c.price, p_compare_at: c.compare_at, p_active: active, p_low: null })
            return e ? { ok: false, text: errText(e.message) } : { ok: true, text: `**${c.name}** ${active ? 'remis en vente' : 'retiré du site'}.` }
          } })
      }
      continue
    }

    if (a.type === 'mouvement_stock') {
      const { c, error } = findProductByName(a.produit, d.catalog)
      const kind = a.mouvement ?? 'entree'
      const qty = Math.round(Number(a.quantite))
      if (!c) { ops.push(bad(`Stock : ${a.produit ?? '?'}`, error!)); continue }
      if (!['entree', 'sortie', 'ajustement'].includes(kind) || !Number.isFinite(qty) || qty < (kind === 'ajustement' ? 0 : 1) || qty > 100000) { ops.push(bad(`Stock de ${c.name}`, 'quantité invalide')); continue }
      if (kind === 'sortie' && qty > c.stock) { ops.push(bad(`Sortie de stock : ${c.name}`, `seulement ${c.stock} en stock`)); continue }
      const after = kind === 'entree' ? c.stock + qty : kind === 'sortie' ? c.stock - qty : qty
      const note = String(a.note ?? '').slice(0, 200) || 'Via l’Assistant IA'
      ops.push({ id: nid(), type: a.type, auto, status: 'pending', label: `Stock de **${c.name}** : ${kind === 'entree' ? `entrée de ${qty}` : kind === 'sortie' ? `sortie de ${qty}` : `ajustement à ${qty}`} (${c.stock} → **${after}**)`,
        run: async () => {
          const { error: e } = await supabase.rpc('admin_stock_move', { p_id: c.id, p_kind: kind, p_qty: qty, p_note: note })
          return e ? { ok: false, text: errText(e.message) } : { ok: true, text: `Stock de **${c.name}** : ${c.stock} → **${after}**.` }
        } })
      continue
    }

    if (a.type === 'repondre_avis' || a.type === 'masquer_avis') {
      const r = (d.reviews ?? []).find((x) => x.id === Number(a.avis))
      if (!r) { ops.push(bad(a.type === 'repondre_avis' ? 'Répondre à un avis' : 'Masquer un avis', 'avis introuvable')); continue }
      if (a.type === 'repondre_avis') {
        const txt = String(a.texte ?? '').trim().slice(0, 600)
        if (txt.length < 2) { ops.push(bad(`Répondre à l’avis de ${r.author}`, 'réponse vide')); continue }
        ops.push({ id: nid(), type: a.type, auto, status: 'pending', label: `Publier une réponse à l’avis de **${r.author}** (${r.rating}★, ${r.product_name}) : « ${txt} »`,
          run: async () => { const { error: e } = await supabase.rpc('admin_review_action', { p_id: r.id, p_status: null, p_reply: txt }); return e ? { ok: false, text: errText(e.message) } : { ok: true, text: `Réponse publiée sous l’avis de **${r.author}** (${r.product_name}).` } } })
      } else {
        ops.push({ id: nid(), type: a.type, auto, status: 'pending', label: `Masquer l’avis de **${r.author}** (${r.rating}★, ${r.product_name})`,
          run: async () => { const { error: e } = await supabase.rpc('admin_review_action', { p_id: r.id, p_status: 'masque', p_reply: null }); return e ? { ok: false, text: errText(e.message) } : { ok: true, text: `Avis de **${r.author}** masqué du site.` } } })
      }
      continue
    }
    ops.push(bad(`Action « ${String(a.type)} »`, 'action inconnue : je ne peux pas la faire'))
  }
  return ops
}

/** Exécute une opération et la journalise (le résultat remplace le libellé dans le résumé) */
export async function runOp(op: Op): Promise<Op> {
  if (!op.run || op.invalid) return op
  try {
    const r = await op.run()
    void log(op.type, r.text.replace(/\*\*/g, ''), op.auto, r.ok)
    return { ...op, status: r.ok ? 'done' : 'error', result: r.text, wa: r.wa }
  } catch (e) {
    return { ...op, status: 'error', result: errText(String((e as Error)?.message ?? e)) }
  }
}

// ───────────── Commandes reconnues sans IA (moteur intégré / aperçu) ─────────────
export function parseCommand(question: string, d: ActionCtx): AiAction[] | null {
  const q = norm(question)
  const ids = [...q.matchAll(/ys-?[a-z0-9]{3,9}/g)].map((m) => m[0])
  // « valide la commande YS-… », « valide toutes les nouvelles commandes »
  if (/(^|\s)(valide|valider|validez|confirme|confirmer|traite|traiter|accepte)(\s|$)/.test(q) && /commande/.test(q)) {
    if (ids.length) return ids.map((commande) => ({ type: 'valider_commande', commande }))
    if (/(toutes|tout|les commandes|nouvelles|en attente)/.test(q)) return d.orders.filter((o) => o.status === 'confirmee').slice(0, 10).map((o) => ({ type: 'valider_commande', commande: o.id }))
  }
  // « envoie les codes de réinitialisation », « envoie le code mot de passe à Aya »
  if (/(envoie|envoyer|envoyez|prepare|preparer|traite|traiter|genere|generer)/.test(q) && /(code|mot de passe|mdp|reinitialis)/.test(q)) {
    const pend = (d.resetRequests ?? []).filter((r) => r.status === 'en_attente')
    const named = pend.filter((r) => norm(r.customer_name ?? '').split(' ').some((w) => w.length > 2 && q.includes(w)))
    const list = named.length ? named : pend
    return list.slice(0, 10).map((r) => ({ type: 'envoyer_reinitialisation', demande: `R${pend.indexOf(r) + 1}` }))
  }
  // « passe la commande YS-… en expédiée / livrée / annulée »
  if (ids.length && /(expedi|livr|annul|preparation)/.test(q)) {
    const statut = /expedi/.test(q) ? 'expediee' : /livr/.test(q) ? 'livree' : /annul/.test(q) ? 'annulee' : 'preparation'
    return ids.map((commande) => ({ type: 'changer_statut_commande', commande, statut }))
  }
  // « mets le prix de Coque Cuir à 8 000 », « baisse Beurre de karité à 7500 F »
  const pm = q.match(/(?:prix|baisse|augmente|mets|passe)\s+(?:du |de la |de l |de |des |le |la |les )?(.+?)\s+(?:a|à)\s+(\d[\d ]{1,9})\s*(?:f|fcfa|francs?)?$/)
  if (pm) return [{ type: 'modifier_prix', produit: pm[1].replace(/^(prix|le prix)\s+(du |de la |de |des )?/, ''), prix: Number(pm[2].replace(/\s/g, '')) }]
  // « ajoute 10 Coque Cuir au stock », « reçu 12 Beurre de karité »
  const sm = q.match(/(?:ajoute|ajouter|recu|reception|entree de|rentre)\s+(\d{1,5})\s+(?:x\s+)?(.+?)(?:\s+(?:au|en)\s+stock)?$/)
  if (sm) return [{ type: 'mouvement_stock', mouvement: 'entree', quantite: Number(sm[1]), produit: sm[2] }]
  // « retire Coque Cuir du site »
  const rm = q.match(/(?:retire|retirer|desactive|cache)\s+(?:l article\s+)?(.+?)(?:\s+du site|\s+de la vente|\s+de la boutique)?$/)
  if (rm && !/commande|avis/.test(rm[1])) return [{ type: 'retirer_produit', produit: rm[1] }]
  return null
}

/** Texte d’introduction (moteur intégré) */
export function localIntro(ops: Op[]) {
  const auto = ops.filter((o) => o.auto && !o.invalid), conf = ops.filter((o) => !o.auto && !o.invalid), bad = ops.filter((o) => o.invalid)
  const parts: string[] = []
  if (auto.length) parts.push(`C’est fait ✅ J’ai traité **${auto.length} action${auto.length > 1 ? 's' : ''}** autorisée${auto.length > 1 ? 's' : ''} sans attendre (vous m’y avez autorisé).`)
  if (conf.length) parts.push(`J’ai besoin de **votre accord** pour ${conf.length > 1 ? `ces ${conf.length} modifications` : 'cette modification'} : vérifiez puis cliquez sur **Confirmer**.`)
  if (bad.length && !auto.length && !conf.length) parts.push('Je n’ai rien pu faire :')
  return parts.join('\n\n') || 'Voici le détail :'
}

/** Résumé final des actions (texte simple, pour la copie et l’historique) */
export function opsSummary(ops: Op[]) {
  const done = ops.filter((o) => o.status === 'done'), err = ops.filter((o) => o.status === 'error')
  return [done.length ? `Fait : ${done.map((o) => (o.result ?? o.label).replace(/\*\*/g, '')).join(' ; ')}` : '', err.length ? `Non fait : ${err.map((o) => `${o.label.replace(/\*\*/g, '')} (${o.result})`).join(' ; ')}` : ''].filter(Boolean).join('\n')
}

/** Données transmises à l’IA pour qu’elle puisse désigner les actions (jamais de téléphone, d’e-mail ni de code) */
export function actionFacts(d: ActionCtx) {
  const pend = (d.resetRequests ?? []).filter((r) => r.status === 'en_attente')
  const h = (iso: string) => { const x = (Date.now() - new Date(iso).getTime()) / 3600000; return x < 1 ? `il y a ${Math.max(1, Math.round(x * 60))} min` : x < 24 ? `il y a ${Math.round(x)} h` : `il y a ${Math.round(x / 24)} j` }
  return {
    demandes_code_mot_de_passe_en_attente: pend.slice(0, 15).map((r, i) => ({ ref: `R${i + 1}`, client: shortName(r.customer_name), depuis: h(r.created_at) })),
    commandes_expediees_a_livrer: d.orders.filter((o) => o.status === 'expediee').slice(0, 15).map((o) => ({ id: o.id, client: who(o), total: o.total, depuis: h(o.created_at) })),
    avis_clients: (() => {
      const rv = (d.reviews ?? []), pub = rv.filter((r) => r.status === 'publie')
      return {
        publies: pub.length, note_moyenne: pub.length ? Math.round((pub.reduce((a, r) => a + r.rating, 0) / pub.length) * 10) / 10 : null,
        non_lus: rv.filter((r) => !r.seen).length, sans_reponse: pub.filter((r) => !r.reply).length,
        recents: rv.slice(0, 12).map((r) => ({ id: r.id, article: r.product_name, client: shortName(r.author), note: r.rating, avis: r.comment.slice(0, 160), repondu: !!r.reply, masque: r.status === 'masque' || undefined, quand: h(r.created_at) })),
      }
    })(),
  }
}
