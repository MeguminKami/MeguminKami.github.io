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

    state.currentCards = shuffle([
      { text: q.correctCard, isCorrect: true, label: 'correctCard' },
      { text: q.wrongCard, isCorrect: false, label: 'wrongCard' }
    ]);

    els.cardsArea.innerHTML = '';
    state.currentCards.forEach((card, index) => {
      const side = index === 0 ? 'left' : 'right';
      const cardEl = document.createElement('button');
      cardEl.type = 'button';
      cardEl.className = `answer-card ${side}`;
      cardEl.dataset.index = String(index);
      cardEl.dataset.side = side;
      cardEl.dataset.swipe = side === 'left' ? '← arrasta' : 'arrasta →';
      cardEl.setAttribute('aria-label', `Seleccionar cartão ${side === 'left' ? 'da esquerda' : 'da direita'}`);
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
      const accepted = (side === 'left' && dx < -threshold) || (side === 'right' && dx > threshold);
      if (accepted) {
        choose(index, cardEl, false);
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

  function choose(index, cardEl, timedOut) {
    if (state.locked) return;
    state.locked = true;
    stopTimer();

    const q = currentQuestion();
    const chosen = Number.isInteger(index) ? state.currentCards[index] : null;
    const timeUsed = Math.min(GAME_SECONDS, Math.max(0, (Date.now() - state.startedAt) / 1000));

    state.answers.push({
      id: q.id,
      question: q.question,
      correctCard: q.correctCard,
      wrongCard: q.wrongCard,
      explanation: q.explanation,
      source: q.source,
      category: q.category,
      difficulty: q.difficulty,
      selectedCard: chosen ? chosen.text : 'Sem resposta — tempo esgotado',
      selectedLabel: chosen ? chosen.label : null,
      isCorrect: Boolean(chosen && chosen.isCorrect),
      timedOut: Boolean(timedOut),
      timeUsedSeconds: Number(timeUsed.toFixed(1)),
      cardOrder: state.currentCards.map((card) => ({ text: card.text, isCorrect: card.isCorrect }))
    });

    if (cardEl) {
      cardEl.classList.add(cardEl.dataset.side === 'left' ? 'fly-left' : 'fly-right');
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
    const wrong = state.answers.length - correct;
    const percentage = state.answers.length ? Math.round((correct / state.answers.length) * 100) : 0;
    const game = {
      gameId: `jogo-${Date.now()}`,
      dateISO: new Date().toISOString(),
      total: state.answers.length,
      correct,
      wrong,
      percentage,
      answers: state.answers.slice()
    };
    if (typeof state.callbacks.onFinish === 'function') state.callbacks.onFinish(game);
  }

  const GameEngine = {
    init(questions, callbacks = {}) {
      cacheEls();
      state.questions = Array.isArray(questions) ? questions : [];
      state.callbacks = callbacks;
      els.quit.addEventListener('click', () => {
        stopTimer();
        if (typeof state.callbacks.onQuit === 'function') state.callbacks.onQuit();
      });
    },

    start(count) {
      state.session = sampleQuestions(state.questions, count);
      state.currentIndex = 0;
      state.answers = [];
      renderQuestion();
    },

    stop: stopTimer
  };

  window.GameEngine = GameEngine;
})();
