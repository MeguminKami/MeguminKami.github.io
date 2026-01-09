// ====== Footer year
document.getElementById("year").textContent = new Date().getFullYear();

// ====== Filter
const pills = document.querySelectorAll(".pill");
const cards = document.querySelectorAll(".card");

pills.forEach(p => {
    p.addEventListener("click", () => {
        pills.forEach(x => x.classList.remove("isActive"));
        p.classList.add("isActive");

        const filter = p.dataset.filter;
        cards.forEach(card => {
            const tags = (card.dataset.tags || "").split(" ");
            const show = (filter === "all") || tags.includes(filter);
            card.style.display = show ? "" : "none";
        });
    });
});

// ====== Modal
const modal = document.getElementById("modal");
const closeBtn = document.getElementById("closeBtn");

const mTitle = document.getElementById("mTitle");
const mSub   = document.getElementById("mSub");
const mDesc  = document.getElementById("mDesc");
const mImg   = document.getElementById("mImg");
const mVideo = document.getElementById("mVideo");
const videoWrap = document.getElementById("videoWrap");

document.querySelectorAll("button[data-modal-title]").forEach(btn => {
    btn.addEventListener("click", () => {
        mTitle.textContent = btn.dataset.modalTitle || "";
        mSub.textContent   = btn.dataset.modalSub || "";
        mDesc.textContent  = btn.dataset.modalDesc || "";

        const img = btn.dataset.modalImg || "";
        mImg.src = img;
        mImg.alt = mTitle.textContent ? `${mTitle.textContent} cover` : "Project image";

        const video = (btn.dataset.modalVideo || "").trim();
        if (video) {
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

// Close modal when clicking outside the inner panel
modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.close();
});

// Stop video when closing
modal.addEventListener("close", () => {
    mVideo.src = "";
    videoWrap.style.display = "none";
});

// ====== Theme toggle (dark default)
const themeBtn = document.getElementById("themeBtn");
const KEY = "portfolio_theme";

function applyTheme(value) {
    document.body.classList.toggle("light", value === "light");
}

const saved = localStorage.getItem(KEY);
if (saved) {
    applyTheme(saved);
} else {
    // Optional: respect OS setting only if you want
    // const prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
    // applyTheme(prefersLight ? "light" : "dark");
    applyTheme("dark");
}

themeBtn.addEventListener("click", () => {
    const nowLight = !document.body.classList.contains("light");
    const value = nowLight ? "light" : "dark";
    applyTheme(value);
    localStorage.setItem(KEY, value);
});
