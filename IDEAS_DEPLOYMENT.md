# دليل إطلاق النظام للفروع

## الفكرة العامة

النظام يعمل حاليًا على جهازك المحلي فقط. لكي تستطيع جميع الفروع الوصول إليه في نفس الوقت، يجب رفعه على سيرفر متاح على الإنترنت.

---

## الخيار 1: VPS (الأنسب للمشروع) ⭐ موصى به

### ما هو VPS؟
سيرفر مستأجر شهريًا، أنت تتحكم فيه بالكامل، يعمل 24/7.

### المزودون المقترحون والأسعار (تقريبية)
| المزود | الخطة | السعر الشهري |
|--------|-------|-------------|
| **DigitalOcean** | Droplet 1GB RAM | ~$6 |
| **Hetzner** | CX11 | ~$4 |
| **Contabo** | VPS S | ~$5 |
| **Linode (Akamai)** | Nanode | ~$5 |

### خطوات الإعداد على VPS (Ubuntu 22.04)

```bash
# 1. تحديث السيرفر
sudo apt update && sudo apt upgrade -y

# 2. تثبيت Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. تثبيت PM2 (لتشغيل التطبيق في الخلفية)
sudo npm install -g pm2

# 4. رفع الكود على السيرفر
git clone https://github.com/your-repo/mudhian.git
cd mudhian
npm install
npx prisma migrate deploy
npx prisma generate

# 5. إعداد متغيرات البيئة
echo 'DATABASE_URL="file:./prisma/dev.db"' > .env
echo 'JWT_SECRET="your-secret-key-here"' >> .env

# 6. بناء التطبيق
npm run build

# 7. تشغيله مع PM2
pm2 start npm --name "mudhian" -- start
pm2 startup  # لتشغيله تلقائيًا عند إعادة تشغيل السيرفر
pm2 save
```

### إعداد Nginx كـ Reverse Proxy
```bash
sudo apt install -y nginx

# ملف إعداد Nginx
sudo nano /etc/nginx/sites-available/mudhian
```

```nginx
server {
    listen 80;
    server_name yourdomain.com;  # أو IP السيرفر مؤقتًا

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/mudhian /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### إضافة HTTPS (مجاني مع Let's Encrypt)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### بعد الإعداد
- كل فرع يفتح المتصفح ويدخل: `https://yourdomain.com`
- المدير يدخل بـ `admin / admin123` ثم يغير كلمة المرور
- يُنشئ حسابات الفروع من لوحة `/admin`

---

## الخيار 2: Railway (الأسرع للبداية) 🚀

### ما هو؟
منصة سحابية بسيطة، رفع الكود ويعمل مباشرة بدون تهيئة سيرفر.

### الخطوات
1. سجّل في [railway.app](https://railway.app)
2. أنشئ مشروع جديد → Deploy from GitHub
3. ارفع الكود على GitHub أولًا
4. أضف متغيرات البيئة في لوحة Railway:
   - `DATABASE_URL=file:./prisma/dev.db`
   - `JWT_SECRET=your-secret`
5. Railway يبني ويشغّل التطبيق تلقائيًا

**ملاحظة مهمة:** Railway لا يحتفظ بالملفات بشكل دائم (ephemeral filesystem)، مما يعني أن SQLite قد يُمسح عند إعادة النشر. يُنصح بالانتقال لـ PostgreSQL في هذا الخيار.

---

## الخيار 3: شبكة محلية (إذا كانت الفروع قريبة) 🏠

### الفكرة
إذا كانت الفروع في نفس المدينة ولديك اتصال VPN أو شبكة خاصة، تستطيع تشغيل النظام على جهاز في مقر الشركة.

### الخطوات
1. شغّل النظام على جهاز ثابت (مثل laptop أو mini PC)
2. اجعل الجهاز يعمل دائمًا (لا نوم/إيقاف)
3. استخدم برنامج مثل **ngrok** أو **Cloudflare Tunnel** لجعله متاحًا خارج الشبكة المحلية

```bash
# باستخدام ngrok (مجاني مع قيود)
npx ngrok http 3000
# يعطيك رابط مثل: https://abc123.ngrok.io
```

**العيب:** إذا انقطع الإنترنت أو أُغلق الجهاز، يتوقف النظام عن العمل.

---

## الخيار 4: الانتقال لقاعدة بيانات PostgreSQL (للمستقبل)

### لماذا؟
SQLite مناسب للتطوير ولكن في بيئة إنتاج مع فروع متعددة تكتب في نفس الوقت، PostgreSQL أكثر أمانًا وموثوقية.

### الانتقال
1. تغيير `provider = "postgresql"` في `schema.prisma`
2. استخدام قاعدة بيانات مجانية مثل **Supabase** أو **Neon**
3. تعديل `src/lib/prisma.ts` لإزالة adapter SQLite واستخدام Prisma القياسي
4. تشغيل `npx prisma migrate deploy`

---

## توصيتي للبداية

```
الآن (تطوير) → جهازك المحلي ✅
أول إطلاق   → Railway أو VPS Hetzner (رخيص + بسيط)
مستقبل       → VPS + PostgreSQL + نطاق خاص
```

### الخطوات العملية الأولى
1. **أنشئ حساب GitHub** وارفع الكود
2. **اختر DigitalOcean أو Hetzner** واستأجر VPS صغير (~$5/شهر)
3. **اشترِ نطاق** (domain) مثل `mudhian.com` من Namecheap (~$10/سنة) — اختياري
4. **اتبع خطوات VPS** أعلاه
5. **شارك الرابط** مع موظفي الفروع

---

## أمان قبل الإطلاق

- [ ] غيّر كلمة مرور `admin` من `admin123` لكلمة مرور قوية
- [ ] استخدم `JWT_SECRET` عشوائي وقوي (مثل: `openssl rand -base64 32`)
- [ ] فعّل HTTPS (Let's Encrypt مجاني)
- [ ] نسخ احتياطي دوري لملف `prisma/dev.db`
- [ ] لا ترفع ملف `.env` على GitHub (أضفه لـ `.gitignore`)
