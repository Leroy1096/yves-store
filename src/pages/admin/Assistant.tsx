import { ArrowUp, Check, CheckCircle2, Copy, Loader2, RotateCcw, ShieldQuestion, Sparkles, X, XCircle } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/format'
import { DEMO, supabase } from '../../lib/supabase'
import { answer, buildFacts, welcome, type Reply } from './assistant-engine'
import { actionFacts, extractActions, localIntro, opsSummary, parseCommand, resolveActions, runOp, type ActionCtx, type AdminReviewLite, type Op, type ResetRequest } from './assistant-actions'
import { Social } from '../../components/ui'
import { fetchCatalog, fetchClients, fetchResetLog, fetchMovements, fetchOrders } from './shared'

type Msg = { id: number; role: 'user' | 'assistant'; text: string; actions?: Reply['actions']; chips?: string[]; ai?: boolean; ops?: Op[] }

// ── Mise en forme légère : **gras**, ~~barré~~, _italique_, listes ──
function inline(s: string): ReactNode[] {
  const out: ReactNode[] = []; const re = /\*\*(.+?)\*\*|~~(.+?)~~|(?:^|\s)_(.+?)_(?=\s|$|[.,!?])/g
  let last = 0; let m: RegExpExecArray | null; let k = 0
  while ((m = re.exec(s))) {
    out.push(s.slice(last, m.index + (m[3] && m[0].startsWith(' ') ? 1 : 0)))
    out.push(m[1] ? <b key={k++}>{m[1]}</b> : m[2] ? <s key={k++} className="text-ink-400">{m[2]}</s> : <i key={k++} className="text-ink-500">{m[3]}</i>)
    last = m.index + m[0].length
  }
  out.push(s.slice(last)); return out
}
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />
        const b = line.match(/^\s*[-•]\s+(.*)/), n = line.match(/^\s*(\d+)\.\s+(.*)/)
        if (b) return <p key={i} className="flex gap-2 pl-1"><span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-gold-dark" /><span>{inline(b[1])}</span></p>
        if (n) return <p key={i} className="flex gap-2 pl-1"><span className="w-4 shrink-0 font-bold text-gold-dark">{n[1]}.</span><span>{inline(n[2])}</span></p>
        return <p key={i}>{inline(line)}</p>
      })}
    </>
  )
}
const plain = (s: string) => s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/~~(.+?)~~/g, '$1')
function copyText(s: string) {
  const txt = plain(s)
  try { if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(txt) } catch { /* bac à sable */ }
  const ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select()
  try { document.execCommand('copy') } catch { /* */ } ta.remove(); return Promise.resolve()
}

let aiAvailable: boolean | null = DEMO ? false : null // IA générative côté serveur (clé configurée ?)

