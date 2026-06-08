import { applyTheme, THEME_KEY } from "../core/theme.js";

async function loadPartial(targetId, url) {
    const host = document.getElementById(targetId);
    if (!host) return;

    try {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) {
            throw new Error(`Failed to load ${url} (${response.status})`);
        }

        host.innerHTML = await response.text();
    } catch (error) {
        console.error(error);
    }
}

function updateNavLinksForPage() {
    const path = window.location.pathname.toLowerCase().replace(/\/+$/, "");
    const isHome = path === "" || path === "/index.html";

    const projectsLink = document.querySelector('[data-nav="projects"]');
    const aboutLink = document.querySelector('[data-nav="about"]');
    const contactLink = document.querySelector('[data-nav="contact"]');

    if (projectsLink) projectsLink.href = isHome ? "#projects" : "/index.html#projects";
    if (aboutLink) aboutLink.href = isHome ? "#about" : "/index.html#about";
    if (contactLink) contactLink.href = "#contact";
}

function updateFooterYear() {
    const yearElement = document.getElementById("year");
    if (yearElement) {
        yearElement.textContent = String(new Date().getFullYear());
    }
}

function bindThemeToggle() {
    const themeButton = document.getElementById("themeBtn");
    if (!themeButton || themeButton.dataset.bound === "true") return;

    themeButton.dataset.bound = "true";
    themeButton.addEventListener("click", () => {
        const isLight = document.body.classList.contains("light");
        const nextTheme = isLight ? "dark" : "light";
        applyTheme(nextTheme);
        localStorage.setItem(THEME_KEY, nextTheme);
    });
}

export function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        if (anchor.dataset.smoothBound === "true") return;

        anchor.dataset.smoothBound = "true";
        anchor.addEventListener("click", (event) => {
            const href = anchor.getAttribute("href");
            if (!href || href === "#") return;

            const target = document.querySelector(href);
            if (!target) return;

            event.preventDefault();
            const offset = 80;
            const targetPosition = target.offsetTop - offset;

            window.scrollTo({
                top: targetPosition,
                behavior: "smooth",
            });
        });
    });
}

export async function initSharedLayout() {
    await Promise.all([
        loadPartial("siteHeader", "/partials/header.partial"),
        loadPartial("siteFooter", "/partials/footer.partial"),
    ]);

    updateNavLinksForPage();
    bindThemeToggle();
    updateFooterYear();
    initSmoothScroll();
}
