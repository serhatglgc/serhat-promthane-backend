const db = require('./config/db');

async function runMigration() {
    try {
        console.log('Running migration: Adding copy_count to prompts table...');
        
        // Add copy_count column if it doesn't exist
        await db.query(`
            ALTER TABLE prompts 
            ADD COLUMN copy_count INT DEFAULT 0
        `);
        console.log('Migration successful: copy_count added.');
    } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('Migration skipped: copy_count already exists.');
        } else {
            console.error('Migration failed:', err);
        }
    } finally {
        process.exit();
    }
}

runMigration();
