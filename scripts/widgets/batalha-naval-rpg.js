const BOARD_SIZE = 12;

const WIDGET_STATES = {
    placement: {
        badge: "Placement",
        title: "Ship Placement and Validation",
        meta: "QGraphicsScene",
        description: "Ships are draggable QGraphicsRectItem objects. Right-click rotation, snap-to-grid placement, and validation signals keep the final board state deterministic before the match starts.",
        playerLabel: "Player Placement Board",
        enemyLabel: "Opponent Preview Board",
        stats: [
            ["6 ships", "NUM_SHIP placement objects"],
            ["40 px", "SQUARE cell size"],
            ["12 x 12", "NUM_SQUARES grid"],
        ],
        playerMarks: [
            { x: 1, y: 1, w: 4, h: 1, type: "ship", label: "S" },
            { x: 7, y: 2, w: 1, h: 5, type: "ship", label: "S" },
            { x: 2, y: 5, w: 3, h: 1, type: "ship", label: "S" },
            { x: 9, y: 7, w: 1, h: 3, type: "ship", label: "S" },
            { x: 4, y: 9, w: 4, h: 1, type: "preview", label: "" },
        ],
        enemyMarks: [
            { x: 2, y: 2, w: 3, h: 3, type: "radar", label: "?" },
            { x: 7, y: 6, w: 2, h: 2, type: "preview", label: "" },
        ],
        skills: [
            ["objects", "Mouse dragging and right-click rotation"],
            ["board", "12 x 12 scene with reusable brushes"],
            ["preview", "Clamped skill rectangle preview"],
            ["validation", "Placement-ready transition after all ships fit"],
        ],
    },
    turn: {
        badge: "Skill Turn",
        title: "AP, Cooldowns, AOE, and Hit Feedback",
        meta: "Player vs CPU",
        description: "The player selects a skill, the preview snaps to the enemy board, action points are spent, and hit, miss, radar, destroy, and victory responses update the board.",
        playerLabel: "Player Defense Board",
        enemyLabel: "Enemy Target Board",
        stats: [
            ["AP cost", "Each skill spends action points"],
            ["AOE", "skill.aoeSize uses width x height"],
            ["cooldown", "Skill reuse is turn-gated"],
        ],
        playerMarks: [
            { x: 1, y: 1, w: 4, h: 1, type: "ship", label: "S" },
            { x: 7, y: 2, w: 1, h: 5, type: "ship", label: "S" },
            { x: 7, y: 3, w: 1, h: 1, type: "hit", label: "x" },
            { x: 3, y: 8, w: 1, h: 1, type: "miss", label: "o" },
            { x: 9, y: 7, w: 1, h: 3, type: "ship", label: "S" },
        ],
        enemyMarks: [
            { x: 4, y: 4, w: 3, h: 2, type: "aoe", label: "" },
            { x: 5, y: 5, w: 1, h: 1, type: "hit", label: "x" },
            { x: 6, y: 5, w: 1, h: 1, type: "hit", label: "x" },
            { x: 8, y: 3, w: 1, h: 1, type: "miss", label: "o" },
            { x: 2, y: 8, w: 2, h: 2, type: "radar", label: "?" },
        ],
        skills: [
            ["Captain", "Radar, Air Strike, Torpedo, Nuclear"],
            ["Pirate", "Cannon Ball, Barrage, Explosive Barel, Humungous"],
            ["Space Commander", "Phaser, Ion Blaster, Double Beam, Superlaser"],
            ["passives", "Radar focus, AP bonus, or repeat shot on hit"],
        ],
    },
    online: {
        badge: "Online Relay",
        title: "Host, Join, and Packet Relay",
        meta: "QTcpSocket",
        description: "Online play uses a lightweight relay. The server accepts two sockets and forwards packets; the clients keep the actual game-rule interpretation.",
        playerLabel: "Host Client State",
        enemyLabel: "Join Client State",
        stats: [
            ["2 sockets", "Server relays host and join clients"],
            ["12 codes", "0-9 plus A and B packet prefixes"],
            ["raw bytes", "Compact payloads such as code + x.y."],
        ],
        playerMarks: [
            { x: 1, y: 1, w: 2, h: 2, type: "packet", label: "0" },
            { x: 4, y: 3, w: 2, h: 2, type: "packet", label: "2" },
            { x: 7, y: 5, w: 2, h: 2, type: "packet", label: "3" },
            { x: 9, y: 8, w: 2, h: 2, type: "packet", label: "9" },
        ],
        enemyMarks: [
            { x: 2, y: 2, w: 2, h: 2, type: "packet", label: "0" },
            { x: 5, y: 4, w: 2, h: 2, type: "packet", label: "4" },
            { x: 7, y: 7, w: 2, h: 2, type: "packet", label: "6" },
            { x: 3, y: 9, w: 2, h: 2, type: "packet", label: "B" },
        ],
        skills: [
            ["INFO_P", "Exchange character ID and player name"],
            ["PLACE_R", "Signal placement-ready state"],
            ["AHIT/RHIT", "Ask and answer hit checks"],
            ["TURN_P", "Pass control to the opponent"],
        ],
    },
};

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function makeEmptyBoard() {
    return Array.from({ length: BOARD_SIZE }, () => (
        Array.from({ length: BOARD_SIZE }, () => ({ type: "", label: "" }))
    ));
}

