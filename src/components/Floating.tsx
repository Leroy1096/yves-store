import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUp, Check, ChevronRight, Copy, Gift, MessageCircle, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getProduct } from '../data/products'
import { PHONE_DISPLAY, WA_TOPICS, waClientMessage, waLink, type WaTopic } from '../lib/contact'
import { fcfa } from '../lib/format'
import { cn } from '../lib/format'
import { useAuth } from '../store/auth'
import { Social } from './ui'

export const coupons = [
  { code: 'BIENVENUE', value: '-5 000 F', cond: 'dès 30 000 FCFA d’achat', tag: 'Nouveaux clients' },
  { code: 'YVES10', value: '-10 %', cond: 'sur toute la commande', tag: 'Tout le monde' },
  { code: 'LIVRAISON', value: 'Offerte', cond: 'livraison dès 50 000 FCFA', tag: 'Automatique', auto: true },
]

export function CouponTicket({ c, dark = false }: { c: (typeof coupons)[number]; dark?: boolean }) {
  const [copied, setCopied] = useState(false)
  const copy = () => { if (c.auto) return; navigator.clipboard?.writeText(c.code).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1800) }
  return (
    <div className={cn('relative flex min-w-[240px] items-stretch overflow-hidden rounded-xl border', dark ? 'border-gold/40 bg-gold/10 text-ivory' : 'border-red-200 bg-gradient-to-r from-red-50 to-orange-50 text-ink')}>
      <div className="flex w-[100px] shrink-0 flex-col items-center justify-center px-2 py-3 text-center">
        <span className={cn('whitespace-nowrap text-lg font-black leading-none', dark ? 'text-gold-light' : 'text-red-600')}>{c.value}</span>
        <span className={cn('mt-1 text-[9px] font-bold uppercase', dark ? 'text-ivory/60' : 'text-red-500')}>{c.tag}</span>
      </div>
      <div className={cn('my-2 border-l border-dashed', dark ? 'border-gold/40' : 'border-red-300')} />
      <div className="flex min-w-0 flex-1 items-center justify-between gap-2 px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold">{c.auto ? 'Sans code' : c.code}</p>
          <p className={cn('text-[11px] leading-tight', dark ? 'text-ivory/60' : 'text-ink-500')}>{c.cond}</p>
        </div>
        {!c.auto && (
          <button onClick={copy} className={cn('flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition', copied ? 'bg-green-600 text-white' : dark ? 'bg-gold text-ink' : 'bg-red-600 text-white hover:bg-red-700')}>
            {copied ? <><Check size={12} /> Copié</> : <><Copy size={11} /> Copier</>}
          </button>
        )}
      </div>
      <span className="absolute -top-2 left-[94px] h-4 w-4 rounded-full bg-white" />
      <span className="absolute -bottom-2 left-[94px] h-4 w-4 rounded-full bg-white" />
    </div>
  )
}

