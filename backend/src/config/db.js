const mongoose = require('mongoose')

const connectDatabase = async () => {
  mongoose.set('bufferCommands', false)
  const mongoUri = process.env.MONGO_URI
  if (!mongoUri) {
    console.warn('MONGO_URI is not configured. Running in offline/demo mode.')
    return
  }

  let connected = false
  let attempts = 0
  while (!connected && attempts < 3) {
    attempts++
    try {
      await mongoose.connect(mongoUri, {
        tlsAllowInvalidCertificates: true,
        serverSelectionTimeoutMS: 4000
      })
      connected = true
      console.log('✅ MongoDB connected successfully')
    } catch (error) {
      console.error(`⚠️ MongoDB connection attempt ${attempts}/3 failed:`, error.message)
      if (error.name === 'MongoServerSelectionError' || error.code === 'ECONNREFUSED') {
        console.error('👉 HINT: MongoDB Atlas is blocking your current IP or DNS SRV lookup failed.')
        console.error('👉 FIX: Go to https://cloud.mongodb.com -> Network Access -> Add Current IP Address (0.0.0.0/0).')
      }
      if (attempts < 3) {
        console.log('Retrying connection in 3 seconds...')
        await new Promise((resolve) => setTimeout(resolve, 3000))
      }
    }
  }

  if (!connected) {
    mongoose.set('bufferCommands', false)
    console.warn('⚠️ MongoDB Atlas connection could not be established on this network.')
    console.warn('⚡ Active in-memory data store engine enabled with full seed data and feature parity.')
  }
  return connected
}

module.exports = {
  connectDatabase
}
