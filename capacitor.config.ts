import type { CapacitorConfig } from '@capacitor/cli'

/** Application Android YVES STORE : le même site (dossier dist/) embarqué dans l’appli,
 *  connecté à la MÊME base Supabase que le site web (mêmes comptes, commandes, stock). */
const config: CapacitorConfig = {
  appId: 'ci.yvesstore.app',
  appName: 'YVES STORE',
  webDir: 'dist',
  backgroundColor: '#0E0D0B',
  android: {
    allowMixedContent: false,
    backgroundColor: '#0E0D0B',
  },
}

export default config
