# PromptHane Proje Rehberi

Bu belge, PromptHane projesinin teknolojilerini ve adım adım kurulum/çalıştırma talimatlarını içerir.

## 🚀 Kullanılan Teknolojiler

### Backend (Arka Yüz)
- **Node.js**: Sunucu tarafı çalışma ortamı.
- **Express.js**: Web sunucusu framework'ü.
- **MySQL (mysql2)**: Veritabanı yönetim sistemi.
- **JWT (json-web-token)**: Kimlik doğrulama (Authentication).
- **bcryptjs**: Şifrelerin güvenli bir şekilde hash'lenmesi.
- **Nodemailer**: E-posta gönderim servisi (şifre sıfırlama vb.).
- **Multer**: Dosya yükleme işlemleri.
- **Güvenlik & Performans**:
    - **Helmet**: HTTP başlıklarını güvenli hale getirir.
    - **CORS**: Cross-origin isteklerini yönetir.
    - **Compression**: Yanıtları sıkıştırarak hızı artırır.
    - **Express-Rate-Limit**: API istek sınırlandırması.
- **Geliştirme Araçları**:
    - **Nodemon**: Kod değişikliklerinde sunucuyu otomatik yeniden başlatır.
    - **Dotenv**: Ortam değişkenlerini yönetir.

### Frontend (Ön Yüz)
- **HTML5 & CSS3**: Sayfa yapısı ve tasarımı.
- **Vanilla JavaScript**: İstemci tarafı mantık ve API etkileşimi.
- **Modern Tasarım**: Responsive (uyumlu) tasarım ve kullanıcı dostu arayüz.

---

## 🛠️ Kurulum Adımları

### 1. Veritabanı Hazırlığı
1. Bir MySQL veritabanı oluşturun (örn: `prompthane_db`).
2. `database/schema.sql` dosyasındaki SQL komutlarını veritabanınızda çalıştırarak tabloları oluşturun.

### 2. Ortam Değişkenleri (.env)
Proje kök dizinindeki `.env` dosyasını aşağıdaki bilgilere göre düzenleyin (veya yoksa oluşturun):
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sifreniz
DB_NAME=prompthane_db
JWT_SECRET=ozel_anahtar_buraya
PORT=5000
```

### 3. Bağımlılıkların Yüklenmesi
Terminalde proje kök dizinine gidin ve aşağıdaki komutu çalıştırın:
```bash
npm install
```

---

## 🏃 Projeyi Çalıştırma

### Backend Sunucusunu Başlatma
Geliştirme modunda (nodemon ile) başlatmak için:
```bash
npx nodemon backend/server.js
```
Veya normal modda:
```bash
node backend/server.js
```

### Uygulamaya Erişim
Sunucu başladığında tarayıcınızdan şu adrese gidin:
`http://localhost:5000`

Projenin giriş sayfası otomatik olarak yüklenecektir.
