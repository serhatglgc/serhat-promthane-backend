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
