import type { Product } from '../data/products'
import { cn, fcfa } from '../lib/format'
import type { OptionPick } from '../lib/options'

/** Choix des options qui changent le prix (ex. perruques : Longueur, Qualité) */
export default function OptionPicker({ p, pick, onPick, compact = false }: { p: Product; pick: OptionPick; onPick: (v: OptionPick) => void; compact?: boolean }) {
  if (!p.priceOptions?.length) return null
  return (
    <div className={compact ? 'mt-4 space-y-3' : 'mt-7 space-y-6'} data-testid="price-options">
      {p.priceOptions.map((g) => (
        <div key={g.group}>
          <p className={compact ? 'mb-2 text-sm' : 'label'}>{g.group}{pick[g.group] && <span className="normal-case tracking-normal text-ink"> : {pick[g.group]}</span>}</p>
          <div className="flex flex-wrap gap-2">
            {g.choices.map((c) => {
              const on = pick[g.group] === c.label
              return (
                <button key={c.label} type="button" onClick={() => onPick({ ...pick, [g.group]: c.label })} aria-pressed={on} data-testid="price-option"
                  className={cn('flex flex-col items-center rounded-xl border px-3.5 py-2 text-sm font-medium leading-tight transition', compact && 'rounded-full py-1.5', on ? 'border-ink bg-ink text-ivory' : 'border-ink/15 bg-white hover:border-ink')}>
                  <span>{c.label}</span>
                  {c.delta !== 0 && <span className={cn('text-[10.5px] font-semibold', on ? 'text-gold-light' : 'text-gold-dark')}>{c.delta > 0 ? '+' : '−'} {fcfa(Math.abs(c.delta))}</span>}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
