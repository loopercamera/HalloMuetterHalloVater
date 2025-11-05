import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'HalloMuetterHalloVater',
  webDir: 'www',
  android: { allowMixedContent: true },
  server: { cleartext: true }
};

export default config;
