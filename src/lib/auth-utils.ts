export const PHONE_DOMAIN = 'tel.yvesstore.ci'

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())

/** Normalise un numéro ivoirien → "+225XXXXXXXXXX" (10 chiffres), ou null si invalide. */
export function normalizePhone(v: string): string | null {
  let d = v.replace(/[^\d+]/g, '')
  if (d.startsWith('+')) d = d.slice(1)
  if (d.startsWith('00225')) d = d.slice(5)
  else if (d.startsWith('225') && d.length === 13) d = d.slice(3)
  if (!/^(01|05|07|21|25|27)\d{8}$/.test(d)) return null
  return `+225${d}`
}

export const phoneToAuthEmail = (e164: string) => `${e164.replace('+', '')}@${PHONE_DOMAIN}`
export const isPhoneAccountEmail = (email?: string | null) => !!email?.endsWith(`@${PHONE_DOMAIN}`)

export const formatPhone = (e164?: string | null) => {
  if (!e164) return ''
  const d = e164.replace('+225', '')
  return `+225 ${d.replace(/(\d{2})(?=\d)/g, '$1 ')}`
}

/** Identifiant de connexion (e-mail ou téléphone) → e-mail d'authentification. */
export function identifierToAuthEmail(id: string): { email: string } | { error: string } {
  const v = id.trim()
  if (v.includes('@')) {
    // « aya.koné@… » → « aya.kone@… » : les adresses e-mail n’ont pas d’accents, espaces retirés
    const e = v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '').toLowerCase()
    return isEmail(e) ? { email: e } : { error: 'Adresse e-mail invalide.' }
  }
  const p = normalizePhone(v)
  return p ? { email: phoneToAuthEmail(p) } : { error: 'Numéro invalide. Exemple : 07 08 09 10 11' }
}

export const passwordRules = [
  { id: 'len', label: '8 caractères minimum', test: (p: string) => p.length >= 8 },
  { id: 'letter', label: 'Une lettre', test: (p: string) => /[A-Za-zÀ-ÿ]/.test(p) },
  { id: 'digit', label: 'Un chiffre', test: (p: string) => /\d/.test(p) },
]

export function passwordStrength(p: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  if (!p) return { score: 0, label: '' }
  let s = 0
  if (p.length >= 8) s++
  if (p.length >= 12) s++
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) s++
  else if (/\d/.test(p)) s += 0.5
  const score = Math.min(4, Math.max(1, Math.round(s))) as 1 | 2 | 3 | 4
  return { score, label: ['', 'Faible', 'Moyen', 'Bon', 'Excellent'][score] }
}

export function translateAuthError(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('already registered') || m.includes('already been registered') || m.includes('user_already_exists')) return 'Un compte existe déjà avec cet identifiant. Connectez-vous plutôt.'
  if (m.includes('banned')) return 'Ce compte est suspendu. Contactez la boutique sur WhatsApp.'
  if (m.includes('invalid login credentials')) return 'Identifiant ou mot de passe incorrect.'
  if (m.includes('rate limit') || m.includes('too many')) return 'Trop de tentatives. Patientez une minute puis réessayez.'
  if (m.includes('email') && m.includes('invalid')) return 'Adresse e-mail invalide.'
  if (m.includes('password') && (m.includes('weak') || m.includes('at least'))) return 'Mot de passe trop faible.'
  if (m.includes('same password') || m.includes('different from the old')) return 'Le nouveau mot de passe doit être différent de l’ancien.'
  if (m.includes('failed to fetch') || m.includes('network')) return 'Connexion impossible. Vérifiez votre connexion internet.'
  return 'Une erreur est survenue. Veuillez réessayer.'
}

export const initials = (first?: string, last?: string) => `${(first?.[0] ?? '').toUpperCase()}${(last?.[0] ?? '').toUpperCase()}` || 'Y'
