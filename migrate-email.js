const db = require('./backend/config/db');

async function migrate() {
    try {
        console.log('Starting migration...');
        
        const [columns] = await db.query('SHOW COLUMNS FROM users');
        const columnNames = columns.map(c => c.Field);

        if (!columnNames.includes('is_verified')) {
            await db.query('ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT 0');
            console.log('Added is_verified');
        }
        
        if (!columnNames.includes('verification_code')) {
            await db.query('ALTER TABLE users ADD COLUMN verification_code VARCHAR(6)');
            console.log('Added verification_code');
        }
        
        if (!columnNames.includes('reset_code')) {
            await db.query('ALTER TABLE users ADD COLUMN reset_code VARCHAR(6)');
            console.log('Added reset_code');
        }
        
        if (!columnNames.includes('reset_code_expiry')) {
            await db.query('ALTER TABLE users ADD COLUMN reset_code_expiry TIMESTAMP NULL');
            console.log('Added reset_code_expiry');
        }
        
        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
