class SopaCliWidget {
    constructor(root) {
        this.root = root;
        this.output = root.querySelector("[data-sopa-cli-output]");
        this.buttons = [...root.querySelectorAll("[data-sopa-cli-screen]")];
        this.width = 66;
        this.divider = "=".repeat(this.width);
        this.hr = "-".repeat(this.width);
        this.screens = this.buildScreens();

        this.bindEvents();
        this.render("source");
    }

    bindEvents() {
        this.buttons.forEach((button) => {
            button.addEventListener("click", () => {
                this.render(button.dataset.sopaCliScreen);
            });
        });
    }

    centerText(text, totalWidth) {
        const normalized = String(text || "");
        if (normalized.length >= totalWidth) return normalized;

        const left = Math.floor((totalWidth - normalized.length) / 2);
        const right = totalWidth - normalized.length - left;
        return `${" ".repeat(left)}${normalized}${" ".repeat(right)}`;
    }

    box(lines) {
        const safeLines = (Array.isArray(lines) ? lines : []).map((line) => String(line || ""));
        const maxLength = safeLines.reduce((longest, line) => Math.max(longest, line.length), 0);
        const top = `+${"-".repeat(maxLength + 2)}+`;
        const body = safeLines
            .map((line) => `| ${line}${" ".repeat(maxLength - line.length)} |`)
            .join("\n");
        const bottom = `+${"-".repeat(maxLength + 2)}+`;
        return `${top}\n${body}\n${bottom}`;
    }

    header() {
        return `<span class="sopaCliCyan">${this.divider}</span>
<span class="sopaCliCyan">${this.centerText("Gerador de Livros de Sopa de Letras", this.width)}</span>
<span class="sopaCliCyan">${this.divider}</span>`;
    }

    info(text) {
        return `<span class="sopaCliCyan">[i] ${text}</span>`;
    }

    success(text) {
        return `<span class="sopaCliGreen">[ok] ${text}</span>`;
    }

    error(text) {
        return `<span class="sopaCliRed">[x] ${text}</span>`;
    }

    section(text) {
        return `<span class="sopaCliYellow">> ${text}</span>\n<span class="sopaCliYellow">${this.hr}</span>`;
    }

    buildScreens() {
        return {
            source: `${this.header()}

${this.info("Type 'Q' or 'SAIR' at any point to exit")}

${this.section("Word source:")}
1. JSON files (palavras/4..8.json)
2. AI generated words

<span class="sopaCliCyan">> Choose:</span> 1`,

            folder: `${this.header()}

${this.section("Destination folder:")}
<span class="sopaCliCyan">> Folder:</span> projeto_sopas

${this.success("Destination folder set: /Users/demo/projeto_sopas")}`,

            menu: `${this.header()}

<span class="sopaCliCyan">${this.box([
    "Folder:       /Users/demo/projeto_sopas",
    "Source:       JSON files",
    "Total pages:  12",
])}</span>

${this.section("Main menu")}
1. Generate pages
2. Change word source
3. Exit

<span class="sopaCliCyan">> Choose:</span> 1`,

            "page-type": `${this.header()}

<span class="sopaCliCyan">${this.box([
    "Folder:       /Users/demo/projeto_sopas",
    "Source:       JSON files",
    "Total pages:  12",
])}</span>

${this.section("Page type:")}
A. Battle 2x puzzles 14x11 + date/winner/time (14 words each)
B. Battle 2x puzzles 14x11 without details   (14 words each)
C. Single puzzle 28x17 with side list        (20 words)
D. Single puzzle 21x20 with top list         (30 words)
E. Battle 2x puzzles 14x14 without details   (16 words each)
F. Single puzzle 30x12 with side list        (22 words)

<span class="sopaCliCyan">> Choose:</span> C
<span class="sopaCliMuted">&lt; Back to return</span>`,

            pages: `${this.header()}

${this.section("How many pages should be generated?")}
<span class="sopaCliCyan">> Amount:</span> 8

${this.info("Accepted value: 8 page(s)")}`,

            difficulty: `${this.header()}

${this.section("Difficulty:")}
1. Easy
2. Medium
3. Hard
4. Impossible

<span class="sopaCliCyan">> Choose:</span> 2

${this.success("Difficulty selected: Medium")}`,

            generation: `${this.header()}

<span class="sopaCliCyan">${this.box([
    "Folder:       /Users/demo/projeto_sopas",
    "Source:       JSON files",
    "Total pages:  12",
])}</span>

${this.info("Generating 8 page(s) starting at page 13...")}

<span class="sopaCliCyan">[1/8]</span> Generating page 13... <span class="sopaCliGreen">[ok]</span>
<span class="sopaCliCyan">[2/8]</span> Generating page 14... <span class="sopaCliGreen">[ok]</span>
<span class="sopaCliCyan">[3/8]</span> Generating page 15... <span class="sopaCliGreen">[ok]</span>
<span class="sopaCliCyan">[4/8]</span> Generating page 16... <span class="sopaCliGreen">[ok]</span>
<span class="sopaCliCyan">[5/8]</span> Generating page 17... <span class="sopaCliGreen">[ok]</span>
<span class="sopaCliCyan">[6/8]</span> Generating page 18... <span class="sopaCliGreen">[ok]</span>
<span class="sopaCliCyan">[7/8]</span> Generating page 19... <span class="sopaCliGreen">[ok]</span>
<span class="sopaCliCyan">[8/8]</span> Generating page 20... <span class="sopaCliGreen">[ok]</span>

${this.success("Pages generated successfully")}
${this.info("Created range: 13 to 20")}
${this.info("main.tex updated")}
${this.error("Visual example only. No real generation here")}

${this.section("Main menu")}
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

export function initSopaCliWidgets() {
    document.querySelectorAll("[data-sopa-cli]").forEach((element) => {
        if (element.dataset.sopaCliBound === "true") return;

        element.dataset.sopaCliBound = "true";
        new SopaCliWidget(element);
    });
}
