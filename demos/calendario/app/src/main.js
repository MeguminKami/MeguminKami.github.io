import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { registerPlugin } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Keyboard, KeyboardResize } from "@capacitor/keyboard";
import { Network } from "@capacitor/network";
import { Share } from "@capacitor/share";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import Database from "emoji-picker-element/database";
import Picker from "emoji-picker-element/picker";
import * as firebaseApp from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth/web-extension";
import * as firebaseFirestore from "firebase/firestore";

import { startApplication } from "../../js/app.js";
import { firebaseConfig, spaceId } from "../../js/config.js";
import { createWebPlatform } from "../../js/platform/web-platform.js";
import { createIOSPlatform } from "./ios-platform.js";

const NativePrint = registerPlugin("NativePrint");
const embeddedPreview = new URLSearchParams(location.search).has("mobile-preview");
const firebaseAuth = Object.freeze({ getAuth, signInAnonymously });

const runtime = {
  firebase: {
    config: globalThis.__OQVF_TEST_MODE__ === true ? null : firebaseConfig,
    spaceId,
    loadModules: async () => ({ app: firebaseApp, auth: firebaseAuth, firestore: firebaseFirestore })
  },
  emoji: {
    dataSources: {
      pt: new URL("../data/emoji/pt.json", import.meta.url).href,
      en: new URL("../data/emoji/en.json", import.meta.url).href
    },
    loadDatabaseModule: async () => ({ Database }),
    loadPickerModule: async () => ({ Picker })
  }
};

const platform = embeddedPreview
  ? createWebPlatform()
  : createIOSPlatform({ App, Browser, Directory, Encoding, Filesystem, NativePrint, Network, Share });

async function configureNativeChrome() {
  if (embeddedPreview) return;
  document.documentElement.classList.add("platform-ios");
  await Promise.allSettled([
    platform.refreshNetwork(),
    Keyboard.setResizeMode({ mode: KeyboardResize.Native }),
    StatusBar.setOverlaysWebView({ overlay: false }),
    StatusBar.setStyle({ style: Style.Dark })
  ]);
}

await configureNativeChrome();
const application = Promise.resolve().then(() => startApplication({ platform, runtime }));
if (!embeddedPreview) void SplashScreen.hide();
await application;
