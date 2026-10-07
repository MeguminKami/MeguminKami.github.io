function safeExternalUrl(value, base) {
  try {
    const url = new URL(value, base);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function createWebPlatform({ window: windowObject = globalThis.window, document: documentObject = globalThis.document } = {}) {
  if (!windowObject || !documentObject) throw new Error("A plataforma web requer window e document.");

  const isOnline = () => windowObject.navigator?.onLine !== false;

  return {
    kind: "web",
    isOnline,
    async refreshNetwork() { return isOnline(); },
    async onNetworkChange(listener) {
      const online = () => listener(true);
      const offline = () => listener(false);
      windowObject.addEventListener("online", online);
      windowObject.addEventListener("offline", offline);
      return () => {
        windowObject.removeEventListener("online", online);
        windowObject.removeEventListener("offline", offline);
      };
    },
    async onForeground(listener) {
      const visible = () => { if (documentObject.visibilityState !== "hidden") listener(); };
      windowObject.addEventListener("pageshow", visible);
      documentObject.addEventListener("visibilitychange", visible);
      return () => {
        windowObject.removeEventListener("pageshow", visible);
        documentObject.removeEventListener("visibilitychange", visible);
      };
    },
    async exportFile({ content, mimeType, fileName }) {
      const url = windowObject.URL.createObjectURL(new windowObject.Blob([content], { type: mimeType }));
      const link = documentObject.createElement("a");
      link.href = url;
      link.download = fileName;
      link.hidden = true;
      documentObject.body.append(link);
      link.click();
      link.remove();
      windowObject.setTimeout(() => windowObject.URL.revokeObjectURL(url), 1000);
      return { status: "downloaded" };
    },
    async printCurrentView() {
      windowObject.print();
      return { completed: true };
    },
    async sharePdf() {
      windowObject.print();
      return { status: "shared" };
    },
    async openExternalUrl(value) {
      const url = safeExternalUrl(value, windowObject.location?.href);
      if (!url) throw new Error("Só é possível abrir endereços HTTP ou HTTPS.");
      const opened = windowObject.open(url, "_blank", "noopener,noreferrer");
      if (opened) opened.opener = null;
    }
  };
}

export { safeExternalUrl };
