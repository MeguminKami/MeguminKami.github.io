let lightboxGalleryBound = false;

function getLightboxRefs() {
    const lightbox = document.getElementById("lightbox");

    return {
        lightbox,
        image: document.getElementById("lightboxImg"),
        caption: document.getElementById("lightboxCaption"),
        closeButton: lightbox?.querySelector(".lightboxClose") || null,
    };
}

function ensureLightboxBindings() {
    const { lightbox, closeButton } = getLightboxRefs();
    if (!lightbox) return false;
    if (lightbox.dataset.bound === "true") return true;

    lightbox.dataset.bound = "true";

    closeButton?.addEventListener("click", closeLightbox);

    lightbox.addEventListener("click", (event) => {
        if (event.target === lightbox) {
            closeLightbox();
        }
    });

    window.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeLightbox();
        }
    });

    return true;
}

export function openLightbox({ src, alt = "", caption = "" }) {
    const refs = getLightboxRefs();
    if (!refs.lightbox || !refs.image) return;

    ensureLightboxBindings();

    refs.image.src = src;
    refs.image.alt = alt;

    if (refs.caption) {
        refs.caption.textContent = caption;
    }

    refs.lightbox.classList.add("active");
    refs.lightbox.setAttribute("aria-hidden", "false");
    document.documentElement.style.overflow = "hidden";
}

export function closeLightbox() {
    const refs = getLightboxRefs();
    if (!refs.lightbox) return;

    refs.lightbox.classList.remove("active");
    refs.lightbox.setAttribute("aria-hidden", "true");
    document.documentElement.style.overflow = "";

    if (refs.image) {
        refs.image.removeAttribute("src");
        refs.image.alt = "";
    }

    if (refs.caption) {
        refs.caption.textContent = "";
    }
}

export function initLightboxGallery() {
    ensureLightboxBindings();

    if (lightboxGalleryBound) return;
    lightboxGalleryBound = true;

    document.addEventListener("click", (event) => {
        const image = event.target.closest(".galleryImage");
        if (!image) return;

        const src = image.currentSrc || image.src || "";
        if (!src) return;

        openLightbox({
            src,
            alt: image.alt || "",
            caption: image.dataset.caption || image.alt || "",
        });
    });
}
