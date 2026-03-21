const db = require('./backend/config/db');

async function debugComments() {
    try {
        const [users] = await db.query('SELECT id, username, email, role FROM users');
        console.log("USERS:", users);

        const [prompts] = await db.query('SELECT id, title, author_id FROM prompts');
        console.log("PROMPTS:", prompts);

        const [comments] = await db.query('SELECT * FROM comments');
        console.log("COMMENTS:", comments);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
debugComments();
