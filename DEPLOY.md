# نشر التطبيق على DigitalOcean

دليل نشر **يومية المضيان للمجوهرات** على سيرفر DigitalOcean Droplet.

---

## المتطلبات

- Droplet بنظام **Ubuntu 22.04 LTS** (يكفي 1 GB RAM / 1 vCPU للبداية)
- اسم نطاق (Domain) اختياري — يمكن الوصول بعنوان IP مباشرةً

---

## الخطوة 1 — إعداد السيرفر

```bash
# سجل دخول كـ root
ssh root@<SERVER_IP>

# حدّث الحزم
apt update && apt upgrade -y

# ثبّت Node.js 20 (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# تحقق من الإصدار
node -v   # يجب أن يكون v20.x
npm -v
```

---

## الخطوة 2 — استنساخ المشروع

```bash
# أنشئ مجلداً للتطبيق
mkdir -p /var/www
cd /var/www

# استنسخ المستودع
git clone https://github.com/aliabdulrab7/mudhian.git
cd mudhian

# ثبّت المكتبات
npm install
```

---

## الخطوة 3 — إعداد متغيرات البيئة

```bash
# أنشئ ملف .env
cat > .env << 'EOF'
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="CHANGE_THIS_TO_A_RANDOM_SECRET_64_CHARS"
NODE_ENV="production"
EOF
```

> **مهم:** غيّر `JWT_SECRET` إلى سلسلة عشوائية طويلة. يمكن توليد واحدة هكذا:
>
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

---

## الخطوة 4 — تهيئة قاعدة البيانات

```bash
# تشغيل migrations
npx prisma migrate deploy

# (مرة واحدة فقط) إنشاء حساب الأدمن
# سيُفعَّل لاحقاً بعد تشغيل التطبيق عبر:
# curl http://localhost:3000/api/seed
```

---

## الخطوة 5 — بناء التطبيق

```bash
npm run build
```

---

## الخطوة 6 — تشغيل التطبيق مع PM2

PM2 يضمن بقاء التطبيق يعمل بعد إعادة تشغيل السيرفر.

```bash
# ثبّت PM2
npm install -g pm2

# شغّل التطبيق
pm2 start npm --name "mudhian" -- start

# اجعله يبدأ تلقائياً عند إعادة التشغيل
pm2 startup
pm2 save
```

أوامر مفيدة:

```bash
pm2 status          # حالة التطبيق
pm2 logs mudhian    # عرض السجلات
pm2 restart mudhian # إعادة تشغيل
pm2 stop mudhian    # إيقاف
```

---

## الخطوة 7 — إعداد Nginx (Reverse Proxy)

```bash
apt install -y nginx

# إنشاء ملف الإعداد
cat > /etc/nginx/sites-available/mudhian << 'EOF'
server {
    listen 80;
    server_name _;   # استبدل _ باسم النطاق إن وجد

    # رفع حجم الطلب (لملفات النسخة الاحتياطية)
    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# فعّل الموقع
ln -s /etc/nginx/sites-available/mudhian /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

التطبيق الآن متاح على: `http://<SERVER_IP>`

---

## الخطوة 8 — إنشاء حساب الأدمن (مرة واحدة)

```bash
curl http://localhost:3000/api/seed
```

ثم سجل دخول بـ: `admin` / `admin123` وغيّر كلمة المرور فوراً.

---

## الخطوة 9 — HTTPS بشهادة SSL مجانية (مستحسن)

> متطلب: يجب أن يكون لديك نطاق (domain) مرتبط بعنوان IP السيرفر.

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com
```

---

## تحديث التطبيق (عند وجود إصدار جديد)

```bash
cd /var/www/mudhian

# سحب التحديثات من GitHub
git pull origin main

# تثبيت المكتبات الجديدة إن وجدت
npm install

# تطبيق تحديثات قاعدة البيانات
npx prisma migrate deploy

# بناء الإصدار الجديد
npm run build

# إعادة تشغيل التطبيق
pm2 restart mudhian
```

---

## النسخ الاحتياطي لقاعدة البيانات

قاعدة البيانات ملف واحد في: `/var/www/mudhian/prisma/dev.db`

```bash
# نسخة احتياطية يدوية
cp /var/www/mudhian/prisma/dev.db /root/backup-$(date +%Y%m%d).db

# جدولة نسخ يومي تلقائي (كل يوم 2 صباحاً)
crontab -e
# أضف هذا السطر:
0 2 * * * cp /var/www/mudhian/prisma/dev.db /root/backups/db-$(date +\%Y\%m\%d).db
```

كما يمكن تحميل النسخة الاحتياطية من داخل التطبيق: **الإدارة → نسخة احتياطية**.

---

## استكشاف الأخطاء

| المشكلة                | الحل                                                          |
| ---------------------- | ------------------------------------------------------------- |
| التطبيق لا يستجيب      | `pm2 logs mudhian` لعرض الأخطاء                               |
| خطأ في قاعدة البيانات  | `npx prisma migrate deploy` ثم `pm2 restart mudhian`          |
| تغيير في الكود لا يظهر | `npm run build && pm2 restart mudhian`                        |
| منفذ 3000 مشغول        | `pm2 delete mudhian && pm2 start npm --name mudhian -- start` |

النشر اكتمل ✓

الرابط: http://165.227.220.45

بيانات الدخول:

- المستخدم: admin
- كلمة المرور: admin123 — غيّرها فوراً من الإدارة

ما تم:

1. Ubuntu 22.04 + Node.js 20 + Nginx
2. رفع المشروع مباشرة للسيرفر
3. جميع الـ 7 migrations طُبّقت على قاعدة البيانات
4. بناء production ناجح
5. PM2 يشغّل التطبيق ويعيد تشغيله تلقائياً عند إعادة تشغيل السيرفر
6. Nginx يستقبل الطلبات على المنفذ 80

لتحديث التطبيق مستقبلاً:

# على جهازك

tar --exclude='.next' --exclude='node_modules' --exclude='.git' --exclude='prisma/dev.db' -czf /tmp/mudhian.tar.gz .
scp /tmp/mudhian.tar.gz root@165.227.220.45:/var/www/

# على السيرفر

cd /var/www/mudhian
tar -xzf /var/www/mudhian.tar.gz
npm install && npx prisma generate && npx prisma migrate deploy && npm run build
pm2 restart mudhian