function applyMark(board, mark) {
    const startX = Math.max(0, Number(mark.x) || 0);
    const startY = Math.max(0, Number(mark.y) || 0);
    const width = Math.max(1, Number(mark.w) || 1);
    const height = Math.max(1, Number(mark.h) || 1);
    const endX = Math.min(BOARD_SIZE, startX + width);
    const endY = Math.min(BOARD_SIZE, startY + height);

    for (let y = startY; y < endY; y += 1) {
        for (let x = startX; x < endX; x += 1) {
            board[y][x] = {
                type: mark.type || "",
                label: mark.label || "",
            };
        }
    }
}

function renderBoard(element, marks) {
    if (!element) return;

    const board = makeEmptyBoard();
    marks.forEach((mark) => applyMark(board, mark));

    element.innerHTML = board.flatMap((row) => row.map((cell) => {
        const className = ["bnrpgCell", cell.type].filter(Boolean).join(" ");
        return `<span class="${className}" aria-hidden="true">${escapeHtml(cell.label)}</span>`;
    })).join("");
}

class BatalhaNavalRpgWidget {
    constructor(root) {
        this.root = root;
        this.buttons = [...root.querySelectorAll("[data-bnrpg-mode]")];
        this.badge = root.querySelector("[data-bnrpg-badge]");
        this.title = root.querySelector("[data-bnrpg-title]");
        this.description = root.querySelector("[data-bnrpg-description]");
        this.meta = root.querySelector("[data-bnrpg-meta]");
        this.stats = root.querySelector("[data-bnrpg-stats]");
        this.playerLabel = root.querySelector("[data-bnrpg-player-label]");
        this.enemyLabel = root.querySelector("[data-bnrpg-enemy-label]");
        this.playerBoard = root.querySelector("[data-bnrpg-player-board]");
        this.enemyBoard = root.querySelector("[data-bnrpg-enemy-board]");
        this.skills = root.querySelector("[data-bnrpg-skills]");

        this.bindEvents();
        this.render("placement");
    }

    bindEvents() {
        this.buttons.forEach((button) => {
            button.addEventListener("click", () => {
                this.render(button.dataset.bnrpgMode);
            });
        });
    }

