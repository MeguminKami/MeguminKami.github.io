export function initBeforeAfterSliders() {
    document.querySelectorAll(".baSlider").forEach((slider) => {
        if (slider.dataset.bound === "true") return;

        const container = slider.closest(".baContainer");
        if (!container) return;

        slider.dataset.bound = "true";

        const updateSlider = (value) => {
            container.style.setProperty("--ba-pos", `${value}%`);
        };

        slider.addEventListener("input", (event) => {
            updateSlider(event.target.value);
        });

        updateSlider(slider.value);
    });
}

export function initCodeCopyButtons() {
    document.querySelectorAll(".copyBtn").forEach((button) => {
        if (button.dataset.bound === "true") return;

        button.dataset.bound = "true";
        button.addEventListener("click", async () => {
            const codeBlock = button.closest(".codeBlock");
            const code = codeBlock?.querySelector("code");
            const copyText = button.querySelector(".copyText");
            const text = code?.textContent;

            if (!text || !navigator.clipboard?.writeText) return;

            try {
                await navigator.clipboard.writeText(text);

                button.classList.add("copied");
                const originalText = copyText?.textContent || "";
                if (copyText) {
                    copyText.textContent = "Copied!";
                }

                window.setTimeout(() => {
                    button.classList.remove("copied");
                    if (copyText) {
                        copyText.textContent = originalText;
                    }
                }, 2000);
            } catch (error) {
                console.error("Failed to copy code:", error);
            }
        });
    });
}
