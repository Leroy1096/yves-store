# YVES STORE — Mise en ligne, appli Android et maintenance

## 1. Vue d'ensemble
| Élément | Où | Mise à jour |
|---|---|---|
| Code source | GitHub `Leroy1096/yves-store` (branche `main`) | à chaque envoi (push) |
| Site web | Vercel (projet `yves-store`) | **automatique** à chaque push sur `main` |
| Appli Android (APK) | GitHub → onglet **Releases** | **automatique** à chaque push (workflow « Appli Android (APK) ») |
| Base de données, comptes, e-mails | Supabase (projet `zgxsjvqepjwuzhyskeve`) | migrations SQL / fonctions |

Le site et l'appli utilisent **la même base** : un client inscrit sur le site se connecte avec le même compte dans l'appli ; une commande passée dans l'appli apparaît dans l'espace gérant.

## 2. Variables d'environnement (publiques)
| Nom | Rôle |
|---|---|
| `VITE_SUPABASE_URL` | adresse du projet Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | clé **publique** Supabase (protégée par les règles RLS) |

Elles sont définies : dans `.env` (local, non versionné), dans Vercel (Settings → Environment Variables) et dans GitHub (Settings → Secrets and variables → Actions → **Variables**).

**Les clés secrètes** (Resend, Gemini, secret du webhook) ne sont **jamais** dans le code : elles sont uniquement dans Supabase → Edge Functions → Secrets.

## 3. Site web (Vercel)
- Framework : Vite — commande `npm run build` — dossier `dist`.
- `vercel.json` : redirection SPA (toutes les pages → `index.html`), cache long des images et du JS, en-têtes de sécurité.
- Après un changement d'adresse (domaine `yvesstore.com` acheté) : ajouter le domaine dans Vercel → Domains, puis mettre la nouvelle adresse dans
  Supabase → Authentication → URL Configuration (Site URL + Redirect URLs) et dans le secret `SITE_URL` des fonctions.

## 4. Appli Android (Capacitor + GitHub Actions)
- Capacitor 7 embarque le site (`dist/`) dans une appli native. Identifiant : `ci.yvesstore.app`.
- Workflow `.github/workflows/android.yml` : build du site → `cap sync` → `gradlew assembleRelease` → signature → publication dans **Releases** (`YVES-STORE.apk`).
- Lien permanent de la dernière version :
  `https://github.com/Leroy1096/yves-store/releases/latest/download/YVES-STORE.apk`
- Relancer à la main : GitHub → Actions → « Appli Android (APK) » → **Run workflow**.

### Signature (très important)
Secrets GitHub nécessaires : `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
Le fichier de clé (`.jks`) et son mot de passe sont conservés **hors du dépôt**. Perdre la clé = impossible de mettre à jour l'appli
installée chez les clients (il faudrait la désinstaller). Faites-en 2 copies (clé USB + Drive privé).

### Installer l'APK sur un téléphone
1. Ouvrir le lien ci-dessus sur le téléphone Android.
2. Ouvrir le fichier téléchargé → autoriser « Installer des applis inconnues » pour le navigateur.
3. Installer, puis ouvrir **YVES STORE**.

Pour le Google Play Store plus tard : compte développeur (25 $ une fois), générer un `.aab` (`./gradlew bundleRelease`) avec la même clé.

## 5. Contrôle qualité automatique
`.github/workflows/ci.yml` lance à chaque push : `npm ci` → ESLint → `tsc` + build. Un ❌ rouge sur GitHub = ne pas considérer la version comme prête.

## 6. Commandes utiles (développeur)
```bash
npm install
npm run dev          # site en local (http://localhost:5173)
npm run build        # contrôle des types + build de production (dist/)
npm run lint
npx cap sync android # copier le build dans le projet Android
```

## 7. Points restant à faire par le propriétaire
- Domaine `yvesstore.com` + domaine vérifié chez Resend (e-mails aux clients).
- Supabase → Authentication → Providers/Policies : longueur minimale du mot de passe **8** (le site l'impose déjà, mais le serveur accepte 6).
- Liens réels Instagram / Facebook / TikTok (fichier `src/components/Footer.tsx`, tableau `SOCIALS` — icônes masquées tant qu'il est vide).
- Paiement en ligne réel (Mobile Money) : aujourd'hui « paiement à la livraison » / confirmation manuelle.
