// Filtering
const chips = document.querySelectorAll(".chip");
const cards = document.querySelectorAll(".card");

chips.forEach(chip => {
    chip.addEventListener("click", () => {
        chips.forEach(c => c.classList.remove("is-active"));
        chip.classList.add("is-active");

        const filter = chip.dataset.filter;
        cards.forEach(card => {
            const tags = card.dataset.tags.split(" ");
            const show = (filter === "all") || tags.includes(filter);
            card.style.display = show ? "" : "none";
        });
    });
});

// Modal (details)
const modal = document.getElementById("modal");
const closeBtn = document.getElementById("closeBtn");

const mTitle = document.getElementById("mTitle");
const mDesc  = document.getElementById("mDesc");
const mImg   = document.getElementById("mImg");
const mVideo = document.getElementById("mVideo");
const videoWrap = document.getElementById("videoWrap");

document.querySelectorAll("button[data-modal-title]").forEach(btn => {
    btn.addEventListener("click", () => {
        mTitle.textContent = btn.dataset.modalTitle || "";
        mDesc.textContent  = btn.dataset.modalDesc  || "";
        mImg.src = btn.dataset.modalImg || "";
        mImg.alt = btn.dataset.modalTitle || "Project image";

        const video = btn.dataset.modalVideo || "";
        if (video.trim()) {
            mVideo.src = video;
            videoWrap.style.display = "block";
        } else {
            mVideo.src = "";
            videoWrap.style.display = "none";
        }

        modal.showModal();
    });
});

closeBtn.addEventListener("click", () => modal.close());
modal.addEventListener("click", (e) => {
    // close when clicking outside the inner panel
    const rect = modal.getBoundingClientRect();
    const clickedInside =
        e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top  && e.clientY <= rect.bottom;
    if (!clickedInside) modal.close();
});
