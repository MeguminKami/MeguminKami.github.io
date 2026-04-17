let currentTechFilter = "all";
let currentStatusFilter = "all";

function filterCards() {
    document.querySelectorAll(".card").forEach((card) => {
        const tags = String(card.dataset.tags || "").split(" ").filter(Boolean);
        const status = String(card.dataset.status || "");

        const matchesTech = currentTechFilter === "all" || tags.includes(currentTechFilter);
        const matchesStatus = currentStatusFilter === "all" || status === currentStatusFilter;

        card.style.display = matchesTech && matchesStatus ? "" : "none";
    });
}

export function initFilters() {
    const techPills = document.querySelectorAll(".pill:not(.status-pill)");
    const statusPills = document.querySelectorAll(".pill.status-pill");

    if (!techPills.length && !statusPills.length) return;

    techPills.forEach((pill) => {
        if (pill.dataset.filterBound === "true") return;

        pill.dataset.filterBound = "true";
        pill.addEventListener("click", () => {
            techPills.forEach((item) => item.classList.remove("isActive"));
            pill.classList.add("isActive");
            currentTechFilter = pill.dataset.filter || "all";
            filterCards();
        });
    });

    statusPills.forEach((pill) => {
        if (pill.dataset.filterBound === "true") return;

        pill.dataset.filterBound = "true";
        pill.addEventListener("click", () => {
            statusPills.forEach((item) => item.classList.remove("isActive"));
            pill.classList.add("isActive");
            currentStatusFilter = pill.dataset.status || "all";
            filterCards();
        });
    });

    filterCards();
}
