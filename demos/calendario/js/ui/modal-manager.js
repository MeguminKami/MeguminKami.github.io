export class ModalManager {
  constructor() {
    document.addEventListener("click", (event) => {
      const close = event.target.closest("[data-dialog-close]");
      if (close) close.closest("dialog")?.close("cancel");
    });
  }

  confirm(message, label = "Confirmar") {
    const dialog = document.querySelector("#confirm-dialog");
    dialog.querySelector("#confirm-message").textContent = message;
    dialog.querySelector("#confirm-yes").textContent = label;
    dialog.showModal();
    return new Promise((resolve) => {
      const click = (event) => {
        const button = event.target.closest("[data-confirm]");
        if (!button) return;
        cleanup();
        dialog.close();
        resolve(button.dataset.confirm === "true");
      };
      const cancel = () => { cleanup(); resolve(false); };
      const cleanup = () => { dialog.removeEventListener("click", click); dialog.removeEventListener("cancel", cancel); dialog.removeEventListener("close", cancel); };
      dialog.addEventListener("click", click);
      dialog.addEventListener("cancel", cancel, { once: true });
      dialog.addEventListener("close", cancel, { once: true });
    });
  }

  chooseScope(message = "Onde queres aplicar esta alteração?") {
    const dialog = document.querySelector("#choice-dialog");
    dialog.querySelector("#choice-message").textContent = message;
    dialog.showModal();
    return new Promise((resolve) => {
      const click = (event) => {
        const button = event.target.closest("[data-choice]");
        if (!button) return;
        cleanup(); dialog.close(); resolve(button.dataset.choice);
      };
      const cancel = () => { cleanup(); resolve(null); };
      const cleanup = () => { dialog.removeEventListener("click", click); dialog.removeEventListener("cancel", cancel); dialog.removeEventListener("close", cancel); };
      dialog.addEventListener("click", click);
      dialog.addEventListener("cancel", cancel, { once: true });
      dialog.addEventListener("close", cancel, { once: true });
    });
  }
}