export default function Assistant({ open, onClose, name, onDataChange }: { open: boolean; onClose: () => void; name: string; onDataChange?: () => void }) {
  const [data, setData] = useState<ActionCtx | null>(null)
  const [loadErr, setLoadErr] = useState('')
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState<number | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const seq = useRef(1)
  const loadedAt = useRef(0)

  const load = useCallback(async () => {
    try {
      const [orders, catalog, moves, clients, resets, wa, rv] = await Promise.all([fetchOrders(), fetchCatalog(), fetchMovements(), fetchClients(), fetchResetLog().catch(() => undefined),
        supabase.from('whatsapp_requests').select('id,customer_name,phone,created_at,status').eq('kind', 'reset_password').eq('status', 'en_attente').order('created_at', { ascending: true }).limit(30).then((r) => (r.data ?? []) as ResetRequest[], () => []),
        supabase.rpc('admin_list_reviews').then((r) => (r.data ?? []) as AdminReviewLite[], () => [])])
      const d: ActionCtx = { orders, catalog, moves, clients, resets, resetRequests: wa, reviews: rv }; setData(d); loadedAt.current = Date.now(); setLoadErr(''); return d
    } catch (e) { setLoadErr((e as Error).message); return null }
  }, [])

  // Ouverture : charge les données et affiche le point du jour
  useEffect(() => {
    if (!open) return
    if (Date.now() - loadedAt.current > 60_000) void load().then((d) => { if (d && !msgs.length) setMsgs([{ id: seq.current++, role: 'assistant', ...welcome(d, name) }]) })
    const id = setTimeout(() => inputRef.current?.focus(), 250)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }) }, [msgs, busy])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  /** Exécute une liste d’opérations (dans l’ordre) et met à jour le message */
  const execute = async (msgId: number, ids: string[]) => {
    const patchOp = (id: string, p: Partial<Op>) => setMsgs((ms) => ms.map((m) => (m.id === msgId ? { ...m, ops: m.ops?.map((o) => (o.id === id ? { ...o, ...p } : o)) } : m)))
    const msg = msgsRef.current.find((m) => m.id === msgId)
    for (const id of ids) {
      const op = msg?.ops?.find((o) => o.id === id)
      if (!op || op.invalid || (op.status !== 'pending')) continue
      patchOp(id, { status: 'running' })
      const done = await runOp(op)
      patchOp(id, { status: done.status, result: done.result, wa: done.wa })
    }
    loadedAt.current = 0; void load(); onDataChange?.()
  }
  const msgsRef = useRef<Msg[]>([])
  useEffect(() => { msgsRef.current = msgs }, [msgs])

  const ask = async (question: string) => {
    const q = question.trim(); if (!q || busy) return
    setInput(''); setBusy(true)
    const history = msgs.slice(-8).map((m) => ({ role: m.role, text: (plain(m.text) + (m.ops?.length ? `\n[Actions : ${opsSummary(m.ops) || m.ops.map((o) => plain(o.label) + ' (en attente de confirmation)').join(' ; ')}]` : '')).slice(0, 1500) }))
    setMsgs((m) => [...m, { id: seq.current++, role: 'user', text: q }])
    const d = (Date.now() - loadedAt.current > 60_000 ? await load() : data) ?? data
    let reply: Msg | null = null
    if (d && aiAvailable !== false) {
      try {
        const { data: r, error } = await supabase.functions.invoke('assistant-gerant', { body: { question: q, history, facts: { ...buildFacts(d), ...actionFacts(d) } } })
        if (!error && r?.configured === false) aiAvailable = false
        else if (!error && typeof r?.answer === 'string' && r.answer.trim()) {
          aiAvailable = true
          const { text, actions } = extractActions(r.answer.trim())
          const ops = actions.length ? resolveActions(actions, d) : undefined
          const loc = answer(q, d)
          reply = { id: seq.current++, role: 'assistant', text: text || (ops ? localIntro(ops) : '…'), actions: ops ? undefined : loc.actions, chips: ops ? undefined : loc.chips, ai: true, ops }
        }
      } catch { /* repli sur l’analyse intégrée */ }
    }
    if (!reply) {
      await new Promise((r) => setTimeout(r, 450 + Math.random() * 400))
      const cmd = d ? parseCommand(q, d) : null
      if (d && cmd) {
        const ops = resolveActions(cmd, d)
        reply = { id: seq.current++, role: 'assistant', text: ops.length ? localIntro(ops) : 'Il n’y a rien à faire pour le moment ✅ (aucune commande nouvelle ni demande en attente correspondante).', ops: ops.length ? ops : undefined }
      } else {
        const r = d ? answer(q, d) : { text: 'Je n’arrive pas à lire les données de la boutique pour le moment. Réessayez dans un instant.' }
        reply = { id: seq.current++, role: 'assistant', ...r }
      }
    }
    setMsgs((m) => [...m, reply!]); setBusy(false)
    // Actions autorisées : exécutées tout de suite, puis résumé affiché
    const autoIds = reply.ops?.filter((o) => o.auto && !o.invalid).map((o) => o.id) ?? []
    if (autoIds.length) { msgsRef.current = [...msgsRef.current, reply]; await execute(reply.id, autoIds) }
  }

  const reset = () => { setMsgs(data ? [{ id: seq.current++, role: 'assistant', ...welcome(data, name) }] : []); inputRef.current?.focus() }
  const lastAssistant = [...msgs].reverse().find((m) => m.role === 'assistant')?.id

  return (
    <div className={cn('fixed inset-0 z-50 transition', open ? 'pointer-events-auto' : 'pointer-events-none')} aria-hidden={!open}>
      <div onClick={onClose} className={cn('absolute inset-0 bg-ink/40 backdrop-blur-[2px] transition-opacity duration-300', open ? 'opacity-100' : 'opacity-0')} />
      <section role="dialog" aria-modal="true" aria-label="Assistant IA"
        className={cn('absolute bottom-0 right-0 top-0 flex w-full flex-col bg-ivory shadow-2xl transition-transform duration-300 ease-out sm:w-[440px]', open ? 'translate-x-0' : 'translate-x-full')}>
        {/* En-tête */}
        <header className="relative overflow-hidden bg-ink px-5 pb-4 pt-5 text-ivory">
          <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-gold/25 blur-3xl" />
          <div className="relative flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-gold-light to-gold-dark text-ink shadow-lg"><Sparkles size={20} /></span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-2xl leading-none">Assistant IA</p>
              <p className="mt-1 text-xs text-ivory/60">Ventes, stock, clients, prévisions et rédaction</p>
            </div>
            <button type="button" onClick={reset} title="Nouvelle conversation" aria-label="Nouvelle conversation" className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-ivory/80 hover:bg-white/20"><RotateCcw size={15} /></button>
            <button type="button" onClick={onClose} aria-label="Fermer l’assistant" className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-ivory/80 hover:bg-white/20"><X size={17} /></button>
          </div>
        </header>

        {/* Conversation */}
        <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
          {!data && !loadErr && <div className="flex items-center gap-2 text-sm text-ink-500"><Loader2 size={16} className="animate-spin text-gold" /> J’analyse les données de la boutique…</div>}
          {loadErr && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">Impossible de charger les données : {loadErr}</p>}
          {msgs.map((m) => m.role === 'user' ? (
            <div key={m.id} className="flex justify-end"><p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-sm text-ivory">{m.text}</p></div>
          ) : (
            <div key={m.id} className="flex gap-2.5" data-testid="assistant-msg">
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-gold-light to-gold-dark text-ink"><Sparkles size={13} /></span>
              <div className="min-w-0 flex-1">
                <div className="space-y-1 rounded-2xl rounded-tl-md border border-ink/5 bg-white px-4 py-3 text-[13.5px] leading-relaxed text-ink-800 shadow-sm"><RichText text={m.text} /></div>
                {m.ops?.length ? <OpsCard ops={m.ops} onRun={(ids) => void execute(m.id, ids)} onCancel={(ids) => setMsgs((ms) => ms.map((x) => (x.id === m.id ? { ...x, ops: x.ops?.map((o) => (ids.includes(o.id) ? { ...o, status: 'cancelled' } : o)) } : x)))} /> : null}
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {m.ai && <span className="rounded-full bg-gold/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-dark" title="Réponse rédigée par Google Gemini à partir des données de la boutique">✨ Gemini</span>}
                  {m.actions?.map((a) => <Link key={a.to} to={a.to} onClick={onClose} className="rounded-full bg-ink px-3 py-1 text-[11px] font-bold text-ivory hover:bg-ink-800">{a.label} →</Link>)}
                  <button type="button" onClick={() => { void copyText(m.text + (m.ops?.length ? '\n\n' + opsSummary(m.ops) : '')).then(() => { setCopied(m.id); setTimeout(() => setCopied(null), 1500) }) }} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-ink-400 hover:bg-ivory-200 hover:text-ink">{copied === m.id ? <><Check size={12} /> Copié</> : <><Copy size={12} /> Copier</>}</button>
                </div>
                {m.id === lastAssistant && !busy && m.chips?.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.chips.map((c) => <button key={c} type="button" onClick={() => void ask(c)} className="rounded-full border border-gold/40 bg-gold/5 px-3 py-1.5 text-[12px] font-semibold text-gold-dark transition hover:border-gold hover:bg-gold/15">{c}</button>)}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex items-center gap-2.5">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-gold-light to-gold-dark text-ink"><Sparkles size={13} /></span>
              <span className="flex gap-1 rounded-2xl bg-white px-4 py-3 shadow-sm">{[0, 1, 2].map((i) => <i key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold" style={{ animationDelay: `${i * 0.15}s` }} />)}</span>
            </div>
          )}
        </div>

        {/* Saisie */}
        <form onSubmit={(e) => { e.preventDefault(); void ask(input) }} className="border-t border-ink/10 bg-white p-3">
          <div className="flex items-end gap-2 rounded-2xl border border-ink/15 bg-ivory/60 p-1.5 focus-within:border-gold">
            <textarea ref={inputRef} id="assistant-input" value={input} rows={1} onChange={(e) => setInput(e.target.value.slice(0, 600))}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void ask(input) } }}
              placeholder="Posez votre question…" className="max-h-28 min-h-[38px] flex-1 resize-none bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-ink-400" />
            <button type="submit" disabled={!input.trim() || busy} aria-label="Envoyer" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink text-ivory transition hover:bg-gold hover:text-ink disabled:opacity-30"><ArrowUp size={17} /></button>
          </div>
          <p className="mt-1.5 px-1 text-center text-[10px] text-ink-400">Je valide les commandes et prépare les codes mot de passe seul ; pour tout le reste, je vous demande d’abord.</p>
        </form>
      </section>
    </div>
  )
}

