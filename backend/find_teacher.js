const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://asfakrahman43_db_user:asfak2006@cluster0.nvjmtrl.mongodb.net/?appName=Cluster0')
  .then(async () => {
    const db = mongoose.connection.db;
    const teachers = await db.collection('teachers').find({}).toArray();
    console.log("Teachers:", teachers.map(u => ({ email: u.email, name: u.name, department: u.department, teacherId: u.teacherId })));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
