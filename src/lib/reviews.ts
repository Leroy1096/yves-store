/**
 * Avis clients enregistrés dans la base (table product_reviews).
 * - Seuls les clients connectés peuvent publier (un avis par article, modifiable).
 * - Le gérant reçoit un e-mail à chaque nouvel avis et peut répondre ou masquer.
 * - Les notes affichées sur les cartes produits sont les VRAIES moyennes.
 */
import { allProducts, useCatalogVersion } from './catalog'
import { supabase, supabaseReady } from './supabase'

export interface PublicReview {
  id: number; author: string; city: string | null; rating: number; title: string | null; comment: string
  verified: boolean; reply: string | null; replied_at: string | null; created_at: string; mine: boolean; hidden: boolean
}
export interface ReviewStat { product_id: string; avg_rating: number; review_count: number; dist: number[] }

const KEY = 'yves-review-stats-v1'
const statsById = new Map<string, ReviewStat>()

/** Notes réelles → cartes produits (les notes « d’exemple » du catalogue de départ sont effacées) */
function applyStats(rows: ReviewStat[]) {
  statsById.clear(); rows.forEach((r) => statsById.set(r.product_id, r))
  for (const p of allProducts) {
    const s = statsById.get(p.id)
    p.rating = s ? Number(s.avg_rating) : 0
    p.reviewCount = s ? s.review_count : 0
  }
  useCatalogVersion.setState((s) => ({ v: s.v + 1 }))
}

export const reviewStat = (id: string) => statsById.get(id)

export async function refreshReviewStats() {
  const { data, error } = await supabase.rpc('product_review_stats')
  if (error || !Array.isArray(data)) return
  applyStats(data as ReviewStat[])
  try { localStorage.setItem(KEY, JSON.stringify(data)) } catch { /* quota */ }
}

/** Au démarrage : cache local immédiat, puis données fraîches */
export function initReviewStats() {
  if (!supabaseReady) return
  let cached: ReviewStat[] = []
  try { cached = JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { cached = [] }
  applyStats(Array.isArray(cached) ? cached : [])
  void refreshReviewStats()
}

export async function fetchReviews(productId: string) {
  const { data, error } = await supabase.rpc('public_product_reviews', { p_product: productId })
  if (error) throw new Error(error.message)
  return (data ?? []) as PublicReview[]
}

export function reviewError(msg: string) {
  if (msg.includes('NOT_AUTHENTICATED')) return 'Connectez-vous pour publier un avis.'
  if (msg.includes('ADMIN_CANNOT_REVIEW')) return 'Un compte gérant ne peut pas noter les articles.'
  if (msg.includes('INVALID_COMMENT')) return 'Votre avis doit contenir entre 10 et 1 000 caractères.'
  if (msg.includes('INVALID_RATING')) return 'Choisissez une note de 1 à 5 étoiles.'
  if (msg.includes('RATE_LIMIT')) return 'Vous avez publié beaucoup d’avis aujourd’hui. Réessayez demain.'
  if (msg.includes('PRODUCT_UNAVAILABLE')) return 'Cet article n’est plus en vente.'
  return 'Votre avis n’a pas pu être enregistré. Vérifiez votre connexion puis réessayez.'
}

export async function submitReview(productId: string, rating: number, title: string, comment: string) {
  const { error } = await supabase.rpc('submit_review', { p_product: productId, p_rating: rating, p_title: title, p_comment: comment })
  if (error) return { ok: false as const, error: reviewError(error.message) }
  void refreshReviewStats()
  return { ok: true as const }
}

export async function deleteMyReview(productId: string) {
  const { error } = await supabase.rpc('delete_my_review', { p_product: productId })
  if (!error) void refreshReviewStats()
  return !error
}

export const reviewDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
