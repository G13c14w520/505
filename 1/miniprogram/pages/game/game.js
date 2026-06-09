Page({
  data: {
    board: [],
    rows: 9,
    cols: 9,
    minesCount: 10,
    flagCount: 0,
    gameTime: 0,
    gameStatus: 'playing',
    showModal: false,
    isWin: false,
    isNewRecord: false,
    difficulty: 'easy'
  },

  timer: null,
  firstClick: true,

  onLoad(options) {
    const difficulty = options.difficulty || 'easy'
    this.setDifficulty(difficulty)
    this.initGame()
  },

  setDifficulty(difficulty) {
    const configs = {
      easy: { rows: 9, cols: 9, mines: 10 },
      medium: { rows: 16, cols: 16, mines: 40 },
      hard: { rows: 16, cols: 30, mines: 99 }
    }
    const config = configs[difficulty] || configs.easy
    this.setData({
      rows: config.rows,
      cols: config.cols,
      minesCount: config.mines,
      difficulty: difficulty
    })
  },

  initGame() {
    const { rows, cols } = this.data
    const board = []
    
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        board.push({
          id: `${r}-${c}`,
          row: r,
          col: c,
          mine: false,
          revealed: false,
          flagged: false,
          adjacentMines: 0,
          displayText: ''
        })
      }
    }

    this.setData({
      board,
      flagCount: 0,
      gameTime: 0,
      gameStatus: 'playing',
      showModal: false,
      isWin: false,
      isNewRecord: false
    })
    this.firstClick = true
    this.stopTimer()
  },

  placeMines(excludeRow, excludeCol) {
    const { board, rows, cols, minesCount } = this.data
    const newBoard = [...board]
    let placed = 0

    while (placed < minesCount) {
      const r = Math.floor(Math.random() * rows)
      const c = Math.floor(Math.random() * cols)
      
      if (Math.abs(r - excludeRow) <= 1 && Math.abs(c - excludeCol) <= 1) continue
      
      const idx = r * cols + c
      if (!newBoard[idx].mine) {
        newBoard[idx].mine = true
        placed++
      }
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c
        if (!newBoard[idx].mine) {
          newBoard[idx].adjacentMines = this.countMines(newBoard, r, c)
        }
      }
    }

    this.setData({ board: newBoard })
  },

  countMines(board, row, col) {
    const { rows, cols } = this.data
    let count = 0
    const dirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]
    
    for (const [dr, dc] of dirs) {
      const nr = row + dr
      const nc = col + dc
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        if (board[nr * cols + nc].mine) count++
      }
    }
    return count
  },

  handleTap(e) {
    if (this.data.gameStatus !== 'playing') return
    
    const index = Number(e.currentTarget.dataset.index)
    if (isNaN(index)) return

    const cell = this.data.board[index]
    if (cell.revealed || cell.flagged) return

    if (this.firstClick) {
      this.firstClick = false
      const row = Math.floor(index / this.data.cols)
      const col = index % this.data.cols
      this.placeMines(row, col)
      this.startTimer()
    }

    if (this.data.board[index].mine) {
      this.gameOver(false)
      return
    }

    this.revealCell(index)
    this.checkWin()
  },

  handleLongPress(e) {
    if (this.data.gameStatus !== 'playing') return
    
    const index = Number(e.currentTarget.dataset.index)
    if (isNaN(index)) return

    const cell = this.data.board[index]
    if (cell.revealed) return

    const newBoard = [...this.data.board]
    newBoard[index].flagged = !newBoard[index].flagged
    newBoard[index].displayText = newBoard[index].flagged ? '🚩' : ''

    this.setData({
      board: newBoard,
      flagCount: this.data.flagCount + (newBoard[index].flagged ? 1 : -1)
    })

    wx.vibrateShort({})
  },

  revealCell(index) {
    const { board, cols } = this.data
    const row = Math.floor(index / cols)
    const col = index % cols

    const newBoard = [...board]
    
    const reveal = (r, c) => {
      if (r < 0 || r >= this.data.rows || c < 0 || c >= cols) return
      const idx = r * cols + c
      if (newBoard[idx].revealed || newBoard[idx].flagged) return

      newBoard[idx].revealed = true
      
      if (newBoard[idx].mine) {
        newBoard[idx].displayText = '💣'
      } else if (newBoard[idx].adjacentMines > 0) {
        newBoard[idx].displayText = newBoard[idx].adjacentMines.toString()
      } else {
        newBoard[idx].displayText = ''
        const dirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]
        for (const [dr, dc] of dirs) {
          reveal(r + dr, c + dc)
        }
      }
    }

    reveal(row, col)
    this.setData({ board: newBoard })
  },

  checkWin() {
    const { board, minesCount } = this.data
    const revealedCount = board.filter(c => c.revealed).length
    
    if (revealedCount === board.length - minesCount) {
      this.gameOver(true)
    }
  },

  gameOver(won) {
    this.stopTimer()
    
    if (!won) {
      this.showAllMines()
    }

    this.setData({
      gameStatus: won ? 'won' : 'lost',
      showModal: true,
      isWin: won
    })

    if (won) {
      this.saveScore()
    }
  },

  showAllMines() {
    const newBoard = this.data.board.map(cell => {
      if (cell.mine) {
        return {
          ...cell,
          revealed: true,
          displayText: '💣'
        }
      }
      return cell
    })
    this.setData({ board: newBoard })
  },

  startTimer() {
    this.timer = setInterval(() => {
      this.setData({ gameTime: this.data.gameTime + 1 })
    }, 1000)
  },

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  },

  saveScore() {
    const db = wx.cloud.database()
    
    db.collection('minesweeper')
      .orderBy('time', 'asc')
      .limit(1)
      .get()
      .then(res => {
        const isNewRecord = res.data.length === 0 || this.data.gameTime < res.data[0].time
        this.setData({ isNewRecord })

        return db.collection('minesweeper').add({
          data: {
            time: this.data.gameTime,
            difficulty: this.data.difficulty,
            won: true,
            createdAt: db.serverDate()
          }
        })
      })
      .catch(err => {
        console.error('保存分数失败:', err)
      })
  },

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  },

  get gameStatusIcon() {
    switch (this.data.gameStatus) {
      case 'won': return '😎'
      case 'lost': return '😵'
      default: return '🙂'
    }
  },

  restartGame() {
    this.initGame()
  },

  goHome() {
    this.stopTimer()
    wx.navigateBack()
  },

  onUnload() {
    this.stopTimer()
  }
})