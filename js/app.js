// Rendering SVG della board e orchestrazione dell'interfaccia (stato, eventi, turni IA).
const SQRT3 = Math.sqrt(3);
let game;
let settings = { mode: 'pvp', difficulty: 'medium', size: 11, starter: 1, pieRule: true };

function computeHexSize(N) {
  const targetWidth = 620;
  return targetWidth / (SQRT3 * (3 * N - 1) / 2);
}
function hexCenter(q, r, R) {
  return { cx: R * SQRT3 * (q + r / 2), cy: R * 1.5 * r };
}
function hexVertex(q, r, i, R) {
  const { cx, cy } = hexCenter(q, r, R);
  const angle = (Math.PI / 180) * (60 * i - 90);
  return { x: cx + R * Math.cos(angle), y: cy + R * Math.sin(angle) };
}
function hexPathStr(q, r, R) {
  let path = '';
  for (let i = 0; i < 6; i++) {
    const v = hexVertex(q, r, i, R);
    path += (i === 0 ? 'M' : 'L') + v.x.toFixed(2) + ',' + v.y.toFixed(2);
  }
  return path + 'Z';
}
function coordLabel(q) { return String.fromCharCode(65 + q); }

function renderBoard() {
  const N = game.size;
  const R = computeHexSize(N);
  const minX = -R * SQRT3 / 2;
  const maxX = R * SQRT3 * (N - 1 + (N - 1) / 2) + R * SQRT3 / 2;
  const minY = -R;
  const maxY = R * 1.5 * (N - 1) + R;
  const padX = R * 1.4, padY = R * 1.4;
  const svgW = maxX - minX + 2 * padX;
  const svgH = maxY - minY + 2 * padY;
  const offX = -minX + padX;
  const offY = -minY + padY;
  const lastMove = game.moves[game.moves.length - 1];
  const winSet = new Set();
  if (game.winPath) for (const [q, r] of game.winPath) winSet.add(q + ',' + r);

  let svg = '<svg viewBox="0 0 ' + svgW.toFixed(2) + ' ' + svgH.toFixed(2) + '">';
  svg += '<defs>';
  svg += '<radialGradient id="p1-grad" cx="0.35" cy="0.3" r="0.8"><stop offset="0%" stop-color="#ffadad"/><stop offset="35%" stop-color="#ef4444"/><stop offset="100%" stop-color="#7f1d1d"/></radialGradient>';
  svg += '<radialGradient id="p2-grad" cx="0.35" cy="0.3" r="0.8"><stop offset="0%" stop-color="#a5f3fc"/><stop offset="35%" stop-color="#06b6d4"/><stop offset="100%" stop-color="#155e75"/></radialGradient>';
  svg += '<filter id="stone-shadow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur in="SourceAlpha" stdDeviation="2"/><feOffset dx="0" dy="2"/><feComponentTransfer><feFuncA type="linear" slope="0.5"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
  svg += '</defs>';
  svg += '<g transform="translate(' + offX.toFixed(2) + ',' + offY.toFixed(2) + ')">';

  // Bordi colorati (4 lati)
  // Top (rosso)
  let p = 'M ' + hexVertex(0, 0, 5, R).x.toFixed(2) + ',' + hexVertex(0, 0, 5, R).y.toFixed(2);
  for (let q = 0; q < N; q++) {
    p += ' L ' + hexVertex(q, 0, 0, R).x.toFixed(2) + ',' + hexVertex(q, 0, 0, R).y.toFixed(2);
    p += ' L ' + hexVertex(q, 0, 1, R).x.toFixed(2) + ',' + hexVertex(q, 0, 1, R).y.toFixed(2);
  }
  svg += '<path d="' + p + '" stroke="#ef4444" stroke-width="' + (R * 0.22).toFixed(2) + '" fill="none" stroke-linejoin="round" stroke-linecap="round" opacity="0.95"/>';
  svg += '<path d="' + p + '" stroke="#ff8a8a" stroke-width="' + (R * 0.06).toFixed(2) + '" fill="none" stroke-linejoin="round" stroke-linecap="round" opacity="0.6"/>';
  // Bottom (rosso)
  p = 'M ' + hexVertex(0, N - 1, 4, R).x.toFixed(2) + ',' + hexVertex(0, N - 1, 4, R).y.toFixed(2);
  for (let q = 0; q < N; q++) {
    p += ' L ' + hexVertex(q, N - 1, 3, R).x.toFixed(2) + ',' + hexVertex(q, N - 1, 3, R).y.toFixed(2);
    p += ' L ' + hexVertex(q, N - 1, 2, R).x.toFixed(2) + ',' + hexVertex(q, N - 1, 2, R).y.toFixed(2);
  }
  svg += '<path d="' + p + '" stroke="#ef4444" stroke-width="' + (R * 0.22).toFixed(2) + '" fill="none" stroke-linejoin="round" stroke-linecap="round" opacity="0.95"/>';
  svg += '<path d="' + p + '" stroke="#ff8a8a" stroke-width="' + (R * 0.06).toFixed(2) + '" fill="none" stroke-linejoin="round" stroke-linecap="round" opacity="0.6"/>';
  // Left (ciano)
  p = 'M ' + hexVertex(0, 0, 5, R).x.toFixed(2) + ',' + hexVertex(0, 0, 5, R).y.toFixed(2);
  for (let r = 0; r < N; r++) {
    p += ' L ' + hexVertex(0, r, 4, R).x.toFixed(2) + ',' + hexVertex(0, r, 4, R).y.toFixed(2);
  }
  svg += '<path d="' + p + '" stroke="#06b6d4" stroke-width="' + (R * 0.22).toFixed(2) + '" fill="none" stroke-linejoin="round" stroke-linecap="round" opacity="0.95"/>';
  svg += '<path d="' + p + '" stroke="#67e8f9" stroke-width="' + (R * 0.06).toFixed(2) + '" fill="none" stroke-linejoin="round" stroke-linecap="round" opacity="0.6"/>';
  // Right (ciano)
  p = 'M ' + hexVertex(N - 1, 0, 1, R).x.toFixed(2) + ',' + hexVertex(N - 1, 0, 1, R).y.toFixed(2);
  for (let r = 0; r < N; r++) {
    p += ' L ' + hexVertex(N - 1, r, 2, R).x.toFixed(2) + ',' + hexVertex(N - 1, r, 2, R).y.toFixed(2);
  }
  svg += '<path d="' + p + '" stroke="#06b6d4" stroke-width="' + (R * 0.22).toFixed(2) + '" fill="none" stroke-linejoin="round" stroke-linecap="round" opacity="0.95"/>';
  svg += '<path d="' + p + '" stroke="#67e8f9" stroke-width="' + (R * 0.06).toFixed(2) + '" fill="none" stroke-linejoin="round" stroke-linecap="round" opacity="0.6"/>';

  // Celle
  for (let r = 0; r < N; r++) {
    for (let q = 0; q < N; q++) {
      const state = game.board[r][q];
      const { cx, cy } = hexCenter(q, r, R);
      const path = hexPathStr(q, r, R);
      const label = coordLabel(q) + (r + 1);
      const ariaLabel = state === 0 ? 'Cella ' + label + ', vuota' : 'Cella ' + label + ', occupata da ' + (state === 1 ? 'Rosso' : 'Ciano');
      svg += '<path d="' + path + '" class="hex-cell hex-empty" data-q="' + q + '" data-r="' + r + '" tabindex="0" role="button" aria-label="' + ariaLabel + '"/>';
      // Pedina
      if (state !== 0) {
        const stoneR = R * 0.62;
        const gradId = state === 1 ? 'p1-grad' : 'p2-grad';
        const isLast = lastMove && lastMove.q === q && lastMove.r === r;
        const isWin = winSet.has(q + ',' + r);
        let stoneCls = 'stone';
        if (isLast && !game.gameOver) stoneCls += ' stone-new';
        if (isWin) stoneCls += ' stone-win';
        const stoneColor = state === 1 ? '#ef4444' : '#06b6d4';
        svg += '<circle cx="' + cx.toFixed(2) + '" cy="' + cy.toFixed(2) + '" r="' + stoneR.toFixed(2) + '" fill="url(#' + gradId + ')" class="' + stoneCls + '" style="color:' + stoneColor + '" filter="url(#stone-shadow)"/>';
        // Evidenziazione
        svg += '<ellipse cx="' + (cx - stoneR * 0.3).toFixed(2) + '" cy="' + (cy - stoneR * 0.4).toFixed(2) + '" rx="' + (stoneR * 0.35).toFixed(2) + '" ry="' + (stoneR * 0.2).toFixed(2) + '" fill="rgba(255,255,255,0.4)" pointer-events="none"/>';
        // Anello sull'ultima mossa
        if (isLast && !game.gameOver) {
          svg += '<circle cx="' + cx.toFixed(2) + '" cy="' + cy.toFixed(2) + '" r="' + (stoneR * 1.18).toFixed(2) + '" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="' + (R * 0.06).toFixed(2) + '" stroke-dasharray="' + (R * 0.2).toFixed(2) + ' ' + (R * 0.15).toFixed(2) + '" pointer-events="none"/>';
        }
      }
    }
  }

  // Etichette di coordinata
  for (let q = 0; q < N; q++) {
    const { cx, cy } = hexCenter(q, 0, R);
    svg += '<text x="' + cx.toFixed(2) + '" y="' + (cy - R - R * 0.45).toFixed(2) + '" text-anchor="middle" class="coord-label">' + coordLabel(q) + '</text>';
  }
  for (let r = 0; r < N; r++) {
    const { cx, cy } = hexCenter(0, r, R);
    svg += '<text x="' + (cx - R * SQRT3 / 2 - R * 0.55).toFixed(2) + '" y="' + (cy + 4).toFixed(2) + '" text-anchor="middle" class="coord-label">' + (r + 1) + '</text>';
  }

  svg += '</g></svg>';
  document.getElementById('boardContainer').innerHTML = svg;
  document.querySelectorAll('.hex-cell').forEach(cell => {
    const q = parseInt(cell.dataset.q);
    const r = parseInt(cell.dataset.r);
    cell.addEventListener('click', () => handleCellClick(q, r));
    cell.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleCellClick(q, r);
      }
    });
  });
}

