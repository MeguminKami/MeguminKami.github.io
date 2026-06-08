import { updateProjectLatestUpdateElements } from "./core/projects.js";
import { initTheme } from "./core/theme.js";
import { initFilters } from "./components/filters.js";
import { initImageSliders } from "./components/image-slider.js";
import { initSharedLayout } from "./components/layout.js";
import { initLightboxGallery } from "./components/lightbox.js";
import { initBeforeAfterSliders, initCodeCopyButtons } from "./components/media-tools.js";
import { initQuickPreviewModal, initContactModal } from "./components/modals.js";
import { initProjectsGrid } from "./components/project-cards.js";
import { initBookletWidgets } from "./widgets/booklet-library.js";
import { initSopaCliWidgets } from "./widgets/sopa-cli-widget.js";
import { initTerminalGameShowcases } from "./widgets/terminal-games.js";
import { initBatalhaNavalRpgWidgets } from "./widgets/batalha-naval-rpg.js";

initTheme();

async function initApp() {
    initQuickPreviewModal();
    initContactModal();
    initLightboxGallery();
    initBeforeAfterSliders();
    initCodeCopyButtons();
    initImageSliders();
    initBookletWidgets();
    initSopaCliWidgets();
    initTerminalGameShowcases();
    initBatalhaNavalRpgWidgets();

    const sharedLayoutPromise = initSharedLayout();
    const projectsPromise = initProjectsGrid();
    const latestUpdatePromise = updateProjectLatestUpdateElements();

    await Promise.all([
        sharedLayoutPromise,
        projectsPromise,
        latestUpdatePromise,
    ]);

    initFilters();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        void initApp();
    }, { once: true });
} else {
    void initApp();
}
