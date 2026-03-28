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

function updateStats(projects) {
    const projectsStatEl = document.querySelector('[data-stat="projects"]');
    const articlesStatEl = document.querySelector('[data-stat="articles"]');

    if (projectsStatEl) {
        projectsStatEl.textContent = projects.length;
    }

    // For articles, you can update this logic if you have an articles data source
    // For now, keeping it at 1 as default
    if (articlesStatEl) {
        // articlesStatEl.textContent = articles.length;
    }
}

(async function initProjects() {
    const grid = document.getElementById("projectsGrid");
    if (!grid) return;

    try {
        const projects = await loadProjectsData();
        const sortedProjects = sortProjectsByLatestUpdate(projects);
        renderProjectCards(grid, sortedProjects);

        // Update stats with actual project count
        updateStats(projects);

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
        this.overlayPrev = root.querySelector(".imgSliderOverlayPrev");
        this.overlayNext = root.querySelector(".imgSliderOverlayNext");
        this.elIndex = root.querySelector(".imgSliderIndex");
        this.elTotal = root.querySelector(".imgSliderTotal");

        this.images = this.#parseImages(root.dataset.images);
        this.index = 0;

        this._autoplayTimer = null;
        this._autoplayDelay = parseInt(root.dataset.autoplay || "0", 10);

        // Init UI
        if (this.elTotal) this.elTotal.textContent = String(this.images.length || 0);

        // Bind bottom controls
        if (this.btnPrev) this.btnPrev.addEventListener("click", () => { this.prev(); this._resetAutoplay(); });
        if (this.btnNext) this.btnNext.addEventListener("click", () => { this.next(); this._resetAutoplay(); });

        // Bind overlay arrows (stop click from bubbling to lightbox)
        if (this.overlayPrev) {
            this.overlayPrev.addEventListener("click", (e) => { e.stopPropagation(); this.prev(); this._resetAutoplay(); });
        }
        if (this.overlayNext) {
            this.overlayNext.addEventListener("click", (e) => { e.stopPropagation(); this.next(); this._resetAutoplay(); });
        }

        this.viewportImg.addEventListener("click", () => this.openLightbox());

        // Optional: keyboard nav when focused
        this.root.addEventListener("keydown", (e) => {
            if (e.key === "ArrowLeft") { this.prev(); this._resetAutoplay(); }
            if (e.key === "ArrowRight") { this.next(); this._resetAutoplay(); }
        });
        this.root.tabIndex = 0; // make root focusable for keyboard arrows

        // Autoplay
        if (this._autoplayDelay > 0) {
            this._startAutoplay();
            this.root.addEventListener("mouseenter", () => this._stopAutoplay());
            this.root.addEventListener("mouseleave", () => this._startAutoplay());
        }

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
        this.viewportImg.dataset.index = String(this.index);

        if (this.elIndex) this.elIndex.textContent = String(this.index + 1);
        if (this.elTotal) this.elTotal.textContent = String(this.images.length);

        // If "0 to 0" (one image), keep looping logic but disable buttons (no-op)
        const one = this.images.length <= 1;
        if (this.btnPrev) this.btnPrev.disabled = one;
        if (this.btnNext) this.btnNext.disabled = one;
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

    _startAutoplay() {
        this._stopAutoplay();
        if (this._autoplayDelay > 0 && this.images.length > 1) {
            this._autoplayTimer = setInterval(() => this.next(), this._autoplayDelay);
        }
    }

    _stopAutoplay() {
        if (this._autoplayTimer) {
            clearInterval(this._autoplayTimer);
            this._autoplayTimer = null;
        }
    }

    _resetAutoplay() {
        if (this._autoplayDelay > 0) {
            this._stopAutoplay();
            this._startAutoplay();
        }
    }
}

class BookletLibrary {
    constructor(root) {
        this.root = root;
        this.select = root.querySelector("[data-booklet-select]");
        this.fileLabel = root.querySelector("[data-booklet-file]");
        this.badge = root.querySelector("[data-booklet-badge]");
        this.title = root.querySelector("[data-booklet-title]");
        this.subtitle = root.querySelector("[data-booklet-subtitle]");
        this.summary = root.querySelector("[data-booklet-summary]");
        this.status = root.querySelector("[data-booklet-status]");
        this.preview = root.querySelector("[data-booklet-preview]");
        this.openLink = root.querySelector("[data-booklet-open]");
        this.prevButton = root.querySelector("[data-booklet-prev]");
        this.nextButton = root.querySelector("[data-booklet-next]");
        this.directory = (root.dataset.bookletDir || "").trim();
        this.books = [];
        this.index = 0;

        if (this.select) this.select.disabled = true;
        if (this.prevButton) this.prevButton.disabled = true;
        if (this.nextButton) this.nextButton.disabled = true;

        if (this.openLink) {
            this.openLink.removeAttribute("href");
            this.openLink.setAttribute("aria-disabled", "true");
        }

        this.root.tabIndex = 0;
        this.#bindEvents();
        this.init();
    }

    async init() {
        try {
            this.books = await this.#discoverBooks(this.directory);
            if (!this.books.length) {
                this.#renderEmptyState("No booklet PDFs were found in this folder yet.");
                return;
            }

            this.#renderOptions();
            this.render();
        } catch (err) {
            console.error("Could not load booklet previews:", err);
            this.#renderEmptyState("The booklet preview could not load the available PDFs automatically.");
        }
    }

    async #discoverBooks(directory) {
        if (!directory) return [];

        const response = await fetch(directory, { cache: "no-store" });
        if (!response.ok) {
            throw new Error(`Failed to load booklet directory (${response.status})`);
        }

        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const directoryUrl = new URL(response.url, window.location.href);
        const pdfLinks = new Map();

        doc.querySelectorAll("a[href]").forEach((linkEl) => {
            const href = (linkEl.getAttribute("href") || "").trim();
            if (!href || !/\.pdf(?:$|[?#])/i.test(href)) return;

            const absoluteUrl = new URL(href, directoryUrl).href;
            const fileName = this.#fileNameFromPath(absoluteUrl);
            if (!fileName) return;

            pdfLinks.set(fileName.toLowerCase(), absoluteUrl);
        });

        return [...pdfLinks.values()]
            .map((file, index) => this.#buildBookFromFile(file, index))
            .sort((a, b) => {
                if (a.sortGroup !== b.sortGroup) return a.sortGroup - b.sortGroup;
                if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
                return a.title.localeCompare(b.title);
            });
    }

    #renderOptions() {
        if (!this.select) return;

        this.select.innerHTML = "";
        this.select.disabled = false;

        this.books.forEach((book) => {
            const option = document.createElement("option");
            option.value = book.id;
            option.textContent = book.selectorLabel || book.title;
            this.select.appendChild(option);
        });
    }

    #bindEvents() {
        this.select?.addEventListener("change", (event) => {
            const selectedIndex = this.books.findIndex((book) => book.id === event.target.value);
            if (selectedIndex >= 0) {
                this.index = selectedIndex;
                this.render();
            }
        });

        this.prevButton?.addEventListener("click", () => this.prev());
        this.nextButton?.addEventListener("click", () => this.next());

        this.root.addEventListener("keydown", (event) => {
            const tagName = String(event.target?.tagName || "").toLowerCase();
            if (tagName === "select" || tagName === "input" || tagName === "textarea") return;

            if (event.key === "ArrowLeft") {
                event.preventDefault();
                this.prev();
            }

            if (event.key === "ArrowRight") {
                event.preventDefault();
                this.next();
            }
        });
    }

    prev() {
        if (!this.books.length) return;
        this.index = (this.index - 1 + this.books.length) % this.books.length;
        this.render();
    }

    next() {
        if (!this.books.length) return;
        this.index = (this.index + 1) % this.books.length;
        this.render();
    }

    #buildFileHref(path) {
        return String(path || "").trim();
    }

    #buildPreviewHref(path, pageNumber) {
        const href = this.#buildFileHref(path);
        if (!href) return "";

        const safePage = Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : 1;
        return `${href}#page=${safePage}&toolbar=0&navpanes=0&scrollbar=0&zoom=page-fit`;
    }

    #fileNameFromPath(path) {
        const normalized = String(path || "")
            .split("#")[0]
            .split("?")[0]
            .split("/")
            .pop() || "";
        try {
            return decodeURIComponent(normalized);
        } catch {
            return normalized;
        }
    }

    #stripPdfExtensions(name) {
        return String(name || "").replace(/(?:\.pdf)+$/i, "");
    }

    #toTitleCase(value) {
        return String(value || "")
            .split(/\s+/)
            .filter(Boolean)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join(" ");
    }

    #ordinal(value) {
        const number = Number(value);
        if (!Number.isFinite(number) || number <= 0) return "";

        const mod100 = number % 100;
        if (mod100 >= 11 && mod100 <= 13) return `${number}th`;

        const mod10 = number % 10;
        if (mod10 === 1) return `${number}st`;
        if (mod10 === 2) return `${number}nd`;
        if (mod10 === 3) return `${number}rd`;
        return `${number}th`;
    }

    #buildBookFromFile(file, index) {
        const fileName = this.#fileNameFromPath(file);
        const rawBaseName = this.#stripPdfExtensions(fileName);
        const tokens = rawBaseName.split(/[_\-\s]+/).filter(Boolean);
        const lowerTokens = tokens.map((token) => token.toLowerCase());

        const numberToken = lowerTokens.find((token) => /^\d+$/.test(token));
        const editionNumber = numberToken ? Number(numberToken) : null;
        const hasSpecial = lowerTokens.includes("special") || lowerTokens.includes("especial");
        const isBattle = lowerTokens.includes("batalha");
        const isIndividual = lowerTokens.includes("individual");
        const ignoredTokens = new Set([
            "batalha",
            "individual",
            "special",
            "especial",
            "edition",
            "edicao",
            "edição",
            "person",
            "pessoa",
            "sof",
            "sofs",
        ]);

        const personTokens = tokens.filter((token, tokenIndex) => {
            const lower = lowerTokens[tokenIndex];
            return !ignoredTokens.has(lower) && !/^\d+$/.test(lower);
        });

        const personName = personTokens.length ? this.#toTitleCase(personTokens.join(" ")) : "";
        const editionLabel = hasSpecial
            ? "Special Edition"
            : (editionNumber ? `${this.#ordinal(editionNumber)} Edition` : "Edition");

        if (isBattle) {
            const title = personName
                ? `Batalha - ${editionLabel} (${personName})`
                : `Batalha - ${editionLabel}`;

            return {
                id: `battle-${index + 1}`,
                selectorLabel: title,
                title,
                file,
                badge: "Battle booklet",
                subtitle: "Paired printable puzzle booklet",
                summary: "A battle-style booklet with paired printable puzzles per sheet. The preview shows the opening page of this edition.",
                tone: hasSpecial ? "emerald" : (editionNumber === 2 ? "violet" : "blue"),
                sortGroup: 0,
                sortOrder: hasSpecial ? 999 : (editionNumber || (index + 1)),
            };
        }

        if (isIndividual) {
            const titlePrefix = personName ? `Individual ${personName}` : "Individual Person";
            const title = `${titlePrefix} - ${editionLabel}`;

            return {
                id: `individual-${index + 1}`,
                selectorLabel: title,
                title,
                file,
                badge: "Single-puzzle pages",
                subtitle: "Standalone printable puzzle set",
                summary: "A standalone printable puzzle set for single-page play. The preview shows the opening page of this edition.",
                tone: editionNumber === 2 ? "rose" : "amber",
                sortGroup: 1,
                sortOrder: hasSpecial ? 999 : (editionNumber || (index + 1)),
            };
        }

        const fallbackTitle = this.#toTitleCase(rawBaseName.replace(/[_-]+/g, " "));
        return {
            id: `book-${index + 1}`,
            selectorLabel: fallbackTitle,
            title: fallbackTitle,
            file,
            badge: "Booklet preview",
            subtitle: "Printable puzzle export",
            summary: "An automatically discovered booklet export shown from the first page of the file.",
            tone: "blue",
            sortGroup: 2,
            sortOrder: index + 1,
        };
    }

    #renderEmptyState(message) {
        if (this.select) {
            this.select.innerHTML = '<option>No books available</option>';
            this.select.disabled = true;
        }

        if (this.badge) this.badge.textContent = "Booklet preview";
        if (this.title) this.title.textContent = "No booklet previews found";
        if (this.subtitle) this.subtitle.textContent = "";
        if (this.summary) this.summary.textContent = message;
        if (this.status) this.status.textContent = "Unavailable";
        if (this.fileLabel) this.fileLabel.textContent = "";
        if (this.preview) this.preview.removeAttribute("src");
        if (this.prevButton) this.prevButton.disabled = true;
        if (this.nextButton) this.nextButton.disabled = true;

        if (this.openLink) {
            this.openLink.removeAttribute("href");
            this.openLink.setAttribute("aria-disabled", "true");
        }
    }

    render() {
        const book = this.books[this.index];
        if (!book) return;

        this.root.dataset.bookletTone = book.tone || "blue";

        if (this.select) this.select.value = book.id;
        if (this.fileLabel) this.fileLabel.textContent = this.#fileNameFromPath(book.file);
        if (this.badge) this.badge.textContent = book.badge;
        if (this.title) this.title.textContent = book.title;
        if (this.subtitle) this.subtitle.textContent = book.subtitle;
        if (this.summary) this.summary.textContent = book.summary;
        if (this.status) this.status.textContent = `${this.index + 1} of ${this.books.length}`;

        const canBrowse = this.books.length > 1;
        if (this.prevButton) this.prevButton.disabled = !canBrowse;
        if (this.nextButton) this.nextButton.disabled = !canBrowse;

        const previewHref = this.#buildPreviewHref(book.file, 1);

        if (this.preview) {
            this.preview.src = previewHref;
            this.preview.title = `${book.title} preview`;
        }

        if (this.openLink) {
            this.openLink.href = this.#buildFileHref(book.file);
            this.openLink.setAttribute("aria-disabled", "false");
        }
    }
}

