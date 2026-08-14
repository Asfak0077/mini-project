const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb+srv://asfakrahman43_db_user:asfak2006@cluster0.nvjmtrl.mongodb.net/?appName=Cluster0')
  .then(async () => {
    const db = mongoose.connection.db;
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('password123', salt);
    await db.collection('teachers').updateOne(
      { email: 'cse.teacher@campusresolve.edu' },
      { $set: { passwordHash: hash } }
    );
    console.log("Password reset successfully for cse.teacher@campusresolve.edu to password123");
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