function renderStatus() {
  const statusInfo = document.getElementById('statusInfo');
  // Imposta classe sul body per l'hover del colore corretto
  document.body.classList.toggle('turn-p1', !game.gameOver && game.currentPlayer === 1 && !game.pieRuleAvailable);
  document.body.classList.toggle('turn-p2', !game.gameOver && game.currentPlayer === 2 && !game.pieRuleAvailable);

  if (game.gameOver) {
    const winnerColor = game.winner === 1 ? 'Rosso' : 'Ciano';
    const winCls = game.winner === 1 ? 'chip-p1' : 'chip-p2';
    statusInfo.innerHTML = '<div class="text-center">' +
      '<div class="label-small mb-2">Vincitore</div>' +
      '<div class="player-chip ' + winCls + ' turn-active mx-auto" style="display:inline-flex"><span class="dot"></span>' + winnerColor + '</div>' +
      '<div class="mt-3 text-xs text-[var(--muted)]">Connessione completata in ' + game.moves.length + ' mosse</div>' +
      '</div>';
    document.getElementById('pieRuleUI').classList.add('hidden');
    return;
  }

  const curColor = game.currentPlayer === 1 ? 'Rosso' : 'Ciano';
  const curCls = game.currentPlayer === 1 ? 'chip-p1' : 'chip-p2';
  const isAITurn = settings.mode === 'pvc' && game.currentPlayer !== game.userPlayer && !game.pieRuleAvailable;

  let html = '<div class="flex items-center justify-between mb-3"><div class="label-small">Turno</div><div class="text-xs text-[var(--muted)] font-mono">mossa ' + (game.moves.length + 1) + '</div></div>';
  html += '<div class="player-chip ' + curCls + ' turn-active w-full" style="justify-content:center"><span class="dot"></span>' + curColor + '</div>';
  if (settings.mode === 'pvc') {
    const userColor = game.userPlayer === 1 ? 'Rosso' : 'Ciano';
    const aiColor = game.userPlayer === 1 ? 'Ciano' : 'Rosso';
    const uCls = game.userPlayer === 1 ? 'text-[var(--p1-bright)]' : 'text-[var(--p2-bright)]';
    const aCls = game.userPlayer === 1 ? 'text-[var(--p2-bright)]' : 'text-[var(--p1-bright)]';
    html += '<div class="mt-2 text-center text-xs text-[var(--muted)]">Tu: <span class="font-semibold ' + uCls + '">' + userColor + '</span> · PC: <span class="font-semibold ' + aCls + '">' + aiColor + '</span></div>';
  }
  if (isAITurn) {
    html += '<div class="mt-3 text-center text-xs text-[var(--muted)] ai-thinking" style="justify-content:center"><span>PC sta pensando</span><span class="dots"><span></span><span></span><span></span></span></div>';
  }
  statusInfo.innerHTML = html;

  // Pie rule UI
  const pieUI = document.getElementById('pieRuleUI');
  if (game.pieRuleAvailable) {
    const firstMove = game.moves[0];
    const coord = coordLabel(firstMove.q) + (firstMove.r + 1);
    const moverColor = firstMove.player === 1 ? 'Rosso' : 'Ciano';
    const deciderIsUser = (settings.mode === 'pvc') ? (game.currentPlayer === game.userPlayer) : true;
    if (deciderIsUser) {
      pieUI.classList.remove('hidden');
      pieUI.innerHTML = '<div class="pie-banner">' +
        '<div class="label-small mb-1 text-[var(--accent)]">Regola della torta</div>' +
        '<div class="text-sm mb-3">Il ' + moverColor + ' ha giocato <span class="font-mono font-semibold text-[var(--accent)]">' + coord + '</span>. Vuoi scambiare la mossa?</div>' +
        '<div class="flex gap-2">' +
        '<button id="swapBtn" class="btn btn-primary flex-1 text-xs">Scambia</button>' +
        '<button id="declineBtn" class="btn flex-1 text-xs">Accetta</button>' +
        '</div></div>';
      document.getElementById('swapBtn').addEventListener('click', () => {
        game.swapPie();
        renderAll();
        if (settings.mode === 'pvc' && game.currentPlayer !== game.userPlayer) setTimeout(makeAIMove, 600);
      });
      document.getElementById('declineBtn').addEventListener('click', () => {
        game.declinePie();
        renderAll();
        if (settings.mode === 'pvc' && game.currentPlayer !== game.userPlayer) setTimeout(makeAIMove, 600);
      });
    } else {
      // L'AI sta decidendo
      pieUI.classList.remove('hidden');
      pieUI.innerHTML = '<div class="pie-banner">' +
        '<div class="label-small mb-1 text-[var(--accent)]">Regola della torta</div>' +
        '<div class="text-sm mb-2">Il ' + moverColor + ' ha giocato <span class="font-mono font-semibold text-[var(--accent)]">' + coord + '</span>.</div>' +
        '<div class="text-xs text-[var(--muted)] ai-thinking"><span>Il PC sta valutando</span><span class="dots"><span></span><span></span><span></span></span></div>' +
        '</div>';
    }
  } else {
    pieUI.classList.add('hidden');
  }
}

