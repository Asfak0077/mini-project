const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const updates = [
  { dept: 'CSE', id: 'TCH-CSE-001', pass: 'teachcse', name: 'Dr. Rajesh Kumar' },
  { dept: 'ECE', id: 'TCH-ECE-001', pass: 'teach123', name: 'Dr. Priya Sharma' },
  { dept: 'MECH', id: 'TCH-MECH-001', pass: 'teach123', name: 'Dr. Arun Patel' },
  { dept: 'EEE', id: 'TCH-EEE-001', pass: 'teach123', name: 'Dr. Meena Iyer' },
  { dept: 'AIDS', id: 'TCH-AIDS-001', pass: 'teach123', name: 'Dr. Karthik Reddy' },
  { dept: 'IT', id: 'TCH-IT-001', pass: 'teach123', name: 'Dr. Lakshmi Nair' }
];

mongoose.connect('mongodb+srv://asfakrahman43_db_user:asfak2006@cluster0.nvjmtrl.mongodb.net/?appName=Cluster0')
  .then(async () => {
    const db = mongoose.connection.db;
    
    for (const u of updates) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(u.pass, salt);
      
      const result = await db.collection('teachers').updateOne(
        { teacherId: u.id },
        { 
          $set: { 
            passwordHash: hash,
            name: u.name,
            department: u.dept
          } 
        }
      );
      console.log(`Updated ${u.id}: Matched ${result.matchedCount}, Modified ${result.modifiedCount}`);
    }
    
    console.log("All teacher credentials updated successfully!");
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
