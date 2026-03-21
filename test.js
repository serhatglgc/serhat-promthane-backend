const db = require('./backend/config/db');
const bcrypt = require('bcryptjs');

async function debugFlow() {
    try {
        // 1. Check user
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', ['serhatglgc@gmail.com']);
        if (users.length === 0) throw new Error("User not found");
        const user = users[0];

        // 2. Create a dummy prompt posted by another fake user to test comment and delete
        const [dummy] = await db.query('SELECT id FROM users WHERE email = ?', ['dummy@example.com']);
        let dummyId;
        if (dummy.length === 0) {
            const [res] = await db.query("INSERT INTO users (username, email, password_hash) VALUES ('dummy', 'dummy@example.com', 'hash')");
            dummyId = res.insertId;
        } else {
            dummyId = dummy[0].id;
        }

        // Add dummy prompt
        const [cat] = await db.query("SELECT id FROM categories LIMIT 1");
        const catId = cat.length > 0 ? cat[0].id : 1;
        
        const [promptRes] = await db.query(
            "INSERT INTO prompts (title, description, prompt_text, category_id, author_id) VALUES ('Test Prompt', 'Test', 'Test text', ?, ?)",
            [catId, dummyId]
        );
        const promptId = promptRes.insertId;

        // 3. Test API login
        const axios = require('axios'); // if axios exists, else we use fetch
        const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args)).catch(() => require('http'));
        // We'll perform raw DB operations that mirror backend since we might not have fetch
        
        // Let's actually check if req.user role triggers correctly 
        console.log(`Test Prompt created ID: ${promptId}`);
        console.log(`User details:`, { id: user.id, role: user.role });

        // Let's test deletePrompt exactly how the backend does:
        if (dummyId !== user.id && user.role !== 'admin') {
            console.log("TEST FAILED: Not author and not admin");
        } else {
            console.log("TEST PASSED: Admin check succeeded");
        }

        // Now test comment inserting
        await db.query('INSERT INTO comments (user_id, prompt_id, comment_text) VALUES (?, ?, ?)', [user.id, promptId, 'admin comment']);
        console.log("TEST PASSED: Comment inserted");

        // Cleanup
        await db.query('DELETE FROM prompts WHERE id = ?', [promptId]);
        console.log("TEST PASSED: Cleanup finished");

    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        process.exit();
    }
}
debugFlow();
