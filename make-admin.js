const db = require('./backend/config/db');

async function makeAdmin() {
    try {
        const email = process.argv[2] || 'serhatglgc@gmail.com';
        
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            console.log(`❌ Hata: ${email} adresli kullanici veritabaninda bulunamadi. Lutfen once siteye kayit olun.`);
            process.exit(1);
        }

        const [result] = await db.query('UPDATE users SET role = ? WHERE email = ?', ['admin', email]);
        
        if (result.affectedRows > 0) {
            console.log(`✅ Basarili: ${email} adresli kullaniciya "admin" rolu verildi!`);
        } else {
            console.log(`❌ Hata: Bilinmeyen bir sorun olustu.`);
        }
    } catch (err) {
        console.error('Veritabani Hatasi:', err.message);
    } finally {
        process.exit();
    }
}

makeAdmin();
