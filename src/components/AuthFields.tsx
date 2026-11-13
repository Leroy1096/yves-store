import { AnimatePresence, motion } from 'framer-motion'
import { Check, Eye, EyeOff, X } from 'lucide-react'
import { useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../lib/format'
import { passwordRules, passwordStrength } from '../lib/auth-utils'

export function TextField({ label, error, icon, hint, ...rest }: { label: string; error?: string; icon?: ReactNode; hint?: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="label" htmlFor={rest.id}>{label}</label>
      <div className="relative">
        {icon && <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400">{icon}</span>}
        <input {...rest} className={cn('input', !!icon && 'pl-11', error && 'border-red-500 focus:border-red-500 focus:ring-red-500/15', rest.className)} aria-invalid={!!error} />
      </div>
      {error ? <p className="mt-1.5 text-xs text-red-700">{error}</p> : hint && <p className="mt-1.5 text-xs text-ink-400">{hint}</p>}
    </div>
  )
}

export function PasswordField({ label, error, value, onChange, id, autoComplete, placeholder, right }: { label: string; error?: string; value: string; onChange: (v: string) => void; id: string; autoComplete: string; placeholder?: string; right?: ReactNode }) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <div className="flex items-center justify-between"><label className="label" htmlFor={id}>{label}</label>{right}</div>
      <div className="relative">
        <input id={id} type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} placeholder={placeholder ?? '••••••••'}
          className={cn('input pr-12', error && 'border-red-500 focus:border-red-500 focus:ring-red-500/15')} aria-invalid={!!error} />
        <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-ink-400 hover:bg-ink/5 hover:text-ink" aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs text-red-700">{error}</p>}
    </div>
  )
}

export function PasswordMeter({ password }: { password: string }) {
  const s = passwordStrength(password)
  const colors = ['bg-ink/10', 'bg-red-500', 'bg-amber-500', 'bg-emerald-500', 'bg-emerald-600']
  return (
    <AnimatePresence initial={false}>
      {password && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
          <div className="mt-2.5 flex items-center gap-3">
            <div className="flex flex-1 gap-1">{[1, 2, 3, 4].map((i) => <span key={i} className={cn('h-1.5 flex-1 rounded-full transition-colors duration-300', i <= s.score ? colors[s.score] : 'bg-ink/10')} />)}</div>
            <span className="w-16 text-right text-[11px] font-semibold text-ink-500">{s.label}</span>
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {passwordRules.map((r) => {
              const ok = r.test(password)
              return <li key={r.id} className={cn('flex items-center gap-1 text-[11px] transition-colors', ok ? 'text-emerald-700' : 'text-ink-400')}>{ok ? <Check size={12} /> : <X size={12} />}{r.label}</li>
            })}
          </ul>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function MatchHint({ a, b }: { a: string; b: string }) {
  if (!b) return null
  const ok = a === b
  return <p className={cn('mt-1.5 flex items-center gap-1 text-xs', ok ? 'text-emerald-700' : 'text-red-700')}>{ok ? <Check size={13} /> : <X size={13} />}{ok ? 'Les mots de passe correspondent' : 'Les mots de passe ne correspondent pas'}</p>
}

export function FormAlert({ children, tone = 'error' }: { children: ReactNode; tone?: 'error' | 'success' | 'info' }) {
  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} role="alert"
      className={cn('rounded-xl border px-4 py-3 text-sm', tone === 'error' && 'border-red-200 bg-red-50 text-red-800', tone === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-800', tone === 'info' && 'border-gold/30 bg-gold/10 text-ink-700')}>
      {children}
    </motion.div>
  )
}
