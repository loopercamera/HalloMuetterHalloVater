import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'testapp_2025',
  webDir: 'www'
  android: {
  allowMixedContent: true,
  },
  server: {
  cleartext: true,
  }
};

export default config;
