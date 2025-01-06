import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.iMoto',
  appName: 'iMoto',
  webDir: 'www',
  bundledWebRuntime: false,
  cordova: {},
  plugins: {
    SplashScreen: {
      launchShowDuration: 0
    }
  }
};

export default config;