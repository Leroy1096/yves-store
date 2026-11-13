import { Loader2, Search, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { allProducts, type CatalogRow } from '../../lib/catalog'
import { normalizePhone } from '../../lib/auth-utils'
import { cn } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import { orderMessage, type WaRequest } from '../../lib/whatsapp'

// ───────────── Types ─────────────
export interface AdminOrderLine { id?: string; name: string; qty: number; price: number; image?: string; size?: string; color?: string }
export interface AdminOrder {
  id: string
  user_id: string | null
  status: string
  customer: { firstName?: string; lastName?: string; phone?: string; email?: string }
  address: { city?: string; commune?: string; details?: string }
  shipping: string
  payment: string
  lines: AdminOrderLine[]
  subtotal: number
  discount: number
  shipping_cost: number
  total: number
  created_at: string
  cancelled_at: string | null
  cancel_reason: string | null
}
export interface Movement { id: number; product_id: string; kind: 'entree' | 'sortie' | 'ajustement' | 'vente' | 'retour'; qty: number; stock_after: number; note: string | null; order_id: string | null; created_at: string }
export interface Client {
  id: string; first_name: string | null; last_name: string | null; email: string | null; phone: string | null; contact_phone: string | null
  signup_method: string | null; city: string | null; commune: string | null; created_at: string; last_sign_in_at: string | null
  blocked: boolean; is_admin: boolean; orders_count: number; total_spent: number; last_order_at: string | null
}
/** Journal « mot de passe oublié » : jamais de code ni de mot de passe, prénom + initiale uniquement */
export interface ResetLog { id: number; user_id: string | null; customer_name: string | null; channel: 'whatsapp' | 'email'; event: 'demande' | 'envoye' | 'reussi' | 'echec' | 'limite'; detail: string | null; created_at: string }
export type { CatalogRow }

// ───────────── Données ─────────────
export async function fetchOrders() {
  const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(2000)
  if (error) throw new Error(error.message)
  return (data ?? []) as AdminOrder[]
}
export async function fetchCatalog() {
  const { data, error } = await supabase.from('catalog_products').select('*').order('id')
  if (error) throw new Error(error.message)
  return (data ?? []) as CatalogRow[]
}
export async function fetchMovements() {
  const { data, error } = await supabase.from('stock_movements').select('*').order('created_at', { ascending: false }).limit(2000)
  if (error) throw new Error(error.message)
  return (data ?? []) as Movement[]
}
export async function fetchResetLog(days = 90) {
  const { data, error } = await supabase.from('password_reset_log').select('id,user_id,customer_name,channel,event,detail,created_at')
    .gte('created_at', new Date(Date.now() - days * 86400000).toISOString()).order('created_at', { ascending: false }).limit(500)
  if (error) throw new Error(error.message)
  return (data ?? []) as ResetLog[]
}
export const RESET_EVENT_FR: Record<ResetLog['event'], string> = { demande: 'Demande', envoye: 'Envoyé', reussi: 'Réinitialisé', echec: 'Code incorrect', limite: 'Bloqué (trop de demandes)' }
export const RESET_CHANNEL_FR: Record<ResetLog['channel'], string> = { whatsapp: 'WhatsApp', email: 'E-mail' }
export async function fetchClients() {
  const { data, error } = await supabase.rpc('admin_list_clients')
  if (error) throw new Error(error.message)
  return (data ?? []) as Client[]
}
/** Message d’erreur lisible à partir d’une erreur Postgres */
export const errMsg = (e: unknown) => {
  const m = (e as { message?: string })?.message ?? String(e)
  if (m.includes('FORBIDDEN')) return 'Action réservée aux gérants.'
  return m.replace(/^.*?ERROR:\s*/, '')
}

export const productInfo = (id?: string) => allProducts.find((p) => p.id === id)
export { CATEGORY_LABELS as CATEGORY_FR } from '../../lib/catalog'

export const ORDER_STATUS: Record<string, { label: string; cls: string }> = {
  confirmee: { label: 'Nouvelle', cls: 'bg-sky-100 text-sky-800' },
  preparation: { label: 'En préparation', cls: 'bg-amber-100 text-amber-800' },
  expediee: { label: 'Expédiée', cls: 'bg-violet-100 text-violet-800' },
  livree: { label: 'Livrée', cls: 'bg-emerald-100 text-emerald-800' },
  annulee: { label: 'Annulée', cls: 'bg-red-100 text-red-700' },
}
export const MOVE_KIND: Record<Movement['kind'], { label: string; cls: string }> = {
  entree: { label: 'Entrée', cls: 'bg-emerald-100 text-emerald-800' },
  retour: { label: 'Retour (annulation)', cls: 'bg-teal-100 text-teal-800' },
  vente: { label: 'Vente', cls: 'bg-sky-100 text-sky-800' },
  sortie: { label: 'Sortie manuelle', cls: 'bg-orange-100 text-orange-800' },
  ajustement: { label: 'Inventaire', cls: 'bg-ink/10 text-ink-700' },
}

export const customerName = (o: AdminOrder) => `${o.customer?.firstName ?? ''} ${o.customer?.lastName ?? ''}`.trim() || 'Client'
export const dateTime = (d: string) => new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
export const dateOnly = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })

