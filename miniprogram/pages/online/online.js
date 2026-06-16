Page({
  data: {
    currentMode: 'create',
    playerName: '',
    roomId: '',
    selectedDifficulty: 'easy',
    waiting: false,
    currentRoomId: '',
    playerId: ''
  },
  onLoad() {
    const playerId = wx.getStorageSync('minesweeper_player_id')
    if (!playerId) {
      const newId = 'player_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8)
      wx.setStorageSync('minesweeper_player_id', newId)
      this.setData({ playerId: newId })
    } else {
      this.setData({ playerId })
    }
  },
  goBack() {
    wx.navigateBack()
  },
  switchMode(e) {
    const mode = e.currentTarget.dataset.mode
    this.setData({ currentMode: mode })
  },
  onNameInput(e) {
    this.setData({ playerName: e.detail.value })
  },
  onRoomInput(e) {
    this.setData({ roomId: e.detail.value.toUpperCase() })
  },
  selectDifficulty(e) {
    const diff = e.currentTarget.dataset.diff
    this.setData({ selectedDifficulty: diff })
  },
  generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  },
  async createRoom() {
    if (!this.data.playerName) {
      wx.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }
    
    const roomId = this.generateRoomId()
    
    wx.showLoading({ title: '创建中...' })
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'minesweeper',
        data: {
          action: 'createRoom',
          data: {
            playerId: this.data.playerId,
            playerName: this.data.playerName,
            difficulty: this.data.selectedDifficulty,
            roomId: roomId
          }
        }
      })
      
      wx.hideLoading()
      
      console.log('Create room result:', result)
      if (result.result && result.result.success) {
        wx.showToast({ 
          title: '房间创建成功！房间号: ' + roomId, 
          icon: 'none',
          duration: 3000
        })
        this.setData({ 
          waiting: true, 
          currentRoomId: roomId 
        })
        this.waitForOpponent(roomId)
      } else {
        console.log('Create room failed:', result.result)
        wx.showToast({ 
          title: result.result && result.result.error ? result.result.error : '创建失败', 
          icon: 'none' 
        })
      }
    } catch (error) {
      wx.hideLoading()
      wx.showToast({ title: '网络错误', icon: 'none' })
    }
  },
  async joinRoom() {
    if (!this.data.playerName || !this.data.roomId) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' })
      return
    }
    
    console.log('Joining room with roomId:', this.data.roomId)
    
    wx.showLoading({ title: '加入中...' })
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'minesweeper',
        data: {
          action: 'joinRoom',
          data: {
            playerId: this.data.playerId,
            roomId: this.data.roomId,
            playerName: this.data.playerName
          }
        }
      })
      
      wx.hideLoading()
      
      console.log('Join room result:', result)
      
      if (result.result && result.result.success) {
        await this.callStartGame()
      } else {
        wx.showToast({ 
          title: result.result && result.result.error ? result.result.error : '加入失败', 
          icon: 'none' 
        })
      }
    } catch (error) {
      wx.hideLoading()
      wx.showToast({ title: '网络错误', icon: 'none' })
      console.error('Join room error:', error)
    }
  },
  async waitForOpponent(roomId) {
    const checkInterval = setInterval(async () => {
      try {
        const result = await wx.cloud.callFunction({
          name: 'minesweeper',
          data: {
            action: 'getRoomState',
            data: { roomId, playerId: this.data.playerId }
          }
        })
        
        if (result.result && result.result.success) {
          const state = result.result.data
          if (state.gameState === 'ready') {
            clearInterval(checkInterval)
            this.setData({ waiting: false })
            this.callStartGame()
          }
        }
      } catch (error) {
        console.error('Check room error:', error)
      }
    }, 2000)
    
    this.setData({ checkInterval })
  },
  async cancelRoom() {
    if (this.data.checkInterval) {
      clearInterval(this.data.checkInterval)
    }
    
    try {
      await wx.cloud.callFunction({
        name: 'minesweeper',
        data: {
          action: 'deleteRoom',
          data: { roomId: this.data.currentRoomId }
        }
      })
    } catch (error) {
      console.error('Delete room error:', error)
    }
    
    this.setData({ 
      waiting: false, 
      currentRoomId: '',
      checkInterval: null
    })
  },
  async callStartGame() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'minesweeper',
        data: {
          action: 'startGame',
          data: {
            roomId: this.data.roomId,
            playerId: this.data.playerId
          }
        }
      })
      
      if (result.result && result.result.success) {
        this.startGame(this.data.roomId)
      } else {
        wx.showToast({ 
          title: result.result && result.result.error ? result.result.error : '开始游戏失败', 
          icon: 'none' 
        })
      }
    } catch (error) {
      wx.showToast({ title: '网络错误', icon: 'none' })
    }
  },
  startGame(roomId) {
    wx.navigateTo({
      url: '/pages/game/game?mode=online&roomId=' + roomId + '&playerId=' + this.data.playerId + '&playerName=' + this.data.playerName
    })
  }
})