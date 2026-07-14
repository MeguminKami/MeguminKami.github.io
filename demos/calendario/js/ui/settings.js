export class SettingsPanel {
  constructor({ onSounds, onNowLineScope, onAvatar, onSwitchUser, onExport, onPrint, onMobilePreview, onLock }) {
    this.dialog = document.querySelector("#settings-dialog");
    this.sounds = document.querySelector("#sounds-toggle");
    this.nowLineScope = document.querySelector("#now-line-scope");
    document.querySelector("#settings-open").addEventListener("click", () => this.dialog.showModal());
    this.sounds.addEventListener("change", () => onSounds(this.sounds.checked));
    this.nowLineScope.addEventListener("change", () => onNowLineScope(this.nowLineScope.value));
    document.querySelector("#avatar-open").addEventListener("click", () => { this.dialog.close(); onAvatar(); });
    document.querySelector("#switch-user").addEventListener("click", () => { this.dialog.close(); onSwitchUser(); });
    document.querySelectorAll("[data-export]").forEach((button) => button.addEventListener("click", () => onExport(button.dataset.export)));
    document.querySelector("#print-calendar").addEventListener("click", () => { this.dialog.close(); onPrint(); });
    document.querySelector("#mobile-preview-open").addEventListener("click", () => { this.dialog.close(); onMobilePreview(); });
    document.querySelector("#lock-app").addEventListener("click", () => { this.dialog.close(); onLock(); });
  }
  setSounds(value) { this.sounds.checked = value; }
  setNowLineScope(value) { this.nowLineScope.value = value === "today" ? "today" : "week"; }
}
