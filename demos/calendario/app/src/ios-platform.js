const CANCEL_PATTERN = /cancel(?:led|ed)?|dismiss(?:ed)?|user\s+cancel/i;

function safeFileName(value) {
  const fileName = String(value || "").trim();
  if (!fileName || fileName === "." || fileName === ".." || /[\\/:\0]/u.test(fileName)) {
    throw new TypeError("O nome do ficheiro não é seguro.");
  }
  return fileName;
}

function cancelled(error) {
  return error?.code === "ACTION_CANCELLED" || CANCEL_PATTERN.test(String(error?.message || error || ""));
}

function shared(result) {
  return Boolean(result?.activityType);
}

function subscriptionRegistry(register) {
  const subscriptions = new Map();
  return async (listener) => {
    if (typeof listener !== "function") throw new TypeError("O listener tem de ser uma função.");
    let record = subscriptions.get(listener);
    if (!record) {
      record = { references: 0, handle: await register(listener) };
      subscriptions.set(listener, record);
    }
    record.references += 1;
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      record.references -= 1;
      if (record.references === 0) {
        subscriptions.delete(listener);
        void record.handle.remove();
      }
    };
  };
}

export function createIOSPlatform({
  App,
  Browser,
  Directory,
  Encoding,
  Filesystem,
  NativePrint,
  Network,
  Share,
  initialOnline = globalThis.navigator?.onLine !== false
}) {
  if (![App, Browser, Directory, Encoding, Filesystem, NativePrint, Network, Share].every(Boolean)) {
    throw new TypeError("Faltam dependências nativas para criar o adapter iOS.");
  }

  let online = Boolean(initialOnline);
  const onNetworkChange = subscriptionRegistry(async (listener) => Network.addListener("networkStatusChange", (status) => {
    online = Boolean(status.connected);
    listener(online);
  }));
  const onForeground = subscriptionRegistry(async (listener) => App.addListener("appStateChange", ({ isActive }) => {
    if (isActive) listener();
  }));

  async function shareUri({ uri, title }) {
    try {
      return shared(await Share.share({ title, url: uri, dialogTitle: title })) ? "shared" : "cancelled";
    } catch (error) {
      if (cancelled(error)) return "cancelled";
      throw error;
    }
  }

  return Object.freeze({
    kind: "ios",
    isOnline: () => online,
    async refreshNetwork() {
      online = Boolean((await Network.getStatus()).connected);
      return online;
    },
    onNetworkChange,
    onForeground,
    async exportFile({ content, mimeType, fileName }) {
      const path = `exports/${safeFileName(fileName)}`;
      let created = false;
      try {
        await Filesystem.writeFile({ path, data: String(content), directory: Directory.Cache, encoding: Encoding.UTF8, recursive: true });
        created = true;
        const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache });
        const status = await shareUri({ uri, title: `Exportar ${fileName}` });
        return { status };
      } finally {
        if (created) {
          try { await Filesystem.deleteFile({ path, directory: Directory.Cache }); } catch { /* A cache também é eliminada pelo sistema. */ }
        }
      }
    },
    async printCurrentView({ jobName = "O Que Vais Fazer?" } = {}) {
      try {
        return { completed: Boolean((await NativePrint.printCurrentView({ jobName })).completed) };
      } catch (error) {
        if (cancelled(error)) return { completed: false };
        throw error;
      }
    },
    async sharePdf({ fileName }) {
      const safeName = safeFileName(fileName);
      const { uri } = await NativePrint.createPdf({ fileName: safeName });
      if (!uri) throw new Error("O PDF nativo não devolveu um URI.");
      try {
        return { status: await shareUri({ uri, title: "Partilhar calendário em PDF" }) };
      } finally {
        try { await Filesystem.deleteFile({ path: uri }); } catch { /* Melhor esforço: ficheiro temporário. */ }
      }
    },
    async openExternalUrl(value) {
      const url = new URL(value);
      if (url.protocol !== "http:" && url.protocol !== "https:") throw new TypeError("Só são permitidos links HTTP ou HTTPS.");
      await Browser.open({ url: url.href, presentationStyle: "popover" });
    }
  });
}

export const iosPlatformInternals = Object.freeze({ cancelled, safeFileName, shared });
