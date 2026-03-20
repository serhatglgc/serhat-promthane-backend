const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail', // Or your preferred service
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendEmail = async (to, subject, html) => {
    try {
        const info = await transporter.sendMail({
            from: `"PromptHane" <${process.env.EMAIL_USER}>`,
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
