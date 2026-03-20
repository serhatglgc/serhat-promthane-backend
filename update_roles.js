const db = require('./backend/config/db');
db.query("UPDATE users SET role='admin'").then(() => console.log('Bütün kullanıcılar admin yapıldı!')).finally(()=>process.exit());
