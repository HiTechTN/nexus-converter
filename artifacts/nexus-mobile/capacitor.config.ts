import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.nexusconverter.app",
  appName: "NEXUS Converter",
  webDir: "../media-converter/dist",
  server: {
    androidScheme: "https",
    cleartext: true, // Permet les requêtes HTTP vers l'API locale
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#0a0a1a",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      spinnerColor: "#e94560",
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0a0a1a",
    },
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
    },
    allowMixedContent: true,
    captureInput: true,
  },
  ios: {
    scheme: "NEXUS Converter",
    contentInset: "always",
    preferredContentMode: "mobile",
  },
};

export default config;
