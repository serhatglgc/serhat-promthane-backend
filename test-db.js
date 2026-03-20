const pool = require('./backend/config/db');

async function testConnection() {
    try {
        const [rows] = await pool.query('SELECT 1 + 1 AS solution');
        console.log('Database connection successful. Solution:', rows[0].solution);
        
        const [tables] = await pool.query('SHOW TABLES');
        console.log('Tables in database:', tables.map(t => Object.values(t)[0]));
        
        const [categories] = await pool.query('SELECT * FROM categories');
        console.log('Categories count:', categories.length);
        
        process.exit(0);
    } catch (err) {
        console.error('Database connection failed:');
        console.error(err.message);
        process.exit(1);
    }
}

testConnection();
