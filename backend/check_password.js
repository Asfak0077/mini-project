const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb+srv://asfakrahman43_db_user:asfak2006@cluster0.nvjmtrl.mongodb.net/?appName=Cluster0')
  .then(async () => {
    const db = mongoose.connection.db;
    const teacher = await db.collection('teachers').findOne({ email: 'cse.teacher@campusresolve.edu' });
    const isMatch = await bcrypt.compare('password123', teacher.passwordHash);
    console.log("Does password123 match?", isMatch);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
