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
    face: '🙂',
    cellSize: 44,
    mode: 'single',
    roomId: '',
    playerId: '',
    playerName: '',
    opponentName: '',
    isMyTurn: true,
    player1Score: 0,
    player2Score: 0,
    gameState: 'playing'
  },
  timer: null,
  checkInterval: null,
  firstTap: true,
  mines: [],
  revealed: [],
  flags: [],
  numbers: [],
  onLoad(options) {
    const mode = options.mode || 'single'
    this.setData({ mode })
    
    if (mode === 'online') {
      this.setData({
        roomId: options.roomId || '',
        playerId: options.playerId || '',
        playerName: options.playerName || ''
      })
      this.startOnlineGame()
    } else {
      const diff = options.difficulty || 'easy'
      const configs = {
        easy: { rows: 9, cols: 9, mines: 10 },
        medium: { rows: 16, cols: 16, mines: 40 },
        hard: { rows: 16, cols: 30, mines: 99 }
      }
      const config = configs[diff] || configs.easy
      
      const cellSizes = {
        easy: 72,
        medium: 40,
        hard: 26
      }
      const cellSize = cellSizes[diff] || 72
      
      console.log('Difficulty:', diff, 'cellSize:', cellSize)
      
      this.setData({
        rows: config.rows,
        cols: config.cols,
        mineCount: config.mines,
        cellSize,
        difficulty: diff
      })
      
      console.log('Calling initGame with:', this.data.rows, this.data.cols)
      this.initGame()
      
      console.log('After initGame, cells length:', this.data.cells.length)
    }
  },
  onUnload() {
    this.stopTimer()
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
    }
  },
  startOnlineGame() {
    this.checkRoomState()
    this.checkInterval = setInterval(() => {
      this.checkRoomState()
    }, 2000)
  },
  async checkRoomState() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'minesweeper',
        data: {
          action: 'getRoomState',
          data: { 
            roomId: this.data.roomId, 
            playerId: this.data.playerId 
          }
        }
      })
      
      if (result.result && result.result.success) {
        const state = result.result.data
        
        if (!this.data.cells || this.data.cells.length === 0) {
          const cellSizes = {
            easy: 72,
            medium: 40,
            hard: 26
          }
          const cellSize = cellSizes[state.difficulty] || 40
          this.setData({
            rows: state.rows,
            cols: state.cols,
            mineCount: state.mineCount,
            cellSize,
            player1Score: state.player1Score || 0,
            player2Score: state.player2Score || 0
          })
          this.initGame()
        } else {
          this.setData({
            cells: state.cells || [],
            isMyTurn: state.turn === this.data.playerId,
            gameState: state.gameState,
            player1Score: state.player1Score || 0,
            player2Score: state.player2Score || 0
          })
        }
        
        if (state.gameState === 'ended') {
          this.handleOnlineGameOver(state.winner === this.data.playerId)
        }
      }
    } catch (error) {
      console.error('Check room state error:', error)
    }
  },
  handleOnlineGameOver(won) {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
    }
    
    this.setData({
      showModal: true,
      isWin: won,
      face: won ? '😎' : '😵'
    })
  },
  initGame() {
    const rows = this.data.rows
    const cols = this.data.cols
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
      cells: cells,
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
    if (this.data.mode === 'online' && !this.data.isMyTurn) {
      wx.showToast({ title: '等待对手操作', icon: 'none' })
      return
    }
    
    const idx = parseInt(e.currentTarget.dataset.id)
    if (isNaN(idx)) return
    
    const status = this.data.status
    if (status !== 'playing') return
    
    if (this.data.mode === 'online') {
      this.handleOnlineTap(idx)
    } else {
      this.handleSingleTap(idx)
    }
  },
  async handleOnlineTap(idx) {
    try {
      const result = await wx.cloud.callFunction({
        name: 'minesweeper',
        data: {
          action: 'handleTap',
          data: {
            roomId: this.data.roomId,
            playerId: this.data.playerId,
            idx
          }
        }
      })
      
      if (result.result && result.result.success) {
        const data = result.result.data
        this.setData({ cells: data.cells })
      } else {
        wx.showToast({ 
          title: result.result && result.result.error ? result.result.error : '操作失败', 
          icon: 'none' 
        })
      }
    } catch (error) {
      wx.showToast({ title: '网络错误', icon: 'none' })
    }
  },
  handleSingleTap(idx) {
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
    if (this.data.mode === 'online' && !this.data.isMyTurn) {
      wx.showToast({ title: '等待对手操作', icon: 'none' })
      return
    }
    
    const idx = parseInt(e.currentTarget.dataset.id)
    if (isNaN(idx)) return
    
    if (this.data.mode === 'online') {
      this.handleOnlineLongPress(idx)
    } else {
      this.handleSingleLongPress(idx)
    }
  },
  async handleOnlineLongPress(idx) {
    try {
      const result = await wx.cloud.callFunction({
        name: 'minesweeper',
        data: {
          action: 'handleLongPress',
          data: {
            roomId: this.data.roomId,
            playerId: this.data.playerId,
            idx
          }
        }
      })
      
      if (result.result && result.result.success) {
        const data = result.result.data
        this.setData({ cells: data.cells })
      } else {
        wx.showToast({ 
          title: result.result && result.result.error ? result.result.error : '操作失败', 
          icon: 'none' 
        })
      }
    } catch (error) {
      wx.showToast({ title: '网络错误', icon: 'none' })
    }
  },
  handleSingleLongPress(idx) {
    const status = this.data.status
    if (status !== 'playing') return
    if (this.revealed[idx]) return
    
    this.flags[idx] = !this.flags[idx]
    this.updateCell(idx)
    
    this.setData({
      flagCount: this.data.flagCount + (this.flags[idx] ? 1 : -1)
    })
  },
  placeMines(excludeIdx) {
    const rows = this.data.rows
    const cols = this.data.cols
    const mineCount = this.data.mineCount
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
    const rows = this.data.rows
    const cols = this.data.cols
    let count = 0
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],          [0, 1],
      [1, -1],  [1, 0], [1, 1]
    ]
    
    for (let i = 0; i < directions.length; i++) {
      const dr = directions[i][0]
      const dc = directions[i][1]
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
    const rows = this.data.rows
    const cols = this.data.cols
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
        for (let j = 0; j < directions.length; j++) {
          revealCell(r + directions[j][0], c + directions[j][1])
        }
      }
    }
    
    revealCell(row, col)
  },
  updateCell(idx) {
    const cells = this.data.cells.slice()
    
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
    
    this.setData({ cells: cells })
  },
  checkWin() {
    const mineCount = this.data.mineCount
    const total = this.revealed.length
    let revealedCount = 0
    for (let i = 0; i < this.revealed.length; i++) {
      if (this.revealed[i]) revealedCount++
    }
    
    if (revealedCount === total - mineCount) {
      this.gameOver(true)
    }
  },
  gameOver(won) {
    this.stopTimer()
    
    if (!won) {
      this.showAllMines()
    }
    
    if (this.data.mode === 'single') {
      this.saveScore(won)
    }
    
    this.setData({
      status: won ? 'won' : 'lost',
      showModal: true,
      isWin: won,
      face: won ? '😎' : '😵'
    })
  },
  showAllMines() {
    const rows = this.data.rows
    const cols = this.data.cols
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
  async saveScore(won) {
    if (!won) return
    
    console.log('Saving score, time:', this.data.time, 'difficulty:', this.data.difficulty)
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'minesweeper',
        data: {
          action: 'saveScore',
          data: {
            time: this.data.time,
            difficulty: this.data.difficulty || 'easy',
            won: true,
            mode: 'single',
            playerName: ''
          }
        }
      })
      
      console.log('Save score result:', result)
      
      if (result.result && result.result.success) {
        wx.showToast({ title: '分数已保存', icon: 'success', duration: 1500 })
      } else {
        const errorMsg = result.result?.error || '未知错误'
        wx.showToast({ title: '保存失败: ' + errorMsg, icon: 'none', duration: 3000 })
      }
      
      const bestTime = wx.getStorageSync('minesweeper_best_time')
      if (!bestTime || this.data.time < bestTime) {
        wx.setStorageSync('minesweeper_best_time', this.data.time)
      }
      
      const winCount = wx.getStorageSync('minesweeper_win_count') || 0
      wx.setStorageSync('minesweeper_win_count', winCount + 1)
    } catch (error) {
      console.error('Save score error:', error)
      wx.showToast({ title: '网络错误，分数未保存', icon: 'none', duration: 1500 })
    }
  },
  startTimer() {
    this.timer = setInterval(() => {
      const newTime = this.data.time + 1
      const mins = Math.floor(newTime / 60)
      const secs = newTime % 60
      this.setData({ 
        time: newTime,
        displayTime: mins + ':' + secs.toString().padStart(2, '0')
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
    if (this.data.mode === 'online') {
      wx.showToast({ title: '联机模式请重新创建房间', icon: 'none' })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } else {
      this.initGame()
    }
  },
  goHome() {
    wx.navigateBack()
  }
})