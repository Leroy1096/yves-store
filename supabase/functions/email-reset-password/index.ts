// YVES STORE — mot de passe oublié par e-mail (envoi automatique) + rapport au gérant
// Actions :
//   { action: 'request', email, redirect_to }  → public : envoie un lien sécurisé (Supabase recovery) par e-mail
//   { action: 'done' } + jeton de la session de récupération → journalise la réussite et prévient le gérant
// Fournisseur d'e-mails : Brevo (BREVO_API_KEY, BREVO_SENDER) ou Resend (RESEND_API_KEY, RESEND_FROM).
// Sans fournisseur configuré : { configured: false } (le site utilise alors l'envoi Supabase par défaut).
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

const BREVO = Deno.env.get('BREVO_API_KEY')
const RESEND = Deno.env.get('RESEND_API_KEY')
// Resend : sans domaine vérifié, seule l'adresse de test onboarding@resend.dev est autorisée
const SENDER = BREVO ? (Deno.env.get('BREVO_SENDER') || 'yvesstore1@gmail.com') : (Deno.env.get('RESEND_FROM') || 'onboarding@resend.dev')
const NOTIFY = Deno.env.get('NOTIFY_EMAIL') || 'yvesstore1@gmail.com'

async function sendMail(to: string, toName: string, subject: string, html: string, text: string): Promise<{ ok: boolean; error?: string }> {
  try {
    if (BREVO) {
      const r = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST', headers: { 'api-key': BREVO, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ sender: { name: 'YVES STORE', email: SENDER }, to: [{ email: to, name: toName || to }], subject, htmlContent: html, textContent: text }),
      })
      return r.ok ? { ok: true } : { ok: false, error: `Brevo ${r.status}: ${(await r.text()).slice(0, 120)}` }
    }
    if (RESEND) {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST', headers: { Authorization: `Bearer ${RESEND}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: `YVES STORE <${SENDER}>`, to: [to], subject, html, text }),
      })
      return r.ok ? { ok: true } : { ok: false, error: `Resend ${r.status}: ${(await r.text()).slice(0, 120)}` }
    }
    return { ok: false, error: 'NOT_CONFIGURED' }
  } catch (e) { return { ok: false, error: String((e as Error)?.message ?? e).slice(0, 120) } }
}

const frame = (title: string, body: string) => `<!doctype html><html lang="fr"><body style="margin:0;background:#F7F3EC;font-family:Arial,Helvetica,sans-serif;color:#0E0D0B">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F3EC;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden">
<tr><td style="background:#0E0D0B;padding:22px 28px;color:#F7F3EC;font-family:Georgia,serif;font-size:24px;letter-spacing:4px">YVES <span style="color:#B8893B;font-size:12px;letter-spacing:6px">STORE</span></td></tr>
<tr><td style="padding:28px"><h1 style="margin:0 0 14px;font-family:Georgia,serif;font-weight:normal;font-size:24px">${title}</h1>${body}</td></tr>
<tr><td style="padding:18px 28px;background:#F7F3EC;color:#77716a;font-size:12px">YVES STORE · Abidjan & Agboville · Côte d'Ivoire</td></tr>
</table></td></tr></table></body></html>`

