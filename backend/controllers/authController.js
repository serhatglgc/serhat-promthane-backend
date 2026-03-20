const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { sendVerificationEmail, sendResetEmail } = require('../services/mailService');

// Helper to generate 6-digit code
const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// Generate JWT
const generateToken = (id, username, role = 'user') => {
    return jwt.sign({ id, username, role }, process.env.JWT_SECRET || 'prompthane_gizli_anahtar', {
        expiresIn: '30d',
    });
};

// @desc    Register new user
// @route   POST /register
const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Lütfen tüm alanları doldurun.' });
        }

        // Check if user exists
        const [existingUsers] = await db.query('SELECT * FROM users WHERE email = ? OR username = ?', [email, username]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ message: 'Kullanıcı adı veya e-posta zaten kullanımda.' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user with verification code
        const verification_code = generateCode();
        const [result] = await db.query(
            'INSERT INTO users (username, email, password_hash, verification_code) VALUES (?, ?, ?, ?)', 
            [username, email, hashedPassword, verification_code]
        );

        // Send email in background (don't await to speed up response)
        sendVerificationEmail(email, verification_code).catch(err => console.error('Initial mail error:', err));

        res.status(201).json({
            id: result.insertId,
            username,
            email,
            role: 'user',
            token: generateToken(result.insertId, username, 'user')
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
};

// @desc    Authenticate a user
// @route   POST /login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Lütfen e-posta ve şifrenizi girin.' });
        }

        // Check for user
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        const user = users[0];

        if (user && (await bcrypt.compare(password, user.password_hash))) {
            res.json({
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role || 'user',
                token: generateToken(user.id, user.username, user.role || 'user')
            });
        } else {
            res.status(401).json({ message: 'Geçersiz e-posta veya şifre.' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
};

// @desc    Verify email code
// @route   POST /verify-email
const verifyEmail = async (req, res) => {
    try {
        const { email, code } = req.body;
        if (!email || !code) return res.status(400).json({ message: 'Eksik bilgi.' });

        const [users] = await db.query('SELECT * FROM users WHERE email = ? AND verification_code = ?', [email, code]);
        if (users.length === 0) {
            return res.status(400).json({ message: 'Geçersiz doğrulama kodu.' });
        }

        await db.query('UPDATE users SET is_verified = 1, verification_code = NULL WHERE email = ?', [email]);
        res.json({ message: 'E-posta başarıyla doğrulandı.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
};

// @desc    Forgot password request
// @route   POST /forgot-password
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            // Safety: don't reveal if user exists, but here we can just say sent if success
            return res.json({ message: 'Eğer bu e-posta kayıtlı ise sıfırlama kodu gönderilmiştir.' });
        }

        const reset_code = generateCode();
        const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

        await db.query('UPDATE users SET reset_code = ?, reset_code_expiry = ? WHERE email = ?', [reset_code, expiry, email]);
        
        await sendResetEmail(email, reset_code);
        res.json({ message: 'Sıfırlama kodu e-postanıza gönderildi.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
};

// @desc    Reset password
// @route   POST /reset-password
const resetPassword = async (req, res) => {
    try {
        const { email, code, newPassword } = req.body;
        if (!email || !code || !newPassword) return res.status(400).json({ message: 'Eksik bilgi.' });

        const [users] = await db.query('SELECT * FROM users WHERE email = ? AND reset_code = ?', [email, code]);
        if (users.length === 0) {
            return res.status(400).json({ message: 'Geçersiz kod.' });
        }

        const user = users[0];
        if (new Date() > new Date(user.reset_code_expiry)) {
            return res.status(400).json({ message: 'Kodun süresi dolmuş.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await db.query('UPDATE users SET password_hash = ?, reset_code = NULL, reset_code_expiry = NULL WHERE email = ?', [hashedPassword, email]);
        res.json({ message: 'Şifreniz başarıyla güncellendi.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
};

// @desc    Get top users by total prompt copies
// @route   GET /leaderboard
const getLeaderboard = async (req, res) => {
    try {
        const query = `
            SELECT u.id, u.username, 
                   COUNT(p.id) as total_prompts,
                   (
                       SELECT COUNT(*) 
                       FROM prompt_copies pc 
                       JOIN prompts p2 ON pc.prompt_id = p2.id 
                       WHERE p2.author_id = u.id AND pc.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                   ) as total_copies
            FROM users u
            LEFT JOIN prompts p ON u.id = p.author_id
            GROUP BY u.id
            HAVING total_prompts > 0
            ORDER BY total_copies DESC, total_prompts DESC
            LIMIT 10
        `;
        const [leaderboard] = await db.query(query);
        
        const leaders = leaderboard.map(l => {
            let badge = '';
            if (l.total_copies >= 100) badge = '👑 Usta Mühendis';
            else if (l.total_copies >= 50) badge = '⭐ Midjourney Uzmanı';
            else if (l.total_copies >= 10) badge = '🚀 Yükselen Yıldız';
            else badge = '🌱 Çırak';
            
            return {
                id: l.id,
                username: l.username,
                total_copies: l.total_copies,
                total_prompts: l.total_prompts,
                badge
            };
        });

        res.json(leaders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
};

module.exports = { register, login, verifyEmail, forgotPassword, resetPassword, getLeaderboard };
