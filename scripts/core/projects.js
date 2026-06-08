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

function normalizePathForMatch(path) {
    const normalized = String(path || "")
        .split("#")[0]
        .split("?")[0]
        .replace(/\\/g, "/")
        .toLowerCase()
        .trim()
        .replace(/^\/+/, "")
        .replace(/\/index\.html$/, "")
        .replace(/\/+$/, "");

    return normalized === "index.html" ? "" : normalized;
}

export function getProjectLatestUpdate(project) {
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
        const display = rawLabel || (
            Number.isFinite(timestamp)
                ? latestUpdateDateFormatter.format(new Date(timestamp))
                : rawDate
        );

        if (!display) return null;
        return { raw: rawDate || rawLabel, timestamp, display };
    }

    return null;
}

export function sortProjectsByLatestUpdate(projects) {
    return [...projects].sort((a, b) => {
        const aUpdate = getProjectLatestUpdate(a);
        const bUpdate = getProjectLatestUpdate(b);
        const aTimestamp = aUpdate?.timestamp ?? Number.NEGATIVE_INFINITY;
        const bTimestamp = bUpdate?.timestamp ?? Number.NEGATIVE_INFINITY;

        if (aTimestamp !== bTimestamp) return bTimestamp - aTimestamp;
        return (a.title || "").localeCompare(b.title || "");
    });
}

export function findProjectForCurrentPage(projects) {
    const currentPage = normalizePathForMatch(window.location.pathname);
    if (!currentPage || currentPage === "index.html") return null;

    return projects.find((project) => {
        const projectPath = normalizePathForMatch(project?.viewHref || "");
        return projectPath && projectPath === currentPage;
    }) || null;
}

export async function loadProjectsData() {
    if (!projectsDataPromise) {
        projectsDataPromise = fetch("/projects.json", { cache: "no-store" })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Failed to load projects.json (${response.status})`);
                }

                return response.json();
            })
            .then((data) => (Array.isArray(data) ? data : (data.projects || [])))
            .catch((error) => {
                projectsDataPromise = null;
                throw error;
            });
    }

    return projectsDataPromise;
}

export function updateProjectsStat(projects) {
    const projectsStat = document.querySelector('[data-stat="projects"]');
    if (projectsStat) {
        projectsStat.textContent = String(projects.length);
    }
}

export async function updateProjectLatestUpdateElements() {
    const latestUpdateTargets = document.querySelectorAll("[data-project-latest-update]");
    if (!latestUpdateTargets.length) return;

    try {
        const projects = await loadProjectsData();
        const currentProject = findProjectForCurrentPage(projects);
        if (!currentProject) return;

        const latestUpdate = getProjectLatestUpdate(currentProject);
        if (!latestUpdate?.display) return;

        latestUpdateTargets.forEach((target) => {
            target.textContent = latestUpdate.display;
        });
    } catch (error) {
        console.error(error);
    }
}
