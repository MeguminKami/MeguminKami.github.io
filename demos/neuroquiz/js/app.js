/* Aplicacao de pagina unica: cadeiras, navegacao, resultados e historico. */
(function () {
  const COURSES = {
    LCNC: {
      sigla: 'LCNC',
      name: 'Laborat\u00f3rio de Compet\u00eancias em Neuropsicologia Cl\u00ednica',
      file: 'data/questions_LCNC.json',
      description: 'Comunica\u00e7\u00e3o cl\u00ednica, \u00e9tica, compet\u00eancias profissionais e bem-estar.'
    },
    MADN: {
      sigla: 'MADN',
      name: 'M\u00e9todos de An\u00e1lise de Dados em Neuropsicologia Cl\u00ednica',
      file: 'data/questions_MADN.json',
      description: 'Correla\u00e7\u00e3o, regress\u00e3o, ANCOVA, MANOVA, revis\u00e3o sistem\u00e1tica e meta-an\u00e1lise.'
    }
  };
  const PLAY_MODES = {
    normal: {
      label: 'Jogo Normal',
      note: 'Perguntas aleat\u00f3rias da cadeira.'
    },
    reinforcement: {
      label: 'Treino de Refor\u00e7o',
      note: 'Prioriza as perguntas com mais erros guardados.'
    }
  };

  const views = ['homeView', 'courseMenuView', 'setupView', 'gameView', 'resultsView', 'historyView', 'historyDetailView'];
  const questionBanks = {};
  let historyGames = [];
  let displayedHistoryGames = [];
  let selectedCourseSigla = null;
  let selectedQuestionCount = null;
  let selectedMode = null;
  let selectedPlayMode = 'normal';
  let selectedTimeLimit = undefined;
  let setupStep = 'count';
  let historyFilter = 'current';

  const seaFacts = [
    '?', 'Neuropsicologia', 'correla\u00e7\u00e3o', 'regress\u00e3o', 'ANCOVA', 'MANOVA', 'mindfulness',
    'valida\u00e7\u00e3o', 'empatia', 'meta-an\u00e1lise', 'GAS', 'AVDs', 'autocuidado', 'privacidade',
    'dignidade', 'compet\u00eancia', 'responsabilidade', 'revis\u00e3o sistem\u00e1tica', 'alian\u00e7a terap\u00eautica'
  ];

  const $ = (id) => document.getElementById(id);

  function getCourse(courseSigla = selectedCourseSigla) {
    return COURSES[courseSigla] || null;
  }

  function normalisePlayMode(playMode) {
    if (window.HistoryStore && typeof HistoryStore.normalisePlayMode === 'function') {
      return HistoryStore.normalisePlayMode(playMode);
    }
    return String(playMode) === 'reinforcement' ? 'reinforcement' : 'normal';
  }

  function getPlayModeLabel(playMode) {
    if (window.HistoryStore && typeof HistoryStore.getPlayModeLabel === 'function') {
      return HistoryStore.getPlayModeLabel(playMode);
    }
    return PLAY_MODES[normalisePlayMode(playMode)].label;
  }

  function getWeakQuestionCount(courseSigla) {
    if (!window.HistoryStore || typeof HistoryStore.getQuestionStats !== 'function') return 0;
    return HistoryStore.getQuestionStats(courseSigla).filter((item) => Number(item.wrong) > 0).length;
  }

  function showView(id) {
    views.forEach((viewId) => $(viewId).classList.toggle('active', viewId === id));
    document.body.classList.toggle('in-game', id === 'gameView');
    window.scrollTo(0, 0);
  }

  function showCourseMenu() {
    if (!getCourse()) {
      showView('homeView');
      return;
    }
    updateCourseUI();
    showView('courseMenuView');
  }

  function updateCourseUI() {
    const course = getCourse();
    document.querySelectorAll('.course-card').forEach((button) => {
      const selected = button.dataset.course === selectedCourseSigla;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    if (!course) return;

    $('courseMenuBadge').textContent = course.sigla;
    $('courseMenuName').textContent = course.name;
    $('courseMenuDescription').textContent = course.description;
    document.querySelectorAll('.play-mode-card').forEach((button) => {
      const playMode = normalisePlayMode(button.dataset.playMode);
      button.setAttribute('aria-label', `${getPlayModeLabel(playMode)} em ${course.sigla}`);
    });
    const reinforcementMeta = $('reinforcementModeMeta');
    if (reinforcementMeta) {
      const weakCount = getWeakQuestionCount(course.sigla);
      reinforcementMeta.textContent = weakCount
        ? `${weakCount} perguntas em refor\u00e7o`
        : 'Sem erros registados';
    }
    document.querySelectorAll('.current-course-pill').forEach((pill) => {
      pill.textContent = `Cadeira: ${course.sigla}`;
    });
    document.querySelectorAll('.current-play-mode-pill').forEach((pill) => {
      pill.textContent = getPlayModeLabel(selectedPlayMode);
    });
  }

  function selectCourse(courseSigla) {
    if (!COURSES[courseSigla]) return;
    selectedCourseSigla = courseSigla;
    selectedPlayMode = 'normal';
    updateCourseUI();
    showCourseMenu();
  }

  function updateSetupControls() {
    $('countSetupStep').hidden = setupStep !== 'count';
    $('modeSetupStep').hidden = setupStep !== 'mode';
    $('timeSetupStep').hidden = setupStep !== 'time';
    document.querySelectorAll('.current-play-mode-pill').forEach((pill) => {
      pill.textContent = getPlayModeLabel(selectedPlayMode);
    });
    document.querySelectorAll('.question-count').forEach((button) => {
      const selected = Number(button.dataset.count) === selectedQuestionCount;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    document.querySelectorAll('.mode-card[data-mode]').forEach((button) => {
      const selected = button.dataset.mode === selectedMode;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    document.querySelectorAll('.time-limit').forEach((button) => {
      const value = button.dataset.timeLimit === 'none' ? null : Number(button.dataset.timeLimit);
      const selected = value === selectedTimeLimit;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    $('startGameBtn').disabled = !(selectedQuestionCount && selectedMode && selectedTimeLimit !== undefined);
    const setupModeNote = $('setupModeNote');
    if (setupModeNote) {
      const weakCount = getWeakQuestionCount(selectedCourseSigla);
      if (selectedPlayMode === 'reinforcement') {
        setupModeNote.textContent = weakCount
          ? `${getPlayModeLabel(selectedPlayMode)} vai buscar primeiro as perguntas mais erradas desta cadeira.`
          : `${getPlayModeLabel(selectedPlayMode)} ainda n\u00e3o tem erros guardados nesta cadeira; esta ronda come\u00e7a aleat\u00f3ria.`;
      } else {
        setupModeNote.textContent = PLAY_MODES.normal.note;
      }
    }
  }

  function openSetup(playMode = selectedPlayMode) {
    if (!getCourse()) return showView('homeView');
    selectedPlayMode = normalisePlayMode(playMode);
    selectedQuestionCount = null;
    selectedMode = null;
    selectedTimeLimit = undefined;
    setupStep = 'count';
    updateCourseUI();
    updateSetupControls();
    showView('setupView');
  }

  function validateQuestionBank(data, course) {
    if (!Array.isArray(data) || !data.length) {
      throw new Error(`O ficheiro de perguntas de ${course.sigla} est\u00e1 vazio ou inv\u00e1lido.`);
    }
    return data;
  }

  async function loadQuestions(course) {
    if (questionBanks[course.sigla]) return questionBanks[course.sigla];

    try {
      const response = await fetch(course.file, { cache: 'no-store' });
      if (!response.ok) throw new Error(`N\u00e3o foi poss\u00edvel carregar ${course.file}.`);
      questionBanks[course.sigla] = validateQuestionBank(await response.json(), course);
    } catch (error) {
      const fallback = window.QUESTION_BANKS && window.QUESTION_BANKS[course.sigla];
      const legacyFallback = course.sigla === 'LCNC' ? window.QUESTION_BANK : null;
      questionBanks[course.sigla] = validateQuestionBank(fallback || legacyFallback, course);
    }

    return questionBanks[course.sigla];
  }

  function createSeaBackground() {
    const container = $('seaBackground');
    container.innerHTML = '';
    seaFacts.forEach((fact, index) => {
      const span = document.createElement('span');
      const duration = 22 + Math.random() * 18;
      span.className = 'floating-fact';
      span.textContent = fact;
      span.style.setProperty('--x', `${Math.round(-35 + Math.random() * 115)}vw`);
      span.style.setProperty('--y', `${Math.round(-30 + Math.random() * 100)}vh`);
      span.style.setProperty('--rotate', `${Math.round(-14 + Math.random() * 28)}deg`);
      span.style.animationDuration = `${duration}s`;
      span.style.animationDelay = `${-Math.random() * duration - index * 0.7}s`;
      span.style.background = ['#fff0a8cc', '#ffd6e7cc', '#c9e8ffcc', '#c7f2d5cc', '#e7d8ffcc', '#ffd9c7cc'][index % 6];
      container.appendChild(span);
    });
  }

  function formatDate(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return 'Data n\u00e3o indicada';
    return new Intl.DateTimeFormat('pt-PT', { dateStyle: 'short', timeStyle: 'short' }).format(date);
  }

  function escapeHTML(text) {
    return String(text ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function getGameStats(game) {
    const answers = Array.isArray(game.answers) ? game.answers : [];
    const total = Number(game.totalQuestions ?? game.total ?? answers.length);
    const correct = Number(game.score ?? game.correct ?? answers.filter((item) => item.isCorrect).length);
    const wrong = Number(game.wrong ?? Math.max(0, total - correct));
    const percentage = Number(game.percentage ?? (total ? Math.round((correct / total) * 100) : 0));
    return {
      total: Number.isFinite(total) ? total : answers.length,
      correct: Number.isFinite(correct) ? correct : 0,
      wrong: Number.isFinite(wrong) ? wrong : 0,
      percentage: Number.isFinite(percentage) ? percentage : 0,
      mode: String(game.mode) === '4' ? '4' : '2',
      playMode: normalisePlayMode(game.playMode)
    };
  }

  function formatTimeLimit(timeLimitSeconds) {
    return timeLimitSeconds === null ? 'Sem limite' : `${Number(timeLimitSeconds) || 30}s`;
  }

  function renderSummary(game, targetId) {
    const target = $(targetId);
    const stats = getGameStats(game);
    const cards = [
      ['Cadeira', game.courseSigla || 'LCNC'],
      ['Jogo', getPlayModeLabel(stats.playMode)],
      ['Total', stats.total],
      ['Corretas', stats.correct],
      ['Erradas', stats.wrong],
      ['Acerto', `${stats.percentage}%`],
      ['Desafio', `${stats.mode} op\u00e7\u00f5es`],
      ['Tempo', formatTimeLimit(game.timeLimitSeconds)]
    ];
    target.innerHTML = '';
    cards.forEach(([label, value]) => {
      const card = document.createElement('article');
      const strong = document.createElement('strong');
      const span = document.createElement('span');
      card.className = 'summary-card';
      strong.textContent = value;
      span.textContent = label;
      card.append(strong, span);
      target.appendChild(card);
    });
  }

  function renderResults(game) {
    renderSummary(game, 'summaryCards');
    renderReviewList(game.answers, 'resultsList', 'results', game);
    showView('resultsView');
  }

  function getOptionsShown(item) {
    const rawOptions = item.optionsShown || item.cardOrder;
    if (Array.isArray(rawOptions) && rawOptions.length) {
      return rawOptions.map((option) => {
        const text = typeof option === 'object' && option !== null ? option.text : option;
        const hasCorrectFlag = typeof option === 'object' && option !== null && typeof option.isCorrect === 'boolean';
        return {
          text: String(text ?? ''),
          isCorrect: hasCorrectFlag ? option.isCorrect : String(text ?? '') === item.correctCard
        };
      }).filter((option) => option.text);
    }
    const wrongCards = Array.isArray(item.wrongCards) ? item.wrongCards : [item.wrongCard].filter(Boolean);
    return [item.correctCard, ...wrongCards].filter(Boolean).map((text) => ({
      text: String(text),
      isCorrect: String(text) === String(item.correctCard ?? '')
    }));
  }

  function reviewDetailsHTML(item, index, total, game) {
    const selectedAnswer = String(item.selectedAnswer ?? item.selectedCard ?? '');
    const hasTimedOut = item.timedOut || selectedAnswer.startsWith('Sem resposta');
    const time = item.timeUsed ?? item.timeUsedSeconds;
    const timeUsed = time == null ? 'N\u00e3o indicado' : `${escapeHTML(time)}s`;
    const courseSigla = item.courseSigla || game.courseSigla || 'LCNC';
    const options = getOptionsShown(item);
    const optionsHTML = options.map((option) => {
      const chosen = !hasTimedOut && selectedAnswer === option.text;
      return `
        <div class="review-answer-card ${option.isCorrect ? 'correct-answer' : 'wrong-answer'} ${chosen ? 'chosen-answer' : ''}">
          <span class="answer-label">${option.isCorrect ? 'Resposta correta' : 'Resposta errada'}</span>
          <p>${escapeHTML(option.text)}</p>
          ${chosen ? '<span class="chosen-badge">Escolhida</span>' : ''}
        </div>
      `;
    }).join('');
    return `
      <div class="review-question-expanded">
        <span class="tiny-bubble-label">Pergunta ${index + 1}/${total}</span>
        <p>${escapeHTML(item.question)}</p>
      </div>
      <div class="review-options-grid ${options.length > 2 ? 'four-options' : 'two-options'}">
        ${optionsHTML || '<div class="empty-state">N\u00e3o existem op\u00e7\u00f5es guardadas para esta pergunta.</div>'}
      </div>
      ${hasTimedOut ? '<div class="soft-note timeout-note">Sem resposta - tempo esgotado.</div>' : ''}
      <div class="review-comment">
        <span class="pastel-caption">Coment\u00e1rio</span>
        <p>${escapeHTML(item.explanation || 'Coment\u00e1rio n\u00e3o indicado.')}</p>
      </div>
      <div class="review-meta-chips">
        <span class="chip">Cadeira: ${escapeHTML(courseSigla)}</span>
        <span class="chip">Categoria: ${escapeHTML(item.category || 'n\u00e3o indicada')}</span>
        <span class="chip">Dificuldade: ${escapeHTML(item.difficulty || 'n\u00e3o indicada')}</span>
        <span class="chip">Tempo usado: ${timeUsed}</span>
        <span class="chip">Tempo por pergunta: ${escapeHTML(formatTimeLimit(game.timeLimitSeconds))}</span>
      </div>
      <div class="review-source">
        <span class="tiny-bubble-label">Refer\u00eancia</span>
        <p>${escapeHTML(item.source || 'Refer\u00eancia n\u00e3o indicada.')}</p>
      </div>
    `;
  }

  function renderReviewList(items, targetId, idPrefix, game) {
    const list = $(targetId);
    list.innerHTML = '';
    if (!Array.isArray(items) || !items.length) {
      list.innerHTML = '<div class="empty-state">Ainda n\u00e3o existem respostas para rever neste jogo.</div>';
      return;
    }

    items.forEach((item, index) => {
      const detailsId = `${idPrefix}-review-details-${index + 1}`;
      const row = document.createElement('article');
      row.className = `review-item ${item.isCorrect ? 'correct' : 'wrong'}`;
      row.innerHTML = `
        <div class="review-summary">
          <span class="review-number">${index + 1}.</span>
          <p class="review-question-preview">${escapeHTML(item.question)}</p>
          <span class="review-status ${item.isCorrect ? 'is-correct' : 'is-wrong'}">${item.isCorrect ? 'Correta' : 'Incorreta'}</span>
          <button class="review-toggle-btn" type="button" aria-expanded="false" aria-controls="${detailsId}">Ver mais</button>
        </div>
        <div id="${detailsId}" class="review-details" hidden>
          ${reviewDetailsHTML(item, index, items.length, game)}
        </div>
      `;
      const toggle = row.querySelector('.review-toggle-btn');
      const details = row.querySelector('.review-details');
      toggle.addEventListener('click', () => {
        const willExpand = details.hidden;
        details.hidden = !willExpand;
        toggle.setAttribute('aria-expanded', String(willExpand));
        toggle.textContent = willExpand ? 'Ver menos' : 'Ver mais';
      });
      list.appendChild(row);
    });
  }

  function updateHistoryFilterControls() {
    const isCurrent = historyFilter === 'current';
    $('currentCourseHistoryBtn').setAttribute('aria-pressed', String(isCurrent));
    $('allCoursesHistoryBtn').setAttribute('aria-pressed', String(!isCurrent));
    $('currentCourseHistoryBtn').classList.toggle('is-selected', isCurrent);
    $('allCoursesHistoryBtn').classList.toggle('is-selected', !isCurrent);
    $('historyTitle').textContent = isCurrent
      ? `Hist\u00f3rico da cadeira ${selectedCourseSigla}`
      : 'Hist\u00f3rico de todas as cadeiras';
  }

  function renderHistory(message) {
    historyGames = HistoryStore.load();
    displayedHistoryGames = historyFilter === 'current'
      ? historyGames.filter((game) => game.courseSigla === selectedCourseSigla)
      : historyGames;
    updateHistoryFilterControls();
    const list = $('historyList');
    list.innerHTML = '';
    if (typeof message === 'string') $('historyMessage').textContent = message;

    if (!displayedHistoryGames.length) {
      list.innerHTML = '<div class="empty-state">Ainda n\u00e3o h\u00e1 jogos guardados neste filtro. Joga uma ronda para encher este mar de mem\u00f3rias.</div>';
      return;
    }

    displayedHistoryGames.forEach((game, index) => {
      const stats = getGameStats(game);
      const item = document.createElement('article');
      item.className = 'history-item';
      item.innerHTML = `
        <div>
          <span class="history-course-badge">${escapeHTML(game.courseSigla)}</span>
          <div class="review-title">${escapeHTML(formatDate(game.date ?? game.dateISO))}</div>
          <div class="review-meta pastel-caption">${escapeHTML(game.courseSigla)} &middot; ${escapeHTML(getPlayModeLabel(stats.playMode))} &middot; ${escapeHTML(stats.correct)}/${escapeHTML(stats.total)} corretas &middot; ${escapeHTML(stats.mode)} op\u00e7\u00f5es &middot; ${escapeHTML(stats.total)} perguntas &middot; ${escapeHTML(formatTimeLimit(game.timeLimitSeconds))}</div>
        </div>
        <button class="btn small pastel blue" type="button">Ver detalhes</button>
      `;
      item.querySelector('button').addEventListener('click', () => openHistoryGame(index));
      list.appendChild(item);
    });
  }

  function openHistory(filter = 'current') {
    historyFilter = filter;
    updateCourseUI();
    renderHistory('');
    showView('historyView');
  }

  function openHistoryGame(index) {
    const historyGame = displayedHistoryGames[index];
    if (!historyGame) return;
    renderSummary(historyGame, 'historyGameSummary');
    renderReviewList(historyGame.answers, 'historyReviewList', `history-${index}`, historyGame);
    showView('historyDetailView');
  }

  function exportHistory() {
    const blob = new Blob([HistoryStore.exportJSON()], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `historico-mar-de-perguntas-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    $('historyMessage').textContent = 'Hist\u00f3rico exportado em JSON.';
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function importHistory(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        HistoryStore.importJSON(String(reader.result));
        renderHistory('Hist\u00f3rico importado com sucesso.');
      } catch (error) {
        $('historyMessage').textContent = error.message || 'N\u00e3o foi poss\u00edvel importar o hist\u00f3rico.';
      }
    };
    reader.onerror = () => {
      $('historyMessage').textContent = 'N\u00e3o foi poss\u00edvel ler o ficheiro escolhido.';
    };
    reader.readAsText(file, 'utf-8');
  }

  function clearCourseHistory() {
    const course = getCourse();
    if (!course || !window.confirm(`Queres limpar o hist\u00f3rico guardado de ${course.sigla}?`)) return;
    HistoryStore.clearCourse(course.sigla);
    renderHistory(`Hist\u00f3rico de ${course.sigla} limpo.`);
  }

  function clearAllHistory() {
    if (!window.confirm('Queres mesmo limpar todo o hist\u00f3rico guardado neste navegador?')) return;
    HistoryStore.clear();
    renderHistory('Hist\u00f3rico completo limpo.');
  }

  function bindEvents() {
    document.querySelectorAll('.course-card').forEach((button) => {
      button.addEventListener('click', () => selectCourse(button.dataset.course));
    });
    document.querySelectorAll('.back-courses').forEach((button) => {
      button.addEventListener('click', () => {
        GameEngine.stop();
        showView('homeView');
      });
    });
    document.querySelectorAll('.back-course-menu').forEach((button) => {
      button.addEventListener('click', showCourseMenu);
    });

    document.querySelectorAll('.play-mode-card').forEach((button) => {
      button.addEventListener('click', () => openSetup(button.dataset.playMode));
    });
    $('goHistoryBtn').addEventListener('click', () => openHistory('current'));

    document.querySelectorAll('.question-count').forEach((button) => {
      button.addEventListener('click', () => {
        selectedQuestionCount = Number(button.dataset.count);
        setupStep = 'mode';
        updateSetupControls();
      });
    });
    $('backToCountBtn').addEventListener('click', () => {
      selectedMode = null;
      selectedTimeLimit = undefined;
      setupStep = 'count';
      updateSetupControls();
    });
    document.querySelectorAll('.mode-card[data-mode]').forEach((button) => {
      button.addEventListener('click', () => {
        selectedMode = button.dataset.mode;
        selectedTimeLimit = undefined;
        setupStep = 'time';
        updateSetupControls();
      });
    });
    $('backToModeBtn').addEventListener('click', () => {
      selectedTimeLimit = undefined;
      setupStep = 'mode';
      updateSetupControls();
    });
    document.querySelectorAll('.time-limit').forEach((button) => {
      button.addEventListener('click', () => {
        selectedTimeLimit = button.dataset.timeLimit === 'none' ? null : Number(button.dataset.timeLimit);
        updateSetupControls();
      });
    });
    $('startGameBtn').addEventListener('click', async () => {
      const course = getCourse();
      if (!course || !selectedQuestionCount || !selectedMode || selectedTimeLimit === undefined) return;
      $('startGameBtn').disabled = true;
      try {
        GameEngine.setCourse(course, await loadQuestions(course));
        showView('gameView');
        const questionStats = selectedPlayMode === 'reinforcement'
          ? HistoryStore.getQuestionStats(course.sigla)
          : [];
        GameEngine.start(selectedQuestionCount, selectedMode, selectedTimeLimit, {
          playMode: selectedPlayMode,
          questionStats
        });
      } catch (error) {
        window.alert('N\u00e3o foi poss\u00edvel carregar as perguntas desta cadeira. Verifica se os ficheiros do projeto est\u00e3o completos.');
        console.error(error);
      } finally {
        updateSetupControls();
      }
    });

    $('resultsCourseMenuBtn').addEventListener('click', showCourseMenu);
    $('playAgainBtn').addEventListener('click', () => openSetup(selectedPlayMode));
    $('resultsHistoryBtn').addEventListener('click', () => openHistory('current'));

    $('currentCourseHistoryBtn').addEventListener('click', () => { historyFilter = 'current'; renderHistory(''); });
    $('allCoursesHistoryBtn').addEventListener('click', () => { historyFilter = 'all'; renderHistory(''); });
    $('exportHistoryBtn').addEventListener('click', exportHistory);
    $('importHistoryBtn').addEventListener('click', () => {
      $('importHistoryInput').value = '';
      $('importHistoryInput').click();
    });
    $('importHistoryInput').addEventListener('change', (event) => importHistory(event.target.files[0]));
    $('clearCourseHistoryBtn').addEventListener('click', clearCourseHistory);
    $('clearAllHistoryBtn').addEventListener('click', clearAllHistory);
    $('backToHistoryBtn').addEventListener('click', () => { renderHistory(); showView('historyView'); });
    $('historyDetailCourseMenuBtn').addEventListener('click', showCourseMenu);

    window.addEventListener('beforeunload', () => GameEngine.stop());
  }

  function init() {
    createSeaBackground();
    bindEvents();
    GameEngine.init([], {
      onFinish(game) {
        const savedGame = HistoryStore.normaliseGame(game);
        HistoryStore.add(savedGame);
        renderResults(savedGame);
      },
      onQuit() {
        showCourseMenu();
      }
    });
  }

  window.COURSES = COURSES;
  document.addEventListener('DOMContentLoaded', init);
})();
