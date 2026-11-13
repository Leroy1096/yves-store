// Assistant IA du gérant YVES STORE — Google Gemini (ou OpenAI en option)
// Réservé aux gérants (vérification is_admin avec le jeton de l'appelant).
// La clé reste côté serveur (secret GEMINI_API_KEY). Sans clé : { configured: false }
// et le site utilise son moteur d'analyse intégré.
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const SYSTEM = `Tu es l'assistant IA du gérant de YVES STORE, boutique en ligne en Côte d'Ivoire (Abidjan, Agboville) : accessoires de téléphone, vêtements, chaussures, bijoux, produits pour cheveux. Monnaie : FCFA. Tu agis comme un directeur commercial expérimenté et bienveillant.

RÈGLES ABSOLUES
- Tous les chiffres viennent UNIQUEMENT du bloc DONNÉES ci-dessous. N'invente jamais un montant, un nom, un pourcentage ou une tendance. Tu peux faire des calculs simples à partir des DONNÉES (sommes, moyennes, pourcentages).
- Chaque chiffre doit correspondre à la bonne période des DONNÉES : ne mélange pas « mois en cours », « 30 derniers jours » et « année ». Avant de répondre, vérifie chaque montant cité.
- Si une information n'est pas dans les DONNÉES, dis-le clairement (« je n'ai pas cette information ») et propose ce que tu peux faire à la place.
- Respecte « limites_des_donnees » : ne parle jamais de paiement « confirmé » ou « reçu » (seul le moyen choisi est connu), ni de marge ou de bénéfice (pas de prix d'achat).
- Confidentialité : ne cite les clients que par prénom + initiale, comme dans les DONNÉES. Ne demande ni ne produis jamais de numéro de téléphone, d'e-mail ou d'adresse.
- Tu ne peux modifier AUCUNE donnée (prix, stock, commandes, clients). Si le gérant demande une action, propose précisément quoi faire et indique l'écran du back-office où la valider : Commandes, Clients inscrits, Produits & prix, Stock, Messages WhatsApp.
- Hors sujet (météo, actualité, etc.) : réponds poliment que tu es dédié à la boutique.

STYLE
- Français simple, chaleureux et concret. Phrases courtes. Listes à puces commençant par "- ". Mots importants en **gras**. Pas de tableaux, pas de titres #.
- 200 mots maximum, SAUF pour un audit, un rapport ou un texte à rédiger (jusqu'à 450 mots).
- Montants au format « 12 500 FCFA ». Précise toujours la période des chiffres (aujourd'hui, 30 derniers jours, ce mois…).
- Termine par 1 à 3 conseils actionnables quand c'est utile (réassort, promotion, relance WhatsApp, traitement des commandes).

AUDIT / RAPPORT (si on te le demande) : sections en gras « Ventes », « Commandes », « Stock », « Clients », puis « Points forts », « Points à surveiller », « Plan d'action » (3 à 5 actions numérotées), et une ligne finale sur les limites des données.

Tu peux rédiger des descriptions produits, des posts WhatsApp/Facebook/Instagram/TikTok et des messages clients, en restant fidèle aux prix et produits des DONNÉES.`

const DEFAULT_MODELS = 'gemini-3-flash-preview,gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-flash-latest'

async function callGemini(key: string, model: string, system: string, contents: unknown[]) {
  const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 40_000)
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents, generationConfig: { temperature: 0.3, maxOutputTokens: 4096 } }),
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) return { ok: false, status: r.status, error: String(j?.error?.message ?? 'AI_ERROR').slice(0, 200) }
    const text = (j?.candidates?.[0]?.content?.parts ?? []).filter((p: { thought?: boolean }) => !p.thought).map((p: { text?: string }) => p.text ?? '').join('').trim()
    return text ? { ok: true, text } : { ok: false, status: 502, error: `EMPTY (${j?.candidates?.[0]?.finishReason ?? '?'})` }
  } catch (e) {
    return { ok: false, status: 504, error: String((e as Error)?.name === 'AbortError' ? 'TIMEOUT' : (e as Error)?.message ?? e) }
  } finally { clearTimeout(timer) }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'METHOD' }, 405)
  try {
    const auth = req.headers.get('Authorization') ?? ''
    if (!auth.startsWith('Bearer ')) return json({ error: 'FORBIDDEN' }, 401)
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } })
    const { data: isAdmin, error: adminErr } = await sb.rpc('is_admin')
    if (adminErr || isAdmin !== true) return json({ error: 'FORBIDDEN' }, 403)

    const openai = Deno.env.get('OPENAI_API_KEY')
    const gemini = Deno.env.get('GEMINI_API_KEY')
    if (!openai && !gemini) return json({ configured: false })

    const body = await req.json().catch(() => ({}))
    const question = String(body?.question ?? '').slice(0, 800).trim()
    if (!question) return json({ error: 'EMPTY' }, 400)
    const history = (Array.isArray(body?.history) ? body.history : []).slice(-8)
      .map((m: { role?: string; text?: string }) => ({ role: m.role === 'user' ? 'user' : 'assistant', text: String(m.text ?? '').slice(0, 1500) }))
      .filter((m: { text: string }) => m.text)
    const facts = JSON.stringify(body?.facts ?? {})
    if (facts.length > 120_000) return json({ error: 'FACTS_TOO_LARGE' }, 413)
    const system = `${SYSTEM}\n\nDONNÉES (à jour, calculées par le serveur de la boutique) :\n${facts}`

    if (gemini) {
      // Gemini attend une conversation qui commence par l'utilisateur
      const turns = history.map((m: { role: string; text: string }) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] }))
      while (turns.length && turns[0].role !== 'user') turns.shift()
      const contents = [...turns, { role: 'user', parts: [{ text: question }] }]
      const models = (Deno.env.get('GEMINI_MODEL') || DEFAULT_MODELS).split(',').map((s) => s.trim()).filter(Boolean)
      const errors: string[] = []
      for (const model of models) {
        const r = await callGemini(gemini, model, system, contents)
        if (r.ok) return json({ configured: true, provider: 'gemini', model, answer: r.text })
        errors.push(`${model}: ${r.status} ${r.error}`)
        // 400 = requête invalide : inutile d'essayer un autre modèle
        if (r.status === 400 || r.status === 401 || r.status === 403) break
      }
      console.error('Gemini indisponible', errors.join(' | '))
      return json({ configured: true, error: 'AI_UNAVAILABLE' }, 502)
    }

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openai}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini', temperature: 0.3, max_tokens: 1500,
        messages: [{ role: 'system', content: system }, ...history.map((m: { role: string; text: string }) => ({ role: m.role, content: m.text })), { role: 'user', content: question }],
      }),
    })
    const j = await r.json()
    if (!r.ok) return json({ configured: true, error: 'AI_UNAVAILABLE' }, 502)
    return json({ configured: true, provider: 'openai', answer: String(j?.choices?.[0]?.message?.content ?? '').trim() })
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e).slice(0, 200) }, 500)
  }
})
