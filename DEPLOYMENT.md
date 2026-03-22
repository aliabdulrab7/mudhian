# DEPLOYMENT.md — دليل النشر الموصى به

> **التوصية النهائية:** VPS (Ubuntu 22.04) + Nginx + PM2 + Let's Encrypt
> هذا الدليل يغطي النشر خطوة بخطوة من الصفر حتى يعمل النظام على الإنترنت لجميع الفروع.

---

## لماذا VPS وليس غيره؟

| الخيار | السيطرة | الثبات | السعر | مناسب لـ |
|--------|---------|--------|-------|-----------|
| **VPS** ⭐ | كاملة | ممتاز | ~$5/شهر | إنتاج حقيقي |
| Railway / Render | محدودة | جيد | مجاني → مدفوع | تجربة سريعة |
| Cloudflare Tunnel | متوسطة | متوسط | مجاني | جهاز منزلي |
| Vercel | لا يدعم SQLite | — | — | غير مناسب |

SQLite يحتاج **filesystem ثابت** — VPS هو الوحيد الذي يضمن ذلك بسعر منخفض.

---

## المتطلبات قبل البدء

- [ ] حساب على **Hetzner** أو **DigitalOcean** (أو أي مزود VPS)
- [ ] الكود مرفوع على **GitHub** (تم ✅)
- [ ] اسم نطاق (domain) — اختياري للبداية، يمكن استخدام IP مؤقتًا

---

## الخطوة 1 — اختيار وإنشاء السيرفر

### المزودون الموصى بهم
| المزود | الخطة | RAM | السعر |
|--------|-------|-----|-------|
| **Hetzner** ⭐ | CX22 | 2GB | ~€3.5/شهر |
| **DigitalOcean** | Basic Droplet | 1GB | ~$6/شهر |
| **Vultr** | Cloud Compute | 1GB | ~$6/شهر |

### الإعداد في Hetzner (الأسرع)
1. سجّل في [hetzner.com/cloud](https://www.hetzner.com/cloud)
2. أنشئ مشروع جديد → **Add Server**
3. اختر: **Location:** أقرب منطقة | **Image:** Ubuntu 22.04 | **Type:** CX22
4. أضف **SSH Key** (أو استخدم كلمة مرور Root)
5. انسخ **IP Address** بعد الإنشاء

---

## الخطوة 2 — الدخول للسيرفر وإعداد البيئة

```bash
# الدخول عبر SSH
ssh root@YOUR_SERVER_IP

# تحديث النظام
apt update && apt upgrade -y

# تثبيت الأدوات الأساسية
apt install -y git curl wget ufw
```

### تثبيت Node.js 20 (LTS)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v   # يجب أن يظهر v20.x.x
npm -v
```

### تثبيت PM2 (مدير العمليات)
```bash
npm install -g pm2
```

---

## الخطوة 3 — سحب الكود وتثبيت المتطلبات

```bash
# إنشاء مجلد للتطبيق
mkdir -p /var/www
cd /var/www

# سحب الكود من GitHub
git clone https://github.com/aliabdulrab7/mudhian.git
cd mudhian

# تثبيت المتطلبات
npm install
```

---

## الخطوة 4 — إعداد متغيرات البيئة

```bash
# إنشاء ملف .env
cat > .env << 'EOF'
DATABASE_URL="file:./prisma/prod.db"
JWT_SECRET="REPLACE_WITH_STRONG_SECRET"
NODE_ENV="production"
EOF
```

### توليد JWT_SECRET قوي
```bash
# نفّذ هذا الأمر وانسخ الناتج إلى JWT_SECRET في .env
openssl rand -base64 48
```

> ⚠️ **مهم:** لا تستخدم السر الافتراضي `mudhian-jewelry-secret-2026` في الإنتاج أبدًا.

---

## الخطوة 5 — إعداد قاعدة البيانات

```bash
# تطبيق migrations على قاعدة الإنتاج
npx prisma migrate deploy

# توليد Prisma Client
npx prisma generate

# إنشاء حساب admin الأول (مرة واحدة فقط)
# بعد تشغيل التطبيق، افتح: http://YOUR_IP:3000/api/seed
```

---

## الخطوة 6 — بناء التطبيق وتشغيله

```bash
# بناء النسخة الإنتاجية
npm run build

# تشغيل التطبيق عبر PM2
pm2 start npm --name "mudhian" -- start

# التشغيل التلقائي عند إعادة تشغيل السيرفر
pm2 startup
pm2 save

# التحقق من أن التطبيق يعمل
pm2 status
pm2 logs mudhian --lines 20
```

---

## الخطوة 7 — إعداد Nginx كـ Reverse Proxy

```bash
# تثبيت Nginx
apt install -y nginx

# إنشاء ملف الإعداد
cat > /etc/nginx/sites-available/mudhian << 'EOF'
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    # أقصى حجم رفع
    client_max_body_size 10M;

    # رفع الأداء
    gzip on;
    gzip_types text/plain application/json application/javascript text/css;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }
}
EOF

# تفعيل الإعداد
ln -s /etc/nginx/sites-available/mudhian /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

---

## الخطوة 8 — الجدار الناري (Firewall)

```bash
ufw allow ssh
ufw allow 80
ufw allow 443
ufw --force enable
ufw status
```

---

## الخطوة 9 — HTTPS مجاني مع Let's Encrypt

> **متطلب:** يجب أن يكون لديك نطاق (domain) ومربوط بـ IP السيرفر أولًا.