/** Résumé des actions + demandes de confirmation */
function OpsCard({ ops, onRun, onCancel }: { ops: Op[]; onRun: (ids: string[]) => void; onCancel: (ids: string[]) => void }) {
  const auto = ops.filter((o) => o.auto)
  const ask = ops.filter((o) => !o.auto)
  const pending = ask.filter((o) => o.status === 'pending' && !o.invalid)
  const Line = ({ o }: { o: Op }) => (
    <li className="flex gap-2" data-testid="ai-op" data-status={o.status}>
      <span className="mt-0.5 shrink-0">{o.status === 'done' ? <CheckCircle2 size={15} className="text-emerald-600" /> : o.status === 'error' ? <XCircle size={15} className="text-red-500" /> : o.status === 'running' ? <Loader2 size={15} className="animate-spin text-gold" /> : o.status === 'cancelled' ? <X size={15} className="text-ink-300" /> : <ShieldQuestion size={15} className="text-gold-dark" />}</span>
      <div className="min-w-0 flex-1">
        <p className={cn(o.status === 'cancelled' && 'text-ink-400 line-through')}>{inline(o.status === 'done' && o.result ? o.result : o.label)}</p>
        {o.status === 'error' && <p className="text-[12px] text-red-600">Non fait : {o.result}</p>}
        {o.status === 'cancelled' && <p className="text-[12px] text-ink-400">Annulé — rien n’a été modifié.</p>}
        {o.wa && <a href={o.wa.href} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3 py-1.5 text-[12px] font-bold text-white hover:bg-[#1ebe5a]" data-testid="ai-op-wa"><Social.WhatsApp size={13} /> {o.wa.label}</a>}
        {!o.auto && o.status === 'pending' && !o.invalid && (
          <div className="mt-1.5 flex gap-1.5">
            <button type="button" onClick={() => onRun([o.id])} className="inline-flex items-center gap-1 rounded-full bg-ink px-3 py-1 text-[11.5px] font-bold text-ivory hover:bg-gold hover:text-ink" data-testid="ai-op-confirm"><Check size={12} /> Confirmer</button>
            <button type="button" onClick={() => onCancel([o.id])} className="rounded-full px-3 py-1 text-[11.5px] font-semibold text-ink-500 ring-1 ring-ink/15 hover:ring-ink" data-testid="ai-op-cancel">Annuler</button>
          </div>
        )}
      </div>
    </li>
  )
  return (
    <div className="mt-2 space-y-2">
      {auto.length > 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 px-3.5 py-3 text-[13px]" data-testid="ai-summary">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-emerald-800">📋 Résumé de mes actions</p>
          <ul className="space-y-2">{auto.map((o) => <Line key={o.id} o={o} />)}</ul>
        </div>
      )}
      {ask.length > 0 && (
        <div className="rounded-2xl border border-gold/40 bg-gold/5 px-3.5 py-3 text-[13px]" data-testid="ai-confirm">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gold-dark">{pending.length ? '✋ Votre accord est nécessaire' : '📋 Résumé'}</p>
          <ul className="space-y-2.5">{ask.map((o) => <Line key={o.id} o={o} />)}</ul>
          {pending.length > 1 && (
            <div className="mt-3 flex gap-2 border-t border-gold/20 pt-2.5">
              <button type="button" onClick={() => onRun(pending.map((o) => o.id))} className="inline-flex items-center gap-1 rounded-full bg-ink px-3.5 py-1.5 text-[12px] font-bold text-ivory hover:bg-gold hover:text-ink" data-testid="ai-op-confirm-all"><Check size={13} /> Tout confirmer ({pending.length})</button>
              <button type="button" onClick={() => onCancel(pending.map((o) => o.id))} className="rounded-full px-3 py-1.5 text-[12px] font-semibold text-ink-500 ring-1 ring-ink/15 hover:ring-ink">Tout annuler</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function AssistantButton({ onClick, variant }: { onClick: () => void; variant: 'sidebar' | 'header' }) {
  return variant === 'sidebar' ? (
    <button type="button" onClick={onClick} data-testid="assistant-open" className="group relative inline-flex items-center justify-center gap-1.5 overflow-hidden w-full rounded-xl bg-gradient-to-r from-gold-dark via-gold to-gold-light px-3 py-2.5 text-sm font-bold text-ink shadow-[0_0_18px_rgba(184,137,59,0.35)] transition hover:brightness-110">
      <Sparkles size={15} className="transition group-hover:rotate-12" /> Assistant IA
    </button>
  ) : (
    <button type="button" onClick={onClick} data-testid="assistant-open" className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-gold-dark via-gold to-gold-light px-3.5 py-1.5 text-xs font-bold text-ink shadow-[0_0_14px_rgba(184,137,59,0.35)]">
      <Sparkles size={13} /> Assistant IA
    </button>
  )
}