function renderMoveLog() {
  const log = document.getElementById('moveLog');
  document.getElementById('moveCount').textContent = game.moves.length;
  if (game.moves.length === 0) {
    log.innerHTML = '<div class="text-xs text-[var(--muted)] italic px-2">Nessuna mossa ancora</div>';
    return;
  }
  log.innerHTML = game.moves.map((m, i) => {
    const coord = coordLabel(m.q) + (m.r + 1);
    const color = m.player === 1 ? 'Rosso' : 'Ciano';
    const bg = m.player === 1 ? 'var(--p1)' : 'var(--p2)';
    const swapMark = m.swapped ? ' <span class="text-[var(--accent)] text-[10px]">swap</span>' : '';
    return '<div class="move-entry"><span class="num">' + (i + 1) + '.</span><span class="player" style="background:' + bg + '; box-shadow:0 0 6px ' + bg + '"></span><span class="text-[var(--text)]">' + color + swapMark + '</span><span class="ml-auto font-mono text-[var(--muted)]">' + coord + '</span></div>';
  }).reverse().join('');
}

function renderAll() {
  renderBoard();
  renderStatus();
  renderMoveLog();
  const overlay = document.getElementById('winOverlay');
  if (game.gameOver) {
    const winnerColor = game.winner === 1 ? 'Rosso' : 'Ciano';
    const gradStart = game.winner === 1 ? '#ff6b6b' : '#22d3ee';
    const gradEnd = game.winner === 1 ? '#ef4444' : '#06b6d4';
    overlay.classList.remove('hidden');
    overlay.innerHTML = '<div class="win-card">' +
      '<div class="label-small mb-2">Vittoria</div>' +
      '<h2 class="font-display text-5xl font-extrabold mb-2" style="background:linear-gradient(135deg, ' + gradStart + ', ' + gradEnd + '); -webkit-background-clip:text; background-clip:text; color:transparent;">' + winnerColor + '</h2>' +
      '<p class="text-sm text-[var(--muted)] mb-5">ha completato la connessione in ' + game.moves.length + ' mosse</p>' +
      '<button id="playAgainBtn" class="btn btn-primary">Gioca ancora</button>' +
      '</div>';
    document.getElementById('playAgainBtn').addEventListener('click', () => document.getElementById('newGameBtn').click());
  } else {
    overlay.classList.add('hidden');
  }
}

