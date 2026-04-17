import { openLightbox } from "./lightbox.js";

class LoopingImageSlider {
    constructor(root) {
        this.root = root;
        this.viewportImg = root.querySelector(".imgSliderImg");
        this.btnPrev = root.querySelector(".imgSliderPrev");
        this.btnNext = root.querySelector(".imgSliderNext");
        this.overlayPrev = root.querySelector(".imgSliderOverlayPrev");
        this.overlayNext = root.querySelector(".imgSliderOverlayNext");
        this.elIndex = root.querySelector(".imgSliderIndex");
        this.elTotal = root.querySelector(".imgSliderTotal");

        this.images = this.parseImages(root.dataset.images);
        this.index = 0;
        this.autoplayTimer = null;
        this.autoplayDelay = Number.parseInt(root.dataset.autoplay || "0", 10);

        if (!this.viewportImg) return;

        if (this.elTotal) {
            this.elTotal.textContent = String(this.images.length || 0);
        }

        this.bindControls();
        this.render();
        this.startAutoplay();
    }

    parseImages(raw) {
        if (!raw) return [];

        try {
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];

            return parsed
                .map((item) => ({
                    src: String(item?.src || "").trim(),
                    alt: String(item?.alt || "").trim(),
                    caption: String(item?.caption || "").trim(),
                }))
                .filter((item) => item.src);
        } catch {
            return [];
        }
    }

    bindControls() {
        this.btnPrev?.addEventListener("click", () => {
            this.prev();
            this.resetAutoplay();
        });

        this.btnNext?.addEventListener("click", () => {
            this.next();
            this.resetAutoplay();
        });

        this.overlayPrev?.addEventListener("click", (event) => {
            event.stopPropagation();
            this.prev();
            this.resetAutoplay();
        });

        this.overlayNext?.addEventListener("click", (event) => {
            event.stopPropagation();
            this.next();
            this.resetAutoplay();
        });

        this.viewportImg.addEventListener("click", () => {
            this.openCurrentImageInLightbox();
        });

        this.root.addEventListener("keydown", (event) => {
            if (event.key === "ArrowLeft") {
                this.prev();
                this.resetAutoplay();
            }

            if (event.key === "ArrowRight") {
                this.next();
                this.resetAutoplay();
            }
        });

        this.root.tabIndex = 0;

        if (this.autoplayDelay > 0) {
            this.root.addEventListener("mouseenter", () => this.stopAutoplay());
            this.root.addEventListener("mouseleave", () => this.startAutoplay());
        }
    }

    render() {
        if (!this.viewportImg) return;

        if (!this.images.length) {
            this.viewportImg.removeAttribute("src");
            this.viewportImg.alt = "";

            if (this.elIndex) this.elIndex.textContent = "0";
            if (this.elTotal) this.elTotal.textContent = "0";
            if (this.btnPrev) this.btnPrev.disabled = true;
            if (this.btnNext) this.btnNext.disabled = true;

            return;
        }

        const item = this.images[this.index];
        this.viewportImg.src = item.src;
        this.viewportImg.alt = item.alt || `Image ${this.index + 1}`;
        this.viewportImg.dataset.caption = item.caption || "";

        if (this.elIndex) this.elIndex.textContent = String(this.index + 1);
        if (this.elTotal) this.elTotal.textContent = String(this.images.length);

        const hasSingleImage = this.images.length <= 1;
        if (this.btnPrev) this.btnPrev.disabled = hasSingleImage;
        if (this.btnNext) this.btnNext.disabled = hasSingleImage;
    }

    prev() {
        if (!this.images.length) return;
        this.index = (this.index - 1 + this.images.length) % this.images.length;
        this.render();
    }

    next() {
        if (!this.images.length) return;
        this.index = (this.index + 1) % this.images.length;
        this.render();
    }

    openCurrentImageInLightbox() {
        if (!this.images.length) return;

        const item = this.images[this.index];
        openLightbox({
            src: item.src,
            alt: item.alt || `Image ${this.index + 1}`,
            caption: item.caption || "",
        });
    }

    startAutoplay() {
        this.stopAutoplay();

        if (this.autoplayDelay > 0 && this.images.length > 1) {
            this.autoplayTimer = window.setInterval(() => this.next(), this.autoplayDelay);
        }
    }

    stopAutoplay() {
        if (this.autoplayTimer) {
            window.clearInterval(this.autoplayTimer);
            this.autoplayTimer = null;
        }
    }

    resetAutoplay() {
        if (this.autoplayDelay > 0) {
            this.stopAutoplay();
            this.startAutoplay();
        }
    }
}

export function initImageSliders() {
    document.querySelectorAll(".imgSlider").forEach((element) => {
        if (element.dataset.sliderBound === "true") return;
        if (!element.querySelector(".imgSliderImg")) return;

        element.dataset.sliderBound = "true";
        new LoopingImageSlider(element);
    });
}
