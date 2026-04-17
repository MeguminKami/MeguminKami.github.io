import { ensureRuntime } from "./db.js";
import { initAdminPage } from "./admin-page.js";
import { renderLayout } from "./layout.js";
import { initPublicPage } from "./pages.js";

async function boot() {
  await ensureRuntime();
  renderLayout();

  const page = document.body.dataset.page ?? "home";
  const handled = initPublicPage(page) || initAdminPage();

  if (!handled) {
    document.getElementById("page-root").innerHTML = "<div class=\"body-content\"></div>";
  }
}

window.addEventListener("DOMContentLoaded", () => {
  boot().catch((error) => {
    console.error(error);
    const root = document.getElementById("page-root");
    if (root) {
      root.innerHTML = `
        <div class="body-content">
          <div class="page-container">
            <p class="error-message">Nao foi possivel carregar o site estatico.</p>
          </div>
        </div>
      `;
    }
  });
});