function handleCellClick(q, r) {
  if (game.gameOver) return;
  if (game.pieRuleAvailable) return;
  if (settings.mode === 'pvc' && game.currentPlayer !== game.userPlayer) return;
  if (game.board[r][q] !== 0) return;
  game.makeMove(q, r);
  renderAll();
  // Gestione pie rule
  if (game.pieRuleAvailable) {
    if (settings.mode === 'pvc') {
      const deciderIsUser = game.currentPlayer === game.userPlayer;
      if (!deciderIsUser) {
        // AI decide
        setTimeout(() => {
          const shouldSwap = aiDecidePie(game);
          if (shouldSwap) { game.swapPie(); showToast('Il PC ha applicato la regola della torta'); }
          else { game.declinePie(); showToast('Il PC ha accettato la mossa'); }
          renderAll();
          if (settings.mode === 'pvc' && game.currentPlayer !== game.userPlayer) setTimeout(makeAIMove, 600);
        }, 1000);
      }
    }
    return;
  }
  if (game.gameOver) return;
  // Turno AI
  if (settings.mode === 'pvc' && game.currentPlayer !== game.userPlayer) setTimeout(makeAIMove, 500);
}

function makeAIMove() {
  if (game.gameOver || game.pieRuleAvailable) return;
  if (settings.mode !== 'pvc') return;
  if (game.currentPlayer === game.userPlayer) return;
  const move = aiPickMove(game, settings.difficulty);
  if (move) {
    game.makeMove(move[0], move[1]);
    renderAll();
    // Dopo la mossa AI, se la pie rule è disponibile l'utente deve decidere
    if (game.pieRuleAvailable) return;
    if (!game.gameOver && game.currentPlayer !== game.userPlayer) setTimeout(makeAIMove, 400);
  }
}

