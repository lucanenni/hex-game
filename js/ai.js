// Intelligenza artificiale: valutazione tramite distanza minima (Dijkstra) e ricerca greedy/minimax.

function shortestPathLength(board, size, player) {
  // Dijkstra: costo 0 per proprie celle, 1 per vuote, infinito per avversario
  const dist = Array(size).fill(null).map(() => Array(size).fill(Infinity));
  const visited = Array(size).fill(null).map(() => Array(size).fill(false));
  const pq = [];
  function cost(q, r) {
    if (board[r][q] === player) return 0;
    if (board[r][q] === 0) return 1;
    return Infinity;
  }
  for (let i = 0; i < size; i++) {
    const q = player === 1 ? i : 0;
    const r = player === 1 ? 0 : i;
    const c = cost(q, r);
    if (c < Infinity) { dist[r][q] = c; pq.push([q, r, c]); }
  }
  while (pq.length > 0) {
    let minIdx = 0;
    for (let i = 1; i < pq.length; i++) if (pq[i][2] < pq[minIdx][2]) minIdx = i;
    const [q, r, d] = pq.splice(minIdx, 1)[0];
    if (visited[r][q]) continue;
    visited[r][q] = true;
    if (d > dist[r][q]) continue;
    if ((player === 1 && r === size - 1) || (player === 2 && q === size - 1)) return d;
    for (const [dq, dr] of [[1,0],[-1,0],[0,1],[0,-1],[1,-1],[-1,1]]) {
      const nq = q + dq, nr = r + dr;
      if (nq >= 0 && nq < size && nr >= 0 && nr < size && !visited[nr][nq]) {
        const c = cost(nq, nr);
        if (c === Infinity) continue;
        const nd = d + c;
        if (nd < dist[nr][nq]) { dist[nr][nq] = nd; pq.push([nq, nr, nd]); }
      }
    }
  }
  return Infinity;
}

function evaluateForPlayer(game, player) {
  const myPath = shortestPathLength(game.board, game.size, player);
  const oppPath = shortestPathLength(game.board, game.size, 3 - player);
  if (myPath === 0) return 100000;
  if (oppPath === 0) return -100000;
  return (oppPath - myPath * 1.15) * 10;
}

function aiPickMove(game, difficulty) {
  const player = game.currentPlayer;
  const empties = game.getEmptyCells();
  if (empties.length === 0) return null;
  // Apertura: preferisci il centro
  if (game.moves.length === 0 || (game.moves.length === 1 && game.pieRuleUsed)) {
    const N = game.size;
    const c = Math.floor(N / 2);
    const candidates = [[c,c],[c-1,c],[c+1,c],[c,c-1],[c,c+1],[c-1,c+1],[c+1,c-1]];
    for (const [q, r] of candidates) {
      if (q >= 0 && q < N && r >= 0 && r < N && game.board[r][q] === 0) {
        if (difficulty === 'easy' && Math.random() < 0.4) break;
        return [q, r];
      }
    }
  }
  if (difficulty === 'easy') {
    // 50% casuale, 50% greedy
    if (Math.random() < 0.5) return empties[Math.floor(Math.random() * empties.length)];
    return greedyMove(game, empties, player);
  }
  if (difficulty === 'medium') return greedyMove(game, empties, player);
  return minimaxMove(game, empties, player);
}

function greedyMove(game, empties, player) {
  let bestScore = -Infinity, bestMove = empties[0];
  for (const [q, r] of empties) {
    game.board[r][q] = player;
    const myPath = shortestPathLength(game.board, game.size, player);
    const oppPath = shortestPathLength(game.board, game.size, 3 - player);
    game.board[r][q] = 0;
    const score = (oppPath - myPath * 1.15) + Math.random() * 0.3;
    if (score > bestScore) { bestScore = score; bestMove = [q, r]; }
  }
  return bestMove;
}

function rankedMoves(game, player, empties) {
  const scored = empties.map(([q, r]) => {
    game.board[r][q] = player;
    const myPath = shortestPathLength(game.board, game.size, player);
    const oppPath = shortestPathLength(game.board, game.size, 3 - player);
    game.board[r][q] = 0;
    return { q, r, score: oppPath - myPath * 1.15 };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

// Alpha-beta a profondità limitata: esplora alternanze di mosse (non solo la
// risposta immediata dell'avversario) per dare all'IA "difficile" una reale
// visione tattica su più semi-mosse, con potatura per restare veloce anche
// su board 13x13.
const SEARCH_DEPTH = 4; // AI, avversario, AI, avversario
const BRANCH_LIMITS = [8, 6, 5, 4]; // candidati esplorati per livello di profondità

function alphaBeta(game, depth, alpha, beta, toMove, aiPlayer) {
  const empties = game.getEmptyCells();
  if (depth === 0 || empties.length === 0) return evaluateForPlayer(game, aiPlayer);

  const limit = BRANCH_LIMITS[BRANCH_LIMITS.length - depth] ?? BRANCH_LIMITS[BRANCH_LIMITS.length - 1];
  const candidates = rankedMoves(game, toMove, empties).slice(0, Math.min(limit, empties.length));
  const maximizing = toMove === aiPlayer;
  let best = maximizing ? -Infinity : Infinity;

  for (const { q, r } of candidates) {
    game.board[r][q] = toMove;
    let score;
    if (game.findWinPath(toMove)) {
      // Preferisci vittorie più rapide e sconfitte più lontane nel tempo.
      score = (toMove === aiPlayer ? 100000 : -100000) + (maximizing ? -depth : depth);
    } else {
      score = alphaBeta(game, depth - 1, alpha, beta, 3 - toMove, aiPlayer);
    }
    game.board[r][q] = 0;

    if (maximizing) {
      if (score > best) best = score;
      alpha = Math.max(alpha, score);
    } else {
      if (score < best) best = score;
      beta = Math.min(beta, score);
    }
    if (beta <= alpha) break;
  }
  return best;
}

function minimaxMove(game, empties, player) {
  const candidates = rankedMoves(game, player, empties).slice(0, Math.min(BRANCH_LIMITS[0], empties.length));
  let bestScore = -Infinity, bestMove = [candidates[0].q, candidates[0].r];
  let alpha = -Infinity;
  const beta = Infinity;
  for (const { q, r } of candidates) {
    game.board[r][q] = player;
    let score;
    if (game.findWinPath(player)) {
      game.board[r][q] = 0;
      return [q, r];
    }
    score = alphaBeta(game, SEARCH_DEPTH - 1, alpha, beta, 3 - player, player);
    game.board[r][q] = 0;
    if (score > bestScore) { bestScore = score; bestMove = [q, r]; }
    alpha = Math.max(alpha, score);
  }
  return bestMove;
}

function aiDecidePie(game) {
  // L'AI swappa se la prima mossa è troppo forte (vicina al centro)
  if (game.difficulty === 'easy' && Math.random() < 0.35) return Math.random() < 0.5;
  const firstMove = game.moves[0];
  const N = game.size;
  const center = (N - 1) / 2;
  const dq = firstMove.q - center;
  const dr = firstMove.r - center;
  const dist = (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
  const threshold = N <= 7 ? 1.5 : N <= 11 ? 2 : 2.5;
  return dist <= threshold;
}
