/* Gestao do historico multi-cadeira com localStorage e compatibilidade retroativa. */
(function () {
  const KEY = 'marPerguntasHistorico.v1';
  const DEFAULT_COURSE = 'LCNC';
  const COURSE_NAMES = {
    LCNC: 'Laborat\u00f3rio de Compet\u00eancias em Neuropsicologia Cl\u00ednica',
    MADN: 'M\u00e9todos de An\u00e1lise de Dados em Neuropsicologia Cl\u00ednica'
  };
  const PLAY_MODE_LABELS = {
    normal: 'Jogo Normal',
    reinforcement: 'Treino de Refor\u00e7o'
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

  function normalisePlayMode(mode) {
    return String(mode) === 'reinforcement' ? 'reinforcement' : 'normal';
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

  function normaliseAnswer(raw, gameMode, gameTimeLimit, gameCourseSigla, gameCourseName, gamePlayMode) {
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
      playMode: normalisePlayMode(answer.playMode ?? gamePlayMode),
      timedOut,
      courseSigla,
      courseName
    };
  }

  function normaliseGame(raw) {
    const game = raw && typeof raw === 'object' ? raw : {};
    const mode = normaliseMode(game.mode);
    const playMode = normalisePlayMode(game.playMode);
    const timeLimitSeconds = normaliseTimeLimit(game.timeLimitSeconds);
    const courseSigla = normaliseCourseSigla(game.courseSigla || game.course);
    const courseName = normaliseCourseName(game.courseName, courseSigla);
    const answers = Array.isArray(game.answers)
      ? game.answers.map((answer) => normaliseAnswer(answer, mode, timeLimitSeconds, courseSigla, courseName, playMode))
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
      playMode,
      timeLimitSeconds,
      answers
    };
  }

  function normaliseHistory(raw) {
    const games = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.games) ? raw.games : []);
    return games.filter((game) => game && typeof game === 'object').map(normaliseGame);
  }

  function questionIdValue(value) {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  }

  function questionKey(courseSigla, questionId, question) {
    const id = questionIdValue(questionId);
    if (id) return `${courseSigla}:${id}`;
    const text = String(question || '').trim().toLowerCase();
    return text ? `${courseSigla}:texto:${text}` : '';
  }

  function newestDate(current, candidate) {
    const currentTime = Date.parse(current || '');
    const candidateTime = Date.parse(candidate || '');
    if (Number.isNaN(candidateTime)) return current || '';
    if (Number.isNaN(currentTime) || candidateTime > currentTime) return candidate;
    return current || '';
  }

  function buildQuestionStats(games) {
    const stats = new Map();
    normaliseHistory(games).forEach((game) => {
      const answers = Array.isArray(game.answers) ? game.answers : [];
      answers.forEach((answer) => {
        const courseSigla = normaliseCourseSigla(answer.courseSigla || game.courseSigla);
        const courseName = normaliseCourseName(answer.courseName || game.courseName, courseSigla);
        const key = questionKey(courseSigla, answer.questionId, answer.question);
        if (!key) return;

        if (!stats.has(key)) {
          stats.set(key, {
            questionKey: key,
            courseSigla,
            courseName,
            questionId: answer.questionId ?? null,
            question: String(answer.question || ''),
            seen: 0,
            correct: 0,
            wrong: 0,
            lastAnsweredAt: '',
            lastCorrectAt: '',
            lastWrongAt: ''
          });
        }

        const record = stats.get(key);
        record.questionId = record.questionId ?? answer.questionId ?? null;
        if (!record.question && answer.question) record.question = String(answer.question);
        record.seen += 1;
        record.lastAnsweredAt = newestDate(record.lastAnsweredAt, game.date);
        if (answer.isCorrect) {
          record.correct += 1;
          record.lastCorrectAt = newestDate(record.lastCorrectAt, game.date);
        } else {
          record.wrong += 1;
          record.lastWrongAt = newestDate(record.lastWrongAt, game.date);
        }
      });
    });

    return Array.from(stats.values()).map((record) => {
      const accuracy = record.seen ? Math.round((record.correct / record.seen) * 100) : 0;
      const wrongRate = record.seen ? Number((record.wrong / record.seen).toFixed(3)) : 0;
      return {
        ...record,
        accuracy,
        wrongRate,
        weaknessScore: (record.wrong * 3) - record.correct,
        strengthScore: (record.correct * 3) - record.wrong
      };
    }).sort((a, b) => (
      a.courseSigla.localeCompare(b.courseSigla)
      || b.weaknessScore - a.weaknessScore
      || b.wrong - a.wrong
      || a.correct - b.correct
      || String(a.questionId ?? '').localeCompare(String(b.questionId ?? ''), 'pt-PT', { numeric: true })
    ));
  }

  function serialiseHistory(games) {
    const normalisedGames = normaliseHistory(games);
    return {
      version: 5,
      updatedAt: new Date().toISOString(),
      games: normalisedGames,
      questionStats: buildQuestionStats(normalisedGames)
    };
  }

  const HistoryStore = {
    load() {
      const saved = localStorage.getItem(KEY);
      return normaliseHistory(safeParse(saved, []));
    },

    save(games) {
      localStorage.setItem(KEY, JSON.stringify(serialiseHistory(games)));
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
      const data = serialiseHistory(this.load());
      data.exportedAt = new Date().toISOString();
      return JSON.stringify(data, null, 2);
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

    normaliseGame,

    getQuestionStats(courseSigla) {
      const selectedCourse = normaliseCourseSigla(courseSigla);
      return buildQuestionStats(this.load()).filter((item) => item.courseSigla === selectedCourse);
    },

    getPlayModeLabel(mode) {
      return PLAY_MODE_LABELS[normalisePlayMode(mode)];
    },

    normalisePlayMode
  };

  window.HistoryStore = HistoryStore;
})();
