const db = require('../config/db');

// @desc    Get all prompts
// @route   GET /prompts
const getPrompts = async (req, res) => {
    try {
        const { category, search } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const queryParams = [];
        let whereClause = ' WHERE 1=1';

        if (category) {
            whereClause += ` AND c.name = ?`;
            queryParams.push(category);
        }

        if (search) {
            whereClause += ` AND (p.title LIKE ? OR p.description LIKE ? OR p.prompt_text LIKE ?)`;
            queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        // Get total count for pagination
        const countQuery = `SELECT COUNT(*) as total FROM prompts p JOIN categories c ON p.category_id = c.id ${whereClause}`;
        const [countResult] = await db.query(countQuery, queryParams);
        const total = countResult[0].total;

        let query = `
            SELECT p.id, p.title, p.description, p.prompt_text, p.created_at, p.copy_count, p.author_id,
                   c.name as category_name, u.username as author_name,
                   (SELECT COUNT(*) FROM likes WHERE prompt_id = p.id) as likes_count,
                   (SELECT COUNT(*) FROM comments WHERE prompt_id = p.id) as comments_count,
                   (SELECT JSON_ARRAYAGG(image_url) FROM prompt_images pi WHERE pi.prompt_id = p.id) as images
            FROM prompts p
            JOIN categories c ON p.category_id = c.id
            JOIN users u ON p.author_id = u.id
            ${whereClause}
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?
        `;
        queryParams.push(limit, offset);

        const [prompts] = await db.query(query, queryParams);
        
        res.json({
            prompts,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
};

// @desc    Get single prompt by ID
// @route   GET /prompts/:id
const getPromptById = async (req, res) => {
    try {
        const [prompts] = await db.query(`
            SELECT p.id, p.title, p.description, p.prompt_text, p.created_at, p.copy_count, 
                   c.name as category_name, u.username as author_name, p.author_id,
                   (SELECT COUNT(*) FROM likes WHERE prompt_id = p.id) as likes_count,
                   (SELECT COUNT(*) FROM comments WHERE prompt_id = p.id) as comments_count,
                   (SELECT JSON_ARRAYAGG(image_url) FROM prompt_images pi WHERE pi.prompt_id = p.id) as images
            FROM prompts p
            JOIN categories c ON p.category_id = c.id
            JOIN users u ON p.author_id = u.id
            WHERE p.id = ?
        `, [req.params.id]);

        if (prompts.length === 0) {
            return res.status(404).json({ message: 'Prompt bulunamadı.' });
        }

        res.json(prompts[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
};

// @desc    Create new prompt
// @route   POST /prompts
const fs = require('fs');

const createPrompt = async (req, res) => {
    try {
        const { title, description, prompt_text, category_id } = req.body;

        const { hasBadWords } = require('../utils/moderationBot');
        const checkContent = (text) => hasBadWords(text);

        const deleteUploadedFiles = () => {
            if (req.files && req.files.length > 0) {
                req.files.forEach(file => {
                    fs.unlink(file.path, err => { if (err) console.error(err); });
                });
            }
        };

        if (checkContent(title) || checkContent(description) || checkContent(prompt_text)) {
            // Explicitly delete files if content is banned
            deleteUploadedFiles();
            return res.status(400).json({ message: 'İçerikte yasaklı kelimeler (örn: +18, argo, resim vb.) veya uygunsuz formatlar bulunuyor.' });
        }

        if (!title || !prompt_text || !category_id) {
            deleteUploadedFiles();
            return res.status(400).json({ message: 'Zorunlu alanları doldurun.' });
        }

        // Start transaction
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [result] = await connection.query(
                'INSERT INTO prompts (title, description, prompt_text, category_id, author_id) VALUES (?, ?, ?, ?, ?)',
                [title, description, prompt_text, category_id, req.user.id]
            );

            const promptId = result.insertId;

            if (req.files && req.files.length > 0) {
                const imageQueries = req.files.map(file => {
                    // Normalize path for web (unix style)
                    const normalizedPath = file.path.replace(/\\\\/g, '/');
                    return connection.query(
                        'INSERT INTO prompt_images (prompt_id, image_url) VALUES (?, ?)',
                        [promptId, normalizedPath]
                    );
                });
                await Promise.all(imageQueries);
            }

            await connection.commit();
            res.status(201).json({ id: promptId, message: 'Prompt başarıyla oluşturuldu.' });
        } catch (err) {
            await connection.rollback();
            deleteUploadedFiles();
            console.error('SQL Transaction Error:', err);
            throw err;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Controller Error:', error);
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
};

// @desc    Delete a prompt
// @route   DELETE /prompts/:id
const deletePrompt = async (req, res) => {
    try {
        const [prompts] = await db.query('SELECT * FROM prompts WHERE id = ?', [req.params.id]);

        if (prompts.length === 0) {
            return res.status(404).json({ message: 'Prompt bulunamadı.' });
        }

        const prompt = prompts[0];

        // Ensure user is the author
        if (prompt.author_id !== req.user.id) {
            return res.status(403).json({ message: 'Bu işlem için yetkiniz yok.' });
        }

        await db.query('DELETE FROM prompts WHERE id = ?', [req.params.id]);
        res.json({ message: 'Prompt silindi.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
};

// @desc    Toggle Like on a prompt
// @route   POST /like
const toggleLike = async (req, res) => {
    try {
        const { prompt_id } = req.body;
        const user_id = req.user.id;

        if (!prompt_id) {
            return res.status(400).json({ message: 'Eksik bilgi.' });
        }

        const [existingLike] = await db.query('SELECT * FROM likes WHERE user_id = ? AND prompt_id = ?', [user_id, prompt_id]);

        if (existingLike.length > 0) {
            await db.query('DELETE FROM likes WHERE user_id = ? AND prompt_id = ?', [user_id, prompt_id]);
            res.json({ message: 'Beğeni geri alındı.', action: 'unliked' });
        } else {
            await db.query('INSERT INTO likes (user_id, prompt_id) VALUES (?, ?)', [user_id, prompt_id]);
            res.json({ message: 'Beğenildi.', action: 'liked' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
};

// @desc    Check User Interactions (Likes and Saves)
// @route   GET /interactions/:id
const checkInteractions = async (req, res) => {
    try {
        const prompt_id = req.params.id;
        const user_id = req.user.id;

        const [like] = await db.query('SELECT id FROM likes WHERE user_id = ? AND prompt_id = ?', [user_id, prompt_id]);
        const [saved] = await db.query('SELECT id FROM saved_prompts WHERE user_id = ? AND prompt_id = ?', [user_id, prompt_id]);

        res.json({
            liked: like.length > 0,
            saved: saved.length > 0
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
};

// @desc    Add a comment
// @route   POST /comments
const addComment = async (req, res) => {
    try {
        const { prompt_id, comment_text } = req.body;
        if (!prompt_id || !comment_text) return res.status(400).json({ message: 'Eksik bilgi.' });

        await db.query('INSERT INTO comments (user_id, prompt_id, comment_text) VALUES (?, ?, ?)', [req.user.id, prompt_id, comment_text]);
        res.status(201).json({ message: 'Yorum eklendi.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
};

// @desc    Get comments for a prompt
// @route   GET /comments/:prompt_id
const getComments = async (req, res) => {
    try {
        const [comments] = await db.query(`
            SELECT c.id, c.comment_text, c.created_at, u.username as author_name
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.prompt_id = ?
            ORDER BY c.created_at DESC
        `, [req.params.prompt_id]);
        res.json(comments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
};

// @desc    Toggle Save a prompt
// @route   POST /save
const toggleSave = async (req, res) => {
    try {
        const { prompt_id } = req.body;
        const user_id = req.user.id;

        const [existing] = await db.query('SELECT * FROM saved_prompts WHERE user_id = ? AND prompt_id = ?', [user_id, prompt_id]);

        if (existing.length > 0) {
            await db.query('DELETE FROM saved_prompts WHERE user_id = ? AND prompt_id = ?', [user_id, prompt_id]);
            res.json({ message: 'Kaydedilenlerden çıkarıldı.', action: 'unsaved' });
        } else {
            await db.query('INSERT INTO saved_prompts (user_id, prompt_id) VALUES (?, ?)', [user_id, prompt_id]);
            res.json({ message: 'Kaydedildi.', action: 'saved' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
};

// @desc    Get saved prompts for user
// @route   GET /saved
const getSavedPrompts = async (req, res) => {
    try {
        const user_id = req.user.id;
        const [prompts] = await db.query(`
            SELECT p.id, p.title, p.description, p.prompt_text, p.created_at, p.copy_count, 
                   c.name as category_name, u.username as author_name,
                   (SELECT COUNT(*) FROM likes WHERE prompt_id = p.id) as likes_count,
                   (SELECT COUNT(*) FROM comments WHERE prompt_id = p.id) as comments_count,
                   (SELECT JSON_ARRAYAGG(image_url) FROM prompt_images pi WHERE pi.prompt_id = p.id) as images
            FROM prompts p
            JOIN saved_prompts sp ON p.id = sp.prompt_id
            JOIN categories c ON p.category_id = c.id
            JOIN users u ON p.author_id = u.id
            WHERE sp.user_id = ?
            ORDER BY sp.created_at DESC
        `, [user_id]);
        res.json(prompts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
};

// @desc    Get categories
// @route   GET /categories
const getCategories = async (req, res) => {
    try {
        const [categories] = await db.query('SELECT * FROM categories ORDER BY name');
        res.json(categories);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
};

// @desc    Increment copy count
// @route   POST /prompts/:id/copy
const incrementCopy = async (req, res) => {
    try {
        const promptId = req.params.id;
        const userId = req.user.id;

        const [prompts] = await db.query('SELECT author_id FROM prompts WHERE id = ?', [promptId]);
        if (prompts.length === 0) return res.status(404).json({ message: 'Prompt bulunamadı' });

        if (prompts[0].author_id === userId) {
            return res.json({ message: 'Kendi promptunuz kopyalandı (sayaç artmaz)', incremented: false });
        }

        try {
            await db.query('INSERT INTO prompt_copies (user_id, prompt_id) VALUES (?, ?)', [userId, promptId]);
            await db.query('UPDATE prompts SET copy_count = copy_count + 1 WHERE id = ?', [promptId]);
            res.json({ message: 'Copy count artırıldı', incremented: true });
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.json({ message: 'Zaten kopyalandı (sayaç artmaz)', incremented: false });
            }
            throw err;
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
};

module.exports = {
    getPrompts, getPromptById, createPrompt, deletePrompt, getCategories,
    toggleLike, checkInteractions, addComment, getComments, toggleSave, getSavedPrompts, incrementCopy
};
