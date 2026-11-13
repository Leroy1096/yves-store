import { motion } from 'framer-motion'
import { Star } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../lib/format'

export function Logo({ light = false, className = '' }: { light?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex flex-col items-center leading-none', className)}>
      <span className={cn('font-display text-[26px] font-semibold tracking-[0.18em]', light ? 'text-ivory' : 'text-ink')}>YVES</span>
      <span className="mt-0.5 text-[8.5px] font-semibold tracking-[0.62em] text-gold">STORE</span>
    </span>
  )
}

export function Stars({ value, size = 14, className = '' }: { value: number; size?: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} aria-label={`${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i + 1))
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Star size={size} className="absolute inset-0 text-ink/15" fill="currentColor" strokeWidth={0} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star size={size} className="text-gold" fill="currentColor" strokeWidth={0} />
            </span>
          </span>
        )
      })}
    </span>
  )
}

export function Reveal({ children, delay = 0, className = '', y = 28 }: { children: ReactNode; delay?: number; className?: string; y?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

export function Page({ children }: { children: ReactNode }) {
  return (
    <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }} className="min-h-[60vh]">
      {children}
    </motion.main>
  )
}

export function Img({ src, alt, className = '', eager = false }: { src: string; alt: string; className?: string; eager?: boolean }) {
  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className={cn('skeleton', className)}
      onLoad={(e) => e.currentTarget.classList.remove('skeleton')}
    />
  )
}

export const Social = {
  Instagram: (p: { size?: number }) => (
    <svg width={p.size ?? 18} height={p.size ?? 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></svg>
  ),
  Facebook: (p: { size?: number }) => (
    <svg width={p.size ?? 18} height={p.size ?? 18} viewBox="0 0 24 24" fill="currentColor"><path d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H7v4h3v8h4v-8h3l1-4h-4V8.5c0-.3.2-.5.5-.5Z" /></svg>
  ),
  TikTok: (p: { size?: number }) => (
    <svg width={p.size ?? 18} height={p.size ?? 18} viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 3c.4 2.3 1.9 3.8 4 4v3.2a7.6 7.6 0 0 1-4-1.3v6.3A6.2 6.2 0 1 1 10.3 9v3.3a3 3 0 1 0 2.9 3V3h3.3Z" /></svg>
  ),
  WhatsApp: (p: { size?: number }) => (
    <svg width={p.size ?? 18} height={p.size ?? 18} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2c0 1.3.9 2.5 1 2.7.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.6-.3Z" /></svg>
  ),
}

export function PaymentBadges({ dark = false }: { dark?: boolean }) {
  const items = [
    { n: 'Orange Money', c: '#FF7900' },
    { n: 'MTN MoMo', c: '#FFCB05' },
    { n: 'Wave', c: '#1DC3F0' },
    { n: 'Moov', c: '#0066B3' },
    { n: 'Visa', c: '#1A1F71' },
    { n: 'Espèces', c: '#B8893B' },
  ]
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((i) => (
        <span key={i.n} className={cn('inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-semibold', dark ? 'border-ivory/15 text-ivory/80' : 'border-ink/10 bg-white text-ink-700')}>
          <span className="h-2 w-2 rounded-full" style={{ background: i.c }} />
          {i.n}
        </span>
      ))}
    </div>
  )
}