function startNewGame() {
  let starter = settings.starter;
  if (starter === 'random') starter = Math.random() < 0.5 ? 1 : 2;
  game = new HexGame(settings.size);
  game.starter = starter;
  game.currentPlayer = starter;
  game.pieRuleEnabled = settings.pieRule;
  game.userPlayer = (settings.mode === 'pvc') ? 1 : null;
  game.mode = settings.mode;
  game.difficulty = settings.difficulty;
  renderAll();
  // Se l'AI muove per prima
  if (settings.mode === 'pvc' && starter !== game.userPlayer) setTimeout(makeAIMove, 700);
}

function showToast(message) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'all 0.3s';
    toast.style.opacity = '0';
    toast.style.transform = 'translate(-50%, 20px)';
    setTimeout(() => toast.remove(), 300);
  }, 2200);
}

function setupUI() {
  document.querySelectorAll('.seg').forEach(seg => {
    const group = seg.dataset.group;
    seg.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        seg.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const value = btn.dataset.value;
        if (group === 'mode') {
          settings.mode = value;
          document.getElementById('difficultySection').classList.toggle('hidden', value !== 'pvc');
        } else if (group === 'diff') {
          settings.difficulty = value;
        } else if (group === 'size') {
          settings.size = parseInt(value);
        } else if (group === 'starter') {
          settings.starter = value === 'random' ? 'random' : parseInt(value);
        }
      });
    });
  });
  document.getElementById('pieRule').addEventListener('change', e => { settings.pieRule = e.target.checked; });
  document.getElementById('newGameBtn').addEventListener('click', startNewGame);
  const rulesDialog = document.getElementById('rulesDialog');
  document.getElementById('rulesBtn').addEventListener('click', () => rulesDialog.showModal());
  document.getElementById('rulesCloseBtn').addEventListener('click', () => rulesDialog.close());
  rulesDialog.addEventListener('click', e => { if (e.target === rulesDialog) rulesDialog.close(); });
  // Allinea la visibilità del selettore difficoltà alla modalità attiva di default
  const activeModeBtn = document.querySelector('.seg[data-group="mode"] button.active');
  document.getElementById('difficultySection').classList.toggle('hidden', !activeModeBtn || activeModeBtn.dataset.value !== 'pvc');
}

setupUI();
startNewGame();
