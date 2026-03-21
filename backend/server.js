const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();

// Security - Set security HTTP headers
app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for now to avoid breaking existing script loads
}));

// Performance - Compress responses
app.use(compression());

// Logging - HTTP request logger
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('tiny'));
}

// Rate Limiting - Limit requests from same IP
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10000, // increased for dev testing
    message: 'Çok fazla istek yapıldı, lütfen 15 dakika sonra tekrar deneyin.'
});
app.use('/api/', limiter);

// Middleware
app.use(cors());
app.use(express.json());

// Health Check
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

// Expose the uploads directory
app.use('/backend/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend')));
// Veritabanı Kurulum Endpointi (Render ücretsiz planda terminal kapalı olduğu için)
app.get('/api/init-db', async (req, res) => {
    try {
        const fs = require('fs');
        const db = require('./config/db');
        const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
        let sql = fs.readFileSync(schemaPath, 'utf8');
        sql = sql.replace(/CREATE DATABASE IF NOT EXISTS prompt_hane;/gi, '');
        sql = sql.replace(/USE prompt_hane;/gi, '');
        const queries = sql.split(';').map(q => q.trim()).filter(q => q.length > 0);
        
        for (let i = 0; i < queries.length; i++) {
            try { await db.query(queries[i]); } catch(e) {}
        }
        res.send("<body style='background:#111; color:white; font-family:sans-serif;'><h1 style='color:#00ff88; text-align:center; margin-top:50px;'>🎉 Veritabani Tablolari BASARIYLA Olusturuldu!</h1><p style='text-align:center; font-size:18px;'>Artik bu sekmeyi kapatip sitene donus yapabilirsin.</p></body>");
    } catch (err) {
        res.status(500).send("Hata olustu: " + err.message);
    }
});

// Veritabanı Eksik Sütunları Onarma Endpointi
app.get('/api/update-db', async (req, res) => {
    try {
        const db = require('./config/db');
        const alters = [
            "ALTER TABLE users ADD COLUMN verification_code VARCHAR(10)",
            "ALTER TABLE users ADD COLUMN is_verified TINYINT(1) DEFAULT 0",
            "ALTER TABLE users ADD COLUMN reset_code VARCHAR(10)",
            "ALTER TABLE users ADD COLUMN reset_code_expiry DATETIME",
            "ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user'",
            "CREATE TABLE IF NOT EXISTS prompt_copies (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, prompt_id INT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE)"
        ];
        for (let q of alters) {
            try { await db.query(q); } catch(e) { console.log(e.message); }
        }
        res.send("<body style='background:#111; color:white; font-family:sans-serif;'><h1 style='color:#00ff88; text-align:center; margin-top:50px;'>🎉 Eksik Tablolar ve Sütunlar BAŞARIYLA Eklendi!</h1><p style='text-align:center; font-size:18px;'>Artik bu sekmeyi kapatip sitene donus yapabilirsin.</p></body>");
    } catch (err) {
        res.status(500).send("Hata olustu: " + err.message);
    }
});

// Routes
const authRoutes = require('./routes/authRoutes');
const promptRoutes = require('./routes/promptRoutes');
const adminRoutes = require('./routes/adminRoutes'); // Added

app.use('/api/auth', authRoutes);
app.use('/api', promptRoutes);
app.use('/api/admin', adminRoutes);

// Contact Form Endpoint
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, message } = req.body;
        if (!name || !email || !message) {
            return res.status(400).json({ message: 'Tüm alanları doldurun.' });
        }
        const { sendContactEmail } = require('./services/mailService');
        await sendContactEmail(name, email, message);
        res.json({ message: 'Mesaj başarısıyla gönderildi.' });
    } catch (err) {
        console.error('Contact error:', err);
        res.status(500).json({ message: 'Sunucu hatası: Mesaj gönderilemedi.' });
    }
});

// SSR Route for SEO Sharing
app.get('/p/:id', async (req, res) => {
    try {
        const promptId = req.params.id;
        const db = require('./config/db');
        const fs = require('fs');
        const [prompts] = await db.query('SELECT title, description, (SELECT image_url FROM prompt_images pi WHERE pi.prompt_id = p.id LIMIT 1) as image FROM prompts p WHERE p.id = ?', [promptId]);
        
        const htmlPath = path.join(__dirname, '..', 'frontend', 'pages', 'prompt-detail.html');
        let html = fs.readFileSync(htmlPath, 'utf-8');

        if (prompts.length > 0) {
            const p = prompts[0];
            const title = p.title.replace(/"/g, '&quot;');
            const desc = p.description.replace(/"/g, '&quot;');
            const img = p.image ? `http://${req.headers.host}${p.image}` : `http://${req.headers.host}/assets/images/default-cover.jpg`;

            const url = `http://${req.headers.host}/p/${promptId}`;
            const ogTags = `
                <!-- Temel SEO Etiketleri -->
                <meta name="description" content="${desc}" />
                <meta name="robots" content="index, follow, max-image-preview:large" />
                <link rel="canonical" href="${url}" />
                
                <!-- OpenGraph / Facebook / WhatsApp -->
                <meta property="og:type" content="article" />
                <meta property="og:url" content="${url}" />
                <meta property="og:title" content="${title} | PromptHane" />
                <meta property="og:description" content="${desc}" />
                <meta property="og:image" content="${img}" />
                <meta property="og:site_name" content="PromptHane" />
                <meta property="og:locale" content="tr_TR" />

                <!-- Twitter / X -->
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:url" content="${url}" />
                <meta name="twitter:title" content="${title} | PromptHane" />
                <meta name="twitter:description" content="${desc}" />
                <meta name="twitter:image" content="${img}" />

                <!-- Google Rich Snippets (JSON-LD) -->
                <script type="application/ld+json">
                {
                  "@context": "https://schema.org",
                  "@type": "TechArticle",
                  "mainEntityOfPage": {
                    "@type": "WebPage",
                    "@id": "${url}"
                  },
                  "headline": "${title}",
                  "image": "${img}",
                  "description": "${desc}",
                  "publisher": {
                    "@type": "Organization",
                    "name": "PromptHane",
                    "logo": {
                      "@type": "ImageObject",
                      "url": "http://${req.headers.host}/favicon.ico"
                    }
                  }
                }
                </script>
            `;
            html = html.replace('</head>', `${ogTags}\n</head>`);
            html = html.replace('<title>Prompt Detayı - PromptHane</title>', `<title>${title}</title>`);
        }
        res.send(html);
    } catch (err) {
        console.error('SSR Error:', err);
        res.status(500).send('Sunucu hatası');
    }
});

// Catch-all: serve 404 for any non-API route that doesn't exist
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '..', 'frontend', 'pages', '404.html'));
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Triggering restart for nodemon


// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        message: process.env.NODE_ENV === 'production' 
            ? 'Bir sunucu hatası oluştu.' 
            : err.message
    });
});
