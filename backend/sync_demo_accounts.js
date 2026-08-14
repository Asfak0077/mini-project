const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
require('dotenv').config()

async function syncDemoPasswords() {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    const db = mongoose.connection.db
    const defaultHash = await bcrypt.hash('password123', 10)

    const res = await db.collection('students').updateMany(
      { email: { $in: ['asf28146@gmail.com', 'eswaraprasath115@gmail.com', 'asfakrahman43@gmail.com', 'student@campusresolve.edu', 'admin@campusresolve.edu'] } },
      { $set: { passwordHash: defaultHash, isPasswordSet: true, isActive: true } }
    )

    console.log('✓ Updated student accounts:', res.modifiedCount || res.matchedCount)

    const teacherHash = await bcrypt.hash('teach123', 10)
    const teacherRes = await db.collection('teachers').updateMany(
      {},
      { $set: { passwordHash: teacherHash, isActive: true } }
    )
    console.log('✓ Updated teacher accounts:', teacherRes.modifiedCount || teacherRes.matchedCount)

    await mongoose.disconnect()
  } catch (err) {
    console.error('Error syncing accounts:', err)
  }
}

syncDemoPasswords()
