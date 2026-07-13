const DEVICES = {
  "320": { width: 320, height: 700, label: "320 px" },
  "390": { width: 390, height: 844, label: "390 px" },
  "430": { width: 430, height: 900, label: "430 px" }
};

export class MobilePreview {
  constructor() {
    this.dialog = document.querySelector("#mobile-preview-dialog");
    this.frame = document.querySelector("#mobile-preview-frame");
    this.stage = document.querySelector("#mobile-preview-stage");
    this.device = document.querySelector("#mobile-preview-device");
    this.dimensions = document.querySelector("#mobile-preview-dimensions");
    this.selected = "390";
    this.landscape = false;
    document.querySelectorAll("[data-preview-width]").forEach((button) => button.addEventListener("click", () => {
      this.selected = button.dataset.previewWidth;
      this.render();
    }));
    document.querySelector("#mobile-preview-rotate").addEventListener("click", () => { this.landscape = !this.landscape; this.render(); });
    document.querySelector("#mobile-preview-reload").addEventListener("click", () => { if (this.frame.src) this.frame.contentWindow?.location.reload(); });
    window.addEventListener("resize", () => { if (this.dialog.open) this.render(); });
  }

  open() {
    if (!this.frame.src || this.frame.src === "about:blank") {
      const url = new URL(location.href);
      url.searchParams.set("mobile-preview", "1");
      url.hash = "";
      this.frame.src = url.href;
    }
    this.dialog.showModal();
    this.render();
  }

  render() {
    const selected = DEVICES[this.selected];
    const width = this.landscape ? selected.height : selected.width;
    const height = this.landscape ? selected.width : selected.height;
    const availableWidth = Math.max(280, innerWidth - 120);
    const availableHeight = Math.max(320, innerHeight - 245);
    const scale = Math.max(.42, Math.min(.82, availableWidth / (width + 28), availableHeight / (height + 28)));
    this.frame.style.width = `${width}px`;
    this.frame.style.height = `${height}px`;
    this.device.style.width = `${width}px`;
    this.device.style.height = `${height}px`;
    this.device.style.transform = `scale(${scale})`;
    this.stage.style.width = `${Math.ceil(width * scale + 24)}px`;
    this.stage.style.height = `${Math.ceil(height * scale + 24)}px`;
    this.dimensions.textContent = `${width} × ${height} px · escala ${Math.round(scale * 100)}%`;
    document.querySelectorAll("[data-preview-width]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.previewWidth === this.selected)));
    document.querySelector("#mobile-preview-rotate").setAttribute("aria-pressed", String(this.landscape));
  }
}
