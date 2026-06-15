const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { action, data } = event

  switch (action) {
    case 'getBestScore': {
      const result = await db.collection('minesweeper')
        .orderBy('time', 'asc')
        .limit(1)
        .get()
      return {
        success: true,
        data: result.data.length > 0 ? result.data[0] : null
      }
    }

    case 'getWinCount': {
      const result = await db.collection('minesweeper')
        .where({ won: true })
        .count()
      return {
        success: true,
        data: result.total
      }
    }

    case 'addScore': {
      const result = await db.collection('minesweeper').add({
        data: {
          time: data.time,
          difficulty: data.difficulty,
          won: true,
          createdAt: db.serverDate()
        }
      })
      return {
        success: true,
        data: result._id
      }
    }

    case 'getHistory': {
      const result = await db.collection('minesweeper')
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get()
      return {
        success: true,
        data: result.data
      }
    }

    default: {
      return {
        success: false,
        error: 'Unknown action'
      }
    }
  }
}