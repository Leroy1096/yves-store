# YVES STORE — Rapport d'audit, corrections et mise en ligne
_Date : 14 novembre 2026 — commit de référence : voir `git log`_

## Liens de livraison
| Livrable | Lien | État |
|---|---|---|
| Site web (Vercel) | https://yves-store.vercel.app | ✅ en ligne, testé |
| Appli Android (dernière version) | https://github.com/Leroy1096/yves-store/releases/latest/download/YVES-STORE.apk | ✅ publique, testée (téléchargement + signature) |
| Page des versions | https://github.com/Leroy1096/yves-store/releases | ✅ |
| Code source | https://github.com/Leroy1096/yves-store | ✅ public (aucun secret dans le code ni l'historique — vérifié) |
| Contrôles automatiques | https://github.com/Leroy1096/yves-store/actions | ✅ CI + APK au vert |

---

## 1. Nature et architecture
Boutique e-commerce ivoirienne (mode, bijoux, chaussures, tech, soins capillaires) avec espace client et **espace gérant** (commandes, stock, prix, avis, nouveautés, assistant IA).

```
Navigateur / Appli Android (Capacitor, même code)
        │  HTTPS
        ▼
Site statique (Vite + React) ── hébergé sur Vercel (CDN, HTTPS, en-têtes de sécurité)
        │  clé publique + règles RLS
        ▼
Supabase : Postgres (13 tables, RLS partout) · Auth · 5 fonctions Edge (e-mails Resend, IA Gemini, alertes gérant)
```

## 2. Technologies
React 18 · TypeScript · Vite 5 · Tailwind 3 · Framer Motion · Zustand · React Router 6 · Supabase JS 2 · Capacitor 7 (Android) · GitHub Actions · Vercel.