async function notifyGerant(name: string | null, channel: 'email' | 'whatsapp') {
  if (!BREVO && !RESEND) return
  const when = new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Abidjan', dateStyle: 'short', timeStyle: 'short' })
  const who = name || 'Un client'
  const via = channel === 'email' ? 'le lien reçu par e-mail' : 'le code WhatsApp'
  await sendMail(NOTIFY, 'Gérant YVES STORE', `🔑 Mot de passe réinitialisé — ${who}`,
    frame('Mot de passe réinitialisé', `<p style="font-size:15px;line-height:1.6"><b>${esc(who)}</b> a choisi un nouveau mot de passe avec ${via}, le <b>${esc(when)}</b>.</p><p style="font-size:13px;color:#77716a;line-height:1.6">Aucune action n'est nécessaire. Si ce client vous contacte en disant qu'il n'a rien demandé, bloquez son compte dans « Clients inscrits » puis appelez-le.</p><p style="font-size:13px;color:#77716a">Le journal complet est disponible dans l'Assistant IA : « rapport mots de passe ».</p>`),
    `${who} a réinitialisé son mot de passe avec ${via} le ${when}. Journal complet : Assistant IA → « rapport mots de passe ».`)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ ok: false, error: 'METHOD' }, 405)
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  let body: { action?: string; email?: string; redirect_to?: string }
  try { body = await req.json() } catch { return json({ ok: false, error: 'Requête invalide.' }, 400) }
  const log = (user_id: string | null, customer_name: string | null, event: string, detail: string) =>
    admin.from('password_reset_log').insert({ user_id, customer_name, channel: 'email', event, detail: detail.slice(0, 200) })

  // ── Réussite : appelé après le changement de mot de passe (session de récupération) ──
  if (body.action === 'done') {
    const auth = req.headers.get('Authorization') ?? ''
    if (!auth.startsWith('Bearer ')) return json({ ok: false }, 401)
    const user = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } })
    const { data, error } = await user.rpc('log_password_reset_email_done')
    if (error || !data?.ok) return json({ ok: false })
    if (!data.already) {
      const { data: u } = await user.auth.getUser()
      const { data: name } = u?.user ? await admin.rpc('short_name', { p_user: u.user.id }) : { data: null }
      await notifyGerant(name ?? null, 'email')
    }
    return json({ ok: true })
  }

  // ── Demande de lien ──
  if (body.action !== 'request') return json({ ok: false, error: 'Action inconnue.' }, 400)
  if (!BREVO && !RESEND) return json({ configured: false })
  const email = String(body.email ?? '').trim().toLowerCase().slice(0, 160)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json({ ok: false, error: 'Adresse e-mail invalide.' }, 400)
  const neutral = json({ ok: true, configured: true })
  if (email.endsWith('@tel.yvesstore.ci')) return neutral // comptes créés avec un numéro : pas d'e-mail réel

  const { data: uid } = await admin.rpc('resolve_account', { p_identifier: email })
  if (!uid) return neutral // réponse neutre : on ne révèle pas si le compte existe
  const { data: name } = await admin.rpc('short_name', { p_user: uid })

  const since = new Date(Date.now() - 3600_000).toISOString()
  const { count } = await admin.from('password_reset_log').select('id', { count: 'exact', head: true })
    .eq('user_id', uid).eq('channel', 'email').eq('event', 'demande').gte('created_at', since)
  if ((count ?? 0) >= 3) {
    await log(uid, name, 'limite', 'Plus de 3 demandes en 1 heure')
    return json({ ok: false, error: 'Trop de demandes. Réessayez dans une heure ou demandez un code sur WhatsApp.' }, 429)
  }
  await log(uid, name, 'demande', 'Demande de lien par e-mail')

  const redirectTo = /^https:\/\/[^\s]+$/.test(String(body.redirect_to ?? '')) ? String(body.redirect_to) : undefined
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({ type: 'recovery', email, options: redirectTo ? { redirectTo } : undefined })
  const url = link?.properties?.action_link
  if (linkErr || !url) {
    await log(uid, name, 'echec', `Lien non généré : ${linkErr?.message ?? 'inconnu'}`)
    return json({ ok: false, error: 'Envoi impossible pour le moment. Demandez un code sur WhatsApp.' }, 500)
  }
  const first = (name ?? '').split(' ')[0]
  const sent = await sendMail(email, first, 'Réinitialisez votre mot de passe YVES STORE',
    frame('Nouveau mot de passe', `<p style="font-size:15px;line-height:1.6">Bonjour${first ? ` ${esc(first)}` : ''},</p><p style="font-size:15px;line-height:1.6">Vous avez demandé à réinitialiser le mot de passe de votre compte YVES STORE. Cliquez sur le bouton ci-dessous pour en choisir un nouveau :</p>
<p style="text-align:center;margin:26px 0"><a href="${esc(url)}" style="display:inline-block;background:#0E0D0B;color:#F7F3EC;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:bold;font-size:13px;letter-spacing:1px">CHOISIR UN NOUVEAU MOT DE PASSE</a></p>
<p style="font-size:13px;color:#77716a;line-height:1.6">Ce lien est valable <b>1 heure</b> et ne fonctionne qu'une fois. Si vous n'avez rien demandé, ignorez cet e-mail : votre mot de passe actuel reste valable.</p><p style="font-size:13px;color:#77716a">Besoin d'aide ? WhatsApp : +225 01 40 81 04 15</p>`),
    `Bonjour${first ? ` ${first}` : ''},\n\nPour choisir un nouveau mot de passe YVES STORE, ouvrez ce lien (valable 1 heure, une seule fois) :\n${url}\n\nSi vous n'avez rien demandé, ignorez cet e-mail.\nAide WhatsApp : +225 01 40 81 04 15`)
  if (!sent.ok) {
    await log(uid, name, 'echec', `E-mail non envoyé : ${sent.error}`)
    return json({ ok: false, error: 'Envoi impossible pour le moment. Demandez un code sur WhatsApp.' }, 502)
  }
  await log(uid, name, 'envoye', 'Lien envoyé automatiquement par e-mail')
  return neutral
})
