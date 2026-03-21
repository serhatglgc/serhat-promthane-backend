const pool = require('./config/db');

async function deleteAllUsers() {
    try {
        console.log("Veritabanına bağlanılıyor...");
        
        // Disable foreign key checks to safely truncate tables if needed
        // Or simply DELETE FROM users so it cascades to prompts, comments, etc.
        console.log("Kullanıcılar siliniyor...");
        
        // This will delete all users and cascade to prompts, likes, comments etc.
        const [result] = await pool.query('DELETE FROM users');
        
        console.log(`\nBAŞARILI: Toplam ${result.affectedRows} kullanıcı sistemden silindi.`);
        console.log("Not: Foreign Key Cascade kuralları gereği, silinen kullanıcıların paylaştığı tüm promptlar, yorumlar ve beğeniler de silinmiştir.");
        
        process.exit(0);
    } catch (err) {
        console.error("HATA OLUŞTU:", err.message);
        process.exit(1);
    }
}

deleteAllUsers();