/** Bouton WhatsApp : le client choisit sa demande, le message part pré-rempli à son nom */
function WhatsAppMenu() {
  const [open, setOpen] = useState(false)
  const profile = useAuth((s) => s.profile)
  const { pathname } = useLocation()
  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [open])
  const slug = pathname.match(/^\/produit\/([^/?#]+)/)?.[1]
  const prod = slug ? getProduct(decodeURIComponent(slug)) : undefined
  const ctx = {
    name: profile ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || undefined : undefined,
    product: prod ? `${prod.name} — ${fcfa(prod.price)}` : undefined,
  }
  const href = (t?: WaTopic) => waLink(waClientMessage(t, { ...ctx, product: !t || t.id === 'achat' ? ctx.product : undefined }))
  const Item = ({ t }: { t: WaTopic }) => (
    <a href={href(t)} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} data-testid={`wa-topic-${t.id}`}
      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-ink transition hover:bg-[#25D366]/10">
      <span className="text-base leading-none">{t.emoji}</span><span className="flex-1">{t.label}</span><ChevronRight size={14} className="text-ink-300" />
    </a>
  )
  return (
    <div className="relative">
      <AnimatePresence>
        {open && (
          <>
            <button aria-label="Fermer" className="fixed inset-0 z-0 cursor-default" onClick={() => setOpen(false)} />
            <motion.div role="dialog" aria-label="Écrire à YVES STORE sur WhatsApp" data-testid="wa-menu"
              initial={{ opacity: 0, y: 12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.96 }} transition={{ duration: 0.18 }}
              className="absolute bottom-14 right-0 z-10 w-[min(320px,calc(100vw-24px))] origin-bottom-right overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-ink/10">
              <div className="flex items-center gap-3 bg-[#075E54] px-4 py-3 text-white">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15"><Social.WhatsApp size={18} /></span>
                <div className="min-w-0 flex-1"><p className="text-sm font-bold">YVES STORE</p><p className="truncate text-[11px] text-white/75">Choisissez votre demande · {PHONE_DISPLAY}</p></div>
                <button onClick={() => setOpen(false)} aria-label="Fermer" className="p-1 text-white/70 hover:text-white"><X size={16} /></button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-2">
                <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-400">🛒 1. J’ai un besoin</p>
                {WA_TOPICS.filter((t) => t.group === 'besoin').map((t) => <Item key={t.id} t={t} />)}
                <p className="px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-400">🛠️ 2. J’ai un problème</p>
                {WA_TOPICS.filter((t) => t.group === 'probleme').map((t) => <Item key={t.id} t={t} />)}
                <a href={href()} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} data-testid="wa-topic-autre"
                  className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-3 py-2.5 text-[13px] font-bold text-white hover:bg-[#1ebe5a]">
                  <MessageCircle size={15} /> Autre demande
                </a>
              </div>
              <p className="border-t border-ink/5 px-4 py-2 text-center text-[10.5px] text-ink-400">WhatsApp s’ouvre avec votre message prêt : complétez-le puis appuyez sur Envoyer.</p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <button onClick={() => setOpen((v) => !v)} aria-label="Écrire à YVES STORE sur WhatsApp" aria-expanded={open} title="Écrivez-nous sur WhatsApp" data-testid="wa-fab"
        className="relative z-10 grid h-12 w-12 place-items-center rounded-full bg-[#25D366] text-white shadow-xl shadow-black/15 transition hover:scale-110">
        {open ? <X size={22} /> : <Social.WhatsApp size={24} />}
      </button>
    </div>
  )
}

/** Widgets flottants : cadeau de bienvenue, WhatsApp, retour en haut, invitation à se connecter */
export default function Floating({ raised = false, bottomNav = false }: { raised?: boolean; bottomNav?: boolean }) {
  const user = useAuth((s) => s.user)
  const ready = useAuth((s) => s.ready)
  const [top, setTop] = useState(false)
  const [gift, setGift] = useState(false)
  const [prompt, setPrompt] = useState(() => { try { return !sessionStorage.getItem('yves-prompt-off') } catch { return true } })

  useEffect(() => {
    const on = () => setTop(window.scrollY > 900)
    on(); window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  const showPrompt = ready && !user && prompt
  const closePrompt = () => { setPrompt(false); try { sessionStorage.setItem('yves-prompt-off', '1') } catch { /* stockage bloqué */ } }
  const base = raised ? 'bottom-24 lg:bottom-6' : bottomNav ? (showPrompt ? 'bottom-[124px] lg:bottom-6' : 'bottom-[74px] lg:bottom-6') : 'bottom-6'

  return (
    <>
      <div className={cn('fixed right-3 z-30 flex flex-col items-center gap-2.5 transition-all sm:right-5', base)}>
        {ready && !user && (
          <motion.button
            onClick={() => setGift(true)} aria-label="Cadeau de bienvenue"
            animate={{ rotate: [0, -10, 10, -6, 6, 0] }} transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 4 }}
            className={cn('relative h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-red-500 to-orange-400 text-white shadow-xl shadow-red-600/30', showPrompt && !raised ? 'hidden lg:grid' : 'grid')}
          >
            <Gift size={22} />
            <span className="absolute -right-1 -top-1 rounded-full bg-ink px-1.5 py-0.5 text-[8px] font-black text-gold-light">-5K</span>
          </motion.button>
        )}
        <WhatsAppMenu />
        <AnimatePresence>
          {top && (
            <motion.button initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Revenir en haut" className="grid h-11 w-11 place-items-center rounded-full border border-ink/10 bg-white text-ink shadow-lg hover:bg-ink hover:text-ivory">
              <ArrowUp size={18} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Invitation à se connecter */}
      <AnimatePresence>
        {showPrompt && !raised && (
          <motion.div
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ delay: 1.2 }}
            className={cn('fixed z-30 flex items-center gap-3 bg-ink/95 text-ivory shadow-2xl backdrop-blur',
              bottomNav ? 'inset-x-0 bottom-[58px] px-4 py-2.5 lg:inset-x-auto lg:bottom-6 lg:left-6 lg:max-w-md lg:rounded-2xl lg:py-3' : 'bottom-6 left-6 max-w-md rounded-2xl px-4 py-3 max-sm:inset-x-3')}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold text-ink"><Gift size={17} /></span>
            <p className="min-w-0 flex-1 text-xs leading-snug sm:text-[13px]"><b>Connectez-vous</b> et profitez de <span className="text-gold-light">-5 000 FCFA</span><span className="hidden sm:inline"> et du suivi de commande</span></p>
            <Link to="/compte" className="shrink-0 rounded-full bg-gold px-3.5 py-1.5 text-xs font-bold text-ink hover:bg-gold-light">Connexion</Link>
            <button onClick={closePrompt} className="shrink-0 p-1 text-ivory/60 hover:text-ivory" aria-label="Fermer"><X size={16} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modale cadeau */}
      <AnimatePresence>
        {gift && (
          <>
            <motion.div className="fixed inset-0 z-[70] bg-ink/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setGift(false)} />
            <div className="pointer-events-none fixed inset-0 z-[71] grid place-items-center p-4">
              <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: 'spring', damping: 22, stiffness: 300 }} className="pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-3xl bg-white text-center shadow-2xl">
                <button onClick={() => setGift(false)} className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/20 text-white hover:bg-white/30" aria-label="Fermer"><X size={16} /></button>
                <div className="bg-gradient-to-br from-red-600 via-red-500 to-orange-400 px-6 pb-8 pt-7 text-white">
                  <Gift size={36} className="mx-auto" />
                  <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-white/80">Cadeau de bienvenue</p>
                  <p className="mt-1 text-4xl font-black">-5 000 FCFA</p>
                  <p className="mt-1 text-sm text-white/85">sur votre première commande</p>
                </div>
                <div className="-mt-4 space-y-2.5 rounded-t-3xl bg-white p-5">
                  {coupons.slice(0, 2).map((c) => <CouponTicket key={c.code} c={c} />)}
                  <Link to="/compte?mode=inscription" onClick={() => setGift(false)} className="mt-2 block rounded-full bg-ink py-3.5 text-sm font-bold uppercase tracking-wider text-ivory hover:bg-gold hover:text-ink">Créer mon compte</Link>
                  <p className="text-[11px] text-ink-400">Inscription en 30 secondes avec votre e-mail ou numéro de téléphone.</p>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
