/* Lógica principal do jogo: selecção aleatória, temporizador e swipe. */
(function () {
  const GAME_SECONDS = 30;
  const backgrounds = ['#fff0a8', '#ffd6e7', '#c9e8ff', '#c7f2d5', '#e7d8ff', '#ffd9c7', '#c7f2e5'];

  const state = {
    questions: [],
    session: [],
    currentIndex: 0,
    currentCards: [],
    answers: [],
    mode: '2',
    timerId: null,
    startedAt: 0,
    remaining: GAME_SECONDS,
    locked: false,
    callbacks: {}
  };

  const els = {};

  function cacheEls() {
    els.gameView = document.getElementById('gameView');
    els.progress = document.getElementById('progressText');
    els.category = document.getElementById('categoryPill');
    els.question = document.getElementById('gameQuestion');
    els.moon = document.getElementById('moonTimer');
    els.time = document.getElementById('timeText');
    els.cardsArea = document.getElementById('cardsArea');
    els.swipeHint = document.getElementById('swipeHint');
    els.quit = document.getElementById('quitGameBtn');
  }

  function shuffle(array) {
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function sampleQuestions(allQuestions, count) {
    return shuffle(allQuestions).slice(0, Math.min(count, allQuestions.length));
  }

  function normaliseQuestion(question) {
    const wrongCards = Array.isArray(question.wrongCards)
      ? question.wrongCards
      : [question.wrongCard].filter(Boolean);
    return { ...question, wrongCards: wrongCards.slice() };
  }

  function buildOptions(question) {
    const wrongCards = state.mode === '4'
      ? question.wrongCards.slice(0, 3)
      : shuffle(question.wrongCards).slice(0, 1);
    return shuffle([
      { text: question.correctCard, isCorrect: true },
      ...wrongCards.map((text) => ({ text, isCorrect: false }))
    ]);
  }

  function stopTimer() {
    if (state.timerId) clearInterval(state.timerId);
    state.timerId = null;
  }

  function updateTimer() {
    const elapsed = (Date.now() - state.startedAt) / 1000;
    state.remaining = Math.max(0, GAME_SECONDS - elapsed);
    const progress = state.remaining / GAME_SECONDS;
    const empty = `${Math.min(100, Math.max(0, 100 - progress * 100)).toFixed(1)}%`;
    let colour = '#8ee6c8';
    if (state.remaining <= 10) colour = '#ff9fb8';
    else if (state.remaining <= 20) colour = '#ffd179';
    els.moon.style.setProperty('--empty', empty);
    els.moon.style.setProperty('--moon-colour', colour);
    els.time.textContent = `${Math.ceil(state.remaining)} s`;

    if (state.remaining <= 0 && !state.locked) {
      choose(null, null, true);
    }
  }

  function startTimer() {
    stopTimer();
    state.startedAt = Date.now();
    state.remaining = GAME_SECONDS;
    updateTimer();
    state.timerId = setInterval(updateTimer, 200);
  }

  function currentQuestion() {
    return state.session[state.currentIndex];
  }

  function renderQuestion() {
    const q = currentQuestion();
    if (!q) return finish();

    state.locked = false;
    const bg = backgrounds[Math.floor(Math.random() * backgrounds.length)];
    els.gameView.style.setProperty('--game-bg', bg);
    els.progress.textContent = `Pergunta ${state.currentIndex + 1}/${state.session.length}`;
    els.category.textContent = `${q.category} · ${q.difficulty}`;
    els.question.textContent = q.question;

    state.currentCards = buildOptions(q);

    els.cardsArea.innerHTML = '';
    els.cardsArea.className = `cards-area options-grid ${state.mode === '4' ? 'four-options' : 'two-options'}`;
    els.swipeHint.textContent = state.mode === '4'
      ? 'Toca num cartão ou arrasta-o horizontalmente para responder.'
      : 'Swipe principal: esquerda ← ou direita →. Também podes tocar num cartão.';
    state.currentCards.forEach((card, index) => {
      const side = index % 2 === 0 ? 'left' : 'right';
      const cardEl = document.createElement('button');
      cardEl.type = 'button';
      cardEl.className = `answer-card ${side} ${state.mode === '4' ? 'answer-option-card' : ''}`;
      cardEl.dataset.index = String(index);
      cardEl.dataset.side = side;
      cardEl.dataset.swipe = state.mode === '4' ? '← ou →' : (side === 'left' ? '← arrasta' : 'arrasta →');
      cardEl.setAttribute('aria-label', `Selecionar opção ${index + 1} de ${state.currentCards.length}`);
      cardEl.textContent = card.text;
      addSwipeHandlers(cardEl, index, side);
      cardEl.addEventListener('click', (event) => {
        if (event.detail === 0 || !cardEl.dataset.wasDragged) choose(index, cardEl, false);
        delete cardEl.dataset.wasDragged;
      });
      els.cardsArea.appendChild(cardEl);
    });
    startTimer();
  }

  function addSwipeHandlers(cardEl, index, side) {
    let startX = 0;
    let startY = 0;
    let dx = 0;
    let dy = 0;
    let dragging = false;
    let pointerId = null;

    cardEl.addEventListener('pointerdown', (event) => {
      if (state.locked) return;
      dragging = true;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      dx = 0;
      dy = 0;
      cardEl.setPointerCapture(pointerId);
      cardEl.classList.add('dragging');
    });

    cardEl.addEventListener('pointermove', (event) => {
      if (!dragging || state.locked) return;
      dx = event.clientX - startX;
      dy = event.clientY - startY;
      const rotate = Math.max(-12, Math.min(12, dx / 15));
      cardEl.style.transform = `translate(${dx}px, ${dy * 0.15}px) rotate(${rotate}deg)`;
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) cardEl.dataset.wasDragged = 'true';
    });

    function release() {
      if (!dragging) return;
      dragging = false;
      cardEl.classList.remove('dragging');
      const threshold = Math.max(75, cardEl.offsetWidth * 0.28);
      const accepted = state.mode === '4'
        ? Math.abs(dx) > threshold
        : (side === 'left' && dx < -threshold) || (side === 'right' && dx > threshold);
      if (accepted) {
        choose(index, cardEl, false, dx < 0 ? 'left' : 'right');
      } else {
        cardEl.style.transform = '';
      }
    }

    cardEl.addEventListener('pointerup', release);
    cardEl.addEventListener('pointercancel', release);
    cardEl.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        choose(index, cardEl, false);
      }
    });
  }

  function choose(index, cardEl, timedOut, flyDirection) {
    if (state.locked) return;
    state.locked = true;
    stopTimer();

    const q = currentQuestion();
    const chosen = Number.isInteger(index) ? state.currentCards[index] : null;
    const timeUsed = Math.min(GAME_SECONDS, Math.max(0, (Date.now() - state.startedAt) / 1000));

    state.answers.push({
      questionId: q.id,
      question: q.question,
      correctCard: q.correctCard,
      wrongCards: q.wrongCards.slice(),
      optionsShown: state.currentCards.map((card) => ({ text: card.text, isCorrect: card.isCorrect })),
      selectedAnswer: chosen ? chosen.text : '',
      isCorrect: Boolean(chosen && chosen.isCorrect),
      explanation: q.explanation,
      source: q.source,
      category: q.category,
      difficulty: q.difficulty,
      timeUsed: Number(timeUsed.toFixed(1)),
      mode: state.mode,
      timedOut: Boolean(timedOut),
    });

    if (cardEl) {
      const direction = flyDirection || cardEl.dataset.side;
      cardEl.classList.add(direction === 'left' ? 'fly-left' : 'fly-right');
    }

    window.setTimeout(() => {
      state.currentIndex += 1;
      if (state.currentIndex >= state.session.length) finish();
      else renderQuestion();
    }, cardEl ? 360 : 240);
  }

  function finish() {
    stopTimer();
    const correct = state.answers.filter((item) => item.isCorrect).length;
    const game = {
      gameId: `jogo-${Date.now()}`,
      date: new Date().toISOString(),
      totalQuestions: state.answers.length,
      score: correct,
      mode: state.mode,
      answers: state.answers.slice()
    };
    if (typeof state.callbacks.onFinish === 'function') state.callbacks.onFinish(game);
  }

  const GameEngine = {
    init(questions, callbacks = {}) {
      cacheEls();
      state.questions = Array.isArray(questions) ? questions.map(normaliseQuestion) : [];
      state.callbacks = callbacks;
      els.quit.addEventListener('click', () => {
        stopTimer();
        if (typeof state.callbacks.onQuit === 'function') state.callbacks.onQuit();
      });
    },

    start(count, mode) {
      state.session = sampleQuestions(state.questions, count);
      state.currentIndex = 0;
      state.answers = [];
      state.mode = String(mode) === '4' ? '4' : '2';
      renderQuestion();
    },

    stop: stopTimer
  };

  window.GameEngine = GameEngine;
})();
