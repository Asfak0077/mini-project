const mongoose = require('mongoose')
require('dotenv').config()

const Complaint = require('../src/models/Complaint')
const Feedback = require('../src/models/Feedback')

const MONGO_URI = process.env.MONGO_URI

async function main() {
  if (!MONGO_URI) {
    console.error('MONGO_URI not set in environment. Aborting.')
    process.exit(1)
  }
  await mongoose.connect(MONGO_URI, { dbName: process.env.DB_NAME || undefined })
  console.log('Connected to MongoDB')

  // Delete feedback then complaints
  const fbRes = await Feedback.deleteMany({})
  console.log(`Deleted ${fbRes.deletedCount} feedback documents.`)

  const cmpRes = await Complaint.deleteMany({})
  console.log(`Deleted ${cmpRes.deletedCount} complaint documents.`)

  await mongoose.disconnect()
  console.log('Disconnected. Done.')
}

main().catch(err => {
  console.error('Error clearing collections:', err)
  process.exit(1)
})
