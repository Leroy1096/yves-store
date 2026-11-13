import { Phone } from 'lucide-react'
import { useMemo } from 'react'
import { cn } from '../lib/format'

export const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const MIN_AGE = 10
const daysIn = (m: number, y?: number) => new Date(y || 2000, m, 0).getDate() // 2000 = bissextile

export interface DateParts { d: string; m: string; y: string }
export const splitDate = (iso?: string | null): DateParts => {
  if (!iso) return { d: '', m: '', y: '' }
  const [y, m, d] = iso.split('-')
  return { d: String(Number(d)), m: String(Number(m)), y }
}
/** → "AAAA-MM-JJ", null si vide, 'invalid' si incomplet */
export const joinDate = ({ d, m, y }: DateParts): string | null | 'invalid' => {
  if (!d && !m && !y) return null
  if (!d || !m || !y) return 'invalid'
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

/** Date de naissance : Jour / Mois / Année */
export function BirthDateField({ value, onChange, error }: { value: DateParts; onChange: (v: DateParts) => void; error?: string }) {
  const years = useMemo(() => { const y = Math.min(new Date().getFullYear() - MIN_AGE, 2020); return Array.from({ length: y - 1919 }, (_, i) => String(y - i)) }, [])
  const max = value.m ? daysIn(Number(value.m), Number(value.y)) : 31
  const set = (p: Partial<DateParts>) => {
    const n = { ...value, ...p }
    if (n.d && n.m && Number(n.d) > daysIn(Number(n.m), Number(n.y))) n.d = String(daysIn(Number(n.m), Number(n.y)))
    onChange(n)
  }
  const sel = cn('input appearance-none bg-[length:12px] bg-[right_0.9rem_center] bg-no-repeat pr-8', error && 'border-red-500')
  const arrow = { backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%237a7468' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }
  return (
    <fieldset className="sm:col-span-2">
      <legend className="label">Date de naissance</legend>
      <div className="grid grid-cols-[1fr_1.6fr_1.2fr] gap-2 sm:gap-3">
        <div>
          <select id="pf-bday" aria-label="Jour" className={sel} style={arrow} value={value.d} onChange={(e) => set({ d: e.target.value })}>
            <option value="">Jour</option>
            {Array.from({ length: max }, (_, i) => String(i + 1)).map((d) => <option key={d} value={d}>{d.padStart(2, '0')}</option>)}
          </select>
        </div>
        <div>
          <select id="pf-bmonth" aria-label="Mois" className={sel} style={arrow} value={value.m} onChange={(e) => set({ m: e.target.value })}>
            <option value="">Mois</option>
            {MONTHS.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
          </select>
        </div>
        <div>
          <select id="pf-byear" aria-label="Année" className={sel} style={arrow} value={value.y} onChange={(e) => set({ y: e.target.value })}>
            <option value="">Année</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>
      {error ? <p className="mt-1.5 text-xs text-red-700">{error}</p> : <p className="mt-1.5 text-xs text-ink-400">Pour des recommandations adaptées et une surprise le jour de votre anniversaire 🎂</p>}
    </fieldset>
  )
}

/** Saisie d'un numéro ivoirien à 10 chiffres, préfixe +225 affiché */
export function PhoneInput({ id, label, value, onChange, error, hint }: { id: string; label: string; value: string; onChange: (v: string) => void; error?: string; hint?: string }) {
  const fmt = (v: string) => v.replace(/\D/g, '').slice(0, 10).replace(/(\d{2})(?=\d)/g, '$1 ')
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <div className={cn('input flex h-[46px] items-stretch gap-2 p-0 focus-within:border-gold focus-within:ring-4 focus-within:ring-gold/15', error && 'border-red-500')}>
        <span className="flex h-full shrink-0 items-center gap-1.5 border-r border-ink/10 pl-4 pr-3 text-sm font-semibold text-ink-500"><Phone size={15} className="text-ink-400" /> +225</span>
        <input id={id} type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="07 08 09 10 11" value={fmt(value)} onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
          className="h-full min-w-0 flex-1 bg-transparent pr-4 tracking-wide outline-none placeholder:text-ink-400" aria-invalid={!!error} />
      </div>
      {error ? <p className="mt-1.5 text-xs text-red-700">{error}</p> : hint && <p className="mt-1.5 text-xs text-ink-400">{hint}</p>}
    </div>
  )
}
