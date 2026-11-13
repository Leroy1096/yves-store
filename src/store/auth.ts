import type { Session, User } from '@supabase/supabase-js'
import { create } from 'zustand'
import { identifierToAuthEmail, isEmail, normalizePhone, phoneToAuthEmail, translateAuthError } from '../lib/auth-utils'
import { supabase, supabaseReady } from '../lib/supabase'

export interface Profile {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  signup_method: 'email' | 'phone'
  city: string | null
  commune: string | null
  address: string | null
  birth_year: number | null
  birth_date: string | null
  contact_phone: string | null
  newsletter: boolean
  created_at: string
}

export interface SignUpInput {
  method: 'email' | 'phone'
  identifier: string
  password: string
  firstName: string
  lastName: string
  newsletter: boolean
}

type Result = { ok: true } | { ok: false; error: string }

interface AuthState {
  ready: boolean
  session: Session | null
  user: User | null
  profile: Profile | null
  /** null = pas encore vérifié */
  isAdmin: boolean | null
  init: () => void
  loadProfile: () => Promise<void>
  signUp: (i: SignUpInput) => Promise<Result>
  signIn: (identifier: string, password: string) => Promise<Result>
  signOut: () => Promise<void>
  updateProfile: (p: Partial<Pick<Profile, 'first_name' | 'last_name' | 'city' | 'commune' | 'address' | 'birth_date' | 'contact_phone' | 'newsletter' | 'email'>>) => Promise<Result>
  changePassword: (current: string, next: string) => Promise<Result>
  requestReset: (email: string) => Promise<Result>
  setNewPassword: (next: string) => Promise<Result>
  reportEmailResetDone: () => Promise<void>
}

let profileSeq = 0
let initialised = false

export const useAuth = create<AuthState>()((set, get) => ({
  ready: !supabaseReady,
  session: null,
  user: null,
  profile: null,
  isAdmin: null,

  init: () => {
    if (initialised || !supabaseReady) return
    initialised = true
    supabase.auth.getSession().then(({ data }) => {
      set({ session: data.session, user: data.session?.user ?? null, ready: true })
      if (data.session) get().loadProfile()
    })
    supabase.auth.onAuthStateChange((_e, session) => {
      const prev = get().user?.id
      set({ session, user: session?.user ?? null, ready: true })
      if (!session) set({ profile: null, isAdmin: null })
      else if (session.user.id !== prev) { set({ isAdmin: null }); setTimeout(() => get().loadProfile(), 0) }
    })
  },

  loadProfile: async () => {
    const uid = get().user?.id
    if (!uid) return
    const seq = ++profileSeq
    let tries = 0
    // On vérifie le rôle (gérant / client) avec le jeton de session déjà prêt ;
    // une réponse obsolète ou en erreur n’écrase jamais un résultat valide.
    for (;;) {
      const [{ data }, adm] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
        supabase.rpc('is_admin'),
      ])
      if (seq !== profileSeq || get().user?.id !== uid) return
      if (!adm.error && typeof adm.data === 'boolean') {
        set({ isAdmin: adm.data, ...(data ? { profile: data as Profile } : {}) })
        return
      }
      if (data) set({ profile: data as Profile })
      if (++tries >= 3) { set({ isAdmin: false }); return }
      await new Promise((r) => setTimeout(r, 600 * tries))
    }
  },

  signUp: async ({ method, identifier, password, firstName, lastName, newsletter }) => {
    if (!supabaseReady) return { ok: false, error: 'Service de comptes non configuré.' }
    let email: string
    let phone: string | null = null
    if (method === 'email') {
      if (!isEmail(identifier)) return { ok: false, error: 'Adresse e-mail invalide.' }
      email = identifier.trim().toLowerCase()
    } else {
      phone = normalizePhone(identifier)
      if (!phone) return { ok: false, error: 'Numéro invalide. Exemple : 07 08 09 10 11' }
      const { data: exists } = await supabase.rpc('phone_exists', { p: phone })
      if (exists) return { ok: false, error: 'Ce numéro est déjà inscrit. Connectez-vous plutôt.' }
      email = phoneToAuthEmail(phone)
    }
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { first_name: firstName.trim(), last_name: lastName.trim(), phone, signup_method: method, newsletter } },
    })
    if (error) return { ok: false, error: translateAuthError(error.message) }
    // Supabase returns a user with no identities when the e-mail already exists
    if (data.user && data.user.identities && data.user.identities.length === 0) return { ok: false, error: translateAuthError('already registered') }
    if (!data.session) return { ok: false, error: 'Compte créé. Confirmez votre adresse e-mail puis connectez-vous.' }
    await get().loadProfile()
    return { ok: true }
  },

  signIn: async (identifier, password) => {
    if (!supabaseReady) return { ok: false, error: 'Service de comptes non configuré.' }
    const r = identifierToAuthEmail(identifier)
    if ('error' in r) return { ok: false, error: r.error }
    const { error } = await supabase.auth.signInWithPassword({ email: r.email, password })
    if (error) return { ok: false, error: translateAuthError(error.message) }
    await get().loadProfile()
    return { ok: true }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, user: null, profile: null, isAdmin: null })
  },

  updateProfile: async (patch) => {
    const uid = get().user?.id
    if (!uid) return { ok: false, error: 'Session expirée, reconnectez-vous.' }
    const { error } = await supabase.from('profiles').update(patch).eq('id', uid)
    if (error) return { ok: false, error: 'Impossible d’enregistrer. Réessayez.' }
    set((s) => ({ profile: s.profile ? { ...s.profile, ...patch } : s.profile }))
    return { ok: true }
  },

  changePassword: async (current, next) => {
    const email = get().user?.email
    if (!email) return { ok: false, error: 'Session expirée, reconnectez-vous.' }
    const check = await supabase.auth.signInWithPassword({ email, password: current })
    if (check.error) return { ok: false, error: 'Mot de passe actuel incorrect.' }
    const { error } = await supabase.auth.updateUser({ password: next })
    return error ? { ok: false, error: translateAuthError(error.message) } : { ok: true }
  },

  requestReset: async (email) => {
    if (!isEmail(email)) return { ok: false, error: 'Adresse e-mail invalide.' }
    const e = email.trim().toLowerCase()
    const redirectTo = `${location.origin}/reinitialiser`
    // 1) Envoi automatique par notre fonction serveur (Brevo / Resend) + journal pour le gérant
    try {
      const { data, error } = await supabase.functions.invoke('email-reset-password', { body: { action: 'request', email: e, redirect_to: redirectTo } })
      if (error) {
        let msg: string | undefined
        try { msg = (await (error as { context?: Response }).context?.json())?.error } catch { /* ignore */ }
        if (msg) return { ok: false, error: msg }
      } else if (data?.configured !== false) {
        return data?.ok ? { ok: true } : { ok: false, error: data?.error ?? 'Service momentanément indisponible. Réessayez.' }
      }
    } catch { /* repli ci-dessous */ }
    // 2) Repli : envoi standard Supabase
    const { error } = await supabase.auth.resetPasswordForEmail(e, { redirectTo })
    return error ? { ok: false, error: translateAuthError(error.message) } : { ok: true }
  },

  reportEmailResetDone: async () => {
    // Journalise la réussite (sans aucun mot de passe) et prévient le gérant — échec silencieux
    try { await supabase.functions.invoke('email-reset-password', { body: { action: 'done' } }) } catch { /* ignore */ }
  },

  setNewPassword: async (next) => {
    const { error } = await supabase.auth.updateUser({ password: next })
    return error ? { ok: false, error: translateAuthError(error.message) } : { ok: true }
  },
}))