/** Lien WhatsApp vers le client avec le message de suivi / annulation pré-rempli */
export function orderWaLink(o: AdminOrder, kind: 'order_tracking' | 'order_cancel' = 'order_tracking') {
  const phone = normalizePhone(o.customer?.phone ?? '')
  if (!phone) return null
  const req: WaRequest = {
    id: '', kind, user_id: o.user_id, phone, customer_name: customerName(o), order_id: o.id, status: 'en_attente', code_expires_at: null, created_at: o.created_at, sent_at: null,
    payload: { status: o.status, total: o.total, lines: o.lines, shipping: o.shipping, cancel_reason: o.cancel_reason, motif: kind === 'order_cancel' ? 'confirmation' : 'suivi' },
  }
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(orderMessage(req))}`
}

/** Export CSV (Excel) */
export function downloadCsv(name: string, rows: (string | number | null | undefined)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n')
  const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a'); a.href = url; a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ───────────── UI ─────────────
export function PageHead({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">{title}</h1>
        {sub && <p className="mt-1 text-sm text-ink-500">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-2xl border border-ink/10 bg-white', className)}>{children}</div>
}

export function Stat({ label, value, hint, icon, tone = 'default' }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode; tone?: 'default' | 'green' | 'orange' | 'red' | 'gold' }) {
  const toneCls = { default: 'bg-ivory-200 text-ink', green: 'bg-emerald-100 text-emerald-700', orange: 'bg-orange-100 text-orange-700', red: 'bg-red-100 text-red-700', gold: 'bg-gold/15 text-gold-dark' }[tone]
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">{label}</p>
        {icon && <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg', toneCls)}>{icon}</span>}
      </div>
      <p className="mt-2 font-display text-[28px] font-semibold leading-none tabular-nums">{value}</p>
      {hint && <p className="mt-1.5 text-xs text-ink-400">{hint}</p>}
    </Card>
  )
}

export function Badge({ children, cls }: { children: ReactNode; cls: string }) {
  return <span className={cn('inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold', cls)}>{children}</span>
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative min-w-[220px] flex-1">
      <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-ink/15 bg-white py-2.5 pl-10 pr-9 text-sm outline-none focus:border-gold focus:ring-4 focus:ring-gold/15" />
      {value && <button onClick={() => onChange('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-400 hover:text-ink" aria-label="Effacer"><X size={14} /></button>}
    </div>
  )
}

export function Pills<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { id: T; label: string; count?: number }[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={o.id} onClick={() => onChange(o.id)} className={cn('rounded-full px-3.5 py-1.5 text-xs font-semibold transition', value === o.id ? 'bg-ink text-ivory' : 'bg-white text-ink-500 ring-1 ring-ink/10 hover:text-ink')}>
          {o.label}{o.count !== undefined && <span className={cn('ml-1.5 rounded-full px-1.5', value === o.id ? 'bg-ivory/20' : 'bg-ink/5')}>{o.count}</span>}
        </button>
      ))}
    </div>
  )
}

export const Loading = () => <div className="grid place-items-center py-20"><Loader2 className="animate-spin text-gold" size={28} /></div>
export const ErrorBox = ({ msg }: { msg: string }) => <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{msg}</div>
export const Empty = ({ children }: { children: ReactNode }) => <div className="rounded-2xl border border-dashed border-ink/20 px-6 py-14 text-center text-sm text-ink-500">{children}</div>