## 3. Fonctionnalités — état
| Fonction | État |
|---|---|
| Catalogue, boutique filtrable, recherche, fiche produit, options (ex. perruque longueur/qualité) | ✅ fonctionne (base réelle) |
| Panier, favoris, codes promo | ✅ |
| Commande (livraison Abidjan/intérieur/retrait) | ✅ enregistrée en base |
| Paiement Mobile Money / carte en ligne | ⚠️ **simulé** : paiement à la livraison / confirmation manuelle (pas d'agrégateur branché) |
| Comptes clients, mot de passe oublié (WhatsApp / e-mail) | ✅ |
| Avis clients + réponses gérant | ✅ |
| Espace gérant (commandes, stock, prix, avis, nouveautés, messages) | ✅ protégé (rôle admin vérifié côté serveur) |
| Assistant IA du gérant (2 actions auto, le reste avec accord) | ✅ |
| E-mails aux clients | ⚠️ limités : sans domaine vérifié chez Resend, seuls les envois au gérant passent |
| Pages légales (CGV, confidentialité) | ✅ **ajoutées** |
| PWA (installable depuis le navigateur) | ✅ **ajoutée** (manifest + icônes) |
| Appli Android | ✅ **ajoutée** |

## 4. Problèmes trouvés et corrigés
| Priorité | Problème | Correction |
|---|---|---|
| P1 sécurité | **Redirection ouverte** : `/compte?redirect=//site-pirate.com` renvoyait vers un site externe après connexion | Seuls les chemins internes sont acceptés (testé : `//evil.com`, `/\evil.com`, `https://…` refusés) |
| P1 | Liens d'authentification Supabase pointant vers une adresse de test (e2b) | Site URL + liste blanche → `https://yves-store.vercel.app` (+ appli) |
| P1 | Liens de la newsletter vers `yvesstore.com` (domaine pas encore acheté → liens morts) | Secret `SITE_URL` = adresse Vercel |
| P1 | Site non déployé / pas d'appli | Vercel + APK signé via GitHub Actions |
| P2 | « CGU / confidentialité » cités mais **aucune page** | Pages `/conditions` et `/confidentialite`, liées à l'inscription, au paiement et au pied de page |
| P2 | Pied de page : icônes réseaux sociaux en `#` (liens morts), e-mail fictif `contact@yvesstore.ci` | Icônes masquées tant qu'aucune adresse n'est fournie ; e-mail réel `yvesstore1@gmail.com` ; rubriques « Aide » cliquables |
| P2 | Le titre d'une section était caché sous l'en-tête fixe en arrivant par une ancre | Décalage de défilement |
| P3 | 15 erreurs ESLint (bloquaient un contrôle qualité automatique) | 0 erreur (28 avertissements mineurs) |
| P3 | Pas d'en-têtes de sécurité HTTP | `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` (HSTS fourni par Vercel) |
| P3 | Pas de `robots.txt` (espace gérant indexable) | Ajouté |

## 5. Sécurité — bilan
- ✅ RLS active sur les 13 tables ; écriture directe limitée à « créer sa commande » et « modifier son profil » (colonnes sensibles exclues).
- ✅ Fonctions admin non exécutables par un visiteur ; `search_path` figé.
- ✅ Aucune clé secrète dans le code, le build ou l'historique Git (scan des 19 commits).
- ✅ Clé de signature Android hors du dépôt, stockée chiffrée dans les secrets GitHub.
- ⚠️ **À faire par vous** (non modifiable par mes outils) : Supabase → Authentication → longueur minimale du mot de passe **8** (le site impose 8, le serveur accepte encore 6) ; activer « Leaked password protection ».
- ⚠️ Confirmation d'e-mail désactivée à l'inscription (choix actuel pour simplifier ; à réactiver quand le domaine e-mail sera prêt).
- ⚠️ `npm audit` : 2 alertes « modérées » sur React Router 6 (la seule exploitable concernait la redirection, corrigée ici). Passage à React Router 7 = changement majeur, à planifier.
- 🔁 Recommandé : régénérer la clé Gemini (elle a circulé dans nos échanges).

## 6. Tests réalisés (preuves : `audit/tests-46/`)
| Test | Local (build prod) | En ligne (Vercel) |
|---|---|---|
| Accueil + 72 produits réels depuis Supabase | ✅ | ✅ |
| Boutique | ✅ | ✅ |
| Fiche produit en accès direct (réécriture SPA) | ✅ | ✅ |
| CGV + ancre `#retours` | ✅ | ✅ |
| Page Confidentialité | ✅ | ✅ |
| Pied de page sans lien `#`, e-mail réel, liens légaux | ✅ | ✅ |
| Page connexion | ✅ | ✅ |
| Manifest PWA + icône | ✅ | ✅ |
| Espace gérant inaccessible sans connexion | ✅ | ✅ |
| Mobile 390 px sans débordement | ✅ | ✅ |
| Aucune erreur JavaScript | ✅ | ✅ |
| En-têtes sécurité + cache images (curl) | — | ✅ |
| CI GitHub (ESLint + TypeScript + build) | — | ✅ |
| Build APK + signature vérifiée (empreinte SHA-256 `1F:03:B2:…:DD:64`) | — | ✅ |
| Téléchargement public de l'APK sans compte | — | ✅ (HTTP 200, 9,6 Mo) |
| **Installation de l'APK sur un vrai téléphone** | — | ⏳ **non fait — impossible ici** (pas de téléphone/émulateur) : à faire par vous |
| Paiement Mobile Money réel | — | ❌ non applicable (paiement simulé) |
| Connexion gérant sur le site en ligne | — | ⏳ non fait (je n'ai pas votre mot de passe réel) |
| Inscription d'un vrai client en ligne | — | ⏳ non fait volontairement (éviter de créer un faux compte dans votre base réelle) |

## 7. À valider par vous
1. **Texte des CGV** (pages `/conditions`, `/confidentialite`) : rédigé à partir des règles déjà affichées sur le site (livraison 2 000 / 3 500 FCFA, retours 7 jours, annulation 24 h…). Relisez-le ; ajoutez si besoin des exclusions d'hygiène (perruques portées, boucles d'oreilles…) — je ne les ai **pas** inventées.
2. Liens Instagram / Facebook / TikTok à me donner.
3. Adresse physique de la boutique (le pied de page affiche encore une adresse générique).

## 8. Stratégie — suite conseillée
1. Domaine `yvesstore.com` → brancher sur Vercel + vérifier chez Resend (e-mails clients).
2. Paiement réel : agrégateur Mobile Money (ex. Wave Business, PayDunya, FedaPay) via une fonction Edge.
3. Google Play : compte développeur (25 $), build `.aab` avec la même clé.
4. Mise à jour React Router 7 + Vite 6 (une fois tout validé).
