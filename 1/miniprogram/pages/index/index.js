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
    console.log('selectDifficulty called!')
    const difficulty = e.currentTarget.dataset.diff
    console.log('selected difficulty:', difficulty)
    this.setData({ selectedDifficulty: difficulty })
  },

  startGame() {
    console.log('startGame called!')
    console.log('selectedDifficulty:', this.data.selectedDifficulty)
    wx.navigateTo({
      url: `/pages/game/game?difficulty=${this.data.selectedDifficulty}`
    })
  },

  loadStats() {
    const db = wx.cloud.database()
    db.collection('minesweeper')
      .orderBy('time', 'asc')
      .limit(1)
      .get()
      .then(res => {
        if (res.data.length > 0) {
          this.setData({ bestTime: this.formatTime(res.data[0].time) })
        }
      })
      .catch(err => {
        console.error('获取最佳时间失败:', err)
      })

    db.collection('minesweeper')
      .where({ won: true })
      .count()
      .then(res => {
        this.setData({ winCount: res.total })
      })
      .catch(err => {
        console.error('获取胜利次数失败:', err)
      })
  },

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
})