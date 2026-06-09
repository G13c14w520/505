const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { action } = event

  switch (action) {
    case 'getBestTime':
      return await getBestTime(event)
    case 'getWinCount':
      return await getWinCount(event)
    case 'saveScore':
      return await saveScore(event)
    case 'getRanking':
      return await getRanking(event)
    default:
      return { success: false, message: 'Unknown action' }
  }
}

async function getBestTime(event) {
  try {
    const res = await db.collection('minesweeper')
      .orderBy('time', 'asc')
      .limit(1)
      .get()
    return {
      success: true,
      data: res.data.length > 0 ? res.data[0] : null
    }
  } catch (err) {
    return { success: false, message: err.message }
  }
}

async function getWinCount(event) {
  try {
    const res = await db.collection('minesweeper')
      .where({ won: true })
      .count()
    return {
      success: true,
      data: res.total
    }
  } catch (err) {
    return { success: false, message: err.message }
  }
}

async function saveScore(event) {
  const { time, difficulty } = event
  try {
    const res = await db.collection('minesweeper').add({
      data: {
        time,
        difficulty,
        won: true,
        createdAt: db.serverDate()
      }
    })
    return {
      success: true,
      data: res
    }
  } catch (err) {
    return { success: false, message: err.message }
  }
}

async function getRanking(event) {
  const { difficulty = 'all', limit = 10 } = event
  try {
    let query = db.collection('minesweeper')
      .orderBy('time', 'asc')
    
    if (difficulty !== 'all') {
      query = query.where({ difficulty })
    }
    
    const res = await query.limit(limit).get()
    return {
      success: true,
      data: res.data
    }
  } catch (err) {
    return { success: false, message: err.message }
  }
}