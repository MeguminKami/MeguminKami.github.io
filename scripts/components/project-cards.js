import {
    getProjectLatestUpdate,
    loadProjectsData,
    sortProjectsByLatestUpdate,
    updateProjectsStat,
} from "../core/projects.js";

function normalizeStatusClass(status) {
    const normalized = String(status || "").toLowerCase().trim();

    if (normalized === "complete" || normalized === "completed" || normalized === "done") {
        return "complete";
    }

    if (normalized === "in-progress" || normalized === "in progress" || normalized === "progress") {
        return "in-progress";
    }

    if (normalized === "paused" || normalized === "on-hold" || normalized === "hold") {
        return "paused";
    }

    if (normalized === "incomplete") return "incomplete";
    if (normalized === "tbs" || normalized === "to be started") return "to-be-started";

    return "paused";
}

function humanStatus(status) {
    const normalized = String(status || "").toLowerCase().trim();

    if (normalized === "complete" || normalized === "completed" || normalized === "done") {
        return "Complete";
    }

    if (normalized === "in-progress" || normalized === "in progress" || normalized === "progress") {
        return "In Progress";
    }

    if (normalized === "paused" || normalized === "on-hold" || normalized === "hold") {
        return "Paused";
    }

    if (normalized === "incomplete") return "Incomplete";
    if (normalized === "tbs" || normalized === "to be started") return "To Be Started";

    return status || "Paused";
}

function renderProjectCards(gridElement, projects) {
    gridElement.innerHTML = "";

    const fragment = document.createDocumentFragment();

    projects.forEach((project) => {
        const article = document.createElement("article");
        article.className = "card";
        article.dataset.tags = (project.tagsData || []).join(" ");
        article.dataset.status = project.status || "";
        article.style.cursor = "pointer";

        const cover = document.createElement("div");
        cover.className = "cover";
        cover.setAttribute("role", "img");
        cover.setAttribute(
            "aria-label",
            project.cover?.ariaLabel || `${project.title || "Project"} cover`
        );

        const imageUrl = project.cover?.image || "";
        if (imageUrl) {
            cover.style.backgroundImage = `url('${imageUrl}')`;
        }

        const body = document.createElement("div");
        body.className = "cardBody";

        const row = document.createElement("div");
        row.className = "row";

        const title = document.createElement("h3");
        title.textContent = project.title || "Untitled Project";

        const badge = document.createElement("span");
        badge.className = "badge";
        badge.textContent = project.badge || "Project";

        const statusBadge = document.createElement("span");
        statusBadge.className = `status-badge ${normalizeStatusClass(project.status)}`;
        statusBadge.textContent = humanStatus(project.status);

        row.append(title, badge, statusBadge);

        const description = document.createElement("p");
        description.className = "muted smallText";
        description.textContent = project.description || "";

        const latestUpdate = getProjectLatestUpdate(project);
        const latestUpdateLine = document.createElement("p");
        latestUpdateLine.className = "cardLatestUpdate smallText";
        latestUpdateLine.textContent = latestUpdate?.display
            ? `Latest update: ${latestUpdate.display}`
            : "Latest update: not set";

        const bullets = document.createElement("ul");
        bullets.className = "bullets smallText";
        (project.bullets || []).forEach((item) => {
            const listItem = document.createElement("li");
            listItem.textContent = item;
            bullets.appendChild(listItem);
        });

        const tagsWrap = document.createElement("div");
        tagsWrap.className = "tags";
        (project.tags || []).forEach((item) => {
            const tag = document.createElement("span");
            tag.className = "tag";
            tag.textContent = item;
            tagsWrap.appendChild(tag);
        });

        const actions = document.createElement("div");
        actions.className = "actions";

        const viewLink = document.createElement("a");
        viewLink.className = "btn primary small";
        viewLink.href = project.viewHref || "#";
        viewLink.textContent = "View Details";

        const quickPreviewButton = document.createElement("button");
        quickPreviewButton.className = "btn small";
        quickPreviewButton.type = "button";
        quickPreviewButton.textContent = "Quick Preview";
        quickPreviewButton.dataset.modalTitle = project.modal?.title || project.title || "Project";
        quickPreviewButton.dataset.modalSub = project.modal?.sub || "";
        quickPreviewButton.dataset.modalDesc = project.modal?.desc || project.description || "";
        quickPreviewButton.dataset.modalImg = project.modal?.img || project.cover?.image || "";

        actions.append(viewLink, quickPreviewButton);
        body.append(row, latestUpdateLine, description, bullets, tagsWrap, actions);
        article.append(cover, body);

        article.addEventListener("click", (event) => {
            if (event.target.closest("button") || event.target.closest("a")) {
                return;
            }

            const href = project.viewHref || "#";
            if (href !== "#") {
                window.location.href = href;
            }
        });

        fragment.appendChild(article);
    });

    gridElement.appendChild(fragment);
}

export async function initProjectsGrid() {
    const gridElement = document.getElementById("projectsGrid");
    if (!gridElement) return;

    try {
        const projects = await loadProjectsData();
        const sortedProjects = sortProjectsByLatestUpdate(projects);

        renderProjectCards(gridElement, sortedProjects);
        updateProjectsStat(projects);
    } catch (error) {
        console.error(error);
        gridElement.innerHTML = '<p class="muted smallText">Could not load projects.</p>';
    }
}
