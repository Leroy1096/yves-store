import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, MapPin, Plus, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '../lib/format'
import { normalize } from '../lib/search'

interface Props {
  id: string
  value: string
  onChange: (v: string) => void
  options: string[]
  /** Raccourcis affichés quand la recherche est vide */
  popular?: string[]
  placeholder?: string
  searchPlaceholder?: string
  /** Autorise une saisie libre si la ville n’est pas dans la liste */
  allowCustom?: boolean
  noun?: { one: string; many: string }
  error?: string
}

const letterOf = (s: string) => normalize(s.replace(/^M’/, 'M'))[0]?.toUpperCase() ?? '#'

function Highlight({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>
  const i = normalize(text).indexOf(normalize(q))
  if (i < 0) return <>{text}</>
  return <>{text.slice(0, i)}<mark className="rounded-sm bg-gold/30 text-inherit">{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>
}

/** Liste déroulante avec barre de recherche (insensible aux accents), groupée par lettre */
export default function SearchSelect({ id, value, onChange, options, popular = [], placeholder = 'Choisir…', searchPlaceholder = 'Rechercher…', allowCustom = false, noun = { one: 'ville', many: 'villes' }, error }: Props) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const wrap = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)

  const query = q.trim()
  const results = useMemo(() => {
    if (!query) return options
    const n = normalize(query)
    const starts = options.filter((o) => normalize(o).startsWith(n))
    const contains = options.filter((o) => !normalize(o).startsWith(n) && normalize(o).includes(n))
    return [...starts, ...contains]
  }, [options, query])
  const exact = results.some((r) => normalize(r) === normalize(query))
  const custom = allowCustom && query.length >= 2 && !exact ? query.replace(/\s+/g, ' ').replace(/^./, (c) => c.toUpperCase()) : null
  const items = custom ? [...results, custom] : results

  useEffect(() => {
    if (!open) return
    setActive(Math.max(0, options.indexOf(value)))
    input.current?.focus()
    requestAnimationFrame(() => input.current?.focus())
    const down = (e: MouseEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) { setOpen(false); setQ('') } }
    document.addEventListener('mousedown', down)
    const mobile = window.innerWidth < 640
    if (mobile) document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('mousedown', down); if (mobile) document.body.style.overflow = '' }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setActive(0) }, [query])
  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  const pick = (v: string) => { onChange(v); setOpen(false); setQ(''); trigger.current?.focus() }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(items.length - 1, a + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); const it = items[Math.min(active, items.length - 1)]; if (it) pick(it) }
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); setQ(''); trigger.current?.focus() }
  }

  let lastLetter = ''
  return (
    <div ref={wrap} className="relative">
      <button
        ref={trigger} id={id} type="button" role="combobox" aria-expanded={open} aria-haspopup="listbox" aria-controls={`${id}-list`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => { if (open) { if (e.key.length === 1 || e.key === 'Backspace') { input.current?.focus() } return } if (e.key === 'ArrowDown' || (e.key.length === 1 && /\S/.test(e.key))) { e.preventDefault(); setOpen(true); if (e.key.length === 1) setQ(e.key) } }}
        className={cn('input flex items-center gap-2 text-left', open && 'border-gold ring-4 ring-gold/15', error && 'border-red-400')}
      >
        <MapPin size={16} className="shrink-0 text-gold-dark" />
        <span className={cn('flex-1 truncate', !value && 'text-ink-400')}>{value || placeholder}</span>
        <ChevronDown size={16} className={cn('shrink-0 text-ink-400 transition', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 z-[84] bg-ink/40 sm:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.16 }}
              className="fixed inset-x-0 bottom-0 z-[85] flex max-h-[80vh] flex-col overflow-hidden rounded-t-3xl border border-ink/10 bg-white shadow-2xl shadow-ink/20 sm:absolute sm:inset-x-0 sm:bottom-auto sm:top-full sm:mt-2 sm:max-h-[380px] sm:rounded-2xl"
            >
              <div className="flex items-center justify-between px-4 pt-4 sm:hidden">
                <p className="text-base font-bold">Choisir une {noun.one}</p>
                <button type="button" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-full bg-ivory-200" aria-label="Fermer"><X size={16} /></button>
              </div>
              <div className="border-b border-ink/5 p-3">
                <div className="flex items-center gap-2 rounded-xl bg-ivory-200/70 px-3 ring-gold/30 focus-within:ring-2">
                  <Search size={16} className="shrink-0 text-ink-400" />
                  <input
                    ref={input} value={q} onChange={(e) => { setQ(e.target.value); setActive(0) }} onKeyDown={onKey}
                    placeholder={searchPlaceholder} aria-label={searchPlaceholder} aria-controls={`${id}-list`} aria-activedescendant={`${id}-opt-${active}`}
                    className="h-11 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-400 sm:h-10 sm:text-sm"
                    autoComplete="off" autoCorrect="off" spellCheck={false}
                  />
                  {q && <button type="button" onClick={() => { setQ(''); input.current?.focus() }} className="p-1 text-ink-400 hover:text-ink" aria-label="Effacer la recherche"><X size={14} /></button>}
                </div>
                {!query && popular.length > 0 && (
                  <div className="no-scrollbar mt-2.5 flex gap-1.5 overflow-x-auto">
                    {popular.map((p) => (
                      <button key={p} type="button" onClick={() => pick(p)} className={cn('shrink-0 rounded-full border px-3 py-1 text-xs transition', value === p ? 'border-ink bg-ink text-ivory' : 'border-ink/10 hover:border-ink')}>{p}</button>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-[11px] text-ink-400">{query ? `${results.length} résultat${results.length > 1 ? 's' : ''}` : `${options.length} ${noun.many} · ordre alphabétique`}</p>
              </div>

              <ul ref={list} id={`${id}-list`} role="listbox" className="flex-1 overflow-y-auto overscroll-contain py-1 pb-[env(safe-area-inset-bottom)]">
                {results.map((o, i) => {
                  const L = letterOf(o)
                  const head = !query && L !== lastLetter
                  lastLetter = L
                  return (
                    <li key={o} role="presentation">
                      {head && <p className="sticky top-0 z-10 bg-white/95 px-4 pb-1 pt-2 text-[11px] font-black text-gold-dark backdrop-blur">{L}</p>}
                      <button
                        type="button" role="option" id={`${id}-opt-${i}`} data-i={i} aria-selected={value === o}
                        onMouseEnter={() => setActive(i)} onClick={() => pick(o)}
                        className={cn('flex w-full items-center justify-between px-4 py-2.5 text-left text-sm sm:py-2', i === active ? 'bg-ivory-200' : '', value === o && 'font-semibold')}
                      >
                        <span><Highlight text={o} q={query} /></span>
                        {value === o && <Check size={15} className="text-gold-dark" />}
                      </button>
                    </li>
                  )
                })}
                {custom && (
                  <li role="presentation">
                    <button type="button" role="option" id={`${id}-opt-${results.length}`} data-i={results.length} aria-selected={false} onMouseEnter={() => setActive(results.length)} onClick={() => pick(custom)}
                      className={cn('flex w-full items-center gap-2 border-t border-ink/5 px-4 py-3 text-left text-sm', active === results.length && 'bg-ivory-200')}>
                      <Plus size={15} className="text-gold-dark" /> Utiliser « <b>{custom}</b> »
                      <span className="ml-auto text-[11px] text-ink-400">village, quartier…</span>
                    </button>
                  </li>
                )}
                {items.length === 0 && (
                  <li className="px-4 py-8 text-center text-sm text-ink-500">Aucune {noun.one} ne correspond à « {query} ».</li>
                )}
              </ul>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
