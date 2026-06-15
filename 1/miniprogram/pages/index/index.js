Page({
  data: {
    bestTime: '--',
    winCount: 0,
    selectedDifficulty: 'easy'
  },

  onLoad() {
    this.loadStats()
  },

  selectDifficulty(e) {
    const difficulty = e.currentTarget.dataset.diff
    this.setData({ selectedDifficulty: difficulty })
  },

  startGame() {
    wx.navigateTo({
      url: `/pages/game/game?difficulty=${this.data.selectedDifficulty}`
    })
  },

  loadStats() {
    const bestTime = wx.getStorageSync('minesweeper_best_time')
    const winCount = wx.getStorageSync('minesweeper_win_count') || 0
    
    if (bestTime) {
      this.setData({ bestTime: this.formatTime(bestTime) })
    }
    this.setData({ winCount })
  },

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
})