const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, html) => {
    try {
        const fromEmail = process.env.EMAIL_USER || 'noreply@prompthane.com';

        // 1. BREVO HTTP API (Render ücretsiz plandaki SMTP engelini aşar)
        if (process.env.BREVO_API_KEY) {
            console.log("Brevo API ile mail gonderiliyor...");
            const response = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'api-key': process.env.BREVO_API_KEY
                },
                body: JSON.stringify({
                    sender: { email: fromEmail, name: 'PromptHane' },
                    to: [{ email: to }],
                    subject: subject,
                    htmlContent: html
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(JSON.stringify(data));
            return data;
        }

        // 2. RESEND HTTP API (Aynı şekilde SMTP engelini aşar)
        if (process.env.RESEND_API_KEY) {
            console.log("Resend API ile mail gonderiliyor...");
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: `PromptHane <onboarding@resend.dev>`,
                    to: [to],
                    subject: subject,
                    html: html
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(JSON.stringify(data));
            return data;
        }

        // 3. Klasik Gmail SMTP (Sadece port engeli yoksa veya local'de çalışır)
        console.log("Gmail SMTP ile mail gonderiliyor...");
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        const info = await transporter.sendMail({
            from: `"PromptHane" <${fromEmail}>`,
            to,
            subject,
            html
        });
        return info;
    } catch (error) {
        console.error('Email send error:', error);
        throw error;
    }
};

const sendVerificationEmail = async (email, code) => {
    const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #00d4ff; text-align: center;">PromptHane'ye Hoş Geldiniz!</h2>
            <p>Merhaba,</p>
            <p>Kaydınızı tamamlamak için aşağıdaki doğrulama kodunu kullanın:</p>
            <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; border-radius: 5px;">
                ${code}
            </div>
            <p>Bu kod 15 dakika süresince geçerlidir.</p>
            <p>Eğer bu hesabı siz oluşturmadıysanız, lütfen bu e-postayı dikkate almayın.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #777; text-align: center;">&copy; 2026 PromptHane</p>
        </div>
    `;
    return sendEmail(email, 'E-posta Doğrulama Kodu', html);
};

const sendResetEmail = async (email, code) => {
    const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #da3633; text-align: center;">Şifre Sıfırlama İsteği</h2>
            <p>Merhaba,</p>
            <p>Hesabınız için şifre sıfırlama isteği aldık. Aşağıdaki kodu kullanarak şifrenizi yenileyebilirsiniz:</p>
            <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; border-radius: 5px;">
                ${code}
            </div>
            <p>Bu kod 15 dakika süresince geçerlidir. Eğer şifre sıfırlama isteğinde bulunmadıysanız bu e-postayı silebilirsiniz.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #777; text-align: center;">&copy; 2026 PromptHane</p>
        </div>
    `;
    return sendEmail(email, 'Şifre Sıfırlama Kodu', html);
};

const sendContactEmail = async (name, email, message) => {
    const html = `
        <div style="font-family: sans-serif; max-width: 600px; padding: 20px;">
            <h2>Yeni İletişim Mesajı</h2>
            <p><strong>Gönderen:</strong> ${name} (${email})</p>
            <p><strong>Mesaj:</strong></p>
            <blockquote style="background: #f4f4f4; padding: 15px; border-left: 5px solid #00d4ff;">
                ${message}
            </blockquote>
        </div>
    `;
    return sendEmail(process.env.EMAIL_USER, `Yeni İletişim Mesajı: ${name}`, html);
};

module.exports = {
    sendVerificationEmail,
    sendResetEmail,
    sendContactEmail
};
