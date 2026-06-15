Page({
  data: {
    cells: [],
    rows: 9,
    cols: 9,
    mineCount: 10,
    flagCount: 0,
    time: 0,
    status: 'playing',
    showModal: false,
    isWin: false,
    displayTime: '0:00',
    face: '🙂'
  },

  timer: null,
  firstTap: true,
  mines: [],
  revealed: [],
  flags: [],
  numbers: [],

  onLoad(options) {
    const diff = options.difficulty || 'easy'
    const configs = {
      easy: { rows: 9, cols: 9, mines: 10 },
      medium: { rows: 16, cols: 16, mines: 40 },
      hard: { rows: 16, cols: 30, mines: 99 }
    }
    const config = configs[diff] || configs.easy
    this.setData({
      rows: config.rows,
      cols: config.cols,
      mineCount: config.mines
    })
    this.initGame()
  },

  initGame() {
    const { rows, cols } = this.data
    const total = rows * cols
    
    this.mines = new Array(total).fill(false)
    this.revealed = new Array(total).fill(false)
    this.flags = new Array(total).fill(false)
    this.numbers = new Array(total).fill(0)
    
    const cells = []
    for (let i = 0; i < total; i++) {
      cells.push({ id: i, text: '', class: 'cell-hidden' })
    }
    
    this.setData({
      cells,
      flagCount: 0,
      time: 0,
      status: 'playing',
      showModal: false,
      isWin: false,
      displayTime: '0:00',
      face: '🙂'
    })
    this.firstTap = true
    this.stopTimer()
  },

  handleTap(e) {
    const idx = parseInt(e.currentTarget.dataset.id)
    if (isNaN(idx)) return
    
    const { status } = this.data
    if (status !== 'playing') return
    if (this.revealed[idx]) return
    if (this.flags[idx]) return

    if (this.firstTap) {
      this.firstTap = false
      this.placeMines(idx)
      this.startTimer()
    }

    if (this.mines[idx]) {
      this.gameOver(false)
      return
    }

    this.reveal(idx)
    this.checkWin()
  },

  handleLongPress(e) {
    const idx = parseInt(e.currentTarget.dataset.id)
    if (isNaN(idx)) return
    
    const { status } = this.data
    if (status !== 'playing') return
    if (this.revealed[idx]) return

    this.flags[idx] = !this.flags[idx]
    this.updateCell(idx)
    
    this.setData({
      flagCount: this.data.flagCount + (this.flags[idx] ? 1 : -1)
    })
  },

  placeMines(excludeIdx) {
    const { rows, cols, mineCount } = this.data
    const total = rows * cols
    const excludeRow = Math.floor(excludeIdx / cols)
    const excludeCol = excludeIdx % cols
    
    this.mines.fill(false)
    this.numbers.fill(0)
    
    let placed = 0
    while (placed < mineCount) {
      const r = Math.floor(Math.random() * rows)
      const c = Math.floor(Math.random() * cols)
      
      const distRow = Math.abs(r - excludeRow)
      const distCol = Math.abs(c - excludeCol)
      if (distRow <= 1 && distCol <= 1) continue
      
      const idx = r * cols + c
      if (!this.mines[idx]) {
        this.mines[idx] = true
        placed++
      }
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c
        if (!this.mines[idx]) {
          this.numbers[idx] = this.countAdjacentMines(r, c)
        }
      }
    }
  },

  countAdjacentMines(row, col) {
    const { rows, cols } = this.data
    let count = 0
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],          [0, 1],
      [1, -1],  [1, 0], [1, 1]
    ]
    
    for (const [dr, dc] of directions) {
      const nr = row + dr
      const nc = col + dc
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        const idx = nr * cols + nc
        if (this.mines[idx]) {
          count++
        }
      }
    }
    return count
  },

  reveal(idx) {
    const { rows, cols } = this.data
    const row = Math.floor(idx / cols)
    const col = idx % cols

    const revealCell = (r, c) => {
      if (r < 0 || r >= rows || c < 0 || c >= cols) return
      const i = r * cols + c
      if (this.revealed[i] || this.flags[i]) return

      this.revealed[i] = true
      
      if (this.mines[i]) {
        this.updateCell(i)
      } else if (this.numbers[i] > 0) {
        this.updateCell(i)
      } else {
        this.updateCell(i)
        const directions = [
          [-1, -1], [-1, 0], [-1, 1],
          [0, -1],          [0, 1],
          [1, -1],  [1, 0], [1, 1]
        ]
        for (const [dr, dc] of directions) {
          revealCell(r + dr, c + dc)
        }
      }
    }

    revealCell(row, col)
  },

  updateCell(idx) {
    const cells = [...this.data.cells]
    const row = Math.floor(idx / this.data.cols)
    const col = idx % this.data.cols
    
    if (this.flags[idx]) {
      cells[idx] = { id: idx, text: '🚩', class: 'cell-flagged' }
    } else if (this.revealed[idx]) {
      if (this.mines[idx]) {
        cells[idx] = { id: idx, text: '💣', class: 'cell-mine' }
      } else if (this.numbers[idx] > 0) {
        cells[idx] = { id: idx, text: this.numbers[idx].toString(), class: 'cell-number-' + this.numbers[idx] }
      } else {
        cells[idx] = { id: idx, text: '', class: 'cell-revealed' }
      }
    } else {
      cells[idx] = { id: idx, text: '', class: 'cell-hidden' }
    }
    
    this.setData({ cells })
  },

  checkWin() {
    const { mineCount } = this.data
    const total = this.revealed.length
    const revealedCount = this.revealed.filter(v => v).length
    
    if (revealedCount === total - mineCount) {
      this.gameOver(true)
    }
  },

  gameOver(won) {
    this.stopTimer()
    
    if (!won) {
      this.showAllMines()
    }

    this.setData({
      status: won ? 'won' : 'lost',
      showModal: true,
      isWin: won,
      face: won ? '😎' : '😵'
    })
  },

  showAllMines() {
    const { rows, cols } = this.data
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c
        if (this.mines[idx]) {
          this.revealed[idx] = true
          this.updateCell(idx)
        }
      }
    }
  },

  startTimer() {
    this.timer = setInterval(() => {
      const newTime = this.data.time + 1
      const mins = Math.floor(newTime / 60)
      const secs = newTime % 60
      this.setData({ 
        time: newTime,
        displayTime: `${mins}:${secs.toString().padStart(2, '0')}`
      })
    }, 1000)
  },

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  },

  restart() {
    this.initGame()
  },

  goHome() {
    wx.navigateBack()
  },

  showAllMinesDebug() {
    const { cells, rows, cols } = this.data
    const newCells = [...cells]
    
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c
        if (this.mines[idx]) {
          newCells[idx] = { id: idx, text: '💣', class: 'cell-mine-show' }
        } else if (this.revealed[idx]) {
          const actualMines = this.countAdjacentMines(r, c)
          const displayed = this.numbers[idx]
          if (actualMines !== displayed) {
            newCells[idx] = { id: idx, text: `${displayed}≠${actualMines}`, class: 'cell-error' }
          } else {
            newCells[idx] = { id: idx, text: displayed.toString(), class: 'cell-number-' + displayed }
          }
        }
      }
    }
    
    this.setData({ cells: newCells })
    wx.showToast({ title: '地雷已显示', duration: 5000 })
  }
})