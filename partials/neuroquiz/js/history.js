/* Gestão do histórico com localStorage. */
(function () {
  const KEY = 'marPerguntasHistorico.v1';

  function safeParse(value, fallback) {
    try {
      return JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }

  function normaliseHistory(raw) {
    if (Array.isArray(raw)) return raw;
    if (raw && Array.isArray(raw.games)) return raw.games;
    return [];
  }

  const HistoryStore = {
    load() {
      const saved = localStorage.getItem(KEY);
      return normaliseHistory(safeParse(saved, []));
    },

    save(games) {
      localStorage.setItem(KEY, JSON.stringify(normaliseHistory(games)));
    },

    add(game) {
      const games = this.load();
      games.unshift(game);
      this.save(games);
      return games;
    },

    clear() {
      localStorage.removeItem(KEY);
    },

    exportJSON() {
      return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), games: this.load() }, null, 2);
    },

    importJSON(text) {
      const parsed = safeParse(text, null);
      const validShape = Array.isArray(parsed) || (parsed && Array.isArray(parsed.games));
      if (!validShape) {
        throw new Error('O ficheiro não contém um histórico válido.');
      }
      const games = normaliseHistory(parsed).filter(Boolean);
      this.save(games);
      return games;
    }
  };

  window.HistoryStore = HistoryStore;
})();
