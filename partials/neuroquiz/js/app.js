/* Aplicação de página única: navegação, resultados e histórico. */
(function () {
  const views = ['homeView', 'setupView', 'gameView', 'resultsView', 'historyView', 'historyDetailView'];
  let questions = [];
  let historyGames = [];

  const seaFacts = [
    '?', 'Neuropsicologia Clínica', 'setting', 'autocuidado', 'mindfulness', 'validação', 'empatia',
    '7% palavras', '38% voz', '55% não verbal', 'GAS', 'AVDs', 'teleneuropsicologia', 'auto-observação',
    'intervisão', 'consentimento informado', 'privacidade', 'dignidade', 'competência', 'responsabilidade',
    'não julgamento', 'auto-compaixão', 'apraxia', 'aliança terapêutica', 'curiosidade gentil', 'ritmo pausado'
  ];

  const $ = (id) => document.getElementById(id);

  function showView(id) {
    views.forEach((viewId) => $(viewId).classList.toggle('active', viewId === id));
    document.body.classList.toggle('in-game', id === 'gameView');
    window.scrollTo(0, 0);
  }

  async function loadQuestions() {
    // Quando o site é aberto por file://, alguns navegadores bloqueiam fetch().
    // Por isso existe js/questions-data.js como cópia local de data/questions.json.
    try {
      const response = await fetch('data/questions.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('Não foi possível carregar questions.json.');
      const data = await response.json();
      if (!Array.isArray(data) || data.length < 75) throw new Error('questions.json não tem perguntas suficientes.');
      return data;
    } catch (error) {
      if (Array.isArray(window.QUESTION_BANK) && window.QUESTION_BANK.length >= 75) return window.QUESTION_BANK;
      throw error;
    }
  }

  function createSeaBackground() {
    const container = $('seaBackground');
    container.innerHTML = '';
    seaFacts.forEach((fact, index) => {
      const span = document.createElement('span');
      span.className = 'floating-fact';
      span.textContent = fact;
      const x = Math.round(-35 + Math.random() * 115);
      const y = Math.round(-30 + Math.random() * 100);
      const rotate = Math.round(-14 + Math.random() * 28);
      const duration = 22 + Math.random() * 18;
      const delay = -Math.random() * duration;
      span.style.setProperty('--x', `${x}vw`);
      span.style.setProperty('--y', `${y}vh`);
      span.style.setProperty('--rotate', `${rotate}deg`);
      span.style.animationDuration = `${duration}s`;
      span.style.animationDelay = `${delay - index * 0.7}s`;
      span.style.background = ['#fff0a8cc', '#ffd6e7cc', '#c9e8ffcc', '#c7f2d5cc', '#e7d8ffcc', '#ffd9c7cc'][index % 6];
      container.appendChild(span);
    });
  }

  function formatDate(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return 'Data não indicada';
    return new Intl.DateTimeFormat('pt-PT', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(date);
  }

  function renderSummary(game, targetId) {
    const target = $(targetId);
    target.innerHTML = '';
    const cards = [
      ['Total', game.total],
      ['Corretas', game.correct],
      ['Erradas', game.wrong],
      ['Acerto', `${game.percentage}%`]
    ];
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
    renderReviewList(game.answers, 'resultsList', 'results');
    showView('resultsView');
  }

  function escapeHTML(text) {
    return String(text ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function getChosenAnswer(item) {
    const selectedCard = String(item.selectedCard || '');
    if (item.timedOut || !selectedCard || selectedCard.startsWith('Sem resposta')) return '';
    if (item.selectedLabel === 'correctCard' || selectedCard === item.correctCard) return 'correct';
    if (item.selectedLabel === 'wrongCard' || selectedCard === item.wrongCard) return 'wrong';
    return '';
  }

  function reviewDetailsHTML(item, index, total) {
    const chosenAnswer = getChosenAnswer(item);
    const hasTimedOut = item.timedOut || String(item.selectedCard || '').startsWith('Sem resposta');
    const timeUsed = item.timeUsedSeconds == null ? 'Não indicado' : `${escapeHTML(item.timeUsedSeconds)}s`;
    return `
      <div class="review-question-expanded">
        <span class="tiny-bubble-label">Pergunta ${index + 1}/${total}</span>
        <p>${escapeHTML(item.question)}</p>
      </div>
      <div class="review-answer-grid">
        <div class="review-answer-card correct-answer ${chosenAnswer === 'correct' ? 'chosen-answer' : ''}">
          <span class="answer-label">Resposta correcta</span>
          <p>${escapeHTML(item.correctCard)}</p>
          ${chosenAnswer === 'correct' ? '<span class="chosen-badge">Escolhida</span>' : ''}
        </div>
        <div class="review-answer-card wrong-answer ${chosenAnswer === 'wrong' ? 'chosen-answer' : ''}">
          <span class="answer-label">Resposta incorrecta</span>
          <p>${escapeHTML(item.wrongCard)}</p>
          ${chosenAnswer === 'wrong' ? '<span class="chosen-badge">Escolhida</span>' : ''}
        </div>
      </div>
      ${hasTimedOut ? '<div class="soft-note timeout-note">Sem resposta - tempo esgotado.</div>' : ''}
      <div class="review-comment">
        <span class="pastel-caption">Comentário</span>
        <p>${escapeHTML(item.explanation || 'Comentário não indicado.')}</p>
      </div>
      <div class="review-meta-chips">
        <span class="chip">Dificuldade: ${escapeHTML(item.difficulty || 'não indicada')}</span>
        <span class="chip">Tempo usado: ${timeUsed}</span>
      </div>
      <div class="review-source">
        <span class="tiny-bubble-label">Referência</span>
        <p>${escapeHTML(item.source || 'Referência não indicada.')}</p>
      </div>
    `;
  }

  function renderReviewList(items, targetId, idPrefix) {
    const list = $(targetId);
    list.innerHTML = '';
    if (!Array.isArray(items) || !items.length) {
      list.innerHTML = '<div class="empty-state">Ainda não existem respostas para rever neste jogo.</div>';
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
          <span class="review-status ${item.isCorrect ? 'is-correct' : 'is-wrong'}">${item.isCorrect ? 'Correcta' : 'Incorrecta'}</span>
          <button class="review-toggle-btn" type="button" aria-expanded="false" aria-controls="${detailsId}">Ver mais</button>
        </div>
        <div id="${detailsId}" class="review-details" hidden>
          ${reviewDetailsHTML(item, index, items.length)}
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

  function renderHistory(message) {
    historyGames = HistoryStore.load();
    const list = $('historyList');
    list.innerHTML = '';
    if (typeof message === 'string') $('historyMessage').textContent = message;

    if (!historyGames.length) {
      list.innerHTML = '<div class="empty-state">Ainda não há jogos guardados. Joga uma ronda para encher este mar de memórias.</div>';
      return;
    }

    historyGames.forEach((game, index) => {
      const item = document.createElement('article');
      item.className = 'history-item';
      item.innerHTML = `
        <div>
          <div class="review-title">${escapeHTML(formatDate(game.dateISO))}</div>
          <div class="review-meta pastel-caption">${escapeHTML(game.correct)}/${escapeHTML(game.total)} corretas · ${escapeHTML(game.wrong)} erradas · ${escapeHTML(game.percentage)}% de acerto</div>
        </div>
        <button class="btn small pastel blue" type="button">Ver detalhes</button>
      `;
      item.querySelector('button').addEventListener('click', () => openHistoryGame(index));
      list.appendChild(item);
    });
  }

  function openHistoryGame(index) {
    const historyGame = historyGames[index];
    renderSummary(historyGame, 'historyGameSummary');
    renderReviewList(historyGame.answers, 'historyReviewList', `history-${index}`);
    showView('historyDetailView');
  }

  function exportHistory() {
    const blob = new Blob([HistoryStore.exportJSON()], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `historico-mar-de-perguntas-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    $('historyMessage').textContent = 'Histórico exportado em JSON.';
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
        renderHistory('Histórico importado com sucesso.');
      } catch (error) {
        $('historyMessage').textContent = error.message || 'Não foi possível importar o histórico.';
      }
    };
    reader.onerror = () => {
      $('historyMessage').textContent = 'Não foi possível ler o ficheiro escolhido.';
    };
    reader.readAsText(file, 'utf-8');
  }

  function clearHistory() {
    const confirmed = window.confirm('Queres mesmo limpar todo o histórico guardado neste navegador?');
    if (!confirmed) return;
    HistoryStore.clear();
    renderHistory('Histórico limpo.');
  }

  function bindEvents() {
    $('goSetupBtn').addEventListener('click', () => showView('setupView'));
    $('goHistoryBtn').addEventListener('click', () => { renderHistory(''); showView('historyView'); });
    document.querySelectorAll('.back-home').forEach((btn) => btn.addEventListener('click', () => showView('homeView')));

    document.querySelectorAll('.question-count').forEach((btn) => {
      btn.addEventListener('click', () => {
        const count = Number(btn.dataset.count);
        showView('gameView');
        GameEngine.start(count);
      });
    });

    $('resultsHomeBtn').addEventListener('click', () => showView('homeView'));
    $('playAgainBtn').addEventListener('click', () => showView('setupView'));
    $('resultsHistoryBtn').addEventListener('click', () => { renderHistory(''); showView('historyView'); });

    $('exportHistoryBtn').addEventListener('click', exportHistory);
    $('importHistoryBtn').addEventListener('click', () => {
      $('importHistoryInput').value = '';
      $('importHistoryInput').click();
    });
    $('importHistoryInput').addEventListener('change', (event) => importHistory(event.target.files[0]));
    $('clearHistoryBtn').addEventListener('click', clearHistory);
    $('backToHistoryBtn').addEventListener('click', () => { renderHistory(); showView('historyView'); });
    $('historyDetailHomeBtn').addEventListener('click', () => showView('homeView'));

    window.addEventListener('beforeunload', () => GameEngine.stop());
  }

  async function init() {
    createSeaBackground();
    bindEvents();
    try {
      questions = await loadQuestions();
      GameEngine.init(questions, {
        onFinish(game) {
          HistoryStore.add(game);
          renderResults(game);
        },
        onQuit() {
          showView('homeView');
        }
      });
    } catch (error) {
      document.querySelector('.hero-card .lead').textContent = 'Não foi possível carregar as perguntas. Verifica se os ficheiros do projecto estão completos.';
      console.error(error);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
