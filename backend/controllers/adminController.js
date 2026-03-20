const db = require('../config/db');

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
const getUsers = async (req, res) => {
    try {
        const [users] = await db.query('SELECT id, username, email, role, is_verified, created_at FROM users ORDER BY created_at DESC');
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;
        if(userId === req.user.id.toString()) return res.status(400).json({ message: 'Kendinizi silemezsiniz' });
        await db.query('DELETE FROM users WHERE id = ?', [userId]);
        res.json({ message: 'Kullanıcı silindi' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
};

// @desc    Get all prompts
// @route   GET /api/admin/prompts
// @access  Private/Admin
const getAdminPrompts = async (req, res) => {
    try {
        const [prompts] = await db.query(`
            SELECT p.id, p.title, p.created_at, u.username as author_name, c.name as category_name, p.copy_count
            FROM prompts p
            JOIN users u ON p.author_id = u.id
            JOIN categories c ON p.category_id = c.id
            ORDER BY p.created_at DESC
        `);
        res.json(prompts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
};

// @desc    Delete prompt
// @route   DELETE /api/admin/prompts/:id
// @access  Private/Admin
const deleteAdminPrompt = async (req, res) => {
    try {
        const promptId = req.params.id;
        await db.query('DELETE FROM prompts WHERE id = ?', [promptId]);
        res.json({ message: 'Prompt silindi' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
};

module.exports = { getUsers, deleteUser, getAdminPrompts, deleteAdminPrompt };
