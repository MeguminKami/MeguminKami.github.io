function getQuickPreviewRefs() {
    const modal = document.getElementById("modal");

    return {
        modal,
        title: document.getElementById("mTitle"),
        subtitle: document.getElementById("mSub"),
        description: document.getElementById("mDesc"),
        image: document.getElementById("mImg"),
        video: document.getElementById("mVideo"),
        videoWrap: document.getElementById("videoWrap"),
        closeButton: document.getElementById("closeBtn"),
    };
}

function openQuickPreview(trigger) {
    const refs = getQuickPreviewRefs();
    if (!refs.modal) return;

    refs.title.textContent = trigger.dataset.modalTitle || "";
    refs.subtitle.textContent = trigger.dataset.modalSub || "";
    refs.description.textContent = trigger.dataset.modalDesc || "";

    const image = trigger.dataset.modalImg || "";
    if (refs.image) {
        refs.image.src = image;
        refs.image.alt = refs.title.textContent
            ? `${refs.title.textContent} preview`
            : "Project preview";
    }

    const video = String(trigger.dataset.modalVideo || "").trim();
    if (refs.video && refs.videoWrap) {
        refs.video.src = video;
        refs.videoWrap.style.display = video ? "block" : "none";
    }

    refs.modal.showModal();
}

export function initQuickPreviewModal() {
    const refs = getQuickPreviewRefs();
    if (!refs.modal || refs.modal.dataset.bound === "true") return;

    refs.modal.dataset.bound = "true";

    refs.closeButton?.addEventListener("click", () => refs.modal.close());

    refs.modal.addEventListener("click", (event) => {
        if (event.target === refs.modal) {
            refs.modal.close();
        }
    });

    refs.modal.addEventListener("close", () => {
        if (refs.video) {
            refs.video.src = "";
        }

        if (refs.videoWrap) {
            refs.videoWrap.style.display = "none";
        }
    });

    document.addEventListener("click", (event) => {
        const openTrigger = event.target.closest("[data-modal-title]");
        if (openTrigger) {
            event.preventDefault();
            openQuickPreview(openTrigger);
            return;
        }

        const closeTrigger = event.target.closest("[data-modal-close]");
        if (closeTrigger && closeTrigger.closest("#modal") === refs.modal) {
            event.preventDefault();
            refs.modal.close();
        }
    });
}

export function initContactModal() {
    const modal = document.getElementById("contactModal");
    const openButton = document.getElementById("contactBtn");
    const closeButton = document.getElementById("contactCloseBtn");

    if (!modal || !openButton || modal.dataset.bound === "true") return;

    modal.dataset.bound = "true";

    openButton.addEventListener("click", () => {
        modal.showModal();
    });

    closeButton?.addEventListener("click", () => {
        modal.close();
    });

    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            modal.close();
        }
    });
}
