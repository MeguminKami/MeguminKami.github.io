import { DEFAULT_EMOJIS, EMOJI_CATALOG, findShortcodeContext, replaceShortcode, searchEmoji } from "../core/emoji-shortcodes.js";

const DATABASE_URL = "https://cdn.jsdelivr.net/npm/emoji-picker-element@1.29.1/database.js";
const PT_DATA = "https://cdn.jsdelivr.net/npm/emoji-picker-element-data@1.8.0/pt/emojibase/data.json";
const EN_DATA = "https://cdn.jsdelivr.net/npm/emoji-picker-element-data@1.8.0/en/emojibase/data.json";

function popoverOpen(element) {
  return element.hasAttribute("popover") && typeof element.showPopover === "function" && element.matches(":popover-open");
}

function showFloating(element) {
  element.hidden = false;
  if (element.hasAttribute("popover") && typeof element.showPopover === "function" && !popoverOpen(element)) element.showPopover();
}

function hideFloating(element) {
  if (popoverOpen(element)) element.hidePopover();
  element.hidden = true;
}

export class EmojiController {
  constructor() {
    this.box = document.querySelector("#emoji-suggestions");
    this.pickerBox = document.querySelector("#emoji-picker-popover");
    this.activeInput = null;
    this.context = null;
    this.suggestions = [];
    this.selected = 0;
    this.databasesPromise = null;
    [document.querySelector("#activity-title"), document.querySelector("#activity-description")].forEach((input) => this.attach(input));
    document.querySelectorAll(".emoji-open").forEach((button) => {
      button.setAttribute("aria-haspopup", "dialog");
      button.setAttribute("aria-controls", "emoji-picker-popover");
      button.setAttribute("aria-expanded", "false");
      button.addEventListener("click", () => this.openPicker(document.getElementById(button.dataset.emojiTarget), button));
    });
    document.addEventListener("pointerdown", (event) => {
      if (!event.target.closest("#emoji-suggestions") && event.target !== this.activeInput) this.hideSuggestions();
      if (!event.target.closest("#emoji-picker-popover") && !event.target.closest(".emoji-open")) this.closePicker();
    });
    this.pickerBox.addEventListener("toggle", (event) => {
      if (event.newState === "closed") {
        this.pickerAnchor?.setAttribute("aria-expanded", "false");
        this.pickerAnchor = null;
        this.pickerBox.hidden = true;
      }
    });
    document.querySelector("#activity-dialog").addEventListener("close", () => { this.hideSuggestions(); this.closePicker(); });
  }

  attach(input) {
    input.addEventListener("input", () => this.update(input));
    input.addEventListener("click", () => this.update(input));
    input.addEventListener("keydown", (event) => this.onKeydown(event, input));
  }

  async databases() {
    this.databasesPromise ||= import(DATABASE_URL).then(({ Database }) => [new Database({ locale: "pt", dataSource: PT_DATA }), new Database({ locale: "en", dataSource: EN_DATA })]);
    return this.databasesPromise;
  }

  async lookup(query) {
    if (!query) return DEFAULT_EMOJIS;
    const local = searchEmoji(EMOJI_CATALOG, query, 7);
    if (local.length) return local;
    try {
      const databases = await this.databases();
      const lists = await Promise.all(databases.map((database) => database.getEmojiBySearchPrefix(query)));
      return lists.flat().map((entry) => ({ ...entry, emoji: entry.unicode })).filter((entry) => entry.emoji).slice(0, 7);
    } catch { return []; }
  }

  async exact(query) {
    const local = EMOJI_CATALOG.find((entry) => [entry.name, ...(entry.aliases || [])].some((name) => name.toLocaleLowerCase("pt-PT") === query));
    if (local) return local.emoji;
    try {
      const databases = await this.databases();
      for (const database of databases) {
        const found = await database.getEmojiByShortcode(query);
        if (found?.unicode) return found.unicode;
      }
    } catch { /* Sem rede, as sugestões locais continuam disponíveis. */ }
    return "";
  }

  async update(input) {
    const token = findShortcodeContext(input.value, input.selectionStart);
    if (!token) { this.hideSuggestions(); return; }
    this.activeInput = input;
    this.context = token;
    if (token.complete && token.query) {
      const emoji = await this.exact(token.query);
      if (emoji && this.context === token) this.insert(emoji);
      else this.hideSuggestions();
      return;
    }
    const suggestions = await this.lookup(token.query);
    if (this.context !== token || this.activeInput !== input) return;
    this.suggestions = suggestions;
    this.selected = 0;
    this.renderSuggestions(input);
  }

  renderSuggestions(input) {
    this.box.replaceChildren();
    if (!this.suggestions.length) { hideFloating(this.box); return; }
    this.suggestions.forEach((entry, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "emoji-option";
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", index === this.selected ? "true" : "false");
      const emoji = document.createElement("span"); emoji.className = "emoji-char"; emoji.textContent = entry.emoji || entry.unicode;
      const name = document.createElement("span"); name.className = "emoji-name"; name.textContent = entry.name || entry.annotation || entry.shortcodes?.[0] || "Emoji";
      button.append(emoji, name);
      button.addEventListener("pointerdown", (event) => event.preventDefault());
      button.addEventListener("click", () => this.insert(entry.emoji || entry.unicode));
      this.box.append(button);
    });
    const rect = input.getBoundingClientRect();
    this.box.style.left = `${Math.min(rect.left, innerWidth - Math.min(330, innerWidth - 20) - 10)}px`;
    showFloating(this.box);
    this.box.style.top = `${Math.max(10, Math.min(rect.bottom + 5, innerHeight - this.box.offsetHeight - 10))}px`;
  }

