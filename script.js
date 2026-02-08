// ============================================
// SHARED LAYOUT (HEADER / FOOTER)
// ============================================

async function loadPartial(targetId, url) {
    const host = document.getElementById(targetId);
    if (!host) return;

    try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed to load ${url} (${res.status})`);
        host.innerHTML = await res.text();
    } catch (err) {
        console.error(err);
    }
}

function updateNavLinksForPage() {
    const path = window.location.pathname.toLowerCase();
    const isHome = path.endsWith("/") || path.endsWith("/index.html") || path.endsWith("index.html");

    const projectsLink = document.querySelector('[data-nav="projects"]');
    const aboutLink = document.querySelector('[data-nav="about"]');
    const contactLink = document.querySelector('[data-nav="contact"]');

    if (projectsLink) projectsLink.href = isHome ? "#projects" : "index.html#projects";
    if (aboutLink) aboutLink.href = isHome ? "#about" : "index.html#about";
    if (contactLink) contactLink.href = "#contact";
}

function updateFooterYear() {
    const yearElement = document.getElementById('year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
}

function bindThemeToggle() {
    const themeBtn = document.getElementById('themeBtn');
    if (!themeBtn || themeBtn.dataset.bound === "true") return;

    themeBtn.dataset.bound = "true";
    themeBtn.addEventListener('click', () => {
        const isLight = document.body.classList.contains('light');
        const newTheme = isLight ? 'dark' : 'light';
        applyTheme(newTheme);
        localStorage.setItem(THEME_KEY, newTheme);
    });
}

async function initSharedLayout() {
    await Promise.all([
        loadPartial("siteHeader", "partials/header.partial"),
        loadPartial("siteFooter", "partials/footer.partial"),
    ]);

    updateNavLinksForPage();
    bindThemeToggle();
    updateFooterYear();
    initSmoothScroll();
}

// ============================================
// THEME TOGGLE
// ============================================

const THEME_KEY = 'portfolio_theme';

function applyTheme(theme) {
    document.body.classList.toggle('light', theme === 'light');
}

function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) {
        applyTheme(saved);
    } else {
        // Respect system preference
        const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
        applyTheme(prefersLight ? 'light' : 'dark');
    }
}

initTheme();
initSharedLayout();

// ============================================
// PROJECT FILTERS
// ============================================

let currentTechFilter = 'all';
let currentStatusFilter = 'all';

function filterCards() {
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        const tags = (card.dataset.tags || '').split(' ');
        const status = card.dataset.status || '';

        const matchesTech = currentTechFilter === 'all' || tags.includes(currentTechFilter);
        const matchesStatus = currentStatusFilter === 'all' || status === currentStatusFilter;

        card.style.display = (matchesTech && matchesStatus) ? '' : 'none';
    });
}

function initFilters() {
    const techPills = document.querySelectorAll('.pill:not(.status-pill)');
    const statusPills = document.querySelectorAll('.pill.status-pill');

    techPills.forEach(pill => {
        pill.addEventListener('click', () => {
            techPills.forEach(p => p.classList.remove('isActive'));
            pill.classList.add('isActive');
            currentTechFilter = pill.dataset.filter;
            filterCards();
        });
    });

    statusPills.forEach(pill => {
        pill.addEventListener('click', () => {
            statusPills.forEach(p => p.classList.remove('isActive'));
            pill.classList.add('isActive');
            currentStatusFilter = pill.dataset.status;
            filterCards();
        });
    });
}

// Initialize filters on page load
initFilters();

// ============================================
// MODAL (Quick Preview)
// ============================================

const modal = document.getElementById('modal');
const mTitle = document.getElementById('mTitle');
const mSub = document.getElementById('mSub');
const mDesc = document.getElementById('mDesc');
const mImg = document.getElementById('mImg');
const mVideo = document.getElementById('mVideo');
const videoWrap = document.getElementById('videoWrap');

function initModalButtons() {
    if (!modal) return;

    // Open modal
    document.querySelectorAll('button[data-modal-title]').forEach(btn => {
        btn.addEventListener('click', () => {
            mTitle.textContent = btn.dataset.modalTitle || '';
            mSub.textContent = btn.dataset.modalSub || '';
            mDesc.textContent = btn.dataset.modalDesc || '';

            const img = btn.dataset.modalImg || '';
            mImg.src = img;
            mImg.alt = `${mTitle.textContent} preview`;

            const video = (btn.dataset.modalVideo || '').trim();
            if (video) {
                mVideo.src = video;
                videoWrap.style.display = 'block';
            } else {
                mVideo.src = '';
                videoWrap.style.display = 'none';
            }

            modal.showModal();
        });
    });
}

if (modal) {
    const closeBtn = document.getElementById('closeBtn');

    // Initialize modal buttons on page load
    initModalButtons();

    // Close modal
    if (closeBtn) {
        closeBtn.addEventListener('click', () => modal.close());
    }

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.close();
        }
    });

    // Clean up on close
    modal.addEventListener('close', () => {
        if (mVideo) mVideo.src = '';
        if (videoWrap) videoWrap.style.display = 'none';
    });
}

// ============================================
// CONTACT MODAL
// ============================================

const contactModal = document.getElementById('contactModal');
const contactBtn = document.getElementById('contactBtn');
const contactCloseBtn = document.getElementById('contactCloseBtn');

if (contactModal && contactBtn) {
    contactBtn.addEventListener('click', () => {
        contactModal.showModal();
    });

    if (contactCloseBtn) {
        contactCloseBtn.addEventListener('click', () => contactModal.close());
    }

    // Close on backdrop click
    contactModal.addEventListener('click', (e) => {
        if (e.target === contactModal) {
            contactModal.close();
        }
    });
}

// ============================================
// SMOOTH SCROLL (with offset for fixed nav)
// ============================================

function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        if (anchor.dataset.smoothBound === "true") return;
        anchor.dataset.smoothBound = "true";

        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (!href || href === '#') return;

            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                const offset = 80;
                const targetPosition = target.offsetTop - offset;
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ============================================
// IMAGE LIGHTBOX
// ============================================

const lightbox = document.getElementById('lightbox');
if (lightbox) {
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxCaption = document.getElementById('lightboxCaption');
    const lightboxClose = document.querySelector('.lightboxClose');

    // Open lightbox on gallery image click
    document.querySelectorAll('.galleryImage').forEach(img => {
        img.addEventListener('click', () => {
            lightboxImg.src = img.src;
            lightboxImg.alt = img.alt;
            lightboxCaption.textContent = img.alt;
            lightbox.classList.add('active');
            lightbox.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
        });
    });

    // Close lightbox
    function closeLightbox() {
        lightbox.classList.remove('active');
        lightbox.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    if (lightboxClose) {
        lightboxClose.addEventListener('click', closeLightbox);
    }

    // Close on backdrop click
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });

    // Close on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.classList.contains('active')) {
            closeLightbox();
        }
    });
}

// ============================================
// BEFORE/AFTER SLIDER
// ============================================

document.querySelectorAll('.baSlider').forEach((baSlider) => {
    const baContainer = baSlider.closest('.baContainer');
    if (!baContainer) return;

    function updateSlider(value) {
        baContainer.style.setProperty('--ba-pos', `${value}%`);
    }

    baSlider.addEventListener('input', (e) => {
        updateSlider(e.target.value);
    });

    // Initialize
    updateSlider(baSlider.value);
});

// ============================================
// CODE COPY BUTTON
// ============================================

document.querySelectorAll('.copyBtn').forEach(btn => {
    btn.addEventListener('click', () => {
        const codeBlock = btn.closest('.codeBlock');
        const code = codeBlock.querySelector('code');

        if (code) {
            const text = code.textContent;

            // Copy to clipboard
            navigator.clipboard.writeText(text).then(() => {
                // Visual feedback
                btn.classList.add('copied');
                const originalText = btn.querySelector('.copyText').textContent;
                btn.querySelector('.copyText').textContent = 'Copied!';

                setTimeout(() => {
                    btn.classList.remove('copied');
                    btn.querySelector('.copyText').textContent = originalText;
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy code:', err);
            });
        }
    });
});

const latestUpdateDateFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
});

let projectsDataPromise = null;

function parseIsoDateToUtcTimestamp(value) {
    if (typeof value !== "string") return Number.NEGATIVE_INFINITY;

    const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return Number.NEGATIVE_INFINITY;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const timestamp = Date.UTC(year, month - 1, day);
    const date = new Date(timestamp);

    if (
        date.getUTCFullYear() !== year
        || date.getUTCMonth() !== (month - 1)
        || date.getUTCDate() !== day
    ) {
        return Number.NEGATIVE_INFINITY;
    }

    return timestamp;
}

function getProjectLatestUpdate(project) {
    const rawLatestUpdate = project?.latestUpdate ?? project?.lastestUpdate ?? project?.lastUpdate;
    if (!rawLatestUpdate) return null;

    if (typeof rawLatestUpdate === "string") {
        const raw = rawLatestUpdate.trim();
        if (!raw) return null;

        const timestamp = parseIsoDateToUtcTimestamp(raw);
        const display = Number.isFinite(timestamp)
            ? latestUpdateDateFormatter.format(new Date(timestamp))
            : raw;

        return { raw, timestamp, display };
    }

    if (typeof rawLatestUpdate === "object") {
        const rawDate = typeof rawLatestUpdate.date === "string" ? rawLatestUpdate.date.trim() : "";
        const rawLabel = typeof rawLatestUpdate.label === "string" ? rawLatestUpdate.label.trim() : "";
        const timestamp = parseIsoDateToUtcTimestamp(rawDate);
        const display = rawLabel || (Number.isFinite(timestamp) ? latestUpdateDateFormatter.format(new Date(timestamp)) : rawDate);

        if (!display) return null;
        return { raw: rawDate || rawLabel, timestamp, display };
    }

    return null;
}

function sortProjectsByLatestUpdate(projects) {
    return [...projects].sort((a, b) => {
        const aUpdate = getProjectLatestUpdate(a);
        const bUpdate = getProjectLatestUpdate(b);
        const aTimestamp = aUpdate?.timestamp ?? Number.NEGATIVE_INFINITY;
        const bTimestamp = bUpdate?.timestamp ?? Number.NEGATIVE_INFINITY;

        if (aTimestamp !== bTimestamp) return bTimestamp - aTimestamp;
        return (a.title || "").localeCompare((b.title || ""));
    });
}

function normalizePathForMatch(path) {
    return String(path || "")
        .split("#")[0]
        .split("?")[0]
        .replace(/\\/g, "/")
        .split("/")
        .pop()
        .toLowerCase()
        .trim();
}

function findProjectForCurrentPage(projects) {
    const currentPage = normalizePathForMatch(window.location.pathname);
    if (!currentPage || currentPage === "index.html") return null;

    return projects.find((project) => {
        const projectPath = normalizePathForMatch(project?.viewHref || "");
        return projectPath && projectPath === currentPage;
    }) || null;
}

async function loadProjectsData() {
    if (!projectsDataPromise) {
        projectsDataPromise = fetch("projects.json", { cache: "no-store" })
            .then((res) => {
                if (!res.ok) throw new Error(`Failed to load projects.json (${res.status})`);
                return res.json();
            })
            .then((data) => (Array.isArray(data) ? data : (data.projects || [])))
            .catch((err) => {
                projectsDataPromise = null;
                throw err;
            });
    }

    return projectsDataPromise;
}

(async function initProjects() {
    const grid = document.getElementById("projectsGrid");
    if (!grid) return;

    try {
        const projects = await loadProjectsData();
        const sortedProjects = sortProjectsByLatestUpdate(projects);
        renderProjectCards(grid, sortedProjects);

        // Reinitialize modal buttons after rendering
        initModalButtons();
    } catch (err) {
        console.error(err);
        // fallback: show a small message
        grid.innerHTML = `<p class="muted smallText">Could not load projects.</p>`;
    }
})();

(async function initProjectQuickFactsTimeline() {
    const timelineValues = document.querySelectorAll("[data-project-latest-update]");
    if (!timelineValues.length) return;

    try {
        const projects = await loadProjectsData();
        const currentProject = findProjectForCurrentPage(projects);
        if (!currentProject) return;

        const latestUpdate = getProjectLatestUpdate(currentProject);
        if (!latestUpdate?.display) return;

        timelineValues.forEach((timelineValue) => {
            timelineValue.textContent = latestUpdate.display;
        });
    } catch (err) {
        console.error(err);
    }
})();

/* ================================
   RENDER FUNCTION (FULLY WORKING)
================================ */
function renderProjectCards(gridEl, projects) {
    gridEl.innerHTML = ""; // clear existing

    const frag = document.createDocumentFragment();

    projects.forEach((p) => {
        const article = document.createElement("article");
        article.className = "card";
        article.dataset.tags = (p.tagsData || []).join(" ");
        article.dataset.status = p.status || "";

        // Cover
        const cover = document.createElement("div");
        cover.className = "cover";
        cover.setAttribute("role", "img");
        cover.setAttribute("aria-label", (p.cover?.ariaLabel || `${p.title || "Project"} cover`));

        const imageUrl = p.cover?.image || "";
        if (imageUrl) {
            cover.style.backgroundImage = `url('${imageUrl}')`;
        }

        // Body
        const body = document.createElement("div");
        body.className = "cardBody";

        // Row (title + badge + status)
        const row = document.createElement("div");
        row.className = "row";

        const h3 = document.createElement("h3");
        h3.textContent = p.title || "Untitled Project";

        const badge = document.createElement("span");
        badge.className = "badge";
        badge.textContent = p.badge || "Project";

        const statusBadge = document.createElement("span");
        statusBadge.className = `status-badge ${normalizeStatusClass(p.status)}`;
        statusBadge.textContent = humanStatus(p.status);

        row.append(h3, badge, statusBadge);

        // Description
        const desc = document.createElement("p");
        desc.className = "muted smallText";
        desc.textContent = p.description || "";

        const latestUpdate = getProjectLatestUpdate(p);
        const latestUpdateLine = document.createElement("p");
        latestUpdateLine.className = "cardLatestUpdate smallText";
        latestUpdateLine.textContent = latestUpdate?.display
            ? `Latest update: ${latestUpdate.display}`
            : "Latest update: not set";

        // Bullets
        const ul = document.createElement("ul");
        ul.className = "bullets smallText";
        (p.bullets || []).forEach((b) => {
            const li = document.createElement("li");
            li.textContent = b;
            ul.appendChild(li);
        });

        // Tags (display chips)
        const tagsWrap = document.createElement("div");
        tagsWrap.className = "tags";
        (p.tags || []).forEach((t) => {
            const tag = document.createElement("span");
            tag.className = "tag";
            tag.textContent = t;
            tagsWrap.appendChild(tag);
        });

        // Actions
        const actions = document.createElement("div");
        actions.className = "actions";

        const viewLink = document.createElement("a");
        viewLink.className = "btn primary small";
        viewLink.href = p.viewHref || "#";
        viewLink.textContent = "View Details";

        const quickBtn = document.createElement("button");
        quickBtn.className = "btn small";
        quickBtn.type = "button";
        quickBtn.textContent = "Quick Preview";

        // Your existing modal expects these data-* attributes:
        quickBtn.dataset.modalTitle = p.modal?.title || p.title || "Project";
        quickBtn.dataset.modalSub = p.modal?.sub || "";
        quickBtn.dataset.modalDesc = p.modal?.desc || p.description || "";
        quickBtn.dataset.modalImg = p.modal?.img || p.cover?.image || "";

        actions.append(viewLink, quickBtn);

        // Assemble
        body.append(row, latestUpdateLine, desc, ul, tagsWrap, actions);
        article.append(cover, body);

        // Make the entire card clickable (navigate to View Details)
        article.style.cursor = 'pointer';
        article.addEventListener('click', (e) => {
            // Don't navigate if clicking on a button or link
            if (e.target.closest('button') || e.target.closest('a')) {
                return;
            }
            // Navigate to the project details page
            const href = p.viewHref || "#";
            if (href !== "#") {
                window.location.href = href;
            }
        });

        frag.appendChild(article);
    });

    gridEl.appendChild(frag);
}

function normalizeStatusClass(status) {
    const s = (status || "").toLowerCase().trim();
    if (s === "complete" || s === "completed" || s === "done") return "complete";
    if (s === "in-progress" || s === "in progress" || s === "progress") return "in-progress";
    if (s === "paused" || s === "on-hold" || s === "hold") return "paused";
    if (s === "incomplete") return "incomplete";
    if (s === "tbs" || s === "to be started") return "to-be-started";
    return "paused";
}

function humanStatus(status) {
    const s = (status || "").toLowerCase().trim();
    if (s === "complete" || s === "completed" || s === "done") return "Complete";
    if (s === "in-progress" || s === "in progress" || s === "progress") return "In Progress";
    if (s === "paused" || s === "on-hold" || s === "hold") return "Paused";
    if (s === "incomplete") return "Incomplete";
    if (s === "tbs" || s === "to be started") return "To Be Started";
    return status ? status : "Paused";
}

/* ============================================
   Looping Image Slider + Lightbox integration
   ============================================ */

class LoopingImageSlider {
    constructor(root) {
        this.root = root;
        this.viewportImg = root.querySelector(".imgSliderImg");
        this.btnPrev = root.querySelector(".imgSliderPrev");
        this.btnNext = root.querySelector(".imgSliderNext");
        this.elIndex = root.querySelector(".imgSliderIndex");
        this.elTotal = root.querySelector(".imgSliderTotal");

        this.images = this.#parseImages(root.dataset.images);
        this.index = 0;

        // Init UI
        this.elTotal.textContent = String(this.images.length || 0);

        // Bind events
        this.btnPrev.addEventListener("click", () => this.prev());
        this.btnNext.addEventListener("click", () => this.next());
        this.viewportImg.addEventListener("click", () => this.openLightbox());

        // Optional: keyboard nav when focused
        this.root.addEventListener("keydown", (e) => {
            if (e.key === "ArrowLeft") this.prev();
            if (e.key === "ArrowRight") this.next();
        });
        this.root.tabIndex = 0; // make root focusable for keyboard arrows

        // Render first
        this.render();
    }

    #parseImages(raw) {
        if (!raw) return [];
        try {
            const arr = JSON.parse(raw);
            if (!Array.isArray(arr)) return [];
            return arr
                .map((x) => ({
                    src: String(x?.src || "").trim(),
                    alt: String(x?.alt || "").trim(),
                    caption: String(x?.caption || "").trim(),
                }))
                .filter((x) => x.src.length > 0);
        } catch {
            return [];
        }
    }

    render() {
        if (!this.images.length) {
            // Fallback state
            this.viewportImg.src = "";
            this.viewportImg.alt = "";
            this.elIndex.textContent = "0";
            this.elTotal.textContent = "0";
            this.btnPrev.disabled = true;
            this.btnNext.disabled = true;
            return;
        }

        const item = this.images[this.index];
        this.viewportImg.src = item.src;
        this.viewportImg.alt = item.alt || `Image ${this.index + 1}`;
        this.viewportImg.dataset.caption = item.caption || "";
        this.viewportImg.dataset.index = String(this.index);

        this.elIndex.textContent = String(this.index + 1);
        this.elTotal.textContent = String(this.images.length);

        // If "0 to 0" (one image), keep looping logic but disable buttons (no-op)
        const one = this.images.length <= 1;
        this.btnPrev.disabled = one;
        this.btnNext.disabled = one;
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

    openLightbox() {
        if (!this.images.length) return;
        const item = this.images[this.index];
        openLightbox({
            src: item.src,
            alt: item.alt || `Image ${this.index + 1}`,
            caption: item.caption || "",
        });
    }
}

/* ============================================
   Lightbox helpers (works with your existing DOM)
   ============================================ */

function openLightbox({ src, alt, caption }) {
    const lb = document.getElementById("lightbox");
    const lbImg = document.getElementById("lightboxImg");
    const lbCap = document.getElementById("lightboxCaption");
    const lbClose = lb?.querySelector(".lightboxClose");

    if (!lb || !lbImg) return;

    lbImg.src = src;
    lbImg.alt = alt || "";
    if (lbCap) lbCap.textContent = caption || "";

    lb.classList.add("active");
    lb.setAttribute("aria-hidden", "false");
    document.documentElement.style.overflow = "hidden";

    // Close handlers (attached once)
    if (!lb.dataset.bound) {
        lb.dataset.bound = "true";

        lbClose?.addEventListener("click", closeLightbox);

        // Click backdrop to close (but not the image itself)
        lb.addEventListener("click", (e) => {
            const clickedBackdrop = e.target === lb;
            if (clickedBackdrop) closeLightbox();
        });

        // ESC to close
        window.addEventListener("keydown", (e) => {
            if (e.key === "Escape") closeLightbox();
        });
    }
}

function closeLightbox() {
    const lb = document.getElementById("lightbox");
    const lbImg = document.getElementById("lightboxImg");
    const lbCap = document.getElementById("lightboxCaption");

    if (!lb) return;

    lb.classList.remove("active");
    lb.setAttribute("aria-hidden", "true");
    document.documentElement.style.overflow = "";

    if (lbImg) lbImg.src = "";
    if (lbCap) lbCap.textContent = "";
}

/* ============================================
   Auto-init all sliders on the page
   ============================================ */

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".imgSlider").forEach((el) => {
        new LoopingImageSlider(el);
    });
});
