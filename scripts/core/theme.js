export const THEME_KEY = "portfolio_theme";

export function applyTheme(theme) {
    document.body.classList.toggle("light", theme === "light");
}

export function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);

    if (savedTheme) {
        applyTheme(savedTheme);
        return;
    }

    const prefersLight = window.matchMedia
        && window.matchMedia("(prefers-color-scheme: light)").matches;

    applyTheme(prefersLight ? "light" : "dark");
}