function initBookletWidgets() {
    document.querySelectorAll(".bookletWidget[data-booklet-dir]").forEach((el) => {
        if (el.dataset.bookletBound === "true") return;
        el.dataset.bookletBound = "true";
        new BookletLibrary(el);
    });
}

class SopaCliWidget {
    constructor(root) {
        this.root = root;
        this.output = root.querySelector("[data-sopa-cli-output]");
        this.buttons = [...root.querySelectorAll("[data-sopa-cli-screen]")];
        this.width = 66;
        this.divider = "=".repeat(this.width);
        this.hr = "-".repeat(this.width);
        this.screens = this.#buildScreens();

        this.#bindEvents();
        this.render("source");
    }

    #bindEvents() {
        this.buttons.forEach((button) => {
            button.addEventListener("click", () => {
                this.render(button.dataset.sopaCliScreen);
            });
        });
    }

    #centerText(text, totalWidth) {
        const normalized = String(text || "");
        if (normalized.length >= totalWidth) return normalized;

        const left = Math.floor((totalWidth - normalized.length) / 2);
        const right = totalWidth - normalized.length - left;
        return `${" ".repeat(left)}${normalized}${" ".repeat(right)}`;
    }

    #box(lines) {
        const safeLines = (Array.isArray(lines) ? lines : []).map((line) => String(line || ""));
        const maxLen = safeLines.reduce((longest, line) => Math.max(longest, line.length), 0);
        const top = `+${"-".repeat(maxLen + 2)}+`;
        const body = safeLines
            .map((line) => `| ${line}${" ".repeat(maxLen - line.length)} |`)
            .join("\n");
        const bottom = `+${"-".repeat(maxLen + 2)}+`;
        return `${top}\n${body}\n${bottom}`;
    }

    #header() {
        return `<span class="sopaCliCyan">${this.divider}</span>
<span class="sopaCliCyan">${this.#centerText("Gerador de Livros de Sopa de Letras", this.width)}</span>
<span class="sopaCliCyan">${this.divider}</span>`;
    }

    #info(text) {
        return `<span class="sopaCliCyan">[i] ${text}</span>`;
    }

    #success(text) {
        return `<span class="sopaCliGreen">[ok] ${text}</span>`;
    }

    #error(text) {
        return `<span class="sopaCliRed">[x] ${text}</span>`;
    }

    #section(text) {
        return `<span class="sopaCliYellow">> ${text}</span>\n<span class="sopaCliYellow">${this.hr}</span>`;
    }

    #buildScreens() {
        return {
            source: `${this.#header()}

${this.#info("Type 'Q' or 'SAIR' at any point to exit")}

${this.#section("Word source:")}
1. JSON files (palavras/4..8.json)
2. AI generated words

<span class="sopaCliCyan">> Choose:</span> 1`,

            folder: `${this.#header()}

${this.#section("Destination folder:")}
<span class="sopaCliCyan">> Folder:</span> projeto_sopas

${this.#success("Destination folder set: /Users/demo/projeto_sopas")}`,

            menu: `${this.#header()}

<span class="sopaCliCyan">${this.#box([
    "Folder:       /Users/demo/projeto_sopas",
    "Source:       JSON files",
    "Total pages:  12",
])}</span>

${this.#section("Main menu")}
1. Generate pages
2. Change word source
3. Exit

<span class="sopaCliCyan">> Choose:</span> 1`,

            "page-type": `${this.#header()}

<span class="sopaCliCyan">${this.#box([
    "Folder:       /Users/demo/projeto_sopas",
    "Source:       JSON files",
    "Total pages:  12",
])}</span>

${this.#section("Page type:")}
A. Battle 2x puzzles 14x11 + date/winner/time (14 words each)
B. Battle 2x puzzles 14x11 without details   (14 words each)
C. Single puzzle 28x17 with side list        (20 words)
D. Single puzzle 21x20 with top list         (30 words)
E. Battle 2x puzzles 14x14 without details   (16 words each)
F. Single puzzle 30x12 with side list        (22 words)

<span class="sopaCliCyan">> Choose:</span> C
<span class="sopaCliMuted">&lt; Back to return</span>`,

            pages: `${this.#header()}

${this.#section("How many pages should be generated?")}
<span class="sopaCliCyan">> Amount:</span> 8

${this.#info("Accepted value: 8 page(s)")}`,

            difficulty: `${this.#header()}

${this.#section("Difficulty:")}
1. Easy
2. Medium
3. Hard
4. Impossible

<span class="sopaCliCyan">> Choose:</span> 2

${this.#success("Difficulty selected: Medium")}`,

            generation: `${this.#header()}

<span class="sopaCliCyan">${this.#box([
    "Folder:       /Users/demo/projeto_sopas",
    "Source:       JSON files",
    "Total pages:  12",
])}</span>

${this.#info("Generating 8 page(s) starting at page 13...")}

<span class="sopaCliCyan">[1/8]</span> Generating page 13... <span class="sopaCliGreen">[ok]</span>
<span class="sopaCliCyan">[2/8]</span> Generating page 14... <span class="sopaCliGreen">[ok]</span>
<span class="sopaCliCyan">[3/8]</span> Generating page 15... <span class="sopaCliGreen">[ok]</span>
<span class="sopaCliCyan">[4/8]</span> Generating page 16... <span class="sopaCliGreen">[ok]</span>
<span class="sopaCliCyan">[5/8]</span> Generating page 17... <span class="sopaCliGreen">[ok]</span>
<span class="sopaCliCyan">[6/8]</span> Generating page 18... <span class="sopaCliGreen">[ok]</span>
<span class="sopaCliCyan">[7/8]</span> Generating page 19... <span class="sopaCliGreen">[ok]</span>
<span class="sopaCliCyan">[8/8]</span> Generating page 20... <span class="sopaCliGreen">[ok]</span>

${this.#success("Pages generated successfully")}
${this.#info("Created range: 13 to 20")}
${this.#info("main.tex updated")}
${this.#error("Visual example only. No real generation here")}

${this.#section("Main menu")}
1. Generate pages
2. Change word source
3. Exit

<span class="sopaCliCyan">> Choose:</span>`,
        };
    }

    render(screenName) {
        if (!this.output) return;
        const key = String(screenName || "source");
        this.output.innerHTML = this.screens[key] || this.screens.source;

        this.buttons.forEach((button) => {
            button.classList.toggle("active", button.dataset.sopaCliScreen === key);
        });
    }
}

function initSopaCliWidgets() {
    document.querySelectorAll("[data-sopa-cli]").forEach((el) => {
        if (el.dataset.sopaCliBound === "true") return;
        el.dataset.sopaCliBound = "true";
        new SopaCliWidget(el);
    });
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
    initBookletWidgets();
    initSopaCliWidgets();
});