### ربط النطاق بالسيرفر
في لوحة تحكم مزود النطاق (Namecheap / GoDaddy / ...) أضف:
```
A Record:  @   →  YOUR_SERVER_IP
A Record:  www →  YOUR_SERVER_IP
```
انتظر 5-15 دقيقة حتى تنتشر.

### تثبيت SSL
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# التجديد التلقائي (يعمل تلقائيًا عبر cron)
certbot renew --dry-run
```

بعد هذه الخطوة، عدّل Nginx ليحتوي اسم النطاق:
```bash
sed -i 's/YOUR_DOMAIN_OR_IP/yourdomain.com/' /etc/nginx/sites-available/mudhian
nginx -t && systemctl reload nginx
```

---

## الخطوة 10 — التهيئة الأولى للنظام

```bash
# في المتصفح، افتح:
http://yourdomain.com/api/seed
# ← ينشئ حساب: admin / admin123
```

ثم:
1. سجّل دخول بـ `admin` / `admin123`
2. اذهب لـ `/admin` → غيّر كلمة مرور admin فورًا
3. أضف الفروع وحساباتها من لوحة الإدارة

---

## النسخ الاحتياطي التلقائي

### نسخ احتياطي يومي تلقائي عبر Cron
```bash
# إنشاء مجلد النسخ
mkdir -p /var/backups/mudhian

# إنشاء سكريبت النسخ
cat > /usr/local/bin/mudhian-backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y-%m-%d)
BACKUP_DIR="/var/backups/mudhian"
SOURCE="/var/www/mudhian/prisma/prod.db"

# نسخ قاعدة البيانات
cp "$SOURCE" "$BACKUP_DIR/mudhian-$DATE.db"

# الاحتفاظ بآخر 30 نسخة فقط
ls -t "$BACKUP_DIR"/*.db | tail -n +31 | xargs rm -f

echo "Backup completed: mudhian-$DATE.db"
EOF

chmod +x /usr/local/bin/mudhian-backup.sh

# جدولة النسخ كل يوم الساعة 2 صباحًا
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/mudhian-backup.sh >> /var/log/mudhian-backup.log 2>&1") | crontab -
```

### تنزيل النسخة الاحتياطية يدويًا
```bash
# من جهازك المحلي:
scp root@YOUR_SERVER_IP:/var/backups/mudhian/mudhian-2026-03-22.db ./

# أو من داخل النظام:
# لوحة الأدمن → زر "نسخة احتياطية"
```

---

## تحديث النظام (عند نشر كود جديد)

```bash
cd /var/www/mudhian

# سحب آخر تحديثات
git pull origin main

# تثبيت أي متطلبات جديدة
npm install

# تطبيق migrations جديدة إن وجدت
npx prisma migrate deploy
npx prisma generate

# إعادة البناء
npm run build

# إعادة تشغيل التطبيق (بدون توقف مفاجئ)
pm2 reload mudhian
```

---

## المراقبة والصيانة

### أوامر مفيدة
```bash
# حالة التطبيق
pm2 status

# آخر السجلات
pm2 logs mudhian --lines 50

# إعادة تشغيل يدوي
pm2 restart mudhian

# مراقبة الموارد (CPU/RAM)
pm2 monit

# حجم قاعدة البيانات
du -sh /var/www/mudhian/prisma/prod.db

# مساحة القرص
df -h
```

### مؤشرات صحة السيرفر
```bash
# استخدام RAM
free -h

# استخدام CPU
top

# سجلات Nginx
tail -f /var/log/nginx/error.log
```

---

## حل المشكلات الشائعة

### التطبيق لا يرد (502 Bad Gateway)
```bash
pm2 status          # هل التطبيق يعمل؟
pm2 restart mudhian
pm2 logs mudhian --lines 30  # ابحث عن الخطأ
```

### خطأ في قاعدة البيانات
```bash
cd /var/www/mudhian
npx prisma migrate deploy
pm2 restart mudhian
```

### امتلاء القرص
```bash
df -h
# حذف سجلات PM2 القديمة
pm2 flush
# حذف نسخ احتياطية قديمة
ls /var/backups/mudhian/
```

---

## ملخص الخطوات السريع

```
1. أنشئ VPS Ubuntu 22.04  →  انسخ الـ IP
2. ssh root@IP
3. apt update && apt upgrade -y
4. تثبيت Node.js 20 + PM2
5. git clone https://github.com/aliabdulrab7/mudhian.git
6. npm install && إنشاء .env بـ JWT_SECRET قوي
7. npx prisma migrate deploy && npx prisma generate
8. npm run build
9. pm2 start npm --name mudhian -- start && pm2 save
10. إعداد Nginx → تفعيل HTTPS → فتح /api/seed
11. تسجيل دخول وتغيير كلمة المرور الفورًا
12. إضافة النسخ الاحتياطي التلقائي (cron)
```

---

## قائمة التحقق قبل الإطلاق

- [ ] `JWT_SECRET` قوي وعشوائي (ليس الافتراضي)
- [ ] كلمة مرور `admin` مغيّرة من `admin123`
- [ ] HTTPS مفعّل (شهادة SSL)
- [ ] الجدار الناري يسمح بـ 80 و 443 فقط
- [ ] النسخ الاحتياطي التلقائي يعمل
- [ ] `pm2 startup` مُفعّل (التشغيل عند إعادة تشغيل السيرفر)
- [ ] ملف `.env` غير موجود في GitHub
- [ ] قاعدة البيانات `prod.db` غير موجودة في GitHub
