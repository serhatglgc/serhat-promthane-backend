const pool = require('./backend/config/db');

async function checkPrompts() {
    try {
        const query = `
            SELECT p.id, p.title, p.description, p.prompt_text, p.created_at, 
                   c.name as category_name, u.username as author_name,
                   (SELECT COUNT(*) FROM likes WHERE prompt_id = p.id) as likes_count,
                   (SELECT COUNT(*) FROM comments WHERE prompt_id = p.id) as comments_count,
                   (SELECT JSON_ARRAYAGG(image_url) FROM prompt_images pi WHERE pi.prompt_id = p.id) as images
            FROM prompts p
            JOIN categories c ON p.category_id = c.id
            JOIN users u ON p.author_id = u.id
            ORDER BY p.created_at DESC
        `;
        const [prompts] = await pool.query(query);
        console.log('Prompts in DB:', JSON.stringify(prompts, null, 2));


        const [allPrompts] = await pool.query('SELECT * FROM prompts');
        console.log('Total prompts in table:', allPrompts.length);
        if (allPrompts.length > 0) {
            console.log('Sample prompt raw:', JSON.stringify(allPrompts[0], null, 2));
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkPrompts();
