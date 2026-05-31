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
    const games = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.games) ? raw.games : []);
    return games.filter(Boolean).map(normaliseGame);
  }

  function normaliseMode(mode) {
    return String(mode) === '4' ? '4' : '2';
  }

  function normaliseOptions(rawOptions, correctCard) {
    if (!Array.isArray(rawOptions)) return [];
    return rawOptions.map((option) => {
      const text = typeof option === 'object' && option !== null ? option.text : option;
      const hasCorrectFlag = typeof option === 'object' && option !== null && typeof option.isCorrect === 'boolean';
      return {
        text: String(text ?? ''),
        isCorrect: hasCorrectFlag ? option.isCorrect : String(text ?? '') === correctCard
      };
    }).filter((option) => option.text);
  }

  function normaliseAnswer(raw, gameMode) {
    const answer = raw || {};
    const correctCard = String(answer.correctCard ?? '');
    const savedOptions = normaliseOptions(answer.optionsShown || answer.cardOrder, correctCard);
    const wrongCards = Array.isArray(answer.wrongCards)
      ? answer.wrongCards.map(String)
      : [answer.wrongCard].filter(Boolean).map(String);
    if (!wrongCards.length) {
      savedOptions.filter((option) => !option.isCorrect).forEach((option) => wrongCards.push(option.text));
    }
    const optionsShown = savedOptions.length
      ? savedOptions
      : normaliseOptions([correctCard, ...wrongCards], correctCard);
    const legacySelectedAnswer = String(answer.selectedAnswer ?? answer.selectedCard ?? '');
    const timedOut = Boolean(answer.timedOut || legacySelectedAnswer.startsWith('Sem resposta'));
    return {
      questionId: answer.questionId ?? answer.id ?? null,
      question: String(answer.question ?? ''),
      correctCard,
      wrongCards,
      optionsShown,
      selectedAnswer: timedOut ? '' : legacySelectedAnswer,
      isCorrect: Boolean(answer.isCorrect),
      explanation: String(answer.explanation ?? ''),
      source: String(answer.source ?? ''),
      category: String(answer.category ?? ''),
      difficulty: String(answer.difficulty ?? ''),
      timeUsed: answer.timeUsed ?? answer.timeUsedSeconds ?? null,
      mode: normaliseMode(answer.mode ?? gameMode),
      timedOut
    };
  }

  function normaliseGame(raw) {
    const game = raw || {};
    const mode = normaliseMode(game.mode);
    const answers = Array.isArray(game.answers)
      ? game.answers.map((answer) => normaliseAnswer(answer, mode))
      : [];
    const totalQuestions = Number(game.totalQuestions ?? game.total ?? answers.length);
    const score = Number(game.score ?? game.correct ?? answers.filter((answer) => answer.isCorrect).length);
    return {
      gameId: String(game.gameId ?? `jogo-${Date.now()}`),
      date: String(game.date ?? game.dateISO ?? ''),
      totalQuestions: Number.isFinite(totalQuestions) ? totalQuestions : answers.length,
      score: Number.isFinite(score) ? score : answers.filter((answer) => answer.isCorrect).length,
      mode,
      answers
    };
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
      return JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), games: this.load() }, null, 2);
    },

    importJSON(text) {
      const parsed = safeParse(text, null);
      const validShape = Array.isArray(parsed) || (parsed && Array.isArray(parsed.games));
      if (!validShape) {
        throw new Error('O ficheiro não contém um histórico válido.');
      }
      const games = normaliseHistory(parsed);
      this.save(games);
      return games;
    },

    normaliseGame
  };

  window.HistoryStore = HistoryStore;
})();
