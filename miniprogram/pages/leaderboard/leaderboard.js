Page({
  data: {
    currentFilter: 'all',
    leaderboard: []
  },
  onLoad() {
    this.testConnection()
    this.loadLeaderboard()
  },
  goBack() {
    wx.navigateBack()
  },
  selectFilter(e) {
    const filter = e.currentTarget.dataset.filter
    this.setData({ currentFilter: filter })
    this.loadLeaderboard()
  },
  async loadLeaderboard() {
    wx.showLoading({ title: '加载中...' })
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'minesweeper',
        data: {
          action: 'getLeaderboard',
          data: {
            difficulty: this.data.currentFilter,
            limit: 20
          }
        }
      })
      
      wx.hideLoading()
      
      console.log('Leaderboard result:', result)
      
      if (result.result && result.result.success) {
        console.log('Leaderboard data:', JSON.stringify(result.result.data))
        const formattedData = result.result.data.map(item => ({
          ...item,
          formattedTime: this.formatTime(item.time)
        }))
        console.log('Formatted data:', JSON.stringify(formattedData))
        this.setData({ leaderboard: formattedData })
      } else {
        wx.showToast({ title: '加载失败', icon: 'none' })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('Leaderboard error:', error)
      wx.showToast({ title: '网络错误', icon: 'none' })
    }
  },
  getDifficultyText(diff) {
    const map = {
      easy: '简单',
      medium: '中等',
      hard: '困难'
    }
    return map[diff] || diff
  },
  formatTime(seconds) {
    console.log('formatTime called with:', seconds, 'type:', typeof seconds)
    const numSeconds = parseInt(seconds)
    if (isNaN(numSeconds) || numSeconds < 0) return '--:--'
    const mins = Math.floor(numSeconds / 60)
    const secs = numSeconds % 60
    const result = mins + ':' + secs.toString().padStart(2, '0')
    console.log('formatTime result:', result)
    return result
  },
  async testConnection() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'minesweeper',
        data: { action: 'testDb' }
      })
      console.log('DB test result:', result)
      if (result.result && result.result.success) {
        wx.showToast({ title: '云函数连接成功', icon: 'success', duration: 2000 })
      } else {
        wx.showToast({ title: '云函数连接失败', icon: 'none', duration: 2000 })
      }
    } catch (error) {
      console.error('Connection test error:', error)
      wx.showToast({ title: '云函数未部署', icon: 'none', duration: 2000 })
    }
  },
  async testSaveScore() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'minesweeper',
        data: {
          action: 'saveScore',
          data: {
            time: 120,
            difficulty: 'easy',
            won: true,
            mode: 'single',
            playerName: '测试玩家'
          }
        }
      })
      console.log('Save test result:', result)
      if (result.result && result.result.success) {
        wx.showToast({ title: '测试分数保存成功', icon: 'success', duration: 2000 })
        this.loadLeaderboard()
      } else {
        wx.showToast({ title: '保存失败: ' + (result.result?.error || '未知错误'), icon: 'none', duration: 2000 })
      }
    } catch (error) {
      console.error('Save test error:', error)
      wx.showToast({ title: '保存失败: ' + error.message, icon: 'none', duration: 2000 })
    }
  }
})