const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://asfakrahman43_db_user:asfakrahman@cluster0.nvjmtrl.mongodb.net/test', { tlsAllowInvalidCertificates: true })
  .then(() => { console.log('DB_SUCCESS'); process.exit(0); })
  .catch(e => { console.error('DB_ERROR', e); process.exit(1); });