    render(mode) {
        const key = WIDGET_STATES[mode] ? mode : "placement";
        const state = WIDGET_STATES[key];

        this.buttons.forEach((button) => {
            button.classList.toggle("active", button.dataset.bnrpgMode === key);
        });

        if (this.badge) this.badge.textContent = state.badge;
        if (this.title) this.title.textContent = state.title;
        if (this.description) this.description.textContent = state.description;
        if (this.meta) this.meta.textContent = state.meta;
        if (this.playerLabel) this.playerLabel.textContent = state.playerLabel;
        if (this.enemyLabel) this.enemyLabel.textContent = state.enemyLabel;

        if (this.stats) {
            this.stats.innerHTML = state.stats.map(([value, label]) => `
<div class="bnrpgStatCard">
    <span class="bnrpgStatValue">${escapeHtml(value)}</span>
    <span class="bnrpgStatLabel">${escapeHtml(label)}</span>
</div>`).join("");
        }

        if (this.skills) {
            this.skills.innerHTML = state.skills.map(([name, detail]) => `
<div class="bnrpgSkillPill">
    <strong>${escapeHtml(name)}</strong>
    <span>${escapeHtml(detail)}</span>
</div>`).join("");
        }

        renderBoard(this.playerBoard, state.playerMarks);
        renderBoard(this.enemyBoard, state.enemyMarks);
    }
}

class BatalhaNavalPdfDemo {
    constructor(root) {
        this.root = root;
        this.frame = root.querySelector("[data-bnrpg-pdf-frame]");
        this.resetButton = root.querySelector("[data-bnrpg-pdf-reset]");
        this.prevButton = root.querySelector("[data-bnrpg-pdf-prev]");
        this.nextButton = root.querySelector("[data-bnrpg-pdf-next]");
        this.counter = root.querySelector("[data-bnrpg-pdf-counter]");
        this.pdfSrc = root.dataset.bnrpgPdfSrc || "";
        this.totalPages = Math.max(1, Number(root.dataset.bnrpgPdfPages) || 1);
        this.currentPage = 1;

        this.bindEvents();
        this.goToPage(1);
    }

    bindEvents() {
        this.resetButton?.addEventListener("click", () => this.goToPage(1));
        this.prevButton?.addEventListener("click", () => this.goToPage(this.currentPage - 1));
        this.nextButton?.addEventListener("click", () => this.goToPage(this.currentPage + 1));

        this.frame?.addEventListener("load", () => {
            this.syncPageFromFrame();
        });
    }

    makePdfUrl(page) {
        return `${this.pdfSrc}#page=${page}&view=Fit&zoom=page-fit&pagemode=none&toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0`;
    }

    clampPage(page) {
        return Math.max(1, Math.min(this.totalPages, Number(page) || 1));
    }

    syncPageFromFrame() {
        try {
            const href = this.frame?.contentWindow?.location?.href || "";
            const match = href.match(/[?#&]page=(\d+)/i);
            if (!match) return;

            const page = this.clampPage(match[1]);
            if (page === this.currentPage) return;
            this.currentPage = page;
            this.updateControls();
        } catch {
            // Browser PDF viewers may run in an isolated origin; outer controls remain authoritative.
        }
    }

    goToPage(page) {
        const nextPage = this.clampPage(page);
        this.currentPage = nextPage;

        if (this.frame && this.pdfSrc) {
            this.frame.src = this.makePdfUrl(nextPage);
        }

        this.updateControls();
    }

    updateControls() {
        if (this.counter) {
            this.counter.textContent = `${this.currentPage} / ${this.totalPages}`;
        }

        if (this.prevButton) this.prevButton.disabled = this.currentPage <= 1;
        if (this.nextButton) this.nextButton.disabled = this.currentPage >= this.totalPages;
    }
}

export function initBatalhaNavalRpgWidgets() {
    document.querySelectorAll("[data-bnrpg-widget]").forEach((element) => {
        if (element.dataset.bnrpgBound === "true") return;

        element.dataset.bnrpgBound = "true";
        new BatalhaNavalRpgWidget(element);
    });

    document.querySelectorAll("[data-bnrpg-pdf-demo]").forEach((element) => {
        if (element.dataset.bnrpgPdfBound === "true") return;

        element.dataset.bnrpgPdfBound = "true";
        new BatalhaNavalPdfDemo(element);
    });
}
