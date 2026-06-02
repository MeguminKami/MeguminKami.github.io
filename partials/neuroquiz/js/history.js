/* Gestao do historico multi-cadeira com localStorage e compatibilidade retroativa. */
(function () {
  const KEY = 'marPerguntasHistorico.v1';
  const DEFAULT_COURSE = 'LCNC';
  const COURSE_NAMES = {
    LCNC: 'Laborat\u00f3rio de Compet\u00eancias em Neuropsicologia Cl\u00ednica',
    MADN: 'M\u00e9todos de An\u00e1lise de Dados em Neuropsicologia Cl\u00ednica'
  };

  function safeParse(value, fallback) {
    try {
      return JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }

  function normaliseMode(mode) {
    return String(mode) === '4' ? '4' : '2';
  }

  function normaliseTimeLimit(value) {
    if (value === null) return null;
    const seconds = Number(value);
    return [15, 30, 60].includes(seconds) ? seconds : 30;
  }

  function normaliseCourseSigla(value) {
    return String(value || DEFAULT_COURSE).trim().toUpperCase() || DEFAULT_COURSE;
  }

  function normaliseCourseName(value, courseSigla) {
    return String(value || COURSE_NAMES[courseSigla] || courseSigla);
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

  function normaliseAnswer(raw, gameMode, gameTimeLimit, gameCourseSigla, gameCourseName) {
    const answer = raw && typeof raw === 'object' ? raw : {};
    const correctCard = String(answer.correctCard ?? '');
    const savedOptions = normaliseOptions(answer.optionsShown || answer.cardOrder, correctCard);
    const wrongCards = Array.isArray(answer.wrongCards)
      ? answer.wrongCards.map(String)
      : [answer.wrongCard].filter(Boolean).map(String);
    const courseSigla = normaliseCourseSigla(answer.courseSigla || answer.course || gameCourseSigla);
    const courseName = normaliseCourseName(answer.courseName || gameCourseName, courseSigla);

    if (!wrongCards.length) {
      savedOptions.filter((option) => !option.isCorrect).forEach((option) => wrongCards.push(option.text));
    }

    const optionsShown = savedOptions.length
      ? savedOptions
      : normaliseOptions([correctCard, ...wrongCards], correctCard);
    const legacySelectedAnswer = String(answer.selectedAnswer ?? answer.selectedCard ?? '');
    const timedOut = Boolean(answer.timedOut || legacySelectedAnswer.startsWith('Sem resposta'));
    const selectedAnswer = timedOut ? '' : legacySelectedAnswer;
    const isCorrect = typeof answer.isCorrect === 'boolean'
      ? answer.isCorrect
      : Boolean(selectedAnswer && selectedAnswer === correctCard);
    const timeLimitSeconds = Object.prototype.hasOwnProperty.call(answer, 'timeLimitSeconds')
      ? normaliseTimeLimit(answer.timeLimitSeconds)
      : gameTimeLimit;

    return {
      questionId: answer.questionId ?? answer.id ?? null,
      question: String(answer.question ?? ''),
      correctCard,
      wrongCards,
      optionsShown,
      selectedAnswer,
      isCorrect,
      explanation: String(answer.explanation ?? ''),
      source: String(answer.source ?? ''),
      category: String(answer.category ?? ''),
      difficulty: String(answer.difficulty ?? ''),
      timeUsed: answer.timeUsed ?? answer.timeUsedSeconds ?? null,
      timeLimitSeconds,
      mode: normaliseMode(answer.mode ?? gameMode),
      timedOut,
      courseSigla,
      courseName
    };
  }

  function normaliseGame(raw) {
    const game = raw && typeof raw === 'object' ? raw : {};
    const mode = normaliseMode(game.mode);
    const timeLimitSeconds = normaliseTimeLimit(game.timeLimitSeconds);
    const courseSigla = normaliseCourseSigla(game.courseSigla || game.course);
    const courseName = normaliseCourseName(game.courseName, courseSigla);
    const answers = Array.isArray(game.answers)
      ? game.answers.map((answer) => normaliseAnswer(answer, mode, timeLimitSeconds, courseSigla, courseName))
      : [];
    const totalQuestions = Number(game.totalQuestions ?? game.total ?? answers.length);
    const score = Number(game.score ?? game.correct ?? answers.filter((answer) => answer.isCorrect).length);

    return {
      gameId: String(game.gameId ?? `jogo-${Date.now()}`),
      date: String(game.date ?? game.dateISO ?? ''),
      courseSigla,
      courseName,
      totalQuestions: Number.isFinite(totalQuestions) ? totalQuestions : answers.length,
      score: Number.isFinite(score) ? score : answers.filter((answer) => answer.isCorrect).length,
      mode,
      timeLimitSeconds,
      answers
    };
  }

  function normaliseHistory(raw) {
    const games = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.games) ? raw.games : []);
    return games.filter((game) => game && typeof game === 'object').map(normaliseGame);
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
      games.unshift(normaliseGame(game));
      this.save(games);
      return games;
    },

    clearCourse(courseSigla) {
      const selectedCourse = normaliseCourseSigla(courseSigla);
      this.save(this.load().filter((game) => game.courseSigla !== selectedCourse));
    },

    clear() {
      localStorage.removeItem(KEY);
    },

    exportJSON() {
      return JSON.stringify({ version: 4, exportedAt: new Date().toISOString(), games: this.load() }, null, 2);
    },

    importJSON(text) {
      const parsed = safeParse(text, null);
      const validShape = Array.isArray(parsed) || (parsed && Array.isArray(parsed.games));
      if (!validShape) {
        throw new Error('O ficheiro n\u00e3o cont\u00e9m um hist\u00f3rico v\u00e1lido.');
      }
      const games = normaliseHistory(parsed);
      this.save(games);
      return games;
    },

    normaliseGame
  };

  window.HistoryStore = HistoryStore;
})();
