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
        this.directory = String(root.dataset.bookletDir || "").trim();
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
        this.bindEvents();
        this.init();
    }

    async init() {
        try {
            this.books = await this.discoverBooks(this.directory);
            if (!this.books.length) {
                this.renderEmptyState("No booklet PDFs were found in this folder yet.");
                return;
            }

            this.renderOptions();
            this.render();
        } catch (error) {
            console.error("Could not load booklet previews:", error);
            this.renderEmptyState("The booklet preview could not load the available PDFs automatically.");
        }
    }

    async discoverBooks(directory) {
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

        doc.querySelectorAll("a[href]").forEach((linkElement) => {
            const href = String(linkElement.getAttribute("href") || "").trim();
            if (!href || !/\.pdf(?:$|[?#])/i.test(href)) return;

            const absoluteUrl = new URL(href, directoryUrl).href;
            const fileName = this.fileNameFromPath(absoluteUrl);
            if (!fileName) return;

            pdfLinks.set(fileName.toLowerCase(), absoluteUrl);
        });

        return [...pdfLinks.values()]
            .map((file, index) => this.buildBookFromFile(file, index))
            .sort((a, b) => {
                if (a.sortGroup !== b.sortGroup) return a.sortGroup - b.sortGroup;
                if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
                return a.title.localeCompare(b.title);
            });
    }

    renderOptions() {
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

    bindEvents() {
        this.select?.addEventListener("change", (event) => {
            const nextIndex = this.books.findIndex((book) => book.id === event.target.value);
            if (nextIndex >= 0) {
                this.index = nextIndex;
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

    buildFileHref(path) {
        return String(path || "").trim();
    }

    buildPreviewHref(path, pageNumber) {
        const href = this.buildFileHref(path);
        if (!href) return "";

        const safePage = Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : 1;
        return `${href}#page=${safePage}&toolbar=0&navpanes=0&scrollbar=0&zoom=page-fit`;
    }

    fileNameFromPath(path) {
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

    stripPdfExtensions(name) {
        return String(name || "").replace(/(?:\.pdf)+$/i, "");
    }

    toTitleCase(value) {
        return String(value || "")
            .split(/\s+/)
            .filter(Boolean)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join(" ");
    }

    ordinal(value) {
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

    buildBookFromFile(file, index) {
        const fileName = this.fileNameFromPath(file);
        const rawBaseName = this.stripPdfExtensions(fileName);
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
            "person",
            "pessoa",
            "sof",
            "sofs",
        ]);

        const personTokens = tokens.filter((token, tokenIndex) => {
            const lower = lowerTokens[tokenIndex];
            return !ignoredTokens.has(lower) && !/^\d+$/.test(lower);
        });

        const personName = personTokens.length ? this.toTitleCase(personTokens.join(" ")) : "";
        const editionLabel = hasSpecial
            ? "Special Edition"
            : (editionNumber ? `${this.ordinal(editionNumber)} Edition` : "Edition");

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

        const fallbackTitle = this.toTitleCase(rawBaseName.replace(/[_-]+/g, " "));
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

    renderEmptyState(message) {
        if (this.select) {
            this.select.innerHTML = "<option>No books available</option>";
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
        if (this.fileLabel) this.fileLabel.textContent = this.fileNameFromPath(book.file);
        if (this.badge) this.badge.textContent = book.badge;
        if (this.title) this.title.textContent = book.title;
        if (this.subtitle) this.subtitle.textContent = book.subtitle;
        if (this.summary) this.summary.textContent = book.summary;
        if (this.status) this.status.textContent = `${this.index + 1} of ${this.books.length}`;

        const canBrowse = this.books.length > 1;
        if (this.prevButton) this.prevButton.disabled = !canBrowse;
        if (this.nextButton) this.nextButton.disabled = !canBrowse;

        const previewHref = this.buildPreviewHref(book.file, 1);
        if (this.preview) {
            this.preview.src = previewHref;
            this.preview.title = `${book.title} preview`;
        }

        if (this.openLink) {
            this.openLink.href = this.buildFileHref(book.file);
            this.openLink.setAttribute("aria-disabled", "false");
        }
    }
}

export function initBookletWidgets() {
    document.querySelectorAll(".bookletWidget[data-booklet-dir]").forEach((element) => {
        if (element.dataset.bookletBound === "true") return;

        element.dataset.bookletBound = "true";
        new BookletLibrary(element);
    });
}
