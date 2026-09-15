// Modello del gioco: stato della board, mosse, regola della torta, rilevamento vittoria.
class HexGame {
  constructor(size) {
    this.size = size;
    this.board = Array(size).fill(null).map(() => Array(size).fill(0));
    this.currentPlayer = 1;
    this.starter = 1;
    this.gameOver = false;
    this.winner = null;
    this.moves = [];
    this.pieRuleEnabled = true;
    this.pieRuleAvailable = false;
    this.pieRuleUsed = false;
    this.winPath = null;
    this.userPlayer = null; // in modalità PVC: 1 (sempre Rosso)
    this.mode = 'pvp';
    this.difficulty = 'medium';
  }

  makeMove(q, r) {
    if (this.gameOver || this.board[r][q] !== 0 || this.pieRuleAvailable) return false;
    const movingPlayer = this.currentPlayer;
    this.board[r][q] = movingPlayer;
    this.moves.push({ q, r, player: movingPlayer, swapped: false });

    const winPath = this.findWinPath(movingPlayer);
    if (winPath) {
      this.gameOver = true;
      this.winner = movingPlayer;
      this.winPath = winPath;
      return true;
    }

    // Dopo la prima mossa, rendi disponibile la pie rule
    if (this.moves.length === 1 && this.pieRuleEnabled && !this.pieRuleUsed) {
      this.pieRuleAvailable = true;
      this.currentPlayer = 3 - movingPlayer;
      return true;
    }
    this.currentPlayer = 3 - movingPlayer;
    return true;
  }

  swapPie() {
    if (!this.pieRuleAvailable || this.pieRuleUsed) return false;
    const firstMove = this.moves[0];
    const otherPlayer = 3 - firstMove.player;
    this.board[firstMove.r][firstMove.q] = otherPlayer;
    firstMove.player = otherPlayer;
    firstMove.swapped = true;
    this.pieRuleUsed = true;
    this.pieRuleAvailable = false;
    this.currentPlayer = this.starter;
    return true;
  }

  declinePie() {
    if (!this.pieRuleAvailable || this.pieRuleUsed) return false;
    this.pieRuleAvailable = false;
    return true;
  }

  findWinPath(player) {
    const N = this.size;
    const visited = Array(N).fill(null).map(() => Array(N).fill(false));
    const parent = Array(N).fill(null).map(() => Array(N).fill(null));
    const queue = [];
    const isStart = (q, r) => player === 1 ? r === 0 : q === 0;
    const isEnd = (q, r) => player === 1 ? r === N - 1 : q === N - 1;
    for (let r = 0; r < N; r++) {
      for (let q = 0; q < N; q++) {
        if (isStart(q, r) && this.board[r][q] === player) {
          visited[r][q] = true;
          queue.push([q, r]);
        }
      }
    }
    const neighbors = [[1,0],[-1,0],[0,1],[0,-1],[1,-1],[-1,1]];
    while (queue.length > 0) {
      const [q, r] = queue.shift();
      if (isEnd(q, r)) {
        const path = [];
        let cur = [q, r];
        while (cur) { path.push(cur); cur = parent[cur[1]][cur[0]]; }
        return path;
      }
      for (const [dq, dr] of neighbors) {
        const nq = q + dq, nr = r + dr;
        if (nq >= 0 && nq < N && nr >= 0 && nr < N && !visited[nr][nq] && this.board[nr][nq] === player) {
          visited[nr][nq] = true;
          parent[nr][nq] = [q, r];
          queue.push([nq, nr]);
        }
      }
    }
    return null;
  }

  getEmptyCells() {
    const cells = [];
    for (let r = 0; r < this.size; r++)
      for (let q = 0; q < this.size; q++)
        if (this.board[r][q] === 0) cells.push([q, r]);
    return cells;
  }
}
