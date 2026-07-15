const BASE_MAZE_10 = [
    "XXXXXXXXXX",
    "X        X",
    "X XX X X X",
    "X XX X X X",
    "X XX X X X",
    "X      X X",
    "X XX X X X",
    "X XX X X X",
    "X XX   X X",
    "XXXXXXXXXX",
];

const DIRECTIONS = {
    ArrowUp: [-1, 0],
    KeyW: [-1, 0],
    w: [-1, 0],
    W: [-1, 0],
    ArrowDown: [1, 0],
    KeyS: [1, 0],
    s: [1, 0],
    S: [1, 0],
    ArrowLeft: [0, -1],
    KeyA: [0, -1],
    a: [0, -1],
    A: [0, -1],
    ArrowRight: [0, 1],
    KeyD: [0, 1],
    d: [0, 1],
    D: [0, 1],
};

function cloneGrid(lines) {
    return lines.map((line) => [...line]);
}

function randomInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}

function samePos(a, b) {
    return a.i === b.i && a.j === b.j;
}

function manhattan(a, b) {
    return Math.abs(a.i - b.i) + Math.abs(a.j - b.j);
}

function isClose(a, b) {
    return manhattan(a, b) <= 1;
}

function boundedLoop(limit, callback) {
    for (let attempt = 0; attempt < limit; attempt += 1) {
        const value = callback(attempt);
        if (value) return value;
    }

    return null;
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function makeStatus(status, label, message) {
    return { status, label, message };
}

function isInside(grid, pos) {
    return pos.i >= 0
        && pos.i < grid.length
        && pos.j >= 0
        && pos.j < grid[0].length;
}

function posKey(pos) {
    return `${pos.i},${pos.j}`;
}

function getDirectionFromEvent(event) {
    return DIRECTIONS[event.code] || DIRECTIONS[event.key] || null;
}

class HereBeDragonsGame {
    constructor() {
        this.title = "Here Be Dragons";
        this.reset();
    }

    reset() {
        this.baseGrid = cloneGrid(BASE_MAZE_10);
        this.hero = { i: 1, j: 1 };
        this.key = { i: 8, j: 1 };
        this.dragon = { i: 5, j: 4 };
        this.exit = this.placeExit();
        this.hasKey = false;
        this.status = makeStatus(
            "intro",
            "Ready",
            "Press Start, then move with WASD, arrow keys, or the on-screen controls."
        );
    }

    start() {
        if (this.status.status === "playing") return;
        if (this.status.status === "won" || this.status.status === "lost") this.reset();
        this.status = makeStatus("playing", "Exploring", "Find the key before escaping.");
    }

    placeExit() {
        return boundedLoop(100, () => {
            const candidate = {
                i: randomInt(1, 8),
                j: Math.random() < 0.5 ? 0 : 9,
            };

            if (isClose(candidate, this.hero)) return null;
            if (isClose(candidate, this.key)) return null;
            if (isClose(candidate, this.dragon)) return null;
            return candidate;
        }) || { i: 8, j: 9 };
    }

    move(di, dj) {
        if (this.status.status !== "playing") return;

        const next = { i: this.hero.i + di, j: this.hero.j + dj };
        if (!isInside(this.baseGrid, next)) return;

        const isExit = samePos(next, this.exit);
        if (this.baseGrid[next.i][next.j] === "X" && !isExit) {
            this.status = makeStatus("playing", "Blocked", "A wall stops the hero.");
            return;
        }

        if (isExit && !this.hasKey) {
            this.status = makeStatus("playing", "Locked", "The exit stays shut until the key is collected.");
            return;
        }

        this.hero = next;

        if (samePos(this.hero, this.key)) {
            this.hasKey = true;
            this.status = makeStatus("playing", "Key Found", "The exit can now be opened.");
        }

        if (samePos(this.hero, this.dragon) || isClose(this.hero, this.dragon)) {
            this.status = makeStatus("lost", "Defeat", "The hero moved too close to the dragon.");
            return;
        }

        if (samePos(this.hero, this.exit) && this.hasKey) {
            this.status = makeStatus("won", "Victory", "The gate opens. You escaped the maze.");
        }
    }

    getOverlayGrid() {
        const grid = cloneGrid(this.baseGrid.map((row) => row.join("")));
        grid[this.exit.i][this.exit.j] = "E";
        if (!this.hasKey) grid[this.key.i][this.key.j] = "K";
        grid[this.dragon.i][this.dragon.j] = "D";
        grid[this.hero.i][this.hero.j] = "H";
        return grid;
    }

    snapshot() {
        return {
            title: this.title,
            status: this.status,
            grid: this.getOverlayGrid(),
            hero: this.hero,
            autoFollow: false,
            details: [
                `Key: ${this.hasKey ? "collected" : "missing"}`,
                "Dragon: stationary",
                "Goal: key, then exit",
            ],
        };
    }
}

class DragonBaneGame {
    constructor({ dragons = 3, maxDragons = 5 } = {}) {
        this.title = "Dragon's Bane";
        this.size = 10;
        this.maxDragons = maxDragons;
        this.dragonCount = Math.max(1, Math.min(this.maxDragons, Number(dragons) || 3));
        this.reset();
    }

    reset() {
        this.baseGrid = cloneGrid(BASE_MAZE_10);
        this.hero = { i: 1, j: 1 };
        this.key = { i: 8, j: 1 };
        this.sword = { i: 1, j: 8 };
        this.hasKey = false;
        this.hasSword = false;
        this.exit = this.placeExit([]);
        this.dragons = this.placeDragons();
        this.exit = this.placeExit(this.dragons);
        this.status = makeStatus(
            "intro",
            "Ready",
            "Choose a dragon count, press Start, then collect the sword and key."
        );
    }

    start() {
        if (this.status.status === "playing") return;
        if (this.status.status === "won" || this.status.status === "lost") this.reset();
        this.status = makeStatus("playing", "Hunting", "The dragons move after each hero turn.");
    }

    placeDragons() {
        const dragons = [];

        for (let index = 0; index < this.dragonCount; index += 1) {
            const dragon = boundedLoop(500, () => {
                const candidate = { i: randomInt(1, 8), j: randomInt(1, 8) };
                if (!this.isValidDragonSpawn(candidate, dragons)) return null;
                return { pos: candidate, alive: true, symbol: "D" };
            });

            if (dragon) dragons.push(dragon);
        }

        if (dragons.length < this.dragonCount) {
            for (let i = 1; i <= 8 && dragons.length < this.dragonCount; i += 1) {
                for (let j = 1; j <= 8 && dragons.length < this.dragonCount; j += 1) {
                    const candidate = { i, j };
                    if (this.isValidDragonSpawn(candidate, dragons)) {
                        dragons.push({ pos: candidate, alive: true, symbol: "D" });
                    }
                }
            }
        }

        return dragons;
    }

    isValidDragonSpawn(candidate, dragons) {
        if (this.baseGrid[candidate.i][candidate.j] === "X") return false;
        if (isClose(candidate, this.key)) return false;
        if (isClose(candidate, this.sword)) return false;
        if (manhattan(candidate, this.hero) <= 4) return false;
        if (dragons.some((existing) => samePos(existing.pos, candidate))) return false;
        return true;
    }

    placeExit(dragons) {
        return boundedLoop(500, () => {
            const candidate = {
                i: randomInt(1, 8),
                j: Math.random() < 0.5 ? 0 : 9,
            };

            if (isClose(candidate, this.hero)) return null;
            if (isClose(candidate, this.key)) return null;
            if (dragons.some((dragon) => dragon.alive && isClose(candidate, dragon.pos))) return null;
            return candidate;
        }) || { i: 8, j: 9 };
    }

    livingDragons() {
        return this.dragons.filter((dragon) => dragon.alive);
    }

    allDragonsDead() {
        return this.livingDragons().length === 0;
    }

    dragonAt(pos) {
        return this.dragons.find((dragon) => dragon.alive && samePos(dragon.pos, pos)) || null;
    }

    canMoveInto(pos) {
        if (!isInside(this.baseGrid, pos)) return false;
        if (samePos(pos, this.exit)) return this.hasKey && this.allDragonsDead();
        if (this.baseGrid[pos.i][pos.j] === "X") return false;
        return true;
    }

    move(di, dj) {
        if (this.status.status !== "playing") return;

        const next = { i: this.hero.i + di, j: this.hero.j + dj };
        const targetDragon = this.dragonAt(next);

        if (targetDragon) {
            if (!this.hasSword) {
                this.status = makeStatus("lost", "Defeat", "The hero confronted a dragon without the sword.");
                return;
            }

            targetDragon.alive = false;
            this.hero = next;
            this.status = makeStatus("playing", "Dragon Slain", "The sword clears the way.");
        } else if (samePos(next, this.exit) && !this.hasKey) {
            this.status = makeStatus("playing", "Locked", "The key is required before using the exit.");
            return;
        } else if (samePos(next, this.exit) && !this.allDragonsDead()) {
            this.status = makeStatus("playing", "Unsafe Exit", "Every dragon must be defeated first.");
            return;
        } else if (this.canMoveInto(next)) {
            this.hero = next;
        } else {
            this.status = makeStatus("playing", "Blocked", "A wall or closed route blocks movement.");
            return;
        }

        this.collectItems();
        this.updateGameAfterContact();
        if (this.status.status !== "playing") return;

        this.moveDragons();
        this.updateGameAfterContact();
        if (this.status.status !== "playing") return;

        if (samePos(this.hero, this.exit) && this.hasKey && this.allDragonsDead()) {
            this.status = makeStatus("won", "Victory", "The last dragon falls and the exit opens.");
        }
    }

    collectItems() {
        if (samePos(this.hero, this.key)) {
            this.hasKey = true;
            this.status = makeStatus("playing", "Key Found", "The master key is now in the inventory.");
        }

        if (samePos(this.hero, this.sword)) {
            this.hasSword = true;
            this.status = makeStatus("playing", "Sword Found", "The hero can now slay adjacent dragons.");
        }
    }

    updateGameAfterContact() {
        const adjacent = this.livingDragons().find((dragon) => samePos(dragon.pos, this.hero) || isClose(dragon.pos, this.hero));
        if (!adjacent) return;

        if (!this.hasSword) {
            this.status = makeStatus("lost", "Defeat", "A dragon got too close before the sword was found.");
            return;
        }

        adjacent.alive = false;
        this.status = makeStatus("playing", "Dragon Slain", "The sword defeated a nearby dragon.");
    }

    moveDragons() {
        this.livingDragons().forEach((dragon) => {
            const validMoves = [];

            for (let di = -1; di <= 1; di += 1) {
                for (let dj = -1; dj <= 1; dj += 1) {
                    if (di === 0 && dj === 0) continue;
                    const candidate = { i: dragon.pos.i + di, j: dragon.pos.j + dj };
                    if (!isInside(this.baseGrid, candidate)) continue;
                    if (samePos(candidate, this.hero)) continue;
                    if (samePos(candidate, this.exit)) continue;
                    if (this.dragonAt(candidate)) continue;

                    const cell = this.baseGrid[candidate.i][candidate.j];
                    const isTreasure = samePos(candidate, this.key) || samePos(candidate, this.sword);
                    if (cell === " " || isTreasure) validMoves.push(candidate);
                }
            }

            if (!validMoves.length) return;
            dragon.pos = validMoves[randomInt(0, validMoves.length - 1)];
            dragon.symbol = (samePos(dragon.pos, this.key) && !this.hasKey)
                || (samePos(dragon.pos, this.sword) && !this.hasSword)
                ? "F"
                : "D";
        });
    }

    getOverlayGrid() {
        const grid = cloneGrid(this.baseGrid.map((row) => row.join("")));
        grid[this.exit.i][this.exit.j] = "E";
        if (!this.hasKey) grid[this.key.i][this.key.j] = "K";
        if (!this.hasSword) grid[this.sword.i][this.sword.j] = "S";
        this.dragons.forEach((dragon) => {
            if (dragon.alive) grid[dragon.pos.i][dragon.pos.j] = dragon.symbol;
        });
        grid[this.hero.i][this.hero.j] = this.hasSword ? "A" : "H";
        return grid;
    }

    snapshot() {
        const alive = this.livingDragons().length;
        return {
            title: this.title,
            status: this.status,
            grid: this.getOverlayGrid(),
            hero: this.hero,
            autoFollow: false,
            details: [
                `Key: ${this.hasKey ? "collected" : "missing"}`,
                `Sword: ${this.hasSword ? "equipped" : "missing"}`,
                `Dragons alive: ${alive}/${this.dragonCount}`,
            ],
        };
    }
}

class TormentGame extends DragonBaneGame {
    constructor({ dragons = 8 } = {}) {
        super({ dragons: Math.max(1, Math.min(40, Number(dragons) || 8)), maxDragons: 40 });
        this.title = "Torment";
    }

    reset() {
        this.size = 30;
        this.dragonCount = Math.max(1, Math.min(40, Number(this.dragonCount) || 8));
        this.hasKey = false;
        this.hasSword = false;
        this.hero = { i: 1, j: 1 };
        this.generateReachableLabyrinth();
        this.status = makeStatus(
            "intro",
            "Ready",
            "Generated labyrinth ready. Start when you are ready to move."
        );
    }

    generateReachableLabyrinth() {
        const generated = boundedLoop(80, () => {
            const baseGrid = this.createRandomTormentGrid();
            const key = this.randomOpenCell(baseGrid, 5, this.size - 6);
            const sword = this.randomOpenCell(baseGrid, 5, this.size - 6, [key]);
            if (!key || !sword) return null;

            const dragons = this.placeTormentDragons(baseGrid, key, sword);
            if (dragons.length < this.dragonCount) return null;

            const exit = this.placeTormentExit(baseGrid, dragons, key);
            if (!exit) return null;

            if (!this.hasReachablePath(baseGrid, this.hero, key, exit)) return null;
            if (!this.hasReachablePath(baseGrid, this.hero, sword, exit)) return null;
            if (!this.hasReachablePath(baseGrid, this.hero, exit, exit)) return null;

            return { baseGrid, key, sword, dragons, exit };
        }) || this.createFallbackTormentState();

        this.baseGrid = generated.baseGrid;
        this.key = generated.key;
        this.sword = generated.sword;
        this.dragons = generated.dragons;
        this.exit = generated.exit;
    }

    createRandomTormentGrid() {
        const grid = Array.from({ length: this.size }, (_, i) => (
            Array.from({ length: this.size }, (_, j) => (
                i === 0 || j === 0 || i === this.size - 1 || j === this.size - 1 ? "X" : " "
            ))
        ));

        const maxWalls = Math.floor((this.size - 1) * (this.size - 1) * 0.5);
        let placed = 0;
        let attempts = 0;

        while (placed < maxWalls && attempts < maxWalls * 8) {
            attempts += 1;
            const wall = { i: randomInt(1, this.size - 2), j: randomInt(1, this.size - 2) };
            if (samePos(wall, this.hero)) continue;
            if (grid[wall.i][wall.j] === "X") continue;
            if (this.elementsAround(grid, wall)) continue;
            grid[wall.i][wall.j] = "X";
            placed += 1;
        }

        return grid;
    }

    elementsAround(grid, element) {
        let count = 0;
        for (let di = -1; di <= 1; di += 1) {
            for (let dj = -1; dj <= 1; dj += 1) {
                if (di === 0 && dj === 0) continue;
                if (Math.abs(di) !== Math.abs(dj)) continue;
                const cell = grid[element.i + di]?.[element.j + dj];
                if (cell && cell !== " ") count += 1;
            }
        }

        return count > 1;
    }

    randomOpenCell(grid, min, max, blocked = []) {
        return boundedLoop(2000, () => {
            const candidate = { i: randomInt(min, max), j: randomInt(min, max) };
            if (grid[candidate.i][candidate.j] !== " ") return null;
            if (blocked.some((item) => item && samePos(item, candidate))) return null;
            if (samePos(candidate, this.hero)) return null;
            return candidate;
        });
    }

    placeTormentDragons(grid, key, sword) {
        const dragons = [];

        for (let index = 0; index < this.dragonCount; index += 1) {
            const dragon = boundedLoop(4000, () => {
                const candidate = { i: randomInt(1, this.size - 2), j: randomInt(1, this.size - 2) };
                if (grid[candidate.i][candidate.j] !== " ") return null;
                if (samePos(candidate, key) || samePos(candidate, sword)) return null;
                if (isClose(candidate, key) || isClose(candidate, sword)) return null;
                if (manhattan(candidate, this.hero) <= 4) return null;
                if (dragons.some((existing) => samePos(existing.pos, candidate))) return null;
                return { pos: candidate, alive: true, symbol: "D" };
            });

            if (dragon) dragons.push(dragon);
        }

        return dragons;
    }

    placeTormentExit(grid, dragons, key) {
        return boundedLoop(1000, () => {
            const candidate = {
                i: randomInt(1, this.size - 2),
                j: Math.random() < 0.5 ? 0 : this.size - 1,
            };
            if (isClose(candidate, this.hero)) return null;
            if (isClose(candidate, key)) return null;
            if (dragons.some((dragon) => isClose(candidate, dragon.pos))) return null;
            const adjacent = { i: candidate.i, j: candidate.j === 0 ? 1 : this.size - 2 };
            if (grid[adjacent.i][adjacent.j] === "X") return null;
            return candidate;
        });
    }

    hasReachablePath(grid, start, target, exit) {
        const queue = [start];
        const seen = new Set([posKey(start)]);

        while (queue.length) {
            const current = queue.shift();
            if (samePos(current, target)) return true;

            [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([di, dj]) => {
                const next = { i: current.i + di, j: current.j + dj };
                if (!isInside(grid, next)) return;
                if (!samePos(next, exit) && grid[next.i][next.j] === "X") return;
                const key = posKey(next);
                if (seen.has(key)) return;
                seen.add(key);
                queue.push(next);
            });
        }

        return false;
    }

    createFallbackTormentState() {
        const grid = Array.from({ length: this.size }, (_, i) => (
            Array.from({ length: this.size }, (_, j) => (
                i === 0 || j === 0 || i === this.size - 1 || j === this.size - 1 ? "X" : " "
            ))
        ));

        for (let row = 4; row < this.size - 4; row += 4) {
            for (let col = 2; col < this.size - 2; col += 1) {
                if (col % 7 !== 0) grid[row][col] = "X";
            }
        }

        const key = { i: 5, j: 5 };
        const sword = { i: this.size - 6, j: this.size - 6 };
        const exit = { i: this.size - 3, j: this.size - 1 };
        const dragons = [];

        for (let row = 3; row < this.size - 3 && dragons.length < this.dragonCount; row += 3) {
            for (let col = 4; col < this.size - 4 && dragons.length < this.dragonCount; col += 5) {
                const candidate = { i: row, j: col };
                if (grid[row][col] === " " && manhattan(candidate, this.hero) > 4) {
                    dragons.push({ pos: candidate, alive: true, symbol: "D" });
                }
            }
        }

        return { baseGrid: grid, key, sword, dragons, exit };
    }

    snapshot() {
        const snapshot = super.snapshot();
        snapshot.title = this.title;
        snapshot.autoFollow = true;
        snapshot.details = [
            `Inventory: ${this.hasKey ? "Master Key" : "-"} ${this.hasSword ? "DragonKiller" : "-"}`,
            `Dragons alive: ${this.livingDragons().length}/${this.dragonCount}`,
            "Map: generated 30 x 30 labyrinth",
        ];
        return snapshot;
    }
}

const GAME_REGISTRY = [
    {
        id: "here-be-dragons",
        title: "Here Be Dragons",
        badge: "Current example",
        status: "Playable",
        language: "C++",
        difficulty: "Intro maze",
        description: "A compact maze with one stationary dragon, a key, and a locked side exit.",
        implementation: "Uses a coordinate struct, helper functions, a fixed 10 x 10 maze, non-blocking input, and screen clearing between turns.",
        setup: null,
        create: () => new HereBeDragonsGame(),
    },
    {
        id: "dragons-bane",
        title: "Dragon's Bane",
        badge: "Class-based version",
        status: "Playable",
        language: "C++",
        difficulty: "1-5 dragons",
        description: "Adds classes for game state and entities, moving dragons, a sword, a key, and a locked exit.",
        implementation: "Splits terminal flow from logic classes, tracks inventory, updates the map every turn, and moves enemies after player input.",
        setup: {
            key: "dragons",
            label: "Number of dragons",
            min: 1,
            max: 5,
            value: 3,
        },
        create: (settings) => new DragonBaneGame(settings),
    },
    {
        id: "torment",
        title: "Torment",
        badge: "Expanded labyrinth",
        status: "Playable",
        language: "C++",
        difficulty: "1-40 dragons",
        description: "Expands the dungeon to a generated 30 x 30 labyrinth with inventory display and many moving dragons.",
        implementation: "Builds a larger generated map, places entities with constraints, renders colored symbols, and keeps the terminal loop moving turn by turn.",
        setup: {
            key: "dragons",
            label: "Number of dragons",
            min: 1,
            max: 40,
            value: 8,
        },
        create: (settings) => new TormentGame(settings),
    },
    {
        id: "worlds-colide",
        title: "Worlds Colide",
        badge: "Work in progress",
        status: "Prototype",
        language: "C++",
        difficulty: "Prototype shell",
        description: "A start/end-screen prototype kept as an archive entry until it contains playable game logic.",
        implementation: "Currently demonstrates the terminal screen structure and clear-screen flow, but not a full game loop yet.",
        setup: null,
        create: null,
    },
];

function symbolClass(symbol) {
    switch (symbol) {
    case "X": return "terminalGameWall";
    case "H": return "terminalGameHero";
    case "A": return "terminalGameHeroArmed";
    case "D":
    case "F": return "terminalGameDragon";
    case "K": return "terminalGameKey";
    case "S": return "terminalGameSword";
    case "E": return "terminalGameExit";
    default: return "terminalGameFloor";
    }
}

function displaySymbol(symbol) {
    if (symbol === " ") return "::";
    if (symbol === "X") return "##";
    return symbol;
}

function renderGrid(grid, hero) {
    const lines = grid.map((row, i) => {
        const cells = row.map((symbol, j) => {
            const classes = ["terminalGameCell", symbolClass(symbol)];
            if (hero && hero.i === i && hero.j === j) classes.push("terminalGameHeroCell");
            return `<span class="${classes.join(" ")}">${escapeHtml(displaySymbol(symbol))}</span>`;
        }).join("");

        return `<span class="terminalGameLine">${cells}</span>`;
    }).join("\n");

    return `<div class="terminalGameAscii" style="--terminal-game-cols: ${grid[0].length};">${lines}</div>`;
}

function renderIntro(entry) {
    return `
<div class="terminalGameIntroScreen">
<span class="terminalGameGreen">========================================</span>
<span class="terminalGameGreen">${escapeHtml(entry.title.toUpperCase())}</span>
<span class="terminalGameGreen">========================================</span>

${escapeHtml(entry.description)}

Symbols:
  H = Hero    A = Armed hero    D = Dragon
  K = Key     S = Sword         E = Exit     X = Wall

Controls:
  Move with WASD, arrow keys, or the directional buttons.
  Press Enter or F while the terminal is focused to start.
</div>`;
}

function renderWip(entry) {
    return `
<div class="terminalGameIntroScreen">
<span class="terminalGameAmber">========================================</span>
<span class="terminalGameAmber">${escapeHtml(entry.title.toUpperCase())}</span>
<span class="terminalGameAmber">========================================</span>

${escapeHtml(entry.description)}

This entry is intentionally shown as prototype-only.
It will become playable when the original project contains game logic beyond
the start and end terminal screens.
</div>`;
}

function renderSnapshot(snapshot, entry) {
    if (snapshot.status.status === "intro") {
        return renderIntro(entry);
    }

    return `
<div class="terminalGameRuntimeHeader">
<span class="terminalGameCyan">terminal / ${escapeHtml(entry.id)}</span>
<span class="terminalGameMuted">${escapeHtml(snapshot.status.label)}</span>
</div>
${renderGrid(snapshot.grid, snapshot.hero)}
<div class="terminalGameRuntimeFooter">
${snapshot.details.map((item) => `<span>${escapeHtml(item)}</span>`).join("\n")}
<span class="terminalGameMessage">${escapeHtml(snapshot.status.message)}</span>
</div>`;
}

class TerminalGameShowcase {
    constructor(root) {
        this.root = root;
        this.list = root.querySelector("[data-terminal-game-list]");
        this.screen = root.querySelector("[data-terminal-game-screen]");
        this.title = root.querySelector("[data-terminal-game-title]");
        this.badge = root.querySelector("[data-terminal-game-badge]");
        this.status = root.querySelector("[data-terminal-game-status]");
        this.description = root.querySelector("[data-terminal-game-description]");
        this.implementation = root.querySelector("[data-terminal-game-implementation]");
        this.setup = root.querySelector("[data-terminal-game-setup]");
        this.startButton = root.querySelector("[data-terminal-game-start]");
        this.restartButton = root.querySelector("[data-terminal-game-restart]");
        this.focusButton = root.querySelector("[data-terminal-game-focus]");
        this.directionButtons = [...root.querySelectorAll("[data-terminal-game-move]")];
        this.currentEntry = null;
        this.currentGame = null;

        this.renderList();
        this.bindEvents();
        this.selectGame(GAME_REGISTRY[0].id);
    }

    bindEvents() {
        this.startButton?.addEventListener("click", () => this.startGame());
        this.restartButton?.addEventListener("click", () => this.restartGame());
        this.focusButton?.addEventListener("click", () => this.screen?.focus());

        this.directionButtons.forEach((button) => {
            button.addEventListener("click", () => {
                const direction = button.dataset.terminalGameMove.split(",").map(Number);
                this.move(direction[0], direction[1]);
                this.screen?.focus();
            });
        });

        this.root.addEventListener("keydown", (event) => {
            if (event.target.matches("input, select, textarea")) return;

            if (event.key === "Enter" || event.key === "f" || event.key === "F") {
                event.preventDefault();
                this.startGame();
                return;
            }

            const direction = getDirectionFromEvent(event);
            if (!direction) return;

            event.preventDefault();
            this.move(direction[0], direction[1]);
        });
    }

    renderList() {
        if (!this.list) return;

        this.list.innerHTML = GAME_REGISTRY.map((entry) => `
<button type="button" class="terminalGameSelectBtn" data-terminal-game-id="${escapeHtml(entry.id)}">
    <span>${escapeHtml(entry.title)}</span>
    <small>${escapeHtml(entry.badge)}</small>
</button>`).join("");

        this.list.querySelectorAll("[data-terminal-game-id]").forEach((button) => {
            button.addEventListener("click", () => this.selectGame(button.dataset.terminalGameId));
        });
    }

    selectGame(id) {
        const entry = GAME_REGISTRY.find((item) => item.id === id) || GAME_REGISTRY[0];
        this.currentEntry = entry;
        this.currentGame = entry.create ? entry.create(this.defaultSettings(entry)) : null;

        this.list?.querySelectorAll("[data-terminal-game-id]").forEach((button) => {
            button.classList.toggle("active", button.dataset.terminalGameId === entry.id);
        });

        this.renderEntry();
    }

    defaultSettings(entry) {
        if (!entry.setup) return {};
        return { [entry.setup.key]: entry.setup.value };
    }

    readSettings(entry) {
        if (!entry.setup) return {};

        const field = this.setup?.querySelector(`[name="${entry.setup.key}"]`);
        const rawValue = Number(field?.value || entry.setup.value);
        const value = Math.max(entry.setup.min, Math.min(entry.setup.max, rawValue || entry.setup.value));
        return { [entry.setup.key]: value };
    }

    renderEntry() {
        const entry = this.currentEntry;
        if (!entry) return;

        if (this.title) this.title.textContent = entry.title;
        if (this.badge) this.badge.textContent = entry.badge;
        if (this.status) this.status.textContent = entry.status;
        if (this.description) this.description.textContent = entry.description;
        if (this.implementation) this.implementation.textContent = entry.implementation;

        this.renderSetup(entry);
        this.renderScreen();
        this.updateButtons();
    }

    renderSetup(entry) {
        if (!this.setup) return;

        if (!entry.setup) {
            this.setup.innerHTML = '<p class="muted smallText">No setup options for this game.</p>';
            return;
        }

        this.setup.innerHTML = `
<label class="terminalGameField">
    <span>${escapeHtml(entry.setup.label)}</span>
    <input
        type="number"
        name="${escapeHtml(entry.setup.key)}"
        min="${entry.setup.min}"
        max="${entry.setup.max}"
        value="${entry.setup.value}"
        inputmode="numeric"
    >
</label>`;

        this.setup.querySelector("input")?.addEventListener("change", () => {
            this.currentGame = entry.create(this.readSettings(entry));
            this.renderScreen();
        });
    }

    startGame() {
        if (!this.currentEntry?.create) return;
        if (!this.currentGame) {
            this.currentGame = this.currentEntry.create(this.readSettings(this.currentEntry));
        }

        this.currentGame.start();
        this.renderScreen();
        this.updateButtons();
        this.screen?.focus();
    }

    restartGame() {
        if (!this.currentEntry?.create) return;
        this.currentGame = this.currentEntry.create(this.readSettings(this.currentEntry));
        this.currentGame.start();
        this.renderScreen();
        this.updateButtons();
        this.screen?.focus();
    }

    move(di, dj) {
        if (!this.currentGame || this.currentGame.status.status !== "playing") return;
        this.currentGame.move(di, dj);
        this.renderScreen();
        this.updateButtons();
    }

    renderScreen() {
        if (!this.screen || !this.currentEntry) return;

        if (!this.currentEntry.create) {
            this.screen.innerHTML = renderWip(this.currentEntry);
            return;
        }

        const snapshot = this.currentGame.snapshot();
        this.screen.innerHTML = renderSnapshot(snapshot, this.currentEntry);

        if (snapshot.autoFollow) {
            requestAnimationFrame(() => {
                const hero = this.screen.querySelector(".terminalGameHeroCell");
                hero?.scrollIntoView({ block: "center", inline: "center" });
            });
        }
    }

    updateButtons() {
        const playable = Boolean(this.currentEntry?.create);
        const status = this.currentGame?.status.status || "wip";

        if (this.startButton) {
            this.startButton.disabled = !playable || status === "playing";
            this.startButton.textContent = status === "won" || status === "lost" ? "Play Again" : "Start Game";
        }

        if (this.restartButton) {
            this.restartButton.disabled = !playable;
        }

        this.directionButtons.forEach((button) => {
            button.disabled = !playable || status !== "playing";
        });
    }
}

export function createTerminalGameForTest(id, settings = {}) {
    const entry = GAME_REGISTRY.find((item) => item.id === id);
    if (!entry?.create) return null;
    return entry.create(settings);
}

export function initTerminalGameShowcases() {
    document.querySelectorAll("[data-terminal-games]").forEach((element) => {
        if (element.dataset.terminalGamesBound === "true") return;
        element.dataset.terminalGamesBound = "true";
        new TerminalGameShowcase(element);
    });
}
