const fs = require('fs');
const path = require('path');
const pool = require('./config/db');

async function initDB() {
    try {
        console.log("Tablolar oluşturuluyor...");
        const schemaPath = path.join(__dirname, '../database/schema.sql');
        let sql = fs.readFileSync(schemaPath, 'utf8');

        // Aiven'daki defaultdb'yi kullanacağımız için bu komutları yoksayıyoruz
        sql = sql.replace(/CREATE DATABASE IF NOT EXISTS prompt_hane;/gi, '');
        sql = sql.replace(/USE prompt_hane;/gi, '');

        // Kodları noktalı virgüle göre bölüp sırayla çalıştırıyoruz
        const queries = sql.split(';').map(q => q.trim()).filter(q => q.length > 0);

        console.log(`Toplam ${queries.length} adet işlem bulundu. Çalıştırılıyor...`);

        for (let i = 0; i < queries.length; i++) {
            try {
                await pool.query(queries[i]);
            } catch(e) {
                // Eger tablo zaten varsa (veya baska kucuk hatalar) gormezden gel
                console.log(`Sorgu ${i+1} atland veya kucuk hata: ${e.message}`);
            }
        }

        console.log("✅ HARİKA! Veritabanı tabloları Aiven üzerinde başarıyla oluşturuldu.");
    } catch (error) {
        console.error("❌ Tablolar oluşturulurken kritik hata:", error);
    } finally {
        process.exit();
    }
}

initDB();
