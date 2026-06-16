Page({
  data: {
    bestTime: '--',
    winCount: 0,
    selectedDifficulty: 'easy',
    selectedMode: 'single'
  },
  onLoad() {
    this.loadStats()
  },
  selectSingleMode() {
    this.setData({ selectedMode: 'single' })
  },
  goOnline() {
    wx.navigateTo({ url: '/pages/online/online' })
  },
  selectDifficulty(e) {
    const difficulty = e.currentTarget.dataset.diff
    this.setData({ selectedDifficulty: difficulty })
  },
  startGame() {
    wx.navigateTo({
      url: '/pages/game/game?difficulty=' + this.data.selectedDifficulty + '&mode=single'
    })
  },
  goLeaderboard() {
    wx.navigateTo({ url: '/pages/leaderboard/leaderboard' })
  },
  goRules() {
    wx.navigateTo({ url: '/pages/rules/rules' })
  },
  async testCloud() {
    wx.showLoading({ title: '测试中...' })
    try {
      const result = await wx.cloud.callFunction({
        name: 'minesweeper',
        data: { action: 'testDb' }
      })
      wx.hideLoading()
      console.log('Cloud test result:', result)
      if (result.result && result.result.success) {
        wx.showToast({ title: '云函数正常！数据:' + result.result.data.count, icon: 'success', duration: 3000 })
      } else {
        const errorMsg = result.result?.error || '未知错误'
        wx.showToast({ title: '失败: ' + errorMsg, icon: 'none', duration: 3000 })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('Cloud test error:', error)
      wx.showToast({ title: '调用失败: ' + error.message, icon: 'none', duration: 3000 })
    }
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
    return mins + ':' + secs.toString().padStart(2, '0')
  }
})