  onKeydown(event, input) {
    if (this.box.hidden || input !== this.activeInput) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      this.selected = (this.selected + direction + this.suggestions.length) % this.suggestions.length;
      [...this.box.children].forEach((child, index) => child.setAttribute("aria-selected", index === this.selected ? "true" : "false"));
    } else if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      const entry = this.suggestions[this.selected || 0];
      if (entry) this.insert(entry.emoji || entry.unicode);
    } else if (event.key === "Escape") { event.preventDefault(); this.hideSuggestions(); }
  }

  insert(emoji) {
    if (!this.activeInput || !this.context) return;
    const result = replaceShortcode(this.activeInput.value, this.context, emoji);
    this.activeInput.value = result.value;
    this.activeInput.setSelectionRange(result.cursor, result.cursor);
    this.activeInput.dispatchEvent(new Event("input", { bubbles: true }));
    this.hideSuggestions();
    this.activeInput.focus();
  }

  hideSuggestions() { hideFloating(this.box); this.context = null; }

  insertAtCursor(input, emoji) {
    if (!input || !emoji) return;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    input.value = input.value.slice(0, start) + emoji + input.value.slice(end);
    const cursor = start + emoji.length;
    input.setSelectionRange(cursor, cursor);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus();
  }

  renderPicker() {
    const wrapper = document.createElement("div");
    wrapper.className = "emoji-fallback";
    const header = document.createElement("div");
    header.className = "emoji-picker-header";
    const label = document.createElement("strong");
    label.textContent = "Escolher emoji";
    const close = document.createElement("button");
    close.type = "button";
    close.className = "emoji-picker-close";
    close.setAttribute("aria-label", "Fechar emojis");
    close.textContent = "×";
    close.addEventListener("click", () => { this.closePicker(); this.activeInput?.focus(); });
    header.append(label, close);
    const search = document.createElement("input");
    search.type = "search";
    search.className = "emoji-picker-search";
    search.placeholder = "Pesquisar: amor, pizza, viagem…";
    search.setAttribute("aria-label", "Pesquisar emojis");
    const grid = document.createElement("div");
    grid.className = "emoji-fallback-grid";
    grid.setAttribute("role", "listbox");
    grid.setAttribute("aria-label", "Resultados de emojis");
    const empty = document.createElement("p");
    empty.className = "emoji-picker-empty";
    empty.textContent = "Não encontrei esse emoji. Experimenta outra palavra.";
    empty.hidden = true;
    const status = document.createElement("small");
    status.className = "emoji-fallback-status";
    const render = () => {
      const query = search.value.trim();
      const entries = query ? searchEmoji(EMOJI_CATALOG, query, EMOJI_CATALOG.length) : EMOJI_CATALOG;
      grid.replaceChildren();
      entries.forEach((entry) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "emoji-fallback-button";
        button.textContent = entry.emoji;
        button.dataset.emoji = entry.emoji;
        button.setAttribute("role", "option");
        button.setAttribute("aria-label", `Inserir ${entry.name}`);
        button.title = entry.name;
        button.addEventListener("click", () => {
          this.insertAtCursor(this.activeInput, entry.emoji);
          this.closePicker();
        });
        grid.append(button);
      });
      empty.hidden = entries.length > 0;
      status.textContent = query ? `${entries.length} resultado${entries.length === 1 ? "" : "s"} para “${query}”` : `${entries.length} emojis disponíveis sem ligação à internet`;
    };
    search.addEventListener("input", render);
    search.addEventListener("keydown", (event) => {
      if (event.key === "Escape") { event.preventDefault(); this.closePicker(); this.activeInput?.focus(); }
      if (event.key === "ArrowDown") { event.preventDefault(); grid.querySelector("button")?.focus(); }
      if (event.key === "Enter") { event.preventDefault(); grid.querySelector("button")?.click(); }
    });
    grid.addEventListener("keydown", (event) => {
      const buttons = [...grid.querySelectorAll("button")];
      const current = buttons.indexOf(document.activeElement);
      const move = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 7, ArrowUp: -7 }[event.key];
      if (move && current >= 0) { event.preventDefault(); buttons[Math.max(0, Math.min(buttons.length - 1, current + move))]?.focus(); }
      if (event.key === "Escape") { event.preventDefault(); this.closePicker(); this.activeInput?.focus(); }
    });
    wrapper.append(header, search, grid, empty, status);
    this.pickerBox.replaceChildren(wrapper);
    render();
    return search;
  }

  openPicker(input, anchor) {
    const floating = this.pickerBox.hasAttribute("popover") && typeof this.pickerBox.showPopover === "function";
    const visible = popoverOpen(this.pickerBox) || (!floating && !this.pickerBox.hidden);
    if (visible && this.pickerAnchor === anchor) { this.closePicker(); return; }
    this.activeInput = input;
    this.pickerAnchor?.setAttribute("aria-expanded", "false");
    this.pickerAnchor = anchor;
    anchor.setAttribute("aria-expanded", "true");
    const search = this.renderPicker();
    showFloating(this.pickerBox);
    this.pickerBox.style.left = "";
    this.pickerBox.style.top = "";
    requestAnimationFrame(() => search.focus({ preventScroll: true }));
  }

  closePicker() {
    this.pickerAnchor?.setAttribute("aria-expanded", "false");
    this.pickerAnchor = null;
    hideFloating(this.pickerBox);
  }
}
